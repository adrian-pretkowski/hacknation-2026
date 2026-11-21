"""BE1-04: fakty ubezpieczenia (07 §3, §6), fakty chorobowe (07 §4) i kroki GEN-* / SICK-ELIG w pipeline.

Każdy fakt: przypadek typowy, graniczny i brak danych (None = UNKNOWN, nigdy FALSE).
"""
import copy
from datetime import date
from decimal import Decimal

import pytest

from app.core.dates import add_months
from app.engine import pipeline
from app.engine.facts import Context
from tests.test_cases import build_input, test_cases_by_id


def _title(title_type="EMPLOYMENT_CONTRACT", mode="MANDATORY", start="2026-01-01", end=None, **extra):
    return {"title_type": title_type, "sickness_insurance_mode": mode, "from": start, "to": end, **extra}


def _ctx(titles=None, as_of=date(2026, 11, 21), **data) -> Context:
    payload = {"insurance": {"titles": titles, "titles_confirmed_complete": titles is not None}, **data}
    return Context(input=payload, as_of=as_of)


def _sick(titles, start="2026-11-02", **data) -> Context:
    return _ctx(titles, event={"type": "PREGNANCY_INCAPACITY"}, incapacity={"start_date": start}, **data)


def _case(test_id: str) -> dict:
    return copy.deepcopy(build_input(test_cases_by_id()[test_id]))


def _benefit(body: dict, benefit_type: str) -> dict:
    return next(b for b in body["benefits"] if b["benefit_type"] == benefit_type)


# ------------------------------------------------------------ core.dates.add_months (GAP-011)
@pytest.mark.parametrize(("day", "months", "expected"), [
    (date(2027, 3, 15), 6, date(2027, 9, 15)), (date(2026, 8, 31), 6, date(2027, 2, 28)),
    (date(2027, 8, 31), 6, date(2028, 2, 29)), (date(2026, 11, 30), 2, date(2027, 1, 30))])
def test_add_months_calendar_with_month_end_clamp(day, months, expected):
    assert add_months(day, months) == expected


# ------------------------------------------------------------ f_continuous_sickness_insurance_days (SICK-ELIG-004)
@pytest.mark.parametrize(("start", "expected"), [("2026-10-29", 89), ("2026-10-30", 90), ("2026-08-01", 0)])
def test_continuous_days_counts_until_day_before(start, expected):
    ctx = _ctx([_title("SELF_EMPLOYED", "VOLUNTARY", "2026-08-01")])
    assert ctx.fact("f_continuous_sickness_insurance_days", as_of=start) == expected


@pytest.mark.parametrize(("prev_end", "expected"), [("2026-08-31", 247), ("2026-08-30", 4)])
def test_continuous_days_gap_30_joins_31_breaks(prev_end, expected):
    titles = [_title(end=prev_end), _title(start="2026-10-01")]
    assert _ctx(titles).fact("f_continuous_sickness_insurance_days", as_of="2026-10-05") == expected


def test_continuous_days_gap_reason_childcare_joins_long_gap():
    titles = [_title(start="2024-01-01", end="2024-12-31"),
              _title(start="2026-10-01", gap_reason_before="CHILDCARE_LEAVE")]
    assert _ctx(titles).fact("f_continuous_sickness_insurance_days", as_of="2026-10-05") == 366 + 4


def test_continuous_days_overlapping_titles_not_double_counted():
    titles = [_title(start="2026-10-01"), _title("CIVIL_CONTRACT_MANDATE", "VOLUNTARY", "2026-10-03")]
    assert _ctx(titles).fact("f_continuous_sickness_insurance_days", as_of="2026-10-11") == 10


def test_continuous_days_mode_none_and_not_insured():
    ctx = _ctx([_title(mode="NONE", start="2026-01-01")])
    assert ctx.fact("f_continuous_sickness_insurance_days", as_of="2026-10-05") == 0


def test_continuous_days_missing_titles_unknown():
    ctx = Context(input={"insurance": {}})
    assert ctx.fact("f_continuous_sickness_insurance_days", as_of="2026-10-05") is None
    assert "insurance.titles" in ctx.missing
    assert _ctx([{"title_type": "OTHER", "sickness_insurance_mode": "MANDATORY", "from": None}]).fact(
        "f_continuous_sickness_insurance_days", as_of="2026-10-05") is None


