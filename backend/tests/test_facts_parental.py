"""BE2-02: fakty rodzicielskie/ojcowskie, przejęcie macierzyńskiego, stawki RATE-MAT-*, plan i return_to_work.

Każdy fakt: przypadek typowy, graniczny i brak danych. Scenariusze end-to-end z 08 (T-PAR-*, T-PAT-*, T-RATE-*,
T-INT-001/003/004, T-MAT-011/019..021) sprawdza runner ``test_cases.py`` (baseline).
"""
import copy
from decimal import Decimal

import pytest

from app.engine import pipeline
from app.engine.facts.registry import Context
from tests.test_cases import build_input, test_cases_by_id


def _input(test_id: str, **patch) -> dict:
    payload = build_input(test_cases_by_id()[test_id])
    for path, value in patch.items():
        node = payload
        *head, last = path.split("__")
        for key in head:
            node = node.setdefault(key, {})
        node[last] = value
    return payload


def _ctx(payload: dict, segment=None) -> Context:
    return Context(input=payload, segment=segment)


def _benefit(body: dict, leave_type: str) -> dict:
    return next(b for b in body["benefits"] if b["leave_type"] == leave_type)


def _seg(parent, leave_type, start, end, **extra):
    return {"parent": parent, "leave_type": leave_type, "from": start, "to": end, **extra}


# ------------------------------------------------------------------------------- f_parental_leave_weeks
@pytest.mark.parametrize(("count", "za_zyciem", "weeks"), [(1, False, 41), (2, False, 43), (1, True, 65),
                                                          (2, True, 67)])
def test_parental_leave_weeks_table(count, za_zyciem, weeks):
    payload = _input("T-PAR-001", children__count_at_birth=count, children__za_zyciem_certificate=za_zyciem)
    assert _ctx(payload).fact("f_parental_leave_weeks") == weeks


def test_parental_leave_weeks_missing_za_zyciem_is_unknown():
    ctx = _ctx(_input("T-PAR-001", children__za_zyciem_certificate=None))
    assert ctx.fact("f_parental_leave_weeks") is None
    assert "children.za_zyciem_certificate" in ctx.missing


def _adoption(child_birth: str, event_date: str = "2027-01-04", role: str = "ADOPTIVE_PARENT") -> dict:
    payload = _input("T-PAR-001")
    payload["event"] = {"type": "ADOPTION", "date": event_date, "adoption_final_date": "2027-06-01",
                        "court_adoption_application_date": "2027-01-02"}
    payload["person"]["role"] = role
    payload["children"] = {"count_at_event": 1, "items": [{"birth_date": child_birth}], "za_zyciem_certificate": False}
    payload["plan"] = {"parental_start_date": "2027-06-01"}
    return payload


def _foster(child_birth: str, family: str) -> dict:
    payload = _adoption(child_birth, role="FOSTER_PARENT")
    payload["event"] = {"type": "FOSTER", "date": "2027-01-04", "foster_family_type": family}
    return payload


def test_par_dur_003_adoption_regular_41_weeks():
    assert _ctx(_adoption("2024-01-10")).fact("f_parental_leave_weeks") == 41


def test_par_dur_003_adoption_age_cap_gives_38_weeks():
    # 14. urodziny 2027-03-01 przed końcem 20 tygodni od przyjęcia (2027-05-23) → wariant KP 183 § 3 → 38 tygodni
    assert _ctx(_adoption("2013-03-01")).fact("f_parental_leave_weeks") == 38


def test_par_dur_003_adoption_boundary_last_allowed_day_equals_regular_end():
    # 20 tyg. od 2027-01-04 kończy się 2027-05-23; 14. urodziny 2027-05-24 → ostatni dzień 2027-05-23 → bez skrócenia
    assert _ctx(_adoption("2013-05-24")).fact("f_parental_leave_weeks") == 41
    assert _ctx(_adoption("2013-05-23")).fact("f_parental_leave_weeks") == 38


