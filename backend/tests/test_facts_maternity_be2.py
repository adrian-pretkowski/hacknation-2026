"""BE2-01: fakty macierzyńskie i uzupełniające (zus_rules/07 §3, §5) — przypadek typowy, graniczny, brak danych.

Przebiegi end-to-end: T-MAT-004..022 i T-SUPP-001..011 w ``test_cases.py`` (runner 08, baseline).
"""
from datetime import date
from decimal import Decimal

import pytest

from app.engine import pipeline
from app.engine.facts import Context

BIRTH = {"type": "BIRTH", "date": "2027-03-15"}
PREGNANCY = {"pregnancy_start_date": "2026-06-08", "expected_due_date": "2027-03-15"}


def _title(to=None, reason=None, title_type="EMPLOYMENT_CONTRACT"):
    return {"title_type": title_type, "sickness_insurance_mode": "MANDATORY", "from": "2022-02-01", "to": to,
            "termination_reason": reason}


def _ctx(data: dict, as_of=date(2026, 11, 21)) -> Context:
    return Context(input=data, as_of=as_of)


def _ins(*titles) -> dict:
    return {"titles": list(titles), "titles_confirmed_complete": True}


# ------------------------------------------------------------ art. 30 (MAT-ELIG-004/005/006/007, MAT-NEG-001)
def test_f_title_ended_during_pregnancy_typical_boundary_open():
    data = {"event": BIRTH, "pregnancy": PREGNANCY, "insurance": _ins(_title("2026-12-31", "EMPLOYER_LIQUIDATION"))}
    assert _ctx(data).fact("f_title_ended_during_pregnancy") is True
    data["insurance"] = _ins(_title("2027-03-15"))  # ustanie w dniu porodu — nie „przed porodem” (to < event.date)
    assert _ctx(data).fact("f_title_ended_during_pregnancy") is False
    data["insurance"] = _ins(_title("2026-06-07"))  # dzień przed początkiem ciąży
    assert _ctx(data).fact("f_title_ended_during_pregnancy") is False
    data["insurance"] = _ins(_title(None))  # tytuł otwarty — nie ustał
    assert _ctx(data).fact("f_title_ended_during_pregnancy") is False


def test_f_title_ended_during_pregnancy_missing_pregnancy_start():
    ctx = _ctx({"event": BIRTH, "insurance": _ins(_title("2026-12-31"))})
    assert ctx.fact("f_title_ended_during_pregnancy") is None
    assert "pregnancy.pregnancy_start_date" in ctx.missing


def test_f_last_title_termination_reason_and_employee_title_last():
    ctx = _ctx({"insurance": _ins(_title("2026-12-31", "EMPLOYER_BANKRUPTCY"))})
    assert ctx.fact("f_last_title_termination_reason") == "EMPLOYER_BANKRUPTCY"
    assert ctx.fact("f_is_employee_title_last") is True
    mandate = _ctx({"insurance": _ins(_title("2026-12-31", "CONTRACT_EXPIRY", "CIVIL_CONTRACT_MANDATE"))})
    assert mandate.fact("f_is_employee_title_last") is False
    missing = _ctx({"insurance": _ins(_title("2026-12-31"))})
    assert missing.fact("f_last_title_termination_reason") is None and missing.missing == ["insurance.titles"]
    assert _ctx({"insurance": {"titles": []}}).fact("f_is_employee_title_last") is None


@pytest.mark.parametrize(("title", "employment", "expected"), [
    (_title("2026-12-31", "EMPLOYER_LIQUIDATION"), {}, True),                      # MAT-ELIG-004
    (_title("2026-12-31", "UNLAWFUL_TERMINATION_COURT_CONFIRMED"), {}, True),      # MAT-ELIG-005
    (_title("2027-03-15", "CONTRACT_EXPIRY"), {"contract_type": "FIXED_TERM", "extended_until_birth_kp177": True},
     True),                                                                        # MAT-ELIG-006
    (_title("2026-12-31", "CONTRACT_EXPIRY"), {"contract_type": "INDEFINITE"}, False),
    (_title("2027-02-28", "CONTRACT_EXPIRY", "CIVIL_CONTRACT_MANDATE"), {"contract_type": None}, False),  # T-MAT-004
    (_title("2026-12-31", "CONTRACT_EXPIRY"), {"contract_type": None}, None),      # umowa o pracę: typ nieznany
])
def test_f_any_art30_basis_kleene(title, employment, expected):
    data = {"event": BIRTH, "pregnancy": PREGNANCY, "insurance": _ins(title), "employment": employment}
    assert _ctx(data).fact("f_any_art30_basis") is expected


