"""Ustalenia z mentorem fachowym ZUS (docs/mentors.md M07–M17) — skutki w silniku (BA-01).

Każdy test w nazwie ma ID pytania mentora i reguły; przypadek typowy, graniczny i brak danych tam, gdzie dotyczy.
"""
import copy
from datetime import date
from decimal import Decimal

from app.core.dates import age_years_on, next_working_day
from app.core.params import param, param_status
from app.engine import pipeline
from app.engine.pipeline import ruleset


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


# ------------------------------------------------------------ M10: podwyższenie do świadczenia rodzicielskiego
def _rate_100(demo_payload, base):
    payload = copy.deepcopy(demo_payload)
    payload["applications"] = {"combined_815_planned": False}  # bez wniosku 81,5% → 100%
    payload["income_history"]["manual_base_override"] = base
    return payload


def test_m10_rate_mat_007_raises_low_amount_to_floor(demo_payload):
    """Typowy: podstawa 800 zł × 100% = 800 zł/mies. < 1000 zł → 1000/30 za dzień, 140 dni."""
    body = pipeline.evaluate(_rate_100(demo_payload, "800.00"))
    benefit = body["benefits"][0]
    floor = param("PARENTAL_BENEFIT_FLOOR_MONTHLY")
    assert floor == Decimal("1000.00") and param_status("PARENTAL_BENEFIT_FLOOR_MONTHLY") == "CONFIRMED"
    assert benefit["status"] == "ELIGIBLE" and "RATE-MAT-007" in benefit["applied_rules"]
    assert Decimal(benefit["daily_amount_exact"]) == floor / param("MONTH_AS_DAYS")
    assert Decimal(benefit["total_amount_exact"]) == floor / param("MONTH_AS_DAYS") * benefit["days"]
    assert "RAISED_TO_PARENTAL_BENEFIT_FLOOR" in [r["code"] for r in benefit["reasons"]]
    assert "RATE-MAT-007" not in body["not_evaluated_rules"]


def test_m10_rate_mat_007_raises_after_815_rate(demo_payload):
    """81,5%: 1200 × 0,815 = 978 zł < 1000 zł → podwyższenie (porównanie przed zaokrągleniem, M10 b)."""
    payload = copy.deepcopy(demo_payload)
    payload["income_history"]["manual_base_override"] = "1200.00"
    benefit = pipeline.evaluate(payload)["benefits"][0]
    assert benefit["rate"] == "0.815" and "RATE-MAT-007" in benefit["applied_rules"]


def test_m10_rate_mat_007_boundary_equal_floor_not_raised(demo_payload):
    """Graniczny: dokładnie 1000 zł → bez podwyższenia; 999,99 zł → podwyższenie."""
    benefit = pipeline.evaluate(_rate_100(demo_payload, "1000.00"))["benefits"][0]
    assert "RATE-MAT-007" not in benefit["applied_rules"]
    assert Decimal(benefit["daily_amount_exact"]) == Decimal("1000.00") / param("MONTH_AS_DAYS")
    raised = pipeline.evaluate(_rate_100(demo_payload, "999.99"))["benefits"][0]
    assert "RATE-MAT-007" in raised["applied_rules"]


def test_m10_rate_mat_007_missing_base_needs_data_not_review(demo_payload):
    """Brak podstawy → NEEDS_DATA (podstawa), reguła nie wymusza NEEDS_REVIEW."""
    payload = copy.deepcopy(demo_payload)
    payload["income_history"] = {"manual_base_override": None}
    body = pipeline.evaluate(payload)
    assert body["benefits"][0]["status"] == "NEEDS_DATA"
    assert "RATE-MAT-007" not in body["benefits"][0]["applied_rules"]


# ------------------------------------------------------------ M11: ojciec przejmuje 81,5% (RATE-MAT-008)
def test_m11_rate_mat_008_active_father_gets_combined_rate():
    rule = ruleset().rule("RATE-MAT-008")
    assert rule["evaluation"] == "ACTIVE"
    assert rule["result"]["set"]["rate"] == {"param": "MAT_RATE_COMBINED"}
    assert param("MAT_RATE_COMBINED") == Decimal("0.815")


def test_m11_father_9_weeks_and_after_first_year_stay_70():
    """Granice: 9 tyg. ojca (RATE-MAT-008 wymaga segmentu poza 9 tyg.) i po 1. roku życia (RATE-MAT-005 nadpisuje)."""
    conditions = ruleset().rule("RATE-MAT-008")["conditions"]["all"]
    assert {"fact": "f_segment_is_other_parent_reserved_9w", "operator": "eq", "value": False} in conditions
    assert "RATE-MAT-008" in ruleset().rule("RATE-MAT-005")["overrides"]


