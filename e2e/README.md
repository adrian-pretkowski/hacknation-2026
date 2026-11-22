# Scenariusze E2E pisane po polsku

Każdy plik w `scenariusze/` to jeden scenariusz użytkownika zapisany zwykłymi zdaniami. Playwright czyta plik, rozpoznaje każdy krok i wykonuje go w przeglądarce tak jak człowiek: klika, wybiera, wpisuje, sprawdza, co widać. Każdy scenariusz przechodzi dwa razy: na telefonie (375 px) i na komputerze (1440 px).

Wszystkie osoby i dane w scenariuszach są fikcyjne. Logowanie przez mObywatel i pobieranie danych z ZUS to **SYMULACJA** z aplikacji (konta testowe z `frontend/src/features/simulations/users.ts`), bez połączenia z prawdziwymi usługami.

## Uruchomienie

Pierwszy raz (instaluje tylko `@playwright/test`; przeglądarka to Chrome zainstalowany w systemie):

```powershell
cd e2e; npm install
```

Wszystkie scenariusze (używa działającego `scripts\dev.ps1` na :3000, a gdy go nie ma, sam uruchamia `npm run dev` we `frontend/`):

```powershell
cd e2e; npm test
```

Inne warianty:

- `npm run test:telefon` / `npm run test:komputer` - tylko jeden widok.
- `npm run wcag` - audyt WCAG 2.2 AA (axe-core) po każdym kroku wszystkich scenariuszy przy 375, 1440 i 320 px (powiększenie 400%); raport w `test-results/wcag/*.json` (FE1-30).
- `npx playwright test -g "tata"` - scenariusze, których nazwa zawiera „tata”.
- `npx playwright test --headed --project=komputer -g "01-"` - z widocznym oknem przeglądarki.
- `npm run raport` - raport HTML z krokami, zrzutami ekranu i nagraniem (trace) nieudanych prób.
- `$env:E2E_BASE_URL = "https://adres-demo"; npm test` - na innym adresie (np. publiczne demo).
- `$env:E2E_BROWSER = "msedge"` - Edge zamiast Chrome (`chromium` po `npx playwright install chromium`).

Serwer deweloperski przeładowuje stronę po zapisaniu zmian w kodzie, więc gdy ktoś równolegle edytuje frontend, pojedynczy test może się wysypać. Dlatego każdy nieudany test jest powtarzany raz (`retries: 1`); stabilny wynik daje `npm run build; npm start` we `frontend/`.

## Format pliku

```markdown
# Mama w ciąży na umowie o pracę planuje urlop

Widok: telefon
> Komentarz - pomijany.

1. Otwórz stronę główną.
2. Kliknij „Zaczynamy”.
3. Wybierz „Mamą”.
4. Przejdź dalej.
5. W polu „Planowana data porodu” wpisz „za 60 dni”.
6. Sprawdź, że nagłówek to „Okoliczności szczególne”.
```

- Tytuł to pierwsza linia `# …`. Krokami są tylko linie zaczynające się od numeru (`1.` albo `1)`); reszta to opis dla ludzi.
- `Widok: telefon` albo `Widok: komputer` ogranicza scenariusz do jednego widoku (domyślnie oba).
- Wartości podajemy w cudzysłowie: „…”, "…" albo '…'. Etykiety i teksty nie muszą być pełne, wystarczy ich fragment („Od kiedy podlegasz” znajdzie „Od kiedy podlegasz ubezpieczeniu chorobowemu?”). Wielkość liter nie ma znaczenia.
- Daty: `2026-12-01`, `01.12.2026`, `1 grudnia 2026`, `dziś`, `za 60 dni`, `za 8 tygodni`, `3 tygodnie temu`. Daty względne trzymają scenariusz aktualnym (ciąża zawsze w przyszłości, poród w przeszłości).
- Przed uruchomieniem sprawdzane są wszystkie kroki scenariusza. Nieznane zdanie kończy test od razu z listą obsługiwanych kroków.

## Słownik kroków

Nawigacja
- `Otwórz stronę główną` · `Otwórz stronę „/admin”` · `Cofnij w przeglądarce` · `Odśwież stronę`
- `W API ustaw parametr „MAT_RATE_COMBINED” na „0.9”` - parametr jak z panelu admina, tylko w tej przeglądarce (podmiana odpowiedzi `GET /api/admin/parameters`, bez zapisu w backendzie); przed „Otwórz stronę główną” albo przed `Przełącz się na inną kartę i wróć` (FE1-37)
- `Przełącz się na inną kartę i wróć` - powrót do karty; kreator ponownie pobiera parametry z panelu admina (FE1-37)

Logowanie (SYMULACJA)
- `Zaloguj się przez mObywatel jako „Anna Przykładowa”` - cały przebieg: przycisk „Zaloguj się” w nagłówku (albo okno logowania już otwarte, np. po „Zaloguj się i pobierz”), zeskanowanie kodu QR na symulowanym telefonie, potwierdzenie, powrót do serwisu.
- `Zeskanuj kod QR jako „Anna Przykładowa”` · `Potwierdź logowanie w telefonie` · `Odrzuć logowanie w telefonie` - te same czynności po kolei.
- Konta testowe: Anna Przykładowa (mama w ciąży, etat), Ewa Testowa (JDG z zaległością), Piotr Próbny (tata, mała firma), Marta Wzorcowa (mama po porodzie, zlecenie).

Formularz
- `Wybierz „Mamą”` - opcja (radio), pole wyboru, zakładka.
- `W pytaniu „Czy pracujesz na pełny etat?” wybierz „Tak”` - opcja w konkretnym pytaniu (gdy na ekranie jest kilka pytań z tymi samymi odpowiedziami, np. „Tak” / „Nie”).
- `Zaznacz „Wcześniak”` · `Odznacz „Wcześniak”` - pole wyboru.
- `Z listy „Ile dzieci przy jednym porodzie?” wybierz „2”` (albo `Wybierz „2” z listy „…”`).
- `W polu „Planowana data porodu” wpisz „za 60 dni”` (albo `Wpisz „7800” w pole „…”`).
- `Ustaw suwak „Ile tygodni rodzicielskiego weźmie tata?” na „9”`.
- `Przejdź dalej` - przycisk „Dalej →” albo, na ostatnim kroku, „Pokaż plan →”.
- `Kliknij „Zaczynamy”` - przycisk, link, zakładka albo tekst.
- `Naciśnij klawisz „Escape”` · `Poczekaj 2 sekundy`

Sprawdzenia
- `Sprawdź, że nagłówek to „Twój plan”` - dokładny tekst nagłówka.
- `Sprawdź, że widać „Oś czasu”` · `Sprawdź, że nie widać „Nie przysługuje”` - fragment tekstu na ekranie.
- `Sprawdź, że można przejść dalej` · `Sprawdź, że nie można przejść dalej`
- `Sprawdź, że przycisk „Pokaż wynik teraz” jest aktywny` (albo `nieaktywny`)
- `Sprawdź, że pole „Od kiedy podlegasz” ma wartość „2019-03-01”`
- `Sprawdź, że jestem zalogowana jako „Anna Przykładowa”` (albo `zalogowany`)
- `Sprawdź, że strona nie przewija się w poziomie`
- `Zrób zrzut ekranu „plan-mamy”` - zrzut trafia do raportu.

## Nowy krok

Dopisz pozycję w tablicy `KROKI` w `kroki.ts` (wzorzec zdania, przykład w `opis`, funkcja wykonująca) i dodaj go do słownika powyżej. `npm run slownik` sprawdza bez przeglądarki, że każdy przykład z `opis` trafia we własny krok.
