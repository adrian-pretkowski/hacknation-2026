"""BE2-06: sprawy - lista, szczegóły, ewaluacja z porównaniem z ``expected``, upload PDF, ``insurance_verification``.

Kryteria: sprawa syntetyczna daje „zgodne ✓” (MATCH / MATCH_WITH_TOLERANCE); upload PDF zwraca listę brakujących pól
(NEEDS_DATA) bez zapisu pliku; odpowiedzi zgodne z kontraktem. Tylko dane syntetyczne (``demo/cases``).
"""
import copy
import hashlib
import json
from pathlib import Path

import pytest

from app.engine import pipeline
from app.modules.cases import service
from tests.test_contract import _validator

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = json.loads((ROOT / "zus_rules" / "08_TEST_CASES.json").read_text(encoding="utf-8"))["fixtures"]
PDF = b"%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n"


def _upload(client, content: bytes, name: str = "wniosek.pdf", mime: str = "application/pdf"):
    return client.post("/api/cases/upload", files={"file": (name, content, mime)})


# ------------------------------------------------------------ lista i szczegóły
def test_list_cases_contract_and_synthetic_only(client):
    body = client.get("/api/cases").json()
    assert not list(_validator("CaseList").iter_errors(body))
    ids = {item["case_id"] for item in body["items"]}
    assert {"synthetic-employee-mother", "synthetic-self-employed-mother", "synthetic-pregnant-sick-employee",
            "synthetic-contract-expired"} <= ids
    assert {item["source"] for item in body["items"]} == {"SYNTHETIC"}


def test_get_case_and_404(client):
    body = client.get("/api/cases/synthetic-employee-mother").json()
    assert not list(_validator("CaseDetail").iter_errors(body))
    assert body["input"]["event"]["type"] == "BIRTH" and body["expected"]["total_amount"] == "22820.00"
    missing = client.get("/api/cases/nie-ma")
    assert missing.status_code == 404
    assert missing.headers["content-type"].startswith("application/problem+json")
    assert client.post("/api/cases/nie-ma/evaluate").status_code == 404


# ------------------------------------------------------------ ewaluacja i porównanie
@pytest.mark.parametrize(("case_id", "overall"), [
    ("synthetic-employee-mother", "MATCH"),
    ("synthetic-self-employed-mother", "MATCH_WITH_TOLERANCE"),  # 20134,3333… vs „decyzja” 20134,33
    ("synthetic-pregnant-sick-employee", "MATCH"),
    ("synthetic-contract-expired", "MATCH"),                     # zgodna odmowa (brak ubezpieczenia w dniu porodu)
])
def test_BE2_06_synthetic_cases_match(client, case_id, overall):
    body = client.post(f"/api/cases/{case_id}/evaluate").json()
    assert not list(_validator("CaseEvaluation").iter_errors(body))
    assert body["overall_match"] == overall, body["comparison"]
    assert body["result"]["insurance_verification"]["rule_ids"]


def test_compare_tolerance_boundaries():
    # podstawa: ±0,01 zł; kwota łączna: ±0,01 zł × dni
    assert service._compare("base_amount", "6000.00", "6000.01", 140)["match_with_tolerance"] is True
    assert service._compare("base_amount", "6000.00", "6000.02", 140)["match_with_tolerance"] is False
    assert service._compare("total_amount", "22820.00", "22821.40", 140)["match_with_tolerance"] is True
    assert service._compare("total_amount", "22820.00", "22821.41", 140)["match_with_tolerance"] is False
    exact = service._compare("rate", "1.00", "1", None)
    assert exact["match"] is True and exact["match_with_tolerance"] is None
    assert service._compare("total_amount", "100.00", None, None)["match"] is False  # brak kwoty → niezgodne


def test_mismatch_and_no_expected(monkeypatch):
    cases = copy.deepcopy(service._load_cases())
    cases["synthetic-employee-mother"]["expected"]["rate"] = "1.00"
    cases["no-expected"] = {**cases["synthetic-employee-mother"], "case_id": "no-expected", "expected": None}
    monkeypatch.setattr(service, "_load_cases", lambda: cases)
    body = service.evaluate_case("synthetic-employee-mother")
    assert body["overall_match"] == "MISMATCH"
    assert [c["field"] for c in body["comparison"] if not c["match"]] == ["rate"]
    assert service.evaluate_case("no-expected")["overall_match"] == "NO_EXPECTED"


