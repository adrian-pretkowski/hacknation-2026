"""Fakty — zasiłek macierzyński: wymiar, termin 81,5%, podstawa, kwota (zus_rules/07 §5, §7).

BE1-01: minimalny zestaw potrzebny ścieżce macierzyńskiej (parytet ze slice_v0).
Właściciel dalszych faktów macierzyńskich/rodzicielskich i podstawy: BE2-01..03.
"""
from __future__ import annotations

import calendar
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.core.dates import (
    add_months,
    contains_full_calendar_month,
    days_in,
    deadline_after,
    end_after_days,
    end_after_weeks,
    next_working_day,
    to_date,
)
from app.core.money import div, mul, round_to_step, to_decimal
from app.engine.facts.registry import Context, fact


@fact("f_maternity_leave_weeks")
def maternity_leave_weeks(ctx: Context) -> int | None:
    """07 §5: tabela MATERNITY_WEEKS_BY_CHILDREN wg count_at_birth (ADOPTION/FOSTER: count_at_event); ≥5 → „5+”.

    KP art. 180 § 1; art. 183 § 1.
    """
    path = "children.count_at_birth" if ctx.field("event.type") == "BIRTH" else "children.count_at_event"
    count = ctx.field(path)
    if count is None:
        return ctx.need(path)
    count = int(count)
    if count < 1:
        return None
    table = ctx.param("MATERNITY_WEEKS_BY_CHILDREN")
    return int(table["5+"] if count >= 5 else table[str(count)])


@fact("f_combined_application_deadline")
def combined_application_deadline(ctx: Context) -> date | None:
    """07 §5: event.date + APP_COMBINED_DEADLINE_DAYS (C11); termin w sobotę, niedzielę lub święto
    (PUBLIC_HOLIDAYS) → następny dzień roboczy (M15 d). USTAWA art. 30a ust. 1-2.

    ADOPTION (późniejsza z dat przyjęcia i wniosku do sądu) — BE2-01.
    """
    event = to_date(ctx.field("event.date"))
    if event is None:
        return ctx.need("event.date")
    holidays = frozenset(to_date(day) for day in ctx.param("PUBLIC_HOLIDAYS") or [])
    return next_working_day(deadline_after(event, int(ctx.param("APP_COMBINED_DEADLINE_DAYS"))), holidays)


@fact("f_combined_application_within_deadline")
def combined_application_within_deadline(ctx: Context) -> bool | None:
    """07 §5: combined_815_filed_date ≤ termin (dzień 21 → TRUE); FORECAST: combined_815_planned.

    Brak daty i brak deklaracji → None (UNKNOWN). USTAWA art. 30a ust. 1.
    """
    deadline = ctx.fact("f_combined_application_deadline")
    filed = to_date(ctx.field("applications.combined_815_filed_date"))
    if deadline is None:
        return None
    if filed is not None:
        return filed <= deadline
    planned = ctx.field("applications.combined_815_planned")
    if planned is None:
        return ctx.need("applications.combined_815_planned")
    return bool(planned)


@fact("f_segment_belongs_to_applicant_of_combined")
def segment_belongs_to_applicant_of_combined(ctx: Context) -> bool | None:
    """07 §5: segment należy do rodzica, który złożył wniosek 81,5% (matka przy BIRTH). USTAWA art. 30a, 31 ust. 3.

    Inne zdarzenia (wnioskodawca ADOPTION/FOSTER) — BE2-02.
    """
    parent = ctx.field("segment.parent")
    if parent is None or ctx.field("event.type") != "BIRTH":
        return None
    return parent == "MOTHER"


@fact("f_gap_shorter_than_calendar_month")
def gap_shorter_than_calendar_month(ctx: Context) -> bool | None:
    """07 §6, BASE-GEN-001: przerwa między poprzednim zasiłkiem a obecnym nie obejmuje pełnego miesiąca kalendarzowego.

    Przerwa = dni POMIĘDZY ``benefit_history.previous_benefit_end_date`` a początkiem obecnego zasiłku
    (``base.reference_event_date`` → ``plan.maternity_start_date``, gdy macierzyński zaczyna się przed porodem →
    ``event.date``); brak przerwy lub nakładanie → TRUE.
    TRUE ⇔ przerwa nie zawiera całego miesiąca od 1. do ostatniego dnia (M05, CONF-006 rozstrzygnięty z mentorem).
    USTAWA art. 43.
    """
    prev_end = to_date(ctx.field("benefit_history.previous_benefit_end_date"))
    start = (to_date(ctx.field("base.reference_event_date")) or to_date(ctx.field("plan.maternity_start_date"))
             or to_date(ctx.field("event.date")))
    if prev_end is None:
        ctx.need("benefit_history.previous_benefit_end_date")
    if start is None:
        ctx.need("event.date")
    if prev_end is None or start is None:
        return None
    return not contains_full_calendar_month(prev_end + timedelta(days=1), start - timedelta(days=1))


