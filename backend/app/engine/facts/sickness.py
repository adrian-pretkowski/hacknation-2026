"""Fakty — zasiłek chorobowy i wynagrodzenie chorobowe (zus_rules/07 §4).

BE1-04: zestaw potrzebny do ustalenia prawa, płatnika i stawki (SICK-ELIG, SICK-RATE, SICKPAY-ELIG/RATE).
BE1-05: zasiłek po ustaniu tytułu (art. 7, 13), okres zasiłkowy 182/270 dni i łączenie okresów (art. 8–9),
podział wynagrodzenie/zasiłek (KP art. 92), dni bez świadczenia (art. 12 ust. 2).
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.core.dates import days_in, gap_days_between, to_date
from app.engine.facts.insurance import _last_title_end, event_day
from app.engine.facts.registry import Context, fact

# Stan ustawiany przez pipeline po ocenie grupy SICK-ELIG (07 §4 f_sickness_benefit_right_exists)
SICKNESS_RIGHT_STATE = "sickness_benefit_right"


@fact("f_incapacity_in_pregnancy")
def incapacity_in_pregnancy(ctx: Context) -> bool | None:
    """07 §4: TRUE gdy kod B w ``incapacity.codes`` albo ``pregnancy.is_pregnant_during_incapacity = true``;
    FALSE tylko gdy ``is_pregnant_during_incapacity = false``; inaczej None (brak kodu B ≠ brak ciąży).

    USTAWA art. 11 ust. 2 pkt 1, art. 57 ust. 2; KP art. 92 § 1 pkt 2.
    """
    codes = ctx.field("incapacity.codes") or []
    declared = ctx.field("pregnancy.is_pregnant_during_incapacity")
    if "B" in codes or declared is True:
        return True
    if declared is False:
        return False
    return ctx.need("pregnancy.is_pregnant_during_incapacity")


@fact("f_sick_pay_day_limit")
def sick_pay_day_limit(ctx: Context, year: Any = None) -> int | None:
    """07 §4: SICK_PAY_DAYS_50PLUS, gdy ``year > rok(person.birth_date) + SICK_PAY_AGE_THRESHOLD``,
    inaczej SICK_PAY_DAYS_STD (limit obniżony od roku NASTĘPNEGO po ukończeniu 50 lat). KP art. 92 § 1 pkt 1, § 5.
    """
    birth = to_date(ctx.field("person.birth_date"))
    if birth is None:
        return ctx.need("person.birth_date")
    if year is None:
        return None
    if int(year) > birth.year + int(ctx.param("SICK_PAY_AGE_THRESHOLD")):
        return int(ctx.param("SICK_PAY_DAYS_50PLUS"))
    return int(ctx.param("SICK_PAY_DAYS_STD"))


@fact("f_sick_pay_days_remaining_in_year")
def sick_pay_days_remaining_in_year(ctx: Context) -> int | None:
    """07 §4: ``max(0, f_sick_pay_day_limit(rok niezdolności) − benefit_history.employer_sick_pay_days_in_year)``.

    Niezdolność przechodząca przez 31.12 (odnowienie limitu) — BE1-05. KP art. 92 § 1.
    """
    start = to_date(ctx.field("incapacity.start_date"))
    if start is None:
        return ctx.need("incapacity.start_date")
    used = ctx.field("benefit_history.employer_sick_pay_days_in_year")
    limit = ctx.fact("f_sick_pay_day_limit", year=start.year)
    if used is None:
        return ctx.need("benefit_history.employer_sick_pay_days_in_year")
    if limit is None:
        return None
    return max(0, limit - int(used))


@fact("f_sickness_benefit_right_exists")
def sickness_benefit_right_exists(ctx: Context) -> bool | None:
    """07 §4: Kleene-AND grupy SICK-ELIG (001∨006, okres wyczekiwania 002/003/005), NOT SICK-EXCL-*, NOT GEN-EXCL-001.

    Wartość ustala pipeline (``engine/pipeline/sickness.py``) przed oceną reguł SICKPAY-*; brak oceny → None.
    KP art. 92 § 3 pkt 2.
    """
    return ctx.state.get(SICKNESS_RIGHT_STATE)


# ---------------------------------------------------------------------------------------- BE1-05
# art. 12 ust. 2 — dni bez zasiłku, niewliczane do okresu zasiłkowego (lista także w SICK-EXCL-002 args.types)
EXCLUDED_LEAVE_TYPES = ("UNPAID_LEAVE", "CHILDCARE_LEAVE", "DETENTION", "KP_63_2_P8_ABSENCE", "CARER_LEAVE")


def incapacity_period(ctx: Context) -> tuple[date, date] | None:
    """[start, end] bieżącej niezdolności (C3); brak dat → None + braki danych."""
    start, end = to_date(ctx.field("incapacity.start_date")), to_date(ctx.field("incapacity.end_date"))
    if start is None:
        ctx.need("incapacity.start_date")
    if end is None:
        ctx.need("incapacity.end_date")
    return None if start is None or end is None or end < start else (start, end)


def excluded_leave_days(ctx: Context, start: date, end: date, types: Any = None) -> set[date]:
    """Dni [start, end] w ``employment.leaves`` typów z art. 12 ust. 2 (``types`` z reguły SICK-EXCL-002)."""
    allowed = list(types or EXCLUDED_LEAVE_TYPES)
    days: set[date] = set()
    for leave in ctx.field("employment.leaves") or []:
        first, last = to_date(leave.get("from")), to_date(leave.get("to"))
        if leave.get("type") not in allowed or first is None:
            continue
        first, last = max(start, first), min(end, last or end)
        days.update(first + timedelta(days=i) for i in range((last - first).days + 1))
    return days


def _history(ctx: Context) -> list[dict[str, Any]] | None:
    """Wcześniejsze niezdolności; None = nie wiadomo (pusta lista bez sickness_periods_confirmed_complete)."""
    periods = ctx.field("benefit_history.sickness_periods")
    if periods:
        return [p for p in periods if to_date(p.get("from")) and to_date(p.get("to"))]
    if ctx.field("benefit_history.sickness_periods_confirmed_complete") is True:
        return []
    return ctx.need("benefit_history.sickness_periods")


def _history_in_pregnancy(ctx: Context, period: dict[str, Any]) -> bool | None:
    """Wcześniejsza niezdolność w ciąży: kod B → TRUE; inaczej wg ``pregnancy.pregnancy_start_date`` (DERIVED)."""
    if "B" in (period.get("codes") or []):
        return True
    start = to_date(ctx.field("pregnancy.pregnancy_start_date"))
    if start is None:
        return None
    if to_date(period["from"]) >= start:
        return True
    return False if to_date(period["to"]) < start else None


def _merge(periods: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Okresy nachodzące scalone (07 §4); ciąża okresu scalonego = Kleene-OR."""
    merged: list[dict[str, Any]] = []
    for period in sorted(periods, key=lambda p: p["from"]):
        last = merged[-1] if merged else None
        if last is not None and period["from"] <= last["to"]:
            last["to"] = max(last["to"], period["to"])
            last["excluded"] += period["excluded"]
            flags = {last["pregnant"], period["pregnant"]}
            last["pregnant"] = True if True in flags else None if None in flags else False
            continue
        merged.append(dict(period))
    return merged


