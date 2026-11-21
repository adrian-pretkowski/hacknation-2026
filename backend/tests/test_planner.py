"""Planer i optymalizator wyborów urlopowych (BE2-07): graf z 03_rules.yaml, DP vs pełne przeszukanie, cofanie."""
from decimal import Decimal

import pytest
import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from app.core.config import REPO_ROOT
from app.engine.planner import STEPS, InvalidChoice, ParentProfile, Planner, Profile, State
from app.engine.planner.model import Totals

D = Decimal
SPEC = yaml.safe_load((REPO_ROOT / "contracts" / "openapi.yaml").read_text(encoding="utf-8"))
RULES = yaml.safe_load((REPO_ROOT / "zus_rules" / "03_rules.yaml").read_text(encoding="utf-8"))
RULE_IDS = {r["id"] for r in RULES["rules"]}


def _validator(name: str) -> Draft202012Validator:
    def urn(node):
        if isinstance(node, dict):
            return {k: (f"urn:openapi{v}" if k == "$ref" and v.startswith("#/") else urn(v)) for k, v in node.items()}
        return [urn(x) for x in node] if isinstance(node, list) else node
    registry = Registry().with_resource("urn:openapi", Resource.opaque(urn(SPEC)))
    return Draft202012Validator({"$ref": f"urn:openapi#/components/schemas/{name}"}, registry=registry)


def profile(mother="6000", father="9000", **kw) -> Profile:
    father_insured = kw.pop("father_insured", True)
    return Profile(ParentProfile(D(mother)), ParentProfile(D(father) if father else None, insured=father_insured), **kw)


NO_WORK = ["0", "0"]


# --- graf i reguły -----------------------------------------------------------------------------------------------
def test_steps_reference_existing_rules():
    for step in STEPS:
        assert set(step.rule_ids) <= RULE_IDS, step.id
    planner = Planner(profile())
    graph = planner.graph(7)
    for edge in graph["edges"]:
        if not edge["feasible"]:
            assert edge["blocked_by_rule"] in RULE_IDS and edge["to"] is None
    assert graph["stats"]["complete_plans"] > 10_000


def test_typical_plan_amount_exact():
    # 6000/9000, bez 81,5%: matka 140 dni × 200 + ojcowski 14 × 300 + 9 tyg. ojca 63 × 210 + wspólne 161 × 210 (ojciec)
    # + 9 tyg. matki 63 × 140 = 28000 + 4200 + 13230 + 33810 + 8820
    plan = Planner(profile()).plan([False, 0, 2, 9, 23, *NO_WORK])
    assert D(plan["totals"]["best_total_exact"]) == D("88060")
    assert plan["totals"]["covered_weeks"] == 20 + 41
    assert plan["totals"]["together_days"] == 14


def _brute_force_best(planner: Planner) -> tuple:
    """Pełne przeszukanie wszystkich dozwolonych ścieżek grafu (bez memoizacji)."""
    best: Totals | None = None

    def walk(i: int, state: State, acc) -> None:
        nonlocal best
        if i == len(STEPS):
            if best is None or planner.key(acc) > planner.key(best):
                best = acc
            return
        for opt in planner.options(i, state):
            if opt.feasible:
                out = STEPS[i].apply(planner.p, state, opt.value)
                walk(i + 1, out.state, acc + out.totals)

    walk(0, State(), Totals())
    return planner.key(best)


@pytest.mark.parametrize("objective,mother,father", [("MAX_MONEY", "6000", "9000"), ("MAX_TIME", "9000", "5000")])
def test_dp_equals_brute_force(objective, mother, father):
    planner = Planner(profile(mother, father), objective)
    assert planner.key(planner.best_from(0, State())[0]) == _brute_force_best(planner)


