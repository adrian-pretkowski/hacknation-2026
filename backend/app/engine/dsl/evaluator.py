"""DSL v1 z zus_rules/03_rules.yaml — loader (walidacja strukturalna) i ewaluator Kleene (C9, C10).

Wartość logiczna: True / False / None (= UNKNOWN). UNKNOWN nigdy nie jest traktowane jako FALSE.

Liście:
- ``{field: a.b, operator, value}`` — pole wejścia (lub ``segment.*`` / pole stanu ustawione przez reguły),
- ``{fact: f_x, args: {...}, operator, value}`` — fakt z rejestru (app.engine.facts),
- value: literał | ``{param: NAZWA}`` | ``{fact: f_y}``.

Decyzje (docs/DECISIONS.md — BE1-01):
- ``exists`` na polu: wartość ≠ null → TRUE, null/brak → FALSE (C10; nigdy UNKNOWN).
  ``exists`` na fakcie: fakt None = UNKNOWN (C9) → UNKNOWN, bo None z faktu oznacza „nie wiadomo”.
- Argument faktu będący ścieżką pola (string z kropką), który jest null → fakt UNKNOWN, pole trafia do braków.
- ``all`` przerywa na pierwszym FALSE, ``any`` na pierwszym TRUE (wynik Kleene jest wtedy przesądzony,
  a braki danych liczą się tylko przy UNKNOWN). Pozostałe podwarunki są liczone wszystkie — pełna lista braków.
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

import yaml

from app.core.dates import to_date
from app.engine.facts import Context

Tri = bool | None

OPERATORS = {"eq", "ne", "gt", "gte", "lt", "lte", "in", "exists"}
LOGICAL = {"all", "any", "not"}
EVALUATION_MODES = {"ACTIVE", "BLOCKED", "HUMAN_REVIEW", "FUTURE", "INFORMATIONAL"}
REQUIRED_RULE_KEYS = {"id", "conditions", "result", "evaluation"}
LEAF_KEYS = {"field", "fact", "args", "operator", "value"}


class RulesetError(ValueError):
    """Błędny plik reguł — loader odrzuca cały zestaw."""


# ---------------------------------------------------------------- Kleene (C9)
def tri_all(values: Iterable[Tri]) -> Tri:
    unknown = False
    for value in values:
        if value is False:
            return False
        if value is None:
            unknown = True
    return None if unknown else True


def tri_any(values: Iterable[Tri]) -> Tri:
    unknown = False
    for value in values:
        if value is True:
            return True
        if value is None:
            unknown = True
    return None if unknown else False


def tri_not(value: Tri) -> Tri:
    return None if value is None else not value


# ---------------------------------------------------------------- loader
@dataclass(frozen=True)
class Ruleset:
    meta: dict[str, Any]
    rules: list[dict[str, Any]]
    by_id: dict[str, dict[str, Any]] = field(repr=False)

    def rule(self, rule_id: str) -> dict[str, Any]:
        return self.by_id[rule_id]


def _validate_condition(cond: Any, where: str, errors: list[str]) -> None:
    if not isinstance(cond, dict):
        errors.append(f"{where}: warunek musi być mapą, jest {type(cond).__name__}")
        return
    logical = LOGICAL & cond.keys()
    if logical:
        if len(cond) != 1:
            errors.append(f"{where}: operator logiczny nie może mieć innych kluczy: {sorted(cond)}")
            return
        (op,) = logical
        body = cond[op]
        if op == "not":
            _validate_condition(body, f"{where}.not", errors)
        elif not isinstance(body, list) or not body:
            errors.append(f"{where}.{op}: wymagana niepusta lista warunków")
        else:
            for i, sub in enumerate(body):
                _validate_condition(sub, f"{where}.{op}[{i}]", errors)
        return
    has_field, has_fact = "field" in cond, "fact" in cond
    if has_field == has_fact:
        errors.append(f"{where}: liść wymaga dokładnie jednego z kluczy field / fact")
    if cond.get("operator") not in OPERATORS:
        errors.append(f"{where}: nieznany operator {cond.get('operator')!r}")
    if "value" not in cond:
        errors.append(f"{where}: brak klucza value")
    if has_fact and not str(cond["fact"]).startswith("f_"):
        errors.append(f"{where}: nazwa faktu musi zaczynać się od f_")
    if "args" in cond and not isinstance(cond["args"], dict):
        errors.append(f"{where}: args musi być mapą")
    unknown = cond.keys() - LEAF_KEYS
    if unknown:
        errors.append(f"{where}: nieznane klucze {sorted(unknown)}")


def _param_refs(node: Any) -> list[str]:
    if isinstance(node, dict):
        if set(node) == {"param"}:
            return [str(node["param"])]
        return [ref for value in node.values() for ref in _param_refs(value)]
    if isinstance(node, list):
        return [ref for value in node for ref in _param_refs(value)]
    return []


def validate(data: Any) -> list[str]:
    """Walidacja strukturalna (bez pełnego JSON Schema): klucze reguł, unikalne id, tryby, warunki, parametry."""
    if not isinstance(data, dict) or not isinstance(data.get("meta"), dict) or not isinstance(data.get("rules"), list):
        return ["plik musi zawierać mapę meta i listę rules"]
    errors: list[str] = []
    params = data["meta"].get("parameters") or {}
    seen: set[str] = set()
    for i, rule in enumerate(data["rules"]):
        if not isinstance(rule, dict):
            errors.append(f"rules[{i}]: reguła musi być mapą")
            continue
        rid = str(rule.get("id", f"rules[{i}]"))
        missing = REQUIRED_RULE_KEYS - rule.keys()
        if missing:
            errors.append(f"{rid}: brak kluczy {sorted(missing)}")
            continue
        if rid in seen:
            errors.append(f"{rid}: zduplikowane id")
        seen.add(rid)
        if rule["evaluation"] not in EVALUATION_MODES:
            errors.append(f"{rid}: nieznany tryb evaluation {rule['evaluation']!r}")
        _validate_condition(rule["conditions"], f"{rid}.conditions", errors)
        for ref in _param_refs(rule["conditions"]) + _param_refs(rule["result"]):
            if ref not in params:
                errors.append(f"{rid}: nieznany parametr {ref}")
    return errors


def parse_ruleset(text: str) -> Ruleset:
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise RulesetError(f"niepoprawny YAML: {exc}") from exc
    errors = validate(data)
    if errors:
        more = f" (+{len(errors) - 20})" if len(errors) > 20 else ""
        raise RulesetError("; ".join(errors[:20]) + more)
    return Ruleset(meta=data["meta"], rules=data["rules"], by_id={r["id"]: r for r in data["rules"]})


def load_ruleset(path: str | Path) -> Ruleset:
    return parse_ruleset(Path(path).read_text(encoding="utf-8"))


# ---------------------------------------------------------------- ewaluacja
def _resolve_value(value: Any, ctx: Context) -> Any:
    if isinstance(value, dict) and set(value) == {"param"}:
        return ctx.param(value["param"])
    if isinstance(value, dict) and set(value) == {"fact"}:
        return ctx.fact(value["fact"])
    return value


def _resolve_arg(value: Any, ctx: Context) -> tuple[Any, bool]:
    """(wartość, brak). String z kropką = ścieżka pola wejścia."""
    if isinstance(value, str) and "." in value:
        resolved = ctx.field(value)
        if resolved is None:
            ctx.need(value)
            return None, True
        return resolved, False
    return _resolve_value(value, ctx), False


def _coerce(left: Any, right: Any) -> tuple[Any, Any]:
    if isinstance(left, bool) or isinstance(right, bool):
        return left, right
    if isinstance(left, date) and isinstance(right, str):
        return left, to_date(right)
    if isinstance(right, date) and isinstance(left, str):
        return to_date(left), right
    numeric = (int, float, Decimal)
    if isinstance(left, numeric) and isinstance(right, numeric):
        return Decimal(str(left)), Decimal(str(right))
    try:
        if isinstance(left, numeric) and isinstance(right, str):
            return Decimal(str(left)), Decimal(right)
        if isinstance(right, numeric) and isinstance(left, str):
            return Decimal(left), Decimal(str(right))
    except ArithmeticError:
        pass
    return left, right


def _eq(left: Any, right: Any) -> bool:
    a, b = _coerce(left, right)
    return bool(a == b)


def compare(operator: str, left: Any, right: Any) -> Tri:
    """Porównanie liścia; brak którejkolwiek strony → UNKNOWN. ``in`` na liście = część wspólna niepusta (C10)."""
    if left is None or right is None:
        return None
    if operator == "in":
        options = right if isinstance(right, list) else [right]
        if isinstance(left, list):
            return any(_eq(item, option) for item in left for option in options)
        return any(_eq(left, option) for option in options)
    if operator == "eq":
        return _eq(left, right)
    if operator == "ne":
        return not _eq(left, right)
    a, b = _coerce(left, right)
    if operator == "gt":
        return a > b
    if operator == "gte":
        return a >= b
    if operator == "lt":
        return a < b
    if operator == "lte":
        return a <= b
    raise RulesetError(f"nieznany operator {operator!r}")


def evaluate_condition(cond: dict[str, Any], ctx: Context) -> Tri:
    if "all" in cond:
        return tri_all(evaluate_condition(sub, ctx) for sub in cond["all"])
    if "any" in cond:
        return tri_any(evaluate_condition(sub, ctx) for sub in cond["any"])
    if "not" in cond:
        return tri_not(evaluate_condition(cond["not"], ctx))

    operator = cond["operator"]
    if "field" in cond:
        left = ctx.field(cond["field"])
        if operator == "exists":
            return (left is not None) == bool(cond["value"])
        if left is None:
            ctx.need(cond["field"])
            return None
    else:
        args: dict[str, Any] = {}
        for key, raw in (cond.get("args") or {}).items():
            args[key], absent = _resolve_arg(raw, ctx)
            if absent:
                return None
        left = ctx.fact(cond["fact"], **args)
        if operator == "exists":
            return None if left is None else bool(cond["value"])
    return compare(operator, left, _resolve_value(cond["value"], ctx))


@dataclass
class RuleOutcome:
    rule_id: str
    value: Tri
    missing: list[str]

    @property
    def fired(self) -> bool:
        return self.value is True


def evaluate_rule(rule: dict[str, Any], ctx: Context) -> RuleOutcome:
    """Ocena warunków jednej reguły. ``missing`` = pola wejścia brakujące do rozstrzygnięcia (tylko przy UNKNOWN)."""
    local = ctx.child()
    value = evaluate_condition(rule["conditions"], local)
    ctx.need(*local.missing)
    return RuleOutcome(rule_id=rule["id"], value=value, missing=list(local.missing) if value is None else [])
