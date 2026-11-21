"""Fakty — klasyfikacja, ubezpieczenie, zadłużenie (zus_rules/07 §3 i §6).

BE1-01: minimalny zestaw potrzebny ścieżce macierzyńskiej (parytet ze slice_v0).
Właściciel dalszych faktów ubezpieczenia: BE1-04.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from app.core.dates import in_period, to_date
from app.core.money import mul, to_decimal
from app.engine.facts.registry import Context, fact

TITLE_PRIORITY = ["EMPLOYMENT_CONTRACT", "SELF_EMPLOYED"]


def _titles(ctx: Context) -> list[dict[str, Any]] | None:
    """Lista tytułów; None = nie wiadomo (brak listy albo pusta bez titles_confirmed_complete)."""
    titles = ctx.field("insurance.titles")
    if titles:
        return titles
    if ctx.field("insurance.titles_confirmed_complete") is True:
        return []
    return ctx.need("insurance.titles")


def _active_titles(titles: list[dict[str, Any]], day: date) -> list[dict[str, Any]]:
    return [t for t in titles
            if t.get("sickness_insurance_mode") not in (None, "NONE")
            and in_period(day, to_date(t.get("from")), to_date(t.get("to")))]


@fact("f_sickness_insured_on")
def sickness_insured_on(ctx: Context, date: Any = None) -> bool | None:
    """07 §3: istnieje tytuł z sickness_insurance_mode ≠ NONE i from ≤ date ≤ to (to=null → otwarte).

    Brak tytułów → None; titles_confirmed_complete i brak pokrycia → False. USTAWA art. 29 ust. 1 pkt 1.
    """
    day = to_date(date)
    titles = _titles(ctx)
    if day is None or titles is None:
        return None
    return bool(_active_titles(titles, day))


@fact("f_on_childcare_leave_on")
def on_childcare_leave_on(ctx: Context, date: Any = None) -> bool | None:
    """07 §3: employment.leaves zawiera CHILDCARE_LEAVE obejmujący date; leaves null → None. Art. 29 ust. 1 pkt 1."""
    day = to_date(date)
    leaves = ctx.field("employment.leaves")
    if leaves is None:
        return ctx.need("employment.leaves")
    if day is None:
        return None
    return any(leave.get("type") == "CHILDCARE_LEAVE"
               and in_period(day, to_date(leave.get("from")), to_date(leave.get("to"))) for leave in leaves)


@fact("f_primary_title_type")
def primary_title_type(ctx: Context) -> str | None:
    """07 §3: tytuł chorobowy aktywny w dniu zdarzenia; priorytet EMPLOYMENT_CONTRACT > SELF_EMPLOYED > pozostałe.

    Gdy żaden nie jest aktywny — ostatni zakończony tytuł (DERIVED, D17; np. poród w czasie urlopu wychowawczego).
    """
    day = to_date(ctx.field("event.date"))
    titles = _titles(ctx)
    if day is None:
        return ctx.need("event.date")
    if titles is None:
        return None
    active = _active_titles(titles, day)
    if not active:
        # brak tytułu aktywnego w dniu zdarzenia (np. urlop wychowawczy, art. 30): ostatni zakończony tytuł (DERIVED)
        ended = [t for t in titles if to_date(t.get("to")) is not None and to_date(t.get("to")) < day]
        if not ended:
            return None
        return max(ended, key=lambda t: to_date(t.get("to"))).get("title_type")
    ranked = sorted(active, key=lambda t: TITLE_PRIORITY.index(t["title_type"])
                    if t.get("title_type") in TITLE_PRIORITY else len(TITLE_PRIORITY))
    return ranked[0].get("title_type")


@fact("f_debt_on_right_date_exceeds_threshold")
def debt_on_right_date_exceeds_threshold(ctx: Context) -> bool | None:
    """07 §6: debt.amount_on_right_date > MIN_WAGE × DEBT_THRESHOLD_MIN_WAGE_RATIO (równe progowi → FALSE).

    USTAWA art. 2a ust. 1.
    """
    threshold = mul(ctx.param("MIN_WAGE_2026_MONTHLY"), ctx.param("DEBT_THRESHOLD_MIN_WAGE_RATIO"))
    amount = to_decimal(ctx.field("debt.amount_on_right_date"))
    if amount is None:
        return ctx.need("debt.amount_on_right_date")
    return amount > threshold


@fact("f_debt_fully_repaid")
def debt_fully_repaid(ctx: Context) -> bool | None:
    """07 §6: debt.repaid_in_full_date istnieje i ≤ as_of. USTAWA art. 2a ust. 1."""
    repaid = to_date(ctx.field("debt.repaid_in_full_date"))
    if repaid is None:
        return False
    as_of = ctx.as_of or to_date(ctx.field("evaluation.as_of_date"))
    if as_of is None:
        return ctx.need("evaluation.as_of_date")
    return repaid <= as_of
