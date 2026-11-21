"""Niezdolność do pracy (event.type PREGNANCY_INCAPACITY / SICKNESS) — prawo, płatnik i stawka (BE1-04).

Kroki 07 §1 dla zasiłku chorobowego i wynagrodzenia chorobowego:
- 2 płatnik: GEN-CLS-001/002 (``general.payer_of_benefit``),
- 3 zadłużenie: GEN-EXCL-001/002 (art. 2a dotyczy zasiłku chorobowego),
- 4 prawo: SICK-ELIG-001 (alternatywa: SICK-ELIG-006 po ustaniu tytułu), okres wyczekiwania SICK-ELIG-002/003
  (łańcuch okresów SICK-ELIG-004) z wyjątkiem SICK-ELIG-005 (``overrides``) → ``f_sickness_benefit_right_exists``,
- wynagrodzenie chorobowe pracownika: SICKPAY-ELIG-001 / SICKPAY-EXCL-001 / SICKPAY-TRN-001,
- 7 stawka: SICK-RATE-001/002, SICKPAY-RATE-001/002 (``overrides``; UNKNOWN stawki 100% → NEEDS_DATA, nie 80%).

Poza zakresem (BE1-05, raportowane w ``not_evaluated_rules``): okres zasiłkowy 182/270 dni (SICK-DUR-*), wyłączenia
SICK-EXCL-*, podział okresu e-ZLA na wynagrodzenie i zasiłek, kwoty (SICK-CALC-001), dokumenty i terminy.
"""
from __future__ import annotations

from typing import Any

from app.core.dates import days_in, to_date
from app.core.money import dec_str
from app.engine.facts.sickness import SICKNESS_RIGHT_STATE
from app.engine.pipeline.engine import Engine, aggregate_status
from app.engine.pipeline.general import debt_exclusion, make_reason, payer_of_benefit, pct

WAITING_RULES = ["SICK-ELIG-002", "SICK-ELIG-003"]
SICK_RATE_RULES = ["SICK-RATE-001", "SICK-RATE-002"]
SICKPAY_RATE_RULES = ["SICKPAY-RATE-001", "SICKPAY-RATE-002"]
NOT_RUN = ["SICK-EXCL-001", "SICK-EXCL-002", "SICK-EXCL-003", "SICK-EXCL-004", "SICK-EXCL-005", "SICK-EXCL-006",
           "SICK-EXCL-007", "SICK-DUR-001", "SICK-DUR-002", "SICK-DUR-003", "SICK-DUR-004", "SICK-CALC-001",
           "BASE-EMP-001", "BASE-NEMP-001"]


class _Right:
    """Wynik grupy SICK-ELIG + GEN-EXCL: wspólny dla zasiłku i wynagrodzenia chorobowego."""

    def __init__(self) -> None:
        self.eligible: bool | None = None
        self.needs_data = self.review = self.excluded = False
        self.suspended: bool | None = None
        self.applied: list[str] = []
        self.reasons: list[dict[str, Any]] = []

    @property
    def exists(self) -> bool | None:
        """Kleene: FALSE przy odmowie/wykluczeniu, UNKNOWN przy brakach lub regule nieocenionej, inaczej TRUE."""
        if self.excluded or self.eligible is False:
            return False
        if self.needs_data or self.review or self.eligible is None:
            return None
        return True


def _sickness_right(eng: Engine) -> _Right:
    ctx = eng.ctx
    right = _Right()
    elig = eng.eval("SICK-ELIG-001")
    if elig.unknown:
        eng.need_from(elig)
        right.needs_data = True
    elif elig.fired:
        right.eligible = True
        right.applied.append("SICK-ELIG-001")
    else:
        after_title = eng.eval("SICK-ELIG-006")
        if after_title.fired:
            right.eligible = True
            right.applied.append("SICK-ELIG-006")
        elif after_title.kind in ("NOT_EVALUATED", "BLOCKED"):
            right.review = True
            right.reasons.append(make_reason(
                eng, "AFTER_TITLE_END_NOT_EVALUATED", "SICK-ELIG-006",
                "Niezdolność do pracy nie powstała w czasie ubezpieczenia chorobowego. Ta wersja nie ocenia jeszcze "
                "zasiłku po ustaniu tytułu ubezpieczenia (art. 7) — wymaga weryfikacji.", "art. 6 ust. 1; art. 7"))
        elif after_title.unknown:
            eng.need_from(after_title)
            right.needs_data = True
        else:
            right.eligible = False
            right.applied.append("SICK-ELIG-001")
            insured = ctx.fact("f_sickness_insured_on", date=ctx.field("incapacity.start_date"))
            code, text = (("NO_INCAPACITY_CERTIFICATE", "Brak zaświadczenia lekarskiego o niezdolności do pracy.")
                          if insured else ("NOT_INSURED_ON_INCAPACITY",
                                           "Niezdolność do pracy nie powstała w czasie ubezpieczenia chorobowego."))
            right.reasons.append(make_reason(eng, code, "SICK-ELIG-001", text, "art. 6 ust. 1"))
    if right.eligible is True and "SICK-ELIG-001" in right.applied:
        _waiting_period(eng, right)
    if right.eligible is True and not right.needs_data:
        debt = debt_exclusion(eng)
        right.applied += debt.applied
        right.reasons += debt.reasons
        right.excluded, right.needs_data = debt.excluded, debt.needs_data
        right.suspended = debt.suspended_until_debt_repaid
    return right


