# Zasiłkowy Przewodnik Przyszłego Rodzica — zebrane kryteria oceny

> Źródła: `ZUS - Pełna treść zadania konkursowego.pdf` (PZ), `ZUS - Regulamin zadania konkursowego.pdf` (REG), `Materiały dla uczestników/*` (załącznik .docx z parametrami, wyciągi z przepisów, Poradnik ZUS 2026).
> Oznaczenia: **[OFICJALNE]** to kryterium podane wprost, **[WYMÓG]** to wymaganie z treści zadania, które jury sprawdzi, **[POŚREDNIE]** to wniosek z kontekstu zadania (nie jest punktowane wprost, ale wpływa na ocenę w ramach kryteriów oficjalnych).

---

## 1. Oficjalne kryteria i wagi [OFICJALNE] (PZ, pkt 8)

| # | Kryterium | Waga |
|---|-----------|------|
| 1 | Związek z wyzwaniem | **25%** |
| 2 | Pomysł | **20%** |
| 3 | Oryginalność | **15%** |
| 4 | Kompletność projektu i user experience | **25%** |
| 5 | Potencjał wdrożeniowy | **15%** |

### Zasady oceniania (REG §2, PZ pkt 6)
- Ocenia jury powołane przez ZUS, złożone z co najmniej 3 osób ze specjalistyczną wiedzą z tematu zadania.
- Decyzje jury są ostateczne i nie można się od nich odwołać.
- Jury wybiera **maksymalnie 3 zespoły do prezentacji finałowej** i spośród nich wyłania zwycięzcę. Jest **jedna nagroda: 30 000 zł**.
- Projekty ocenia się pod kątem **zgodności z wymaganiami biznesowymi i technicznymi**.
- Ocena techniczna obejmuje: **praktyczne przetestowanie wersji demo**, zgodność z wymaganiami technicznymi i **przegląd struktury kodu w repozytorium**.
- Zakres i metodykę testów każdy juror ustala sam, według swojej wiedzy eksperckiej.
- Podczas testów jury **użyje przykładowych wniosków z zestawów ZUS** i **sprawdzi, czy wyliczenia są poprawne**.

---

## 2. Wymagania formalne — warunek wejścia do oceny [WYMÓG] (PZ, pkt 4)

### Obowiązkowe
- [ ] Szczegółowy **opis i tytuł** projektu
- [ ] **Prezentacja** (maksymalnie **10 slajdów**)
- [ ] **Filmik** w dostępnym, otwartym repozytorium (link), maksymalnie **3 minuty**, pokazujący projekt i jego użycie (może być częścią aplikacji)

### Dodatkowo
- [ ] **Repozytorium kodu**
- [ ] **Zrzuty ekranu**
- [ ] **Link do demo jako strony internetowej**. Na stronie musi się dać **przetestować wybrane załączone przykłady (formularze PDF)**, czyli zweryfikować, czy osoba ma ubezpieczenie, i sprawdzić kalkulator
- [ ] Interfejs **w pełni responsywny** (desktop i mobile)
- [ ] Materiały graficzne lub inne elementy związane z projektem
- [ ] **Wskazanie, które funkcjonalności korzystają z AI** (PZ pkt 4 i 9: zakres użycia AI w procesie twórczym i w działaniu aplikacji musi być opisany)

### Z regulaminu (REG §4)
- [ ] Użyte **rozwiązania zewnętrzne** (biblioteki, API, modele, assety) są **wyraźnie wskazane w prezentacji**
- [ ] Rozwiązanie jest wolne od wad prawnych i nie narusza praw osób trzecich (licencje!). Zwycięzca przenosi autorskie prawa majątkowe na ZUS i przekazuje kod źródłowy z opisem
- [ ] **Nie kopiujemy ani nie rozpowszechniamy dokumentów z zestawów ZUS** (PZ pkt 2). Uważać na publiczne repo i demo: nie umieszczać w nich oryginalnych skanów, tylko np. dane przepisane lub zanonimizowane

---

## 3. Wymagania funkcjonalne — zakres merytoryczny [WYMÓG] (PZ, pkt 3)

Narzędzie ma ustalać uprawnienia **w sposób skonkretyzowany**, czyli dla indywidualnej sytuacji osoby. Dane pochodzą z (symulowanych) systemów ZUS lub są wprowadzane przez użytkownika (np. planowana data porodu, data ustania stosunku pracy).

