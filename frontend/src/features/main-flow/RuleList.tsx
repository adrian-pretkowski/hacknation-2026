import { ruleParts } from "./rules";

/** Jedna reguła: krótki opis (podstawa) i pod spodem opis z katalogu 02 — zamiast ID (ID tylko w podpowiedzi `title`). */
export function RuleText({ entry, className = "" }: { entry: string; className?: string }) {
  const p = ruleParts(entry);
  return (
    <span className={className} title={p.id}>
      <span className="font-medium">{p.head}</span>
      {p.description && <span className="block font-normal opacity-80">{p.description}</span>}
    </span>
  );
}

/** Lista reguł (bez powtórzeń), każda jako `RuleText`. */
export function RuleList({ ids, className = "" }: { ids: readonly string[]; className?: string }) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return null;
  return (
    <ul className={`list-disc space-y-1 pl-5 ${className}`}>
      {unique.map((id) => <li key={id}><RuleText entry={id} /></li>)}
    </ul>
  );
}
