"""BE1-02: prymitywy pipeline'u — tryby FUTURE/BLOCKED/HUMAN_REVIEW, fakty spoza rejestru, overrides, DT-9, router."""
from datetime import date
from decimal import Decimal

import pytest

from app.core.config import get_settings
from app.engine.dsl import parse_ruleset
from app.engine.facts import Context, fact
from app.engine.pipeline.engine import Engine, aggregate_status

RULES = """
meta: {parameters: {P: {value: 1}}}
rules:
- {id: A-FUT, rule_type: RATE, evaluation: FUTURE, valid_from: "2027-01-01",
   conditions: {all: [{field: x.a, operator: eq, value: 1}]}, result: {}}
- {id: A-LATER, rule_type: RATE, evaluation: ACTIVE, valid_from: "2030-01-01",
   conditions: {all: [{field: x.a, operator: eq, value: 1}]}, result: {}}
- {id: A-OLD, rule_type: RATE, evaluation: ACTIVE, valid_to: "2020-01-01",
   conditions: {all: [{field: x.a, operator: eq, value: 1}]}, result: {}}
- {id: B-BLK, rule_type: DURATION, evaluation: BLOCKED,
   conditions: {all: [{field: x.b, operator: eq, value: 1}]}, result: {}}
- {id: B-HR, rule_type: ELIGIBILITY, evaluation: HUMAN_REVIEW,
   conditions: {all: [{field: x.a, operator: eq, value: 2}]}, result: {}}
- {id: C-NOFACT, rule_type: RATE, evaluation: ACTIVE,
   conditions: {all: [{fact: f_not_in_registry_yet, operator: eq, value: true}]}, result: {}}
- {id: R-BASE, rule_type: RATE, evaluation: ACTIVE, overrides: [],
   conditions: {all: [{field: x.a, operator: eq, value: 1}]}, result: {}}
- {id: R-OVR, rule_type: RATE, evaluation: ACTIVE, overrides: [R-BASE],
   conditions: {all: [{fact: f_pipe_flag, operator: eq, value: true}]}, result: {}}
- {id: E-BASE, rule_type: ELIGIBILITY, evaluation: ACTIVE, exceptions: [E-EXCL, E-ALT],
   conditions: {all: [{field: x.a, operator: eq, value: 1}]}, result: {}}
- {id: E-EXCL, rule_type: EXCLUSION, evaluation: ACTIVE,
   conditions: {all: [{field: x.debt, operator: gt, value: {param: P}}]}, result: {}}
- {id: E-ALT, rule_type: ELIGIBILITY, evaluation: ACTIVE,
   conditions: {all: [{field: x.alt, operator: eq, value: true}]}, result: {}}
"""


@fact("f_pipe_flag")
def _flag(ctx: Context):
    flag = ctx.field("x.flag")
    return ctx.need("x.flag") if flag is None else flag


def _engine(x: dict, as_of=date(2026, 11, 21)) -> Engine:
    return Engine(parse_ruleset(RULES), Context(input={"x": x}, as_of=as_of, params={"P": Decimal(1)}.__getitem__))


def test_future_rule_is_skipped_and_reported():
    eng = _engine({"a": 1})
    assert eng.eval("A-FUT").kind == "FUTURE_SKIPPED"
    assert eng.eval("A-LATER").kind == "FUTURE_SKIPPED"
    assert eng.future == [{"rule_id": "A-FUT", "valid_from": "2027-01-01"},
                          {"rule_id": "A-LATER", "valid_from": "2030-01-01"}]


def test_rule_with_valid_from_in_past_runs():
    assert _engine({"a": 1}, as_of=date(2030, 1, 2)).eval("A-LATER").fired


def test_expired_rule_not_applicable():
    assert _engine({"a": 1}).eval("A-OLD").kind == "NOT_APPLICABLE"


