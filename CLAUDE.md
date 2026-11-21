# Przewodnik Przyszłego Rodzica — HackNation 2026 (zadanie ZUS)

Aplikacja webowa RWD: ustala uprawnienia do zasiłków (chorobowy w ciąży, macierzyński, uzupełniający, rodzicielski, ojcowski), liczy okresy i kwoty dla obojga rodziców, wskazuje dokumenty, adresata, terminy i ryzyka. Deadline zgłoszenia: niedziela 11:00.

## Zacznij tutaj (każda sesja)
1. `PROGRESS.md` — stan, bramki, kto co robi, następne kroki, blokery.
2. `docs/TASKS.md` — twoje zadanie, zakres plików, kryteria akceptacji.
3. Wymagania zadania (nadrzędne): `docs/CHALLENGE.md`. Decyzje: `docs/DECISIONS.md`. Architektura: `docs/ARCHITECTURE.md`.
4. Prawo i reguły: `zus_rules/03_rules.yaml`, `07_CALCULATION_SPEC.md`, testy `08_TEST_CASES.json`, luki `09_...md`. Pytania do mentorów: `docs/mentors.md`.
5. Historia decyzji z pierwszej sesji i preferencje lidera: `docs/background/03_session_history.md`. **Nie commituj** — commity robi lider; na koniec podaj listę zmienionych plików i proponowany komunikat commita.

## Nienaruszalne wymagania zadania
RWD · demo www z wyborem/uploadem przykładowych wniosków i weryfikacją ubezpieczenia · kalkulatory a–j (jeden zintegrowany) · integracje WYŁĄCZNIE symulowane (baner „SYMULACJA”, bez brandingu ZUS/mObywatel) · panel admina parametrów · REST · wskazanie funkcji z AI · poufność spraw ZUS (`cases/`, `materials/` poza gitem).

## Twarde zasady
- **Contract-first:** zmiana API = najpierw `contracts/openapi.yaml` (edytuje tylko INT, PR z akceptacją BE i FE), potem BE i FE; typy FE: `npm run gen:api`.
- Kwoty `decimal.Decimal`, nigdy float, bez zaokrągleń pośrednich. Daty `date`, okresy `[from, to]`, tydzień = 7 dni.
- Brak danych = UNKNOWN → `NEEDS_DATA`, nigdy odmowa. Reguły `BLOCKED` → `NEEDS_REVIEW`; odblokowanie tylko z wpisem w `docs/mentors.md`.
- Wartości prawne tylko z `app.core.params.param()` — nie wpisuj liczb z przepisów w kod.
- LLM nie liczy kwot ani uprawnień. Nie dodawaj zależności, usług ani AI bez wpisu w `docs/DECISIONS.md`.
- Mock ≠ integracja: nie oznaczaj symulacji ani mocka jako działającej funkcji. `slice_v0` zwraca `not_evaluated_rules`.
- Edytuj tylko pliki ze swojego zakresu w `docs/TASKS.md`; inne → zgłoś właścicielowi.
- Bez sekretów w repo, bez `git push` i deployu bez polecenia lidera, bez destrukcyjnych operacji git.

## Struktura
`backend/app/` (FastAPI: `main.py`, `core/`, `engine/` silnik, `modules/<domena>/router.py`, `integrations/`) · `backend/tests/` · `frontend/src/` (Next.js 16: `app/`, `features/<domena>/`, `components/`, `lib/api.ts`, `lib/api-types.ts` generowany) · `contracts/openapi.yaml` · `zus_rules/` · `demo/` (dane syntetyczne) · `scripts/` · `docs/`.

## Komendy (Windows / PowerShell)
- Start lokalny: `scripts\dev.ps1` (backend :8000, frontend :3000)
- Pełna weryfikacja: `scripts\verify.ps1` (z serwerami: `scripts\verify.ps1 -Smoke`)
- Backend testy: `cd backend; .\.venv\Scripts\python -m pytest -p no:warnings` · lint: `.\.venv\Scripts\python -m ruff check .`
- Audyt reguł: `backend\.venv\Scripts\python zus_rules\tools\build_catalog.py` (musi dać `errors=0`)
- Frontend: `cd frontend; npm run lint; npm run typecheck; npm run build` · typy z kontraktu: `npm run gen:api`
- Smoke: `python scripts\smoke.py` (Docker: `--wait 90`)
- Docker/Linux: `docker compose up --build`; backend `.venv/bin/python -m pytest`

