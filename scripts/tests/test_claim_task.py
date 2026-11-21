"""Testy scripts/claim_task.py na tymczasowym repo (bare origin + dwa klony). Uruchom:
    backend\\.venv\\Scripts\\python -m pytest scripts/tests -p no:warnings
"""

from __future__ import annotations

import importlib.util
import subprocess
from pathlib import Path

import pytest

SPEC = importlib.util.spec_from_file_location("claim_task", Path(__file__).resolve().parents[1] / "claim_task.py")
claim = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(claim)

TASKS = """# TASKS

## Zadania
| ID | Owner | Prio | Zakres / pliki | Zależności | Kryteria akceptacji | Weryfikacja | Status |
|---|---|---|---|---|---|---|---|
| INT-01 | INT | P0 | kontrakt `a \\| b` | — | ok | pytest | TODO |
| INT-02 | INT | P0 | deploy | — | ok | smoke | IN_PROGRESS (INT · ktoś) |
| BE2-05 | BE-2 | P0 | admin | — | ok | pytest | DONE |

Kolejność startu: INT → INT-01.
"""

PROGRESS = """# PROGRESS

## 3. W toku (jedna linia na osobę — nadpisuj swoją)
| Rola | Zadanie | Gałąź / worktree | Od | Uwagi |
|---|---|---|---|---|
| INT | — | — | — | uwagi zostają |
| BE-2 | — | — | — | |

## 4. Następne kroki
"""


def sh(cwd: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True, encoding="utf-8").stdout.strip()


def clone(tmp: Path, origin: Path, name: str, user: str) -> Path:
    path = tmp / name
    sh(tmp, "clone", "-q", str(origin), str(path))
    sh(path, "config", "user.name", user)
    sh(path, "config", "user.email", f"{user}@example.test")
    return path


@pytest.fixture
def repos(tmp_path: Path) -> tuple[Path, Path, Path]:
    origin = tmp_path / "origin.git"
    sh(tmp_path, "init", "-q", "--bare", "-b", "main", str(origin))
    seed = tmp_path / "seed"
    sh(tmp_path, "init", "-q", "-b", "main", str(seed))
    sh(seed, "config", "user.name", "seed")
    sh(seed, "config", "user.email", "seed@example.test")
    (seed / "docs").mkdir()
    (seed / "docs" / "TASKS.md").write_bytes(TASKS.encode())
    (seed / "PROGRESS.md").write_bytes(PROGRESS.encode())
    sh(seed, "add", ".")
    sh(seed, "commit", "-q", "-m", "seed")
    sh(seed, "push", "-q", str(origin), "main")
    return origin, clone(tmp_path, origin, "a", "ala"), clone(tmp_path, origin, "b", "bartek")


def origin_file(origin: Path, path: str) -> str:
    return sh(origin, "show", f"main:{path}")


def test_claim_free_task_pushes_status_and_progress(repos, monkeypatch):
    origin, a, _ = repos
    monkeypatch.chdir(a)
    assert claim.main(["INT-01", "--branch", "int/INT-01-x"]) == 0
    tasks = origin_file(origin, "docs/TASKS.md")
    assert "| INT-01 | INT | P0 | kontrakt `a \\| b` | — | ok | pytest | IN_PROGRESS (INT · ala) |" in tasks
    progress = origin_file(origin, "PROGRESS.md")
    assert "| INT | INT-01 IN_PROGRESS | `int/INT-01-x` |" in progress and "uwagi zostają" in progress
    assert sh(origin, "log", "-1", "--format=%s", "main") == "chore(INT-01): claim — IN_PROGRESS (INT · ala)"
    # lokalny main przewinięty
    assert sh(a, "rev-parse", "HEAD") == sh(origin, "rev-parse", "main")


def test_second_person_is_refused(repos, monkeypatch):
    origin, a, b = repos
    monkeypatch.chdir(a)
    assert claim.main(["INT-01"]) == 0
    monkeypatch.chdir(b)  # klon b ma nieaktualny origin/main — skrypt i tak pobiera świeży
    before = sh(origin, "rev-parse", "main")
    assert claim.main(["INT-01"]) == claim.EXIT_TAKEN
    assert sh(origin, "rev-parse", "main") == before


