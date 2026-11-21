# DEMO — scenariusz i fallback

## Demo bootstrapu (działa teraz)
1. `scripts\dev.ps1` (albo `docker compose up --build`).
2. Otwórz http://localhost:3000 → formularz ma dane scenariusza syntetycznego (`demo/scenario_employee_mother.json`).
3. „Oblicz” → karta „Zasiłek macierzyński — urlop macierzyński”: **Przysługuje**, 15.03.2027–01.08.2027 (20 tyg., 140 dni), 81,5%, **163,00 zł/dzień**, **22 820,00 zł**, przepis RATE-MAT-003.
4. Odznacz 81,5% → 100%, 28 000,00 zł. Zmień tytuł na „Działalność” i wpisz dług 48,07 zł → „Nie przysługuje” (art. 2a). Wyczyść podstawę → „Potrzebne dane”.
5. Weryfikacja automatyczna: `python scripts/smoke.py` → `SMOKE: PASS`.

## Demo finałowe (docelowe, 5 min) — szczegóły: `docs/background/01_battle_plan.md` § 10.2
| Czas | Pokazujemy | Kryterium |
|---|---|---|
| 0:00–0:30 | Persona: przedsiębiorczyni w 6. miesiącu ciąży | Związek |
| 0:30–1:15 | Logowanie mObywatel (SYMULACJA) → dane ZUS, e-ZLA (kod B), zadłużenie | Kompletność |
| 1:15–2:15 | Karty świadczeń z przepisami; ostrzeżenia o ryzykach | Pomysł, Oryginalność |
| 2:15–3:15 | Planer obojga rodziców, ½ etatu, 81,5% vs 100/70, data powrotu | Pomysł (b, c, d) |
| 3:15–4:00 | Wybór sprawy ZUS → „Zgodne z decyzją ZUS ✓” + ekran X/N | Związek, Potencjał |
| 4:00–4:30 | Admin: zmiana parametru → przeliczenie; widok mobilny | Potencjał |
| 4:30–5:00 | Dokumenty, wsparcie, ścieżka wdrożenia | wszystkie |

## Fallback
| Problem | Działanie |
|---|---|
| Publiczny backend nie odpowiada | Zapasowy URL / lokalnie `docker compose up`; nagranie wideo jako dowód |
| Brak spraw ZUS (M01) | Scenariusze syntetyczne z `demo/` z etykietą „dane syntetyczne” |
| Funkcja niestabilna przed freeze | Ukryć flagą i opisać w ograniczeniach — nie pokazywać jako działającej |
| Frontend nie ma połączenia z API | `NEXT_PUBLIC_API_MODE=mock` → baner „TRYB DEMO” (tylko awaryjnie, jawnie) |
