"""BE2-04: dokumenty, terminy, ryzyka (zus_rules/07 §3, §5, §7) - przypadek typowy, graniczny, brak danych.

Fakty: f_has_pre_birth_maternity_segment (APP-DOC-001), f_documents_for_segment (APP-DOC-006),
f_leave_application_deadlines (APP-DL-002), f_title_started_during_or_shortly_before_pregnancy (RISK-001),
f_contribution_base_increase_during_pregnancy (RISK-002). Przebiegi: ``pipeline.evaluate`` → missing_documents,
deadlines, warnings (APP-DOC-002/003/005, SICK-DOC-001/002, APP-DL-001).
"""
import copy
import json
from datetime import date
from pathlib import Path

import pytest

from app.engine import pipeline
from app.engine.facts import Context

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = json.loads((ROOT / "zus_rules" / "08_TEST_CASES.json").read_text(encoding="utf-8"))["fixtures"]
BIRTH = {"type": "BIRTH", "date": "2027-03-15"}
PREGNANCY = {"pregnancy_start_date": "2026-06-08", "expected_due_date": "2027-03-15"}
SMALL_PAYER = {"insured_count_on_nov30_prev_year": 5}  # ≤ 20 ubezpieczonych → płaci ZUS (GEN-CLS-002)


def _ctx(data: dict, segment: dict | None = None) -> Context:
    return Context(input=data, as_of=date(2026, 11, 21), segment=segment)


def _seg(leave_type: str, start: str, end: str, parent: str = "MOTHER") -> dict:
    return {"parent": parent, "leave_type": leave_type, "from": start, "to": end}


def _title(start: str, end: str | None = None) -> dict:
    return {"title_type": "EMPLOYMENT_CONTRACT", "sickness_insurance_mode": "MANDATORY", "from": start, "to": end}


def _fixture(name: str = "employee_mother", **patch) -> dict:
    data = copy.deepcopy(FIXTURES[name])
    data.update(patch)
    return data


def _docs(body: dict) -> dict[str, str]:
    return {d["doc_type"]: d["rule_id"] for d in body["missing_documents"]}


# ------------------------------------------------------------ f_has_pre_birth_maternity_segment (APP-DOC-001)
def test_APP_DOC_001_pre_birth_segment_typical_boundary_missing():
    plan = {"segments": [_seg("MATERNITY_LEAVE", "2027-03-01", "2027-07-18")]}
    assert _ctx({"event": BIRTH, "plan": plan}).fact("f_has_pre_birth_maternity_segment") is True
    plan = {"segments": [_seg("MATERNITY_LEAVE", "2027-03-15", "2027-08-01")]}  # od dnia porodu - nie „przed”
    assert _ctx({"event": BIRTH, "plan": plan}).fact("f_has_pre_birth_maternity_segment") is False
    assert _ctx({"event": BIRTH}).fact("f_has_pre_birth_maternity_segment") is None
    # FORECAST: przed porodem - przewidywana data porodu
    data = {"event": {"type": "BIRTH"}, "pregnancy": PREGNANCY, "plan": {"maternity_start_date": "2027-02-01"}}
    assert _ctx(data).fact("f_has_pre_birth_maternity_segment") is True


# ------------------------------------------------------------ f_leave_application_deadlines (APP-DL-002)
def test_APP_DL_002_leave_application_deadlines_typical():
    plan = {"segments": [_seg("MATERNITY_LEAVE", "2027-03-15", "2027-07-31"),
                         _seg("PARENTAL_LEAVE", "2027-08-01", "2027-12-31"),
                         _seg("PATERNITY_LEAVE", "2027-04-01", "2027-04-14", "FATHER"),
                         _seg("MATERNITY_LEAVE_TRANSFERRED", "2027-06-01", "2027-07-31", "FATHER")]}
    result = _ctx({"event": BIRTH, "plan": plan}).fact("f_leave_application_deadlines")
    assert {(d["code"], d["date"], d["who"]) for d in result} == {
        ("LEAVE_APP_PARENTAL", date(2027, 7, 11), "MOTHER"),          # start − 21
        ("LEAVE_APP_PATERNITY", date(2027, 3, 25), "FATHER"),         # start − 7
        ("LEAVE_APP_MATERNITY_FOR_FATHER", date(2027, 5, 18), "FATHER"),  # start − 14
    }
    assert [d["date"] for d in result] == sorted(d["date"] for d in result)


