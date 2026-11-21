# 09 — LEGAL GAPS AND CONFLICTS

Wpływ na MVP: **H** — blokuje część demo lub poprawność kwot; **M** — dotyczy przypadków szczególnych; **L** — kosmetyczny.

## A. Konflikty i rozbieżności między źródłami

| ID | Reguły | Źródła | Opis | Rodzaj | Rozstrzygnięcie | Wpływ |
|---|---|---|---|---|---|---|
| CONF-001 | MAT-ELIG-007 | USTAWA art. 30 ust. 3; ROZP_DOK § 17 ↔ treść zadania (pkt „Szczególna sytuacja”) | Zadanie przyznaje „zasiłek w wysokości zasiłku macierzyńskiego” także przy rozwiązaniu umowy z naruszeniem prawa. Ustawa i rozporządzenie — **tylko** śmierć, upadłość, likwidacja pracodawcy | Dokument pomocniczy rozszerza przepis | **ROZSTRZYGNIĘTE (M16 a, 2026-11-21, mentor fachowy): stosujemy treść zadania** — naruszenie prawa stwierdzone przez sąd też daje zasiłek w wysokości macierzyńskiego do dnia przed porodem (MAT-ELIG-007) | M |
| CONF-002 | BASE-EMP-001 | USTAWA art. 3 pkt 3 ↔ ZALACZNIK | Ustawa: wynagrodzenie po odliczeniu **faktycznie potrąconych** składek pracownika; Załącznik: „pomniejszone o 13,71%”. Zwykle zbieżne, ale nie zawsze (np. przekroczenie rocznego limitu składek emerytalno-rentowych) | Uproszczenie | **ROZSTRZYGNIĘTE (M06, 2026-11-21, mentor fachowy):** zawsze minus 13,71% także dla pracowników; pola `*_net` = brutto × (1 − 0,1371); okno 12 mies., a przy krótszym zatrudnieniu — pełne miesiące całego okresu (art. 36 ust. 2) | M |
| CONF-003 | MAT-DUR-008, PAR-DUR-003 | KP art. 183 § 3, § 4 pkt 3, § 4(2), § 4(5) ↔ ZALACZNIK | Załącznik: „urlop na warunkach macierzyńskiego nie może trwać krócej niż 9 tygodni”; pomija 38/62 tyg. rodzicielskiego. KP § 3 przyznaje „prawo do 9 tygodni” bez słowa „minimum” | Uproszczenie + możliwa interpretacja | **ROZSTRZYGNIĘTE (M14 a, 2026-11-21, mentor fachowy):** 9 tyg. nie jest minimum — limit wieku skraca urlop, niewykorzystana część przepada; MAT-DUR-008 tylko informuje. Przesłanka wariantu 38/62 tyg. (§ 3): odpowiedź lidera w M14b — starsze dziecko, granica wieku przed końcem standardowego wymiaru; gwarantuje 9 tyg. minimum. **Sprzeczne z M14a — otwarte (BE2-10)** | M |
| CONF-004 | MAT-SHARE-006 | USTAWA art. 29 ust. 10; KP art. 180 § 17 | Matka „nieposiadająca tytułu do ubezpieczenia” podejmuje zatrudnienie ≥½ etatu — zatrudnienie zwykle jest tytułem; pozorna sprzeczność | Pozorna sprzeczność | **NEEDS_LEGAL_REVIEW** (BLOCKED) | L |
| CONF-005 | SUPP-COND-001, RATE-MAT-003 | USTAWA art. 31 ust. 1 i 3 ↔ ZALACZNIK | Art. 31 ust. 3 (81,5%) wymienia macierzyński, na warunkach macierzyńskiego i rodzicielski — **nie** uzupełniający. Załącznik o tym milczy | Luka w Załączniku | Uzupełniający zawsze 100% — **potwierdzone (M15 c, 2026-11-21)** | L |
| CONF-006 | BASE-GEN-001 | USTAWA art. 43 ↔ ZALACZNIK | Ustawa: przerwa „krótsza niż **miesiąc kalendarzowy**”; Załącznik: „poniżej 1 miesiąca” / „min. 1 miesiąc”. Pełny miesiąc kalendarzowy (1.–ost.) czy okres miesiąca? | Różne interpretacje granicy | **ROZSTRZYGNIĘTE (M05, 2026-11-21, mentor fachowy):** pełny miesiąc kalendarzowy (1.–ostatni dzień); nowa podstawa tylko, gdy przerwa obejmuje cały taki miesiąc — `f_gap_shorter_than_calendar_month` | **H** (typowy scenariusz: chorobowy → macierzyński) |
| CONF-007 | APP-DOC-003 | ROZP_DOK ↔ treść zadania | Symbole ZAM/ZUR/ZAO/Z-3b (połączenia od 24.10.2026) pochodzą z zadania; rozporządzenie określa zakres danych | Źródło pozaustawowe | Nazwy formularzy w UI z etykietą „wg informacji ZUS” | L |
| CONF-008 | PAT-ELIG-001 | treść zadania ↔ KP art. 182(3) | Zadanie: ojcowski także dla ojca, który zaczął pracę po narodzinach / gdy matka nieubezpieczona — brak tego w wyciągu KP, ale wynika z braku wymogu ubezpieczenia na dzień porodu | Wywód | DERIVED, MEDIUM | L |

