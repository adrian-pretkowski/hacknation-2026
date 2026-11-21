"""BE1-03: runner testów ze specyfikacji ``zus_rules/08_TEST_CASES.json`` (kontrakt testowy 08).

Kontrakt 08 (``contract.description``):
- wejście = deep-merge(``fixtures[fixture]``, ``patch``) — listy z ``patch`` ZASTĘPUJĄ listy z fixture,
- ``expected`` — porównanie częściowe: sprawdzane są tylko podane klucze,
- ``benefit_selector`` wybiera element ``result.benefits`` (``benefit_type`` [+ ``leave_type``]),
- kwoty i stawki jako ``Decimal`` dokładnie; wartości z dzieleniem nieskończonym — do 10 miejsc po przecinku.

Zapadka (baseline): ``cases_08_baseline.txt`` = ID testów, które już przechodzą. Test z baseline musi przejść
(regresja = błąd); pozostałe są ``xfail`` (niezaimplementowane świadczenia/fakty) — gdy zaczną przechodzić,
pytest pokaże XPASS, a raport wypisze je jako „nowe zielone” do dopisania do baseline.

Raport X/Y: podsumowanie po testach (pytest) albo pełna tabela z przyczynami:
    cd backend; .\\.venv\\Scripts\\python -m tests.test_cases [--all]
"""
from __future__ import annotations

import copy
import json
import sys
from collections.abc import Callable
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from functools import cache
from pathlib import Path
from typing import Any

import pytest

from app.core.dates import to_date
from app.engine import pipeline
from app.engine.facts.registry import Context, get_fact

REPO = Path(__file__).resolve().parents[2]
SPEC_PATH = REPO / "zus_rules" / "08_TEST_CASES.json"
BASELINE_PATH = Path(__file__).with_name("cases_08_baseline.txt")
INFINITE_DIVISION_PLACES = 10  # kontrakt 08: wartości z dzieleniem nieskończonym — do 10 miejsc

DECIMAL_KEYS = {"rate", "base.amount_exact", "daily_amount_exact", "total_amount_exact"}
BENEFIT_KEYS = {"status", "payer_of_benefit", "suspended_until_debt_repaid",
                "period.to", "period.max_days", "period.max_weeks"} | DECIMAL_KEYS

# Argumenty faktów z sygnaturą w 07 (fakt liczony dla zdarzenia z wejścia). Brak wpisu = fakt bez argumentów.
FACT_ARGS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    # 07: f_continuous_sickness_insurance_days(as_of) — dni ubezpieczenia do dnia poprzedzającego niezdolność
    "f_continuous_sickness_insurance_days": lambda p: {"as_of": _incapacity_start(p)},
    # 07: f_sick_pay_day_limit(year) — rok niezdolności (KP art. 92 § 5)
    "f_sick_pay_day_limit": lambda p: {"year": d.year if (d := _incapacity_start(p)) else None},
}


# ---------------------------------------------------------------------------------------------- dane


@cache
def spec() -> dict[str, Any]:
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))


def test_cases_by_id() -> dict[str, dict[str, Any]]:
    return {case["test_id"]: case for case in spec()["tests"]}


test_cases_by_id.__test__ = False  # nie jest testem pytest mimo prefiksu


@cache
def baseline() -> frozenset[str]:
    if not BASELINE_PATH.exists():
        return frozenset()
    lines = (line.split("#", 1)[0].strip() for line in BASELINE_PATH.read_text(encoding="utf-8").splitlines())
    return frozenset(line for line in lines if line)


def deep_merge(base: Any, patch: Any) -> Any:
    """Kontrakt 08: słowniki łączone rekurencyjnie, listy i wartości skalarne (także ``null``) zastępowane."""
    if isinstance(base, dict) and isinstance(patch, dict):
        merged = copy.deepcopy(base)
        for key, value in patch.items():
            merged[key] = deep_merge(base.get(key), value)
        return merged
    return copy.deepcopy(patch)


def build_input(case: dict[str, Any]) -> dict[str, Any]:
    return deep_merge(spec()["fixtures"][case["fixture"]], case.get("patch") or {})


def _incapacity_start(payload: dict[str, Any]):
    return to_date((payload.get("incapacity") or {}).get("start_date"))


# -------------------------------------------------------------------------------------- porównania


def _lookup(data: Any, path: str) -> Any:
    node = data
    for key in path.split("."):
        if not isinstance(node, dict):
            return None
        node = node.get(key)
    return node


