# 11 - CONSISTENCY AUDIT (generowany)

Wygenerowano przez `tools/build_catalog.py` z `03_rules.yaml` v0.1.0. **Błędy: 0 · Ostrzeżenia: 0**

## Statystyki

- Reguły: 120; testy: 102; fakty użyte: 101 (zdefiniowane w 07: 106); pola użyte: 82; parametry: 96
- Priorytet: P0=70, P1=38, P2=12
- Evaluation: ACTIVE=95, BLOCKED=4, FUTURE=1, HUMAN_REVIEW=3, INFORMATIONAL=17
- Interpretacja: AMBIGUOUS=3, DERIVED=24, DIRECT=90, INCOMPLETE_SOURCE=3
- Parametry nieużywane w warunkach (używane w funkcjach 07): ABANDONMENT_MIN_WEEKS, APP_COMBINED_DEADLINE_DAYS, AVERAGE_WAGE_CAP_AFTER_TITLE, BENEFIT_PERIOD_BREAK_DAYS, BENEFIT_PERIOD_PREGNANCY_TB_DAYS, BENEFIT_PERIOD_STD_DAYS, CHILD_DEATH_MIN_DAYS, CLAIM_LIMIT_MONTHS, CLAIM_LIMIT_YEARS_PAYER_ERROR, CONTRIBUTION_DEDUCTION_RATE, DEBT_THRESHOLD_MIN_WAGE_RATIO, INSURANCE_GAP_MAX_DAYS, JDG_MIN_CONTRIB_BASE_2026, JDG_PREFERENTIAL_CONTRIB_BASE_2026, JDG_PREFERENTIAL_MONTHS, LEAVE_APP_MATERNITY_FOR_FATHER_DAYS_BEFORE, LEAVE_APP_MATERNITY_LIKE_DAYS_AFTER_ACCEPTANCE, LEAVE_APP_MATERNITY_PRE_BIRTH_DAYS_BEFORE, LEAVE_APP_PARENTAL_DAYS_BEFORE, LEAVE_APP_PATERNITY_DAYS_BEFORE, LEAVE_APP_RESIGNATION_DAYS_BEFORE_RETURN, LEAVE_APP_SUPPLEMENTARY_DAYS_BEFORE_MATERNITY_END, MATERNITY_WEEKS_BY_CHILDREN, MIN_BASE_ROUNDING_STEP, MIN_WAGE_2026_MONTHLY, MONTH_AS_DAYS, PARENTAL_CHILD_AGE_YEAR_LIMIT, PARENTAL_EXT_CAP, PARENTAL_NONTRANSFERABLE_WEEKS, PARENTAL_WEEKS_ADOPT_GUARANTEED, PARENTAL_WEEKS_ADOPT_GUARANTEED_ZA_ZYCIEM, PARENTAL_WEEKS_MULTIPLE, PARENTAL_WEEKS_SINGLE, PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE, PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE, PATERNITY_ADOPTION_WINDOW_MONTHS, PATERNITY_CHILD_AGE_MONTHS, PATERNITY_MAX_PARTS, PATERNITY_MIN_PART_WEEKS, PATERNITY_WEEKS, PAYMENT_DEADLINE_AFTER_DEBT_DAYS, PAYMENT_DEADLINE_DAYS, PUBLIC_HOLIDAYS, REHAB_RATE_FIRST_3M, REHAB_RATE_PREGNANCY, REHAB_RATE_REST, RISK_BASE_MONTHS_BEFORE_PREGNANCY, RISK_INCREASE_FACTOR, RISK_WINDOW_DAYS, ROUNDING_POLICY, SICK_PAY_AGE_THRESHOLD, SICK_PAY_DAYS_50PLUS, SICK_PAY_DAYS_STD, START_RELIEF_MONTHS, STILLBIRTH_LEAVE_WEEKS, STUDENT_AGE_LIMIT_YEARS, SUPP_TERM_MIN_CONSECUTIVE_DAYS, SUPP_TERM_WINDOW_LAST_DAY, SUPP_WEIGHT_THRESHOLD_G, VOLUNTARY_MAX_CONTRIB_BASE_2026

## Wyniki kontroli

Brak błędów i ostrzeżeń.

## Checklista QA (§13)

| Kontrola | Wynik |
|---|---|
| 1. Każda reguła ma podstawę źródłową | ✅ |
| 2. Wejście i rezultat zdefiniowane | ✅ |
| 3. Wyjątki zidentyfikowane | częściowo - patrz 09 (GAP-*) - wyciągi niekompletne |
| 4. Zależności wskazują istniejące reguły | ✅ |
| 5. Okres obowiązywania uwzględniony | ✅ |
| 6. Brak danych nie prowadzi do fałszywej odmowy | TAK - logika Kleene (C9), missing_data_behavior, testy MISSING_DATA |
| 7. Ocena człowieka nie zamieniona na bool | ✅ |
| 8. Dokumenty oddzielone od uprawnień | ✅ |
| 9. Obliczenia mają jednostki/granice/zaokrąglenia | jednostki i granice TAK; zaokrąglenia - BRAK w źródłach (GAP-001), jawnie oznaczone |
| 10. Wszystkie reguły P0 mają testy | ✅ |
| 11. Schemat zawiera pola używane przez reguły | ✅ |
| 12. YAML interpretowalny bez LLM | TAK - zamknięty zestaw operatorów, fakty jako nazwane funkcje (07) |

## Macierz pokrycia: przepis → reguła biznesowa → reguła wykonywalna → test

