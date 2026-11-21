# SUBMISSION - kontrola materiałów zgłoszenia (Hacktribe, deadline niedziela 11:00)

Wymagania: `docs/CHALLENGE.md` § 4. Status: ⬜ / 🟨 / ✅.

| Artefakt | Obowiązkowy? | Właściciel | Zawartość | Weryfikacja | Status |
|---|---|---|---|---|---|
| Tytuł i szczegółowy opis | **TAK** | BA | problem, rozwiązanie, macierz a–j, symulacje, ograniczenia | review Integratora | ⬜ |
| Prezentacja ≤10 slajdów | **TAK** | BA | problem, persona, rozwiązanie, demo, zgodność ze sprawami, architektura, AI, rozwiązania zewnętrzne, wdrożenie, zespół | liczba slajdów ≤10, PDF | ⬜ |
| Film ≤3 min w otwartym repozytorium (link) | **TAK** | Integrator + BA | scenariusz z `docs/DEMO.md`, cel 2:45 | otwarcie linku w trybie incognito, długość | ⬜ |
| Repozytorium kodu | zalecany (§ 4 „dodatkowo”) | Integrator | kod, README, bez `cases/`, `materials/`, sekretów | czysty klon + `scripts\verify.ps1` | 🟨 (lokalne repo, brak zdalnego) |
| Zrzuty ekranu desktop + mobile | zalecany | FE-2 | 8–10 ekranów | `docs/screenshots/` | ⬜ |
| Link do demo www (wybór przykładów, weryfikacja ubezpieczenia, kalkulator) | zalecany, **sprawdzany przez jury** | Integrator | publiczny URL, rozgrzany | incognito + telefon | ⬜ |
| RWD | zalecany | FE-2 | 375 / 768 / 1440 px | ui-verifier | 🟨 (slice sprawdzony 375 px) |
| Materiały graficzne | zalecany | FE-2 | logo projektu (własne), diagram | - | ⬜ |
| Wskazanie funkcji z AI | zalecany | BA | `docs/AI_USAGE.md` (AI tylko w procesie tworzenia; aplikacja bez AI) | review | 🟨 dokument gotowy (INT-17), do slajdu |
| Rozwiązania zewnętrzne w prezentacji | **TAK** (regulamin § 4 ust. 1) | Integrator | `docs/THIRD_PARTY.md` z lockfile'ów | review | 🟨 dokument gotowy (INT-17), do slajdu |
| Ograniczenia prototypu | rekomendacja | BA | `zus_rules/09`, `not_evaluated_rules`, symulacje; lista niżej | review | 🟨 |

## Ograniczenia prototypu (do opisu zgłoszenia i slajdu)

- **Podstawa wymiaru** przyjmowana jako kwota podana przez użytkownika (brutto × (1 − 13,71%) albo `manual_base_override`). Pełne metody z 12 miesięcy (BASE-EMP-001…007, BASE-NEMP-001…004) są w katalogu reguł, ale silnik raportuje je w `not_evaluated_rules`. Wynik przy zmiennym wynagrodzeniu jest przybliżony.
- **Zaokrąglenia** kwot nie są potwierdzone przez ZUS (GAP-001). Kwoty są dokładne, a w UI skracane z oznaczeniem „…”.
- **Plan obojga rodziców** (rodzicielski, ojcowski, terminy) liczony jest w przeglądarce na parametrach z panelu admina. Urlop macierzyński, status i braki danych sprawdza silnik reguł (`/api/evaluate`). Przy rozbieżności rozstrzyga silnik.
- **Integracje** z mObywatel, ZUS/PUE, e-ZLA, USC i zaświadczeniem o zadłużeniu są symulowane (baner SYMULACJA).
- **Upload PDF** rozpoznaje tylko przykładowe wnioski (bez AI, M16e). Dla innych plików aplikacja wskazuje brakujące dane.
- **Panel admina** jest otwarty bez logowania (demo, D36). Wartości spoza dopuszczalnego zakresu są odrzucane, a przycisk „Przywróć wartości z zestawu reguł” cofa zmiany.
