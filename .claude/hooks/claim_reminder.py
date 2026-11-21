"""Hook UserPromptSubmit: gdy polecenie wymienia ID zadania z docs/TASKS.md, które nie jest IN_PROGRESS,
przypomina o rezerwacji `python scripts/claim_task.py <ID>` (status trafia od razu na origin/main).

Nie blokuje, nie używa sieci — czyta lokalny docs/TASKS.md (może być nieaktualny; skrypt sprawdza origin/main).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ID_RE = re.compile(r"\b((?:INT|BE[12]|FE[12]|BA)-\d{2,})\b", re.IGNORECASE)
CELL_SPLIT = re.compile(r"(?<!\\)\|")


def statuses(tasks: Path) -> dict[str, str]:
    result = {}
    for line in tasks.read_text(encoding="utf-8").splitlines():
        if line.startswith("|"):
            parts = [p.strip() for p in CELL_SPLIT.split(line)[1:-1]]
            if len(parts) >= 2:
                result[parts[0]] = parts[-1]
    return result


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    prompt = str(payload.get("prompt") or "")
    if prompt.lstrip().startswith("/claim"):
        return 0
    ids = list(dict.fromkeys(m.upper() for m in ID_RE.findall(prompt)))[:5]
    if not ids:
        return 0
    root = Path(payload.get("cwd") or ".")
    while not (root / "docs" / "TASKS.md").exists() and root.parent != root:
        root = root.parent
    tasks = root / "docs" / "TASKS.md"
    if not tasks.exists():
        return 0
    known = statuses(tasks)
    todo = [i for i in ids if i in known and not known[i].startswith(("IN_PROGRESS", "DONE", "BLOCKED"))]
    missing = [i for i in ids if i not in known]
    lines = []
    if todo:
        lines.append("Zadania bez rezerwacji: " + ", ".join(todo) + ". Zanim zaczniesz pracę nad zadaniem, zajmij je: "
                     "`python scripts/claim_task.py <ID> --branch <gałąź>` (komenda `/claim`) — status IN_PROGRESS "
                     "trafia od razu na origin/main. Kod 2 = zajęte przez kogoś innego: nie zaczynaj, zapytaj użytkownika.")
    if missing:
        lines.append("Brak w lokalnym docs/TASKS.md: " + ", ".join(missing) + " — jeśli to nowe zadanie, "
                     "`python scripts/claim_task.py --next <PREFIKS>` i `--new-row \"| <ID> | ... |\"`.")
    if lines:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit",
                                                 "additionalContext": " ".join(lines)}}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