| Przepis | Reguła | Wykonanie | Testy |
|---|---|---|---|
| KP KP art. 180 § 1; USTAWA art. 29a ust. 1 | MAT-DUR-001 | ACTIVE | T-MAT-001, T-MAT-002, T-MAT-003, T-INT-003 |
| KP KP art. 180 § 2-3; art. 183(1) § 2 | MAT-DUR-002 | ACTIVE | T-MAT-011, T-MAT-012 |
| KP KP art. 180 § 8-9, 180(2) § 4, 182(1d) § 1, 182(1e) § 2, 182(3) § 2, 183 § 6 | APP-DL-002 | INFORMATIONAL | - |
| KP KP art. 180(1) § 1 | MAT-DUR-003 | ACTIVE | T-MAT-013, T-MAT-014, T-INT-004 |
| KP KP art. 180(1) § 1 zd. 2, § 2 zd. 2 | MAT-DUR-005 | BLOCKED | - |
| KP KP art. 180(1) § 2 | MAT-DUR-004 | ACTIVE | - |
| KP KP art. 180(2) § 1 pkt 1 | SUPP-ELIG-001 | ACTIVE | T-SUPP-001, T-SUPP-002 |
| KP KP art. 180(2) § 1 pkt 2 | SUPP-ELIG-002 | ACTIVE | T-SUPP-003, T-INT-003 |
| KP KP art. 180(2) § 1 pkt 3 | SUPP-ELIG-003 | ACTIVE | T-SUPP-004, T-SUPP-005, T-SUPP-008, T-SUPP-009, T-SUPP-010, T-SUPP-011 |
| KP KP art. 180(2) § 1, § 4-5; art. 183 § 3(1); ROZP_DOK § 26-27 | SUPP-COND-001 | ACTIVE | T-RATE-007, T-INT-003 |
| KP KP art. 180(2) § 2-3 | SUPP-CALC-001 | ACTIVE | T-SUPP-001, T-SUPP-006 |
| KP KP art. 182(1a) § 1, § 3 | PAR-DUR-001 | ACTIVE | T-PAR-001, T-PAR-003, T-INT-003, T-INT-004 |
| KP KP art. 182(1a) § 2; USTAWA art. 61b ust. 4a | PAR-DUR-002 | ACTIVE | T-PAR-002, T-PAR-003 |
| KP KP art. 182(1a) § 4-5; USTAWA art. 30a ust. 1, 31 ust. 3f | PAR-SHARE-001 | ACTIVE | T-PAR-004, T-PAR-005, T-INT-001, T-PAR-011 |
| KP KP art. 182(1c); art. 182(1d) § 2; art. 183 § 4(6) | PAR-COND-001 | ACTIVE | T-PAR-008, T-PAR-009 |
| KP KP art. 182(1e) § 1-2 | PAR-WORK-001 | ACTIVE | T-PAR-007 |
| KP KP art. 182(1f) § 1, § 1(1), § 2-7 | PAR-WORK-002 | ACTIVE | T-PAR-006 |
| KP KP art. 182(3) § 1, § 1(1) | PAT-DUR-001 | ACTIVE | T-PAT-001, T-PAT-002, T-PAT-003 |
| KP KP art. 182; ROZP_DOK § 19 | MAT-DUR-006 | ACTIVE | - |
| KP KP art. 183 § 1, § 1(1) | MAT-DUR-007 | ACTIVE | T-MAT-015, T-MAT-022 |
| KP KP art. 183 § 3 | MAT-DUR-008 | INFORMATIONAL | T-MAT-022 |
| KP KP art. 183 § 4, § 4(1), § 4(2), § 4(3), § 4(4), § 4(5) | PAR-DUR-003 | ACTIVE | - |
| KP KP art. 183(1) § 1-2 | MAT-DUR-009 | ACTIVE | T-MAT-001 |
| KP KP art. 92 § 4; USTAWA art. 12 ust. 1 | SICKPAY-TRN-001 | ACTIVE | T-SP-005, T-INT-001 |
| KP art. 177 § 3, § 3(1) | MAT-CLS-002 | ACTIVE | T-MAT-009 |
| KP art. 92 § 1 pkt 1 | SICKPAY-RATE-001 | ACTIVE | T-SP-002 |
| KP art. 92 § 1 pkt 1, § 5 | SICKPAY-ELIG-001 | ACTIVE | T-SP-001, T-SP-003, T-SP-004, T-INT-001 |
| KP art. 92 § 1 pkt 2-3 | SICKPAY-RATE-002 | ACTIVE | T-SP-001 |
| KP art. 92 § 3 pkt 2 | SICKPAY-EXCL-001 | ACTIVE | T-SP-006 |
| ROZP_DOK ROZP_DOK § 12, § 3 ust. 2, zał. 6; USTAWA art. 61b ust. 4a | APP-DOC-003 | INFORMATIONAL | - |
| ROZP_DOK ROZP_DOK § 13 ust. 1 pkt 1; USTAWA art. 53 ust. 2; ROZP_WN § 2 | APP-DOC-001 | INFORMATIONAL | - |
| ROZP_DOK ROZP_DOK § 13 ust. 1 pkt 2, ust. 2-4 | APP-DOC-002 | INFORMATIONAL | - |
| ROZP_DOK ROZP_DOK § 15 ust. 1-3, § 17 | APP-DOC-004 | INFORMATIONAL | - |
| ROZP_DOK ROZP_DOK § 16 ust. 1-2; ROZP_WN § 18 | APP-DOC-005 | INFORMATIONAL | - |
| ROZP_DOK ROZP_DOK § 20, § 26-27, § 29-30, § 32-33; ROZP_WN § 5, § 14, § 15, § 17 | APP-DOC-006 | INFORMATIONAL | - |
| ROZP_DOK § 11 ust. 1-3 | REHAB-DOC-001 | INFORMATIONAL | - |
| ROZP_DOK § 2, § 3 ust. 1, zał. 1-3; USTAWA art. 53, 61b ust. 2 | SICK-DOC-001 | INFORMATIONAL | - |
| ROZP_DOK § 4, zał. 4 | SICK-DOC-002 | INFORMATIONAL | - |
| USTAWA USTAWA art. 29 ust. 1, art. 30; treść zadania pkt H.3 | RISK-003 | INFORMATIONAL | T-MAT-004 |
| USTAWA USTAWA art. 29 ust. 10; KP art. 180 § 17 | MAT-SHARE-006 | BLOCKED | - |
| USTAWA USTAWA art. 29 ust. 3; KP art. 180 § 4-5 | MAT-SHARE-001 | ACTIVE | T-MAT-019, T-MAT-020 |
| USTAWA USTAWA art. 29 ust. 5; KP art. 180 § 6-7 | MAT-SHARE-002 | ACTIVE | - |
| USTAWA USTAWA art. 29 ust. 6; KP art. 180 § 10-11; ROZP_DOK § 23-24 | MAT-SHARE-003 | ACTIVE | - |
| USTAWA USTAWA art. 29 ust. 7; KP art. 180 § 12-13 | MAT-SHARE-004 | ACTIVE | - |
| USTAWA USTAWA art. 29 ust. 9; KP art. 180 § 15 | MAT-SHARE-005 | ACTIVE | - |
| USTAWA USTAWA art. 29a ust. 1, 3; KP art. 184 | PAR-ELIG-001 | ACTIVE | T-RATE-003, T-INT-004 |
| USTAWA USTAWA art. 29a ust. 1, art. 31 ust. 1; KP art. 182(3), art. 184; ROZP_DOK § 33 | PAT-ELIG-001 | ACTIVE | T-PAT-001 |
| USTAWA USTAWA art. 29a ust. 2; KP art. 180 § 14 | MAT-SHARE-007 | ACTIVE | T-MAT-019, T-MAT-021 |
| USTAWA USTAWA art. 29a ust. 3-4; KP art. 182(1a) § 6-7 | PAR-SHARE-002 | ACTIVE | T-PAR-010, T-PAR-011 |
| USTAWA USTAWA art. 30 ust. 4; KP art. 177 § 3, § 3(1) | MAT-ELIG-006 | ACTIVE | T-MAT-008 |
| USTAWA USTAWA art. 30a ust. 1-2 | APP-DL-001 | ACTIVE | T-RATE-001, T-RATE-009 |
| USTAWA USTAWA art. 30a ust. 3; art. 31 ust. 3 | RATE-MAT-008 | ACTIVE | T-RATE-006 |
| USTAWA USTAWA art. 31 ust. 1 | RATE-MAT-001 | ACTIVE | T-MAT-001, T-PAT-001, T-RATE-002, T-RATE-007 |
| USTAWA USTAWA art. 31 ust. 1-3, 4a, 5 (→ art. 11 ust. 4); art. 47 (→ art. 36 ust. 3) | CALC-MAT-001 | ACTIVE | T-MAT-001, T-RATE-001, T-RATE-008 |
| USTAWA USTAWA art. 31 ust. 2 | RATE-MAT-002 | ACTIVE | T-RATE-003 |
| USTAWA USTAWA art. 31 ust. 3; art. 30a ust. 1-2 | RATE-MAT-003 | ACTIVE | T-RATE-001, T-RATE-002, T-RATE-009, T-INT-001 |
| USTAWA USTAWA art. 31 ust. 3a-3c; art. 62 ust. 4-6; ROZP_DOK § 28 | RATE-MAT-007 | ACTIVE | T-RATE-008 |
| USTAWA USTAWA art. 31 ust. 3f; art. 30a ust. 1 (wyłączenie okresu z KP 182(1a) § 4) | RATE-MAT-004 | ACTIVE | T-RATE-004, T-INT-001 |
| USTAWA USTAWA art. 31 ust. 3g | RATE-MAT-005 | ACTIVE | T-RATE-005 |
| USTAWA USTAWA art. 31 ust. 3h; treść zadania pkt B | PAR-SHARE-003 | ACTIVE | - |
| USTAWA USTAWA art. 31 ust. 4 | RATE-MAT-006 | ACTIVE | - |
| USTAWA USTAWA art. 31 ust. 4a | PAR-WORK-003 | ACTIVE | T-PAR-006 |
| USTAWA USTAWA art. 36 ust. 1, 4; art. 38 ust. 1; art. 47 | BASE-EMP-001 | ACTIVE | T-BASE-001 |
| USTAWA USTAWA art. 36 ust. 2 | BASE-EMP-002 | ACTIVE | T-BASE-008 |
| USTAWA USTAWA art. 37 ust. 1-2 | BASE-EMP-003 | ACTIVE | - |
| USTAWA USTAWA art. 38 ust. 2-3 | BASE-EMP-004 | ACTIVE | T-BASE-002 |
| USTAWA USTAWA art. 40 | BASE-EMP-005 | BLOCKED | - |
| USTAWA USTAWA art. 41 ust. 1-3 | BASE-EMP-007 | ACTIVE | - |
| USTAWA USTAWA art. 42 ust. 1-5 | BASE-EMP-006 | ACTIVE | - |
| USTAWA USTAWA art. 43; art. 48 ust. 2; art. 52 | BASE-GEN-001 | ACTIVE | T-BASE-006, T-BASE-007, T-BASE-010, T-BASE-011, T-BASE-012, T-INT-001 |
| USTAWA USTAWA art. 45 ust. 1-2; art. 47 | BASE-EMP-008 | ACTIVE | T-BASE-003 |
| USTAWA USTAWA art. 46 | BASE-GEN-002 | BLOCKED | - |
| USTAWA USTAWA art. 48 ust. 1-2; art. 3 pkt 4; art. 52 | BASE-NEMP-001 | ACTIVE | T-BASE-004, T-INT-005, T-BASE-009 |
| USTAWA USTAWA art. 48a ust. 1-5 | BASE-NEMP-002 | ACTIVE | T-BASE-005 |
| USTAWA USTAWA art. 49 ust. 1-3 | BASE-NEMP-003 | ACTIVE | - |
| USTAWA USTAWA art. 50 ust. 1-2 | BASE-NEMP-004 | ACTIVE | T-BASE-009 |
| USTAWA art. 11 ust. 1 | SICK-RATE-001 | ACTIVE | T-SICK-006, T-SICK-014 |
| USTAWA art. 11 ust. 2 pkt 1-3 | SICK-RATE-002 | ACTIVE | T-SP-005, T-SICK-006, T-INT-001 |
| USTAWA art. 12 ust. 1 | SICK-EXCL-001 | ACTIVE | T-SP-005 |
| USTAWA art. 12 ust. 2, 2a, 3 | SICK-EXCL-002 | ACTIVE | - |
| USTAWA art. 13 ust. 1, 1a | SICK-EXCL-003 | ACTIVE | - |
| USTAWA art. 13 ust. 2 | SICK-EXCL-004 | ACTIVE | - |
| USTAWA art. 15 | SICK-EXCL-005 | HUMAN_REVIEW | - |
| USTAWA art. 16; art. 57 ust. 1 pkt 3 | SICK-EXCL-006 | ACTIVE | - |
| USTAWA art. 17 ust. 1, 1a, 1b, 2, 4 | SICK-EXCL-007 | HUMAN_REVIEW | - |
| USTAWA art. 18 ust. 1, 3, 6 | REHAB-ELIG-001 | HUMAN_REVIEW | - |
| USTAWA art. 18 ust. 2 | REHAB-DUR-001 | ACTIVE | - |
| USTAWA art. 18 ust. 7-8 | REHAB-EXCL-001 | ACTIVE | - |
| USTAWA art. 19 ust. 1 | REHAB-RATE-001 | ACTIVE | - |
| USTAWA art. 29 ust. 1 a contrario; art. 30 | MAT-NEG-001 | ACTIVE | T-MAT-004 |
| USTAWA art. 29 ust. 1 pkt 1 | MAT-ELIG-001 | ACTIVE | T-MAT-001, T-MAT-010, T-INT-001, T-INT-002, T-INT-004, T-INT-005 |
| USTAWA art. 29 ust. 1 pkt 2, ust. 2 | MAT-ELIG-002 | ACTIVE | T-MAT-015, T-MAT-016, T-MAT-022 |
| USTAWA art. 29 ust. 1 pkt 3, ust. 2 | MAT-ELIG-003 | ACTIVE | T-MAT-018 |
| USTAWA art. 29 ust. 1 pkt 3; KP art. 183 § 1 | MAT-EXCL-001 | ACTIVE | T-MAT-017 |
| USTAWA art. 2a ust. 1 | GEN-EXCL-001 | ACTIVE | T-GEN-006, T-GEN-007, T-GEN-008, T-GEN-009, T-INT-002, T-INT-005 |
| USTAWA art. 2a ust. 2 | GEN-EXCL-002 | ACTIVE | - |
| USTAWA art. 30 ust. 1 pkt 1 | MAT-ELIG-004 | ACTIVE | T-MAT-005 |
| USTAWA art. 30 ust. 1 pkt 2 | MAT-ELIG-005 | ACTIVE | - |
| USTAWA art. 30 ust. 3; KP art. 177 § 4; treść zadania (CONF-001, M16 a) | MAT-ELIG-007 | ACTIVE | T-MAT-006, T-MAT-007 |
| USTAWA art. 36 ust. 3; art. 11 ust. 4 | SICK-CALC-001 | ACTIVE | T-SICK-014 |
| USTAWA art. 4 ust. 1 (zasiłek chorobowy); art. 29-31 | MAT-CLS-001 | ACTIVE | T-MAT-001 |
| USTAWA art. 4 ust. 1 pkt 1 | SICK-ELIG-002 | ACTIVE | T-SP-006, T-SICK-004 |
| USTAWA art. 4 ust. 1 pkt 2 | SICK-ELIG-003 | ACTIVE | T-SICK-001, T-SICK-002 |
| USTAWA art. 4 ust. 2 | SICK-ELIG-004 | ACTIVE | T-SICK-001, T-SICK-003, T-SICK-004 |
| USTAWA art. 4 ust. 3 | SICK-ELIG-005 | ACTIVE | T-SICK-005 |
| USTAWA art. 6 ust. 1 | SICK-ELIG-001 | ACTIVE | T-SP-001, T-SICK-012 |
| USTAWA art. 61 ust. 1 pkt 1, ust. 2 | GEN-CLS-001 | ACTIVE | T-GEN-001, T-GEN-003, T-GEN-005 |
| USTAWA art. 61 ust. 1 pkt 2 lit. a-e | GEN-CLS-002 | ACTIVE | T-GEN-002, T-GEN-004, T-GEN-005, T-INT-002 |
| USTAWA art. 61b ust. 5 | SICK-DL-001 | INFORMATIONAL | - |
| USTAWA art. 64 ust. 1, 3 | GEN-DL-002 | INFORMATIONAL | - |
| USTAWA art. 67 ust. 1, 3, 4 | GEN-DL-001 | INFORMATIONAL | - |
| USTAWA art. 7 pkt 1-2 | SICK-ELIG-006 | ACTIVE | T-SICK-011, T-SICK-012, T-SICK-013 |
| USTAWA art. 8 ust. 1 | SICK-DUR-001 | ACTIVE | T-SICK-007, T-SICK-008 |
| USTAWA art. 8 ust. 2 | SICK-DUR-002 | ACTIVE | T-SICK-011 |
| USTAWA art. 9 ust. 1-2 | SICK-DUR-003 | ACTIVE | T-SICK-009, T-SICK-010 |
| USTAWA art. 9 ust. 3; art. 12 ust. 3 | SICK-DUR-004 | ACTIVE | - |
| USTAWA art. 9 ust. 4 (przypis 3: dodany ustawą z 18.12.2025, Dz.U. 2026 poz. 26, wchodzi w życie 1.01.2027) | SICK-DUR-005 | FUTURE | T-INT-006 |
| ZALACZNIK Treść zadania, pkt H.1 (brak przepisu w wyciągach) | RISK-001 | INFORMATIONAL | - |
| ZALACZNIK Treść zadania, pkt H.2 | RISK-002 | INFORMATIONAL | - |
| ZALACZNIK Załącznik - limit podstawy składek przy dobrowolnym ubezpieczeniu chorobowym; USTAWA art. 48 ust. 1 (przychód = podstawa składek − 13,71%) | BASE-NEMP-005 | ACTIVE | - |

