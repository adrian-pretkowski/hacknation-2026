---
description: Generuje ekran frontendu wg kontraktu API, RWD, z banerem symulacji gdy dotyczy
argument-hint: <ścieżka w app/, np. app/kalkulator> [opis]
---

Zbuduj ekran `$ARGUMENTS` w `frontend/`, zgodnie z `frontend/CLAUDE.md`.

1. Ustal, jakie dane ekran pobiera i wysyła — tylko przez wygenerowanego klienta z `contracts/openapi.yaml`. Jeśli potrzebnego pola nie ma w kontrakcie — zatrzymaj się i opisz brak (zmiany kontraktu robi INT).
2. Komponenty z `src/components/` (shadcn/ui tylko jeśli dodany w FE2-01), Tailwind, mobile-first (375 px), potem 768 i 1440 px. Bez poziomego scrolla.
3. Ekran symulacji → stały baner „SYMULACJA — w wersji produkcyjnej: integracja z …”. Bez logotypów i kolorystyki ZUS/mObywatel.
4. Stany: ładowanie, błąd sieci, `NEEDS_DATA` (pytanie o pole z `missing_data`), `NEEDS_REVIEW`, puste dane. Kwoty z API jako string, format PL.
5. Dostępność: etykiety pól, focus, kontrast, role/aria dla elementów interaktywnych.
6. Działa na tryb mock (`src/mocks/` z przykładów kontraktu) i na prawdziwym API (zmienna env).
7. Uruchom `npm run lint && npm run typecheck && npm run build`. Podsumuj: pliki, stany, co wymaga danych z backendu.