def test_adoption_age_cap_38_weeks_is_needs_review_m14b():
    # M14b / CONF-003: przesłanka KP 183 § 3 nieustalona — 38 tygodni tylko jako informacja, status NEEDS_REVIEW
    parental = _benefit(pipeline.evaluate(_adoption("2013-03-01")), "PARENTAL_LEAVE")
    assert parental["status"] == "NEEDS_REVIEW" and parental["period"]["max_weeks"] == 38
    assert "PARENTAL_ADOPTION_38_WEEKS_UNCONFIRMED" in [r["code"] for r in parental["reasons"]]


def test_adoption_with_base_right_is_eligible_and_maternity_like_period_not_evaluated():
    body = pipeline.evaluate(_adoption("2024-01-10"))
    parental = _benefit(body, "PARENTAL_LEAVE")
    assert parental["status"] == "ELIGIBLE" and parental["period"]["max_weeks"] == 41
    assert "MAT-ELIG-002" in parental["applied_rules"]
    # BE2-01: okres urlopu na warunkach macierzyńskiego oceniany (MATERNITY_LIKE_LEAVE, MAT-DUR-007)
    assert "MAT-DUR-007" in _benefit(body, "MATERNITY_LIKE_LEAVE")["applied_rules"]


def test_adoption_child_14_years_has_no_parental_right():
    # T-MAT-016: dziecko ukończyło 14 lat w dniu przyjęcia → brak prawa bazowego (MAT-ELIG-002) → brak ELIGIBLE
    body = pipeline.evaluate(_adoption("2013-01-04"))
    parental = _benefit(body, "PARENTAL_LEAVE")
    assert parental["status"] == "NOT_ELIGIBLE"
    assert "NO_MATERNITY_LIKE_RIGHT" in [r["code"] for r in parental["reasons"]]


def test_professional_foster_family_has_no_parental_right_m16b2():
    parental = _benefit(pipeline.evaluate(_foster("2024-05-01", "PROFESSIONAL")), "PARENTAL_LEAVE")
    assert parental["status"] == "NOT_ELIGIBLE"
    assert "PROFESSIONAL_FOSTER_FAMILY" in [r["code"] for r in parental["reasons"]]
    assert _benefit(pipeline.evaluate(_foster("2024-05-01", "NON_PROFESSIONAL")), "PARENTAL_LEAVE")["status"] \
        == "ELIGIBLE"


def test_adoption_missing_court_application_is_needs_data():
    payload = _adoption("2024-01-10")
    payload["event"].pop("court_adoption_application_date")
    body = pipeline.evaluate(payload)
    # brak daty wniosku do sądu = brak danych (NEEDS_DATA), nigdy odmowa
    assert _benefit(body, "PARENTAL_LEAVE")["status"] == "NEEDS_DATA"
    assert {"field": "event.court_adoption_application_date", "rule_ids": ["MAT-ELIG-002"]} in body["missing_data"]


def test_child_age_years_on():
    ctx = _ctx(_adoption("2013-03-01"))
    assert ctx.fact("f_child_age_years_on", date="2027-02-28") == 13
    assert ctx.fact("f_child_age_years_on", date="2027-03-01") == 14   # graniczny: dzień urodzin (C7)
    assert _ctx(_input("T-PAR-001", children__items=None, event__type="ADOPTION")).fact(
        "f_child_age_years_on", date="2027-03-01") is None


def test_gap_019_older_adopted_child_first_year_rule_is_review():
    payload = _adoption("2024-01-10")
    payload["applications"] = {"combined_815_planned": True}
    parental = _benefit(pipeline.evaluate(payload), "PARENTAL_LEAVE")
    assert parental["status"] == "NEEDS_REVIEW"
    codes = [r["code"] for r in parental["reasons"]]
    assert "FIRST_YEAR_RULE_UNCLEAR_FOR_OLDER_CHILD" in codes and "ONE_OFF_EQUALIZATION_TO_100" not in codes


