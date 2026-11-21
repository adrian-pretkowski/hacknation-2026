# Wypełnianie formularza Z-3a z kodu

Pliki:

| Plik | Opis |
|---|---|
| `Z-3a_do_druku_formularz.pdf` | PDF z polami formularza (AcroForm), 146 pól, strony 1–5 |
| `Z-3a_do_druku_formularz_pola.json` | Lista pól: nazwa, strona, typ, etykieta, współrzędne |
| `Z-3a_do_druku.pdf` | Oryginał (bez pól), nie nadpisywać |

Strony 6–7 (pouczenie) nie mają pól.

## 1. Nazwy pól

Pola zwykłe: `p{strona}_{nr}_{typ}_{etykieta}`, np. `p1_002_txt_nip`, `p3_038_chk_tak`.
Komórki tabeli (strona 5): `p5_{nr}_tab1_r{wiersz}_c{kolumna}`, np. `p5_084_tab1_r01_c1`.

- `nr` jest unikalny w całym dokumencie. Powtarzające się etykiety (PESEL, TAK, NIE, „za okres”) różnią się numerem.
- Etykiety zwykłych pól są generowane automatycznie z najbliższego tekstu i bywają przybliżone. Pewne źródło prawdy to `_pola.json`:

```json
{ "name": "p1_002_txt_nip", "page": 1, "type": "comb(10)",
  "label_guess": "NIP", "rect": [..., ..., ..., ...] }
```

`rect` to współrzędne w punktach PDF od lewego górnego rogu (A4 = 595 x 842).

**Zalecenie:** w kodzie trzymaj własną mapę `klucz_biznesowy -> nazwa pola` w jednym pliku konfiguracyjnym, żeby po regeneracji szablonu poprawiać tylko ją.

## 2. Typy pól i format wartości

| Typ w JSON | Pole | Wartość |
|---|---|---|
| `text` | jednowierszowe | zwykły tekst |
| `multiline` | duża ramka | tekst z `\n` |
| `comb(N)` | N komórek, po jednym znaku | ciąg do N znaków **bez separatorów** |
| `checkbox` | pole wyboru | zaznaczone: `true` / `Yes`; odznaczone: `Off` |

Wartości dla pól `comb`:

- PESEL `comb(11)`: `80010112345`
- Data `comb(8)`: `ddmmrrrr`, np. `01022024`. Ukośniki są już wydrukowane na formularzu.
- NIP `comb(10)`, REGON `comb(14)`: same cyfry
- Rachunek bankowy `comb(26)`: 26 cyfr bez spacji i bez `PL`

Formularz prosi o WIELKIE LITERY, więc zamieniaj tekst na wielkie przed wpisaniem (`.upper()` / `toUpperCase()`).

## 3. Mapa pól

Nazwy podaję skrótowo (numer pola). Pełna nazwa to `p{strona}_{nr}_…` z pliku JSON. Opisy w nawiasach to korekty do etykiet automatycznych.

**Strona 1, dane płatnika składek:** `p1_000` pierwszy wniosek o świadczenie (checkbox), `p1_001` wniosek o kontynuację świadczenia (checkbox), `p1_002` NIP, `p1_003` REGON, `p1_004` PESEL, `p1_005` rodzaj/seria/numer dokumentu, `p1_006` nazwa albo imię i nazwisko, `p1_007` ulica, `p1_008` numer domu, `p1_009` numer lokalu, `p1_010` kod pocztowy, `p1_011` miejscowość, `p1_012` nazwa państwa, `p1_013` telefon.

**Strona 1, dane osoby ubezpieczonej:** `p1_014` PESEL, `p1_015` data urodzenia, `p1_016` dokument, `p1_017` imię, `p1_018` nazwisko.

**Strona 2:**

