"""BE1-05: fakty i kroki zasiłku chorobowego - okres zasiłkowy (art. 8–9), po ustaniu tytułu (art. 7, 13),
podział wynagrodzenie/zasiłek (KP art. 92), dni bez świadczenia (art. 12 ust. 2, art. 16), kwoty.

Każdy fakt: przypadek typowy, graniczny i brak danych. Scenariusze pipeline'u na fixture ``pregnant_sick_employee``
z zus_rules/08 (dane syntetyczne).
"""
import copy
from datetime import date
from decimal import Decimal

import pytest
from jsonschema import Draft202012Validator

from app.engine import pipeline
from app.engine.facts import Context
from tests.test_cases import build_input, test_cases_by_id
from tests.test_contract import _validator


def _case(test_id: str) -> dict:
    return copy.deepcopy(build_input(test_cases_by_id()[test_id]))


def _benefit(body: dict, benefit_type: str) -> dict:
    return next(b for b in body["benefits"] if b["benefit_type"] == benefit_type)


def _ctx(**data) -> Context:
    return Context(input=data, as_of=date(2026, 11, 21))


# ------------------------------------------------------------ f_benefit_period_limit_days (SICK-DUR-001)
@pytest.mark.parametrize(("codes", "declared", "expected"), [
    (["B"], None, 270), ([], False, 182), (["D"], False, 270), ([], None, None)])
def test_f_benefit_period_limit_days(codes, declared, expected):
    ctx = _ctx(incapacity={"codes": codes}, pregnancy={"is_pregnant_during_incapacity": declared})
    assert ctx.fact("f_benefit_period_limit_days") == expected
    assert ("pregnancy.is_pregnant_during_incapacity" in ctx.missing) is (expected is None)


# ------------------------------------------------------------ f_benefit_period_days_used (SICK-DUR-003)
def _used(history, start="2026-09-04", end="2026-09-13", codes=("B",), confirmed=True, pregnancy_start="2026-06-08"):
    ctx = _ctx(incapacity={"start_date": start, "end_date": end, "codes": list(codes)},
               pregnancy={"pregnancy_start_date": pregnancy_start},
               benefit_history={"sickness_periods": history, "sickness_periods_confirmed_complete": confirmed})
    return ctx.fact("f_benefit_period_days_used"), ctx.missing


@pytest.mark.parametrize(("prev_end", "expected"), [("2026-07-05", 30), ("2026-07-04", 10)])
def test_f_benefit_period_days_used_break_boundary_60_days(prev_end, expected):
    # przerwa (C8) 2026-07-06..2026-09-03 = 60 dni -> 20 + 10 dni; przerwa 61 dni -> nowy okres zasiłkowy (10)
    history = [{"from": "2026-06-16", "to": prev_end, "codes": ["B"]}]
    assert _used(history)[0] == expected


def test_f_benefit_period_days_used_pregnancy_resets_chain():
    # art. 9 ust. 2 zd. 2: poprzednia niezdolność poza ciążą (przed pregnancy_start_date) się nie wlicza
    history = [{"from": "2026-05-01", "to": "2026-05-20", "codes": []}]
    assert _used(history, start="2026-07-05", end="2026-07-14")[0] == 10


def test_f_benefit_period_days_used_overlapping_periods_merged():
    history = [{"from": "2026-08-20", "to": "2026-09-06", "codes": ["B"]}]
    assert _used(history)[0] == 25  # 2026-08-20..2026-09-13


def test_f_benefit_period_days_used_missing_history_needs_data():
    value, missing = _used([], confirmed=False)
    assert value is None and "benefit_history.sickness_periods" in missing


def test_f_benefit_period_days_used_unknown_pregnancy_of_previous_period_needs_data():
    history = [{"from": "2026-05-01", "to": "2026-05-20", "codes": []}]
    value, missing = _used(history, start="2026-07-05", end="2026-07-14", pregnancy_start=None)
    assert value is None and "pregnancy.pregnancy_start_date" in missing


def test_f_benefit_period_days_used_excluded_leave_not_counted():
    ctx = _ctx(incapacity={"start_date": "2026-11-02", "end_date": "2026-11-11", "codes": ["B"]},
               benefit_history={"sickness_periods": [], "sickness_periods_confirmed_complete": True},
               employment={"leaves": [{"type": "UNPAID_LEAVE", "from": "2026-11-09", "to": "2026-11-20"}]})
    assert ctx.fact("f_benefit_period_days_used") == 7