def _waiting_period(eng: Engine, right: _Right) -> None:
    """SICK-ELIG-002/003 (30/90 dni, łańcuch SICK-ELIG-004) z wyjątkiem SICK-ELIG-005 (overrides)."""
    ctx = eng.ctx
    chain = eng.eval("SICK-ELIG-004")
    if chain.fired:
        right.applied.append("SICK-ELIG-004")
    waiting = [eng.eval(rule_id) for rule_id in WAITING_RULES]
    met = next((o for o in waiting if o.fired), None)
    if met is not None:
        right.applied.append(met.rule_id)
        return
    exemption = eng.eval("SICK-ELIG-005")
    if exemption.fired:
        right.applied.append("SICK-ELIG-005")
        right.reasons.append(make_reason(
            eng, "WAITING_PERIOD_EXEMPTION", "SICK-ELIG-005",
            "Zasiłek od pierwszego dnia ubezpieczenia — bez okresu wyczekiwania.", "art. 4 ust. 3"))
        return
    unknown = [o for o in [*waiting, exemption] if o.unknown]
    if unknown:
        for outcome in unknown:
            eng.need_from(outcome)
        right.needs_data = True
        return
    right.eligible = False
    mode = ctx.fact("f_sickness_insurance_mode_on", date=ctx.field("incapacity.start_date"))
    rule_id = "SICK-ELIG-003" if mode == "VOLUNTARY" else "SICK-ELIG-002"
    required = ctx.param("WAITING_DAYS_VOLUNTARY" if mode == "VOLUNTARY" else "WAITING_DAYS_MANDATORY")
    days = ctx.fact("f_continuous_sickness_insurance_days", as_of=ctx.field("incapacity.start_date"))
    right.applied += [rule_id, "SICK-ELIG-005"]
    right.reasons.append(make_reason(
        eng, "WAITING_PERIOD_NOT_MET", rule_id,
        f"Okres wyczekiwania niespełniony: {days} dni nieprzerwanego ubezpieczenia chorobowego przed niezdolnością, "
        f"wymagane {required} dni. Zasiłek przysługuje dopiero po upływie okresu wyczekiwania.", "art. 4 ust. 1-2"))


def _rate(eng: Engine, rule_ids: list[str], benefit: dict[str, Any]) -> bool:
    """Stawka przez ``overrides``; UNKNOWN reguły nadpisującej (np. brak informacji o ciąży) → brak stawki.

    Zwraca True, gdy brakuje danych do ustalenia stawki.
    """
    ctx = eng.ctx
    winner, unknown_overriders = eng.pick(rule_ids)
    if unknown_overriders or winner is None:
        for outcome in unknown_overriders or [eng.eval(r) for r in rule_ids]:
            if outcome.unknown:
                eng.need_from(outcome)
        return True
    rate = ctx.param(eng.rules.rule(winner.rule_id)["result"]["set"]["rate"]["param"])
    benefit["rate"] = dec_str(rate)
    benefit["applied_rules"].append(winner.rule_id)
    rule = eng.rules.rule(winner.rule_id)
    benefit["reasons"].append(make_reason(eng, "RATE_" + winner.rule_id.replace("-", "_"), winner.rule_id,
                                          f"{rule['name']} — {pct(rate)}.", rule["source_location"]))
    return False