def test_father_at_adoption_gets_paternity():
    payload = _adoption("2026-10-01", role="FATHER")
    payload["plan"] = {"segments": [_seg("FATHER", "PATERNITY_LEAVE", "2027-06-02", "2027-06-15")]}
    paternity = _benefit(pipeline.evaluate(payload), "PATERNITY_LEAVE")
    assert paternity["status"] == "ELIGIBLE" and paternity["total_amount_exact"] == "2800"


# ----------------------------------------------------------------------------------- f_child_alive_on
def test_child_alive_on():
    payload = _input("T-PAR-001", children__items=[{"birth_date": "2027-03-15", "death_date": "2027-09-01"}])
    ctx = _ctx(payload)
    assert ctx.fact("f_child_alive_on", date="2027-08-02") is True
    assert ctx.fact("f_child_alive_on", date="2027-09-01") is True   # graniczny: dzień zgonu
    assert ctx.fact("f_child_alive_on", date="2027-09-02") is False


def test_child_alive_on_stillborn_and_missing_items():
    assert _ctx(_input("T-INT-004")).fact("f_child_alive_on", date="2027-03-29") is False
    ctx = _ctx(_input("T-PAR-001", children__items=None))
    assert ctx.fact("f_child_alive_on", date="2027-08-02") is None and "children.items" in ctx.missing


# ------------------------------------------------------------------------------- pula i części planu
def test_weeks_planned_and_pool_minus_reserved():
    ctx = _ctx(_input("T-PAR-004"))
    assert ctx.fact("f_parental_weeks_planned_for_parent", parent="MOTHER") == Decimal(33)
    assert ctx.fact("f_parental_weeks_planned_for_parent", parent="FATHER") == Decimal(0)
    assert ctx.fact("f_parental_pool_minus_other_parent_reserved") == Decimal(32)


def test_total_parental_weeks_counts_concurrent_twice_minus_extension():
    assert _ctx(_input("T-PAR-010")).fact("f_total_parental_weeks_planned") == Decimal(47)
    assert _ctx(_input("T-PAR-011")).fact("f_total_parental_weeks_planned") == Decimal(41)  # graniczny = pula
    # 10 tyg. przy ½ etatu: 10 − 5 tyg. wydłużenia
    assert _ctx(_input("T-PAR-006")).fact("f_total_parental_weeks_planned") == Decimal(5)


def test_parental_parts_count_merges_adjacent_segments_of_same_parent():
    segs = [_seg("MOTHER", "PARENTAL_LEAVE", "2027-08-02", "2027-08-15"),
            _seg("MOTHER", "PARENTAL_LEAVE", "2027-08-16", "2027-08-29"),   # styka się → ta sama część
            _seg("MOTHER", "PARENTAL_LEAVE", "2027-09-01", "2027-09-14"),
            _seg("FATHER", "PARENTAL_LEAVE", "2027-08-02", "2027-08-15")]
    assert _ctx(_input("T-PAR-001", plan__segments=segs)).fact("f_parental_parts_count") == 3
    assert _ctx(_input("T-PAR-009")).fact("f_parental_parts_count") == 6
    assert _ctx(_input("T-PAR-001")).fact("f_parental_parts_count") == 0  # brak planu


def test_parental_last_day_limit_boundary():
    ok = [_seg("MOTHER", "PARENTAL_LEAVE", "2033-12-20", "2033-12-31")]
    assert _ctx(_input("T-PAR-001", plan__segments=ok)).fact("f_parental_last_day_after_limit") is False
    assert _ctx(_input("T-PAR-008")).fact("f_parental_last_day_after_limit") is True


def test_work_fraction_facts_and_extension():
    ctx = _ctx(_input("T-PAR-006"))
    assert ctx.fact("f_has_work_in_parental") is True
    assert ctx.fact("f_max_work_fraction_in_parental") == Decimal("0.5")
    assert ctx.fact("f_parental_extension") == {"weeks": Decimal(5), "days": 35}
    plain = _ctx(_input("T-PAR-001"))
    assert plain.fact("f_has_work_in_parental") is False and plain.fact("f_max_work_fraction_in_parental") == 0
    seg = _seg("MOTHER", "PARENTAL_LEAVE", "2027-08-02", "2027-10-10", work_fraction="0.25")
    assert _ctx(_input("T-PAR-001"), seg).fact("f_one_minus_work_fraction") == Decimal("0.75")


