"""Zasiłek macierzyński matki po porodzie — kroki 07 §1 na regułach z 03_rules.yaml (BE1-02).

Kroki: 3–4 prawo (MAT-ELIG-001 + alternatywne podstawy z ``exceptions``, wykluczenia EXCLUSION, reguły
BLOCKED grupy), 5 okres (MAT-DUR-001 z ``overrides`` MAT-DUR-00x, MAT-DUR-009), 7 stawka segmentu
(RATE-MAT-001/003 przez ``overrides``, zależność APP-DL-001), 8 kwota (CALC-MAT-001), status wg DT-9.
Reguły z faktami spoza rejestru są raportowane w ``not_evaluated_rules`` (jawne ograniczenia).
"""
from __future__ import annotations

from typing import Any

from app.core.dates import days_in, end_after_days, to_date
from app.core.money import dec_str, mul
from app.engine.pipeline.engine import Engine, aggregate_status

# Reguły istotne dla macierzyńskiego, których przebieg nie uruchomił (np. alternatywne podstawy przy ubezpieczeniu)
# — raportowane jak w slice_v0; Engine sam dopisuje reguły z faktami spoza rejestru
NOT_RUN = ["MAT-ELIG-004", "MAT-ELIG-005", "MAT-ELIG-006", "MAT-NEG-001", "MAT-DUR-002", "BASE-EMP-001",
           "BASE-NEMP-001", "BASE-GEN-001", "GEN-CLS-001",
           "GEN-CLS-002", "GEN-EXCL-002"]
# Reguły BLOCKED/HUMAN_REVIEW, które mogą zmienić wynik macierzyńskiego po porodzie (DT-9 wiersz 3)
REVIEW_RULES = ["MAT-DUR-005"]
DURATION_RULES = ["MAT-DUR-001", "MAT-DUR-003", "MAT-DUR-004", "MAT-DUR-005"]
RATE_RULES = ["RATE-MAT-001", "RATE-MAT-003", "RATE-MAT-004", "RATE-MAT-005"]