def _benefit(benefit_type: str, right: _Right, payer: str | None) -> dict[str, Any]:
    benefit: dict[str, Any] = {
        "benefit_type": benefit_type, "leave_type": None, "status": None, "rate": None, "period": None,
        "days": None, "daily_amount_exact": None, "total_amount_exact": None, "payer_of_benefit": payer,
        "reasons": list(right.reasons), "applied_rules": list(right.applied),
    }
    if right.suspended is not None:
        benefit["suspended_until_debt_repaid"] = right.suspended
    return benefit


def evaluate_sickness(eng: Engine) -> list[dict[str, Any]]:
    ctx = eng.ctx
    ctx.state["benefit"] = "SICKNESS_BENEFIT"
    right = _sickness_right(eng)
    ctx.state[SICKNESS_RIGHT_STATE] = right.exists
    payer, payer_rule = payer_of_benefit(eng)
    if payer_rule is not None:
        right.applied.append(payer_rule)

    start = to_date(ctx.field("incapacity.start_date"))
    end = to_date(ctx.field("incapacity.end_date"))
    employee = ctx.fact("f_is_employee_on", date=start) if start else None
    benefits: list[dict[str, Any]] = []
    with_sickness_benefit = employee is not True
    if employee is True:
        sick_pay, remaining = _sick_pay(eng, right)
        benefits.append(sick_pay)
        # SICKPAY-TRN-001: limit wynagrodzenia wyczerpany → zasiłek chorobowy; niezdolność dłuższa niż pozostały
        # limit → także zasiłek (podział okresu e-ZLA — BE1-05)
        if remaining == 0 and eng.eval("SICKPAY-TRN-001").fired:
            benefits.pop()
            with_sickness_benefit = True
        elif remaining is not None and start and end and days_in(start, end) > remaining:
            with_sickness_benefit = True
    if with_sickness_benefit:
        benefits.append(_sickness_benefit(eng, right, payer))

    for rule_id in NOT_RUN:
        if rule_id not in eng.not_evaluated and rule_id not in eng.trace:
            eng.not_evaluated.append(rule_id)
    return benefits


def _sickness_benefit(eng: Engine, right: _Right, payer: str | None) -> dict[str, Any]:
    eng.ctx.state["benefit"] = "SICKNESS_BENEFIT"
    benefit = _benefit("SICKNESS_BENEFIT", right, payer)
    needs_data = right.needs_data
    if right.exists is not False:
        needs_data = _rate(eng, SICK_RATE_RULES, benefit) or needs_data
    benefit["status"] = aggregate_status(excluded=right.excluded, review=right.review, needs_data=needs_data,
                                         eligible=right.eligible)
    return benefit


def _sick_pay(eng: Engine, right: _Right) -> tuple[dict[str, Any], int | None]:
    """Wynagrodzenie chorobowe (KP art. 92) — wypłaca pracodawca (płatnik składek)."""
    ctx = eng.ctx
    ctx.state["benefit"] = "EMPLOYER_SICK_PAY"
    benefit = _benefit("EMPLOYER_SICK_PAY", right, None)
    remaining = ctx.fact("f_sick_pay_days_remaining_in_year")
    needs_data = right.needs_data
    excluded = right.excluded
    eligible: bool | None = right.eligible
    no_right = eng.eval("SICKPAY-EXCL-001")
    if no_right.fired:
        excluded = True
        benefit["applied_rules"].append("SICKPAY-EXCL-001")
        benefit["reasons"].append(make_reason(
            eng, eng.rules.rule("SICKPAY-EXCL-001")["result"]["reason_code"], "SICKPAY-EXCL-001",
            "Wynagrodzenie chorobowe nie przysługuje, gdy brak prawa do zasiłku chorobowego.", "KP art. 92 § 3 pkt 2"))
    else:
        elig = eng.eval("SICKPAY-ELIG-001")
        if elig.fired:
            eligible = True
            benefit["applied_rules"].append("SICKPAY-ELIG-001")
            benefit["payer_of_benefit"] = "CONTRIBUTION_PAYER"
            needs_data = _rate(eng, SICKPAY_RATE_RULES, benefit) or needs_data
        elif elig.unknown:
            eng.need_from(elig)
            needs_data = True
        elif remaining == 0:
            eligible = False
    status = aggregate_status(excluded=excluded, review=right.review, needs_data=needs_data, eligible=eligible)
    benefit["status"] = status
    return benefit, remaining
