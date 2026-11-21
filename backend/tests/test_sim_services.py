"""INT-03: serwisy symulacji — scenariusze zależne od wejścia (profil + parametry)."""
import datetime as dt
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.integrations.simulated import PROFILES, SimulatedSystems, UnknownProfileError
from app.main import app

D = dt.date
sim = SimulatedSystems(today=lambda: D(2027, 4, 5))
client = TestClient(app)


def test_int03_login_all_profiles_simulated():
    for pid in PROFILES:
        r = sim.mobywatel.login(pid)
        assert r["simulated"] is True and r["profile_id"] == pid and r["session_token"]


def test_int03_unknown_profile_raises():
    with pytest.raises(UnknownProfileError):
        sim.mobywatel.login("nie_ma")


def test_int03_zus_profile_overrides_create_scenarios():
    base = sim.zus.get_profile("employee_mother")["data"]
    assert base["payer"]["insured_count_on_nov30_prev_year"] == 85
    changed = sim.zus.get_profile("employee_mother", payer_insured_count=5, event_date=D(2027, 9, 1),
                                  base_override=Decimal("4000"))["data"]
    assert changed["payer"]["insured_count_on_nov30_prev_year"] == 5
    assert changed["event"]["date"] == "2027-09-01" and changed["income_history"]["manual_base_override"] == "4000.00"
    # override nie psuje profilu bazowego
    assert sim.zus.get_profile("employee_mother")["data"]["event"]["date"] == "2027-03-15"


@pytest.mark.parametrize("pid,count,expected", [
    ("employee_mother", None, "CONTRIBUTION_PAYER"),   # 85 > próg
    ("father_takeover", None, "ZUS"),                   # 12 <= próg
    ("employee_mother", 20, "ZUS"),                     # graniczny: równo próg → ZUS
    ("employee_mother", 21, "CONTRIBUTION_PAYER"),      # tuż nad progiem
])
def test_int03_payer_of_benefit_threshold(pid, count, expected):
    assert sim.zus.payer_of_benefit(pid, insured_count=count) == expected


def test_int03_insurance_on_event_day():
    assert sim.zus.has_insurance_on("employee_mother", D(2027, 3, 15))
    assert not sim.zus.has_insurance_on("gap_in_insurance", D(2026, 8, 15))  # w przerwie


def test_int03_ezla_filters_and_issue():
    all_certs = sim.ezla.list_certificates("employee_mother")["certificates"]
    assert len(all_certs) == 2
    january = sim.ezla.list_certificates("employee_mother", overlapping=(D(2027, 1, 20), D(2027, 1, 25)))
    assert [c["certificate_id"] for c in january["certificates"]] == ["EZLA-SIM-0002"]
    assert sim.ezla.list_certificates("employee_mother", code="A")["certificates"] == []
    assert sim.ezla.list_certificates("father_takeover")["certificates"] == []   # brak danych ≠ błąd
    new = sim.ezla.issue_pregnancy_leave("father_takeover", D(2027, 1, 1), D(2027, 1, 10))
    assert sim.ezla.pregnancy_days([new]) == 10
    with pytest.raises(ValueError):
        sim.ezla.issue_pregnancy_leave("father_takeover", D(2027, 1, 10), D(2027, 1, 1))


@pytest.mark.parametrize("as_of,exceeds", [
    (D(2027, 1, 15), False),   # saldo 0
    (D(2027, 2, 1), True),     # 430,50 > 1% min. wynagrodzenia (48,06)
    (D(2026, 12, 31), False),  # przed pierwszym wpisem
])
def test_int03_debt_timeline_by_as_of(as_of, exceeds):
    r = sim.debt.certificate("self_employed_debt", as_of)
    assert r["exceeds_threshold"] is exceeds and r["rule_id"] == "GEN-EXCL-001" and r["simulated"] is True


