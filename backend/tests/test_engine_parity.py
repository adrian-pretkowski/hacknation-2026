"""BE1-01/BE1-02: pipeline silnika reguł liczy zasiłek macierzyński identycznie jak slice_v0.

Warianty pokrywają T-MAT-001, T-MAT-002, T-RATE-001, T-RATE-002, T-GEN-006/007 oraz braki danych.
"""
import copy

import pytest

from app.engine import pipeline, slice_v0
from app.modules.evaluation.schemas import EvaluateRequest


def _set(path: str, value):
    def apply(payload: dict) -> None:
        node = payload
        *head, last = path.split(".")
        for key in head:
            node = node.setdefault(key, {})
        node[last] = value
    return apply


SELF_EMPLOYED = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY", "from": "2024-01-01",
                  "to": None}]

VARIANTS = {
    "T-RATE-001_demo_815": [],
    "T-RATE-002_day_22_gives_100": [_set("applications.combined_815_filed_date", "2027-04-06")],
    "T-RATE-001_day_21_boundary": [_set("applications.combined_815_filed_date", "2027-04-05")],
    "T-MAT-002_twins": [_set("children.count_at_birth", 2)],
    "MAT-DUR-001_quintuplets": [_set("children.count_at_birth", 6)],
    "planned_815_forecast": [_set("applications.combined_815_filed_date", None),
                             _set("applications.combined_815_planned", True)],
    "not_planned_815": [_set("applications.combined_815_filed_date", None),
                        _set("applications.combined_815_planned", False)],
    "no_815_info_falls_back_to_100": [_set("applications.combined_815_filed_date", None)],
    "missing_base_needs_data": [_set("income_history.manual_base_override", None)],
    "missing_children_needs_data": [_set("children.count_at_birth", None)],
    "missing_birth_date_needs_data": [_set("event.date", None)],
    # slice_v0 nie ocenia urlopu wychowawczego — pipeline pyta o employment.leaves, gdy brak/niepewne
    # ubezpieczenie w dniu porodu; w wariantach parytetu podajemy employment.leaves = [] (brak urlopu)
    "missing_titles_needs_data": [_set("insurance.titles", None), _set("employment.leaves", [])],
    "not_insured_review": [_set("insurance.titles", [{"title_type": "EMPLOYMENT_CONTRACT",
                                                      "sickness_insurance_mode": "MANDATORY",
                                                      "from": "2022-02-01", "to": "2027-02-28"}]),
                           _set("employment.leaves", [])],
    "T-GEN-006_debt_above_threshold": [_set("insurance.titles", SELF_EMPLOYED),
                                       _set("debt.amount_on_right_date", "48.07")],
    "T-GEN-007_debt_equal_threshold": [_set("insurance.titles", SELF_EMPLOYED),
                                       _set("debt.amount_on_right_date", "48.06")],
    "GEN-EXCL-001_debt_unknown": [_set("insurance.titles", SELF_EMPLOYED)],
}


def _payload(demo: dict, patches) -> dict:
    payload = copy.deepcopy(demo)
    for patch in patches:
        patch(payload)
    # ta sama normalizacja co w routerze /api/evaluate
    return EvaluateRequest.model_validate(payload).model_dump(mode="json", by_alias=True, exclude_none=False)


def _comparable(body: dict) -> dict:
    body = copy.deepcopy(body)
    for key in ("evaluation_id", "engine", "applied_rules", "future_changes", "not_evaluated_rules"):
        body.pop(key, None)
    for benefit in body["benefits"]:
        benefit.pop("applied_rules")
    return body


@pytest.mark.parametrize("name", list(VARIANTS))
def test_pipeline_matches_slice_v0(name, demo_payload):
    payload = _payload(demo_payload, VARIANTS[name])
    expected, actual = slice_v0.evaluate(payload), pipeline.evaluate(payload)
    assert actual["engine"] == "rules-engine"
    assert _comparable(actual) == _comparable(expected)
    # pipeline raportuje dodatkowo reguły z faktami spoza rejestru — lista slice_v0 musi się w niej zawierać
    traced = {item["rule_id"] for item in actual["applied_rules"]}
    assert set(expected["not_evaluated_rules"]) - traced <= set(actual["not_evaluated_rules"])
    # applied_rules w pipeline = reguły rozstrzygnięte (TRUE/FALSE); slice_v0 wpisuje też regułę, której
    # warunek był UNKNOWN — te są w missing_data, więc porównujemy bez nich
    undecided = {rule_id for item in actual["missing_data"] for rule_id in item["rule_ids"]}
    for exp_benefit, act_benefit in zip(expected["benefits"], actual["benefits"], strict=True):
        assert set(exp_benefit["applied_rules"]) - undecided <= set(act_benefit["applied_rules"])


def test_pipeline_demo_values(demo_payload):
    benefit = pipeline.evaluate(_payload(demo_payload, []))["benefits"][0]
    assert (benefit["status"], benefit["rate"], benefit["days"]) == ("ELIGIBLE", "0.815", 140)
    assert (benefit["daily_amount_exact"], benefit["total_amount_exact"]) == ("163", "22820")


def test_pipeline_not_insured_without_leave_data_is_review_and_asks_for_leaves(demo_payload):
    # slice_v0 nie ocenia urlopu wychowawczego; pipeline: status jak slice (art. 30 nieoceniony → NEEDS_REVIEW, DT-9),
    # ale dodatkowo pyta o employment.leaves (MAT-ELIG-001 może zajść przez urlop wychowawczy)
    payload = _payload(demo_payload, VARIANTS["not_insured_review"][:1])
    body = pipeline.evaluate(payload)
    assert body["benefits"][0]["status"] == slice_v0.evaluate(payload)["benefits"][0]["status"] == "NEEDS_REVIEW"
    assert {"field": "employment.leaves", "rule_ids": ["MAT-ELIG-001"]} in body["missing_data"]


def test_pipeline_out_of_scope_event():
    body = pipeline.evaluate({"event": {"type": "SICKNESS", "date": "2027-01-01"}})
    assert body["overall_status"] == "OUT_OF_SCOPE" and body["benefits"] == []