# ------------------------------------------------------------ f_sickness_insurance_mode_on
def test_mode_on_mandatory_wins_and_unknown():
    titles = [_title("CIVIL_CONTRACT_MANDATE", "VOLUNTARY"), _title()]
    assert _ctx(titles).fact("f_sickness_insurance_mode_on", date="2026-05-01") == "MANDATORY"
    assert _ctx([_title("SELF_EMPLOYED", "VOLUNTARY")]).fact("f_sickness_insurance_mode_on",
                                                              date="2026-05-01") == "VOLUNTARY"
    assert _ctx([_title(end="2026-04-30")]).fact("f_sickness_insurance_mode_on", date="2026-05-01") is None
    assert Context(input={}).fact("f_sickness_insurance_mode_on", date="2026-05-01") is None


# ------------------------------------------------------------ f_prior_mandatory_sickness_insurance_years
def test_prior_mandatory_years_before_current_chain():
    titles = [_title(start="2010-01-01", end="2019-12-31"), _title("CIVIL_CONTRACT_MANDATE", "VOLUNTARY",
                                                                     "2020-01-01", "2020-12-31"),
              _title(start="2026-10-23")]
    years = _sick(titles).fact("f_prior_mandatory_sickness_insurance_years")
    assert years == Decimal(3652) / Decimal(365) and years > 10


def test_prior_mandatory_years_none_before_and_missing():
    assert _sick([_title(start="2026-10-23")]).fact("f_prior_mandatory_sickness_insurance_years") == 0
    assert _ctx(None, event={"type": "SICKNESS"}, incapacity={"start_date": "2026-11-02"}).fact(
        "f_prior_mandatory_sickness_insurance_years") is None


# ------------------------------------------------------------ f_graduate_within_window (SICK-ELIG-005)
@pytest.mark.parametrize(("graduation", "expected"), [("2026-08-24", True), ("2026-07-25", True),
                                                      ("2026-07-24", False)])
def test_graduate_window_boundary(graduation, expected):
    ctx = _sick([_title(start="2026-10-23")], person={"graduation_date": graduation})
    assert ctx.fact("f_graduate_within_window", days=90) is expected


def test_graduate_window_missing_graduation_date_asks():
    ctx = _sick([_title(start="2026-10-23")], person={})
    assert ctx.fact("f_graduate_within_window", days=90) is None and "person.graduation_date" in ctx.missing


# ------------------------------------------------------------ płatnik: f_is_employer_payer_title, f_benefit_after_…
@pytest.mark.parametrize(("title_type", "expected"), [("EMPLOYMENT_CONTRACT", True), ("CIVIL_CONTRACT_MANDATE", True),
                                                      ("SELF_EMPLOYED", False), ("CLERGY_SELF_PAYER", False),
                                                      ("FOREIGN_EMPLOYER", False)])
def test_is_employer_payer_title(title_type, expected):
    assert _sick([_title(title_type)]).fact("f_is_employer_payer_title") is expected


def test_is_employer_payer_title_missing_titles():
    assert _ctx(None, event={"type": "SICKNESS"}, incapacity={"start_date": "2026-11-02"}).fact(
        "f_is_employer_payer_title") is None


@pytest.mark.parametrize(("end", "expected"), [(None, False), ("2026-11-02", False), ("2026-11-01", True)])
def test_benefit_after_title_end(end, expected):
    assert _sick([_title(end=end)]).fact("f_benefit_after_title_end") is expected


def test_benefit_after_title_end_uses_event_date_for_birth_and_missing():
    ctx = _ctx([_title(end="2027-03-01")], event={"type": "BIRTH", "date": "2027-03-15"})
    assert ctx.fact("f_benefit_after_title_end") is True
    ctx = _ctx([_title()], event={"type": "BIRTH"})
    assert ctx.fact("f_benefit_after_title_end") is None and "event.date" in ctx.missing


def test_days_since_title_end():
    ctx = _sick([_title(end="2026-10-31")])
    assert ctx.fact("f_days_since_title_end", date="2026-11-01") == 1
    assert ctx.fact("f_days_since_title_end", date="2026-11-14") == 14
    assert _sick([_title()]).fact("f_days_since_title_end", date="2026-11-14") is None


def test_is_employee_on():
    assert _sick([_title()]).fact("f_is_employee_on", date="2026-11-02") is True
    assert _sick([_title("SELF_EMPLOYED", "VOLUNTARY")]).fact("f_is_employee_on", date="2026-11-02") is False
    assert _sick([_title(end="2026-11-01")]).fact("f_is_employee_on", date="2026-11-02") is False
    assert Context(input={}).fact("f_is_employee_on", date="2026-11-02") is None