def _decimal(value: Any) -> Decimal | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return None


def decimals_equal(expected: Any, actual: Any) -> bool:
    """Dokładnie jako Decimal (``"1.00" == "1"``); przy oczekiwanej wartości z 10 miejscami — do 10 miejsc."""
    if expected is None or actual is None:
        return expected is None and actual is None
    exp, act = _decimal(expected), _decimal(actual)
    if exp is None or act is None:
        return False
    if -exp.as_tuple().exponent >= INFINITE_DIVISION_PLACES:
        step = Decimal(1).scaleb(-INFINITE_DIVISION_PLACES)
        return exp.quantize(step, ROUND_HALF_UP) == act.quantize(step, ROUND_HALF_UP)
    return exp == act


def values_equal(expected: Any, actual: Any) -> bool:
    """Porównanie wartości faktów: liczby/kwoty jako Decimal, słowniki rekurencyjnie (częściowo)."""
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(values_equal(v, actual.get(k)) for k, v in expected.items())
    if isinstance(expected, list):
        return (isinstance(actual, list | tuple) and len(expected) == len(actual)
                and all(values_equal(e, a) for e, a in zip(expected, actual, strict=True)))
    if isinstance(expected, bool) or expected is None:
        return actual is expected
    if isinstance(expected, int | float) or _decimal(expected) is not None and not isinstance(actual, str):
        return not isinstance(actual, bool) and decimals_equal(expected, actual)
    if isinstance(expected, str) and _decimal(expected) is not None and isinstance(actual, str):
        return decimals_equal(expected, actual)
    return expected == (actual.isoformat() if hasattr(actual, "isoformat") else actual)


def _codes(items: list[dict[str, Any]] | None) -> list[str]:
    return [item.get("code") for item in items or []]


def _check_codes(key: str, expected: list[str], actual: list[str]) -> str | None:
    """``[]`` = lista ma być pusta; niepusta = wszystkie oczekiwane kody obecne (porównanie częściowe)."""
    if not expected:
        return None if not actual else f"{key}: oczekiwano pustej listy, jest {actual}"
    missing = [code for code in expected if code not in actual]
    return f"{key}: brak {missing}, jest {actual}" if missing else None


def select_benefit(result: dict[str, Any], selector: dict[str, Any] | None) -> dict[str, Any] | None:
    for benefit in result.get("benefits") or []:
        if all(benefit.get(key) == value for key, value in (selector or {}).items()):
            return benefit
    return None


def _check_facts(payload: dict[str, Any], expected: dict[str, Any]) -> list[str]:
    errors = []
    as_of = to_date((payload.get("evaluation") or {}).get("as_of_date"))
    for name, value in expected.items():
        if get_fact(name) is None:
            errors.append(f"fact.{name}: fakt niezaimplementowany (07)")
            continue
        ctx = Context(input=payload, as_of=as_of)
        args = FACT_ARGS.get(name, lambda _p: {})(payload)
        try:
            actual = ctx.fact(name, **args)
        except KeyError as exc:  # fakt zależny spoza rejestru
            errors.append(f"fact.{name}: {exc.args[0]}")
            continue
        if not values_equal(value, actual):
            errors.append(f"fact.{name}: oczekiwano {value!r}, jest {actual!r} (braki: {ctx.missing})")
    return errors


def compare(case: dict[str, Any], payload: dict[str, Any], result: dict[str, Any]) -> list[str]:
    """Lista rozbieżności (pusta = zgodne) wg kontraktu 08."""
    expected = case["expected"]
    errors: list[str] = []
    benefit = select_benefit(result, case.get("benefit_selector"))
    needs_benefit = any(key != "fact" for key in expected)
    if needs_benefit and benefit is None:
        got = [(b.get("benefit_type"), b.get("leave_type")) for b in result.get("benefits") or []]
        errors.append(f"brak świadczenia {case.get('benefit_selector')} w wyniku (jest {got}, "
                      f"overall_status={result.get('overall_status')})")
        return errors + (_check_facts(payload, expected["fact"]) if "fact" in expected else [])

    for key, value in expected.items():
        error: str | None = None
        if key in DECIMAL_KEYS:
            actual = _lookup(benefit, key)
            if not decimals_equal(value, actual):
                error = f"{key}: oczekiwano {value!r}, jest {actual!r}"
        elif key in BENEFIT_KEYS:
            actual = _lookup(benefit, key)
            if actual != value:
                error = f"{key}: oczekiwano {value!r}, jest {actual!r}"
        elif key in ("plan_errors", "warnings"):
            error = _check_codes(key, value, _codes(result.get(key)))
        elif key == "missing_data_contains":
            fields = [item.get("field") for item in result.get("missing_data") or []]
            missing = [path for path in value if path not in fields]
            error = f"missing_data: brak {missing}, jest {fields}" if missing else None
        elif key == "reasons_contain":
            error = _check_codes("reasons", value, _codes(benefit.get("reasons")))
            error = error if value else None
        elif key == "applied_rules_contain":
            error = _check_applied(value, benefit, result)
        elif key == "deadline":
            deadlines = result.get("deadlines") or []
            if not any(values_equal(value, item) for item in deadlines):
                error = f"deadline: brak {value!r}, jest {deadlines}"
        elif key == "fact":
            errors.extend(_check_facts(payload, value))
        else:
            error = f"{key}: klucz spoza contract.expected_keys — runner go nie obsługuje"
        if error:
            errors.append(error)
    return errors


