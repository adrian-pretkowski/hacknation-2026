# 10 — MVP IMPLEMENTATION PLAN (Python)

Specyfikacja jest gotowa do implementacji. Ten plan **nie** zawiera kodu produkcyjnego.

## 1. Rekomendowany zakres MVP (Krok 7)

Najmniejszy zestaw dający wiarygodne demo end-to-end — **70 reguł P0** (lista: `11_CONSISTENCY_AUDIT.md` → statystyki / `02` → indeks):

| Obszar | Reguły P0 | Co pokazuje demo |
|---|---|---|
| Płatnik + zadłużenie | GEN-CLS-001/002, GEN-EXCL-001 | „Kto wypłaci” + JDG z długiem |
| Ciąża — L4 | SICKPAY-ELIG/RATE/EXCL/TRN, SICK-ELIG-001..004, SICK-EXCL-001, SICK-DUR-001..003, SICK-RATE-001/002, SICK-CALC-001, SICK-DOC-001 | 100% w ciąży, 270 dni, przejście z wynagrodzenia na zasiłek |
| Macierzyński | MAT-ELIG-001..003, -006, MAT-EXCL-001, MAT-NEG-001, MAT-CLS-001, MAT-DUR-001..003, -007, -009, MAT-SHARE-001, -007 | Prawo, wymiar, martwe urodzenie, adopcja/rodzina zastępcza, przejęcie przez ojca |
| Uzupełniający | SUPP-ELIG-001/002, SUPP-CALC-001, SUPP-COND-001 | Wcześniak |
| Rodzicielski + praca | PAR-DUR-001/002, PAR-ELIG-001, PAR-SHARE-001/002, PAR-COND-001, PAR-WORK-001..003 | Planer obojga rodziców, ½ etatu |
| Ojcowski | PAT-ELIG-001, PAT-DUR-001 | 2 tyg., do 12 m-cy |
| Stawki | RATE-MAT-001..005 | 100/70 vs 81,5%, 9 tyg. ojca 70% |
| Podstawa | BASE-EMP-001/002/004/008, BASE-NEMP-001/002/004, BASE-GEN-001, CALC-MAT-001 | Kwoty ze spraw ZUS |
| Dokumenty/terminy/ryzyka | APP-DL-001/002, APP-DOC-001/002/003/005, RISK-003 | „Co, gdzie, do kiedy” |

**Świadomie poza MVP:** świadczenie rehabilitacyjne (tylko informacja), przypadki szczególne art. 29 ust. 5–10, art. 48a ust. 2–4, art. 37 ust. 2 pkt 3, waloryzacja, reguły BLOCKED (zwracają NEEDS_REVIEW — to jest funkcja, nie brak).

## 2. Moduły

```
zus_engine/
  model/        input.py (Pydantic v2 z 04, Decimal, date), output.py (z 05)
  dsl/          loader.py (YAML → dataclasses, walidacja jak tools/build_catalog.py)
                evaluator.py (Kleene: TRUE/FALSE/UNKNOWN; operatory eq..not; leaf field|fact; value param|fact)
  facts/        registry.py (@fact("f_name") → funkcja; memoizacja per ewaluacja)
                insurance.py, sickness.py, maternity.py, parental.py, base.py, deadlines.py, documents.py
  calc/         money.py (Decimal, ROUNDING_POLICY), dates.py (C3–C8, add_months, age_on)
  pipeline/     orchestrator.py (kolejność §3), resolver.py (overrides/exceptions/precedence), aggregate.py (DT-9)
  explain/      templates.pl.yaml (rule_id → szablon zdania), renderer.py
  params/       store.py (parametry z meta.parameters + nadpisania admina z wersją i valid_from)
tests/
  test_rules_catalog.py   (uruchamia tools/build_catalog.py — CI gate)
  test_cases.py           (parametryzacja z 08_TEST_CASES.json: fixture + patch → expected)
  test_facts_*.py         (testy jednostkowe funkcji granicznych: daty, przerwy, wiek)
```

Rejestr faktów jest **jedynym** miejscem kodu domenowego poza DSL; każda funkcja ma docstring z odwołaniem do wiersza 07.

## 3. Kolejność wykonywania

