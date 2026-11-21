# 07 — CALCULATION SPEC

Formalna specyfikacja obliczeń i **wszystkich nazwanych funkcji (faktów)**, do których odwołuje się `03_rules.yaml`. Audyt (`tools/build_catalog.py`) sprawdza, czy każdy `f_*` użyty w regułach jest zdefiniowany w tabelach poniżej.

## 0. Konwencje (obowiązują wszystkie funkcje)

| # | Konwencja | Źródło / status |
|---|---|---|
| C1 | Kwoty: `decimal.Decimal`, kontekst precyzji 28, **bez zaokrągleń pośrednich**. Wynik `*_exact`. | Projektowe |
| C2 | Zaokrąglenie kwot wyjściowych: **brak reguły w materiałach** (`ROUNDING_POLICY = null`). Silnik zwraca `amount_exact`; `amount_rounded` tylko, gdy admin ustawi politykę. Do demo: tryb „podgląd” `ROUND_HALF_UP` do 0,01 zł z assumption `ROUNDING_UNCONFIRMED`. | GAP-001 |
| C3 | Daty: `datetime.date`, okresy **domknięte obustronnie** `[from, to]`. Liczba dni = `(to − from).days + 1`. | DERIVED |
| C4 | Tydzień urlopu = 7 dni kalendarzowych. Wprost dla urlopu macierzyńskiego i na warunkach macierzyńskiego; dla rodzicielskiego, ojcowskiego, uzupełniającego — przyjęte analogicznie. | KP 183(1) § 1; GAP-003 |
| C5 | Okres `N tygodni` od dnia `d`: koniec = `d + 7N − 1`. | DERIVED z C3–C4 |
| C6 | Miesiąc przy zasiłku chorobowym = 30 dni (gdy okres oznaczony w miesiącach). Podstawa dzienna = podstawa / 30 — także dla zasiłku macierzyńskiego (art. 47 → art. 36 ust. 3; potwierdzone M09). | USTAWA art. 11 ust. 5, art. 36 ust. 3; M09 |
| C7 | „Ukończenie N lat/miesięcy” = dzień urodzin/miesięcznicy. „Do N roku życia” = **przed** ukończeniem N lat (`age < N`) — „do dnia urodzin” (M14 c). | DERIVED; GAP-005; M14 |
| C8 | „Przerwa nie przekroczyła X dni” = liczba dni kalendarzowych **pomiędzy** dniem końca poprzedniego a dniem początku następnego okresu (bez obu końców) ≤ X. | DERIVED; GAP-004 |
| C9 | Logika trójwartościowa Kleene: `all` = FALSE jeśli któryś FALSE, inaczej UNKNOWN jeśli któryś UNKNOWN; `any` = TRUE jeśli któryś TRUE, inaczej UNKNOWN jeśli któryś UNKNOWN; `not UNKNOWN = UNKNOWN`. Funkcja zwracająca `None` = UNKNOWN. | Wymóg projektu |
| C10 | `operator: in` na polu-liście = część wspólna niepusta. `exists` = wartość ≠ null (pusta lista = istnieje). | 03_rules.yaml meta.dsl |
| C11 | Liczenie „X dni po zdarzeniu” (termin): ostatni dzień = `zdarzenie + X`; termin w sobotę, niedzielę lub święto (`PUBLIC_HOLIDAYS` z `public_holidays.yaml`, 2026–2031) → **następny dzień roboczy** (M15 d). | M15; GAP-020 zamknięty |

## 1. Kolejność obliczeń (pipeline)

1. **Normalizacja** wejścia → `facts` cache (każdy `f_*` liczony raz na ewaluację, memoizacja po argumentach).
2. **Klasyfikacja**: `f_primary_title_type`, `f_is_employee_on`, płatnik (`GEN-CLS-*`).
3. **Wykluczenia ogólne**: `GEN-EXCL-*` (zadłużenie).
4. **Prawo** do świadczenia: grupy `SICK-ELIG/EXCL`, `MAT-ELIG/NEG`, `PAR-ELIG`, `PAT-ELIG`, `SUPP-COND`.
5. **Okres**: `*-DUR-*`, następnie walidacje planu (`validation_error`).
6. **Podstawa**: `BASE-GEN-001` (ponowne użycie) → `BASE-*-00x` (metoda) → `BASE-EMP-008` (minimum) → `BASE-GEN-002` (max, BLOCKED).
7. **Stawka** per segment: `RATE-*` / `SICK-RATE-*` (rozstrzyganie `overrides`, §6).
8. **Kwota**: `f_benefit_amount` per segment.
9. **Dokumenty, terminy, ostrzeżenia** (`*-DOC-*`, `*-DL-*`, `RISK-*`) — INFORMATIONAL, nie zmieniają statusu.