## Przepisy zidentyfikowane, ale nieuwzględnione w regułach wykonywalnych

| Przepis | Przyczyna |
|---|---|
| USTAWA art. 2 pkt 3, 6; rozdz. 4-5 (zasiłek wyrównawczy, opiekuńczy) | Poza zakresem produktu (nie w pkt a–j zadania); art. 32-35 nie ma w wyciągu |
| USTAWA art. 6 ust. 2 (kwarantanna, leczenie odwykowe, dawstwo) | P2 - rzadkie; częściowo w SICK-RATE-002 (dawstwo) |
| USTAWA art. 14, 7a, 52a, 52b | Grupy szczególne (nosicielstwo, żołnierze, służba zastępcza, małżonek Prezydenta) - OUT_OF_SCOPE |
| USTAWA art. 19 ust. 2-3 (waloryzacja) | Brak wskaźników w materiałach (GAP-009) |
| USTAWA art. 53-58a (e-ZLA - wystawianie, rejestry, błędy) | Procedura lekarska/płatnika - tylko jako źródło danych (kody A-E) |
| USTAWA art. 61 ust. 4, 61a, 62 ust. 1-2, 4-6, 63, 65, 66, 66a | Procedura wypłaty - informacyjnie w przewodniku, nie w silniku |
| USTAWA art. 29 ust. 2a, 8; art. 29a ust. 4; art. 30a ust. 4 | Przypadki szczególne (KAS, przepisy odrębne) - OUT_OF_SCOPE |
| KP art. 177 § 1, § 1(1), § 4 | Ochrona przed zwolnieniem - treść informacyjna (pkt I zadania), nie wpływa na zasiłek |
| KP art. 181, 182(1d) § 3, 183 § 7-8, 185, 186(4), 189(1) | Uprawnienia pracownicze bez wpływu na zasiłek / P2 |
| ROZP_DOK § 5, 7-10, 14, 18-19, 21-25, 28, 31, 34-41, zał. 5, 7 | Dokumenty dla przypadków P2 lub poza zakresem (zagranica, opiekuńczy); mapowane informacyjnie |
| ROZP_WN § 19-21 | Urlop wychowawczy / obniżenie wymiaru - poza zakresem |

