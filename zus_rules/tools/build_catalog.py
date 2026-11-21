"""Validate 03_rules.yaml against schema/spec/tests and generate catalog + audit.

Usage:  python tools/build_catalog.py   (run from zus_rules/)
Exit code 1 when any blocking (ERROR) finding exists.
Outputs: 02_BUSINESS_RULES_CATALOG.md, 11_CONSISTENCY_AUDIT.md
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import yaml

for _stream in (sys.stdout, sys.stderr):
    _stream.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RULES = yaml.safe_load((ROOT / "03_rules.yaml").read_text(encoding="utf-8"))
SCHEMA = json.loads((ROOT / "04_INPUT_DATA_SCHEMA.json").read_text(encoding="utf-8"))
SPEC = (ROOT / "07_CALCULATION_SPEC.md").read_text(encoding="utf-8")
TESTS = json.loads((ROOT / "08_TEST_CASES.json").read_text(encoding="utf-8"))

REQUIRED = ["id", "name", "description", "category", "rule_type", "legal_basis", "source_document",
            "source_location", "source_excerpt", "valid_from", "valid_to", "conditions", "result",
            "exceptions", "dependencies", "overrides", "required_inputs", "missing_data_behavior",
            "evaluation", "confidence", "interpretation_status", "implementation_priority",
            "automation_status", "notes"]
ENUMS = {
    "rule_type": {"ELIGIBILITY", "EXCLUSION", "CALCULATION", "DURATION", "RATE", "DOCUMENT_REQUIREMENT",
                  "DEADLINE", "VALIDATION", "CLASSIFICATION"},
    "confidence": {"HIGH", "MEDIUM", "LOW"},
    "interpretation_status": {"DIRECT", "DERIVED", "AMBIGUOUS", "INCOMPLETE_SOURCE"},
    "implementation_priority": {"P0", "P1", "P2"},
    "automation_status": {"AUTOMATABLE", "PARTIALLY_AUTOMATABLE", "HUMAN_REVIEW"},
    "evaluation": {"ACTIVE", "BLOCKED", "HUMAN_REVIEW", "FUTURE", "INFORMATIONAL"},
    "missing_data_behavior": {"NEEDS_DATA", "NEEDS_REVIEW", "NOT_APPLICABLE"},
}
OPERATORS = set(RULES["meta"]["dsl"]["operators"])
LEAF_KEYS = {"field", "fact", "operator", "value", "args"}
PARAMS = set(RULES["meta"]["parameters"])
REF_DATE = RULES["meta"]["reference_date"]
CONTEXT = set(SCHEMA["x-engine-context-fields"]["fields"])
SPEC_FACTS = set(re.findall(r"^\| `(f_[a-z0-9_]+)`", SPEC, flags=re.M))

findings: list[tuple[str, str, str]] = []  # (level, rule_id, message)


def err(rid, msg):
    findings.append(("ERROR", rid, msg))


def warn(rid, msg):
    findings.append(("WARN", rid, msg))


def schema_paths(node, prefix=""):
    paths = set()
    props = node.get("properties", {})
    for key, sub in props.items():
        path = f"{prefix}.{key}" if prefix else key
        paths.add(path)
        if "$ref" in sub:
            ref = sub["$ref"].split("/")[-1]
            target = SCHEMA["$defs"].get(ref, {})
            if target.get("type") == "object":
                paths |= schema_paths(target, path)
        if sub.get("type") == "object" or "properties" in sub:
            paths |= schema_paths(sub, path)
    return paths


FIELD_PATHS = schema_paths(SCHEMA)

rules = RULES["rules"]
ids = [r.get("id") for r in rules]
dupes = {i for i in ids if ids.count(i) > 1}
for d in dupes:
    err(d, "duplicate id")
ID_SET = set(ids)

facts_used: dict[str, set] = defaultdict(set)
fields_used: dict[str, set] = defaultdict(set)
params_used: dict[str, set] = defaultdict(set)


def walk_value(rid, value):
    if isinstance(value, dict):
        if "param" in value:
            params_used[value["param"]].add(rid)
            if value["param"] not in PARAMS:
                err(rid, f"unknown param {value['param']}")
        if "fact" in value:
            facts_used[value["fact"]].add(rid)
        for v in value.values():
            walk_value(rid, v)
    elif isinstance(value, list):
        for v in value:
            walk_value(rid, v)


def walk_cond(rid, cond):
    if not isinstance(cond, dict):
        err(rid, f"condition must be a mapping, got {cond!r}")
        return
    keys = set(cond)
    if keys & {"all", "any"}:
        for k in keys & {"all", "any"}:
            for sub in cond[k]:
                walk_cond(rid, sub)
        if keys - {"all", "any"}:
            err(rid, f"unexpected keys next to all/any: {keys - {'all', 'any'}}")
        return
    if "not" in keys:
        walk_cond(rid, cond["not"])
        return
    if not keys <= LEAF_KEYS:
        err(rid, f"unknown condition keys {keys - LEAF_KEYS}")
    if cond.get("operator") not in OPERATORS:
        err(rid, f"unknown operator {cond.get('operator')}")
    if ("field" in cond) == ("fact" in cond):
        err(rid, "leaf must have exactly one of field/fact")
    if "field" in cond:
        fields_used[cond["field"]].add(rid)
    if "fact" in cond:
        facts_used[cond["fact"]].add(rid)
    for v in (cond.get("args") or {}).values():
        if isinstance(v, str) and re.fullmatch(r"[a-z_]+\.[a-z0-9_.]+", v):
            fields_used[v].add(rid)
    walk_value(rid, cond.get("value"))
    walk_value(rid, cond.get("args"))


for r in rules:
    rid = r.get("id", "?")
    for k in REQUIRED:
        if k not in r:
            err(rid, f"missing key {k}")
    for k, allowed in ENUMS.items():
        if r.get(k) not in allowed:
            err(rid, f"{k}={r.get(k)} not in {sorted(allowed)}")
    for k in ("dependencies", "overrides", "exceptions"):
        for ref in r.get(k) or []:
            if ref not in ID_SET:
                err(rid, f"{k} → unknown rule {ref}")
    walk_cond(rid, r.get("conditions"))
    walk_value(rid, r.get("result"))
    res = r.get("result") or {}
    if "compute" in res:
        facts_used[res["compute"]].add(rid)
    for f in r.get("required_inputs") or []:
        fields_used[f].add(rid)
    if r.get("interpretation_status") in {"AMBIGUOUS", "INCOMPLETE_SOURCE"} and \
            r.get("evaluation") not in {"BLOCKED", "HUMAN_REVIEW", "INFORMATIONAL"}:
        err(rid, "AMBIGUOUS/INCOMPLETE_SOURCE rule is executable without block")
    vf = r.get("valid_from")
    if vf and str(vf) > REF_DATE and r.get("evaluation") != "FUTURE":
        err(rid, f"valid_from {vf} > reference date but evaluation != FUTURE")
    if r.get("evaluation") == "FUTURE" and not (vf and str(vf) > REF_DATE):
        err(rid, "evaluation FUTURE without future valid_from")
    if not r.get("source_excerpt"):
        err(rid, "empty source_excerpt")
    if r.get("rule_type") == "DOCUMENT_REQUIREMENT" and r.get("evaluation") != "INFORMATIONAL":
        warn(rid, "document rule should be INFORMATIONAL (separate from eligibility)")

for fact, users in sorted(facts_used.items()):
    if fact not in SPEC_FACTS:
        err(",".join(sorted(users)), f"fact {fact} not defined in 07_CALCULATION_SPEC.md")
for field, users in sorted(fields_used.items()):
    if field not in FIELD_PATHS and field not in CONTEXT:
        err(",".join(sorted(users)), f"field {field} not in 04_INPUT_DATA_SCHEMA.json")
unused_params = PARAMS - set(params_used)

# --- tests
tests_by_rule: dict[str, list] = defaultdict(list)
fixture_names = set(TESTS["fixtures"])
test_ids = [t["test_id"] for t in TESTS["tests"]]
for t in {i for i in test_ids if test_ids.count(i) > 1}:
    err(t, "duplicate test_id")
for t in TESTS["tests"]:
    if t.get("fixture") not in fixture_names:
        err(t["test_id"], f"unknown fixture {t.get('fixture')}")
    if t.get("kind") not in TESTS["contract"]["kinds"]:
        err(t["test_id"], f"unknown kind {t.get('kind')}")
    for rid in t["rule_ids"]:
        if rid not in ID_SET:
            err(t["test_id"], f"references unknown rule {rid}")
        tests_by_rule[rid].append(t["test_id"])

RULE_BY_ID = {r["id"]: r for r in rules}
untested_p0 = [r["id"] for r in rules
               if r["implementation_priority"] == "P0"
               and r["automation_status"] != "HUMAN_REVIEW"
               and r["evaluation"] not in {"INFORMATIONAL"}
               and not tests_by_rule.get(r["id"])]
for rid in untested_p0:
    err(rid, "P0 automatable rule has no test")

# --- generate catalog
CAT_ORDER = ["GENERAL", "EMPLOYER_SICK_PAY", "SICKNESS", "REHABILITATION", "MATERNITY", "MATERNITY_EQUIVALENT",
             "SUPPLEMENTARY_MATERNITY", "PARENTAL", "PATERNITY", "BASE", "RISK"]
CAT_TITLE = {
    "GENERAL": "Reguły ogólne — płatnik, zadłużenie, terminy", "EMPLOYER_SICK_PAY": "Wynagrodzenie chorobowe (KP art. 92)",
    "SICKNESS": "Zasiłek chorobowy (w tym ciąża)", "REHABILITATION": "Świadczenie rehabilitacyjne (poza priorytetem — oznaczone osobno)",
    "MATERNITY": "Zasiłek macierzyński — prawo, okres macierzyński, przejęcie, stawki", "MATERNITY_EQUIVALENT": "Zasiłek w wysokości zasiłku macierzyńskiego",
    "SUPPLEMENTARY_MATERNITY": "Uzupełniający urlop macierzyński", "PARENTAL": "Urlop rodzicielski",
    "PATERNITY": "Urlop ojcowski", "BASE": "Podstawa wymiaru", "RISK": "Ostrzeżenia o ryzykach (pkt H zadania) — nie zmieniają statusu",
}


def cond_text(c, depth=0):
    pad = "  " * depth
    if "all" in c:
        return f"{pad}- WSZYSTKIE:\n" + "\n".join(cond_text(x, depth + 1) for x in c["all"])
    if "any" in c:
        return f"{pad}- KTÓRYKOLWIEK:\n" + "\n".join(cond_text(x, depth + 1) for x in c["any"])
    if "not" in c:
        return f"{pad}- NIE:\n" + cond_text(c["not"], depth + 1)
    left = f"`{c.get('field') or c.get('fact')}`"
    if c.get("args"):
        left += f"({', '.join(f'{k}={v}' for k, v in c['args'].items())})"
    val = c.get("value")
    if isinstance(val, dict) and "param" in val:
        val = f"{val['param']} (={RULES['meta']['parameters'][val['param']]['value']})"
    elif isinstance(val, dict) and "fact" in val:
        val = f"`{val['fact']}`"
    return f"{pad}- {left} **{c.get('operator')}** {val}"


lines = ["# 02 — BUSINESS RULES CATALOG", "",
         f"> **Plik generowany** z `03_rules.yaml` (v{RULES['meta']['version']}, data referencyjna {REF_DATE}) przez `tools/build_catalog.py`. Nie edytować ręcznie.",
         "", f"Liczba reguł: **{len(rules)}**. Status `evaluation`: ACTIVE — wykonywana automatycznie; BLOCKED — zwraca NEEDS_REVIEW; HUMAN_REVIEW — przesłanka oceniana przez człowieka; FUTURE — jeszcze nie obowiązuje; INFORMATIONAL — dokumenty/terminy/ostrzeżenia.", "",
         "## Indeks", "", "| ID | Nazwa | Typ | Prio | Eval | Pewność | Interpretacja | Testy |", "|---|---|---|---|---|---|---|---|"]
for cat in CAT_ORDER:
    for r in rules:
        if r["category"] == cat:
            lines.append(f"| [{r['id']}](#{r['id'].lower()}) | {r['name']} | {r['rule_type']} | {r['implementation_priority']} | {r['evaluation']} | {r['confidence']} | {r['interpretation_status']} | {len(tests_by_rule.get(r['id'], []))} |")
for cat in CAT_ORDER:
    group = [r for r in rules if r["category"] == cat]
    if not group:
        continue
    lines += ["", f"## {CAT_TITLE.get(cat, cat)}", ""]
    for r in group:
        lb = r["legal_basis"]
        lines += [f"### {r['id']}", "", f"**{r['name']}** — `{r['rule_type']}` · {r['implementation_priority']} · {r['automation_status']} · eval: **{r['evaluation']}**", "",
                  r["description"], "",
                  f"- **Podstawa:** {r['source_document']} — {r['source_location']}",
                  f"- **Fragment:** „{r['source_excerpt']}”",
                  f"- **Obowiązuje:** od {r['valid_from'] or '—'} do {r['valid_to'] or '—'}",
                  "- **Warunki:**", cond_text(r["conditions"], 1),
                  f"- **Rezultat:** `{json.dumps(r['result'], ensure_ascii=False)}`",
                  f"- **Wyjątki:** {', '.join(r['exceptions']) or '—'} · **Zależy od:** {', '.join(r['dependencies']) or '—'} · **Ma pierwszeństwo przed:** {', '.join(r['overrides']) or '—'}",
                  f"- **Dane:** {', '.join(f'`{x}`' for x in r['required_inputs']) or '—'} · brak danych → `{r['missing_data_behavior']}`",
                  f"- **Jakość:** pewność {r['confidence']}, interpretacja {r['interpretation_status']}",
                  f"- **Testy:** {', '.join(tests_by_rule.get(r['id'], [])) or '—'}"]
        if r.get("notes"):
            lines.append(f"- **Uwagi:** {r['notes']}")
        lines.append("")
(ROOT / "02_BUSINESS_RULES_CATALOG.md").write_text("\n".join(lines), encoding="utf-8")

# --- audit report
errors = [f for f in findings if f[0] == "ERROR"]
warns = [f for f in findings if f[0] == "WARN"]
by = lambda key: defaultdict(int, {k: sum(1 for r in rules if r[key] == k) for k in {r[key] for r in rules}})
a = ["# 11 — CONSISTENCY AUDIT (generowany)", "",
     f"Wygenerowano przez `tools/build_catalog.py` z `03_rules.yaml` v{RULES['meta']['version']}. **Błędy: {len(errors)} · Ostrzeżenia: {len(warns)}**", "",
     "## Statystyki", "",
     f"- Reguły: {len(rules)}; testy: {len(TESTS['tests'])}; fakty użyte: {len(facts_used)} (zdefiniowane w 07: {len(SPEC_FACTS)}); pola użyte: {len(fields_used)}; parametry: {len(PARAMS)}",
     f"- Priorytet: " + ", ".join(f"{k}={v}" for k, v in sorted(by('implementation_priority').items())),
     f"- Evaluation: " + ", ".join(f"{k}={v}" for k, v in sorted(by('evaluation').items())),
     f"- Interpretacja: " + ", ".join(f"{k}={v}" for k, v in sorted(by('interpretation_status').items())),
     f"- Parametry nieużywane w warunkach (używane w funkcjach 07): {', '.join(sorted(unused_params)) or '—'}", "",
     "## Wyniki kontroli", ""]
if findings:
    a += ["| Poziom | Reguła/test | Opis |", "|---|---|---|"] + [f"| {l} | {r} | {m} |" for l, r, m in findings]
else:
    a.append("Brak błędów i ostrzeżeń.")
checks = [
    ("1. Każda reguła ma podstawę źródłową", not any("source" in m or "missing key legal_basis" in m for _, _, m in errors)),
    ("2. Wejście i rezultat zdefiniowane", not any("missing key" in m for _, _, m in errors)),
    ("3. Wyjątki zidentyfikowane", "częściowo — patrz 09 (GAP-*) — wyciągi niekompletne"),
    ("4. Zależności wskazują istniejące reguły", not any("unknown rule" in m for _, _, m in errors)),
    ("5. Okres obowiązywania uwzględniony", not any("valid_from" in m or "FUTURE" in m for _, _, m in errors)),
    ("6. Brak danych nie prowadzi do fałszywej odmowy", "TAK — logika Kleene (C9), missing_data_behavior, testy MISSING_DATA"),
    ("7. Ocena człowieka nie zamieniona na bool", not any("without block" in m for _, _, m in errors)),
    ("8. Dokumenty oddzielone od uprawnień", not any("document rule" in m for _, _, m in warns)),
    ("9. Obliczenia mają jednostki/granice/zaokrąglenia", "jednostki i granice TAK; zaokrąglenia — BRAK w źródłach (GAP-001), jawnie oznaczone"),
    ("10. Wszystkie reguły P0 mają testy", not untested_p0),
    ("11. Schemat zawiera pola używane przez reguły", not any("not in 04_INPUT" in m for _, _, m in errors)),
    ("12. YAML interpretowalny bez LLM", "TAK — zamknięty zestaw operatorów, fakty jako nazwane funkcje (07)"),
]
a += ["", "## Checklista QA (§13)", "", "| Kontrola | Wynik |", "|---|---|"]
for name, ok in checks:
    a.append(f"| {name} | {'✅' if ok is True else ('❌' if ok is False else ok)} |")
a += ["", "## Macierz pokrycia: przepis → reguła biznesowa → reguła wykonywalna → test", "",
      "| Przepis | Reguła | Wykonanie | Testy |", "|---|---|---|---|"]
for r in sorted(rules, key=lambda x: (x["source_document"], x["source_location"])):
    a.append(f"| {r['source_document']} {r['source_location']} | {r['id']} | {r['evaluation']} | {', '.join(tests_by_rule.get(r['id'], [])) or '—'} |")
a += ["", "## Przepisy zidentyfikowane, ale nieuwzględnione w regułach wykonywalnych", "",
      "| Przepis | Przyczyna |", "|---|---|",
      "| USTAWA art. 2 pkt 3, 6; rozdz. 4-5 (zasiłek wyrównawczy, opiekuńczy) | Poza zakresem produktu (nie w pkt a–j zadania); art. 32-35 nie ma w wyciągu |",
      "| USTAWA art. 6 ust. 2 (kwarantanna, leczenie odwykowe, dawstwo) | P2 — rzadkie; częściowo w SICK-RATE-002 (dawstwo) |",
      "| USTAWA art. 14, 7a, 52a, 52b | Grupy szczególne (nosicielstwo, żołnierze, służba zastępcza, małżonek Prezydenta) — OUT_OF_SCOPE |",
      "| USTAWA art. 19 ust. 2-3 (waloryzacja) | Brak wskaźników w materiałach (GAP-009) |",
      "| USTAWA art. 53-58a (e-ZLA — wystawianie, rejestry, błędy) | Procedura lekarska/płatnika — tylko jako źródło danych (kody A-E) |",
      "| USTAWA art. 61 ust. 4, 61a, 62 ust. 1-2, 4-6, 63, 65, 66, 66a | Procedura wypłaty — informacyjnie w przewodniku, nie w silniku |",
      "| USTAWA art. 29 ust. 2a, 8; art. 29a ust. 4; art. 30a ust. 4 | Przypadki szczególne (KAS, przepisy odrębne) — OUT_OF_SCOPE |",
      "| KP art. 177 § 1, § 1(1), § 4 | Ochrona przed zwolnieniem — treść informacyjna (pkt I zadania), nie wpływa na zasiłek |",
      "| KP art. 181, 182(1d) § 3, 183 § 7-8, 185, 186(4), 189(1) | Uprawnienia pracownicze bez wpływu na zasiłek / P2 |",
      "| ROZP_DOK § 5, 7-10, 14, 18-19, 21-25, 28, 31, 34-41, zał. 5, 7 | Dokumenty dla przypadków P2 lub poza zakresem (zagranica, opiekuńczy); mapowane informacyjnie |",
      "| ROZP_WN § 19-21 | Urlop wychowawczy / obniżenie wymiaru — poza zakresem |",
      "", "## Mapa pól wejścia → reguły", "", "| Pole | Reguły |", "|---|---|"]
for f, users in sorted(fields_used.items()):
    a.append(f"| `{f}` | {', '.join(sorted(users))} |")
a += ["", "## Mapa faktów → reguły", "", "| Fakt | Reguły |", "|---|---|"]
for f, users in sorted(facts_used.items()):
    a.append(f"| `{f}` | {', '.join(sorted(users))} |")
(ROOT / "11_CONSISTENCY_AUDIT.md").write_text("\n".join(a), encoding="utf-8")

print(f"rules={len(rules)} tests={len(TESTS['tests'])} errors={len(errors)} warnings={len(warns)}")
for l, r, m in findings:
    print(f"{l:5} {r}: {m}")
sys.exit(1 if errors else 0)
