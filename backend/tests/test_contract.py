"""Zgodność działającego API z contracts/openapi.yaml (INT-01).

Sprawdza: zaimplementowane ⊆ zadeklarowane, zgodność x-status z implementacją, poprawność schematów i wszystkich
przykładów, zgodność modeli z zus_rules/04 i 05 (drift), oznaczenie symulacji, odpowiedzi działających endpointów.
"""
import json
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

REPO = Path(__file__).resolve().parents[2]
SPEC = yaml.safe_load((REPO / "contracts" / "openapi.yaml").read_text(encoding="utf-8"))
S04 = json.loads((REPO / "zus_rules" / "04_INPUT_DATA_SCHEMA.json").read_text(encoding="utf-8"))
S05 = json.loads((REPO / "zus_rules" / "05_OUTPUT_DATA_SCHEMA.json").read_text(encoding="utf-8"))
REGISTRY = Registry().with_resource("urn:openapi", Resource.opaque(SPEC))
SCHEMAS = SPEC["components"]["schemas"]
METHODS = {"get", "post", "put", "patch", "delete"}
OPERATIONS = [
    (path, method, op) for path, ops in SPEC["paths"].items() for method, op in ops.items() if method in METHODS
]


def _validator_for(schema: dict) -> Draft202012Validator:
    return Draft202012Validator(_to_urn(schema), registry=REGISTRY)


def _validator(component: str) -> Draft202012Validator:
    return _validator_for({"$ref": f"#/components/schemas/{component}"})


def _to_urn(node):
    if isinstance(node, dict):
        return {k: (f"urn:openapi{v}" if k == "$ref" and v.startswith("#/") else _to_urn(v)) for k, v in node.items()}
    if isinstance(node, list):
        return [_to_urn(x) for x in node]
    return node


def _implemented(client) -> set[tuple[str, str]]:
    generated = client.app.openapi()["paths"]
    return {(path, method) for path, ops in generated.items() for method in ops if path.startswith("/api/")}


# --- ścieżki i statusy -------------------------------------------------------------------------------------------
def test_implemented_subset_of_declared(client):
    declared = {(path, method) for path, method, _ in OPERATIONS}
    assert _implemented(client) <= declared, "Endpoint działa, ale nie ma go w kontrakcie — najpierw kontrakt"


def test_x_status_matches_implementation(client):
    implemented = _implemented(client)
    for path, method, op in OPERATIONS:
        status = op.get("x-status")
        assert status in {"implemented", "planned"}, f"{method.upper()} {path}: brak x-status"
        if (path, method) in implemented:
            assert status == "implemented", f"{method.upper()} {path} działa — zmień x-status na implemented"
        else:
            assert status == "planned", f"{method.upper()} {path} nie działa — nie może mieć x-status implemented"
            assert op.get("x-task") and op.get("x-owner"), f"{method.upper()} {path}: planned bez x-task/x-owner"


def test_operation_ids_unique():
    ids = [op["operationId"] for _, _, op in OPERATIONS]
    assert len(ids) == len(set(ids))


# --- schematy i przykłady ----------------------------------------------------------------------------------------
@pytest.mark.parametrize("name", sorted(SCHEMAS))
def test_component_schema_is_valid(name):
    Draft202012Validator.check_schema(SCHEMAS[name])


def _examples():
    for path, method, op in OPERATIONS:
        bodies = [("request", op.get("requestBody", {}).get("content", {}))]
        bodies += [(f"response {code}", resp.get("content", {})) for code, resp in op.get("responses", {}).items()]
        for where, content in bodies:
            for media in content.values():
                schema = media.get("schema")
                if "example" in media:
                    yield f"{method.upper()} {path} {where}", schema, media["example"]
                for name, ex in media.get("examples", {}).items():
                    yield f"{method.upper()} {path} {where} [{name}]", schema, ex["value"]


EXAMPLES = list(_examples())


@pytest.mark.parametrize("label,schema,example", EXAMPLES, ids=[e[0] for e in EXAMPLES])
def test_contract_examples_are_valid(label, schema, example):
    _validator_for(schema).validate(example)


def test_frontend_mock_matches_contract():
    mock = json.loads((REPO / "frontend" / "src" / "mocks" / "evaluate.eligible.json").read_text(encoding="utf-8"))
    _validator("EvaluateResponse").validate(mock)


# --- zgodność z zus_rules (drift) ---------------------------------------------------------------------------------
def test_request_model_covers_04():
    assert set(SCHEMAS["EvaluateRequest"]["properties"]) == set(S04["properties"])
    assert {f"In{name}" for name in S04["$defs"]} <= set(SCHEMAS)


def test_response_model_covers_05():
    assert set(S05["properties"]) <= set(SCHEMAS["EvaluateResponse"]["properties"])
    assert set(S05["$defs"]["Benefit"]["properties"]) <= set(SCHEMAS["Benefit"]["properties"])
    assert {f"Out{name}" for name in S05["$defs"]} <= set(SCHEMAS)


def test_simulations_are_marked():
    for path, _method, op in OPERATIONS:
        if not path.startswith("/api/sim/"):
            continue
        assert op.get("x-simulation") is True and "SYMULACJA" in op["summary"], f"{path}: brak oznaczenia symulacji"
        ref = op["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].split("/")[-1]
        assert SCHEMAS[ref]["properties"]["simulated"].get("const") is True, f"{ref}: simulated musi mieć const true"
        assert "simulated" in SCHEMAS[ref]["required"], f"{ref}: simulated musi być wymagane"


# --- działające endpointy ----------------------------------------------------------------------------------------
def test_health_matches_contract(client):
    _validator("Health").validate(client.get("/api/health").json())


def test_evaluate_matches_contract(client, demo_payload):
    _validator("EvaluateRequest").validate(demo_payload)
    _validator("EvaluateResponse").validate(client.post("/api/evaluate", json=demo_payload).json())


def test_problem_response_matches_contract(client):
    response = client.post("/api/evaluate", json={"event": {"type": "BIRTH", "date": "x"}})
    _validator("Problem").validate(response.json())