## 2. Kluczowe wzory

| Obliczenie | Wzór | Jednostka | Źródło |
|---|---|---|---|
| Przychód niepracownika (miesiąc) | `gross_contribution_base × (1 − 0,1371)` | PLN | USTAWA art. 3 pkt 4 |
| Wynagrodzenie pracownika (miesiąc) | `brutto × (1 − 0,1371)` — zawsze (M06, CONF-002 zamknięty); pola `*_net` = kwota już po odliczeniu | PLN | USTAWA art. 3 pkt 3; M06 |
| Podstawa pracownika | `Σ wynagrodzeń netto-składkowych w wybranych miesiącach (po uzupełnieniu) / liczba wybranych miesięcy + Σ udziałów okresowych`; okno 12 mies. kalendarzowych, przy krótszym zatrudnieniu — pełne miesiące całego okresu (M06) | PLN/mies. | art. 36 ust. 1-2, 38, 42 |
| Udział kwartalny | `Σ wypłat za 4 kwartały przed miesiącem zdarzenia / 12` | PLN/mies. | art. 42 ust. 2 |
| Udział roczny | `wypłata za rok poprzedni / 12` | PLN/mies. | art. 42 ust. 3 |
| Uzupełnienie składnika zmiennego | `kwota / days_worked × days_required` | PLN | art. 37 ust. 2 pkt 2 |
| Minimum (pełny etat) | `max(base, round_HALF_UP(MIN_WAGE × (1 − 0,1371), 0,01))` = 4147,10 zł w 2026 (M07a) | PLN | art. 45 ust. 1; M07a |
| Art. 48a (zadeklarowana, <12 m-cy) | `avg(min_base_net[m]) + (avg(declared_net[m] − min_base_net[m]) / 12) × n` dla n pełnych miesięcy | PLN | art. 48a ust. 1 |
| Dzienny zasiłek | `base × rate × (1 − work_fraction) / 30` (M09 — potwierdzone) | PLN/dzień | art. 36 ust. 3, 31 ust. 4a, 47 |
| Kwota segmentu | `daily × dni(segment)` | PLN | art. 11 ust. 4, 31 ust. 5 |
| Wyrównanie do 100% | `base × (1 − 0,815) / 30 × dni(macierzyński)` | PLN | art. 31 ust. 4 (DERIVED) |
| Wydłużenie rodzicielskiego | `tygodnie_łączenia × work_fraction` (tyg.) → dni = `floor(7 × wynik)` | tygodnie/dni | KP 182(1f) § 2, § 4 |
| Próg zadłużenia | `MIN_WAGE × 0,01` | PLN | art. 2a ust. 1 |

> Przy art. 48a ust. 1 pkt 2 wyrażenie „iloczyn jednej dwunastej przeciętnej kwoty … i liczby tych miesięcy” zinterpretowano jak w tabeli (DERIVED, confidence HIGH dla struktury, wartości najniższej podstawy — wejście).

## 3. Funkcje — klasyfikacja i ubezpieczenie