def test_f_planned_title_end_before_due_date():
    data = {"pregnancy": PREGNANCY, "insurance": _ins(_title("2027-03-14"))}
    assert _ctx(data).fact("f_planned_title_end_before_due_date") is True
    data["insurance"] = _ins(_title("2027-03-15"))  # koniec w dniu terminu porodu — brak ryzyka
    assert _ctx(data).fact("f_planned_title_end_before_due_date") is False
    data["insurance"] = _ins(_title(None))
    assert _ctx(data).fact("f_planned_title_end_before_due_date") is False
    ctx = _ctx({"insurance": _ins(_title("2027-03-14"))})
    assert ctx.fact("f_planned_title_end_before_due_date") is None and ctx.missing == ["pregnancy.expected_due_date"]


# ------------------------------------------------------------ plan: start przed porodem, przejęcie przez ojca
@pytest.mark.parametrize(("start", "weeks"), [("2027-02-01", Decimal(6)), ("2027-01-31", Decimal(43) / Decimal(7))])
def test_f_weeks_before_due_date(start, weeks):
    data = {"pregnancy": PREGNANCY, "plan": {"maternity_start_date": start}}
    assert _ctx(data).fact("f_weeks_before_due_date") == weeks


def test_f_weeks_before_due_date_missing():
    ctx = _ctx({"plan": {"maternity_start_date": "2027-02-01"}})
    assert ctx.fact("f_weeks_before_due_date") is None and ctx.missing == ["pregnancy.expected_due_date"]


def test_f_mother_weeks_after_birth_and_total_planned():
    segments = [{"parent": "MOTHER", "leave_type": "MATERNITY_LEAVE", "from": "2027-03-08", "to": "2027-06-20"},
                {"parent": "FATHER", "leave_type": "MATERNITY_LEAVE_TRANSFERRED", "from": "2027-06-21",
                 "to": "2027-08-01"},
                {"parent": "MOTHER", "leave_type": "PARENTAL_LEAVE", "from": "2027-08-02", "to": "2027-09-01"}]
    ctx = _ctx({"event": BIRTH, "plan": {"segments": segments}})
    assert ctx.fact("f_mother_maternity_weeks_used_after_birth") == Decimal(14)  # dni przed porodem nie liczą się
    assert ctx.fact("f_total_maternity_weeks_planned") == Decimal(147) / Decimal(7)  # 105 + 42, bez rodzicielskiego


# ------------------------------------------------------------ przysposobienie / rodzina zastępcza
@pytest.mark.parametrize(("day", "age"), [("2027-03-31", 13), ("2027-04-01", 14)])
def test_f_child_age_years_on_birthday_boundary(day, age):
    ctx = _ctx({"children": {"items": [{"birth_date": "2013-04-01"}]}})
    assert ctx.fact("f_child_age_years_on", date=day) == age


def test_f_child_age_years_on_oldest_child_and_missing():
    ctx = _ctx({"children": {"items": [{"birth_date": "2020-01-01"}, {"birth_date": "2013-04-01"}]}})
    assert ctx.fact("f_child_age_years_on", date="2027-01-10") == 13
    missing = _ctx({"children": {"items": [{"birth_date": None}]}})
    assert missing.fact("f_child_age_years_on", date="2027-01-10") is None and missing.missing == ["children.items"]


def _adoption(child_birth: str, event_type="ADOPTION", deferred=None) -> dict:
    return {"event": {"type": event_type, "date": "2027-01-10"},
            "children": {"count_at_event": 1, "items": [{"birth_date": child_birth}],
                         "school_obligation_deferred": deferred}}


