"""Ustalenia z mentorem fachowym ZUS (docs/mentors.md M07–M17) — skutki w silniku (BA-01).

Każdy test w nazwie ma ID pytania mentora i reguły; przypadek typowy, graniczny i brak danych tam, gdzie dotyczy.
"""
import copy
from decimal import Decimal

from app.core.params import param, param_status
from app.engine import pipeline


# ------------------------------------------------------------ M07: płaca minimalna 4806 zł potwierdzona
def test_m07_min_wage_confirmed_no_assumption(demo_payload):
    assert param("MIN_WAGE_2026_MONTHLY") == Decimal("4806.00")
    assert param_status("MIN_WAGE_2026_MONTHLY") == "CONFIRMED"
    payload = copy.deepcopy(demo_payload)
    payload["debt"] = {"amount_on_right_date": "10.00"}
    codes = [a["code"] for a in pipeline.evaluate(payload)["assumptions"]]
    assert "MIN_WAGE_FROM_ATTACHMENT" not in codes


def test_m07_gen_excl_001_threshold_boundary_48_06(demo_payload):
    """Próg zadłużenia JDG (art. 2a) = 4806 × 1% = 48,06 zł.

    Równe progowi → brak wyłączenia, grosz więcej → wyłączenie.
    """
    payload = copy.deepcopy(demo_payload)
    payload["insurance"]["titles"] = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY",
                                       "from": "2024-01-01", "to": None}]
    payload["debt"] = {"amount_on_right_date": "48.06"}
    assert pipeline.evaluate(payload)["benefits"][0]["status"] == "ELIGIBLE"
    payload["debt"] = {"amount_on_right_date": "48.07"}
    assert pipeline.evaluate(payload)["benefits"][0]["status"] == "NOT_ELIGIBLE"


# ------------------------------------------------------------ M08: podstawa składek JDG 2026, limit dobrowolnego
def test_m08_jdg_contribution_bases_2026_params():
    assert param("JDG_MIN_CONTRIB_BASE_2026") == Decimal("5652.00")
    assert param("JDG_PREFERENTIAL_CONTRIB_BASE_2026") == Decimal("1441.80")
    assert param("JDG_PREFERENTIAL_MONTHS") == 24
    assert param("VOLUNTARY_MAX_CONTRIB_BASE_2026") == Decimal("23550.00")
    for name in ("JDG_MIN_CONTRIB_BASE_2026", "JDG_PREFERENTIAL_CONTRIB_BASE_2026", "VOLUNTARY_MAX_CONTRIB_BASE_2026"):
        assert param_status(name) == "CONFIRMED"


def test_m08_values_consistent_with_each_other():
    """Kontrola spójności bez źródeł zewnętrznych.

    Preferencyjna = 30% płacy minimalnej (M07); najniższa (60%) i limit (250%) liczone od tej samej
    kwoty bazowej (5652 / 0,6 = 23 550 / 2,5).
    """
    assert param("MIN_WAGE_2026_MONTHLY") * Decimal("0.3") == param("JDG_PREFERENTIAL_CONTRIB_BASE_2026")
    base = param("JDG_MIN_CONTRIB_BASE_2026") / Decimal("0.6")
    assert base == param("VOLUNTARY_MAX_CONTRIB_BASE_2026") / Decimal("2.5")


# ------------------------------------------------------------ M09: stawka dzienna = podstawa / 30 (CALC-MAT-001)
def test_m09_calc_mat_001_daily_rate_is_base_over_30(demo_payload):
    """Demo: podstawa 6000 zł, 100% → 200 zł/dzień; 140 dni → 28 000 zł (bez zaokrągleń)."""
    benefit = pipeline.evaluate(copy.deepcopy(demo_payload))["benefits"][0]
    base = Decimal(demo_payload["income_history"]["manual_base_override"])
    assert Decimal(benefit["daily_amount_exact"]) == base * Decimal(benefit["rate"]) / param("MONTH_AS_DAYS")
    assert Decimal(benefit["total_amount_exact"]) == Decimal(benefit["daily_amount_exact"]) * benefit["days"]


def test_m09_daily_rate_non_terminating_division_kept_exact(demo_payload):
    """Podstawa niepodzielna przez 30 — dzienna stawka bez zaokrąglenia pośredniego (C1)."""
    payload = copy.deepcopy(demo_payload)
    payload["income_history"]["manual_base_override"] = "5000.00"
    benefit = pipeline.evaluate(payload)["benefits"][0]
    assert Decimal(benefit["daily_amount_exact"]) == Decimal("5000.00") * Decimal(benefit["rate"]) / Decimal(30)