# ------------------------------------------------------------ M12: brak okresu wyczekiwania (MAT-CLS-001)
def _jdg_from(demo_payload, start):
    payload = copy.deepcopy(demo_payload)
    payload["insurance"]["titles"] = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY",
                                       "from": start, "to": None}]
    payload["debt"] = {"amount_on_right_date": "0.00"}
    return payload


def test_m12_mat_cls_001_jdg_insured_30_days_before_birth_eligible(demo_payload):
    """Typowy: JDG z dobrowolnym chorobowym od 30 dni przed porodem → ELIGIBLE (bez 90 dni wyczekiwania)."""
    assert pipeline.evaluate(_jdg_from(demo_payload, "2027-02-13"))["benefits"][0]["status"] == "ELIGIBLE"


def test_m12_mat_cls_001_insured_from_birth_day_eligible(demo_payload):
    """Graniczny: ubezpieczenie od dnia porodu → ELIGIBLE; od dnia po porodzie → brak prawa z art. 29."""
    assert pipeline.evaluate(_jdg_from(demo_payload, "2027-03-15"))["benefits"][0]["status"] == "ELIGIBLE"
    assert pipeline.evaluate(_jdg_from(demo_payload, "2027-03-16"))["benefits"][0]["status"] != "ELIGIBLE"


def test_m12_par_elig_001_father_insured_on_his_parental_start():
    """M12 b: ubezpieczenie ojca badane w dniu startu jego części rodzicielskiego, nie w dniu porodu."""
    conditions = ruleset().rule("PAR-ELIG-001")["conditions"]["all"]
    insured = [c for c in conditions if c.get("fact") == "f_sickness_insured_on"]
    assert insured and insured[0]["args"] == {"date": "plan.parental_start_date"}


# ------------------------------------------------------------ M13: przedłużenie umowy do porodu (MAT-CLS-002)
def _fixed_term(demo_payload, end, start="2026-06-08", replacement=False):
    payload = copy.deepcopy(demo_payload)
    payload["insurance"] = {"titles": [{"title_type": "EMPLOYMENT_CONTRACT", "sickness_insurance_mode": "MANDATORY",
                                        "from": "2025-03-01", "to": end}], "titles_confirmed_complete": False}
    payload["employment"] = {"contract_type": "FIXED_TERM", "contract_end_date": end,
                             "is_replacement_contract": replacement, "extended_until_birth_kp177": None, "leaves": []}
    payload["pregnancy"] = {"pregnancy_start_date": start} if start else {}
    payload["debt"] = {"amount_on_right_date": "0.00"}
    return payload


def test_m13_t_mat_009_fixed_term_extended_until_birth(demo_payload):
    """Typowy (T-MAT-009): umowa do 31.12, ciąża od 8.06 → przedłużenie do porodu → ELIGIBLE."""
    benefit = pipeline.evaluate(_fixed_term(demo_payload, "2026-12-31"))["benefits"][0]
    assert benefit["status"] == "ELIGIBLE" and "MAT-CLS-002" in benefit["applied_rules"]
    assert "KP177_EXTENDED_UNTIL_BIRTH" in [r["code"] for r in benefit["reasons"]]


def test_m13_third_month_boundary(demo_payload):
    """Graniczny: ciąża od 8.06 → 3. miesiąc trwa do 7.09; umowa do 8.09 → przedłużona, do 7.09 → nie."""
    assert pipeline.evaluate(_fixed_term(demo_payload, "2026-09-08"))["benefits"][0]["status"] == "ELIGIBLE"
    benefit = pipeline.evaluate(_fixed_term(demo_payload, "2026-09-07"))["benefits"][0]
    assert benefit["status"] != "ELIGIBLE" and "MAT-CLS-002" not in benefit["applied_rules"]


def test_m13_replacement_contract_not_extended(demo_payload):
    benefit = pipeline.evaluate(_fixed_term(demo_payload, "2026-12-31", replacement=True))["benefits"][0]
    assert "MAT-CLS-002" not in benefit["applied_rules"]


def test_m13_missing_pregnancy_start_asks_for_doctor_date(demo_payload):
    """Brak danych: bez daty początku ciąży (zaświadczenie lekarskie) → pytanie o pole, nigdy odmowa."""
    body = pipeline.evaluate(_fixed_term(demo_payload, "2026-12-31", start=None))
    assert body["benefits"][0]["status"] != "NOT_ELIGIBLE"
    assert "pregnancy.pregnancy_start_date" in [m["field"] for m in body["missing_data"]]