## Konwencje
- Testy: każda reguła/fakt z testem (przypadek typowy, graniczny, brak danych); ID reguły/testu w nazwie testu i w commicie (`feat(BE2-01): SUPP-ELIG-001 ...`).
- Błędy API: `application/problem+json` (`type, title, status, detail, errors[{field, code, message}]`); `NEEDS_DATA`/`NEEDS_REVIEW` to HTTP 200, nie błąd.
- Nazwy: Python `snake_case`, fakty `f_*` jak w `zus_rules/07`, TS `camelCase`, komponenty `PascalCase`, pola API `snake_case`.
- Logowanie: bez danych osobowych i treści dokumentów spraw.
- Next.js 16 ma zmiany względem starszych wersji — przed kodem FE przeczytaj `frontend/AGENTS.md`.
- Wyszukiwanie: Glob/Grep z zawężoną ścieżką i rozszerzeniem; nie skanuj `node_modules`, `.next`, `.venv`, `dist`, `build`.

## DONE = zweryfikowane
Zadanie jest DONE tylko gdy: kryteria akceptacji z `docs/TASKS.md` spełnione, komenda weryfikacji uruchomiona i przeszła (wynik wklejony do PROGRESS), audyt reguł 0 błędów, brak regresji smoke. Nie deklaruj sukcesu bez uruchomienia.

## Każda praca ma zadanie w TASKS.md (obowiązkowe)
Przed rozpoczęciem pracy znajdź pasujące zadanie w `docs/TASKS.md` § Zadania:
- **istnieje** → zaktualizuj jego status i opis (zakres/pliki, kryteria akceptacji), jeśli praca je zmienia;
- **nie istnieje** → dopisz nowy wiersz w formacie tabeli: kolejne ID z prefiksem roli (`INT-07`, `BE1-07`, `FE2-06`, `BA-06` …), Owner, Prio, Zakres / pliki, Zależności, Kryteria akceptacji, Weryfikacja, Status `IN_PROGRESS (rola)`.
ID zadania trafia do nazwy gałęzi, commitów i wpisu w PROGRESS.

## Aktualizacja PROGRESS.md (obowiązkowa, każdy użytkownik i każda sesja)
Po zakończeniu, zablokowaniu lub przekazaniu zadania z `docs/TASKS.md` — **w tym samym commicie co zmiana kodu**:
1. `docs/TASKS.md`: zmień status swojego wiersza (`IN_PROGRESS (rola)` → `DONE` / `BLOCKED (powód)`).
2. `PROGRESS.md` § 6 Dziennik: dopisz **jeden wiersz na końcu** — data i godzina, kto (rola + imię), ID zadania, co zrobiono (1–2 zdania), dowód weryfikacji (komenda → wynik), hash commita (lub „—”).
3. `PROGRESS.md` § 3 W toku: nadpisz **tylko swoją linię** (następne zadanie albo „—”).
4. `PROGRESS.md` § 4 Następne kroki i § 5 Blokery: zaktualizuj, jeśli twoja praca je zmieniła; § 1 Stan: tylko gdy zmienia się faza, wynik testów lub werdykt.
5. Zmiany wymagań/wymagania pokryte → `docs/coverage.md`; nowe decyzje → `docs/DECISIONS.md`; odpowiedzi mentorów → `docs/mentors.md`.
Na początku pracy nad zadaniem wpisz się w § 3 i ustaw `IN_PROGRESS (rola)` w TASKS. Konflikt merge w PROGRESS/TASKS: zachowaj wpisy obu stron (dziennik jest tylko dopisywany).

## Code review po każdym commicie (obowiązkowe)
- Każdy commit na gałęzi roboczej przechodzi review: komenda **`/review`** uruchamia subagenta `reviewer`, który sprawdza gałąź względem `main` (reguły fachowe z `docs/` i `zus_rules/`, reguły techniczne z tego pliku i kontraktu) i wydaje werdykt `READY_TO_MERGE` / `CHANGES_REQUIRED`.
- Przypomnienie jest automatyczne: git hook `.githooks/post-commit` (włącza `scripts\dev.ps1`: `git config core.hooksPath .githooks`) oznacza commit jako czekający, a hooki Claude Code po `git commit`, na starcie sesji i przy poleceniu wskazują, że trzeba uruchomić `/review`.
- Przy `READY_TO_MERGE` Claude pyta o PR, merge do `main` i push `main` — wykonuje tylko to, na co lider się zgodzi; nigdy force push. Przy `CHANGES_REQUIRED` popraw i zrób kolejny commit (kolejne review).

## Claude Code w repo
Hook po edycji `zus_rules/` lub `backend/app/engine|core|modules|tests`: audyt + pytest (`.claude/hooks/rules_gate.py`). Hook review: `.claude/hooks/review_trigger.py`. Subagenci: `reviewer`, `legal-checker`, `case-extractor`, `ui-verifier`. Komendy: `/review`, `/implement-fact`, `/implement-rule-group`, `/run-golden`, `/screen`, `/pre-pr` (sprawdza też aktualizację PROGRESS).
