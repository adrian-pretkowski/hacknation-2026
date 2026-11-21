# PRD — Przewodnik Przyszłego Rodzica

Wymagania nadrzędne: `docs/CHALLENGE.md`. Ten dokument opisuje decyzje produktowe zespołu.

**Wizja:** osobisty przewodnik, który na podstawie danych z ZUS (symulowanych) lub wpisanych przez rodzica pokazuje, co przysługuje w ciąży i po narodzinach dziecka, ile i na jak długo, jak podzielić urlopy z partnerem oraz co, gdzie i kiedy złożyć. Dla ZUS — mniej wadliwych wniosków i sporów dzięki informacji przed porodem.

**Propozycja wartości:** „Wiesz, ile i na jak długo dostaniesz — zanim złożysz wniosek — wyliczone tak, jak policzy ZUS, z podstawą prawną każdej decyzji.”

**Użytkownicy:** przyszła matka/ojciec (pracownik, zleceniobiorca, przedsiębiorca), rodzic adopcyjny, rodzina zastępcza niezawodowa; pośrednio — konsultant ZUS i jury.

## Główny scenariusz (user journey)
1. Wejście → „Zaloguj przez mObywatel (SYMULACJA)” albo „Wybierz przykładową sprawę” / „Wgraj wniosek” albo „Wpiszę dane sam”.
2. Pobranie danych (SYMULACJA): tytuły ubezpieczenia, podstawa, e-ZLA, zadłużenie składkowe.
3. Uzupełnienie: termin porodu / data przyjęcia dziecka, liczba dzieci, „Za życiem”, wcześniak, drugi rodzic.
4. Wynik: karty świadczeń (przysługuje / nie przysługuje / brak danych / do weryfikacji) z uzasadnieniem i przepisem; weryfikacja ubezpieczenia.
5. Planer osi czasu obojga rodziców (macierzyński → rodzicielski, 9 tyg. nieprzenoszalne, ojcowski, praca ≤½ etatu), kwoty, porównanie 100/70 vs 81,5%, data powrotu do pracy.
6. „Co teraz”: dokumenty, adresat (płatnik vs ZUS), terminy, ryzyka, wsparcie.
7. Wypełnienie wniosku (SYMULACJA) / pobranie podsumowania.

**Moment sukcesu demo:** wybór przykładowej sprawy ZUS → wynik „Zgodne z decyzją ZUS ✓” co do grosza → zmiana parametru w panelu admina przelicza oś czasu na żywo.

## Zasady produktowe
- Silnik deterministyczny; AI nie ustala uprawnień ani kwot.
- Brak danych nigdy nie oznacza odmowy — pytamy o brakujące pole.
- Każda symulacja jawnie oznaczona; bez brandingu ZUS/mObywatel.
- Tryb wrażliwy dla martwego urodzenia, poronienia, zgonu dziecka lub matki.
- Wynik informacyjny, nie decyzja ZUS.
