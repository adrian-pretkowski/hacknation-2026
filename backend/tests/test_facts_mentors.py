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