def _chain_days(ctx: Context, periods: list[dict[str, Any]]) -> int | None:
    """Dni okresu zasiłkowego łańcucha kończącego się ostatnim okresem (art. 9 ust. 2): okresy łączą się przy przerwie
    (C8) ≤ BENEFIT_PERIOD_BREAK_DAYS; niezdolność w ciąży nie łączy się z wcześniejszą poza ciążą (zd. 2)."""
    if not periods:
        return 0
    max_break = int(ctx.param("BENEFIT_PERIOD_BREAK_DAYS"))
    chain = [periods[-1]]
    for prev in reversed(periods[:-1]):
        head = chain[0]
        if gap_days_between(prev["to"], head["from"]) > max_break:
            break
        if head["pregnant"] is True and prev["pregnant"] is not True:
            if prev["pregnant"] is None:
                return ctx.need("pregnancy.pregnancy_start_date")
            break
        if head["pregnant"] is None:
            return None
        chain.insert(0, prev)
    return sum(days_in(p["from"], p["to"]) - p["excluded"] for p in chain)


def _history_periods(ctx: Context, history: list[dict[str, Any]], before: date) -> list[dict[str, Any]]:
    return [{"from": to_date(p["from"]), "to": to_date(p["to"]), "excluded": 0,
             "pregnant": _history_in_pregnancy(ctx, p)} for p in history if to_date(p["from"]) < before]