# ------------------------------------------------------------ upload
def test_BE2_06_upload_unknown_pdf_returns_missing_fields(client):
    response = _upload(client, PDF)
    assert response.status_code == 200
    body = response.json()
    assert not list(_validator("CaseUploadResult").iter_errors(body))
    assert body["extraction_method"] == "MANUAL_REQUIRED"
    assert body["extracted_input"]["event"]["type"] == "BIRTH"
    assert body["extracted_input"]["person"]["role"] == "MOTHER"
    assert {"event.date", "insurance.titles"} <= set(body["missing_fields"])
    assert any("Status: NEEDS_DATA" in w for w in body["warnings"])


def test_upload_known_pdf_fixture_match(client, monkeypatch):
    cases = copy.deepcopy(service._load_cases())
    cases["synthetic-employee-mother"]["documents_sha256"] = [hashlib.sha256(PDF).hexdigest()]
    monkeypatch.setattr(service, "_load_cases", lambda: cases)
    body = _upload(client, PDF).json()
    assert body["extraction_method"] == "FIXTURE_MATCH"
    assert body["extracted_input"]["event"]["date"] == "2027-03-15"


@pytest.mark.parametrize(("content", "mime", "status"), [
    (b"to nie jest PDF", "text/plain", 415),
    (b"%PDF-" + b"0" * (10 * 1024 * 1024), "application/pdf", 413),
])
def test_upload_rejects_non_pdf_and_too_large(client, content, mime, status):
    response = _upload(client, content, mime=mime)
    assert response.status_code == status
    assert response.headers["content-type"].startswith("application/problem+json")


def test_upload_without_multipart_415(client):
    assert client.post("/api/cases/upload", json={"file": "x"}).status_code == 415


# ------------------------------------------------------------ insurance_verification (wymóg § 4)
def test_insurance_verification_typical_not_insured_and_unknown():
    body = pipeline.evaluate(FIXTURES["employee_mother"])["insurance_verification"]
    assert (body["sickness_insured_on_event_date"], body["insurance_mode"], body["waiting_period_met"]) == \
        ("TRUE", "MANDATORY", "NOT_REQUIRED")
    assert body["continuous_insurance_days"] > 0 and "MAT-CLS-001" in body["rule_ids"]
    expired = copy.deepcopy(FIXTURES["employee_mother"])
    expired["insurance"]["titles"][0]["to"] = "2026-12-31"
    body = pipeline.evaluate(expired)["insurance_verification"]
    assert (body["sickness_insured_on_event_date"], body["insurance_mode"]) == ("FALSE", "NONE")
    unknown = copy.deepcopy(FIXTURES["employee_mother"])
    unknown["insurance"] = {}
    body = pipeline.evaluate(unknown)["insurance_verification"]
    assert body["sickness_insured_on_event_date"] == "UNKNOWN" and body["insurance_mode"] is None


def test_insurance_verification_sickness_waiting_period_boundary():
    data = copy.deepcopy(FIXTURES["pregnant_sick_employee"])
    start = data["incapacity"]["start_date"]
    body = pipeline.evaluate(data)["insurance_verification"]
    assert body["waiting_period_met"] == "TRUE" and "SICK-ELIG-002" in body["rule_ids"]
    # tytuł od 10 dni przed niezdolnością - okres wyczekiwania 30 dni nie upłynął
    from datetime import date, timedelta
    data["insurance"]["titles"][0]["from"] = (date.fromisoformat(start) - timedelta(days=10)).isoformat()
    assert pipeline.evaluate(data)["insurance_verification"]["waiting_period_met"] == "FALSE"
    data["incapacity"]["cause"] = "COMMUTE_ACCIDENT"  # art. 4 ust. 3 - bez okresu wyczekiwania (SICK-ELIG-005)
    body = pipeline.evaluate(data)["insurance_verification"]
    assert body["waiting_period_met"] == "NOT_REQUIRED" and "SICK-ELIG-005" in body["rule_ids"]