def test_f_maternity_like_leave_period_full_and_capped():
    full = _ctx(_adoption("2020-01-01")).fact("f_maternity_like_leave_period")
    assert (full["to"], full["days"], full["weeks"]) == (date(2027, 5, 29), 140, 20)
    capped = _ctx(_adoption("2013-01-31")).fact("f_maternity_like_leave_period")  # T-MAT-022, M14 a
    assert capped["to"] == date(2027, 1, 30)
    assert _ctx(_adoption("2013-01-31")).fact("f_maternity_like_weeks_after_age_cap") == Decimal(21) / Decimal(7)


def test_f_maternity_like_leave_period_foster_limits():
    # rodzina zastępcza: do 7 lat; odroczony obowiązek szkolny — do 10 lat
    assert _ctx(_adoption("2020-02-01", "FOSTER")).fact("f_maternity_like_leave_period")["to"] == date(2027, 1, 31)
    deferred = _ctx(_adoption("2018-06-01", "FOSTER", deferred=True)).fact("f_maternity_like_leave_period")
    assert deferred["to"] == date(2027, 5, 29)


def test_f_maternity_like_leave_period_missing_count():
    data = _adoption("2020-01-01")
    data["children"]["count_at_event"] = None
    ctx = _ctx(data)
    assert ctx.fact("f_maternity_like_leave_period") is None and "children.count_at_event" in ctx.missing


# ------------------------------------------------------------ urlop uzupełniający
def _supp(stays, weights=(3400,)) -> dict:
    return {"event": {"type": "BIRTH", "date": "2027-01-10"},
            "children": {"items": [{"birth_date": "2027-01-10", "birth_weight_g": w} for w in weights],
                         "hospital_stays": stays}}


def test_f_min_birth_weight_g():
    assert _ctx(_supp([], (1200, 950))).fact("f_min_birth_weight_g") == 950
    ctx = _ctx(_supp([], (1200, None)))
    assert ctx.fact("f_min_birth_weight_g") is None and ctx.missing == ["children.items"]


@pytest.mark.parametrize(("weights", "expected"), [
    ((1000,), True),        # granica: ≤ 1000 g
    ((1001,), False),       # > 1000 g
    ((1200, 950), True),    # wieloraczki: najlżejsze dziecko
])
def test_f_weight_at_most_threshold_from_exact_weight(weights, expected):
    assert _ctx(_supp([], weights)).fact("f_weight_at_most_threshold") is expected


@pytest.mark.parametrize("answer", [True, False])
def test_f_weight_at_most_threshold_answer_wins(answer):
    """FE1-05: odpowiedź z kreatora ma pierwszeństwo przed dokładną masą (i działa bez niej)."""
    data = _supp([], (None,))
    data["birth"] = {"weight_at_most_threshold": answer}
    ctx = _ctx(data)
    assert ctx.fact("f_weight_at_most_threshold") is answer and ctx.missing == []


def test_f_weight_at_most_threshold_missing():
    ctx = _ctx(_supp([], (None,)))
    assert ctx.fact("f_weight_at_most_threshold") is None and ctx.missing == ["birth.weight_at_most_threshold"]


@pytest.mark.parametrize(("start", "end", "expected"), [
    ("2027-01-13", "2027-01-14", False),  # dzień 4
    ("2027-01-14", "2027-01-15", True),   # dzień 5 (dzień porodu = 1, M15 a)
    ("2027-02-06", "2027-02-07", True),   # dzień 28
    ("2027-02-07", "2027-02-08", False),  # dzień 29
    ("2027-01-14", "2027-01-14", False),  # 1 dzień < 2 kolejnych dni
])
def test_f_has_qualifying_late_hospital_stay_window(start, end, expected):
    ctx = _ctx(_supp([{"child_index": 0, "from": start, "to": end}]))
    assert ctx.fact("f_has_qualifying_late_hospital_stay") is expected


def test_f_has_qualifying_late_hospital_stay_missing():
    ctx = _ctx(_supp(None))
    assert ctx.fact("f_has_qualifying_late_hospital_stay") is None and ctx.missing == ["children.hospital_stays"]