def test_APP_DL_002_supplementary_resignation_and_maternity_like_boundary():
    plan = {"segments": [_seg("MATERNITY_LEAVE", "2027-03-15", "2027-07-31"),
                         _seg("SUPPLEMENTARY_MATERNITY_LEAVE", "2027-08-01", "2027-09-30")],
            "mother_resigns_remaining_maternity": True}
    result = {d["code"]: d["date"] for d in _ctx({"event": BIRTH, "plan": plan}).fact("f_leave_application_deadlines")}
    assert result["LEAVE_APP_SUPPLEMENTARY"] == date(2027, 7, 10)        # koniec macierzyńskiego − 21
    assert result["LEAVE_APP_MATERNITY_RESIGNATION"] == date(2027, 7, 25)  # powrót 2027-08-01 − 7
    plan["segments"] = plan["segments"][1:]  # bez segmentu macierzyńskiego - koniec nieznany, brak terminu
    result = _ctx({"event": BIRTH, "plan": plan}).fact("f_leave_application_deadlines")
    assert all(d["code"] != "LEAVE_APP_SUPPLEMENTARY" for d in result)
    data = {"event": {"type": "ADOPTION", "date": "2027-05-10"},
            "plan": {"segments": [_seg("MATERNITY_LIKE_LEAVE", "2027-05-10", "2027-09-26", "ADOPTIVE_PARENT_1")]}}
    result = _ctx(data).fact("f_leave_application_deadlines")
    assert result == [{"code": "LEAVE_APP_MATERNITY_LIKE", "date": date(2027, 5, 17), "who": "ADOPTIVE_PARENT_1"}]


def test_BE2_08_pre_birth_maternity_application_deadline():
    def deadlines(start, event=BIRTH, pregnancy=None):
        data = {"event": event, "plan": {"segments": [_seg("MATERNITY_LEAVE", start, "2027-07-31")]}}
        if pregnancy:
            data["pregnancy"] = pregnancy
        return {d["code"]: d["date"] for d in _ctx(data).fact("f_leave_application_deadlines")}

    assert deadlines("2027-02-01")["LEAVE_APP_MATERNITY_PRE_BIRTH"] == date(2027, 1, 18)  # start − 14
    assert "LEAVE_APP_MATERNITY_PRE_BIRTH" not in deadlines("2027-03-15")  # od dnia porodu - bez wniosku przed
    # FORECAST: przed porodem - liczy się przewidywana data porodu
    assert deadlines("2027-03-01", {"type": "BIRTH"}, PREGNANCY)["LEAVE_APP_MATERNITY_PRE_BIRTH"] == date(2027, 2, 15)
    assert "LEAVE_APP_MATERNITY_PRE_BIRTH" not in deadlines("2027-03-01", {"type": "BIRTH"})  # brak dat porodu


def test_APP_DL_002_no_plan_is_unknown():
    assert _ctx({"event": BIRTH}).fact("f_leave_application_deadlines") is None


