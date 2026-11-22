"""Zasiłek macierzyński - kroki 07 §1 na regułach z 03_rules.yaml (BE1-02, BE2-01).

Kroki: 3–4 prawo (MAT-ELIG-001 + alternatywne podstawy z ``exceptions``: art. 30 MAT-ELIG-004/005/006, KP 177
MAT-CLS-002; wykluczenia EXCLUSION, w tym MAT-NEG-001; reguły BLOCKED grupy), 5 okres (MAT-DUR-001 z ``overrides``
MAT-DUR-00x, MAT-DUR-009), 7 stawka segmentu (RATE-MAT-001/003 przez ``overrides``, zależność APP-DL-001),
8 kwota (CALC-MAT-001), status wg DT-9. BE1-04: płatnik (GEN-CLS-*) i zadłużenie (GEN-EXCL-001/002) z ``general.py``.

BE2-01 - kolejne świadczenia z tej samej ścieżki:
- ``evaluate_equivalent_allowance``: zasiłek w wysokości macierzyńskiego do dnia przed porodem
  (MAT-ELIG-007, art. 30 ust. 3),
- ``evaluate_maternity_like``: urlop na warunkach macierzyńskiego - przysposobienie / rodzina zastępcza
  (MAT-ELIG-002/003, MAT-EXCL-001, MAT-DUR-007/008),
- ``evaluate_supplementary``: urlop uzupełniający przy wcześniaku / hospitalizacji
  (SUPP-ELIG-001/002/003, SUPP-CALC-001).
Ostrzeżenia (RISK-003, MAT-DUR-008) → ``warnings``. Przejęcie urlopu przez ojca i walidacje planu
(MAT-DUR-002, MAT-SHARE-007 → ``plan_errors``) - ``parental.py`` (BE2-02).
Reguły z faktami spoza rejestru są raportowane w ``not_evaluated_rules`` (jawne ograniczenia).
"""
from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta
from typing import Any

from app.core.dates import days_in, end_after_days, end_after_weeks, to_date
from app.core.money import dec_str, to_decimal
from app.engine.pipeline.engine import UNKNOWN, Engine, Outcome, aggregate_status
from app.engine.pipeline.general import debt_exclusion, payer_of_benefit, pct

# Reguły istotne dla macierzyńskiego, których przebieg nie uruchomił - raportowane jak w slice_v0;
# Engine sam dopisuje reguły z faktami spoza rejestru
NOT_RUN = ["BASE-EMP-001", "BASE-NEMP-001", "BASE-GEN-001"]
# Reguły BLOCKED/HUMAN_REVIEW, które mogą zmienić wynik macierzyńskiego po porodzie (DT-9 wiersz 3)
REVIEW_RULES = ["MAT-DUR-005"]
DURATION_RULES = ["MAT-DUR-001", "MAT-DUR-003", "MAT-DUR-004", "MAT-DUR-005"]
RATE_RULES = ["RATE-MAT-001", "RATE-MAT-003", "RATE-MAT-004", "RATE-MAT-005"]
SUPP_RULES = ["SUPP-ELIG-001", "SUPP-ELIG-002", "SUPP-ELIG-003"]

Reason = Callable[[str, str, str, str], None]


def _reason_sink(eng: Engine, reasons: list[dict[str, Any]]) -> Reason:
    def reason(code: str, rule_id: str, message: str, location: str) -> None:
        document = eng.rules.rule(rule_id).get("source_document") or "USTAWA"
        reasons.append({"code": code, "rule_id": rule_id, "message": message,
                        "legal_basis": [{"document": document, "location": location}]})
    return reason


def _arg(eng: Engine, value: Any) -> Any:
    """Argument z ``result.args`` reguły: ``{param: X}`` → parametr, literał bez zmian."""
    if isinstance(value, dict) and set(value) == {"param"}:
        return eng.ctx.param(value["param"])
    return value