| Lit. | Funkcja | Co jury prawdopodobnie sprawdzi |
|------|---------|----------------------------------|
| a | Informacje o świadczeniach **w czasie ciąży**, także o **braku uprawnień**: zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego | 100% podstawy przy kodzie „B”, okres 270 dni, okres wyczekiwania 30 dni (obowiązkowe) / 90 dni (dobrowolne), 33/14 dni wynagrodzenia chorobowego, zasiłek po ustaniu ubezpieczenia, przypadki upadłości, likwidacji lub śmierci pracodawcy i rozwiązania umowy z naruszeniem prawa |
| b | **Kalkulator zasiłku macierzyńskiego dla obojga rodziców** (okres i kwota) z uwzględnieniem liczby dzieci, ich wieku i zaświadczenia „Za życiem” | 20/31/33/35/37 tyg.; rodzicielski 41/43 tyg. (65/67 z „Za życiem”); 9 tyg. nieprzenoszalne dla każdego rodzica; 100% / 70% / 81,5% |
| c | Kalkulator dla **łączenia pracy z urlopem rodzicielskim** | praca maksymalnie na ½ etatu, proporcjonalne wydłużenie urlopu, limity z Kodeksu pracy |
| d | **Symulacja, gdy oboje rodzice korzystają** z uprawnień | podział puli, jednoczesne i naprzemienne korzystanie, maksymalnie 5 części do końca roku, w którym dziecko kończy 6 lat; przejęcie macierzyńskiego przez ojca po 14 tyg. i wcześniej w sytuacjach szczególnych |
| e | Kalkulator dla **rodziców adopcyjnych i rodzin zastępczych niezawodowych** | urlop na warunkach macierzyńskiego (do 7/10 lat w rodzinie zastępczej, do 14 lat przy przysposobieniu), minimum 9 tyg., wiek dziecka |
| f | Kalkulator kwoty na podstawie **indywidualnej podstawy wymiaru**, czyli symulacja na **konkretnej sprawie z zestawów** | średnia z 12 mies., minus 13,71%, uzupełnianie niepełnych miesięcy, składniki kwartalne i roczne (1/12), minimalna podstawa, przedsiębiorcy i zleceniobiorcy (przychód), przerwa krótsza niż 1 miesiąc |
| g | **Dokumenty, terminy, sposób złożenia wniosków**: gdzie złożyć (płatnik powyżej 20 ubezpieczonych czy ZUS) | ZAM, Z-3/Z-3a, ZAS-53, ZAS-12, e-ZLA; od 24.10.2026 ZUR i ZAO połączone z ZAM, Z-3b zlikwidowany; termin 21 dni na wniosek o 81,5% |
| h | **Zagrożenia i ryzyka** utraty lub obniżenia świadczeń | umowa lub działalność „dla pozoru”, podwyższenie podstawy w ciąży, brak ubezpieczenia na dzień porodu (wyrejestrowanie, koniec umowy, brak zgłoszenia do dobrowolnego), zaległości składkowe JDG |
| i | Informacje o **podmiotach wyłącznie charytatywnych** (śmierć dziecka, wcześniak, poronienie, ciężka choroba dziecka) | rzetelna, aktualna lista fundacji i stowarzyszeń, empatyczny ton |
| j | Kalkulator dla **adopcji i rodzin zastępczych** (powtórzony w treści, por. e) | jw. Warto pokryć także rodziny zastępcze inne niż niezawodowe albo jasno pokazać brak uprawnienia |

**Rekomendacja ZUS:** wszystkie kalkulatory w formie **jednego zintegrowanego kalkulatora** z wyborem opcji.

