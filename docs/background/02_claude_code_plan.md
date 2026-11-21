# HackNation ZUS — plan implementacji w Claude Code

Bazuje na: `HackNation_ZUS_plan.md` (zakres, harmonogram, role 2-2-2) i `zus_rules/` (specyfikacja reguł: 119 reguł, 92 testy, audyt).
Zasada nadrzędna: **Claude Code implementuje według specyfikacji, człowiek zatwierdza interpretację prawa.** Każda zmiana silnika przechodzi bramkę `python zus_rules/tools/build_catalog.py && pytest`.

---

## 0. Setup (Dev5, 11:45–12:30) — zanim ktokolwiek zacznie generować kod

### 0.1 Repozytorium (monorepo)

```
zus-przewodnik/
  CLAUDE.md                  # wspólne zasady (niżej)
  zus_rules/                 # specyfikacja — skopiowana 1:1, read-only dla agentów poza BE-1
  backend/                   # FastAPI + silnik
    zus_engine/              # DSL, fakty, pipeline (wg zus_rules/10_MVP_IMPLEMENTATION_PLAN.md)
    api/                     # endpointy REST
    tests/
    CLAUDE.md                # zasady backendu
  frontend/                  # Next.js + Tailwind + shadcn/ui
    CLAUDE.md                # zasady frontendu
  contract/                  # openapi.json (generowany) + fixtures/*.json
  cases/                     # PRYWATNE — .gitignore (sprawy ZUS), tylko lokalnie
  docs/                      # README, AI usage, limitations, mentors.md
  .claude/
    settings.json            # uprawnienia + hooki
    agents/                  # subagenci (niżej)
    commands/                # wspólne komendy (niżej)
```

`.gitignore`: `cases/`, `.env*`, `*.pdf` spoza `docs/`. To wymóg poufności dokumentów ZUS.

### 0.2 Główny `CLAUDE.md` (krótki — max ~60 linii)

```markdown
# Przewodnik Przyszłego Rodzica — HackNation 2026 (ZUS)
## Twarde zasady
- Źródłem prawdy o prawie jest zus_rules/03_rules.yaml + 07_CALCULATION_SPEC.md. Nie dodawaj reguł z ogólnej wiedzy.
- Kwoty: decimal.Decimal, nigdy float. Daty: date, okresy domknięte [from, to].
- Brak danych = UNKNOWN → NEEDS_DATA. Nigdy nie zamieniaj braku danych na odmowę.
- LLM NIE liczy kwot ani uprawnień w runtime.
- Dokumenty z cases/ nie trafiają do repo, logów, promptów do zewnętrznych API ani screenshotów.
- Każda symulacja (mObywatel, ZUS, e-ZLA, PUE, USC) ma baner „SYMULACJA”. Bez logotypów i brandingu ZUS/mObywatel.
## Moduły i właściciele (nie edytuj cudzego modułu — zgłoś w #blocker)
- backend/zus_engine/dsl, facts/insurance, facts/sickness → BE-1
- backend/zus_engine/facts/maternity|parental|base, backend/api → BE-2
- frontend/app/kalkulator, frontend/components/timeline → FE-1
- frontend/ (pozostałe), symulacje UI, admin UI → FE-2
- infra, contract/, adapters symulacji, CI → Dev5
- zus_rules/, docs/, cases/fixtures → BA
## Komendy
- Backend: cd backend && uv run pytest -q
- Audyt reguł: python zus_rules/tools/build_catalog.py
- Frontend: cd frontend && pnpm lint && pnpm test && pnpm build
## Definition of Done
Testy zielone + audyt 0 błędów + działa na preview/prod + wpis w docs/coverage.md
```

### 0.3 `.claude/settings.json` — uprawnienia i bramki

