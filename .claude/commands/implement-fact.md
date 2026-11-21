---
description: Implementuje jedną funkcję faktu f_* ze specyfikacji 07 metodą test-first
argument-hint: <f_nazwa_faktu>
---

Zaimplementuj fakt `$ARGUMENTS` w `backend/app/engine/facts/`.

1. Znajdź wiersz `$ARGUMENTS` w `zus_rules/07_CALCULATION_SPEC.md` oraz reguły, które go używają (`zus_rules/11_CONSISTENCY_AUDIT.md` → „Mapa faktów → reguły”). Jeśli faktu nie ma w 07 — zatrzymaj się i zgłoś to, nie wymyślaj definicji.
2. Wybierz moduł wg właściciela z `CLAUDE.md` (insurance / sickness / maternity / parental / base / documents). Jeśli moduł należy do innej roli niż bieżąca gałąź — zatrzymaj się i zapytaj.
3. Najpierw testy w `backend/tests/test_facts_<moduł>.py`: przypadek typowy, każdy przypadek z kolumny „Przypadki graniczne”, brak danych → `None`. Oczekiwane wartości wyprowadź ze specyfikacji, nie z kodu. Uruchom — mają nie przejść.
4. Implementacja: `@fact("$ARGUMENTS")`, docstring z odwołaniem do 07 i podstawy prawnej, Decimal/date, bez zaokrągleń, `None` przy braku danych.
5. Uruchom `cd backend && .venv/Scripts/python -m pytest -p no:warnings` i `backend/.venv/Scripts/python zus_rules/tools/build_catalog.py`. Napraw, aż przejdą (najwyżej 2 podejścia do tej samej poprawki — potem opisz problem).
6. Podsumuj: plik, testy, reguły odblokowane przez ten fakt.
