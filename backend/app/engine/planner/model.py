"""Graf decyzji planu urlopów obojga rodziców (BE2-07): kroki, opcje i ograniczenia z zus_rules/03_rules.yaml.

Graf jest warstwowy (DAG): węzeł = (indeks kroku, ``State``), krawędź = opcja kroku. ``State`` trzyma tylko to,
od czego zależą dalsze ograniczenia i kwoty (stawka 81,5%, tygodnie rodzicielskiego każdego rodzica, wykorzystane
wydłużenie), więc różne ścieżki zbiegają się w tych samych węzłach. Zysk krawędzi (``Outcome.totals``) jest
addytywny - najlepszy plan to najdłuższa ścieżka w DAG (``optimizer.py``).

Wszystkie wymiary, stawki i progi pochodzą z ``param()`` (meta.parameters) - bez liczb z przepisów w kodzie.
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field, replace
from decimal import Decimal
from typing import Any

from app.core.money import div, mul, to_decimal
from app.core.params import param

MOTHER, FATHER = "MOTHER", "FATHER"
ZERO = Decimal(0)
WORK_FRACTIONS = ("0", "0.25", "0.5", "0.75")  # 0.75 pokazane jako opcja niedozwolona (PAR-WORK-001)


# --------------------------------------------------------------------------------------------------- profil i stan
@dataclass(frozen=True)
class ParentProfile:
    base_monthly: Decimal | None = None  # podstawa wymiaru zasiłku (miesięczna)
    insured: bool = True  # ubezpieczenie chorobowe w okresie urlopu
    gross_monthly: Decimal | None = None  # wynagrodzenie przy pracy na rodzicielskim; brak → szacunek z podstawy
    can_work_part_time: bool = True


@dataclass(frozen=True)
class Profile:
    mother: ParentProfile
    father: ParentProfile
    children_count: int = 1
    za_zyciem: bool = False

    def parent(self, who: str) -> ParentProfile:
        return self.mother if who == MOTHER else self.father


@dataclass(frozen=True)
class State:
    combined: bool | None = None  # wniosek 81,5% (RATE-MAT-003)
    mother_parental_weeks: int = 0
    father_parental_weeks: int = 0
    ext_days: int = 0  # wykorzystane wydłużenie rodzicielskiego przy pracy (PAR-WORK-002)

    def as_dict(self) -> dict[str, Any]:
        return {"combined_815": self.combined, "mother_parental_weeks": self.mother_parental_weeks,
                "father_parental_weeks": self.father_parental_weeks, "extension_days": self.ext_days}


@dataclass(frozen=True)
class Totals:
    money: Decimal = ZERO
    covered_days: int = 0  # dni opieki nad dzieckiem pokryte urlopem (macierzyński + rodzicielski + wydłużenie)
    together_days: int = 0  # dni, gdy ojciec jest z dzieckiem równolegle z matką (ojcowski)
    review_rules: frozenset[str] = frozenset()

    def __add__(self, other: Totals) -> Totals:
        return Totals(self.money + other.money, self.covered_days + other.covered_days,
                      self.together_days + other.together_days, self.review_rules | other.review_rules)


@dataclass(frozen=True)
class Item:
    """Pozycja rozliczenia planu (zasiłek za okres, korekta przy pracy, wynagrodzenie)."""
    parent: str
    kind: str
    label: str
    days: int
    amount: Decimal
    rule_ids: tuple[str, ...]
    rate: Decimal | None = None
    work_fraction: Decimal | None = None


@dataclass(frozen=True)
class Outcome:
    state: State
    totals: Totals
    items: tuple[Item, ...] = ()


@dataclass(frozen=True)
class Option:
    value: Any
    label: str
    feasible: bool = True
    blocked_by: str | None = None  # ID reguły, która wyklucza opcję
    reason: str | None = None


@dataclass(frozen=True)
class Step:
    id: str
    title: str
    question: str
    rule_ids: tuple[str, ...]
    options: Callable[[Profile, State], list[Option]]
    apply: Callable[[Profile, State, Any], Outcome]
    hint: Callable[[Profile, State], str | None] = field(default=lambda _p, _s: None)


# --------------------------------------------------------------------------------------------- wymiary i stawki
def week() -> int:
    return int(param("WEEK_AS_DAYS"))


def maternity_weeks(p: Profile) -> int:
    table = param("MATERNITY_WEEKS_BY_CHILDREN")
    return int(table["5+"] if p.children_count >= 5 else table[str(p.children_count)])


def parental_pool_weeks(p: Profile) -> int:
    multiple = p.children_count >= 2
    if p.za_zyciem:
        return int(param("PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE" if multiple else "PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE"))
    return int(param("PARENTAL_WEEKS_MULTIPLE" if multiple else "PARENTAL_WEEKS_SINGLE"))


def reserved_weeks() -> int:
    return int(param("PARENTAL_NONTRANSFERABLE_WEEKS"))


def shared_weeks(p: Profile) -> int:
    return parental_pool_weeks(p) - 2 * reserved_weeks()


def max_extension_days(p: Profile) -> int:
    key = ("za_zyciem_" if p.za_zyciem else "") + ("multiple" if p.children_count >= 2 else "single")
    return (int(param("PARENTAL_EXT_CAP")[key]) - parental_pool_weeks(p)) * week()


def max_transfer_weeks(p: Profile) -> int:
    return maternity_weeks(p) - int(param("MOTHER_MIN_WEEKS_BEFORE_TRANSFER"))


def mother_maternity_rate(s: State) -> tuple[Decimal, str]:
    return (param("MAT_RATE_COMBINED"), "RATE-MAT-003") if s.combined else (param("MAT_RATE_FULL"), "RATE-MAT-001")


def parental_rate(s: State, who: str) -> tuple[Decimal, str]:
    if who == MOTHER and s.combined:
        return param("MAT_RATE_COMBINED"), "RATE-MAT-003"
    return param("MAT_RATE_PARENTAL"), "RATE-MAT-004" if s.combined else "RATE-MAT-002"


def benefit(base: Decimal | None, rate: Decimal, days: int, floor: bool = True) -> Decimal:
    """Zasiłek za ``days`` dni: podstawa × stawka / 30 × dni (07 §8, MONTH_AS_DAYS); brak podstawy → 0.

    BE2-14, RATE-MAT-007 (M10): miesięczna kwota niższa niż PARENTAL_BENEFIT_FLOOR_MONTHLY → podwyższona do niej.
    Planer nie zna dat kalendarzowych okresów, więc liczy kwotę minimalną jako floor / MONTH_AS_DAYS za dzień
    (silnik: proporcjonalnie do dni miesiąca - założenie PLANNER_FLOOR_DAILY). ``floor=False`` - bez podwyższenia
    (łączenie z pracą: sposób podwyższenia nieustalony, M10c; tak samo w silniku).
    """
    if base is None or days == 0:
        return ZERO
    monthly = mul(base, rate)
    if floor:
        monthly = max(monthly, to_decimal(param("PARENTAL_BENEFIT_FLOOR_MONTHLY")))
    return mul(div(monthly, param("MONTH_AS_DAYS")), Decimal(days))


def gross_monthly(parent: ParentProfile) -> tuple[Decimal | None, bool]:
    """Wynagrodzenie do pracy na rodzicielskim; brak → szacunek podstawa / (1 − 13,71%) (estimated=True)."""
    if parent.gross_monthly is not None:
        return parent.gross_monthly, False
    if parent.base_monthly is None:
        return None, True
    return div(parent.base_monthly, Decimal(1) - param("CONTRIBUTION_DEDUCTION_RATE")), True


def _fraction(value: Any) -> str:
    """Wymiar etatu do tekstu: 0.5 → ½, inaczej liczba z przecinkiem."""
    return "½" if Decimal(str(value)) == Decimal("0.5") else str(value).replace(".", ",")


def _max_work() -> str:
    return _fraction(param("PARENTAL_WORK_MAX_FRACTION"))


def pct(rate: Decimal) -> str:
    return f"{format((rate * 100).normalize(), 'f').replace('.', ',')}%"


def money_label(value: Decimal) -> str:
    return f"{value.quantize(Decimal('0.01')):,.2f}".replace(",", " ").replace(".", ",") + " zł"


def _item(who: str, kind: str, label: str, days: int, base: Decimal | None, rate: Decimal, rules: tuple[str, ...],
          fraction: Decimal | None = None) -> Item:
    return Item(who, kind, label, days, benefit(base, rate, days), rules, rate, fraction)


def _father_blocked(p: Profile, value_is_zero: bool, rule: str) -> tuple[bool, str | None, str | None]:
    if value_is_zero or p.father.insured:
        return True, None, None
    return False, rule, "Ojciec nie podlega ubezpieczeniu chorobowemu - zasiłek mu nie przysługuje."


# --------------------------------------------------------------------------------------------------------- kroki
def _combined_options(p: Profile, s: State) -> list[Option]:
    return [Option(True, f"Tak - wniosek o 81,5% za cały okres w {param('APP_COMBINED_DEADLINE_DAYS')} dni od porodu"),
            Option(False, "Nie - 100% za macierzyński, 70% za rodzicielski")]


def _combined_apply(p: Profile, s: State, value: bool) -> Outcome:
    return Outcome(replace(s, combined=bool(value)), Totals())


def _transfer_options(p: Profile, s: State) -> list[Option]:
    limit, options = max_transfer_weeks(p), []
    for weeks in range(0, maternity_weeks(p) + 1):
        ok, rule, reason = _father_blocked(p, weeks == 0, "MAT-SHARE-001")
        if weeks > limit:
            ok, rule = False, "MAT-SHARE-001"
            reason = (f"Matka musi wykorzystać co najmniej {param('MOTHER_MIN_WEEKS_BEFORE_TRANSFER')} tygodni "
                      "macierzyńskiego po porodzie.")
        label = ("Matka wykorzystuje cały macierzyński" if weeks == 0
                 else f"Ojciec przejmuje {weeks} tyg. macierzyńskiego")
        options.append(Option(weeks, label, ok, rule, reason))
    return options


def _transfer_apply(p: Profile, s: State, weeks: int) -> Outcome:
    w, total = week(), maternity_weeks(p)
    rate, rate_rule = mother_maternity_rate(s)
    items = [_item(MOTHER, "MATERNITY_LEAVE", "Zasiłek macierzyński - matka", (total - weeks) * w,
                   p.mother.base_monthly, rate, ("MAT-DUR-001", rate_rule))]
    if weeks:
        items.append(_item(FATHER, "MATERNITY_LEAVE_TRANSFERRED", "Macierzyński przejęty przez ojca", weeks * w,
                           p.father.base_monthly, param("MAT_RATE_FULL"),
                           ("MAT-SHARE-001", "MAT-SHARE-007", "RATE-MAT-001")))
    return Outcome(s, Totals(sum((i.amount for i in items), ZERO), total * w), tuple(items))


def _transfer_hint(p: Profile, s: State) -> str | None:
    rate, _ = mother_maternity_rate(s)
    mother = benefit(p.mother.base_monthly, rate, week())
    father = benefit(p.father.base_monthly, param("MAT_RATE_FULL"), week())
    return (f"Tydzień macierzyńskiego: matka {money_label(mother)} ({pct(rate)}), ojciec {money_label(father)} "
            f"({pct(param('MAT_RATE_FULL'))}).")


def _paternity_options(p: Profile, s: State) -> list[Option]:
    options = []
    for weeks in range(0, int(param("PATERNITY_WEEKS")) + 1):
        ok, rule, reason = _father_blocked(p, weeks == 0, "PAT-ELIG-001")
        options.append(Option(weeks, "Bez urlopu ojcowskiego" if weeks == 0 else f"{weeks} tyg. urlopu ojcowskiego",
                              ok, rule, reason))
    return options


def _paternity_apply(p: Profile, s: State, weeks: int) -> Outcome:
    days = weeks * week()
    if not days:
        return Outcome(s, Totals())
    item = _item(FATHER, "PATERNITY_LEAVE", "Zasiłek za urlop ojcowski", days, p.father.base_monthly,
                 param("MAT_RATE_FULL"), ("PAT-ELIG-001", "PAT-DUR-001", "RATE-MAT-001"))
    return Outcome(s, Totals(item.amount, 0, days), (item,))


def _father_reserved_options(p: Profile, s: State) -> list[Option]:
    options = []
    for weeks in range(reserved_weeks(), -1, -1):
        ok, rule, reason = _father_blocked(p, weeks == 0, "PAR-ELIG-001")
        label = (f"Ojciec nie korzysta - {reserved_weeks()} tyg. przepada" if weeks == 0
                 else f"Ojciec wykorzystuje {weeks} z {reserved_weeks()} tyg. (nieprzenoszalne)")
        options.append(Option(weeks, label, ok, rule, reason))
    return options


def _father_reserved_apply(p: Profile, s: State, weeks: int) -> Outcome:
    days = weeks * week()
    rate, rate_rule = parental_rate(s, FATHER)
    new_state = replace(s, father_parental_weeks=s.father_parental_weeks + weeks)
    if not days:
        return Outcome(new_state, Totals())
    item = _item(FATHER, "PARENTAL_LEAVE", "Rodzicielski - 9 tyg. ojca", days, p.father.base_monthly, rate,
                 ("PAR-ELIG-001", "PAR-SHARE-001", rate_rule))
    return Outcome(new_state, Totals(item.amount, days), (item,))


def _shared_options(p: Profile, s: State) -> list[Option]:
    total, options = shared_weeks(p), []
    for father in range(0, total + 1):
        ok, rule, reason = _father_blocked(p, father == 0, "PAR-ELIG-001")
        options.append(Option(father, f"Matka {total - father} tyg., ojciec {father} tyg.", ok, rule, reason))
    return options


def _shared_apply(p: Profile, s: State, father_weeks: int) -> Outcome:
    w = week()
    mother_weeks = reserved_weeks() + shared_weeks(p) - father_weeks
    m_rate, m_rule = parental_rate(s, MOTHER)
    f_rate, f_rule = parental_rate(s, FATHER)
    items = [_item(MOTHER, "PARENTAL_LEAVE", "Rodzicielski - matka (9 tyg. własnych + część wspólna)",
                   mother_weeks * w, p.mother.base_monthly, m_rate, ("PAR-ELIG-001", "PAR-DUR-001", m_rule))]
    review: frozenset[str] = frozenset()
    if father_weeks:
        rules: tuple[str, ...] = ("PAR-ELIG-001", "PAR-SHARE-002", f_rule)
        if s.combined:
            rules += ("RATE-MAT-008",)
            review = frozenset({"RATE-MAT-008"})
        items.append(_item(FATHER, "PARENTAL_LEAVE", "Rodzicielski - ojciec (część wspólna)", father_weeks * w,
                           p.father.base_monthly, f_rate, rules))
    new_state = replace(s, mother_parental_weeks=mother_weeks,
                        father_parental_weeks=s.father_parental_weeks + father_weeks)
    return Outcome(new_state, Totals(sum((i.amount for i in items), ZERO), (mother_weeks + father_weeks) * w, 0,
                                     review), tuple(items))


def _shared_hint(p: Profile, s: State) -> str | None:
    m_rate, _ = parental_rate(s, MOTHER)
    f_rate, _ = parental_rate(s, FATHER)
    mother = benefit(p.mother.base_monthly, m_rate, week())
    father = benefit(p.father.base_monthly, f_rate, week())
    extra = " Stawka ojca przy wniosku 81,5% matki wymaga weryfikacji (RATE-MAT-008)." if s.combined else ""
    return (f"Tydzień wspólnej części: matka {money_label(mother)} ({pct(m_rate)}), ojciec {money_label(father)} "
            f"({pct(f_rate)}).{extra}")


def _work_options(who: str) -> Callable[[Profile, State], list[Option]]:
    def options(p: Profile, s: State) -> list[Option]:
        weeks = s.mother_parental_weeks if who == MOTHER else s.father_parental_weeks
        result = []
        for raw in WORK_FRACTIONS:
            fraction = Decimal(raw)
            label = "Bez pracy" if fraction == 0 else f"Praca {pct(fraction)} etatu na rodzicielskim"
            ok, rule, reason = True, None, None
            if fraction > param("PARENTAL_WORK_MAX_FRACTION"):
                ok, rule, reason = False, "PAR-WORK-001", \
                    f"Na rodzicielskim można pracować najwyżej na {_max_work()} etatu."
            elif fraction and (weeks == 0 or not p.parent(who).can_work_part_time):
                ok, rule, reason = False, "PAR-WORK-001", "Brak tygodni rodzicielskiego albo możliwości pracy."
            elif fraction and s.ext_days + _extension_days(weeks, fraction) > max_extension_days(p):
                ok, rule, reason = False, "PAR-WORK-002", "Wydłużenie przekroczyłoby limit wymiaru."
            result.append(Option(raw, label, ok, rule, reason))
        return result
    return options


def _extension_days(weeks: int, fraction: Decimal) -> int:
    # KP 182(1f): wydłużenie = tygodnie łączenia × wymiar pracy; niepełny dzień pomija się
    return int(Decimal(weeks * week()) * fraction)


def _work_apply(who: str) -> Callable[[Profile, State, Any], Outcome]:
    def apply(p: Profile, s: State, raw: str) -> Outcome:
        fraction = Decimal(raw)
        if not fraction:
            return Outcome(s, Totals())
        parent = p.parent(who)
        weeks = s.mother_parental_weeks if who == MOTHER else s.father_parental_weeks
        days, ext = weeks * week(), _extension_days(weeks, fraction)
        rate, rate_rule = parental_rate(s, who)
        # zasiłek przy pracy = podstawa × stawka × (1 − wymiar), bez podwyższenia RATE-MAT-007 (jak w silniku)
        paid = mul(benefit(parent.base_monthly, rate, days, floor=False), Decimal(1) - fraction)
        reduction = benefit(parent.base_monthly, rate, days) - paid
        gross, estimated = gross_monthly(parent)
        wage = ZERO if gross is None else mul(div(gross, param("MONTH_AS_DAYS")), Decimal(days), fraction)
        name = "matka" if who == MOTHER else "ojciec"
        items = (
            Item(who, "PARENTAL_WORK_REDUCTION", f"Zasiłek zmniejszony o wymiar pracy - {name}", days, -reduction,
                 ("PAR-WORK-003",), rate, fraction),
            _item(who, "PARENTAL_EXTENSION", f"Wydłużenie rodzicielskiego - {name}", ext, parent.base_monthly, rate,
                  ("PAR-WORK-002", rate_rule)),
            Item(who, "WORK_INCOME", f"Wynagrodzenie za pracę {pct(fraction)} etatu - {name}"
                 + (" (szacunek z podstawy)" if estimated else ""), days, wage, ("PAR-WORK-001",), None, fraction),
        )
        return Outcome(replace(s, ext_days=s.ext_days + ext),
                       Totals(sum((i.amount for i in items), ZERO), ext), items)
    return apply


def _work_hint(p: Profile, s: State) -> str | None:
    return (f"Praca do {_max_work()} etatu nie zmniejsza łącznej kwoty zasiłku - zasiłek maleje proporcjonalnie, "
            "ale urlop wydłuża się o tyle samo; dochodzi wynagrodzenie.")


STEPS: tuple[Step, ...] = (
    Step("COMBINED_815", "Wniosek 81,5%", "Czy matka składa w 21 dni od porodu wniosek o zasiłek 81,5% za cały okres?",
         ("RATE-MAT-001", "RATE-MAT-002", "RATE-MAT-003", "RATE-MAT-004", "APP-DL-001"),
         _combined_options, _combined_apply),
    Step("MATERNITY_TRANSFER", "Podział macierzyńskiego",
         "Ile tygodni macierzyńskiego przejmuje ojciec (po co najmniej 14 tygodniach matki)?",
         ("MAT-DUR-001", "MAT-SHARE-001", "MAT-SHARE-007", "RATE-MAT-001"),
         _transfer_options, _transfer_apply, _transfer_hint),
    Step("PATERNITY", "Urlop ojcowski", "Ile tygodni urlopu ojcowskiego bierze ojciec?",
         ("PAT-ELIG-001", "PAT-DUR-001", "RATE-MAT-001"), _paternity_options, _paternity_apply),
    Step("FATHER_RESERVED_9W", "9 tygodni ojca",
         "Ile ze swoich nieprzenoszalnych tygodni rodzicielskiego bierze ojciec?",
         ("PAR-SHARE-001", "PAR-ELIG-001", "RATE-MAT-002", "RATE-MAT-004"),
         _father_reserved_options, _father_reserved_apply),
    Step("SHARED_PARENTAL_SPLIT", "Podział wspólnej części rodzicielskiego",
         "Jak rodzice dzielą wspólną (przenoszalną) część urlopu rodzicielskiego?",
         ("PAR-DUR-001", "PAR-DUR-002", "PAR-SHARE-002", "RATE-MAT-002", "RATE-MAT-003", "RATE-MAT-008"),
         _shared_options, _shared_apply, _shared_hint),
    Step("WORK_MOTHER", "Praca matki na rodzicielskim", "Czy matka łączy rodzicielski z pracą (do ½ etatu)?",
         ("PAR-WORK-001", "PAR-WORK-002", "PAR-WORK-003"), _work_options(MOTHER), _work_apply(MOTHER), _work_hint),
    Step("WORK_FATHER", "Praca ojca na rodzicielskim", "Czy ojciec łączy rodzicielski z pracą (do ½ etatu)?",
         ("PAR-WORK-001", "PAR-WORK-002", "PAR-WORK-003"), _work_options(FATHER), _work_apply(FATHER), _work_hint),
)
