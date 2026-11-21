# Wymaganie: „Od czego chcesz zacząć?” — kreator albo szybkie pisma (FE1-11)

Zgłoszone przez lidera 2026-11-21. Zadanie: `docs/TASKS.md` FE1-11. Wymaganie zadania, którego dotyczy: **g) dokumenty, terminy, sposób złożenia wniosków** (`docs/EVALUATION_CRITERIA.md` § 2: ZAM, Z-3/Z-3a, ZAS-53, ZAS-12, e-ZLA).

## Cel
Nie każdy użytkownik chce przejść cały kreator. Część osób wie, jakiego pisma potrzebuje, i chce je od razu wypełnić. Ekran startowy daje więc wybór jednej z dwóch dróg, a pisma są dostępne z obu.

## Etapy

| Etap | Zakres | Status |
|---|---|---|
| 1 | Ekran startowy: sekcja **„Od czego chcesz zacząć?”** z dwiema kartami wyboru: **„Sprawdź, co Ci przysługuje”** (kreator → plan, przycisk „Zaczynamy →”) i **„Złóż pisma szybko”** (przycisk „Wybierz pismo →”). Droga „pisma” to ekran **„Które pismo chcesz złożyć?”** z kafelkami pism (ikona z symbolem, nazwa, do czego służy, **kiedy złożyć**, **kto wypełnia**) | zrobione (FE1-11) |
| 2 | Te same kafelki na podsumowaniu wyniku kreatora (sekcja **„Pisma do wypełnienia”** pod „Co i gdzie złożyć”). Widać **tylko pisma pasujące do wyniku** (`missing_documents.doc_type`, etykieta „Pasuje do Twojego planu”); pozostałe są zwinięte pod przyciskiem **„Pokaż pozostałe pisma (N)”** / „Ukryj pozostałe pisma”. Gdy nic nie pasuje — komunikat „Do Twojego aktualnego planu nie pasuje żadne z tych pism…” i ten sam przycisk „Pokaż pozostałe pisma (5)” | zrobione (FE1-11, zwijanie: FE1-16) |
| 3 | Wypełnianie pisma formularzem: formularz generowany z metadanych pól PDF (`docs/wnioski-pdf/*_pola.json`), wszystkie pola wzoru (najważniejsze w sekcjach, reszta w „Pozostałe pola formularza” wg stron, tabele jako siatka); prefill z konta testowego (SYMULACJA) i odpowiedzi kreatora; puste pola wymagane oznaczone „Uzupełnij”; przyciski **Anuluj** / **Prześlij** → walidacja → wypełniony PDF pobierany lokalnie + potwierdzenie „Hej, Twoje pismo … zostało wysłane do ZUS!” (SYMULACJA) | zrobione (FE1-19) |

## Pisma (kolejność i grupy)

| Grupa | Symbol | Nazwa | Kto wypełnia | Kiedy złożyć | Polecane, gdy `doc_type` |
|---|---|---|---|---|---|
| Zasiłek macierzyński | **ZAM** | Wniosek o zasiłek macierzyński (od 24.10.2026 obejmuje dawne ZUR i ZAO) | ubezpieczony (mama lub tata), gdy płaci ZUS | po urodzeniu / przyjęciu dziecka, z odpisem aktu urodzenia; wariant 81,5% — w ciągu `APP_COMBINED_DEADLINE_DAYS` dni od porodu | `ZAM_APPLICATION`, `MATERNITY_APPLICATION_ANNEX6` |
| Zaświadczenia płatnika | **Z-3** | Zaświadczenie płatnika składek — pracownik | pracodawca | gdy płaci ZUS (płatnik do `PAYER_INSURED_THRESHOLD` ubezpieczonych), do wniosku o zasiłek | `PAYER_CERTIFICATE_Z3`, `PAYER_CERTIFICATE_Z3_OR_Z3A` |
| Zaświadczenia płatnika | **Z-3a** | Zaświadczenie płatnika składek — osoba niebędąca pracownikiem | płatnik (np. zleceniodawca) | gdy płaci ZUS, do wniosku o zasiłek | `PAYER_CERTIFICATE_Z3A`, `PAYER_CERTIFICATE_Z3_OR_Z3A` |
| Zasiłek chorobowy w ciąży | **ZAS-12** | Zaświadczenie płatnika — wniosek o zasiłek za dalszy okres | płatnik (zwykle pracodawca); zamiennie Z-3 / Z-3a | kolejne zwolnienie w ciągłości z poprzednim | — (silnik jeszcze nie wskazuje) |
| Zasiłek chorobowy w ciąży | **ZAS-53** | Wniosek o zasiłek chorobowy | ubezpieczony (zwłaszcza JDG, gdy nie ma płatnika wystawiającego Z-3/Z-3a) | w czasie niezdolności do pracy, z pierwszym zwolnieniem (e-ZLA) | `SICKNESS_APPLICATION_ANNEX1` |

