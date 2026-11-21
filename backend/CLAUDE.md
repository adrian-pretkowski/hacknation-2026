# Backend — FastAPI + silnik reguł

Python 3.12, FastAPI, Pydantic v2, PyYAML, pytest, ruff. Środowisko: `python -m venv .venv` + `pip install -r requirements-dev.txt` (robi to `scripts\dev.ps1`). Wersje w `requirements*.txt` = przetestowane.

## Struktura
```
app/main.py                 FastAPI, CORS, handler Problem 422, /api/health, rejestracja routerów (INT)
app/core/config.py          zmienne środowiskowe (.env.example)
app/core/params.py          parametry z zus_rules meta.parameters (+ nadpisania admina — BE2-05)
app/core/money.py, dates.py konwencje C1–C11 z zus_rules/07 (BE1-01)
app/engine/slice_v0.py      TYMCZASOWY podzbiór reguł (macierzyński matki) — do zastąpienia przez pipeline
app/engine/dsl/             loader YAML + evaluator Kleene (BE1-01)
app/engine/facts/           registry.py + insurance/sickness (BE-1), maternity/parental/base/documents (BE-2)
app/engine/pipeline/        evaluate(payload) -> wynik wg zus_rules/05 (BE1-02)
app/engine/explain/         renderer + templates.pl.yaml (treść: BA)
app/modules/<domena>/       router.py (+ service.py, schemas.py): evaluation, cases, admin, simulations
app/integrations/simulated/ adaptery symulacji (INT-03)
tests/                      test_contract.py, test_rules_catalog.py, test_evaluate_slice.py, test_cases.py (08), test_facts_*.py
```

## Zasady
- Fakt `f_*`: nazwa jak w `zus_rules/07`, docstring z odwołaniem do 07 i przepisu, zwraca `None` przy braku danych. Wyjątek w fakcie = błąd 500, nie FALSE.
- Evaluator: logika Kleene; `in` dla listy = część wspólna; FUTURE pomijane i raportowane; BLOCKED z warunkiem TRUE/UNKNOWN → NEEDS_REVIEW; `validation_error` → `plan_errors`, bez zmiany statusu.
- Odpowiedzi muszą przechodzić `tests/test_contract.py` (schematy z `contracts/openapi.yaml`). Nowe pole w odpowiedzi = najpierw kontrakt (INT).
- Runner `zus_rules/08`: `input = deep_merge(fixtures[fixture], patch)`, listy w patch zastępują; porównanie częściowe kluczy `expected`; Decimal dokładnie (10 miejsc dla dzieleń nieskończonych).
- Pliki ze spraw ZUS (`cases/`) nie trafiają do testów w repo — testy tylko na danych syntetycznych (`demo/`, fixtures z 08).
