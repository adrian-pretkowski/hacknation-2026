"""Generuje frontend/src/features/main-flow/rule_labels.json z zus_rules/03_rules.yaml.

Dla każdej reguły: krótki opis (`name`), opis (`description`, akapit nad „Podstawa”)
i podstawa (`source_document - source_location`), tak jak w 02_BUSINESS_RULES_CATALOG.md.
UI pokazuje je zamiast ID reguły (FE1-17).
Uruchom po każdej zmianie 03_rules.yaml:
  Windows: `backend\\.venv\\Scripts\\python scripts\\gen_rule_labels.py` (albo `npm run gen:rules` w frontend/)
  Linux/Docker: `backend/.venv/bin/python scripts/gen_rule_labels.py`
Plik leży poza frontend/src/content/ - tam są tylko bloki ContentBlock (test_content.py).
"""

from __future__ import annotations

import json
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "zus_rules" / "03_rules.yaml"
OUT = REPO / "frontend" / "src" / "features" / "main-flow" / "rule_labels.json"


def basis(rule: dict) -> str:
    """Pole „Podstawa” z 02; bez dublowania kodu aktu („USTAWA - USTAWA art. 1” → „USTAWA art. 1”)."""
    doc, loc = rule["source_document"], rule["source_location"]
    return loc if loc.startswith(f"{doc} ") else f"{doc} - {loc}"


def build() -> dict[str, dict[str, str]]:
    rules = yaml.safe_load(SRC.read_text(encoding="utf-8"))["rules"]
    return {r["id"]: {"name": r["name"], "description": r["description"].strip(), "basis": basis(r)} for r in rules}


def main() -> None:
    labels = build()
    OUT.write_text(json.dumps(labels, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(REPO).as_posix()}: {len(labels)} rules")


if __name__ == "__main__":
    main()