@fact("f_incapacity_continuous_days")
def incapacity_continuous_days(ctx: Context) -> int | None:
    """07 §4: dni [start, end] bieżącej niezdolności + bezpośrednio przyległych okresów z historii. USTAWA art. 7."""
    period = incapacity_period(ctx)
    if period is None:
        return None
    start, end = period
    history = sorted((p for p in ctx.field("benefit_history.sickness_periods") or []
                      if to_date(p.get("from")) and to_date(p.get("to"))), key=lambda p: to_date(p["from"]))
    for prev in reversed(history):
        if to_date(prev["to"]) + timedelta(days=1) == start:
            start = to_date(prev["from"])
    return days_in(start, end)


@fact("f_sick_pay_limit_reached_date")
def sick_pay_limit_reached_date(ctx: Context) -> date | None:
    """07 §4: ostatni dzień wynagrodzenia chorobowego w roku początku niezdolności (start + pozostałe dni − 1;
    pozostało 0 → dzień przed niezdolnością). Odnowienie limitu 1.01 — podział w pipeline. KP art. 92 § 1.
    """
    start = to_date(ctx.field("incapacity.start_date"))
    remaining = ctx.fact("f_sick_pay_days_remaining_in_year")
    if start is None or remaining is None:
        return None
    return start + timedelta(days=remaining - 1)


@fact("f_day_covered_by_retained_pay")
def day_covered_by_retained_pay(ctx: Context, day: Any = None) -> bool | None:
    """07 §4: dzień (domyślnie: pierwszy dzień segmentu) objęty wynagrodzeniem chorobowym pracownika.

    USTAWA art. 12 ust. 1; KP art. 92 § 1.
    """
    current = to_date(day) or to_date(ctx.field("segment.from"))
    start = to_date(ctx.field("incapacity.start_date"))
    if current is None or start is None:
        return None
    employee = ctx.fact("f_is_employee_on", date=start)
    if employee is not True:
        return employee
    reached = ctx.fact("f_sick_pay_limit_reached_date")
    return None if reached is None else start <= current <= reached


@fact("f_day_in_excluded_leave")
def day_in_excluded_leave(ctx: Context, types: Any = None, day: Any = None) -> bool | None:
    """07 §4: dzień (domyślnie: pierwszy dzień segmentu) w ``employment.leaves`` typu z listy. USTAWA art. 12 ust. 2."""
    current = to_date(day) or to_date(ctx.field("segment.from"))
    if ctx.field("employment.leaves") is None:
        return ctx.need("employment.leaves")
    if current is None:
        return None
    return bool(excluded_leave_days(ctx, current, current, types))


