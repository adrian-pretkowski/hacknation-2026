# Macierz pokrycia wymagań zadania

Aktualizuj przy każdym zmergowanym PR. Status: ⬜ nie rozpoczęte · 🟨 w toku · ✅ działa na prod · ⚠️ ograniczenie (opis w `limitations.md`).

| Wymaganie zadania | Reguły / moduł | Ekran | Test | Status |
|---|---|---|---|---|
| a) świadczenia w ciąży (chorobowy, rehabilitacyjne - w MVP tylko podstawa po 270 dniach (M16c), w wys. macierzyńskiego - także naruszenie prawa stwierdzone przez sąd (M16a), brak uprawnień) | SICK-*, SICKPAY-*, REHAB-*, MAT-ELIG-007 | Wynik | T-SP-*, T-SICK-*, T-MAT-006 | 🟨 zasiłek w wysokości macierzyńskiego (MAT-ELIG-007 → MATERNITY_EQUIVALENT_ALLOWANCE, T-MAT-006/007, BE2-01); chorobowy w ciąży - BE1-04/05 |
| b) kalkulator macierzyński obojga rodziców (dzieci, wiek, „Za życiem”) | MAT-*, PAR-DUR-*, RATE-MAT-* | Planer | T-MAT-*, T-PAR-* | 🟨 macierzyński matki na silniku reguł (`engine/pipeline/maternity.py`: MAT-ELIG-001, MAT-DUR-001/003/004/009, RATE-MAT-001/003/007 (podwyższenie do 1000 zł - M10), CALC-MAT-001; `test_engine_parity.py`, `test_engine_facts.py` T-MAT-013, `test_facts_mentors.py`); BE2-02: rodzicielski obojga rodziców (PAR-DUR-001/002, PAR-ELIG-001 zależny od macierzyńskiego, RATE-MAT-002/003/004/005/006/008), ojcowski (PAT-DUR-001, PAT-ELIG-001) w `engine/pipeline/parental.py`; T-PAR 11/11, T-PAT 3/3, T-RATE-003..006, T-INT-001/003/004 (`test_facts_parental.py`); BE2-01: art. 30 (MAT-ELIG-004..007, MAT-NEG-001, RISK-003), urlop uzupełniający SUPP-* (T-MAT 22/22, T-SUPP 10/10, `test_facts_maternity_be2.py`) |
| c) praca + rodzicielski | PAR-WORK-* | Planer | T-PAR-006/007 | 🟨 planer BE2-07 (`/api/planner/*`, `test_planner.py`): optymalizacja podziału i pracy ≤½ etatu; pełna ocena w `/api/evaluate` - BE2-02; BE2-02 silnik: PAR-WORK-001 (błąd planu u pracownika; niepracownik → NEEDS_REVIEW, GAP-018), PAR-WORK-002 (wydłużenie z capami), PAR-WORK-003 (zasiłek × (1 − wymiar)); `return_to_work` z wymiarem pracy; T-PAR-006/007 zielone; UI planera - FE |
| d) oboje rodzice | MAT-SHARE-*, PAR-SHARE-* | Planer | T-MAT-019..021, T-PAR-010/011 | 🟨 planer BE2-07 (`/api/planner/*`, `test_planner.py`): optymalizacja podziału i pracy ≤½ etatu; pełna ocena w `/api/evaluate` - BE2-02; BE2-02 silnik: przejęcie macierzyńskiego MAT-SHARE-001..005 (006 BLOCKED → NEEDS_REVIEW), MAT-SHARE-007, PAR-SHARE-001/002 (GAP-016 → NEEDS_REVIEW przy nieubezpieczonej matce), PAR-SHARE-003, PAR-COND-001; walidacje planu obojga rodziców w `plan_errors`; T-MAT-019..021, T-PAR-004/005/010/011 zielone; UI planera - FE |
| e/j) adopcja, rodzina zastępcza (j obejmuje też zawodową - wynik „brak prawa”, M16b; 9 tyg. bez minimum, M14) | MAT-ELIG-002/003, MAT-EXCL-001, MAT-DUR-007/008, PAR-DUR-003 | Planer | T-MAT-015..018, T-MAT-022 | 🟨 silnik: rodzicielski przy ADOPTION/FOSTER (PAR-DUR-003; prawo bazowe MAT-ELIG-002/003 i MAT-EXCL-001 - zawodowa rodzina zastępcza → NOT_ELIGIBLE, M16b2; wariant 38/62 tyg. → NEEDS_REVIEW, M14b; GAP-019 → NEEDS_REVIEW), ojcowski ojca przy przysposobieniu; brak: świadczenie za urlop na warunkach macierzyńskiego (MAT-DUR-007/008, T-MAT-015..018/022 - BE2-01); BE2-01: MATERNITY_LIKE_LEAVE - MAT-ELIG-002/003, MAT-EXCL-001, MAT-DUR-007/008 (T-MAT-015..018, T-MAT-022) |
| f) podstawa wymiaru z konkretnej sprawy | BASE-*, CALC-MAT-001, SICK-CALC-001 | Sprawy | T-BASE-*, /run-golden | ⬜ |
| g) dokumenty, terminy, adresat (płatnik vs ZUS) | GEN-CLS-*, APP-*, SICK-DOC-* | Dokumenty | T-GEN-001..005, `test_facts_documents.py` | 🟨 BE2-04: `missing_documents` (APP-DOC-001…006, SICK-DOC-001/002; adresat `submit_to` ZUS/płatnik, `obtainable_by_zus`) i `deadlines` (APP-DL-001 - 81,5%, APP-DL-002 - wnioski urlopowe KP) w `engine/pipeline/guidance.py`; braki: dokumenty z akt osobowych (ROZP_WN § 22), ROZP_DOK § 32; ekran FE - do zrobienia |
| h) zagrożenia i ryzyka | RISK-*, GEN-EXCL-* | Ryzyka | T-MAT-004, T-GEN-006 | 🟨 RISK-003 → `warnings` (T-MAT-004, BE2-01), RISK-001/002 → `warnings` (progi projektowe M17, `test_facts_documents.py`, BE2-04), GEN-EXCL-001/002 (BE1-04); opisy ryzyk dla użytkownika `frontend/src/content/risks.json` (BA-02) |
| i) organizacje wsparcia (lista przykładowa - ZUS nie ma zweryfikowanej, M16d) | treść statyczna | Wsparcie | `test_content.py` | 🟨 treści `frontend/src/content/support.json` i `sensitive.json` (BA-02); ekran `/wsparcie` i `/wsparcie/po-stracie` (FE2-05; FE1-30: dawne `/wsparcie/spokojny` przekierowuje) |
| Logowanie mObywatel (symulacja) | adapter | Logowanie | ui-verifier | 🟨 mock FE `features/simulations/` (FE2-02), typy z kontraktu; podpięcie `/api/sim/*` po INT-03: kod QR → potwierdzenie kodem, 4 użytkowników testowych Backend: mocki w `backend/app/integrations/simulated/` (INT-03, `docs/ARCHITECTURE.md` § Symulowane systemy trzecie). |
| Pobranie danych z ZUS (symulacja) / dane ręczne | adapter | Dane | ui-verifier | 🟨 mock FE `features/simulations/` (FE2-02), typy z kontraktu; podpięcie `/api/sim/*` po INT-03: „Pobierz dane z ZUS” w kreatorze + zakładka „Dane z ZUS” |
| Zadłużenie składkowe (symulacja zaświadczenia) | adapter + GEN-EXCL-001 | Dane | T-GEN-006..009 | 🟨 mock FE `features/simulations/` (FE2-02), typy z kontraktu; podpięcie `/api/sim/*` po INT-03: zaświadczenie z progiem z parametrów; skutek GEN-EXCL-001 ocenia silnik |
| Podgląd e-ZLA (symulacja) | adapter | Dane | ui-verifier | 🟨 mock FE `features/simulations/` (FE2-02), typy z kontraktu; podpięcie `/api/sim/*` po INT-03 |
| PUE/eZUS (symulacja) | adapter | Dane | ui-verifier | 🟨 mock FE `features/simulations/` (FE2-02), typy z kontraktu; podpięcie `/api/sim/*` po INT-03: pytanie → numer zgłoszenia |
| Wnioski o urlopy i świadczenia (symulacja, projekt wniosków urlopowych) | APP-*, ROZP_WN | Dokumenty | ui-verifier | ⬜ |
| Szybkie pisma: wybór ZAM, Z-3, Z-3a, ZAS-12, ZAS-53 ze startu i z wyniku (FE1-11, `docs/FORMS_FLOW.md`) | APP-DOC-002/003, SICK-DOC-001 | Start, Pisma, Wynik | e2e 14 | 🟨 wybór i opis pism; wypełnianie - etap 3 |
| Wniosek o odpis aktu urodzenia (symulacja) | - | Dokumenty | ui-verifier | ⬜ |
| Linki zus.pl / gov.pl / PIP | treść | Dokumenty | - | ⬜ |
| Panel admina parametrów | `core/params.py` (OverrideStore), `modules/admin/router.py` | Admin | `test_admin.py` (zmiana 0.815 → wynik bez restartu) | 🟨 API `GET/PUT /api/admin/parameters` (BE2-05): wersje, `valid_from`, 401/409/422, zapis JSON; ekran FE `/admin` (FE1-03): lista, edycja z `valid_from`, podgląd skutku na przykładzie |
| Upload/wybór przykładowych wniosków, weryfikacja ubezpieczenia | cases + insurance_verification | Sprawy | `test_cases_module.py`, /run-golden | 🟨 API BE2-06: `/api/cases` (4 sprawy syntetyczne `demo/cases/`, porównanie z oczekiwanym wynikiem MATCH / MATCH_WITH_TOLERANCE / MISMATCH), upload PDF → MANUAL_REQUIRED + lista brakujących pól (bez AI, M16e; plik nie jest zapisywany), `insurance_verification` w wyniku `/api/evaluate`; ekran FE - do zrobienia |
| RWD | frontend | wszystkie | ui-verifier 375/1440 | ⬜ |
| Wskazanie funkcji z AI | docs/AI_USAGE.md | - | - | ⬜ |

