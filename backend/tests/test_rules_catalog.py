"""Bramka specyfikacji: audyt zus_rules musi dawać 0 błędów."""
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def test_rules_catalog_audit_passes():
    result = subprocess.run([sys.executable, "zus_rules/tools/build_catalog.py"], cwd=REPO, capture_output=True,
                            text=True, encoding="utf-8", env={"PYTHONIOENCODING": "utf-8", **__import__("os").environ})
    assert result.returncode == 0, result.stdout + result.stderr