# ------------------------------------------------------------ f_debt_unpaid_beyond_months (GEN-EXCL-002)
@pytest.mark.parametrize(("repaid", "as_of", "expected"), [
    (None, date(2027, 9, 15), False), (None, date(2027, 9, 16), True),
    ("2027-09-15", date(2027, 12, 1), False), ("2027-09-16", date(2027, 12, 1), True)])
def test_debt_unpaid_beyond_months(repaid, as_of, expected):
    ctx = _ctx([_title()], as_of=as_of, event={"type": "BIRTH", "date": "2027-03-15"},
               debt={"repaid_in_full_date": repaid})
    assert ctx.fact("f_debt_unpaid_beyond_months", months=6) is expected


def test_debt_unpaid_beyond_months_missing_as_of():
    ctx = _ctx([_title()], as_of=None, event={"type": "BIRTH", "date": "2027-03-15"}, debt={})
    assert ctx.fact("f_debt_unpaid_beyond_months", months=6) is None and "evaluation.as_of_date" in ctx.missing


# ------------------------------------------------------------ fakty chorobowe (07 §4)
@pytest.mark.parametrize(("codes", "declared", "expected"), [(["B"], None, True), ([], True, True),
                                                             (["B"], False, True), ([], False, False),
                                                             ([], None, None)])
def test_incapacity_in_pregnancy(codes, declared, expected):
    ctx = Context(input={"incapacity": {"codes": codes}, "pregnancy": {"is_pregnant_during_incapacity": declared}})
    assert ctx.fact("f_incapacity_in_pregnancy") is expected
    assert ("pregnancy.is_pregnant_during_incapacity" in ctx.missing) is (expected is None)


@pytest.mark.parametrize(("year", "expected"), [(2026, 33), (2027, 14)])
def test_sick_pay_day_limit_from_year_after_50th_birthday(year, expected):
    assert Context(input={"person": {"birth_date": "1976-05-10"}}).fact("f_sick_pay_day_limit", year=year) == expected


def test_sick_pay_days_remaining():
    data = {"person": {"birth_date": "1994-04-02"}, "incapacity": {"start_date": "2026-11-02"},
            "benefit_history": {"employer_sick_pay_days_in_year": 30}}
    assert Context(input=data).fact("f_sick_pay_days_remaining_in_year") == 3
    data["benefit_history"]["employer_sick_pay_days_in_year"] = 40
    assert Context(input=data).fact("f_sick_pay_days_remaining_in_year") == 0
    data["benefit_history"]["employer_sick_pay_days_in_year"] = None
    ctx = Context(input=data)
    assert ctx.fact("f_sick_pay_days_remaining_in_year") is None
    assert "benefit_history.employer_sick_pay_days_in_year" in ctx.missing


# ------------------------------------------------------------ pipeline: GEN-CLS / GEN-EXCL na macierzyńskim
def test_gen_excl_002_unpaid_debt_6_months_right_expired():
    payload = _case("T-GEN-006")
    payload["evaluation"]["as_of_date"] = "2027-09-16"
    benefit = pipeline.evaluate(payload)["benefits"][0]
    assert benefit["status"] == "NOT_ELIGIBLE" and benefit["suspended_until_debt_repaid"] is False
    assert "RIGHT_EXPIRED_DEBT" in [r["code"] for r in benefit["reasons"]]
    assert "CONTRIBUTION_DEBT" not in [r["code"] for r in benefit["reasons"]]
    assert {"GEN-EXCL-001", "GEN-EXCL-002"} <= set(benefit["applied_rules"])


def test_gen_cls_payer_missing_count_does_not_change_status():
    body = pipeline.evaluate(_case("T-GEN-005"))
    assert body["benefits"][0]["status"] == "ELIGIBLE" and body["overall_status"] == "ELIGIBLE"
    assert {"field": "payer.insured_count_on_nov30_prev_year",
            "rule_ids": ["GEN-CLS-001", "GEN-CLS-002"]} in body["missing_data"]


