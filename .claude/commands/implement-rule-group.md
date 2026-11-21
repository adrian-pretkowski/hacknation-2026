---
description: Implementuje grupę reguł (np. SUPP-, MAT-ELIG) — brakujące fakty i testy z 08
argument-hint: <PREFIX reguł, np. SUPP- albo MAT-ELIG>
---

Zaimplementuj obsługę reguł z prefiksem `$ARGUMENTS`.

1. Wypisz reguły `$ARGUMENTS*` z `zus_rules/03_rules.yaml`: id, typ, evaluation, priorytet, fakty i pola, których używają. Pomiń P2, chyba że wszystkie P0/P1 grupy już działają.
2. Wypisz testy z `zus_rules/08_TEST_CASES.json`, których `rule_ids` zawierają te reguły.
3. Sprawdź w rejestrze faktów (`backend/app/engine/facts/`), których faktów brakuje. Przedstaw plan: lista faktów do zrobienia, kolejność, pliki. **Zatrzymaj się i poczekaj na akceptację planu.**
4. Po akceptacji: dla każdego brakującego faktu postępuj jak w `/implement-fact` (test → implementacja).
5. Upewnij się, że runner `backend/tests/test_cases.py` uruchamia testy z kroku 2; uruchom je wybiórczo (`-k`), potem całość.
6. Reguły `BLOCKED` mają zwracać `NEEDS_REVIEW` — nie implementuj ich logiki merytorycznej.
7. Zakończ: tabela reguła → status (działa / BLOCKED / brak testu) → testy; wpis do `docs/coverage.md` dla odpowiedniego wymagania oraz aktualizacja `docs/TASKS.md` i `PROGRESS.md` wg `CLAUDE.md`.
