# Wskazanie funkcji z AI (wymóg § 4 zadania)

Krótko: **aplikacja nie używa AI**. Prawo do zasiłków, okresy i kwoty liczy deterministyczny silnik reguł. AI (asystent programisty Claude Code) wspierało wyłącznie **proces tworzenia** kodu i dokumentacji. Nigdy nie było używane do przetwarzania danych spraw.

## 1. Aplikacja (to, co widzi użytkownik i jury)

| Funkcja | Czy używa AI? | Jak działa |
|---|---|---|
| Ustalenie prawa do zasiłków (a–j) | **nie** | silnik reguł `backend/app/engine/` czyta `zus_rules/03_rules.yaml` (logika trójwartościowa, brak danych → `NEEDS_DATA`). Decyzja D3 |
| Okresy, kwoty, stawki | **nie** | `decimal.Decimal`, parametry prawne z `app.core.params.param()` (panel admina) |
| Wyjaśnienie wyniku („Pokaż, jak to policzyliśmy”) | **nie** | szablony zdań `engine/explain/templates.pl.yaml` + identyfikatory reguł i przepisów |
| Planer i optymalizator urlopów | **nie** | programowanie dynamiczne na grafie decyzji (D24) |
| Upload wniosku PDF (`/sprawy`) | **nie** | rozpoznanie przykładowego pliku po skrócie SHA-256. Inny plik → lista brakujących danych do uzupełnienia ręcznie. Plik nie jest zapisywany (D32) |
| Wypełnianie pism PDF | **nie** | `pdf-lib` w przeglądarce (D34) |
| Symulacje mObywatel, PUE/eZUS, e-ZLA, USC, zadłużenie | **nie** | deterministyczne mocki (`backend/app/integrations/simulated/`), zawsze z banerem SYMULACJA |

Odczyt dokumentów przez AI (`extraction_method: AI_EXTRACTION` w kontrakcie) został **odrzucony** decyzją D10/D22 po odpowiedzi mentora M16e. Dane spraw ZUS nie mogą trafiać do zewnętrznych usług AI. Wartość enum zostaje w kontrakcie wyłącznie jako zarezerwowana. Endpoint jej nie zwraca.

## 2. Proces tworzenia (zespół)

| Gdzie | Narzędzie | Zakres | Kontrola człowieka |
|---|---|---|---|
| Kod backendu i frontendu, testy | Claude Code (asystent w terminalu) | propozycje kodu, testy jednostkowe i E2E, refaktoryzacja | każdy commit przechodzi testy (`scripts\verify.ps1`), audyt reguł (`build_catalog.py`, 0 błędów) i review (`/review`). Merge wykonuje lider |
| Katalog reguł `zus_rules/` | Claude Code | porządkowanie przepisów w YAML, wyszukiwanie luk (`zus_rules/09`) | reguły z `source_excerpt` i podstawą prawną; niejasności rozstrzygał mentor (`docs/mentors.md`), nie AI |
| Dokumentacja | Claude Code | szkice opisów, macierz pokrycia | redakcja zespołu |

Zasady, których przestrzegało AI w repo (`CLAUDE.md`):
- LLM nie liczy kwot ani uprawnień;
- wartości prawne tylko z parametrów;
- dane spraw (`cases/`, `materials/`) poza gitem i poza asystentami działającymi w chmurze (D22).

## 3. Gdzie AI mogłoby pomóc w wersji produkcyjnej (poza zakresem prototypu)

- Odczyt skanów wniosków (OCR + ekstrakcja pól) **wyłącznie** na infrastrukturze ZUS i z weryfikacją człowieka. Wynik zasila ten sam silnik reguł, nie zastępuje go.
- Asystent odpowiadający na pytania o przepisy z cytowaniem źródeł. Nie podejmowałby decyzji o świadczeniach.
