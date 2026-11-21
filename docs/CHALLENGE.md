# CHALLENGE - wymagania zadania ZUS (źródło nadrzędne)

Streszczenie (własnymi słowami) oficjalnej treści zadania „Zasiłkowy Przewodnik Przyszłego Rodzica” i regulaminu. Oryginały: `materials/challenge/` (lokalnie, poza gitem - patrz `docs/MATERIALS.md`). **Te wymagania mają pierwszeństwo przed wszystkimi decyzjami zespołu.** Przy wątpliwości sprawdź oryginał.

## 1. Problem i cel
- Przyszli rodzice, kobiety w ciąży, rodzice (także adopcyjni i rodziny zastępcze) nie wiedzą, jakie świadczenia z ubezpieczenia chorobowego im przysługują, ile i na jak długo, gdzie i kiedy złożyć dokumenty; bywają zaskoczeni brakiem prawa.
- Przyczyny: brak wiedzy, trudne przypadki szczególne (martwe urodzenie, wcześniak, ciężka choroba lub śmierć matki), trudność ustalenia wysokości, skomplikowane procedury, zmiany warunków zatrudnienia w ciąży; obawa przed łączeniem pracy z opieką.
- Dla ZUS: mniej wadliwych wniosków, korespondencji i sporów; obecnie ZUS dowiaduje się o dziecku dopiero po porodzie.
- Cel: narzędzie, które **w sposób skonkretyzowany (dla indywidualnej sytuacji)** informuje o uprawnieniach, prowadzi przez proces wnioskowania, wspiera decyzje o urlopach, powrocie do pracy i podziale opieki oraz pomaga w sytuacjach trudnych.
- Dane o sytuacji: z systemów ZUS (symulowane) lub wpisane przez użytkownika (np. przewidywana data porodu, data ustania zatrudnienia).

## 2. Funkcje wymagane (pkt 3 zadania)
| ID | Wymaganie |
|---|---|
| a | Informacje o świadczeniach w ciąży - zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego - **także o braku uprawnień** |
| b | Kalkulator zasiłku macierzyńskiego dla obojga rodziców (okres i wysokość) z uwzględnieniem okoliczności: liczba dzieci, ich wiek, zaświadczenie „Za życiem” |
| c | Kalkulator przy łączeniu pracy z urlopem rodzicielskim (okres i wysokość) |
| d | Kalkulator dla sytuacji, gdy z uprawnień korzystają oboje rodzice (okres i wysokość) |
| e | Kalkulator dla rodziców adopcyjnych i rodziny zastępczej niezawodowej (okres i wysokość) |
| f | Kalkulator wysokości przy indywidualnej podstawie wymiaru - symulacja dla konkretnej sprawy z udostępnionych zestawów |
| g | Dokumenty, terminy i sposób złożenia wniosków; wskazanie, czy płaci płatnik składek (pracodawca), czy ZUS - gdzie złożyć dokumenty |
| h | Zagrożenia i ryzyka utraty prawa lub zmiany wymiaru/wysokości świadczeń |
| i | Podmioty wyłącznie charytatywne wspierające w sytuacjach szczególnych (śmierć dziecka, wcześniak, poronienie, ciężka choroba dziecka) |
| j | Kalkulator dla rodziców adopcyjnych i rodzin zastępczych (okres i wysokość) |
| - | **Rekomendacja:** wszystkie kalkulatory jako jeden zintegrowany kalkulator z wyborem opcji |