- `permissions.allow`: `Bash(uv run pytest:*)`, `Bash(python zus_rules/tools/build_catalog.py)`, `Bash(pnpm lint|test|build:*)`, `Bash(git status|diff|log:*)`.
- `permissions.deny`: `Read(cases/**)` dla sesji FE i Dev5 (sprawy czyta tylko BA/BE-2), `Bash(git push --force:*)`.
- **Hook `PostToolUse` (Edit|Write na `backend/zus_engine/**` lub `zus_rules/**`)** → `python zus_rules/tools/build_catalog.py && uv run pytest -q -x` (szybki feedback, przerywa przy pierwszym błędzie).
- **Hook `Stop`** (opcjonalnie) → przypomnienie o wpisie do `docs/coverage.md`.

Konfiguracja przez `/update-config` lub ręcznie — 15 min, nie więcej.

### 0.4 Subagenci (`.claude/agents/*.md`) — tylko trzech, każdy z wąskim zadaniem

| Agent | Narzędzia | Zadanie | Kto używa |
|---|---|---|---|
| `legal-checker` | Read, Grep | Porównuje implementację faktu/reguły z `07_CALCULATION_SPEC.md` i `03_rules.yaml`; zgłasza rozbieżności, **nie edytuje** | BE-1, BE-2 przed PR |
| `case-extractor` | Read, Write (tylko `cases/fixtures/`) | Czyta PDF sprawy → JSON zgodny z `04_INPUT_DATA_SCHEMA.json` + oczekiwany wynik z decyzji | BA (lokalnie, prywatne) |
| `ui-verifier` | Playwright MCP / Claude Browser | Przechodzi scenariusz demo na preview URL w 375 px i 1440 px, robi screenshoty, raportuje błędy | FE-2, Dev5 |

Agent Teams: **nie** (koszt konfiguracji > zysk przy 6 osobach z własnymi sesjami).

### 0.5 Wspólne komendy (`.claude/commands/`)

| Komenda | Co robi |
|---|---|
| `/implement-fact <f_name>` | Czyta definicję z 07, pisze test(y) graniczne z kolumny „Przypadki graniczne”, potem implementację w `facts/`, uruchamia pytest |
| `/implement-rule-group <PREFIX>` | Dla grupy reguł (np. `SUPP-`) sprawdza brakujące fakty, implementuje je, uruchamia testy z `08` dla tej grupy |
| `/run-golden` | Uruchamia wszystkie testy z `08_TEST_CASES.json` + `cases/fixtures/*` i generuje raport X/N (`docs/golden_report.md`) |
| `/screen <ścieżka>` | Generuje ekran FE wg makiety + kontraktu (mock z `contract/fixtures`), RWD, baner symulacji, gdy dotyczy |
| `/pre-pr` | lint + testy + audyt + `/code-review` na diffie gałęzi |

### 0.6 Równoległa praca bez konfliktów

- Każda osoba ma **własny git worktree i gałąź** (`git worktree add ../wt-be1 -b be1/engine-dsl`) oraz własną sesję Claude Code w tym katalogu.
- Jedna gałąź = jeden moduł z tabeli właścicieli. PR-y ≤ ~300 linii, merge do `main` po zielonym CI.
- Pliki wspólne (`contract/openapi.json`, `CLAUDE.md`, `settings.json`) zmienia tylko Dev5.

---

## 1. Kolejność implementacji — sesje i prompty

Każdy krok: **plan mode (Shift+Tab) → akceptacja planu przez człowieka → implementacja → bramka testów → PR**. Prompty poniżej są gotowe do wklejenia.

### Faza A — Fundament (12:30–15:00)