@fact("f_benefit_base")
def benefit_base(ctx: Context) -> Decimal | None:
    """07 §6: manual_base_override, jeśli podano; inaczej BASE-GEN-001 (podstawa poprzedniego zasiłku, art. 43);
    metody BASE-* — BE2-03. USTAWA art. 36, 43, 47.

    Bez historii zasiłków (brak ``previous_benefit_end_date``) art. 43 nie dotyczy — potrzebna nowa podstawa.
    """
    base = to_decimal(ctx.field("income_history.manual_base_override"))
    if base is not None:
        return base
    if ctx.field("benefit_history.previous_benefit_end_date") is not None:
        reuse = ctx.fact("f_gap_shorter_than_calendar_month")
        if reuse is None:
            return None  # brak daty początku zasiłku — braki zgłosił fakt; nie żądamy nowej podstawy na zapas
        if reuse:
            previous = to_decimal(ctx.field("benefit_history.previous_base_amount"))
            return previous if previous is not None else ctx.need("benefit_history.previous_base_amount")
    return ctx.need("income_history.manual_base_override")


@fact("f_minimum_base")
def minimum_base(ctx: Context) -> Decimal | None:
    """07 §2/§6, BASE-EMP-008: płaca minimalna × (1 − CONTRIBUTION_DEDUCTION_RATE), zaokrąglona do groszy.

    M07 (4806 zł) i M07a (zaokrąglenie do pełnych groszy, ROUND_HALF_UP): 4147,0974 → 4147,10 zł. USTAWA art. 45 ust. 1.
    """
    exact = mul(ctx.param("MIN_WAGE_2026_MONTHLY"), Decimal(1) - ctx.param("CONTRIBUTION_DEDUCTION_RATE"))
    return round_to_step(exact, ctx.param("MIN_BASE_ROUNDING_STEP"))


@fact("f_benefit_amount")
def benefit_amount(ctx: Context) -> dict[str, Any] | None:
    """07 §2/§7: daily = base × rate × (1 − work_fraction) / MONTH_AS_DAYS; total = daily × dni(segment).

    Bez zaokrągleń pośrednich (C1, C2). USTAWA art. 31 ust. 4a, 5; art. 47 → art. 36 ust. 3.
    """
    base = ctx.fact("f_benefit_base")
    rate = to_decimal(ctx.field("rate"))
    start, end = to_date(ctx.field("segment.from")), to_date(ctx.field("segment.to"))
    if base is None or rate is None or start is None or end is None:
        return None
    work_fraction = to_decimal(ctx.field("segment.work_fraction")) or Decimal(0)
    daily = div(mul(base, rate, Decimal(1) - work_fraction), int(ctx.param("MONTH_AS_DAYS")))
    days = days_in(start, end)
    return {"daily": daily, "total": mul(daily, Decimal(days)), "days": days}


@fact("f_contract_end_after_third_month_of_pregnancy")
def contract_end_after_third_month_of_pregnancy(ctx: Context) -> bool | None:
    """07 §3, MAT-CLS-002: umowa rozwiązałaby się po upływie trzeciego miesiąca ciąży (KP art. 177 § 3).

    Początek ciąży — data stwierdzona przez lekarza (zaświadczenie lekarskie, M13). Trzeci miesiąc ciąży =
    [początek + 2 mies., początek + 3 mies. − 1 dzień]; „po upływie” ⇔ koniec umowy ≥ początek + 3 mies. (C3, DERIVED).
    """
    start = to_date(ctx.field("pregnancy.pregnancy_start_date"))
    end = to_date(ctx.field("employment.contract_end_date"))
    if start is None:
        ctx.need("pregnancy.pregnancy_start_date")
    if end is None:
        ctx.need("employment.contract_end_date")
    if start is None or end is None:
        return None
    return end >= add_months(start, 3)


@fact("f_monthly_maternity_amount")
def monthly_maternity_amount(ctx: Context) -> Decimal | None:
    """07 §6: miesięczna kwota zasiłku = base × rate × (1 − work_fraction), przed zaokrągleniem (M10 b).

    USTAWA art. 31 ust. 3a (porównanie ze świadczeniem rodzicielskim, RATE-MAT-007).
    """
    base = ctx.fact("f_benefit_base")
    rate = to_decimal(ctx.field("rate"))
    if base is None or rate is None:
        return None
    work_fraction = to_decimal(ctx.field("segment.work_fraction")) or Decimal(0)
    return mul(base, rate, Decimal(1) - work_fraction)


