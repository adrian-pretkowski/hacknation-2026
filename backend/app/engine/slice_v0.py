"""slice-v0 — TYMCZASOWA implementacja podzbioru reguł dla vertical slice.

Zakres: zasiłek macierzyński za okres urlopu macierzyńskiego matki po urodzeniu dziecka.
Reguły: MAT-ELIG-001 (tylko ubezpieczenie w dniu porodu), GEN-EXCL-001 (zadłużenie),
MAT-DUR-001, MAT-DUR-009, APP-DL-001, RATE-MAT-001, RATE-MAT-003, CALC-MAT-001.
Wszystkie wartości liczbowe pochodzą z zus_rules/03_rules.yaml (app.core.params).

Czego NIE ocenia (zwracane w not_evaluated_rules — jawne ograniczenia):
art. 30 (zasiłek po ustaniu ubezpieczenia), urlop wychowawczy, martwe urodzenie,
wyliczanie podstawy z historii wynagrodzeń (przyjmuje manual_base_override).

Do zastąpienia przez silnik reguł (app/engine/dsl + facts + pipeline) — patrz docs/TASKS.md.
Logika trójwartościowa: brak danych → NEEDS_DATA, nigdy NOT_ELIGIBLE.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.core.dates import next_working_day
from app.core.params import param, param_status, ruleset_version

ART2A_TITLES = {"SELF_EMPLOYED", "SELF_EMPLOYED_COLLABORATOR", "CLERGY_SELF_PAYER", "SEAFARER_ART6_24"}
NOT_EVALUATED = ["MAT-ELIG-004", "MAT-ELIG-005", "MAT-ELIG-006", "MAT-NEG-001", "MAT-DUR-002", "MAT-DUR-003",
                 "BASE-EMP-001", "BASE-NEMP-001", "BASE-GEN-001", "GEN-CLS-001", "GEN-CLS-002"]
STATUS_ORDER = ["NEEDS_REVIEW", "NEEDS_DATA", "NOT_ELIGIBLE", "ELIGIBLE"]


def dec_str(value: Decimal) -> str:
    """Dokładna wartość dziesiętna bez notacji wykładniczej i zbędnych zer."""
    text = format(value.normalize(), "f")
    return text


def _get(data: dict[str, Any], path: str) -> Any:
    node: Any = data
    for key in path.split("."):
        if not isinstance(node, dict):
            return None
        node = node.get(key)
    return node


def _as_date(value: Any) -> date | None:
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _insured_on(titles: list[dict[str, Any]] | None, day: date) -> tuple[bool | None, dict[str, Any] | None]:
    if not titles:
        return None, None
    for title in titles:
        start, end = _as_date(title.get("from")), _as_date(title.get("to"))
        if title.get("sickness_insurance_mode") in ("MANDATORY", "VOLUNTARY") and start and start <= day and (
            end is None or day <= end
        ):
            return True, title
    return False, None


def _maternity_weeks(children: int) -> int:
    table = param("MATERNITY_WEEKS_BY_CHILDREN")
    return int(table["5+"] if children >= 5 else table[str(children)])


def evaluate(payload: dict[str, Any]) -> dict[str, Any]:
    reasons: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    applied: list[str] = []
    assumptions = [{"code": "ROUNDING_UNCONFIRMED",
                    "text": "Kwoty bez zaokrągleń — zasady zaokrąglania ZUS niepotwierdzone (GAP-001)."}]
    statuses: list[str] = []

    def need(field: str, *rule_ids: str) -> None:
        missing.append({"field": field, "rule_ids": list(rule_ids)})
        statuses.append("NEEDS_DATA")

    event_type = _get(payload, "event.type")
    if event_type != "BIRTH":
        return _response([], [], [{"code": "OUT_OF_SCOPE_SLICE", "text": "slice-v0 obsługuje tylko event.type=BIRTH."}],
                         "OUT_OF_SCOPE")

    birth = _as_date(_get(payload, "event.date"))
    children = _get(payload, "children.count_at_birth")
    base_raw = _get(payload, "income_history.manual_base_override")
    base = Decimal(str(base_raw)) if base_raw not in (None, "") else None
    titles = _get(payload, "insurance.titles")

    # MAT-ELIG-001 (tylko ubezpieczenie w dniu porodu)
    if birth is None:
        need("event.date", "MAT-ELIG-001", "MAT-DUR-009")
    else:
        insured, title = _insured_on(titles, birth)
        applied.append("MAT-ELIG-001")
        if insured is None:
            need("insurance.titles", "MAT-ELIG-001")
        elif insured is False:
            statuses.append("NEEDS_REVIEW")
            reasons.append({"code": "NOT_INSURED_ON_BIRTH_ART30_NOT_EVALUATED", "rule_id": "MAT-ELIG-001",
                            "message": "Brak ubezpieczenia chorobowego w dniu porodu. Ta wersja nie ocenia jeszcze "
                                       "przypadków z art. 30 (zasiłek po ustaniu ubezpieczenia) — wymaga weryfikacji.",
                            "legal_basis": [{"document": "USTAWA", "location": "art. 29 ust. 1 pkt 1; art. 30"}]})
        elif title and title.get("title_type") in ART2A_TITLES:
            # GEN-EXCL-001
            applied.append("GEN-EXCL-001")
            debt_raw = _get(payload, "debt.amount_on_right_date")
            threshold = param("MIN_WAGE_2026_MONTHLY") * param("DEBT_THRESHOLD_MIN_WAGE_RATIO")
            if param_status("MIN_WAGE_2026_MONTHLY") == "UNCONFIRMED":
                assumptions.append({"code": "MIN_WAGE_FROM_ATTACHMENT",
                                    "text": "Płaca minimalna 2026 wzięta z Załącznika HackNation (niepotwierdzona)."})
            if debt_raw in (None, ""):
                need("debt.amount_on_right_date", "GEN-EXCL-001")
            elif Decimal(str(debt_raw)) > threshold:
                statuses.append("NOT_ELIGIBLE")
                reasons.append({"code": "CONTRIBUTION_DEBT", "rule_id": "GEN-EXCL-001",
                                "message": f"Zadłużenie składkowe przekracza 1% minimalnego wynagrodzenia "
                                           f"({dec_str(threshold)} zł) — zasiłek nie przysługuje do czasu spłaty.",
                                "legal_basis": [{"document": "USTAWA", "location": "art. 2a ust. 1"}]})
            else:
                statuses.append("ELIGIBLE")
        else:
            statuses.append("ELIGIBLE")

    # MAT-DUR-001 + MAT-DUR-009
    period = None
    days = None
    if children in (None, 0):
        need("children.count_at_birth", "MAT-DUR-001")
    elif birth is not None:
        weeks = _maternity_weeks(int(children))
        days = weeks * int(param("WEEK_AS_DAYS"))
        period = {"from": birth.isoformat(), "to": (birth + timedelta(days=days - 1)).isoformat(), "max_weeks": weeks}
        applied += ["MAT-DUR-001", "MAT-DUR-009"]

    # APP-DL-001 + RATE-MAT-001 / RATE-MAT-003
    rate = None
    if birth is not None:
        # M15 d: termin w sobotę, niedzielę lub święto → następny dzień roboczy (jak f_combined_application_deadline)
        holidays = frozenset(_as_date(day) for day in param("PUBLIC_HOLIDAYS") or [])
        deadline = next_working_day(birth + timedelta(days=int(param("APP_COMBINED_DEADLINE_DAYS"))), holidays)
        if param_status("PUBLIC_HOLIDAYS") == "UNCONFIRMED":
            assumptions.append({"code": "PUBLIC_HOLIDAYS_UNCONFIRMED",
                                "text": "Termin w sobotę, niedzielę lub święto przesunięto na następny dzień roboczy "
                                        "(M15); lista świąt 2026–2031 przygotowana przez zespół "
                                        "(public_holidays.yaml) — do potwierdzenia."})
        filed = _as_date(_get(payload, "applications.combined_815_filed_date"))
        planned = _get(payload, "applications.combined_815_planned")
        applied.append("APP-DL-001")
        if (filed is not None and filed <= deadline) or (filed is None and planned is True):
            rate = param("MAT_RATE_COMBINED")
            applied.append("RATE-MAT-003")
            reasons.append({"code": "RATE_COMBINED_815", "rule_id": "RATE-MAT-003",
                            "message": "Wniosek o łączny zasiłek złożony w 21 dni od porodu — 81,5% podstawy.",
                            "legal_basis": [{"document": "USTAWA", "location": "art. 31 ust. 3; art. 30a ust. 1"}]})
        else:
            rate = param("MAT_RATE_FULL")
            applied.append("RATE-MAT-001")
            reasons.append({"code": "RATE_FULL_100", "rule_id": "RATE-MAT-001",
                            "message": f"Zasiłek za okres urlopu macierzyńskiego — 100% podstawy. Wniosek o 81,5% "
                                       f"można złożyć do {deadline.isoformat()}.",
                            "legal_basis": [{"document": "USTAWA", "location": "art. 31 ust. 1; art. 30a ust. 1"}]})

    # CALC-MAT-001
    daily = total = None
    if base is None:
        need("income_history.manual_base_override", "CALC-MAT-001")
    elif rate is not None and days is not None:
        daily = base * rate / int(param("MONTH_AS_DAYS"))
        total = daily * days
        applied.append("CALC-MAT-001")

    status = next((s for s in STATUS_ORDER if s in statuses), "NEEDS_DATA")
    benefit = {
        "benefit_type": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE", "status": status,
        "rate": dec_str(rate) if rate is not None else None, "period": period, "days": days,
        "daily_amount_exact": dec_str(daily) if daily is not None else None,
        "total_amount_exact": dec_str(total) if total is not None else None,
        "payer_of_benefit": None, "reasons": reasons, "applied_rules": applied,
    }
    return _response([benefit], missing, assumptions, status)


def _response(benefits: list[dict[str, Any]], missing: list[dict[str, Any]], assumptions: list[dict[str, Any]],
              overall: str) -> dict[str, Any]:
    from app.core.config import get_settings

    return {
        "evaluation_id": str(uuid.uuid4()),
        "ruleset_version": ruleset_version(),
        "law_reference_date": get_settings().law_reference_date,
        "engine": "slice-v0",
        "overall_status": overall,
        "benefits": benefits,
        "missing_data": missing,
        "assumptions": assumptions,
        "not_evaluated_rules": NOT_EVALUATED,
    }