def test_parental_extension_drops_partial_day_and_is_capped():
    # 3 tyg. × 0,3 = 0,9 tyg. = 6,3 dnia → 6 dni (niepełny dzień pomija się, KP 182(1f) § 4)
    seg = [_seg("MOTHER", "PARENTAL_LEAVE", "2027-08-02", "2027-08-22", work_fraction="0.3")]
    assert _ctx(_input("T-PAR-001", plan__segments=seg)).fact("f_parental_extension")["days"] == 6
    # cap 82 tyg. łącznie: 100 tyg. × 0,5 = 50 tyg. > 82 − 41 = 41 tyg.
    long = [_seg("MOTHER", "PARENTAL_LEAVE", "2027-08-02", "2029-06-30", work_fraction="0.5")]
    assert _ctx(_input("T-PAR-001", plan__segments=long)).fact("f_parental_extension")["weeks"] == Decimal(41)


# --------------------------------------------------------------------------------------------- stawki
def test_segment_is_other_parent_reserved_9w_derived_when_null():
    payload = _input("T-RATE-006")
    first = _seg("FATHER", "PARENTAL_LEAVE", "2027-12-01", "2027-12-28")
    payload["plan"]["segments"] = [first, _seg("FATHER", "PARENTAL_LEAVE", "2028-03-01", "2028-03-28")]
    assert _ctx(payload, first).fact("f_segment_is_other_parent_reserved_9w") is True
    later = _seg("FATHER", "PARENTAL_LEAVE", "2028-03-01", "2028-03-28")
    assert _ctx(payload, later).fact("f_segment_is_other_parent_reserved_9w") is True  # 28 dni < 63
    payload["plan"]["segments"].insert(0, _seg("FATHER", "PARENTAL_LEAVE", "2027-09-01", "2027-11-02"))  # 63 dni
    assert _ctx(payload, later).fact("f_segment_is_other_parent_reserved_9w") is False
    mother = _seg("MOTHER", "PARENTAL_LEAVE", "2027-08-02", "2027-08-15")
    assert _ctx(payload, mother).fact("f_segment_is_other_parent_reserved_9w") is False


def test_any_parental_day_in_first_year_boundary():
    before = [_seg("MOTHER", "PARENTAL_LEAVE", "2028-03-14", "2028-04-11")]
    assert _ctx(_input("T-PAR-001", plan__segments=before)).fact("f_any_parental_day_in_first_year") is True
    assert _ctx(_input("T-RATE-005")).fact("f_any_parental_day_in_first_year") is False  # od 1. urodzin
    assert _ctx(_input("T-PAR-001")).fact("f_any_parental_day_in_first_year") is None    # brak planu i segmentu


def test_rate_mat_006_one_off_equalization():
    body = pipeline.evaluate(_input("T-RATE-005"))
    reason = next(r for r in _benefit(body, "PARENTAL_LEAVE")["reasons"] if r["rule_id"] == "RATE-MAT-006")
    assert "5180 zł" in reason["message"]  # 6000 × (1 − 0,815) / 30 × 140 dni
    plain = pipeline.evaluate(_input("T-INT-001"))  # rodzicielski w 1. roku → bez wyrównania
    assert "RATE-MAT-006" not in _benefit(plain, "PARENTAL_LEAVE")["applied_rules"]


def test_parental_proposal_without_plan_is_daily_amount_only():
    parental = _benefit(pipeline.evaluate(_input("T-PAR-001")), "PARENTAL_LEAVE")
    assert parental["status"] == "ELIGIBLE" and parental["rate"] == "0.7" and parental["daily_amount_exact"] == "140"
    assert parental["period"] == {"max_weeks": 41, "from": "2027-08-02"}  # dzień po macierzyńskim
    assert "total_amount_exact" not in parental or parental["total_amount_exact"] is None


