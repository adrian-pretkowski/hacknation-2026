# Wypełnianie formularza ZAM z kodu

Pliki:

| Plik | Opis |
|---|---|
| `ZAM_do_druku_formularz.pdf` | PDF z polami formularza (AcroForm), 85 pól, strony 1–5 |
| `ZAM_do_druku_formularz_pola.json` | Lista pól: nazwa, strona, typ, etykieta, współrzędne |
| `ZAM_pobierz i drukuj.pdf` | Oryginał (bez pól) – nie nadpisywać |

## 1. Nazwy pól

Format: `p{strona}_{nr}_{typ}_{etykieta}`, np. `p1_00_txt_pesel`, `p2_31_chk_tak`.

- `nr` jest unikalny w całym dokumencie, więc nazwy się nie powtarzają (PESEL, TAK/NIE występują wielokrotnie, ale z różnym numerem).
- Etykieta jest generowana automatycznie z najbliższego tekstu i bywa przybliżona
  (np. `p4_64_txt_smiercia_matki` to **data** śmierci matki, `p5_72_txt_dziecka` to **data wypisania**).
- Pewne źródło prawdy: plik `_pola.json`. Każdy wpis:

```json
{ "name": "p1_00_txt_pesel", "page": 1, "type": "comb(11)",
  "label_guess": "PESEL", "rect": [239.8, 289.8, 435.1, 306.0] }
```

`rect` to współrzędne w punktach PDF od lewego górnego rogu strony (A4 = 595 x 842).

**Zalecenie:** w kodzie nie używaj nazw wprost, tylko własnej mapy `klucz_biznesowy -> nazwa pola`:

```json
{ "pesel": "p1_00_txt_pesel", "imie": "p1_03_txt_imie", "nazwisko": "p1_04_txt_nazwisko" }
```

Dzięki temu zmiana numeracji po regeneracji PDF-a wymaga poprawki w jednym miejscu.

## 2. Typy pól i format wartości

| Typ w JSON | Pole | Wartość |
|---|---|---|
| `text` | jednowierszowe | zwykły tekst |
| `multiline` | duża ramka | tekst z `\n` |
| `comb(N)` | N komórek, po jednym znaku | ciąg do N znaków, **bez separatorów** |
| `checkbox` | pole wyboru | zaznaczone: `true` / wartość `Yes`; odznaczone: `Off` |

Przykłady wartości dla `comb`:

- PESEL (`comb(11)`): `80010112345`
- Data (`comb(8)`): `ddmmrrrr`, np. `01022024` (bez `/` i `.`; ukośniki są wydrukowane na formularzu)
- Rachunek bankowy (`comb(26)`): 26 cyfr NRB bez spacji i bez prefiksu `PL`
- NIP (`comb(10)`), REGON (`comb(14)`): same cyfry

Wartość dłuższa niż N zostanie obcięta, krótsza wypełni początkowe komórki.

Uwaga merytoryczna: instrukcja na formularzu prosi o WIELKIE LITERY. Zamień tekst na wielkie litery przed wpisaniem (`toUpperCase()` / `.upper()`), jeśli ma to zachować zgodność z wnioskiem.

## 3. Backend – Python (PyMuPDF)

```bash
pip install pymupdf
```

```python
import pymupdf  # lub: import fitz

SRC = "ZAM_pobierz i drukuj_formularz.pdf"
DST = "ZAM_wypelniony_jan_kowalski.pdf"   # zawsze inna nazwa niż szablon

values = {
    "p1_00_txt_pesel": "80010112345",
    "p1_03_txt_imie": "JAN",
    "p1_04_txt_nazwisko": "KOWALSKI",
    "p2_19_txt_urlopu_na_warunkach_urlopu_macierzynskie": "01.03.2024 - 28.02.2025",
    "p2_20_chk_urlopu_na_warunkach_urlopu_macierzynskie": True,
}

doc = pymupdf.open(SRC)
for page in doc:
    for w in page.widgets():
        if w.field_name not in values:
            continue
        v = values[w.field_name]
        if w.field_type == pymupdf.PDF_WIDGET_TYPE_CHECKBOX:
            w.field_value = w.on_state() if v else "Off"
        else:
            w.field_value = str(v)
        w.update()          # wywołuj w trakcie iteracji po page.widgets()

doc.save(DST, garbage=3, deflate=True)
```