def evaluate_maternity(eng: Engine) -> dict[str, Any]:
    ctx = eng.ctx
    ctx.state["benefit"] = "MATERNITY_BENEFIT"
    applied: list[str] = []
    reasons: list[dict[str, Any]] = []
    needs_data = review = excluded = False

    def reason(code: str, rule_id: str, message: str, location: str) -> None:
        document = eng.rules.rule(rule_id).get("source_document") or "USTAWA"
        reasons.append({"code": code, "rule_id": rule_id, "message": message,
                        "legal_basis": [{"document": document, "location": location}]})

    # Kroki 3–4: prawo
    elig = eng.eval("MAT-ELIG-001")
    eligible = elig.value
    if elig.unknown:
        eng.need_from(elig)
        needs_data = True
    else:
        applied.append("MAT-ELIG-001")
    if elig.value is not True:
        # alternatywne podstawy (exceptions MAT-ELIG-001: art. 30, KP 177) i przedłużenie umowy (MAT-CLS-002, BLOCKED).
        # Ich braki danych nie trafiają do missing_data — najpierw rozstrzyga MAT-ELIG-001 (art. 29 ust. 1 pkt 1).
        alternatives = eng.alternatives("MAT-ELIG-001") + [eng.eval("MAT-CLS-002")]
        possible = [a for a in alternatives if a.kind in ("NOT_EVALUATED", "BLOCKED")
                    or (a.unknown and elig.value is False)]
        if any(a.fired for a in alternatives):
            eligible = True
        elif possible:
            # DT-9 w. 3: podstawa, której silnik nie rozstrzyga, może zmienić wynik → NEEDS_REVIEW (przed NEEDS_DATA)
            review = True
            reason("NOT_INSURED_ON_BIRTH_ART30_NOT_EVALUATED", "MAT-ELIG-001",
                   "Brak ubezpieczenia chorobowego w dniu porodu. Ta wersja nie ocenia jeszcze przypadków z art. 30 "
                   "(zasiłek po ustaniu ubezpieczenia) — wymaga weryfikacji.", "art. 29 ust. 1 pkt 1; art. 30")
    if eligible is True:
        for exc in eng.exclusions("MAT-ELIG-001"):
            if exc.decided or exc.unknown:
                applied.append(exc.rule_id)
            if exc.unknown:
                eng.need_from(exc)
                needs_data = True
            elif exc.fired:
                excluded = True
                result = eng.rules.rule(exc.rule_id)["result"]
                threshold = mul(ctx.param("MIN_WAGE_2026_MONTHLY"), ctx.param("DEBT_THRESHOLD_MIN_WAGE_RATIO"))
                reason(result["reason_code"], exc.rule_id,
                       f"Zadłużenie składkowe przekracza {_pct(ctx.param('DEBT_THRESHOLD_MIN_WAGE_RATIO'))} "
                       f"minimalnego "
                       f"wynagrodzenia ({dec_str(threshold)} zł) "
                       f"— zasiłek nie przysługuje do czasu spłaty.", "art. 2a ust. 1")
    for rule_id in REVIEW_RULES:
        if eng.eval(rule_id).kind == "BLOCKED":
            review = True

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
                   f"Martwe urodzenie albo zgon dziecka — urlop i zasiłek macierzyński do {computed.isoformat()} "
                   f"(nie krócej niż {ctx.param('STILLBIRTH_LEAVE_WEEKS')} tyg. po porodzie przy martwym urodzeniu "
                   f"lub zgonie przed ukończeniem 8 tyg. życia i nie krócej niż {ctx.param('CHILD_DEATH_MIN_DAYS')} "
                   f"dni od zgonu).", "KP art. 180(1) § 1-2")
        if period is not None:
            applied += [duration.rule_id, "MAT-DUR-009"]

    # Krok 7: stawka segmentu (jeden segment: urlop macierzyński matki od dnia porodu)
    ctx.segment = {"leave_type": "MATERNITY_LEAVE", "parent": "MOTHER",
                   "from": period["from"] if period else None, "to": period["to"] if period else None}
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
                       f"Wniosek o łączny zasiłek złożony w {ctx.param('APP_COMBINED_DEADLINE_DAYS')} dni od porodu — "
                       f"{_pct(rate)} podstawy.",
                       "art. 31 ust. 3; art. 30a ust. 1")
            elif winner.rule_id == "RATE-MAT-001":
                reason("RATE_FULL_100", "RATE-MAT-001",
                       f"Zasiłek za okres urlopu macierzyńskiego — {_pct(rate)} podstawy. Wniosek o "
                       f"{_pct(ctx.param('MAT_RATE_COMBINED'))} można złożyć do "
                       f"{deadline.isoformat()}.", "art. 31 ust. 1; art. 30a ust. 1")
    ctx.state["rate"] = rate

    # Krok 6: podstawa — art. 43 (BASE-GEN-001): ta sama podstawa, gdy przerwa nie obejmuje pełnego miesiąca
    # kalendarzowego (M05); ręczna podstawa ma pierwszeństwo, bez historii zasiłków reguła nie dotyczy
    manual = ctx.field("income_history.manual_base_override") is not None
    base_source = "MANUAL" if manual else None
    if not manual and ctx.field("benefit_history.previous_benefit_end_date") is not None:
        reuse = eng.eval("BASE-GEN-001")
        if reuse.unknown:
            eng.need_from(reuse)
            needs_data = True
        elif reuse.fired:
            applied.append("BASE-GEN-001")
            base_source = "REUSED_PREVIOUS"
            reason("BASE_REUSED_NO_FULL_MONTH_GAP", "BASE-GEN-001",
                   "Między poprzednim zasiłkiem a zasiłkiem macierzyńskim nie było przerwy obejmującej pełny miesiąc "
                   "kalendarzowy — podstawa wymiaru jest taka sama jak poprzedniego zasiłku.", "art. 43")

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
                       f"rodzicielskiego — zasiłek podwyższony do {dec_str(raised['monthly'])} zł miesięcznie "
                       f"({dec_str(daily)} zł za dzień).", "art. 31 ust. 3a-3c")

    # wynik: obiekt base (kontrakt Benefit.base) — tylko gdy podstawa jest znana i jej źródło rozstrzygnięte
    base_amount = ctx.fact("f_benefit_base") if base_source else None
    base = None
    if base_amount is not None:
        base = {"amount_exact": dec_str(base_amount), "source": base_source}
        if base_source == "REUSED_PREVIOUS":
            base["method_rule_id"] = "BASE-GEN-001"

    for rule_id in NOT_RUN:
        if rule_id not in eng.not_evaluated and rule_id not in eng.trace:
            eng.not_evaluated.append(rule_id)

    status = aggregate_status(excluded=excluded, review=review, needs_data=needs_data, eligible=eligible)
    return {
        "benefit_type": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE", "status": status,
        "rate": dec_str(rate) if rate is not None else None, "period": period, "days": days,
        "daily_amount_exact": dec_str(daily) if daily is not None else None,
        "total_amount_exact": dec_str(total) if total is not None else None,
        "payer_of_benefit": None, "reasons": reasons, "applied_rules": applied, "base": base,
    }


def _pct(ratio: Any) -> str:
    """0.815 → „81,5%” (tekst komunikatu z parametru, nie z literału)."""
    return dec_str(ratio * 100).replace(".", ",") + "%"