# ------------------------------------------------------------ f_incapacity_continuous_days (SICK-ELIG-006)
def test_f_incapacity_continuous_days_with_adjacent_history_and_missing_end():
    ctx = _ctx(incapacity={"start_date": "2026-11-10", "end_date": "2026-11-25"},
               benefit_history={"sickness_periods": [{"from": "2026-11-01", "to": "2026-11-09"}]})
    assert ctx.fact("f_incapacity_continuous_days") == 25
    missing = _ctx(incapacity={"start_date": "2026-11-10"})
    assert missing.fact("f_incapacity_continuous_days") is None and "incapacity.end_date" in missing.missing


# ------------------------------------------------------------ po ustaniu tytułu (art. 7, 13)
TITLE_ENDED = {"title_type": "CIVIL_CONTRACT_MANDATE", "sickness_insurance_mode": "VOLUNTARY", "from": "2026-08-03",
               "to": "2026-10-31"}


@pytest.mark.parametrize(("start", "expected"), [("2026-08-03", True), ("2026-08-04", False)])
def test_f_waiting_period_met_during_insurance_boundary_90_days(start, expected):
    # 2026-08-03..2026-10-31 = 90 dni ubezpieczenia (dzień ustania włącznie) → okres wyczekiwania 90 dni upłynął
    ctx = _ctx(event={"type": "PREGNANCY_INCAPACITY"}, incapacity={"start_date": "2026-11-10"},
               insurance={"titles": [{**TITLE_ENDED, "from": start}], "titles_confirmed_complete": True})
    assert ctx.fact("f_waiting_period_met_during_insurance") is expected


@pytest.mark.parametrize(("day", "expected"), [("2027-01-30", 2), ("2027-01-31", 3), ("2026-11-15", 0)])
def test_f_months_since_title_end(day, expected):
    ctx = _ctx(insurance={"titles": [TITLE_ENDED], "titles_confirmed_complete": True})
    assert ctx.fact("f_months_since_title_end", date=day) == expected
    assert _ctx().fact("f_months_since_title_end", date=day) is None


def test_after_title_end_code_e_within_3_months_is_eligible():
    # SICK-ELIG-006: kod E (gruźlica) - niezdolność do 3 miesięcy od ustania tytułu
    payload = _case("T-SICK-011")
    payload["incapacity"].update(start_date="2027-01-20", end_date="2027-03-20", codes=["B", "E"])
    assert _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")["status"] == "ELIGIBLE"


def test_after_title_end_with_pension_is_not_eligible():
    payload = _case("T-SICK-011")
    payload["person"]["has_pension_or_disability_pension"] = True
    benefit = _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")
    assert benefit["status"] == "NOT_ELIGIBLE"
    assert "AFTER_TITLE_EXCLUSION" in [r["code"] for r in benefit["reasons"]]


def test_after_title_end_not_pregnant_limited_to_91_days():
    # SICK-DUR-002: po ustaniu tytułu poza ciążą okres zasiłkowy 91 dni (w ciąży - 270, T-SICK-011)
    payload = _case("T-SICK-011")
    payload["incapacity"]["codes"] = []
    payload["pregnancy"]["is_pregnant_during_incapacity"] = False
    benefit = _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")
    assert benefit["period"]["max_days"] == 91 and Decimal(benefit["rate"]) == Decimal("0.80")


# ------------------------------------------------------------ podział dni i kwoty
def test_pregnant_employee_sick_pay_then_benefit_amounts():
    # 29 dni e-ZLA, 20 dni wynagrodzenia wykorzystane → 13 dni wynagrodzenia 100% + 16 dni zasiłku 100%
    payload = _case("T-SP-001")
    payload["benefit_history"]["employer_sick_pay_days_in_year"] = 20
    body = pipeline.evaluate(payload)
    sick_pay, benefit = _benefit(body, "EMPLOYER_SICK_PAY"), _benefit(body, "SICKNESS_BENEFIT")
    assert (sick_pay["days"], sick_pay["daily_amount_exact"], sick_pay["total_amount_exact"]) == (13, "150", "1950")
    assert (benefit["days"], benefit["daily_amount_exact"], benefit["total_amount_exact"]) == (16, "150", "2400")
    assert benefit["period"] == {"from": "2026-11-15", "to": "2026-11-30", "max_days": 270,
                                 "days_used_in_benefit_period": 29}
    assert benefit["payer_of_benefit"] == "CONTRIBUTION_PAYER" and benefit["status"] == "ELIGIBLE"