| Funkcja | Argumenty | Zwraca | Sposób liczenia | Brak danych | Przypadki graniczne |
|---|---|---|---|---|---|
| `f_primary_title_type` | – | enum title_type | Tytuł ubezpieczenia chorobowego aktywny w dniu zdarzenia; przy wielu — pierwszy z listy priorytetów EMPLOYMENT_CONTRACT > SELF_EMPLOYED > pozostałe | titles puste i nie `titles_confirmed_complete` → None | Wiele tytułów → reguły z art. 62 ust. 4 (P2) |
| `f_is_employee_on` | date | bool | Istnieje tytuł EMPLOYMENT_CONTRACT obejmujący `date` | None | Umowa przedłużona KP 177 § 3 — pracownik do dnia porodu |
| `f_is_employee_title_last` | – | bool | Ostatni zakończony tytuł to EMPLOYMENT_CONTRACT | None | – |
| `f_is_employee_title_for_base` | – | bool | Tytuł, z którego ustala się podstawę, jest pracowniczy | None | – |
| `f_is_employer_payer_title` | – | bool | Tytuł nie jest SELF_EMPLOYED/…COLLABORATOR/CLERGY*/FOREIGN_EMPLOYER | None | – |
| `f_sickness_insured_on` | date | bool | Istnieje tytuł z `sickness_insurance_mode ≠ NONE`, `from ≤ date ≤ to` (to=null → otwarte) | Brak titles → None; `titles_confirmed_complete` i brak pokrycia → False | `date` = dzień ustania tytułu → True (C3) |
| `f_sickness_insurance_mode_on` | date | MANDATORY/VOLUNTARY | Tryb tytułu aktywnego w `date`; przy wielu — MANDATORY ma pierwszeństwo | None | – |
| `f_continuous_sickness_insurance_days` | as_of | int | Łańcuch tytułów kończący się w `as_of`; łączy poprzednie, jeśli przerwa ≤30 dni (C8) lub `gap_reason_before ∈ {CHILDCARE_LEAVE, UNPAID_LEAVE, MILITARY_SERVICE_CONSCRIPT}`; liczba dni od początku łańcucha do dnia **poprzedzającego** `as_of` | None przy luce w danych | Prawo powstaje w 31./91. dniu: `days ≥ 30` w dniu niezdolności |
| `f_prior_mandatory_sickness_insurance_years` | – | Decimal | Suma dni tytułów MANDATORY przed bieżącym łańcuchem / 365 | None | Lata przestępne — 365 (DERIVED) |
| `f_graduate_within_window` | days | bool | `person.graduation_date` istnieje i początek ubezpieczenia ≤ graduation + days | None | – |
| `f_number_of_sickness_titles` | – | int | Liczba tytułów aktywnych w dniu niezdolności | None | – |
| `f_benefit_after_title_end` | – | bool | Niezdolność / zdarzenie przypada po `to` ostatniego tytułu | None | – |
| `f_days_since_title_end` | date | int | `date − to(ostatni tytuł)` w dniach | None | Dzień po ustaniu = 1 |
| `f_months_since_title_end` | date | Decimal | Pełne miesiące kalendarzowe między ustaniem a `date` | None | GAP-011 |
| `f_on_childcare_leave_on` | date | bool | `employment.leaves` zawiera CHILDCARE_LEAVE obejmujący `date` | leaves null → None | – |
| `f_title_ended_during_pregnancy` | – | bool | `pregnancy_start_date ≤ to(ostatni tytuł) < event.date` | None | Data początku ciąży z zaświadczenia lekarskiego (M13; GAP-007 zamknięty) |
| `f_last_title_termination_reason` | – | enum | `termination_reason` ostatniego tytułu | None | – |
| `f_any_art30_basis` | – | bool | OR z warunków MAT-ELIG-004, -005, -006 | Kleene | – |
| `f_planned_title_end_before_due_date` | – | bool | Najpóźniejsze `to` tytułów < `expected_due_date` i brak tytułu otwartego | None | – |
| `f_title_started_during_or_shortly_before_pregnancy` | – | bool | Początek tytułu ≥ `pregnancy_start_date − RISK_WINDOW_DAYS` (parametr projektowy, domyślnie 90; NIE prawny) | None | RISK tylko informacyjnie |
| `f_contract_end_after_third_month_of_pregnancy` | – | bool | `contract_end_date ≥ pregnancy_start_date + 3 miesiące kalendarzowe` (trzeci miesiąc ciąży kończy się dzień wcześniej; data początku ciąży — stwierdzona przez lekarza, M13) | None | M13; GAP-007 zamknięty |
| `f_contribution_base_is_declared` | – | bool | `contribution_base_is_declared` tytułu bieżącego | None | – |
| `f_contribution_base_increase_during_pregnancy` | – | bool | Średnia podstawa w miesiącach ciąży > średnia z 3 mies. przed ciążą × `RISK_INCREASE_FACTOR` (projektowy, domyślnie 1,5) | None | RISK tylko informacyjnie |

