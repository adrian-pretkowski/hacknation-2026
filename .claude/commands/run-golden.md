---
description: Uruchamia złoty zestaw (testy z 08 + sprawy ZUS z cases/fixtures) i generuje raport zgodności X/N
---

1. Uruchom `cd backend && .venv/Scripts/python -m pytest tests/test_cases.py -p no:warnings` (testy z `zus_rules/08_TEST_CASES.json`).
2. Jeśli istnieje `cases/fixtures/` — dla każdej sprawy `<id>.json` wywołaj silnik (`app.engine.pipeline.evaluate(input)`) i porównaj z `expected`: status, okres, podstawa, stawka, kwota. Kwoty porównaj dokładnie oraz z tolerancją ±0,01 zł/dzień (zasady zaokrągleń nieznane — GAP-001).
3. Zapisz `docs/golden_report.md`:
   - podsumowanie: testy 08 X/N, sprawy ZUS X/N (dokładnie) i X/N (z tolerancją);
   - tabela: sprawa → typ → oczekiwane → wynik → zgodność → przyczyna rozbieżności (reguła / GAP / brak danych);
   - **bez** danych osobowych i cytatów z dokumentów (tylko id sprawy i wartości liczbowe).
4. Dla każdej rozbieżności wskaż prawdopodobną przyczynę i regułę, ale niczego nie poprawiaj w tym kroku.
5. Wypisz 3 najczęstsze przyczyny rozbieżności.
