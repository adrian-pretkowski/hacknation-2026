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
| M05 | Art. 43: „przerwa krótsza niż miesiąc kalendarzowy” — pełny miesiąc kalendarzowy (1.–ostatni) czy okres miesiąca? Dotyczy przejścia z L4 w ciąży na macierzyński. | BASE-GEN-001, CONF-006, T-BASE-007 | 2026-11-21, mentor fachowy (ZUS): **miesiąc kalendarzowy** — pełny miesiąc od 1. do ostatniego dnia | Podstawy nie ustala się na nowo, jeśli przerwa nie obejmuje całego miesiąca kalendarzowego (np. 2.02–14.03 = ta sama podstawa; 1.02–14.03 obejmuje luty = nowa podstawa). Zaimplementowane: `f_gap_shorter_than_calendar_month`, `f_benefit_base`, BASE-GEN-001 w pipeline; T-BASE-007 → POSITIVE, nowe T-BASE-010/011/012 (012: macierzyński przed porodem); CONF-006 zamknięty, D18 |
| M06 | Pracownik: wynagrodzenie po faktycznie potrąconych składkach (Z-3) czy zawsze „minus 13,71%” (Załącznik)? | BASE-EMP-001, CONF-002 | 2026-11-21, mentor fachowy (ZUS): **zawsze minus 13,71%**; okres: 12 miesięcy kalendarzowych, a przy zatrudnieniu krótszym niż 12 miesięcy — pełny okres zatrudnienia (pełne miesiące kalendarzowe) | CONF-002 zamknięty: wynagrodzenie pracownika = przychód brutto × (1 − `CONTRIBUTION_DEDUCTION_RATE`); pola `*_net` w `income_history.months` = kwoty już po odliczeniu 13,71% (przeliczenie brutto → netto po stronie wejścia/kreatora, bez podwójnego odliczenia); okno 12 mies. / pełne miesiące = BASE-EMP-001/002 (bez zmian). Sensowność: zgodne z art. 3 pkt 3 dla typowego pracownika (9,76% + 1,5% + 2,45% = 13,71%). D19. Silnik: BASE-EMP-* jeszcze niezaimplementowane (BE2-03) — zmiana w specyfikacji |
| M07 | Minimalna podstawa 2026 (tabela w Załączniku pusta): czy 4806 × 0,8629 = 4147,0974 zł i jak zaokrąglić? Czy 4806 zł to właściwa płaca minimalna? | BASE-EMP-008, GEN-EXCL-001, GAP-022, `MIN_WAGE_2026_MONTHLY` | | |
| M08 | Skąd wziąć najniższą podstawę składek JDG do art. 48a — czy jest w poświadczeniu ubezpieczenia w sprawach? Czy limit 23 550 zł dla dobrowolnego chorobowego jest aktualny? | BASE-NEMP-002/003, GAP-023, `VOLUNTARY_MAX_CONTRIB_BASE_2026` | | |
| M09 | Czy dzienna stawka zasiłku macierzyńskiego = podstawa / 30 (odesłanie art. 47 → art. 36 ust. 3)? | CALC-MAT-001 | | |
| M10 | Kwota świadczenia rodzicielskiego do podwyższenia zasiłku (art. 31 ust. 3a) i czy uwzględniać to w MVP. Doprecyzowanie: (a) jaka jest miesięczna kwota świadczenia rodzicielskiego na 2026/2027 (ustawy o świadczeniach rodzinnych nie ma w materiałach)? (b) czy porównujemy z nią miesięczną kwotę zasiłku `podstawa × stawka × (1 − część etatu)` przed jakimkolwiek zaokrągleniem? (c) jak liczyć podwyższenie za niepełny miesiąc (art. 31 ust. 3b–3c: proporcjonalnie do dni kalendarzowych?). Bez kwoty reguła zostaje nieoceniona — po wpisaniu kwoty jako parametru silnik ocenia ją automatycznie. | RATE-MAT-007 (BLOCKED), `PARENTAL_BENEFIT_FLOOR_MONTHLY` (MISSING), `f_monthly_maternity_amount`, `f_raise_to_parental_benefit_floor`, GAP-002 | | |

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
| M18 | Poród w czasie urlopu wychowawczego (brak aktywnego tytułu w dniu porodu, art. 29 ust. 1 pkt 1): czy próg zadłużenia z art. 2a stosujemy według ostatniego tytułu przed urlopem (np. gdy osoba prowadziła też działalność)? Silnik przyjmuje dziś ostatni zakończony tytuł (DERIVED, D17). | GEN-EXCL-001, MAT-ELIG-001, `f_primary_title_type` | | |

## Dziennik ustaleń

| Data i godzina | ID | Mentor | Ustalenie (cytat/streszczenie) | Kto wprowadza zmianę | Zmienione pliki |
|---|---|---|---|---|---|
| 2026-11-21 16:15 | M05 | mentor fachowy (ZUS) | „Miesiąc kalendarzowy” w art. 43 = pełny miesiąc kalendarzowy (1.–ostatni dzień). Temat wyjaśniony; zgodne z wykładnią ZUS (nowa podstawa tylko, gdy przerwa obejmuje cały miesiąc). | lider (Claude Code) | `backend/app/core/dates.py`, `backend/app/engine/facts/maternity.py`, `backend/app/engine/pipeline/maternity.py`, `backend/tests/test_engine_facts.py`, `zus_rules/03_rules.yaml`, `07`, `08`, `09`, katalog `02`/`11`, `docs/ASSUMPTIONS.md`, `docs/DECISIONS.md`, `PROGRESS.md` |
