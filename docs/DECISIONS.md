# DECISIONS

Kolejność źródeł: (1) treść zadania i regulamin (`docs/CHALLENGE.md`) → (2) zatwierdzone dokumenty zespołu (`docs/PRD.md`, `MVP.md`, `ARCHITECTURE.md`, ten plik) → (3) faktyczny stan repo i narzędzi → (4) preferencje zespołu → (5) domyślne rozwiązania skilla bootstrap.

## Decyzje
| # | Decyzja | Powód | Źródło |
|---|---|---|---|
| D1 | Frontend **Next.js** (React) + TypeScript + Tailwind | Zadanie wprost preferuje React/Next.js — ma pierwszeństwo przed domyślnym Vite skilla | CHALLENGE § 5 |
| D2 | Backend **Python 3.12 + FastAPI + Pydantic**, REST | Na liście preferowanej przez ZUS; najlepszy ekosystem do reguł i PDF | CHALLENGE § 5 |
| D3 | Silnik reguł deterministyczny (YAML + nazwane funkcje), bez LLM w decyzjach | Poprawność wyliczeń sprawdzana przez jury; audytowalność | CHALLENGE § 6, zus_rules/10 |
| D4 | Kontrakt **OpenAPI 3.1 pisany ręcznie** w `contracts/openapi.yaml` (contract-first), właściciel Integrator | Niezależność BE/FE; skill bootstrap | skill § 5 |
| D5 | Dane: **bez bazy w P0** (parametry z YAML, sprawy z plików JSON); SQLite dopiero przy nadpisaniach admina | Prosty P0, brak współbieżności; skill dopuszcza SQLite/in-memory | skill § 3 |
| D6 | Pakiety: **pip + venv** i **npm** (nie uv/pnpm) | uv i pnpm nie są zainstalowane na maszynie zespołu (preflight) | stan środowiska |
| D7 | Uruchomienie: `scripts/*.ps1` (Windows) + `compose.yaml` (Docker) | Zespół na Windows; Docker dostępny | preflight |
| D8 | Wszystkie integracje symulowane, z banerem „SYMULACJA” i bez brandingu ZUS/mObywatel | Wymóg zadania + zakaz podszywania | CHALLENGE § 3 |
| D9 | Sprawy ZUS i materiały źródłowe poza gitem (`cases/`, `materials/`) do decyzji mentora M02 | Zakaz kopiowania i rozpowszechniania dokumentów ZUS | CHALLENGE § 8 |
| D10 | **Brak adaptera LLM w bootstrapie**; asystent AI odrzucony; odczyt PDF przez AI tylko jako P1 po zgodzie M16e | AI nie jest wymagane; skill: „nie dodawaj AI bez potrzeby” | decyzja zespołu |
| D11 | Vertical slice = `slice_v0` (urlop macierzyński matki), jawnie oznaczony, zwraca `not_evaluated_rules` | Uruchamialność bez udawania kompletności | skill § 2 |
| D12 | Kwoty jako dokładny Decimal (string), bez zaokrągleń do czasu odpowiedzi M04; FE skraca do 2 miejsc z „…” | Brak reguł zaokrąglania w materiałach (GAP-001) | zus_rules/09 |
| D13 | Deploy publiczny, zdalne repo i `git push` — tylko na wyraźne polecenie lidera | Skill § 10; koszty i konta | skill |
| D14 | Plik `PROGRESS.md` jako wspólny checkpoint, aktualizowany przy każdym zakończonym zadaniu | Ciągłość pracy wielu osób i sesji Claude Code | decyzja zespołu |
| D15 | Review po każdym commicie: subagent `reviewer` + komenda `/review`; wyzwalanie przez git hook `post-commit` (znacznik w `.git/zus-review/`) i hooki Claude Code (PostToolUse dla Bash i PowerShell, SessionStart, UserPromptSubmit; commit wykrywany po zmianie HEAD); PR/merge/push tylko po zgodzie lidera; `git push`, `git merge`, `gh pr create/merge` w `ask` (Bash i PowerShell, także `git -C … push`), force push (`--force`, `-f`, `+ref`, również z opcjami globalnymi gita) i `reset --hard` w `deny` | Jakość i zgodność z regułami przy 6 osobach pracujących równolegle; subagent nie uruchamia się sam po commicie z terminala, więc hook tylko oznacza commit i przypomina | decyzja lidera |
| D16 | Silnik DSL (BE1-01, wariant okrojony): walidacja strukturalna YAML zamiast pełnego JSON Schema; `exists` na polu nigdy UNKNOWN (C10), `exists` na fakcie zwracającym `None` = UNKNOWN (C9); `all`/`any` przerywają na FALSE/TRUE (wynik przesądzony), pozostałe podwarunki liczone w całości dla pełnej listy braków; fakt zgłasza brakujące pola przez `ctx.need(...)`; ścieżka macierzyńska z ręczną kolejnością kroków 07 §1 (od BE1-02: `engine/pipeline/maternity.py`); `f_debt_fully_repaid`: brak `repaid_in_full_date` = brak spłaty → FALSE (07 §6 definiuje fakt jako „data istnieje i ≤ as_of”); przy braku wniosku i deklaracji 81,5% stawka 100% (jak slice_v0) | Timebox przed deadline; dowód działania = parytet ze slice_v0 | decyzja lidera (koordynacja) |
| D17 | Pipeline (BE1-02, wariant okrojony): router domyślnie `ENGINE=rules` (pipeline), `ENGINE=slice` przywraca slice_v0; reguła z faktem spoza rejestru oceniana częściowo — gdy znane dane ją rozstrzygają, normalny wynik, gdy rozstrzyga tylko brakujący fakt → `not_evaluated_rules` (jawne ograniczenie, bez wpływu na status); BLOCKED/HUMAN_REVIEW z UNKNOWN wynikającym z brakujących pól wejścia → najpierw NEEDS_DATA (dopytać), NEEDS_REVIEW gdy warunki TRUE lub nierozstrzygalne bez nowych faktów; `exceptions` typu EXCLUSION = wykluczenia, pozostałe = alternatywne podstawy (oceniane, gdy podstawowa nie jest TRUE; nieoceniona alternatywa przy braku ubezpieczenia → NEEDS_REVIEW, DT-9 w. 3); kolejność kroków per świadczenie w module kroków (`pipeline/maternity.py`), nie w pełni generyczna; `f_primary_title_type` bez tytułu aktywnego w dniu zdarzenia → ostatni zakończony tytuł (DERIVED; poród w czasie urlopu wychowawczego); reguła BLOCKED z faktem spoza rejestru → `not_evaluated_rules` zamiast NEEDS_REVIEW (odstępstwo od DT-9 w. 3 do zamknięcia faktami BE-2, np. RATE-MAT-007 `f_monthly_maternity_amount`) | Timebox; demo i warianty slice_v0 dają ten sam wynik; uniknięcie fałszywego NEEDS_REVIEW przy zwykłych brakach danych | decyzja lidera (koordynacja) |

