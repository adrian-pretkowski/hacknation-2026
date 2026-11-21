# 06 — DECISION TABLES

Oznaczenia: `T` = prawda, `F` = fałsz, `?` = nieznane (UNKNOWN), `–` = bez znaczenia. Wiersze są rozłączne i czytane **od góry** (pierwszeństwo). Każdy wiersz wskazuje regułę, która rozstrzyga.

## DT-1. Pracownik niezdolny do pracy — wynagrodzenie czy zasiłek chorobowy (i stawka)

| # | Prawo do zasiłku (SICK-ELIG/EXCL) | Pracownik w dniu niezdolności | Dni wyn. chor. w roku < limit (33 / 14 po roku 50. urodzin) | Ciąża (kod B / deklaracja) | Wynik | Reguły |
|---|---|---|---|---|---|---|
| 1 | F | – | – | – | NOT_ELIGIBLE (ani wynagrodzenie, ani zasiłek) | SICKPAY-EXCL-001 |
| 2 | ? | – | – | – | NEEDS_DATA | C9 |
| 3 | T | T | T | T | Wynagrodzenie chorobowe **100%** (pracodawca) | SICKPAY-ELIG-001, SICKPAY-RATE-002 |
| 4 | T | T | T | F | Wynagrodzenie chorobowe **80%** | SICKPAY-ELIG-001, SICKPAY-RATE-001 |
| 5 | T | T | T | ? | NEEDS_DATA (stawka) | SICKPAY-RATE-002 |
| 6 | T | T | F | T | Zasiłek chorobowy **100%** (FUS) | SICKPAY-TRN-001, SICK-RATE-002 |
| 7 | T | T | F | F | Zasiłek chorobowy **80%** | SICKPAY-TRN-001, SICK-RATE-001 |
| 8 | T | F (zlecenie, JDG) | – | T | Zasiłek **100% od 1. dnia niezdolności** | SICK-RATE-002 |
| 9 | T | F | – | F | Zasiłek **80% od 1. dnia** | SICK-RATE-001 |

## DT-2. Prawo do zasiłku chorobowego

| # | Ubezpieczona w dniu powstania niezdolności | Tryb | Dni ciągłego ubezp. (z doliczeniem przerw ≤30 dni) | Wyjątek art. 4 ust. 3 | Po ustaniu: niezdolność ≥30 dni i ≤14 dni od ustania | Wykluczenie art. 13 | Wynik | Reguły |
|---|---|---|---|---|---|---|---|---|
| 1 | T | – | – | T | – | – | ELIGIBLE | SICK-ELIG-005 |
| 2 | T | MANDATORY | ≥30 | – | – | – | ELIGIBLE | SICK-ELIG-002 |
| 3 | T | VOLUNTARY | ≥90 | – | – | – | ELIGIBLE | SICK-ELIG-003 |
| 4 | T | MANDATORY | <30 | F | – | – | NOT_ELIGIBLE za dni okresu wyczekiwania; prawo od 31. dnia | SICK-ELIG-002 |
| 5 | T | VOLUNTARY | <90 | F | – | – | NOT_ELIGIBLE za dni okresu wyczekiwania; prawo od 91. dnia | SICK-ELIG-003 |
| 6 | T | – | <próg | ? | – | – | NEEDS_DATA (`graduation_date` itd.) | SICK-ELIG-005 |
| 7 | F | – | – | – | T | F | ELIGIBLE (płaci ZUS) | SICK-ELIG-006 |
| 8 | F | – | – | – | T | T | NOT_ELIGIBLE | SICK-EXCL-003 |
| 9 | F | – | – | – | F | – | NOT_ELIGIBLE | SICK-ELIG-006 |
| 10 | – | – | – | – | – | – | +GEN-EXCL-001 (JDG z długiem > 1% min. wyn.) → NOT_ELIGIBLE (zawieszenie) | GEN-EXCL-001 |

## DT-3. Okres zasiłkowy

| # | Ciąża (lub gruźlica / kod D) | Po ustaniu tytułu | Maks. | Reguły |
|---|---|---|---|---|
| 1 | T | – | **270 dni** (limit 91 dni NIE dotyczy) | SICK-DUR-001, SICK-DUR-002 |
| 2 | F | F | 182 dni | SICK-DUR-001 |
| 3 | F | T | 182 dni, ale za okres po ustaniu **≤91 dni** | SICK-DUR-002 |
| 4 | ? | – | NEEDS_DATA | SICK-DUR-001 |

