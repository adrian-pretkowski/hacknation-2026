# Rozwiązania zewnętrzne (regulamin § 4 ust. 1)

Wszystkie biblioteki są open source. Prototyp nie korzysta z płatnych usług ani z zewnętrznych API (integracje z mObywatel, ZUS/PUE, e-ZLA i USC są **symulowane**). Wersje są zgodne z `backend/requirements*.txt` i `frontend/package.json`.

## Backend (Python 3.12)

| Biblioteka | Wersja | Licencja | Do czego |
|---|---|---|---|
| FastAPI | 0.165.0 | MIT | REST API |
| Starlette | 1.10.0 | BSD-3-Clause | warstwa HTTP FastAPI |
| Uvicorn | 0.54.0 | BSD-3-Clause | serwer ASGI |
| Pydantic | 2.14.4 | MIT | walidacja żądań |
| PyYAML | 6.0.4 | MIT | odczyt katalogu reguł `zus_rules/03_rules.yaml` |
| pytest, httpx, ruff, jsonschema, referencing | dev | MIT / BSD / Apache-2.0 | testy, lint, walidacja kontraktu |

## Frontend (Node 22)

| Biblioteka | Wersja | Licencja | Do czego |
|---|---|---|---|
| Next.js | 16.4.6 | MIT | aplikacja webowa (App Router) |
| React, React DOM | 19.3.0 | MIT | interfejs |
| Tailwind CSS | 4.3.3 | MIT | style, RWD |
| pdf-lib | 1.17.1 | MIT | wypełnianie pism PDF w przeglądarce (D34) |
| @pdf-lib/fontkit | 1.1.1 | MIT | osadzenie czcionki z polskimi znakami |
| DejaVu Sans (czcionka) | - | Bitstream Vera / public domain | polskie znaki w PDF (`frontend/public/forms/fonts/`) |
| openapi-typescript, TypeScript, ESLint | dev | MIT / Apache-2.0 | typy z kontraktu, lint |
| Playwright (`e2e/`) | dev | Apache-2.0 | scenariusze E2E po polsku |

## Materiały

| Materiał | Źródło | Użycie |
|---|---|---|
| Wzory formularzy ZAM, Z-3, Z-3a, ZAS-12, ZAS-53 (`frontend/public/forms/`, `docs/wnioski-pdf/`) | publiczne wzory ZUS (zus.pl) | szablony pism do wypełnienia. To puste wzory, nie dane spraw |
| Przepisy (ustawa zasiłkowa, Kodeks pracy, rozporządzenia) | materiały zadania, ISAP | katalog reguł `zus_rules/` z cytatami (`source_excerpt`) |
| Lista organizacji wsparcia | strony organizacji | lista przykładowa, niezweryfikowana przez ZUS (D22) |

## Infrastruktura

| Usługa | Użycie |
|---|---|
| GitHub (repozytorium, Actions) | kod, CI (`.github/workflows/`) |
| Heroku | publiczne demo (INT-12) |
| Docker | `docker compose up --build` |

Brak brandingu ZUS i mObywatel na ekranach symulacji (D8). Kolorystyka aplikacji jest własna i nie zawiera logotypów.