## Konfrontacja: wcześniejszy setup vs skill `hackathon-bootstrap`
| Obszar | Wcześniej | Skill | Decyzja |
|---|---|---|---|
| Uruchamialny vertical slice | brak kodu | wymagany (UI → API → logika → UI) | **przyjęte**: slice_v0 + strona kalkulatora |
| Kontrakt | `contract/openapi.json` generowany z Pydantic | `contracts/openapi.yaml`, contract-first | **przyjęte** (skill) |
| Struktura BE | `backend/zus_engine`, `backend/api` | `backend/app/{core,modules,integrations}` | **przyjęte**, silnik w `app/engine/` |
| FE | Next.js | React + Vite (domyślnie) | **Next.js** — wymóg zadania ma pierwszeństwo |
| Baza | SQLite + JSON | PostgreSQL (domyślnie) | **bez bazy w P0** (skill dopuszcza uproszczenie) |
| AI | odrzucony asystent | adapter `llm_client` (domyślnie) | **brak** — skill: tylko gdy potrzebne |
| Komendy | uv, pnpm | dopasowane do zainstalowanych narzędzi | **pip/venv, npm** |
| Skrypty | brak | `dev.ps1`, `verify.ps1`, smoke | **przyjęte** |
| Docker / CI / .env.example | brak | wymagane | **przyjęte** |
| Docs | 2 plany + mentors + coverage | PRD, MVP, ARCHITECTURE, DECISIONS, ASSUMPTIONS, TASKS, DEMO, SUBMISSION | **przyjęte**; plany → `docs/background/` |
| `.claude/` | settings + hook + 3 agentów + 5 komend | settings bezpieczne, rules/skills tylko gdy potrzebne | **zachowane** (mają realne zastosowanie), ścieżki zaktualizowane |
| Puste katalogi | były | zakazane | **usunięte** |
| Git | brak repo | `git init`, lokalny commit po zielonych bramkach | **przyjęte**, bez push |
| Postęp prac | brak | — | **dodane**: `PROGRESS.md` (prośba lidera) |

## Wymagania zadania, które są nienaruszalne (sprawdzić przy każdej zmianie)
RWD · demo www z wyborem/uploadem przykładowych wniosków i weryfikacją ubezpieczenia · kalkulatory a–j (zalecany jeden zintegrowany) · wszystkie integracje wyłącznie symulowane · panel admina parametrów · REST · wskazanie funkcji z AI · rozwiązania zewnętrzne w prezentacji · film ≤3 min w otwartym repo · prezentacja ≤10 slajdów · poufność spraw ZUS.
