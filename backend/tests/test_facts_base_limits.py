"""BE2-12: granice nowej podstawy wymiaru — BASE-EMP-008 (minimum przy pełnym etacie, M07, M07a)
i BASE-NEMP-005 (limit przy dobrowolnym chorobowym, M08). Przypadek typowy, graniczny i brak danych.
"""
import copy
from decimal import Decimal

from app.core.params import param
from app.engine import pipeline


def _maternity(result: dict) -> dict:
    return next(b for b in result["benefits"] if b.get("leave_type") == "MATERNITY_LEAVE")


def _employee(demo_payload: dict, base: str, fraction: str | None) -> dict:
    payload = copy.deepcopy(demo_payload)
    payload["income_history"] = {"manual_base_override": base}
    payload.setdefault("employment", {})["working_time_fraction"] = fraction
    return payload


def _voluntary(demo_payload: dict, base: str, title_type: str = "SELF_EMPLOYED") -> dict:
    payload = copy.deepcopy(demo_payload)
    payload["insurance"]["titles"] = [{"title_type": title_type, "sickness_insurance_mode": "VOLUNTARY",
                                       "from": "2024-01-01", "to": None}]
    payload["debt"] = {"amount_on_right_date": "0.00"}
    payload["income_history"] = {"manual_base_override": base}
    return payload


MIN_BASE = Decimal("4147.10")
CAP = param("VOLUNTARY_MAX_CONTRIB_BASE_2026") * (Decimal(1) - param("CONTRIBUTION_DEDUCTION_RATE"))


# ------------------------------------------------------------ BASE-EMP-008: minimum przy pełnym etacie
def test_be2_12_base_emp_008_full_time_low_base_raised_to_minimum(demo_payload):
    benefit = _maternity(pipeline.evaluate(_employee(demo_payload, "3451.60", "1.0")))
    assert Decimal(benefit["base"]["amount_exact"]) == MIN_BASE
    assert "BASE-EMP-008" in benefit["applied_rules"]
    assert Decimal(benefit["daily_amount_exact"]) == MIN_BASE * Decimal(benefit["rate"]) / param("MONTH_AS_DAYS")
    assert any(r["code"] == "BASE_RAISED_TO_MINIMUM" for r in benefit["reasons"])


def test_be2_12_base_emp_008_boundary_equal_to_minimum_unchanged(demo_payload):
    benefit = _maternity(pipeline.evaluate(_employee(demo_payload, "4147.10", "1.0")))
    assert Decimal(benefit["base"]["amount_exact"]) == MIN_BASE
    assert "BASE-EMP-008" not in benefit["applied_rules"]


def test_be2_12_base_emp_008_part_time_no_minimum(demo_payload):
    benefit = _maternity(pipeline.evaluate(_employee(demo_payload, "2000.00", "0.5")))
    assert Decimal(benefit["base"]["amount_exact"]) == Decimal("2000.00")
    assert "BASE-EMP-008" not in benefit["applied_rules"]


def test_be2_12_base_emp_008_unknown_working_time_below_minimum_needs_data(demo_payload):
    """Brak wymiaru etatu przy podstawie poniżej minimum: BASE-EMP-008 rozstrzyga kwotę → NEEDS_DATA (03)."""
    result = pipeline.evaluate(_employee(demo_payload, "3000.00", None))
    assert any(m["field"] == "employment.working_time_fraction" for m in result["missing_data"])
    assert _maternity(result)["status"] == "NEEDS_DATA"


def test_be2_12_base_emp_008_unknown_working_time_above_minimum_no_question(demo_payload):
    """Podstawa ≥ minimum: wymiar etatu nie zmienia kwoty — bez dopytania."""
    result = pipeline.evaluate(_employee(demo_payload, "6000.00", None))
    assert all(m["field"] != "employment.working_time_fraction" for m in result["missing_data"])
    assert Decimal(_maternity(result)["base"]["amount_exact"]) == Decimal("6000.00")


# ------------------------------------------------------------ BASE-NEMP-005: limit przy dobrowolnym chorobowym
def test_be2_12_base_nemp_005_voluntary_base_above_cap_capped(demo_payload):
    benefit = _maternity(pipeline.evaluate(_voluntary(demo_payload, "25000.00")))
    assert Decimal(benefit["base"]["amount_exact"]) == CAP == Decimal("20321.295")
    assert "BASE-NEMP-005" in benefit["applied_rules"]
    assert any(r["code"] == "BASE_CAPPED_VOLUNTARY" for r in benefit["reasons"])


def test_be2_12_base_nemp_005_boundary_equal_to_cap_unchanged(demo_payload):
    benefit = _maternity(pipeline.evaluate(_voluntary(demo_payload, "20321.295", "CIVIL_CONTRACT_MANDATE")))
    assert Decimal(benefit["base"]["amount_exact"]) == CAP
    assert "BASE-NEMP-005" not in benefit["applied_rules"]


def test_be2_12_base_nemp_005_mandatory_title_not_capped(demo_payload):
    benefit = _maternity(pipeline.evaluate(_employee(demo_payload, "25000.00", "1.0")))
    assert Decimal(benefit["base"]["amount_exact"]) == Decimal("25000.00")
    assert "BASE-NEMP-005" not in benefit["applied_rules"]