| Kto | Prompt do Claude Code | Wynik / bramka |
|---|---|---|
| Dev5 | „Utwórz monorepo wg struktury z `HackNation_ZUS_ClaudeCode_plan.md` §0.1: backend FastAPI (uv, Python 3.12, ruff, pytest), frontend Next.js 15 + TS + Tailwind + shadcn/ui (pnpm), GitHub Actions: lint+test+audyt reguł. Endpoint `/health`. Nie pisz logiki domenowej.” | CI zielone, `/health` lokalnie |
| Dev5 | „Skonfiguruj deploy: frontend na Vercel, backend Docker na Render; CORS tylko dla domeny frontu; zmienne env w `.env.example`. Zmierz cold start i wpisz do `docs/infra.md`.” | Publiczny URL FE↔BE (spike S3) |
| BE-1 | „Zaimplementuj `zus_engine/dsl` wg `zus_rules/10_MVP_IMPLEMENTATION_PLAN.md` §2–5: loader YAML z walidacją (jak `tools/build_catalog.py`), ewaluator trójwartościowy Kleene (TRUE/FALSE/UNKNOWN), operatory z `meta.dsl`, rejestr faktów `@fact`. Najpierw testy jednostkowe tabel prawdy dla all/any/not z UNKNOWN. Bez reguł domenowych.” | Testy DSL zielone |
| BE-2 | „Wygeneruj modele Pydantic v2 z `zus_rules/04_INPUT_DATA_SCHEMA.json` i `05_OUTPUT_DATA_SCHEMA.json` (Decimal dla Money, date). Endpoint `POST /api/evaluate` (input → output) zwracający na razie stub zgodny ze schematem. Wyeksportuj `contract/openapi.json` i 3 przykładowe odpowiedzi do `contract/fixtures/`.” | Kontrakt v1 zamrożony **13:30–14:00** |
| FE-1/FE-2 | „Wygeneruj klienta TS z `contract/openapi.json` (openapi-typescript) i MSW z `contract/fixtures`. Layout RWD (375/768/1440), nawigacja: Start → Logowanie (symulacja) → Dane → Wynik → Planer → Dokumenty → Admin.” | Klikalny szkielet na MSW |
| BA | (z `case-extractor`) „Dla każdego PDF w `cases/raw/` utwórz `cases/fixtures/<id>.json` zgodny ze schematem wejścia + `expected` z decyzji ZUS. Pola niepewne oznacz `null` i dopisz do `cases/fixtures/<id>.notes.md`.” | ≥5 spraw z oczekiwanym wynikiem |

### Faza B — Vertical slice (15:00–17:15): macierzyński + rodzicielski dla 1 sprawy

| Kto | Prompt | Bramka |
|---|---|---|
| BE-1 | `/implement-rule-group GEN-` potem `/implement-fact f_sickness_insured_on` i `f_continuous_sickness_insurance_days` | testy T-GEN-*, T-SICK-001..004 |
| BE-2 | `/implement-rule-group MAT-ELIG` → `MAT-DUR-001`, `RATE-MAT-001..003`, `CALC-MAT-001`, `BASE-GEN-001` (z `manual_base_override`) | T-MAT-001, T-RATE-001..003 |
| BE-2 | „Podłącz pipeline do `POST /api/evaluate`; usuń stub. Zachowaj kontrakt.” | test kontraktu vs `contract/fixtures` |
| FE-1 | `/screen app/kalkulator` — formularz danych + wynik (status, okres, stawka, kwota, uzasadnienie, podstawa prawna) na prawdziwym API | Juror-test na preview |
| Dev5 | „Zaimplementuj adapter `SimulatedZusProvider` (profile demo z `contract/fixtures/profiles/`) + `POST /api/auth/mobywatel/simulate` + `GET /api/me/insurance`.” | Logowanie symulowane działa |
| **CP1 17:15** | `/run-golden` na 1 sprawie → zgodne z decyzją ZUS | GO / SCOPE CUT wg planu |

### Faza C — Pełne P0 (17:15–01:00)

