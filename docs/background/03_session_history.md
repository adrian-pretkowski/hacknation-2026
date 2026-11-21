# Historia pracy z Claude Code (2026-11-21) - streszczenie pierwszej sesji

Pierwsza sesja (folder roboczy `C:\Users\Michał\Documents\AI starter`) przygotowała cały projekt. Rozmowy nie da się przenieść między wątkami, więc to jest jej streszczenie: co ustalono, dlaczego i gdzie jest wynik. Aktualny stan zawsze w `PROGRESS.md`.

| # | Etap | Najważniejsze ustalenia | Wynik w repo |
|---|---|---|---|
| 1 | Analiza zadania i strategia MVP | Rdzeń = deterministyczny silnik reguł + zintegrowany kalkulator + weryfikacja na sprawach ZUS (jury sprawdza poprawność wyliczeń). Wagi kryteriów 25/20/15/25/15. W pobranej paczce **brak przykładowych spraw** (bloker). Konflikt: zakaz rozpowszechniania dokumentów ZUS vs demo z wyborem przykładów | `docs/background/01_battle_plan.md`, `docs/MVP.md` |
| 2 | Asystent AI (czat) | Najpierw dodany do planu, potem **odrzucony przez lidera**. AI nie liczy kwot ani uprawnień | `docs/DECISIONS.md` D10 |
| 3 | Formalizacja prawa | 119 reguł YAML (70 P0, 8 BLOCKED), DSL z logiką trójwartościową, 99 funkcji, 92 testy z przepisów, 24 luki + 8 konfliktów, audyt spójności. Ważne: zasiłek „w wysokości macierzyńskiego” przy naruszeniu prawa - zadanie szersze niż ustawa (stosujemy ustawę); brak zasad zaokrąglania; art. 43 niejednoznaczny | `zus_rules/` |
| 4 | Ponowne porównanie z treścią zadania | Podstawa wymiaru (F15) podniesiona do P0; wnioski urlopowe trzeba zaprojektować (ROZP_WN); dodane: powrót do pracy, KP 177, weryfikacja ubezpieczenia w wyniku, poronienie (GAP-024) | `docs/MVP.md`, `zus_rules/05`, `09` |
| 5 | Plan implementacji w Claude Code | Fazy A–E, subagenci (`legal-checker`, `case-extractor`, `ui-verifier`), komendy (`/implement-fact`, `/implement-rule-group`, `/run-golden`, `/screen`, `/pre-pr`), hook bramki jakości | `docs/background/02_claude_code_plan.md`, `.claude/` |
| 6 | Pytania do mentorów | 17 pytań M01–M17; na pierwszą wizytę M01–M05 i M11 | `docs/mentors.md` |
| 7 | Bootstrap repo (skill hackathon-bootstrap) | Wymagania zadania mają pierwszeństwo przed domyślnymi skilla (Next.js zamiast Vite, bez bazy, bez adaptera LLM). Preflight: brak `uv`/`pnpm` → pip/venv i npm. Vertical slice UI → API → wynik zweryfikowany w przeglądarce i w Docker | kod, `docs/DECISIONS.md`, `PROGRESS.md` |
| 8 | Kontekst dla zespołu | `docs/CHALLENGE.md` (pełne wymagania), `materials/` lokalnie poza gitem (M02), `PROGRESS.md` jako checkpoint z obowiązkiem aktualizacji w `CLAUDE.md`, `docs/TASKS.md` (30 zadań, rozłączne pliki, 6 interfejsów) | `docs/`, `PROGRESS.md`, `CLAUDE.md` |
| 9 | Przeniesienie | Projekt przeniesiony do `D:\hacknation-2026`; commity robi wyłącznie lider (Claude nie commituje) | - |
| 10 | INT-01 | Kontrakt API v1.0.0 addytywny: modele 04/05, 12 operacji planned (sprawy, admin, symulacje), 75 testów kontraktu; czeka na akceptację BE+FE | `contracts/openapi.yaml`, `PROGRESS.md` |

## Preferencje lidera (obowiązują w każdym wątku)
- Odpowiedzi i dokumenty po polsku.
- **Nie commitować** (także lokalnie) - lider commituje sam; po pracy podać listę zmienionych plików i proponowany komunikat commita.
- Wymagania zadania na 100% ważniejsze niż preferencje zespołu i domyślne rozwiązania narzędzi.
- Po każdym zadaniu aktualizować `PROGRESS.md` i `docs/TASKS.md` (zasady w `CLAUDE.md`).
- Publikacja, deploy, zdalne repo, `git push` - tylko na wyraźne polecenie.
