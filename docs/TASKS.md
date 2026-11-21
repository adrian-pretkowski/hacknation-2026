# TASKS — backlog P0 i własność

Zasady: jedno zadanie = jeden właściciel = jedna gałąź/worktree = rozłączny zakres plików. Plik spoza zakresu → zgłoś właścicielowi (#blocker), nie edytuj. Po zakończeniu: status tutaj + wpis w `PROGRESS.md` (patrz `CLAUDE.md`).
Statusy: `TODO` · `IN_PROGRESS (kto)` · `BLOCKED (powód)` · `DONE` (tylko z dowodem weryfikacji w `PROGRESS.md`).

## Role i zakres plików
| Rola | Zakres | Pliki (wyłącznie) |
|---|---|---|
| **INT** Integrator/architekt (Dev5) | kontrakt, CI, Docker, skrypty, symulacje, merge, smoke | `contracts/`, `scripts/`, `.github/`, `compose.yaml`, `*/Dockerfile`, `.env.example`, `.gitattributes`, `.githooks/`, `.claude/`, `CLAUDE.md` (zasady wspólne — zmiany uzgadniane z liderem), `backend/app/main.py`, `backend/app/integrations/`, `backend/app/modules/simulations/`, `demo/` |
| **BE-1** | rdzeń silnika, ubezpieczenie, chorobowy, ewaluacja | `backend/app/engine/{dsl,pipeline,explain}/`, `backend/app/engine/facts/{registry,insurance,sickness}.py`, `backend/app/engine/slice_v0.py`, `backend/app/core/{money,dates}.py`, `backend/app/modules/evaluation/`, `backend/tests/test_cases.py`, `backend/tests/test_engine_*.py` |
| **BE-2** | macierzyński, rodzicielski, podstawa, dokumenty, parametry, sprawy | `backend/app/engine/facts/{maternity,parental,base,documents}.py`, `backend/app/core/params.py`, `backend/app/modules/{admin,cases}/`, `backend/tests/test_facts_*.py` (swoje moduły) |
| **FE-1** | główny przepływ, planer, admin UI | `frontend/src/features/{main-flow,planner,admin}/`, `frontend/src/app/{page.tsx,planer,admin}/` |
| **FE-2** | layout, design system, symulacje, sprawy, dokumenty, wsparcie | `frontend/src/components/`, `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/src/features/{simulations,cases,documents,support}/`, `frontend/src/app/{symulacje,sprawy,dokumenty,wsparcie}/` |
| **BA** | wymagania, mentorzy, treści, sprawy, materiały jury | `docs/` (poza `ARCHITECTURE.md`, `DECISIONS.md` — INT), `zus_rules/` (zmiany tylko z wpisem w `docs/mentors.md`), `frontend/src/content/`, `backend/app/engine/explain/templates.pl.yaml`, `cases/` (lokalnie) |

Pliki wspólne: `contracts/openapi.yaml` (edytuje INT, zmiany przez PR z akceptacją BE+FE), `frontend/src/lib/api-types.ts` (generowany: `npm run gen:api`), `PROGRESS.md` i `docs/TASKS.md` (każdy dopisuje tylko swoje wiersze).

## Interfejsy, które czynią zadania niezależnymi
| ID | Interfejs | Definiuje | Konsumenci |
|---|---|---|---|
| I1 | `app.engine.pipeline.evaluate(payload: dict) -> dict` — wejście `zus_rules/04`, wyjście `zus_rules/05` | BE1-02 | modules/evaluation, modules/cases, test_cases |
| I2 | Rejestr faktów: `@fact("f_nazwa")` na `def f(ctx: Context, **args) -> Any \| None`; `Context(input, params, as_of, segment)`; `None` = UNKNOWN | BE1-01 (dzień 1, najpierw interfejs + stub) | BE1-04/05, BE2-01..04 |
| I3 | `contracts/openapi.yaml` | INT-01 | BE, FE |
| I4 | Treści FE: `frontend/src/content/*.json` (schemat w INT-01 jako `ContentBlock`) | BA-02 | FE2-04, FE2-05 |
| I5 | Szablony wyjaśnień: `templates.pl.yaml` — `RULE-ID: "zdanie z {placeholder}"` | BA-02 | BE1-07 |
| I6 | Parametry: `app.core.params.param(name)` (dziś YAML; BE2-05 dodaje nadpisania) | istnieje | wszyscy BE |

## Zadania
Weryfikacja domyślna: BE → `backend\.venv\Scripts\python -m pytest -p no:warnings`; FE → `npm run lint; npm run typecheck; npm run build`; całość → `scripts\verify.ps1 -Smoke`.

| ID | Owner | Prio | Zakres / pliki | Zależności | Kryteria akceptacji | Weryfikacja | Status |
|---|---|---|---|---|---|---|---|
| INT-00 | INT | P0 | bootstrap repo, slice, kontrakt P0, CI, Docker, skrypty, docs | — | Gate A i B (PROGRESS.md) | `scripts\verify.ps1 -Smoke` | DONE |
| INT-01 | INT | P0 | `contracts/openapi.yaml` v1: pełne `EvaluateRequest/Response` wg `04`/`05` (segmenty, dokumenty, terminy, ostrzeżenia, plan_errors, insurance_verification, return_to_work) + ścieżki: `/api/cases`, `/api/cases/{id}`, `/api/cases/{id}/evaluate`, `/api/cases/upload`, `/api/admin/parameters` (GET/PUT), `/api/sim/*` (mobywatel, zus-profile, ezla, debt-certificate, pue-question, applications, birth-certificate), `ContentBlock`; ścieżki nieukończone z `x-status: planned`; test kontraktu: zaimplementowane ⊆ zadeklarowane | INT-00 | przykłady przechodzą walidację; BE i FE zaakceptowali PR | `pytest tests/test_contract.py` | IN_PROGRESS (INT) — technicznie gotowe (75 testów kontraktu, verify PASS); czeka na akceptację BE i FE w PR |
| INT-02 | INT | P0 | Deploy publiczny demo (Vercel + Render lub VM z compose), zapasowy URL, keep-alive | INT-00, **decyzja lidera** (konta/koszty) | publiczny URL działa w incognito i na telefonie; smoke na URL | `python scripts/smoke.py --api <url> --web <url>` | BLOCKED (decyzja lidera) |
| INT-03 | INT | P0 | Adaptery symulacji + endpointy `/api/sim/*`, profile demo (syntetyczne) w `demo/profiles/` | INT-01 | każda odpowiedź ma `simulated: true`; profile: pracownica, JDG z długiem, ojciec | pytest `test_simulations.py` | TODO |
| INT-04 | INT | P0 | Zdalne repo + CI zielone na GitHub | INT-00, **decyzja lidera** | workflow `ci` zielony | zakładka Actions | BLOCKED (decyzja lidera) |
| INT-05 | INT | P0 | E2E: ui-verifier na 3 profilach, 375/1440 px, zrzuty do `docs/screenshots/` | FE1-01, FE2-02 | raport bez błędów blokujących | subagent `ui-verifier` | TODO |
| INT-06 | INT | P0 | Review po każdym commicie: `.claude/agents/reviewer.md`, `.claude/commands/review.md`, `.claude/hooks/review_trigger.py`, `.githooks/post-commit`, hooki w `.claude/settings.json`, `scripts/dev.ps1` | INT-00 | commit na gałęzi roboczej → przypomnienie o `/review`; reviewer zwraca tabelę kontroli A1–D6 i werdykt; przy READY_TO_MERGE pytanie o PR, merge, push | test hooków (symulacja payloadów) + `/review` na `int/INT-06-reviewer` | DONE |
| INT-07 | INT | P0 | Scenariusze E2E po polsku: `e2e/` (Playwright, `scenariusze/*.md`, interpreter `kroki.ts`, `README.md` ze słownikiem kroków), `scripts/verify.ps1 -E2E` | FE1-01, FE2-02 (logowanie mObywatel — SYMULACJA) | `cd e2e; npm test` przechodzi na 375 i 1440 px; nieznany krok = czytelny błąd z listą kroków | `cd e2e; npm test` | IN_PROGRESS (INT) |
| BE1-01 | BE-1 | P0 | DSL: loader `03_rules.yaml` z walidacją, evaluator Kleene, rejestr faktów (I2), `core/money.py`, `core/dates.py` (konwencje C1–C11 z `zus_rules/07`) | INT-00 | testy tabel prawdy all/any/not z UNKNOWN; loader odrzuca błędny YAML | pytest `test_engine_dsl.py` | DONE — wariant okrojony: loader z walidacją strukturalną (bez JSON Schema), evaluator Kleene, rejestr `@fact` (`engine/facts/registry.py`), `core/money.py`, `core/dates.py`; dowód: pipeline (`engine/pipeline/`, BE1-02) = slice_v0 na 16 wariantach (`test_engine_parity.py`) |
| BE1-02 | BE-1 | P0 | Pipeline (I1): kolejność z `07` §1, overrides/exceptions, BLOCKED→NEEDS_REVIEW, FUTURE pomijane, agregacja DT-9; przełącznik `ENGINE=rules\|slice` w `modules/evaluation` | BE1-01 | slice i pipeline dają ten sam wynik dla `demo/` | pytest | DONE — wariant okrojony: `engine/pipeline/` (`engine.py`: tryby FUTURE/BLOCKED/HUMAN_REVIEW, `valid_from/valid_to`, częściowa ocena reguł z faktami spoza rejestru → `not_evaluated_rules`, wyjątki EXCLUSION vs alternatywne podstawy, `overrides`, DT-9, ślad `applied_rules`, `future_changes`; `maternity.py`: kroki 07 §1 dla macierzyńskiego); `ENGINE=rules\|slice` (domyślnie rules); demo i 16 wariantów = slice_v0 (`test_engine_parity.py`, `test_pipeline.py`); kolejne świadczenia dopisują moduły kroków |
| BE1-03 | BE-1 | P0 | Runner testów `zus_rules/08` (`tests/test_cases.py`: fixture + patch, porównanie częściowe, Decimal) | BE1-02 | uruchamia 92 testy; raport X/92 | pytest `test_cases.py` | TODO |
| BE1-04 | BE-1 | P0 | Fakty ubezpieczenia + reguły `GEN-*`, `SICK-ELIG-001..005` | BE1-01 | T-GEN-*, T-SICK-001..005 zielone | pytest -k "GEN or SICK" | TODO |
| BE1-05 | BE-1 | P0 | Fakty chorobowe + `SICKPAY-*`, `SICK-*` (ciąża 100%, 270 dni, po ustaniu tytułu) | BE1-04 | T-SP-*, T-SICK-* zielone | pytest | TODO |
| BE1-06 | BE-1 | P1 | Renderer wyjaśnień z `templates.pl.yaml` | BE1-02, BA-02 | każda reguła FIRED ma zdanie + przepis | pytest | TODO |
| BE2-01 | BE-2 | P0 | Fakty macierzyńskie + `MAT-*`, `SUPP-*` (martwe urodzenie, adopcja, rodzina zastępcza, wcześniak)  — szkielet `engine/facts/maternity.py` założony przez BE-1 (fakty ścieżki macierzyńskiej + martwe urodzenie/zgon dziecka), właściciel pliku: BE-2 | BE1-01 (interfejs I2) | T-MAT-*, T-SUPP-* zielone | pytest | TODO |
| BE2-02 | BE-2 | P0 | Fakty rodzicielskie/ojcowskie + `PAR-*`, `PAT-*`, `RATE-MAT-*`, `return_to_work` | BE1-01 | T-PAR-*, T-PAT-*, T-RATE-* zielone | pytest | TODO |
| BE2-03 | BE-2 | P0 | Podstawa wymiaru `BASE-*`, `CALC-*` (F15) | BE1-01 | T-BASE-* zielone; M04/M05 uwzględnione po odpowiedzi | pytest | TODO |
| BE2-04 | BE-2 | P0 | Dokumenty, terminy, ryzyka: `APP-*`, `*-DOC-*`, `RISK-*`, mapa `f_documents_for_segment` | BE1-01 | wynik zawiera `missing_documents`, `deadlines`, `warnings` | pytest | TODO |
| BE2-05 | BE-2 | P0 | Panel admina API: nadpisania parametrów z wersją i `valid_from` (SQLite lub JSON), `GET/PUT /api/admin/parameters` | INT-01 | zmiana `MAT_RATE_COMBINED` zmienia wynik bez restartu | pytest `test_admin.py` | TODO |
| BE2-06 | BE-2 | P0 | Sprawy: lista/wybór/upload → mapowanie do `04` → ewaluacja → porównanie z `expected`; `insurance_verification` | INT-01, BE1-02 (do tego czasu slice) | sprawa syntetyczna daje „zgodne ✓”; upload PDF zwraca NEEDS_DATA z listą pól | pytest `test_cases_module.py` | TODO |
| FE1-01 | FE-1 | P0 | Główny przepływ: wybór źródła danych (ręcznie / SYMULACJA ZUS / sprawa) → wynik dla wszystkich świadczeń; `NEEDS_DATA` = pytania o pola | INT-01 (mock z przykładów kontraktu) | działa na mock i na realnym API | lint/typecheck/build + ui-verifier | IN_PROGRESS (FE-1) |
| FE1-02 | FE-1 | P0 | Planer osi czasu obojga rodziców (segmenty, ½ etatu, 9 tyg., `plan_errors` przy segmencie, 100/70 vs 81,5%, powrót do pracy) | INT-01 | obsługa klawiaturą; 375 px bez scrolla poziomego | j.w. | TODO |
| FE1-03 | FE-1 | P0 | Admin UI parametrów (lista, edycja, wersja, `valid_from`) | INT-01 | zmiana widoczna w kolejnym wyliczeniu | j.w. | TODO |
| FE2-01 | FE-2 | P0 | Layout, nawigacja, motyw (jasny/ciemny), dostępność (WCAG 2.1 AA), komponenty bazowe (shadcn/ui opcjonalnie), stopka „wynik informacyjny” | INT-00 | kontrast AA, focus widoczny, 375/768/1440 | j.w. | TODO |
| FE2-02 | FE-2 | P0 | Ekrany symulacji: logowanie mObywatel, dane ZUS, e-ZLA, zaświadczenie o zadłużeniu, PUE/eZUS — stały baner „SYMULACJA”, bez brandingu | INT-01 | każdy ekran ma baner; dane z `/api/sim/*` lub mock | j.w. | TODO |
| FE2-03 | FE-2 | P0 | Ekran spraw: wybór/upload wniosku, weryfikacja ubezpieczenia, „zgodne z decyzją ✓/✗”, widok X/N | INT-01 | działa na sprawie syntetycznej | j.w. | TODO |
| FE2-04 | FE-2 | P0 | Dokumenty i terminy + formularze wniosków (urlopowe wg ROZP_WN § 2–18, ZAM) + odpis aktu urodzenia — SYMULACJA wysyłki | INT-01, BA-02 | prefill z wyniku; terminy 7/14/21 dni | j.w. | TODO |
| FE2-05 | FE-2 | P0 | Przewodnik: ryzyka, ochrona KP 177, organizacje wsparcia, linki zus.pl/gov.pl/PIP, tryb wrażliwy | BA-02 | treści z `frontend/src/content/` | j.w. | TODO |
| BA-01 | BA | P0 | Mentorzy: M01–M05, M11 natychmiast; odpowiedzi w `docs/mentors.md` | — | każda odpowiedź z datą i decyzją | review INT | TODO |
| BA-02 | BA | P0 | Treści: przewodnik, ryzyka, KP 177, organizacje wsparcia, tryb wrażliwy (`frontend/src/content/*.json`) + szablony wyjaśnień | INT-01 (schemat I4) | treści zweryfikowane z `zus_rules/` i Poradnikiem | review FE-2 | TODO |
| BA-03 | BA | P0 | Sprawy ZUS → `cases/fixtures/*.json` (subagent `case-extractor`), lokalnie | M01, M02 | ≥5 spraw z `expected` | `/run-golden` | BLOCKED (M01) |
| BA-04 | BA | P0 | Materiały: opis, prezentacja ≤10, scenariusz wideo, `docs/AI_USAGE.md`, `docs/THIRD_PARTY.md` (z INT) | MVP działa | `docs/SUBMISSION.md` cały ✅ | review INT | TODO |
| BA-05 | BA | P0 | Utrzymanie `docs/coverage.md` (wymaganie → reguły → ekran → test → status) | ciągłe | brak ⬜ w P0 przed freeze | review | TODO |

## Pierwsze zadanie dla każdej osoby
INT → INT-01 · BE-1 → BE1-01 (najpierw interfejs I2 i commit stubu, żeby BE-2 mógł startować) · BE-2 → BE2-01 (pisze fakty pod I2 z testami jednostkowymi) · FE-1 → FE1-01 (na mock z przykładów kontraktu) · FE-2 → FE2-01 · BA → BA-01.
