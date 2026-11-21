"""Rejestr faktów (interfejs I2 z docs/TASKS.md).

Fakt = nazwana, deterministyczna funkcja z zus_rules/07_CALCULATION_SPEC.md:

    @fact("f_sickness_insured_on")
    def sickness_insured_on(ctx: Context, date: date | None = None) -> bool | None: ...

Zasady:
- Zwraca ``None`` = UNKNOWN (C9). Brak danych NIGDY nie jest FALSE.
- Przy braku danych wejściowych zgłoś ścieżkę pola: ``return ctx.need("debt.amount_on_right_date")``
  — trafi do ``missing_data`` reguły, która użyła faktu.
- Wartości prawne tylko z ``ctx.param(...)`` (→ app.core.params.param), nigdy literały z przepisów.
- Kwoty Decimal (app.core.money), daty date (app.core.dates).
- Wywołanie innego faktu: ``ctx.fact("f_x", date=...)`` — memoizowane w obrębie jednej ewaluacji.

Moduły z faktami rejestrują się przy imporcie — dopisz nowy moduł do ``_FACT_MODULES`` poniżej.
Import w modułach faktów: ``from app.engine.facts.registry import Context, fact``.
"""
from __future__ import annotations

import importlib
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from app.core.params import param as _param

FactFn = Callable[..., Any]
_REGISTRY: dict[str, FactFn] = {}

# Moduły faktów (domeny). BE1-04/05: insurance, sickness; BE2-01..04: maternity, parental, base, documents.
_FACT_MODULES = ["app.engine.facts.insurance", "app.engine.facts.maternity"]


def fact(name: str) -> Callable[[FactFn], FactFn]:
    """Dekorator rejestrujący fakt pod nazwą ``f_*`` z 07."""
    if not name.startswith("f_"):
        raise ValueError(f"Nazwa faktu musi zaczynać się od 'f_': {name}")

    def register(fn: FactFn) -> FactFn:
        if name in _REGISTRY and _REGISTRY[name] is not fn:
            raise ValueError(f"Fakt {name} zarejestrowany dwukrotnie")
        _REGISTRY[name] = fn
        return fn

    return register


def load_fact_modules() -> None:
    for module in _FACT_MODULES:
        importlib.import_module(module)


def registered() -> dict[str, FactFn]:
    load_fact_modules()
    return dict(_REGISTRY)


def get_fact(name: str) -> FactFn | None:
    load_fact_modules()
    return _REGISTRY.get(name)


def _lookup(data: Any, path: str) -> Any:
    node = data
    for key in path.split("."):
        if not isinstance(node, dict):
            return None
        node = node.get(key)
    return node


@dataclass
class Context:
    """Kontekst jednej ewaluacji: wejście (04), parametry, data oceny, bieżący segment planu, stan wyniku.

    ``state`` — wartości ustawione przez reguły (``result.set`` / ``compute``), np. ``benefit``, ``rate``;
    pola DSL szukane są kolejno: ``segment.*`` → state → input.
    """

    input: dict[str, Any]
    as_of: date | None = None
    segment: dict[str, Any] | None = None
    state: dict[str, Any] = field(default_factory=dict)
    params: Callable[[str], Any] = _param
    missing: list[str] = field(default_factory=list)
    used_params: set[str] = field(default_factory=set)
    # lenient: fakt spoza rejestru = UNKNOWN (zapis w ``unregistered``) zamiast KeyError — częściowa ocena reguły
    lenient: bool = False
    unregistered: list[str] = field(default_factory=list)
    _cache: dict[tuple[Any, ...], Any] = field(default_factory=dict, repr=False)

    def child(self) -> Context:
        """Kontekst współdzielący wejście, stan i cache, ale z własną listą braków (ocena jednej reguły)."""
        return Context(input=self.input, as_of=self.as_of, segment=self.segment, state=self.state,
                       params=self.params, used_params=self.used_params, _cache=self._cache)

    def param(self, name: str) -> Any:
        """Parametr prawny (app.core.params); użycie jest rejestrowane (np. assumption dla UNCONFIRMED)."""
        self.used_params.add(name)
        return self.params(name)

    def field(self, path: str) -> Any:
        if path.startswith("segment."):
            return _lookup(self.segment or {}, path.removeprefix("segment."))
        if path in self.state:
            return self.state[path]
        return _lookup(self.input, path)

    def need(self, *paths: str) -> None:
        """Zgłasza brakujące pola wejścia i zwraca None (UNKNOWN)."""
        for path in paths:
            if path not in self.missing:
                self.missing.append(path)
        return None

    def fact(self, name: str, **args: Any) -> Any:
        fn = get_fact(name)
        if fn is None and self.lenient:
            if name not in self.unregistered:
                self.unregistered.append(name)
            return None
        if fn is None:
            raise KeyError(f"Fakt {name} nie jest zaimplementowany (zus_rules/07)")
        seg_key = id(self.segment) if self.segment is not None else None
        key = (name, seg_key, tuple(sorted((k, repr(v)) for k, v in args.items())))
        if key not in self._cache:
            before = len(self.missing)
            value = fn(self, **args)
            self._cache[key] = (value, tuple(self.missing[before:]))
        value, missing = self._cache[key]
        self.need(*missing)  # trafienie w cache też raportuje braki
        return value