# ------------------------------------------------------------ f_documents_for_segment (APP-DOC-006)
@pytest.mark.parametrize(("segment", "state", "expected", "absent"), [
    (_seg("PARENTAL_LEAVE", "2027-08-01", "2027-12-31"),
     {"payer_of_benefit": "ZUS", "is_employee": True, "maternity_parent": "MOTHER"},
     {"OTHER_PARENT_PLANS_STATEMENT", "EMPLOYER_LEAVE_AND_WORKTIME_CERTIFICATE", "PREVIOUS_PARTS_AND_RATES_STATEMENT"},
     {"OTHER_PARENT_PAYER_CERTIFICATE_PERIOD_RATE", "PARENTAL_BENEFIT_APPLICATION"}),
    (_seg("PARENTAL_LEAVE", "2027-08-01", "2027-12-31", "FATHER"),  # drugi rodzic (§ 30), płatnik składek
     {"payer_of_benefit": "CONTRIBUTION_PAYER", "is_employee": True, "maternity_parent": "MOTHER"},
     {"OTHER_PARENT_PAYER_CERTIFICATE_PERIOD_RATE", "BIRTH_CERTIFICATE_SHORT"},
     {"EMPLOYER_LEAVE_AND_WORKTIME_CERTIFICATE"}),
    (_seg("PATERNITY_LEAVE", "2027-04-01", "2027-04-14", "FATHER"),  # niepracownik - wniosek
     {"payer_of_benefit": "ZUS", "is_employee": False},
     {"CHILD_DATA_FOR_ZUS_REGISTRY_LOOKUP", "NO_PATERNITY_BENEFIT_FROM_OTHER_TITLE_STATEMENT",
      "PATERNITY_BENEFIT_APPLICATION"}, {"BIRTH_CERTIFICATE_SHORT"}),
    (_seg("SUPPLEMENTARY_MATERNITY_LEAVE", "2027-08-01", "2027-09-30"),
     {"payer_of_benefit": "ZUS", "is_employee": True},
     {"OTHER_PARENT_NO_INTENT_STATEMENT", "HOSPITAL_STAY_CERTIFICATE", "EMPLOYER_LEAVE_AND_WORKTIME_CERTIFICATE"},
     set()),
    (_seg("MATERNITY_LEAVE_TRANSFERRED", "2027-06-01", "2027-07-31", "FATHER"),
     {"payer_of_benefit": "CONTRIBUTION_PAYER", "is_employee": True},
     {"BIRTH_CERTIFICATE_SHORT", "MOTHER_PAYER_CERTIFICATE_PERIOD_RATE"}, {"ABANDONMENT_OR_DEATH_STATEMENT"}),
])
def test_APP_DOC_006_documents_for_segment(segment, state, expected, absent):
    ctx = _ctx({"event": BIRTH}, segment)
    ctx.state.update(state)
    found = {d["doc_type"] for d in ctx.fact("f_documents_for_segment")}
    assert expected <= found
    assert not absent & found


def test_APP_DOC_006_unknown_payer_skips_payer_documents_and_no_segment_is_unknown():
    ctx = _ctx({"event": BIRTH}, _seg("PATERNITY_LEAVE", "2027-04-01", "2027-04-14", "FATHER"))
    found = {d["doc_type"] for d in ctx.fact("f_documents_for_segment")}
    assert found == {"NO_PATERNITY_BENEFIT_FROM_OTHER_TITLE_STATEMENT"}
    assert _ctx({"event": BIRTH}).fact("f_documents_for_segment") is None


# ------------------------------------ RISK-001 f_title_started_during_or_shortly_before_pregnancy
def test_RISK_001_title_start_window_typical_boundary_missing():
    def risk(start):
        data = {"event": BIRTH, "pregnancy": PREGNANCY, "insurance": {"titles": [_title(start)]}}
        return _ctx(data).fact("f_title_started_during_or_shortly_before_pregnancy")

    assert risk("2026-07-01") is True    # w ciąży
    assert risk("2026-03-10") is True    # dokładnie 90 dni przed początkiem ciąży (2026-06-08)
    assert risk("2026-03-09") is False   # 91 dni przed
    assert risk("2022-02-01") is False   # wieloletnie zatrudnienie
    # Kleene: tytuł bez daty początku nie przesądza FALSE, ale znany tytuł w oknie → TRUE
    unknown_start = {"title_type": "OTHER", "sickness_insurance_mode": "VOLUNTARY", "from": None}
    data = {"event": BIRTH, "pregnancy": PREGNANCY, "insurance": {"titles": [unknown_start, _title("2026-07-01")]}}
    assert _ctx(data).fact("f_title_started_during_or_shortly_before_pregnancy") is True
    data["insurance"]["titles"][1] = _title("2022-02-01")
    assert _ctx(data).fact("f_title_started_during_or_shortly_before_pregnancy") is None
    assert _ctx({"event": BIRTH, "insurance": {"titles": [_title("2026-07-01")]}}).fact(
        "f_title_started_during_or_shortly_before_pregnancy") is None


