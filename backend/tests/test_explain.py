"""BE1-06: renderer wyjaśnień (I5) - każda reguła FIRED świadczenia ma zdanie i przepis.

Przypadki: szablon z placeholderami, placeholder parametru prawnego, brak szablonu / brak pliku / placeholder bez
wartości (fallback na nazwę reguły), odpowiedź /api/evaluate (demo) zgodna z kontraktem.
"""
import copy

from app.engine import pipeline
from app.engine.explain import benefit_values, explain, legal_ref, load_templates, render_rule
from app.modules.evaluation.schemas import EvaluateRequest

RULE = {"id": "RATE-MAT-003", "name": "Stawka 81,5% przy wniosku w 21 dni", "source_document": "USTAWA",
        "source_location": "art. 31 ust. 3"}


class _Rules:
    def __init__(self, *rules):
        self.by_id = {r["id"]: r for r in rules}

    def rule(self, rule_id):
        return self.by_id[rule_id]


def test_render_template_with_benefit_placeholders():
    templates = {"RATE-MAT-003": "Stawka {rate_pct} przez {days} dni."}
    text = render_rule(RULE, {"rate_pct": "81,5%", "days": 140}, templates)
    assert text == "Stawka 81,5% przez 140 dni."


def test_render_template_with_param_placeholder():
    text = render_rule(RULE, {}, {"RATE-MAT-003": "Wniosek w {param_APP_COMBINED_DEADLINE_DAYS} dni."})
    assert text == "Wniosek w 21 dni."


def test_render_falls_back_to_rule_name_when_template_or_value_missing():
    assert render_rule(RULE, {}, {}) == "Stawka 81,5% przy wniosku w 21 dni."
    # placeholder bez wartości (brak kwoty) → zdanie z nazwy reguły, nigdy „{daily_amount}” w tekście
    assert render_rule(RULE, {}, {"RATE-MAT-003": "Dziennie {daily_amount} zł."}) == \
        "Stawka 81,5% przy wniosku w 21 dni."


def test_legal_ref_only_for_contract_documents():
    assert legal_ref(RULE) == {"document": "USTAWA", "location": "art. 31 ust. 3"}
    assert legal_ref({**RULE, "source_document": "INNY"}) is None
    # nazwa aktu na początku source_location nie jest dublowana
    kp_rule = {**RULE, "source_document": "KP", "source_location": "KP art. 180 § 1; USTAWA art. 29a"}
    assert legal_ref(kp_rule) == {"document": "KP", "location": "art. 180 § 1; USTAWA art. 29a"}


def test_explain_every_rule_has_sentence_and_unique_legal_basis():
    other = {"id": "MAT-ELIG-001", "name": "Ubezpieczenie w dniu porodu", "source_document": "USTAWA",
             "source_location": "art. 29 ust. 1 pkt 1"}
    same_ref = {"id": "RATE-MAT-001", "name": "Stawka 100%", "source_document": "USTAWA",
                "source_location": "art. 31 ust. 3"}
    out = explain(_Rules(RULE, other, same_ref), ["MAT-ELIG-001", "RATE-MAT-003", "RATE-MAT-001"], {}, {})
    assert out["explanation"] == ("Ubezpieczenie w dniu porodu (USTAWA art. 29 ust. 1 pkt 1). "
                                  "Stawka 81,5% przy wniosku w 21 dni (USTAWA art. 31 ust. 3). "
                                  "Stawka 100% (USTAWA art. 31 ust. 3).")
    assert out["legal_basis"] == [{"document": "USTAWA", "location": "art. 29 ust. 1 pkt 1"},
                                  {"document": "USTAWA", "location": "art. 31 ust. 3"}]


def test_load_templates_missing_file_and_formats(tmp_path):
    assert load_templates(str(tmp_path / "brak.yaml")) == {}
    file = tmp_path / "templates.pl.yaml"
    file.write_text('A-1: "Zdanie {days}."\nA-2: {text: "Drugie."}\nA-3: ""\n', encoding="utf-8")
    assert load_templates(str(file)) == {"A-1": "Zdanie {days}.", "A-2": "Drugie."}


def test_benefit_values_formats_rate_and_payer():
    values = benefit_values({"rate": "0.815", "days": 140, "period": {"to": "2027-08-01"},
                             "payer_of_benefit": "ZUS", "daily_amount_exact": None})
    assert values == {"rate_pct": "81,5%", "days": 140, "period_to": "2027-08-01", "payer": "ZUS"}


def test_pipeline_benefit_explains_every_fired_rule(demo_payload):
    payload = EvaluateRequest.model_validate(copy.deepcopy(demo_payload)).model_dump(
        mode="json", by_alias=True, exclude_none=False)
    body = pipeline.evaluate(payload)
    fired = {t["rule_id"] for t in body["applied_rules"] if t["outcome"] == "FIRED"}
    rules = pipeline.ruleset()
    for benefit in body["benefits"]:
        explained = [r for r in benefit["applied_rules"] if r in fired]
        assert explained, "świadczenie bez reguł FIRED"
        for rule_id in explained:
            ref = legal_ref(rules.rule(rule_id))
            assert ref in benefit["legal_basis"]
            assert f"({ref['document']} {ref['location']})" in benefit["explanation"]
        assert "{" not in benefit["explanation"]


def test_evaluate_response_with_explanation_matches_contract(client, demo_payload):
    benefit = client.post("/api/evaluate", json=demo_payload).json()["benefits"][0]
    assert benefit["explanation"] and benefit["legal_basis"]


def test_benefit_without_fired_rules_has_empty_explanation(demo_payload):
    # brak danych (NEEDS_DATA): brak ubezpieczenia i liczby dzieci → żadna reguła prawa nie jest FIRED
    payload = copy.deepcopy(demo_payload)
    payload["insurance"] = {"titles": None}
    payload["children"] = {"count_at_birth": None}
    payload = EvaluateRequest.model_validate(payload).model_dump(mode="json", by_alias=True, exclude_none=False)
    benefit = pipeline.evaluate(payload)["benefits"][0]
    assert benefit["status"] == "NEEDS_DATA"
    assert "{" not in benefit["explanation"]
    assert all(set(ref) == {"document", "location"} for ref in benefit["legal_basis"])
