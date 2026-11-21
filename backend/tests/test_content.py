"""BA-02: treści przewodnika (frontend/src/content/*.json) - schemat ContentBlock z kontraktu, unikalne id,
istniejące ``rule_ids`` w zus_rules/03, linki https, bloki trybu wrażliwego oznaczone ``sensitive``."""
import json
from pathlib import Path

import pytest
import yaml

from tests.test_contract import _validator

ROOT = Path(__file__).resolve().parents[2]
CONTENT = sorted((ROOT / "frontend" / "src" / "content").glob("*.json"))
RULES_YAML = (ROOT / "zus_rules" / "03_rules.yaml").read_text(encoding="utf-8")
RULE_IDS = {r["id"] for r in yaml.safe_load(RULES_YAML)["rules"]}


def _blocks():
    return [(path.name, block) for path in CONTENT for block in json.loads(path.read_text(encoding="utf-8"))]


def test_content_files_exist():
    assert {p.name for p in CONTENT} >= {"guide.json", "risks.json", "legal_protection.json", "support.json",
                                         "sensitive.json"}


@pytest.mark.parametrize(("file", "block"), _blocks(), ids=lambda v: v["id"] if isinstance(v, dict) else v)
def test_BA_02_block_matches_contract_and_rules(file, block):
    assert not list(_validator("ContentBlock").iter_errors(block))
    assert set(block.get("rule_ids") or []) <= RULE_IDS, f"{file}: nieznane rule_ids"
    assert all(link["url"].startswith("https://") for link in block.get("links") or [])
    if block["kind"] == "SENSITIVE":
        assert block.get("sensitive") is True


def test_content_ids_unique():
    ids = [block["id"] for _, block in _blocks()]
    assert len(ids) == len(set(ids))


# ------------------------------------------------------------ szablony wyjaśnień (I5, templates.pl.yaml)
def test_BA_02_templates_reference_existing_rules_and_placeholders():
    import string

    from app.core.params import load_ruleset
    from app.engine.explain import load_templates

    allowed = {"rate_pct", "days", "period_from", "period_to", "max_days", "max_weeks", "daily_amount",
               "total_amount", "payer"}
    params = set(load_ruleset()["meta"]["parameters"])
    templates = load_templates()
    assert templates
    for rule_id, text in templates.items():
        assert rule_id in RULE_IDS, rule_id
        for _, name, _, _ in string.Formatter().parse(text):
            if name:
                assert name in allowed or name.removeprefix("param_") in params, (rule_id, name)


def test_BA_02_explanation_has_no_raw_decimals():
    import re

    from app.engine import pipeline

    for path in sorted((ROOT / "demo" / "cases").glob("*.json")):
        body = pipeline.evaluate(json.loads(path.read_text(encoding="utf-8"))["input"])
        for benefit in body["benefits"]:
            assert not re.search(r"\d\.\d{3,}", benefit.get("explanation") or ""), (path.name, benefit["explanation"])