| Pola | Znaczenie |
|---|---|
| `p2_019`–`p2_024` | adres osoby ubezpieczonej (ulica, dom, lokal, kod, miejscowość, państwo) |
| `p2_025` | rachunek bankowy, `comb(26)` |
| `p2_026`/`p2_027` | zasiłek chorobowy: checkbox i okres |
| `p2_028`/`p2_029` | zasiłek opiekuńczy: checkbox i okres |
| `p2_030`/`p2_031` | zasiłek macierzyński: checkbox i okres |
| `p2_032`/`p2_033` | świadczenie rehabilitacyjne: checkbox i okres |
| `p2_034` | data złożenia wniosku o zasiłek macierzyński, `comb(8)` |
| `p2_035` | stawka procentowa wypłaconego zasiłku macierzyńskiego |
| `p2_036` | dane dziecka/dzieci (multiline) |

**Strona 3:**

| Pola | Znaczenie |
|---|---|
| `p3_037` | dane drugiego rodzica albo członka rodziny (multiline) |
| `p3_038` / `p3_039` | objęty ubezpieczeniem chorobowym: TAK / NIE |
| `p3_040` / `p3_041` | objęty ubezpieczeniem wypadkowym: TAK / NIE |
| `p3_042`–`p3_052` | checkboxy punktów 1–11 („jako członek rolniczej spółdzielni…” itd.), w kolejności jak na formularzu |
| `p3_053` | ubezpieczeniu chorobowemu podlega: data lub okres |
| `p3_054` | ubezpieczeniu wypadkowemu podlega: data lub okres |
| `p3_055` / `p3_056` | pkt 3 „Czy tytuł ubezpieczenia ustał”: TAK / NIE |
| `p3_057` | data ustania tytułu, `comb(8)` |

**Strona 4:**

| Pola | Znaczenie |
|---|---|
| `p4_058`–`p4_060` | pkt 4: choroba zawodowa / wypadek przy pracy / wypadek w drodze |
| `p4_061` / `p4_062` | pkt 4: TAK / NIE |
| `p4_063` | pkt 4: rodzaj dokumentu, numer i data (jeśli TAK) |
| `p4_064`–`p4_069` | pkt 5: sześć checkboxów (urlop bezpłatny, areszt tymczasowy, urlop opiekuńczy, urlop wychowawczy, kara pozbawienia wolności, usprawiedliwiona nieobecność) |
| `p4_070` / `p4_071` | pkt 5: TAK / NIE |
| `p4_072` | pkt 5: okres od–do (jeśli TAK) |
| `p4_073` / `p4_074` | wypłaty, pkt 1: TAK / NIE |
| `p4_075` | wypłaty, pkt 1: okresy i kody literowe (multiline) |
| `p4_076` / `p4_077` | wypłaty, pkt 2 (zasiłek chorobowy): TAK / NIE |
| `p4_078` | wypłaty, pkt 2: okresy i kody (multiline) |
| `p4_079` / `p4_080` | wypłaty, pkt 3 (uposażenie, stypendium itp.): TAK / NIE |
| `p4_081` | wypłaty, pkt 3: okresy i kody (multiline) |
| `p4_082` / `p4_083` | zgłosiłeś do ubezpieczenia chorobowego: do 20 / powyżej 20 ubezpieczonych |

Kolejność checkboxów w pkt 5 (`p4_064`–`p4_069`) odpowiada układowi na formularzu: pierwszy rząd po trzy, drugi rząd po trzy, od lewej do prawej.

**Strona 5:** tabela przychodu (sekcja 4), `p5_144` uwagi (multiline), `p5_145` data wypełnienia, `comb(8)`.

## 4. Tabela przychodu (strona 5)

12 wierszy x 5 kolumn: `p5_{nr}_tab1_r{01..12}_c{1..5}`.

| Kolumna | Znaczenie |
|---|---|
| `c1` | rok |
| `c2` | miesiąc |
| `c3` | liczba dni, które ubezpieczony przepracował |
| `c4` | liczba dni, które był obowiązany przepracować |
| `c5` | podstawa wymiaru składek |

