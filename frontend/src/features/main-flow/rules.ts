// Etykiety reguł do wyświetlenia zamiast ID: krótki opis, opis i podstawa prawna z zus_rules/03_rules.yaml
// (te same pola co w 02_BUSINESS_RULES_CATALOG.md). Słownik rule_labels.json generuje `npm run gen:rules`
// (scripts/gen_rule_labels.py) - nie edytuj go ręcznie.
import { legalText } from "@/lib/format";
import labels from "./rule_labels.json";

export type RuleLabel = { name: string; description: string; basis: string };

const LABELS: Record<string, RuleLabel> = labels;

/** Grupy reguł podawane jako „PREFIKS-*” (np. w `not_evaluated_rules` podglądu). */
const GROUPS: Record<string, string> = {
  "SICK-*": "Zasiłek chorobowy (wszystkie przepisy)",
  "MAT-TRF-*": "Przejęcie urlopu macierzyńskiego przez drugiego rodzica",
};

/** Krótki opis, opis i podstawa reguły; null, gdy ID nie ma w katalogu. */
export function ruleLabel(id: string): RuleLabel | null {
  return LABELS[id] ?? null;
}

export type RuleParts = { id: string; head: string; description: string | null };

/** Wpis „ID” albo „ID (uwaga)” → nagłówek „Krótki opis (podstawa) - uwaga” i opis. Nieznane ID zostaje bez zmian. */
export function ruleParts(entry: string): RuleParts {
  const m = /^(\S+)\s*\((.+)\)$/.exec(entry.trim());
  const [id, note] = m ? [m[1], m[2]] : [entry.trim(), null];
  const l = ruleLabel(id);
  const base = l ? `${l.name} (${legalText(l.basis)})` : GROUPS[id];
  if (!base) return { id, head: entry, description: null };
  return { id, head: note ? `${base} - ${note}` : base, description: l ? legalText(l.description) : null };
}
