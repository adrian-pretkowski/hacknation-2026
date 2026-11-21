---
description: Zajmij zadanie z docs/TASKS.md — status IN_PROGRESS od razu na origin/main (synchronizacja zespołu)
argument-hint: "<ID zadania> [gałąź robocza]  — np. INT-03 int/INT-03-sim; nowe zadanie: opisz je słowami"
---

Zarezerwuj zadanie `$ARGUMENTS`, zanim zaczniesz nad nim pracę. Skrypt czyta `docs/TASKS.md` z `origin/main` (nie z lokalnej kopii), ustawia `IN_PROGRESS (<rola> · <kto>)`, nadpisuje linię roli w `PROGRESS.md` § 3 i wypycha osobny commit `chore(<ID>): claim …` na `main` — bez przełączania gałęzi i bez ruszania drzewa roboczego. Przy wyścigu sam pobiera `main` ponownie i sprawdza status jeszcze raz.

1. **Zadanie istnieje w TASKS** → `python scripts/claim_task.py <ID> --branch <gałąź>` (gałąź wg konwencji `<rola>/<ID>-<opis>`, np. `int/INT-03-sim`; jeśli nie podano — zaproponuj ją).
2. **Nowe zadanie** → `python scripts/claim_task.py --next <PREFIKS>` (INT, BE1, BE2, FE1, FE2, BA) daje kolejne wolne ID; potem `python scripts/claim_task.py <ID> --new-row "| <ID> | <Owner> | <Prio> | <Zakres / pliki> | <Zależności> | <Kryteria akceptacji> | <Weryfikacja> | TODO |" --branch <gałąź>` (status zostanie nadpisany na IN_PROGRESS).
3. Wynik:
   - kod **0** → zajęte (lub już było twoje). Jeśli jesteś na `main`, skrypt przewinął go do `origin/main`; teraz utwórz gałąź roboczą (`git switch -c <gałąź>`). Na innej gałęzi wykonaj `git merge origin/main`, żeby późniejsza zmiana statusu na DONE nie dała konfliktu.
   - kod **2** → zadanie zajęte przez kogoś innego / DONE / BLOCKED. **Nie zaczynaj pracy.** Pokaż użytkownikowi status i zapytaj, czy wybrać inne zadanie, czy przejąć (`--force` tylko po jego wyraźnej zgodzie i uzgodnieniu z dotychczasowym właścicielem).
   - kod **1** → błąd (brak ID, sieć, brak dostępu do push). Pokaż komunikat; nie obchodź skryptu ręcznym pushem.
4. Wiersze w starym formacie bez nazwiska (`IN_PROGRESS (FE-1)`) skrypt traktuje jako zajęte — prawdziwy właściciel nie musi ich rezerwować ponownie; przejęcie tylko `--force` za zgodą lidera.
5. `--dry-run` pokazuje zmianę bez commitu i pusha. Nie używaj `git push --force`.

Rezerwacja nie zastępuje zamknięcia zadania: status `DONE` / `BLOCKED` i wpis w `PROGRESS.md` § 6 nadal idą w commicie ze zmianą kodu (zasady w `CLAUDE.md`).