## 4. Funkcje — zasiłek chorobowy i wynagrodzenie chorobowe

| Funkcja | Argumenty | Zwraca | Sposób liczenia | Brak danych | Przypadki graniczne |
|---|---|---|---|---|---|
| `f_incapacity_in_pregnancy` | – | bool | TRUE jeśli `'B' ∈ incapacity.codes` lub `pregnancy.is_pregnant_during_incapacity = true`; FALSE tylko gdy `is_pregnant_during_incapacity = false`; inaczej None | None (art. 57 ust. 2) | Brak kodu B ≠ brak ciąży |
| `f_incapacity_continuous_days` | – | int | Dni `[start, end]` bieżącej niezdolności + bezpośrednio przyległych okresów z historii | end null → None | – |
| `f_sick_pay_day_limit` | year | int | 14 jeśli `year > rok(person.birth_date) + 50`, inaczej 33 | birth_date null → None | KP 92 § 5: limit 14 dni od roku **następnego** po ukończeniu 50 lat |
| `f_sick_pay_days_remaining_in_year` | – | int | `max(0, f_sick_pay_day_limit(rok) − employer_sick_pay_days_in_year)` | None | Niezdolność przechodząca przez 31.12 → limit odnawia się 1.01 (podział segmentu) |
| `f_sick_pay_limit_reached_date` | – | date | Dzień, w którym wyczerpuje się limit w bieżącym roku | None | – |
| `f_day_covered_by_retained_pay` | day | bool | Dzień w segmencie wynagrodzenia chorobowego | None | – |
| `f_day_in_excluded_leave` | types | bool | Dzień w `employment.leaves` typu z listy | None | – |
| `f_sickness_benefit_right_exists` | – | bool | Kleene-AND: SICK-ELIG-001∨006, okres wyczekiwania (002/003/005), NOT wykluczeń SICK-EXCL-* i GEN-EXCL-001 | Kleene | – |
| `f_waiting_period_met_during_insurance` | – | bool | Okres wyczekiwania spełniony przed ustaniem tytułu | None | – |
| `f_benefit_period_days_used` | – | int | Sumuje okresy z `sickness_periods` + bieżący: łączy, jeśli przerwa ≤60 dni (C8); **resetuje** łańcuch, gdy po przerwie ≤60 dni nowa niezdolność jest w ciąży, a poprzednia nie (art. 9 ust. 2 zd. 2); pomija dni wyczekiwania i art. 12 ust. 2 | historia null i nie `confirmed_complete` → None | Okresy nachodzące — scal |
| `f_benefit_period_limit_days` | – | int | 270 gdy `f_incapacity_in_pregnancy` lub kod D; 182 gdy oba FALSE | None | Okres mieszany → GAP-006 |
| `f_benefit_period_exhausted` | – | bool | `f_benefit_period_days_used ≥ f_benefit_period_limit_days` | None | – |
| `f_benefit_period_exhausted_before_title_end` | – | bool | Wyczerpanie nastąpiło ≤ dzień ustania tytułu | None | – |
| `f_rehab_rate_schedule` | – | list | Ciąża → [(cały okres, 1,00)]; inaczej [(pierwsze 3 miesiące, 0,90), (reszta, 0,75)]; 3 miesiące = 90 dni (C6, art. 22 → art. 11 ust. 5) | None | Waloryzacja — GAP-009 |

## 5. Funkcje — macierzyński, rodzicielski, ojcowski, uzupełniający

