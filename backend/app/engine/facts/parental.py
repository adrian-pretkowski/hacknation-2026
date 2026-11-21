"""Fakty - urlop rodzicielski, ojcowski, przejęcie macierzyńskiego i walidacje planu (zus_rules/07 §5, BE2-02).

Plan = ``plan.segments`` (04 ``PlanSegment``: parent, leave_type, from, to, work_fraction,
is_other_parent_reserved_9w). Brak planu = brak segmentów (lista pusta) - fakty walidacyjne zwracają wtedy wynik
„brak naruszenia”, a fakty wymagające segmentu (np. ``f_paternity_within_deadline``) korzystają z dat startu
(``plan.*_start_date``), które pipeline uzupełnia propozycją, gdy użytkownik ich nie podał.
Tydzień = WEEK_AS_DAYS dni (C3), liczba tygodni z dni jako Decimal bez zaokrągleń (C1).
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.core.dates import add_months, add_years, days_in, to_date
from app.core.money import div, mul, to_decimal
from app.engine.facts.registry import Context, fact

PARENTAL = "PARENTAL_LEAVE"
PATERNITY = "PATERNITY_LEAVE"
ADOPTION_EVENTS = ("ADOPTION", "FOSTER")


# ------------------------------------------------------------------------------------------- pomocniki
def segments(ctx: Context, leave_type: str | None = None, parent: str | None = None,
             prefix: str | None = None) -> list[dict[str, Any]]:
    """Segmenty planu z poprawnymi datami (from ≤ to), posortowane po ``from``."""
    found = []
    for seg in ctx.field("plan.segments") or []:
        start, end = to_date(seg.get("from")), to_date(seg.get("to"))
        if start is None or end is None or end < start:
            continue
        if leave_type is not None and seg.get("leave_type") != leave_type:
            continue
        if prefix is not None and not str(seg.get("leave_type") or "").startswith(prefix):
            continue
        if parent is not None and seg.get("parent") != parent:
            continue
        found.append(seg)
    return sorted(found, key=lambda s: to_date(s["from"]))


def seg_days(seg: dict[str, Any]) -> int:
    return days_in(to_date(seg["from"]), to_date(seg["to"]))


def _week_days(ctx: Context) -> int:
    return int(ctx.param("WEEK_AS_DAYS"))


def _weeks(ctx: Context, days: int) -> Decimal:
    return div(Decimal(days), _week_days(ctx))


def child_birth_date(ctx: Context) -> date | None:
    """Data urodzenia dziecka: najstarsze z ``children.items`` (C7), przy porodzie - ``event.date``."""
    dates = [to_date(c.get("birth_date")) for c in ctx.field("children.items") or []]
    dates = [d for d in dates if d is not None]
    if dates:
        return min(dates)
    if ctx.field("event.type") == "BIRTH":
        birth = to_date(ctx.field("event.date"))
        return birth if birth is not None else ctx.need("event.date")
    return ctx.need("children.items")


def _work_fraction(seg: dict[str, Any] | None) -> Decimal:
    return to_decimal((seg or {}).get("work_fraction")) or Decimal(0)


def _multiple(ctx: Context) -> bool | None:
    path = "children.count_at_birth" if ctx.field("event.type") == "BIRTH" else "children.count_at_event"
    count = ctx.field(path)
    if count is None:
        return ctx.need(path)
    return int(count) > 1


# ------------------------------------------------------------------------------------- wymiar i prawo
@fact("f_child_age_years_on")
def child_age_years_on(ctx: Context, date: Any = None) -> int | None:
    """07 §5: pełne lata dziecka (najstarszego z przyjętych) w ``date``; dzień urodzin = ukończenie lat (C7).

    KP art. 183 § 1; USTAWA art. 29 ust. 1 pkt 2-3.
    """
    day = to_date(date)
    birth = child_birth_date(ctx)
    if day is None or birth is None:
        return None
    years = day.year - birth.year
    return years - 1 if day < add_years(birth, years) else years


def adoption_age_capped(ctx: Context) -> bool | None:
    """KP art. 183 § 3: dziecko osiąga graniczny wiek (FOSTER 7/10, ADOPTION 14) przed końcem urlopu na warunkach
    macierzyńskiego w pełnym wymiarze → rodzicielski 38 (Za życiem 62) tygodni (C7: ostatni dzień = dzień przed
    urodzinami granicznymi)."""
    start = to_date(ctx.field("event.date"))
    birth = child_birth_date(ctx)
    weeks = ctx.fact("f_maternity_leave_weeks")
    if start is None:
        ctx.need("event.date")
    if start is None or birth is None or weeks is None:
        return None
    if ctx.field("event.type") == "ADOPTION":
        limit = int(ctx.param("ADOPTION_CHILD_AGE_MAX"))
    elif ctx.field("children.school_obligation_deferred"):
        limit = int(ctx.param("FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED"))
    else:
        limit = int(ctx.param("FOSTER_CHILD_AGE_MAX"))
    last_allowed = add_years(birth, limit) - timedelta(days=1)
    regular_end = start + timedelta(days=weeks * _week_days(ctx) - 1)
    return last_allowed < regular_end


@fact("f_parental_leave_weeks")
def parental_leave_weeks(ctx: Context) -> int | None:
    """07 §5: BIRTH 41/43, „Za życiem” 65/67; ADOPTION/FOSTER 41/43, w przypadku KP 183 § 3 - 38 (Za życiem 62).

    ``za_zyciem`` null → None. KP art. 182(1a) § 1-2; art. 183 § 3.
    """
    za_zyciem = ctx.field("children.za_zyciem_certificate")
    if za_zyciem is None:
        ctx.need("children.za_zyciem_certificate")
    multiple = _multiple(ctx)
    if za_zyciem is None or multiple is None:
        return None
    if ctx.field("event.type") in ADOPTION_EVENTS:
        capped = adoption_age_capped(ctx)
        if capped is None:
            return None
        if capped:
            return int(ctx.param("PARENTAL_WEEKS_ADOPT_GUARANTEED_ZA_ZYCIEM" if za_zyciem
                                 else "PARENTAL_WEEKS_ADOPT_GUARANTEED"))
    if za_zyciem:
        name = "PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE" if multiple else "PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE"
    else:
        name = "PARENTAL_WEEKS_MULTIPLE" if multiple else "PARENTAL_WEEKS_SINGLE"
    return int(ctx.param(name))


@fact("f_child_alive_on")
def child_alive_on(ctx: Context, date: Any = None) -> bool | None:
    """07 §5: którekolwiek dziecko żyje w ``date`` (nie martwo urodzone, bez zgonu przed ``date``).

    ``children.items`` null → None. Zgon w trakcie urlopu - GAP-014 (pipeline: NEEDS_REVIEW). KP art. 182(1a).
    """
    day = to_date(date)
    items = ctx.field("children.items")
    if items is None:
        return ctx.need("children.items")
    if day is None:
        return None
    for child in items:
        if child.get("stillborn"):
            continue
        death = to_date(child.get("death_date"))
        if death is None or death >= day:
            return True
    return False


@fact("f_parental_weeks_planned_for_parent")
def parental_weeks_planned_for_parent(ctx: Context, parent: Any = None) -> Decimal | None:
    """07 §5: suma dni segmentów PARENTAL_LEAVE rodzica (bez wydłużenia) / 7. KP art. 182(1a) § 3-4."""
    if parent is None:
        return None
    return _weeks(ctx, sum(seg_days(s) for s in segments(ctx, PARENTAL, parent)))


@fact("f_parental_pool_minus_other_parent_reserved")
def parental_pool_minus_other_parent_reserved(ctx: Context) -> Decimal | None:
    """07 §5: f_parental_leave_weeks − PARENTAL_NONTRANSFERABLE_WEEKS (9 tyg. drugiego rodzica). KP art. 182(1a) § 3."""
    pool = ctx.fact("f_parental_leave_weeks")
    if pool is None:
        return None
    return Decimal(pool) - Decimal(int(ctx.param("PARENTAL_NONTRANSFERABLE_WEEKS")))


@fact("f_parental_extension")
def parental_extension(ctx: Context) -> dict[str, Any] | None:
    """07 §5: {weeks: Σ(tygodnie łączenia × work_fraction), days: floor(7 × weeks)}, przycięte do capów
    PARENTAL_EXT_CAP (łączny wymiar z wydłużeniem; niepełny dzień pomija się). KP art. 182(1f) § 2, § 4."""
    weeks = Decimal(0)
    for seg in segments(ctx, PARENTAL):
        fraction = _work_fraction(seg)
        if fraction > 0:
            weeks += mul(_weeks(ctx, seg_days(seg)), fraction)
    pool = ctx.fact("f_parental_leave_weeks")
    if pool is None:
        return None
    caps = ctx.param("PARENTAL_EXT_CAP")
    za_zyciem, multiple = bool(ctx.field("children.za_zyciem_certificate")), bool(_multiple(ctx))
    key = ("za_zyciem_" if za_zyciem else "") + ("multiple" if multiple else "single")
    weeks = min(weeks, Decimal(int(caps[key]) - pool))
    return {"weeks": weeks, "days": int(mul(weeks, Decimal(_week_days(ctx))))}


@fact("f_total_parental_weeks_planned")
def total_parental_weeks_planned(ctx: Context) -> Decimal | None:
    """07 §5: suma dni segmentów PARENTAL obu rodziców / 7 − wydłużenie z f_parental_extension; jednoczesne
    korzystanie zużywa pulę podwójnie (PAR-SHARE-002). KP art. 182(1a) § 5."""
    extension = ctx.fact("f_parental_extension")
    if extension is None:
        return None
    return _weeks(ctx, sum(seg_days(s) for s in segments(ctx, PARENTAL))) - extension["weeks"]


@fact("f_parental_parts_count")
def parental_parts_count(ctx: Context) -> int:
    """07 §5: liczba rozłącznych ciągów segmentów PARENTAL - łącznie obu rodziców, segment każdego rodzica to osobna
    część; segmenty tego samego rodzica stykające się (to + 1 = from) tworzą jedną część (GAP-017, DERIVED).
    KP art. 182(1a) § 1."""
    parts = 0
    by_parent: dict[str, list[dict[str, Any]]] = {}
    for seg in segments(ctx, PARENTAL):
        by_parent.setdefault(str(seg.get("parent")), []).append(seg)
    for segs in by_parent.values():
        previous_end: date | None = None
        for seg in segs:
            start = to_date(seg["from"])
            if previous_end is None or start > previous_end + timedelta(days=1):
                parts += 1
            previous_end = max(previous_end or start, to_date(seg["to"]))
    return parts


@fact("f_parental_last_day_after_limit")
def parental_last_day_after_limit(ctx: Context) -> bool | None:
    """07 §5: ostatni dzień rodzicielskiego > 31.12 roku, w którym dziecko kończy PARENTAL_CHILD_AGE_YEAR_LIMIT lat
    (ADOPTION: > dzień przed ADOPTION_CHILD_AGE_MAX urodzinami, C7). KP art. 182(1a) § 1; art. 183 § 1."""
    segs = segments(ctx, PARENTAL)
    if not segs:
        return False
    birth = child_birth_date(ctx)
    if birth is None:
        return None
    last = max(to_date(s["to"]) for s in segs)
    if ctx.field("event.type") == "ADOPTION":
        limit = add_years(birth, int(ctx.param("ADOPTION_CHILD_AGE_MAX"))) - timedelta(days=1)
    else:
        limit = date(birth.year + int(ctx.param("PARENTAL_CHILD_AGE_YEAR_LIMIT")), 12, 31)
    return last > limit


@fact("f_has_work_in_parental")
def has_work_in_parental(ctx: Context) -> bool:
    """07 §5: którykolwiek segment PARENTAL z work_fraction > 0. KP art. 182(1e)."""
    return any(_work_fraction(s) > 0 for s in segments(ctx, PARENTAL))


@fact("f_max_work_fraction_in_parental")
def max_work_fraction_in_parental(ctx: Context) -> Decimal:
    """07 §5: max(work_fraction) segmentów PARENTAL; brak → 0. KP art. 182(1e) § 1."""
    return max((_work_fraction(s) for s in segments(ctx, PARENTAL)), default=Decimal(0))


@fact("f_segment_work_fraction")
def segment_work_fraction(ctx: Context) -> Decimal:
    """07 §5: work_fraction bieżącego segmentu; brak → 0. USTAWA art. 31 ust. 4a."""
    return _work_fraction(ctx.segment)


@fact("f_one_minus_work_fraction")
def one_minus_work_fraction(ctx: Context) -> Decimal:
    """07 §5: 1 − f_segment_work_fraction. USTAWA art. 31 ust. 4a."""
    return Decimal(1) - ctx.fact("f_segment_work_fraction")


# --------------------------------------------------------------------------------------------- stawki
@fact("f_segment_is_other_parent_reserved_9w")
def segment_is_other_parent_reserved_9w(ctx: Context) -> bool | None:
    """07 §5: ``segment.is_other_parent_reserved_9w``; gdy null - segment rodzica innego niż wnioskodawca 81,5%
    zaczyna się w pierwszych PARENTAL_NONTRANSFERABLE_WEEKS tygodniach jego rodzicielskiego. USTAWA art. 31 ust. 3f."""
    seg = ctx.segment or {}
    flag = seg.get("is_other_parent_reserved_9w")
    if flag is not None:
        return bool(flag)
    if seg.get("leave_type") != PARENTAL:
        return False
    applicant = ctx.fact("f_segment_belongs_to_applicant_of_combined")
    if applicant is None:
        return None
    if applicant:
        return False
    start = to_date(seg.get("from"))
    if start is None:
        return None
    used_before = sum(seg_days(s) for s in segments(ctx, PARENTAL, seg.get("parent")) if to_date(s["from"]) < start)
    return used_before < int(ctx.param("PARENTAL_NONTRANSFERABLE_WEEKS")) * _week_days(ctx)


@fact("f_any_parental_day_in_first_year")
def any_parental_day_in_first_year(ctx: Context) -> bool | None:
    """07 §5: którykolwiek dzień PARENTAL (obojga rodziców) przed 1. urodzinami dziecka (C7). Bez planu - bieżący
    segment (propozycja pipeline'u). GAP-019: przyjęcie dziecka starszego niż rok - niejasne. USTAWA art. 31 ust. 3g."""
    birth = child_birth_date(ctx)
    if birth is None:
        return None
    first_birthday = add_years(birth, 1)
    starts = [to_date(s["from"]) for s in segments(ctx, PARENTAL)]
    if not starts and (ctx.segment or {}).get("leave_type") == PARENTAL:
        starts = [to_date(ctx.segment.get("from"))]
    starts = [s for s in starts if s is not None]
    if not starts:
        return None
    return min(starts) < first_birthday


@fact("f_one_off_equalization")
def one_off_equalization(ctx: Context) -> Decimal | None:
    """07 §2: base × (MAT_RATE_FULL − MAT_RATE_COMBINED) / MONTH_AS_DAYS × dni(macierzyński) - wyrównanie do 100%
    (DERIVED). Dni macierzyńskiego: segmenty MATERNITY_LEAVE matki, bez planu - pełny wymiar. USTAWA art. 31 ust. 3g."""
    base = ctx.fact("f_benefit_base")
    if base is None:
        return None
    days = sum(seg_days(s) for s in segments(ctx, "MATERNITY_LEAVE", "MOTHER"))
    if not days:
        weeks = ctx.fact("f_maternity_leave_weeks")
        if weeks is None:
            return None
        days = weeks * _week_days(ctx)
    diff = Decimal(ctx.param("MAT_RATE_FULL")) - Decimal(ctx.param("MAT_RATE_COMBINED"))
    return mul(div(mul(base, diff), int(ctx.param("MONTH_AS_DAYS"))), Decimal(days))


# ------------------------------------------------------------------------------------------- ojcowski
@fact("f_paternity_window")
def paternity_window(ctx: Context) -> dict[str, Any] | None:
    """07 §5: {max_days: PATERNITY_WEEKS × 7, deadline: urodzenie + 12 mies. − 1 dzień}; adopcja:
    min(uprawomocnienie + 12 mies. − 1, dzień przed 14. urodzinami). KP art. 182(3) § 1."""
    max_days = int(ctx.param("PATERNITY_WEEKS")) * _week_days(ctx)
    birth = child_birth_date(ctx)
    if birth is None:
        return None
    if ctx.field("event.type") == "ADOPTION":
        final = to_date(ctx.field("event.adoption_final_date"))
        if final is None:
            return ctx.need("event.adoption_final_date")
        deadline = min(add_months(final, int(ctx.param("PATERNITY_ADOPTION_WINDOW_MONTHS"))) - timedelta(days=1),
                       add_years(birth, int(ctx.param("ADOPTION_CHILD_AGE_MAX"))) - timedelta(days=1))
    else:
        deadline = add_months(birth, int(ctx.param("PATERNITY_CHILD_AGE_MONTHS"))) - timedelta(days=1)
    return {"max_days": max_days, "deadline": deadline}


@fact("f_paternity_within_deadline")
def paternity_within_deadline(ctx: Context) -> bool | None:
    """07 §5: wszystkie segmenty PATERNITY ≤ deadline, ≤ PATERNITY_MAX_PARTS części, każda ≥ PATERNITY_MIN_PART_WEEKS
    tyg., Σ ≤ max_days. Bez segmentów - jedna część max_days od ``plan.paternity_start_date``. KP art. 182(3) § 1-2."""
    window = ctx.fact("f_paternity_window")
    if window is None:
        return None
    segs = segments(ctx, PATERNITY)
    if segs:
        spans = [(to_date(s["from"]), to_date(s["to"])) for s in segs]
    else:
        start = to_date(ctx.field("plan.paternity_start_date"))
        if start is None:
            return ctx.need("plan.paternity_start_date")
        spans = [(start, start + timedelta(days=window["max_days"] - 1))]
    min_part = int(ctx.param("PATERNITY_MIN_PART_WEEKS")) * _week_days(ctx)
    lengths = [days_in(a, b) for a, b in spans]
    return (len(spans) <= int(ctx.param("PATERNITY_MAX_PARTS")) and all(n >= min_part for n in lengths)
            and sum(lengths) <= window["max_days"] and all(b <= window["deadline"] for _, b in spans))


# ------------------------------------------------------------------------------- macierzyński: plan
@fact("f_mother_maternity_weeks_used_after_birth")
def mother_maternity_weeks_used_after_birth(ctx: Context) -> Decimal | None:
    """07 §5: dni segmentów MATERNITY_LEAVE matki od dnia porodu / 7. KP art. 180 § 5; USTAWA art. 29 ust. 4."""
    birth = to_date(ctx.field("event.date"))
    if birth is None:
        return ctx.need("event.date")
    days = 0
    for seg in segments(ctx, "MATERNITY_LEAVE", "MOTHER"):
        start, end = max(to_date(seg["from"]), birth), to_date(seg["to"])
        if end >= start:
            days += days_in(start, end)
    return _weeks(ctx, days)


@fact("f_total_maternity_weeks_planned")
def total_maternity_weeks_planned(ctx: Context) -> Decimal:
    """07 §5: suma dni wszystkich segmentów MATERNITY_* (obojga rodziców) / 7. KP art. 180 § 1, § 5."""
    return _weeks(ctx, sum(seg_days(s) for s in segments(ctx, prefix="MATERNITY_")))


@fact("f_weeks_before_due_date")
def weeks_before_due_date(ctx: Context) -> Decimal | None:
    """07 §5: (expected_due_date − maternity_start_date).days / 7. KP art. 180 § 2."""
    start = to_date(ctx.field("plan.maternity_start_date"))
    due = to_date(ctx.field("pregnancy.expected_due_date"))
    if start is None:
        return None
    if due is None:
        return ctx.need("pregnancy.expected_due_date")
    return _weeks(ctx, (due - start).days)
