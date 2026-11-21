"""Fakty — dokumenty, terminy wniosków urlopowych i ryzyka (zus_rules/07 §3, §5, §7; BE2-04).

Reguły: APP-DOC-001…006, SICK-DOC-001/002 (dokumenty), APP-DL-002 (terminy KP), RISK-001/002 (ostrzeżenia).
Kody dokumentów jak w ``03_rules.yaml`` (``result.documents[].doc``) i mapie ``f_documents_for_segment`` w 07 §7.
Terminy KP i progi ryzyk wyłącznie z ``ctx.param`` (progi RISK — parametry projektowe, nie prawne; M17).
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.core.dates import add_months, to_date
from app.core.money import div, to_decimal
from app.engine.facts.parental import segments
from app.engine.facts.registry import Context, fact

MATERNITY_LEAVE, TRANSFERRED, SUPPLEMENTARY = "MATERNITY_LEAVE", "MATERNITY_LEAVE_TRANSFERRED", \
    "SUPPLEMENTARY_MATERNITY_LEAVE"
PARENTAL, PATERNITY, MATERNITY_LIKE = "PARENTAL_LEAVE", "PATERNITY_LEAVE", "MATERNITY_LIKE_LEAVE"
SELF_EMPLOYED_TITLES = {"SELF_EMPLOYED", "SELF_EMPLOYED_COLLABORATOR"}


def doc(doc_type: str, location: str, *, provider: str, document: str = "ROZP_DOK",
        obtainable_by_zus: bool = False) -> dict[str, Any]:
    """Wpis dokumentu (kontrakt ``missing_documents``; ``rule_id`` i ``submit_to`` dopisuje pipeline)."""
    return {"doc_type": doc_type, "provider": provider, "obtainable_by_zus": obtainable_by_zus,
            "legal_basis": {"document": document, "location": location}}


def _event_or_due(ctx: Context) -> date | None:
    return to_date(ctx.field("event.date")) or to_date(ctx.field("pregnancy.expected_due_date"))


# ------------------------------------------------------------------------------------------- dokumenty
@fact("f_has_pre_birth_maternity_segment")
def has_pre_birth_maternity_segment(ctx: Context) -> bool | None:
    """07 §5, APP-DOC-001: segment MATERNITY_LEAVE z ``from < event.date`` (FORECAST: przewidywana data porodu).

    Brak planu i ``plan.maternity_start_date`` → None (UNKNOWN). ROZP_DOK § 13 ust. 1 pkt 1; KP art. 180 § 2.
    """
    if ctx.field("event.type") != "BIRTH":
        return False
    birth = _event_or_due(ctx)
    starts = [to_date(s["from"]) for s in segments(ctx, MATERNITY_LEAVE)]
    planned = to_date(ctx.field("plan.maternity_start_date"))
    if planned is not None:
        starts.append(planned)
    if birth is None or not starts:
        return None
    return min(starts) < birth


@fact("f_documents_for_segment")
def documents_for_segment(ctx: Context) -> list[dict[str, Any]] | None:
    """07 §7 (mapa dokumentów), APP-DOC-006: dokumenty dla bieżącego segmentu planu (``ctx.segment``).

    Stan pomocniczy (ustawia pipeline): ``payer_of_benefit``, ``is_employee``, ``maternity_parent`` (rodzic, który
    korzystał z urlopu macierzyńskiego). Brak płatnika → pomija dokumenty zależne od płatnika. ROZP_WN § 22:
    dokumenty z akt osobowych pomija się — silnik ich nie zna, więc nie filtruje (informacja w przewodniku).
    """
    seg = ctx.segment or {}
    leave_type, parent = seg.get("leave_type"), seg.get("parent")
    if leave_type is None:
        return None
    payer = ctx.field("payer_of_benefit")
    employee = ctx.field("is_employee")
    zus_employee = payer == "ZUS" and employee is True
    non_employee = employee is False
    event_type = ctx.field("event.type")
    child_docs = _child_documents(ctx, event_type, payer)
    out: list[dict[str, Any]] = []
    if leave_type == PARENTAL:
        same_parent = parent == ctx.field("maternity_parent")
        location = "§ 29" if same_parent else "§ 30"
        out.append(doc("OTHER_PARENT_PLANS_STATEMENT", location, provider="INSURED"))
        if zus_employee:
            out.append(doc("EMPLOYER_LEAVE_AND_WORKTIME_CERTIFICATE", location, provider="EMPLOYER"))
        if non_employee:
            out.append(doc("PARENTAL_BENEFIT_APPLICATION", location, provider="INSURED"))
        out.append(doc("PREVIOUS_PARTS_AND_RATES_STATEMENT", location, provider="INSURED"))
        if not same_parent:
            out.append(doc("OTHER_PARENT_PAYER_CERTIFICATE_PERIOD_RATE", "§ 30", provider="OTHER_PARENT_PAYER"))
            out += child_docs
    elif leave_type == PATERNITY:
        if event_type == "ADOPTION":
            out.append(doc("ADOPTION_COURT_DECISION", "§ 33", provider="COURT"))
        else:
            out += child_docs
        out.append(doc("NO_PATERNITY_BENEFIT_FROM_OTHER_TITLE_STATEMENT", "§ 33", provider="INSURED"))
        if non_employee:
            out.append(doc("PATERNITY_BENEFIT_APPLICATION", "§ 33", provider="INSURED"))
    elif leave_type == SUPPLEMENTARY:
        out.append(doc("OTHER_PARENT_NO_INTENT_STATEMENT", "§ 26-27", provider="INSURED"))
        if zus_employee:
            out.append(doc("EMPLOYER_LEAVE_AND_WORKTIME_CERTIFICATE", "§ 26-27", provider="EMPLOYER"))
        if non_employee:
            out.append(doc("SUPPLEMENTARY_BENEFIT_APPLICATION", "§ 26-27", provider="INSURED"))
        out.append(doc("HOSPITAL_STAY_CERTIFICATE", "§ 26-27", provider="HOSPITAL"))
    elif leave_type == TRANSFERRED:
        out += child_docs
        out.append(doc("MOTHER_PAYER_CERTIFICATE_PERIOD_RATE", "§ 20", provider="MOTHER_PAYER"))
        if ctx.field("children.abandoned_or_placed_date") is not None:
            out.append(doc("ABANDONMENT_OR_DEATH_STATEMENT", "§ 20", provider="INSURED"))
    return out


def _child_documents(ctx: Context, event_type: str | None, payer: str | None) -> list[dict[str, Any]]:
    """Akt urodzenia (płatnik składek) albo dane do pobrania z rejestru (ZUS); przyjęcie — dokumenty sądu."""
    if event_type == "BIRTH":
        if payer == "ZUS":
            return [doc("CHILD_DATA_FOR_ZUS_REGISTRY_LOOKUP", "§ 13 ust. 2", provider="INSURED",
                        obtainable_by_zus=True)]
        if payer == "CONTRIBUTION_PAYER":
            return [doc("BIRTH_CERTIFICATE_SHORT", "§ 13 ust. 1 pkt 2", provider="CIVIL_REGISTRY")]
        return []
    if event_type == "ADOPTION":
        return [doc("COURT_ADOPTION_APPLICATION_CONFIRMATION", "§ 16 ust. 1", provider="COURT")]
    if event_type == "FOSTER":
        return [doc("FOSTER_COURT_ORDER_OR_STAROSTA_CONTRACT", "§ 16 ust. 2", provider="COURT_OR_STAROSTA")]
    return []


# ------------------------------------------------------------------------------------------- terminy (KP)
@fact("f_leave_application_deadlines")
def leave_application_deadlines(ctx: Context) -> list[dict[str, Any]] | None:
    """07 §7, APP-DL-002: ostatni dzień złożenia wniosku urlopowego u pracodawcy — per segment planu.

    Rodzicielski (także łączenie z pracą) start − 21, część macierzyńskiego dla ojca start − 14, ojcowski
    start − 7, uzupełniający koniec macierzyńskiego − 21, rezygnacja matki powrót − 7, na warunkach
    macierzyńskiego przyjęcie + 7, część macierzyńskiego przed porodem start − 14 (BE2-08, Poradnik ZUS 2026;
    data porodu albo przewidywana data porodu) (uzupełniający bez segmentu MATERNITY_LEAVE w planie → bez terminu).
    „Nie krócej niż N dni przed” → bez przesuwania na dzień roboczy (DERIVED, D29).
    Brak segmentów → None. KP art. 180 § 8-9, 180(2) § 4, 182(1d) § 1, 182(1e) § 2, 182(3) § 2, 183 § 6.
    """
    plan = segments(ctx)
    if not plan:
        return None

    def before(day: date, param: str) -> date:
        return day - timedelta(days=int(ctx.param(param)))

    birth = _event_or_due(ctx) if ctx.field("event.type") == "BIRTH" else None
    out: list[dict[str, Any]] = []
    for seg in plan:
        start, end, parent, leave_type = to_date(seg["from"]), to_date(seg["to"]), seg.get("parent"), \
            seg.get("leave_type")
        if leave_type == PARENTAL:
            out.append({"code": "LEAVE_APP_PARENTAL", "date": before(start, "LEAVE_APP_PARENTAL_DAYS_BEFORE"),
                        "who": parent})
        elif leave_type == TRANSFERRED:
            out.append({"code": "LEAVE_APP_MATERNITY_FOR_FATHER",
                        "date": before(start, "LEAVE_APP_MATERNITY_FOR_FATHER_DAYS_BEFORE"), "who": parent})
        elif leave_type == PATERNITY:
            out.append({"code": "LEAVE_APP_PATERNITY", "date": before(start, "LEAVE_APP_PATERNITY_DAYS_BEFORE"),
                        "who": parent})
        elif leave_type == SUPPLEMENTARY:
            maternity = [to_date(s["to"]) for s in segments(ctx, MATERNITY_LEAVE, parent)]
            if not maternity:
                continue  # koniec macierzyńskiego nieznany — terminu nie podajemy (D29)
            maternity_end = max(maternity)
            out.append({"code": "LEAVE_APP_SUPPLEMENTARY",
                        "date": before(maternity_end, "LEAVE_APP_SUPPLEMENTARY_DAYS_BEFORE_MATERNITY_END"),
                        "who": parent})
        elif leave_type == MATERNITY_LIKE:
            accepted = to_date(ctx.field("event.date")) or start
            out.append({"code": "LEAVE_APP_MATERNITY_LIKE",
                        "date": accepted + timedelta(days=int(ctx.param(
                            "LEAVE_APP_MATERNITY_LIKE_DAYS_AFTER_ACCEPTANCE"))), "who": parent})
        if leave_type == MATERNITY_LEAVE and parent == "MOTHER" and birth is not None and start < birth:
            # BE2-08: część urlopu macierzyńskiego przed porodem — wniosek ≥ 14 dni przed startem (Poradnik ZUS 2026)
            out.append({"code": "LEAVE_APP_MATERNITY_PRE_BIRTH",
                        "date": before(start, "LEAVE_APP_MATERNITY_PRE_BIRTH_DAYS_BEFORE"), "who": parent})
        if leave_type == MATERNITY_LEAVE and parent == "MOTHER" and end is not None \
                and ctx.field("plan.mother_resigns_remaining_maternity") is True:
            # rezygnacja z pozostałej części macierzyńskiego: powrót do pracy dzień po końcu segmentu matki
            out.append({"code": "LEAVE_APP_MATERNITY_RESIGNATION",
                        "date": before(end + timedelta(days=1), "LEAVE_APP_RESIGNATION_DAYS_BEFORE_RETURN"),
                        "who": parent})
    return sorted(out, key=lambda d: d["date"])


# ------------------------------------------------------------------------------------------- ryzyka (pkt H)
@fact("f_title_started_during_or_shortly_before_pregnancy")
def title_started_during_or_shortly_before_pregnancy(ctx: Context) -> bool | None:
    """07 §3, RISK-001: początek któregoś tytułu ≥ pregnancy_start_date − RISK_WINDOW_DAYS (projektowy, M17).

    Tytuły zaczęte po porodzie (lub przewidywanej dacie porodu) nie liczą się. Brak tytułów albo daty
    początku ciąży → None. Treść zadania pkt H.1 — tylko ostrzeżenie, nie ocena pozorności.
    """
    titles = ctx.field("insurance.titles")
    start = to_date(ctx.field("pregnancy.pregnancy_start_date"))
    if not titles or start is None:
        return None
    threshold = start - timedelta(days=int(ctx.param("RISK_WINDOW_DAYS")))
    birth = _event_or_due(ctx)
    began = [to_date(t.get("from")) for t in titles]
    if any(b is not None and b >= threshold and (birth is None or b <= birth) for b in began):
        return True
    return None if any(b is None for b in began) else False  # Kleene: nieznany początek nie przesądza FALSE


def _month_base(month: dict[str, Any]) -> Decimal | None:
    """Podstawa miesiąca: gross_contribution_base (niepracownik) albo suma składników netto (pracownik)."""
    gross = to_decimal(month.get("gross_contribution_base"))
    if gross is not None:
        return gross
    parts = [to_decimal(month.get(k)) for k in ("fixed_components_net", "variable_components_prorated_net",
                                                 "variable_components_actual_net")]
    known = [p for p in parts if p is not None]
    return sum(known, Decimal("0")) if known else None


@fact("f_contribution_base_increase_during_pregnancy")
def contribution_base_increase_during_pregnancy(ctx: Context) -> bool | None:
    """07 §3, RISK-002: średnia podstawa w miesiącach ciąży > średnia z RISK_BASE_MONTHS_BEFORE_PREGNANCY
    miesięcy przed ciążą × RISK_INCREASE_FACTOR (parametry projektowe, M17).

    Brak miesięcy po którejś stronie albo daty początku ciąży → None. Treść zadania pkt H.2 — tylko ostrzeżenie.
    """
    start = to_date(ctx.field("pregnancy.pregnancy_start_date"))
    months = ctx.field("income_history.months")
    if start is None or not months:
        return None
    first = date(start.year, start.month, 1)
    window_start = add_months(first, -int(ctx.param("RISK_BASE_MONTHS_BEFORE_PREGNANCY")))
    end = _event_or_due(ctx)
    before: list[Decimal] = []
    during: list[Decimal] = []
    for month in months:
        label, base = month.get("month"), _month_base(month)
        if not label or base is None:
            continue
        day = date(int(label[:4]), int(label[5:7]), 1)
        if window_start <= day < first:
            before.append(base)
        elif day >= first and (end is None or day <= end):
            during.append(base)
    if not before or not during:
        return None
    avg_before = div(sum(before, Decimal("0")), len(before))
    avg_during = div(sum(during, Decimal("0")), len(during))
    return avg_during > avg_before * to_decimal(ctx.param("RISK_INCREASE_FACTOR"))