def test_sick_pay_limit_renews_on_new_year():
    # niezdolność 2026-12-20..2027-01-10: limit 2026 wykorzystany (33) → zasiłek do 31.12, od 1.01 znów wynagrodzenie
    payload = _case("T-SP-005")
    payload["incapacity"].update(start_date="2026-12-20", end_date="2027-01-10")
    body = pipeline.evaluate(payload)
    assert [b["benefit_type"] for b in body["benefits"]] == ["SICKNESS_BENEFIT"]  # SICKPAY-TRN-001 w dniu startu
    assert body["benefits"][0]["period"]["to"] == "2026-12-31" and body["benefits"][0]["days"] == 12


def test_code_c_first_days_without_benefit():
    payload = _case("T-SP-005")
    payload["incapacity"]["codes"] = ["B", "C"]
    benefit = _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")
    assert benefit["days"] == 24 and benefit["period"]["from"] == "2026-11-07"
    assert "SICK-EXCL-006" in benefit["applied_rules"]


def test_benefit_period_exhausted_limits_paid_days():
    payload = _case("T-SP-005")
    payload["benefit_history"]["sickness_periods"] = [{"from": "2026-03-01", "to": "2026-10-20", "codes": ["B"]}]
    benefit = _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")
    # 2026-03-01..2026-10-20 = 234 dni, przerwa 12 dni → zostało 36 dni okresu; bieżące 29 dni mieszczą się
    assert benefit["period"]["days_used_in_benefit_period"] == 263 and benefit["days"] == 29
    payload["benefit_history"]["sickness_periods"][0]["from"] = "2026-02-01"  # 262 dni → zostało 8
    benefit = _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")
    assert benefit["days"] == 8 and "BENEFIT_PERIOD_EXHAUSTED" in [r["code"] for r in benefit["reasons"]]


def test_human_review_without_data_is_assumption_with_data_is_review():
    body = pipeline.evaluate(_case("T-SP-001"))
    assert "NO_INFO_ART17" in [a["code"] for a in body["assumptions"]]
    payload = _case("T-SP-001")
    payload["incapacity"]["gainful_work_during_leave_reported"] = True
    assert _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")["status"] == "NEEDS_REVIEW"


def test_future_rule_single_benefit_period_reported():
    assert {"rule_id": "SICK-DUR-005", "valid_from": "2027-01-01"} in pipeline.evaluate(
        _case("T-SP-001"))["future_changes"]


@pytest.mark.parametrize("test_id", ["T-SP-001", "T-SP-005", "T-SICK-011", "T-SICK-012", "T-SICK-006"])
def test_sickness_response_matches_contract(test_id):
    validator: Draft202012Validator = _validator("EvaluateResponse")
    validator.validate(pipeline.evaluate(_case(test_id)))


def test_missing_sickness_history_keeps_right_and_reports_assumption():
    # SICK-DUR-003: brak historii -> NEEDS_DATA dla limitu (missing_data), prawo zostaje; dni/kwota z jawnym zalozeniem
    payload = _case("T-SICK-007")
    payload["benefit_history"] = {"employer_sick_pay_days_in_year": 0}
    body = pipeline.evaluate(payload)
    benefit = _benefit(body, "SICKNESS_BENEFIT")
    assert benefit["status"] == "ELIGIBLE" and benefit["period"]["days_used_in_benefit_period"] is None
    assert "benefit_history.sickness_periods" in [m["field"] for m in body["missing_data"]]
    assert "SICKNESS_HISTORY_UNKNOWN" in [a["code"] for a in body["assumptions"]]


@pytest.mark.parametrize(("pregnancy_start", "review"), [("2026-11-15", True), ("2026-11-02", False),
                                                         ("2026-11-30", True), ("2026-12-01", False)])
def test_mixed_benefit_period_gap_006_needs_review(pregnancy_start, review):
    # GAP-006: poczatek ciazy w trakcie niezdolnosci 2026-11-02..2026-11-30 (po pierwszym dniu) -> NEEDS_REVIEW
    payload = _case("T-SP-005")
    payload["pregnancy"]["pregnancy_start_date"] = pregnancy_start
    benefit = _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")
    assert (benefit["status"] == "NEEDS_REVIEW") is review
    assert ("MIXED_BENEFIT_PERIOD_GAP_006" in [r["code"] for r in benefit["reasons"]]) is review