# --- ograniczenia z reguł ----------------------------------------------------------------------------------------
@pytest.mark.parametrize("weeks,ok", [(0, True), (6, True), (7, False), (20, False)])
def test_mat_share_001_mother_min_14_weeks(weeks, ok):
    opt = next(o for o in Planner(profile()).options(1, State(combined=False)) if o.value == weeks)
    assert opt.feasible is ok
    if not ok:
        assert opt.blocked_by == "MAT-SHARE-001"


def test_twins_allow_longer_transfer():
    # 2 dzieci: 31 tygodni macierzyńskiego → do przejęcia 17
    opts = Planner(profile(children_count=2)).options(1, State(combined=False))
    assert max(o.value for o in opts if o.feasible) == 17


def test_uninsured_father_blocks_father_options():
    planner = Planner(profile(father=None, father_insured=False))
    blocked = {"MAT-SHARE-001", "PAT-ELIG-001", "PAR-ELIG-001"}
    for i in (1, 2, 3, 4):
        state = State(combined=False)
        for opt in planner.options(i, state):
            if opt.value not in (0,):
                assert not opt.feasible and opt.blocked_by in blocked
    plan = planner.plan(list(planner.best_from(0, State())[1]))
    assert all(item["parent"] == "MOTHER" for item in plan["items"])


def test_rate_mat_008_father_shared_under_815_needs_review():
    plan = Planner(profile()).plan([True, 0, 2, 9, 5, *NO_WORK])
    assert plan["needs_review"] and plan["review_rules"] == ["RATE-MAT-008"]
    assert not Planner(profile()).plan([True, 0, 2, 9, 0, *NO_WORK])["needs_review"]


def test_815_recommended_when_parental_dominates():
    # „Za życiem”, ojciec nieubezpieczony: P = 65 − 9 = 56 tyg. > 1,6 × 20 → 81,5% za całość opłaca się
    result = Planner(profile(father=None, father_insured=False, za_zyciem=True)).suggest([])
    assert result["recommended"] is True
    # standardowo (41 tyg.) 100/70 jest korzystniejsze
    assert Planner(profile(father=None, father_insured=False)).suggest([])["recommended"] is False


def test_par_work_001_max_half_time_and_benefit_neutral():
    planner = Planner(profile())
    prefix = [False, 0, 2, 9, 0]
    opts = {o.value: o for o in planner.options(5, planner.replay(prefix)[1])}
    assert not opts["0.75"].feasible and opts["0.75"].blocked_by == "PAR-WORK-001"
    plan = planner.plan([*prefix, "0.5", "0"])
    items = {i["kind"]: D(i["amount_exact"]) for i in plan["items"] if i["parent"] == "MOTHER"}
    # zasiłek: zmniejszenie o ½ zrównoważone wydłużeniem (KP 182(1f), art. 31 ust. 4a)
    assert items["PARENTAL_WORK_REDUCTION"] + items["PARENTAL_EXTENSION"] == 0
    assert items["WORK_INCOME"] > 0


# --- sugestia i cofanie ------------------------------------------------------------------------------------------
def test_suggest_options_ranked_and_recommended():
    result = Planner(profile()).suggest([False, 0, 2, 9])
    feasible = [o for o in result["options"] if o["feasible"]]
    best = max(feasible, key=lambda o: D(o["best_total_exact"]))
    assert result["recommended"] == best["value"] and best["recommended"] and D(best["loss_vs_best_exact"]) == 0
    # ojciec z wyższą podstawą - cała wspólna część dla ojca
    assert result["recommended"] == 23


def test_backtrack_two_steps_finds_better_earlier_choice():
    planner = Planner(profile())
    # matka wzięła całą wspólną część, choć tydzień ojca jest wart więcej
    result = planner.suggest([True, 0, 2, 9, 0], lookback=2)
    assert result["backtrack"], "powinno wskazać lepszy wcześniejszy wybór"
    first = result["backtrack"][0]
    assert first["step_id"] == "SHARED_PARENTAL_SPLIT" and first["suggested_value"] == 23
    assert D(first["gain_exact"]) > 0


