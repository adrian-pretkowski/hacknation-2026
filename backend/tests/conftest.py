import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

REPO = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def demo_payload() -> dict:
    return json.loads((REPO / "demo" / "scenario_employee_mother.json").read_text(encoding="utf-8"))