### Sytuacje szczególne, które warto pokryć [POŚREDNIE] (PZ pkt 1–2)
- Urodzenie **martwego dziecka** lub zgon dziecka przed 8. tygodniem życia: 8 tyg., ale nie krócej niż 7 dni od zgonu. Zgon po 8. tygodniu: 7 dni od zgonu. Przy kilkorgu dzieci wymiar według liczby dzieci, które przeżyły
- **Wcześniak** lub hospitalizacja noworodka: **uzupełniający urlop macierzyński** (6 przypadków z załącznika, limity 8 i 15 tyg., zaokrąglanie tygodni w górę)
- Ciężka choroba, hospitalizacja, niezdolność do samodzielnej egzystencji, śmierć lub porzucenie dziecka przez matkę: **przejęcie urlopu przez ojca przed 14 tygodniem**
- Matka nieubezpieczona: prawa ojca do rodzicielskiego i ojcowskiego
- **Urlop ojcowski**: 14 dni, 1 lub 2 części po minimum 7 dni, do 12 mies. życia dziecka (adopcja: 12 mies. od uprawomocnienia, maksymalnie do 14 lat), bliźnięta nie wydłużają urlopu
- **Ochrona pracownicy w ciąży** (KP): zakaz wypowiedzenia, przedłużenie umowy terminowej do dnia porodu. Brak tej ochrony u osób niebędących pracownikami
- Zmiana warunków zatrudnienia w ciąży a prawo do zasiłku i jego wysokość
- Różne tytuły ubezpieczenia: umowa o pracę, zlecenie, JDG (dobrowolne chorobowe)

---

## 4. Wymagane symulacje integracji [WYMÓG] (PZ, pkt 3)

Narzędzie powinno umożliwiać (wystarczy **symulacja**):
- [ ] **Logowanie przez mObywatela** (symulowane)
- [ ] **Pobranie danych z systemów ZUS** (ubezpieczenie lub jego brak) **albo ręczne wprowadzenie danych** (symulowane)
- [ ] Wyświetlenie **stanu zadłużenia składkowego na dzień powstania prawa** do świadczenia, ważne zwłaszcza dla JDG (symulacja zaświadczenia i kwoty)
- [ ] Podgląd **zaświadczeń lekarskich e-ZLA** (symulacja)
- [ ] Połączenie z **PUE/eZUS**: zadawanie pytań w razie wątpliwości, sprawdzanie danych na koncie (symulacja)
- [ ] **Wypełnianie wniosków o urlopy i świadczenia** oraz ewentualna wysyłka do pracodawcy lub ZUS. **Wnioski o urlopy trzeba zaprojektować samodzielnie**, wnioski o świadczenia są na zus.pl
- [ ] Wniosek o **odpis zupełny lub skrócony aktu urodzenia** (symulacja, por. gov.pl / Rejestr Stanu Cywilnego)
- [ ] Informacje o **podmiotach wsparcia** (fundacje, stowarzyszenia)
- [ ] **Przekierowania** do: zus.pl, MRPiPS (gov.pl/web/rodzina/urlop-rodzicielski), PIP (pip.gov.pl, rodzicielstwo)

---

## 5. Panel administracyjny i konfigurowalność [WYMÓG] (PZ, pkt 3)
- [ ] Zmiana **parametrów** w panelu admina bez zmian w kodzie: stopy procentowe (100/70/81,5%), maksymalne wymiary (tygodnie), progi (13,71%, płaca minimalna, 33/14 dni, 270 dni, 20 ubezpieczonych itd.) na wypadek **zmian w przepisach**
- [ ] Możliwość **dodawania i usprawniania funkcjonalności** (np. treści, listy organizacji, linki)
- [POŚREDNIE] Wersjonowanie parametrów według dat obowiązywania (przepisy zmieniają się w trakcie roku, np. formularze od 24.10.2026)

---

## 6. Wymagania techniczne [WYMÓG] (PZ, pkt 5–6)
- [ ] **Nowoczesna, funkcjonalna aplikacja webowa nadająca się do realnego użycia**, w architekturze **RWD**
- [ ] Działa w **środowisku testowym** i ma **potencjał wdrożenia produkcyjnego**
- [ ] Technologie dowolne. Preferowane: **frontend React/Next.js**, **backend JavaScript / Python / C#/.NET**
- [ ] Zalecana integracja frontendu z backendem przez **REST API**
- [ ] **Upload lub wybór przykładowych wniosków** na stronie (jury przetestuje na nich aplikację)
- [ ] **Poprawne wyliczenia** dla spraw z zestawów, w tym zgodność z decyzją „przyznano / nie przyznano”
- [ ] **Czytelna struktura kodu** w repozytorium (jury ją przegląda)