Ważne: `w.update()` musi być wywołane wewnątrz pętli `for w in page.widgets()`. Poza nią pojawi się błąd `Annot is not bound to a page`.

Odczyt pól (np. dla sprawdzenia): `{w.field_name: w.field_value for p in doc for w in p.widgets()}`.

## 4. Backend – Node.js / frontend (pdf-lib)

```bash
npm i pdf-lib
```

```js
import { PDFDocument } from "pdf-lib";
import fs from "node:fs";

const bytes = fs.readFileSync("ZAM_do_druku_formularz.pdf");
const pdf = await PDFDocument.load(bytes);
const form = pdf.getForm();

form.getTextField("p1_00_txt_pesel").setText("80010112345");
form.getTextField("p1_03_txt_imie").setText("JAN");
form.getTextField("p3_37_txt_dane_dziecka_dzieci").setText("JAN KOWALSKI\nur. 01.01.2024, Warszawa");
form.getCheckBox("p2_31_chk_tak").check();      // .uncheck() aby odznaczyć

form.updateFieldAppearances();                  // odśwież wygląd (czcionka z polskimi znakami, patrz niżej)
fs.writeFileSync("ZAM_wypelniony_jan_kowalski.pdf", await pdf.save());
```

Na froncie zamiast `fs` użyj `fetch` + `Blob`:

```js
const bytes = await fetch("/ZAM_formularz.pdf").then(r => r.arrayBuffer());
// ... wypełnienie jak wyżej ...
const out = await pdf.save();
const url = URL.createObjectURL(new Blob([out], { type: "application/pdf" }));
window.open(url);
```

### Polskie znaki w pdf-lib

Domyślna czcionka pól (Helvetica) w pdf-lib nie obsługuje znaków spoza WinAnsi. `ą ć ę ł ń ś ź ż` mogą wywołać błąd kodowania. Rozwiązanie:

```bash
npm i @pdf-lib/fontkit
```

```js
import fontkit from "@pdf-lib/fontkit";

pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(fs.readFileSync("DejaVuSans.ttf"), { subset: false });
// ... setText(...) ...
form.updateFieldAppearances(font);
```

PyMuPDF z domyślną czcionką `Helv` ma ten sam problem dla niektórych polskich liter. Jeśli któryś znak nie wyświetli się poprawnie, ustaw w widgecie czcionkę z obsługą Unicode albo użyj pdf-lib z osadzoną czcionką jak wyżej.

## 5. Spłaszczenie (gotowy do druku / niemodyfikowalny)

- PyMuPDF: `doc.bake()` (spłaszcza pola i adnotacje do treści strony).
- pdf-lib: `form.flatten()` przed `pdf.save()`.

Rób to na kopii. Po spłaszczeniu pola nie da się już edytować.

## 6. Dobre praktyki

- Szablon traktuj jako tylko do odczytu i zapisuj wynik pod inną nazwą.
- Przy starcie aplikacji porównaj klucze z mapy z nazwami w `_pola.json`, żeby szybko wykryć literówkę lub zmianę szablonu.
- Po regeneracji szablonu nazwy mogą się przesunąć (zmienia się `nr`). Dlatego trzymaj mapę biznesową w jednym pliku konfiguracyjnym.
- Pole spoza listy jest po cichu ignorowane przez PyMuPDF, a pdf-lib rzuci wyjątek `getTextField ... no field`.
- Podgląd w przeglądarce: niektóre przeglądarki (Chrome, Edge) ukrywają zawartość pól do momentu `updateFieldAppearances()` lub spłaszczenia, więc wywołuj je zawsze przed zapisem.
- Pola `comb` w innych czytnikach (np. starszy Acrobat) mogą rozstawiać znaki nieco inaczej, więc sprawdź wynik wizualnie na jednej próbce.