# ------------------------------------------------------------ pipeline: niezdolność do pracy
def test_sickness_voluntary_waiting_not_met_is_not_eligible():
    payload = _case("T-SICK-001")
    payload["person"].update(graduation_date="2015-06-30", special_status="NONE")
    body = pipeline.evaluate(payload)
    benefit = _benefit(body, "SICKNESS_BENEFIT")
    assert benefit["status"] == "NOT_ELIGIBLE" and benefit["payer_of_benefit"] == "ZUS"
    assert [r["code"] for r in benefit["reasons"]] == ["WAITING_PERIOD_NOT_MET"]


def test_sickness_waiting_not_met_without_graduation_data_needs_data():
    # SICK-ELIG-005: brak danych o ukończeniu szkoły przy niespełnionym okresie wyczekiwania → NEEDS_DATA, nie odmowa
    body = pipeline.evaluate(_case("T-SP-006"))
    assert _benefit(body, "EMPLOYER_SICK_PAY")["status"] == "NEEDS_DATA"
    assert "person.graduation_date" in [item["field"] for item in body["missing_data"]]


def test_sickness_graduate_exemption_and_pregnancy_rate():
    benefit = _benefit(pipeline.evaluate(_case("T-SICK-005")), "EMPLOYER_SICK_PAY")
    expected = ("ELIGIBLE", Decimal("1.00"), "CONTRIBUTION_PAYER")
    assert (benefit["status"], Decimal(benefit["rate"]), benefit["payer_of_benefit"]) == expected
    assert {"SICK-ELIG-005", "SICKPAY-ELIG-001", "SICKPAY-RATE-002"} <= set(benefit["applied_rules"])


def test_sickness_sick_pay_exhausted_switches_to_sickness_benefit():
    payload = _case("T-SICK-002")
    payload["insurance"]["titles"] = [_title(start="2022-02-01")]
    payload["benefit_history"]["employer_sick_pay_days_in_year"] = 33
    body = pipeline.evaluate(payload)
    assert [b["benefit_type"] for b in body["benefits"]] == ["SICKNESS_BENEFIT"]
    assert body["benefits"][0]["payer_of_benefit"] == "CONTRIBUTION_PAYER"


def test_sickness_longer_than_remaining_sick_pay_lists_both_benefits():
    payload = _case("T-SICK-002")
    payload["insurance"]["titles"] = [_title(start="2022-02-01")]
    payload["benefit_history"]["employer_sick_pay_days_in_year"] = 20
    body = pipeline.evaluate(payload)
    assert [b["benefit_type"] for b in body["benefits"]] == ["EMPLOYER_SICK_PAY", "SICKNESS_BENEFIT"]
    # BE1-05: podział e-ZLA 2026-10-30..2026-11-30 (32 dni): 13 dni wynagrodzenia (33 - 20), potem 19 dni zasiłku
    sick_pay, benefit = body["benefits"]
    assert (sick_pay["days"], sick_pay["period"]["to"]) == (13, "2026-11-11")
    assert (benefit["days"], benefit["period"]["from"], benefit["period"]["to"]) == (19, "2026-11-12", "2026-11-30")
    assert "SICK-DUR-001" in benefit["applied_rules"]


def test_sickness_after_title_end_without_statement_needs_data_not_refusal():
    # BE1-05: SICK-ELIG-006 oceniane; brak oswiadczenia (zal. 4 ROZP_DOK) dla SICK-EXCL-003 -> NEEDS_DATA, nie odmowa
    payload = _case("T-SICK-011")
    payload["person"] = {"role": "MOTHER", "birth_date": "1994-04-02"}
    body = pipeline.evaluate(payload)
    assert _benefit(body, "SICKNESS_BENEFIT")["status"] == "NEEDS_DATA"
    assert "person.has_pension_or_disability_pension" in [item["field"] for item in body["missing_data"]]


def test_sickness_missing_incapacity_start_needs_data():
    payload = _case("T-SICK-002")
    payload["incapacity"]["start_date"] = None
    body = pipeline.evaluate(payload)
    assert body["overall_status"] == "NEEDS_DATA"
    assert "incapacity.start_date" in [item["field"] for item in body["missing_data"]]


def test_sickness_debt_self_employed_suspends():
    payload = _case("T-SICK-002")
    payload["debt"] = {"amount_on_right_date": "48.07", "repaid_in_full_date": None}
    benefit = _benefit(pipeline.evaluate(payload), "SICKNESS_BENEFIT")
    assert benefit["status"] == "NOT_ELIGIBLE" and benefit["suspended_until_debt_repaid"] is True