| Funkcja | Argumenty | Zwraca | Sposób liczenia | Brak danych | Przypadki graniczne |
|---|---|---|---|---|---|
| `f_maternity_leave_weeks` | – | int | Tabela `MATERNITY_WEEKS_BY_CHILDREN` wg `count_at_birth` (ADOPTION/FOSTER: `count_at_event`); ≥5 → 37 | None | – |
| `f_children_alive_count` | – | int | Dzieci nie `stillborn` i bez `death_date` ≤ dzień oceny | items null → None | – |
| `f_children_deceased_count` | – | int | count_at_birth − alive | None | – |
| `f_earliest_child_death_age_days` | – | int | `min(death_date − birth_date)`; stillborn → 0 | None | Wiek w dniach 56 = 8 tygodni |
| `f_stillbirth_maternity_end_date` | – | date | `max(birth + 56 − 1, death + 7 − 1)` | None | DERIVED (C3, C5) |
| `f_child_death_maternity_end_date` | – | date | `min(regularny koniec, death + 7 − 1)` | None | – |
| `f_maternity_weeks_surviving` | – | int | Tabela wg liczby żyjących dzieci | – | Reguła BLOCKED (GAP-012) |
| `f_abandonment_end_date` | – | date | `max(abandoned_date − 1, birth + 56 − 1)` | None | – |
| `f_weeks_before_due_date` | – | Decimal | `(expected_due_date − maternity_start_date).days / 7` | None | – |
| `f_has_pre_birth_maternity_segment` | – | bool | Segment MATERNITY_LEAVE z `from < event.date` | None | – |
| `f_mother_maternity_weeks_used_after_birth` | – | Decimal | Dni segmentów MATERNITY_LEAVE matki od dnia porodu / 7 | None | – |
| `f_total_maternity_weeks_planned` | – | Decimal | Suma dni wszystkich segmentów MATERNITY_* / 7 | None | – |
| `f_maternity_like_leave_period` | – | object | `{weeks: tabela wg count_at_event, end: min(start + 7w − 1, dzień przed urodzinami granicznymi)}`; granica 7 (10 przy odroczeniu) dla FOSTER, 14 dla ADOPTION | None | C7 |
| `f_maternity_like_weeks_after_age_cap` | – | Decimal | Tygodnie wynikające z `f_maternity_like_leave_period` po przycięciu — bez podwyższenia do 9 tyg. (M14 a) | None | – |
| `f_child_age_years_on` | date | int | Pełne lata od daty urodzenia dziecka (najstarszego z przyjętych) | None | C7 |
| `f_child_alive_on` | date | bool | Dziecko (którekolwiek) żyje w `date` | None | – |
| `f_parental_leave_weeks` | – | int | BIRTH: 41/43, „Za życiem” 65/67; ADOPTION/FOSTER: 41/43, w przypadku KP 183 § 3 — 38 (Za życiem 62) | None | `za_zyciem` null → None |
| `f_parental_weeks_planned_for_parent` | parent | Decimal | Suma dni segmentów PARENTAL_LEAVE rodzica (bez wydłużenia) / 7 | None | – |
| `f_parental_pool_minus_other_parent_reserved` | – | Decimal | `f_parental_leave_weeks − 9` | None | – |
| `f_total_parental_weeks_planned` | – | Decimal | Suma dni segmentów PARENTAL obu rodziców / 7 − wydłużenie z `f_parental_extension` | None | Jednoczesne korzystanie zużywa pulę podwójnie |
| `f_parental_parts_count` | – | int | Liczba rozłącznych ciągów segmentów PARENTAL (łącznie obu rodziców; segment rodzica = osobna część) | None | GAP-017 |
| `f_parental_last_day_after_limit` | – | bool | Ostatni dzień > 31.12 roku, w którym dziecko kończy 6 lat (ADOPTION: > dzień przed 14. urodzinami) | None | – |
| `f_has_work_in_parental` | – | bool | Którykolwiek segment PARENTAL z `work_fraction > 0` | None | – |
| `f_max_work_fraction_in_parental` | – | Decimal | max(work_fraction) | 0 | – |
| `f_segment_work_fraction` | – | Decimal | work_fraction bieżącego segmentu | 0 | – |
| `f_one_minus_work_fraction` | – | Decimal | `1 − f_segment_work_fraction` | – | – |
| `f_parental_extension` | – | object | `{weeks: Σ(tyg_łączenia × work_fraction), days: floor(7 × weeks)}`, przycięte do capów 82/86/130/134 | None | KP 182(1f) § 4 — niepełny dzień pomija się |
| `f_paternity_window` | – | object | `{max_days: 14, deadline: birth + 12 mies. − 1 dzień}`; adopcja: `min(adoption_final + 12 mies. − 1, dzień przed 14. urodzinami)` | None | – |
| `f_paternity_within_deadline` | – | bool | Wszystkie segmenty PATERNITY ≤ deadline, ≤2 części, każda ≥7 dni, Σ ≤14 dni | None | – |
| `f_min_birth_weight_g` | – | int | min(birth_weight_g) dzieci z porodu | None | – |
| `f_weight_at_most_threshold` | – | bool | `birth.weight_at_most_threshold`, gdy podane (odpowiedź z kreatora, FE1-05); inaczej `f_min_birth_weight_g ≤ SUPP_WEIGHT_THRESHOLD_G` | None | Wybiera wariant SUPP-ELIG-001 (true) / -002 (false); brak obu → NEEDS_DATA `birth.weight_at_most_threshold` |
| `f_has_qualifying_late_hospital_stay` | – | bool | Istnieje pobyt ≥2 kolejne dni, którego pierwszy dzień ∈ [dzień 5, dzień 28] po porodzie (dzień porodu = dzień 1 → [poród + 4, poród + 27]) | None | M15 a; ASSUMPTION-SUPP-DAY1, GAP-010 zamknięty |
| `f_supplementary_leave_weeks` | cap_week, window_start_day | int | Dla dziecka najdłużej hospitalizowanego: suma dni pobytu w oknie `[birth + window_start_day − 1, birth + 7·cap_week − 1]` — `window_start_day` = numer dnia, dzień porodu = 1 (M15 a; SUPP-ELIG-001/002: 1, SUPP-ELIG-003: 5); `ceil(dni / 7)` | None | Wieloraczki: masa najlżejszego wybiera wariant, pobyt najdłuższy wyznacza dni (KP 180(2) § 2) |
| `f_maternity_benefit_eligible_any_parent` | – | bool | Którykolwiek rodzic ELIGIBLE w MAT-ELIG-* | Kleene | – |
| `f_supplementary_claimants_count` | – | int | Liczba rodziców z segmentem SUPPLEMENTARY | 0 | – |