| Kolejność | Grupa reguł / funkcja | Właściciel | Testy z `08` |
|---|---|---|---|
| 1 | SICKPAY-*, SICK-* (ciąża, 270 dni, po ustaniu tytułu) | BE-1 | T-SP-*, T-SICK-* |
| 2 | BASE-EMP-001/002/004/008, BASE-NEMP-001/002/004 (F15 — P0) | BE-2 | T-BASE-* |
| 3 | MAT-DUR-002/003/007/009, MAT-SHARE-001/007, MAT-NEG-001, RISK-003 | BE-2 | T-MAT-* |
| 4 | SUPP-*, PAR-*, PAT-*, RATE-MAT-004/005 | BE-1 | T-SUPP-*, T-PAR-*, T-PAT-*, T-RATE-* |
| 5 | APP-DOC/DL, SICK-DOC, `f_documents_for_segment`, terminy | BE-2 | wyjście `missing_documents`, `deadlines` |
| 6 | Reguły BLOCKED → NEEDS_REVIEW + szablony wyjaśnień `explain/templates.pl.yaml` | BE-1 | T-MAT-009, T-RATE-006, T-BASE-007 |
| FE | Planer osi czasu obojga rodziców (drag segmentów, walidacja z `plan_errors`), porównanie 100/70 vs 81,5% | FE-1 | — |
| FE | Wybór/upload sprawy → wynik + „Zgodne z decyzją ZUS ✓/✗”; ekran X/N | FE-2 | `/run-golden` |
| FE | Symulacje: e-ZLA, zaświadczenie o zadłużeniu, PUE/eZUS, wnioski urlopowe (ROZP_WN § 2–18) i ZAM, odpis aktu urodzenia | FE-2 + Dev5 | `ui-verifier` |
| FE | Admin parametrów (`meta.parameters` + wersja + `valid_from`), przeliczenie bez redeployu | FE-2 + Dev5 | test: zmiana 0.815 → wynik się zmienia |
| BA | Treści: przewodnik, ryzyka, KP 177, organizacje wsparcia, tryb wrażliwy (martwe urodzenie, poronienie) | BA | przegląd BA |

**Wzorzec pracy dla każdego wiersza BE:**
1. `/implement-rule-group <PREFIX>` w plan mode → przegląd listy faktów przez człowieka.
2. Implementacja → hook uruchamia audyt + pytest.
3. Subagent `legal-checker`: „Porównaj `facts/<plik>.py` z 07 §X i regułami <PREFIX>; wypisz rozbieżności.”
4. `/pre-pr` → PR → merge.

**CP2 20:00:** pełny journey E2E na preview (`ui-verifier`). **CP3 01:00:** wszystkie P0, `/run-golden` ≥ 80% spraw zgodnych (reszta opisana w `docs/limitations.md`).

### Faza D — Stabilizacja (01:00–08:00)

| Krok | Prompt / narzędzie |
|---|---|
| Przegląd kodu | `/code-review` na każdej gałęzi przed freeze (poziom medium) |
| Uproszczenia | `/simplify` tylko na kodzie FE (nie na silniku po zatwierdzeniu prawnym) |
| Błędy | `superpowers:systematic-debugging` — najpierw reprodukcja testem, potem poprawka |
| Testy E2E | `ui-verifier`: scenariusz demo ×3 profile, 375 i 1440 px, screenshoty do `docs/screenshots/` |
| Dostępność | „Sprawdź WCAG 2.1 AA (kontrast, focus, label, aria) dla wszystkich ekranów; popraw tylko FE.” |
| **Feature freeze 05:00**, **Code freeze 08:00** | tag `v1.0`, deploy z tagu |

### Faza E — Materiały (BA + Dev5 z Claude Code, od 22:00 równolegle)

