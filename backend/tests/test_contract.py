"""Zgodność działającego API z contracts/openapi.yaml (ścieżki + schematy odpowiedzi + przykłady)."""
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

REPO = Path(__file__).resolve().parents[2]
SPEC = yaml.safe_load((REPO / "contracts" / "openapi.yaml").read_text(encoding="utf-8"))
REGISTRY = Registry().with_resource("urn:openapi", Resource.opaque(SPEC))


def _validator(component: str) -> Draft202012Validator:
    schema = {"$ref": f"urn:openapi#/components/schemas/{component}"}
    return Draft202012Validator(schema, registry=REGISTRY)


def test_paths_match_implementation(client):
    generated = client.app.openapi()["paths"]
    implemented = {(path, method) for path, ops in generated.items() for method in ops if path.startswith("/api/")}
    declared = {(path, method) for path, ops in SPEC["paths"].items() for method in ops}
    assert implemented == declared


def test_health_matches_contract(client):
    _validator("Health").validate(client.get("/api/health").json())


def test_evaluate_matches_contract(client, demo_payload):
    _validator("EvaluateRequest").validate(demo_payload)
    _validator("EvaluateResponse").validate(client.post("/api/evaluate", json=demo_payload).json())


def test_contract_examples_are_valid():
    post = SPEC["paths"]["/api/evaluate"]["post"]
    for example in post["requestBody"]["content"]["application/json"]["examples"].values():
        _validator("EvaluateRequest").validate(example["value"])
    for example in post["responses"]["200"]["content"]["application/json"]["examples"].values():
        _validator("EvaluateResponse").validate(example["value"])
    _validator("Problem").validate(post["responses"]["422"]["content"]["application/problem+json"]["example"])


def test_problem_response_matches_contract(client):
    response = client.post("/api/evaluate", json={"event": {"type": "BIRTH", "date": "x"}})
    _validator("Problem").validate(response.json())
