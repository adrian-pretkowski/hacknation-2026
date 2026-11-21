# Wypełnianie formularza ZAS-53 z kodu

Pliki:

| Plik | Opis |
|---|---|
| `ZAS-53_do druku_formularz.pdf` | PDF z polami formularza (AcroForm), 31 pól, strony 1–2 |
| `ZAS-53_do druku_formularz_pola.json` | Lista pól: nazwa, strona, typ, etykieta, współrzędne |
| `ZAS-53_do druku.pdf` | Oryginał (bez pól), nie nadpisywać |

Strony 3–4 (pouczenie) nie mają pól. Formularz nie ma tabel.

## 1. Nazwy pól

Format: `p{strona}_{nr}_{typ}_{etykieta}`, np. `p1_012_txt_nip`, `p2_025_chk_tak`.

- `nr` jest unikalny w całym dokumencie. Powtarzające się etykiety (PESEL, TAK, NIE, data) różnią się numerem.
- Etykiety są generowane automatycznie z najbliższego tekstu i bywają przybliżone. Pewne źródło prawdy to `_pola.json`:

```json
{ "name": "p1_012_txt_nip", "page": 1, "type": "comb(10)",
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

Nazwy skrótowo (numer pola). Pełna nazwa to `p{strona}_{nr}_…` z pliku JSON.

**Strona 1, twoje dane:** `p1_000` PESEL, `p1_001` data urodzenia, `p1_002` rodzaj/seria/numer dokumentu, `p1_003` imię, `p1_004` nazwisko, `p1_005` ulica, `p1_006` numer domu, `p1_007` numer lokalu, `p1_008` kod pocztowy, `p1_009` miejscowość, `p1_010` nazwa państwa, `p1_011` telefon.

**Strona 1, dane płatnika składek:** `p1_012` NIP, `p1_013` REGON, `p1_014` PESEL, `p1_015` dokument, `p1_016` nazwa albo imię i nazwisko.

**Strona 2:**

| Pola | Znaczenie |
|---|---|
| `p2_017` | rachunek bankowy, `comb(26)` |
| `p2_018` | okres (od–do), a jeśli znasz, seria i numer zaświadczenia lekarskiego (multiline) |
| `p2_019` | niezdolność w okresie ubezpieczenia chorobowego/wypadkowego (checkbox) |
| `p2_020` | niezdolność po ustaniu tytułu ubezpieczenia (checkbox) |
| `p2_021` | data ustania tytułu ubezpieczenia, `comb(8)` |
| `p2_022` / `p2_023` / `p2_024` | choroba zawodowa / wypadek przy pracy / wypadek w drodze do pracy lub z pracy |
| `p2_025` / `p2_026` | niezdolność z powodu choroby zawodowej lub wypadku: TAK / NIE |
| `p2_027` | rodzaj dokumentu (decyzja / protokół / karta wypadku), numer i data (jeśli TAK) |
| `p2_028` / `p2_029` | marynarz, wynagrodzenie za pracę na morzu (art. 75 pkt 2): TAK / NIE |
| `p2_030` | data wypełnienia, `comb(8)` |

## 4. Backend – Python (PyMuPDF)

```bash
pip install pymupdf
```

```python
import pymupdf

SRC = "ZAS-53_do druku_formularz.pdf"
DST = "ZAS-53_wypelniony_jan_kowalski.pdf"   # zawsze inna nazwa niż szablon

values = {
    "p1_000_txt_pesel": "80010112345",
    "p1_003_txt_imie": "JAN",
    "p1_004_txt_nazwisko": "KOWALSKI",
    "p2_018_txt_skladam_wniosek_o_przyznanie_zasilku_cho": "01.03.2024 - 15.03.2024",
    "p2_019_chk_w_okresie_ubezpieczenia_chorobowego_wypa": True,
    "p2_030_txt_data": "01022024",
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

`w.update()` poza pętlą daje błąd `Annot is not bound to a page`. Pełna nazwa pola `p2_018…` i `p2_019…` jest dłuższa niż w skrócie z mapy, więc kopiuj ją z `_pola.json`.

## 5. Node.js / frontend (pdf-lib)

```bash
npm i pdf-lib @pdf-lib/fontkit
```

```js
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs";

const pdf = await PDFDocument.load(fs.readFileSync("ZAS-53_do druku_formularz.pdf"));
pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(fs.readFileSync("DejaVuSans.ttf"), { subset: false });
const form = pdf.getForm();

form.getTextField("p1_000_txt_pesel").setText("80010112345");
form.getTextField("p1_003_txt_imie").setText("JAN");
form.getCheckBox("p2_025_chk_tak").check();     // .uncheck() aby odznaczyć

form.updateFieldAppearances(font);
fs.writeFileSync("ZAS-53_wypelniony_jan_kowalski.pdf", await pdf.save());
```

Na froncie zamiast `fs` użyj `fetch(...).then(r => r.arrayBuffer())` i `URL.createObjectURL(new Blob([await pdf.save()], { type: "application/pdf" }))`.

Polskie znaki: domyślna Helvetica w pdf-lib nie obsługuje `ą ć ę ł ń ś ź ż`, więc osadź czcionkę Unicode jak wyżej. PyMuPDF z domyślną czcionką `Helv` może źle pokazać część polskich liter. Jeśli tak się stanie, użyj pdf-lib z osadzoną czcionką.

## 6. Spłaszczenie i dobre praktyki

- Spłaszczenie (wersja do druku, niemodyfikowalna): PyMuPDF `doc.bake()`, pdf-lib `form.flatten()`. Rób to na kopii.
- Szablon traktuj jako tylko do odczytu, wynik zapisuj pod inną nazwą.
- Przy starcie aplikacji porównaj klucze mapy z nazwami w `_pola.json`, żeby wykryć literówki.
- Nieistniejące pole: PyMuPDF je pomija po cichu, pdf-lib rzuca wyjątek.
- Wywołuj `updateFieldAppearances()` przed zapisem. Bez tego Chrome i Edge mogą nie pokazać wpisanych wartości.
- Pola `comb` mogą się nieco różnić w innych czytnikach (np. starszy Acrobat), więc sprawdź wynik na próbce.
