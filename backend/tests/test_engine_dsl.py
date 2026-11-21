"""BE1-01: DSL — tabele prawdy Kleene (C9), liście (C10), loader, rejestr faktów (I2), money/dates (C1–C11)."""
from datetime import date
from decimal import Decimal
from itertools import product

import pytest

from app.core import dates, money
from app.core.config import get_settings
from app.engine.dsl import (
    RulesetError,
    evaluate_condition,
    evaluate_rule,
    load_ruleset,
    parse_ruleset,
    tri_all,
    tri_any,
    tri_not,
)
from app.engine.facts import Context, fact, get_fact, registered

T, F, U = True, False, None
VALUES = [T, F, U]


# ------------------------------------------------------------ C9: Kleene
@pytest.mark.parametrize(("a", "b"), list(product(VALUES, VALUES)))
def test_c9_all_truth_table(a, b):
    expected = F if F in (a, b) else (U if U in (a, b) else T)
    assert tri_all([a, b]) is expected


@pytest.mark.parametrize(("a", "b"), list(product(VALUES, VALUES)))
def test_c9_any_truth_table(a, b):
    expected = T if T in (a, b) else (U if U in (a, b) else F)
    assert tri_any([a, b]) is expected


def test_c9_not_truth_table():
    assert (tri_not(T), tri_not(F), tri_not(U)) == (F, T, U)


def test_c9_empty_all_is_true_empty_any_is_false():
    assert tri_all([]) is T and tri_any([]) is F


def _leaf(value):
    """Liść o z góry zadanej wartości: pole 'x.v' porównane z True (None = brak danych)."""
    return {"field": f"x.{value}", "operator": "eq", "value": True}


@pytest.mark.parametrize(("a", "b"), list(product(VALUES, VALUES)))
def test_c9_nested_conditions_use_kleene(a, b):
    ctx = Context(input={"x": {"True": True, "False": False}})
    cond = {"all": [_leaf(a), {"not": {"any": [_leaf(b), _leaf(F)]}}]}
    assert evaluate_condition(cond, ctx) is tri_all([a, tri_not(tri_any([b, F]))])


# ------------------------------------------------------------ liście
def test_missing_field_is_unknown_and_reported():
    ctx = Context(input={"event": {"type": "BIRTH"}})
    assert evaluate_condition({"field": "event.date", "operator": "gte", "value": "2027-01-01"}, ctx) is U
    assert ctx.missing == ["event.date"]


def test_unknown_never_becomes_false_under_not():
    ctx = Context(input={})
    assert evaluate_condition({"not": {"field": "person.role", "operator": "eq", "value": "MOTHER"}}, ctx) is U


def test_c10_in_on_list_is_non_empty_intersection():
    ctx = Context(input={"incapacity": {"codes": ["A", "B"]}})
    assert evaluate_condition({"field": "incapacity.codes", "operator": "in", "value": ["B", "D"]}, ctx) is T
    assert evaluate_condition({"field": "incapacity.codes", "operator": "in", "value": ["D"]}, ctx) is F


def test_c10_in_on_scalar_is_membership():
    ctx = Context(input={"event": {"type": "BIRTH"}})
    assert evaluate_condition({"field": "event.type", "operator": "in", "value": ["BIRTH", "ADOPTION"]}, ctx) is T


def test_c10_exists_on_field_is_never_unknown():
    ctx = Context(input={"debt": {"amount": None}, "plan": {"segments": []}})
    assert evaluate_condition({"field": "debt.amount", "operator": "exists", "value": True}, ctx) is F
    assert evaluate_condition({"field": "plan.segments", "operator": "exists", "value": True}, ctx) is T  # pusta lista


def test_comparisons_coerce_decimal_and_dates():
    ctx = Context(input={"a": {"money": "48.07", "day": "2027-04-05", "n": 21}})
    assert evaluate_condition({"field": "a.money", "operator": "gt", "value": {"param": "MIN_WAGE_2026_MONTHLY"}},
                              ctx) is F
    assert evaluate_condition({"field": "a.n", "operator": "lte", "value": {"param": "APP_COMBINED_DEADLINE_DAYS"}},
                              ctx) is T
    ctx.state["d"] = date(2027, 4, 5)
    assert evaluate_condition({"field": "d", "operator": "eq", "value": "2027-04-05"}, ctx) is T


@fact("f_test_double")
def _double(ctx: Context, n=None):
    ctx.state["calls"] = ctx.state.get("calls", 0) + 1
    if n is None:
        return ctx.need("test.n")
    return n * 2


@fact("f_test_unknown")
def _unknown(ctx: Context):
    return ctx.need("test.secret")


def test_fact_leaf_with_field_arg_and_memoization():
    ctx = Context(input={"test": {"n": 4}})
    cond = {"fact": "f_test_double", "args": {"n": "test.n"}, "operator": "eq", "value": 8}
    assert evaluate_condition(cond, ctx) is T
    assert evaluate_condition(cond, ctx) is T
    assert ctx.state["calls"] == 1


def test_fact_arg_path_missing_is_unknown():
    ctx = Context(input={})
    cond = {"fact": "f_test_double", "args": {"n": "test.n"}, "operator": "eq", "value": 8}
    assert evaluate_condition(cond, ctx) is U and ctx.missing == ["test.n"]


def test_fact_none_is_unknown_also_for_exists_and_reports_fields():
    ctx = Context(input={})
    assert evaluate_condition({"fact": "f_test_unknown", "operator": "exists", "value": True}, ctx) is U
    assert evaluate_condition({"fact": "f_test_unknown", "operator": "eq", "value": 1}, ctx) is U
    assert ctx.missing == ["test.secret"]


