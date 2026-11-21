# MATERIALS - materiały źródłowe

| Materiał | Lokalizacja lokalna | W gicie? | Gdzie pobrać | Opracowanie w repo |
|---|---|---|---|---|
| Pełna treść zadania ZUS (PDF) | `materials/challenge/` | nie | platforma HackNation 2026 (paczka zadania ZUS) | `docs/CHALLENGE.md` |
| Regulamin zadania (PDF) | `materials/challenge/` | nie | j.w. / hacknation.pl | `docs/CHALLENGE.md` § 4, 7 |
| Wyciąg - ustawa zasiłkowa | `materials/legal/` | nie | j.w. („Materiały dla uczestników”) | `zus_rules/` (reguły USTAWA) |
| Wyciąg - Kodeks pracy | `materials/legal/` | nie | j.w. | `zus_rules/` (reguły KP) |
| Rozporządzenie - dokumenty do zasiłków (Dz.U. 2026 poz. 1316) | `materials/legal/` | nie | j.w. | `zus_rules/` (ROZP_DOK) |
| Rozporządzenie - wnioski urlopowe (Dz.U. 2025 poz. 322) | `materials/legal/` | nie | j.w. | `zus_rules/` (ROZP_WN) |
| Załącznik - czas trwania, wysokość, podstawa (DOCX) | `materials/legal/` | nie | j.w. | `zus_rules/03_rules.yaml` meta.parameters, CONF-* w 09 |
| Poradnik dla rodziców ZUS 2026 | `materials/legal/` | nie | j.w. / zus.pl | treści przewodnika (zadanie BA-02) |
| Przykładowe sprawy ZUS | `cases/raw/` | **nigdy** | od mentorów ZUS (pytanie M01) | `cases/fixtures/` (lokalnie), raport `/run-golden` |

## Dlaczego materiałów nie ma w gicie
Repozytorium będzie linkowane w zgłoszeniu (może być publiczne). Zadanie zastrzega, że udostępnionych przez ZUS dokumentów nie wolno kopiować ani rozpowszechniać. Dopóki mentor nie potwierdzi (M02), że wyciągi i treść zadania mogą być publikowane, trzymamy je lokalnie w `materials/` (w `.gitignore`). Wszystko, czego potrzebuje developer, jest opracowane w repo: `docs/CHALLENGE.md` + `zus_rules/`.

## Nowy developer - jak odtworzyć materiały
1. Pobierz paczkę zadania ZUS z platformy HackNation (lub od lidera zespołu).
2. Rozpakuj PDF-y zadania do `materials/challenge/`, „Materiały dla uczestników” do `materials/legal/`.
3. Sprawy ZUS (jeśli dostępne) - tylko role BA/BE-2, do `cases/raw/<id>/`.