# ------------------------------------------------------------ M14: limit wieku przy przyjęciu dziecka (MAT-DUR-007/008)
def test_m14_c_age_limit_until_birthday():
    """„Do dnia urodzin”: dzień przed 14. urodzinami dziecko ma 13 lat, w dniu urodzin — 14 (C7, GAP-005)."""
    assert age_years_on(date(2013, 1, 31), date(2027, 1, 30)) == 13
    assert age_years_on(date(2013, 1, 31), date(2027, 1, 31)) == 14


def test_m14_a_nine_weeks_not_a_minimum():
    """MAT-DUR-008 nie podwyższa urlopu do 9 tyg. ponad limit wieku (tylko informacja), MAT-DUR-007 bez wyjątku."""
    rule = ruleset().rule("MAT-DUR-008")
    assert rule["evaluation"] == "INFORMATIONAL" and rule["overrides"] == []
    assert "set" not in rule["result"]
    assert "MAT-DUR-008" not in ruleset().rule("MAT-DUR-007")["exceptions"]


# ------------------------------------------------------------ M15 d: termin w dzień wolny → następny dzień roboczy
def test_m15_d_next_working_day():
    assert next_working_day(date(2027, 4, 2)) == date(2027, 4, 2)  # piątek — bez zmian
    assert next_working_day(date(2027, 4, 3)) == date(2027, 4, 5)  # sobota → poniedziałek
    assert next_working_day(date(2027, 4, 4)) == date(2027, 4, 5)  # niedziela → poniedziałek
    assert next_working_day(date(2027, 4, 5), {date(2027, 4, 5)}) == date(2027, 4, 6)  # święto z parametru


def _born_sunday(demo_payload, filed):
    payload = copy.deepcopy(demo_payload)
    payload["event"] = {"type": "BIRTH", "date": "2027-03-14"}
    payload["applications"] = {"combined_815_filed_date": filed}
    return payload


def test_m15_d_app_dl_001_deadline_on_sunday_moves_to_monday(demo_payload):
    """T-RATE-009: 14.03 + 21 = 4.04 (niedziela) → wniosek 5.04 w terminie (81,5%), 6.04 — po terminie (100%)."""
    body = pipeline.evaluate(_born_sunday(demo_payload, "2027-04-05"))
    assert body["benefits"][0]["rate"] == "0.815"
    assert "PUBLIC_HOLIDAYS_NOT_LOADED" in [a["code"] for a in body["assumptions"]]
    late = pipeline.evaluate(_born_sunday(demo_payload, "2027-04-06"))["benefits"][0]
    assert Decimal(late["rate"]) == param("MAT_RATE_FULL")


def test_m15_d_working_day_deadline_not_moved(demo_payload):
    """T-RATE-001: 15.03 + 21 = 5.04 (poniedziałek) — wniosek 6.04 już po terminie."""
    payload = copy.deepcopy(demo_payload)
    payload["applications"] = {"combined_815_filed_date": "2027-04-06"}
    assert Decimal(pipeline.evaluate(payload)["benefits"][0]["rate"]) == param("MAT_RATE_FULL")


# ------------------------------------------------------------ M15 a, c, e: numeracja dni, uzupełniający, art. 30 ust. 3
def test_m15_rules_reflect_mentor_answers():
    rules = ruleset()
    assert "dzień porodu = dzień 1" in rules.rule("SUPP-ELIG-003")["notes"]
    assert "M15 c" in rules.rule("SUPP-COND-001")["notes"]
    assert rules.rule("MAT-ELIG-007")["result"]["set"]["period_end"] == "DAY_BEFORE_BIRTH"


# ------------------------------------------------------------ M16: zakres produktu (MAT-ELIG-007, MAT-EXCL-001, REHAB)
def test_m16_a_mat_elig_007_includes_court_confirmed_unlawful_termination():
    """CONF-001: stosujemy treść zadania — naruszenie prawa stwierdzone przez sąd (T-MAT-007 → POSITIVE)."""
    reasons = next(c for c in ruleset().rule("MAT-ELIG-007")["conditions"]["all"]
                   if c.get("fact") == "f_last_title_termination_reason")["value"]
    assert "UNLAWFUL_TERMINATION_COURT_CONFIRMED" in reasons
    assert "UNLAWFUL_TERMINATION_PENDING" not in reasons  # postępowanie w toku — prawo jeszcze niestwierdzone


def test_m16_b_professional_foster_family_still_excluded():
    """Pkt j) obejmuje rodzinę zastępczą zawodową, ale wynik to brak prawa (art. 29 ust. 1 pkt 3)."""
    rule = ruleset().rule("MAT-EXCL-001")
    assert rule["evaluation"] == "ACTIVE" and rule["result"]["status"] == "NOT_ELIGIBLE"
