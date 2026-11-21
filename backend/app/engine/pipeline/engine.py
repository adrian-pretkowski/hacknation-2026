"""Prymitywy pipeline'u (BE1-02): ocena reguły z trybem, ślad, wyjątki, overrides, agregacja DT-9.

Tryby reguł (03_rules.yaml meta.dsl.evaluation_modes):
- FUTURE lub ``valid_from`` > data oceny → FUTURE_SKIPPED (+ ``future_changes``), ``valid_to`` < data → NOT_APPLICABLE,
- BLOCKED / HUMAN_REVIEW: warunki TRUE → BLOCKED (→ NEEDS_REVIEW), nigdy nie przyznaje ani nie odmawia; UNKNOWN
  z brakującymi polami wejścia → UNKNOWN z listą braków (D17: najpierw dopytać), UNKNOWN bez braków → BLOCKED,
- reguła z faktem, którego nie ma jeszcze w rejestrze: oceniana częściowo (brakujący fakt = UNKNOWN). Gdy znane dane
  przesądzają wynik → normalny wynik; gdy brakuje pól wejścia → UNKNOWN z brakami; gdy rozstrzygnięcie zależy tylko
  od faktu spoza rejestru → NOT_EVALUATED (``not_evaluated_rules``) - wywołujący decyduje o NEEDS_REVIEW.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from app.core.dates import to_date
from app.core.params import param_status
from app.engine.dsl import Ruleset, Tri, evaluate_condition
from app.engine.facts import Context, get_fact

STATUS_ORDER = ["OUT_OF_SCOPE", "NOT_ELIGIBLE", "NEEDS_REVIEW", "NEEDS_DATA", "ELIGIBLE"]

FIRED, NOT_FIRED, UNKNOWN = "FIRED", "NOT_FIRED", "UNKNOWN"
BLOCKED, FUTURE_SKIPPED, NOT_APPLICABLE = "BLOCKED", "FUTURE_SKIPPED", "NOT_APPLICABLE"
NOT_EVALUATED = "NOT_EVALUATED"  # wewnętrzny - raportowany w not_evaluated_rules, nie w śladzie


@dataclass
class Outcome:
    rule_id: str
    kind: str
    value: Tri = None
    missing: list[str] = field(default_factory=list)

    @property
    def fired(self) -> bool:
        return self.kind == FIRED

    @property
    def unknown(self) -> bool:
        return self.kind == UNKNOWN

    @property
    def decided(self) -> bool:
        return self.kind in (FIRED, NOT_FIRED)


def _facts_in(node: Any) -> set[str]:
    if isinstance(node, dict):
        found = {str(node["fact"])} if isinstance(node.get("fact"), str) else set()
        return found | {f for value in node.values() for f in _facts_in(value)}
    if isinstance(node, list):
        return {f for value in node for f in _facts_in(value)}
    return set()


class Engine:
    """Stan jednej ewaluacji: kontekst faktów, ślad reguł, braki danych, nieocenione reguły."""

    def __init__(self, rules: Ruleset, ctx: Context):
        self.rules = rules
        self.ctx = ctx
        self.trace: dict[str, str] = {}
        self.missing: dict[str, list[str]] = {}
        self.not_evaluated: list[str] = []
        self.future: list[dict[str, str]] = []
        self.review: list[str] = []
        self.warnings: list[dict[str, Any]] = []  # result.warning reguł VALIDATION/INFORMATIONAL (kontrakt: warnings)

    # ------------------------------------------------------------ ocena reguły
    def implementable(self, rule: dict[str, Any]) -> bool:
        return all(get_fact(name) is not None for name in _facts_in(rule["conditions"]))

    def eval(self, rule_id: str) -> Outcome:
        rule = self.rules.rule(rule_id)
        as_of: date | None = self.ctx.as_of
        valid_from, valid_to = to_date(rule.get("valid_from")), to_date(rule.get("valid_to"))
        if rule["evaluation"] == "FUTURE" or (valid_from and as_of and valid_from > as_of):
            if valid_from and not any(f["rule_id"] == rule_id for f in self.future):
                self.future.append({"rule_id": rule_id, "valid_from": valid_from.isoformat()})
            return self._record(Outcome(rule_id, FUTURE_SKIPPED))
        if valid_to and as_of and valid_to < as_of:
            return self._record(Outcome(rule_id, NOT_APPLICABLE))
        local = self.ctx.child()
        local.lenient = not self.implementable(rule)
        value = evaluate_condition(rule["conditions"], local)
        self.ctx.need(*local.missing)
        missing = list(local.missing) if value is None else []
        if value is None and local.unregistered and not missing:
            if rule_id not in self.not_evaluated:
                self.not_evaluated.append(rule_id)
            return Outcome(rule_id, NOT_EVALUATED)
        if rule["evaluation"] in ("BLOCKED", "HUMAN_REVIEW"):
            if value is None and missing:
                # brak pól wejścia: najpierw dopytać (UNKNOWN z brakami), NEEDS_REVIEW dopiero gdy dane nie rozstrzygają
                return self._record(Outcome(rule_id, UNKNOWN, value, missing))
            if value is not False:
                self.review.append(rule_id)
                return self._record(Outcome(rule_id, BLOCKED, value, missing))
            return self._record(Outcome(rule_id, NOT_FIRED, value))
        kind = FIRED if value is True else NOT_FIRED if value is False else UNKNOWN
        return self._record(Outcome(rule_id, kind, value, missing))

    def _record(self, outcome: Outcome) -> Outcome:
        self.trace[outcome.rule_id] = outcome.kind
        return outcome

    # ------------------------------------------------------------ wyjątki i overrides
    def exclusions(self, rule_id: str) -> list[Outcome]:
        """Wyjątki reguły typu EXCLUSION (np. GEN-EXCL-001). Pozostałe wyjątki to alternatywne podstawy."""
        return [self.eval(exc) for exc in self.rules.rule(rule_id).get("exceptions") or []
                if self.rules.rule(exc)["rule_type"] == "EXCLUSION"]

    def alternatives(self, rule_id: str) -> list[Outcome]:
        return [self.eval(exc) for exc in self.rules.rule(rule_id).get("exceptions") or []
                if self.rules.rule(exc)["rule_type"] != "EXCLUSION"]

    def pick(self, candidate_ids: list[str]) -> tuple[Outcome | None, list[Outcome]]:
        """Rozstrzyga ``overrides`` (07 §6): wygrywa reguła FIRED nienadpisana przez inną FIRED.

        Zwraca (zwycięzca, nadpisujące UNKNOWN) - o skutku UNKNOWN decyduje wywołujący.
        """
        outcomes = {rid: self.eval(rid) for rid in candidate_ids}
        fired = [o for o in outcomes.values() if o.fired]
        overridden = {target for o in fired for target in self.rules.rule(o.rule_id).get("overrides") or []}
        winners = [o for o in fired if o.rule_id not in overridden]
        unknown_overriders = [o for o in outcomes.values() if o.unknown
                              and set(self.rules.rule(o.rule_id).get("overrides") or []) & {w.rule_id for w in winners}]
        return (winners[0] if winners else None), unknown_overriders

    # ------------------------------------------------------------ ostrzeżenia (BE2-01)
    def check(self, rule_id: str, **extra: Any) -> bool:
        """Reguła z ``result.warning``: FIRED → wpis w ``warnings`` (walidacje planu → ``parental.plan_errors``).

        UNKNOWN nie zgłasza ani ostrzeżenia, ani braków (ostrzeżenie nie blokuje oceny prawa). Zwraca True, gdy FIRED.
        """
        outcome = self.eval(rule_id)
        if not outcome.fired:
            return False
        warning = self.rules.rule(rule_id)["result"].get("warning")
        if warning:
            entry = {"code": warning["code"], "severity": warning.get("severity", "WARNING"), "rule_id": rule_id,
                     **extra}
            if entry not in self.warnings:
                self.warnings.append(entry)
        return True

    # ------------------------------------------------------------ braki i parametry
    def need(self, field_path: str, *rule_ids: str) -> None:
        bucket = self.missing.setdefault(field_path, [])
        bucket.extend(r for r in rule_ids if r not in bucket)

    def need_from(self, outcome: Outcome) -> None:
        for field_path in outcome.missing:
            self.need(field_path, outcome.rule_id)

    def missing_data(self) -> list[dict[str, Any]]:
        return [{"field": f, "rule_ids": rule_ids} for f, rule_ids in self.missing.items()]

    def unconfirmed_params(self) -> list[str]:
        return sorted(p for p in self.ctx.used_params if param_status(p) == "UNCONFIRMED")

    def applied_trace(self) -> list[dict[str, str]]:
        return [{"rule_id": rid, "outcome": kind} for rid, kind in self.trace.items()]


def aggregate_status(*, out_of_scope: bool = False, excluded: bool = False, review: bool = False,
                     needs_data: bool = False, eligible: Tri = None) -> str:
    """DT-9 (zus_rules/06): OUT_OF_SCOPE > wykluczenie TRUE > BLOCKED/HUMAN_REVIEW > UNKNOWN > ELIGIBLE > odmowa."""
    if out_of_scope:
        return "OUT_OF_SCOPE"
    if excluded:
        return "NOT_ELIGIBLE"
    if review:
        return "NEEDS_REVIEW"
    if needs_data or eligible is None:
        return "NEEDS_DATA"
    return "ELIGIBLE" if eligible else "NOT_ELIGIBLE"