def test_f_supplementary_leave_weeks_cap_and_longest_child():
    long_stay = _ctx(_supp([{"child_index": 0, "from": "2027-01-10", "to": "2027-05-09"}]))
    assert long_stay.fact("f_supplementary_leave_weeks", cap_week=15, window_start_day=1) == 15  # 120 dni → 105
    twins = _ctx(_supp([{"child_index": 0, "from": "2027-01-10", "to": "2027-01-29"},
                        {"child_index": 1, "from": "2027-01-10", "to": "2027-02-08"}], (1200, 950)))
    assert twins.fact("f_supplementary_leave_weeks", cap_week=15, window_start_day=1) == 5  # 30 dni → ceil(30/7)
    late = _ctx(_supp([{"child_index": 0, "from": "2027-01-14", "to": "2027-01-21"}]))
    assert late.fact("f_supplementary_leave_weeks", cap_week=8, window_start_day=5) == 2  # 8 dni


def test_f_supplementary_leave_weeks_missing_args_or_stays():
    assert _ctx(_supp([])).fact("f_supplementary_leave_weeks", cap_week=8, window_start_day=1) == 0
    assert _ctx(_supp([])).fact("f_supplementary_leave_weeks") is None


# ------------------------------------------------------------ zgon dziecka w trybie FORECAST (T-MAT-014)
def test_child_death_after_as_of_counts_in_forecast_only():
    data = {"evaluation": {"mode": "FORECAST"}, "event": {"type": "BIRTH", "date": "2027-02-01"},
            "children": {"count_at_birth": 1, "items": [{"birth_date": "2027-02-01", "death_date": "2027-03-23"}]}}
    assert _ctx(data).fact("f_children_alive_count") == 0
    data["evaluation"]["mode"] = "RETRO"
    assert _ctx(data).fact("f_children_alive_count") == 1  # zgon po dniu oceny — dziecko żyje w dniu oceny


# ------------------------------------------------------------ pipeline (integracja kroków BE2-01)
def _payload(**patch) -> dict:
    base = {"evaluation": {"as_of_date": "2026-11-21", "mode": "FORECAST"},
            "person": {"role": "MOTHER"}, "insurance": _ins(_title(None)),
            "employment": {"contract_type": "INDEFINITE", "leaves": []},
            "payer": {"insured_count_on_nov30_prev_year": 150}, "pregnancy": PREGNANCY, "event": BIRTH,
            "children": {"count_at_birth": 1, "items": [{"birth_date": "2027-03-15", "birth_weight_g": 3400}]},
            "income_history": {"manual_base_override": "6000.00"}, "debt": {"amount_on_right_date": "0.00"},
            "applications": {"combined_815_planned": False}}
    base.update(patch)
    return base


def test_pipeline_equivalent_allowance_amount_and_payer():
    body = pipeline.evaluate(_payload(insurance=_ins(_title("2026-12-31", "EMPLOYER_LIQUIDATION")),
                                      employment={"other_employment_provided": False, "leaves": []}))
    by_type = {b["benefit_type"]: b for b in body["benefits"]}
    allowance = by_type["MATERNITY_EQUIVALENT_ALLOWANCE"]
    assert allowance["period"] == {"from": "2027-01-01", "to": "2027-03-14"} and allowance["days"] == 73
    assert allowance["daily_amount_exact"] == "200" and allowance["total_amount_exact"] == "14600"  # 6000 × 1,00 / 30
    assert allowance["payer_of_benefit"] == by_type["MATERNITY_BENEFIT"]["payer_of_benefit"] == "ZUS"


def test_pipeline_equivalent_allowance_asks_for_other_employment():
    body = pipeline.evaluate(_payload(insurance=_ins(_title("2026-12-31", "EMPLOYER_BANKRUPTCY"))))
    allowance = next(b for b in body["benefits"] if b["benefit_type"] == "MATERNITY_EQUIVALENT_ALLOWANCE")
    assert allowance["status"] == "NEEDS_DATA"
    assert "employment.other_employment_provided" in {item["field"] for item in body["missing_data"]}


