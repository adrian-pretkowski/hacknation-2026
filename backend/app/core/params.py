"""Parametry prawne czytane z zus_rules/03_rules.yaml (meta.parameters) + nadpisania panelu admina (BE2-05).

Jedyne źródło wartości liczbowych (stawki, wymiary, progi) - nie wpisuj tych wartości w kodzie.

Nadpisania (``PUT /api/admin/parameters``): każda zmiana ma ``valid_from`` (albo ``null`` = od razu), powód i numer
wersji zestawu parametrów (``parameters_version``, start 1 = same wartości z YAML). Zapis w pliku JSON
(``PARAM_OVERRIDES_PATH``, domyślnie ``backend/data/parameter_overrides.json``, poza gitem); działa bez restartu.
``param(name, on)`` zwraca wartość obowiązującą w dniu ``on`` (silnik: ``evaluation.as_of_date``; brak → dziś):
najnowsze nadpisanie z ``valid_from ≤ on``, w przeciwnym razie wartość z YAML.
"""
from __future__ import annotations

import json
import threading
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
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


def _specs() -> dict[str, Any]:
    return load_ruleset()["meta"]["parameters"]


def _convert(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return Decimal(value)
        except ArithmeticError:
            return value
    return value


def param(name: str, on: date | None = None) -> Any:
    """Wartość parametru w dniu ``on``; liczby dziesiętne zapisane jako string zwracane jako Decimal.

    Parametr z kluczem `file` i `value: null` czyta listę dat z pliku obok reguł (PUBLIC_HOLIDAYS).
    """
    spec = _specs()[name]
    override = STORE.effective(name, on)
    if override is not None:
        return _convert(override["value"])
    value = spec["value"]
    if value is None and spec.get("file"):
        return list(_load_dates_file(spec["file"]))
    return _convert(value)


def param_status(name: str) -> str | None:
    return _specs()[name].get("status")


# ------------------------------------------------------------------------------------------- nadpisania (BE2-05)
class ParameterError(ValueError):
    """Zła zmiana parametru (→ 422): ``field`` = ścieżka w żądaniu."""

    def __init__(self, field: str, code: str, message: str):
        super().__init__(message)
        self.field, self.code, self.message = field, code, message


class VersionConflict(Exception):
    """``base_parameters_version`` ≠ bieżąca wersja (→ 409)."""

    def __init__(self, current: int):
        super().__init__(f"Bieżąca wersja parametrów to {current}")
        self.current = current


def _normalize(name: str, value: Any, field: str) -> Any:
    """Wartość nadpisania w typie wartości bazowej z YAML (string dziesiętny / liczba / tabela / lista dat)."""
    spec = _specs()[name]
    base = spec["value"]
    if spec.get("file"):
        return _normalize_dates(name, value, field)
    if isinstance(base, bool) or isinstance(value, bool):
        raise ParameterError(field, "invalid_type", f"{name}: wartość logiczna nieobsługiwana")
    if isinstance(base, dict):
        if not isinstance(value, dict) or set(value) != set(base):
            raise ParameterError(field, "invalid_table", f"{name}: tabela musi mieć klucze {sorted(base)}")
        return {k: _normalize_scalar(name, base[k], v, f"{field}.{k}") for k, v in value.items()}
    return _normalize_scalar(name, base, value, field)


# Dopuszczalne zakresy nadpisań (BE2-13): chronią silnik przed wartościami bez sensu (0 dni w miesiącu, stawka
# ujemna, 10^9 tygodni). To ograniczenia techniczne panelu, nie wartości z przepisów: dolna granica wynika z jednostki,
# górna to krotność wartości bazowej z 03. Parametr może je zawęzić kluczami ``min``/``max`` w ``meta.parameters``.
_UPPER_MULTIPLIER = 10
_PLN_UPPER_MULTIPLIER = 100
_PLN_UPPER_WITHOUT_BASE = Decimal("10000000")
_FRACTION_UNITS = {"ratio", "ratio_of_fte"}


def _bounds(name: str, base: Any) -> tuple[Decimal, Decimal | None, bool]:
    """(minimum, maksimum lub None, czy minimum wyłączone) dla wartości skalarnej parametru ``name``."""
    spec = _specs()[name]
    unit = str(spec.get("unit") or "")
    base_number = Decimal(str(base)) if base is not None else None
    if isinstance(base, int) and not isinstance(base, bool):
        low, high, exclusive = Decimal(1), Decimal(base) * _UPPER_MULTIPLIER, False
    elif unit in _FRACTION_UNITS:
        cap = Decimal(1) if base_number is None or base_number <= 1 else base_number * _UPPER_MULTIPLIER
        low, high, exclusive = Decimal(0), cap, False
    else:  # kwoty (PLN) i pozostałe liczby dziesiętne: dodatnie
        high = base_number * _PLN_UPPER_MULTIPLIER if base_number else _PLN_UPPER_WITHOUT_BASE
        low, exclusive = Decimal(0), True
    if spec.get("min") is not None:
        low, exclusive = Decimal(str(spec["min"])), False
    if spec.get("max") is not None:
        high = Decimal(str(spec["max"]))
    return low, high, exclusive


def _check_range(name: str, base: Any, number: Decimal, field: str) -> None:
    low, high, exclusive = _bounds(name, base)
    too_low = number <= low if exclusive else number < low
    if too_low or (high is not None and number > high):
        lower = f"większa niż {low}" if exclusive else f"co najmniej {low}"
        upper = f" i nie większa niż {high}" if high is not None else ""
        raise ParameterError(field, "out_of_range", f"{name}: wartość musi być {lower}{upper}")


def _normalize_dates(name: str, value: Any, field: str) -> list[str]:
    """Lista dat (parametr z pliku, np. PUBLIC_HOLIDAYS - FE1-29): niepusta, każda RRRR-MM-DD; bez duplikatów, rosnąco.

    Nadpisanie zastępuje całą listę z pliku (od ``valid_from``) - jak przy pozostałych parametrach.
    """
    if not isinstance(value, list) or not value:
        raise ParameterError(field, "invalid_dates", f"{name}: wymagana niepusta lista dat RRRR-MM-DD")
    days = set()
    for i, item in enumerate(value):
        try:
            days.add(date.fromisoformat(str(item).strip()))
        except ValueError as exc:
            raise ParameterError(f"{field}.{i}", "invalid_date", f"{name}: {item!r} - data w formacie RRRR-MM-DD") \
                from exc
    return [d.isoformat() for d in sorted(days)]


def _normalize_scalar(name: str, base: Any, value: Any, field: str) -> Any:
    if isinstance(base, int) and not isinstance(base, bool):
        if isinstance(value, int) or (isinstance(value, str) and value.strip().lstrip("-").isdigit()):
            number = int(value)
            _check_range(name, base, Decimal(number), field)
            return number
        raise ParameterError(field, "invalid_integer", f"{name}: wymagana liczba całkowita")
    # string dziesiętny (stawki, kwoty) albo parametr bez wartości (MISSING) - przyjmujemy liczbę dziesiętną
    if isinstance(value, (int, float, str)):
        try:
            number = Decimal(str(value).strip().replace(",", "."))
        except InvalidOperation:
            number = None
        if number is not None and number.is_finite():
            _check_range(name, base, number, field)
            return str(number)
    raise ParameterError(field, "invalid_decimal", f"{name}: wymagana liczba dziesiętna (np. \"0.815\")")


def _jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    return value


class OverrideStore:
    """Nadpisania parametrów w pliku JSON: ``{"version": n, "overrides": [...]}``; bezpieczne wątkowo."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._path: Path | None = None
        self._data: dict[str, Any] | None = None

    def use_file(self, path: Path | str | None) -> None:
        """Zmiana pliku (testy, konfiguracja); ``None`` → z ustawień. Kasuje stan w pamięci."""
        with self._lock:
            self._path = Path(path) if path is not None else None
            self._data = None

    def _file(self) -> Path:
        return self._path or get_settings().param_overrides_path

    def _state(self) -> dict[str, Any]:
        if self._data is None:
            path = self._file()
            if path.exists():
                with open(path, encoding="utf-8") as fh:
                    self._data = json.load(fh)
            else:
                self._data = {"version": 1, "overrides": []}
        return self._data

    @property
    def version(self) -> int:
        with self._lock:
            return int(self._state()["version"])

    def overrides(self, name: str | None = None) -> list[dict[str, Any]]:
        with self._lock:
            return [o for o in self._state()["overrides"] if name is None or o["name"] == name]

    def effective(self, name: str, on: date | None = None) -> dict[str, Any] | None:
        day = on or date.today()
        with self._lock:
            found = [o for o in self._state()["overrides"] if o["name"] == name
                     and (o.get("valid_from") is None or date.fromisoformat(o["valid_from"]) <= day)]
        return max(found, key=lambda o: o["version"]) if found else None

    def apply(self, base_version: int, changes: list[dict[str, Any]]) -> int:
        """Waliduje wszystkie zmiany, potem zapisuje je atomowo jako nową wersję zestawu parametrów."""
        specs = _specs()
        prepared = []
        for i, change in enumerate(changes):
            name = change.get("name")
            if name not in specs:
                raise ParameterError(f"changes.{i}.name", "unknown_parameter", f"Nieznany parametr {name!r}")
            valid_from = change.get("valid_from")
            if valid_from is not None:
                try:
                    valid_from = date.fromisoformat(str(valid_from)).isoformat()
                except ValueError as exc:
                    raise ParameterError(f"changes.{i}.valid_from", "invalid_date", "Data w formacie RRRR-MM-DD") \
                        from exc
            reason = str(change.get("reason") or "").strip()
            if len(reason) < 3:
                raise ParameterError(f"changes.{i}.reason", "reason_required", "Podaj powód zmiany (min. 3 znaki)")
            prepared.append({"name": name, "value": _normalize(name, change.get("value"), f"changes.{i}.value"),
                             "valid_from": valid_from, "reason": reason})
        with self._lock:
            state = self._state()
            if base_version != state["version"]:
                raise VersionConflict(int(state["version"]))
            version = int(state["version"]) + 1
            stamp = datetime.now(UTC).isoformat(timespec="seconds")
            new_state = {"version": version,
                         "overrides": state["overrides"] + [{**p, "version": version, "changed_at": stamp}
                                                            for p in prepared]}
            self._write(new_state)
            return version

    def reset(self) -> int:
        """Usuwa wszystkie nadpisania (wartości z 03) jako nową wersję zestawu parametrów (BE2-13)."""
        with self._lock:
            version = int(self._state()["version"]) + 1
            self._write({"version": version, "overrides": []})
            return version

    def _write(self, new_state: dict[str, Any]) -> None:
        """Zapis atomowy (plik tymczasowy + zamiana); wywołuj pod blokadą."""
        path = self._file()
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(_jsonable(new_state), ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(path)
        self._data = new_state


STORE = OverrideStore()


def parameter_list(on: date | None = None) -> dict[str, Any]:
    """Kontrakt ``ParameterList``: wartości obowiązujące w dniu ``on`` (dziś) z flagą ``overridden``."""
    items = []
    for name, spec in _specs().items():
        override = STORE.effective(name, on)
        value = override["value"] if override else spec["value"]
        if override is None and value is None and spec.get("file"):
            value = list(_load_dates_file(spec["file"]))
        items.append({
            "name": name, "value": _jsonable(value), "unit": str(spec.get("unit") or ""),
            "source": str(override["reason"] if override else spec.get("source") or ""),
            "status": spec.get("status"),
            "valid_from": override["valid_from"] if override else spec.get("valid_from"),
            "overridden": override is not None,
            "version": 1 + len(STORE.overrides(name)),
        })
    return {"ruleset_version": ruleset_version(), "parameters_version": STORE.version, "parameters": items}
