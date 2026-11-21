"""slice-v0 vs oczekiwania z zus_rules/08_TEST_CASES.json.

Pokrywa: T-MAT-001, T-MAT-002, T-RATE-001, T-RATE-002, T-GEN-006/007.
"""
import copy


def _benefit(client, payload):
    response = client.post("/api/evaluate", json=payload)
    assert response.status_code == 200, response.text
    return response.json(), response.json()["benefits"][0]


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and body["ruleset_version"] == "0.1.0"
    assert body["app_version"] == "dev"  # INT-11: bez tagu/buildu wersja to dev


def test_t_rate_001_combined_815_within_21_days(client, demo_payload):
    body, benefit = _benefit(client, demo_payload)
    assert benefit["status"] == "ELIGIBLE"
    assert benefit["rate"] == "0.815"
    assert benefit["period"] == {"from": "2027-03-15", "to": "2027-08-01", "max_weeks": 20}
    assert benefit["daily_amount_exact"] == "163" and benefit["total_amount_exact"] == "22820"
    # BE2-01: art. 30 oceniany (MAT-ELIG-004 w śladzie), nie w not_evaluated_rules
    assert any(item["rule_id"] == "MAT-ELIG-004" for item in body["applied_rules"])


def test_t_rate_002_day_22_gives_100(client, demo_payload):
    payload = copy.deepcopy(demo_payload)
    payload["applications"]["combined_815_filed_date"] = "2027-04-06"
    _, benefit = _benefit(client, payload)
    assert benefit["rate"] == "1" and benefit["total_amount_exact"] == "28000"


def test_t_mat_002_twins_31_weeks(client, demo_payload):
    payload = copy.deepcopy(demo_payload)
    payload["children"]["count_at_birth"] = 2
    _, benefit = _benefit(client, payload)
    assert benefit["period"]["max_weeks"] == 31


def test_missing_base_is_needs_data_not_refusal(client, demo_payload):
    payload = copy.deepcopy(demo_payload)
    payload["income_history"]["manual_base_override"] = None
    body, benefit = _benefit(client, payload)
    assert benefit["status"] == "NEEDS_DATA"
    assert {"field": "income_history.manual_base_override", "rule_ids": ["CALC-MAT-001"]} in body["missing_data"]


def test_not_insured_is_review_not_refusal(client, demo_payload):
    payload = copy.deepcopy(demo_payload)
    payload["insurance"]["titles"][0]["to"] = "2027-02-28"
    _, benefit = _benefit(client, payload)
    # BE2-01: art. 30 oceniany — brak daty początku ciąży / przyczyny ustania tytułu → pytamy (D17), nie odmawiamy
    assert benefit["status"] == "NEEDS_DATA"


def test_t_gen_006_007_debt_threshold(client, demo_payload):
    payload = copy.deepcopy(demo_payload)
    payload["insurance"]["titles"] = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY",
                                       "from": "2024-01-01", "to": None}]
    payload["debt"] = {"amount_on_right_date": "48.07"}
    assert _benefit(client, payload)[1]["status"] == "NOT_ELIGIBLE"
    payload["debt"] = {"amount_on_right_date": "48.06"}
    assert _benefit(client, payload)[1]["status"] == "ELIGIBLE"
    payload["debt"] = {"amount_on_right_date": None}
    assert _benefit(client, payload)[1]["status"] == "NEEDS_DATA"


def test_validation_error_is_problem_json(client):
    response = client.post("/api/evaluate", json={"event": {"type": "BIRTH", "date": "nie-data"}})
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["errors"][0]["field"] == "event.date"