def _check_applied(expected: list[str], benefit: dict[str, Any], result: dict[str, Any]) -> str | None:
    """``RULE-ID`` = reguła w śladzie (benefit.applied_rules lub result.applied_rules); ``RULE-ID:OUTCOME``
    = wpis śladu z tym wynikiem (np. ``SICK-DUR-005:FUTURE_SKIPPED``)."""
    trace = [(item.get("rule_id"), item.get("outcome")) for item in result.get("applied_rules") or []]
    ids = set(benefit.get("applied_rules") or []) | {rule_id for rule_id, _ in trace}
    missing = []
    for item in expected:
        rule_id, _, outcome = item.partition(":")
        found = (rule_id, outcome) in trace if outcome else rule_id in ids
        if not found:
            missing.append(item)
    return f"applied_rules: brak {missing}, jest {[f'{r}:{o}' for r, o in trace]}" if missing else None


# ------------------------------------------------------------------------------------------ runner


@dataclass
class CaseResult:
    test_id: str
    kind: str
    rule_ids: list[str]
    errors: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def run_case(case: dict[str, Any]) -> CaseResult:
    res = CaseResult(case["test_id"], case["kind"], case.get("rule_ids") or [])
    payload = build_input(case)
    try:
        result = pipeline.evaluate(copy.deepcopy(payload))
    except Exception as exc:  # noqa: BLE001 — wyjątek silnika to rozbieżność, raportowana z typem
        res.errors.append(f"wyjątek silnika: {type(exc).__name__}: {exc}")
        return res
    res.errors = compare(case, payload, result)
    return res


@cache
def results() -> dict[str, CaseResult]:
    return {test_id: run_case(case) for test_id, case in test_cases_by_id().items()}


def summary_lines(all_results: dict[str, CaseResult], verbose: bool = False) -> list[str]:
    passed = [r for r in all_results.values() if r.ok]
    base = baseline()
    regressions = sorted(tid for tid in base if tid in all_results and not all_results[tid].ok)
    new_green = sorted(r.test_id for r in passed if r.test_id not in base)
    groups: dict[str, list[CaseResult]] = {}
    for r in all_results.values():
        groups.setdefault(r.test_id.rsplit("-", 1)[0], []).append(r)
    lines = [f"08_TEST_CASES: {len(passed)}/{len(all_results)} zgodnych (baseline: {len(base)})",
             "  grupy: " + ", ".join(f"{g} {sum(r.ok for r in rs)}/{len(rs)}" for g, rs in groups.items())]
    if regressions:
        lines.append(f"  REGRESJE (w baseline, nie przechodzą): {', '.join(regressions)}")
    if new_green:
        lines.append(f"  nowe zielone — dopisz do {BASELINE_PATH.name}: {', '.join(new_green)}")
    if verbose:
        lines.append("")
        for r in all_results.values():
            mark = "OK  " if r.ok else "FAIL"
            lines.append(f"{mark} {r.test_id:<11} {r.kind:<12} {','.join(r.rule_ids)}")
            lines.extend(f"       - {error}" for error in r.errors)
    return lines


# ------------------------------------------------------------------------------------------- pytest


def _params() -> list[Any]:
    base = baseline()
    return [pytest.param(test_id, id=test_id, marks=() if test_id in base else pytest.mark.xfail(
        strict=False, reason="poza baseline — świadczenie/fakt jeszcze niezaimplementowane"))
        for test_id in test_cases_by_id()]


