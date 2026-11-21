"""Kroki ogólne 07 §1 pkt 2–3 wspólne dla świadczeń (BE1-04): płatnik (GEN-CLS-*) i zadłużenie (GEN-EXCL-*).

- Płatnik nie zmienia statusu prawa: brak danych → ``payer_of_benefit = None`` + pole w ``missing_data``.
- GEN-EXCL-001 (zadłużenie > próg w dniu powstania prawa, do czasu spłaty) → NOT_ELIGIBLE z flagą
  ``suspended_until_debt_repaid = true``; GEN-EXCL-002 (brak spłaty w DEBT_REPAYMENT_LIMIT_MONTHS) nadpisuje
  GEN-EXCL-001 → NOT_ELIGIBLE, prawo przedawnione (``suspended_until_debt_repaid = false``).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.money import dec_str, mul
from app.engine.pipeline.engine import Engine

PAYER_RULES = ["GEN-CLS-001", "GEN-CLS-002"]


def make_reason(eng: Engine, code: str, rule_id: str, message: str, location: str) -> dict[str, Any]:
    document = eng.rules.rule(rule_id).get("source_document") or "USTAWA"
    return {"code": code, "rule_id": rule_id, "message": message,
            "legal_basis": [{"document": document, "location": location}]}


def pct(ratio: Any) -> str:
    """0.815 → „81,5%” (tekst komunikatu z parametru, nie z literału)."""
    return dec_str(ratio * 100).replace(".", ",") + "%"


def payer_of_benefit(eng: Engine) -> tuple[str | None, str | None]:
    """GEN-CLS-001/002 z ``overrides`` (07 §6). Zwraca (płatnik, reguła) albo (None, None) przy braku danych."""
    winner, unknown_overriders = eng.pick(PAYER_RULES)
    if winner is not None and not unknown_overriders:
        return eng.rules.rule(winner.rule_id)["result"]["set"]["payer_of_benefit"], winner.rule_id
    for rule_id in PAYER_RULES:
        outcome = eng.eval(rule_id)
        if outcome.unknown:
            eng.need_from(outcome)
    return None, None


@dataclass
class DebtCheck:
    excluded: bool = False
    needs_data: bool = False
    suspended_until_debt_repaid: bool | None = None
    applied: list[str] = field(default_factory=list)
    reasons: list[dict[str, Any]] = field(default_factory=list)


def debt_exclusion(eng: Engine) -> DebtCheck:
    """GEN-EXCL-001 i GEN-EXCL-002 (USTAWA art. 2a ust. 1-2). Wywoływać tylko, gdy prawo do świadczenia istnieje."""
    ctx = eng.ctx
    check = DebtCheck()
    debt = eng.eval("GEN-EXCL-001")
    if debt.decided or debt.unknown:
        check.applied.append("GEN-EXCL-001")
    if debt.unknown:
        eng.need_from(debt)
        check.needs_data = True
        return check
    if not debt.fired:
        return check
    check.excluded = True
    expired = eng.eval("GEN-EXCL-002")
    if expired.fired:
        result = eng.rules.rule("GEN-EXCL-002")["result"]
        check.applied.append("GEN-EXCL-002")
        check.suspended_until_debt_repaid = result["set"]["suspended_until_debt_repaid"]
        check.reasons.append(make_reason(
            eng, result["reason_code"], "GEN-EXCL-002",
            f"Zadłużenie składkowe nie zostało spłacone w ciągu {ctx.param('DEBT_REPAYMENT_LIMIT_MONTHS')} "
            f"miesięcy od dnia powstania prawa — prawo do świadczenia przedawniło się.", "art. 2a ust. 2"))
        return check
    if expired.unknown:
        eng.need_from(expired)
    result = eng.rules.rule("GEN-EXCL-001")["result"]
    check.suspended_until_debt_repaid = result["set"]["suspended_until_debt_repaid"]
    threshold = mul(ctx.param("MIN_WAGE_2026_MONTHLY"), ctx.param("DEBT_THRESHOLD_MIN_WAGE_RATIO"))
    check.reasons.append(make_reason(
        eng, result["reason_code"], "GEN-EXCL-001",
        f"Zadłużenie składkowe przekracza {pct(ctx.param('DEBT_THRESHOLD_MIN_WAGE_RATIO'))} minimalnego "
        f"wynagrodzenia ({dec_str(threshold)} zł) — zasiłek nie przysługuje do czasu spłaty.", "art. 2a ust. 1"))
    return check
