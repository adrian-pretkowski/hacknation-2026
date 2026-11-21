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
    add_years,
    contains_full_calendar_month,
    days_in,
    deadline_after,
    end_after_days,
    end_after_weeks,
    next_working_day,
    to_date,
)
from app.core.money import div, mul, round_to_step, to_decimal
from app.engine.facts.insurance import INCAPACITY_EVENTS, TITLE_PRIORITY, _active_titles
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

    ADOPTION: od późniejszej z dat przyjęcia dziecka i wniosku do sądu (BE2-01, DERIVED).
    """
    event = to_date(ctx.field("event.date"))
    court = to_date(ctx.field("event.court_adoption_application_date"))
    if event is not None and court is not None and ctx.field("event.type") == "ADOPTION":
        event = max(event, court)
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


def _base_title(ctx: Context) -> dict[str, Any] | None:
    """BE2-12: tytuł, z którego ustala się podstawę — aktywny w dniu zdarzenia, priorytet jak f_primary_title_type.

    Bez zgłaszania braków (granice podstawy to doprecyzowanie kwoty, nie warunek prawa): brak danych → None.
    """
    titles = ctx.field("insurance.titles") or []
    path = "incapacity.start_date" if ctx.field("event.type") in INCAPACITY_EVENTS else "event.date"
    day = to_date(ctx.field(path))
    if day is None:
        return None
    active = _active_titles(titles, day)
    if not active:
        return None
    return sorted(active, key=lambda t: TITLE_PRIORITY.index(t["title_type"])
                  if t.get("title_type") in TITLE_PRIORITY else len(TITLE_PRIORITY))[0]


@fact("f_is_employee_title_for_base")
def is_employee_title_for_base(ctx: Context) -> bool | None:
    """07 §2: tytuł, z którego ustala się podstawę, jest pracowniczy (umowa o pracę). Brak tytułu → None."""
    title = _base_title(ctx)
    return None if title is None else title.get("title_type") == "EMPLOYMENT_CONTRACT"


@fact("f_is_voluntary_sickness_title_for_base")
def is_voluntary_sickness_title_for_base(ctx: Context) -> bool | None:
    """07 §2, BE2-12: tytuł podstawy ma dobrowolne ubezpieczenie chorobowe (zlecenie, JDG). Brak tytułu → None."""
    title = _base_title(ctx)
    return None if title is None else title.get("sickness_insurance_mode") == "VOLUNTARY"


def _full_time(ctx: Context) -> bool:
    fraction = to_decimal(ctx.field("employment.working_time_fraction"))
    return fraction is not None and fraction == Decimal(1)


def _voluntary_cap(ctx: Context) -> Decimal:
    """Górna granica podstawy: VOLUNTARY_MAX_CONTRIB_BASE_2026 × (1 − 13,71%), bez zaokrąglenia (C1). M08."""
    return mul(ctx.param("VOLUNTARY_MAX_CONTRIB_BASE_2026"), Decimal(1) - ctx.param("CONTRIBUTION_DEDUCTION_RATE"))


@fact("f_apply_minimum_base")
def apply_minimum_base(ctx: Context) -> Decimal | None:
    """07 §2, BASE-EMP-008: max(podstawa, f_minimum_base) — pełny etat, tytuł pracowniczy. USTAWA art. 45 ust. 1."""
    base = _new_base(ctx)
    minimum = ctx.fact("f_minimum_base")
    return None if base is None or minimum is None else max(base, minimum)


@fact("f_apply_voluntary_base_cap")
def apply_voluntary_base_cap(ctx: Context) -> Decimal | None:
    """07 §2, BASE-NEMP-005 (BE2-12): min(podstawa, VOLUNTARY_MAX_CONTRIB_BASE_2026 × (1 − 13,71%)) — dobrowolne
    chorobowe (ustawa systemowa art. 20 ust. 2 — limit podstawy składek; Załącznik, M08)."""
    base = _new_base(ctx)
    return None if base is None else min(base, _voluntary_cap(ctx))


def _new_base(ctx: Context) -> Decimal | None:
    """Nowo ustalona podstawa (dziś: ręczna — `manual_base_override`; metody BASE-EMP/NEMP — BE2-03)."""
    return to_decimal(ctx.field("income_history.manual_base_override"))


@fact("f_benefit_base")
def benefit_base(ctx: Context) -> Decimal | None:
    """07 §6: manual_base_override, jeśli podano; inaczej BASE-GEN-001 (podstawa poprzedniego zasiłku, art. 43);
    metody BASE-* — BE2-03. USTAWA art. 36, 43, 47.

    BE2-12: nowa podstawa z granicami — pełny etat na umowie o pracę: nie mniej niż minimalna (BASE-EMP-008);
    dobrowolne chorobowe: nie więcej niż limit (BASE-NEMP-005). Podstawa przejęta z art. 43 — bez zmian.
    Bez historii zasiłków (brak ``previous_benefit_end_date``) art. 43 nie dotyczy — potrzebna nowa podstawa.
    """
    base = _new_base(ctx)
    if base is not None:
        if ctx.fact("f_is_employee_title_for_base") is True and _full_time(ctx):
            base = ctx.fact("f_apply_minimum_base")
        if ctx.fact("f_is_voluntary_sickness_title_for_base") is True:
            base = min(base, _voluntary_cap(ctx))
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
    """Zmarłe dzieci: stillborn albo death_date ≤ dzień oceny. FORECAST: daty z wejścia to scenariusz planu,
    więc death_date liczy się bez względu na dzień oceny (DERIVED, BE2-01; T-MAT-014)."""
    as_of = None if ctx.field("evaluation.mode") == "FORECAST" else ctx.as_of
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


# ------------------------------------------------------------ art. 30 — zasiłek po ustaniu tytułu (BE2-01)
ART30_EMPLOYER_CEASED = ("EMPLOYER_DEATH", "EMPLOYER_BANKRUPTCY", "EMPLOYER_LIQUIDATION")
ART30_UNLAWFUL = "UNLAWFUL_TERMINATION_COURT_CONFIRMED"


def _tri_all(*values: bool | None) -> bool | None:
    """Kleene AND (C9) — lokalnie, bez importu DSL (moduł faktów ładuje się przed ewaluatorem)."""
    if any(v is False for v in values):
        return False
    return None if any(v is None for v in values) else True


def _tri_any(*values: bool | None) -> bool | None:
    if any(v is True for v in values):
        return True
    return None if any(v is None for v in values) else False


def _title_list(ctx: Context) -> list[dict[str, Any]] | None:
    titles = ctx.field("insurance.titles")
    if titles:
        return titles
    if ctx.field("insurance.titles_confirmed_complete") is True:
        return []
    return ctx.need("insurance.titles")


def _last_ended_title(ctx: Context) -> dict[str, Any] | None:
    """Ostatni zakończony tytuł (najpóźniejsze ``to``), gdy żaden tytuł nie jest otwarty; inaczej None."""
    titles = _title_list(ctx)
    if not titles or any(t.get("to") is None for t in titles):
        return None
    return max(titles, key=lambda t: to_date(t.get("to")))


@fact("f_is_employee_title_last")
def is_employee_title_last(ctx: Context) -> bool | None:
    """07 §3: ostatni zakończony tytuł to EMPLOYMENT_CONTRACT (otwarty tytuł → FALSE). USTAWA art. 30 ust. 3."""
    titles = _title_list(ctx)
    if titles is None:
        return None
    last = _last_ended_title(ctx)
    return last is not None and last.get("title_type") == "EMPLOYMENT_CONTRACT"


@fact("f_title_ended_during_pregnancy")
def title_ended_during_pregnancy(ctx: Context) -> bool | None:
    """07 §3: pregnancy_start_date ≤ to(ostatni tytuł) < event.date (M13: data początku ciąży z zaświadczenia).

    Tytuł otwarty → FALSE (nie ustał). USTAWA art. 30 ust. 1, 3.
    """
    titles = _title_list(ctx)
    if titles is None:
        return None
    last = _last_ended_title(ctx)
    if last is None:
        return False
    start = to_date(ctx.field("pregnancy.pregnancy_start_date"))
    event = to_date(ctx.field("event.date"))
    if start is None:
        ctx.need("pregnancy.pregnancy_start_date")
    if event is None:
        ctx.need("event.date")
    if start is None or event is None:
        return None
    return start <= to_date(last.get("to")) < event


@fact("f_last_title_termination_reason")
def last_title_termination_reason(ctx: Context) -> str | None:
    """07 §3: termination_reason ostatniego zakończonego tytułu; brak → None (UNKNOWN)."""
    last = _last_ended_title(ctx)
    if last is None:
        return None
    reason = last.get("termination_reason")
    return reason if reason is not None else ctx.need("insurance.titles")


@fact("f_any_art30_basis")
def any_art30_basis(ctx: Context) -> bool | None:
    """07 §3: OR (Kleene) warunków MAT-ELIG-004, -005, -006. USTAWA art. 30 ust. 1, 4; KP art. 177 § 3.

    MAT-ELIG-006 (przedłużenie umowy do porodu) dotyczy tylko umowy o pracę: brak tytułu EMPLOYMENT_CONTRACT
    → FALSE bez pytania o typ umowy (DERIVED).
    """
    if ctx.field("event.type") != "BIRTH":
        return False
    titles = _title_list(ctx)
    if titles is None:
        return None
    insured = ctx.fact("f_sickness_insured_on", date=ctx.field("event.date"))
    ended = ctx.fact("f_title_ended_during_pregnancy")
    reason = ctx.fact("f_last_title_termination_reason")
    not_insured = None if insured is None else not insured
    reason_ceased = None if reason is None else reason in ART30_EMPLOYER_CEASED
    reason_unlawful = None if reason is None else reason == ART30_UNLAWFUL
    if ended is False:
        reason_ceased = reason_unlawful = False
    kp177: bool | None = False
    if any(t.get("title_type") == "EMPLOYMENT_CONTRACT" for t in titles):
        contract = ctx.field("employment.contract_type")
        extended = ctx.field("employment.extended_until_birth_kp177")
        fixed = None if contract is None else contract == "FIXED_TERM"
        kp177 = _tri_all(fixed, None if extended is None else extended is True)
    return _tri_any(_tri_all(not_insured, ended, reason_ceased), _tri_all(not_insured, ended, reason_unlawful),
                    kp177)


@fact("f_planned_title_end_before_due_date")
def planned_title_end_before_due_date(ctx: Context) -> bool | None:
    """07 §3, RISK-003: najpóźniejsze ``to`` tytułów < expected_due_date i brak tytułu otwartego.

    Brak tytułów (potwierdzony) → None: ten przypadek rozstrzyga MAT-NEG-001, nie ostrzeżenie.
    """
    titles = _title_list(ctx)
    if not titles:
        return None
    if any(t.get("to") is None for t in titles):
        return False
    due = to_date(ctx.field("pregnancy.expected_due_date"))
    if due is None:
        return ctx.need("pregnancy.expected_due_date")
    return max(to_date(t.get("to")) for t in titles) < due


# ------------------------------------------------------------ pomocnicze
# (fakty planu f_weeks_before_due_date, f_*_maternity_weeks_*, f_child_age_years_on — parental.py, BE2-02)
def _week_days(ctx: Context) -> int:
    return int(ctx.param("WEEK_AS_DAYS"))


# ------------------------------------------------------------ przysposobienie, rodzina zastępcza (MAT-ELIG-002/003)
def _oldest_child_birth(ctx: Context) -> date | None:
    items = ctx.field("children.items")
    if items is None:
        return ctx.need("children.items")
    births = [to_date(c.get("birth_date")) for c in items]
    if not births or any(b is None for b in births):
        return ctx.need("children.items")
    return min(births)


def _age_limit_years(ctx: Context) -> int | None:
    """Granica wieku: ADOPTION 14, FOSTER 7 (10 przy odroczonym obowiązku szkolnym). KP art. 183 § 1, § 1(1)."""
    event_type = ctx.field("event.type")
    if event_type == "ADOPTION":
        return int(ctx.param("ADOPTION_CHILD_AGE_MAX"))
    if event_type == "FOSTER":
        if ctx.field("children.school_obligation_deferred") is True:
            return int(ctx.param("FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED"))
        return int(ctx.param("FOSTER_CHILD_AGE_MAX"))
    return None


@fact("f_maternity_like_leave_period")
def maternity_like_leave_period(ctx: Context) -> dict[str, Any] | None:
    """07 §5, MAT-DUR-007: {weeks: tabela wg count_at_event, from, to: min(start + 7w − 1, dzień przed
    urodzinami granicznymi), days}. KP art. 183 § 1, § 1(1); C7.

    Start = dzień przyjęcia dziecka (event.date). Granica liczona dla najstarszego dziecka (jak
    f_child_age_years_on, DERIVED). M14 a: 9 tyg. nie jest minimum — limit wieku skraca urlop.
    """
    start = to_date(ctx.field("event.date"))
    weeks = ctx.fact("f_maternity_leave_weeks")
    birth = _oldest_child_birth(ctx)
    limit = _age_limit_years(ctx)
    if start is None:
        ctx.need("event.date")
    if start is None or weeks is None or birth is None or limit is None:
        return None
    end = min(end_after_days(start, weeks * _week_days(ctx)), add_years(birth, limit) - timedelta(days=1))
    if end < start:
        return None
    return {"weeks": weeks, "from": start, "to": end, "days": days_in(start, end)}


@fact("f_maternity_like_weeks_after_age_cap")
def maternity_like_weeks_after_age_cap(ctx: Context) -> Decimal | None:
    """07 §5, MAT-DUR-008: tygodnie urlopu po przycięciu do limitu wieku, bez podwyższenia do 9 tyg. (M14 a)."""
    period = ctx.fact("f_maternity_like_leave_period")
    if period is None:
        return None
    return div(Decimal(period["days"]), _week_days(ctx))


# ------------------------------------------------------------ urlop uzupełniający — wcześniak (SUPP-*)
@fact("f_min_birth_weight_g")
def min_birth_weight_g(ctx: Context) -> int | None:
    """07 §5: min(birth_weight_g) dzieci z porodu (wieloraczki: masa najlżejszego). KP art. 180(2) § 2."""
    items = ctx.field("children.items")
    if not items:
        return ctx.need("children.items")
    weights = [c.get("birth_weight_g") for c in items]
    if any(w is None for w in weights):
        return ctx.need("children.items")
    return min(int(w) for w in weights)


@fact("f_weight_at_most_threshold")
def weight_at_most_threshold(ctx: Context) -> bool | None:
    """07 §5, SUPP-ELIG-001/002: masa urodzeniowa (wieloraczki: najlżejszego) ≤ SUPP_WEIGHT_THRESHOLD_G.

    Odpowiedź ``birth.weight_at_most_threshold`` (kreator, FE1-05) ma pierwszeństwo; bez niej — z dokładnych mas
    ``children.items[].birth_weight_g``. Brak obu → NEEDS_DATA o odpowiedź. KP art. 180(2) § 1 pkt 1, § 2.
    """
    answer = ctx.field("birth.weight_at_most_threshold")
    if answer is not None:
        return bool(answer)
    items = ctx.field("children.items")
    if not items or any(c.get("birth_weight_g") is None for c in items):
        return ctx.need("birth.weight_at_most_threshold")
    return ctx.fact("f_min_birth_weight_g") <= int(ctx.param("SUPP_WEIGHT_THRESHOLD_G"))


def _hospital_stays(ctx: Context) -> list[dict[str, Any]] | None:
    stays = ctx.field("children.hospital_stays")
    if stays is None:
        return ctx.need("children.hospital_stays")
    return stays


def _birth_day(ctx: Context) -> date | None:
    birth = to_date(ctx.field("event.date"))
    return birth if birth is not None else ctx.need("event.date")


@fact("f_has_qualifying_late_hospital_stay")
def has_qualifying_late_hospital_stay(ctx: Context) -> bool | None:
    """07 §5, SUPP-ELIG-003: pobyt ≥ SUPP_TERM_MIN_CONSECUTIVE_DAYS kolejnych dni, którego pierwszy dzień
    ∈ [dzień SUPP_TERM_WINDOW_FIRST_DAY, dzień SUPP_TERM_WINDOW_LAST_DAY] — dzień porodu = dzień 1 (M15 a,
    ASSUMPTION-SUPP-DAY1). KP art. 180(2) § 1 pkt 3.
    """
    stays, birth = _hospital_stays(ctx), _birth_day(ctx)
    if stays is None or birth is None:
        return None
    first = birth + timedelta(days=int(ctx.param("SUPP_TERM_WINDOW_FIRST_DAY")) - 1)
    last = birth + timedelta(days=int(ctx.param("SUPP_TERM_WINDOW_LAST_DAY")) - 1)
    min_days = int(ctx.param("SUPP_TERM_MIN_CONSECUTIVE_DAYS"))
    for stay in stays:
        start, end = to_date(stay.get("from")), to_date(stay.get("to"))
        if start is None or end is None:
            return ctx.need("children.hospital_stays")
        if first <= start <= last and days_in(start, end) >= min_days:
            return True
    return False


@fact("f_supplementary_leave_weeks")
def supplementary_leave_weeks(ctx: Context, cap_week: Any = None, window_start_day: Any = None) -> int | None:
    """07 §5, SUPP-*: dla dziecka najdłużej hospitalizowanego suma dni pobytu w oknie
    [poród + window_start_day − 1, poród + 7·cap_week − 1] (dzień porodu = dzień 1, M15 a); ceil(dni / 7).

    Argumenty z ``result.args`` reguły SUPP-ELIG-* (wariant wg tygodnia ciąży i masy najlżejszego dziecka).
    KP art. 180(2) § 1, § 2, § 3.
    """
    stays, birth = _hospital_stays(ctx), _birth_day(ctx)
    if stays is None or birth is None or cap_week is None or window_start_day is None:
        return None
    window_from = birth + timedelta(days=int(window_start_day) - 1)
    window_to = end_after_weeks(birth, int(cap_week))
    per_child: dict[Any, int] = {}
    for stay in stays:
        start, end = to_date(stay.get("from")), to_date(stay.get("to"))
        if start is None or end is None:
            return ctx.need("children.hospital_stays")
        start, end = max(start, window_from), min(end, window_to)
        if start <= end:
            key = stay.get("child_index", 0)
            per_child[key] = per_child.get(key, 0) + days_in(start, end)
    days = max(per_child.values(), default=0)
    return -(-days // _week_days(ctx))