# ------------------------------------ RISK-002 f_contribution_base_increase_during_pregnancy
def _months(before: str, during: str) -> list[dict]:
    return ([{"month": m, "gross_contribution_base": before} for m in ("2026-03", "2026-04", "2026-05")]
            + [{"month": m, "gross_contribution_base": during} for m in ("2026-06", "2026-07")])


def test_RISK_002_base_increase_typical_boundary_missing():
    def risk(months):
        data = {"event": BIRTH, "pregnancy": PREGNANCY, "income_history": {"months": months}}
        return _ctx(data).fact("f_contribution_base_increase_during_pregnancy")

    assert risk(_months("4000.00", "9000.00")) is True
    assert risk(_months("4000.00", "6000.00")) is False   # dokładnie × 1,5 - nie „więcej niż”
    assert risk(_months("4000.00", "6000.01")) is True
    assert risk(_months("4000.00", "4000.00")[:3]) is None  # brak miesięcy w ciąży
    assert risk([{"month": "2026-07", "gross_contribution_base": "9000.00"}]) is None  # brak miesięcy przed ciążą
    # pracownik: składniki netto zamiast podstawy składek
    months = [{"month": "2026-05", "fixed_components_net": "3000.00"},
              {"month": "2026-07", "fixed_components_net": "3000.00", "variable_components_actual_net": "2000.00"}]
    assert risk(months) is True


# ------------------------------------------------------------ przebiegi pipeline'u
def test_pipeline_employee_mother_birth_certificate_and_815_deadline():
    body = pipeline.evaluate(_fixture())
    assert _docs(body) == {"BIRTH_CERTIFICATE_SHORT": "APP-DOC-002"}
    assert body["missing_documents"][0]["submit_to"] == "CONTRIBUTION_PAYER"
    assert {"code": "COMBINED_815_APPLICATION", "date": "2027-04-05", "who": "MOTHER",
            "rule_id": "APP-DL-001"} in body["deadlines"]
    assert body["warnings"] == []


def test_pipeline_small_payer_zus_documents_kp_deadlines_and_risks():
    data = _fixture(payer=SMALL_PAYER,
                    plan={"segments": [_seg("MATERNITY_LEAVE", "2027-03-01", "2027-07-18"),
                                       _seg("PARENTAL_LEAVE", "2027-07-19", "2027-12-31")]},
                    income_history={"manual_base_override": "6000.00", "months": _months("4000.00", "9000.00")})
    data["insurance"]["titles"][0]["from"] = "2026-05-01"
    body = pipeline.evaluate(data)
    docs = _docs(body)
    assert docs["MATERNITY_APPLICATION_ANNEX6"] == "APP-DOC-003"
    assert docs["PAYER_CERTIFICATE_Z3_OR_Z3A"] == "APP-DOC-003"
    assert docs["DUE_DATE_MEDICAL_CERTIFICATE"] == "APP-DOC-001"
    assert docs["CHILD_DATA_FOR_ZUS_REGISTRY_LOOKUP"] == "APP-DOC-002"
    assert docs["OTHER_PARENT_PLANS_STATEMENT"] == "APP-DOC-006"
    lookup = next(d for d in body["missing_documents"] if d["doc_type"] == "CHILD_DATA_FOR_ZUS_REGISTRY_LOOKUP")
    assert lookup["obtainable_by_zus"] is True and lookup["submit_to"] == "ZUS"
    assert {"code": "LEAVE_APP_PARENTAL", "date": "2027-06-28", "who": "MOTHER",
            "rule_id": "APP-DL-002"} in body["deadlines"]
    assert {"code": "LEAVE_APP_MATERNITY_PRE_BIRTH", "date": "2027-02-15", "who": "MOTHER",
            "rule_id": "APP-DL-002"} in body["deadlines"]  # BE2-08: urlop od 2027-03-01, poród 2027-03-15
    codes = {w["code"] for w in body["warnings"]}
    assert {"RISK_SHAM_TITLE", "RISK_BASE_INCREASE_IN_PREGNANCY"} <= codes
    # ostrzeżenia nie zmieniają statusu (M17)
    plain = copy.deepcopy(data)
    plain["income_history"].pop("months")
    plain["insurance"]["titles"][0]["from"] = "2022-02-01"
    plain = pipeline.evaluate(plain)
    assert not any(w["rule_id"] in ("RISK-001", "RISK-002") for w in plain["warnings"])
    assert [b["status"] for b in body["benefits"]] == [b["status"] for b in plain["benefits"]]


