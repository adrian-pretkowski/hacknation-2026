# MVP — zakres P0/P1/P2 i mapa kryteriów jury

Wymagania: `docs/CHALLENGE.md`. Szczegóły i uzasadnienia: `docs/background/01_battle_plan.md`. Reguły prawne: 70 reguł P0 w `zus_rules/03_rules.yaml`.

## P0 — must have
| ID | Funkcja | Wymaganie zadania | Zadania |
|---|---|---|---|
| F1–F3 | Silnik reguł: prawo, okres, stawka, kwota (chorobowy w ciąży, macierzyński, uzupełniający, rodzicielski, ojcowski, adopcja/rodzina zastępcza) | a–e, j | BE1-*, BE2-01..02 |
| F4 | Planer obojga rodziców + praca ≤½ etatu + 81,5% vs 100/70 + data powrotu do pracy | b, c, d | BE2-02, FE1-02 |
| F6 | Wybór/upload przykładowej sprawy → wynik + weryfikacja ubezpieczenia + zgodność z decyzją | § 4, § 6, f | BE2-06, FE2-03, BA-03 |
| F7 | Przewodnik: dokumenty, adresat, terminy, ryzyka, KP 177, linki zus.pl/gov.pl/PIP | g, h | BE2-04, FE2-04/05, BA-02 |
| F8 | Organizacje wsparcia + tryb wrażliwy (lista przykładowa — ZUS nie ma zweryfikowanej listy, M16d) | i | BA-02, FE2-05 |
| F9 | Symulacje: mObywatel, dane ZUS, zadłużenie, e-ZLA, PUE/eZUS | § 3.1–3.5 | INT-03, FE2-02 |
| F10 | Wnioski urlopowe (zaprojektowane wg ROZP_WN) i o świadczenia + odpis aktu urodzenia — symulacja | § 3.6–3.7 | FE2-04, INT-03 |
| F11 | Panel admina parametrów (wersja + data obowiązywania) | § 3.10 | BE2-05, FE1-03 |
| F12 | RWD, demo www, repo, README | § 4–5 | INT-*, FE2-01 |
| F15 | Podstawa wymiaru z dokumentów sprawy (art. 36, 38, 45, 47, 48, 48a, 50) | f, § 6 | BE2-03 |

## P1
F13 odczyt PDF przez AI — **odrzucony** (M16e, D20: dane spraw nie trafiają do zewnętrznego AI) · F14 objaśnienia AI · F16 dopracowany tryb wrażliwy · składniki kwartalne/roczne, art. 37, 40 · świadczenie rehabilitacyjne (więcej niż informacja).

## P2
Eksport planu PDF/.ics · audyt WCAG z raportem · przypadki szczególne art. 29 ust. 5–10.

## Poza zakresem
Prawdziwe integracje, konta z hasłami, zasiłek opiekuńczy, świadczenia rodzinne (800+), mikroserwisy, aplikacja natywna, asystent AI (odrzucony przez zespół).

## Mapa kryteriów jury
| Kryterium (waga) | Jak zdobywamy punkty | Dowód |
|---|---|---|
| Związek z wyzwaniem (25%) | Pokrycie a–j i wszystkich symulacji; poprawność na sprawach ZUS | `docs/coverage.md`, raport `/run-golden` |
| Pomysł (20%) | Oś czasu obojga rodziców, weryfikacja vs decyzja ZUS, ostrzeżenia o ryzykach | demo |
| Oryginalność (15%) | Wyjaśnialność (przepis przy każdym wyniku), tryb wrażliwy, prognoza przed porodem | demo |
| Kompletność i UX (25%) | Pełny przepływ E2E, RWD, prosty język, dostępność | zrzuty, wideo, ui-verifier |
| Potencjał wdrożeniowy (15%) | Stack preferowany przez ZUS, OpenAPI, parametry z wersjonowaniem, testy reguł, adaptery integracji | repo, CI, `docs/ARCHITECTURE.md` |

## Kolejność cięcia zakresu przy opóźnieniu
F13 → P2 → F16 → F10 (tylko podgląd) → F15 (fallback: podstawa wpisywana ręcznie). Nigdy nie tniemy: F1–F3, F6, F12.