def test_parental_segments_with_mixed_rates():
    payload = _input("T-RATE-006")
    payload["plan"]["segments"] = [_seg("FATHER", "PARENTAL_LEAVE", "2027-12-01", "2028-02-01",
                                        is_other_parent_reserved_9w=True),
                                   _seg("FATHER", "PARENTAL_LEAVE", "2028-02-02", "2028-02-15",
                                        is_other_parent_reserved_9w=False)]
    parental = _benefit(pipeline.evaluate(payload), "PARENTAL_LEAVE")
    assert [s["rate"] for s in parental["segments"]] == ["0.7", "0.815"]
    assert parental["rate"] is None and parental["daily_amount_exact"] is None
    totals = [Decimal(s["total_amount_exact"]) for s in parental["segments"]]
    assert Decimal(parental["total_amount_exact"]) == sum(totals)


def test_father_without_parental_segments_gets_no_parental_benefit_and_no_maternity():
    body = pipeline.evaluate(_input("T-PAT-001"))
    assert [b["leave_type"] for b in body["benefits"]] == ["PATERNITY_LEAVE"]


def test_parental_debt_exclusion_applies():
    payload = _input("T-RATE-003")
    payload["insurance"]["titles"] = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY",
                                       "from": "2024-01-01", "to": None}]
    payload["debt"] = {"amount_on_right_date": "500.00"}
    parental = _benefit(pipeline.evaluate(payload), "PARENTAL_LEAVE")
    assert parental["status"] == "NOT_ELIGIBLE" and parental["suspended_until_debt_repaid"] is True


def test_child_death_during_parental_is_review():
    payload = _input("T-RATE-003", children__items=[{"birth_date": "2027-03-15", "death_date": "2027-08-10"}])
    assert _benefit(pipeline.evaluate(payload), "PARENTAL_LEAVE")["status"] == "NEEDS_REVIEW"  # GAP-014


# ------------------------------------------------------------------------------------------- ojcowski
def test_paternity_window_and_deadline_boundary():
    payload = _input("T-PAT-001")
    assert _ctx(payload).fact("f_paternity_window")["deadline"].isoformat() == "2028-03-14"
    payload["plan"]["segments"] = [_seg("FATHER", "PATERNITY_LEAVE", "2028-03-01", "2028-03-14")]
    assert _ctx(payload).fact("f_paternity_within_deadline") is True      # ostatni dzień = deadline
    assert _ctx(_input("T-PAT-002")).fact("f_paternity_within_deadline") is False


def test_paternity_parts_rules():
    payload = _input("T-PAT-001")
    payload["plan"]["segments"] = [_seg("FATHER", "PATERNITY_LEAVE", "2027-04-01", "2027-04-07"),
                                   _seg("FATHER", "PATERNITY_LEAVE", "2027-05-01", "2027-05-07")]
    assert _ctx(payload).fact("f_paternity_within_deadline") is True       # 2 × 7 dni
    payload["plan"]["segments"].append(_seg("FATHER", "PATERNITY_LEAVE", "2027-06-01", "2027-06-07"))
    assert _ctx(payload).fact("f_paternity_within_deadline") is False      # 3 części, 21 dni


def test_paternity_without_plan_asks_for_start_date():
    payload = _input("T-PAT-001")
    payload["plan"] = {}
    body = pipeline.evaluate(payload)
    assert _benefit(body, "PATERNITY_LEAVE")["status"] == "NEEDS_DATA"
    assert any(m["field"] == "plan.paternity_start_date" for m in body["missing_data"])


def test_paternity_start_date_only_proposes_14_days():
    payload = _input("T-PAT-001")
    payload["plan"] = {"paternity_start_date": "2027-04-01"}
    paternity = _benefit(pipeline.evaluate(payload), "PATERNITY_LEAVE")
    assert paternity["period"] == {"max_days": 14, "from": "2027-04-01", "to": "2027-04-14"}
    assert paternity["total_amount_exact"] == "2800"


