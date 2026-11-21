"""Fakty — zasiłek macierzyński: wymiar, termin 81,5%, podstawa, kwota (zus_rules/07 §5, §7).

BE1-01: minimalny zestaw potrzebny ścieżce macierzyńskiej (parytet ze slice_v0).
Właściciel dalszych faktów macierzyńskich/rodzicielskich i podstawy: BE2-01..03.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from app.core.dates import days_in, deadline_after, to_date
from app.core.money import div, mul, to_decimal
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
    """07 §5: event.date + APP_COMBINED_DEADLINE_DAYS (C11). USTAWA art. 30a ust. 1-2.

    ADOPTION (późniejsza z dat przyjęcia i wniosku do sądu) — BE2-01.
    """
    event = to_date(ctx.field("event.date"))
    if event is None:
        return ctx.need("event.date")
    return deadline_after(event, int(ctx.param("APP_COMBINED_DEADLINE_DAYS")))


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


@fact("f_benefit_base")
def benefit_base(ctx: Context) -> Decimal | None:
    """07 §7: manual_base_override, jeśli podano; metody BASE-* — BE2-03. USTAWA art. 36, 47."""
    base = to_decimal(ctx.field("income_history.manual_base_override"))
    if base is None:
        return ctx.need("income_history.manual_base_override")
    return base


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
