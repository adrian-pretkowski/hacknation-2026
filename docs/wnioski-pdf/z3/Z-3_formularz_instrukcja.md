# Wypełnianie formularza Z-3 z kodu

Pliki:

| Plik | Opis |
|---|---|
| `Z-3_do druku_formularz.pdf` | PDF z polami formularza (AcroForm), 276 pól, strony 1–6 |
| `Z-3_do druku_formularz_pola.json` | Lista pól: nazwa, strona, typ, etykieta, współrzędne |
| `Z-3_do druku.pdf` | Oryginał (bez pól), nie nadpisywać |

Strony 7–9 (pouczenie) nie mają pól.

## 1. Nazwy pól

Pola zwykłe: `p{strona}_{nr}_{typ}_{etykieta}`, np. `p1_002_txt_nip`, `p3_041_chk_tak`.
Komórki tabel (strony 4–5): `p{strona}_{nr}_tab{tabela}_r{wiersz}_c{kolumna}`, np. `p4_080_tab1_r01_c1`.

- `nr` jest unikalny w całym dokumencie. Powtarzające się etykiety (PESEL, TAK, NIE, „za okres”) różnią się numerem.
- Etykiety zwykłych pól są generowane automatycznie z najbliższego tekstu i bywają przybliżone. Pewne źródło prawdy to `_pola.json`:

```json
{ "name": "p1_002_txt_nip", "page": 1, "type": "comb(10)",
  "label_guess": "NIP", "rect": [239.2, 305.0, 417.2, 322.0] }
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

## 3. Ważniejsze pola (mapa)

Nazwy dokładnie takie jak w pliku. Opisy w nawiasach to korekty do etykiet automatycznych.

**Strona 1, dane płatnika składek:** `p1_000_chk_wniosek_pierwszorazowy`, `p1_001_chk_wniosek_o_kontynuacje_swiadczenia`, `p1_002_txt_nip`, `p1_003_txt_regon`, `p1_004_txt_pesel`, `p1_005_…_dokumentu`, `p1_006_…_nazwa_albo_imie_i_nazwisko`, `p1_007_txt_ulica`, `p1_008_txt_numer_domu`, `p1_009_txt_numer_lokalu`, `p1_010_txt_kod_pocztowy`, `p1_011_txt_miejscowosc`, `p1_012_txt_nazwa_panstwa`, `p1_013_txt_numer_telefonu`.

**Strona 1, dane osoby ubezpieczonej:** `p1_014_txt_pesel`, `p1_015_txt_data_urodzenia`, `p1_016_…_dokumentu`, `p1_017_txt_imie`, `p1_018_txt_nazwisko`.

**Strona 2:** adres osoby ubezpieczonej `p2_019`–`p2_024`, rachunek `p2_025_txt_rachunek_bankowy_pracownika`. Potem pary „checkbox + okres”:
`p2_026`/`p2_027` zasiłek chorobowy, `p2_028`/`p2_029` opiekuńczy, `p2_030`/`p2_031` macierzyński, `p2_032`/`p2_033` w wysokości zasiłku macierzyńskiego, `p2_034`/`p2_035` wyrównawczy, `p2_036`/`p2_037` świadczenie rehabilitacyjne.

**Strona 3, informacje o pracowniku** (numery punktów jak na formularzu):

| Punkt | Pola |
|---|---|
| 1. Jest zatrudniony | `p3_038` (okres zatrudnienia), `p3_039` (wymiar czasu pracy), `p3_040` (data od kiedy w tym wymiarze) |
| 2. Umowa terminowa | `p3_041` TAK, `p3_042` NIE |
| 3. Praca za granicą | `p3_043` TAK, `p3_044` NIE |
| 4. Niezdolność z powodu | `p3_045` choroba zawodowa, `p3_046` wypadek przy pracy, `p3_047` wypadek w drodze; `p3_048` TAK, `p3_049` NIE, `p3_050` (rodzaj dokumentu, jeśli TAK) |
| 5. Urlop, areszt itp. | `p3_051`–`p3_056` checkboxy w kolejności na formularzu; `p3_057` TAK, `p3_058` NIE, `p3_059` (okres od–do, jeśli TAK) |
| 6. Uprawnienia do zasiłku | `p3_060` urlop macierzyński, `p3_061` rodzicielski, `p3_062` na warunkach macierzyńskiego, `p3_063` uzupełniający macierzyński, `p3_064` ojcowski, `p3_065` NIE; `p3_066` (data złożenia wniosku i procent) |
| Dane dziecka/dzieci | `p3_067_txt_dane_dziecka_dzieci` (multiline) |
| Dane drugiego rodzica | `p3_068_txt_dane_drugiego_rodzica_albo_czlonka_rodzi…` (multiline) |

**Strona 4:**

| Punkt | Pola |
|---|---|
| 7. Praca u własnego pracodawcy w czasie urlopu rodzicielskiego | `p4_069` TAK, `p4_070` NIE, `p4_071` (okres i wymiar czasu pracy) |
| Informacje o wypłatach, pkt 1 | `p4_072` TAK, `p4_073` NIE, `p4_074` (okresy i kody literowe) |
| Informacje o wypłatach, pkt 2 | `p4_075` TAK, `p4_076` NIE, `p4_077` (okresy i kody) |
| Zgłosiłeś do ubezpieczenia chorobowego | `p4_078` do 20 ubezpieczonych, `p4_079` powyżej 20 |

**Strona 5, punkt 5 (umowa zlecenia/agencyjna):** `p5_271` TAK, `p5_272` NIE, `p5_273` (data, do której zawarto umowę, i kwota; multiline).

**Strona 6:** `p6_274_txt_uwagi` (multiline), `p6_275_txt_data` (data wypełnienia, `comb(8)`).

## 4. Tabele składników wynagrodzenia (strony 4–5)

Nazwa: `p{strona}_{nr}_tab{tabela}_r{wiersz}_c{kolumna}`. Wiersze i kolumny liczone od 1. Kolumny odpowiadają numerom w wierszu „1 2 3…” pod nagłówkiem tabeli.

| Strona | Tabela | Wiersze | Kolumny |
|---|---|---|---|
| 4 | `tab1` – okresy miesięczne | 12 | 9: rok, miesiąc, dni przepracowane, dni obowiązkowe, przyczyna nieprzepracowania całego miesiąca, stałe wynagrodzenie, wynagrodzenie zasadnicze i inne, premie i inne, procent potrąconej składki |
| 5 | `tab1` – okresy kwartalne | 5 | 7: rok, kwartał, kwota, dni przepracowane, dni obowiązkowe, przyczyna nieprzepracowania całego kwartału, procent potrąconej składki |
| 5 | `tab2` – okresy roczne | 4 | 6: rok, kwota, dni przepracowane, dni obowiązkowe, przyczyna nieprzepracowania całego roku, procent |
| 5 | `tab3` – inne okresy | 4 | 6: okres, kwota, dni przepracowane, dni obowiązkowe, przyczyna nieprzepracowania danego okresu, procent |

Uwaga: numeracja tabel jest osobna dla każdej strony (`tab1` jest na stronach 4 i 5), ale z numerem strony i numerem `nr` w nazwie jest jednoznaczna.

Najwygodniej wypełniać tabele po (strona, tabela, wiersz, kolumna), nie po pełnej nazwie. Funkcja pomocnicza, która buduje indeks z `_pola.json`:

```python
import json, re
fields = json.load(open("Z-3_do druku_formularz_pola.json", encoding="utf-8"))
cell = {}
for f in fields:
    m = re.match(r"p(\d+)_\d+_tab(\d+)_r(\d+)_c(\d+)$", f["name"])
    if m:
        cell[tuple(map(int, m.groups()))] = f["name"]   # (strona, tabela, wiersz, kolumna)

