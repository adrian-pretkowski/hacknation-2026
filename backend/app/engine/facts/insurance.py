"""Fakty — klasyfikacja, ubezpieczenie, zadłużenie (zus_rules/07 §3 i §6).

BE1-01: zestaw ścieżki macierzyńskiej. BE1-04: płatnik (GEN-CLS-*), okres wyczekiwania i jego wyjątki
(SICK-ELIG-002..005), przedawnienie przy zadłużeniu (GEN-EXCL-002).

„Dzień zdarzenia” (``event_day``): dla niezdolności do pracy (event.type PREGNANCY_INCAPACITY / SICKNESS)
— ``incapacity.start_date``, dla pozostałych zdarzeń — ``event.date``.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.core.dates import add_months, days_in, gap_days_between, in_period, to_date
from app.core.money import mul, to_decimal
from app.engine.facts.registry import Context, fact

TITLE_PRIORITY = ["EMPLOYMENT_CONTRACT", "SELF_EMPLOYED"]
INCAPACITY_EVENTS = ("PREGNANCY_INCAPACITY", "SICKNESS")
# Tytuły, przy których zasiłek wypłaca ZUS niezależnie od liczby ubezpieczonych (art. 61 ust. 1 pkt 2 lit. b, c, e)
NON_EMPLOYER_PAYER_TITLES = ("SELF_EMPLOYED", "SELF_EMPLOYED_COLLABORATOR", "CLERGY", "CLERGY_SELF_PAYER",
                             "FOREIGN_EMPLOYER")
# Przyczyny przerwy, przy których poprzednie okresy wlicza się bez względu na długość przerwy (art. 4 ust. 2)
GAP_REASONS_JOINING = ("CHILDCARE_LEAVE", "UNPAID_LEAVE", "MILITARY_SERVICE_CONSCRIPT")


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


def event_day(ctx: Context) -> date | None:
    """Dzień zdarzenia (zob. docstring modułu); brak → zgłoszenie pola i None."""
    event_type = ctx.field("event.type")
    path = "incapacity.start_date" if event_type in INCAPACITY_EVENTS else "event.date"
    day = to_date(ctx.field(path))
    return day if day is not None else ctx.need(path)


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
    day = event_day(ctx)
    titles = _titles(ctx)
    if day is None:
        return None
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


# ---------------------------------------------------------------------------------------- BE1-04
# 07 §3 f_prior_mandatory_sickness_insurance_years: rok = 365 dni bez względu na lata przestępne (DERIVED)
DAYS_PER_YEAR = 365


@dataclass
class _Block:
    """Ciągły (bez dnia przerwy) okres ubezpieczenia chorobowego: [start, end], end=None → otwarty."""

    start: date
    end: date | None
    gap_reason_before: str | None


def _blocks(titles: list[dict[str, Any]], modes: tuple[str, ...] = ("MANDATORY", "VOLUNTARY")) -> list[_Block] | None:
    """Tytuły z ubezpieczeniem chorobowym w ``modes`` scalone w okresy ciągłe (nakładające się lub przyległe).

    None = luka w danych (tytuł bez ``from``).
    """
    chosen = [t for t in titles if t.get("sickness_insurance_mode") in modes]
    if any(to_date(t.get("from")) is None for t in chosen):
        return None
    blocks: list[_Block] = []
    for title in sorted(chosen, key=lambda t: to_date(t.get("from"))):
        start, end = to_date(title.get("from")), to_date(title.get("to"))
        last = blocks[-1] if blocks else None
        if last is not None and (last.end is None or gap_days_between(last.end, start) <= 0):
            if last.end is not None and (end is None or end > last.end):
                last.end = end
            continue
        blocks.append(_Block(start, end, title.get("gap_reason_before")))
    return blocks


def _chain(ctx: Context, titles: list[dict[str, Any]], day: date) -> list[_Block] | None:
    """07 §3 / USTAWA art. 4 ust. 2: okres ciągły obejmujący ``day`` + poprzednie okresy, jeśli przerwa
    (C8) ≤ INSURANCE_GAP_MAX_DAYS albo była spowodowana urlopem wychowawczym/bezpłatnym/służbą wojskową.

    [] = brak ubezpieczenia w ``day``; None = luka w danych.
    """
    blocks = _blocks(titles)
    if blocks is None:
        return None
    current = next((i for i, b in enumerate(blocks) if in_period(day, b.start, b.end)), None)
    if current is None:
        return []
    max_gap = int(ctx.param("INSURANCE_GAP_MAX_DAYS"))
    chain = [blocks[current]]
    for prev in reversed(blocks[:current]):
        head = chain[0]
        if gap_days_between(prev.end, head.start) <= max_gap or head.gap_reason_before in GAP_REASONS_JOINING:
            chain.insert(0, prev)
        else:
            break
    return chain


def _last_title_end(titles: list[dict[str, Any]], day: date) -> tuple[bool, date | None]:
    """(jest tytuł otwarty rozpoczęty najpóźniej w ``day``, najpóźniejsze ``to`` tytułów zakończonych)."""
    open_title = any(to_date(t.get("to")) is None and (to_date(t.get("from")) or day) <= day for t in titles)
    ends = [to_date(t.get("to")) for t in titles if to_date(t.get("to")) is not None]
    return open_title, (max(ends) if ends else None)


@fact("f_is_employee_on")
def is_employee_on(ctx: Context, date: Any = None) -> bool | None:
    """07 §3: istnieje tytuł EMPLOYMENT_CONTRACT obejmujący ``date``. KP art. 92 § 1; USTAWA art. 61."""
    day = to_date(date)
    titles = _titles(ctx)
    if day is None or titles is None:
        return None
    return any(t.get("title_type") == "EMPLOYMENT_CONTRACT"
               and in_period(day, to_date(t.get("from")), to_date(t.get("to"))) for t in titles)


@fact("f_is_employer_payer_title")
def is_employer_payer_title(ctx: Context) -> bool | None:
    """07 §3: tytuł nie jest SELF_EMPLOYED/…COLLABORATOR/CLERGY*/FOREIGN_EMPLOYER. USTAWA art. 61 ust. 1 pkt 2."""
    title_type = ctx.fact("f_primary_title_type")
    if title_type is None:
        return None
    return title_type not in NON_EMPLOYER_PAYER_TITLES


@fact("f_benefit_after_title_end")
def benefit_after_title_end(ctx: Context) -> bool | None:
    """07 §3: niezdolność / zdarzenie przypada po ``to`` ostatniego tytułu. USTAWA art. 61 ust. 1 pkt 2 lit. d."""
    day = event_day(ctx)
    titles = _titles(ctx)
    if day is None or not titles:
        return None
    open_title, last_end = _last_title_end(titles, day)
    if open_title:
        return False
    return None if last_end is None else day > last_end


@fact("f_days_since_title_end")
def days_since_title_end(ctx: Context, date: Any = None) -> int | None:
    """07 §3: ``date − to(ostatni tytuł)`` w dniach (dzień po ustaniu = 1). USTAWA art. 7 pkt 1."""
    day = to_date(date)
    titles = _titles(ctx)
    if day is None or not titles:
        return None
    open_title, last_end = _last_title_end(titles, day)
    if open_title or last_end is None:
        return None
    return (day - last_end).days


@fact("f_sickness_insurance_mode_on")
def sickness_insurance_mode_on(ctx: Context, date: Any = None) -> str | None:
    """07 §3: tryb tytułu aktywnego w ``date``; przy wielu — MANDATORY ma pierwszeństwo. USTAWA art. 4 ust. 1."""
    day = to_date(date)
    titles = _titles(ctx)
    if day is None or titles is None:
        return None
    modes = {t.get("sickness_insurance_mode") for t in _active_titles(titles, day)}
    return next((mode for mode in ("MANDATORY", "VOLUNTARY") if mode in modes), None)


@fact("f_continuous_sickness_insurance_days")
def continuous_sickness_insurance_days(ctx: Context, as_of: Any = None) -> int | None:
    """07 §3: dni ubezpieczenia chorobowego w łańcuchu okresów (art. 4 ust. 2) od jego początku do dnia
    POPRZEDZAJĄCEGO ``as_of``; dni przerw się nie wliczają. Brak ubezpieczenia w ``as_of`` → 0.

    Prawo powstaje w 31./91. dniu: ``days ≥ WAITING_DAYS_*`` w dniu niezdolności. USTAWA art. 4 ust. 1-2.
    """
    day = to_date(as_of)
    titles = _titles(ctx)
    if day is None or titles is None:
        return None
    chain = _chain(ctx, titles, day)
    if chain is None:
        return None
    last_day = day - timedelta(days=1)
    return sum(days_in(b.start, min(b.end or last_day, last_day)) for b in chain if b.start <= last_day)


@fact("f_prior_mandatory_sickness_insurance_years")
def prior_mandatory_sickness_insurance_years(ctx: Context) -> Decimal | None:
    """07 §3: suma dni tytułów MANDATORY przed bieżącym łańcuchem / 365 (DERIVED). USTAWA art. 4 ust. 3 pkt 3."""
    day = event_day(ctx)
    titles = _titles(ctx)
    if day is None or titles is None:
        return None
    chain = _chain(ctx, titles, day)
    mandatory = _blocks(titles, ("MANDATORY",))
    if chain is None or mandatory is None:
        return None
    cutoff = (chain[0].start if chain else day) - timedelta(days=1)
    days = sum(days_in(b.start, min(b.end or cutoff, cutoff)) for b in mandatory if b.start <= cutoff)
    return Decimal(days) / Decimal(DAYS_PER_YEAR)


@fact("f_graduate_within_window")
def graduate_within_window(ctx: Context, days: Any = None) -> bool | None:
    """07 §3: ``person.graduation_date`` istnieje i początek ubezpieczenia ≤ graduation + days.

    Początek ubezpieczenia = początek łańcucha okresów obejmującego dzień niezdolności (DERIVED). Art. 4 ust. 3 pkt 1.
    """
    graduation = to_date(ctx.field("person.graduation_date"))
    if graduation is None:
        return ctx.need("person.graduation_date")
    day = event_day(ctx)
    titles = _titles(ctx)
    if day is None or titles is None or days is None:
        return None
    chain = _chain(ctx, titles, day)
    if not chain:
        return None
    return chain[0].start <= graduation + timedelta(days=int(days))


@fact("f_debt_unpaid_beyond_months")
def debt_unpaid_beyond_months(ctx: Context, months: Any = None) -> bool | None:
    """07 §6: brak spłaty do ``dzień powstania prawa + months`` (miesiące kalendarzowe, GAP-011). Art. 2a ust. 2.

    Dzień powstania prawa = dzień zdarzenia (DERIVED). Spłata po terminie → TRUE; brak spłaty → TRUE, gdy
    data oceny jest po terminie.
    """
    right_date = event_day(ctx)
    if right_date is None or months is None:
        return None
    limit = add_months(right_date, int(months))
    repaid = to_date(ctx.field("debt.repaid_in_full_date"))
    if repaid is not None:
        return repaid > limit
    as_of = ctx.as_of or to_date(ctx.field("evaluation.as_of_date"))
    if as_of is None:
        return ctx.need("evaluation.as_of_date")
    return as_of > limit


# ---------------------------------------------------------------------------------------- BE1-05
@fact("f_months_since_title_end")
def months_since_title_end(ctx: Context, date: Any = None) -> int | None:
    """07 §3: pełne miesiące kalendarzowe między ustaniem tytułu a ``date`` (GAP-011). USTAWA art. 7 pkt 2."""
    day = to_date(date)
    titles = _titles(ctx)
    if day is None or not titles:
        return None
    open_title, last_end = _last_title_end(titles, day)
    if open_title or last_end is None:
        return None
    months = 0
    while add_months(last_end, months + 1) <= day:
        months += 1
    return months


@fact("f_number_of_sickness_titles")
def number_of_sickness_titles(ctx: Context) -> int | None:
    """07 §3: liczba tytułów ubezpieczenia chorobowego aktywnych w dniu niezdolności. USTAWA art. 9 (od 2027)."""
    day = event_day(ctx)
    titles = _titles(ctx)
    if day is None or titles is None:
        return None
    return len(_active_titles(titles, day))
