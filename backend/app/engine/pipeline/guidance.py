"""Przewodnik po wyniku (BE2-04): dokumenty (``missing_documents``), terminy (``deadlines``) i ryzyka (``warnings``).

Krok po ocenie świadczeń - nie zmienia statusu ani kwot (reguły INFORMATIONAL / DEADLINE / VALIDATION):
- dokumenty: SICK-DOC-001/002 (chorobowy), APP-DOC-001…005 (macierzyński, urodzenie, przyjęcie dziecka, po ustaniu
  tytułu), APP-DOC-006 per segment planu (``f_documents_for_segment``); tylko świadczenia, które nie są odmową
  (NOT_ELIGIBLE / OUT_OF_SCOPE), bez dokumentów oznaczonych w ``evidence.documents`` jako PROVIDED,
- terminy: APP-DL-001 (wniosek 81,5%, ``f_combined_application_deadline``) i APP-DL-002 (wnioski urlopowe KP,
  ``f_leave_application_deadlines``) - dla osoby, której dotyczy ewaluacja,
- ryzyka: RISK-001/002/003 (pkt H zadania, M17) - tylko ostrzeżenia, nigdy zmiana statusu.
"""
from __future__ import annotations

from typing import Any

from app.core.dates import to_date
from app.engine.facts.documents import (
    MATERNITY_LIKE,
    PARENTAL,
    PATERNITY,
    SELF_EMPLOYED_TITLES,
    SUPPLEMENTARY,
    TRANSFERRED,
    doc,
)
from app.engine.facts.insurance import INCAPACITY_EVENTS
from app.engine.facts.parental import segments
from app.engine.pipeline.engine import Engine
from app.engine.pipeline.parental import applicant_parent

INACTIVE = ("NOT_ELIGIBLE", "OUT_OF_SCOPE")
RISK_RULES = ["RISK-001", "RISK-002", "RISK-003"]
SEGMENT_DOC_TYPES = (PARENTAL, PATERNITY, SUPPLEMENTARY, TRANSFERRED)
AFTER_TITLE_BASES = ("AFTER_TITLE_EMPLOYER_CEASED", "AFTER_TITLE_UNLAWFUL_TERMINATION")


def guidance(eng: Engine, benefits: list[dict[str, Any]]) -> dict[str, Any]:
    """Dokumenty, terminy i ostrzeżenia o ryzyku dla wyniku ewaluacji (kontrakt: missing_documents, deadlines)."""
    _risks(eng)
    return {"missing_documents": _Documents(eng, benefits).collect(), "deadlines": _deadlines(eng, benefits)}


# ------------------------------------------------------------------------------------------- ryzyka
def _risks(eng: Engine) -> None:
    """RISK-001/002/003 dotyczą ciąży ubezpieczonej - tylko matka (urodzenie, niezdolność w ciąży)."""
    ctx = eng.ctx
    if ctx.field("person.role") != "MOTHER" or ctx.field("event.type") not in ("BIRTH", "PREGNANCY_INCAPACITY"):
        return
    for rule_id in RISK_RULES:
        eng.check(rule_id)  # Engine.check: deduplikacja (RISK-003 sprawdza już ścieżka macierzyńska)


