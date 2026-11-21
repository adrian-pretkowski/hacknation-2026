# PROGRESS — checkpoint projektu

> Wspólny punkt kontrolny dla wszystkich osób i sesji Claude Code. **Aktualizuj po każdym zakończonym (albo zablokowanym) zadaniu** — zasady w `CLAUDE.md` → „Aktualizacja PROGRESS.md”. Przed rozpoczęciem pracy przeczytaj sekcje 1–4.

## 1. Stan teraz
| Pole | Wartość |
|---|---|
| Ostatnia aktualizacja | 2026-11-21 · INT (INT-01 kontrakt v1, Claude Code) |
| Faza | Bootstrap zakończony → start równoległej implementacji P0 (blok 1) |
| Werdykt | **READY FOR PARALLEL DEVELOPMENT** (z zastrzeżeniami: brak zdalnego repo i deployu — decyzja lidera) |
| Działa end-to-end | Kalkulator zasiłku macierzyńskiego matki (slice_v0): UI → `POST /api/evaluate` → wynik w UI |
| Silnik | `slice_v0` (podzbiór reguł); pełny silnik reguł — zadania BE1-01..05, BE2-01..04 |
| Kontrakt | `contracts/openapi.yaml` **v1.0.0** — 2 operacje `implemented`, 12 `planned` (sprawy, admin, symulacje); modele = `zus_rules/04`/`05`; czeka na akceptację BE+FE |
| Testy | backend 84/84 (w tym 75 testów kontraktu) · audyt reguł 119 reguł / 92 testy spec / 0 błędów · frontend lint, typecheck, build OK |

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
| INT | INT-01 — review kontraktu v1 przez BE i FE | — (brak zdalnego repo) | 2026-11-21 | po akceptacji → DONE; następne: INT-03 |
| BE-1 | — | — | — | |
| BE-2 | — | — | — | |
| FE-1 | — | — | — | |
| FE-2 | — | — | — | |
| BA | — | — | — | |

## 4. Następne kroki (kolejność)
1. Lider: utworzyć zdalne repo (odblokowuje INT-04) i zdecydować o hostingu demo (INT-02). Repo przeniesione do `D:\hacknation-2026`, pierwsze commity zrobione.
2. BA-01: mentorzy M01–M05, M11 (`docs/mentors.md`) — blokery B1–B4.
3. BE i FE: przejrzeć i zaakceptować kontrakt v1 (INT-01). Kontrakt już odblokowuje FE1-01..03, FE2-02..04, BE2-05/06, INT-03 — typy FE: `npm run gen:api`.
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
| 2026-11-21 | INT (Claude Code) | INT-01 | Kontrakt v1.0.0 (addytywny wobec v0): pełne modele `04`/`05` jako `In*`/`Out*`, opcjonalne pola wyniku (segmenty, dokumenty, terminy, ostrzeżenia, plan_errors, insurance_verification, return_to_work), 12 operacji `planned` (sprawy, admin z `AdminToken`, 7 symulacji z `simulated: true`), `ContentBlock` (I4); test kontraktu: zaimplementowane ⊆ zadeklarowane, zgodność `x-status`, wszystkie przykłady, drift vs 04/05, oznaczenie symulacji, mock FE; `gen:api` z `--default-non-nullable false` (bez zmian w kodzie FE); `ADMIN_TOKEN` w `.env.example` | `pytest` → 84 passed; porównanie v0→v1 → ADDITIVE OK; `scripts\verify.ps1` → PASS; smoke nie uruchamiany ponownie (brak zmian w kodzie API) | — (commit: lider) |
