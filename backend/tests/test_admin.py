"""BE2-05: panel admina parametrów - GET/PUT /api/admin/parameters (kontrakt ParameterList / ParameterUpdate).

Kryterium akceptacji: zmiana MAT_RATE_COMBINED zmienia wynik /api/evaluate bez restartu. Dodatkowo: dostęp bez
tokenu (demo), konflikt wersji (409), walidacja (422), valid_from (wartość obowiązuje od daty), trwałość w pliku JSON.
"""
from datetime import date
from decimal import Decimal

import pytest

from app.core.params import STORE, param
from tests.test_contract import _validator


@pytest.fixture(autouse=True)
def _admin(tmp_path):
    STORE.use_file(tmp_path / "overrides.json")
    yield
    STORE.use_file(tmp_path / "empty.json")  # następne testy bez nadpisań


def _put(client, *changes, base=None):
    body = {"base_parameters_version": base or client.get("/api/admin/parameters").json()[
        "parameters_version"], "changes": list(changes)}
    return client.put("/api/admin/parameters", json=body)


def _by_name(body: dict) -> dict:
    return {p["name"]: p for p in body["parameters"]}


def test_list_parameters_matches_contract(client):
    response = client.get("/api/admin/parameters")
    assert response.status_code == 200
    body = response.json()
    assert not list(_validator("ParameterList").iter_errors(body))
    assert body["parameters_version"] == 1
    rate = _by_name(body)["MAT_RATE_COMBINED"]
    assert (rate["value"], rate["overridden"], rate["version"]) == ("0.815", False, 1)
    assert _by_name(body)["MATERNITY_WEEKS_BY_CHILDREN"]["value"]["1"] == 20


def test_admin_open_without_token(client):
    """Demo: panel admina dostępny bezpośrednio - bez nagłówka X-Admin-Token."""
    assert client.get("/api/admin/parameters").status_code == 200
    response = client.put("/api/admin/parameters", json={"base_parameters_version": 1, "changes": []})
    assert response.status_code == 422  # walidacja treści, nie 401


def test_BE2_05_rate_change_changes_evaluation_without_restart(client, demo_payload):
    before = client.post("/api/evaluate", json=demo_payload).json()["benefits"][0]
    assert (before["rate"], before["daily_amount_exact"]) == ("0.815", "163")
    response = _put(client, {"name": "MAT_RATE_COMBINED", "value": "0.9", "valid_from": None,
                             "reason": "Demo - zmiana stawki (test BE2-05)"})
    assert response.status_code == 200
    body = response.json()
    assert not list(_validator("ParameterList").iter_errors(body))
    rate = _by_name(body)["MAT_RATE_COMBINED"]
    assert (rate["value"], rate["overridden"], rate["version"], body["parameters_version"]) == ("0.9", True, 2, 2)
    after = client.post("/api/evaluate", json=demo_payload).json()["benefits"][0]
    assert after["rate"] == "0.9"
    assert Decimal(after["daily_amount_exact"]) == Decimal(before["daily_amount_exact"]) / Decimal("0.815") * \
        Decimal("0.9")


def test_valid_from_applies_from_date(client):
    _put(client, {"name": "MAT_RATE_COMBINED", "value": "0.85", "valid_from": "2027-01-01", "reason": "Od 2027"})
    assert param("MAT_RATE_COMBINED", date(2026, 12, 31)) == Decimal("0.815")
    assert param("MAT_RATE_COMBINED", date(2027, 1, 1)) == Decimal("0.85")  # dzień graniczny
    # nowsza wersja wygrywa w swoim okresie
    _put(client, {"name": "MAT_RATE_COMBINED", "value": "0.8", "valid_from": "2027-06-01", "reason": "Od czerwca"})
    assert param("MAT_RATE_COMBINED", date(2027, 5, 31)) == Decimal("0.85")
    assert param("MAT_RATE_COMBINED", date(2027, 6, 1)) == Decimal("0.8")


def test_version_conflict_409(client):
    assert _put(client, {"name": "PATERNITY_WEEKS", "value": 3, "reason": "Test wersji"}).status_code == 200
    stale = _put(client, {"name": "PATERNITY_WEEKS", "value": 4, "reason": "Stara wersja"}, base=1)
    assert stale.status_code == 409
    assert stale.headers["content-type"].startswith("application/problem+json")
    assert param("PATERNITY_WEEKS") == 3