def test_pipeline_not_insured_without_art30_is_refusal_with_risk_warning():
    body = pipeline.evaluate(_payload(insurance=_ins(_title("2027-02-28", "CONTRACT_EXPIRY",
                                                            "CIVIL_CONTRACT_MANDATE"))))
    assert body["benefits"][0]["status"] == "NOT_ELIGIBLE"
    assert {"code": "RISK_NOT_INSURED_ON_BIRTH", "severity": "CRITICAL", "rule_id": "RISK-003"} in body["warnings"]


def test_pipeline_no_hospital_stays_no_supplementary_benefit():
    body = pipeline.evaluate(_payload())
    assert "SUPPLEMENTARY_MATERNITY_LEAVE" not in [b["leave_type"] for b in body["benefits"]]
    assert body["warnings"] == []


def test_pipeline_supplementary_follows_maternity():
    payload = _payload(event={"type": "BIRTH", "date": "2027-01-10"}, birth={"completed_gestation_weeks": 34},
                       children={"count_at_birth": 1, "items": [{"birth_date": "2027-01-10", "birth_weight_g": 2100}],
                                 "hospital_stays": [{"child_index": 0, "from": "2027-01-10", "to": "2027-01-25"}]})
    supp = pipeline.evaluate(payload)["benefits"][1]
    assert supp["leave_type"] == "SUPPLEMENTARY_MATERNITY_LEAVE" and supp["status"] == "ELIGIBLE"
    assert supp["period"] == {"from": "2027-05-30", "to": "2027-06-19", "max_weeks": 3}
    assert supp["rate"] == "1" and supp["total_amount_exact"] == "4200"  # 21 dni × 6000 × 100% / 30


def test_pipeline_supplementary_needs_gestation_week():
    payload = _payload(children={"count_at_birth": 1, "items": [{"birth_date": "2027-03-15", "birth_weight_g": 2100}],
                                 "hospital_stays": [{"child_index": 0, "from": "2027-03-15", "to": "2027-03-25"}]})
    body = pipeline.evaluate(payload)
    supp = next(b for b in body["benefits"] if b["leave_type"] == "SUPPLEMENTARY_MATERNITY_LEAVE")
    assert supp["status"] == "NEEDS_DATA"
    assert "birth.completed_gestation_weeks" in {item["field"] for item in body["missing_data"]}


def test_pipeline_adoption_age_limit_warning():
    payload = _payload(event={"type": "ADOPTION", "date": "2027-01-10", "court_adoption_application_date":
                              "2027-01-05"}, children={"count_at_event": 1, "items": [{"birth_date": "2013-01-31"}]})
    body = pipeline.evaluate(payload)
    benefit = body["benefits"][0]
    assert (benefit["leave_type"], benefit["status"], benefit["period"]["to"]) == \
        ("MATERNITY_LIKE_LEAVE", "ELIGIBLE", "2027-01-30")
    assert benefit["entitlement_basis"] == "ADOPTION" and benefit["total_amount_exact"] is not None
    assert any(w["code"] == "AGE_LIMIT_SHORTENS_LEAVE" for w in body["warnings"])


def test_pipeline_father_transfer_missing_segments_dates():
    segments = [{"parent": "MOTHER", "leave_type": "MATERNITY_LEAVE", "from": "2027-03-15", "to": "2027-06-20"},
                {"parent": "FATHER", "leave_type": "MATERNITY_LEAVE_TRANSFERRED", "from": "2027-06-21",
                 "to": "2027-08-01"}]
    payload = _payload(person={"role": "FATHER"}, plan={"transfer_start_date": "2027-06-21", "segments": segments})
    body = pipeline.evaluate(payload)  # brak deklaracji rezygnacji matki → dopytać, nie odmawiać
    transferred = next(b for b in body["benefits"] if b["leave_type"] == "MATERNITY_LEAVE_TRANSFERRED")
    assert transferred["status"] == "NEEDS_DATA"
    assert "plan.mother_resigns_remaining_maternity" in {item["field"] for item in body["missing_data"]}