# ------------------------------------------------------------------------------- przejęcie (MAT-SHARE)
def test_mother_weeks_used_and_total_maternity_weeks():
    ctx = _ctx(_input("T-MAT-019"))
    assert ctx.fact("f_mother_maternity_weeks_used_after_birth") == Decimal(14)
    assert ctx.fact("f_total_maternity_weeks_planned") == Decimal(20)
    assert _ctx(_input("T-MAT-021")).fact("f_total_maternity_weeks_planned") == Decimal(21)


def test_mother_weeks_used_counts_only_after_birth():
    payload = _input("T-MAT-019")
    payload["plan"]["segments"][0]["from"] = "2027-03-01"  # 14 dni przed porodem nie liczy się
    assert _ctx(payload).fact("f_mother_maternity_weeks_used_after_birth") == Decimal(14)


def test_transfer_missing_insurance_is_needs_data():
    payload = _input("T-MAT-019")
    payload["insurance"]["titles"] = None
    payload["insurance"]["titles_confirmed_complete"] = None
    body = pipeline.evaluate(payload)
    assert _benefit(body, "MATERNITY_LEAVE_TRANSFERRED")["status"] == "NEEDS_DATA"


def test_hospitalization_substitute_for_father():
    payload = _input("T-MAT-019")
    payload["mother"] = {"hospitalized_unable_to_care": True}
    payload["plan"] = {"segments": [_seg("MOTHER", "MATERNITY_LEAVE", "2027-03-15", "2027-05-09"),
                                    _seg("FATHER", "MATERNITY_LEAVE_HOSPITALIZATION_SUBSTITUTE", "2027-05-10",
                                         "2027-05-23")]}
    benefit = _benefit(pipeline.evaluate(payload), "MATERNITY_LEAVE_HOSPITALIZATION_SUBSTITUTE")
    assert benefit["status"] == "ELIGIBLE" and benefit["rate"] == "1" and benefit["total_amount_exact"] == "2800"


def test_weeks_before_due_date():
    ctx = _ctx(_input("T-MAT-011"))
    assert ctx.fact("f_weeks_before_due_date") == Decimal(43) / Decimal(7)
    assert _ctx(_input("T-PAR-001")).fact("f_weeks_before_due_date") is None  # brak startu przed porodem


# ------------------------------------------------------------------------------- plan i powrót do pracy
def test_plan_errors_empty_without_plan_and_status_unchanged_by_plan_errors():
    assert pipeline.evaluate(_input("T-PAR-001"))["plan_errors"] == []
    body = pipeline.evaluate(_input("T-PAR-007"))
    assert body["plan_errors"] == [{"code": "WORK_FRACTION_ABOVE_HALF", "rule_id": "PAR-WORK-001"}]
    assert _benefit(body, "PARENTAL_LEAVE")["status"] == "ELIGIBLE"


def test_return_to_work_per_parent_with_part_time():
    body = pipeline.evaluate(_input("T-INT-001"))
    assert body["return_to_work"] == [{"parent": "MOTHER", "date": "2028-03-13", "part_time_fraction": None},
                                      {"parent": "FATHER", "date": "2028-05-15", "part_time_fraction": None}]
    assert pipeline.evaluate(_input("T-PAR-006"))["return_to_work"] == [
        {"parent": "MOTHER", "date": "2027-10-11", "part_time_fraction": "0.5"}]
    assert pipeline.evaluate(_input("T-PAR-001"))["return_to_work"] == []


def test_mother_parental_not_better_than_maternity_status():
    # PAR-ELIG-001 zależy od MAT-ELIG-001: tytuł od 2027-05-01 → brak ubezpieczenia w dniu porodu i brak podstaw
    # z art. 30 (BE2-01: MAT-NEG-001) → macierzyński NOT_ELIGIBLE → rodzicielski nie lepszy
    payload = _input("T-PAR-001")
    payload["insurance"]["titles"][0]["from"] = "2027-05-01"
    body = pipeline.evaluate(payload)
    assert _benefit(body, "MATERNITY_LEAVE")["status"] == "NOT_ELIGIBLE"
    assert _benefit(body, "PARENTAL_LEAVE")["status"] == "NOT_ELIGIBLE"