## Raport luk: kod vs słownik pojęć (2026-11-21)

Raport z porównania słownika pojęć zespołu z `03_rules.yaml`, silnikiem i podglądem kreatora (commit bd10e52). Stan po FE1-19…FE1-26, BE2-12, BA-06:

| Luka | Co | Zadanie | Status |
|---|---|---|---|
| A1 | Minimalna podstawa przy pełnym etacie (4147,10 zł) | FE1-20 (podgląd), BE2-12 (silnik, `f_apply_minimum_base`) | ✅ |
| A2 | Limit podstawy przy dobrowolnym chorobowym (20 321,295 zł) | FE1-20, BE2-12 (BASE-NEMP-005) | ✅ |
| A3 | Podwyższenie do kwoty świadczenia rodzicielskiego (1000 zł, M10c) w podglądzie | FE1-21 | ✅ |
| A4 | Urlop na warunkach macierzyńskiego do dnia przed 14. / 7. / 10. urodzinami | FE1-26 | ✅ (KP 183 § 3 - BE2-10, M14b) |
| A5 | Ojcowski przy adopcji od uprawomocnienia, najpóźniej przed 14. urodzinami | FE1-26 | ✅ |
| A6 | Uzupełniający: poród w 37. tyg. - kod (< 37 / ≥ 37) zgodny z 03; niejednoznaczny jest słownik | - | ⚠️ poprawka słownika (poza repo) |
| A7 | Umowa na zastępstwo i próbna ≤ 1 mies. bez przedłużenia do porodu | FE1-24 | ✅ |
| B | Terminy: przed porodem (14 dni, UNCONFIRMED), rezygnacja (7), przejęcie przez ojca (14), na warunkach macierzyńskiego (7); `PREVIEW_ONLY` → nazwy z 03 | FE1-25 | ✅ (21 dni na rozpoczęcie - M20 c) |
| C | Błędne ID reguł w podglądzie | FE1-19 (`scripts/check_preview_rule_ids.py`) | ✅ |
| D | Ulga na start, student do 26 lat | FE1-22, BA-06 (parametry UNCONFIRMED, M20) | ✅ |
| D | Zasiłek chorobowy w ciąży - backend liczy (`pipeline/sickness.py`), brak ekranu | - | ⬜ |
| E | Słownik bez `LEAVE_APP_MATERNITY_FOR_FATHER_DAYS_BEFORE` i `MOTHER_MIN_WEEKS_SPECIAL` | uzupełnione w słowniku (poza repo) | ⚠️ do sprawdzenia z wyciągiem KP |