def test_value_fact_comparison():
    ctx = Context(input={"test": {"n": 3}})
    cond = {"fact": "f_test_double", "args": {"n": 4}, "operator": "gt", "value": {"fact": "f_test_double"}}
    assert evaluate_condition(cond, ctx) is U  # prawa strona: f_test_double bez n → UNKNOWN


def test_rule_outcome_reports_missing_only_when_unknown():
    ctx = Context(input={"event": {"type": "ADOPTION"}})
    rule = {"id": "X-1", "conditions": {"all": [{"field": "event.type", "operator": "eq", "value": "BIRTH"},
                                               {"field": "event.date", "operator": "exists", "value": True},
                                               {"field": "person.role", "operator": "eq", "value": "MOTHER"}]}}
    assert evaluate_rule(rule, ctx).value is F and evaluate_rule(rule, ctx).missing == []
    ctx = Context(input={"event": {"type": "BIRTH", "date": "2027-01-01"}})
    outcome = evaluate_rule(rule, ctx)
    assert outcome.value is U and outcome.missing == ["person.role"]


def test_segment_fields_resolve_from_segment():
    ctx = Context(input={}, segment={"leave_type": "MATERNITY_LEAVE"})
    assert evaluate_condition({"field": "segment.leave_type", "operator": "in", "value": ["MATERNITY_LEAVE"]},
                              ctx) is T


# ------------------------------------------------------------ rejestr (I2)
def test_registry_rejects_bad_name_and_duplicates():
    with pytest.raises(ValueError):
        fact("bad_name")
    with pytest.raises(ValueError):
        fact("f_test_double")(lambda ctx: 1)


def test_registry_unknown_fact_raises_not_false():
    with pytest.raises(KeyError):
        Context(input={}).fact("f_does_not_exist")


def test_registry_contains_maternity_path_facts():
    names = set(registered())
    assert {"f_sickness_insured_on", "f_primary_title_type", "f_maternity_leave_weeks", "f_benefit_amount",
            "f_combined_application_within_deadline", "f_debt_on_right_date_exceeds_threshold"} <= names
    assert get_fact("f_sickness_insured_on") is not None


# ------------------------------------------------------------ loader
def test_loader_accepts_real_ruleset():
    rules = load_ruleset(get_settings().rules_path)
    assert len(rules.rules) > 100 and rules.rule("MAT-ELIG-001")["evaluation"] == "ACTIVE"


@pytest.mark.parametrize(("text", "message"), [
    ("meta: {}\nrules: [", "niepoprawny YAML"),
    ("rules: []", "meta"),
    ("meta: {parameters: {}}\nrules:\n- {id: A, result: {}, evaluation: ACTIVE}", "brak kluczy"),
    ("meta: {parameters: {}}\nrules:\n- {id: A, conditions: {all: []}, result: {}, evaluation: ACTIVE}",
     "niepusta lista"),
    ("meta: {parameters: {}}\nrules:\n- {id: A, conditions: {all: [{field: x, operator: like, value: 1}]},"
     " result: {}, evaluation: ACTIVE}", "nieznany operator"),
    ("meta: {parameters: {}}\nrules:\n- {id: A, conditions: {all: [{field: x, operator: eq, value: 1}]},"
     " result: {}, evaluation: MAYBE}", "tryb evaluation"),
    ("meta: {parameters: {}}\nrules:\n- {id: A, conditions: {all: [{field: x, fact: f_y, operator: eq, value: 1}]},"
     " result: {}, evaluation: ACTIVE}", "dokładnie jednego"),
    ("meta: {parameters: {}}\nrules:\n- {id: A, conditions: {all: [{field: x, operator: eq, value: {param: P}}]},"
     " result: {}, evaluation: ACTIVE}", "nieznany parametr P"),
    ("meta: {parameters: {}}\nrules:\n"
     "- {id: A, conditions: {all: [{field: x, operator: eq, value: 1}]}, result: {}, evaluation: ACTIVE}\n"
     "- {id: A, conditions: {all: [{field: x, operator: eq, value: 1}]}, result: {}, evaluation: ACTIVE}",
     "zduplikowane id"),
])
def test_loader_rejects_invalid_ruleset(text, message):
    with pytest.raises(RulesetError, match=message):
        parse_ruleset(text)


# ------------------------------------------------------------ money / dates
def test_c1_money_is_exact_decimal():
    daily = money.div(money.mul(Decimal("6000.00"), Decimal("0.815")), 30)
    assert money.dec_str(daily) == "163" and money.dec_str(money.mul(daily, Decimal(140))) == "22820"
    assert money.to_decimal(0.1) == Decimal("0.1") and money.to_decimal(None) is None


def test_c2_round_preview_half_up():
    assert money.round_preview(Decimal("10.005")) == Decimal("10.01")


def test_c3_c5_periods_and_weeks():
    start = date(2027, 3, 15)
    assert dates.end_after_weeks(start, 20) == date(2027, 8, 1)
    assert dates.days_in(start, date(2027, 8, 1)) == 140
    assert dates.in_period(date(2027, 2, 28), date(2022, 2, 1), date(2027, 2, 28))  # dzień ustania → True
    assert dates.in_period(date(2030, 1, 1), date(2022, 2, 1), None)


def test_c7_age_and_c8_gap_and_c11_deadline():
    assert dates.age_years_on(date(2020, 2, 29), date(2026, 2, 28)) == 6
    assert dates.age_years_on(date(2020, 5, 10), date(2026, 5, 9)) == 5
    assert dates.gap_days_between(date(2027, 1, 10), date(2027, 1, 12)) == 1
    assert dates.deadline_after(date(2027, 3, 15), 21) == date(2027, 4, 5)