## B. Luki źródłowe (brak przepisu lub danych)

| ID | Opis | Reguły | Założenie / obsługa | Wpływ |
|---|---|---|---|---|
| GAP-001 | **Brak zasad zaokrąglania** kwot (podstawa, dzienna stawka, kwota) | wszystkie CALC | **Zasada rozstrzygnięta (M04, 2026-11-21): zawsze do grosza na każdym etapie** — wdrożenie BE2-09; do tego czasu: Decimal bez zaokrągleń, podgląd HALF_UP 0,01 z assumption | **H** — jury porównuje kwoty z decyzjami ZUS |
| GAP-002 | Brak kwot: świadczenie rodzicielskie (art. 31 ust. 3a), przeciętne wynagrodzenie (art. 46) | RATE-MAT-007, BASE-GEN-002 | **Świadczenie rodzicielskie rozstrzygnięte (M10, 2026-11-21): 1000 zł/mies.**, RATE-MAT-007 aktywna (niepełny miesiąc proporcjonalnie do dni danego miesiąca — M10c). Przeciętne wynagrodzenie (art. 46) — nadal `null` → BLOCKED | M |
| GAP-003 | KP definiuje „tydzień = 7 dni” tylko dla macierzyńskiego i na warunkach macierzyńskiego | wszystkie DUR | 7 dni także dla pozostałych (DERIVED) | L |
| GAP-004 | Brak definicji liczenia „przerwy” i granic okresów | SICK-ELIG-004, SICK-DUR-003, MAT-DUR-003 | Konwencje C3, C5, C8 w 07 | M |
| GAP-005 | „Do 7/10/14 roku życia” — włącznie z dniem urodzin? | MAT-ELIG-002/003, MAT-DUR-007, PAR-COND-001 | **ROZSTRZYGNIĘTE (M14 c, 2026-11-21):** „do dnia urodzin” — `age < N`, ostatni dzień = dzień przed urodzinami granicznymi (C7) | M |
| GAP-006 | Okres zasiłkowy, gdy niezdolność zaczęła się przed ciążą i trwa w ciąży | SICK-DUR-001 | NEEDS_REVIEW, gdy `pregnancy_start_date` w trakcie niezdolności | L |
| GAP-007 | Data początku ciąży i liczenie „trzeciego miesiąca ciąży” (KP 177 § 3) | MAT-CLS-002, f_title_ended_during_pregnancy | **ROZSTRZYGNIĘTE (M13, 2026-11-21, mentor fachowy):** miesiąc ciąży stwierdza lekarz — data początku ciąży z zaświadczenia lekarskiego; przedłużenie potwierdza dokument. MAT-CLS-002 ACTIVE (koniec umowy ≥ początek + 3 mies.) | M |
| GAP-008 | Limit 33/14 dni — łącznie u wszystkich pracodawców w roku czy u danego? | SICKPAY-ELIG-001 | Wejście `employer_sick_pay_days_in_year` wprost z Z-3 (zał. 2 pkt 9) | L |
| GAP-009 | Wskaźnik waloryzacji podstawy świadczenia rehabilitacyjnego | REHAB-RATE-001 | Kwota rehabilitacyjnego poza MVP | L |
| GAP-010 | Numeracja „5.–28. dnia po porodzie” — dzień porodu = 0 czy 1? | SUPP-ELIG-003 | **ROZSTRZYGNIĘTE (M15 a, 2026-11-21, mentor fachowy):** dzień porodu = dzień 1 (ASSUMPTION-SUPP-DAY1) | M |
| GAP-011 | Liczenie miesięcy (art. 2a ust. 2 — 6 mies.; art. 7 pkt 2 — 3 mies.): kalendarzowe vs 30 dni | GEN-EXCL-002, SICK-ELIG-006 | Miesiące kalendarzowe; art. 11 ust. 5 (30 dni) — tylko zasiłek chorobowy | L |
| GAP-012 | Wieloraczki z częściowym zgonem — od kiedy zmienia się wymiar | MAT-DUR-005 | BLOCKED | L |
| GAP-013 | Pełna definicja „członka najbliższej rodziny” (art. 29 ust. 5) | MAT-SHARE-002..005 | Rola z wejścia, bez weryfikacji | L |
| GAP-014 | Prawo do rodzicielskiego po zgonie dziecka w trakcie urlopu | PAR-ELIG-001 | Warunek `f_child_alive_on` (start); zgon w trakcie → NEEDS_REVIEW | M (tryb wrażliwy) |
| GAP-015 | „Za życiem” przy wieloraczkach — wystarczy jedno dziecko? | PAR-DUR-002 | Flaga na poziomie porodu (`children.za_zyciem_certificate`) | L |
| GAP-016 | 9 tyg. nieprzenoszalne, gdy drugi rodzic nie ma tytułu do ubezpieczenia | PAR-SHARE-001 | NEEDS_REVIEW przy `mother/father.sickness_insured = false` | M |
| GAP-017 | Liczba części rodzicielskiego — łącznie dla obojga rodziców? | PAR-COND-001 | Łącznie (DERIVED) | M |
| GAP-018 | Łączenie pobierania zasiłku z pracą u **niepracowników** | PAR-WORK-001 | NEEDS_REVIEW | M |
| GAP-019 | Art. 31 ust. 3g („pierwszy rok życia”) przy przyjęciu dziecka starszego niż 1 rok | RATE-MAT-005 | NEEDS_REVIEW dla ADOPTION/FOSTER, gdy dziecko >1 rok | L |
| GAP-020 | Ostatni dzień terminu w dzień wolny (21 dni na wniosek 81,5%) | APP-DL-001 | **ROZSTRZYGNIĘTE (M15 d, 2026-11-21, mentor fachowy):** przesunięcie na następny dzień roboczy (sobota, niedziela, święta z parametru `PUBLIC_HOLIDAYS` — `zus_rules/public_holidays.yaml`, lata 2026–2031, lista zespołu do potwierdzenia) | M |
| GAP-021 | Ustalenie „wynagrodzenia dla nowego wymiaru czasu pracy” przy składnikach zmiennych | BASE-EMP-005 | BLOCKED | M |
| GAP-022 | Tabela minimalnych podstaw 2026 w Załączniku jest pusta | BASE-EMP-008 | **ROZSTRZYGNIĘTE (M07 + M07a, 2026-11-21, mentor fachowy):** 4806 × 0,8629 = 4147,0974 → zaokrąglenie do groszy = **4147,10 zł** (`f_minimum_base`, `MIN_BASE_ROUNDING_STEP`) | M |
| GAP-023 | Brak wartości najniższej podstawy wymiaru składek (ustawa o s.u.s.) | BASE-NEMP-002/003 | **Częściowo rozstrzygnięte (M08, 2026-11-21, mentor fachowy):** 2026 — 5652,00 zł, preferencyjna 1441,80 zł przez 24 mies. od założenia działalności; limit dobrowolnego chorobowego 23 550 zł potwierdzony. Wejście per miesiąc (z danych ZUS — symulacja) zostaje źródłem dla konkretnego miesiąca; wartości 2027 — brak | **H** → M dla JDG |
| GAP-024 | Poronienie a martwe urodzenie: KP 180(1) mówi o „urodzeniu martwego dziecka”, ROZP_DOK § 13 ust. 1 pkt 2 dopuszcza zaświadczenie o martwym urodzeniu „bez względu na czas trwania ciąży”; definicji martwego urodzenia brak w materiałach | MAT-DUR-003 | Decyduje dokument: zaświadczenie o martwym urodzeniu → `stillborn=true` → 8 tyg.; brak zaświadczenia → NEEDS_REVIEW. Pkt i zadania (poronienie) — tryb wrażliwy + organizacje wsparcia **Potwierdzone (M15 b, 2026-11-21):** zaświadczenie o martwym urodzeniu wystarcza | M |
| GAP-025 | Termin wniosku o część urlopu macierzyńskiego przed porodem (≥14 dni przed rozpoczęciem) — tylko w Poradniku ZUS 2026, brak w wyciągu KP (art. 180 § 2); niejasne, czy dotyczy wniosku urlopowego czy zasiłkowego i niepracowników | APP-DL-002 | Termin informacyjny tylko dla pracownicy (`LEAVE_APP_MATERNITY_PRE_BIRTH`, parametr UNCONFIRMED, D31); pytanie M19 | L |

