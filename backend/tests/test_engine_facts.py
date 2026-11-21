"""BE1-01/BE1-02: fakty z logiką spoza slice_v0 (typowy, graniczny, brak danych) + martwe urodzenie (T-MAT-013)."""
import copy
from datetime import date
from decimal import Decimal

import pytest

from app.engine import pipeline
from app.engine.facts import Context

TITLE = {"title_type": "EMPLOYMENT_CONTRACT", "sickness_insurance_mode": "MANDATORY", "from": "2022-02-01",
         "to": "2027-03-15"}


def _ctx(data: dict, as_of=date(2027, 4, 5), segment=None, state=None) -> Context:
    return Context(input=data, as_of=as_of, segment=segment, state=state or {})


# ------------------------------------------------------------ f_sickness_insured_on (07 §3)
@pytest.mark.parametrize(("day", "expected"), [("2027-03-15", True), ("2027-03-16", False), ("2022-02-01", True)])
def test_f_sickness_insured_on_boundaries(day, expected):
    assert _ctx({"insurance": {"titles": [TITLE]}}).fact("f_sickness_insured_on", date=day) is expected


def test_f_sickness_insured_on_mode_none_is_not_insured():
    title = {**TITLE, "sickness_insurance_mode": "NONE"}
    assert _ctx({"insurance": {"titles": [title]}}).fact("f_sickness_insured_on", date="2027-03-01") is False


def test_f_sickness_insured_on_missing_titles_unknown_unless_confirmed():
    ctx = _ctx({"insurance": {"titles": []}})
    assert ctx.fact("f_sickness_insured_on", date="2027-03-01") is None and ctx.missing == ["insurance.titles"]
    confirmed = _ctx({"insurance": {"titles": [], "titles_confirmed_complete": True}})
    assert confirmed.fact("f_sickness_insured_on", date="2027-03-01") is False


# ------------------------------------------------------------ f_on_childcare_leave_on (07 §3)
def test_f_on_childcare_leave_on():
    leaves = [{"type": "CHILDCARE_LEAVE", "from": "2026-01-01", "to": "2027-12-31"}]
    assert _ctx({"employment": {"leaves": leaves}}).fact("f_on_childcare_leave_on", date="2027-03-15") is True
    assert _ctx({"employment": {"leaves": leaves}}).fact("f_on_childcare_leave_on", date="2028-01-01") is False
    ctx = _ctx({})
    assert ctx.fact("f_on_childcare_leave_on", date="2027-03-15") is None and ctx.missing == ["employment.leaves"]


# ------------------------------------------------------------ f_primary_title_type (07 §3)
def test_f_primary_title_type_employment_wins_over_self_employed():
    titles = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY", "from": "2024-01-01"},
              {**TITLE, "to": None}]
    assert _ctx({"event": {"date": "2027-03-15"}, "insurance": {"titles": titles}}).fact(
        "f_primary_title_type") == "EMPLOYMENT_CONTRACT"


def test_f_primary_title_type_no_active_title_and_missing_date():
    # brak aktywnego → ostatni zakończony tytuł; tytuł przyszły → None
    assert _ctx({"event": {"date": "2030-01-01"}, "insurance": {"titles": [TITLE]}}).fact(
        "f_primary_title_type") == "EMPLOYMENT_CONTRACT"
    future = _ctx({"event": {"date": "2020-01-01"}, "insurance": {"titles": [TITLE]}})
    assert future.fact("f_primary_title_type") is None
    ctx = _ctx({"insurance": {"titles": [TITLE]}})
    assert ctx.fact("f_primary_title_type") is None and ctx.missing == ["event.date"]


# ------------------------------------------------------------ f_debt_* (07 §6)
@pytest.mark.parametrize(("repaid", "expected"), [("2027-04-05", True), ("2027-04-06", False), (None, False)])
def test_f_debt_fully_repaid(repaid, expected):
    # brak repaid_in_full_date = brak spłaty (D16: 07 §6 definiuje fakt jako „data istnieje i ≤ as_of”)
    assert _ctx({"debt": {"repaid_in_full_date": repaid}}).fact("f_debt_fully_repaid") is expected