## 6. Funkcje — stawki, wnioski, kwoty

| Funkcja | Argumenty | Zwraca | Sposób liczenia | Brak danych | Przypadki graniczne |
|---|---|---|---|---|---|
| `f_combined_application_deadline` | – | date | `next_working_day(event.date + 21)` (ADOPTION: późniejsza z dat przyjęcia i wniosku do sądu + 21) | None | C11, M15 d |
| `f_combined_application_within_deadline` | – | bool | `combined_815_filed_date ≤ f_combined_application_deadline`; FORECAST: `combined_815_planned` | None | Dzień 21 → TRUE |
| `f_segment_belongs_to_applicant_of_combined` | – | bool | Segment należy do rodzica, który złożył wniosek 81,5% (matka przy BIRTH) | None | Ojciec → RATE-MAT-008 (BLOCKED) |
| `f_segment_is_other_parent_reserved_9w` | – | bool | `segment.is_other_parent_reserved_9w`, a jeśli null: pierwsze 9 tygodni PARENTAL rodzica ≠ wnioskodawca 81,5% | None | – |
| `f_any_parental_day_in_first_year` | – | bool | Którykolwiek dzień PARENTAL < 1. urodziny dziecka | None | GAP-019 |
| `f_benefit_base` | – | Decimal | `manual_base_override` jeśli podano; inaczej `BASE-GEN-001` (reuse) albo metoda BASE-* | None (brak daty początku zasiłku przy historii → braki z `f_gap_shorter_than_calendar_month`) | Wynik `base.source`: MANUAL / REUSED_PREVIOUS |
| `f_benefit_base_employee` | – | Decimal | §2 „Podstawa pracownika” na miesiącach z `f_base_months_selection_employee` | None | – |
| `f_benefit_base_non_employee` | – | Decimal | Średnia przychodów z `f_base_months_selection_non_employee` | None | – |
| `f_base_months_selection_employee` | – | list | 12 (lub mniej — pełne) miesięcy przed miesiącem zdarzenia; wyłącz `days_worked < days_required/2` (absence justified); jeśli wszystkie by wypadły → wszystkie po uzupełnieniu (art. 38 ust. 3) | None | `days_*` null → None |
| `f_base_months_selection_non_employee` | – | list | Jak wyżej; kryterium `activity_days_non_employee < dni_miesiąca/2` (art. 50) | None | – |
| `f_full_months_of_continuous_insurance` | – | int | Pełne miesiące kalendarzowe w łańcuchu ciągłego ubezpieczenia przed miesiącem zdarzenia, max 12 | None | Miesiąc rozpoczęcia od 1. dnia = pełny |
| `f_base_first_month_employee` | – | Decimal | art. 37 ust. 2 pkt 1 (stałe) / pkt 2 (przeliczenie); pkt 3 → None + NEEDS_REVIEW | None | – |
| `f_base_first_month_non_employee` | – | Decimal | art. 49 ust. 1 pkt 1-2 | None | – |
| `f_base_declared_short_insurance` | – | Decimal | §2 art. 48a | `minimum_contribution_base_by_month` null → None | GAP-023 |
| `f_periodic_components_monthly_share` | – | Decimal | §2 udział kwartalny + roczny | Brak list → 0 tylko gdy Z-3 kompletne | – |
| `f_filter_excluded_components` | – | list | Odrzuć `retained_during_benefit = true` | null → NEEDS_REVIEW | – |
| `f_minimum_base` | – | Decimal | `MIN_WAGE × (1 − CONTRIBUTION_DEDUCTION_RATE)` zaokrąglone ROUND_HALF_UP do `MIN_BASE_ROUNDING_STEP` (0,01) | None | M07a: 4147,10 zł |
| `f_apply_minimum_base` | – | Decimal | `max(base, f_minimum_base)` (§2 minimum) | None | M07, M07a |
| `f_base_after_working_time_change` | – | – | — | — | Reguła BLOCKED (GAP-021) |
| `f_working_time_change_in_base_window` | – | bool | `working_time_change_date` ∈ [początek okna 12 m-cy, koniec miesiąca zdarzenia] | None | – |
| `f_gap_shorter_than_calendar_month` | – | bool | Przerwa = dni pomiędzy `previous_benefit_end_date` a początkiem zasiłku (`base.reference_event_date` → `plan.maternity_start_date` → `event.date`); TRUE ⇔ przerwa nie obejmuje pełnego miesiąca kalendarzowego (1.–ostatni dzień); brak przerwy/nakładanie → TRUE (M05) | None | CONF-006 rozstrzygnięty (M05): 2.02–14.03 (41 dni) → TRUE; 1.02–14.03 → FALSE; macierzyński od 1.02 przed porodem po L4 do 31.01 → TRUE |
| `f_apply_after_title_cap` | – | – | — | — | BLOCKED (GAP-002) |
| `f_benefit_amount` | – | object | Per segment: `daily = base × rate × (1 − wf) / 30`; `total = daily × dni` | None | C1, C2 |
| `f_monthly_maternity_amount` | – | Decimal | `base × rate × (1 − wf)` | None | – |
| `f_raise_to_parental_benefit_floor` | – | object | Gdy `f_monthly_maternity_amount` < `PARENTAL_BENEFIT_FLOOR_MONTHLY`: `total = Σ_miesiące FLOOR × dni segmentu w miesiącu / dni miesiąca` (pełny miesiąc = FLOOR), `daily = total / dni(segment)` (średnia), `monthly = FLOOR`; `work_fraction > 0` → None | None | M10 (1000 zł), M10c (proporcjonalnie do dni danego miesiąca) |
| `f_one_off_equalization` | – | Decimal | §2 wyrównanie | None | – |
| `f_debt_on_right_date_exceeds_threshold` | – | bool | `debt.amount_on_right_date > MIN_WAGE × 0,01` | None | Równe progowi → FALSE („przekraczającą”) |
| `f_debt_fully_repaid` | – | bool | `repaid_in_full_date` istnieje i ≤ as_of | None | – |
| `f_debt_unpaid_beyond_months` | months | bool | Brak spłaty do `right_date + months` (miesiące kalendarzowe) | None | GAP-011 |

