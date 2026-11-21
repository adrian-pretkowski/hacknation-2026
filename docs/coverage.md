# Macierz pokrycia wymagań zadania

Aktualizuj przy każdym zmergowanym PR. Status: ⬜ nie rozpoczęte · 🟨 w toku · ✅ działa na prod · ⚠️ ograniczenie (opis w `limitations.md`).

| Wymaganie zadania | Reguły / moduł | Ekran | Test | Status |
|---|---|---|---|---|
| a) świadczenia w ciąży (chorobowy, rehabilitacyjne, w wys. macierzyńskiego, brak uprawnień) | SICK-*, SICKPAY-*, REHAB-*, MAT-ELIG-007 | Wynik | T-SP-*, T-SICK-*, T-MAT-006 | ⬜ |
| b) kalkulator macierzyński obojga rodziców (dzieci, wiek, „Za życiem”) | MAT-*, PAR-DUR-*, RATE-MAT-* | Planer | T-MAT-*, T-PAR-* | 🟨 macierzyński matki na silniku reguł (`engine/pipeline/maternity.py`: MAT-ELIG-001, MAT-DUR-001/003/004/009, RATE-MAT-001/003, CALC-MAT-001; `test_engine_parity.py`, `test_engine_facts.py` T-MAT-013); brak ojca/rodzicielskiego |
| c) praca + rodzicielski | PAR-WORK-* | Planer | T-PAR-006/007 | ⬜ |
| d) oboje rodzice | MAT-SHARE-*, PAR-SHARE-* | Planer | T-MAT-019..021, T-PAR-010/011 | ⬜ |
| e/j) adopcja, rodzina zastępcza | MAT-ELIG-002/003, MAT-EXCL-001, MAT-DUR-007, PAR-DUR-003 | Planer | T-MAT-015..018 | ⬜ |
| f) podstawa wymiaru z konkretnej sprawy | BASE-*, CALC-MAT-001, SICK-CALC-001 | Sprawy | T-BASE-*, /run-golden | ⬜ |
| g) dokumenty, terminy, adresat (płatnik vs ZUS) | GEN-CLS-*, APP-*, SICK-DOC-* | Dokumenty | T-GEN-001..005 | ⬜ |
| h) zagrożenia i ryzyka | RISK-*, GEN-EXCL-* | Ryzyka | T-MAT-004, T-GEN-006 | ⬜ |
| i) organizacje wsparcia | treść statyczna | Wsparcie | — | ⬜ |
| Logowanie mObywatel (symulacja) | adapter `integrations/simulated/` (serwisy per system — `docs/ARCHITECTURE.md` § Symulowane systemy trzecie) | Logowanie | ui-verifier | ⬜ |
| Pobranie danych z ZUS (symulacja) / dane ręczne | adapter | Dane | ui-verifier | ⬜ |
| Zadłużenie składkowe (symulacja zaświadczenia) | adapter + GEN-EXCL-001 | Dane | T-GEN-006..009 | ⬜ |
| Podgląd e-ZLA (symulacja) | adapter | Dane | ui-verifier | ⬜ |
| PUE/eZUS (symulacja) | adapter | Dane | ui-verifier | ⬜ |
| Wnioski o urlopy i świadczenia (symulacja, projekt wniosków urlopowych) | APP-*, ROZP_WN | Dokumenty | ui-verifier | ⬜ |
| Wniosek o odpis aktu urodzenia (symulacja) | — | Dokumenty | ui-verifier | ⬜ |
| Linki zus.pl / gov.pl / PIP | treść | Dokumenty | — | ⬜ |
| Panel admina parametrów | params/store.py | Admin | test zmiany 0.815 | ⬜ |
| Upload/wybór przykładowych wniosków, weryfikacja ubezpieczenia | cases + insurance_verification | Sprawy | /run-golden | ⬜ |
| RWD | frontend | wszystkie | ui-verifier 375/1440 | ⬜ |
| Wskazanie funkcji z AI | docs/AI_USAGE.md | — | — | ⬜ |