# przykład: rok 2024, styczeń, 20 dni z 22 – pierwszy wiersz tabeli miesięcznej
values = {
    cell[(4, 1, 1, 1)]: "2024",
    cell[(4, 1, 1, 2)]: "01",
    cell[(4, 1, 1, 3)]: "20",
    cell[(4, 1, 1, 4)]: "22",
}
```

Komórki tabel mają jedną linię tekstu, długie opisy w kolumnie „przyczyna nieprzepracowania” mogą się nie zmieścić (pole ma około 10–16 pt wysokości).

## 5. Backend – Python (PyMuPDF)

```bash
pip install pymupdf
```

```python
import pymupdf

SRC = "Z-3_do druku_formularz.pdf"
DST = "Z-3_wypelniony_firma_x.pdf"        # zawsze inna nazwa niż szablon

values = {
    "p1_002_txt_nip": "1234567890",
    "p1_017_txt_imie": "JAN",
    "p1_018_txt_nazwisko": "KOWALSKI",
    "p1_000_chk_wniosek_pierwszorazowy": True,
    "p6_275_txt_data": "01022024",
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

const pdf = await PDFDocument.load(fs.readFileSync("Z-3_do druku_formularz.pdf"));
pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(fs.readFileSync("DejaVuSans.ttf"), { subset: false });
const form = pdf.getForm();

form.getTextField("p1_002_txt_nip").setText("1234567890");
form.getTextField("p3_067_txt_dane_dziecka_dzieci").setText("JAN KOWALSKI\nur. 01.01.2024, Warszawa");
form.getCheckBox("p3_041_chk_tak").check();     // .uncheck() aby odznaczyć

form.updateFieldAppearances(font);
fs.writeFileSync("Z-3_wypelniony_firma_x.pdf", await pdf.save());
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