1. `load(rules.yaml)` → walidacja (te same kontrole co audyt) → odrzucenie startu przy błędzie.
2. Filtr obowiązywania: `valid_from ≤ as_of < valid_to`; FUTURE → `applied_rules: FUTURE_SKIPPED` + `future_changes`.
3. Iteracja po **kandydatach świadczeń** wynikających z `event.type` i `plan.segments` (dla planu — per segment z kontekstem `segment.*`).
4. Dla każdego kandydata: GEN-CLS → GEN-EXCL → ELIGIBILITY/EXCLUSION (graf zależności, sortowanie topologiczne po `dependencies`) → DURATION → BASE → RATE → CALCULATION → VALIDATION → DOCUMENTS/DEADLINES/RISK.
5. Rozstrzyganie konfliktów: reguła z `overrides` wygrywa, jeśli jej warunek = TRUE; jeśli UNKNOWN — wynik zależny UNKNOWN (propagacja). BLOCKED z warunkiem TRUE/UNKNOWN → NEEDS_REVIEW.
6. Agregacja statusu wg DT-9; zebranie `missing_data` (pola z `required_inputs` reguł, których warunki dały UNKNOWN z powodu null).

## 4. Operatory DSL (komplet)

`eq, ne, gt, gte, lt, lte, in, exists, all, any, not` — zgodnie z `meta.dsl`; porównania Decimal/date/str/int; `in` dla listy = część wspólna niepusta; `value: {param}` / `value: {fact}`. Brak `eval`, brak wyrażeń w YAML.

## 5. Obsługa wyjątków i braków

| Sytuacja | Zachowanie |
|---|---|
| Pole null / fakt zwraca None | UNKNOWN → NEEDS_DATA (nigdy NOT_ELIGIBLE) |
| Reguła BLOCKED/HUMAN_REVIEW może zmienić wynik | NEEDS_REVIEW + `reason_code` |
| Parametr z `status: MISSING` | reguła zależna → NEEDS_REVIEW |
| Parametr UNCONFIRMED | wynik + `assumptions[]` |
| Wyjątek w funkcji faktu | błąd ewaluacji (500) — nie wolno zamienić na FALSE |
| Błąd planu (validation_error) | `plan_errors[]`, status bez zmian |

## 6. Wyjaśnienia

Szablony per `rule_id` (bez LLM), np. `SICK-RATE-002: "Zasiłek wynosi 100% podstawy, bo niezdolność do pracy przypada w okresie ciąży (art. 11 ust. 2 pkt 1 ustawy zasiłkowej)."` Renderer składa uzasadnienie w kolejności topologicznej zastosowanych reguł; każde zdanie z `legal_basis`. Opcjonalna parafraza LLM — tylko warstwa prezentacji, oznaczona „AI”, nigdy źródło liczb.

## 7. Testowanie

1. **CI gate:** `python tools/build_catalog.py` (0 błędów) → `pytest`.
2. `08_TEST_CASES.json` — niezależne oczekiwania z przepisów; porównanie częściowe; kwoty Decimal dokładnie (10 miejsc dla dzieleń nieskończonych).
3. Testy własności (hypothesis, opcjonalnie): suma tygodni planu ≤ pula; stawka ∈ {0,70; 0,815; 0,80; 0,90; 0,75; 1,00} × (1 − wf); brak NOT_ELIGIBLE przy samych null.
4. **Złoty zestaw spraw ZUS** (gdy dostępny): fixture per sprawa + oczekiwana decyzja/kwota z dokumentów → raport zgodności X/N dla jury.

## 8. Szacunek (dla zespołu hackathonowego)

| Pakiet | Osobogodziny | Właściciel |
|---|---|---|
| DSL loader + evaluator Kleene + testy | 4 | BE-1 |
| Fakty: insurance + sickness | 4 | BE-1 |
| Fakty: maternity/parental/supplementary | 5 | BE-2 |
| Podstawa wymiaru (BASE-EMP/NEMP P0) | 4 | BE-2 |
| Orkiestracja, agregacja, wyjaśnienia | 3 | Dev5 |
| Runner testów z 08 + raport | 2 | Dev5 |
| **Razem** | **≈22 osh** (≈6 h zegarowych przy 3–4 osobach) | |

## 9. Ryzyka implementacyjne

1. **Zaokrąglenia** (GAP-001) — bez potwierdzenia u mentora kwoty mogą różnić się o grosze od decyzji ZUS → raport zgodności z tolerancją ±0,01 zł/dzień, oznaczony.
2. **Art. 43** (CONF-006) — najczęstszy scenariusz demo; uzyskać odpowiedź Q-LEG-04 w pierwszych godzinach.
3. **Dane wejściowe ze spraw** — Z-3 zawiera składniki netto-składkowe; mapowanie formularz → `IncomeMonth` wymaga ręcznej weryfikacji przez analityka.