### Co jury może sprawdzić przy przeglądzie kodu [POŚREDNIE]
- Oddzielenie logiki obliczeń (silnik reguł) od UI, parametry poza kodem
- **Testy jednostkowe** reguł i kalkulatorów, najlepiej na przypadkach z zestawów
- README z instrukcją uruchomienia, opis architektury, dokumentacja API (np. OpenAPI)
- Konteneryzacja (Docker), konfiguracja przez zmienne środowiskowe, brak sekretów w repo
- Obsługa błędów, walidacja danych wejściowych, logowanie
- Bezpieczeństwo i RODO: dane wrażliwe (zdrowie, ciąża), brak wycieków, anonimizacja, ostrożne wysyłanie danych do zewnętrznego AI
- Dostępność (WCAG 2.1 AA, wymóg dla administracji publicznej), język polski, prosty język

---

## 7. Rozpisanie kryteriów oficjalnych na pytania kontrolne [POŚREDNIE]

### 7.1 Związek z wyzwaniem (25%)
- Czy narzędzie odpowiada na zdiagnozowane problemy: brak wiedzy o prawach, trudne sytuacje szczególne, trudność w ustaleniu wysokości zasiłku, skomplikowane procedury, zmiany warunków zatrudnienia w ciąży?
- Czy obejmuje **wszystkie grupy docelowe**: osoby planujące rodzicielstwo, kobiety w ciąży, rodziców, ojców, adopcję, rodziny zastępcze?
- Czy obejmuje **cały proces**: planowanie, ciąża, poród, urlopy, powrót do pracy, dzielenie opieki?
- Czy pokrywa punkty a–j i listę symulacji (sekcje 3–4)?
- Czy **wyliczenia są zgodne z przepisami** i z rozstrzygnięciami w przykładowych sprawach?
- Czy realizuje cele ZUS: mniej nieporozumień, sporów i korespondencji o brakujące lub błędne dokumenty, krótsza obsługa spraw, lepszy wizerunek?
- Czy informuje o **braku uprawnień** i jego przyczynach, a nie tylko o tym, co przysługuje?
- Czy rozróżnia **płatnika / ubezpieczonego / świadczeniobiorcę** i kieruje do właściwego podmiotu (pracodawca powyżej 20 ubezpieczonych czy ZUS)?

### 7.2 Pomysł (20%)
- Czy koncepcja jest spójna (np. przewodnik z osią czasu, „asystent ścieżki rodzica”)?
- Czy prowadzi użytkownika krok po kroku (kreator, checklisty, przypomnienia o terminach, np. 21 dni, 12 mies. na ojcowski, 6 lat na rodzicielski)?
- Czy pomaga w **świadomych decyzjach**: porównanie wariantów (81,5% od razu albo 100% + 70%, podział urlopu między rodziców, łączenie z pracą)?
- Czy rozwiązuje problem z diagnozy, że ZUS dowiaduje się o dziecku dopiero po porodzie (np. wcześniejsza, dobrowolna weryfikacja uprawnień)?
- Czy przemyślano wsparcie w sytuacjach trudnych (empatia, ton, wsparcie organizacji charytatywnych)?

### 7.3 Oryginalność (15%)
- Czy to coś więcej niż formularz kalkulatora i statyczne FAQ?
- Nowatorskie elementy, np.: interaktywna oś czasu urlopów obojga rodziców, symulator „co jeśli” (zmiana umowy, wyrejestrowanie JDG, praca na pół etatu), wykrywanie ryzyk, odczyt danych z PDF (OCR / AI) z zestawów, asystent AI odpowiadający z cytatami przepisów, eksport do kalendarza, generowanie gotowych wniosków
- Czy użycie AI jest **sensowne, kontrolowane i opisane** (np. AI nie liczy kwot, liczy silnik reguł; AI wyjaśnia i wypełnia)?

### 7.4 Kompletność projektu i user experience (25%)
- Kompletność: czy wszystkie wymagane funkcje i symulacje działają end-to-end w demo?
- Czy dostarczono **wszystkie materiały formalne** (sekcja 2)?
- Czy można **wgrać lub wybrać przykładowy wniosek** i dostać wynik (ubezpieczenie tak/nie, okres, kwota)?
- Czy UI jest prosty, przystępny i w prostym języku, bez żargonu albo z jego objaśnieniem?
- Czy jest **w pełni responsywny** na mobile i desktopie?
- Dostępność (kontrast, klawiatura, czytniki ekranu)
- Czy wynik jest przejrzysty: rozbicie obliczeń, podstawa prawna, okresy z datami, kwoty brutto/netto, zastrzeżenie, że to symulacja
- Czy jest **zintegrowany kalkulator** (rekomendacja ZUS)?
- Czy aplikacja działa szybko i stabilnie, bez błędów w demo?
- Spójność wizualna, zgodna z charakterem instytucji publicznej