def test_debt_repaid_lifts_exclusion_end_to_end(demo_payload):
    payload = copy.deepcopy(demo_payload)
    payload["insurance"]["titles"] = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY",
                                       "from": "2024-01-01", "to": None}]
    payload["debt"] = {"amount_on_right_date": "100.00", "repaid_in_full_date": "2027-03-20"}
    assert pipeline.evaluate(payload)["benefits"][0]["status"] == "ELIGIBLE"
    payload["debt"]["repaid_in_full_date"] = None
    assert pipeline.evaluate(payload)["benefits"][0]["status"] == "NOT_ELIGIBLE"


def test_birth_during_childcare_leave_is_eligible_end_to_end(demo_payload):
    payload = copy.deepcopy(demo_payload)
    payload["insurance"]["titles"][0]["to"] = "2027-02-28"
    payload["employment"] = {"leaves": [{"type": "CHILDCARE_LEAVE", "from": "2026-06-01", "to": "2027-12-31"}]}
    assert pipeline.evaluate(payload)["benefits"][0]["status"] == "ELIGIBLE"


# ------------------------------------------------------------ f_benefit_amount (07 §2)
def test_f_benefit_amount_with_work_fraction():
    ctx = _ctx({"income_history": {"manual_base_override": "6000"}}, state={"rate": Decimal("1.00")},
               segment={"from": "2027-03-15", "to": "2027-03-24", "work_fraction": "0.5"})
    amount = ctx.fact("f_benefit_amount")
    assert (amount["daily"], amount["total"], amount["days"]) == (Decimal("100"), Decimal("1000"), 10)


def test_f_benefit_amount_missing_base_reports_field():
    ctx = _ctx({}, state={"rate": Decimal("1")}, segment={"from": "2027-03-15", "to": "2027-03-24"})
    assert ctx.fact("f_benefit_amount") is None and ctx.missing == ["income_history.manual_base_override"]


# ------------------------------------------------------------ martwe urodzenie / zgon dziecka (MAT-DUR-003/004)
def _birth_payload(demo_payload, items, count=1, birth="2027-02-01"):
    payload = copy.deepcopy(demo_payload)
    payload["event"]["date"] = birth
    payload["children"] = {"count_at_birth": count, "items": items}
    return payload


def test_t_mat_013_stillbirth_8_weeks(demo_payload):
    payload = _birth_payload(demo_payload, [{"birth_date": "2027-02-01", "stillborn": True}])
    benefit = pipeline.evaluate(payload)["benefits"][0]
    assert benefit["status"] == "ELIGIBLE"
    assert benefit["period"] == {"from": "2027-02-01", "to": "2027-03-28", "max_weeks": 8}
    assert benefit["days"] == 56 and "MAT-DUR-003" in benefit["applied_rules"]


def test_mat_dur_003_child_death_before_8_weeks_min_7_days(demo_payload):
    # zgon 50. dnia życia → max(poród + 8 tyg. − 1, zgon + 7 − 1) = zgon + 6
    payload = _birth_payload(demo_payload, [{"birth_date": "2027-02-01", "death_date": "2027-03-23"}])
    assert pipeline.evaluate(payload)["benefits"][0]["period"]["to"] == "2027-03-29"


def test_mat_dur_004_child_death_after_8_weeks(demo_payload):
    payload = _birth_payload(demo_payload, [{"birth_date": "2027-02-01", "death_date": "2027-04-10"}])
    payload["evaluation"]["as_of_date"] = "2027-04-20"
    benefit = pipeline.evaluate(payload)["benefits"][0]
    assert benefit["period"]["to"] == "2027-04-16" and "MAT-DUR-004" in benefit["applied_rules"]


def test_living_child_items_keep_regular_period(demo_payload):
    payload = _birth_payload(demo_payload, [{"birth_date": "2027-02-01"}])
    assert pipeline.evaluate(payload)["benefits"][0]["period"]["max_weeks"] == 20


def test_twins_one_deceased_is_review_blocked_rule(demo_payload):
    # MAT-DUR-005 (BLOCKED, GAP-012): wieloraczki, żyje ≥1, zmarło ≥1 → NEEDS_REVIEW, bez rozstrzygania okresu
    payload = _birth_payload(demo_payload, [{"birth_date": "2027-02-01", "stillborn": True},
                                            {"birth_date": "2027-02-01"}], count=2)
    assert pipeline.evaluate(payload)["benefits"][0]["status"] == "NEEDS_REVIEW"
