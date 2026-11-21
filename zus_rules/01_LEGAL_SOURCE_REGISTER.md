# 01 — LEGAL SOURCE REGISTER

Data referencyjna oceny: **2026-11-21**. Kody dokumentów są używane w `03_rules.yaml` (`source_document`).

## 1. Źródła załączone

| Kod | Akt | Oznaczenie | Charakter | Status na 2026-11-21 | Zakres wyciągu | Ograniczenia wyciągu |
|---|---|---|---|---|---|---|
| `USTAWA` | Ustawa z 25.06.1999 o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa | t.j. Dz.U. 2026 poz. 854 (KP powołuje „poz. 854 i 1123”) | Akt prawny — **źródło nadrzędne** | Obowiązuje; część zmian **przyszłych** (niżej) | art. 1–22, 29–31, 36–58a (z lukami „(…)”), 61–67 | **Brak art. 23–28** (m.in. zasiłek wyrównawczy), **art. 32–35** (zasiłek opiekuńczy, w tym art. 32a), art. 59–60 (kontrola zwolnień). Treść nowelizacji poz. 1123 — nieznana |
| `KP` | Kodeks pracy | t.j. Dz.U. 2026 poz. 1245 | Akt prawny | Obowiązuje | art. 1–3, 92, 175(1), 177, 180–183(1), 184–186(4), 186(8a), 189(1) | Brak m.in. art. 45, 47, 57, 63(2), 163, 165, 166, 173(1), 186 (do których KP odsyła „odpowiednio”) |
| `ROZP_DOK` | Rozporządzenie MRPiPS z 27.09.2026 w sprawie zakresu informacji o okolicznościach mających wpływ na prawo do zasiłków … oraz dokumentów niezbędnych do przyznania i wypłaty zasiłków | Dz.U. 2026 poz. 1316 | Akt wykonawczy (art. 61b ust. 6 USTAWY) | Wchodzi w życie **14 dni od ogłoszenia** — data ogłoszenia nie wynika z materiałów → **UNCONFIRMED**; przyjęto, że obowiązuje (spójne z informacją zadania o zmianie formularzy od 24.10.2026). **§ 39 — 12 miesięcy od ogłoszenia (FUTURE)** | § 1–43, zał. 1–7 (zał. 5–7 częściowo) | Uchyla rozporządzenie z 8.12.2015 (§ 42). Określa **zakres danych**, nie symbole formularzy (Z-3, ZAM itd.) |
| `ROZP_WN` | Rozporządzenie MRPiPS z 11.03.2025 w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem oraz dokumentów dołączanych | Dz.U. 2025 poz. 322 | Akt wykonawczy (art. 186(8a) KP) | Przyjęto: obowiązuje (data wejścia w życie nie w wyciągu) | § 1–22 | Dotyczy wyłącznie **pracowników** i wniosków do pracodawcy |
| `ZALACZNIK` | Załącznik HackNation: maksymalny czas trwania zasiłków, wysokość, podstawa wymiaru | — | **Materiał pomocniczy, NIE akt prawny** | n/d | Tabele wymiarów, stawek, zasad podstawy | Upraszcza przepisy (CONF-002/003/006); zapowiedziana tabela minimalnych podstaw 2026 **jest pusta** (GAP-022) |
| — | Pełna treść zadania ZUS | — | **Zakres produktu**, nie źródło prawa | n/d | Pkt a–j, symulacje, ryzyka H | Jedna rozbieżność z ustawą (CONF-001) |

## 2. Zmiany w czasie (wg przypisów)

