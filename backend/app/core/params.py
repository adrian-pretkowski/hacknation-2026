"""Parametry prawne czytane z zus_rules/03_rules.yaml (meta.parameters).

Jedyne źródło wartości liczbowych (stawki, wymiary, progi). Panel admina (zadanie BE-2)
dołoży nadpisania z wersją i datą obowiązywania — nie wpisuj tych wartości w kodzie.
"""
from decimal import Decimal
from functools import lru_cache
from typing import Any

import yaml

from app.core.config import get_settings


@lru_cache
def load_ruleset() -> dict[str, Any]:
    with open(get_settings().rules_path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def ruleset_version() -> str:
    return str(load_ruleset()["meta"]["version"])


def param(name: str) -> Any:
    """Wartość parametru; liczby dziesiętne zapisane jako string zwracane jako Decimal."""
    spec = load_ruleset()["meta"]["parameters"][name]
    value = spec["value"]
    if isinstance(value, str):
        try:
            return Decimal(value)
        except ArithmeticError:
            return value
    return value


def param_status(name: str) -> str | None:
    return load_ruleset()["meta"]["parameters"][name].get("status")