**Sumowanie (art. 9 ust. 2):** przerwa ≤60 dni → sumuj; **wyjątek:** gdy nowa niezdolność jest w ciąży, okresów sprzed przerwy ≤60 dni NIE wlicza się (reset). Przerwa >60 dni → nowy okres zasiłkowy.

## DT-4. Prawo do zasiłku macierzyńskiego z tytułu urodzenia (matka)

| # | Ubezpieczona w dniu porodu | Urlop wychowawczy w dniu porodu | Ustanie w ciąży wskutek: śmierci/upadłości/likwidacji pracodawcy | Ustanie z naruszeniem prawa (prawomocny wyrok) | Umowa terminowa przedłużona do porodu | JDG/współpr./duchowny/marynarz z długiem >1% | Wynik | Płatnik | Reguły |
|---|---|---|---|---|---|---|---|---|---|
| 1 | – | – | – | – | – | T (niespłacony) | NOT_ELIGIBLE (zawieszenie) | – | GEN-EXCL-001 |
| 2 | T | – | – | – | – | F | ELIGIBLE | wg DT-8 | MAT-ELIG-001 |
| 3 | F | T | – | – | – | F | ELIGIBLE | wg DT-8 | MAT-ELIG-001 |
| 4 | F | F | T | – | – | – | ELIGIBLE | ZUS | MAT-ELIG-004 |
| 5 | F | F | – | T | – | – | ELIGIBLE | ZUS | MAT-ELIG-005 |
| 6 | F | F | – | – | T | – | ELIGIBLE | ZUS | MAT-ELIG-006 |
| 7 | F | F | – | – (sprawa w toku) | – | – | NEEDS_REVIEW | – | MAT-ELIG-005 |
| 8 | F | F | – | – | ? (umowa terminowa, brak potwierdzenia) | – | NEEDS_REVIEW | – | MAT-CLS-002 (BLOCKED) |
| 9 | F | F | F | F | F | – | NOT_ELIGIBLE + ostrzeżenie | – | MAT-NEG-001, RISK-003 |

**Brak okresu wyczekiwania** dla zasiłku macierzyńskiego (MAT-CLS-001, DERIVED).
**Przed porodem** (wiersz 4, przyczyny śmierć/upadłość/likwidacja + brak innego zatrudnienia): **zasiłek w wysokości zasiłku macierzyńskiego (100%) do dnia porodu** — MAT-ELIG-007. Naruszenie prawa NIE daje tego świadczenia (CONF-001).

## DT-5. Wymiar zasiłku za okres urlopu macierzyńskiego

| # | Sytuacja | Wymiar | Reguła |
|---|---|---|---|
| 1 | Wszystkie dzieci żyją | 20 / 31 / 33 / 35 / 37 tyg. (1/2/3/4/5+ dzieci) | MAT-DUR-001 |
| 2 | Martwe urodzenie / zgon przed 8. tyg. życia, brak żyjących dzieci | 8 tyg. po porodzie, nie krócej niż 7 dni od zgonu | MAT-DUR-003 |
| 3 | Zgon po 8. tyg. życia, brak żyjących dzieci | do 7 dni od zgonu | MAT-DUR-004 |
| 4 | Wieloraczki, część dzieci zmarła | wymiar wg liczby żyjących (moment zmiany — NEEDS_REVIEW) | MAT-DUR-005 (BLOCKED) |
| 5 | Porzucenie / umieszczenie w pieczy | do dnia porzucenia, min. 8 tyg. po porodzie | MAT-DUR-006 |
| 6 | Przed porodem | maks. 6 tyg. (wliczane do wymiaru) | MAT-DUR-002 |

## DT-6. Stawka zasiłku macierzyńskiego per segment

