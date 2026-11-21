"""Parametry prawne czytane z zus_rules/03_rules.yaml (meta.parameters).

Jedyne źródło wartości liczbowych (stawki, wymiary, progi). Panel admina (zadanie BE-2)
dołoży nadpisania z wersją i datą obowiązywania — nie wpisuj tych wartości w kodzie.
"""
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from app.core.config import get_settings


@lru_cache
def load_ruleset() -> dict[str, Any]:
    with open(get_settings().rules_path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def ruleset_version() -> str:
    return str(load_ruleset()["meta"]["version"])


@lru_cache
def _load_dates_file(file_name: str) -> tuple[str, ...]:
    """Lista dat z pliku obok 03_rules.yaml (np. public_holidays.yaml: holidays → rok → [{date, name}])."""
    path = Path(get_settings().rules_path).parent / file_name
    with open(path, encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    return tuple(str(item["date"]) for year in (data.get("holidays") or {}).values() for item in year or [])


def param(name: str) -> Any:
    """Wartość parametru; liczby dziesiętne zapisane jako string zwracane jako Decimal.

    Parametr z kluczem `file` i `value: null` czyta listę dat z pliku obok reguł (PUBLIC_HOLIDAYS).
    """
    spec = load_ruleset()["meta"]["parameters"][name]
    value = spec["value"]
    if value is None and spec.get("file"):
        return list(_load_dates_file(spec["file"]))
    if isinstance(value, str):
        try:
            return Decimal(value)
        except ArithmeticError:
            return value
    return value


def param_status(name: str) -> str | None:
    return load_ruleset()["meta"]["parameters"][name].get("status")
