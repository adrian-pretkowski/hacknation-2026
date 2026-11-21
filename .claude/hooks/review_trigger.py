"""Wyzwalacz review po commicie.

Tryby (argv[1]):
  git-post-commit  — wywoływany przez .githooks/post-commit (commity z terminala/IDE): zapisuje znacznik "czeka na review"
  hook             — hook Claude Code (PostToolUse/Bash, SessionStart, UserPromptSubmit): po `git commit` w sesji
                     zapisuje znacznik; gdy znacznik dotyczy bieżącej gałęzi, dodaje do kontekstu polecenie uruchomienia /review
  mark <WERDYKT> [gałąź] — wywoływany przez /review: zapisuje wynik review dla czubka gałęzi (domyślnie HEAD)
                   i czyści znacznik

Znaczniki leżą w katalogu gita (nie trafiają do repo): <git-dir>/zus-review/pending.json, reviewed/<sha>.txt
Commity na main nie są reviewowane (review dotyczy gałęzi roboczych).
"""
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

_ARG = r"(?:[^\s\"']|\"[^\"]*\"|'[^']*')+"
COMMIT_RE = re.compile(rf"\bgit\b(?:\s+-\S+(?:\s+{_ARG})?)*\s+commit(?=\s|$|;|&|\|)")


def git(*args: str) -> str:
    result = subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def state_dir() -> Path | None:
    """Katalog stanu we wspólnym git-dir (jeden dla głównego checkoutu i wszystkich worktree)."""
    git_dir = git("rev-parse", "--path-format=absolute", "--git-common-dir")
    return Path(git_dir) / "zus-review" if git_dir else None


def head() -> tuple[str, str]:
    return git("rev-parse", "HEAD"), git("branch", "--show-current")


def write_pending(directory: Path, sha: str, branch: str) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    data = {"commit": sha, "branch": branch, "time": datetime.now().isoformat(timespec="seconds")}
    (directory / "pending.json").write_text(json.dumps(data), encoding="utf-8")


def read_pending(directory: Path) -> dict | None:
    try:
        return json.loads((directory / "pending.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def reminder(sha: str, branch: str) -> str:
    return (f"Commit {sha[:8]} na gałęzi `{branch}` czeka na code review (zasada projektu: review po każdym commicie). "
            "Zanim zaczniesz kolejną pracę, uruchom komendę /review — subagent `reviewer` sprawdzi gałąź względem main "
            "(reguły fachowe z docs/ i zus_rules/, reguły techniczne z CLAUDE.md). Przy werdykcie READY_TO_MERGE zapytaj "
            "użytkownika o PR, merge do main i push main. Jeśli użytkownik wyraźnie odkłada review, nie nalegaj.")


def swap_last_head(directory: Path, sha: str) -> str | None:
    """Zapisuje bieżący HEAD i zwraca poprzednio widziany (None przy pierwszym uruchomieniu)."""
    worktree_dir = git("rev-parse", "--absolute-git-dir")  # last_head per worktree (stan review — wspólny)
    marker = (Path(worktree_dir) if worktree_dir else directory) / "zus-review-last-head"
    marker.parent.mkdir(parents=True, exist_ok=True)
    previous = marker.read_text(encoding="utf-8").strip() if marker.exists() else None
    marker.write_text(sha, encoding="utf-8")
    return previous


def emit(event: str, text: str) -> None:
    print(json.dumps({"hookSpecificOutput": {"hookEventName": event, "additionalContext": text}}, ensure_ascii=False))


def mode_hook() -> int:
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return 0
    event = payload.get("hook_event_name", "")
    directory = state_dir()
    if directory is None:
        return 0
    sha, branch = head()
    if not sha:
        return 0

    previous_head = swap_last_head(directory, sha)

    if event == "PostToolUse":
        command = (payload.get("tool_input") or {}).get("command", "")
        if not COMMIT_RE.search(command) or "--dry-run" in command:
            return 0
        if previous_head is None or previous_head == sha:
            return 0  # HEAD nieznany albo bez zmian — commit nie powstał (np. tekst „git commit” w echo)
        if branch in ("main", "master", ""):
            return 0
        if (directory / "reviewed" / f"{sha}.txt").exists():
            return 0
        write_pending(directory, sha, branch)
        emit(event, reminder(sha, branch))
        return 0

    if event in ("SessionStart", "UserPromptSubmit"):
        pending = read_pending(directory)
        if not pending or pending.get("branch") != branch:
            return 0
        if (directory / "reviewed" / f"{pending['commit']}.txt").exists():
            return 0
        emit(event, reminder(pending["commit"], pending["branch"]))
    return 0


def mode_git_post_commit() -> int:
    directory = state_dir()
    sha, branch = head()
    if directory is None or not sha or branch in ("main", "master", ""):
        return 0
    write_pending(directory, sha, branch)
    print(f"[review] Commit {sha[:8]} na '{branch}' czeka na review — w Claude Code uruchom: /review")
    return 0


def mode_mark(verdict: str, target_branch: str | None = None) -> int:
    """Zapisuje wynik review dla czubka gałęzi `target_branch` (domyślnie bieżący HEAD)."""
    directory = state_dir()
    if target_branch:
        sha, branch = git("rev-parse", target_branch), target_branch
    else:
        sha, branch = head()
    if directory is None or not sha:
        return 1
    (directory / "reviewed").mkdir(parents=True, exist_ok=True)
    (directory / "reviewed" / f"{sha}.txt").write_text(
        f"{verdict}\n{branch}\n{datetime.now().isoformat(timespec='seconds')}\n", encoding="utf-8")
    pending = read_pending(directory)
    if pending and pending.get("commit") == sha:
        (directory / "pending.json").unlink(missing_ok=True)
    print(f"review {sha[:8]} ({branch}): {verdict}")
    return 0


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    mode = sys.argv[1] if len(sys.argv) > 1 else "hook"
    if mode == "git-post-commit":
        return mode_git_post_commit()
    if mode == "mark":
        return mode_mark(sys.argv[2] if len(sys.argv) > 2 else "UNKNOWN", sys.argv[3] if len(sys.argv) > 3 else None)
    return mode_hook()


if __name__ == "__main__":
    sys.exit(main())