| # | Segment | Wniosek 81,5% w 21 dni (wnioskodawca) | Segment = 9 tyg. drugiego rodzica | ≥1 dzień rodzicielskiego w 1. roku życia | Rodzic segmentu | Stawka | Reguły |
|---|---|---|---|---|---|---|---|
| 1 | uzupełniający / ojcowski / zastępstwo za hospitalizowaną matkę | – | – | – | – | **100%** | RATE-MAT-001 |
| 2 | macierzyński / na warunkach | F | – | – | – | **100%** | RATE-MAT-001 |
| 3 | macierzyński / na warunkach | T | – | – | wnioskodawca | **81,5%** (+ jednorazowe wyrównanie do 100%, jeśli wiersz 7) | RATE-MAT-003, RATE-MAT-006 |
| 4 | rodzicielski | F | – | – | – | **70%** | RATE-MAT-002 |
| 5 | rodzicielski | T | T | – | drugi rodzic | **70%** | RATE-MAT-004 |
| 6 | rodzicielski | T | F | T | wnioskodawca | **81,5%** | RATE-MAT-003 |
| 7 | rodzicielski | T | F | F | wnioskodawca | **70%** | RATE-MAT-005 |
| 8 | rodzicielski | T | F | – | ojciec (część dzielona) | **81,5%** (M11) | RATE-MAT-008 |
| 9 | dowolny z pracą ≤½ etatu | – | – | – | – | stawka × (1 − wymiar pracy) | PAR-WORK-003 |
| 10 | kwota < świadczenie rodzicielskie | – | – | – | – | podwyższenie do 1000 zł/mies. (M10; niepełny miesiąc — M10c) | RATE-MAT-007 |

Pierwszeństwo: 8 > 7 > 5 > 6/3 > 4/2 > 1; modyfikator 9 stosowany zawsze na końcu.

## DT-7. Uzupełniający urlop macierzyński

| # | Ukończone tyg. ciąży | Najniższa masa urodzeniowa | Hospitalizacja | Okno liczenia | Wymiar | Reguła |
|---|---|---|---|---|---|---|
| 1 | < 28 | – | dowolna | od porodu do końca 15. tyg. | ⌈dni pobytu / 7⌉ | SUPP-ELIG-001 |
| 2 | – | ≤ 1000 g | dowolna | j.w. | j.w. | SUPP-ELIG-001 |
| 3 | 28–36 | > 1000 g | dowolna | od porodu do końca 8. tyg. | ⌈dni / 7⌉ | SUPP-ELIG-002 |
| 4 | ≥ 37 | – | ≥2 kolejne dni, pierwszy w dniach 5–28 | od 5. dnia do końca 8. tyg. | ⌈dni / 7⌉ | SUPP-ELIG-003 |
| 5 | ≥ 37 | – | brak pobytu spełniającego warunek | – | 0 | SUPP-ELIG-003 |

Wieloraczki: wariant wg masy najlżejszego dziecka, dni wg najdłużej hospitalizowanego (SUPP-CALC-001). Jeden rodzic, jednorazowo, bezpośrednio po macierzyńskim (SUPP-COND-001).

## DT-8. Kto wypłaca zasiłek

| # | Tytuł | Po ustaniu ubezpieczenia | Ubezpieczonych u płatnika (30.11 poprz. roku) | Płatnik | Reguła |
|---|---|---|---|---|---|
| 1 | – | T | – | **ZUS** | GEN-CLS-002 |
| 2 | JDG / współpracujący / duchowny / pracodawca zagraniczny | F | – | **ZUS** | GEN-CLS-002 |
| 3 | pracownik / zleceniobiorca | F | ≤ 20 | **ZUS** (płatnik przekazuje dokumenty w 7 dni) | GEN-CLS-002, SICK-DL-001 |
| 4 | pracownik / zleceniobiorca | F | > 20 | **płatnik składek** | GEN-CLS-001 |
| 5 | pracownik / zleceniobiorca | F | ? | NEEDS_DATA (nie wpływa na prawo) | — |

## DT-9. Agregacja statusu świadczenia

| Kolejność | Warunek | Status |
|---|---|---|
| 1 | Zakres sytuacji poza katalogiem (np. zasiłek opiekuńczy, zagranica) | OUT_OF_SCOPE |
| 2 | Wykluczenie potwierdzone (TRUE) przez regułę ACTIVE | NOT_ELIGIBLE |
| 3 | Reguła BLOCKED/HUMAN_REVIEW, której warunki są TRUE lub UNKNOWN, a może zmienić wynik | NEEDS_REVIEW |
| 4 | Którykolwiek obowiązkowy warunek prawa lub wykluczenia = UNKNOWN | NEEDS_DATA |
| 5 | Wszystkie warunki prawa TRUE i wszystkie wykluczenia FALSE | ELIGIBLE |
| 6 | Warunek prawa FALSE (żadna alternatywna podstawa nie TRUE/UNKNOWN) | NOT_ELIGIBLE |

Błędy planu (`validation_error`) trafiają do `plan_errors` i **nie** zmieniają statusu. Dokumenty, terminy i ryzyka nie zmieniają statusu.
