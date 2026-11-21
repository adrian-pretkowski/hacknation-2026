# PROGRESS — checkpoint projektu

> Wspólny punkt kontrolny dla wszystkich osób i sesji Claude Code. **Aktualizuj po każdym zakończonym (albo zablokowanym) zadaniu** — zasady w `CLAUDE.md` → „Aktualizacja PROGRESS.md”. Przed rozpoczęciem pracy przeczytaj sekcje 1–4.

## 1. Stan teraz
| Pole | Wartość |
|---|---|
| Ostatnia aktualizacja | 2026-11-21 · INT (bootstrap, Claude Code) |
| Faza | Bootstrap zakończony → start równoległej implementacji P0 (blok 1) |
| Werdykt | **READY FOR PARALLEL DEVELOPMENT** (z zastrzeżeniami: brak zdalnego repo i deployu — decyzja lidera) |
| Działa end-to-end | Kalkulator zasiłku macierzyńskiego matki (slice_v0): UI → `POST /api/evaluate` → wynik w UI |
| Silnik | `slice_v0` (podzbiór reguł); pełny silnik reguł — zadania BE1-01..05, BE2-01..04 |
| Testy | backend 14/14 · audyt reguł 119 reguł / 92 testy spec / 0 błędów · frontend lint, typecheck, build OK |

## 2. Bramki
| Bramka | Punkt | Status | Dowód (komenda → wynik) |
|---|---|---|---|
| A | Backend startuje, `/api/health` OK | VERIFIED | `python scripts/smoke.py` → `[health] 200 status ok` |
| A | Frontend startuje i renderuje ekran | VERIFIED | `next start` + przeglądarka → strona „Przewodnik Przyszłego Rodzica” |
| A | UI → prawdziwe API → logika → UI | VERIFIED | klik „Oblicz” → 140 dni, 81,5%, 163,00 zł/dzień, 22 820,00 zł; log uvicorn `POST /api/evaluate 200` |
| A | `contracts/openapi.yaml` = działający endpoint | VERIFIED | `pytest tests/test_contract.py` (ścieżki, schematy, przykłady, Problem 422) |
| A | Odtwarzalny scenariusz demo (syntetyczny) | VERIFIED | `demo/scenario_employee_mother.json` + smoke |
| B | Backend: ruff + pytest | VERIFIED | `scripts\verify.ps1` → `VERIFY: PASS` |
| B | Frontend: install, lint, typecheck, build | VERIFIED | j.w. |
| B | Uruchomienie całości opisane i sprawdzone | VERIFIED | `docker compose up --build` + `smoke.py --wait 90` → `SMOKE: PASS`; `scripts\dev.ps1` opisany (README) |
| B | RWD slice (375 px bez poziomego scrolla) | VERIFIED | przeglądarka 375×812, `scrollWidth = 375` |
| B | `.env.example` kompletny, brak sekretów w repo | VERIFIED | przegląd plików; `.env*`, `cases/`, `materials/` w `.gitignore` |
| B | `docs/TASKS.md` z ownerami, plikami, zależnościami | VERIFIED | plik |
| B | CI na GitHub zielone | UNVERIFIED | brak zdalnego repo (INT-04) |
| B | Hook bramki jakości Claude Code | VERIFIED | test: zepsuta reguła → exit 2 z raportem; poprawna → exit 0 |

## 3. W toku (jedna linia na osobę — nadpisuj swoją)
| Rola | Zadanie | Gałąź / worktree | Od | Uwagi |
|---|---|---|---|---|
| INT | — | — | — | |
| BE-1 | — | — | — | |
| BE-2 | — | — | — | |
| FE-1 | — | — | — | |
| FE-2 | — | — | — | |
| BA | — | — | — | |

## 4. Następne kroki (kolejność)
1. Lider: przenieść repo, pierwszy commit, utworzyć zdalne repo (odblokowuje INT-04) i zdecydować o hostingu demo (INT-02).
2. BA-01: mentorzy M01–M05, M11 (`docs/mentors.md`) — blokery B1–B4.
3. INT-01: kontrakt v1 (odblokowuje FE1-01..03, FE2-02..04, BE2-05/06).
4. BE1-01: interfejs rejestru faktów I2 jako pierwszy commit (odblokowuje BE2-01..04).
5. Równolegle: FE2-01 (layout), FE1-01 (główny przepływ na mock).
6. Checkpoint CP1: pełny silnik (`ENGINE=rules`) daje ten sam wynik co slice dla `demo/` + T-MAT-*, T-RATE-* zielone.

## 5. Blokery i otwarte pytania
| ID | Bloker | Właściciel | Link |
|---|---|---|---|
| B1 | Brak przykładowych spraw ZUS | BA | `docs/mentors.md` M01 |
| B2 | Publikacja spraw i materiałów | BA | M02 |
| B3 | Zaokrąglenia kwot | BA → BE-2 | M04 |
| B4 | Art. 43 — ta sama podstawa L4 → macierzyński | BA → BE-2 | M05 |
| B5 | Zdalne repo i deploy publiczny | Lider | INT-02, INT-04 |

## 6. Dziennik (dopisuj na końcu, nie edytuj cudzych wpisów)
| Data i godzina | Kto | Zadanie | Co zrobiono | Weryfikacja | Commit |
|---|---|---|---|---|---|
| 2026-11-21 | Claude Code (analiza) | — | Specyfikacja prawna `zus_rules/`: 119 reguł, 92 testy, luki i konflikty, 17 pytań do mentorów | `python zus_rules/tools/build_catalog.py` → errors=0 | — |
| 2026-11-21 | INT (Claude Code) | INT-00 | Bootstrap: kontrakt OpenAPI P0, backend FastAPI (slice_v0, Problem 422), frontend Next.js 16 (kalkulator → realne API), smoke, `dev.ps1`/`verify.ps1`, compose, CI, docs (CHALLENGE, PRD, MVP, ARCHITECTURE, DECISIONS, ASSUMPTIONS, TASKS, DEMO, SUBMISSION, MATERIALS), PROGRESS | `scripts\verify.ps1` PASS; smoke lokalnie i w Docker PASS; przeglądarka 1440 i 375 px | brak (commit wykona lider po przeniesieniu) |