| Artefakt | Prompt |
|---|---|
| README | „Napisz README: opis, architektura (mermaid), uruchomienie (3 komendy), lista symulacji, ograniczenia z `zus_rules/09`, link do demo i wideo.” |
| Opis AI | „Utwórz `docs/AI_USAGE.md`: tabela funkcja → AI tak/nie → do czego → model. Zaznacz, że uprawnienia i kwoty liczy deterministyczny silnik.” |
| Rozwiązania zewnętrzne | „Wypisz biblioteki i usługi z lockfile'ów do `docs/THIRD_PARTY.md`” (wymóg regulaminu § 4 ust. 1) |
| Prezentacja ≤10 slajdów | Claude Code: szkic treści slajdów w Markdown → BA składa w narzędziu |
| Wideo ≤3 min | Scenariusz z planu §10.2; nagranie człowiek, Claude Code tylko skrypt i napisy |

---

## 2. Zasady pracy z Claude Code (dla wszystkich)

1. **Prompt zawsze z odwołaniem do specyfikacji** (`reguła X`, `07 §Y`, `test T-Z`), nigdy „zrób kalkulator zasiłku”.
2. **Najpierw test, potem kod** dla silnika (TDD z `08_TEST_CASES.json`). Oczekiwanych wartości nie generuje model, tylko pochodzą z `08` lub od BA.
3. **Maks. 2 próby generacji** tego samego fragmentu, potem człowiek poprawia ręcznie lub eskaluje.
4. **Plan mode dla zmian > 1 pliku.** Akceptacja planu = decyzja człowieka.
5. **Kontekst**: `/clear` między niezależnymi zadaniami; długie sesje → nowa sesja z krótkim briefem.
6. **Decyzje prawne tylko ludzkie**: zmiana `03_rules.yaml`, interpretacja (BLOCKED → ACTIVE), parametry — wyłącznie BA + BE-1 po odpowiedzi mentora (wpis do `docs/mentors.md`).
7. **Poufność**: sprawy ZUS przetwarza tylko BA/BE-2 lokalnie; do zewnętrznego API dopiero po zgodzie mentora (Q2).

## 3. Mapa: zadanie → artefakt → kto → Claude Code

| Wymóg zadania | Implementacja | Właściciel | Narzędzie CC |
|---|---|---|---|
| a) ciąża | SICK-*, SICKPAY-*, MAT-ELIG-007, REHAB (info) | BE-1 | `/implement-rule-group` |
| b–e, j) kalkulatory | MAT-*, PAR-*, PAT-*, SUPP-*, RATE-* + planer | BE-1/2, FE-1 | `/implement-rule-group`, `/screen` |
| f) podstawa ze sprawy | BASE-* + upload/wybór sprawy + `/run-golden` | BE-2, FE-2, BA | `case-extractor`, `/run-golden` |
| g) dokumenty, adresat | APP-DOC/DL, GEN-CLS | BE-2, FE-2 | `/implement-rule-group APP-` |
| h) ryzyka | RISK-*, GEN-EXCL-001 | BE-1, BA | — |
| i) organizacje wsparcia | treść statyczna | BA | — |
| symulacje (7 pozycji) | adaptery + ekrany z banerem | Dev5, FE-2 | `/screen`, `ui-verifier` |
| panel admina | `params/store.py` + UI | Dev5, FE-2 | — |
| RWD, demo www, repo | Next.js, Vercel/Render, CI | Dev5, FE | `ui-verifier` |
| wskazanie AI | `docs/AI_USAGE.md` | BA | prompt Faza E |

## 4. Pierwsze 30 minut w Claude Code (konkretnie)

1. Dev5: utworzyć repo, skopiować `zus_rules/`, wkleić `CLAUDE.md` z §0.2, uruchomić prompt z Fazy A (scaffold).
2. Dev5: `.claude/settings.json` + hook audytu (§0.3), 3 agenci (§0.4), 5 komend (§0.5) — commit `chore: claude code setup`.
3. Każdy: `git worktree add ../wt-<rola> -b <rola>/<moduł>`, otworzyć sesję Claude Code w worktree, sprawdzić `python zus_rules/tools/build_catalog.py` (0 błędów).
4. BE-1 i BE-2 startują Fazę A; FE czeka na `contract/openapi.json` (≤14:00), do tego czasu layout na MSW.
