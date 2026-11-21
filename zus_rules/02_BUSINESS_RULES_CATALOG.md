# 02 - BUSINESS RULES CATALOG

> **Plik generowany** z `03_rules.yaml` (v0.1.0, data referencyjna 2026-11-21) przez `tools/build_catalog.py`. Nie edytować ręcznie.

Liczba reguł: **120**. Status `evaluation`: ACTIVE - wykonywana automatycznie; BLOCKED - zwraca NEEDS_REVIEW; HUMAN_REVIEW - przesłanka oceniana przez człowieka; FUTURE - jeszcze nie obowiązuje; INFORMATIONAL - dokumenty/terminy/ostrzeżenia.

## Indeks

| ID | Nazwa | Typ | Prio | Eval | Pewność | Interpretacja | Testy |
|---|---|---|---|---|---|---|---|
| [GEN-CLS-001](#gen-cls-001) | Płatnik zasiłku - płatnik składek (>20 ubezpieczonych) | CLASSIFICATION | P0 | ACTIVE | HIGH | DIRECT | 3 |
| [GEN-CLS-002](#gen-cls-002) | Płatnik zasiłku - ZUS | CLASSIFICATION | P0 | ACTIVE | HIGH | DIRECT | 4 |
| [GEN-EXCL-001](#gen-excl-001) | Zadłużenie składkowe >1% minimalnego wynagrodzenia (osoby z art. 2a) | EXCLUSION | P0 | ACTIVE | HIGH | DIRECT | 6 |
| [GEN-EXCL-002](#gen-excl-002) | Przedawnienie prawa przy niespłaceniu zadłużenia w 6 miesięcy | EXCLUSION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [GEN-DL-001](#gen-dl-001) | Przedawnienie roszczenia o wypłatę zasiłku | DEADLINE | P1 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [GEN-DL-002](#gen-dl-002) | Termin wypłaty zasiłku | DEADLINE | P2 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [SICK-DL-001](#sick-dl-001) | Termin przekazania dokumentów przez małego płatnika do ZUS | DEADLINE | P1 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [APP-DL-002](#app-dl-002) | Terminy wniosków urlopowych pracownika (KP) | DEADLINE | P0 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [SICKPAY-ELIG-001](#sickpay-elig-001) | Wynagrodzenie chorobowe przysługuje pracownikowi | ELIGIBILITY | P0 | ACTIVE | HIGH | DIRECT | 4 |
| [SICKPAY-RATE-001](#sickpay-rate-001) | Wynagrodzenie chorobowe 80% | RATE | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [SICKPAY-RATE-002](#sickpay-rate-002) | Wynagrodzenie chorobowe 100% w ciąży | RATE | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [SICKPAY-EXCL-001](#sickpay-excl-001) | Brak wynagrodzenia chorobowego, gdy brak prawa do zasiłku | EXCLUSION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [SICKPAY-TRN-001](#sickpay-trn-001) | Przejście z wynagrodzenia chorobowego na zasiłek chorobowy | CLASSIFICATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SICK-ELIG-001](#sick-elig-001) | Niezdolność do pracy powstała w czasie ubezpieczenia chorobowego | ELIGIBILITY | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SICK-ELIG-002](#sick-elig-002) | Okres wyczekiwania 30 dni - ubezpieczenie obowiązkowe | ELIGIBILITY | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SICK-ELIG-003](#sick-elig-003) | Okres wyczekiwania 90 dni - ubezpieczenie dobrowolne | ELIGIBILITY | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SICK-ELIG-004](#sick-elig-004) | Doliczanie poprzednich okresów ubezpieczenia | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 3 |
| [SICK-ELIG-005](#sick-elig-005) | Zasiłek od pierwszego dnia ubezpieczenia (wyjątki od okresu wyczekiwania) | EXCLUSION | P1 | ACTIVE | HIGH | DIRECT | 1 |
| [SICK-ELIG-006](#sick-elig-006) | Zasiłek chorobowy po ustaniu tytułu ubezpieczenia | ELIGIBILITY | P1 | ACTIVE | HIGH | DIRECT | 3 |
| [SICK-EXCL-001](#sick-excl-001) | Brak zasiłku za okres zachowania prawa do wynagrodzenia | EXCLUSION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [SICK-EXCL-002](#sick-excl-002) | Brak zasiłku w czasie urlopu bezpłatnego, wychowawczego, aresztu, opiekuńczego | EXCLUSION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [SICK-EXCL-003](#sick-excl-003) | Wyłączenia zasiłku za okres po ustaniu tytułu | EXCLUSION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [SICK-EXCL-004](#sick-excl-004) | Brak zasiłku po ustaniu tytułu, gdy ubezpieczenie ustało po wyczerpaniu zasiłku | EXCLUSION | P2 | ACTIVE | HIGH | DIRECT | 0 |
| [SICK-EXCL-005](#sick-excl-005) | Niezdolność spowodowana umyślnym przestępstwem/wykroczeniem | EXCLUSION | P2 | HUMAN_REVIEW | HIGH | DIRECT | 0 |
| [SICK-EXCL-006](#sick-excl-006) | Nadużycie alkoholu - brak zasiłku za pierwsze 5 dni (kod C) | EXCLUSION | P2 | ACTIVE | HIGH | DIRECT | 0 |
| [SICK-EXCL-007](#sick-excl-007) | Utrata zasiłku - praca zarobkowa lub aktywność niezgodna z celem zwolnienia | EXCLUSION | P1 | HUMAN_REVIEW | HIGH | DIRECT | 0 |
| [SICK-DUR-001](#sick-dur-001) | Okres zasiłkowy - 182 dni, w ciąży 270 dni | DURATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SICK-DUR-002](#sick-dur-002) | Limit 91 dni po ustaniu tytułu (nie dotyczy ciąży) | DURATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [SICK-DUR-003](#sick-dur-003) | Sumowanie okresów niezdolności do jednego okresu zasiłkowego | CALCULATION | P0 | ACTIVE | MEDIUM | DERIVED | 2 |
| [SICK-DUR-004](#sick-dur-004) | Dni okresu wyczekiwania i okresy wyłączone nie wliczają się do okresu zasiłkowego | CALCULATION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [SICK-DUR-005](#sick-dur-005) | Jeden okres zasiłkowy niezależnie od liczby tytułów (od 2027-01-01) | CALCULATION | P2 | FUTURE | HIGH | DIRECT | 1 |
| [SICK-RATE-001](#sick-rate-001) | Zasiłek chorobowy 80% | RATE | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SICK-RATE-002](#sick-rate-002) | Zasiłek chorobowy 100% - ciąża, wypadek w drodze, dawstwo | RATE | P0 | ACTIVE | HIGH | DIRECT | 3 |
| [SICK-CALC-001](#sick-calc-001) | Kwota zasiłku chorobowego za dzień i okres | CALCULATION | P0 | ACTIVE | MEDIUM | DERIVED | 1 |
| [SICK-DOC-001](#sick-doc-001) | Dokumenty - zasiłek chorobowy (e-ZLA, zaświadczenie płatnika) | DOCUMENT_REQUIREMENT | P0 | INFORMATIONAL | MEDIUM | DERIVED | 0 |
| [SICK-DOC-002](#sick-doc-002) | Dokumenty - zasiłek chorobowy po ustaniu tytułu | DOCUMENT_REQUIREMENT | P1 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [REHAB-ELIG-001](#rehab-elig-001) | Świadczenie rehabilitacyjne po wyczerpaniu zasiłku | ELIGIBILITY | P1 | HUMAN_REVIEW | HIGH | DIRECT | 0 |
| [REHAB-EXCL-001](#rehab-excl-001) | Wyłączenia świadczenia rehabilitacyjnego | EXCLUSION | P2 | ACTIVE | HIGH | DIRECT | 0 |
| [REHAB-DUR-001](#rehab-dur-001) | Świadczenie rehabilitacyjne - maksymalnie 12 miesięcy | DURATION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [REHAB-RATE-001](#rehab-rate-001) | Wysokość świadczenia rehabilitacyjnego (90% / 75% / 100% w ciąży) | RATE | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [REHAB-DOC-001](#rehab-doc-001) | Dokumenty - świadczenie rehabilitacyjne | DOCUMENT_REQUIREMENT | P2 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [MAT-ELIG-001](#mat-elig-001) | Zasiłek macierzyński - urodzenie dziecka w czasie ubezpieczenia lub urlopu wychowawczego | ELIGIBILITY | P0 | ACTIVE | HIGH | DIRECT | 6 |
| [MAT-ELIG-002](#mat-elig-002) | Zasiłek macierzyński - przyjęcie dziecka do 14 lat i wniosek o przysposobienie | ELIGIBILITY | P0 | ACTIVE | MEDIUM | DERIVED | 3 |
| [MAT-ELIG-003](#mat-elig-003) | Zasiłek macierzyński - rodzina zastępcza niezawodowa (dziecko do 7/10 lat) | ELIGIBILITY | P0 | ACTIVE | MEDIUM | DERIVED | 1 |
| [MAT-EXCL-001](#mat-excl-001) | Rodzina zastępcza zawodowa - brak prawa | EXCLUSION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [MAT-ELIG-004](#mat-elig-004) | Zasiłek macierzyński po ustaniu ubezpieczenia - śmierć, upadłość, likwidacja pracodawcy | ELIGIBILITY | P1 | ACTIVE | HIGH | DIRECT | 1 |
| [MAT-ELIG-005](#mat-elig-005) | Zasiłek macierzyński po ustaniu ubezpieczenia - rozwiązanie z naruszeniem prawa | ELIGIBILITY | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [MAT-ELIG-006](#mat-elig-006) | Zasiłek macierzyński po ustaniu - umowa terminowa przedłużona do dnia porodu | ELIGIBILITY | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [MAT-CLS-002](#mat-cls-002) | Przedłużenie umowy terminowej do dnia porodu (KP 177 § 3) | CLASSIFICATION | P1 | ACTIVE | MEDIUM | DERIVED | 1 |
| [MAT-NEG-001](#mat-neg-001) | Brak ubezpieczenia na dzień porodu - brak prawa | EXCLUSION | P0 | ACTIVE | HIGH | DERIVED | 1 |
| [MAT-CLS-001](#mat-cls-001) | Brak okresu wyczekiwania dla zasiłku macierzyńskiego | CLASSIFICATION | P0 | ACTIVE | HIGH | DERIVED | 1 |
| [MAT-DUR-001](#mat-dur-001) | Wymiar urlopu macierzyńskiego wg liczby dzieci | DURATION | P0 | ACTIVE | HIGH | DIRECT | 4 |
| [MAT-DUR-002](#mat-dur-002) | Do 6 tygodni urlopu przed przewidywaną datą porodu | VALIDATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [MAT-DUR-003](#mat-dur-003) | Martwe urodzenie lub zgon dziecka przed 8. tygodniem życia | DURATION | P0 | ACTIVE | HIGH | DIRECT | 3 |
| [MAT-DUR-004](#mat-dur-004) | Zgon dziecka po 8. tygodniu życia - 7 dni | DURATION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [MAT-DUR-005](#mat-dur-005) | Wieloraczki - zgon części dzieci | DURATION | P2 | BLOCKED | MEDIUM | AMBIGUOUS | 0 |
| [MAT-DUR-006](#mat-dur-006) | Porzucenie dziecka / umieszczenie w pieczy - utrata dalszej części, minimum 8 tygodni | DURATION | P2 | ACTIVE | HIGH | DIRECT | 0 |
| [MAT-DUR-007](#mat-dur-007) | Urlop na warunkach urlopu macierzyńskiego - wymiar i limit wieku dziecka | DURATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [MAT-DUR-008](#mat-dur-008) | 9 tygodni urlopu na warunkach urlopu macierzyńskiego (KP 183 § 3) - bez minimum ponad limit wieku | DURATION | P1 | INFORMATIONAL | MEDIUM | DERIVED | 1 |
| [MAT-DUR-009](#mat-dur-009) | Tydzień urlopu = 7 dni kalendarzowych; dzień porodu jako pierwszy dzień | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [MAT-SHARE-001](#mat-share-001) | Ojciec przejmuje zasiłek macierzyński po ≥14 tygodniach matki | ELIGIBILITY | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [MAT-SHARE-002](#mat-share-002) | Przejęcie po ≥8 tygodniach - matka niezdolna do samodzielnej egzystencji | ELIGIBILITY | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [MAT-SHARE-003](#mat-share-003) | Zasiłek dla ojca na czas hospitalizacji matki (po ≥8 tygodniach) | ELIGIBILITY | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [MAT-SHARE-004](#mat-share-004) | Zgon lub porzucenie dziecka przez ubezpieczoną matkę | ELIGIBILITY | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [MAT-SHARE-005](#mat-share-005) | Matka nieubezpieczona - zgon, porzucenie, niezdolność do samodzielnej egzystencji | ELIGIBILITY | P2 | ACTIVE | HIGH | DIRECT | 0 |
| [MAT-SHARE-006](#mat-share-006) | Matka nieubezpieczona podejmuje zatrudnienie ≥½ etatu | ELIGIBILITY | P2 | BLOCKED | MEDIUM | AMBIGUOUS | 0 |
| [MAT-SHARE-007](#mat-share-007) | Łączny limit - wymiar macierzyńskiego nie może być przekroczony przy przejęciu | VALIDATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [RATE-MAT-001](#rate-mat-001) | 100% - macierzyński, na warunkach macierzyńskiego, uzupełniający, ojcowski | RATE | P0 | ACTIVE | HIGH | DIRECT | 4 |
| [RATE-MAT-003](#rate-mat-003) | 81,5% - wniosek o łączny zasiłek złożony w 21 dni | RATE | P0 | ACTIVE | HIGH | DIRECT | 4 |
| [RATE-MAT-006](#rate-mat-006) | Jednorazowe wyrównanie macierzyńskiego do 100% | CALCULATION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [RATE-MAT-007](#rate-mat-007) | Podwyższenie do kwoty świadczenia rodzicielskiego | CALCULATION | P1 | ACTIVE | MEDIUM | DERIVED | 1 |
| [APP-DL-001](#app-dl-001) | Termin 21 dni na wniosek o zasiłek 81,5% | DEADLINE | P0 | ACTIVE | MEDIUM | DERIVED | 2 |
| [APP-DOC-001](#app-doc-001) | Dokumenty - urlop macierzyński przed porodem | DOCUMENT_REQUIREMENT | P0 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [APP-DOC-002](#app-doc-002) | Dokumenty - urodzenie dziecka (akt urodzenia / martwe urodzenie) | DOCUMENT_REQUIREMENT | P0 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [APP-DOC-003](#app-doc-003) | Dokumenty - wniosek o zasiłek macierzyński do ZUS (zał. 6) / zaświadczenie płatnika | DOCUMENT_REQUIREMENT | P0 | INFORMATIONAL | MEDIUM | DERIVED | 0 |
| [APP-DOC-004](#app-doc-004) | Dokumenty - macierzyński po ustaniu ubezpieczenia / zasiłek w wysokości macierzyńskiego | DOCUMENT_REQUIREMENT | P1 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [APP-DOC-005](#app-doc-005) | Dokumenty - przyjęcie dziecka (przysposobienie / rodzina zastępcza) | DOCUMENT_REQUIREMENT | P0 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [APP-DOC-006](#app-doc-006) | Dokumenty - rodzicielski, ojcowski, uzupełniający, przejęcie przez ojca | DOCUMENT_REQUIREMENT | P1 | INFORMATIONAL | HIGH | DIRECT | 0 |
| [CALC-MAT-001](#calc-mat-001) | Kwota zasiłku macierzyńskiego za segment | CALCULATION | P0 | ACTIVE | HIGH | DERIVED | 3 |
| [MAT-ELIG-007](#mat-elig-007) | Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu | ELIGIBILITY | P1 | ACTIVE | MEDIUM | DERIVED | 2 |
| [SUPP-ELIG-001](#supp-elig-001) | Uzupełniający urlop - poród przed 28. tyg. lub masa ≤1000 g | DURATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SUPP-ELIG-002](#supp-elig-002) | Uzupełniający urlop - poród 28–37 tydz. i masa >1000 g | DURATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SUPP-ELIG-003](#supp-elig-003) | Uzupełniający urlop - poród po 37. tyg. i hospitalizacja ≥2 dni od 5.–28. dnia | DURATION | P1 | ACTIVE | MEDIUM | DIRECT | 6 |
| [SUPP-CALC-001](#supp-calc-001) | Uzupełniający urlop - wieloraczki, sumowanie, zaokrąglenie w górę | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [SUPP-COND-001](#supp-cond-001) | Uzupełniający urlop - warunki udzielenia | ELIGIBILITY | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [PAR-DUR-001](#par-dur-001) | Wymiar urlopu rodzicielskiego - 41/43 tygodnie | DURATION | P0 | ACTIVE | HIGH | DIRECT | 4 |
| [PAR-DUR-002](#par-dur-002) | Wymiar urlopu rodzicielskiego - „Za życiem” 65/67 tygodni | DURATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [PAR-DUR-003](#par-dur-003) | Wymiar urlopu rodzicielskiego - przyjęcie dziecka (zastępcza / przysposobienie) | DURATION | P1 | ACTIVE | MEDIUM | DERIVED | 0 |
| [PAR-SHARE-001](#par-share-001) | 9 tygodni urlopu rodzicielskiego nieprzenoszalne dla każdego rodzica | VALIDATION | P0 | ACTIVE | MEDIUM | DERIVED | 4 |
| [PAR-SHARE-002](#par-share-002) | Jednoczesne korzystanie - łączny wymiar nie może przekroczyć puli | VALIDATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [PAR-SHARE-003](#par-share-003) | Ojciec - rodzicielski, gdy matka nie była ubezpieczona w dniu porodu | ELIGIBILITY | P1 | ACTIVE | MEDIUM | DERIVED | 0 |
| [PAR-ELIG-001](#par-elig-001) | Zasiłek za okres urlopu rodzicielskiego - ubezpieczony rodzic | ELIGIBILITY | P0 | ACTIVE | MEDIUM | DERIVED | 2 |
| [PAR-COND-001](#par-cond-001) | Urlop rodzicielski - maks. 5 części, do końca roku, w którym dziecko kończy 6 lat | VALIDATION | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [PAR-WORK-001](#par-work-001) | Łączenie urlopu rodzicielskiego z pracą do ½ etatu | VALIDATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [PAR-WORK-002](#par-work-002) | Proporcjonalne wydłużenie urlopu rodzicielskiego przy pracy | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [PAR-WORK-003](#par-work-003) | Zasiłek zmniejszony proporcjonalnie do wymiaru pracy | RATE | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [RATE-MAT-002](#rate-mat-002) | 70% - urlop rodzicielski (wariant standardowy) | RATE | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [RATE-MAT-004](#rate-mat-004) | 70% - 9 tygodni drugiego rodzica przy wniosku 81,5% | RATE | P0 | ACTIVE | HIGH | DIRECT | 2 |
| [RATE-MAT-005](#rate-mat-005) | 70% za rodzicielski, gdy w 1. roku życia nie wykorzystano ani dnia | RATE | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [RATE-MAT-008](#rate-mat-008) | Stawka dla ojca korzystającego z części rodzicielskiego przy wniosku 81,5% matki | RATE | P1 | ACTIVE | MEDIUM | DERIVED | 1 |
| [PAT-ELIG-001](#pat-elig-001) | Zasiłek za okres urlopu ojcowskiego - ubezpieczony ojciec | ELIGIBILITY | P0 | ACTIVE | MEDIUM | DERIVED | 1 |
| [PAT-DUR-001](#pat-dur-001) | Urlop ojcowski - 2 tygodnie, maks. 2 części ≥1 tydz., do 12 miesięcy życia dziecka | DURATION | P0 | ACTIVE | HIGH | DIRECT | 3 |
| [BASE-EMP-001](#base-emp-001) | Podstawa pracownika - średnia z 12 miesięcy kalendarzowych | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [BASE-EMP-002](#base-emp-002) | Podstawa pracownika - ubezpieczenie krótsze niż 12 miesięcy | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [BASE-EMP-003](#base-emp-003) | Podstawa pracownika - niezdolność w pierwszym miesiącu ubezpieczenia | CALCULATION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [BASE-EMP-004](#base-emp-004) | Miesiące z nieobecnością - wyłączenie (<½ czasu) lub uzupełnienie (≥½ czasu) | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [BASE-EMP-005](#base-emp-005) | Zmiana wymiaru czasu pracy | CALCULATION | P1 | BLOCKED | MEDIUM | AMBIGUOUS | 0 |
| [BASE-EMP-006](#base-emp-006) | Składniki kwartalne i roczne - 1/12 | CALCULATION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [BASE-EMP-007](#base-emp-007) | Składniki wyłączone z podstawy | CALCULATION | P1 | ACTIVE | MEDIUM | DERIVED | 0 |
| [BASE-EMP-008](#base-emp-008) | Minimalna podstawa - płaca minimalna minus 13,71% (pełny etat) | CALCULATION | P0 | ACTIVE | MEDIUM | DIRECT | 1 |
| [BASE-NEMP-001](#base-nemp-001) | Podstawa niepracownika - średni przychód z 12 miesięcy | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 3 |
| [BASE-NEMP-002](#base-nemp-002) | Podstawa przy zadeklarowanej kwocie i ubezpieczeniu <12 miesięcy (art. 48a) | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [BASE-NEMP-003](#base-nemp-003) | Podstawa niepracownika - niezdolność w pierwszym miesiącu | CALCULATION | P1 | ACTIVE | HIGH | DIRECT | 0 |
| [BASE-NEMP-004](#base-nemp-004) | Niepracownik - miesiące z zasiłkiem <½ miesiąca wyłączone | CALCULATION | P0 | ACTIVE | HIGH | DIRECT | 1 |
| [BASE-NEMP-005](#base-nemp-005) | Górna granica podstawy - dobrowolne ubezpieczenie chorobowe | CALCULATION | P1 | ACTIVE | MEDIUM | DERIVED | 0 |
| [BASE-GEN-001](#base-gen-001) | Brak ponownego ustalania podstawy przy przerwie < miesiąca kalendarzowego | CALCULATION | P0 | ACTIVE | HIGH | DERIVED | 6 |
| [BASE-GEN-002](#base-gen-002) | Maksymalna podstawa zasiłku chorobowego po ustaniu tytułu | CALCULATION | P2 | BLOCKED | LOW | INCOMPLETE_SOURCE | 0 |
| [RISK-001](#risk-001) | Ryzyko - umowa / działalność zawarta dla pozoru krótko przed ciążą lub w ciąży | VALIDATION | P1 | INFORMATIONAL | LOW | INCOMPLETE_SOURCE | 0 |
| [RISK-002](#risk-002) | Ryzyko - podwyższenie podstawy wymiaru składek w ciąży | VALIDATION | P1 | INFORMATIONAL | LOW | INCOMPLETE_SOURCE | 0 |
| [RISK-003](#risk-003) | Ryzyko - ustanie ubezpieczenia przed porodem | VALIDATION | P0 | INFORMATIONAL | HIGH | DERIVED | 1 |

## Reguły ogólne - płatnik, zadłużenie, terminy

### GEN-CLS-001

**Płatnik zasiłku - płatnik składek (>20 ubezpieczonych)** - `CLASSIFICATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Zasiłki ustala i wypłaca płatnik składek, który zgłasza do ubezpieczenia chorobowego więcej niż 20 ubezpieczonych (stan na 30 listopada poprzedniego roku), chyba że świadczenie przysługuje po ustaniu ubezpieczenia.

- **Podstawa:** USTAWA - art. 61 ust. 1 pkt 1, ust. 2
- **Fragment:** „płatnicy składek na ubezpieczenie chorobowe, którzy zgłaszają do ubezpieczenia chorobowego powyżej 20 ubezpieczonych”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employer_payer_title` **eq** True
    - `payer.insured_count_on_nov30_prev_year` **gt** PAYER_INSURED_THRESHOLD (=20)
    - `f_benefit_after_title_end` **eq** False
- **Rezultat:** `{"set": {"payer_of_benefit": "CONTRIBUTION_PAYER"}}`
- **Wyjątki:** GEN-CLS-002 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `payer.insured_count_on_nov30_prev_year`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-GEN-001, T-GEN-003, T-GEN-005
- **Uwagi:** f_is_employer_payer_title = tytuł inny niż pozarolnicza działalność/współpraca/duchowny/pracodawca zagraniczny (art. 61 ust. 1 pkt 2 lit. b, c, e).

### GEN-CLS-002

**Płatnik zasiłku - ZUS** - `CLASSIFICATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

ZUS ustala i wypłaca zasiłki gdy płatnik zgłasza ≤20 ubezpieczonych, dla prowadzących pozarolniczą działalność i współpracujących, duchownych, po ustaniu ubezpieczenia oraz przy pracodawcy zagranicznym.

- **Podstawa:** USTAWA - art. 61 ust. 1 pkt 2 lit. a-e
- **Fragment:** „Zakład Ubezpieczeń Społecznych: a) ubezpieczonym, których płatnicy składek zgłaszają ... nie więcej niż 20 ubezpieczonych”
- **Obowiązuje:** od - do -
- **Warunki:**
  - KTÓRYKOLWIEK:
    - `payer.insured_count_on_nov30_prev_year` **lte** PAYER_INSURED_THRESHOLD (=20)
    - `f_primary_title_type` **in** ['SELF_EMPLOYED', 'SELF_EMPLOYED_COLLABORATOR', 'CLERGY', 'FOREIGN_EMPLOYER']
    - `f_benefit_after_title_end` **eq** True
- **Rezultat:** `{"set": {"payer_of_benefit": "ZUS"}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** GEN-CLS-001
- **Dane:** `payer.insured_count_on_nov30_prev_year`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-GEN-002, T-GEN-004, T-GEN-005, T-INT-002
- **Uwagi:** Art. 61 ust. 4 (kontynuacja wypłaty przez ZUS po 31.12) - poza MVP.

### GEN-EXCL-001

**Zadłużenie składkowe >1% minimalnego wynagrodzenia (osoby z art. 2a)** - `EXCLUSION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek chorobowy, świadczenie rehabilitacyjne, macierzyński i opiekuńczy nie przysługują prowadzącym pozarolniczą działalność, współpracującym, duchownym-płatnikom i marynarzom, jeżeli w dniu powstania prawa zadłużenie składkowe przekracza 1% minimalnego wynagrodzenia - do czasu spłaty całości.

- **Podstawa:** USTAWA - art. 2a ust. 1
- **Fragment:** „w razie wystąpienia w dniu powstania prawa do świadczenia zadłużenia ... na kwotę przekraczającą 1 % minimalnego wynagrodzenia ... do czasu spłaty całości zadłużenia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_primary_title_type` **in** ['SELF_EMPLOYED', 'SELF_EMPLOYED_COLLABORATOR', 'CLERGY_SELF_PAYER', 'SEAFARER_ART6_24']
    - `f_debt_on_right_date_exceeds_threshold` **eq** True
    - `f_debt_fully_repaid` **eq** False
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "CONTRIBUTION_DEBT", "set": {"suspended_until_debt_repaid": true}}`
- **Wyjątki:** GEN-EXCL-002 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `debt.amount_on_right_date`, `debt.repaid_in_full_date`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-GEN-006, T-GEN-007, T-GEN-008, T-GEN-009, T-INT-002, T-INT-005
- **Uwagi:** Dotyczy świadczeń z art. 2 pkt 1, 2, 5, 6. Próg = MIN_WAGE × 1% (płaca minimalna 4806,00 zł - potwierdzona, M07). Po spłacie: wypłata w 60 dni (GEN-DL-002). Status 'NOT_ELIGIBLE' z flagą zawieszenia - UI musi pokazać, że po spłacie prawo odżywa.

### GEN-EXCL-002

**Przedawnienie prawa przy niespłaceniu zadłużenia w 6 miesięcy** - `EXCLUSION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Prawo do świadczeń z art. 2a przedawnia się, jeśli zadłużenie nie zostanie uregulowane w ciągu 6 miesięcy od dnia powstania prawa.

- **Podstawa:** USTAWA - art. 2a ust. 2
- **Fragment:** „przedawnia się, jeżeli zadłużenie ... nie zostanie uregulowane w ciągu 6 miesięcy od dnia powstania prawa do świadczenia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_debt_on_right_date_exceeds_threshold` **eq** True
    - `f_debt_unpaid_beyond_months`(months={'param': 'DEBT_REPAYMENT_LIMIT_MONTHS'}) **eq** True
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "RIGHT_EXPIRED_DEBT", "set": {"suspended_until_debt_repaid": false}}`
- **Wyjątki:** - · **Zależy od:** GEN-EXCL-001 · **Ma pierwszeństwo przed:** GEN-EXCL-001
- **Dane:** `debt.amount_on_right_date`, `debt.repaid_in_full_date`, `evaluation.as_of_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Liczenie '6 miesięcy' - miesiące kalendarzowe od dnia powstania prawa (f_add_months). Art. 11 ust. 5 (miesiąc=30 dni) dotyczy zasiłku chorobowego - zastosowanie do art. 2a niepewne, patrz GAP-011.

### GEN-DL-001

**Przedawnienie roszczenia o wypłatę zasiłku** - `DEADLINE` · P1 · AUTOMATABLE · eval: **INFORMATIONAL**

Roszczenie o wypłatę zasiłku chorobowego, macierzyńskiego (i opiekuńczego, wyrównawczego) przedawnia się po 6 miesiącach od ostatniego dnia okresu, za który zasiłek przysługuje; 3 lata przy błędzie płatnika/ZUS.

- **Podstawa:** USTAWA - art. 67 ust. 1, 3, 4
- **Fragment:** „przedawnia się po upływie 6 miesięcy od ostatniego dnia okresu, za który zasiłek przysługuje”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit_period.end_date` **exists** True
- **Rezultat:** `{"compute": "f_claim_deadline", "output": "deadlines.claim_limitation_date"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `benefit_period.end_date` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Ust. 3 (przeszkoda niezależna) i ust. 4 (błąd płatnika) - tylko informacja, ocena przez człowieka.

### GEN-DL-002

**Termin wypłaty zasiłku** - `DEADLINE` · P2 · AUTOMATABLE · eval: **INFORMATIONAL**

Płatnik wypłaca w terminach wypłaty wynagrodzeń, ZUS na bieżąco; nie później niż 30 dni od wyjaśnienia ostatniej okoliczności; przy zadłużeniu (art. 2a) nie później niż 60 dni od spłaty.

- **Podstawa:** USTAWA - art. 64 ust. 1, 3
- **Fragment:** „niepóźniej jednak niż w ciągu 30 dni od dnia wyjaśnienia ostatniej okoliczności niezbędnej do ustalenia prawa do zasiłku”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `evaluation.as_of_date` **exists** True
- **Rezultat:** `{"set": {"info": "PAYMENT_DEADLINE_30_DAYS"}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** - · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### SICK-DL-001

**Termin przekazania dokumentów przez małego płatnika do ZUS** - `DEADLINE` · P1 · AUTOMATABLE · eval: **INFORMATIONAL**

Płatnik zgłaszający ≤20 ubezpieczonych przekazuje do ZUS wniosek/zaświadczenia z dokumentami niezwłocznie, nie później niż w 7 dni od otrzymania.

- **Podstawa:** USTAWA - art. 61b ust. 5
- **Fragment:** „niezwłocznie, niepóźniej niż w terminie 7 dni od dnia ich otrzymania”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `payer.insured_count_on_nov30_prev_year` **lte** PAYER_INSURED_THRESHOLD (=20)
    - `f_is_employer_payer_title` **eq** True
- **Rezultat:** `{"deadline": {"who": "CONTRIBUTION_PAYER", "days": {"param": "PAYER_FORWARD_DAYS"}, "from": "DOCUMENTS_RECEIVED"}}`
- **Wyjątki:** - · **Zależy od:** GEN-CLS-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `payer.insured_count_on_nov30_prev_year` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### APP-DL-002

**Terminy wniosków urlopowych pracownika (KP)** - `DEADLINE` · P0 · AUTOMATABLE · eval: **INFORMATIONAL**

Część macierzyńskiego przed porodem ≥14 dni przed rozpoczęciem (Poradnik ZUS 2026, UNCONFIRMED - GAP-025, M19); rezygnacja z części macierzyńskiego ≥7 dni przed powrotem; wniosek ojca o część macierzyńskiego ≥14 dni; uzupełniający ≥21 dni przed końcem macierzyńskiego; rodzicielski ≥21 dni przed rozpoczęciem; łączenie z pracą ≥21 dni; ojcowski ≥7 dni; na warunkach macierzyńskiego - w 7 dni od przyjęcia, start ≤21 dni.

- **Podstawa:** KP - KP art. 180 § 8-9, 180(2) § 4, 182(1d) § 1, 182(1e) § 2, 182(3) § 2, 183 § 6
- **Fragment:** „na wniosek ... składany przez pracownika rodzica dziecka w terminie niekrótszym niż 21 dni przed rozpoczęciem korzystania z urlopu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employee_on`(date=evaluation.as_of_date) **eq** True
- **Rezultat:** `{"compute": "f_leave_application_deadlines", "output": "deadlines.leave_applications"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Spóźniony wniosek nie odbiera prawa do zasiłku z ustawy, ale wpływa na udzielenie urlopu przez pracodawcę - tylko ostrzeżenie (DERIVED). Ochrona przed zwolnieniem zaczyna się 14/21/7 dni przed urlopem przy wcześniejszym wniosku (KP 177 § 1(1)).


## Wynagrodzenie chorobowe (KP art. 92)

### SICKPAY-ELIG-001

**Wynagrodzenie chorobowe przysługuje pracownikowi** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Za czas niezdolności do pracy wskutek choroby pracownik zachowuje prawo do wynagrodzenia od pracodawcy - łącznie do 33 dni w roku kalendarzowym (14 dni po roku, w którym ukończył 50 lat).

- **Podstawa:** KP - art. 92 § 1 pkt 1, § 5
- **Fragment:** „trwającej łącznie do 33 dni w ciągu roku kalendarzowego, a w przypadku pracownika, który ukończył 50 rok życia - ... do 14 dni”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employee_on`(date=incapacity.start_date) **eq** True
    - `f_sick_pay_days_remaining_in_year` **gt** 0
    - `f_sickness_benefit_right_exists` **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "EMPLOYER_SICK_PAY", "funded_by": "EMPLOYER"}}`
- **Wyjątki:** SICKPAY-EXCL-001 · **Zależy od:** SICK-ELIG-001, SICK-ELIG-002, SICK-ELIG-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `person.birth_date`, `incapacity.start_date`, `benefit_history.employer_sick_pay_days_in_year`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-001, T-SP-003, T-SP-004, T-INT-001
- **Uwagi:** Limit roczny: f_sick_pay_day_limit (33 albo 14 wg KP 92 § 5 - próg 50 lat stosuje się do niezdolności PO roku, w którym pracownik ukończył 50 lat). Liczy się łącznie u danego pracodawcy? - przepis mówi 'w ciągu roku kalendarzowego', patrz GAP-008.

### SICKPAY-RATE-001

**Wynagrodzenie chorobowe 80%** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Wynagrodzenie chorobowe wynosi 80% wynagrodzenia, chyba że przepisy u pracodawcy przewidują więcej.

- **Podstawa:** KP - art. 92 § 1 pkt 1
- **Fragment:** „pracownik zachowuje prawo do 80% wynagrodzenia, chyba że obowiązujące u danego pracodawcy przepisy prawa pracy przewidują wyższe”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** EMPLOYER_SICK_PAY
- **Rezultat:** `{"set": {"rate": {"param": "SICK_PAY_RATE_STD"}}}`
- **Wyjątki:** SICKPAY-RATE-002 · **Zależy od:** SICKPAY-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** - · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-002
- **Uwagi:** Wyższa stawka z regulaminu pracodawcy - pole opcjonalne employment.employer_sick_pay_rate_override.

### SICKPAY-RATE-002

**Wynagrodzenie chorobowe 100% w ciąży** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Za niezdolność przypadającą w czasie ciąży (oraz wypadek w drodze do/z pracy, dawstwo) pracownik zachowuje 100% wynagrodzenia.

- **Podstawa:** KP - art. 92 § 1 pkt 2-3
- **Fragment:** „choroby przypadającej w czasie ciąży - w okresie wskazanym w pkt 1 - pracownik zachowuje prawo do 100% wynagrodzenia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** EMPLOYER_SICK_PAY
    - KTÓRYKOLWIEK:
      - `f_incapacity_in_pregnancy` **eq** True
      - `incapacity.cause` **in** ['COMMUTE_ACCIDENT', 'ORGAN_DONOR']
- **Rezultat:** `{"set": {"rate": {"param": "SICK_PAY_RATE_PREGNANCY"}}}`
- **Wyjątki:** - · **Zależy od:** SICKPAY-ELIG-001 · **Ma pierwszeństwo przed:** SICKPAY-RATE-001
- **Dane:** `incapacity.codes`, `pregnancy.is_pregnant_during_incapacity`, `incapacity.cause` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-001
- **Uwagi:** Kod B może zostać pominięty na wniosek ubezpieczonej (USTAWA art. 57 ust. 2) - brak kodu B ≠ brak ciąży → UNKNOWN, jeśli pregnancy.* nie podano.

### SICKPAY-EXCL-001

**Brak wynagrodzenia chorobowego, gdy brak prawa do zasiłku** - `EXCLUSION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Wynagrodzenie chorobowe nie przysługuje w przypadkach, w których pracownik nie ma prawa do zasiłku chorobowego.

- **Podstawa:** KP - art. 92 § 3 pkt 2
- **Fragment:** „nie przysługuje w przypadkach, w których pracownik nie ma prawa do zasiłku chorobowego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_sickness_benefit_right_exists` **eq** False
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "NO_SICKNESS_BENEFIT_RIGHT"}`
- **Wyjątki:** - · **Zależy od:** SICK-ELIG-001, SICK-ELIG-002, SICK-ELIG-003 · **Ma pierwszeństwo przed:** SICKPAY-ELIG-001
- **Dane:** `insurance.titles`, `incapacity.start_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-006
- **Uwagi:** f_sickness_benefit_right_exists = wynik grupy SICK-ELIG-* i SICK-EXCL-* (bez reguł limitu wynagrodzenia).

### SICKPAY-TRN-001

**Przejście z wynagrodzenia chorobowego na zasiłek chorobowy** - `CLASSIFICATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Po wyczerpaniu 33 (14) dni w roku kalendarzowym pracownikowi przysługuje zasiłek chorobowy; okresy wynagrodzenia chorobowego wlicza się do okresu zasiłkowego.

- **Podstawa:** KP - KP art. 92 § 4; USTAWA art. 12 ust. 1
- **Fragment:** „trwającej łącznie dłużej niż 33 dni ... pracownikowi przysługuje zasiłek chorobowy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employee_on`(date=incapacity.start_date) **eq** True
    - `f_sick_pay_days_remaining_in_year` **eq** 0
- **Rezultat:** `{"set": {"benefit": "SICKNESS_BENEFIT", "segment_split_at": "f_sick_pay_limit_reached_date"}}`
- **Wyjątki:** - · **Zależy od:** SICKPAY-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `benefit_history.employer_sick_pay_days_in_year`, `person.birth_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-005, T-INT-001
- **Uwagi:** Silnik dzieli okres e-ZLA na segment wynagrodzenia chorobowego i segment zasiłku.


## Zasiłek chorobowy (w tym ciąża)

### SICK-ELIG-001

**Niezdolność do pracy powstała w czasie ubezpieczenia chorobowego** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek chorobowy przysługuje ubezpieczonemu, który stał się niezdolny do pracy z powodu choroby w czasie trwania ubezpieczenia chorobowego.

- **Podstawa:** USTAWA - art. 6 ust. 1
- **Fragment:** „przysługuje ubezpieczonemu, który stał się niezdolny do pracy z powodu choroby w czasie trwania ubezpieczenia chorobowego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_sickness_insured_on`(date=incapacity.start_date) **eq** True
    - `incapacity.certificate_present` **eq** True
- **Rezultat:** `{"set": {"sickness_onset_basis": "DURING_INSURANCE"}}`
- **Wyjątki:** SICK-ELIG-006 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles`, `incapacity.start_date`, `incapacity.certificate_present` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-001, T-SICK-012
- **Uwagi:** Dowód niezdolności = zaświadczenie lekarskie e-ZLA (art. 53 ust. 1). Art. 6 ust. 2 (kwarantanna, leczenie odwykowe, dawstwo) - P2.

### SICK-ELIG-002

**Okres wyczekiwania 30 dni - ubezpieczenie obowiązkowe** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przy obowiązkowym ubezpieczeniu chorobowym prawo do zasiłku powstaje po 30 dniach nieprzerwanego ubezpieczenia.

- **Podstawa:** USTAWA - art. 4 ust. 1 pkt 1
- **Fragment:** „po upływie 30 dni nieprzerwanego ubezpieczenia chorobowego - jeżeli podlega obowiązkowo temu ubezpieczeniu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_sickness_insurance_mode_on`(date=incapacity.start_date) **eq** MANDATORY
    - `f_continuous_sickness_insurance_days`(as_of=incapacity.start_date) **gte** WAITING_DAYS_MANDATORY (=30)
- **Rezultat:** `{"set": {"waiting_period_met": true}}`
- **Wyjątki:** SICK-ELIG-005 · **Zależy od:** SICK-ELIG-004 · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles`, `incapacity.start_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-006, T-SICK-004
- **Uwagi:** Niespełnienie (FALSE) i brak wyjątku SICK-ELIG-005 → NOT_ELIGIBLE za dni w okresie wyczekiwania; prawo powstaje od dnia następnego po upływie okresu (f_waiting_period_end_date). Dni te nie wliczają się do okresu zasiłkowego (SICK-DUR-004).

### SICK-ELIG-003

**Okres wyczekiwania 90 dni - ubezpieczenie dobrowolne** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przy dobrowolnym ubezpieczeniu chorobowym (np. JDG, zlecenie) prawo do zasiłku powstaje po 90 dniach nieprzerwanego ubezpieczenia.

- **Podstawa:** USTAWA - art. 4 ust. 1 pkt 2
- **Fragment:** „po upływie 90 dni nieprzerwanego ubezpieczenia chorobowego - jeżeli jest ubezpieczony dobrowolnie”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_sickness_insurance_mode_on`(date=incapacity.start_date) **eq** VOLUNTARY
    - `f_continuous_sickness_insurance_days`(as_of=incapacity.start_date) **gte** WAITING_DAYS_VOLUNTARY (=90)
- **Rezultat:** `{"set": {"waiting_period_met": true}}`
- **Wyjątki:** SICK-ELIG-005 · **Zależy od:** SICK-ELIG-004 · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles`, `incapacity.start_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SICK-001, T-SICK-002
- **Uwagi:** Załącznik/treść zadania: 'zlecenie lub działalność' = dobrowolne. Tryb pobierany z tytułu ubezpieczenia (insurance.titles[].sickness_insurance_mode), NIE wywodzony z rodzaju umowy.

### SICK-ELIG-004

**Doliczanie poprzednich okresów ubezpieczenia** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Do okresu wyczekiwania wlicza się poprzednie okresy ubezpieczenia chorobowego, jeśli przerwa nie przekroczyła 30 dni lub była spowodowana urlopem wychowawczym, bezpłatnym albo czynną służbą wojskową żołnierza niezawodowego.

- **Podstawa:** USTAWA - art. 4 ust. 2
- **Fragment:** „wlicza się poprzednie okresy ubezpieczenia chorobowego, jeżeli przerwa między nimi nie przekroczyła 30 dni lub była spowodowana urlopem wychowawczym, urlopem bezpłatnym”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `insurance.titles` **exists** True
- **Rezultat:** `{"compute": "f_continuous_sickness_insurance_days", "output": "facts.continuous_sickness_insurance_days"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SICK-001, T-SICK-003, T-SICK-004
- **Uwagi:** Przerwa = liczba dni kalendarzowych między dniem ustania a dniem ponownego objęcia, bez obu tych dni (DERIVED, GAP-004).

### SICK-ELIG-005

**Zasiłek od pierwszego dnia ubezpieczenia (wyjątki od okresu wyczekiwania)** - `EXCLUSION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Bez okresu wyczekiwania - absolwenci objęci ubezpieczeniem w 90 dni od ukończenia szkoły/uczelni/szkoły doktorskiej; niezdolność wskutek wypadku w drodze do/z pracy; ubezpieczeni obowiązkowo z wcześniejszym ≥10-letnim okresem obowiązkowego ubezpieczenia (oraz posłowie/senatorowie, funkcjonariusze SC).

- **Podstawa:** USTAWA - art. 4 ust. 3
- **Fragment:** „Od pierwszego dnia ubezpieczenia chorobowego prawo do zasiłku chorobowego przysługuje: 1) absolwentom ...”
- **Obowiązuje:** od - do -
- **Warunki:**
  - KTÓRYKOLWIEK:
    - `f_graduate_within_window`(days={'param': 'GRADUATE_WINDOW_DAYS'}) **eq** True
    - `incapacity.cause` **eq** COMMUTE_ACCIDENT
    - WSZYSTKIE:
      - `f_sickness_insurance_mode_on`(date=incapacity.start_date) **eq** MANDATORY
      - `f_prior_mandatory_sickness_insurance_years` **gte** MANDATORY_HISTORY_YEARS (=10)
    - `person.special_status` **in** ['MP_SENATOR_WITHIN_90_DAYS', 'CUSTOMS_SERVICE_KAS']
- **Rezultat:** `{"set": {"waiting_period_met": true, "waiting_period_exemption": true}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** SICK-ELIG-002, SICK-ELIG-003
- **Dane:** `person.graduation_date`, `incapacity.cause`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SICK-005
- **Uwagi:** Brak danych o ukończeniu szkoły przy niespełnionym okresie wyczekiwania → NEEDS_DATA (nie odmowa). 10 lat: f_prior_mandatory_sickness_insurance_years sumuje okresy obowiązkowe (DERIVED: 'wcześniejszy' = przed bieżącym tytułem).

### SICK-ELIG-006

**Zasiłek chorobowy po ustaniu tytułu ubezpieczenia** - `ELIGIBILITY` · P1 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek przysługuje też, gdy niezdolność powstała po ustaniu tytułu, jeżeli trwała bez przerwy ≥30 dni i powstała ≤14 dni od ustania tytułu (≤3 miesiące przy chorobie zakaźnej / kod E).

- **Podstawa:** USTAWA - art. 7 pkt 1-2
- **Fragment:** „jeżeli niezdolność do pracy trwała bez przerwy co najmniej 30 dni i powstała: 1) niepóźniej niż w ciągu 14 dni od ustania tytułu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_sickness_insured_on`(date=incapacity.start_date) **eq** False
    - `f_incapacity_continuous_days` **gte** AFTER_TITLE_MIN_INCAPACITY_DAYS (=30)
    - KTÓRYKOLWIEK:
      - `f_days_since_title_end`(date=incapacity.start_date) **lte** AFTER_TITLE_ONSET_MAX_DAYS (=14)
      - WSZYSTKIE:
        - `incapacity.codes` **in** ['E']
        - `f_months_since_title_end`(date=incapacity.start_date) **lte** AFTER_TITLE_ONSET_MAX_MONTHS_CODE_E (=3)
- **Rezultat:** `{"set": {"sickness_onset_basis": "AFTER_TITLE_END"}}`
- **Wyjątki:** SICK-EXCL-003, SICK-EXCL-004 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles`, `incapacity.start_date`, `incapacity.end_date`, `incapacity.codes` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SICK-011, T-SICK-012, T-SICK-013
- **Uwagi:** operator 'in' na liście kodów = 'lista zawiera'. Płatnik po ustaniu = ZUS (GEN-CLS-002). Dokument: oświadczenie z zał. 4 ROZP_DOK (SICK-DOC-003).

### SICK-EXCL-001

**Brak zasiłku za okres zachowania prawa do wynagrodzenia** - `EXCLUSION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek nie przysługuje za okresy, w których ubezpieczony zachowuje prawo do wynagrodzenia (np. wynagrodzenie chorobowe); okresy te wlicza się do okresu zasiłkowego.

- **Podstawa:** USTAWA - art. 12 ust. 1
- **Fragment:** „nie przysługuje za okresy niezdolności do pracy, w których ubezpieczony ... zachowuje prawo do wynagrodzenia. Okresy te wlicza się do okresu zasiłkowego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_day_covered_by_retained_pay` **eq** True
- **Rezultat:** `{"set": {"day_benefit": "NONE", "counts_to_benefit_period": true}}`
- **Wyjątki:** - · **Zależy od:** SICKPAY-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `benefit_history.employer_sick_pay_days_in_year` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-005
- **Uwagi:** Ocena per dzień okresu niezdolności.

### SICK-EXCL-002

**Brak zasiłku w czasie urlopu bezpłatnego, wychowawczego, aresztu, opiekuńczego** - `EXCLUSION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek nie przysługuje za niezdolność przypadającą w czasie urlopu bezpłatnego, wychowawczego, tymczasowego aresztowania/kary (z wyjątkami), usprawiedliwionej nieobecności z art. 63(2) § 8 KP, urlopu opiekuńczego; okresów tych nie wlicza się do okresu zasiłkowego.

- **Podstawa:** USTAWA - art. 12 ust. 2, 2a, 3
- **Fragment:** „nie przysługuje również za okresy niezdolności do pracy przypadającej w czasie: 1) urlopu bezpłatnego; 2) urlopu wychowawczego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_day_in_excluded_leave`(types=['UNPAID_LEAVE', 'CHILDCARE_LEAVE', 'DETENTION', 'KP_63_2_P8_ABSENCE', 'CARER_LEAVE']) **eq** True
- **Rezultat:** `{"set": {"day_benefit": "NONE", "counts_to_benefit_period": false}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** SICK-RATE-001, SICK-RATE-002
- **Dane:** `employment.leaves` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Ust. 2a (śmierć pracodawcy) i wyjątek pkt 3 (praca w czasie kary) → NEEDS_REVIEW. Uwaga: dla zasiłku macierzyńskiego stosuje się tylko pkt 1 i 3 (art. 31 ust. 5) - urlop wychowawczy NIE wyłącza macierzyńskiego.

### SICK-EXCL-003

**Wyłączenia zasiłku za okres po ustaniu tytułu** - `EXCLUSION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Za okres po ustaniu tytułu zasiłek nie przysługuje, jeśli osoba ma ustalone prawo do emerytury/renty, kontynuuje lub podjęła działalność zarobkową dającą tytuł do ubezpieczenia chorobowego, nie nabyła prawa w czasie ubezpieczenia (art. 4 ust. 1), jest uprawniona do zasiłku dla bezrobotnych/przedemerytalnego itp., podlega obowiązkowo KRUS.

- **Podstawa:** USTAWA - art. 13 ust. 1, 1a
- **Fragment:** „nie przysługuje za okres po ustaniu tytułu ubezpieczenia chorobowego, jeżeli osoba niezdolna do pracy: 1) ma ustalone prawo do emerytury lub renty”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_benefit_after_title_end` **eq** True
    - KTÓRYKOLWIEK:
      - `person.has_pension_or_disability_pension` **eq** True
      - `person.continues_or_started_gainful_activity` **eq** True
      - `f_waiting_period_met_during_insurance` **eq** False
      - `person.receives_unemployment_or_preretirement_benefit` **eq** True
      - `person.mandatory_krus` **eq** True
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "AFTER_TITLE_EXCLUSION"}`
- **Wyjątki:** - · **Zależy od:** SICK-ELIG-006 · **Ma pierwszeństwo przed:** SICK-ELIG-006
- **Dane:** `person.has_pension_or_disability_pension`, `person.continues_or_started_gainful_activity`, `person.receives_unemployment_or_preretirement_benefit`, `person.mandatory_krus` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Dane z oświadczenia (zał. 4 ROZP_DOK).

### SICK-EXCL-004

**Brak zasiłku po ustaniu tytułu, gdy ubezpieczenie ustało po wyczerpaniu zasiłku** - `EXCLUSION` · P2 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek po ustaniu tytułu nie przysługuje, jeśli ubezpieczenie ustało po wyczerpaniu prawa do zasiłku chorobowego.

- **Podstawa:** USTAWA - art. 13 ust. 2
- **Fragment:** „jeżeli ubezpieczenie to ustało po wyczerpaniu prawa do zasiłku chorobowego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_benefit_after_title_end` **eq** True
    - `f_benefit_period_exhausted_before_title_end` **eq** True
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "EXHAUSTED_BEFORE_TITLE_END"}`
- **Wyjątki:** - · **Zależy od:** SICK-DUR-003 · **Ma pierwszeństwo przed:** SICK-ELIG-006
- **Dane:** `benefit_history.sickness_periods`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### SICK-EXCL-005

**Niezdolność spowodowana umyślnym przestępstwem/wykroczeniem** - `EXCLUSION` · P2 · HUMAN_REVIEW · eval: **HUMAN_REVIEW**

Zasiłek nie przysługuje za cały okres niezdolności spowodowanej umyślnym przestępstwem lub wykroczeniem ubezpieczonego, stwierdzonym prawomocnym orzeczeniem sądu.

- **Podstawa:** USTAWA - art. 15
- **Fragment:** „spowodowana została w wyniku umyślnego przestępstwa lub wykroczenia ... stwierdza się na podstawie prawomocnego orzeczenia sądu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `incapacity.caused_by_own_intentional_offence_final_judgment` **eq** True
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "INTENTIONAL_OFFENCE"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** SICK-ELIG-001
- **Dane:** `incapacity.caused_by_own_intentional_offence_final_judgment` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Brak danych = brak potwierdzonej przesłanki wykluczającej; silnik raportuje assumption 'brak informacji o wyroku'.

### SICK-EXCL-006

**Nadużycie alkoholu - brak zasiłku za pierwsze 5 dni (kod C)** - `EXCLUSION` · P2 · AUTOMATABLE · eval: **ACTIVE**

Gdy niezdolność spowodowana została nadużyciem alkoholu (kod C), zasiłek nie przysługuje za pierwsze 5 dni.

- **Podstawa:** USTAWA - art. 16; art. 57 ust. 1 pkt 3
- **Fragment:** „zasiłek chorobowy nie przysługuje za okres pierwszych 5 dni tej niezdolności”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `incapacity.codes` **in** ['C']
- **Rezultat:** `{"set": {"excluded_initial_days": {"param": "ALCOHOL_EXCLUDED_DAYS"}}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `incapacity.codes` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Kody z e-ZLA są daną pewną (kod C nie może być pominięty na wniosek).

### SICK-EXCL-007

**Utrata zasiłku - praca zarobkowa lub aktywność niezgodna z celem zwolnienia** - `EXCLUSION` · P1 · HUMAN_REVIEW · eval: **HUMAN_REVIEW**

Ubezpieczony traci prawo do zasiłku za cały okres zwolnienia, jeśli wykonuje pracę zarobkową lub podejmuje aktywność niezgodną z celem zwolnienia; zasiłek nie przysługuje przy sfałszowanym zaświadczeniu.

- **Podstawa:** USTAWA - art. 17 ust. 1, 1a, 1b, 2, 4
- **Fragment:** „traci prawo do zasiłku chorobowego za cały okres zwolnienia od pracy, w przypadku gdy ... wykonuje pracę zarobkową”
- **Obowiązuje:** od - do -
- **Warunki:**
  - KTÓRYKOLWIEK:
    - `incapacity.gainful_work_during_leave_reported` **eq** True
    - `incapacity.certificate_forged` **eq** True
- **Rezultat:** `{"status": "NEEDS_REVIEW", "reason_code": "POSSIBLE_LOSS_OF_RIGHT_ART17"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `incapacity.gainful_work_during_leave_reported` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Pojęcia 'czynności incydentalne', 'istotne okoliczności' wymagają oceny. W UI - ostrzeżenie w module ryzyk (pkt h zadania). Ust. 1d-1e (praca w innym tytule) - od 2027-01-01, patrz SICK-DUR-005.

### SICK-DUR-001

**Okres zasiłkowy - 182 dni, w ciąży 270 dni** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek przysługuje przez okres niezdolności, nie dłużej niż 182 dni; gdy niezdolność spowodowana gruźlicą lub występuje w trakcie ciąży - nie dłużej niż 270 dni.

- **Podstawa:** USTAWA - art. 8 ust. 1
- **Fragment:** „niedłużej jednak niż przez 182 dni, a jeżeli niezdolność do pracy została spowodowana gruźlicą lub występuje w trakcie ciąży - niedłużej niż przez 270 dni”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **in** ['SICKNESS_BENEFIT', 'EMPLOYER_SICK_PAY']
- **Rezultat:** `{"compute": "f_benefit_period_limit_days", "output": "duration.benefit_period_limit_days"}`
- **Wyjątki:** SICK-DUR-002 · **Zależy od:** SICK-DUR-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `incapacity.codes`, `pregnancy.is_pregnant_during_incapacity` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SICK-007, T-SICK-008
- **Uwagi:** f_benefit_period_limit_days: 270 gdy f_incapacity_in_pregnancy=TRUE lub kod D; 182 gdy FALSE; UNKNOWN → NEEDS_DATA. Przy okresie mieszanym (część przed ciążą) - patrz GAP-006.

### SICK-DUR-002

**Limit 91 dni po ustaniu tytułu (nie dotyczy ciąży)** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Za okres niezdolności po ustaniu tytułu zasiłek przysługuje nie dłużej niż 91 dni - nie dotyczy niezdolności w trakcie ciąży, gruźlicy i dawstwa.

- **Podstawa:** USTAWA - art. 8 ust. 2
- **Fragment:** „przypadający po ustaniu tytułu ubezpieczenia chorobowego zasiłek chorobowy przysługuje niedłużej niż przez 91 dni. Nie dotyczy to ... występującej w trakcie ciąży”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_benefit_after_title_end` **eq** True
    - `f_incapacity_in_pregnancy` **eq** False
    - NIE:
      - `incapacity.codes` **in** ['D']
    - `incapacity.cause` **ne** ORGAN_DONOR
- **Rezultat:** `{"set": {"after_title_max_days": {"param": "AFTER_TITLE_MAX_DAYS"}}}`
- **Wyjątki:** - · **Zależy od:** SICK-ELIG-006 · **Ma pierwszeństwo przed:** SICK-DUR-001
- **Dane:** `incapacity.codes`, `pregnancy.is_pregnant_during_incapacity`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SICK-011
- **Uwagi:** Kluczowe dla kobiet w ciąży, którym kończy się umowa: limit 91 dni ich NIE dotyczy (do 270 dni łącznie).

### SICK-DUR-003

**Sumowanie okresów niezdolności do jednego okresu zasiłkowego** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Do okresu zasiłkowego wlicza się okresy nieprzerwanej niezdolności i poprzednie niezdolności, jeśli przerwa nie przekraczała 60 dni; nie wlicza się okresów sprzed przerwy ≤60 dni, jeśli po przerwie niezdolność wystąpiła w trakcie ciąży.

- **Podstawa:** USTAWA - art. 9 ust. 1-2
- **Fragment:** „Do okresu zasiłkowego nie wlicza się okresów niezdolności do pracy przypadających przed przerwą niedłuższą niż 60 dni, jeżeli po przerwie niezdolność do pracy wystąpiła w trakcie ciąży”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit_history.sickness_periods` **exists** True
- **Rezultat:** `{"compute": "f_benefit_period_days_used", "output": "duration.benefit_period_days_used"}`
- **Wyjątki:** SICK-DUR-004 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `benefit_history.sickness_periods`, `incapacity.start_date`, `pregnancy.is_pregnant_during_incapacity` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-SICK-009, T-SICK-010
- **Uwagi:** Brzmienie (od 2026) nie wymaga 'tej samej choroby' - kod A tylko informuje (art. 57). Załącznik upraszcza zgodnie z ustawą. Pusta historia: jeśli użytkownik potwierdził brak wcześniejszych zwolnień w 60 dniach → 0; brak odpowiedzi → NEEDS_DATA dla limitu, ale nie blokuje prawa do zasiłku.

### SICK-DUR-004

**Dni okresu wyczekiwania i okresy wyłączone nie wliczają się do okresu zasiłkowego** - `CALCULATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Do okresu zasiłkowego nie wlicza się niezdolności w okresie wyczekiwania (art. 4 ust. 1) ani okresów z art. 12 ust. 2.

- **Podstawa:** USTAWA - art. 9 ust. 3; art. 12 ust. 3
- **Fragment:** „Do okresu zasiłkowego nie wlicza się okresu niezdolności do pracy przypadającego w okresach, o których mowa w art. 4 ust. 1”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `incapacity.start_date` **exists** True
- **Rezultat:** `{"set": {"excluded_from_period": ["WAITING_PERIOD_DAYS", "ART12_2_DAYS"]}}`
- **Wyjątki:** - · **Zależy od:** SICK-ELIG-002, SICK-ELIG-003, SICK-EXCL-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `incapacity.start_date`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### SICK-DUR-005

**Jeden okres zasiłkowy niezależnie od liczby tytułów (od 2027-01-01)** - `CALCULATION` · P2 · AUTOMATABLE · eval: **FUTURE**

Niezależnie od liczby tytułów ubezpieczenia ustala się jeden okres zasiłkowy (również przy niewystawieniu zwolnienia z jednego tytułu).

- **Podstawa:** USTAWA - art. 9 ust. 4 (przypis 3: dodany ustawą z 18.12.2025, Dz.U. 2026 poz. 26, wchodzi w życie 1.01.2027)
- **Fragment:** „Niezależnie od liczby tytułów ubezpieczenia chorobowego ustala się jeden okres zasiłkowy”
- **Obowiązuje:** od 2027-01-01 do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_number_of_sickness_titles` **gt** 1
- **Rezultat:** `{"set": {"single_benefit_period_across_titles": true}}`
- **Wyjątki:** - · **Zależy od:** SICK-DUR-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-INT-006
- **Uwagi:** Na datę referencyjną 2026-11-21 NIE stosować. Planer ciąży z porodem w 2027 może się zazębiać - raportować jako przyszła zmiana.

### SICK-RATE-001

**Zasiłek chorobowy 80%** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Miesięczny zasiłek chorobowy wynosi 80% podstawy wymiaru, z zastrzeżeniem stawki 100%.

- **Podstawa:** USTAWA - art. 11 ust. 1
- **Fragment:** „Miesięczny zasiłek chorobowy, z zastrzeżeniem ust. 2, wynosi 80% podstawy wymiaru zasiłku”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** SICKNESS_BENEFIT
- **Rezultat:** `{"set": {"rate": {"param": "SICK_RATE_STD"}}}`
- **Wyjątki:** SICK-RATE-002 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** - · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SICK-006, T-SICK-014
- **Uwagi:** Stawka 80% wybierana tylko, gdy SICK-RATE-002 = FALSE. Przy UNKNOWN (np. brak informacji o ciąży) → NEEDS_DATA, a nie 80%.

### SICK-RATE-002

**Zasiłek chorobowy 100% - ciąża, wypadek w drodze, dawstwo** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek wynosi 100% podstawy, jeśli niezdolność przypada w okresie ciąży, powstała wskutek badań/zabiegu dawcy albo wypadku w drodze do/z pracy.

- **Podstawa:** USTAWA - art. 11 ust. 2 pkt 1-3
- **Fragment:** „Miesięczny zasiłek chorobowy wynosi 100% podstawy wymiaru zasiłku, jeżeli niezdolność do pracy ...: 1) przypada w okresie ciąży”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** SICKNESS_BENEFIT
    - KTÓRYKOLWIEK:
      - `f_incapacity_in_pregnancy` **eq** True
      - `incapacity.cause` **in** ['COMMUTE_ACCIDENT', 'ORGAN_DONOR']
- **Rezultat:** `{"set": {"rate": {"param": "SICK_RATE_FULL"}}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** SICK-RATE-001
- **Dane:** `incapacity.codes`, `pregnancy.is_pregnant_during_incapacity`, `incapacity.cause` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SP-005, T-SICK-006, T-INT-001
- **Uwagi:** f_incapacity_in_pregnancy: TRUE gdy kod B; TRUE gdy pregnancy.is_pregnant_during_incapacity=true; FALSE tylko gdy użytkownik potwierdził brak ciąży; inaczej UNKNOWN (art. 57 ust. 2 - kod B można pominąć).

### SICK-CALC-001

**Kwota zasiłku chorobowego za dzień i okres** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Dzienna podstawa = 1/30 podstawy wymiaru; zasiłek przysługuje za każdy dzień niezdolności, łącznie z dniami wolnymi.

- **Podstawa:** USTAWA - art. 36 ust. 3; art. 11 ust. 4
- **Fragment:** „Podstawę wymiaru zasiłku chorobowego za jeden dzień niezdolności do pracy stanowi jedna trzydziesta część wynagrodzenia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** SICKNESS_BENEFIT
    - `f_benefit_base` **exists** True
- **Rezultat:** `{"compute": "f_benefit_amount", "output": "amount"}`
- **Wyjątki:** - · **Zależy od:** SICK-RATE-001, SICK-RATE-002, BASE-EMP-001, BASE-NEMP-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history`, `incapacity.start_date`, `incapacity.end_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-SICK-014
- **Uwagi:** Kolejność: base → base/30 → × rate → × dni. Zaokrąglenia: BRAK w źródłach (ROUNDING_POLICY=MISSING) - wynik dokładny + wariant zaokrąglony oznaczony jako założenie. GAP-001.

### SICK-DOC-001

**Dokumenty - zasiłek chorobowy (e-ZLA, zaświadczenie płatnika)** - `DOCUMENT_REQUIREMENT` · P0 · AUTOMATABLE · eval: **INFORMATIONAL**

Podstawą jest e-ZLA (lub wydruk/papierowe ZLA); gdy płaci ZUS - dodatkowo zaświadczenie płatnika składek (Z-3 pracownik / Z-3a niepracownik) albo wniosek z danymi z zał. 1 (np. dla przedsiębiorcy).

- **Podstawa:** ROZP_DOK - § 2, § 3 ust. 1, zał. 1-3; USTAWA art. 53, 61b ust. 2
- **Fragment:** „Dokumentami niezbędnymi do przyznania i wypłaty przez Zakład ... zasiłku chorobowego są dokument zawierający dane ... określone w załączniku nr 1”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **in** ['SICKNESS_BENEFIT']
- **Rezultat:** `{"documents": [{"doc": "E_ZLA", "provider": "DOCTOR_TO_ZUS", "auto_available": true}, {"doc": "PAYER_CERTIFICATE_Z3", "when": "payer_of_benefit=ZUS and is_employee"}, {"doc": "PAYER_CERTIFICATE_Z3A", "when": "payer_of_benefit=ZUS and non_employee and not self_employed"}, {"doc": "SICKNESS_APPLICATION_ANNEX1", "when": "payer_of_benefit=ZUS and self_employed"}]}`
- **Wyjątki:** - · **Zależy od:** GEN-CLS-001, GEN-CLS-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** -
- **Uwagi:** Nazwy formularzy (Z-3, Z-3a, ZAS-53) pochodzą z treści zadania - rozporządzenie określa zakres danych, nie symbole formularzy.

### SICK-DOC-002

**Dokumenty - zasiłek chorobowy po ustaniu tytułu** - `DOCUMENT_REQUIREMENT` · P1 · AUTOMATABLE · eval: **INFORMATIONAL**

Dla zasiłku za okres po ustaniu tytułu wymagane jest oświadczenie z danymi z zał. 4 (emerytura/renta, zasiłek dla bezrobotnych, działalność zarobkowa itd.).

- **Podstawa:** ROZP_DOK - § 4, zał. 4
- **Fragment:** „jest oświadczenie zawierające dane i informacje określone w załączniku nr 4”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_benefit_after_title_end` **eq** True
- **Rezultat:** `{"documents": [{"doc": "AFTER_TITLE_STATEMENT_ANNEX4", "provider": "INSURED"}]}`
- **Wyjątki:** - · **Zależy od:** SICK-ELIG-006 · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -


## Świadczenie rehabilitacyjne (poza priorytetem - oznaczone osobno)

### REHAB-ELIG-001

**Świadczenie rehabilitacyjne po wyczerpaniu zasiłku** - `ELIGIBILITY` · P1 · PARTIALLY_AUTOMATABLE · eval: **HUMAN_REVIEW**

Przysługuje ubezpieczonemu, który po wyczerpaniu zasiłku chorobowego jest nadal niezdolny do pracy, a dalsze leczenie/rehabilitacja rokują odzyskanie zdolności - o czym orzeka lekarz orzecznik ZUS.

- **Podstawa:** USTAWA - art. 18 ust. 1, 3, 6
- **Fragment:** „po wyczerpaniu zasiłku chorobowego jest nadal niezdolny do pracy, a dalsze leczenie lub rehabilitacja lecznicza rokują odzyskanie zdolności”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_benefit_period_exhausted` **eq** True
    - `rehabilitation.zus_medical_opinion_positive` **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "REHABILITATION_BENEFIT"}}`
- **Wyjątki:** REHAB-EXCL-001 · **Zależy od:** SICK-DUR-001, SICK-DUR-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `benefit_history.sickness_periods`, `rehabilitation.zus_medical_opinion_positive` · brak danych → `NEEDS_REVIEW`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Silnik może wskazać 'zbliża się wyczerpanie okresu zasiłkowego - rozważ wniosek', ale prawa nie przyznaje bez orzeczenia (pole zwykle UNKNOWN → NEEDS_REVIEW). Zakres MVP (M16 c, mentor fachowy 2026-11-21): tylko podstawa - prawo po wyczerpaniu 270 dni zasiłku chorobowego w ciąży; bez głębszej analizy (rokowanie, orzeczenie, kwota).

### REHAB-EXCL-001

**Wyłączenia świadczenia rehabilitacyjnego** - `EXCLUSION` · P2 · AUTOMATABLE · eval: **ACTIVE**

Nie przysługuje osobie uprawnionej do emerytury/renty, zasiłku dla bezrobotnych, przedemerytalnego, rodzicielskiego świadczenia uzupełniającego, nauczycielskiego świadczenia kompensacyjnego, urlopu dla poratowania zdrowia.

- **Podstawa:** USTAWA - art. 18 ust. 7-8
- **Fragment:** „Świadczenie rehabilitacyjne nie przysługuje osobie uprawnionej do emerytury lub renty”
- **Obowiązuje:** od - do -
- **Warunki:**
  - KTÓRYKOLWIEK:
    - `person.has_pension_or_disability_pension` **eq** True
    - `person.receives_unemployment_or_preretirement_benefit` **eq** True
    - `person.on_health_restoration_leave` **eq** True
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "REHAB_EXCLUSION"}`
- **Wyjątki:** - · **Zależy od:** REHAB-ELIG-001 · **Ma pierwszeństwo przed:** REHAB-ELIG-001
- **Dane:** `person.has_pension_or_disability_pension`, `person.receives_unemployment_or_preretirement_benefit` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### REHAB-DUR-001

**Świadczenie rehabilitacyjne - maksymalnie 12 miesięcy** - `DURATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Przez okres niezbędny do przywrócenia zdolności do pracy, nie dłużej niż 12 miesięcy.

- **Podstawa:** USTAWA - art. 18 ust. 2
- **Fragment:** „niedłużej jednak niż przez 12 miesięcy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** REHABILITATION_BENEFIT
- **Rezultat:** `{"set": {"max_duration_months": {"param": "REHAB_MAX_MONTHS"}}}`
- **Wyjątki:** - · **Zależy od:** REHAB-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** - · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Rzeczywisty okres orzeka lekarz orzecznik.

### REHAB-RATE-001

**Wysokość świadczenia rehabilitacyjnego (90% / 75% / 100% w ciąży)** - `RATE` · P1 · AUTOMATABLE · eval: **ACTIVE**

90% podstawy przez pierwsze 3 miesiące, 75% za pozostały okres; jeśli niezdolność przypada w okresie ciąży - 100%.

- **Podstawa:** USTAWA - art. 19 ust. 1
- **Fragment:** „90% podstawy ... za okres pierwszych trzech miesięcy, 75% tej podstawy za pozostały okres, a jeżeli niezdolność do pracy przypada w okresie ciąży - 100%”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** REHABILITATION_BENEFIT
- **Rezultat:** `{"compute": "f_rehab_rate_schedule", "output": "rate_schedule"}`
- **Wyjątki:** - · **Zależy od:** REHAB-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `pregnancy.is_pregnant_during_incapacity` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Waloryzacja podstawy (art. 19 ust. 2) wymaga wskaźnika ogłaszanego przez Prezesa ZUS - brak w materiałach (GAP-009). Kwota P2.

### REHAB-DOC-001

**Dokumenty - świadczenie rehabilitacyjne** - `DOCUMENT_REQUIREMENT` · P2 · AUTOMATABLE · eval: **INFORMATIONAL**

Wniosek (zał. 5), zaświadczenie o stanie zdrowia (nie starsze niż miesiąc), wywiad zawodowy (nie dla przedsiębiorców/po ustaniu), dokumenty wypadkowe; po ustaniu tytułu także oświadczenie z zał. 4.

- **Podstawa:** ROZP_DOK - § 11 ust. 1-3
- **Fragment:** „Dokumentami niezbędnymi do przyznania i wypłaty świadczenia rehabilitacyjnego są: 1) wniosek ... 2) zaświadczenie o stanie zdrowia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** REHABILITATION_BENEFIT
- **Rezultat:** `{"documents": [{"doc": "REHAB_APPLICATION_ANNEX5"}, {"doc": "HEALTH_STATUS_CERTIFICATE_MAX_1_MONTH"}, {"doc": "OCCUPATIONAL_INTERVIEW", "when": "employee and not after_title_end"}]}`
- **Wyjątki:** - · **Zależy od:** REHAB-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** - · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -


## Zasiłek macierzyński - prawo, okres macierzyński, przejęcie, stawki

### MAT-ELIG-001

**Zasiłek macierzyński - urodzenie dziecka w czasie ubezpieczenia lub urlopu wychowawczego** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przysługuje ubezpieczonej, która urodziła dziecko w okresie ubezpieczenia chorobowego albo w okresie urlopu wychowawczego.

- **Podstawa:** USTAWA - art. 29 ust. 1 pkt 1
- **Fragment:** „przysługuje ubezpieczonej, która w okresie ubezpieczenia chorobowego albo w okresie urlopu wychowawczego: 1) urodziła dziecko”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `person.role` **eq** MOTHER
    - KTÓRYKOLWIEK:
      - `f_sickness_insured_on`(date=event.date) **eq** True
      - `f_on_childcare_leave_on`(date=event.date) **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "entitlement_basis": "BIRTH_DURING_INSURANCE"}}`
- **Wyjątki:** GEN-EXCL-001, MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-006 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `event.type`, `event.date`, `person.role`, `insurance.titles`, `employment.leaves` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-001, T-MAT-010, T-INT-001, T-INT-002, T-INT-004, T-INT-005
- **Uwagi:** Brak okresu wyczekiwania dla zasiłku macierzyńskiego - art. 4 dotyczy wyłącznie zasiłku chorobowego (MAT-CLS-001). Dla planowania (poród w przyszłości) event.date = przewidywana data porodu i wynik jest PROGNOZĄ (flaga forecast=true).

### MAT-ELIG-002

**Zasiłek macierzyński - przyjęcie dziecka do 14 lat i wniosek o przysposobienie** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przysługuje ubezpieczonej/ubezpieczonemu, który w okresie ubezpieczenia (lub urlopu wychowawczego) przyjął na wychowanie dziecko do 14 roku życia i wystąpił do sądu opiekuńczego o przysposobienie.

- **Podstawa:** USTAWA - art. 29 ust. 1 pkt 2, ust. 2
- **Fragment:** „przyjęła na wychowanie dziecko w wieku do 14 roku życia i wystąpiła do sądu opiekuńczego w sprawie jego przysposobienia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** ADOPTION
    - `event.court_adoption_application_date` **exists** True
    - `f_child_age_years_on`(date=event.date) **lt** ADOPTION_CHILD_AGE_MAX (=14)
    - KTÓRYKOLWIEK:
      - `f_sickness_insured_on`(date=event.date) **eq** True
      - `f_on_childcare_leave_on`(date=event.date) **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "entitlement_basis": "ADOPTION"}}`
- **Wyjątki:** GEN-EXCL-001 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `event.type`, `event.date`, `event.court_adoption_application_date`, `children.birth_dates`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-MAT-015, T-MAT-016, T-MAT-022
- **Uwagi:** 'w wieku do 14 roku życia' interpretujemy jako: przed ukończeniem 14 lat (lt 14) - GAP-005, rozstrzygnięte przez mentora (M14 c, 2026-11-21: „do dnia urodzin”). event.date = data przyjęcia dziecka; oba warunki (przyjęcie + wniosek do sądu) muszą zajść - data powstania prawa = późniejsza z nich (DERIVED).

### MAT-ELIG-003

**Zasiłek macierzyński - rodzina zastępcza niezawodowa (dziecko do 7/10 lat)** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przysługuje ubezpieczonemu, który przyjął na wychowanie w ramach rodziny zastępczej (z wyjątkiem zawodowej) dziecko do 7 roku życia, a przy odroczonym obowiązku szkolnym do 10.

- **Podstawa:** USTAWA - art. 29 ust. 1 pkt 3, ust. 2
- **Fragment:** „przyjęła na wychowanie w ramach rodziny zastępczej, z wyjątkiem rodziny zastępczej zawodowej, dziecko w wieku do 7 roku życia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** FOSTER
    - `event.foster_family_type` **eq** NON_PROFESSIONAL
    - KTÓRYKOLWIEK:
      - `f_child_age_years_on`(date=event.date) **lt** FOSTER_CHILD_AGE_MAX (=7)
      - WSZYSTKIE:
        - `children.school_obligation_deferred` **eq** True
        - `f_child_age_years_on`(date=event.date) **lt** FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED (=10)
    - KTÓRYKOLWIEK:
      - `f_sickness_insured_on`(date=event.date) **eq** True
      - `f_on_childcare_leave_on`(date=event.date) **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "entitlement_basis": "FOSTER_NON_PROFESSIONAL"}}`
- **Wyjątki:** MAT-EXCL-001, GEN-EXCL-001 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `event.type`, `event.date`, `event.foster_family_type`, `children.birth_dates`, `children.school_obligation_deferred`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-MAT-018
- **Uwagi:** Treść zadania (pkt e vs j) - rodzina zastępcza ZAWODOWA nie ma prawa (MAT-EXCL-001).

### MAT-EXCL-001

**Rodzina zastępcza zawodowa - brak prawa** - `EXCLUSION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek macierzyński z tytułu przyjęcia dziecka nie przysługuje rodzinie zastępczej zawodowej.

- **Podstawa:** USTAWA - art. 29 ust. 1 pkt 3; KP art. 183 § 1
- **Fragment:** „z wyjątkiem rodziny zastępczej zawodowej”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** FOSTER
    - `event.foster_family_type` **eq** PROFESSIONAL
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "PROFESSIONAL_FOSTER_FAMILY"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** MAT-ELIG-003
- **Dane:** `event.foster_family_type` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-017
- **Uwagi:** M16 b (2026-11-21, mentor fachowy): kalkulator pkt j) obejmuje także rodzinę zastępczą zawodową - wynik pokazuje brak prawa do zasiłku macierzyńskiego z tego tytułu (art. 29 ust. 1 pkt 3) z wyjaśnieniem, zamiast pomijać tę grupę.

### MAT-ELIG-004

**Zasiłek macierzyński po ustaniu ubezpieczenia - śmierć, upadłość, likwidacja pracodawcy** - `ELIGIBILITY` · P1 · AUTOMATABLE · eval: **ACTIVE**

Przysługuje w razie urodzenia dziecka po ustaniu ubezpieczenia, jeżeli ubezpieczenie ustało w okresie ciąży wskutek śmierci, ogłoszenia upadłości lub likwidacji pracodawcy.

- **Podstawa:** USTAWA - art. 30 ust. 1 pkt 1
- **Fragment:** „jeżeli ubezpieczenie to ustało w okresie ciąży: 1) wskutek śmierci, ogłoszenia upadłości lub likwidacji pracodawcy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `f_sickness_insured_on`(date=event.date) **eq** False
    - `f_title_ended_during_pregnancy` **eq** True
    - `f_last_title_termination_reason` **in** ['EMPLOYER_DEATH', 'EMPLOYER_BANKRUPTCY', 'EMPLOYER_LIQUIDATION']
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "entitlement_basis": "AFTER_TITLE_EMPLOYER_CEASED", "payer_of_benefit": "ZUS"}}`
- **Wyjątki:** GEN-EXCL-001 · **Zależy od:** - · **Ma pierwszeństwo przed:** MAT-NEG-001
- **Dane:** `insurance.titles`, `pregnancy.pregnancy_start_date`, `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-005
- **Uwagi:** Płatnik = ZUS (art. 61 ust. 1 pkt 2 lit. d). Dokumenty: MAT-DOC-004.

### MAT-ELIG-005

**Zasiłek macierzyński po ustaniu ubezpieczenia - rozwiązanie z naruszeniem prawa** - `ELIGIBILITY` · P1 · AUTOMATABLE · eval: **ACTIVE**

Przysługuje, jeżeli ubezpieczenie ustało w okresie ciąży z naruszeniem przepisów prawa stwierdzonym prawomocnym orzeczeniem sądu.

- **Podstawa:** USTAWA - art. 30 ust. 1 pkt 2
- **Fragment:** „z naruszeniem przepisów prawa, stwierdzonym prawomocnym orzeczeniem sądu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `f_sickness_insured_on`(date=event.date) **eq** False
    - `f_title_ended_during_pregnancy` **eq** True
    - `f_last_title_termination_reason` **eq** UNLAWFUL_TERMINATION_COURT_CONFIRMED
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "entitlement_basis": "AFTER_TITLE_UNLAWFUL_TERMINATION", "payer_of_benefit": "ZUS"}}`
- **Wyjątki:** GEN-EXCL-001 · **Zależy od:** - · **Ma pierwszeństwo przed:** MAT-NEG-001
- **Dane:** `insurance.titles`, `pregnancy.pregnancy_start_date`, `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Gdy sprawa sądowa w toku (brak prawomocnego orzeczenia) → NEEDS_REVIEW.

### MAT-ELIG-006

**Zasiłek macierzyński po ustaniu - umowa terminowa przedłużona do dnia porodu** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Pracownicy na umowie na czas określony przedłużonej do dnia porodu (KP art. 177 § 3) przysługuje zasiłek macierzyński po ustaniu ubezpieczenia.

- **Podstawa:** USTAWA - USTAWA art. 30 ust. 4; KP art. 177 § 3, § 3(1)
- **Fragment:** „z którą umowa o pracę na podstawie art. 177 § 3 Kodeksu pracy została przedłużona do dnia porodu - przysługuje prawo do zasiłku macierzyńskiego po ustaniu ubezpieczenia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `employment.contract_type` **eq** FIXED_TERM
    - `employment.extended_until_birth_kp177` **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "entitlement_basis": "FIXED_TERM_EXTENDED_TO_BIRTH", "payer_of_benefit": "ZUS"}}`
- **Wyjątki:** - · **Zależy od:** MAT-CLS-002 · **Ma pierwszeństwo przed:** MAT-NEG-001
- **Dane:** `employment.contract_type`, `employment.extended_until_birth_kp177` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-008
- **Uwagi:** Częsty przypadek w sprawach. Przedłużenie ocenia MAT-CLS-002.

### MAT-CLS-002

**Przedłużenie umowy terminowej do dnia porodu (KP 177 § 3)** - `CLASSIFICATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Umowa na czas określony lub na okres próbny >1 miesiąc, która rozwiązałaby się po upływie 3. miesiąca ciąży, ulega przedłużeniu do dnia porodu - nie dotyczy umowy na zastępstwo.

- **Podstawa:** KP - art. 177 § 3, § 3(1)
- **Fragment:** „która uległaby rozwiązaniu po upływie trzeciego miesiąca ciąży, ulega przedłużeniu do dnia porodu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `employment.contract_type` **in** ['FIXED_TERM', 'PROBATION_OVER_1_MONTH']
    - `employment.is_replacement_contract` **eq** False
    - `f_contract_end_after_third_month_of_pregnancy` **eq** True
- **Rezultat:** `{"set": {"employment.extended_until_birth_kp177": true}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `employment.contract_type`, `employment.contract_end_date`, `employment.is_replacement_contract`, `pregnancy.pregnancy_start_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-MAT-009
- **Uwagi:** Odblokowana po odpowiedzi mentora M13 (2026-11-21): miesiąc ciąży stwierdza lekarz - pregnancy.pregnancy_start_date z zaświadczenia lekarskiego; przedłużenie umowy potwierdza dokument (wymagany dokument od pracodawcy). Trzeci miesiąc = [początek + 2 mies., początek + 3 mies. − 1]; 'po upływie' ⇔ koniec umowy ≥ początek + 3 mies. (DERIVED, C3; przy krótszym miesiącu docelowym - ostatni dzień miesiąca, np. 30.11 + 3 mies. = 28.02, jak add_years). Brak daty początku ciąży lub końca umowy → NEEDS_DATA. GAP-007 zamknięty.

### MAT-NEG-001

**Brak ubezpieczenia na dzień porodu - brak prawa** - `EXCLUSION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Jeśli w dniu porodu osoba nie podlega ubezpieczeniu chorobowemu, nie jest na urlopie wychowawczym i nie zachodzi żaden przypadek z art. 30 - zasiłek macierzyński nie przysługuje.

- **Podstawa:** USTAWA - art. 29 ust. 1 a contrario; art. 30
- **Fragment:** „przysługuje ubezpieczonej, która w okresie ubezpieczenia chorobowego albo w okresie urlopu wychowawczego: 1) urodziła dziecko”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `f_sickness_insured_on`(date=event.date) **eq** False
    - `f_on_childcare_leave_on`(date=event.date) **eq** False
    - `f_any_art30_basis` **eq** False
- **Rezultat:** `{"status": "NOT_ELIGIBLE", "reason_code": "NOT_INSURED_ON_BIRTH_DATE"}`
- **Wyjątki:** MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-006 · **Zależy od:** MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-006 · **Ma pierwszeństwo przed:** MAT-ELIG-001
- **Dane:** `insurance.titles`, `event.date`, `employment.leaves` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DERIVED
- **Testy:** T-MAT-004
- **Uwagi:** Ryzyko z pkt H.3 zadania (wyrejestrowanie z dobrowolnego chorobowego, koniec umowy zlecenia/JDG przed porodem) - wysyłamy ostrzeżenie w planerze ciąży. Ojciec może mieć prawo z art. 29 ust. 9-10 lub do rodzicielskiego (PAR-SHARE-003).

### MAT-CLS-001

**Brak okresu wyczekiwania dla zasiłku macierzyńskiego** - `CLASSIFICATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przepisy o okresie wyczekiwania (art. 4) dotyczą zasiłku chorobowego; rozdział o zasiłku macierzyńskim nie przewiduje okresu wyczekiwania.

- **Podstawa:** USTAWA - art. 4 ust. 1 (zasiłek chorobowy); art. 29-31
- **Fragment:** „Ubezpieczony nabywa prawo do zasiłku chorobowego: 1) po upływie 30 dni”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** MATERNITY_BENEFIT
- **Rezultat:** `{"set": {"waiting_period_required": false}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** - · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DERIVED
- **Testy:** T-MAT-001
- **Uwagi:** Wniosek a contrario - potwierdzony przez mentora fachowego ZUS (M12 a, 2026-11-21): zasiłek macierzyński nie ma okresu wyczekiwania (także JDG zgłoszona do dobrowolnego chorobowego krótko przed porodem). Uwaga: pozorność umowy/podwyższenia podstawy (pkt H zadania) to ryzyko oceniane przez ZUS w postępowaniu - RISK-001/002.

### MAT-DUR-001

**Wymiar urlopu macierzyńskiego wg liczby dzieci** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

20 tygodni (1 dziecko), 31 (2), 33 (3), 35 (4), 37 (5 i więcej) przy jednym porodzie.

- **Podstawa:** KP - KP art. 180 § 1; USTAWA art. 29a ust. 1
- **Fragment:** „20 tygodni - w przypadku urodzenia jednego dziecka przy jednym porodzie; 31 tygodni - ... dwojga”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `children.count_at_birth` **gte** 1
- **Rezultat:** `{"compute": "f_maternity_leave_weeks", "output": "duration.maternity_weeks"}`
- **Wyjątki:** MAT-DUR-003, MAT-DUR-004, MAT-DUR-005 · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `children.count_at_birth` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-001, T-MAT-002, T-MAT-003, T-INT-003
- **Uwagi:** Tydzień = 7 dni kalendarzowych (MAT-DUR-009).

### MAT-DUR-002

**Do 6 tygodni urlopu przed przewidywaną datą porodu** - `VALIDATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przed przewidywaną datą porodu można wykorzystać nie więcej niż 6 tygodni; niewykorzystaną część - po porodzie do wyczerpania wymiaru. Bez części przedporodowej pierwszym dniem jest dzień porodu.

- **Podstawa:** KP - KP art. 180 § 2-3; art. 183(1) § 2
- **Fragment:** „Przed przewidywaną datą porodu pracownica może wykorzystać niewięcej niż 6 tygodni urlopu macierzyńskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `plan.maternity_start_date` **exists** True
    - `f_weeks_before_due_date` **gt** PRE_BIRTH_MAX_WEEKS (=6)
- **Rezultat:** `{"validation_error": {"code": "PRE_BIRTH_EXCEEDS_6_WEEKS"}}`
- **Wyjątki:** - · **Zależy od:** MAT-DUR-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.maternity_start_date`, `pregnancy.expected_due_date` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-011, T-MAT-012
- **Uwagi:** Dokument: zaświadczenie o przewidywanej dacie porodu (MAT-DOC-001). Dla ubezpieczonej niebędącej pracownicą - 'okres odpowiadający' (DERIVED z art. 29a).

### MAT-DUR-003

**Martwe urodzenie lub zgon dziecka przed 8. tygodniem życia** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przysługuje urlop/zasiłek w wymiarze 8 tygodni po porodzie, nie krócej niż 7 dni od dnia zgonu; przy kilkorgu dzieci - wymiar stosowny do liczby dzieci pozostałych przy życiu.

- **Podstawa:** KP - KP art. 180(1) § 1
- **Fragment:** „W razie urodzenia martwego dziecka lub zgonu dziecka przed upływem 8 tygodni życia, pracownicy przysługuje urlop macierzyński w wymiarze 8 tygodni po porodzie, niekrócej jednak niż przez okres 7 dni od dnia zgonu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `f_children_alive_count` **eq** 0
    - `f_earliest_child_death_age_days` **lt** 56
- **Rezultat:** `{"compute": "f_stillbirth_maternity_end_date", "output": "duration.maternity_end_date"}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** MAT-DUR-001
- **Dane:** `children.items`, `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-013, T-MAT-014, T-INT-004
- **Uwagi:** Koniec = max(data porodu + 8 tyg − 1 dzień, data zgonu + 7 dni − 1 dzień) - DERIVED, GAP-004. Gdy żyje ≥1 dziecko z wieloraczków → MAT-DUR-005. Wymagany tryb empatyczny UI. Dokument: zaświadczenie o martwym urodzeniu (ROZP_DOK § 13 ust. 1 pkt 2). Poronienie: zaświadczenie o martwym urodzeniu wydaje się „bez względu na czas trwania ciąży” (§ 13 ust. 1 pkt 2) - wejście stillborn=true przy takim zaświadczeniu; potwierdzone przez mentora M15 b (2026-11-21): zaświadczenie o martwym urodzeniu wystarcza (GAP-024 zamknięty).

### MAT-DUR-004

**Zgon dziecka po 8. tygodniu życia - 7 dni** - `DURATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

W razie zgonu dziecka po upływie 8 tygodni życia prawo do urlopu/zasiłku zachowuje się przez 7 dni od dnia zgonu.

- **Podstawa:** KP - KP art. 180(1) § 2
- **Fragment:** „W przypadku zgonu dziecka po upływie 8 tygodni życia, pracownica zachowuje prawo do urlopu macierzyńskiego przez okres 7 dni od dnia zgonu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `f_children_alive_count` **eq** 0
    - `f_earliest_child_death_age_days` **gte** 56
- **Rezultat:** `{"compute": "f_child_death_maternity_end_date", "output": "duration.maternity_end_date"}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** MAT-DUR-001
- **Dane:** `children.items`, `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Koniec = min(regularny koniec, data zgonu + 7 dni − 1) - DERIVED.

### MAT-DUR-005

**Wieloraczki - zgon części dzieci** - `DURATION` · P2 · HUMAN_REVIEW · eval: **BLOCKED**

Gdy przy jednym porodzie urodziło się więcej dzieci, a część zmarła/urodziła się martwa - wymiar stosowny do liczby dzieci pozostałych przy życiu (nie krócej niż 7 dni od zgonu).

- **Podstawa:** KP - KP art. 180(1) § 1 zd. 2, § 2 zd. 2
- **Fragment:** „przysługuje w takim przypadku urlop macierzyński w wymiarze stosownym do liczby dzieci pozostałych przy życiu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `children.count_at_birth` **gt** 1
    - `f_children_alive_count` **gte** 1
    - `f_children_deceased_count` **gte** 1
- **Rezultat:** `{"compute": "f_maternity_weeks_surviving", "output": "duration.maternity_weeks"}`
- **Wyjątki:** - · **Zależy od:** MAT-DUR-001 · **Ma pierwszeństwo przed:** MAT-DUR-001
- **Dane:** `children.items` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja AMBIGUOUS
- **Testy:** -
- **Uwagi:** Moment zmiany wymiaru (od dnia zgonu? zachowanie dni już wykorzystanych?) nie wynika jednoznacznie - BLOKOWANA (GAP-012).

### MAT-DUR-006

**Porzucenie dziecka / umieszczenie w pieczy - utrata dalszej części, minimum 8 tygodni** - `DURATION` · P2 · AUTOMATABLE · eval: **ACTIVE**

W razie porzucenia dziecka lub umieszczenia go na podstawie orzeczenia sądu w pieczy zastępczej lub zakładzie - nie przysługuje część urlopu po tym dniu, jednak urlop po porodzie nie może wynosić mniej niż 8 tygodni.

- **Podstawa:** KP - KP art. 182; ROZP_DOK § 19
- **Fragment:** „Jednakże urlop macierzyński po porodzie nie może wynosić mniej niż 8 tygodni”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `children.abandoned_or_placed_date` **exists** True
- **Rezultat:** `{"compute": "f_abandonment_end_date", "output": "duration.maternity_end_date"}`
- **Wyjątki:** - · **Zależy od:** MAT-DUR-001 · **Ma pierwszeństwo przed:** MAT-DUR-001
- **Dane:** `children.abandoned_or_placed_date`, `event.date` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### MAT-DUR-007

**Urlop na warunkach urlopu macierzyńskiego - wymiar i limit wieku dziecka** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przy przyjęciu dziecka (rodzina zastępcza niezawodowa / przysposobienie) - 20/31/33/35/37 tygodni wg liczby jednocześnie przyjętych dzieci, nie dłużej niż do ukończenia przez dziecko 7 lat (10 przy odroczeniu obowiązku szkolnego) albo 14 lat przy przysposobieniu.

- **Podstawa:** KP - KP art. 183 § 1, § 1(1)
- **Fragment:** „niedłużej jednak niż do ukończenia przez dziecko 7 roku życia ... niedłużej jednak niż do ukończenia przez dziecko 14 roku życia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **in** ['ADOPTION', 'FOSTER']
- **Rezultat:** `{"compute": "f_maternity_like_leave_period", "output": "duration.maternity_like"}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-002, MAT-ELIG-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `children.count_at_event`, `children.birth_dates`, `children.school_obligation_deferred`, `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-015, T-MAT-022
- **Uwagi:** Koniec = min(start + wymiar, dzień przed urodzinami granicznymi) - 'ukończenie' 7/14 lat = dzień urodzin; urlop trwa do dnia urodzin, niewykorzystana część przepada, bez minimum 9 tyg. (M14 a, c - mentor fachowy 2026-11-21; GAP-005, CONF-003 zamknięte).

### MAT-DUR-008

**9 tygodni urlopu na warunkach urlopu macierzyńskiego (KP 183 § 3) - bez minimum ponad limit wieku** - `DURATION` · P1 · AUTOMATABLE · eval: **INFORMATIONAL**

Pracownik, który przyjął dziecko do 7 (10) lat jako rodzina zastępcza lub do 14 lat przy przysposobieniu, ma prawo do 9 tygodni urlopu na warunkach urlopu macierzyńskiego.

- **Podstawa:** KP - KP art. 183 § 3
- **Fragment:** „ma prawo do 9 tygodni urlopu na warunkach urlopu macierzyńskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **in** ['ADOPTION', 'FOSTER']
    - `f_maternity_like_weeks_after_age_cap` **lt** MATERNITY_LIKE_GUARANTEED_WEEKS (=9)
- **Rezultat:** `{"warning": {"code": "AGE_LIMIT_SHORTENS_LEAVE", "severity": "INFO"}}`
- **Wyjątki:** - · **Zależy od:** MAT-DUR-007 · **Ma pierwszeństwo przed:** -
- **Dane:** `children.birth_dates`, `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-MAT-022
- **Uwagi:** M14 a (2026-11-21, mentor fachowy): 9 tygodni NIE jest minimum - gdy dziecko osiąga graniczny wiek, urlop się skraca, a niewykorzystana część przepada (CONF-003 rozstrzygnięty; Załącznik 'nie krócej niż 9 tygodni' nie obowiązuje). Reguła tylko informuje o skróceniu (wymiar liczy MAT-DUR-007). Dokładna przesłanka przypadku z § 3 (9 tyg.) - tekst KP poza wyciągami w materiałach (M14b).

### MAT-DUR-009

**Tydzień urlopu = 7 dni kalendarzowych; dzień porodu jako pierwszy dzień** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przy urlopie macierzyńskim i na warunkach macierzyńskiego tydzień = 7 dni kalendarzowych; jeśli nie korzystano z urlopu przed porodem, pierwszym dniem jest dzień porodu.

- **Podstawa:** KP - KP art. 183(1) § 1-2
- **Fragment:** „tydzień urlopu odpowiada 7 dniom kalendarzowym ... pierwszym dniem urlopu macierzyńskiego jest dzień porodu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** MATERNITY_BENEFIT
- **Rezultat:** `{"set": {"week_days": {"param": "WEEK_AS_DAYS"}}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** - · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-001
- **Uwagi:** Dla urlopu rodzicielskiego/ojcowskiego/uzupełniającego KP (wyciąg) nie definiuje tygodnia - stosujemy 7 dni jako DERIVED (GAP-003).

### MAT-SHARE-001

**Ojciec przejmuje zasiłek macierzyński po ≥14 tygodniach matki** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Po rezygnacji matki z zasiłku po wykorzystaniu co najmniej 14 tygodni po porodzie, zasiłek za pozostałą część przysługuje ubezpieczonemu ojcu, który uzyskał prawo do urlopu macierzyńskiego lub przerwał działalność zarobkową dla opieki.

- **Podstawa:** USTAWA - USTAWA art. 29 ust. 3; KP art. 180 § 4-5
- **Fragment:** „po wykorzystaniu przez nią tego zasiłku za okres co najmniej 14 tygodni po porodzie, zasiłek macierzyński przysługuje ubezpieczonemu - ojcu dziecka”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **eq** FATHER
    - `f_sickness_insured_on`(date=plan.transfer_start_date) **eq** True
    - `f_mother_maternity_weeks_used_after_birth` **gte** MOTHER_MIN_WEEKS_BEFORE_TRANSFER (=14)
    - `plan.mother_resigns_remaining_maternity` **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE_TRANSFERRED"}}`
- **Wyjątki:** MAT-SHARE-002, MAT-SHARE-004 · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments`, `plan.transfer_start_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-019, T-MAT-020
- **Uwagi:** Okres ojca = wymiar − okres wypłacony matce (art. 29a ust. 2; MAT-SHARE-007). Zasiłek ojca liczony od JEGO podstawy (DERIVED).

### MAT-SHARE-002

**Przejęcie po ≥8 tygodniach - matka niezdolna do samodzielnej egzystencji** - `ELIGIBILITY` · P1 · AUTOMATABLE · eval: **ACTIVE**

Gdy matka legitymuje się orzeczeniem o niezdolności do samodzielnej egzystencji, może zrezygnować po wykorzystaniu co najmniej 8 tygodni; zasiłek przysługuje ojcu albo innemu członkowi najbliższej rodziny.

- **Podstawa:** USTAWA - USTAWA art. 29 ust. 5; KP art. 180 § 6-7
- **Fragment:** „legitymującą się orzeczeniem o niezdolności do samodzielnej egzystencji ... po wykorzystaniu przez nią tego zasiłku za okres co najmniej 8 tygodni”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **in** ['FATHER', 'OTHER_FAMILY_MEMBER']
    - `mother.incapable_of_independent_living_certificate` **eq** True
    - `f_mother_maternity_weeks_used_after_birth` **gte** MOTHER_MIN_WEEKS_SPECIAL (=8)
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE_TRANSFERRED"}}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** MAT-SHARE-001
- **Dane:** `mother.incapable_of_independent_living_certificate`, `plan.segments` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** 'Członek najbliższej rodziny' - definicja w art. 29 ust. 5 nie w pełni w wyciągu (GAP-013).

### MAT-SHARE-003

**Zasiłek dla ojca na czas hospitalizacji matki (po ≥8 tygodniach)** - `ELIGIBILITY` · P1 · AUTOMATABLE · eval: **ACTIVE**

Po wykorzystaniu przez matkę ≥8 tygodni - ojcu/członkowi rodziny przysługuje zasiłek za okres pobytu matki w szpitalu uniemożliwiającego opiekę; zasiłek matki się przerywa.

- **Podstawa:** USTAWA - USTAWA art. 29 ust. 6; KP art. 180 § 10-11; ROZP_DOK § 23-24
- **Fragment:** „przysługuje prawo do zasiłku macierzyńskiego za okres, w którym ubezpieczona - matka dziecka przebywa w szpitalu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **in** ['FATHER', 'OTHER_FAMILY_MEMBER']
    - `mother.hospitalized_unable_to_care` **eq** True
    - `f_mother_maternity_weeks_used_after_birth` **gte** MOTHER_MIN_WEEKS_SPECIAL (=8)
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE_HOSPITALIZATION_SUBSTITUTE", "mother_benefit_interrupted": true}}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `mother.hospital_admission_date`, `mother.hospital_discharge_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### MAT-SHARE-004

**Zgon lub porzucenie dziecka przez ubezpieczoną matkę** - `ELIGIBILITY` · P1 · AUTOMATABLE · eval: **ACTIVE**

W razie zgonu matki lub porzucenia przez nią dziecka zasiłek przysługuje ojcu lub innemu członkowi rodziny; przy porzuceniu - za okres po porzuceniu, nie wcześniej niż po 8 tygodniach zasiłku matki.

- **Podstawa:** USTAWA - USTAWA art. 29 ust. 7; KP art. 180 § 12-13
- **Fragment:** „W przypadku zgonu ubezpieczonej - matki dziecka albo porzucenia przez nią dziecka, zasiłek macierzyński przysługuje ubezpieczonemu - ojcu dziecka”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **in** ['FATHER', 'OTHER_FAMILY_MEMBER']
    - KTÓRYKOLWIEK:
      - `mother.death_date` **exists** True
      - WSZYSTKIE:
        - `mother.abandoned_child_date` **exists** True
        - `f_mother_maternity_weeks_used_after_birth` **gte** MOTHER_MIN_WEEKS_SPECIAL (=8)
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE_TRANSFERRED"}}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** MAT-SHARE-001
- **Dane:** `mother.death_date`, `mother.abandoned_child_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Tryb empatyczny UI. Dokumenty: ROZP_DOK § 20 ust. 3.

### MAT-SHARE-005

**Matka nieubezpieczona - zgon, porzucenie, niezdolność do samodzielnej egzystencji** - `ELIGIBILITY` · P2 · AUTOMATABLE · eval: **ACTIVE**

Gdy matka nie podlega ubezpieczeniu chorobowemu, w razie jej zgonu, porzucenia dziecka lub niezdolności do samodzielnej egzystencji, zasiłek przysługuje ubezpieczonemu ojcu/członkowi rodziny za okres po tym zdarzeniu.

- **Podstawa:** USTAWA - USTAWA art. 29 ust. 9; KP art. 180 § 15
- **Fragment:** „zasiłek macierzyński przysługuje ubezpieczonemu - ojcu dziecka ... za okres przypadający po dniu zaistnienia tych okoliczności”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **in** ['FATHER', 'OTHER_FAMILY_MEMBER']
    - `mother.sickness_insured` **eq** False
    - KTÓRYKOLWIEK:
      - `mother.death_date` **exists** True
      - `mother.abandoned_child_date` **exists** True
      - `mother.incapable_of_independent_living_certificate` **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "MATERNITY_LEAVE_TRANSFERRED"}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `mother.sickness_insured` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### MAT-SHARE-006

**Matka nieubezpieczona podejmuje zatrudnienie ≥½ etatu** - `ELIGIBILITY` · P2 · PARTIALLY_AUTOMATABLE · eval: **BLOCKED**

Gdy matka bez tytułu do ubezpieczenia podejmie zatrudnienie co najmniej na ½ etatu, zasiłek przysługuje ubezpieczonemu ojcu do wyczerpania wymiaru, nie dłużej niż przez okres zatrudnienia matki.

- **Podstawa:** USTAWA - USTAWA art. 29 ust. 10; KP art. 180 § 17
- **Fragment:** „zatrudnienia w wymiarze nieniższym niż połowa pełnego wymiaru czasu pracy, zasiłek macierzyński przysługuje ubezpieczonemu - ojcu dziecka”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **eq** FATHER
    - `mother.sickness_insured` **eq** False
    - `mother.employment_fraction` **gte** 0.5
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "period_capped_by": "MOTHER_EMPLOYMENT_PERIOD"}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `mother.employment_start_date`, `mother.employment_fraction` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja AMBIGUOUS
- **Testy:** -
- **Uwagi:** Ustawa mówi 'nieposiadającą tytułu do objęcia ubezpieczeniem', a jednocześnie matka podejmuje zatrudnienie (które zwykle daje tytuł) - sprzeczność pozorna wymagająca wykładni (CONF-004). BLOKOWANA.

### MAT-SHARE-007

**Łączny limit - wymiar macierzyńskiego nie może być przekroczony przy przejęciu** - `VALIDATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Okres wypłaty zasiłku dla ojca/członka rodziny zmniejsza się o okres wypłaty matce; łączny wymiar nie może przekroczyć wymiaru z KP art. 180 § 1.

- **Podstawa:** USTAWA - USTAWA art. 29a ust. 2; KP art. 180 § 14
- **Fragment:** „okres wypłaty zasiłku macierzyńskiego zmniejsza się o okres wypłaty tego zasiłku ubezpieczonej - matce dziecka”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_total_maternity_weeks_planned` **gt** `f_maternity_leave_weeks`
- **Rezultat:** `{"validation_error": {"code": "MATERNITY_DIMENSION_EXCEEDED"}}`
- **Wyjątki:** - · **Zależy od:** MAT-DUR-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments`, `children.count_at_birth` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-019, T-MAT-021
- **Uwagi:** Walidacja planera (błąd planu, nie odmowa prawa).

### RATE-MAT-001

**100% - macierzyński, na warunkach macierzyńskiego, uzupełniający, ojcowski** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Miesięczny zasiłek za okres urlopu macierzyńskiego, na warunkach macierzyńskiego, uzupełniającego oraz ojcowskiego wynosi 100% podstawy.

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 1
- **Fragment:** „wynosi 100% podstawy wymiaru zasiłku”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `segment.leave_type` **in** ['MATERNITY_LEAVE', 'MATERNITY_LEAVE_TRANSFERRED', 'MATERNITY_LIKE_LEAVE', 'SUPPLEMENTARY_MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'MATERNITY_LEAVE_HOSPITALIZATION_SUBSTITUTE']
- **Rezultat:** `{"set": {"rate": {"param": "MAT_RATE_FULL"}}}`
- **Wyjątki:** RATE-MAT-003 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `segment.leave_type` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-MAT-001, T-PAT-001, T-RATE-002, T-RATE-007

### RATE-MAT-003

**81,5% - wniosek o łączny zasiłek złożony w 21 dni** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Gdy matka (przy przyjęciu dziecka - ubezpieczony) w ciągu 21 dni od porodu/przyjęcia złoży wniosek o zasiłek za pełny wymiar macierzyńskiego/na warunkach i rodzicielskiego, zasiłek za cały ten okres wynosi 81,5% podstawy, z zastrzeżeniem ust. 3f i 3g.

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 3; art. 30a ust. 1-2
- **Fragment:** „W przypadku wniosku, o którym mowa w art. 30a, miesięczny zasiłek ... wynosi 81,5% podstawy wymiaru zasiłku, z zastrzeżeniem ust. 3f i 3g”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `segment.leave_type` **in** ['MATERNITY_LEAVE', 'MATERNITY_LIKE_LEAVE', 'PARENTAL_LEAVE']
    - `f_segment_belongs_to_applicant_of_combined` **eq** True
    - `f_combined_application_within_deadline` **eq** True
- **Rezultat:** `{"set": {"rate": {"param": "MAT_RATE_COMBINED"}}}`
- **Wyjątki:** RATE-MAT-004, RATE-MAT-005 · **Zależy od:** APP-DL-001 · **Ma pierwszeństwo przed:** RATE-MAT-001, RATE-MAT-002
- **Dane:** `applications.combined_815_filed_date`, `event.date`, `segment.leave_type`, `segment.parent` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-RATE-001, T-RATE-002, T-RATE-009, T-INT-001
- **Uwagi:** Nie obejmuje uzupełniającego (100% - M15 c) i ojcowskiego (100%). Część rodzicielskiego przejęta przez OJCA - 81,5% (RATE-MAT-008, M11).

### RATE-MAT-006

**Jednorazowe wyrównanie macierzyńskiego do 100%** - `CALCULATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Gdy w 1. roku życia nie wykorzystano żadnego dnia rodzicielskiego przy wniosku 81,5%, na wniosek przysługuje jednorazowe wyrównanie zasiłku za okres urlopu macierzyńskiego do 100%.

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 4
- **Fragment:** „przysługuje jednorazowe wyrównanie pobranego zasiłku macierzyńskiego za okres urlopu macierzyńskiego do wysokości 100%”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_combined_application_within_deadline` **eq** True
    - `f_any_parental_day_in_first_year` **eq** False
- **Rezultat:** `{"compute": "f_one_off_equalization", "output": "amount.equalization"}`
- **Wyjątki:** - · **Zależy od:** RATE-MAT-003, RATE-MAT-005 · **Ma pierwszeństwo przed:** -
- **Dane:** `applications.combined_815_filed_date`, `plan.segments` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Wyrównanie = (100% − 81,5%) × base/30 × dni macierzyńskiego (DERIVED). Wymaga wniosku - informacja w przewodniku.

### RATE-MAT-007

**Podwyższenie do kwoty świadczenia rodzicielskiego** - `CALCULATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Jeżeli miesięczna kwota zasiłku jest niższa niż świadczenie rodzicielskie (ustawa o świadczeniach rodzinnych), podwyższa się ją do tej kwoty (proporcjonalnie za część miesiąca).

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 3a-3c; art. 62 ust. 4-6; ROZP_DOK § 28
- **Fragment:** „kwotę zasiłku macierzyńskiego podwyższa się do wysokości świadczenia rodzicielskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_monthly_maternity_amount` **lt** PARENTAL_BENEFIT_FLOOR_MONTHLY (=1000.00)
- **Rezultat:** `{"compute": "f_raise_to_parental_benefit_floor", "output": "amount.floor_raise"}`
- **Wyjątki:** - · **Zależy od:** RATE-MAT-001, RATE-MAT-002, RATE-MAT-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-RATE-008
- **Uwagi:** Odblokowana po odpowiedzi mentora M10 (2026-11-21): świadczenie rodzicielskie = 1000 zł miesięcznie (PARENTAL_BENEFIT_FLOOR_MONTHLY), uwzględniamy w MVP; porównanie miesięcznej kwoty base × rate × (1 − wf) przed zaokrągleniem. Po podwyższeniu: każdy pełny miesiąc kalendarzowy = 1000 zł, niepełny miesiąc proporcjonalnie do liczby dni danego miesiąca (1000 × dni / dni miesiąca) - M10c, mentor fachowy 2026-11-21 (ust. 3b-3c). Przy pracy w niepełnym wymiarze - bez podwyższenia do czasu ustalenia. GAP-002 częściowo zamknięty.

### APP-DL-001

**Termin 21 dni na wniosek o zasiłek 81,5%** - `DEADLINE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Wniosek o wypłatę zasiłku za pełny wymiar macierzyńskiego i rodzicielskiego składa się nie później niż 21 dni po porodzie (przy przyjęciu dziecka - po przyjęciu i wystąpieniu do sądu / przyjęciu jako rodzina zastępcza).

- **Podstawa:** USTAWA - USTAWA art. 30a ust. 1-2
- **Fragment:** „niepóźniej niż 21 dni po porodzie, może złożyć pisemny wniosek”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.date` **exists** True
- **Rezultat:** `{"compute": "f_combined_application_deadline", "output": "deadlines.combined_815_last_day"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-RATE-001, T-RATE-009
- **Uwagi:** Ostatni dzień = event.date + 21 dni (DERIVED: liczenie od dnia następnego po porodzie); termin w sobotę, niedzielę lub święto → następny dzień roboczy (M15 d, mentor fachowy 2026-11-21; GAP-020 zamknięty). Lista świąt - parametr PUBLIC_HOLIDAYS z pliku zus_rules/public_holidays.yaml (2026–2031, lista zespołu - CONFIRMED przez lidera 2026-11-21, ustawa o dniach wolnych od pracy niezałączona). Wynik sprawdza f_combined_application_within_deadline.

### APP-DOC-001

**Dokumenty - urlop macierzyński przed porodem** - `DOCUMENT_REQUIREMENT` · P0 · AUTOMATABLE · eval: **INFORMATIONAL**

Za okres przed porodem - zaświadczenie lekarskie o przewidywanej dacie porodu (zwykły druk; od wejścia w życie § 39 - także elektronicznie).

- **Podstawa:** ROZP_DOK - ROZP_DOK § 13 ust. 1 pkt 1; USTAWA art. 53 ust. 2; ROZP_WN § 2
- **Fragment:** „zaświadczenie lekarskie wystawione na zwykłym druku określające przewidywaną datę porodu – za okres przed dniem porodu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_has_pre_birth_maternity_segment` **eq** True
- **Rezultat:** `{"documents": [{"doc": "DUE_DATE_MEDICAL_CERTIFICATE", "provider": "DOCTOR"}]}`
- **Wyjątki:** - · **Zależy od:** MAT-DUR-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### APP-DOC-002

**Dokumenty - urodzenie dziecka (akt urodzenia / martwe urodzenie)** - `DOCUMENT_REQUIREMENT` · P0 · AUTOMATABLE · eval: **INFORMATIONAL**

Od dnia porodu - odpis skrócony aktu urodzenia (nie przedstawia się, gdy płaci ZUS - ZUS pobiera z rejestru; wezwanie z terminem ≥14 dni, gdy nie może pobrać); przy martwym urodzeniu bez aktu - zaświadczenie lekarza/położnej o martwym urodzeniu.

- **Podstawa:** ROZP_DOK - ROZP_DOK § 13 ust. 1 pkt 2, ust. 2-4
- **Fragment:** „Odpisu skróconego aktu urodzenia dziecka nie przedstawia się, jeżeli płatnikiem zasiłku jest Zakład”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
- **Rezultat:** `{"documents": [{"doc": "BIRTH_CERTIFICATE_SHORT", "when": "payer_of_benefit=CONTRIBUTION_PAYER"}, {"doc": "CHILD_DATA_FOR_ZUS_REGISTRY_LOOKUP", "when": "payer_of_benefit=ZUS"}, {"doc": "STILLBIRTH_CERTIFICATE", "when": "stillbirth and no birth act"}]}`
- **Wyjątki:** - · **Zależy od:** GEN-CLS-001, GEN-CLS-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `event.type` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Brak dokumentu po wezwaniu ZUS → odmowa wszczęcia postępowania (§ 13 ust. 4) - informacja w przewodniku, NIE odmowa prawa w silniku.

### APP-DOC-003

**Dokumenty - wniosek o zasiłek macierzyński do ZUS (zał. 6) / zaświadczenie płatnika** - `DOCUMENT_REQUIREMENT` · P0 · AUTOMATABLE · eval: **INFORMATIONAL**

Gdy płaci ZUS - dokument z danymi z zał. 6 (wniosek) lub zaświadczenie płatnika (Z-3/Z-3a); do wniosku przy dziecku „Za życiem” - oświadczenie o zaświadczeniu.

- **Podstawa:** ROZP_DOK - ROZP_DOK § 12, § 3 ust. 2, zał. 6; USTAWA art. 61b ust. 4a
- **Fragment:** „Dokumentami niezbędnymi do przyznania i wypłaty zasiłku macierzyńskiego przez Zakład są dokument zawierający dane i informacje określone w załączniku nr 6”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** MATERNITY_BENEFIT
- **Rezultat:** `{"documents": [{"doc": "MATERNITY_APPLICATION_ANNEX6", "when": "payer_of_benefit=ZUS"}, {"doc": "PAYER_CERTIFICATE_Z3_OR_Z3A", "when": "payer_of_benefit=ZUS and has_contribution_payer"}, {"doc": "ZA_ZYCIEM_STATEMENT", "when": "children.za_zyciem_certificate=true"}]}`
- **Wyjątki:** - · **Zależy od:** GEN-CLS-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `children.za_zyciem_certificate` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** -
- **Uwagi:** Symbol ZAM (połączony z ZUR, ZAO od 24.10.2026) - z treści zadania, nie z rozporządzenia.

### APP-DOC-004

**Dokumenty - macierzyński po ustaniu ubezpieczenia / zasiłek w wysokości macierzyńskiego** - `DOCUMENT_REQUIREMENT` · P1 · AUTOMATABLE · eval: **INFORMATIONAL**

Zaświadczenie lekarskie o ciąży w okresie zatrudnienia, świadectwo pracy lub dokument o wygaśnięciu/rozwiązaniu (śmierć, upadłość, likwidacja) albo prawomocne orzeczenie sądu; przy zasiłku w wysokości macierzyńskiego - oświadczenie o braku innego zatrudnienia.

- **Podstawa:** ROZP_DOK - ROZP_DOK § 15 ust. 1-3, § 17
- **Fragment:** „zaświadczenie lekarskie wystawione na zwykłym druku stwierdzające stan ciąży w okresie zatrudnienia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - KTÓRYKOLWIEK:
    - `entitlement_basis` **in** ['AFTER_TITLE_EMPLOYER_CEASED', 'AFTER_TITLE_UNLAWFUL_TERMINATION']
    - `benefit` **eq** MATERNITY_EQUIVALENT_ALLOWANCE
- **Rezultat:** `{"documents": [{"doc": "PREGNANCY_DURING_EMPLOYMENT_CERTIFICATE"}, {"doc": "EMPLOYMENT_CERTIFICATE_TERMINATION_REASON"}, {"doc": "FINAL_COURT_JUDGMENT", "when": "AFTER_TITLE_UNLAWFUL_TERMINATION"}, {"doc": "NO_OTHER_EMPLOYMENT_STATEMENT", "when": "MATERNITY_EQUIVALENT_ALLOWANCE"}]}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-004, MAT-ELIG-005, MAT-ELIG-007 · **Ma pierwszeństwo przed:** -
- **Dane:** - · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### APP-DOC-005

**Dokumenty - przyjęcie dziecka (przysposobienie / rodzina zastępcza)** - `DOCUMENT_REQUIREMENT` · P0 · AUTOMATABLE · eval: **INFORMATIONAL**

Przysposobienie - oświadczenie o dacie przyjęcia + zaświadczenie sądu o dacie wystąpienia (z datą urodzenia dziecka) lub kopia wniosku z poświadczeniem sądu; rodzina zastępcza - orzeczenie sądu lub umowa ze starostą, dokument o wieku dziecka, decyzja o odroczeniu obowiązku szkolnego (gdy dotyczy).

- **Podstawa:** ROZP_DOK - ROZP_DOK § 16 ust. 1-2; ROZP_WN § 18
- **Fragment:** „oświadczenie ubezpieczonego o dacie przyjęcia dziecka na wychowanie”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **in** ['ADOPTION', 'FOSTER']
- **Rezultat:** `{"documents": [{"doc": "CHILD_ACCEPTANCE_DATE_STATEMENT", "when": "ADOPTION"}, {"doc": "COURT_ADOPTION_APPLICATION_CONFIRMATION", "when": "ADOPTION"}, {"doc": "FOSTER_COURT_ORDER_OR_STAROSTA_CONTRACT", "when": "FOSTER"}, {"doc": "CHILD_AGE_DOCUMENT", "when": "FOSTER"}, {"doc": "SCHOOL_DEFERRAL_DECISION", "when": "children.school_obligation_deferred=true"}]}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-002, MAT-ELIG-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `event.type` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### APP-DOC-006

**Dokumenty - rodzicielski, ojcowski, uzupełniający, przejęcie przez ojca** - `DOCUMENT_REQUIREMENT` · P1 · AUTOMATABLE · eval: **INFORMATIONAL**

Rodzicielski - oświadczenia o planach drugiego rodzica, zaświadczenia pracodawcy o urlopie i wymiarze pracy, oświadczenie o wcześniejszych częściach i stawkach; ojcowski - akt urodzenia/postanowienie o przysposobieniu, oświadczenie o pobraniu z innego tytułu; uzupełniający - zaświadczenie szpitala; przejęcie przez ojca - zaświadczenie płatnika o okresie i stawce zasiłku matki.

- **Podstawa:** ROZP_DOK - ROZP_DOK § 20, § 26-27, § 29-30, § 32-33; ROZP_WN § 5, § 14, § 15, § 17
- **Fragment:** „zaświadczenie płatnika zasiłku o okresie przysługującego i wypłaconego matce dziecka zasiłku macierzyńskiego oraz stawce procentowej”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `segment.leave_type` **in** ['PARENTAL_LEAVE', 'PATERNITY_LEAVE', 'SUPPLEMENTARY_MATERNITY_LEAVE', 'MATERNITY_LEAVE_TRANSFERRED']
- **Rezultat:** `{"compute": "f_documents_for_segment", "output": "documents"}`
- **Wyjątki:** - · **Zależy od:** GEN-CLS-001, GEN-CLS-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Mapa segment→dokumenty w 07_CALCULATION_SPEC (f_documents_for_segment). ROZP_WN § 22: nie dołącza się dokumentów będących w aktach osobowych.

### CALC-MAT-001

**Kwota zasiłku macierzyńskiego za segment** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Kwota = podstawa × stawka × (1 − wymiar pracy) / 30 × liczba dni kalendarzowych segmentu; zasiłek przysługuje za każdy dzień, łącznie z wolnymi.

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 1-3, 4a, 5 (→ art. 11 ust. 4); art. 47 (→ art. 36 ust. 3)
- **Fragment:** „Do zasiłku macierzyńskiego stosuje się odpowiednio przepisy art. 11 ust. 4”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `benefit` **eq** MATERNITY_BENEFIT
    - `f_benefit_base` **exists** True
- **Rezultat:** `{"compute": "f_benefit_amount", "output": "amount"}`
- **Wyjątki:** - · **Zależy od:** RATE-MAT-001, RATE-MAT-002, RATE-MAT-003, RATE-MAT-004, RATE-MAT-005, PAR-WORK-003, BASE-EMP-001, BASE-NEMP-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments`, `income_history` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DERIVED
- **Testy:** T-MAT-001, T-RATE-001, T-RATE-008
- **Uwagi:** Dzienna stawka 1/30 dla zasiłku macierzyńskiego wynika z odesłania art. 47 → art. 36 ust. 3 'odpowiednio' (DERIVED) - potwierdzone przez mentora fachowego ZUS (M09, 2026-11-21): stawka dzienna = podstawa / 30. Zaokrąglenia - GAP-001. Kwota 'miesięczna' w UI = base × rate (informacyjnie).


## Zasiłek w wysokości zasiłku macierzyńskiego

### MAT-ELIG-007

**Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu** - `ELIGIBILITY` · P1 · AUTOMATABLE · eval: **ACTIVE**

Pracownicy, której umowa wygasła z powodu śmierci pracodawcy lub z którą rozwiązano umowę w ciąży z powodu upadłości lub likwidacji pracodawcy albo z naruszeniem przepisów prawa stwierdzonym przez sąd (treść zadania, M16 a) i nie zapewniono innego zatrudnienia, przysługuje do dnia poprzedzającego poród zasiłek w wysokości zasiłku macierzyńskiego (od dnia porodu - zasiłek macierzyński).

- **Podstawa:** USTAWA - art. 30 ust. 3; KP art. 177 § 4; treść zadania (CONF-001, M16 a)
- **Fragment:** „przysługuje do dnia porodu zasiłek w wysokości zasiłku macierzyńskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employee_title_last` **eq** True
    - `f_title_ended_during_pregnancy` **eq** True
    - `f_last_title_termination_reason` **in** ['EMPLOYER_DEATH', 'EMPLOYER_BANKRUPTCY', 'EMPLOYER_LIQUIDATION', 'UNLAWFUL_TERMINATION_COURT_CONFIRMED']
    - `employment.other_employment_provided` **eq** False
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_EQUIVALENT_ALLOWANCE", "period_end": "DAY_BEFORE_BIRTH", "rate": {"param": "MAT_RATE_FULL"}, "payer_of_benefit": "ZUS"}}`
- **Wyjątki:** GEN-EXCL-001 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles`, `pregnancy.pregnancy_start_date`, `employment.other_employment_provided` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-MAT-006, T-MAT-007
- **Uwagi:** CONF-001 rozstrzygnięty przez mentora fachowego ZUS (M16 a, 2026-11-21): stosujemy treść zadania - zasiłek przysługuje także po rozwiązaniu umowy w ciąży z naruszeniem przepisów prawa stwierdzonym przez sąd (UNLAWFUL_TERMINATION_COURT_CONFIRMED); wyciąg ustawy w materiałach wymienia tylko śmierć/upadłość/likwidację. Postępowanie w toku (UNLAWFUL_TERMINATION_PENDING) - prawo nie jest jeszcze stwierdzone. Stawka 100% - DERIVED z 'w wysokości zasiłku macierzyńskiego' i art. 31 ust. 1. 'Do dnia porodu' = do dnia poprzedzającego poród (M15 e, mentor fachowy 2026-11-21).


## Uzupełniający urlop macierzyński

### SUPP-ELIG-001

**Uzupełniający urlop - poród przed 28. tyg. lub masa ≤1000 g** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Tydzień urlopu za każdy tydzień pobytu dziecka w szpitalu do upływu 15. tygodnia po porodzie.

- **Podstawa:** KP - KP art. 180(2) § 1 pkt 1
- **Fragment:** „przed ukończeniem 28. tygodnia ciąży lub z masą urodzeniową niewiększą niż 1000 g - w wymiarze tygodnia ... za każdy tydzień pobytu dziecka w szpitalu do upływu 15. tygodnia po porodzie”
- **Obowiązuje:** od - do -
- **Warunki:**
  - KTÓRYKOLWIEK:
    - `birth.completed_gestation_weeks` **lt** SUPP_GESTATION_EARLY_WEEK (=28)
    - `f_weight_at_most_threshold` **eq** True
- **Rezultat:** `{"compute": "f_supplementary_leave_weeks", "args": {"cap_week": {"param": "SUPP_CAP_WEEK_EARLY"}, "window_start_day": 1}, "output": "duration.supplementary_weeks"}`
- **Wyjątki:** - · **Zależy od:** SUPP-COND-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `birth.completed_gestation_weeks`, `birth.weight_at_most_threshold`, `children.items`, `children.hospital_stays` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SUPP-001, T-SUPP-002
- **Uwagi:** 'Przed ukończeniem 28. tygodnia' = completed_gestation_weeks < 28 (DERIVED: ukończone tygodnie). Okno liczone od dnia porodu (window_start_day=1, dzień porodu = dzień 1, M15 a). Masa: odpowiedź `birth.weight_at_most_threshold` (kreator, FE1-05) albo wyliczenie z `birth_weight_g` (f_weight_at_most_threshold).

### SUPP-ELIG-002

**Uzupełniający urlop - poród 28–37 tydz. i masa >1000 g** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Tydzień urlopu za każdy tydzień pobytu dziecka w szpitalu do upływu 8. tygodnia po porodzie.

- **Podstawa:** KP - KP art. 180(2) § 1 pkt 2
- **Fragment:** „po ukończeniu 28. tygodnia ciąży i przed ukończeniem 37. tygodnia ciąży i z masą urodzeniową większą niż 1000 g ... do upływu 8. tygodnia po porodzie”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `birth.completed_gestation_weeks` **gte** SUPP_GESTATION_EARLY_WEEK (=28)
    - `birth.completed_gestation_weeks` **lt** SUPP_GESTATION_TERM_WEEK (=37)
    - `f_weight_at_most_threshold` **eq** False
- **Rezultat:** `{"compute": "f_supplementary_leave_weeks", "args": {"cap_week": {"param": "SUPP_CAP_WEEK_PRETERM"}, "window_start_day": 1}, "output": "duration.supplementary_weeks"}`
- **Wyjątki:** - · **Zależy od:** SUPP-COND-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `birth.completed_gestation_weeks`, `birth.weight_at_most_threshold`, `children.items`, `children.hospital_stays` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SUPP-003, T-INT-003

### SUPP-ELIG-003

**Uzupełniający urlop - poród po 37. tyg. i hospitalizacja ≥2 dni od 5.–28. dnia** - `DURATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Tydzień urlopu za każdy tydzień pobytu w szpitalu od 5. dnia do upływu 8. tygodnia po porodzie, jeśli pobyt trwał ≥2 kolejne dni, a pierwszy z nich przypadał między 5. a 28. dniem po porodzie.

- **Podstawa:** KP - KP art. 180(2) § 1 pkt 3
- **Fragment:** „pobyt dziecka w szpitalu po porodzie będzie wynosił co najmniej 2 kolejne dni, przy czym pierwszy z tych dni będzie przypadał w okresie od 5. do 28. dnia po porodzie”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `birth.completed_gestation_weeks` **gte** SUPP_GESTATION_TERM_WEEK (=37)
    - `f_has_qualifying_late_hospital_stay` **eq** True
- **Rezultat:** `{"compute": "f_supplementary_leave_weeks", "args": {"cap_week": {"param": "SUPP_CAP_WEEK_PRETERM"}, "window_start_day": {"param": "SUPP_TERM_WINDOW_FIRST_DAY"}}, "output": "duration.supplementary_weeks"}`
- **Wyjątki:** - · **Zależy od:** SUPP-COND-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `birth.completed_gestation_weeks`, `children.hospital_stays`, `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DIRECT
- **Testy:** T-SUPP-004, T-SUPP-005, T-SUPP-008, T-SUPP-009, T-SUPP-010, T-SUPP-011
- **Uwagi:** Numeracja dni po porodzie: dzień porodu = dzień 1 (M15 a, mentor fachowy ZUS 2026-11-21; GAP-010 zamknięty) - 5. dzień = data porodu + 4 dni, 28. dzień = data porodu + 27 dni (ASSUMPTION-SUPP-DAY1).

### SUPP-CALC-001

**Uzupełniający urlop - wieloraczki, sumowanie, zaokrąglenie w górę** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przy kilkorgu dzieciach - masa najlżejszego dziecka i pobyt najdłużej hospitalizowanego; okresy pobytu w oknie sumuje się; niepełny tydzień zaokrągla się w górę.

- **Podstawa:** KP - KP art. 180(2) § 2-3
- **Fragment:** „okresy pobytu dziecka w szpitalu ... sumuje się. Niepełny tydzień zaokrągla się w górę do pełnego tygodnia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `children.hospital_stays` **exists** True
- **Rezultat:** `{"compute": "f_supplementary_leave_weeks", "output": "duration.supplementary_weeks"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `children.hospital_stays`, `children.items` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-SUPP-001, T-SUPP-006
- **Uwagi:** Liczba dni pobytu = dni kalendarzowe w oknie (oba końce włącznie - DERIVED).

### SUPP-COND-001

**Uzupełniający urlop - warunki udzielenia** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Udzielany bezpośrednio po urlopie macierzyńskim, jednorazowo, matce albo ojcu (jednemu z nich), na wniosek ≥21 dni przed końcem urlopu macierzyńskiego, z zaświadczeniem szpitala; przy przyjęciu dziecka - gdy pobyt w szpitalu nastąpił po przyjęciu.

- **Podstawa:** KP - KP art. 180(2) § 1, § 4-5; art. 183 § 3(1); ROZP_DOK § 26-27
- **Fragment:** „ma prawo bezpośrednio po wykorzystaniu urlopu macierzyńskiego do uzupełniającego urlopu macierzyńskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_maternity_benefit_eligible_any_parent` **eq** True
    - `f_supplementary_claimants_count` **lte** 1
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "SUPPLEMENTARY_MATERNITY_LEAVE", "start": "IMMEDIATELY_AFTER_MATERNITY", "parts": 1}}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-001, MAT-ELIG-002, MAT-ELIG-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-RATE-007, T-INT-003
- **Uwagi:** Stawka 100% (RATE-MAT-001), także przy wniosku 81,5% - art. 31 ust. 3 nie obejmuje uzupełniającego (CONF-005; potwierdzone przez mentora M15 c, 2026-11-21).


## Urlop rodzicielski

### PAR-DUR-001

**Wymiar urlopu rodzicielskiego - 41/43 tygodnie** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Łącznie dla obojga rodziców 41 tygodni (1 dziecko) lub 43 tygodnie (2+ dzieci przy jednym porodzie).

- **Podstawa:** KP - KP art. 182(1a) § 1, § 3
- **Fragment:** „w wymiarze do: 1) 41 tygodni ...; 2) 43 tygodni ... przysługuje łącznie obojgu pracownikom - rodzicom”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `children.za_zyciem_certificate` **eq** False
- **Rezultat:** `{"compute": "f_parental_leave_weeks", "output": "duration.parental_pool_weeks"}`
- **Wyjątki:** PAR-DUR-002 · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `children.count_at_birth`, `children.za_zyciem_certificate` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-PAR-001, T-PAR-003, T-INT-003, T-INT-004
- **Uwagi:** Przy martwym urodzeniu/zgonie dziecka urlop rodzicielski nie przysługuje (cel: opieka nad dzieckiem) - DERIVED, oznaczone NEEDS_REVIEW w UI dla zgonu po rozpoczęciu rodzicielskiego (GAP-014).

### PAR-DUR-002

**Wymiar urlopu rodzicielskiego - „Za życiem” 65/67 tygodni** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Dla dziecka z zaświadczeniem „Za życiem” - 65 tygodni (1 dziecko) lub 67 (2+).

- **Podstawa:** KP - KP art. 182(1a) § 2; USTAWA art. 61b ust. 4a
- **Fragment:** „Pracownicy - rodzice dziecka posiadającego zaświadczenie ... ,,Za życiem'', ... w wymiarze do: 1) 65 tygodni”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **eq** BIRTH
    - `children.za_zyciem_certificate` **eq** True
- **Rezultat:** `{"compute": "f_parental_leave_weeks", "output": "duration.parental_pool_weeks"}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-001 · **Ma pierwszeństwo przed:** PAR-DUR-001
- **Dane:** `children.count_at_birth`, `children.za_zyciem_certificate` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-PAR-002, T-PAR-003
- **Uwagi:** Do wniosku o zasiłek: oświadczenie o posiadaniu zaświadczenia (art. 61b ust. 4a). 'Za życiem' przy wieloraczkach - wystarczy jedno dziecko? - GAP-015.

### PAR-DUR-003

**Wymiar urlopu rodzicielskiego - przyjęcie dziecka (zastępcza / przysposobienie)** - `DURATION` · P1 · PARTIALLY_AUTOMATABLE · eval: **ACTIVE**

41/43 tygodnie; 38 tygodni w przypadku z art. 183 § 3 (dziecko w granicznym wieku); „Za życiem” 65/67, a w przypadku § 3 - 62 tygodnie; przy przysposobieniu nie dłużej niż do 14 lat.

- **Podstawa:** KP - KP art. 183 § 4, § 4(1), § 4(2), § 4(3), § 4(4), § 4(5)
- **Fragment:** „3) 38 tygodni - w przypadku, o którym mowa w § 3”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `event.type` **in** ['ADOPTION', 'FOSTER']
- **Rezultat:** `{"compute": "f_parental_leave_weeks", "output": "duration.parental_pool_weeks"}`
- **Wyjątki:** - · **Zależy od:** MAT-ELIG-002, MAT-ELIG-003, MAT-DUR-008 · **Ma pierwszeństwo przed:** PAR-DUR-001, PAR-DUR-002
- **Dane:** `children.count_at_event`, `children.za_zyciem_certificate`, `children.birth_dates`, `event.date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** -
- **Uwagi:** Wariant 38/62 tyg. - 'w przypadku, o którym mowa w § 3' (KP 183 § 4 pkt 3, § 4(2), § 4(5); parametry PARENTAL_WEEKS_ADOPT_GUARANTEED*). M14 b: mentor polecił ustalić samodzielnie - materiały zawierają tylko te odesłania, nie pełną treść § 3, więc przesłanka wariantu 38/62 wymaga potwierdzenia (M14b) → gdy zachodzi § 3, NEEDS_REVIEW. Przy przysposobieniu nie dłużej niż do 14. urodzin (M14 c). Załącznik pomija 38/62 tygodni (CONF-003).

### PAR-SHARE-001

**9 tygodni urlopu rodzicielskiego nieprzenoszalne dla każdego rodzica** - `VALIDATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Każdemu z rodziców przysługuje wyłączne prawo do 9 tygodni z puli; nie można go przenieść na drugiego rodzica.

- **Podstawa:** KP - KP art. 182(1a) § 4-5; USTAWA art. 30a ust. 1, 31 ust. 3f
- **Fragment:** „Każdemu z pracowników - rodziców dziecka przysługuje wyłączne prawo do 9 tygodni urlopu rodzicielskiego ... Prawa tego nie można przenieść”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_parental_weeks_planned_for_parent`(parent=MOTHER) **gt** `f_parental_pool_minus_other_parent_reserved`
- **Rezultat:** `{"validation_error": {"code": "NON_TRANSFERABLE_9W_VIOLATED"}}`
- **Wyjątki:** - · **Zależy od:** PAR-DUR-001, PAR-DUR-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-PAR-004, T-PAR-005, T-INT-001, T-PAR-011
- **Uwagi:** Jeden rodzic może wykorzystać maks. pula − 9 tyg. (np. 32 z 41). Czy 9 tyg. jest zarezerwowane, gdy drugi rodzic nie ma prawa (np. nieubezpieczony)? - przepis KP dotyczy 'pracowników-rodziców'; zastosowanie do sytuacji, gdy drugi rodzic nie ma tytułu - NEEDS_REVIEW (GAP-016).

### PAR-SHARE-002

**Jednoczesne korzystanie - łączny wymiar nie może przekroczyć puli** - `VALIDATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Rodzice mogą jednocześnie korzystać z urlopu/zasiłku rodzicielskiego; łączny okres nie może przekroczyć wymiaru z KP.

- **Podstawa:** USTAWA - USTAWA art. 29a ust. 3-4; KP art. 182(1a) § 6-7
- **Fragment:** „łączny okres zasiłku macierzyńskiego nie może przekraczać wymiaru urlopu rodzicielskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_total_parental_weeks_planned` **gt** `f_parental_leave_weeks`
- **Rezultat:** `{"validation_error": {"code": "PARENTAL_POOL_EXCEEDED"}}`
- **Wyjątki:** - · **Zależy od:** PAR-DUR-001, PAR-DUR-002, PAR-DUR-003, PAR-WORK-002 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-PAR-010, T-PAR-011
- **Uwagi:** Przy jednoczesnym korzystaniu tydzień kalendarzowy zużywa 2 tygodnie puli (DERIVED z 'łączny wymiar').

### PAR-SHARE-003

**Ojciec - rodzicielski, gdy matka nie była ubezpieczona w dniu porodu** - `ELIGIBILITY` · P1 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek za okres urlopu rodzicielskiego przysługuje ojcu także wtedy, gdy matka w dniu porodu nie była ubezpieczona i nie korzystała z zasiłku za okres urlopu macierzyńskiego (finansowanie z budżetu).

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 3h; treść zadania pkt B
- **Fragment:** „Zasiłek macierzyński odpowiadający okresowi urlopu rodzicielskiego pobierany przez ubezpieczonego - ojca dziecka, w przypadku gdy matka dziecka nie jest objęta ubezpieczeniem”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **eq** FATHER
    - `f_sickness_insured_on`(date=plan.parental_start_date) **eq** True
    - `mother.sickness_insured` **eq** False
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "PARENTAL_LEAVE", "funded_by": "STATE_BUDGET"}}`
- **Wyjątki:** - · **Zależy od:** PAR-DUR-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `mother.sickness_insured`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** -
- **Uwagi:** Ust. 3h reguluje finansowanie i pośrednio potwierdza prawo; wprost opisuje to treść zadania. Ubezpieczenie ojca badane w dniu startu jego części rodzicielskiego (M12 b). Dokumenty: ROZP_DOK § 32.

### PAR-ELIG-001

**Zasiłek za okres urlopu rodzicielskiego - ubezpieczony rodzic** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Za okres urlopu rodzicielskiego (u niepracowników - okres odpowiadający) przysługuje zasiłek macierzyński ubezpieczonemu rodzicowi, jeśli ustalono prawo do zasiłku macierzyńskiego z tytułu urodzenia/przyjęcia dziecka i rodzic jest ubezpieczony w okresie korzystania.

- **Podstawa:** USTAWA - USTAWA art. 29a ust. 1, 3; KP art. 184
- **Fragment:** „Zasiłek macierzyński przysługuje przez okres ustalony przepisami Kodeksu pracy jako okres ... urlopu rodzicielskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **in** ['MOTHER', 'FATHER', 'ADOPTIVE_PARENT', 'FOSTER_PARENT']
    - `f_sickness_insured_on`(date=plan.parental_start_date) **eq** True
    - `f_child_alive_on`(date=plan.parental_start_date) **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "PARENTAL_LEAVE"}}`
- **Wyjątki:** GEN-EXCL-001, PAR-COND-001 · **Zależy od:** PAR-DUR-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles`, `plan.parental_start_date`, `children.items` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-RATE-003, T-INT-004
- **Uwagi:** Ustawa wiąże prawo z art. 29 (zdarzenie w okresie ubezpieczenia); ojciec musi podlegać ubezpieczeniu chorobowemu w dniu rozpoczęcia swojej części urlopu rodzicielskiego (nie w dniu porodu) - potwierdzone przez mentora fachowego ZUS (M12 b, 2026-11-21), Q-LEG-02 zamknięte.

### PAR-COND-001

**Urlop rodzicielski - maks. 5 części, do końca roku, w którym dziecko kończy 6 lat** - `VALIDATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Udzielany jednorazowo albo w maks. 5 częściach, nie później niż do końca roku kalendarzowego, w którym dziecko kończy 6 lat; do liczby części wlicza się wnioski o zasiłek niepracowników.

- **Podstawa:** KP - KP art. 182(1c); art. 182(1d) § 2; art. 183 § 4(6)
- **Fragment:** „jednorazowo albo niewięcej niż w 5 częściach niepóźniej niż do zakończenia roku kalendarzowego, w którym dziecko kończy 6 rok życia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - KTÓRYKOLWIEK:
    - `f_parental_parts_count` **gt** PARENTAL_MAX_PARTS (=5)
    - `f_parental_last_day_after_limit` **eq** True
- **Rezultat:** `{"validation_error": {"code": "PARENTAL_PARTS_OR_DEADLINE_VIOLATED"}}`
- **Wyjątki:** - · **Zależy od:** PAR-DUR-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments`, `children.birth_dates` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-PAR-008, T-PAR-009
- **Uwagi:** Przy przysposobieniu limit: 14 lat (KP 183 § 4(1)); dla rodziny zastępczej limit wieku - art. 183 § 5 odsyła do 182(1c) (DERIVED). Czy części liczone łącznie dla obojga rodziców? - przepis 'urlop' (jeden) → przyjmujemy łącznie (GAP-017).

### PAR-WORK-001

**Łączenie urlopu rodzicielskiego z pracą do ½ etatu** - `VALIDATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Pracownik może łączyć urlop rodzicielski z pracą u pracodawcy udzielającego urlopu w wymiarze nie wyższym niż połowa etatu; wniosek ≥21 dni wcześniej.

- **Podstawa:** KP - KP art. 182(1e) § 1-2
- **Fragment:** „w wymiarze niewyższym niż połowa pełnego wymiaru czasu pracy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_max_work_fraction_in_parental` **gt** PARENTAL_WORK_MAX_FRACTION (=0.5)
- **Rezultat:** `{"validation_error": {"code": "WORK_FRACTION_ABOVE_HALF"}}`
- **Wyjątki:** - · **Zależy od:** PAR-DUR-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-PAR-007
- **Uwagi:** Dotyczy pracowników. Dla niepracowników łączenie zasiłku z pracą - przepisy niezałączone (GAP-018) → NEEDS_REVIEW.

### PAR-WORK-002

**Proporcjonalne wydłużenie urlopu rodzicielskiego przy pracy** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Wymiar wydłuża się o iloczyn liczby tygodni łączenia i wymiaru pracy; limity 82/86 tygodni (130/134 „Za życiem”); część wydłużona nie będąca wielokrotnością tygodnia - w dniach, niepełny dzień pomija się.

- **Podstawa:** KP - KP art. 182(1f) § 1, § 1(1), § 2-7
- **Fragment:** „Okres, o który urlop rodzicielski ulega wydłużeniu, stanowi iloczyn liczby tygodni ... i wymiaru czasu pracy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_has_work_in_parental` **eq** True
- **Rezultat:** `{"compute": "f_parental_extension", "output": "duration.parental_extension"}`
- **Wyjątki:** - · **Zależy od:** PAR-WORK-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments`, `children.count_at_birth`, `children.za_zyciem_certificate` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-PAR-006
- **Uwagi:** Przykład: 10 tyg. przy 0,5 etatu → +5 tyg. (35 dni). § 7 (praca w części wydłużonej) → P1.

### PAR-WORK-003

**Zasiłek zmniejszony proporcjonalnie do wymiaru pracy** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Wysokość zasiłku zmniejsza się proporcjonalnie do wymiaru czasu pracy, w jakim pracownik łączy urlop rodzicielski z pracą.

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 4a
- **Fragment:** „Wysokość zasiłku macierzyńskiego zmniejsza się proporcjonalnie do wymiaru czasu pracy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_segment_work_fraction` **gt** 0
- **Rezultat:** `{"set": {"amount_multiplier": "f_one_minus_work_fraction"}}`
- **Wyjątki:** - · **Zależy od:** PAR-WORK-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-PAR-006
- **Uwagi:** Kwota = base × rate × (1 − work_fraction) / 30 × dni (DERIVED kolejność).

### RATE-MAT-002

**70% - urlop rodzicielski (wariant standardowy)** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Miesięczny zasiłek za okres urlopu rodzicielskiego wynosi 70% podstawy.

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 2
- **Fragment:** „jako okres urlopu rodzicielskiego wynosi 70% podstawy wymiaru zasiłku”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `segment.leave_type` **eq** PARENTAL_LEAVE
- **Rezultat:** `{"set": {"rate": {"param": "MAT_RATE_PARENTAL"}}}`
- **Wyjątki:** RATE-MAT-003 · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `segment.leave_type` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-RATE-003

### RATE-MAT-004

**70% - 9 tygodni drugiego rodzica przy wniosku 81,5%** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Zasiłek za część urlopu rodzicielskiego przysługującą drugiemu rodzicowi (9 tygodni nieprzenoszalnych) wynosi 70%.

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 3f; art. 30a ust. 1 (wyłączenie okresu z KP 182(1a) § 4)
- **Fragment:** „w części przysługującej drugiemu rodzicowi dziecka, o której mowa w art. 182(1a) § 4 Kodeksu pracy, wynosi 70%”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_segment_is_other_parent_reserved_9w` **eq** True
- **Rezultat:** `{"set": {"rate": {"param": "MAT_RATE_PARENTAL"}}}`
- **Wyjątki:** - · **Zależy od:** RATE-MAT-003, PAR-SHARE-001 · **Ma pierwszeństwo przed:** RATE-MAT-003
- **Dane:** `plan.segments` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-RATE-004, T-INT-001

### RATE-MAT-005

**70% za rodzicielski, gdy w 1. roku życia nie wykorzystano ani dnia** - `RATE` · P0 · AUTOMATABLE · eval: **ACTIVE**

Jeśli w pierwszym roku życia dziecka nie wykorzystano ani jednego dnia zasiłku za okres urlopu rodzicielskiego, zasiłek za rodzicielski wynosi 70%.

- **Podstawa:** USTAWA - USTAWA art. 31 ust. 3g
- **Fragment:** „W przypadku niewykorzystania ani jednego dnia zasiłku macierzyńskiego za okres urlopu rodzicielskiego w pierwszym roku życia dziecka”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `segment.leave_type` **eq** PARENTAL_LEAVE
    - `f_any_parental_day_in_first_year` **eq** False
- **Rezultat:** `{"set": {"rate": {"param": "MAT_RATE_PARENTAL"}}}`
- **Wyjątki:** - · **Zależy od:** RATE-MAT-003 · **Ma pierwszeństwo przed:** RATE-MAT-003, RATE-MAT-008
- **Dane:** `plan.segments`, `children.birth_dates` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-RATE-005
- **Uwagi:** 'Pierwszy rok życia' = od dnia urodzenia do dnia poprzedzającego 1. urodziny (DERIVED). Przy przyjęciu dziecka starszego - stosowanie niejasne (GAP-019).

### RATE-MAT-008

**Stawka dla ojca korzystającego z części rodzicielskiego przy wniosku 81,5% matki** - `RATE` · P1 · AUTOMATABLE · eval: **ACTIVE**

Matka po złożeniu wniosku 81,5% może dzielić się z ojcem zasiłkiem za okres rodzicielskiego (poza 9 tyg. ojca); ojciec w tej części otrzymuje 81,5% (ustalenie z mentorem M11).

- **Podstawa:** USTAWA - USTAWA art. 30a ust. 3; art. 31 ust. 3
- **Fragment:** „ubezpieczona - matka dziecka może dzielić się z ubezpieczonym - ojcem dziecka korzystaniem z zasiłku macierzyńskiego za okres ... urlopu rodzicielskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `segment.parent` **eq** FATHER
    - `segment.leave_type` **eq** PARENTAL_LEAVE
    - `f_combined_application_within_deadline` **eq** True
    - `f_segment_is_other_parent_reserved_9w` **eq** False
- **Rezultat:** `{"set": {"rate": {"param": "MAT_RATE_COMBINED"}}, "reason_code": "FATHER_RATE_815_SHARED"}`
- **Wyjątki:** - · **Zależy od:** RATE-MAT-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `plan.segments`, `applications.combined_815_filed_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-RATE-006
- **Uwagi:** Odblokowana po odpowiedzi mentora M11 (2026-11-21): ojciec przejmuje stawkę 81,5% za część rodzicielskiego poza swoimi 9 tygodniami (wniosek matki dotyczy całego okresu, art. 30a ust. 3). 9 tygodni ojca - 70% (RATE-MAT-004); po 1. roku życia - 70% (RATE-MAT-005). Wcześniej Q-LEG-03 / NEEDS_REVIEW.


## Urlop ojcowski

### PAT-ELIG-001

**Zasiłek za okres urlopu ojcowskiego - ubezpieczony ojciec** - `ELIGIBILITY` · P0 · AUTOMATABLE · eval: **ACTIVE**

Ojcu (pracownikowi - urlop ojcowski; niepracownikowi - okres odpowiadający) przysługuje zasiłek macierzyński za okres urlopu ojcowskiego.

- **Podstawa:** USTAWA - USTAWA art. 29a ust. 1, art. 31 ust. 1; KP art. 182(3), art. 184; ROZP_DOK § 33
- **Fragment:** „Zasiłek macierzyński przysługuje przez okres ustalony przepisami Kodeksu pracy jako okres ... urlopu ojcowskiego”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **eq** FATHER
    - `f_sickness_insured_on`(date=plan.paternity_start_date) **eq** True
    - `f_paternity_within_deadline` **eq** True
- **Rezultat:** `{"status": "ELIGIBLE", "set": {"benefit": "MATERNITY_BENEFIT", "leave_type": "PATERNITY_LEAVE"}}`
- **Wyjątki:** GEN-EXCL-001 · **Zależy od:** PAT-DUR-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `person.role`, `insurance.titles`, `plan.paternity_start_date`, `children.birth_dates` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** T-PAT-001
- **Uwagi:** Wyciąg ustawy nie zawiera osobnej przesłanki prawa ojca-niepracownika do 'ojcowskiego'; potwierdza je ROZP_DOK § 33 ust. 1 pkt 3 (wniosek niepracownika). Treść zadania: przysługuje też, gdy ojciec zaczął pracę po narodzinach lub matka nieubezpieczona - zgodne z brakiem wymogu ubezpieczenia na dzień porodu (DERIVED).

### PAT-DUR-001

**Urlop ojcowski - 2 tygodnie, maks. 2 części ≥1 tydz., do 12 miesięcy życia dziecka** - `DURATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Do 2 tygodni, jednorazowo lub w 2 częściach po min. 1 tygodniu, do ukończenia przez dziecko 12 miesięcy (adopcja - 12 miesięcy od uprawomocnienia przysposobienia, nie dłużej niż do 14 lat); liczba dzieci nie wydłuża.

- **Podstawa:** KP - KP art. 182(3) § 1, § 1(1)
- **Fragment:** „w wymiarze do 2 tygodni, niedłużej jednak niż do: 1) ukończenia przez dziecko 12 miesiąca życia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `person.role` **eq** FATHER
- **Rezultat:** `{"compute": "f_paternity_window", "output": "duration.paternity"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `children.birth_dates`, `event.adoption_final_date`, `plan.segments` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-PAT-001, T-PAT-002, T-PAT-003
- **Uwagi:** Walidacja planu: ≤2 części, każda ≥7 dni, suma ≤14 dni, ostatni dzień ≤ dzień poprzedzający 1. urodziny (DERIVED 'ukończenia 12 miesiąca').


## Podstawa wymiaru

### BASE-EMP-001

**Podstawa pracownika - średnia z 12 miesięcy kalendarzowych** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przeciętne miesięczne wynagrodzenie wypłacone za 12 miesięcy kalendarzowych poprzedzających miesiąc powstania niezdolności (dla macierzyńskiego - miesiąc powstania prawa), z wynagrodzenia u płatnika w okresie nieprzerwanego ubezpieczenia.

- **Podstawa:** USTAWA - USTAWA art. 36 ust. 1, 4; art. 38 ust. 1; art. 47
- **Fragment:** „przeciętne miesięczne wynagrodzenie wypłacone za okres 12 miesięcy kalendarzowych poprzedzających miesiąc, w którym powstała niezdolność do pracy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employee_title_for_base` **eq** True
    - `f_full_months_of_continuous_insurance` **gte** 12
- **Rezultat:** `{"compute": "f_benefit_base_employee", "output": "base.amount"}`
- **Wyjątki:** BASE-EMP-002, BASE-EMP-003, BASE-EMP-008 · **Zależy od:** BASE-EMP-004, BASE-EMP-005, BASE-EMP-006, BASE-EMP-007 · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history.months`, `base.reference_event_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-BASE-001
- **Uwagi:** 'Wynagrodzenie' = przychód po odliczeniu składek emerytalnej, rentowej i chorobowej potrąconych przez pracodawcę (art. 3 pkt 3) - pomniejszony zawsze o 13,71% (CONTRIBUTION_DEDUCTION_RATE) - ustalenie z mentorem M06 (2026-11-21), CONF-002 zamknięty; pola *_net = brutto × (1 − 0,1371). Dla macierzyńskiego 'miesiąc powstania niezdolności' → 'miesiąc powstania prawa' (art. 47 'odpowiednio', DERIVED).

### BASE-EMP-002

**Podstawa pracownika - ubezpieczenie krótsze niż 12 miesięcy** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Gdy niezdolność powstała przed upływem 12 miesięcy - przeciętne wynagrodzenie za pełne miesiące kalendarzowe ubezpieczenia.

- **Podstawa:** USTAWA - USTAWA art. 36 ust. 2
- **Fragment:** „przeciętne miesięczne wynagrodzenie za pełne miesiące kalendarzowe ubezpieczenia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_full_months_of_continuous_insurance` **gte** 1
    - `f_full_months_of_continuous_insurance` **lt** 12
- **Rezultat:** `{"compute": "f_benefit_base_employee", "output": "base.amount"}`
- **Wyjątki:** - · **Zależy od:** BASE-EMP-004 · **Ma pierwszeństwo przed:** BASE-EMP-001
- **Dane:** `income_history.months`, `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-BASE-008
- **Uwagi:** M06 (2026-11-21, mentor fachowy): zatrudnienie krótsze niż 12 miesięcy → podstawa z pełnego okresu zatrudnienia (pełne miesiące kalendarzowe), zawsze po odliczeniu 13,71%.

### BASE-EMP-003

**Podstawa pracownika - niezdolność w pierwszym miesiącu ubezpieczenia** - `CALCULATION` · P1 · PARTIALLY_AUTOMATABLE · eval: **ACTIVE**

Wynagrodzenie, które pracownik osiągnąłby za pełny miesiąc - stałe z umowy; albo przeliczone z dni przepracowanych; albo przeciętne składniki zmienne pracowników na podobnym stanowisku.

- **Podstawa:** USTAWA - USTAWA art. 37 ust. 1-2
- **Fragment:** „wynagrodzenie, które ubezpieczony będący pracownikiem osiągnąłby, gdyby pracował pełny miesiąc kalendarzowy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_full_months_of_continuous_insurance` **eq** 0
- **Rezultat:** `{"compute": "f_base_first_month_employee", "output": "base.amount"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** BASE-EMP-001, BASE-EMP-002
- **Dane:** `employment.contract_monthly_salary`, `income_history.months` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Wariant pkt 3 (dane innych pracowników) → NEEDS_REVIEW.

### BASE-EMP-004

**Miesiące z nieobecnością - wyłączenie (<½ czasu) lub uzupełnienie (≥½ czasu)** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przy nieobecności usprawiedliwionej - wyłącza się miesiące, w których przepracowano mniej niż połowę obowiązującego czasu; miesiące z ≥½ uzupełnia się (art. 37 ust. 2); jeśli w każdym miesiącu <½ - uwzględnia się wszystkie po uzupełnieniu.

- **Podstawa:** USTAWA - USTAWA art. 38 ust. 2-3
- **Fragment:** „wyłącza się wynagrodzenie za miesiące, w których przepracował mniej niż połowę obowiązującego go czasu pracy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `income_history.months` **exists** True
- **Rezultat:** `{"compute": "f_base_months_selection_employee", "output": "base.months_used"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history.months` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-BASE-002
- **Uwagi:** Uzupełnienie: składniki stałe - pełna kwota; zmienne pomniejszane - kwota/dni przepracowane × dni obowiązujące (Z-3 rozdziela składniki, zał. 2 pkt 16). Składniki nieuzupełniane (np. nadgodziny) - kwota faktyczna (Załącznik; ustawa art. 37 ust. 2 pkt 2 - DERIVED).

### BASE-EMP-005

**Zmiana wymiaru czasu pracy** - `CALCULATION` · P1 · HUMAN_REVIEW · eval: **BLOCKED**

Gdy zmiana wymiaru etatu nastąpiła w miesiącu powstania niezdolności lub w okresie 12 miesięcy - podstawą jest wynagrodzenie ustalone dla nowego wymiaru.

- **Podstawa:** USTAWA - USTAWA art. 40
- **Fragment:** „podstawę wymiaru zasiłku chorobowego stanowi wynagrodzenie ustalone dla nowego wymiaru czasu pracy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `employment.working_time_change_date` **exists** True
    - `f_working_time_change_in_base_window` **eq** True
- **Rezultat:** `{"compute": "f_base_after_working_time_change", "output": "base.amount"}`
- **Wyjątki:** - · **Zależy od:** BASE-EMP-001 · **Ma pierwszeństwo przed:** BASE-EMP-001, BASE-EMP-002
- **Dane:** `employment.working_time_change_date`, `employment.contract_monthly_salary` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja AMBIGUOUS
- **Testy:** -
- **Uwagi:** Sposób 'ustalenia wynagrodzenia dla nowego wymiaru' przy składnikach zmiennych nie jest opisany - BLOKOWANA (GAP-021). Powiązane ryzyko: podwyższenie podstawy w ciąży (RISK-002).

### BASE-EMP-006

**Składniki kwartalne i roczne - 1/12** - `CALCULATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Składniki za okresy miesięczne - w kwocie wypłaconej; kwartalne - 1/12 kwot wypłaconych za 4 kwartały poprzedzające; roczne - 1/12 kwoty za rok poprzedzający.

- **Podstawa:** USTAWA - USTAWA art. 42 ust. 1-5
- **Fragment:** „przysługujące za okresy kwartalne, wlicza się ... w wysokości stanowiącej jedną dwunastą kwot wypłaconych pracownikowi za cztery kwartały”
- **Obowiązuje:** od - do -
- **Warunki:**
  - KTÓRYKOLWIEK:
    - `income_history.quarterly_components` **exists** True
    - `income_history.annual_components` **exists** True
- **Rezultat:** `{"compute": "f_periodic_components_monthly_share", "output": "base.periodic_components"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history.quarterly_components`, `income_history.annual_components` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -
- **Uwagi:** Brak danych o składnikach okresowych ≠ 0 → jeśli Z-3 dostępne, pola puste = 0; przy danych ręcznych pytanie wprost.

### BASE-EMP-007

**Składniki wyłączone z podstawy** - `CALCULATION` · P1 · PARTIALLY_AUTOMATABLE · eval: **ACTIVE**

Nie uwzględnia się składników, do których pracownik zachowuje prawo w okresie zasiłku (gdy wypłacane za ten okres), ani składników przysługujących do określonego terminu / zaprzestanych - za okres po tym terminie.

- **Podstawa:** USTAWA - USTAWA art. 41 ust. 1-3
- **Fragment:** „nie uwzględnia się składników wynagrodzenia, do których pracownik zachowuje prawo w okresie pobierania tego zasiłku”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `income_history.months` **exists** True
- **Rezultat:** `{"compute": "f_filter_excluded_components", "output": "base.components_used"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history.months` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** -
- **Uwagi:** Wymaga flagi per składnik 'retained_during_benefit' (z Z-3). Brak flagi → NEEDS_REVIEW.

### BASE-EMP-008

**Minimalna podstawa - płaca minimalna minus 13,71% (pełny etat)** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Podstawa z tytułu pracy w pełnym wymiarze nie może być niższa niż minimalne wynagrodzenie po odliczeniu 13,71%.

- **Podstawa:** USTAWA - USTAWA art. 45 ust. 1-2; art. 47
- **Fragment:** „nie może być niższa od kwoty minimalnego wynagrodzenia za pracę, po odliczeniu kwoty odpowiadającej 13,71%”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employee_title_for_base` **eq** True
    - `employment.working_time_fraction` **eq** 1.0
- **Rezultat:** `{"compute": "f_apply_minimum_base", "output": "base.amount"}`
- **Wyjątki:** - · **Zależy od:** BASE-EMP-001, BASE-EMP-002, BASE-EMP-003 · **Ma pierwszeństwo przed:** -
- **Dane:** `employment.working_time_fraction` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DIRECT
- **Testy:** T-BASE-003
- **Uwagi:** Kwota płacy minimalnej (4806,00 zł) - potwierdzona przez mentora (M07, 2026-11-21); wartość 4806 × 0,8629 = 4147,0974 zaokrąglana do pełnych groszy (MIN_BASE_ROUNDING_STEP, ROUND_HALF_UP) = 4147,10 zł - mentor fachowy M07a (2026-11-21); f_minimum_base. Pozostałe zaokrąglenia - GAP-001 (M04). Załącznik zapowiada tabelę min. podstaw, ale tabela jest pusta (GAP-022). Część etatu → brak minimum z art. 45 (DERIVED).

### BASE-NEMP-001

**Podstawa niepracownika - średni przychód z 12 miesięcy** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Przeciętny miesięczny przychód (podstawa wymiaru składek − 13,71%) za 12 miesięcy kalendarzowych poprzedzających miesiąc powstania niezdolności/prawa; krócej - za pełne miesiące.

- **Podstawa:** USTAWA - USTAWA art. 48 ust. 1-2; art. 3 pkt 4; art. 52
- **Fragment:** „przeciętny miesięczny przychód za okres 12 miesięcy kalendarzowych poprzedzających miesiąc, w którym powstała niezdolność do pracy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employee_title_for_base` **eq** False
- **Rezultat:** `{"compute": "f_benefit_base_non_employee", "output": "base.amount"}`
- **Wyjątki:** BASE-NEMP-002, BASE-NEMP-003 · **Zależy od:** BASE-NEMP-004 · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history.months` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-BASE-004, T-INT-005, T-BASE-009
- **Uwagi:** Przychód miesiąca = podstawa wymiaru składki chorobowej × (1 − 0,1371). Limit z Załącznika: 23 550 × 0,8629 = 20 321,30 (dobrowolne chorobowe) - potwierdzony przez mentora (M08).

### BASE-NEMP-002

**Podstawa przy zadeklarowanej kwocie i ubezpieczeniu <12 miesięcy (art. 48a)** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Suma: przeciętnej najniższej podstawy (po odliczeniu 13,71%) za pełne miesiące oraz 1/12 przeciętnej nadwyżki zadeklarowanej kwoty ponad najniższą podstawę × liczba pełnych miesięcy.

- **Podstawa:** USTAWA - USTAWA art. 48a ust. 1-5
- **Fragment:** „stanowi suma: 1) przeciętnej miesięcznej najniższej podstawy ... oraz 2) kwoty stanowiącej iloczyn jednej dwunastej przeciętnej kwoty zadeklarowanej ... w części przewyższającej najniższą podstawę”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_contribution_base_is_declared` **eq** True
    - `f_full_months_of_continuous_insurance` **lt** 12
    - `f_full_months_of_continuous_insurance` **gte** 1
- **Rezultat:** `{"compute": "f_base_declared_short_insurance", "output": "base.amount"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** BASE-NEMP-001
- **Dane:** `income_history.months`, `income_history.minimum_contribution_base_by_month` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-BASE-005
- **Uwagi:** Kluczowe dla JDG w ciąży (ryzyko podwyższania podstawy - RISK-002). Najniższa podstawa składek (M08, 2026-11-21): 2026 - 5652,00 zł, a przez 24 mies. od założenia działalności (ZUS preferencyjny) 1441,80 zł (parametry JDG_*); źródłem wartości dla danego miesiąca pozostaje wejście minimum_contribution_base_by_month (dane z ZUS - symulacja), parametry służą do podpowiedzi i kontroli; wartości dla 2027 nieznane (GAP-023). Ust. 2-4 (przerwy ≤30 dni) → P1.

### BASE-NEMP-003

**Podstawa niepracownika - niezdolność w pierwszym miesiącu** - `CALCULATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Najniższa podstawa składek po odliczeniu 13,71% (gdy określona) albo kwota przychodu z umowy (zlecenie/agencyjna) za miesiąc powstania prawa.

- **Podstawa:** USTAWA - USTAWA art. 49 ust. 1-3
- **Fragment:** „najniższa miesięczna podstawa wymiaru składek na ubezpieczenie chorobowe za miesiąc, w którym powstało prawo do zasiłku”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_employee_title_for_base` **eq** False
    - `f_full_months_of_continuous_insurance` **eq** 0
- **Rezultat:** `{"compute": "f_base_first_month_non_employee", "output": "base.amount"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** BASE-NEMP-001, BASE-NEMP-002
- **Dane:** `income_history.minimum_contribution_base_by_month`, `employment.contract_monthly_salary` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** -

### BASE-NEMP-004

**Niepracownik - miesiące z zasiłkiem <½ miesiąca wyłączone** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Gdy przychód zmalał wskutek pobierania zasiłku/świadczenia - wyłącza się miesiące, w których wykonywano działalność przez <½ miesiąca; jeśli każdy miesiąc taki - przyjmuje się wszystkie.

- **Podstawa:** USTAWA - USTAWA art. 50 ust. 1-2
- **Fragment:** „wyłącza się przychód za miesiące, w których ubezpieczony wykonywał pracę lub działalność przez mniej niż połowę miesiąca”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `income_history.months` **exists** True
- **Rezultat:** `{"compute": "f_base_months_selection_non_employee", "output": "base.months_used"}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history.months` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DIRECT
- **Testy:** T-BASE-009
- **Uwagi:** 'Połowa miesiąca' - liczona w dniach kalendarzowych (DERIVED).

### BASE-NEMP-005

**Górna granica podstawy - dobrowolne ubezpieczenie chorobowe** - `CALCULATION` · P1 · AUTOMATABLE · eval: **ACTIVE**

Przy dobrowolnym ubezpieczeniu chorobowym (zlecenie, działalność) podstawa wymiaru zasiłku nie może przekroczyć miesięcznego limitu podstawy składek po odliczeniu 13,71% (23 550,00 × 0,8629 = 20 321,295 zł w 2026 r.).

- **Podstawa:** ZALACZNIK - Załącznik - limit podstawy składek przy dobrowolnym ubezpieczeniu chorobowym; USTAWA art. 48 ust. 1 (przychód = podstawa składek − 13,71%)
- **Fragment:** „VOLUNTARY_MAX_CONTRIB_BASE_2026 = 23 550,00 zł (Załącznik; potwierdzone przez mentora fachowego ZUS, M08)”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_is_voluntary_sickness_title_for_base` **eq** True
- **Rezultat:** `{"compute": "f_apply_voluntary_base_cap", "output": "base.amount"}`
- **Wyjątki:** - · **Zależy od:** BASE-NEMP-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność MEDIUM, interpretacja DERIVED
- **Testy:** -
- **Uwagi:** BE2-12 (raport luk słownika, A2): limit potwierdzony przez mentora (M08), wcześniej tylko w notach BASE-NEMP-001. Bez zaokrąglenia pośredniego (C1; zaokrąglenia - BE2-09/M04). Stosowany do nowo ustalanej podstawy (dziś: manual_base_override); podstawa przejęta z art. 43 (BASE-GEN-001) bez zmian.

### BASE-GEN-001

**Brak ponownego ustalania podstawy przy przerwie < miesiąca kalendarzowego** - `CALCULATION` · P0 · AUTOMATABLE · eval: **ACTIVE**

Podstawy nie ustala się na nowo, jeżeli między okresami pobierania zasiłków (tego samego lub innego rodzaju) nie było przerwy albo była krótsza niż miesiąc kalendarzowy.

- **Podstawa:** USTAWA - USTAWA art. 43; art. 48 ust. 2; art. 52
- **Fragment:** „Podstawy wymiaru zasiłku nie ustala się na nowo, jeżeli między okresami pobierania zasiłków ... nie było przerwy albo przerwa była krótsza niż miesiąc kalendarzowy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_gap_shorter_than_calendar_month` **eq** True
- **Rezultat:** `{"set": {"base.reuse_previous": true}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** BASE-EMP-001, BASE-EMP-002, BASE-NEMP-001, BASE-NEMP-002
- **Dane:** `benefit_history.previous_benefit_end_date`, `benefit_history.previous_base_amount`, `base.reference_event_date` · brak danych → `NEEDS_DATA`
- **Jakość:** pewność HIGH, interpretacja DERIVED
- **Testy:** T-BASE-006, T-BASE-007, T-BASE-010, T-BASE-011, T-BASE-012, T-INT-001
- **Uwagi:** Typowo: zasiłek chorobowy w ciąży → macierzyński bez przerwy = ta sama podstawa (ważne dla demo). 'Miesiąc kalendarzowy' = pełny miesiąc od 1. do ostatniego dnia - ustalenie z mentorem fachowym ZUS (M05, 2026-11-21; CONF-006 rozstrzygnięty). Podstawę ustala się na nowo tylko, gdy przerwa obejmuje cały miesiąc kalendarzowy; przerwa dłuższa niż 31 dni bez pełnego miesiąca (np. 2.02–14.03) → ta sama podstawa.

### BASE-GEN-002

**Maksymalna podstawa zasiłku chorobowego po ustaniu tytułu** - `CALCULATION` · P2 · PARTIALLY_AUTOMATABLE · eval: **BLOCKED**

Podstawa zasiłku chorobowego za okres po ustaniu tytułu nie może przekraczać 100% przeciętnego wynagrodzenia (kwota kwartalna).

- **Podstawa:** USTAWA - USTAWA art. 46
- **Fragment:** „nie może być wyższa niż kwota wynosząca 100% przeciętnego wynagrodzenia”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_benefit_after_title_end` **eq** True
    - `benefit` **eq** SICKNESS_BENEFIT
- **Rezultat:** `{"compute": "f_apply_after_title_cap", "output": "base.amount"}`
- **Wyjątki:** - · **Zależy od:** SICK-ELIG-006 · **Ma pierwszeństwo przed:** -
- **Dane:** `base.amount` · brak danych → `NEEDS_REVIEW`
- **Jakość:** pewność LOW, interpretacja INCOMPLETE_SOURCE
- **Testy:** -
- **Uwagi:** Kwota przeciętnego wynagrodzenia nie występuje w materiałach → BLOKOWANA (GAP-002).


## Ostrzeżenia o ryzykach (pkt H zadania) - nie zmieniają statusu

### RISK-001

**Ryzyko - umowa / działalność zawarta dla pozoru krótko przed ciążą lub w ciąży** - `VALIDATION` · P1 · HUMAN_REVIEW · eval: **INFORMATIONAL**

ZUS może w postępowaniu uznać tytuł ubezpieczenia za pozorny i wydać decyzję o niepodleganiu - skutek: brak prawa do zasiłków. Silnik sygnalizuje sytuacje podwyższonego ryzyka, nie ocenia pozorności.

- **Podstawa:** ZALACZNIK - Treść zadania, pkt H.1 (brak przepisu w wyciągach)
- **Fragment:** „ZUS po przeprowadzeniu postępowania, może uznać, że umowa została zawarta wyłącznie dla pozoru”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_title_started_during_or_shortly_before_pregnancy` **eq** True
- **Rezultat:** `{"warning": {"code": "RISK_SHAM_TITLE", "severity": "WARNING"}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles`, `pregnancy.pregnancy_start_date` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność LOW, interpretacja INCOMPLETE_SOURCE
- **Testy:** -
- **Uwagi:** Źródłem jest treść zadania (nie akt prawny). 'Krótko przed' - parametr projektowy, NIE prawny; komunikat musi mówić o ryzyku, nie o decyzji. M17 (2026-11-21, mentor fachowy): pokazujemy jako ostrzeżenie - bez wpływu na status; progi zespołu (≤90 dni) zostają projektowe.

### RISK-002

**Ryzyko - podwyższenie podstawy wymiaru składek w ciąży** - `VALIDATION` · P1 · HUMAN_REVIEW · eval: **INFORMATIONAL**

ZUS może ustalić niższą podstawę, jeśli podwyższenie podstawy składek w ciąży miało wyłącznie na celu uzyskanie wyższych świadczeń. Silnik sygnalizuje istotny wzrost podstawy w okresie ciąży.

- **Podstawa:** ZALACZNIK - Treść zadania, pkt H.2
- **Fragment:** „podwyższenie podstawy wymiaru składek ... w okresie ciąży wyłącznie w celu nabycia uprawnień do wyższej podstawy”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_contribution_base_increase_during_pregnancy` **eq** True
- **Rezultat:** `{"warning": {"code": "RISK_BASE_INCREASE_IN_PREGNANCY", "severity": "WARNING"}}`
- **Wyjątki:** - · **Zależy od:** - · **Ma pierwszeństwo przed:** -
- **Dane:** `income_history.months`, `pregnancy.pregnancy_start_date` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność LOW, interpretacja INCOMPLETE_SOURCE
- **Testy:** -
- **Uwagi:** Próg 'istotnego wzrostu' (> 50%, jak f_contribution_base_increase_during_pregnancy w 07) - parametr projektowy zespołu. M17 (2026-11-21, mentor fachowy): pokazujemy jako ostrzeżenie - bez wpływu na status.

### RISK-003

**Ryzyko - ustanie ubezpieczenia przed porodem** - `VALIDATION` · P0 · AUTOMATABLE · eval: **INFORMATIONAL**

Ostrzeżenie, gdy planowany koniec umowy/działalności/dobrowolnego ubezpieczenia przypada przed przewidywaną datą porodu, a nie zachodzi przypadek z art. 30 ani przedłużenie z KP 177 § 3.

- **Podstawa:** USTAWA - USTAWA art. 29 ust. 1, art. 30; treść zadania pkt H.3
- **Fragment:** „niepodleganie ubezpieczeniu chorobowemu na dzień porodu”
- **Obowiązuje:** od - do -
- **Warunki:**
  - WSZYSTKIE:
    - `f_planned_title_end_before_due_date` **eq** True
    - `f_any_art30_basis` **eq** False
- **Rezultat:** `{"warning": {"code": "RISK_NOT_INSURED_ON_BIRTH", "severity": "CRITICAL"}}`
- **Wyjątki:** - · **Zależy od:** MAT-NEG-001 · **Ma pierwszeństwo przed:** -
- **Dane:** `insurance.titles`, `pregnancy.expected_due_date` · brak danych → `NOT_APPLICABLE`
- **Jakość:** pewność HIGH, interpretacja DERIVED
- **Testy:** T-MAT-004
- **Uwagi:** Najcenniejsze ostrzeżenie dla planera przyszłego rodzica.
