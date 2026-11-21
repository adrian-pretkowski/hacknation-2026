"""BE2-05: panel admina parametrów - GET/PUT /api/admin/parameters (kontrakt ParameterList / ParameterUpdate).

Kryterium akceptacji: zmiana MAT_RATE_COMBINED zmienia wynik /api/evaluate bez restartu. Dodatkowo: token (401),
konflikt wersji (409), walidacja (422), valid_from (wartość obowiązuje od daty), trwałość w pliku JSON.
"""
from datetime import date
from decimal import Decimal

import pytest

from app.core.config import get_settings
from app.core.params import STORE, param
from tests.test_contract import _validator

TOKEN = "test-admin-token"
AUTH = {"X-Admin-Token": TOKEN}


@pytest.fixture(autouse=True)
def _admin(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_token", TOKEN)
    STORE.use_file(tmp_path / "overrides.json")
    yield
    STORE.use_file(tmp_path / "empty.json")  # następne testy bez nadpisań


def _put(client, *changes, base=None):
    body = {"base_parameters_version": base or client.get("/api/admin/parameters", headers=AUTH).json()[
        "parameters_version"], "changes": list(changes)}
    return client.put("/api/admin/parameters", json=body, headers=AUTH)


def _by_name(body: dict) -> dict:
    return {p["name"]: p for p in body["parameters"]}


def test_list_parameters_matches_contract(client):
    response = client.get("/api/admin/parameters", headers=AUTH)
    assert response.status_code == 200
    body = response.json()
    assert not list(_validator("ParameterList").iter_errors(body))
    assert body["parameters_version"] == 1
    rate = _by_name(body)["MAT_RATE_COMBINED"]
    assert (rate["value"], rate["overridden"], rate["version"]) == ("0.815", False, 1)
    assert _by_name(body)["MATERNITY_WEEKS_BY_CHILDREN"]["value"]["1"] == 20


@pytest.mark.parametrize("headers", [{}, {"X-Admin-Token": "zly"}])
def test_admin_requires_token(client, headers):
    for response in (client.get("/api/admin/parameters", headers=headers),
                     client.put("/api/admin/parameters", headers=headers,
                                json={"base_parameters_version": 1, "changes": []})):
        assert response.status_code == 401
        assert response.headers["content-type"].startswith("application/problem+json")


def test_admin_disabled_without_configured_token(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_token", None)
    assert client.get("/api/admin/parameters", headers=AUTH).status_code == 401


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
    assert client.get("/api/admin/parameters", headers=AUTH).json()["parameters_version"] == 1


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