@pytest.mark.parametrize(("change", "field"), [
    ({"name": "NIE_MA", "value": "1", "reason": "Test"}, "changes.0.name"),
    ({"name": "MAT_RATE_COMBINED", "value": "abc", "reason": "Test"}, "changes.0.value"),
    ({"name": "PATERNITY_WEEKS", "value": "2.5", "reason": "Test"}, "changes.0.value"),
    ({"name": "MATERNITY_WEEKS_BY_CHILDREN", "value": {"1": 20}, "reason": "Test"}, "changes.0.value"),
    ({"name": "PUBLIC_HOLIDAYS", "value": "2027-01-01", "reason": "Test"}, "changes.0.value"),
    ({"name": "MAT_RATE_COMBINED", "value": "0.9", "reason": "x"}, "changes.0.reason"),
    ({"name": "MAT_RATE_COMBINED", "value": "0.9", "valid_from": "31.12.2026", "reason": "Test"},
     "changes.0.valid_from"),
])
def test_invalid_change_422_and_nothing_saved(client, change, field):
    response = _put(client, change)
    assert response.status_code == 422
    body = response.json()
    assert body["errors"][0]["field"] == field
    assert client.get("/api/admin/parameters").json()["parameters_version"] == 1


def test_batch_is_atomic(client):
    response = _put(client, {"name": "MAT_RATE_COMBINED", "value": "0.9", "reason": "Poprawna"},
                    {"name": "NIE_MA", "value": "1", "reason": "Błędna"})
    assert response.status_code == 422
    assert param("MAT_RATE_COMBINED") == Decimal("0.815")


def test_overrides_persist_in_json_file(client, tmp_path):
    _put(client, {"name": "MATERNITY_WEEKS_BY_CHILDREN",
                  "value": {"1": 21, "2": 31, "3": 33, "4": 35, "5+": 37}, "reason": "Trwałość"})
    STORE.use_file(tmp_path / "overrides.json")  # ponowny odczyt z pliku (jak po restarcie)
    assert param("MATERNITY_WEEKS_BY_CHILDREN")["1"] == 21
    assert STORE.version == 2


# ------------------------------------------------------------------ BE2-13: zakresy wartości, reset, 500 jako problem
@pytest.mark.parametrize("change", [
    {"name": "MONTH_AS_DAYS", "value": 0},
    {"name": "MONTH_AS_DAYS", "value": -5},
    {"name": "WEEK_AS_DAYS", "value": "0"},
    {"name": "MAT_RATE_FULL", "value": "-5"},
    {"name": "MAT_RATE_COMBINED", "value": "1.5"},
    {"name": "CONTRIBUTION_DEDUCTION_RATE", "value": "2"},
    {"name": "PARENTAL_BENEFIT_FLOOR_MONTHLY", "value": "0"},
    {"name": "MIN_BASE_ROUNDING_STEP", "value": "-0.01"},
    {"name": "MATERNITY_WEEKS_BY_CHILDREN", "value": {"1": -3, "2": 31, "3": 33, "4": 35, "5+": 37}},
    {"name": "MATERNITY_WEEKS_BY_CHILDREN", "value": {"1": 10 ** 9, "2": 31, "3": 33, "4": 35, "5+": 37}},
    {"name": "PARENTAL_WEEKS_SINGLE", "value": 10 ** 9},
])
def test_BE2_13_out_of_range_422_and_nothing_saved(client, change):
    response = _put(client, {**change, "reason": "Test zakresu"})
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["errors"][0]["code"] == "out_of_range"
    assert client.get("/api/admin/parameters").json()["parameters_version"] == 1


@pytest.mark.parametrize("change", [
    {"name": "MAT_RATE_COMBINED", "value": "1"},  # granica stawki
    {"name": "MAT_RATE_PARENTAL", "value": "0"},
    {"name": "RISK_INCREASE_FACTOR", "value": "2"},  # współczynnik > 1 w bazie - górna granica 10 × baza
    {"name": "PATERNITY_WEEKS", "value": 1},
    {"name": "AVERAGE_WAGE_CAP_AFTER_TITLE", "value": "9000.00"},  # parametr bez wartości bazowej
])
def test_BE2_13_values_in_range_accepted(client, change):
    assert _put(client, {**change, "reason": "Test zakresu"}).status_code == 200


def test_BE2_13_reset_restores_ruleset_values(client, demo_payload):
    before = client.post("/api/evaluate", json=demo_payload).json()["benefits"][0]["daily_amount_exact"]
    _put(client, {"name": "MAT_RATE_COMBINED", "value": "0.9", "reason": "Przed resetem"})
    response = client.delete("/api/admin/parameters")
    assert response.status_code == 200
    body = response.json()
    assert not list(_validator("ParameterList").iter_errors(body))
    assert body["parameters_version"] == 3  # reset to nowa wersja - stare formularze dostaną 409
    assert not any(p["overridden"] for p in body["parameters"])
    assert param("MAT_RATE_COMBINED") == Decimal("0.815")
    assert client.post("/api/evaluate", json=demo_payload).json()["benefits"][0]["daily_amount_exact"] == before


def test_BE2_13_unhandled_error_is_problem_json(monkeypatch):
    from fastapi.testclient import TestClient

    import app.modules.admin.router as admin_router
    from app.main import app

    def boom(*_args, **_kwargs):
        raise RuntimeError("awaria testowa")

    monkeypatch.setattr(admin_router, "parameter_list", boom)
    response = TestClient(app, raise_server_exceptions=False).get("/api/admin/parameters")
    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/problem+json")
    assert "awaria" not in response.text