def _rate_base_amount(eng: Engine, segment: dict[str, Any], days: int | None, reason: Reason,
                      applied: list[str], what: str = "urlopu macierzyńskiego",
                      combined_hint: bool = True) -> dict[str, Any]:
    """Kroki 6–8 dla jednego segmentu: stawka (APP-DL-001 + RATE-MAT-*), podstawa (art. 43), kwota (CALC-MAT-001,
    RATE-MAT-007). Zwraca {rate, daily, total, base, needs_data}."""
    ctx = eng.ctx
    ctx.segment = segment
    needs_data = False

    # Krok 7: stawka segmentu
    rate = None
    if eng.eval("APP-DL-001").fired:
        deadline = ctx.fact(eng.rules.rule("APP-DL-001")["result"]["compute"])
        applied.append("APP-DL-001")
        winner, _unknown = eng.pick(RATE_RULES)
        # RATE-MAT-003 UNKNOWN (brak wniosku i deklaracji 81,5%) → stawka podstawowa RATE-MAT-001 (D16)
        if winner is not None:
            rate = ctx.param(eng.rules.rule(winner.rule_id)["result"]["set"]["rate"]["param"])
            applied.append(winner.rule_id)
            if winner.rule_id == "RATE-MAT-003":
                reason("RATE_COMBINED_815", "RATE-MAT-003",
                       f"Wniosek o łączny zasiłek złożony w {ctx.param('APP_COMBINED_DEADLINE_DAYS')} dni od porodu - "
                       f"{pct(rate)} podstawy.",
                       "art. 31 ust. 3; art. 30a ust. 1")
            elif winner.rule_id == "RATE-MAT-001":
                # urlop uzupełniający: 81,5% go nie obejmuje (M15 c) - bez podpowiedzi o wniosku łącznym
                hint = (f" Wniosek o {pct(ctx.param('MAT_RATE_COMBINED'))} można złożyć do {deadline.isoformat()}."
                        if combined_hint else "")
                reason("RATE_FULL_100", "RATE-MAT-001", f"Zasiłek za okres {what} - {pct(rate)} podstawy.{hint}",
                       "art. 31 ust. 1; art. 30a ust. 1")
    ctx.state["rate"] = rate

    # Krok 6: podstawa - art. 43 (BASE-GEN-001): ta sama podstawa, gdy przerwa nie obejmuje pełnego miesiąca
    # kalendarzowego (M05); ręczna podstawa ma pierwszeństwo, bez historii zasiłków reguła nie dotyczy
    manual = ctx.field("income_history.manual_base_override") is not None
    base_source = "MANUAL" if manual else None
    if manual and _base_limits(eng, applied, reason):
        needs_data = True
    if not manual and ctx.field("benefit_history.previous_benefit_end_date") is not None:
        reuse = eng.eval("BASE-GEN-001")
        if reuse.unknown:
            eng.need_from(reuse)
            needs_data = True
        elif reuse.fired:
            if "BASE-GEN-001" not in applied:
                applied.append("BASE-GEN-001")
            base_source = "REUSED_PREVIOUS"
            reason("BASE_REUSED_NO_FULL_MONTH_GAP", "BASE-GEN-001",
                   "Między poprzednim zasiłkiem a zasiłkiem macierzyńskim nie było przerwy obejmującej pełny miesiąc "
                   "kalendarzowy - podstawa wymiaru jest taka sama jak poprzedniego zasiłku.", "art. 43")

    # Krok 8: kwota
    daily = total = None
    calc = eng.eval("CALC-MAT-001")
    if calc.unknown:
        eng.need_from(calc)
        needs_data = True
    elif calc.fired and rate is not None and days is not None:
        amount = ctx.fact(eng.rules.rule("CALC-MAT-001")["result"]["compute"])
        if amount is not None:
            daily, total = amount["daily"], amount["total"]
            applied.append("CALC-MAT-001")
            # RATE-MAT-007 (M10): podwyższenie do kwoty świadczenia rodzicielskiego (art. 31 ust. 3a)
            floor = eng.eval("RATE-MAT-007")
            raised = ctx.fact(eng.rules.rule("RATE-MAT-007")["result"]["compute"]) if floor.fired else None
            if raised is not None:
                monthly = ctx.fact("f_monthly_maternity_amount")
                daily, total = raised["daily"], raised["total"]
                applied.append("RATE-MAT-007")
                reason("RAISED_TO_PARENTAL_BENEFIT_FLOOR", "RATE-MAT-007",
                       f"Miesięczna kwota zasiłku ({dec_str(monthly)} zł) jest niższa niż kwota świadczenia "
                       f"rodzicielskiego - zasiłek podwyższony do {dec_str(raised['monthly'])} zł miesięcznie "
                       f"(za niepełny miesiąc proporcjonalnie do liczby dni miesiąca).",
                       "art. 31 ust. 3a-3c")

    # obiekt base (kontrakt Benefit.base) - tylko gdy podstawa jest znana i jej źródło rozstrzygnięte
    base_amount = ctx.fact("f_benefit_base") if base_source else None
    base = None
    if base_amount is not None:
        base = {"amount_exact": dec_str(base_amount), "source": base_source}
        if base_source == "REUSED_PREVIOUS":
            base["method_rule_id"] = "BASE-GEN-001"
    return {"rate": rate, "daily": daily, "total": total, "base": base, "needs_data": needs_data}