# ------------------------------------------------------------ poprawki po review (BE2-01)
def _preterm(stays, weeks=26, weight=900) -> dict:
    children = {"count_at_birth": 1, "items": [{"birth_date": "2027-01-10", "birth_weight_g": weight}]}
    if stays is not ...:
        children["hospital_stays"] = stays
    return _payload(event={"type": "BIRTH", "date": "2027-01-10"}, birth={"completed_gestation_weeks": weeks},
                    children=children)


def _supp_benefit(body: dict) -> dict | None:
    return next((b for b in body["benefits"] if b["leave_type"] == "SUPPLEMENTARY_MATERNITY_LEAVE"), None)


def test_pipeline_supplementary_ongoing_stay_needs_data():
    body = pipeline.evaluate(_preterm([{"child_index": 0, "from": "2027-01-10", "to": None}]))
    assert _supp_benefit(body)["status"] == "NEEDS_DATA"
    assert "children.hospital_stays" in {item["field"] for item in body["missing_data"]}


def test_pipeline_supplementary_qualifying_birth_without_stays_asks():
    body = pipeline.evaluate(_preterm(...))
    assert _supp_benefit(body)["status"] == "NEEDS_DATA"
    assert {"field": "children.hospital_stays", "rule_ids": ["SUPP-ELIG-001"]} in body["missing_data"]
    assert _supp_benefit(pipeline.evaluate(_preterm([]))) is None  # pusta lista = brak pobytów


def test_pipeline_supplementary_reports_supp_cond_not_evaluated():
    body = pipeline.evaluate(_preterm([{"child_index": 0, "from": "2027-01-10", "to": "2027-03-01"}]))
    assert _supp_benefit(body)["period"]["max_weeks"] == 8
    assert "SUPP-COND-001" in body["not_evaluated_rules"]
    assert not any("81,5%" in r["message"] for r in _supp_benefit(body)["reasons"])


def test_pipeline_maternity_like_asks_for_count_at_event():
    payload = _payload(event={"type": "ADOPTION", "date": "2027-01-10", "court_adoption_application_date":
                              "2027-01-05"}, children={"count_at_event": None, "items": [{"birth_date": "2013-04-01"}]})
    body = pipeline.evaluate(payload)
    assert body["benefits"][0]["status"] == "NEEDS_DATA"
    assert {"field": "children.count_at_event", "rule_ids": ["MAT-DUR-007"]} in body["missing_data"]


def test_pipeline_no_allowance_when_title_ends_day_before_birth():
    body = pipeline.evaluate(_payload(insurance=_ins(_title("2027-03-14", "EMPLOYER_LIQUIDATION")),
                                      employment={"other_employment_provided": False, "leaves": []}))
    assert "MATERNITY_EQUIVALENT_ALLOWANCE" not in [b["benefit_type"] for b in body["benefits"]]


# ------------------------------------------------------------ FE1-05: masa jako odpowiedź z opcjami
@pytest.mark.parametrize(("answer", "rule_id", "weeks"), [
    (True, "SUPP-ELIG-001", 12),   # ≤ próg → okno 15 tyg., pobyt 12 tyg. w całości
    (False, "SUPP-ELIG-002", 8),   # > próg (30. tydz.) → okno 8 tyg.
])
def test_pipeline_supplementary_weight_answer_selects_variant(answer, rule_id, weeks):
    payload = _preterm([{"child_index": 0, "from": "2027-01-10", "to": "2027-04-03"}], weeks=30, weight=None)
    payload["birth"]["weight_at_most_threshold"] = answer
    supp = _supp_benefit(pipeline.evaluate(payload))
    assert rule_id in supp["applied_rules"] and supp["period"]["max_weeks"] == weeks


def test_pipeline_supplementary_weight_unknown_asks_for_answer():
    payload = _preterm([{"child_index": 0, "from": "2027-01-10", "to": "2027-04-03"}], weeks=30, weight=None)
    body = pipeline.evaluate(payload)
    assert _supp_benefit(body)["status"] == "NEEDS_DATA"
    assert "birth.weight_at_most_threshold" in {item["field"] for item in body["missing_data"]}