@fact("f_waiting_period_met_during_insurance")
def waiting_period_met_during_insurance(ctx: Context) -> bool | None:
    """07 §4: okres wyczekiwania (WAITING_DAYS_MANDATORY/VOLUNTARY wg trybu ostatniego tytułu) upłynął przed
    ustaniem tytułu — dni łańcucha (art. 4 ust. 2) do dnia ustania włącznie. USTAWA art. 4 ust. 1, art. 13 ust. 1.
    """
    day = event_day(ctx)
    titles = ctx.field("insurance.titles")
    if day is None or not titles:
        return None
    open_title, end = _last_title_end(titles, day)
    if open_title or end is None:
        return None
    mode = ctx.fact("f_sickness_insurance_mode_on", date=end)
    before_end = ctx.fact("f_continuous_sickness_insurance_days", as_of=end)
    if mode is None or before_end is None:
        return None
    days = before_end + 1  # dzień ustania tytułu jest jeszcze dniem ubezpieczenia (C3)
    return days >= int(ctx.param("WAITING_DAYS_MANDATORY" if mode == "MANDATORY" else "WAITING_DAYS_VOLUNTARY"))


@fact("f_benefit_period_days_used")
def benefit_period_days_used(ctx: Context) -> int | None:
    """07 §4: dni okresu zasiłkowego — historia + bieżąca niezdolność (łącznie z nią), łączenie przy przerwie
    ≤ BENEFIT_PERIOD_BREAK_DAYS (C8), reset przy nowej niezdolności w ciąży po wcześniejszej poza ciążą
    (art. 9 ust. 2 zd. 2); bez dni z art. 12 ust. 2 bieżącej niezdolności. USTAWA art. 9 ust. 1-2.
    """
    period = incapacity_period(ctx)
    history = _history(ctx)
    if period is None or history is None:
        return None
    start, end = period
    current = {"from": start, "to": end, "pregnant": ctx.fact("f_incapacity_in_pregnancy"),
               "excluded": len(excluded_leave_days(ctx, start, end))}
    return _chain_days(ctx, _merge(_history_periods(ctx, history, start) + [current]))


@fact("f_benefit_period_limit_days")
def benefit_period_limit_days(ctx: Context) -> int | None:
    """07 §4: BENEFIT_PERIOD_PREGNANCY_TB_DAYS (270) gdy niezdolność w ciąży lub kod D, BENEFIT_PERIOD_STD_DAYS (182)
    gdy oba FALSE; inaczej None. Okres mieszany → GAP-006. USTAWA art. 8 ust. 1.
    """
    if "D" in (ctx.field("incapacity.codes") or []):
        return int(ctx.param("BENEFIT_PERIOD_PREGNANCY_TB_DAYS"))
    pregnant = ctx.fact("f_incapacity_in_pregnancy")
    if pregnant is None:
        return None
    return int(ctx.param("BENEFIT_PERIOD_PREGNANCY_TB_DAYS" if pregnant else "BENEFIT_PERIOD_STD_DAYS"))


@fact("f_benefit_period_exhausted")
def benefit_period_exhausted(ctx: Context) -> bool | None:
    """07 §4: ``f_benefit_period_days_used ≥ f_benefit_period_limit_days``. USTAWA art. 8."""
    used, limit = ctx.fact("f_benefit_period_days_used"), ctx.fact("f_benefit_period_limit_days")
    return None if used is None or limit is None else used >= limit


@fact("f_benefit_period_exhausted_before_title_end")
def benefit_period_exhausted_before_title_end(ctx: Context) -> bool | None:
    """07 §4: okres zasiłkowy z historii wyczerpany najpóźniej w dniu ustania tytułu. USTAWA art. 13 ust. 2."""
    day = event_day(ctx)
    titles = ctx.field("insurance.titles")
    history = _history(ctx)
    limit = ctx.fact("f_benefit_period_limit_days")
    if day is None or not titles or history is None or limit is None:
        return None
    open_title, end = _last_title_end(titles, day)
    if open_title or end is None:
        return None
    used = _chain_days(ctx, _merge([p for p in _history_periods(ctx, history, day) if p["to"] <= end]))
    return None if used is None else used >= limit
