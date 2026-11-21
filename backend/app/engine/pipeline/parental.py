"""Urlop rodzicielski, ojcowski i przejęcie macierzyńskiego - kroki 07 §1 na regułach z 03_rules.yaml (BE2-02).

Wynik: osobny element ``benefits`` na każdy urlop wnioskodawcy (``person.role``):
- ``PARENTAL_LEAVE`` - PAR-DUR-001/002/003 (pula), PAR-ELIG-001 (+ GEN-EXCL-001, PAR-SHARE-003), stawka segmentu
  RATE-MAT-002/003/004/005/008, łączenie z pracą PAR-WORK-002/003, kwota CALC-MAT-001 (+ RATE-MAT-007);
- ``PATERNITY_LEAVE`` - PAT-DUR-001, PAT-ELIG-001 (+ GEN-EXCL-001), RATE-MAT-001;
- ``MATERNITY_LEAVE_TRANSFERRED`` / ``MATERNITY_LEAVE_HOSPITALIZATION_SUBSTITUTE`` - MAT-SHARE-001..006, RATE-MAT-001.
Walidacje planu obojga rodziców (``validation_error``) → ``plan_errors`` (status prawa bez zmian):
MAT-DUR-002, MAT-SHARE-007, PAR-SHARE-001/002, PAR-COND-001, PAR-WORK-001. ``return_to_work`` - dzień po ostatnim
segmencie urlopu każdego rodzica (KP art. 186(4)).

Bez segmentów w planie rodzicielski matki jest propozycją od dnia po urlopie macierzyńskim (``period.from``,
``max_weeks`` = pula, kwota dzienna) - bez ``to`` i sumy, bo podział puli między rodziców wybiera rodzina (D25).
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.core.dates import add_years, to_date
from app.core.money import dec_str, div, mul
from app.engine.facts.parental import (
    ADOPTION_EVENTS,
    PARENTAL,
    PATERNITY,
    adoption_age_capped,
    child_birth_date,
    seg_days,
    segments,
)
from app.engine.pipeline.engine import Engine, aggregate_status
from app.engine.pipeline.general import debt_exclusion, make_reason, payer_of_benefit, pct

PARENT_OF_ROLE = {"MOTHER": "MOTHER", "FATHER": "FATHER", "OTHER_FAMILY_MEMBER": "OTHER_FAMILY_MEMBER",
                  "ADOPTIVE_PARENT": "ADOPTIVE_PARENT_1", "FOSTER_PARENT": "ADOPTIVE_PARENT_1"}
# Kolejność = pierwszeństwo przy kilku regułach FIRED nienadpisanych przez siebie nawzajem (07 §6): reguły szczególne
# (RATE-MAT-005, -004, -008) przed 81,5% (RATE-MAT-003) i stawką podstawową (RATE-MAT-002)
PARENTAL_RATE_RULES = ["RATE-MAT-005", "RATE-MAT-004", "RATE-MAT-008", "RATE-MAT-003", "RATE-MAT-002"]
FULL_RATE_RULES = ["RATE-MAT-001"]
PARENTAL_DURATION_RULES = ["PAR-DUR-003", "PAR-DUR-002", "PAR-DUR-001"]
TRANSFER_RULES = ["MAT-SHARE-001", "MAT-SHARE-002", "MAT-SHARE-004", "MAT-SHARE-005"]
PLAN_RULES = ["MAT-DUR-002", "MAT-SHARE-007", "PAR-SHARE-001", "PAR-SHARE-002", "PAR-COND-001", "PAR-WORK-001"]
TRANSFERRED = "MATERNITY_LEAVE_TRANSFERRED"
HOSPITALIZATION = "MATERNITY_LEAVE_HOSPITALIZATION_SUBSTITUTE"


def _set_segment(eng: Engine, segment: dict[str, Any] | None) -> None:
    """Ustawia bieżący segment (cache faktów kluczowany treścią segmentu - Context.fact)."""
    eng.ctx.segment = segment


def applicant_parent(eng: Engine) -> str | None:
    return PARENT_OF_ROLE.get(eng.ctx.field("person.role"))


class _Benefit:
    """Wspólny stan jednego świadczenia: reguły, powody, flagi statusu (DT-9)."""

    def __init__(self, eng: Engine, leave_type: str):
        self.eng, self.leave_type = eng, leave_type
        self.applied: list[str] = []
        self.reasons: list[dict[str, Any]] = []
        self.needs_data = self.review = self.excluded = False
        self.eligible: bool | None = None
        self.suspended: bool | None = None

    def reason(self, code: str, rule_id: str, message: str, location: str) -> None:
        self.reasons.append(make_reason(self.eng, code, rule_id, message, location))

    def use(self, rule_id: str) -> None:
        if rule_id not in self.applied:
            self.applied.append(rule_id)

    def ask(self, outcome) -> None:
        self.eng.need_from(outcome)
        self.needs_data = True

    def debt(self) -> None:
        check = debt_exclusion(self.eng)
        for rule_id in check.applied:
            self.use(rule_id)
        self.reasons += check.reasons
        self.excluded = self.excluded or check.excluded
        self.needs_data = self.needs_data or check.needs_data
        self.suspended = check.suspended_until_debt_repaid

    def amounts(self, segs: list[dict[str, Any]], rate_rules: list[str]) -> dict[str, Any]:
        """Stawka i kwota każdego segmentu (07 §1 kroki 7–8) → pola wyniku (rate, days, kwoty, segments)."""
        eng, ctx = self.eng, self.eng.ctx
        out_segments: list[dict[str, Any]] = []
        rates: list[Decimal | None] = []
        daily_values: list[Decimal] = []
        total = Decimal(0)
        complete = True
        for seg in segs:
            _set_segment(eng, {**seg, "leave_type": seg.get("leave_type") or self.leave_type})
            rate, rule_id = self._rate(rate_rules)
            rates.append(rate)
            if rate is None:
                complete = False
                continue
            self.use(rule_id)
            ctx.state["rate"] = rate
            calc = eng.eval("CALC-MAT-001")
            amount = None
            if calc.unknown:
                self.ask(calc)
            elif calc.fired:
                amount = ctx.fact(eng.rules.rule("CALC-MAT-001")["result"]["compute"])
            if eng.eval("PAR-WORK-003").fired:
                self.use("PAR-WORK-003")
            if amount is not None:
                self.use("CALC-MAT-001")
                floor = eng.eval("RATE-MAT-007")
                raised = ctx.fact(eng.rules.rule("RATE-MAT-007")["result"]["compute"]) if floor.fired else None
                if raised is not None:
                    amount = {**amount, "daily": raised["daily"], "total": raised["total"]}
                    self.use("RATE-MAT-007")
            item = {"parent": seg.get("parent"), "leave_type": ctx.segment["leave_type"], "from": seg["from"],
                    "to": seg["to"], "days": seg_days(seg), "rate": dec_str(rate), "rule_ids": [rule_id]}
            if seg.get("work_fraction") is not None:
                item["work_fraction"] = str(seg["work_fraction"])
            if amount is None:
                complete = False
            else:
                item["daily_amount_exact"] = dec_str(amount["daily"])
                item["total_amount_exact"] = dec_str(amount["total"])
                daily_values.append(amount["daily"])
                total += amount["total"]
            out_segments.append(item)
        _set_segment(eng, None)
        known = {r for r in rates if r is not None}
        result: dict[str, Any] = {
            "rate": dec_str(known.pop()) if len(known) == 1 and None not in rates else None,
            "days": sum(seg_days(s) for s in segs),
            "daily_amount_exact": (dec_str(daily_values[0]) if complete and len(set(daily_values)) == 1
                                   else None),
            "total_amount_exact": dec_str(total) if complete and segs else None,
        }
        if out_segments:
            result["segments"] = out_segments
        return result

    def proposal(self, start: date | None, rate_rules: list[str]) -> dict[str, Any]:
        """Bez segmentów planu: stawka i kwota dzienna propozycji od ``start`` (D25)."""
        eng, ctx = self.eng, self.eng.ctx
        _set_segment(eng, {"parent": applicant_parent(eng), "leave_type": self.leave_type,
                           "from": start.isoformat() if start else None, "to": None})
        rate, rule_id = self._rate(rate_rules)
        daily = None
        if rate is not None:
            self.use(rule_id)
            ctx.state["rate"] = rate
            calc = eng.eval("CALC-MAT-001")
            if calc.unknown:
                self.ask(calc)
            elif calc.fired:
                base = ctx.fact("f_benefit_base")
                if base is not None:
                    daily = div(mul(base, rate), int(ctx.param("MONTH_AS_DAYS")))
        _set_segment(eng, None)
        return {"rate": dec_str(rate) if rate is not None else None, "days": None,
                "daily_amount_exact": dec_str(daily) if daily is not None else None, "total_amount_exact": None}

    def _rate(self, rate_rules: list[str]) -> tuple[Decimal | None, str | None]:
        winner, _unknown = self.eng.pick(rate_rules)
        if winner is None:
            return None, None
        return self.eng.ctx.param(self.eng.rules.rule(winner.rule_id)["result"]["set"]["rate"]["param"]), winner.rule_id

    def build(self, period: dict[str, Any] | None, amounts: dict[str, Any]) -> dict[str, Any]:
        # kontrakt: pola liczbowe okresu i ``days`` bez null - brak wartości = brak pola
        period = {k: v for k, v in (period or {}).items() if v is not None} or None
        amounts = {k: v for k, v in amounts.items() if not (k == "days" and v is None)}
        payer, payer_rule = payer_of_benefit(self.eng)
        if payer_rule is not None:
            self.use(payer_rule)
        status = aggregate_status(excluded=self.excluded, review=self.review, needs_data=self.needs_data,
                                  eligible=self.eligible)
        benefit = {"benefit_type": "MATERNITY_BENEFIT", "leave_type": self.leave_type, "status": status,
                   "period": period, **amounts, "payer_of_benefit": payer, "reasons": self.reasons,
                   "applied_rules": self.applied}
        if self.suspended is not None:
            benefit["suspended_until_debt_repaid"] = self.suspended
        return benefit


# -------------------------------------------------------------------------------------- rodzicielski
def default_parental_start(eng: Engine, maternity: dict[str, Any] | None) -> date | None:
    """Start rodzicielskiego: ``plan.parental_start_date`` → pierwszy segment PARENTAL wnioskodawcy → dzień po
    urlopie macierzyńskim matki (propozycja)."""
    ctx = eng.ctx
    given = to_date(ctx.field("plan.parental_start_date"))
    if given is not None:
        return given
    own = segments(ctx, PARENTAL, applicant_parent(eng))
    if own:
        return to_date(own[0]["from"])
    end = to_date(((maternity or {}).get("period") or {}).get("to"))
    return end + timedelta(days=1) if end is not None else None


def evaluate_parental(eng: Engine, maternity: dict[str, Any] | None = None) -> dict[str, Any] | None:
    ctx = eng.ctx
    ctx.state["benefit"] = "MATERNITY_BENEFIT"
    parent = applicant_parent(eng)
    own = segments(ctx, PARENTAL, parent)
    if parent != "MOTHER" and ctx.field("event.type") == "BIRTH" and not own:
        return None  # ojciec / członek rodziny bez zaplanowanej części rodzicielskiego - brak świadczenia do oceny
    b = _Benefit(eng, PARENTAL)
    start = default_parental_start(eng, maternity)
    if start is not None:
        ctx.state["plan.parental_start_date"] = start.isoformat()

    # wymiar puli (PAR-DUR-001/002/003 z overrides)
    pool = None
    duration, _ = eng.pick(PARENTAL_DURATION_RULES)
    if duration is not None:
        pool = ctx.fact(eng.rules.rule(duration.rule_id)["result"]["compute"])
        if pool is not None:
            b.use(duration.rule_id)
    else:
        for rule_id in PARENTAL_DURATION_RULES:
            outcome = eng.eval(rule_id)
            if outcome.unknown:
                b.ask(outcome)

    # prawo do świadczenia bazowego: macierzyński matki (BIRTH) albo urlop na warunkach macierzyńskiego
    # (ADOPTION/FOSTER)
    event_type = ctx.field("event.type")
    if event_type in ADOPTION_EVENTS:
        _adoption_base_right(b)
        if not b.excluded and pool is not None and adoption_age_capped(ctx):
            b.review = True  # PAR-DUR-003 notes, M14b: przesłanka KP 183 § 3 nieustalona → NEEDS_REVIEW
            b.reason("PARENTAL_ADOPTION_38_WEEKS_UNCONFIRMED", "PAR-DUR-003",
                     f"Dziecko osiąga graniczny wiek przed końcem urlopu na warunkach urlopu macierzyńskiego - "
                     f"wymiar rodzicielskiego może wynosić {pool} tygodni (KP art. 183 § 3). Przesłanka tego "
                     f"wariantu nie jest potwierdzona (M14b, CONF-003) - wymaga weryfikacji.", "KP art. 183 § 3-4")
    elif parent == "MOTHER" and maternity is not None:
        _cap_by_maternity(b, maternity)

    # prawo do zasiłku za okres urlopu rodzicielskiego
    elig = eng.eval("PAR-ELIG-001")
    b.eligible = elig.value
    if elig.unknown:
        b.ask(elig)
    elif elig.decided:
        b.use("PAR-ELIG-001")
    if elig.value is False:
        insured = ctx.fact("f_sickness_insured_on", date=start) if start else None
        if insured is False:
            b.reason("NOT_INSURED_ON_PARENTAL_START", "PAR-ELIG-001",
                     "Brak ubezpieczenia chorobowego w dniu rozpoczęcia urlopu rodzicielskiego (M12 b).",
                     "art. 29 ust. 1 pkt 1")
        else:
            b.reason("CHILD_NOT_ALIVE_ON_PARENTAL_START", "PAR-ELIG-001",
                     "Dziecko nie żyje w dniu rozpoczęcia urlopu rodzicielskiego - zasiłek za okres urlopu "
                     "rodzicielskiego nie przysługuje (martwe urodzenie albo zgon dziecka).", "KP art. 182(1a) § 1")
    if b.eligible is True:
        b.debt()
        _work_by_non_employee(b, start)
        if parent == "FATHER" and eng.eval("PAR-SHARE-003").fired:
            b.use("PAR-SHARE-003")
            b.reason("FUNDED_BY_STATE_BUDGET", "PAR-SHARE-003",
                     "Matka nie podlegała ubezpieczeniu chorobowemu w dniu porodu - zasiłek ojca za okres urlopu "
                     "rodzicielskiego finansowany z budżetu państwa.", "art. 29 ust. 9-10")
        if _child_dies_during(ctx, own):
            b.review = True  # GAP-014: prawo po zgonie dziecka w trakcie urlopu - weryfikacja
            b.reason("CHILD_DEATH_DURING_PARENTAL", "PAR-ELIG-001",
                     "Zgon dziecka w trakcie zaplanowanego urlopu rodzicielskiego - prawo do zasiłku po zgonie "
                     "wymaga weryfikacji (GAP-014).", "KP art. 182(1a)")

    # stawka i kwota (APP-DL-001 = termin wniosku 81,5%, zależność RATE-MAT-003)
    if eng.eval("APP-DL-001").fired:
        b.use("APP-DL-001")
    amounts = b.amounts(own, PARENTAL_RATE_RULES) if own else b.proposal(start, PARENTAL_RATE_RULES)
    _rate_reasons(b, amounts)
    older_adopted = event_type in ADOPTION_EVENTS and _child_at_least_one_year_on_event(ctx)
    # GAP-019 dotyczy tylko wniosku o łączny zasiłek (81,5% / wyrównanie); bez niego stawka 70% i tak obowiązuje
    combined = ctx.fact("f_combined_application_within_deadline") if older_adopted else False
    if older_adopted and combined is not False and "RATE-MAT-005" in b.applied:
        b.review = True  # GAP-019
        b.reason("FIRST_YEAR_RULE_UNCLEAR_FOR_OLDER_CHILD", "RATE-MAT-005",
                 "Przyjęto dziecko, które ukończyło rok - stosowanie zasady pierwszego roku życia (stawka "
                 "rodzicielskiego przy wniosku o łączny zasiłek, wyrównanie do 100%) jest niejasne (GAP-019) - "
                 "wymaga weryfikacji.", "art. 31 ust. 3g")

    # łączenie z pracą: wydłużenie (PAR-WORK-002)
    if eng.eval("PAR-WORK-002").fired:
        extension = ctx.fact(eng.rules.rule("PAR-WORK-002")["result"]["compute"])
        if extension is not None:
            b.use("PAR-WORK-002")
            b.reason("PARENTAL_EXTENDED_BY_WORK", "PAR-WORK-002",
                     f"Łączenie urlopu rodzicielskiego z pracą wydłuża urlop o {extension['days']} dni "
                     f"({dec_str(extension['weeks'])} tyg.), zasiłek zmniejsza się proporcjonalnie do wymiaru pracy.",
                     "KP art. 182(1f) § 2; art. 31 ust. 4a")

    period = None
    if pool is not None or start is not None:
        period = {"max_weeks": pool}
        if start is not None:
            period["from"] = start.isoformat()
        if own:
            period["from"] = own[0]["from"]
            period["to"] = max(to_date(s["to"]) for s in own).isoformat()
    if not older_adopted:
        _equalization(b, "RATE-MAT-006", parent)
    return b.build(period, amounts)


def _cap_by_maternity(b: _Benefit, maternity: dict[str, Any]) -> None:
    """PAR-ELIG-001 (dependencies: MAT-ELIG-001): rodzicielski matki nie lepszy niż prawo do macierzyńskiego."""
    status = maternity.get("status")
    if status == "NOT_ELIGIBLE":
        b.excluded = True
        b.reason("NO_MATERNITY_BENEFIT_RIGHT", "PAR-ELIG-001",
                 "Nie ustalono prawa do zasiłku macierzyńskiego za okres urlopu macierzyńskiego - zasiłek za okres "
                 "urlopu rodzicielskiego z tego tytułu nie przysługuje.", "art. 29 ust. 1; art. 31")
    elif status == "NEEDS_REVIEW":
        b.review = True
        b.reason("MATERNITY_BENEFIT_RIGHT_UNDER_REVIEW", "PAR-ELIG-001",
                 "Prawo do zasiłku macierzyńskiego wymaga weryfikacji - od niego zależy zasiłek za okres urlopu "
                 "rodzicielskiego.", "art. 29 ust. 1; art. 31")
    elif status == "NEEDS_DATA":
        b.needs_data = True


def _adoption_base_right(b: _Benefit) -> None:
    """ADOPTION/FOSTER: prawo do urlopu na warunkach macierzyńskiego (MAT-ELIG-002/003, wykluczenie MAT-EXCL-001)
    warunkuje rodzicielski - bez niego rodzicielski nie jest ELIGIBLE (M16b2: zawodowa rodzina zastępcza)."""
    eng, ctx = b.eng, b.eng.ctx
    excl = eng.eval("MAT-EXCL-001")
    if excl.fired:
        b.use("MAT-EXCL-001")
        b.excluded = True
        b.reason(eng.rules.rule("MAT-EXCL-001")["result"]["reason_code"], "MAT-EXCL-001",
                 "Rodzina zastępcza zawodowa nie ma prawa do zasiłku macierzyńskiego z tytułu przyjęcia dziecka - "
                 "także za okres urlopu rodzicielskiego (M16b2).", "art. 29 ust. 1 pkt 3")
        return
    rule_id = "MAT-ELIG-002" if ctx.field("event.type") == "ADOPTION" else "MAT-ELIG-003"
    base = eng.eval(rule_id)
    if rule_id == "MAT-ELIG-002" and ctx.field("event.court_adoption_application_date") is None:
        # ``exists`` na polu nie daje UNKNOWN (C10) - brak daty wniosku do sądu to brak danych, nie odmowa
        eng.need("event.court_adoption_application_date", rule_id)
        b.needs_data = True
        return
    if base.unknown:
        b.ask(base)
    elif base.value is False:
        b.use(rule_id)
        b.excluded = True
        b.reason("NO_MATERNITY_LIKE_RIGHT", rule_id,
                 "Brak prawa do zasiłku za okres urlopu na warunkach urlopu macierzyńskiego (wiek dziecka, wniosek do "
                 "sądu, rodzaj rodziny zastępczej albo brak ubezpieczenia w dniu przyjęcia) - zasiłek za okres urlopu "
                 "rodzicielskiego nie przysługuje.", "art. 29 ust. 1 pkt 2-3")
    elif base.fired:
        b.use(rule_id)


def _work_by_non_employee(b: _Benefit, start: date | None) -> None:
    """GAP-018: łączenie zasiłku z pracą u niepracownika - przepisy niezałączone → NEEDS_REVIEW (PAR-WORK-001)."""
    ctx = b.eng.ctx
    if start is None or not ctx.fact("f_has_work_in_parental"):
        return
    if ctx.fact("f_is_employee_on", date=start) is False:
        b.review = True
        b.reason("PARENTAL_WORK_NON_EMPLOYEE_UNCLEAR", "PAR-WORK-001",
                 "Łączenie zasiłku za okres urlopu rodzicielskiego z pracą u osoby niebędącej pracownikiem - zasady "
                 "nie są ustalone w materiałach (GAP-018), wymaga weryfikacji.", "art. 31 ust. 4a")


def _child_at_least_one_year_on_event(ctx) -> bool:
    birth, event = child_birth_date(ctx), to_date(ctx.field("event.date"))
    return birth is not None and event is not None and event >= add_years(birth, 1)


def _rate_reasons(b: _Benefit, amounts: dict[str, Any]) -> None:
    ctx = b.eng.ctx
    if "RATE-MAT-008" in b.applied:
        b.reason("FATHER_RATE_815_SHARED", "RATE-MAT-008",
                 f"Wniosek o łączny zasiłek złożony w terminie - część rodzicielskiego ojca (poza 9 tygodniami "
                 f"nieprzenoszalnymi) płatna {pct(ctx.param('MAT_RATE_COMBINED'))} podstawy (M11).", "art. 31 ust. 3")
    if "RATE-MAT-004" in b.applied:
        b.reason("RESERVED_9W_RATE_70", "RATE-MAT-004",
                 f"9 nieprzenoszalnych tygodni drugiego rodzica przy wniosku o łączny zasiłek - "
                 f"{pct(ctx.param('MAT_RATE_PARENTAL'))} podstawy.", "art. 31 ust. 3f")
    if "RATE-MAT-005" in b.applied:
        b.reason("NO_PARENTAL_IN_FIRST_YEAR_RATE_70", "RATE-MAT-005",
                 f"W pierwszym roku życia dziecka nie wykorzystano ani dnia urlopu rodzicielskiego - zasiłek "
                 f"{pct(ctx.param('MAT_RATE_PARENTAL'))} podstawy.", "art. 31 ust. 3g")
    if "RATE-MAT-003" in b.applied:
        b.reason("RATE_COMBINED_815", "RATE-MAT-003",
                 f"Wniosek o łączny zasiłek w {ctx.param('APP_COMBINED_DEADLINE_DAYS')} dni od porodu - "
                 f"{pct(ctx.param('MAT_RATE_COMBINED'))} podstawy także za okres urlopu rodzicielskiego.",
                 "art. 31 ust. 3; art. 30a ust. 1")
    if "RATE-MAT-002" in b.applied:
        b.reason("RATE_PARENTAL_70", "RATE-MAT-002",
                 f"Zasiłek za okres urlopu rodzicielskiego - {pct(ctx.param('MAT_RATE_PARENTAL'))} podstawy.",
                 "art. 31 ust. 2")


def _equalization(b: _Benefit, rule_id: str, parent: str | None) -> None:
    """RATE-MAT-006: jednorazowe wyrównanie macierzyńskiego do 100% (na wniosek matki, która złożyła wniosek 81,5%)."""
    if parent != "MOTHER":
        return
    eng, ctx = b.eng, b.eng.ctx
    if not eng.eval(rule_id).fired:
        return
    amount = ctx.fact(eng.rules.rule(rule_id)["result"]["compute"])
    if amount is None:
        return
    b.use(rule_id)
    b.reason("ONE_OFF_EQUALIZATION_TO_100", rule_id,
             f"W pierwszym roku życia dziecka nie wykorzystano urlopu rodzicielskiego - na wniosek przysługuje "
             f"jednorazowe wyrównanie zasiłku za okres urlopu macierzyńskiego do "
             f"{pct(ctx.param('MAT_RATE_FULL'))}: {dec_str(amount)} zł.", "art. 31 ust. 3g")


def _child_dies_during(ctx, own: list[dict[str, Any]]) -> bool:
    if not own:
        return False
    start, end = to_date(own[0]["from"]), max(to_date(s["to"]) for s in own)
    for child in ctx.field("children.items") or []:
        death = to_date(child.get("death_date"))
        if death is not None and start < death <= end:
            return True
    return False


# ----------------------------------------------------------------------------------------- ojcowski
def evaluate_paternity(eng: Engine) -> dict[str, Any]:
    ctx = eng.ctx
    ctx.state["benefit"] = "MATERNITY_BENEFIT"
    b = _Benefit(eng, PATERNITY)
    own = segments(ctx, PATERNITY, "FATHER")
    start = to_date(ctx.field("plan.paternity_start_date")) or (to_date(own[0]["from"]) if own else None)
    if start is not None:
        ctx.state["plan.paternity_start_date"] = start.isoformat()

    window = None
    dur = eng.eval("PAT-DUR-001")
    if dur.fired:
        window = ctx.fact(eng.rules.rule("PAT-DUR-001")["result"]["compute"])
        if window is not None:
            b.use("PAT-DUR-001")
    elig = eng.eval("PAT-ELIG-001")
    b.eligible = elig.value
    if elig.unknown:
        b.ask(elig)
    elif elig.decided:
        b.use("PAT-ELIG-001")
    if elig.value is False:
        if ctx.fact("f_paternity_within_deadline") is False and window is not None:
            b.reason("PATERNITY_OUTSIDE_LIMITS", "PAT-DUR-001",
                     f"Urlop ojcowski: najwyżej {window['max_days']} dni, w {ctx.param('PATERNITY_MAX_PARTS')} "
                     f"częściach nie krótszych niż {ctx.param('PATERNITY_MIN_PART_WEEKS')} tydzień, do "
                     f"{window['deadline'].isoformat()} - plan przekracza te granice.", "KP art. 182(3) § 1-2")
        else:
            b.reason("NOT_INSURED_ON_PATERNITY_START", "PAT-ELIG-001",
                     "Brak ubezpieczenia chorobowego w dniu rozpoczęcia urlopu ojcowskiego.", "art. 29 ust. 1 pkt 6")
    if b.eligible is True:
        b.debt()

    if own:
        amounts = b.amounts(own, FULL_RATE_RULES)
    elif start is not None and window is not None:
        proposed = {"parent": "FATHER", "leave_type": PATERNITY, "from": start.isoformat(),
                    "to": (start + timedelta(days=window["max_days"] - 1)).isoformat()}
        amounts = b.amounts([proposed], FULL_RATE_RULES)
    else:
        amounts = b.proposal(start, FULL_RATE_RULES)
    period = None
    if window is not None:
        period = {"max_days": window["max_days"]}
        if own or start is not None:
            spans = amounts.get("segments") or []
            period["from"] = spans[0]["from"] if spans else (start.isoformat() if start else None)
            if spans:
                period["to"] = spans[-1]["to"]
        period = {k: v for k, v in period.items() if v is not None}
    return b.build(period, amounts)


# ----------------------------------------------------------------------- przejęcie macierzyńskiego
def evaluate_transferred(eng: Engine) -> list[dict[str, Any]]:
    """MAT-SHARE-001..006: ojciec / członek rodziny przejmuje urlop macierzyński lub zastępuje hospitalizowaną matkę."""
    ctx = eng.ctx
    ctx.state["benefit"] = "MATERNITY_BENEFIT"
    parent = applicant_parent(eng)
    out = []
    own = segments(ctx, TRANSFERRED, parent)
    if own or ctx.field("plan.transfer_start_date") is not None:
        out.append(_transfer_benefit(eng, TRANSFERRED, TRANSFER_RULES, own))
    hosp = segments(ctx, HOSPITALIZATION, parent)
    if hosp or ctx.field("mother.hospitalized_unable_to_care") is True:
        out.append(_transfer_benefit(eng, HOSPITALIZATION, ["MAT-SHARE-003"], hosp))
    return out


def _transfer_benefit(eng: Engine, leave_type: str, rule_ids: list[str], own: list[dict[str, Any]]) -> dict[str, Any]:
    ctx = eng.ctx
    b = _Benefit(eng, leave_type)
    if ctx.field("plan.transfer_start_date") is None and own:
        ctx.state["plan.transfer_start_date"] = own[0]["from"]
    outcomes = [eng.eval(rule_id) for rule_id in rule_ids]
    main = outcomes[0]
    if any(o.fired for o in outcomes):
        b.eligible = True
        b.use(next(o.rule_id for o in outcomes if o.fired))
    elif main.unknown:
        b.ask(main)
    else:
        # podstawy szczególne (MAT-SHARE-002/004/005) bez danych o matce - nie dotyczą (D25); podstawowa FALSE
        b.eligible = False
        b.use(main.rule_id)
        if main.rule_id == "MAT-SHARE-001":
            b.reason("MOTHER_MIN_WEEKS_NOT_USED", "MAT-SHARE-001",
                     f"Przejęcie urlopu macierzyńskiego wymaga wykorzystania przez matkę co najmniej "
                     f"{ctx.param('MOTHER_MIN_WEEKS_BEFORE_TRANSFER')} tygodni po porodzie, rezygnacji z reszty "
                     f"urlopu i ubezpieczenia ojca w dniu przejęcia.", "KP art. 180 § 5; art. 29 ust. 4")
    if eng.eval("MAT-SHARE-006").kind == "BLOCKED":
        b.review = True
    if b.eligible is True:
        b.debt()
    amounts = b.amounts(own, FULL_RATE_RULES) if own else b.proposal(
        to_date(ctx.field("plan.transfer_start_date")), FULL_RATE_RULES)
    period = None
    if own:
        period = {"from": own[0]["from"], "to": max(to_date(s["to"]) for s in own).isoformat()}
    return b.build(period, amounts)


# ------------------------------------------------------------------------------- plan i powrót do pracy
def plan_errors(eng: Engine) -> list[dict[str, Any]]:
    """Reguły VALIDATION planu (07 §1 krok 9): FIRED → ``plan_errors`` (nie zmienia statusu prawa)."""
    ctx = eng.ctx
    if not ctx.field("plan.segments"):
        return []
    errors = []
    start = to_date(ctx.field("plan.parental_start_date"))
    for rule_id in PLAN_RULES:
        if not eng.eval(rule_id).fired:
            continue
        if rule_id == "PAR-WORK-001" and start is not None and ctx.fact("f_is_employee_on", date=start) is False:
            continue  # reguła dotyczy pracowników; niepracownik - GAP-018 (NEEDS_REVIEW w świadczeniu)
        code = eng.rules.rule(rule_id)["result"]["validation_error"]["code"]
        errors.append({"code": code, "rule_id": rule_id})
    return errors


def reserved_weeks_review(eng: Engine, benefits: list[dict[str, Any]], errors: list[dict[str, Any]]) -> None:
    """GAP-016: błąd 9 tygodni (PAR-SHARE-001), gdy matka nie ma tytułu do ubezpieczenia
    (``mother.sickness_insured`` = false) - rezerwacja nie jest pewna → rodzicielski NEEDS_REVIEW. Dla wnioskującej
    matki 04 nie zawiera danych drugiego rodzica - ten wariant nie jest oceniany (D25)."""
    if not any(e["rule_id"] == "PAR-SHARE-001" for e in errors):
        return
    if eng.ctx.field("mother.sickness_insured") is not False:
        return
    for benefit in benefits:
        if benefit.get("leave_type") == PARENTAL and benefit["status"] in ("ELIGIBLE", "NEEDS_DATA"):
            benefit["status"] = "NEEDS_REVIEW"
            benefit["reasons"].append(make_reason(
                eng, "RESERVED_9W_OTHER_PARENT_NOT_INSURED", "PAR-SHARE-001",
                "Matka nie podlega ubezpieczeniu chorobowemu - czy 9 tygodni rodzicielskiego jest dla niej "
                "zarezerwowane, nie jest ustalone (GAP-016); błąd planu wymaga weryfikacji.", "KP art. 182(1a) § 3"))


def return_to_work(eng: Engine) -> list[dict[str, Any]]:
    """Dzień po ostatnim segmencie urlopu każdego rodzica; ``part_time_fraction`` - wymiar pracy w ostatnim
    segmencie, gdy rodzic łączy urlop z pracą (KP art. 186(4), 182(1e))."""
    last: dict[str, dict[str, Any]] = {}
    for seg in segments(eng.ctx):
        parent = str(seg.get("parent"))
        if parent not in last or to_date(seg["to"]) >= to_date(last[parent]["to"]):
            last[parent] = seg
    out = []
    for parent, seg in last.items():
        fraction = seg.get("work_fraction")
        part_time = str(fraction) if fraction is not None and Decimal(str(fraction)) > 0 else None
        out.append({"parent": parent, "date": (to_date(seg["to"]) + timedelta(days=1)).isoformat(),
                    "part_time_fraction": part_time})
    return out