def test_int03_debt_threshold_boundary_and_override():
    threshold = Decimal(sim.debt.certificate("employee_mother", D(2027, 1, 1))["threshold"])
    equal = sim.debt.certificate("employee_mother", D(2027, 1, 1), amount_override=threshold)
    over = sim.debt.certificate("employee_mother", D(2027, 1, 1), amount_override=threshold + Decimal("0.01"))
    assert equal["exceeds_threshold"] is False and over["exceeds_threshold"] is True


def test_int03_application_zam_deadline_21_days():
    ok = sim.applications.submit("employee_mother", "ZAM", "ZUS", attachments=["MATERNITY_APPLICATION_ANNEX6",
                                 "PAYER_CERTIFICATE_Z3_OR_Z3A"], submitted_on=D(2027, 4, 5))
    assert ok["deadline_check"] == {"ok": True, "deadline": "2027-04-05", "rule_id": "APP-DL-001"}
    assert ok["missing_attachments"] == []
    late = sim.applications.submit("employee_mother", "ZAM", "ZUS", submitted_on=D(2027, 4, 6))
    assert late["deadline_check"]["ok"] is False
    assert late["missing_attachments"] == ["MATERNITY_APPLICATION_ANNEX6", "PAYER_CERTIFICATE_Z3_OR_Z3A"]


def test_int03_application_leave_attachments_depend_on_recipient():
    employer = sim.applications.submit("employee_mother", "LEAVE_PARENTAL", "EMPLOYER")
    assert employer["missing_attachments"] == ["BIRTH_CERTIFICATE_SHORT"] and employer["deadline_check"] is None
    to_zus = sim.applications.submit("employee_mother", "LEAVE_PARENTAL", "ZUS")
    assert to_zus["missing_attachments"] == []


def test_int03_deterministic_ids_and_pue():
    a = sim.pue.ask("employee_mother", "MATERNITY", "Czy akt urodzenia?")
    b = sim.pue.ask("employee_mother", "MATERNITY", "Czy akt urodzenia?")
    c = sim.pue.ask("employee_mother", "PARENTAL", "Czy akt urodzenia?")
    assert a == b and a["ticket_id"] != c["ticket_id"] and a["status"] == "RECEIVED"


def test_int03_birth_certificate_variants():
    short = sim.civil_registry.request_copy(D(2027, 3, 15), "SHORT", "ELECTRONIC")
    full = sim.civil_registry.request_copy(D(2027, 3, 15), "FULL", "REGISTRY_OFFICE_PICKUP")
    assert short["request_id"] != full["request_id"] and "skrócony" in short["note"] and "Odbiór" in full["note"]


# --- HTTP ---
def test_int03_http_happy_paths():
    assert client.post("/api/sim/mobywatel/login", json={"profile_id": "father_takeover"}).json()["role"] == "FATHER"
    assert client.get("/api/sim/zus-profile", params={"profile_id": "twins_employee"}).json()["data"][
        "children"]["count_at_birth"] == 2
    assert len(client.get("/api/sim/ezla", params={"profile_id": "employee_mother"}).json()["certificates"]) == 2
    r = client.get("/api/sim/debt-certificate", params={"profile_id": "self_employed_debt", "as_of": "2027-05-01"})
    assert r.json()["exceeds_threshold"] is True
    r = client.post("/api/sim/birth-certificate",
                    json={"birth_date": "2027-03-15", "copy_type": "SHORT", "delivery": "ELECTRONIC"})
    assert r.json()["simulated"] is True


def test_int03_http_unknown_profile_is_problem_404():
    r = client.get("/api/sim/ezla", params={"profile_id": "nie_ma"})
    assert r.status_code == 404 and r.headers["content-type"].startswith("application/problem+json")


def test_int03_http_bad_input_is_422():
    body = {"profile_id": "employee_mother", "topic": "MATERNITY", "question": "a"}
    r = client.post("/api/sim/pue-question", json=body)
    assert r.status_code == 422