| Przepis | Zmiana | Akt zmieniający | Wejście w życie | Status 2026-11-21 | Reguła |
|---|---|---|---|---|---|
| USTAWA art. 9 ust. 4 | jeden okres zasiłkowy niezależnie od liczby tytułów | ustawa 18.12.2025, Dz.U. 2026 poz. 26 | **2027-01-01** | NIE obowiązuje | SICK-DUR-005 (FUTURE) |
| USTAWA art. 17 ust. 1d–1e | możliwość niewystawienia zwolnienia z jednego tytułu | j.w. | **2027-01-01** | NIE obowiązuje | notatka w SICK-EXCL-007 |
| USTAWA art. 61b ust. 1, 2, 2a, 4, 5a, 5b | tryb wszczęcia postępowania, formy wniosku | ustawa 13.02.2026, Dz.U. 2026 poz. 441 | 2026-07-01 | Obowiązuje | SICK-DOC-001, APP-DOC-003, SICK-DL-001 |
| ROZP_DOK § 39 | zaświadczenia na „zwykłym druku” także elektronicznie | ROZP_DOK § 43 | 12 mies. od ogłoszenia | NIE obowiązuje (data do potwierdzenia) | APP-DOC-001 (uwaga) |
| Formularze ZUR, ZAO, Z-3b | połączenie z ZAM / likwidacja | wg treści zadania | 2026-10-24 | Obowiązuje (źródło: zadanie) | APP-DOC-003 |

## 3. Przepisy, do których źródła odsyłają, a których NIE załączono (wymagają innych źródeł)

| Odesłanie | Gdzie | Potrzebne do | Skutek w MVP |
|---|---|---|---|
| Ustawa o systemie ubezpieczeń społecznych (art. 6, 18 ust. 8, 19, 47a) | USTAWA art. 1, 2a, 3, 48a, 49, ROZP_DOK | najniższa podstawa składek, limit dobrowolnego chorobowego, katalog tytułów | Wartości jako **wejście/parametr** (GAP-023); limit 23 550 zł z ZALACZNIK — potwierdzony (M08); najniższa podstawa JDG 2026: 5652 zł, preferencyjna 1441,80 zł (24 mies.) — mentor (M08) |
| Ustawa o minimalnym wynagrodzeniu + akt ustalający kwotę na 2026 | USTAWA art. 2a, 45 | próg zadłużenia, minimalna podstawa | 4 806 zł z ZALACZNIK — potwierdzone przez mentora (M07) |
| Ustawa o świadczeniach rodzinnych (świadczenie rodzicielskie) | USTAWA art. 31 ust. 3a | podwyższenie zasiłku | Kwota 1000 zł — mentor fachowy (M10, 2026-11-21) → RATE-MAT-007 ACTIVE; niepełny miesiąc — M10c (GAP-002) |
| Ustawa „Za życiem” art. 4 ust. 3 | KP 182(1a) § 2, USTAWA 61b ust. 4a | definicja zaświadczenia | Wejście bool od użytkownika |
| Przeciętne wynagrodzenie (komunikaty) | USTAWA art. 46, 19 ust. 2 | max podstawa po ustaniu, waloryzacja | BLOCKED (GAP-002, GAP-009) |
| USTAWA art. 29 ust. 5 — definicja „członka najbliższej rodziny” (pełna) | KP 175(1) | uprawnieni do przejęcia | Rola wejściowa bez weryfikacji (GAP-013) |
| KP art. 45, 47, 57, 163, 165, 166, 63(2), 173(1), 186 | odesłania „stosuje się odpowiednio” | przywrócenie do pracy, urlopy wypoczynkowe itd. | Bez wpływu na zasiłek — poza zakresem |
| Ustawa o emeryturach i rentach z FUS (art. 134–135) | USTAWA art. 66 | wstrzymanie wypłaty | Poza zakresem |
| Kodeks cywilny / KPA — liczenie terminów | wszystkie terminy | dzień wolny jako ostatni dzień terminu | GAP-020 |

## 4. Zasady użycia źródeł w katalogu

1. Każda reguła wskazuje dokument, jednostkę redakcyjną i fragment (`source_excerpt`).
2. `ZALACZNIK` jest źródłem **wyłącznie** dla: parametrów liczbowych spoza wyciągów (UNCONFIRMED) i reguł ostrzegawczych RISK-001/002 (z treści zadania) — zawsze z `confidence ≤ MEDIUM`.
3. Przy rozbieżności Załącznika/zadania z ustawą stosujemy ustawę i odnotowujemy konflikt (09).
