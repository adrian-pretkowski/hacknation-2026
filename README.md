# Przewodnik Przyszłego Rodzica — HackNation 2026 (zadanie ZUS)

Aplikacja webowa (RWD), która dla konkretnej sytuacji rodzica ustala, jakie świadczenia z ubezpieczenia chorobowego przysługują w ciąży i po narodzinach dziecka (chorobowy, macierzyński, uzupełniający, rodzicielski, ojcowski, adopcja, rodzina zastępcza), na jak długo i w jakiej kwocie — dla obojga rodziców — oraz co, gdzie i kiedy złożyć. Wynik jest informacyjny, nie jest decyzją ZUS. Integracje z systemami zewnętrznymi są **symulowane**.

**Stan:** bootstrap gotowy — działa kalkulator zasiłku macierzyńskiego matki (UI → REST API → silnik `slice_v0` → UI). Aktualny postęp i plan: **[PROGRESS.md](PROGRESS.md)**.

## Start (Windows / PowerShell)
Wymagane: Python 3.12, Node.js 22+ (npm). Opcjonalnie Docker.

```powershell
scripts\dev.ps1                 # instaluje zależności przy pierwszym uruchomieniu; backend :8000, frontend :3000
python scripts\smoke.py         # test głównego przepływu na działających serwerach
scripts\verify.ps1              # audyt reguł, ruff, pytest, lint, typecheck, build
```

Docker (dowolny system):
```bash
docker compose up --build
python scripts/smoke.py --wait 90
```

Konfiguracja: skopiuj `.env.example` → `.env` (wartości domyślne działają lokalnie). `NEXT_PUBLIC_API_MODE=mock` uruchamia frontend bez backendu (baner „TRYB DEMO”).

> Po przeniesieniu katalogu usuń `backend\.venv` i `frontend\node_modules` (zawierają ścieżki bezwzględne) i uruchom ponownie `scripts\dev.ps1`.

## Demo
Otwórz http://localhost:3000 → „Oblicz” (dane syntetyczne): 20 tyg. / 140 dni, 81,5%, 163,00 zł dziennie, 22 820,00 zł. Scenariusz i fallback: [docs/DEMO.md](docs/DEMO.md).

## Dla zespołu i nowych developerów
| Potrzebujesz | Plik |
|---|---|
| Stan prac, bramki, kto co robi, następne kroki | [PROGRESS.md](PROGRESS.md) |
| Zasady pracy (także dla Claude Code) | [CLAUDE.md](CLAUDE.md) |
| Zadania, właściciele, zakresy plików | [docs/TASKS.md](docs/TASKS.md) |
| Wymagania zadania (nadrzędne) | [docs/CHALLENGE.md](docs/CHALLENGE.md) |
| Produkt, zakres MVP, architektura, decyzje, założenia | [docs/PRD.md](docs/PRD.md) · [docs/MVP.md](docs/MVP.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DECISIONS.md](docs/DECISIONS.md) · [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) |
| Specyfikacja prawna (reguły, schematy, testy, luki) | [zus_rules/](zus_rules/) — start: `01_LEGAL_SOURCE_REGISTER.md` |
| Pytania i ustalenia z mentorami | [docs/mentors.md](docs/mentors.md) |
| Kontrakt API | [contracts/openapi.yaml](contracts/openapi.yaml) |
| Pokrycie wymagań, materiały zgłoszenia | [docs/coverage.md](docs/coverage.md) · [docs/SUBMISSION.md](docs/SUBMISSION.md) |
| Materiały źródłowe (PDF zadania, wyciągi prawa) | [docs/MATERIALS.md](docs/MATERIALS.md) — lokalnie w `materials/`, poza gitem |

## Stack
Next.js 16 + React 19 + TypeScript + Tailwind 4 · Python 3.12 + FastAPI + Pydantic · REST (OpenAPI 3.1) · deterministyczny silnik reguł (YAML) · Docker Compose · GitHub Actions.

## Ograniczenia prototypu
Integracje symulowane; silnik `slice_v0` ocenia na razie tylko zasiłek macierzyński matki i jawnie zwraca listę nieocenianych reguł; kwoty bez zaokrągleń (zasady ZUS do potwierdzenia); luki prawne: [zus_rules/09_LEGAL_GAPS_AND_CONFLICTS.md](zus_rules/09_LEGAL_GAPS_AND_CONFLICTS.md).