## C. Pytania prawne do mentorów (wpływ na reguły)

| ID | Pytanie | Reguły zależne |
|---|---|---|
| Q-LEG-01 | Czy potwierdzają brak okresu wyczekiwania dla zasiłku macierzyńskiego (dobrowolne chorobowe JDG zgłoszone np. 30 dni przed porodem)? — **odpowiedź M12 a: brak okresu wyczekiwania** | MAT-CLS-001 |
| Q-LEG-02 | Czy ojciec musi podlegać ubezpieczeniu chorobowemu w dniu rozpoczęcia swojej części rodzicielskiego, czy w dniu porodu? — **odpowiedź M12 b: w dniu startu swojej części rodzicielskiego** | PAR-ELIG-001, PAR-SHARE-003 |
| Q-LEG-03 | Jaką stawkę otrzymuje ojciec za część rodzicielskiego (poza 9 tyg.) przy wniosku 81,5% złożonym przez matkę? — **odpowiedź M11: 81,5%** (RATE-MAT-008 ACTIVE) | RATE-MAT-008 |
| Q-LEG-04 | Interpretacja „przerwy krótszej niż miesiąc kalendarzowy” (art. 43) — **odpowiedź M05: pełny miesiąc kalendarzowy** | BASE-GEN-001 |
| Q-LEG-05 | Zasady zaokrągleń stosowane w decyzjach ZUS (podstawa, stawka dzienna, kwota) — **odpowiedź M04: do grosza na każdym etapie** (BE2-09) | wszystkie CALC |
| Q-LEG-06 | Minimalna podstawa 2026 i kwota świadczenia rodzicielskiego do parametrów | BASE-EMP-008, RATE-MAT-007 |

## D. Przepisy, których nie da się bezpiecznie zautomatyzować

| Przepis | Powód | Obsługa |
|---|---|---|
| USTAWA art. 15 (przestępstwo) | wymaga prawomocnego orzeczenia | HUMAN_REVIEW (SICK-EXCL-005) |
| USTAWA art. 17 (praca/aktywność w czasie zwolnienia, „czynności incydentalne”) | ocena faktów | HUMAN_REVIEW (SICK-EXCL-007) |
| USTAWA art. 18 (rokowanie, orzecznik) | orzeczenie lekarskie | HUMAN_REVIEW (REHAB-ELIG-001) |
| Pozorność umowy, podwyższenie podstawy (pkt H zadania) | ocena ZUS w postępowaniu, brak przepisu w wyciągach | Tylko ostrzeżenia RISK-001/002 |
| USTAWA art. 37 ust. 2 pkt 3 (wynagrodzenia innych pracowników) | brak danych porównawczych | NEEDS_REVIEW |