def test_backtrack_reaches_earlier_step_when_it_matters():
    planner = Planner(profile())
    # ojciec wziął tylko 1 tydzień ojcowskiego - cofnięcie o 3 kroki to wykrywa
    found = {b["step_id"] for b in planner.suggest([False, 6, 1, 9, 23], lookback=3)["backtrack"]}
    assert "PATERNITY" in found
    assert "PATERNITY" not in {b["step_id"] for b in planner.suggest([False, 6, 1, 9, 23], lookback=2)["backtrack"]}


def test_no_backtrack_on_optimal_path():
    planner = Planner(profile())
    optimal = list(planner.best_from(0, State())[1])
    assert planner.suggest(optimal[:5], lookback=5)["backtrack"] == []


def test_max_time_prefers_longer_coverage():
    money = Planner(profile(), "MAX_MONEY")
    time = Planner(profile(), "MAX_TIME")
    best_time = time.plan(list(time.best_from(0, State())[1]))["totals"]
    best_money = money.plan(list(money.best_from(0, State())[1]))["totals"]
    assert best_time["covered_days"] >= best_money["covered_days"]


def test_invalid_choice_raises_with_rule():
    with pytest.raises(InvalidChoice) as exc:
        Planner(profile()).replay([True, 10])
    assert exc.value.option.blocked_by == "MAT-SHARE-001"


# --- API i kontrakt ----------------------------------------------------------------------------------------------
PROFILE = {"mother": {"base_monthly": "6000.00"}, "father": {"base_monthly": "9000.00"}}


def test_api_suggest_matches_contract(client):
    for body in ({"profile": PROFILE},
                 {"profile": PROFILE, "choices": [True, 0, 2, 9, 0], "lookback": 2},
                 {"profile": PROFILE, "choices": [True, 0, 2, 9, 0, "0.5", "0"]},
                 {"profile": PROFILE, "choices": [True, 10]}):
        _validator("PlannerSuggestRequest").validate(body)
        response = client.post("/api/planner/suggest", json=body)
        assert response.status_code == 200
        _validator("PlannerSuggestResponse").validate(response.json())
    data = client.post("/api/planner/suggest", json={"profile": PROFILE, "choices": [True, 10]}).json()
    assert data["status"] == "INVALID_CHOICE" and data["invalid_choice"]["blocked_by_rule"] == "MAT-SHARE-001"
    assert data["step"]["id"] == "MATERNITY_TRANSFER"
    complete = client.post("/api/planner/suggest", json={"profile": PROFILE,
                                                         "choices": [True, 0, 2, 9, 0, "0.5", "0"]}).json()
    assert complete["status"] == "COMPLETE" and complete["step"] is None


def test_api_graph_matches_contract(client):
    response = client.post("/api/planner/graph", json={"profile": PROFILE, "depth": 5})
    assert response.status_code == 200
    _validator("PlannerGraphResponse").validate(response.json())
    assert response.json()["depth"] == 5


def test_api_needs_data_and_out_of_scope(client):
    data = client.post("/api/planner/suggest", json={"profile": {"mother": {"base_monthly": "6000"},
                                                                 "father": {}}}).json()
    assert data["status"] == "NEEDS_DATA"
    assert data["missing_data"] == [{"field": "profile.father.base_monthly", "rule_ids": ["CALC-MAT-001"]}]
    _validator("PlannerSuggestResponse").validate(data)
    data = client.post("/api/planner/suggest", json={"profile": {"mother": {"insured": False},
                                                                 "father": {"base_monthly": "1"}}}).json()
    assert data["status"] == "OUT_OF_SCOPE"


def test_api_rejects_unknown_field(client):
    response = client.post("/api/planner/suggest", json={"profile": PROFILE, "bogus": 1})
    assert response.status_code == 422
    _validator("Problem").validate(response.json())