### 7.5 Potencjał wdrożeniowy (15%)
- Zgodność z preferowanym stosem (React/Next.js + JS/Python/.NET, REST API)
- Architektura gotowa na integracje z systemami ZUS, mObywatelem, PUE/eZUS i e-ZLA (warstwa adapterów i mocków)
- **Panel admina i parametryzacja** na wypadek zmian przepisów
- Jakość kodu, testy, dokumentacja, łatwość utrzymania
- Bezpieczeństwo, RODO, audytowalność wyliczeń (jak i według jakich przepisów policzono)
- Skalowalność (setki tysięcy świadczeniobiorców rocznie)
- Brak problemów licencyjnych, możliwość przeniesienia praw autorskich na ZUS
- Koszty i ryzyka użycia AI (hosting modelu, dane osobowe, halucynacje) oraz sposób ich ograniczenia

---

## 8. Kluczowe reguły merytoryczne do weryfikacji poprawności [POŚREDNIE]
(z PZ i z załącznika z parametrami. Jury prawdopodobnie sprawdzi właśnie te reguły)

**Zasiłek chorobowy w ciąży**
- Okres wyczekiwania: 30 dni (obowiązkowe chorobowe), 90 dni (dobrowolne). Wyjątki według ustawy zasiłkowej
- Wynagrodzenie chorobowe od pracodawcy: 33 dni w roku (14 dni po 50. roku życia), potem zasiłek. Osoby niebędące pracownikami dostają zasiłek od 1. dnia
- Kwota: 100% podstawy przy kodzie „B”, okres zasiłkowy do 270 dni
- Do okresu zasiłkowego wlicza się okresy z przerwą do 60 dni, **z wyjątkiem** niezdolności w ciąży
- Zasiłek po ustaniu ubezpieczenia (ciąża): do 270 dni
- Zasiłek w wysokości zasiłku macierzyńskiego (100%) do porodu: upadłość, likwidacja lub śmierć pracodawcy, rozwiązanie umowy z naruszeniem prawa potwierdzone prawomocnym wyrokiem

**Zasiłek macierzyński**
- Urlop macierzyński: 20/31/33/35/37 tyg. (1/2/3/4/5+ dzieci), do 6 tyg. przed porodem, 14 tyg. obowiązkowo dla matki
- Urlop na warunkach macierzyńskiego: jw., minimum 9 tyg.
- Uzupełniający urlop macierzyński: 6 przypadków, limity 8 i 15 tyg., zaokrąglenie w górę, przy kilkorgu dzieci najniższa masa i najdłuższa hospitalizacja
- Rodzicielski: 41 / 43 tyg., „Za życiem” 65 / 67 tyg., 9 tyg. nieprzenoszalne, maksymalnie 5 części, do końca roku, w którym dziecko kończy 6 lat
- Ojcowski: 2 tyg., 1–2 części po minimum 1 tyg., do 12 mies. (adopcja: 12 mies. od uprawomocnienia, maksymalnie do 14 lat)
- Kwota: 100% (macierzyński, na warunkach macierzyńskiego, uzupełniający, ojcowski); 70% (rodzicielski); **81,5% za całość przy wniosku do 21 dni po porodzie**, z wyjątkiem 9 tyg. drugiego rodzica (70%)
- Łączenie z pracą: maksymalnie ½ etatu, proporcjonalne wydłużenie
- Martwe urodzenie lub zgon dziecka: 8 tyg. / 7 dni od zgonu

**Podstawa wymiaru**
- Pracownik: średnie wynagrodzenie z 12 mies. minus 13,71%. Krótsze zatrudnienie: pełne miesiące. 1. i 2. miesiąc pracy: według zasad szczególnych
- Przerwa krótsza niż 1 miesiąc: stara podstawa. Przerwa 1 miesiąc lub dłuższa: nowa podstawa
- Składniki kwartalne i roczne: 1/12. Składniki pomijane (np. stażowe w czasie zwolnienia)
- Uzupełnianie niepełnego miesiąca (przepracowane mniej niż ½ czasu pracy: miesiąc wyłączony)
- Minimalna podstawa liczona od płacy minimalnej 2026 (4 806 zł) minus 13,71%
- Osoby niebędące pracownikami: przychód z 12 mies. (szczegóły w załączniku i ustawie zasiłkowej)