def test_pipeline_provided_documents_are_not_missing():
    data = _fixture(evidence={"documents": [{"doc_type": "BIRTH_CERTIFICATE_SHORT", "status": "PROVIDED"}]})
    assert pipeline.evaluate(data)["missing_documents"] == []


def test_pipeline_father_only_own_segments_and_deadlines():
    data = _fixture(payer=SMALL_PAYER, person={"role": "FATHER"},
                    plan={"segments": [_seg("PARENTAL_LEAVE", "2027-07-19", "2027-12-31"),
                                       _seg("PATERNITY_LEAVE", "2027-04-01", "2027-04-14", "FATHER")]})
    body = pipeline.evaluate(data)
    assert "NO_PATERNITY_BENEFIT_FROM_OTHER_TITLE_STATEMENT" in _docs(body)
    assert "OTHER_PARENT_PLANS_STATEMENT" not in _docs(body)  # segment rodzicielski matki
    assert [d["code"] for d in body["deadlines"]] == ["LEAVE_APP_PATERNITY"]
    assert not any(w["rule_id"].startswith("RISK-") for w in body["warnings"])  # ryzyka ciąży - tylko matka


def test_pipeline_adoption_documents():
    data = _fixture(event={"type": "ADOPTION", "date": "2027-05-10"}, person={"role": "ADOPTIVE_PARENT"})
    data["children"] = {"count_at_event": 1, "items": [{"birth_date": "2024-01-10"}]}
    docs = _docs(pipeline.evaluate(data))
    assert docs.get("CHILD_ACCEPTANCE_DATE_STATEMENT") == "APP-DOC-005"
    assert docs.get("COURT_ADOPTION_APPLICATION_CONFIRMATION") == "APP-DOC-005"
    assert "BIRTH_CERTIFICATE_SHORT" not in docs


def test_pipeline_sickness_documents_zus_payer():
    body = pipeline.evaluate(_fixture("pregnant_sick_employee", payer=SMALL_PAYER))
    docs = _docs(body)
    assert docs == {"E_ZLA": "SICK-DOC-001", "PAYER_CERTIFICATE_Z3": "SICK-DOC-001"}
    assert pipeline.evaluate(_fixture("pregnant_sick_employee"))["missing_documents"][0]["doc_type"] == "E_ZLA"


def test_guidance_refused_benefits_have_no_documents():
    from app.engine.pipeline.engine import Engine
    from app.engine.pipeline.guidance import guidance

    eng = Engine(pipeline.ruleset(), _ctx(_fixture()))
    refused = [{"benefit_type": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE", "status": "NOT_ELIGIBLE",
                "payer_of_benefit": "CONTRIBUTION_PAYER"}]
    assert guidance(eng, refused) == {"missing_documents": [], "deadlines": []}
    refused[0]["status"] = "NEEDS_DATA"  # brak danych to nie odmowa - dokumenty i terminy zostają
    result = guidance(eng, refused)
    assert result["missing_documents"] and result["deadlines"]
