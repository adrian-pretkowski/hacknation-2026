# ASSUMPTIONS - założenia i blokery

Pytania do mentorów i ich odpowiedzi: **`docs/mentors.md`** (M01–M17). Luki prawne: `zus_rules/09_LEGAL_GAPS_AND_CONFLICTS.md`.

## BLOCKER - bez odpowiedzi możemy zbudować zły produkt
| ID | Blocker | Właściciel | Pytanie | Obejście na teraz |
|---|---|---|---|---|
| B1 | Brak przykładowych spraw ZUS | BA | M01 | Scenariusze syntetyczne w `demo/` (oznaczone) |
| B2 | Czy sprawy i materiały mogą być w publicznym demo/repo/wideo | BA | M02 | `cases/`, `materials/` poza gitem |
| B3 | Zasady zaokrąglania kwot | BA → BE-2 | M04 | Decimal dokładny + wyświetlanie 2 miejsc z „…” |
| B4 | Art. 43 (przerwa < miesiąc kalendarzowy) - ta sama podstawa L4 → macierzyński | BA → BE-2 | M05 | **ROZSTRZYGNIĘTE 2026-11-21 (mentor fachowy):** pełny miesiąc kalendarzowy 1.–ostatni; zaimplementowane (`f_gap_shorter_than_calendar_month`) |

## ASSUMPTION - bezpiecznie zmienialne później
| ID | Założenie | Gdzie | Zmiana gdy |
|---|---|---|---|
| A1 | Płaca minimalna 2026 = 4806,00 zł - **potwierdzona (M07, 2026-11-21)**; minimalna podstawa zaokrąglana do groszy = 4147,10 zł (M07a) | `03_rules.yaml` MIN_WAGE_2026_MONTHLY, MIN_BASE_ROUNDING_STEP | - |
| A2 | Dzień porodu = **dzień 1** przy uzupełniającym urlopie - rozstrzygnięte (M15 a, 2026-11-21) | SUPP-ELIG-003 | - |
| A3 | Data referencyjna prawa 2026-11-21 | `LAW_REFERENCE_DATE` | - |
| A4 | Frontend w jasnym motywie, bez shadcn/ui w bootstrapie | `frontend/` | zadanie FE2-01 |
| A5 | Podstawa wymiaru w slice wpisywana ręcznie | `slice_v0` | BE2-03 |
| A6 | Progi ostrzeżeń o ryzykach (90 dni, +50%) - projektowe, nie prawne; **M17 (2026-11-21): pokazujemy jako ostrzeżenie** | RISK-001/002 | - |
| A7 | Deploy publiczny na Vercel + Render (lub VM z compose) | INT-02 | decyzja lidera |