Kolor ikony: zielony — wypełniasz Ty, granatowy — wypełnia płatnik składek.

## Zasady
- Symbole formularzy pochodzą z treści zadania i informacji ZUS, nie z rozporządzenia (CONF-007, APP-DOC-003, SICK-DOC-001) — w UI dopisek „wg informacji ZUS”. Opis ZAS-12 — wg wzoru formularza na zus.pl; **do potwierdzenia z mentorem**.
- Liczby z przepisów w tekstach pism tylko z `PARAMS` (`APP_COMBINED_DEADLINE_DAYS`, `PAYER_INSURED_THRESHOLD`).
- Bez brandingu ZUS (logo, kolory formularzy). Wysyłka pism (etap 3) wyłącznie jako SYMULACJA.
- Każde przejście (start → lista pism → pismo → powrót) trafia do historii przeglądarki; z pisma otwartego z wyniku przycisk wraca do planu, z listy — do listy.
- RWD: 375 px bez poziomego scrolla; kafelek klikalny w całości, nazwa przycisku „Wypełnij <symbol> →”.

## Implementacja
- Katalog pism: `frontend/src/features/documents/forms.ts` (`FORMS`, `FORM_GROUPS`, `formsForDocTypes`).
- Kafelki i ekran pisma: `frontend/src/features/documents/FormPicker.tsx` (`FormPicker`, `FormIcon`, `FormDetail` z formularzem).
- Etap 3 (FE1-19): `FormFill.tsx` (formularz, walidacja, potwierdzenie), `formSpecs.ts` (sekcje, etykiety, pola wymagane — po krótkim ID pola `p1_000`), `prefill.ts` (konto testowe + kreator; fikcyjne dane osobowe), `pdfForm.ts` (pdf-lib, D34). Szablony: `frontend/public/forms/<KOD>.pdf|.json` (kopie z `docs/wnioski-pdf/` — po zmianie wzoru skopiuj oba pliki), czcionka `public/forms/fonts/DejaVuSans.ttf` (polskie znaki).
- Wybór drogi: `frontend/src/features/main-flow/wizard/Intro.tsx` (`PathCard`); widoki `forms` / `form`: `Wizard.tsx`; sekcja na wyniku: `Results.tsx` (`FormsToFill`).
- E2E: `e2e/scenariusze/14-szybkie-pisma.md`, `17-pisma-dopasowane-do-planu.md` (zwijanie, widok komputera), `18-wypelnienie-pisma.md` (walidacja, Anuluj, wysyłka z kontem testowym).

## Opieka nad rodzicami (FE1-16, zgłoszone 2026-11-21)
Wsparcie psychiczne i informacja o pomocy to pokazanie, że rodzice są dla nas ważni — mają pierwszeństwo przed kwotami:
- **Ekran startowy:** sekcja „Gdy ciąża nie zakończyła się szczęśliwie” jest zaraz pod wyborem drogi (a nie na dole strony), jako wyraźna karta z ikoną serca, ciepłym tekstem i przyciskiem „Przejdź do trybu spokojnego”.
- **Wynik:** panele wsparcia (strata dziecka, wcześniak, „Za życiem”) są **na samej górze**, przed nagłówkiem z wynikiem; większa czcionka, ikona serca, klikalny numer telefonu.
- Wszystkie przyciski mają kursor „rączki” (`globals.css`, Tailwind 4 domyślnie go nie ustawia).

## Otwarte
- Etap 3 (FE1-19): wysyłka jest lokalną SYMULACJĄ w przeglądarce — `POST /api/sim/applications` obsługuje tylko ZAM i wnioski urlopowe (kontrakt), więc pisma Z-3/Z-3a/ZAS-12/ZAS-53 wymagałyby zmiany kontraktu (INT). Kwoty i okresy urlopów nie są uzupełniane z podglądu — prosimy użytkownika o wpis.
- Instrukcja Z-3 w `docs/wnioski-pdf/z3/` opisuje pkt 2 jako „umowa terminowa” — na wzorze to „umowa o pracę tymczasową” (formularz używa treści wzoru).
- ZAS-12 — potwierdzić z mentorem zakres i czy pokazywać w ścieżce rodzica (wypełnia płatnik).
- Silnik nie zwraca `doc_type` dla ZAS-12; podgląd FE (`preview/engine.ts`) nie zwraca Z-3a ani ZAS-53 — wyróżnienie tych pism na wyniku pojawi się, gdy wyniki przejdą na silnik API (FE1-01).
