import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.params import STORE
from app.main import app

REPO = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True, scope="session")
def _isolated_parameter_overrides(tmp_path_factory):
    """BE2-05: testy nie czytają ani nie zapisują lokalnych nadpisań parametrów (backend/data/)."""
    STORE.use_file(tmp_path_factory.mktemp("params") / "overrides.json")
    yield
    STORE.use_file(None)


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def demo_payload() -> dict:
    return json.loads((REPO / "demo" / "scenario_employee_mother.json").read_text(encoding="utf-8"))