@fact("f_raise_to_parental_benefit_floor")
def raise_to_parental_benefit_floor(ctx: Context) -> dict[str, Any] | None:
    """07 §6, RATE-MAT-007: kwota podwyższona do PARENTAL_BENEFIT_FLOOR_MONTHLY (M10: 1000 zł).

    Za każdy miesiąc kalendarzowy segmentu: floor × (dni segmentu w miesiącu / dni miesiąca) — pełny miesiąc
    = floor, niepełny proporcjonalnie do liczby dni danego miesiąca (M10c, mentor fachowy). total = suma,
    daily = total / dni(segment) (średnia, informacyjnie). USTAWA art. 31 ust. 3a-3c.
    """
    floor = to_decimal(ctx.param("PARENTAL_BENEFIT_FLOOR_MONTHLY"))
    start, end = to_date(ctx.field("segment.from")), to_date(ctx.field("segment.to"))
    if floor is None or start is None or end is None:
        return None
    if (to_decimal(ctx.field("segment.work_fraction")) or Decimal(0)) > 0:
        return None  # łączenie z pracą: sposób podwyższenia nieustalony (M10c) — bez podwyższenia na zapas
    total = Decimal(0)
    day = start
    while day <= end:
        month_days = calendar.monthrange(day.year, day.month)[1]
        month_end = min(end, day.replace(day=month_days))
        total += div(mul(floor, Decimal(days_in(day, month_end))), month_days)
        day = month_end + timedelta(days=1)
    days = days_in(start, end)
    return {"monthly": floor, "daily": div(total, days), "total": total, "days": days}


# ------------------------------------------------------------ martwe urodzenie / zgon dziecka (MAT-DUR-003/004/005)
def _children_items(ctx: Context) -> list[dict[str, Any]] | None:
    items = ctx.field("children.items")
    if items is None:
        return ctx.need("children.items")
    return items


def _death_day(child: dict[str, Any]) -> date | None:
    """Dzień zgonu; martwe urodzenie = dzień porodu (wiek 0 dni, 07 §5)."""
    if child.get("stillborn"):
        return to_date(child.get("birth_date"))
    return to_date(child.get("death_date"))


def _deceased(ctx: Context, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    as_of = ctx.as_of
    return [c for c in items if c.get("stillborn")
            or (to_date(c.get("death_date")) is not None and (as_of is None or to_date(c.get("death_date")) <= as_of))]


@fact("f_children_alive_count")
def children_alive_count(ctx: Context) -> int | None:
    """07 §5: dzieci nie stillborn i bez death_date ≤ dzień oceny; items null → None. KP art. 180(1)."""
    items = _children_items(ctx)
    if items is None:
        return None
    return len(items) - len(_deceased(ctx, items))


@fact("f_children_deceased_count")
def children_deceased_count(ctx: Context) -> int | None:
    """07 §5: count_at_birth − alive. KP art. 180(1) § 1-2."""
    alive = ctx.fact("f_children_alive_count")
    count = ctx.field("children.count_at_birth")
    if alive is None or count is None:
        return None if count is not None else ctx.need("children.count_at_birth")
    return int(count) - alive


@fact("f_earliest_child_death_age_days")
def earliest_child_death_age_days(ctx: Context) -> int | None:
    """07 §5: min(death_date − birth_date) w dniach; stillborn → 0; brak zgonów → None. KP art. 180(1) § 1."""
    items = _children_items(ctx)
    if items is None:
        return None
    ages = [(_death_day(c) - to_date(c.get("birth_date"))).days for c in _deceased(ctx, items)
            if _death_day(c) is not None and to_date(c.get("birth_date")) is not None]
    return min(ages) if ages else None


def _latest_death(ctx: Context) -> date | None:
    items = _children_items(ctx)
    if items is None:
        return None
    deaths = [d for d in (_death_day(c) for c in _deceased(ctx, items)) if d is not None]
    return max(deaths) if deaths else None


@fact("f_stillbirth_maternity_end_date")
def stillbirth_maternity_end_date(ctx: Context) -> date | None:
    """07 §5: max(poród + STILLBIRTH_LEAVE_WEEKS tyg. − 1, zgon + CHILD_DEATH_MIN_DAYS − 1).

    KP art. 180(1) § 1 (C3, C5).
    """
    birth, death = to_date(ctx.field("event.date")), _latest_death(ctx)
    if birth is None:
        return ctx.need("event.date")
    if death is None:
        return None
    return max(end_after_weeks(birth, int(ctx.param("STILLBIRTH_LEAVE_WEEKS"))),
               end_after_days(death, int(ctx.param("CHILD_DEATH_MIN_DAYS"))))


@fact("f_child_death_maternity_end_date")
def child_death_maternity_end_date(ctx: Context) -> date | None:
    """07 §5: min(regularny koniec, zgon + CHILD_DEATH_MIN_DAYS − 1). KP art. 180(1) § 2."""
    birth, death = to_date(ctx.field("event.date")), _latest_death(ctx)
    weeks = ctx.fact("f_maternity_leave_weeks")
    if birth is None:
        return ctx.need("event.date")
    if death is None or weeks is None:
        return None
    return min(end_after_weeks(birth, weeks), end_after_days(death, int(ctx.param("CHILD_DEATH_MIN_DAYS"))))
