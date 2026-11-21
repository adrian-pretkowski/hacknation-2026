---
description: Kontrola przed PR — lint, testy, audyt reguł, przegląd zmian
---

Sprawdź gałąź przed otwarciem PR. Niczego nie commituj ani nie pushuj.

1. `git status` i `git diff main...HEAD --stat` — czy zmiany dotyczą tylko modułów roli tej gałęzi (tabela w `CLAUDE.md`)? Czy w diffie nie ma plików z `cases/`, `.env*`, PDF-ów ani danych osobowych?
2. Uruchom, zależnie od zmienionych katalogów:
   - `backend/.venv/Scripts/python zus_rules/tools/build_catalog.py`
   - `cd backend && .venv/Scripts/python -m ruff check . && .venv/Scripts/python -m pytest -p no:warnings`
   - `cd frontend && npm run lint && npm run typecheck && npm run build`
3. Jeśli zmieniono `backend/app/engine/` — uruchom subagenta `legal-checker` dla zmienionych plików.
4. Przejrzyj diff pod kątem: float w kwotach, zamiana `None` na `False`/`0`, odmowa przy braku danych, ekrany symulacji bez banera, zmiany kontraktu API bez uzgodnienia.
5. Sprawdź, czy diff zawiera aktualizację `docs/TASKS.md` (status zadania) i `PROGRESS.md` (wiersz w § 6 Dziennik z dowodem weryfikacji, linia w § 3) zgodnie z `CLAUDE.md` → „Aktualizacja PROGRESS.md”. Brak = problem blokujący.
6. Wynik: lista problemów (blokujące / do poprawy / drobne), propozycja tytułu PR z odwołaniem do reguł/testów oraz brakujące wpisy w `docs/coverage.md`.
