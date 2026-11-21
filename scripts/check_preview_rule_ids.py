"""FE1-19: każde ID reguły użyte w kodzie kreatora (podgląd i kroki) istnieje w zus_rules/03_rules.yaml.

Użycie (z katalogu repo): python scripts/check_preview_rule_ids.py
Kod wyjścia 0 = wszystkie ID znane, 1 = są ID spoza 03 (wypisane z plikiem i linią).
Sprawdza literały w cudzysłowie o kształcie ID reguły (np. "MAT-DUR-001", "RISK-H1", "KP-177");
wzorce z gwiazdką w `not_evaluated_rules` (np. "SICK-*") pomija.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RULES = ROOT / "zus_rules" / "03_rules.yaml"
SCAN = [ROOT / "frontend" / "src" / "features" / "main-flow"]
# literał "PREFIKS-...": co najmniej dwa człony, ostatni z cyfrą (ID reguły), np. MAT-DUR-001, RISK-H1, KP-177
LITERAL = re.compile(r"""["'`]([A-Z]{2,}(?:-[A-Z]{2,})*-[A-Z]?[0-9]+)(?=[\s"'`(])""")


def known_ids() -> set[str]:
    return set(re.findall(r"^- id: (\S+)$", RULES.read_text(encoding="utf-8"), flags=re.M))


def main() -> int:
    ids = known_ids()
    bad: list[str] = []
    for base in SCAN:
        for path in sorted(base.rglob("*.ts*")):
            for no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                for rule_id in LITERAL.findall(line):
                    if rule_id not in ids:
                        bad.append(f"{path.relative_to(ROOT).as_posix()}:{no}: {rule_id}")
    if bad:
        print(f"ID spoza {RULES.relative_to(ROOT).as_posix()} ({len(bad)}):")
        print("\n".join(bad))
        return 1
    print(f"OK - wszystkie ID reguł w kreatorze istnieją w 03 ({len(ids)} reguł w katalogu)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