Funkcja pomocnicza budująca indeks po (strona, tabela, wiersz, kolumna):

```python
import json, re
fields = json.load(open("Z-3a_do_druku_formularz_pola.json", encoding="utf-8"))
cell = {}
for f in fields:
    m = re.match(r"p(\d+)_\d+_tab(\d+)_r(\d+)_c(\d+)$", f["name"])
    if m:
        cell[tuple(map(int, m.groups()))] = f["name"]   # (strona, tabela, wiersz, kolumna)

values = {
    cell[(5, 1, 1, 1)]: "2024",
    cell[(5, 1, 1, 2)]: "01",
    cell[(5, 1, 1, 3)]: "20",
    cell[(5, 1, 1, 4)]: "22",
    cell[(5, 1, 1, 5)]: "5000,00",
}
```

Komórki są jednowierszowe (ok. 10–16 pt wysokości), więc bardzo długi tekst się nie zmieści.

## 5. Backend – Python (PyMuPDF)

```bash
pip install pymupdf
```

```python
import pymupdf

SRC = "Z-3a_do_druku_formularz.pdf"
DST = "Z-3a_wypelniony_firma_x.pdf"        # zawsze inna nazwa niż szablon

values = {
    "p1_002_txt_nip": "1234567890",
    "p1_017_txt_imie": "JAN",
    "p1_018_txt_nazwisko": "KOWALSKI",
    "p1_000_chk_pierwszy_wniosek_o_swiadczenie": True,
    "p5_145_txt_data": "01022024",
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
        w.update()            # musi być wewnątrz pętli po page.widgets()
doc.save(DST, garbage=3, deflate=True)
```

`w.update()` poza pętlą daje błąd `Annot is not bound to a page`.

## 6. Node.js / frontend (pdf-lib)

```bash
npm i pdf-lib @pdf-lib/fontkit
```

```js
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs";

const pdf = await PDFDocument.load(fs.readFileSync("Z-3a_do_druku_formularz.pdf"));
pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(fs.readFileSync("DejaVuSans.ttf"), { subset: false });
const form = pdf.getForm();

form.getTextField("p1_002_txt_nip").setText("1234567890");
form.getTextField("p2_036_txt_dane_dziecka_dzieci").setText("JAN KOWALSKI\nur. 01.01.2024, Warszawa");
form.getCheckBox("p3_038_chk_tak").check();     // .uncheck() aby odznaczyć

form.updateFieldAppearances(font);
fs.writeFileSync("Z-3a_wypelniony_firma_x.pdf", await pdf.save());
```

Na froncie zamiast `fs` użyj `fetch(...).then(r => r.arrayBuffer())` i `URL.createObjectURL(new Blob([await pdf.save()], { type: "application/pdf" }))`.

Polskie znaki: domyślna Helvetica w pdf-lib nie obsługuje `ą ć ę ł ń ś ź ż`, więc osadź czcionkę Unicode jak wyżej. PyMuPDF z domyślną czcionką `Helv` może źle pokazać część polskich liter. Jeśli tak się stanie, użyj pdf-lib z osadzoną czcionką.

## 7. Spłaszczenie i dobre praktyki

- Spłaszczenie (wersja do druku, niemodyfikowalna): PyMuPDF `doc.bake()`, pdf-lib `form.flatten()`. Rób to na kopii.
- Szablon traktuj jako tylko do odczytu, wynik zapisuj pod inną nazwą.
- Przy starcie aplikacji porównaj klucze mapy z nazwami w `_pola.json`, żeby wykryć literówki.
- Nieistniejące pole: PyMuPDF je pomija po cichu, pdf-lib rzuca wyjątek.
- Wywołuj `updateFieldAppearances()` przed zapisem. Bez tego Chrome i Edge mogą nie pokazać wpisanych wartości.
- Pola `comb` mogą się nieco różnić w innych czytnikach (np. starszy Acrobat), więc sprawdź wynik na próbce.