def _base_limits(eng: Engine, applied: list[str], reason: Reason) -> bool:
    """BE2-12: granice nowej podstawy - BASE-EMP-008 (minimum, pełny etat) i BASE-NEMP-005 (limit dobrowolnego).

    Kwotę ustala już f_benefit_base; tu ślad reguł i komunikat, gdy granica zmieniła podstawę. Wymiar etatu jest
    potrzebny (03: NEEDS_DATA) tylko wtedy, gdy rozstrzyga kwotę: tytuł pracowniczy i podstawa poniżej minimum.
    Gdy podstawa jest ≥ minimum, BASE-EMP-008 nie zmienia wyniku - bez dopytania.
    """
    ctx = eng.ctx
    raw = to_decimal(ctx.field("income_history.manual_base_override"))
    checks = [("BASE-NEMP-005", "BASE_CAPPED_VOLUNTARY",
               "limit podstawy składek przy dobrowolnym ubezpieczeniu (wytyczne ZUS)")]
    minimum = ctx.fact("f_minimum_base")
    below = raw is not None and minimum is not None and raw < minimum
    if ctx.field("employment.working_time_fraction") is not None or (
            below and ctx.fact("f_is_employee_title_for_base") is True):
        checks.insert(0, ("BASE-EMP-008", "BASE_RAISED_TO_MINIMUM", "art. 45 ust. 1"))
    missing = False
    for rule_id, code, basis in checks:
        outcome = eng.eval(rule_id)
        if outcome.unknown:
            if outcome.missing:  # brak pól wejścia (np. wymiar etatu) → dopytanie; nieznany tytuł - bez granicy
                eng.need_from(outcome)
                missing = True
            continue
        if not outcome.fired:
            continue
        adjusted = ctx.fact(eng.rules.rule(rule_id)["result"]["compute"])
        if adjusted is None or raw is None or adjusted == raw:
            continue
        if rule_id not in applied:
            applied.append(rule_id)
        if rule_id == "BASE-EMP-008":
            message = (f"Podstawa {dec_str(raw)} zł jest niższa niż minimalna przy pełnym etacie - przyjęto "
                       f"{dec_str(adjusted)} zł (płaca minimalna po odliczeniu 13,71%).")
        else:
            message = (f"Podstawa {dec_str(raw)} zł przekracza limit przy dobrowolnym ubezpieczeniu chorobowym "
                       f"- przyjęto {dec_str(adjusted)} zł.")
        reason(code, rule_id, message, basis)
    return missing


def _benefit(benefit_type: str, leave_type: str, status: str, money: dict[str, Any], period: dict[str, Any] | None,
             days: int | None, payer: str | None, reasons: list[dict[str, Any]], applied: list[str],
             suspended: bool | None = None, entitlement_basis: str | None = None) -> dict[str, Any]:
    rate, daily, total = money.get("rate"), money.get("daily"), money.get("total")
    benefit = {
        "benefit_type": benefit_type, "leave_type": leave_type, "status": status,
        "rate": dec_str(rate) if rate is not None else None, "period": period, "days": days,
        "daily_amount_exact": dec_str(daily) if daily is not None else None,
        "total_amount_exact": dec_str(total) if total is not None else None,
        "payer_of_benefit": payer, "reasons": reasons, "applied_rules": applied, "base": money.get("base"),
    }
    if entitlement_basis is not None:
        benefit["entitlement_basis"] = entitlement_basis
    if suspended is not None:
        benefit["suspended_until_debt_repaid"] = suspended
    return benefit


def _report_not_run(eng: Engine) -> None:
    for rule_id in NOT_RUN:
        if rule_id not in eng.not_evaluated and rule_id not in eng.trace:
            eng.not_evaluated.append(rule_id)


def _payer(eng: Engine, applied: list[str], art30_payer: str | None) -> str | None:
    """Płatnik (GEN-CLS-*) - nie zmienia statusu prawa (T-GEN-005). Art. 30 (zasiłek po ustaniu) → ZUS."""
    if art30_payer is not None:
        return art30_payer
    payer, payer_rule = payer_of_benefit(eng)
    if payer_rule is not None:
        applied.append(payer_rule)
    return payer


