"""PostToolUse hook: po edycji specyfikacji reguł lub kodu backendu uruchamia audyt reguł i pytest.

Exit 2 przekazuje stderr do Claude, żeby naprawił błąd przed dalszą pracą.
Edycje frontendu i dokumentacji są pomijane.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path(__file__).resolve().parents[2])
WATCHED = ("zus_rules/", "backend/app/", "backend/tests/", "contracts/")


def backend_python() -> str:
    for candidate in (ROOT / "backend" / ".venv" / "Scripts" / "python.exe", ROOT / "backend" / ".venv" / "bin" / "python"):
        if candidate.exists():
            return str(candidate)
    return sys.executable


def main() -> int:
    sys.stderr.reconfigure(encoding="utf-8")
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    path = (payload.get("tool_input") or {}).get("file_path") or ""
    norm = path.replace("\\", "/")
    try:
        rel = Path(norm).resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        rel = norm
    if not rel.startswith(WATCHED):
        return 0

    python = backend_python()
    failures = []
    audit = subprocess.run([python, "zus_rules/tools/build_catalog.py"], cwd=ROOT,
                           capture_output=True, text=True, encoding="utf-8", env=env)
    if audit.returncode != 0:
        failures.append("AUDYT REGUŁ (zus_rules/tools/build_catalog.py):\n" + audit.stdout[-3000:] + audit.stderr[-1000:])

    tests = subprocess.run([python, "-m", "pytest", "-q", "-x", "-p", "no:warnings"], cwd=ROOT / "backend",
                           capture_output=True, text=True, encoding="utf-8", env=env)
    if tests.returncode not in (0, 5):  # 5 = brak testów
        failures.append("PYTEST (backend):\n" + tests.stdout[-3000:] + tests.stderr[-1000:])

    if failures:
        sys.stderr.write("Bramka jakości nie przeszła po edycji " + rel + ":\n\n" + "\n\n".join(failures))
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
