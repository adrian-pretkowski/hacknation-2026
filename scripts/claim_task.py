"""Rezerwacja zadania z docs/TASKS.md - od razu na origin/main, żeby inni widzieli, że jest zajęte.

Użycie (z katalogu repo, dowolna gałąź, brudne drzewo nie przeszkadza):
    python scripts/claim_task.py INT-10                      # zajmij istniejące zadanie
    python scripts/claim_task.py INT-11 --new-row "| INT-11 | INT | P0 | ... | TODO |"
    python scripts/claim_task.py --next INT                  # podaj kolejne wolne ID roli
    python scripts/claim_task.py BE2-05 --dry-run            # pokaż zmianę, nic nie wysyłaj

Co robi:
1. `git fetch origin main` i czyta docs/TASKS.md (oraz PROGRESS.md) z origin/main - nie z lokalnej kopii.
2. Sprawdza status wiersza: TODO → zajmuje; IN_PROGRESS u kogoś innego, DONE, BLOCKED → odmawia (kod 2)
   bez `--force`; IN_PROGRESS już u ciebie → nic nie robi (kod 0).
3. Ustawia `IN_PROGRESS (<rola> · <kto>)` i nadpisuje linię roli w PROGRESS.md § 3 (bez `--no-progress`).
4. Tworzy commit `chore(<ID>): claim …` bezpośrednio na origin/main (plumbing: commit-tree, bez checkoutu
   i bez ruszania twojej gałęzi ani drzewa roboczego) i wypycha go. Przy wyścigu (ktoś wypchnął w międzyczasie)
   pobiera main od nowa, sprawdza status jeszcze raz i ponawia (do 5 prób).
5. Jeśli jesteś na `main` - przewija go fast-forward do origin/main; na innej gałęzi podaje, co zrobić.

Commit rezerwacji nie przechodzi przez /review (dotyczy tylko statusu w TASKS/PROGRESS).
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import subprocess
import sys
import tempfile
import time

REMOTE = "origin"
BRANCH = "main"
TASKS = "docs/TASKS.md"
PROGRESS = "PROGRESS.md"
ROLES = {"INT": "INT", "BE1": "BE-1", "BE2": "BE-2", "FE1": "FE-1", "FE2": "FE-2", "BA": "BA"}
ID_RE = re.compile(r"^(INT|BE1|BE2|FE1|FE2|BA)-(\d{2,})$")
CELL_SPLIT = re.compile(r"(?<!\\)\|")
MAX_ATTEMPTS = 5

EXIT_OK, EXIT_ERROR, EXIT_TAKEN = 0, 1, 2


class ClaimError(Exception):
    pass


class Taken(Exception):
    pass


def git(*args: str, input_bytes: bytes | None = None, env: dict | None = None, check: bool = True) -> subprocess.CompletedProcess:
    proc = subprocess.run(["git", *args], input=input_bytes, capture_output=True, env=env, check=False)
    if check and proc.returncode != 0:
        raise ClaimError(f"git {' '.join(args)}: {proc.stderr.decode('utf-8', 'replace').strip()}")
    return proc


def out(*args: str) -> str:
    return git(*args).stdout.decode("utf-8").strip()


def cells(line: str) -> list[str]:
    """Komórki wiersza tabeli markdown (bez pustych skrajnych); `\\|` nie dzieli komórki."""
    parts = CELL_SPLIT.split(line.strip())
    return [p.strip() for p in parts[1:-1]]


def join_cells(values: list[str]) -> str:
    return "| " + " | ".join(values) + " |"


def find_row(lines: list[str], task_id: str) -> int | None:
    for i, line in enumerate(lines):
        if line.startswith("|") and cells(line)[:1] == [task_id]:
            return i
    return None


def tasks_table_end(lines: list[str]) -> int:
    """Indeks po ostatnim wierszu tabeli w sekcji '## Zadania'."""
    try:
        start = next(i for i, line in enumerate(lines) if line.startswith("## Zadania"))
    except StopIteration as exc:
        raise ClaimError(f"{TASKS}: brak sekcji '## Zadania'") from exc
    i = start + 1
    while i < len(lines) and not lines[i].startswith("|"):
        i += 1
    if i == len(lines):
        raise ClaimError(f"{TASKS}: brak tabeli w sekcji '## Zadania'")
    while i < len(lines) and lines[i].startswith("|"):
        i += 1
    return i


def next_id(text: str, prefix: str) -> str:
    numbers = [int(m.group(2)) for line in text.splitlines() if line.startswith("|")
               for m in [ID_RE.match((cells(line) or [""])[0])] if m and m.group(1) == prefix]
    return f"{prefix}-{(max(numbers) + 1 if numbers else 1):02d}"


def classify(status: str, who: str) -> str:
    """'free' | 'mine' | 'taken' | 'done' | 'blocked'."""
    s = status.strip()
    if s.startswith("IN_PROGRESS"):
        m = re.match(r"IN_PROGRESS\s*\(([^)]*)\)", s)
        holder = m.group(1) if m else ""
        name = holder.split("·", 1)[1].strip() if "·" in holder else ""
        return "mine" if who and name.lower() == who.strip().lower() else "taken"
    if s.startswith("DONE"):
        return "done"
    if s.startswith("BLOCKED"):
        return "blocked"
    return "free"


def claim_tasks(text: str, task_id: str, status: str, who: str, new_row: str | None, force: bool) -> tuple[str, str]:
    """Zwraca (nowy tekst TASKS, stan sprzed zmiany)."""
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(nl)
    idx = find_row(lines, task_id)
    if new_row is not None:
        if idx is not None:
            raise ClaimError(f"{task_id} już jest w {TASKS} - zajmij je bez --new-row")
        row = cells(new_row)
        if len(row) < 2 or row[0] != task_id:
            raise ClaimError(f"--new-row musi być wierszem tabeli zaczynającym się od '| {task_id} |'")
        row[-1] = status
        lines.insert(tasks_table_end(lines), join_cells(row))
        return nl.join(lines), "new"
    if idx is None:
        raise ClaimError(f"Brak zadania {task_id} w {TASKS} na {REMOTE}/{BRANCH}. Dodaj je: --new-row \"| {task_id} | ... |\" "
                         f"(kolejne wolne ID: python scripts/claim_task.py --next <PREFIKS>)")
    row = cells(lines[idx])
    state = classify(row[-1], who)
    if state == "mine":
        return text, state
    if state in ("taken", "done", "blocked") and not force:
        raise Taken(f"{task_id} ma status: {row[-1]}")
    row[-1] = status
    lines[idx] = join_cells(row)
    return nl.join(lines), state


def claim_progress(text: str, role: str, task_id: str, branch: str, today: str) -> str:
    """Nadpisuje linię roli w PROGRESS.md § 3 (kolumny: Rola | Zadanie | Gałąź | Od | Uwagi)."""
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(nl)
    try:
        start = next(i for i, line in enumerate(lines) if line.startswith("## 3."))
    except StopIteration:
        return text
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("## "):
            break
        if lines[i].startswith("|"):
            row = cells(lines[i])
            if row and row[0] == role and len(row) >= 4:
                row[1] = f"{task_id} IN_PROGRESS"
                row[2] = f"`{branch}`" if branch else "-"
                row[3] = today
                lines[i] = join_cells(row)
                break
    return nl.join(lines)


def show(rev: str, path: str) -> str:
    return git("show", f"{rev}:{path}").stdout.decode("utf-8")


def make_commit(base: str, files: dict[str, str], message: str) -> str:
    """Commit z rodzicem `base` zmieniający `files` - przez tymczasowy indeks, bez checkoutu."""
    fd, index_path = tempfile.mkstemp(prefix="claim-index-")
    os.close(fd)
    os.unlink(index_path)
    env = {**os.environ, "GIT_INDEX_FILE": index_path}
    try:
        git("read-tree", base, env=env)
        for path, content in files.items():
            blob = git("hash-object", "-w", "--stdin", input_bytes=content.encode("utf-8")).stdout.decode().strip()
            git("update-index", "--add", "--cacheinfo", f"100644,{blob},{path}", env=env)
        tree = git("write-tree", env=env).stdout.decode().strip()
        return git("commit-tree", tree, "-p", base, "-m", message).stdout.decode().strip()
    finally:
        if os.path.exists(index_path):
            os.unlink(index_path)


def sync_local(task_id: str) -> None:
    current = out("branch", "--show-current")
    if current != BRANCH:
        print(f"Jesteś na '{current or '(odłączony HEAD)'}'. Zalecane: zajmuj zadanie przed utworzeniem gałęzi, "
              f"albo teraz `git merge {REMOTE}/{BRANCH}` - wtedy zmiana statusu {task_id} na DONE nie da konfliktu.")
        return
    if git("merge-base", "--is-ancestor", "HEAD", f"{REMOTE}/{BRANCH}", check=False).returncode != 0:
        print(f"Lokalny {BRANCH} ma własne commity - wykonaj `git pull --rebase {REMOTE} {BRANCH}`.")
        return
    dirty = out("status", "--porcelain", "--", TASKS, PROGRESS)
    if dirty:
        print(f"Masz lokalne zmiany w {TASKS}/{PROGRESS} - przewiń ręcznie: `git pull --rebase {REMOTE} {BRANCH}`.")
        return
    proc = git("merge", "--ff-only", "-q", f"{REMOTE}/{BRANCH}", check=False)
    if proc.returncode == 0:
        print(f"Lokalny {BRANCH} przewinięty do {REMOTE}/{BRANCH}.")
    else:
        print(f"Nie udało się przewinąć {BRANCH}: {proc.stderr.decode('utf-8', 'replace').strip()} - "
              f"wykonaj `git pull --rebase {REMOTE} {BRANCH}`.")


def run(args: argparse.Namespace) -> int:
    os.chdir(out("rev-parse", "--show-toplevel"))
    if args.next:
        prefix = args.next.upper().replace("-", "")
        if prefix not in ROLES:
            raise ClaimError(f"Nieznany prefiks '{args.next}' (dozwolone: {', '.join(ROLES)})")
        git("fetch", "-q", REMOTE, BRANCH)
        print(next_id(show(f"{REMOTE}/{BRANCH}", TASKS), prefix))
        return EXIT_OK

    task_id = (args.task_id or "").upper()
    m = ID_RE.match(task_id)
    if not m:
        raise ClaimError(f"Niepoprawne ID zadania '{args.task_id}' (np. INT-10, BE2-05, FE1-02, BA-03)")
    role = args.role or ROLES[m.group(1)]
    who = args.who or git("config", "user.name", check=False).stdout.decode("utf-8").strip()
    if not who:
        raise ClaimError("nieznane 'kto' - ustaw `git config user.name` albo podaj --who")
    status = f"IN_PROGRESS ({role} · {who})"
    branch = args.branch or ""
    today = dt.date.today().isoformat()

    for attempt in range(1, MAX_ATTEMPTS + 1):
        git("fetch", "-q", REMOTE, BRANCH)
        base = out("rev-parse", f"{REMOTE}/{BRANCH}")
        tasks_new, state = claim_tasks(show(base, TASKS), task_id, status, who, args.new_row, args.force)
        if state == "mine":
            print(f"{task_id} jest już zajęte przez ciebie ({who}) na {REMOTE}/{BRANCH} - nic do zrobienia.")
            return EXIT_OK
        if state in ("taken", "done", "blocked"):
            print(f"UWAGA: nadpisuję status {task_id} (--force).")
        files = {TASKS: tasks_new}
        if not args.no_progress:
            progress_old = show(base, PROGRESS)
            progress_new = claim_progress(progress_old, role, task_id, branch, today)
            if progress_new != progress_old:
                files[PROGRESS] = progress_new
        if args.dry_run:
            print(f"[dry-run] {task_id} → {status} (baza {base[:7]}); pliki: {', '.join(files)}")
            for line in tasks_new.splitlines():
                if line.startswith(f"| {task_id} |"):
                    print(line)
            return EXIT_OK
        sha = make_commit(base, files, f"chore({task_id}): claim - {status}")
        proc = git("push", "-q", REMOTE, f"{sha}:refs/heads/{BRANCH}", check=False)
        if proc.returncode == 0:
            git("fetch", "-q", REMOTE, BRANCH)
            print(f"Zajęte: {task_id} → {status} (commit {sha[:7]} na {REMOTE}/{BRANCH}).")
            sync_local(task_id)
            return EXIT_OK
        err = proc.stderr.decode("utf-8", "replace").strip()
        if not any(k in err for k in ("rejected", "fetch first", "non-fast-forward")):
            raise ClaimError(f"push nieudany (to nie wyścig - sprawdź dostęp/sieć): {err}")
        if attempt == MAX_ATTEMPTS:
            raise ClaimError(f"push nieudany po {MAX_ATTEMPTS} próbach: {err}")
        print(f"Push odrzucony (próba {attempt}/{MAX_ATTEMPTS}) - pobieram {BRANCH} ponownie i sprawdzam status.", file=sys.stderr)
        time.sleep(min(2 ** attempt, 16) * 0.5)
    return EXIT_ERROR


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    p = argparse.ArgumentParser(description="Zajmij zadanie z docs/TASKS.md i wypchnij status na origin/main.")
    p.add_argument("task_id", nargs="?", help="ID zadania, np. INT-10")
    p.add_argument("--next", metavar="PREFIKS", help="wypisz kolejne wolne ID roli (INT, BE1, BE2, FE1, FE2, BA)")
    p.add_argument("--new-row", help="pełny wiersz tabeli dla nowego zadania (status zostanie nadpisany)")
    p.add_argument("--who", help="kto zajmuje (domyślnie git config user.name)")
    p.add_argument("--role", help="rola w PROGRESS § 3 (domyślnie z prefiksu ID)")
    p.add_argument("--branch", help="gałąź robocza do PROGRESS § 3")
    p.add_argument("--no-progress", action="store_true", help="nie zmieniaj PROGRESS.md § 3")
    p.add_argument("--force", action="store_true", help="przejmij zadanie zajęte/zakończone/zablokowane")
    p.add_argument("--dry-run", action="store_true", help="pokaż zmianę bez commitu i pusha")
    args = p.parse_args(argv)
    if not args.task_id and not args.next:
        p.error("podaj ID zadania albo --next PREFIKS")
    try:
        return run(args)
    except Taken as exc:
        print(f"ZAJĘTE: {exc}. Wybierz inne zadanie albo uzgodnij przejęcie i użyj --force.", file=sys.stderr)
        return EXIT_TAKEN
    except ClaimError as exc:
        print(f"BŁĄD: {exc}", file=sys.stderr)
        return EXIT_ERROR


if __name__ == "__main__":
    sys.exit(main())