**Kanał złożenia wniosku**
- Płatnik zgłaszający **powyżej 20 ubezpieczonych** (stan na 30 listopada poprzedniego roku) sam wypłaca zasiłek. Pozostali przekazują dokumenty do ZUS (Z-3 / Z-3a)
- JDG i osoby niebędące pracownikami: wnioski bezpośrednio do ZUS (ZAS-53, ZAM)

---

## 9. Zbiorcza tabela wymagań: realizacja i decyzje

Tabela do uzupełnienia przez zespół. W kolumnie **Wykonane** zaznacz `☑`, gdy wymaganie jest zrealizowane i sprawdzone. W kolumnie **Ignorujemy** zaznacz `☑`, gdy świadomie z niego rezygnujemy, i wpisz powód w kolumnie **Uwagi / powód**.
Kolumna **Obowiązkowość** pochodzi z treści zadania: TAK / dodatkowo / rekomendacja / preferowane / zalecane / pośrednie (wniosek z kontekstu, nie wymóg wprost). Zrezygnowanie z wymagania oznaczonego „TAK” to ryzyko utraty punktów lub odrzucenia zgłoszenia.

Razem wymagań: **57**.

| ID | Wymaganie | Źródło | Obowiązkowość | Wykonane | Ignorujemy | Uwagi / powód |
|---|---|---|---|:---:|:---:|---|
| **Formalne (PZ pkt 4)** | | | | | | |
| F-01 | Tytuł i szczegółowy opis projektu | PZ 4 | TAK | ☐ | ☐ | |
| F-02 | Prezentacja (maksymalnie 10 slajdów) | PZ 4 | TAK | ☐ | ☐ | |
| F-03 | Film do 3 min w otwartym repozytorium (link), pokazuje projekt i jego użycie | PZ 4 | TAK | ☐ | ☐ | |
| F-04 | Repozytorium kodu | PZ 4 | dodatkowo | ☑ | ☐ | github.com/adrian-pretkowski/hacknation-2026 (origin), README |
| F-05 | Zrzuty ekranu | PZ 4 | dodatkowo | ☐ | ☐ | |
| F-06 | Link do demo jako strony internetowej | PZ 4 | dodatkowo | ☐ | ☐ | |
| F-07 | W demo można przetestować załączone przykłady (PDF): weryfikacja ubezpieczenia i sprawdzenie kalkulatora | PZ 4 | dodatkowo | ☐ | ☐ | |
| F-08 | Interfejs w pełni responsywny (desktop i mobile) | PZ 4 | dodatkowo | ☐ | ☐ | częściowo: 375/1440 px sprawdzone; brak ui-verifier 768 px i części ekranów |
| F-09 | Materiały graficzne lub inne elementy związane z projektem | PZ 4 | dodatkowo | ☐ | ☐ | |
| F-10 | Wskazanie funkcjonalności korzystających z AI | PZ 4 | dodatkowo | ☐ | ☐ | |
| F-11 | Opis zakresu użycia AI w procesie tworzenia i w działaniu aplikacji | PZ 9 | TAK (jeśli używacie AI) | ☐ | ☐ | |
| **Regulamin (REG §4) i poufność** | | | | | | |
| R-01 | Rozwiązania zewnętrzne (biblioteki, API, modele, assety) wskazane w prezentacji | REG §4 ust. 1 | TAK | ☐ | ☐ | |
| R-02 | Rozwiązanie wolne od wad prawnych, bez naruszania praw osób trzecich (licencje) | REG §4 ust. 2 | TAK | ☐ | ☐ | |
| R-03 | Możliwość przeniesienia autorskich praw majątkowych i przekazania kodu z opisem (zwycięzca) | REG §3 ust. 5, §4 | TAK (zwycięzca) | ☐ | ☐ | |
| R-04 | Dokumenty z zestawów ZUS nie są kopiowane ani rozpowszechniane (publiczne repo, demo, film) | PZ 2 | TAK | ☑ | ☐ | git ls-files: brak cases/, materials/, *.pdf; wpisy w .gitignore |
| **Funkcjonalne (PZ pkt 3)** | | | | | | |
| A | Informacje o świadczeniach w ciąży (chorobowy, rehabilitacyjne, w wysokości macierzyńskiego), także o braku uprawnień | PZ 3 a | TAK | ☐ | ☐ | |
| B | Kalkulator zasiłku macierzyńskiego dla obojga rodziców (okres i kwota; liczba dzieci, wiek, „Za życiem”) | PZ 3 b | TAK | ☐ | ☐ | częściowo: macierzyński matki w silniku; brak ojca i rodzicielskiego |
| C | Kalkulator przy łączeniu pracy z urlopem rodzicielskim (okres i kwota) | PZ 3 c | TAK | ☐ | ☐ | |
| D | Symulacja, gdy z uprawnień korzystają oboje rodzice (okres i kwota) | PZ 3 d | TAK | ☐ | ☐ | |
| E | Kalkulator dla rodziców adopcyjnych i rodzin zastępczych niezawodowych (okres i kwota) | PZ 3 e | TAK | ☐ | ☐ | |
| F | Kalkulator kwoty na indywidualnej podstawie wymiaru, czyli symulacja konkretnej sprawy z zestawów | PZ 3 f | TAK | ☐ | ☐ | |
| G | Dokumenty, terminy, sposób złożenia wniosków; wskazanie, czy składać do płatnika czy do ZUS | PZ 3 g | TAK | ☐ | ☐ | |
| H | Zagrożenia i ryzyka utraty uprawnień albo zmiany wymiaru i wysokości świadczeń | PZ 3 h | TAK | ☐ | ☐ | |
| I | Podmioty wyłącznie charytatywne wspierające w sytuacjach szczególnych (śmierć dziecka, wcześniak, poronienie, ciężka choroba) | PZ 3 i | TAK | ☐ | ☐ | |
| J | Kalkulator dla rodziców adopcyjnych i rodzin zastępczych (okres i kwota); szerzej niż E, bez „niezawodowej” | PZ 3 j | TAK | ☐ | ☐ | |
| K | Wszystkie kalkulatory jako jeden zintegrowany kalkulator z wyborem opcji | PZ 3 | rekomendacja | ☐ | ☐ | częściowo: kreator FE, większość wyniku z podglądu FE (fe-preview-mock) |
| L | Uprawnienia ustalane dla indywidualnej sytuacji (dane z ZUS albo wpisane przez użytkownika, np. data porodu, data ustania stosunku pracy) | PZ 3 | TAK | ☐ | ☐ | |
| **Sytuacje szczególne (PZ pkt 1–2)** | | | | | | |
| SZ-01 | Urodzenie martwego dziecka lub zgon dziecka (8 tyg. / 7 dni od zgonu) | PZ 1 | pośrednie | ☐ | ☐ | częściowo: MAT-DUR-003/004 w pipeline (T-MAT-013); brak ekranu z realnego API |
| SZ-02 | Wcześniak lub hospitalizacja noworodka: uzupełniający urlop macierzyński | PZ 1, załącznik | pośrednie | ☐ | ☐ | |
| SZ-03 | Przejęcie urlopu macierzyńskiego przez ojca (po 14 tyg. i wcześniej w sytuacjach szczególnych) | PZ 1 | pośrednie | ☐ | ☐ | |
| SZ-04 | Matka nieubezpieczona: uprawnienia ojca (rodzicielski, ojcowski) | PZ 1 | pośrednie | ☐ | ☐ | |
| SZ-05 | Urlop ojcowski (14 dni, 1–2 części, terminy przy urodzeniu i adopcji) | PZ 1 | pośrednie | ☐ | ☐ | |
| SZ-06 | Zasiłek w wysokości macierzyńskiego po utracie pracy w ciąży (upadłość, likwidacja, śmierć pracodawcy, naruszenie prawa) | PZ 1 | pośrednie | ☐ | ☐ | |
| SZ-07 | Ochrona pracownicy w ciąży wg Kodeksu pracy (zakaz wypowiedzenia, przedłużenie umowy do dnia porodu) | PZ 1 I | pośrednie | ☐ | ☐ | |
| SZ-08 | Planowanie powrotu do pracy i dzielenia się opieką nad dzieckiem | PZ 2 | pośrednie | ☐ | ☐ | |
| **Symulacje integracji (PZ pkt 3)** | | | | | | |
| S-01 | Logowanie przez mObywatela (symulacja) | PZ 3 | TAK | ☐ | ☐ | częściowo: mock FE features/simulations (FE2-02); /api/sim planned |
| S-02 | Pobranie danych z ZUS o ubezpieczeniu lub jego braku (symulacja) albo ręczne wprowadzenie danych | PZ 3 | TAK | ☐ | ☐ | częściowo: mock FE + ręczne dane w kreatorze; /api/sim planned |
| S-03 | Stan zadłużenia składkowego na dzień powstania prawa, zwłaszcza dla JDG (symulacja zaświadczenia i kwoty) | PZ 3 | TAK | ☐ | ☐ | częściowo: mock FE zaświadczenia (FE2-02); /api/sim planned |
| S-04 | Podgląd zaświadczeń lekarskich e-ZLA (symulacja) | PZ 3 | TAK | ☐ | ☐ | częściowo: mock FE e-ZLA (FE2-02); /api/sim planned |
| S-05 | Połączenie z PUE/eZUS: pytanie w razie wątpliwości, sprawdzenie danych na koncie (symulacja) | PZ 3 | TAK | ☐ | ☐ | częściowo: mock FE pytanie PUE/eZUS (FE2-02); /api/sim planned |
| S-06 | Wypełnianie wniosków o świadczenia (wzory z zus.pl) i ewentualna wysyłka do pracodawcy lub ZUS (symulacja) | PZ 3 | TAK | ☐ | ☐ | |
| S-07 | Zaprojektowane własne wnioski o urlopy związane z rodzicielstwem | PZ 3 | TAK | ☐ | ☐ | |
| S-08 | Wniosek o odpis zupełny lub skrócony aktu urodzenia (symulacja) | PZ 3 | TAK | ☐ | ☐ | |
| S-09 | Informacje o podmiotach wsparcia (fundacje, stowarzyszenia) | PZ 3 | TAK | ☐ | ☐ | |
| S-10 | Przekierowania do zus.pl, MRPiPS (gov.pl/web/rodzina/urlop-rodzicielski) i PIP | PZ 3 | TAK | ☐ | ☐ | |
| **Panel administracyjny (PZ pkt 3)** | | | | | | |
| ADM-01 | Zmiana parametrów w panelu admina (stopy procentowe, maksymalne wymiary itd.) na wypadek zmian w przepisach | PZ 3 | TAK | ☐ | ☐ | |
| ADM-02 | Możliwość dodawania i usprawniania funkcjonalności (np. treści, linki, organizacje) | PZ 3 | TAK | ☐ | ☐ | |
| **Techniczne (PZ pkt 5)** | | | | | | |
| T-01 | Nowoczesna, funkcjonalna aplikacja webowa nadająca się do realnego użycia | PZ 5 | TAK | ☐ | ☐ | |
| T-02 | Architektura RWD | PZ 5 | TAK | ☑ | ☐ | Tailwind 4, klasy sm/md/lg; Playwright e2e 375 i 1440 px (PROGRESS) |
| T-03 | Działa w środowisku testowym i ma potencjał wdrożenia produkcyjnego | PZ 5 | TAK | ☐ | ☐ | częściowo: lokalnie i Docker (smoke PASS); brak środowiska demo online |
| T-04 | Frontend React/Next.js | PZ 5 | preferowane | ☑ | ☐ | frontend/package.json: next 16.4.6, react 19.3.0 |
| T-05 | Backend JavaScript / Python / C#/.NET | PZ 5 | preferowane | ☑ | ☐ | backend/app: Python 3.12 + FastAPI |
| T-06 | Integracja frontendu z backendem przez REST API | PZ 5 | zalecane | ☑ | ☐ | frontend/src/lib/api.ts → POST /api/evaluate; contracts/openapi.yaml |
| **Testowanie przez jury (PZ pkt 6)** | | | | | | |
| Q-01 | Upload lub wybór przykładowych wniosków na stronie | PZ 6 | TAK | ☐ | ☐ | częściowo: przyciski „Przykłady” (scenariusze syntetyczne); brak uploadu |
| Q-02 | Poprawne wyliczenia dla przykładowych spraw (zgodność z rozstrzygnięciem ZUS) | PZ 6 | TAK | ☐ | ☐ | |
| Q-03 | Demo działa samodzielnie podczas praktycznych testów jury | PZ 6 | TAK | ☐ | ☐ | |
| Q-04 | Czytelna struktura kodu w repozytorium (jury ją przegląda) | PZ 6 | TAK | ☑ | ☐ | backend/app (core, engine, modules), frontend/src/features, README |
