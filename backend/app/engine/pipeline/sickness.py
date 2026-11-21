"""Niezdolność do pracy (event.type PREGNANCY_INCAPACITY / SICKNESS) — zasiłek i wynagrodzenie chorobowe.

Kroki 07 §1 (BE1-04: prawo, płatnik, stawka; BE1-05: po ustaniu tytułu, okres zasiłkowy, podział dni, kwoty):
- 2 płatnik: GEN-CLS-001/002 (``general.payer_of_benefit``),
- 3 zadłużenie: GEN-EXCL-001/002 (art. 2a dotyczy zasiłku chorobowego),
- 4 prawo: SICK-ELIG-001 z okresem wyczekiwania SICK-ELIG-002/003 (łańcuch SICK-ELIG-004, wyjątek SICK-ELIG-005)
  albo SICK-ELIG-006 po ustaniu tytułu (art. 7) z wykluczeniami SICK-EXCL-003/004; HUMAN_REVIEW SICK-EXCL-005/007
  (TRUE → NEEDS_REVIEW, brak danych = brak potwierdzonej przesłanki → assumption) → ``f_sickness_benefit_right_exists``,
- 5 okres zasiłkowy: SICK-DUR-001 (182/270 dni) z ``overrides`` SICK-DUR-002 (91 dni po ustaniu tytułu, nie w ciąży),
  SICK-DUR-003 (łączenie okresów, przerwa ≤ 60 dni, reset ciąży), SICK-DUR-004 (dni niewliczane), SICK-DUR-005 FUTURE,
- podział dni e-ZLA: wynagrodzenie chorobowe pracownika do limitu 33/14 dni w roku kalendarzowym (SICKPAY-ELIG-001,
  SICKPAY-TRN-001; limit odnawia się 1.01), potem zasiłek; bez świadczenia: urlopy z art. 12 ust. 2 (SICK-EXCL-002),
  pierwsze dni przy kodzie C (SICK-EXCL-006), dni ponad okres zasiłkowy,
- 7 stawka: SICK-RATE-001/002, SICKPAY-RATE-001/002 (``overrides``; UNKNOWN stawki 100% → NEEDS_DATA, nie 80%),
- 8 kwota: SICK-CALC-001 / ``f_benefit_amount`` per ciągły segment dni (podstawa/30 × stawka × dni).

SICKNESS_BENEFIT jest zawsze w wyniku (status = prawo do zasiłku; ``days`` = dni płatne zasiłkiem, może być 0, gdy
całą niezdolność pokrywa wynagrodzenie chorobowe); EMPLOYER_SICK_PAY — tylko pracownik z niewyczerpanym limitem.
Poza zakresem (``not_evaluated_rules``): dokumenty i terminy (BE2-04), metody podstawy BASE-* (BE2-03).
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.core.dates import to_date
from app.core.money import dec_str
from app.engine.facts.sickness import SICKNESS_RIGHT_STATE, excluded_leave_days
from app.engine.pipeline.engine import Engine, aggregate_status
from app.engine.pipeline.general import debt_exclusion, make_reason, payer_of_benefit, pct

SICK_PAY, BENEFIT, NONE = "EMPLOYER_SICK_PAY", "SICKNESS_BENEFIT", "NONE"
WAITING_RULES = ["SICK-ELIG-002", "SICK-ELIG-003"]
DURATION_RULES = ["SICK-DUR-001", "SICK-DUR-002"]
SICK_RATE_RULES = ["SICK-RATE-001", "SICK-RATE-002"]
SICKPAY_RATE_RULES = ["SICKPAY-RATE-001", "SICKPAY-RATE-002"]
NOT_RUN = ["SICK-DOC-001", "SICK-DOC-002", "SICK-DL-001", "BASE-EMP-001", "BASE-NEMP-001"]
HUMAN_REVIEW_ASSUMPTIONS = {
    "SICK-EXCL-005": {"code": "NO_INFO_INTENTIONAL_OFFENCE",
                      "text": "Brak informacji o prawomocnym wyroku za umyślne przestępstwo — przyjęto, że "
                              "przesłanka wyłączenia z art. 15 nie zachodzi."},
    "SICK-EXCL-007": {"code": "NO_INFO_ART17",
                      "text": "Brak informacji o pracy zarobkowej w czasie zwolnienia lub sfałszowaniu zaświadczenia — "
                              "przyjęto, że przesłanka utraty prawa z art. 17 nie zachodzi."},
}


class _Right:
    """Wynik grupy SICK-ELIG + SICK-EXCL + GEN-EXCL: wspólny dla zasiłku i wynagrodzenia chorobowego."""

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
            right.reasons.append(make_reason(
                eng, "AFTER_TITLE_END", "SICK-ELIG-006",
                f"Niezdolność powstała po ustaniu ubezpieczenia — zasiłek przysługuje, bo trwa co najmniej "
                f"{ctx.param('AFTER_TITLE_MIN_INCAPACITY_DAYS')} dni i powstała do "
                f"{ctx.param('AFTER_TITLE_ONSET_MAX_DAYS')} dni od ustania tytułu. Wypłaca ZUS.", "art. 7 pkt 1"))
            _after_title_exclusions(eng, right)
        elif after_title.kind in ("NOT_EVALUATED", "BLOCKED"):
            right.review = True
            right.reasons.append(make_reason(
                eng, "AFTER_TITLE_END_NOT_EVALUATED", "SICK-ELIG-006",
                "Niezdolność do pracy nie powstała w czasie ubezpieczenia chorobowego, a warunków zasiłku po "
                "ustaniu tytułu (art. 7) nie da się rozstrzygnąć — wymaga weryfikacji.", "art. 6 ust. 1; art. 7"))
        elif after_title.unknown:
            eng.need_from(after_title)
            right.needs_data = True
        else:
            right.eligible = False
            right.applied += ["SICK-ELIG-001", "SICK-ELIG-006"]
            insured = ctx.fact("f_sickness_insured_on", date=ctx.field("incapacity.start_date"))
            if insured:
                right.reasons.append(make_reason(eng, "NO_INCAPACITY_CERTIFICATE", "SICK-ELIG-001",
                                                 "Brak zaświadczenia lekarskiego o niezdolności do pracy.",
                                                 "art. 6 ust. 1; art. 53 ust. 1"))
            else:
                right.reasons.append(make_reason(
                    eng, "NOT_INSURED_ON_INCAPACITY", "SICK-ELIG-006",
                    f"Niezdolność do pracy nie powstała w czasie ubezpieczenia chorobowego, a warunki zasiłku po "
                    f"ustaniu tytułu nie są spełnione (niezdolność musi powstać do "
                    f"{ctx.param('AFTER_TITLE_ONSET_MAX_DAYS')} dni od ustania i trwać co najmniej "
                    f"{ctx.param('AFTER_TITLE_MIN_INCAPACITY_DAYS')} dni).", "art. 6 ust. 1; art. 7"))
    if right.eligible is True and "SICK-ELIG-001" in right.applied:
        _waiting_period(eng, right)
    if right.eligible is True and not right.needs_data and not right.excluded:
        debt = debt_exclusion(eng)
        right.applied += debt.applied
        right.reasons += debt.reasons
        right.excluded, right.needs_data = debt.excluded, debt.needs_data
        right.suspended = debt.suspended_until_debt_repaid
    return right


def _after_title_exclusions(eng: Engine, right: _Right) -> None:
    """SICK-EXCL-003 (art. 13 ust. 1: emerytura/renta, praca, brak wyczekiwania, zasiłek dla bezrobotnych, KRUS)
    i SICK-EXCL-004 (art. 13 ust. 2: okres zasiłkowy wyczerpany przed ustaniem tytułu)."""
    for exc in eng.exclusions("SICK-ELIG-006"):
        if exc.decided:
            right.applied.append(exc.rule_id)
        if exc.unknown:
            eng.need_from(exc)
            right.needs_data = True
        elif exc.fired:
            right.excluded = True
            code = eng.rules.rule(exc.rule_id)["result"]["reason_code"]
            message, location = (
                ("Zasiłek po ustaniu ubezpieczenia nie przysługuje (emerytura lub renta, dalsza praca zarobkowa, "
                 "niespełniony okres wyczekiwania, zasiłek dla bezrobotnych albo ubezpieczenie w KRUS).",
                 "art. 13 ust. 1")
                if exc.rule_id == "SICK-EXCL-003" else
                ("Okres zasiłkowy wyczerpano przed ustaniem ubezpieczenia.", "art. 13 ust. 2"))
            right.reasons.append(make_reason(eng, code, exc.rule_id, message, location))


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


def _human_review(eng: Engine, right: _Right, assumptions: list[dict[str, str]]) -> None:
    """HUMAN_REVIEW: warunki TRUE → NEEDS_REVIEW; brak danych → assumption (notatka SICK-EXCL-005), bez braków."""
    for rule_id, assumption in HUMAN_REVIEW_ASSUMPTIONS.items():
        outcome = eng.eval(rule_id)
        if outcome.kind == "BLOCKED":
            right.review = True
            right.applied.append(rule_id)
            right.reasons.append(make_reason(eng, eng.rules.rule(rule_id)["result"]["reason_code"], rule_id,
                                             eng.rules.rule(rule_id)["name"] + " — wymaga oceny ZUS.",
                                             eng.rules.rule(rule_id)["source_location"]))
        elif outcome.unknown:
            assumptions.append(assumption)


# ------------------------------------------------------------ okres zasiłkowy
class _Period:
    def __init__(self) -> None:
        self.limit: int | None = None
        self.used: int | None = None
        self.needs_data = False
        self.applied: list[str] = []


def _benefit_period(eng: Engine) -> _Period:
    """SICK-DUR-001/002 (overrides) → limit dni; SICK-DUR-003 → dni wykorzystane łącznie z bieżącą niezdolnością."""
    ctx = eng.ctx
    period = _Period()
    ctx.state["benefit"] = BENEFIT
    winner, unknown_overriders = eng.pick(DURATION_RULES)
    for outcome in unknown_overriders:
        eng.need_from(outcome)
    if winner is not None and not unknown_overriders:
        rule = eng.rules.rule(winner.rule_id)
        if winner.rule_id == "SICK-DUR-002":
            period.limit = int(ctx.param(rule["result"]["set"]["after_title_max_days"]["param"]))
        else:
            period.limit = _fact(eng, "SICK-DUR-001", rule["result"]["compute"])
        if period.limit is not None:
            period.applied.append(winner.rule_id)
    if period.limit is None:
        dur = eng.eval("SICK-DUR-001")
        if dur.unknown:
            eng.need_from(dur)
        period.needs_data = True
    used_rule = eng.eval("SICK-DUR-003")
    # brak historii → braki danych dla limitu, ale nie blokuje prawa do zasiłku (notatka SICK-DUR-003)
    period.used = _fact(eng, "SICK-DUR-003", eng.rules.rule("SICK-DUR-003")["result"]["compute"])
    if used_rule.fired and period.used is not None:
        period.applied.append("SICK-DUR-003")
    # SICK-DUR-004: pomijane są dni z art. 12 ust. 2 (w f_benefit_period_days_used); dni okresu wyczekiwania
    # w historii nie są znane z wejścia — reguła oceniana, ale nie wpisywana jako zastosowana
    eng.eval("SICK-DUR-004")
    eng.eval("SICK-DUR-005")  # FUTURE (od 2027-01-01) → future_changes
    return period


def _fact(eng: Engine, rule_id: str, name: str, **args: Any) -> Any:
    """Fakt z ``result.compute`` — jego braki danych przypisane do ``rule_id``."""
    local = eng.ctx.child()
    value = local.fact(name, **args)
    if value is None:
        for field_path in local.missing:
            eng.need(field_path, rule_id)
    return value


# ------------------------------------------------------------ podział dni
class _Plan:
    def __init__(self) -> None:
        self.days: dict[date, str] = {}
        self.unknown = False
        self.applied: list[str] = []
        self.reasons: list[dict[str, Any]] = []


def _day_plan(eng: Engine, start: date | None, end: date | None, employee: bool | None,
              period: _Period) -> _Plan:
    """Dzień niezdolności → EMPLOYER_SICK_PAY / SICKNESS_BENEFIT / NONE."""
    ctx = eng.ctx
    plan = _Plan()
    if start is None or end is None or end < start:
        plan.unknown = True
        return plan
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    types = eng.rules.rule("SICK-EXCL-002")["conditions"]["all"][0]["args"]["types"]
    leave_days = excluded_leave_days(ctx, start, end, types)
    if leave_days:
        plan.applied.append("SICK-EXCL-002")
        plan.reasons.append(make_reason(
            eng, "EXCLUDED_LEAVE_DAYS", "SICK-EXCL-002",
            "Za dni urlopu bezpłatnego, wychowawczego i innych przerw z art. 12 ust. 2 świadczenie nie przysługuje "
            "i dni te nie wliczają się do okresu zasiłkowego.", "art. 12 ust. 2"))
    alcohol_days = 0
    if eng.eval("SICK-EXCL-006").fired:
        alcohol_param = eng.rules.rule("SICK-EXCL-006")["result"]["set"]["excluded_initial_days"]["param"]
        alcohol_days = int(ctx.param(alcohol_param))
        plan.applied.append("SICK-EXCL-006")
        plan.reasons.append(make_reason(
            eng, "ALCOHOL_FIRST_DAYS", "SICK-EXCL-006",
            f"Kod C na zaświadczeniu — za pierwsze {alcohol_days} dni niezdolności świadczenie nie przysługuje.",
            "art. 16"))
    counted = [d for d in days if d not in leave_days]
    prior = (period.used - len(counted)) if period.used is not None else 0
    available = (period.limit - prior) if period.limit is not None else None

    remaining: dict[int, int | None] = {}
    if employee is True:
        remaining[start.year] = _fact(eng, "SICKPAY-ELIG-001", "f_sick_pay_days_remaining_in_year")
    position = 0
    for index, day in enumerate(days):
        if day in leave_days:
            plan.days[day] = NONE
            continue
        position += 1
        # art. 16: pierwsze dni niezdolności liczone kalendarzowo (także dni urlopu z art. 12 ust. 2)
        if index < alcohol_days or (available is not None and position > available):
            plan.days[day] = NONE
            continue
        if employee is True:
            if day.year not in remaining:  # limit wynagrodzenia odnawia się w nowym roku kalendarzowym
                remaining[day.year] = _fact(eng, "SICKPAY-ELIG-001", "f_sick_pay_day_limit", year=day.year)
            left = remaining[day.year]
            if left is None:
                plan.unknown = True
            elif left > 0:
                remaining[day.year] = left - 1
                plan.days[day] = SICK_PAY
                continue
        plan.days[day] = BENEFIT
    if available is not None and position > available:
        plan.reasons.append(make_reason(
            eng, "BENEFIT_PERIOD_EXHAUSTED", "SICK-DUR-001",
            f"Okres zasiłkowy ({period.limit} dni) kończy się w trakcie tej niezdolności — za dalsze dni zasiłek "
            f"chorobowy nie przysługuje (można wystąpić o świadczenie rehabilitacyjne).", "art. 8; art. 18"))
    return plan


def _segments(plan: _Plan, kind: str) -> list[tuple[date, date]]:
    segments: list[tuple[date, date]] = []
    for day in sorted(d for d, k in plan.days.items() if k == kind):
        if segments and segments[-1][1] + timedelta(days=1) == day:
            segments[-1] = (segments[-1][0], day)
        else:
            segments.append((day, day))
    return segments


def _amounts(eng: Engine, rate: Decimal | None, segments: list[tuple[date, date]],
             rule_id: str) -> tuple[Decimal | None, Decimal | None]:
    """``f_benefit_amount`` per ciągły segment; kwota dzienna jednakowa, suma segmentów bez zaokrągleń (C1)."""
    if rate is None or not segments:
        return None, None
    ctx = eng.ctx
    ctx.state["rate"] = rate
    daily = total = None
    for first, last in segments:
        ctx.segment = {"from": first.isoformat(), "to": last.isoformat()}
        amount = _fact(eng, rule_id, "f_benefit_amount")
        if amount is None:
            ctx.segment = None
            return None, None
        daily = amount["daily"]
        total = amount["total"] if total is None else total + amount["total"]
    ctx.segment = None
    return daily, total


# ------------------------------------------------------------ stawki i świadczenia
def _rate(eng: Engine, rule_ids: list[str], benefit: dict[str, Any]) -> Decimal | None:
    """Stawka przez ``overrides``; UNKNOWN reguły nadpisującej (np. brak informacji o ciąży) → brak stawki."""
    ctx = eng.ctx
    winner, unknown_overriders = eng.pick(rule_ids)
    if unknown_overriders or winner is None:
        for outcome in unknown_overriders or [eng.eval(r) for r in rule_ids]:
            if outcome.unknown:
                eng.need_from(outcome)
        return None
    rate = ctx.param(eng.rules.rule(winner.rule_id)["result"]["set"]["rate"]["param"])
    benefit["rate"] = dec_str(rate)
    benefit["applied_rules"].append(winner.rule_id)
    rule = eng.rules.rule(winner.rule_id)
    benefit["reasons"].append(make_reason(eng, "RATE_" + winner.rule_id.replace("-", "_"), winner.rule_id,
                                          f"{rule['name']} — {pct(rate)}.", rule["source_location"]))
    return rate


def _benefit(benefit_type: str, right: _Right, payer: str | None, period: _Period, plan: _Plan,
             kind: str) -> dict[str, Any]:
    segments = _segments(plan, kind)
    out: dict[str, Any] = {"max_days": period.limit, "days_used_in_benefit_period": period.used}
    if segments:
        out = {"from": segments[0][0].isoformat(), "to": segments[-1][1].isoformat(), **out}
    benefit: dict[str, Any] = {
        "benefit_type": benefit_type, "leave_type": None, "status": None, "rate": None, "period": out,
        "days": sum((b - a).days + 1 for a, b in segments) if not plan.unknown else None,
        "daily_amount_exact": None, "total_amount_exact": None, "payer_of_benefit": payer,
        "reasons": list(right.reasons) + list(plan.reasons),
        "applied_rules": list(right.applied) + period.applied + plan.applied,
    }
    if right.suspended is not None:
        benefit["suspended_until_debt_repaid"] = right.suspended
    return benefit


def _set_amounts(eng: Engine, benefit: dict[str, Any], rate: Decimal | None, segments: list[tuple[date, date]],
                 rule_id: str) -> bool:
    """Kwoty świadczenia; zwraca True, gdy brakuje danych do kwoty (np. podstawy)."""
    daily, total = _amounts(eng, rate, segments, rule_id)
    if daily is not None:
        benefit["daily_amount_exact"], benefit["total_amount_exact"] = dec_str(daily), dec_str(total)
        if rule_id not in benefit["applied_rules"]:
            benefit["applied_rules"].append(rule_id)
        return False
    return rate is not None and bool(segments)


def _history_assumption(eng: Engine) -> dict[str, str]:
    return {"code": "SICKNESS_HISTORY_UNKNOWN",
            "text": f"Brak historii wcześniejszych zwolnień — dni i kwoty policzono przy założeniu, że w ostatnich "
                    f"{eng.ctx.param('BENEFIT_PERIOD_BREAK_DAYS')} dniach nie było innych niezdolności do pracy "
                    f"(art. 9 ust. 2); wykorzystana część okresu zasiłkowego może być większa."}


def _mixed_period_review(eng: Engine, right: _Right, start: date | None, end: date | None) -> None:
    """GAP-006 (zus_rules/09): ciąża zaczęła się w trakcie niezdolności → okres mieszany 182/270 dni → NEEDS_REVIEW."""
    pregnancy_start = to_date(eng.ctx.field("pregnancy.pregnancy_start_date"))
    if start is None or end is None or pregnancy_start is None or not start < pregnancy_start <= end:
        return
    right.review = True
    right.reasons.append(make_reason(
        eng, "MIXED_BENEFIT_PERIOD_GAP_006", "SICK-DUR-001",
        f"Niezdolność zaczęła się przed ciążą i trwa w ciąży — długość okresu zasiłkowego "
        f"({eng.ctx.param('BENEFIT_PERIOD_STD_DAYS')} czy {eng.ctx.param('BENEFIT_PERIOD_PREGNANCY_TB_DAYS')} dni) "
        f"wymaga oceny ZUS.", "art. 8 ust. 1"))


def evaluate_sickness(eng: Engine) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    ctx = eng.ctx
    assumptions: list[dict[str, str]] = []
    ctx.state["benefit"] = BENEFIT
    right = _sickness_right(eng)
    _human_review(eng, right, assumptions)
    start = to_date(ctx.field("incapacity.start_date"))
    end = to_date(ctx.field("incapacity.end_date"))
    _mixed_period_review(eng, right, start, end)
    ctx.state[SICKNESS_RIGHT_STATE] = right.exists
    payer, payer_rule = payer_of_benefit(eng)
    if payer_rule is not None:
        right.applied.append(payer_rule)

    employee = ctx.fact("f_is_employee_on", date=start) if start else None
    period = _benefit_period(eng)
    history_missing = "benefit_history.sickness_periods" in eng.missing
    if period.used is None and period.limit is not None and start is not None and history_missing:
        assumptions.append(_history_assumption(eng))
    plan = _day_plan(eng, start, end, employee, period)
    benefits: list[dict[str, Any]] = []
    if employee is True:
        sick_pay, remaining = _sick_pay(eng, right, period, plan)
        # SICKPAY-TRN-001: limit wynagrodzenia wyczerpany → od pierwszego dnia zasiłek chorobowy
        if not (remaining == 0 and eng.eval("SICKPAY-TRN-001").fired):
            benefits.append(sick_pay)
    benefits.append(_sickness_benefit(eng, right, payer, period, plan))

    for rule_id in NOT_RUN:
        if rule_id not in eng.not_evaluated and rule_id not in eng.trace:
            eng.not_evaluated.append(rule_id)
    return benefits, assumptions


def _sickness_benefit(eng: Engine, right: _Right, payer: str | None, period: _Period, plan: _Plan) -> dict[str, Any]:
    eng.ctx.state["benefit"] = BENEFIT
    benefit = _benefit(BENEFIT, right, payer, period, plan, BENEFIT)
    needs_data = right.needs_data
    if right.exists is not False:
        rate = _rate(eng, SICK_RATE_RULES, benefit)
        calc = eng.eval("SICK-CALC-001")
        if calc.unknown and _segments(plan, BENEFIT):
            eng.need_from(calc)
            needs_data = True
        elif calc.fired:
            needs_data = _set_amounts(eng, benefit, rate, _segments(plan, BENEFIT), "SICK-CALC-001") or needs_data
        needs_data = needs_data or rate is None or period.needs_data or plan.unknown
    benefit["status"] = aggregate_status(excluded=right.excluded, review=right.review, needs_data=needs_data,
                                         eligible=right.eligible)
    return benefit


def _sick_pay(eng: Engine, right: _Right, period: _Period, plan: _Plan) -> tuple[dict[str, Any], int | None]:
    """Wynagrodzenie chorobowe (KP art. 92) — wypłaca pracodawca (płatnik składek)."""
    ctx = eng.ctx
    ctx.state["benefit"] = SICK_PAY
    benefit = _benefit(SICK_PAY, right, None, period, plan, SICK_PAY)
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
            rate = _rate(eng, SICKPAY_RATE_RULES, benefit)
            segments = _segments(plan, SICK_PAY)
            # SICK-EXCL-001: dni wynagrodzenia chorobowego — bez zasiłku, wliczane do okresu zasiłkowego
            ctx.segment = {"from": segments[0][0].isoformat()} if segments else None
            if segments and eng.eval("SICK-EXCL-001").fired:
                benefit["applied_rules"].append("SICK-EXCL-001")
            ctx.segment = None
            if segments and any(k == BENEFIT for k in plan.days.values()):
                benefit["reasons"].append(make_reason(
                    eng, "SICK_PAY_THEN_BENEFIT", "SICKPAY-TRN-001",
                    f"Wynagrodzenie chorobowe do {segments[-1][1].isoformat()} (limit dni w roku kalendarzowym), "
                    f"za dalsze dni zasiłek chorobowy.", "KP art. 92 § 1, § 4"))
            needs_data = _set_amounts(eng, benefit, rate, segments, "SICKPAY-ELIG-001") or needs_data
            needs_data = needs_data or rate is None or plan.unknown
        elif elig.unknown:
            eng.need_from(elig)
            needs_data = True
        elif remaining == 0:
            eligible = False
    benefit["status"] = aggregate_status(excluded=excluded, review=right.review, needs_data=needs_data,
                                         eligible=eligible)
    return benefit, remaining