@pytest.mark.parametrize(("x", "kind"), [({"b": 1}, "BLOCKED"), ({}, "UNKNOWN"), ({"b": 2}, "NOT_FIRED")])
def test_blocked_true_goes_to_review_missing_input_asks_first(x, kind):
    eng = _engine(x)
    assert eng.eval("B-BLK").kind == kind
    assert (eng.review == ["B-BLK"]) is (kind == "BLOCKED")


def test_human_review_true_goes_to_review():
    eng = _engine({"a": 2})
    assert eng.eval("B-HR").kind == "BLOCKED" and eng.review == ["B-HR"]


def test_rule_with_unregistered_fact_is_not_evaluated_not_false():
    eng = _engine({"a": 1})
    assert eng.eval("C-NOFACT").kind == "NOT_EVALUATED"
    assert eng.not_evaluated == ["C-NOFACT"] and "C-NOFACT" not in eng.trace


@pytest.mark.parametrize(("flag", "winner", "unknown"), [(True, "R-OVR", []), (False, "R-BASE", []),
                                                         (None, "R-BASE", ["R-OVR"])])
def test_overrides_pick(flag, winner, unknown):
    x = {"a": 1} if flag is None else {"a": 1, "flag": flag}
    picked, unknown_overriders = _engine(x).pick(["R-BASE", "R-OVR"])
    assert picked.rule_id == winner
    assert [o.rule_id for o in unknown_overriders] == unknown


def test_exceptions_split_into_exclusions_and_alternatives():
    eng = _engine({"a": 1, "debt": 5})
    assert [o.rule_id for o in eng.exclusions("E-BASE")] == ["E-EXCL"]
    assert eng.exclusions("E-BASE")[0].fired
    assert [o.rule_id for o in eng.alternatives("E-BASE")] == ["E-ALT"]


def test_trace_and_missing_data():
    eng = _engine({"a": 1})
    outcome = eng.eval("E-EXCL")
    eng.need_from(outcome)
    assert outcome.unknown and eng.missing_data() == [{"field": "x.debt", "rule_ids": ["E-EXCL"]}]
    assert eng.applied_trace() == [{"rule_id": "E-EXCL", "outcome": "UNKNOWN"}]


@pytest.mark.parametrize(("kwargs", "status"), [
    ({"out_of_scope": True, "excluded": True}, "OUT_OF_SCOPE"),
    ({"excluded": True, "review": True, "needs_data": True}, "NOT_ELIGIBLE"),
    ({"review": True, "needs_data": True, "eligible": True}, "NEEDS_REVIEW"),
    ({"needs_data": True, "eligible": True}, "NEEDS_DATA"),
    ({"eligible": None}, "NEEDS_DATA"),
    ({"eligible": True}, "ELIGIBLE"),
    ({"eligible": False}, "NOT_ELIGIBLE"),
])
def test_dt9_aggregation(kwargs, status):
    assert aggregate_status(**kwargs) == status


def test_router_engine_switch(client, demo_payload, monkeypatch):
    assert client.post("/api/evaluate", json=demo_payload).json()["engine"] == "rules-engine"
    monkeypatch.setattr(get_settings(), "engine", "slice")
    assert client.post("/api/evaluate", json=demo_payload).json()["engine"] == "slice-v0"


def test_pipeline_response_has_trace(client, demo_payload):
    body = client.post("/api/evaluate", json=demo_payload).json()
    outcomes = {item["rule_id"]: item["outcome"] for item in body["applied_rules"]}
    assert outcomes["MAT-ELIG-001"] == "FIRED" and outcomes["RATE-MAT-003"] == "FIRED"
    assert outcomes["GEN-EXCL-001"] == "NOT_FIRED"
    # BLOCKED: count_at_birth > 1 = FALSE rozstrzyga bez faktów spoza rejestru
    assert outcomes["MAT-DUR-005"] == "NOT_FIRED"
    assert "MAT-DUR-003" in body["not_evaluated_rules"]  # martwe urodzenie: fakty BE2-01 jeszcze nie w rejestrze
