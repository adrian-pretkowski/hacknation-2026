"""rules-v0 — ścieżka zasiłku macierzyńskiego matki wykonywana przez DSL z zus_rules/03_rules.yaml (BE1-01).

Ten sam zakres i ten sam format wyniku co ``slice_v0`` (dowód działania silnika: test parytetu
``tests/test_engine_parity.py``), ale warunki reguł MAT-ELIG-001, GEN-EXCL-001, MAT-DUR-001, MAT-DUR-009,
APP-DL-001, RATE-MAT-001/003 i CALC-MAT-001 są czytane z YAML i liczone evaluatorem Kleene, a wartości
z faktów ``f_*`` (app.engine.facts). Kolejność kroków wg 07 §1 jest tu zapisana ręcznie — ogólny pipeline
(overrides/exceptions z YAML, segmenty planu, agregacja DT-9) to BE1-02.

Różnice względem slice_v0 (świadome, zgodne z 07):
- MAT-ELIG-001 sprawdza też person.role i urlop wychowawczy (f_on_childcare_leave_on); brak tych danych
  przy braku ubezpieczenia w dniu porodu → NEEDS_DATA zamiast NEEDS_REVIEW.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.core.config import get_settings
from app.core.dates import end_after_days, to_date
from app.core.money import dec_str, mul
from app.core.params import param_status
from app.engine import slice_v0
from app.engine.dsl import RuleOutcome, Ruleset, evaluate_rule, load_ruleset
from app.engine.facts import Context

ENGINE_NAME = "rules-v0"
STATUS_ORDER = slice_v0.STATUS_ORDER
NOT_EVALUATED = slice_v0.NOT_EVALUATED


@lru_cache
def ruleset() -> Ruleset:
    return load_ruleset(get_settings().rules_path)


class _Run:
    def __init__(self, payload: dict[str, Any]):
        self.rules = ruleset()
        self.ctx = Context(input=payload, as_of=to_date((payload.get("evaluation") or {}).get("as_of_date")),
                           state={"benefit": "MATERNITY_BENEFIT"})
        self.missing: dict[str, list[str]] = {}
        self.applied: list[str] = []
        self.statuses: list[str] = []
        self.reasons: list[dict[str, Any]] = []

    def rule(self, rule_id: str) -> RuleOutcome:
        return evaluate_rule(self.rules.rule(rule_id), self.ctx)

    def need(self, field: str, *rule_ids: str) -> None:
        bucket = self.missing.setdefault(field, [])
        bucket.extend(r for r in rule_ids if r not in bucket)
        self.statuses.append("NEEDS_DATA")

    def need_from(self, outcome: RuleOutcome) -> None:
        for field in outcome.missing:
            self.need(field, outcome.rule_id)

    def reason(self, code: str, rule_id: str, message: str, location: str) -> None:
        source = self.rules.rule(rule_id).get("source_document") or "USTAWA"
        self.reasons.append({"code": code, "rule_id": rule_id, "message": message,
                             "legal_basis": [{"document": source, "location": location}]})


def evaluate(payload: dict[str, Any]) -> dict[str, Any]:
    if (payload.get("event") or {}).get("type") != "BIRTH":
        return _response([], [], [{"code": "OUT_OF_SCOPE_SLICE", "text": "rules-v0 obsługuje tylko event.type=BIRTH."}],
                         "OUT_OF_SCOPE")
    run = _Run(payload)
    ctx = run.ctx
    assumptions = [{"code": "ROUNDING_UNCONFIRMED",
                    "text": "Kwoty bez zaokrągleń — zasady zaokrąglania ZUS niepotwierdzone (GAP-001)."}]

    # Krok 4 (07 §1): prawo — MAT-ELIG-001, wyjątek GEN-EXCL-001
    elig = run.rule("MAT-ELIG-001")
    if elig.value is None:
        run.need_from(elig)
    else:
        run.applied.append("MAT-ELIG-001")
    if elig.value is False:
        run.statuses.append("NEEDS_REVIEW")
        run.reason("NOT_INSURED_ON_BIRTH_ART30_NOT_EVALUATED", "MAT-ELIG-001",
                   "Brak ubezpieczenia chorobowego w dniu porodu. Ta wersja nie ocenia jeszcze przypadków z art. 30 "
                   "(zasiłek po ustaniu ubezpieczenia) — wymaga weryfikacji.", "art. 29 ust. 1 pkt 1; art. 30")
    elif elig.value is True:
        excl_rule = run.rules.rule("GEN-EXCL-001")
        art2a = excl_rule["conditions"]["all"][0]["value"]
        if ctx.fact("f_primary_title_type") in art2a:
            excl = run.rule("GEN-EXCL-001")
            run.applied.append("GEN-EXCL-001")
            if param_status("MIN_WAGE_2026_MONTHLY") == "UNCONFIRMED":
                assumptions.append({"code": "MIN_WAGE_FROM_ATTACHMENT",
                                    "text": "Płaca minimalna 2026 wzięta z Załącznika HackNation (niepotwierdzona)."})
            if excl.value is None:
                run.need_from(excl)
            elif excl.value is True:
                threshold = mul(ctx.param("MIN_WAGE_2026_MONTHLY"), ctx.param("DEBT_THRESHOLD_MIN_WAGE_RATIO"))
                run.statuses.append(excl_rule["result"]["status"])
                run.reason(excl_rule["result"]["reason_code"], "GEN-EXCL-001",
                           f"Zadłużenie składkowe przekracza 1% minimalnego wynagrodzenia ({dec_str(threshold)} zł) "
                           f"— zasiłek nie przysługuje do czasu spłaty.", "art. 2a ust. 1")
            else:
                run.statuses.append("ELIGIBLE")
        else:
            run.statuses.append("ELIGIBLE")

    # Krok 5: okres — MAT-DUR-001 (wymiar) + MAT-DUR-009 (tydzień = 7 dni, start w dniu porodu)
    birth = to_date(ctx.field("event.date"))
    if birth is None:
        run.need("event.date", "MAT-DUR-009")
    period = days = None
    dur = run.rule("MAT-DUR-001")
    weeks = ctx.fact("f_maternity_leave_weeks") if dur.fired else None
    if dur.value is None:
        run.need_from(dur)
    elif dur.fired and weeks is not None and birth is not None:
        week_rule = run.rules.rule("MAT-DUR-009")
        if run.rule("MAT-DUR-009").fired:
            week_days = int(ctx.param(week_rule["result"]["set"]["week_days"]["param"]))
            days = weeks * week_days
            period = {"from": birth.isoformat(), "to": end_after_days(birth, days).isoformat(), "max_weeks": weeks}
            run.applied += ["MAT-DUR-001", "MAT-DUR-009"]

    # Krok 7: stawka segmentu — RATE-MAT-003 nadpisuje RATE-MAT-001 (overrides), zależna od APP-DL-001
    ctx.segment = {"leave_type": "MATERNITY_LEAVE", "parent": "MOTHER",
                   "from": period["from"] if period else None, "to": period["to"] if period else None}
    rate = None
    if run.rule("APP-DL-001").fired:
        deadline = ctx.fact("f_combined_application_deadline")
        run.applied.append("APP-DL-001")
        combined, full = run.rule("RATE-MAT-003"), run.rule("RATE-MAT-001")
        if combined.fired:
            rate = _rate_from(run.rules, "RATE-MAT-003", ctx)
            run.applied.append("RATE-MAT-003")
            run.reason("RATE_COMBINED_815", "RATE-MAT-003",
                       "Wniosek o łączny zasiłek złożony w 21 dni od porodu — 81,5% podstawy.",
                       "art. 31 ust. 3; art. 30a ust. 1")
        elif full.fired:
            # 81,5% FALSE albo UNKNOWN (brak wniosku i deklaracji) → stawka podstawowa 100% + informacja o terminie
            rate = _rate_from(run.rules, "RATE-MAT-001", ctx)
            run.applied.append("RATE-MAT-001")
            run.reason("RATE_FULL_100", "RATE-MAT-001",
                       f"Zasiłek za okres urlopu macierzyńskiego — 100% podstawy. Wniosek o 81,5% można złożyć do "
                       f"{deadline.isoformat()}.", "art. 31 ust. 1; art. 30a ust. 1")
    ctx.state["rate"] = rate

    # Krok 8: kwota — CALC-MAT-001
    daily = total = None
    calc = run.rule("CALC-MAT-001")
    if calc.value is None:
        run.need_from(calc)
    elif calc.fired and rate is not None and days is not None:
        amount = ctx.fact("f_benefit_amount")
        if amount is not None:
            daily, total = amount["daily"], amount["total"]
            run.applied.append("CALC-MAT-001")

    status = next((s for s in STATUS_ORDER if s in run.statuses), "NEEDS_DATA")
    benefit = {
        "benefit_type": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE", "status": status,
        "rate": dec_str(rate) if rate is not None else None, "period": period, "days": days,
        "daily_amount_exact": dec_str(daily) if daily is not None else None,
        "total_amount_exact": dec_str(total) if total is not None else None,
        "payer_of_benefit": None, "reasons": run.reasons, "applied_rules": run.applied,
    }
    missing = [{"field": field, "rule_ids": rule_ids} for field, rule_ids in run.missing.items()]
    return _response([benefit], missing, assumptions, status)


def _rate_from(rules: Ruleset, rule_id: str, ctx: Context) -> Any:
    return ctx.param(rules.rule(rule_id)["result"]["set"]["rate"]["param"])


def _response(benefits: list[dict[str, Any]], missing: list[dict[str, Any]], assumptions: list[dict[str, Any]],
              overall: str) -> dict[str, Any]:
    body = slice_v0._response(benefits, missing, assumptions, overall)
    body["engine"] = ENGINE_NAME
    return body