## 3. Możliwości narzędzia (wszystkie integracje - WYŁĄCZNIE symulowane)
1. Logowanie przez mObywatel - **symulacja**.
2. Pobranie danych z systemów ZUS (ubezpieczenie lub jego brak) albo wpisanie danych samodzielnie - pobieranie **symulowane**.
3. Wyświetlenie stanu zadłużenia składkowego na dzień powstania prawa (szczególnie dla prowadzących działalność) - **symulacja** zaświadczenia i kwoty.
4. Podgląd danych o zaświadczeniach lekarskich e-ZLA - **symulacja**.
5. Połączenie z PUE/eZUS (pytanie w razie wątpliwości, sprawdzenie danych na koncie) - **symulacja**.
6. Wypełnienie wniosków o urlopy i świadczenia i ewentualne przesłanie do pracodawcy/ZUS - **symulacja**; **wnioski o urlopy trzeba zaprojektować**, wnioski o świadczenia są na zus.pl.
7. Wniosek o odpis aktu urodzenia - **symulacja** (gov.pl, rejestr stanu cywilnego).
8. Informacje o podmiotach wsparcia (fundacje, stowarzyszenia).
9. Przekierowania do informacji na zus.pl, gov.pl (MRPiPS - urlop rodzicielski), PIP (rodzicielstwo).
10. **Panel administracyjny** do zmiany parametrów (np. stopa %, maksymalny wymiar) przy zmianach prawa i do rozwoju funkcji.

## 4. Wymagania formalne zgłoszenia (pkt 4 zadania)
Obowiązkowe: szczegółowy opis i tytuł; prezentacja **≤10 slajdów**; film **≤3 min** w dostępnym, otwartym repozytorium (link), prezentujący projekt i użycie (może być częścią aplikacji).
Dodatkowo: repozytorium kodu; zrzuty ekranu; **link do demo jako strony internetowej**, na której można przetestować wybrane załączone przykłady (formularze PDF) - **sprawdzić, czy osoba ma ubezpieczenie**, i sprawdzić kalkulator; **pełna responsywność (RWD)** desktop i mobile; materiały graficzne; **wskazanie funkcji działających z AI**.
Regulamin § 4 ust. 1: rozwiązania zewnętrzne muszą być **wyraźnie wskazane w prezentacji**. Zwycięzca przenosi autorskie prawa majątkowe na ZUS (umowa, § 4).

## 5. Wymagania techniczne (pkt 5)
- Nowoczesna, funkcjonalna, możliwa do realnego zastosowania **aplikacja webowa RWD**; działa w warunkach testowych, z potencjałem wdrożenia produkcyjnego.
- Technologia dowolna; **preferowane: frontend React/Next.js; backend JavaScript, Python lub C#/.NET; integracja przez REST API**.

## 6. Testowanie przez jury (pkt 6)
- Ocena zgodności z wymaganiami biznesowymi i technicznymi: praktyczne testy demo, zgodność z wymaganiami technicznymi, **przegląd struktury kodu w repozytorium**.
- Jury użyje **przykładowych wniosków** i **sprawdzi poprawność wyliczeń**. **Strona musi umożliwiać upload lub wybór wybranych wniosków.**

## 7. Kryteria oceny (pkt 8)
Związek z wyzwaniem **25%** · Pomysł **20%** · Oryginalność **15%** · Kompletność projektu i UX **25%** · Potencjał wdrożeniowy **15%**. Jury wybiera maks. 3 zespoły do prezentacji finałowej (regulamin § 2 ust. 7); nagroda 30 000 zł.

## 8. Ograniczenia i zasady
- AI dozwolone w procesie twórczym i w aplikacji - **z obowiązkiem wskazania zakresu użycia w opisie**.
- Przykładowe sprawy ZUS: **wyłącznie na użytek HackNation, nie wolno ich kopiować ani rozpowszechniać** → `cases/` poza gitem; publikacja w demo - pytanie M02 (`docs/mentors.md`).
- Formularze: ZUR i ZAO połączone z ZAM od 24.10.2026, Z-3b zlikwidowany.
- Kontakt: mentorzy ZUS na stoisku i Discord.

## 9. Materiały dostarczone przez ZUS
Załącznik (czas trwania, wysokość, podstawa wymiaru), wyciągi przepisów (ustawa zasiłkowa, Kodeks pracy, 2 rozporządzenia), Poradnik dla rodziców ZUS 2026, przykładowe sprawy (dokumenty i informacja, czy przyznano świadczenie). Opracowanie prawne: `zus_rules/` (start: `zus_rules/01_LEGAL_SOURCE_REGISTER.md`).

## 10. Gdzie każde wymaganie jest realizowane
Macierz wymaganie → reguły → ekran → test → status: `docs/coverage.md`. Zadania: `docs/TASKS.md`. Postęp: `PROGRESS.md`.