def test_already_mine_is_noop(repos, monkeypatch):
    origin, a, _ = repos
    monkeypatch.chdir(a)
    assert claim.main(["INT-01"]) == 0
    before = sh(origin, "rev-parse", "main")
    assert claim.main(["INT-01"]) == 0
    assert sh(origin, "rev-parse", "main") == before


@pytest.mark.parametrize("task", ["INT-02", "BE2-05"])
def test_taken_or_done_refused_unless_force(repos, monkeypatch, task):
    origin, a, _ = repos
    monkeypatch.chdir(a)
    assert claim.main([task]) == claim.EXIT_TAKEN
    assert claim.main([task, "--force", "--no-progress"]) == 0
    assert f"| {task} |" in origin_file(origin, "docs/TASKS.md")
    row = next(ln for ln in origin_file(origin, "docs/TASKS.md").splitlines() if ln.startswith(f"| {task} |"))
    assert "IN_PROGRESS (" in row


def test_new_row_appended_at_end_of_table(repos, monkeypatch):
    origin, a, _ = repos
    monkeypatch.chdir(a)
    assert claim.main(["--next", "INT"]) == 0
    row = "| INT-03 | INT | P0 | nowe | — | ok | pytest | TODO |"
    assert claim.main(["INT-03", "--new-row", row, "--no-progress"]) == 0
    lines = origin_file(origin, "docs/TASKS.md").splitlines()
    i = lines.index("| INT-03 | INT | P0 | nowe | — | ok | pytest | IN_PROGRESS (INT · ala) |")
    assert lines[i - 1].startswith("| BE2-05 |") and lines[i + 1] == ""
    assert claim.main(["INT-03", "--new-row", row]) == claim.EXIT_ERROR  # już istnieje


def test_unknown_task_and_bad_id(repos, monkeypatch):
    _, a, _ = repos
    monkeypatch.chdir(a)
    assert claim.main(["INT-99"]) == claim.EXIT_ERROR
    assert claim.main(["XYZ-1"]) == claim.EXIT_ERROR


def test_next_id(capsys):
    assert claim.next_id(TASKS, "INT") == "INT-03"
    assert claim.next_id(TASKS, "FE1") == "FE1-01"


def test_push_race_retries_and_rechecks(repos, monkeypatch):
    """Między fetch a push ktoś inny wypycha rezerwację: pierwszy push odrzucony, druga próba na świeżym main."""
    origin, a, b = repos
    real_git = claim.git
    state = {"raced": False}

    def racing_git(*args, **kwargs):
        if args and args[0] == "push" and not state["raced"]:
            state["raced"] = True
            monkeypatch.chdir(a)
            assert claim.main(["INT-01", "--no-progress"]) == 0  # ala zajmuje INT-01 w międzyczasie
            monkeypatch.chdir(b)
        return real_git(*args, **kwargs)

    monkeypatch.setattr(claim, "git", racing_git)
    monkeypatch.setattr(claim.time, "sleep", lambda _s: None)
    monkeypatch.chdir(b)
    # bartek zajmuje INT-01 → po odrzuceniu pusha widzi, że zajęła je ala
    assert claim.main(["INT-01", "--no-progress"]) == claim.EXIT_TAKEN
    tasks = origin_file(origin, "docs/TASKS.md")
    assert "IN_PROGRESS (INT · ala)" in tasks and "bartek" not in tasks


def test_race_on_different_task_both_land(repos, monkeypatch):
    origin, a, b = repos
    real_git = claim.git
    state = {"raced": False}

    def racing_git(*args, **kwargs):
        if args and args[0] == "push" and not state["raced"]:
            state["raced"] = True
            monkeypatch.chdir(a)
            assert claim.main(["INT-01", "--no-progress"]) == 0
            monkeypatch.chdir(b)
        return real_git(*args, **kwargs)

    monkeypatch.setattr(claim, "git", racing_git)
    monkeypatch.setattr(claim.time, "sleep", lambda _s: None)
    monkeypatch.chdir(b)
    assert claim.main(["INT-03", "--new-row", "| INT-03 | INT | P0 | x | — | ok | t | TODO |", "--no-progress"]) == 0
    tasks = origin_file(origin, "docs/TASKS.md")
    assert "IN_PROGRESS (INT · ala)" in tasks and "IN_PROGRESS (INT · bartek)" in tasks
