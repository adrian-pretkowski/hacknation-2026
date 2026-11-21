"""Renderer wyjaśnień (BE1-06, interfejs I5): zdanie + przepis dla każdej reguły FIRED świadczenia.

Szablony: ``templates.pl.yaml`` obok tego pliku (treść: BA-02), format I5 ``RULE-ID: "zdanie z {placeholder}"``
albo ``RULE-ID: {text: "..."}``. Placeholdery: pola świadczenia (``rate_pct``, ``days``, ``period_to``,
``max_days``, ``daily_amount``, ``total_amount``, ``payer``) i parametry prawne (``{param_NAZWA}``).
Brak szablonu, brak pliku albo placeholder bez wartości → zdanie z nazwy reguły (``name`` z 03_rules.yaml),
więc każda reguła FIRED ma zdanie i przepis także przed dostarczeniem treści przez BA. Bez LLM (D10).
"""
from __future__ import annotations

import string
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from app.core.money import dec_str, to_decimal
from app.core.params import param

TEMPLATES_PATH = Path(__file__).with_name("templates.pl.yaml")
DOCUMENTS = ("USTAWA", "KP", "ROZP_DOK", "ROZP_WN", "ZALACZNIK")
PAYERS = {"ZUS": "ZUS", "CONTRIBUTION_PAYER": "płatnik składek (pracodawca)"}


@lru_cache
def load_templates(path: str | None = None) -> dict[str, str]:
    """Szablony z pliku YAML; brak pliku → pusty słownik (fallback na nazwę reguły).

    Wynik jest cache'owany — zmiana ``templates.pl.yaml`` wymaga restartu backendu
    (lub ``load_templates.cache_clear()``).
    """
    file = Path(path) if path else TEMPLATES_PATH
    if not file.exists():
        return {}
    data = yaml.safe_load(file.read_text(encoding="utf-8")) or {}
    templates: dict[str, str] = {}
    for rule_id, value in data.items():
        text = value.get("text") if isinstance(value, dict) else value
        if isinstance(text, str) and text.strip():
            templates[str(rule_id)] = text.strip()
    return templates


class _Values(dict):
    """Wartości placeholderów; ``param_NAZWA`` czytany z app.core.params.param()."""

    def __missing__(self, key: str) -> Any:
        if key.startswith("param_"):
            value = param(key.removeprefix("param_"))
            if value is None:
                raise KeyError(key)
            return dec_str(value) if hasattr(value, "normalize") else value
        raise KeyError(key)


def benefit_values(benefit: dict[str, Any]) -> dict[str, Any]:
    period = benefit.get("period") or {}
    rate = to_decimal(benefit.get("rate"))
    values = {
        "rate_pct": (dec_str(rate * 100).replace(".", ",") + "%") if rate is not None else None,
        "days": benefit.get("days"),
        "period_from": period.get("from"),
        "period_to": period.get("to"),
        "max_days": period.get("max_days"),
        "max_weeks": period.get("max_weeks"),
        "daily_amount": benefit.get("daily_amount_exact"),
        "total_amount": benefit.get("total_amount_exact"),
        "payer": PAYERS.get(benefit.get("payer_of_benefit") or ""),
    }
    return {k: v for k, v in values.items() if v is not None}


def render_rule(rule: dict[str, Any], values: dict[str, Any], templates: dict[str, str]) -> str:
    """Zdanie dla reguły: szablon z wypełnionymi placeholderami albo nazwa reguły."""
    template = templates.get(rule["id"])
    if template:
        try:
            return string.Formatter().vformat(template, (), _Values(values)).strip()
        except (KeyError, IndexError, ValueError):
            pass  # placeholder bez wartości → fallback
    name = str(rule.get("name") or rule["id"]).strip()
    return name if name.endswith((".", "!", "?")) else name + "."


def legal_ref(rule: dict[str, Any]) -> dict[str, str] | None:
    document = rule.get("source_document") or (rule.get("legal_basis") or {}).get("document")
    location = rule.get("source_location")
    if document not in DOCUMENTS or not location:
        return None
    # część source_location zaczyna się od nazwy aktu („KP art. 180 § 1”) — bez dublowania w „KP KP art. …”
    return {"document": document, "location": str(location).removeprefix(f"{document} ").strip()}


def explain(rules: Any, rule_ids: list[str], values: dict[str, Any],
            templates: dict[str, str] | None = None) -> dict[str, Any]:
    """Wyjaśnienie dla listy reguł (kolejność = kolejność kroków pipeline'u): tekst + unikalne przepisy."""
    templates = load_templates() if templates is None else templates
    sentences: list[str] = []
    refs: list[dict[str, str]] = []
    for rule_id in rule_ids:
        rule = rules.rule(rule_id)
        sentence = render_rule(rule, values, templates)
        ref = legal_ref(rule)
        if ref is not None:
            body, end = (sentence[:-1], sentence[-1]) if sentence[-1:] in ".!?" else (sentence, ".")
            sentence = f"{body} ({ref['document']} {ref['location']}){end}"
            if ref not in refs:
                refs.append(ref)
        if sentence not in sentences:
            sentences.append(sentence)
    return {"explanation": " ".join(sentences), "legal_basis": refs}


def explain_benefit(eng: Any, benefit: dict[str, Any]) -> dict[str, Any]:
    """``explanation`` i ``legal_basis`` świadczenia z reguł FIRED w jego ``applied_rules`` (contracts: Benefit)."""
    fired = [r for r in benefit.get("applied_rules") or [] if eng.trace.get(r) == "FIRED"]
    return explain(eng.rules, fired, benefit_values(benefit))