@pytest.fixture(scope="module", autouse=True)
def _report(request):
    yield
    reporter = request.config.pluginmanager.get_plugin("terminalreporter")
    if reporter is not None:
        reporter.write_line("")
        for line in summary_lines(results()):
            reporter.write_line(line)


@pytest.mark.parametrize("test_id", _params())
def test_case_08(test_id):
    result = results()[test_id]
    assert result.ok, f"{test_id} ({result.kind}, {', '.join(result.rule_ids)}):\n  " + "\n  ".join(result.errors)


def test_baseline_ids_exist_in_spec():
    unknown = sorted(baseline() - set(test_cases_by_id()))
    assert not unknown, f"{BASELINE_PATH.name}: ID spoza 08_TEST_CASES.json: {unknown}"


def test_spec_uses_only_supported_expected_keys():
    supported = set(spec()["contract"]["expected_keys"])
    used = {key for case in spec()["tests"] for key in case["expected"]}
    assert used <= supported, f"klucze expected spoza contract.expected_keys: {sorted(used - supported)}"
    assert supported <= BENEFIT_KEYS | {"plan_errors", "warnings", "missing_data_contains", "reasons_contain",
                                        "applied_rules_contain", "deadline", "fact"}


# --- runner: deep-merge -------------------------------------------------------------------------


def test_deep_merge_replaces_lists_and_merges_dicts():
    base = {"a": {"x": 1, "y": [1, 2]}, "b": [{"k": 1}], "c": 1}
    merged = deep_merge(base, {"a": {"y": [3]}, "b": [], "d": {"z": None}})
    assert merged == {"a": {"x": 1, "y": [3]}, "b": [], "c": 1, "d": {"z": None}}
    assert base == {"a": {"x": 1, "y": [1, 2]}, "b": [{"k": 1}], "c": 1}  # fixture nienaruszona


def test_deep_merge_null_in_patch_overrides_value():
    assert deep_merge({"debt": {"amount_on_right_date": "0.00"}}, {"debt": {"amount_on_right_date": None}}) == \
        {"debt": {"amount_on_right_date": None}}


def test_deep_merge_empty_patch_is_copy():
    base = {"a": {"b": 1}}
    merged = deep_merge(base, {})
    assert merged == base and merged is not base and merged["a"] is not base["a"]


# --- runner: porównanie Decimal -----------------------------------------------------------------


@pytest.mark.parametrize(("expected", "actual", "equal"), [
    ("1.00", "1", True),                          # typowy: ta sama wartość, inna skala
    ("0.815", "0.815", True),
    ("0.815", "0.8150000001", False),             # graniczny: brak tolerancji przy skończonym rozwinięciu
    ("5752.6666666667", "5752.666666666666666666666667", True),  # dzielenie nieskończone → 10 miejsc
    ("5752.6666666667", "5752.6666666666", False),
    ("150", 150, True),
    (None, None, True),                           # brak danych: null == null
    (None, "0", False),
    ("0", None, False),
    ("1.00", "abc", False),
])
def test_decimals_equal(expected, actual, equal):
    assert decimals_equal(expected, actual) is equal


def test_values_equal_for_facts():
    assert values_equal({"weeks": "5", "days": 35}, {"weeks": Decimal("5.0"), "days": 35, "extra": 1})
    assert not values_equal({"weeks": "5", "days": 35}, {"weeks": Decimal("5"), "days": 36})
    assert values_equal(33, 33) and not values_equal(33, None)
    assert values_equal(False, False) and not values_equal(False, None)  # UNKNOWN ≠ FALSE (C9)
    assert not values_equal(1, True)


# --- runner: porównanie częściowe wyniku ---------------------------------------------------------