# ================================================================== matka - urlop macierzyński po porodzie
def evaluate_maternity(eng: Engine) -> dict[str, Any]:
    ctx = eng.ctx
    ctx.state["benefit"] = "MATERNITY_BENEFIT"
    applied: list[str] = []
    reasons: list[dict[str, Any]] = []
    reason = _reason_sink(eng, reasons)
    needs_data = review = excluded = False
    art30_payer: str | None = None
    basis: str | None = None

    # Kroki 3–4: prawo
    elig = eng.eval("MAT-ELIG-001")
    eligible = elig.value
    if elig.unknown:
        eng.need_from(elig)
        needs_data = True
    else:
        applied.append("MAT-ELIG-001")
    if elig.fired:
        basis = eng.rules.rule("MAT-ELIG-001")["result"]["set"].get("entitlement_basis")
    # alternatywne podstawy (exceptions MAT-ELIG-001: art. 30 MAT-ELIG-004/005/006). Przy ubezpieczeniu w dniu porodu
    # liczą się tylko dla płatnika: umowa przedłużona do porodu (art. 30 ust. 4) → zasiłek wypłaca ZUS (T-MAT-008).
    alternatives = eng.alternatives("MAT-ELIG-001")
    for alt in alternatives:
        if alt.fired:
            applied.append(alt.rule_id)
            result_set = eng.rules.rule(alt.rule_id)["result"]["set"]
            art30_payer = art30_payer or result_set.get("payer_of_benefit")
            if not elig.fired:
                basis = basis or result_set.get("entitlement_basis")
    if elig.value is not True:
        # Przedłużenie umowy terminowej do dnia porodu (MAT-CLS-002, M13). Braki danych art. 30 nie trafiają do
        # missing_data, dopóki rozstrzyga MAT-ELIG-001; wyjątek: umowa terminowa - pytamy o datę początku ciąży
        # i koniec umowy (MAT-CLS-002).
        kp177 = eng.eval("MAT-CLS-002")
        fixed_term = ctx.field("employment.contract_type") in ("FIXED_TERM", "PROBATION_OVER_1_MONTH")
        if kp177.unknown and kp177.missing and fixed_term:
            eng.need_from(kp177)
            needs_data = True
        if any(a.fired for a in alternatives):
            eligible = True
        elif kp177.fired:
            eligible = True
            applied.append("MAT-CLS-002")
            reason("KP177_EXTENDED_UNTIL_BIRTH", "MAT-CLS-002",
                   "Umowa terminowa rozwiązałaby się po upływie trzeciego miesiąca ciąży - ulega przedłużeniu do "
                   "dnia porodu (data początku ciąży z zaświadczenia lekarskiego). Przedłużenie potwierdza "
                   "dokument od pracodawcy (np. aneks lub świadectwo pracy).", "KP art. 177 § 3")
        elif elig.value is False:
            # MAT-NEG-001: brak ubezpieczenia w dniu porodu i brak podstaw z art. 30 → odmowa (art. 29 ust. 1)
            neg = eng.eval("MAT-NEG-001")
            if neg.fired:
                excluded = True
                applied.append("MAT-NEG-001")
                reason(eng.rules.rule("MAT-NEG-001")["result"]["reason_code"], "MAT-NEG-001",
                       "W dniu porodu nie było ubezpieczenia chorobowego ani urlopu wychowawczego, a ubezpieczenie "
                       "nie ustało z przyczyn z art. 30 (likwidacja lub upadłość pracodawcy, rozwiązanie umowy z "
                       "naruszeniem prawa, umowa przedłużona do porodu) - zasiłek macierzyński nie przysługuje.",
                       "art. 29 ust. 1; art. 30")
            elif neg.unknown:
                eng.need_from(neg)
                needs_data = True
            possible = [a for a in alternatives + [kp177] if a.kind in ("NOT_EVALUATED", "BLOCKED")]
            if not neg.decided and possible:
                # DT-9 w. 3: podstawa, której silnik nie rozstrzyga, może zmienić wynik → NEEDS_REVIEW
                review = True
                reason("NOT_INSURED_ON_BIRTH_ART30_NOT_EVALUATED", "MAT-ELIG-001",
                       "Brak ubezpieczenia chorobowego w dniu porodu - podstawy z art. 30 (zasiłek po ustaniu "
                       "ubezpieczenia) wymagają weryfikacji.", "art. 29 ust. 1 pkt 1; art. 30")
    if art30_payer is not None and not elig.fired:
        reason("ART30_AFTER_TITLE_END", next(a.rule_id for a in alternatives if a.fired),
               "Ubezpieczenie ustało w czasie ciąży z przyczyny z art. 30 (albo umowa przedłużona do dnia porodu) - "
               "zasiłek macierzyński przysługuje po ustaniu ubezpieczenia i wypłaca go ZUS.",
               "art. 30 ust. 1, 4; art. 61 ust. 1 pkt 2")
    suspended = None
    if eligible is True:
        for exc in eng.exclusions("MAT-ELIG-001"):
            if exc.rule_id == "GEN-EXCL-001":
                continue  # zadłużenie (GEN-EXCL-001/002) - general.debt_exclusion
            if exc.decided or exc.unknown:
                applied.append(exc.rule_id)
            if exc.unknown:
                eng.need_from(exc)
                needs_data = True
            elif exc.fired:
                excluded = True
        debt = debt_exclusion(eng)
        applied += debt.applied
        reasons += debt.reasons
        excluded, needs_data = excluded or debt.excluded, needs_data or debt.needs_data
        suspended = debt.suspended_until_debt_repaid
    for rule_id in REVIEW_RULES:
        if eng.eval(rule_id).kind == "BLOCKED":
            review = True
    if "MAT-DUR-002" not in eng.trace:
        eng.eval("MAT-DUR-002")  # ślad (parytet ze slice_v0); błąd planu zgłasza parental.plan_errors
    if "MAT-NEG-001" not in eng.trace:
        eng.eval("MAT-NEG-001")  # ślad: przy ubezpieczeniu w dniu porodu warunek FALSE (parytet ze slice_v0)
    # RISK-003 (informacyjnie): tytuł kończy się przed terminem porodu i brak podstawy z art. 30
    eng.check("RISK-003")

    # Krok 5: okres
    birth = to_date(ctx.field("event.date"))
    if birth is None:
        eng.need("event.date", "MAT-DUR-009")
        needs_data = True
    period = days = None
    duration, _ = eng.pick(DURATION_RULES)
    dur = eng.eval("MAT-DUR-001")
    if dur.unknown:
        eng.need_from(dur)
        needs_data = True
    if duration is not None and birth is not None and eng.eval("MAT-DUR-009").fired:
        week_days = int(ctx.param(eng.rules.rule("MAT-DUR-009")["result"]["set"]["week_days"]["param"]))
        computed = ctx.fact(eng.rules.rule(duration.rule_id)["result"]["compute"])
        if duration.rule_id == "MAT-DUR-001" and computed is not None:
            days = computed * week_days
            period = {"from": birth.isoformat(), "to": end_after_days(birth, days).isoformat(), "max_weeks": computed}
        elif duration.rule_id in ("MAT-DUR-003", "MAT-DUR-004") and computed is not None:
            # martwe urodzenie / zgon dziecka: koniec okresu z faktu (KP art. 180(1)); max_weeks = pełne tygodnie
            days = days_in(birth, computed)
            period = {"from": birth.isoformat(), "to": computed.isoformat(), "max_weeks": days // week_days}
            reason("CHILD_DEATH_SHORTENED" if duration.rule_id == "MAT-DUR-004" else "STILLBIRTH_8_WEEKS",
                   duration.rule_id,
                   f"Martwe urodzenie albo zgon dziecka - urlop i zasiłek macierzyński do {computed.isoformat()} "
                   f"(nie krócej niż {ctx.param('STILLBIRTH_LEAVE_WEEKS')} tyg. po porodzie przy martwym urodzeniu "
                   f"lub zgonie przed ukończeniem 8 tyg. życia i nie krócej niż {ctx.param('CHILD_DEATH_MIN_DAYS')} "
                   f"dni od zgonu).", "KP art. 180(1) § 1-2")
        if period is not None:
            applied += [duration.rule_id, "MAT-DUR-009"]

    # Kroki 6–8 (jeden segment: urlop macierzyński matki od dnia porodu)
    segment = {"leave_type": "MATERNITY_LEAVE", "parent": "MOTHER",
               "from": period["from"] if period else None, "to": period["to"] if period else None}
    money = _rate_base_amount(eng, segment, days, reason, applied)
    needs_data = needs_data or money["needs_data"]
    _report_not_run(eng)
    payer = _payer(eng, applied, art30_payer)

    status = aggregate_status(excluded=excluded, review=review, needs_data=needs_data, eligible=eligible)
    return _benefit("MATERNITY_BENEFIT", "MATERNITY_LEAVE", status, money, period, days, payer, reasons, applied,
                    suspended, basis)


# ================================================================== art. 30 ust. 3 - zasiłek do dnia przed porodem
def evaluate_equivalent_allowance(eng: Engine) -> dict[str, Any] | None:
    """MAT-ELIG-007: ustanie umowy o pracę w ciąży (likwidacja/upadłość/śmierć pracodawcy, rozwiązanie z naruszeniem
    prawa stwierdzone przez sąd, M16 a) i brak innego zatrudnienia → zasiłek w wysokości zasiłku macierzyńskiego
    (100%) od dnia po ustaniu tytułu do dnia przed porodem (M15 e). USTAWA art. 30 ust. 3.

    Zwraca None, gdy reguła nie dotyczy; brak tylko ``other_employment_provided`` → świadczenie NEEDS_DATA.
    """
    ctx = eng.ctx
    rule = eng.eval("MAT-ELIG-007")
    # UNKNOWN → świadczenie NEEDS_DATA tylko, gdy przesłanki ustania tytułu są znane, a brakuje jedynie informacji
    # o zapewnieniu innego zatrudnienia (inaczej o art. 30 ust. 3 rozstrzyga najpierw ścieżka macierzyńskiego)
    if not (rule.fired or (rule.unknown and set(rule.missing) == {"employment.other_employment_provided"})):
        return None
    applied: list[str] = []
    reasons: list[dict[str, Any]] = []
    reason = _reason_sink(eng, reasons)
    needs_data = excluded = False
    suspended = None
    if rule.unknown:
        eng.need_from(rule)
        return _benefit("MATERNITY_EQUIVALENT_ALLOWANCE", None, "NEEDS_DATA", {}, None, None, None, reasons, applied)
    applied.append("MAT-ELIG-007")
    result_set = eng.rules.rule("MAT-ELIG-007")["result"]["set"]
    debt = debt_exclusion(eng)
    applied += debt.applied
    reasons += debt.reasons
    excluded, needs_data = debt.excluded, debt.needs_data
    suspended = debt.suspended_until_debt_repaid

    titles = [t for t in ctx.field("insurance.titles") or [] if t.get("to") is not None]
    title_end = max((to_date(t["to"]) for t in titles), default=None)
    birth = to_date(ctx.field("event.date"))
    period = days = None
    money: dict[str, Any] = {"rate": ctx.param(result_set["rate"]["param"])}
    if title_end is not None and birth is not None and title_end + timedelta(days=1) > birth - timedelta(days=1):
        return None  # tytuł ustał dzień przed porodem - brak okresu do wypłaty (od porodu: art. 30 ust. 1)
    if title_end is not None and birth is not None:
        start, end = title_end + timedelta(days=1), birth - timedelta(days=1)
        days = days_in(start, end)
        period = {"from": start.isoformat(), "to": end.isoformat()}
        reason("ALLOWANCE_UNTIL_BIRTH", "MAT-ELIG-007",
               f"Umowa o pracę ustała w czasie ciąży z przyczyny niezależnej od pracownicy, a pracodawca nie zapewnił "
               f"innego zatrudnienia - do dnia poprzedzającego poród ({end.isoformat()}) przysługuje zasiłek w "
               f"wysokości zasiłku macierzyńskiego ({pct(money['rate'])} podstawy), wypłaca ZUS.", "art. 30 ust. 3")
        ctx.segment = {"leave_type": None, "parent": "MOTHER", "from": period["from"], "to": period["to"]}
        previous_rate = ctx.state.get("rate")
        ctx.state["rate"] = money["rate"]
        amount = ctx.fact("f_benefit_amount")
        ctx.state["rate"] = previous_rate
        if amount is not None:
            money.update(daily=amount["daily"], total=amount["total"])
        else:
            needs_data = True
    status = aggregate_status(excluded=excluded, needs_data=needs_data, eligible=True)
    return _benefit("MATERNITY_EQUIVALENT_ALLOWANCE", None, status, money, period, days,
                    result_set.get("payer_of_benefit"), reasons, applied, suspended)


# ================================================================== przysposobienie / rodzina zastępcza
_COURT_DATE = "event.court_adoption_application_date"


def _adoption_without_court_date(eng: Engine, rule_id: str) -> Outcome:
    """BE1-08: ``exists`` na pustym polu daje FALSE (C10), ale brak daty wniosku do sądu to brak danych, nie odmowa.

    Pozostałe warunki MAT-ELIG-002 oceniamy tak, jakby wniosek złożono: FALSE (np. dziecko po 14. urodzinach, brak
    ubezpieczenia) → odmowa z tych przyczyn; TRUE/UNKNOWN → UNKNOWN z brakiem ``event.court_adoption_application_date``.
    """
    state = eng.ctx.state
    state[_COURT_DATE] = "ASSUMED_FILED"  # pola stanu mają pierwszeństwo przed wejściem (Context.field)
    try:
        other = eng.eval(rule_id)
    finally:
        del state[_COURT_DATE]
    if other.value is False:
        return other
    eng.trace[rule_id] = UNKNOWN
    return Outcome(rule_id, UNKNOWN, None, [*other.missing, _COURT_DATE])


def evaluate_maternity_like(eng: Engine) -> dict[str, Any]:
    """Urlop na warunkach urlopu macierzyńskiego (KP art. 183) i zasiłek macierzyński: MAT-ELIG-002 (ADOPTION, dziecko
    do 14 lat), MAT-ELIG-003 (FOSTER niezawodowa, do 7 / 10 lat), MAT-EXCL-001 (rodzina zastępcza zawodowa),
    okres MAT-DUR-007 przycięty do dnia przed urodzinami granicznymi (MAT-DUR-008, M14 a).
    USTAWA art. 29 ust. 1 pkt 2-3.
    """
    ctx = eng.ctx
    ctx.state["benefit"] = "MATERNITY_BENEFIT"
    applied: list[str] = []
    reasons: list[dict[str, Any]] = []
    reason = _reason_sink(eng, reasons)
    needs_data = excluded = False
    suspended = None
    event_type = ctx.field("event.type")
    rule_id = "MAT-ELIG-002" if event_type == "ADOPTION" else "MAT-ELIG-003"

    if event_type == "FOSTER":
        professional = eng.eval("MAT-EXCL-001")
        if professional.decided:
            applied.append("MAT-EXCL-001")
        if professional.fired:
            excluded = True
            reason(eng.rules.rule("MAT-EXCL-001")["result"]["reason_code"], "MAT-EXCL-001",
                   "Zawodowa rodzina zastępcza nie ma prawa do zasiłku macierzyńskiego za okres urlopu na warunkach "
                   "urlopu macierzyńskiego.", "art. 29 ust. 1 pkt 3")
    elig = eng.eval(rule_id)
    if rule_id == "MAT-ELIG-002" and elig.value is False and ctx.field(_COURT_DATE) is None:
        elig = _adoption_without_court_date(eng, rule_id)
    eligible = elig.value
    if elig.unknown:
        eng.need_from(elig)
        needs_data = True
    elif not excluded:
        applied.append(rule_id)
    if elig.value is False and not excluded:
        limit = ctx.param("ADOPTION_CHILD_AGE_MAX" if event_type == "ADOPTION" else "FOSTER_CHILD_AGE_MAX")
        reason("CHILD_AGE_OR_INSURANCE_NOT_MET", rule_id,
               f"Zasiłek za okres urlopu na warunkach macierzyńskiego przysługuje, gdy w dniu przyjęcia dziecko nie "
               f"ukończyło {limit} lat (rodzina zastępcza: {ctx.param('FOSTER_CHILD_AGE_MAX')} lat, "
               f"{ctx.param('FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED')} przy odroczonym obowiązku szkolnym), a "
               f"wnioskodawca jest ubezpieczony - warunki nie są spełnione.",
               "art. 29 ust. 1 pkt 2-3")
    if eligible is True and not excluded:
        debt = debt_exclusion(eng)
        applied += debt.applied
        reasons += debt.reasons
        excluded, needs_data = debt.excluded, needs_data or debt.needs_data
        suspended = debt.suspended_until_debt_repaid

    # Krok 5: okres (MAT-DUR-007), ostrzeżenie o skróceniu przez limit wieku (MAT-DUR-008)
    period = days = None
    duration = eng.eval("MAT-DUR-007")
    if duration.fired and not excluded and eligible is not False:
        local = ctx.child()  # braki faktu (także z cache) trafiają do listy lokalnej
        computed = local.fact(eng.rules.rule("MAT-DUR-007")["result"]["compute"])
        if computed is None:
            for field_path in local.missing:
                eng.need(field_path, "MAT-DUR-007")
                needs_data = True
        else:
            days = computed["days"]
            period = {"from": computed["from"].isoformat(), "to": computed["to"].isoformat(),
                      "max_weeks": days // int(ctx.param("WEEK_AS_DAYS"))}
            applied.append("MAT-DUR-007")
            if eng.check("MAT-DUR-008"):
                applied.append("MAT-DUR-008")
                reason("AGE_LIMIT_SHORTENS_LEAVE", "MAT-DUR-008",
                       f"Urlop kończy się {computed['to'].isoformat()} - dzień przed osiągnięciem przez dziecko "
                       f"granicznego wieku; niewykorzystana część urlopu przepada (bez podwyższenia do "
                       f"{ctx.param('MATERNITY_LIKE_GUARANTEED_WEEKS')} tyg.).", "KP art. 183 § 1, § 3")

    segment = {"leave_type": "MATERNITY_LIKE_LEAVE", "parent": ctx.field("person.role"),
               "from": period["from"] if period else None, "to": period["to"] if period else None}
    money = _rate_base_amount(eng, segment, days, reason, applied, "urlopu na warunkach urlopu macierzyńskiego") \
        if period else {"needs_data": False}
    needs_data = needs_data or money["needs_data"]
    _report_not_run(eng)
    payer = _payer(eng, applied, None)
    status = aggregate_status(excluded=excluded, needs_data=needs_data, eligible=eligible)
    basis = eng.rules.rule(rule_id)["result"]["set"].get("entitlement_basis") if elig.fired else None
    return _benefit("MATERNITY_BENEFIT", "MATERNITY_LIKE_LEAVE", status, money, period, days, payer, reasons, applied,
                    suspended, basis)


# ================================================================== urlop uzupełniający (wcześniak, hospitalizacja)
def evaluate_supplementary(eng: Engine, maternity: dict[str, Any]) -> dict[str, Any] | None:
    """SUPP-ELIG-001 (< 28 tydz. lub masa ≤ 1000 g, do 15 tyg.), -002 (28–36 tydz., > 1000 g, do 8 tyg.), -003
    (≥ 37 tydz. i pobyt ≥ 2 dni rozpoczęty w dniach 5–28, do 8 tyg.); tygodnie = ceil(dni pobytu w oknie / 7)
    (SUPP-CALC-001). Urlop następuje bezpośrednio po urlopie macierzyńskim. KP art. 180(2).

    Bez ``children.hospital_stays`` (null) pytamy o pobyty tylko, gdy tydzień ciąży lub masa kwalifikują
    (SUPP-ELIG-001/002 FIRED); pusta lista = brak pobytów → brak urlopu. SUPP-COND-001 (jeden uprawniony rodzic)
    - fakty spoza rejestru → ``not_evaluated_rules``; status jak macierzyńskiego (DERIVED, D26).
    """
    ctx = eng.ctx
    stays = ctx.field("children.hospital_stays")
    if stays is not None and not stays:
        return None
    applied: list[str] = []
    reasons: list[dict[str, Any]] = []
    reason = _reason_sink(eng, reasons)
    if stays is None:
        qualifying = [rule_id for rule_id in SUPP_RULES[:2] if eng.eval(rule_id).fired]
        if not qualifying:
            return None
        eng.eval("SUPP-COND-001")  # fakty spoza rejestru → not_evaluated_rules
        eng.need("children.hospital_stays", *qualifying)
        return _benefit("MATERNITY_BENEFIT", "SUPPLEMENTARY_MATERNITY_LEAVE", "NEEDS_DATA", {}, None, None, None,
                        reasons, qualifying)
    eng.eval("SUPP-COND-001")  # fakty spoza rejestru → Engine dopisuje regułę do not_evaluated_rules
    outcomes = [eng.eval(rule_id) for rule_id in SUPP_RULES]
    fired = next((o for o in outcomes if o.fired), None)
    if fired is None:
        unknown = [o for o in outcomes if o.unknown and o.missing]
        if not unknown:
            return None
        for outcome in unknown:
            eng.need_from(outcome)
        return _benefit("MATERNITY_BENEFIT", "SUPPLEMENTARY_MATERNITY_LEAVE", "NEEDS_DATA", {}, None, None, None,
                        reasons, applied)
    result = eng.rules.rule(fired.rule_id)["result"]
    args = {name: _arg(eng, value) for name, value in (result.get("args") or {}).items()}
    weeks = ctx.fact(result["compute"], **args)
    applied.append(fired.rule_id)
    if eng.eval("SUPP-CALC-001").fired:
        applied.append("SUPP-CALC-001")
    if weeks is None:  # np. trwający pobyt bez daty końca - dopytać, nie pomijać urlopu
        eng.need("children.hospital_stays", fired.rule_id)
        return _benefit("MATERNITY_BENEFIT", "SUPPLEMENTARY_MATERNITY_LEAVE", "NEEDS_DATA", {}, None, None, None,
                        reasons, applied)
    if weeks == 0:
        return None
    maternity_end = to_date((maternity.get("period") or {}).get("to"))
    period = days = None
    if maternity_end is not None:
        start = maternity_end + timedelta(days=1)
        end = end_after_weeks(start, weeks)
        days = days_in(start, end)
        period = {"from": start.isoformat(), "to": end.isoformat(), "max_weeks": weeks}
    else:
        period = {"max_weeks": weeks}
    reason("SUPPLEMENTARY_WEEKS", fired.rule_id,
           f"Dziecko urodzone przedwcześnie lub hospitalizowane po porodzie - urlop uzupełniający {weeks} tyg. "
           f"(tydzień za każdy rozpoczęty tydzień pobytu w szpitalu w oknie {args.get('cap_week')} tyg. po porodzie), "
           f"bezpośrednio po urlopie macierzyńskim.", "KP art. 180(2) § 1-3")
    money: dict[str, Any] = {"needs_data": False}
    if days is not None:
        money = _rate_base_amount(eng, {"leave_type": "SUPPLEMENTARY_MATERNITY_LEAVE", "parent": "MOTHER",
                                        "from": period["from"], "to": period["to"]}, days, reason, applied,
                                  "urlopu uzupełniającego", combined_hint=False)
    # prawo do zasiłku za urlop uzupełniający idzie za prawem do zasiłku macierzyńskiego (SUPP-COND-001)
    status = maternity["status"]
    if status == "ELIGIBLE" and money["needs_data"]:
        status = "NEEDS_DATA"
    return _benefit("MATERNITY_BENEFIT", "SUPPLEMENTARY_MATERNITY_LEAVE", status, money, period, days,
                    maternity.get("payer_of_benefit"), reasons, applied, maternity.get("suspended_until_debt_repaid"))