## 7. Funkcje — terminy i dokumenty

| Funkcja | Argumenty | Zwraca | Sposób liczenia | Brak danych | Przypadki graniczne |
|---|---|---|---|---|---|
| `f_claim_deadline` | – | date | `ostatni dzień okresu + 6 miesięcy kalendarzowych` | None | ust. 3-4 → info |
| `f_leave_application_deadlines` | – | list | Per segment: start − 21 (rodzicielski, łączenie), start − 14 (część macierzyńskiego dla ojca), start − 7 (ojcowski), koniec_macierzyńskiego − 21 (uzupełniający), powrót − 7 (rezygnacja), przyjęcie + 7 (na warunkach macierzyńskiego) | – | KP — patrz APP-DL-002 |
| `f_documents_for_segment` | – | list | Mapa poniżej | – | ROZP_WN § 22 — dokumenty w aktach osobowych pomija się |

**Mapa dokumentów `f_documents_for_segment`** (ROZP_DOK; dla pracowników — także ROZP_WN):

| Segment | Dokumenty | Podstawa |
|---|---|---|
| PARENTAL_LEAVE (ten sam rodzic co wcześniej) | oświadczenie o planach drugiego rodzica; zaśw. pracodawcy o urlopie i wymiarze pracy (gdy płaci ZUS); wniosek przed startem (niepracownik); oświadczenie o wcześniejszych częściach/stawkach | ROZP_DOK § 29 |
| PARENTAL_LEAVE (drugi rodzic) | j.w. + zaśw. płatnika o okresie/stawce drugiego rodzica; akt urodzenia (gdy płatnik nie-ZUS) / dokumenty przysposobienia lub rodziny zastępczej | ROZP_DOK § 30 |
| PARENTAL_LEAVE (ojciec, matka bez tytułu) | akt urodzenia; zaśw. pracodawcy; wniosek; oświadczenie o braku tytułu matki | ROZP_DOK § 32 |
| PATERNITY_LEAVE | akt urodzenia / postanowienie o przysposobieniu; oświadczenie o pobraniu z innego tytułu; wniosek (niepracownik) | ROZP_DOK § 33; ROZP_WN § 17 |
| SUPPLEMENTARY_MATERNITY_LEAVE | oświadczenie o braku zamiaru drugiego rodzica; zaśw. pracodawcy (gdy ZUS płaci); wniosek przed końcem macierzyńskiego (niepracownik); zaświadczenie szpitala | ROZP_DOK § 26-27; KP 180(2) § 5 |
| MATERNITY_LEAVE_TRANSFERRED | akt urodzenia; zaśw. płatnika o okresie i stawce zasiłku matki; (zgon/porzucenie — oświadczenie) | ROZP_DOK § 20 |