def _result(**benefit: Any) -> dict[str, Any]:
    top = {key: benefit.pop(key) for key in ("plan_errors", "warnings", "missing_data", "applied_trace")
           if key in benefit}
    return {"overall_status": benefit.get("status"),
            "benefits": [{"benefit_type": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE", **benefit}],
            "plan_errors": top.get("plan_errors", []), "warnings": top.get("warnings", []),
            "missing_data": top.get("missing_data", []), "applied_rules": top.get("applied_trace", [])}


def _case(expected: dict[str, Any], selector: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"test_id": "T-X-001", "kind": "POSITIVE", "expected": expected,
            "benefit_selector": selector or {"benefit_type": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE"}}


def test_compare_checks_only_given_keys():
    result = _result(status="ELIGIBLE", rate="1", period={"to": "2027-08-01", "max_weeks": 20})
    assert compare(_case({"status": "ELIGIBLE", "rate": "1.00", "period.max_weeks": 20}), {}, result) == []
    errors = compare(_case({"status": "NOT_ELIGIBLE", "period.to": "2027-08-02"}), {}, result)
    assert len(errors) == 2 and errors[0].startswith("status") and errors[1].startswith("period.to")


def test_compare_missing_benefit_is_reported():
    errors = compare(_case({"status": "ELIGIBLE"}, {"benefit_type": "SICKNESS_BENEFIT"}), {},
                     _result(status="ELIGIBLE"))
    assert len(errors) == 1 and "brak świadczenia" in errors[0]


def test_compare_selector_distinguishes_leave_type():
    result = _result(status="ELIGIBLE")
    selector = {"benefit_type": "MATERNITY_BENEFIT", "leave_type": "PARENTAL_LEAVE"}
    assert compare(_case({"status": "ELIGIBLE"}, selector), {}, result)


def test_compare_null_expected_means_null_actual():
    result = _result(status="ELIGIBLE", payer_of_benefit=None, rate=None)
    assert compare(_case({"payer_of_benefit": None, "rate": None}), {}, result) == []
    assert compare(_case({"payer_of_benefit": None}), {}, _result(payer_of_benefit="ZUS"))


def test_compare_code_lists():
    result = _result(status="ELIGIBLE", plan_errors=[{"code": "A", "rule_id": "R"}, {"code": "B", "rule_id": "R"}],
                     reasons=[{"code": "CONTRIBUTION_DEBT"}])
    assert compare(_case({"plan_errors": ["A"], "reasons_contain": ["CONTRIBUTION_DEBT"]}), {}, result) == []
    assert compare(_case({"plan_errors": []}), {}, result)                 # [] = brak błędów planu
    assert compare(_case({"plan_errors": []}), {}, _result(status="ELIGIBLE")) == []
    assert compare(_case({"warnings": ["RISK_X"]}), {}, result)


def test_compare_missing_data_and_applied_rules():
    result = _result(status="NEEDS_DATA", applied_rules=["MAT-ELIG-001"],
                     missing_data=[{"field": "debt.amount_on_right_date", "rule_ids": ["GEN-EXCL-001"]}],
                     applied_trace=[{"rule_id": "SICK-DUR-005", "outcome": "FUTURE_SKIPPED"}])
    assert compare(_case({"missing_data_contains": ["debt.amount_on_right_date"],
                          "applied_rules_contain": ["MAT-ELIG-001", "SICK-DUR-005:FUTURE_SKIPPED"]}), {}, result) == []
    assert compare(_case({"applied_rules_contain": ["SICK-DUR-005:FIRED"]}), {}, result)
    assert compare(_case({"missing_data_contains": ["children.count_at_birth"]}), {}, result)


def test_compare_unknown_fact_is_reported_not_crash():
    errors = compare(_case({"fact": {"f_nie_istnieje": 1}}), {}, {"benefits": []})
    assert errors == ["fact.f_nie_istnieje: fakt niezaimplementowany (07)"]


def test_compare_registered_fact():
    payload = build_input(test_cases_by_id()["T-GEN-001"])
    # klucz "fact" sam w sobie nie wymaga świadczenia w wyniku
    assert compare(_case({"fact": {"f_maternity_leave_weeks": 20}}), payload, {"benefits": []}) == []
    errors = compare(_case({"fact": {"f_maternity_leave_weeks": 31}}), payload, {"benefits": []})
    assert len(errors) == 1 and "oczekiwano 31, jest 20" in errors[0]
    payload["children"]["count_at_birth"] = None  # brak danych → UNKNOWN (None) ≠ oczekiwana liczba
    errors = compare(_case({"fact": {"f_maternity_leave_weeks": 20}}), payload, {"benefits": []})
    assert len(errors) == 1 and "jest None" in errors[0] and "children.count_at_birth" in errors[0]


# ---------------------------------------------------------------------------------------------- CLI


def main(argv: list[str]) -> int:
    all_results = results()
    for line in summary_lines(all_results, verbose="--all" in argv or "-v" in argv):
        print(line)
    return 1 if any(not all_results[tid].ok for tid in baseline() if tid in all_results) else 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
