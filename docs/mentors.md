# Pytania i ustalenia z mentorami ZUS

Źródło pytań: analiza `zus_rules/` (reguły zablokowane, parametry bez potwierdzenia, reguły P0 oparte na wywodzie, założenia w testach, `09_LEGAL_GAPS_AND_CONFLICTS.md`).

**Zasada:** każda odpowiedź mentora wpływająca na reguły — wpis tutaj (data, kto pytał, kto odpowiedział, treść, decyzja). Bez wpisu nie odblokowujemy reguł `BLOCKED` ani nie zmieniamy parametrów w `zus_rules/03_rules.yaml`.

**Pierwsza wizyta (priorytet):** M01–M05 oraz M11 — odblokowują raport zgodności ze sprawami, poprawność kwot i jedną zablokowaną regułę.

## A. Organizacja i dane (pierwsza godzina)

| ID | Pytanie | Dlaczego | Reguły / wpływ | Odpowiedź (data, mentor) | Decyzja / zmiany |
|---|---|---|---|---|---|
| M01 | Gdzie są zestawy przykładowych spraw? Brak ich w pobranych materiałach. | Jury testuje na tych sprawach (§ 6 zadania) | raport `/run-golden`, F6, F15 | | |
| M02 | Czy sprawy można użyć w publicznym demo, repo i wideo, skoro „nie wolno ich kopiować ani rozpowszechniać”? | Zadanie wymaga wyboru przykładów w demo | sprawy prawdziwe vs syntetyczne, `.gitignore` | | |
| M03 | Która wartość w sprawie jest wzorcem „poprawnego wyliczenia”: kwota z decyzji, podstawa, stawka czy okres? | Definicja zgodności | format raportu zgodności | | |
| M04 | Jak ZUS zaokrągla podstawę, stawkę dzienną i kwotę zasiłku (do grosza? na którym etapie?) | Brak reguły w materiałach | GAP-001, `ROUNDING_POLICY`, wszystkie CALC | | |

## B. Obliczenia (wpływ na kwoty)

| ID | Pytanie | Reguły | Odpowiedź (data, mentor) | Decyzja / zmiany |
|---|---|---|---|---|
| M05 | Art. 43: „przerwa krótsza niż miesiąc kalendarzowy” — pełny miesiąc kalendarzowy (1.–ostatni) czy okres miesiąca? Dotyczy przejścia z L4 w ciąży na macierzyński. | BASE-GEN-001, CONF-006, T-BASE-007 | | |
| M06 | Pracownik: wynagrodzenie po faktycznie potrąconych składkach (Z-3) czy zawsze „minus 13,71%” (Załącznik)? | BASE-EMP-001, CONF-002 | | |
| M07 | Minimalna podstawa 2026 (tabela w Załączniku pusta): czy 4806 × 0,8629 = 4147,0974 zł i jak zaokrąglić? Czy 4806 zł to właściwa płaca minimalna? | BASE-EMP-008, GEN-EXCL-001, GAP-022, `MIN_WAGE_2026_MONTHLY` | | |
| M08 | Skąd wziąć najniższą podstawę składek JDG do art. 48a — czy jest w poświadczeniu ubezpieczenia w sprawach? Czy limit 23 550 zł dla dobrowolnego chorobowego jest aktualny? | BASE-NEMP-002/003, GAP-023, `VOLUNTARY_MAX_CONTRIB_BASE_2026` | | |
| M09 | Czy dzienna stawka zasiłku macierzyńskiego = podstawa / 30 (odesłanie art. 47 → art. 36 ust. 3)? | CALC-MAT-001 | | |
| M10 | Kwota świadczenia rodzicielskiego do podwyższenia zasiłku (art. 31 ust. 3a) i czy uwzględniać to w MVP. | RATE-MAT-007 (BLOCKED), `PARENTAL_BENEFIT_FLOOR_MONTHLY` | | |

## C. Interpretacja prawa (wpływ na status i okres)

| ID | Pytanie | Reguły | Odpowiedź (data, mentor) | Decyzja / zmiany |
|---|---|---|---|---|
| M11 | Stawka ojca za część rodzicielskiego poza jego 9 tygodniami, gdy matka złożyła wniosek 81,5%: 81,5% czy 70%? | RATE-MAT-008 (BLOCKED), T-RATE-006 | | |
| M12 | (a) Czy zasiłek macierzyński nie ma okresu wyczekiwania (np. JDG zgłoszona do dobrowolnego chorobowego miesiąc przed porodem)? (b) Kiedy ojciec musi być ubezpieczony: w dniu porodu czy w dniu startu swojej części rodzicielskiego? | MAT-CLS-001, PAR-ELIG-001, PAR-SHARE-003 | | |
| M13 | KP 177 § 3: jak liczyć „trzeci miesiąc ciąży” i skąd data początku ciąży? Czy przedłużenie umowy jest w sprawach potwierdzone dokumentem? | MAT-CLS-002 (BLOCKED), GAP-007, T-MAT-009 | | |
| M14 | Przysposobienie / rodzina zastępcza: (a) czy 9 tyg. to minimum, gdy limit wieku skraca urlop (Załącznik)? (b) kiedy 38 tyg. rodzicielskiego (62 „Za życiem”)? (c) „do 14 roku życia” = przed ukończeniem 14 lat? | MAT-DUR-008 (BLOCKED), PAR-DUR-003, CONF-003, GAP-005 | | |
| M15 | (a) Uzupełniający urlop: dzień porodu = dzień 0 czy 1 przy „5.–28. dniu”? (b) Poronienie: czy wystarczy zaświadczenie o martwym urodzeniu (8 tyg.)? (c) Uzupełniający przy wniosku 81,5% — 100%? (d) Termin 21 dni przypadający w dzień wolny? (e) „Zasiłek w wysokości macierzyńskiego do dnia porodu” — do dnia poprzedzającego poród? | SUPP-ELIG-003, MAT-DUR-003, CONF-005, APP-DL-001, MAT-ELIG-007; GAP-010, GAP-020, GAP-024 | | |

## D. Zakres i produkt

| ID | Pytanie | Wpływ | Odpowiedź (data, mentor) | Decyzja / zmiany |
|---|---|---|---|---|
| M16 | (a) Zasiłek w wysokości macierzyńskiego: zadanie przyznaje go też przy naruszeniu prawa, ustawa nie — stosujemy ustawę? (b) Czy pkt j) obejmuje rodzinę zastępczą zawodową? (c) Jak głęboko obsłużyć świadczenie rehabilitacyjne? (d) Czy ZUS ma zweryfikowaną listę organizacji wsparcia? (e) Czy wolno wysłać dane spraw do zewnętrznego API AI? | CONF-001, MAT-EXCL-001, REHAB-*, pkt i), F13 | | |
| M17 | Progi ostrzeżeń o ryzykach przyjęte przez zespół (umowa zawarta ≤90 dni przed ciążą, wzrost podstawy ≥50%) — czy ZUS ma własne kryteria? Pokazujemy je jako ostrzeżenie, nie decyzję. | RISK-001, RISK-002 | | |

## Dziennik ustaleń

| Data i godzina | ID | Mentor | Ustalenie (cytat/streszczenie) | Kto wprowadza zmianę | Zmienione pliki |
|---|---|---|---|---|---|
| | | | | | |