def test_mother_parental_not_eligible_when_maternity_not_eligible():
    payload = _input("T-PAR-001")
    payload["insurance"]["titles"] = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY",
                                       "from": "2024-01-01", "to": None}]
    payload["debt"] = {"amount_on_right_date": "500.00"}
    body = pipeline.evaluate(payload)
    assert _benefit(body, "MATERNITY_LEAVE")["status"] == "NOT_ELIGIBLE"
    assert _benefit(body, "PARENTAL_LEAVE")["status"] == "NOT_ELIGIBLE"


def test_gap_018_work_in_parental_by_non_employee_is_review_not_plan_error():
    payload = _input("T-PAR-007")
    payload["insurance"]["titles"] = [{"title_type": "SELF_EMPLOYED", "sickness_insurance_mode": "VOLUNTARY",
                                       "from": "2024-01-01", "to": None}]
    body = pipeline.evaluate(payload)
    assert body["plan_errors"] == []
    parental = _benefit(body, "PARENTAL_LEAVE")
    assert parental["status"] == "NEEDS_REVIEW"
    assert "PARENTAL_WORK_NON_EMPLOYEE_UNCLEAR" in [r["code"] for r in parental["reasons"]]


def test_gap_016_reserved_weeks_with_uninsured_mother_is_review():
    payload = _input("T-RATE-004")
    payload["mother"] = {"sickness_insured": False}
    payload["plan"]["segments"] = [_seg("MOTHER", "PARENTAL_LEAVE", "2027-08-02", "2028-03-19"),
                                   _seg("FATHER", "PARENTAL_LEAVE", "2028-03-20", "2028-04-02")]
    body = pipeline.evaluate(payload)
    assert {"code": "NON_TRANSFERABLE_9W_VIOLATED", "rule_id": "PAR-SHARE-001"} in body["plan_errors"]
    assert _benefit(body, "PARENTAL_LEAVE")["status"] == "NEEDS_REVIEW"
    payload["mother"] = {"sickness_insured": True}  # matka ubezpieczona → zwykły błąd planu, status bez zmian
    assert _benefit(pipeline.evaluate(payload), "PARENTAL_LEAVE")["status"] == "ELIGIBLE"


def test_one_off_equalization_missing_base_is_unknown():
    ctx = _ctx(_input("T-RATE-005", income_history__manual_base_override=None))
    assert ctx.fact("f_one_off_equalization") is None
    assert "income_history.manual_base_override" in ctx.missing


def test_paternity_window_adoption_missing_final_date_is_unknown():
    payload = _adoption("2026-10-01", role="FATHER")
    payload["event"].pop("adoption_final_date")
    ctx = _ctx(payload)
    assert ctx.fact("f_paternity_window") is None and "event.adoption_final_date" in ctx.missing


def test_fact_cache_is_keyed_by_segment_content():
    ctx = _ctx(_input("T-PAR-001"))
    ctx.segment = {"parent": "MOTHER", "leave_type": "PARENTAL_LEAVE", "work_fraction": "0.5"}
    assert ctx.fact("f_segment_work_fraction") == Decimal("0.5")
    ctx.segment = {"parent": "MOTHER", "leave_type": "PARENTAL_LEAVE", "work_fraction": "0.25"}
    assert ctx.fact("f_segment_work_fraction") == Decimal("0.25")  # nowy segment → nowa wartość, bez trafienia w cache


def test_response_matches_contract_for_parental_scenarios(client):
    from tests.test_contract import _validator

    for test_id in ("T-INT-001", "T-PAT-001", "T-MAT-019", "T-PAR-006", "T-PAR-003", "T-INT-004"):
        payload = copy.deepcopy(_input(test_id))
        response = client.post("/api/evaluate", json=payload)
        assert response.status_code == 200, response.text
        _validator("EvaluateResponse").validate(response.json())
