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

_CHILD = {"birth_date": "2027-03-15"}

VARIANTS = {
    "T-RATE-001_demo_815": [],
    "T-RATE-002_day_22_gives_100": [_set("applications.combined_815_filed_date", "2027-04-06")],
    "T-RATE-001_day_21_boundary": [_set("applications.combined_815_filed_date", "2027-04-05")],
    # demo ma children.items (1 dziecko) — wieloraczki: lista dzieci zgodna z liczbą (inaczej MAT-DUR-005)
    "T-MAT-002_twins": [_set("children.count_at_birth", 2), _set("children.items", [_CHILD] * 2)],
    "MAT-DUR-001_quintuplets": [_set("children.count_at_birth", 6), _set("children.items", [_CHILD] * 6)],
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


# BE1-04: pipeline ocenia płatnika (GEN-CLS-*) i przedawnienie długu (GEN-EXCL-002), których slice_v0 nie liczy —
# te pola i braki danych zgłoszone wyłącznie przez te reguły są wyłączone z porównania (testy: test_facts_insurance.py)
BEYOND_SLICE_RULES = {"GEN-CLS-001", "GEN-CLS-002", "GEN-EXCL-002"}
BEYOND_SLICE_FIELDS = ("payer_of_benefit", "suspended_until_debt_repaid", "entitlement_basis")
# BE2-02: rodzicielski, ojcowski, przejęcie i walidacje planu — tylko w pipeline; parytet dotyczy macierzyńskiego matki
BEYOND_SLICE_PREFIXES = ("PAR-", "PAT-", "MAT-SHARE-", "RATE-MAT-002", "RATE-MAT-004", "RATE-MAT-006", "RATE-MAT-008")


def _beyond_slice(rule_id: str) -> bool:
    return rule_id in BEYOND_SLICE_RULES or rule_id.startswith(BEYOND_SLICE_PREFIXES)


def _maternity(benefits: list[dict]) -> list[dict]:
    return [b for b in benefits if b.get("leave_type") == "MATERNITY_LEAVE"]


def _comparable(body: dict) -> dict:
    body = copy.deepcopy(body)
    # plan_errors, return_to_work (BE2-02), warnings RISK-* (BE2-01) — zwraca tylko pipeline
    for key in ("evaluation_id", "engine", "applied_rules", "future_changes", "not_evaluated_rules", "plan_errors",
                "return_to_work", "warnings"):
        body.pop(key, None)
    body["missing_data"] = [{**item, "rule_ids": [r for r in item["rule_ids"] if not _beyond_slice(r)]}
                            for item in body["missing_data"] if not all(_beyond_slice(r) for r in item["rule_ids"])]
    body["benefits"] = _maternity(body["benefits"])
    body["overall_status"] = body["benefits"][0]["status"] if body["benefits"] else body["overall_status"]
    for benefit in body["benefits"]:
        benefit.pop("applied_rules")
        for key in BEYOND_SLICE_FIELDS:
            benefit.pop(key, None)
        benefit.pop("base", None)  # obiekt podstawy (kontrakt Benefit.base) zwraca tylko pipeline (M05, BASE-GEN-001)
        benefit.pop("explanation", None)  # wyjaśnienie z renderera (BE1-06) zwraca tylko pipeline
        benefit.pop("legal_basis", None)
    return body


# BE2-01: art. 30 (MAT-ELIG-004/005/006, MAT-NEG-001) oceniany w pipeline — slice_v0 daje tu NEEDS_REVIEW
BEYOND_SLICE_VARIANTS = {"not_insured_review"}


@pytest.mark.parametrize("name", [v for v in VARIANTS if v not in BEYOND_SLICE_VARIANTS])
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
    for exp_benefit, act_benefit in zip(expected["benefits"], _maternity(actual["benefits"]), strict=True):
        assert set(exp_benefit["applied_rules"]) - undecided <= set(act_benefit["applied_rules"])


def test_pipeline_demo_values(demo_payload):
    benefit = pipeline.evaluate(_payload(demo_payload, []))["benefits"][0]
    assert (benefit["status"], benefit["rate"], benefit["days"]) == ("ELIGIBLE", "0.815", 140)
    assert (benefit["daily_amount_exact"], benefit["total_amount_exact"]) == ("163", "22820")


def test_pipeline_not_insured_asks_for_art30_data_not_refusal(demo_payload):
    # BE2-01: brak ubezpieczenia w dniu porodu — pipeline ocenia art. 30 (MAT-NEG-001): bez daty początku ciąży
    # i przyczyny ustania tytułu nie odmawia, tylko pyta (D17); pyta też o employment.leaves (urlop wychowawczy)
    payload = _payload(demo_payload, VARIANTS["not_insured_review"][:1])
    body = pipeline.evaluate(payload)
    assert body["benefits"][0]["status"] == "NEEDS_DATA"
    assert {"field": "employment.leaves", "rule_ids": ["MAT-ELIG-001"]} in body["missing_data"]
    full = pipeline.evaluate(_payload(demo_payload, VARIANTS["not_insured_review"]))  # + employment.leaves = []
    assert full["benefits"][0]["status"] == "NEEDS_DATA"
    assert {"pregnancy.pregnancy_start_date", "insurance.titles"} <= {i["field"] for i in full["missing_data"]}


def test_pipeline_out_of_scope_event():
    body = pipeline.evaluate({"event": {"type": None}})
    assert body["overall_status"] == "OUT_OF_SCOPE" and body["benefits"] == []