## Mapa pól wejścia → reguły

| Pole | Reguły |
|---|---|
| `applications.combined_815_filed_date` | RATE-MAT-003, RATE-MAT-006, RATE-MAT-008 |
| `base.amount` | BASE-GEN-002 |
| `base.reference_event_date` | BASE-EMP-001, BASE-GEN-001 |
| `benefit` | APP-DOC-003, APP-DOC-004, BASE-GEN-002, CALC-MAT-001, MAT-CLS-001, MAT-DUR-009, REHAB-DOC-001, REHAB-DUR-001, REHAB-RATE-001, SICK-CALC-001, SICK-DOC-001, SICK-DUR-001, SICK-RATE-001, SICK-RATE-002, SICKPAY-RATE-001, SICKPAY-RATE-002 |
| `benefit_history.employer_sick_pay_days_in_year` | SICK-EXCL-001, SICKPAY-ELIG-001, SICKPAY-TRN-001 |
| `benefit_history.previous_base_amount` | BASE-GEN-001 |
| `benefit_history.previous_benefit_end_date` | BASE-GEN-001 |
| `benefit_history.sickness_periods` | REHAB-ELIG-001, SICK-DUR-003, SICK-EXCL-004 |
| `benefit_period.end_date` | GEN-DL-001 |
| `birth.completed_gestation_weeks` | SUPP-ELIG-001, SUPP-ELIG-002, SUPP-ELIG-003 |
| `birth.weight_at_most_threshold` | SUPP-ELIG-001, SUPP-ELIG-002 |
| `children.abandoned_or_placed_date` | MAT-DUR-006 |
| `children.birth_dates` | MAT-DUR-007, MAT-DUR-008, MAT-ELIG-002, MAT-ELIG-003, PAR-COND-001, PAR-DUR-003, PAT-DUR-001, PAT-ELIG-001, RATE-MAT-005 |
| `children.count_at_birth` | MAT-DUR-001, MAT-DUR-005, MAT-SHARE-007, PAR-DUR-001, PAR-DUR-002, PAR-WORK-002 |
| `children.count_at_event` | MAT-DUR-007, PAR-DUR-003 |
| `children.hospital_stays` | SUPP-CALC-001, SUPP-ELIG-001, SUPP-ELIG-002, SUPP-ELIG-003 |
| `children.items` | MAT-DUR-003, MAT-DUR-004, MAT-DUR-005, PAR-ELIG-001, SUPP-CALC-001, SUPP-ELIG-001, SUPP-ELIG-002 |
| `children.school_obligation_deferred` | MAT-DUR-007, MAT-ELIG-003 |
| `children.za_zyciem_certificate` | APP-DOC-003, PAR-DUR-001, PAR-DUR-002, PAR-DUR-003, PAR-WORK-002 |
| `debt.amount_on_right_date` | GEN-EXCL-001, GEN-EXCL-002 |
| `debt.repaid_in_full_date` | GEN-EXCL-001, GEN-EXCL-002 |
| `employment.contract_end_date` | MAT-CLS-002 |
| `employment.contract_monthly_salary` | BASE-EMP-003, BASE-EMP-005, BASE-NEMP-003 |
| `employment.contract_type` | MAT-CLS-002, MAT-ELIG-006 |
| `employment.extended_until_birth_kp177` | MAT-ELIG-006 |
| `employment.is_replacement_contract` | MAT-CLS-002 |
| `employment.leaves` | MAT-ELIG-001, MAT-NEG-001, SICK-EXCL-002 |
| `employment.other_employment_provided` | MAT-ELIG-007 |
| `employment.working_time_change_date` | BASE-EMP-005 |
| `employment.working_time_fraction` | BASE-EMP-008 |
| `entitlement_basis` | APP-DOC-004 |
| `evaluation.as_of_date` | APP-DL-002, GEN-DL-002, GEN-EXCL-002 |
| `event.adoption_final_date` | PAT-DUR-001 |
| `event.court_adoption_application_date` | MAT-ELIG-002 |
| `event.date` | APP-DL-001, MAT-DUR-003, MAT-DUR-004, MAT-DUR-006, MAT-DUR-007, MAT-DUR-008, MAT-ELIG-001, MAT-ELIG-002, MAT-ELIG-003, MAT-ELIG-004, MAT-ELIG-005, MAT-NEG-001, PAR-DUR-003, RATE-MAT-003, SUPP-ELIG-003 |
| `event.foster_family_type` | MAT-ELIG-003, MAT-EXCL-001 |
| `event.type` | APP-DOC-002, APP-DOC-005, MAT-DUR-001, MAT-DUR-003, MAT-DUR-004, MAT-DUR-007, MAT-DUR-008, MAT-ELIG-001, MAT-ELIG-002, MAT-ELIG-003, MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-006, MAT-EXCL-001, MAT-NEG-001, PAR-DUR-001, PAR-DUR-002, PAR-DUR-003 |
| `incapacity.cause` | SICK-DUR-002, SICK-ELIG-005, SICK-RATE-002, SICKPAY-RATE-002 |
| `incapacity.caused_by_own_intentional_offence_final_judgment` | SICK-EXCL-005 |
| `incapacity.certificate_forged` | SICK-EXCL-007 |
| `incapacity.certificate_present` | SICK-ELIG-001 |
| `incapacity.codes` | SICK-DUR-001, SICK-DUR-002, SICK-ELIG-006, SICK-EXCL-006, SICK-RATE-002, SICKPAY-RATE-002 |
| `incapacity.end_date` | SICK-CALC-001, SICK-ELIG-006 |
| `incapacity.gainful_work_during_leave_reported` | SICK-EXCL-007 |
| `incapacity.start_date` | SICK-CALC-001, SICK-DUR-003, SICK-DUR-004, SICK-ELIG-001, SICK-ELIG-002, SICK-ELIG-003, SICK-ELIG-005, SICK-ELIG-006, SICKPAY-ELIG-001, SICKPAY-EXCL-001, SICKPAY-TRN-001 |
| `income_history` | CALC-MAT-001, RATE-MAT-007, SICK-CALC-001 |
| `income_history.annual_components` | BASE-EMP-006 |
| `income_history.minimum_contribution_base_by_month` | BASE-NEMP-002, BASE-NEMP-003 |
| `income_history.months` | BASE-EMP-001, BASE-EMP-002, BASE-EMP-003, BASE-EMP-004, BASE-EMP-007, BASE-NEMP-001, BASE-NEMP-002, BASE-NEMP-004, RISK-002 |
| `income_history.quarterly_components` | BASE-EMP-006 |
| `insurance.titles` | BASE-EMP-002, BASE-NEMP-005, GEN-CLS-001, GEN-CLS-002, GEN-EXCL-001, MAT-ELIG-001, MAT-ELIG-002, MAT-ELIG-003, MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-007, MAT-NEG-001, PAR-ELIG-001, PAR-SHARE-003, PAT-ELIG-001, RISK-001, RISK-003, SICK-DOC-001, SICK-DOC-002, SICK-DUR-002, SICK-DUR-004, SICK-DUR-005, SICK-ELIG-001, SICK-ELIG-002, SICK-ELIG-003, SICK-ELIG-004, SICK-ELIG-005, SICK-ELIG-006, SICK-EXCL-004, SICKPAY-ELIG-001, SICKPAY-EXCL-001 |
| `mother.abandoned_child_date` | MAT-SHARE-004, MAT-SHARE-005 |
| `mother.death_date` | MAT-SHARE-004, MAT-SHARE-005 |
| `mother.employment_fraction` | MAT-SHARE-006 |
| `mother.employment_start_date` | MAT-SHARE-006 |
| `mother.hospital_admission_date` | MAT-SHARE-003 |
| `mother.hospital_discharge_date` | MAT-SHARE-003 |
| `mother.hospitalized_unable_to_care` | MAT-SHARE-003 |
| `mother.incapable_of_independent_living_certificate` | MAT-SHARE-002, MAT-SHARE-005 |
| `mother.sickness_insured` | MAT-SHARE-005, MAT-SHARE-006, PAR-SHARE-003 |
| `payer.insured_count_on_nov30_prev_year` | GEN-CLS-001, GEN-CLS-002, SICK-DL-001 |
| `person.birth_date` | SICKPAY-ELIG-001, SICKPAY-TRN-001 |
| `person.continues_or_started_gainful_activity` | SICK-EXCL-003 |
| `person.graduation_date` | SICK-ELIG-005 |
| `person.has_pension_or_disability_pension` | REHAB-EXCL-001, SICK-EXCL-003 |
| `person.mandatory_krus` | SICK-EXCL-003 |
| `person.on_health_restoration_leave` | REHAB-EXCL-001 |
| `person.receives_unemployment_or_preretirement_benefit` | REHAB-EXCL-001, SICK-EXCL-003 |
| `person.role` | MAT-ELIG-001, MAT-SHARE-001, MAT-SHARE-002, MAT-SHARE-003, MAT-SHARE-004, MAT-SHARE-005, MAT-SHARE-006, PAR-ELIG-001, PAR-SHARE-003, PAT-DUR-001, PAT-ELIG-001 |
| `person.special_status` | SICK-ELIG-005 |
| `plan.maternity_start_date` | MAT-DUR-002 |
| `plan.mother_resigns_remaining_maternity` | MAT-SHARE-001 |
| `plan.parental_start_date` | PAR-ELIG-001, PAR-SHARE-003 |
| `plan.paternity_start_date` | PAT-ELIG-001 |
| `plan.segments` | APP-DL-002, APP-DOC-001, APP-DOC-006, CALC-MAT-001, MAT-SHARE-001, MAT-SHARE-002, MAT-SHARE-007, PAR-COND-001, PAR-SHARE-001, PAR-SHARE-002, PAR-WORK-001, PAR-WORK-002, PAR-WORK-003, PAT-DUR-001, RATE-MAT-004, RATE-MAT-005, RATE-MAT-006, RATE-MAT-008, SUPP-COND-001 |
| `plan.transfer_start_date` | MAT-SHARE-001 |
| `pregnancy.expected_due_date` | MAT-DUR-002, RISK-003 |
| `pregnancy.is_pregnant_during_incapacity` | REHAB-RATE-001, SICK-DUR-001, SICK-DUR-002, SICK-DUR-003, SICK-RATE-002, SICKPAY-RATE-002 |
| `pregnancy.pregnancy_start_date` | MAT-CLS-002, MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-007, RISK-001, RISK-002 |
| `rehabilitation.zus_medical_opinion_positive` | REHAB-ELIG-001 |
| `segment.leave_type` | APP-DOC-006, RATE-MAT-001, RATE-MAT-002, RATE-MAT-003, RATE-MAT-005, RATE-MAT-008 |
| `segment.parent` | RATE-MAT-003, RATE-MAT-008 |