# ------------------------------------------------------------------------------------------- dokumenty
class _Documents:
    def __init__(self, eng: Engine, benefits: list[dict[str, Any]]):
        self.eng, self.ctx = eng, eng.ctx
        self.active = [b for b in benefits if b.get("status") not in INACTIVE]
        provided = (self.ctx.field("evidence.documents") or [])
        self.provided = {d.get("doc_type") for d in provided if d.get("status") == "PROVIDED"}
        self.out: list[dict[str, Any]] = []

    def collect(self) -> list[dict[str, Any]]:
        if not self.active:
            return []
        ctx = self.ctx
        event_type = ctx.field("event.type")
        day = to_date(ctx.field("incapacity.start_date" if event_type in INCAPACITY_EVENTS else "event.date"))
        employee = ctx.fact("f_is_employee_on", date=(day or ctx.as_of))
        saved_state = {k: ctx.state.get(k) for k in ("benefit", "entitlement_basis", "payer_of_benefit",
                                                       "is_employee", "maternity_parent")}
        saved_segment = ctx.segment
        ctx.state["is_employee"] = employee
        try:
            for benefit in self.active:
                if benefit["benefit_type"] == "SICKNESS_BENEFIT":
                    self._sickness(benefit, employee)
            maternity = [b for b in self.active if b["benefit_type"] in ("MATERNITY_BENEFIT",
                                                                          "MATERNITY_EQUIVALENT_ALLOWANCE")]
            if maternity:
                self._maternity(maternity, event_type)
        finally:
            ctx.segment = saved_segment
            for key, value in saved_state.items():
                if value is None:
                    ctx.state.pop(key, None)
                else:
                    ctx.state[key] = value
        return self.out

    def _add(self, rule_id: str, items: list[dict[str, Any]], payer: str | None) -> None:
        for item in items:
            if item["doc_type"] in self.provided or any(d["doc_type"] == item["doc_type"] for d in self.out):
                continue
            entry = {"doc_type": item["doc_type"], "rule_id": rule_id, **item}
            submit_to = "ZUS" if item.get("obtainable_by_zus") else payer
            if submit_to in ("ZUS", "CONTRIBUTION_PAYER"):
                entry["submit_to"] = submit_to
            self.out.append(entry)

    def _fires(self, rule_id: str, **state: Any) -> bool:
        self.ctx.state.update(state)
        return self.eng.eval(rule_id).fired

    # ---------------------------------------------------------------- chorobowy
    def _sickness(self, benefit: dict[str, Any], employee: bool | None) -> None:
        payer = benefit.get("payer_of_benefit")
        if self._fires("SICK-DOC-001", benefit="SICKNESS_BENEFIT"):
            items = [doc("E_ZLA", "§ 2", provider="DOCTOR_TO_ZUS", obtainable_by_zus=True)]
            if payer == "ZUS":
                title = self.ctx.fact("f_primary_title_type")
                if employee is True:
                    items.append(doc("PAYER_CERTIFICATE_Z3", "§ 3 ust. 1 pkt 1", provider="CONTRIBUTION_PAYER"))
                elif title in SELF_EMPLOYED_TITLES:
                    items.append(doc("SICKNESS_APPLICATION_ANNEX1", "§ 3 ust. 1, zał. 1", provider="INSURED"))
                elif employee is False and title is not None:
                    items.append(doc("PAYER_CERTIFICATE_Z3A", "§ 3 ust. 1 pkt 2", provider="CONTRIBUTION_PAYER"))
            self._add("SICK-DOC-001", items, payer)
        if self._fires("SICK-DOC-002"):
            self._add("SICK-DOC-002", [doc("AFTER_TITLE_STATEMENT_ANNEX4", "§ 4, zał. 4", provider="INSURED")],
                      payer)

    # ---------------------------------------------------------------- macierzyński i urlopy rodzica
    def _maternity(self, maternity: list[dict[str, Any]], event_type: str | None) -> None:
        ctx = self.ctx
        main = next((b for b in maternity if b["benefit_type"] == "MATERNITY_BENEFIT"), maternity[0])
        payer = next((b.get("payer_of_benefit") for b in maternity if b.get("payer_of_benefit")), None)
        ctx.state["payer_of_benefit"] = payer
        parent = applicant_parent(self.eng)

        if any(b["benefit_type"] == "MATERNITY_BENEFIT" for b in maternity) and \
                self._fires("APP-DOC-003", benefit="MATERNITY_BENEFIT"):
            items = []
            if payer == "ZUS":
                items.append(doc("MATERNITY_APPLICATION_ANNEX6", "§ 12, zał. 6", provider="INSURED"))
                title = ctx.fact("f_primary_title_type")
                if title is not None and title not in SELF_EMPLOYED_TITLES:
                    items.append(doc("PAYER_CERTIFICATE_Z3_OR_Z3A", "§ 12", provider="CONTRIBUTION_PAYER"))
            if ctx.field("children.za_zyciem_certificate") is True:
                items.append(doc("ZA_ZYCIEM_STATEMENT", "§ 3 ust. 2", provider="INSURED"))
            self._add("APP-DOC-003", items, payer)

        if parent == "MOTHER" and self._fires("APP-DOC-001"):
            self._add("APP-DOC-001", [doc("DUE_DATE_MEDICAL_CERTIFICATE", "§ 13 ust. 1 pkt 1", provider="DOCTOR")],
                      payer)

        if self._fires("APP-DOC-002"):
            items = []
            if payer == "ZUS":
                items.append(doc("CHILD_DATA_FOR_ZUS_REGISTRY_LOOKUP", "§ 13 ust. 2", provider="INSURED",
                                 obtainable_by_zus=True))
            elif payer == "CONTRIBUTION_PAYER":
                items.append(doc("BIRTH_CERTIFICATE_SHORT", "§ 13 ust. 1 pkt 2", provider="CIVIL_REGISTRY"))
            if any(c.get("stillborn") is True for c in ctx.field("children.items") or []):
                items.append(doc("STILLBIRTH_CERTIFICATE", "§ 13 ust. 3", provider="DOCTOR_OR_MIDWIFE"))
            self._add("APP-DOC-002", items, payer)

        if self._fires("APP-DOC-005"):
            items = []
            if event_type == "ADOPTION":
                items += [doc("CHILD_ACCEPTANCE_DATE_STATEMENT", "§ 16 ust. 1", provider="INSURED"),
                          doc("COURT_ADOPTION_APPLICATION_CONFIRMATION", "§ 16 ust. 1", provider="COURT")]
            elif event_type == "FOSTER":
                items += [doc("FOSTER_COURT_ORDER_OR_STAROSTA_CONTRACT", "§ 16 ust. 2", provider="COURT_OR_STAROSTA"),
                          doc("CHILD_AGE_DOCUMENT", "§ 16 ust. 2", provider="INSURED")]
            if ctx.field("children.school_obligation_deferred") is True:
                items.append(doc("SCHOOL_DEFERRAL_DECISION", "§ 16 ust. 2", provider="SCHOOL_OR_AUTHORITY"))
            self._add("APP-DOC-005", items, payer)

        for benefit in maternity:
            basis = benefit.get("entitlement_basis")
            if basis not in AFTER_TITLE_BASES and benefit["benefit_type"] != "MATERNITY_EQUIVALENT_ALLOWANCE":
                continue
            if not self._fires("APP-DOC-004", benefit=benefit["benefit_type"], entitlement_basis=basis):
                continue
            items = [doc("PREGNANCY_DURING_EMPLOYMENT_CERTIFICATE", "§ 15 ust. 1", provider="DOCTOR"),
                     doc("EMPLOYMENT_CERTIFICATE_TERMINATION_REASON", "§ 15 ust. 1-2", provider="EMPLOYER")]
            if basis == "AFTER_TITLE_UNLAWFUL_TERMINATION":
                items.append(doc("FINAL_COURT_JUDGMENT", "§ 15 ust. 3", provider="COURT"))
            if benefit["benefit_type"] == "MATERNITY_EQUIVALENT_ALLOWANCE":
                items.append(doc("NO_OTHER_EMPLOYMENT_STATEMENT", "§ 17", provider="INSURED"))
            self._add("APP-DOC-004", items, benefit.get("payer_of_benefit") or payer)

        # APP-DOC-006: segmenty planu osoby, której dotyczy ewaluacja (rodzic, który był na macierzyńskim → § 29)
        mat_parent = "MOTHER" if event_type == "BIRTH" else next(
            (s.get("parent") for s in segments(ctx, MATERNITY_LIKE)), parent)
        ctx.state["maternity_parent"] = mat_parent
        ctx.state["benefit"] = main["benefit_type"]
        for seg in segments(ctx):
            if seg.get("parent") != parent or seg.get("leave_type") not in SEGMENT_DOC_TYPES:
                continue
            ctx.segment = seg
            if self.eng.eval("APP-DOC-006").fired:
                self._add("APP-DOC-006", ctx.fact("f_documents_for_segment") or [], payer)


# ------------------------------------------------------------------------------------------- terminy
def _deadlines(eng: Engine, benefits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ctx = eng.ctx
    active = [b for b in benefits if b.get("status") not in INACTIVE and b["benefit_type"] == "MATERNITY_BENEFIT"]
    if not active:
        return []
    parent = applicant_parent(eng)
    out: list[dict[str, Any]] = []
    filed = ctx.field("applications.combined_815_filed_date") is not None
    takes_maternity = any(b.get("leave_type") in ("MATERNITY_LEAVE", MATERNITY_LIKE) for b in active)
    if takes_maternity and not filed and eng.eval("APP-DL-001").fired:
        deadline = ctx.fact("f_combined_application_deadline")
        if deadline is not None:
            out.append({"code": "COMBINED_815_APPLICATION", "date": deadline.isoformat(), "who": parent,
                        "rule_id": "APP-DL-001"})
    if eng.eval("APP-DL-002").fired:
        for item in ctx.fact("f_leave_application_deadlines") or []:
            if item.get("who") == parent:
                out.append({"code": item["code"], "date": item["date"].isoformat(), "who": item["who"],
                            "rule_id": "APP-DL-002"})
    return sorted(out, key=lambda d: d["date"])