## 8. Parametry bez wartości (blokują automatyzację)

| Parametr | Używany przez | Skutek |
|---|---|---|
| `ROUNDING_POLICY` | wszystkie kwoty | `amount_rounded = null` + assumption |
| ~~`PARENTAL_BENEFIT_FLOOR_MONTHLY`~~ — 1000,00 zł (M10, 2026-11-21), status CONFIRMED | RATE-MAT-007 (ACTIVE) | podwyższenie liczone automatycznie |
| `AVERAGE_WAGE_CAP_AFTER_TITLE` | BASE-GEN-002 | BLOCKED |
| ~~`MIN_WAGE_2026_MONTHLY`~~ — potwierdzona 4806,00 zł (M07, 2026-11-21), status CONFIRMED | BASE-EMP-008, GEN-EXCL-001 | bez assumption `MIN_WAGE_FROM_ATTACHMENT` |
| najniższa podstawa składek (wejście per miesiąc) — 2026: `JDG_MIN_CONTRIB_BASE_2026` 5652,00 zł, preferencyjna `JDG_PREFERENTIAL_CONTRIB_BASE_2026` 1441,80 zł przez `JDG_PREFERENTIAL_MONTHS` od założenia działalności (M08); 2027 — brak wartości | BASE-NEMP-002/003 | NEEDS_DATA gdy brak wejścia; parametry 2026 = podpowiedź w kreatorze / symulacji danych ZUS, nie domyślna wartość silnika (preferencja zależy od wyboru płatnika) |