## Mapa faktów → reguły

| Fakt | Reguły |
|---|---|
| `f_abandonment_end_date` | MAT-DUR-006 |
| `f_any_art30_basis` | MAT-NEG-001, RISK-003 |
| `f_any_parental_day_in_first_year` | RATE-MAT-005, RATE-MAT-006 |
| `f_apply_after_title_cap` | BASE-GEN-002 |
| `f_apply_minimum_base` | BASE-EMP-008 |
| `f_apply_voluntary_base_cap` | BASE-NEMP-005 |
| `f_base_after_working_time_change` | BASE-EMP-005 |
| `f_base_declared_short_insurance` | BASE-NEMP-002 |
| `f_base_first_month_employee` | BASE-EMP-003 |
| `f_base_first_month_non_employee` | BASE-NEMP-003 |
| `f_base_months_selection_employee` | BASE-EMP-004 |
| `f_base_months_selection_non_employee` | BASE-NEMP-004 |
| `f_benefit_after_title_end` | BASE-GEN-002, GEN-CLS-001, GEN-CLS-002, SICK-DOC-002, SICK-DUR-002, SICK-EXCL-003, SICK-EXCL-004 |
| `f_benefit_amount` | CALC-MAT-001, SICK-CALC-001 |
| `f_benefit_base` | CALC-MAT-001, SICK-CALC-001 |
| `f_benefit_base_employee` | BASE-EMP-001, BASE-EMP-002 |
| `f_benefit_base_non_employee` | BASE-NEMP-001 |
| `f_benefit_period_days_used` | SICK-DUR-003 |
| `f_benefit_period_exhausted` | REHAB-ELIG-001 |
| `f_benefit_period_exhausted_before_title_end` | SICK-EXCL-004 |
| `f_benefit_period_limit_days` | SICK-DUR-001 |
| `f_child_age_years_on` | MAT-ELIG-002, MAT-ELIG-003 |
| `f_child_alive_on` | PAR-ELIG-001 |
| `f_child_death_maternity_end_date` | MAT-DUR-004 |
| `f_children_alive_count` | MAT-DUR-003, MAT-DUR-004, MAT-DUR-005 |
| `f_children_deceased_count` | MAT-DUR-005 |
| `f_claim_deadline` | GEN-DL-001 |
| `f_combined_application_deadline` | APP-DL-001 |
| `f_combined_application_within_deadline` | RATE-MAT-003, RATE-MAT-006, RATE-MAT-008 |
| `f_continuous_sickness_insurance_days` | SICK-ELIG-002, SICK-ELIG-003, SICK-ELIG-004 |
| `f_contract_end_after_third_month_of_pregnancy` | MAT-CLS-002 |
| `f_contribution_base_increase_during_pregnancy` | RISK-002 |
| `f_contribution_base_is_declared` | BASE-NEMP-002 |
| `f_day_covered_by_retained_pay` | SICK-EXCL-001 |
| `f_day_in_excluded_leave` | SICK-EXCL-002 |
| `f_days_since_title_end` | SICK-ELIG-006 |
| `f_debt_fully_repaid` | GEN-EXCL-001 |
| `f_debt_on_right_date_exceeds_threshold` | GEN-EXCL-001, GEN-EXCL-002 |
| `f_debt_unpaid_beyond_months` | GEN-EXCL-002 |
| `f_documents_for_segment` | APP-DOC-006 |
| `f_earliest_child_death_age_days` | MAT-DUR-003, MAT-DUR-004 |
| `f_filter_excluded_components` | BASE-EMP-007 |
| `f_full_months_of_continuous_insurance` | BASE-EMP-001, BASE-EMP-002, BASE-EMP-003, BASE-NEMP-002, BASE-NEMP-003 |
| `f_gap_shorter_than_calendar_month` | BASE-GEN-001 |
| `f_graduate_within_window` | SICK-ELIG-005 |
| `f_has_pre_birth_maternity_segment` | APP-DOC-001 |
| `f_has_qualifying_late_hospital_stay` | SUPP-ELIG-003 |
| `f_has_work_in_parental` | PAR-WORK-002 |
| `f_incapacity_continuous_days` | SICK-ELIG-006 |
| `f_incapacity_in_pregnancy` | SICK-DUR-002, SICK-RATE-002, SICKPAY-RATE-002 |
| `f_is_employee_on` | APP-DL-002, SICKPAY-ELIG-001, SICKPAY-TRN-001 |
| `f_is_employee_title_for_base` | BASE-EMP-001, BASE-EMP-008, BASE-NEMP-001, BASE-NEMP-003 |
| `f_is_employee_title_last` | MAT-ELIG-007 |
| `f_is_employer_payer_title` | GEN-CLS-001, SICK-DL-001 |
| `f_is_voluntary_sickness_title_for_base` | BASE-NEMP-005 |
| `f_last_title_termination_reason` | MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-007 |
| `f_leave_application_deadlines` | APP-DL-002 |
| `f_maternity_benefit_eligible_any_parent` | SUPP-COND-001 |
| `f_maternity_leave_weeks` | MAT-DUR-001, MAT-SHARE-007 |
| `f_maternity_like_leave_period` | MAT-DUR-007 |
| `f_maternity_like_weeks_after_age_cap` | MAT-DUR-008 |
| `f_maternity_weeks_surviving` | MAT-DUR-005 |
| `f_max_work_fraction_in_parental` | PAR-WORK-001 |
| `f_monthly_maternity_amount` | RATE-MAT-007 |
| `f_months_since_title_end` | SICK-ELIG-006 |
| `f_mother_maternity_weeks_used_after_birth` | MAT-SHARE-001, MAT-SHARE-002, MAT-SHARE-003, MAT-SHARE-004 |
| `f_number_of_sickness_titles` | SICK-DUR-005 |
| `f_on_childcare_leave_on` | MAT-ELIG-001, MAT-ELIG-002, MAT-ELIG-003, MAT-NEG-001 |
| `f_one_off_equalization` | RATE-MAT-006 |
| `f_parental_extension` | PAR-WORK-002 |
| `f_parental_last_day_after_limit` | PAR-COND-001 |
| `f_parental_leave_weeks` | PAR-DUR-001, PAR-DUR-002, PAR-DUR-003, PAR-SHARE-002 |
| `f_parental_parts_count` | PAR-COND-001 |
| `f_parental_pool_minus_other_parent_reserved` | PAR-SHARE-001 |
| `f_parental_weeks_planned_for_parent` | PAR-SHARE-001 |
| `f_paternity_window` | PAT-DUR-001 |
| `f_paternity_within_deadline` | PAT-ELIG-001 |
| `f_periodic_components_monthly_share` | BASE-EMP-006 |
| `f_planned_title_end_before_due_date` | RISK-003 |
| `f_primary_title_type` | GEN-CLS-002, GEN-EXCL-001 |
| `f_prior_mandatory_sickness_insurance_years` | SICK-ELIG-005 |
| `f_raise_to_parental_benefit_floor` | RATE-MAT-007 |
| `f_rehab_rate_schedule` | REHAB-RATE-001 |
| `f_segment_belongs_to_applicant_of_combined` | RATE-MAT-003 |
| `f_segment_is_other_parent_reserved_9w` | RATE-MAT-004, RATE-MAT-008 |
| `f_segment_work_fraction` | PAR-WORK-003 |
| `f_sick_pay_days_remaining_in_year` | SICKPAY-ELIG-001, SICKPAY-TRN-001 |
| `f_sickness_benefit_right_exists` | SICKPAY-ELIG-001, SICKPAY-EXCL-001 |
| `f_sickness_insurance_mode_on` | SICK-ELIG-002, SICK-ELIG-003, SICK-ELIG-005 |
| `f_sickness_insured_on` | MAT-ELIG-001, MAT-ELIG-002, MAT-ELIG-003, MAT-ELIG-004, MAT-ELIG-005, MAT-NEG-001, MAT-SHARE-001, PAR-ELIG-001, PAR-SHARE-003, PAT-ELIG-001, SICK-ELIG-001, SICK-ELIG-006 |
| `f_stillbirth_maternity_end_date` | MAT-DUR-003 |
| `f_supplementary_claimants_count` | SUPP-COND-001 |
| `f_supplementary_leave_weeks` | SUPP-CALC-001, SUPP-ELIG-001, SUPP-ELIG-002, SUPP-ELIG-003 |
| `f_title_ended_during_pregnancy` | MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-007 |
| `f_title_started_during_or_shortly_before_pregnancy` | RISK-001 |
| `f_total_maternity_weeks_planned` | MAT-SHARE-007 |
| `f_total_parental_weeks_planned` | PAR-SHARE-002 |
| `f_waiting_period_met_during_insurance` | SICK-EXCL-003 |
| `f_weeks_before_due_date` | MAT-DUR-002 |
| `f_weight_at_most_threshold` | SUPP-ELIG-001, SUPP-ELIG-002 |
| `f_working_time_change_in_base_window` | BASE-EMP-005 |