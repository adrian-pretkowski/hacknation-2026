---
description: Review gałęzi względem main (subagent reviewer); przy pozytywnym wyniku pyta o PR, merge do main i push
argument-hint: "[gałąź — domyślnie bieżąca]"
---

Przeprowadź review gałęzi `$ARGUMENTS` (pusto = bieżąca gałąź) względem `main`. Decyzje o PR, merge i push należą do człowieka (lidera) — **bez jego odpowiedzi w tym kroku nie twórz PR, nie scalaj i nie pushuj**. Nigdy nie używaj `--force`, `reset --hard`, nie usuwaj gałęzi.

## 1. Przygotowanie
1. `git branch --show-current`, `git status --short`. Jeśli bieżąca gałąź to `main` i nie podano innej — zatrzymaj się: „Review dotyczy gałęzi roboczej; commity na main nie są reviewowane”.
2. Jeśli podano gałąź inną niż bieżąca — **nie przełączaj gałęzi**: utwórz tymczasowy worktree `git worktree add ../_review-<gałąź> <gałąź>` i tam prowadź review (Python z `backend/.venv` repo głównego). Usuń worktree po zakończeniu (`git worktree remove ../_review-<gałąź>`).
3. Niezacommitowane zmiany w drzewie → poinformuj, że review obejmuje tylko commity.
4. Zbierz: `git merge-base main HEAD`, `git log --oneline main..HEAD`, `git diff --stat main...HEAD`. Brak commitów względem main → koniec („nic do review”).

## 2. Review
Uruchom subagenta **reviewer** z promptem zawierającym: ścieżkę katalogu repo (lub worktree), nazwę gałęzi, merge-base, listę commitów i diff --stat. Poczekaj na raport.

Pokaż użytkownikowi raport w całości (tabela kontroli, problemy, werdykt). Zapisz wynik dla zrecenzowanej gałęzi (działa też przy review przez worktree): `python .claude/hooks/review_trigger.py mark <READY_TO_MERGE|CHANGES_REQUIRED> <gałąź>`.

## 3a. Werdykt CHANGES_REQUIRED
Wypisz listę poprawek od najważniejszych. Nie proponuj PR ani merge. Koniec.

## 3b. Werdykt READY_TO_MERGE
Sprawdź możliwości: `git remote get-url origin` (jest zdalne repo?), `gh auth status` (jest GitHub CLI?). Następnie zadaj **jedno** pytanie narzędziem AskUserQuestion z dwoma pytaniami:
- „Review gałęzi `<gałąź>` przeszło. Czy utworzyć pull request i scalić do main?” — opcje:
  - „PR + merge do main (Recommended)” — opis: z `gh`: push gałęzi, `gh pr create`, `gh pr merge --merge`; bez `gh`: push gałęzi + link do PR, potem lokalny `git merge --no-ff` do main.
  - „Tylko PR, bez merge” — opis: push gałęzi i PR (albo link do jego utworzenia) do review zespołu.
  - „Nie teraz” — opis: nic nie zmieniam.
- „Czy po scaleniu wypchnąć main do origin?” — opcje: „Tak, push main” (opis: `git push origin main`, bez force) / „Nie, zostaw lokalnie”.

## 4. Wykonanie — tylko to, co wybrano
0. **Warunek wstępny merge:** jeśli wybrano merge, a `git status --short` w głównym checkoutcie nie jest pusty — zatrzymaj się przed `git switch main`, wypisz niezacommitowane pliki i poproś o commit lub odłożenie zmian. Nie używaj `git stash` bez zgody.
1. **PR:** `git push -u origin <gałąź>`. Z `gh`: `gh pr create --base main --head <gałąź> --title "<temat pierwszego commita>" --body "<streszczenie raportu: werdykt, tabela kontroli skrócona, zmienione obszary>\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"`. Bez `gh`: podaj link `https://github.com/<owner>/<repo>/compare/main...<gałąź>?expand=1` (owner/repo z `git remote get-url origin`).
2. **Merge do main:**
   - z `gh` i PR: `gh pr merge <numer> --merge`, potem `git switch main` i `git pull --ff-only origin main`;
   - bez `gh`: `git switch main`, `git pull --ff-only origin main` (jeśli jest origin), `git merge --no-ff <gałąź> -m "Merge <gałąź>: <ID zadania>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
   - Konflikt → `git merge --abort`, wróć na `<gałąź>`, zgłoś pliki w konflikcie i zakończ (bez pusha).
3. **Weryfikacja po merge (na main):** `backend/.venv/Scripts/python zus_rules/tools/build_catalog.py` oraz w `backend/`: `python -m pytest -p no:warnings -o addopts=""`. Niepowodzenie → nie pushuj, zgłoś wynik (merge zostaje lokalnie, decyzja o cofnięciu należy do lidera).
4. **Push main** (tylko jeśli wybrano i weryfikacja przeszła): `git push origin main`. Odrzucony push (main zdalny się zmienił) → zgłoś, nie używaj force.
5. Wróć na gałąź roboczą, jeśli dalej będzie potrzebna (`git switch <gałąź>`) — chyba że użytkownik woli zostać na main.

## 5. Podsumowanie
Napisz: werdykt, co wykonano (PR link/numer, hash merge, czy main wypchnięty), co zostało po stronie właściciela zadania (zmiana statusu w `docs/TASKS.md` na DONE i wpis w `PROGRESS.md`, jeśli merge zamyka zadanie — to robi właściciel zadania w swoim następnym commicie).
