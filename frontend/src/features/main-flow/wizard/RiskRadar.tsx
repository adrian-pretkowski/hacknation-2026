"use client";

/* FE1-48: „Radar ryzyk” jako zakładki wg ważności (wybór lidera z 3 propozycji) - widać jedną grupę naraz,
 * najpierw najpoważniejsza; strzałki ←/→ przełączają zakładki (wzorzec WAI-ARIA Tabs). */
import { useState } from "react";
import type { EvaluateResponse } from "@/lib/api";
import { RuleText } from "../RuleList";

type Warning = NonNullable<EvaluateResponse["warnings"]>[number];
type Sev = Warning["severity"];
const ORDER: Sev[] = ["CRITICAL", "WARNING", "INFO"];
const SEV: Record<Sev, { label: string; border: string; dot: string }> = {
  CRITICAL: { label: "Czerwone flagi", border: "border-zus-red", dot: "bg-zus-red" },
  WARNING: { label: "Uwaga", border: "border-zus-yellow", dot: "bg-zus-yellow" },
  INFO: { label: "Dobrze wiedzieć", border: "border-zus-green", dot: "bg-zus-green" },
};

export function RiskRadar({ response }: { response: EvaluateResponse }) {
  const list = response.warnings ?? [];
  const groups = ORDER.map((s) => ({ s, items: list.filter((w) => w.severity === s) })).filter((g) => g.items.length > 0);
  const [picked, setPicked] = useState<Sev | null>(null);
  if (groups.length === 0) return null;
  // po zmianie odpowiedzi wybrana grupa może zniknąć - wtedy najpoważniejsza
  const tab = groups.some((g) => g.s === picked) ? picked! : groups[0].s;
  const onKey = (e: React.KeyboardEvent) => {
    const i = groups.findIndex((g) => g.s === tab);
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const g = groups[(i + step + groups.length) % groups.length];
    setPicked(g.s);
    document.getElementById(`risk-tab-${g.s}`)?.focus();
  };
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5" aria-labelledby="risk-h">
      <h3 id="risk-h" className="text-lg font-semibold">Radar ryzyk</h3>
      <div role="tablist" aria-label="Ważność ryzyk" onKeyDown={onKey} className="mt-3 flex border-b border-zinc-200">
        {groups.map(({ s, items }) => (
          <button key={s} id={`risk-tab-${s}`} type="button" role="tab" aria-selected={tab === s} aria-controls="risk-panel"
            tabIndex={tab === s ? 0 : -1} onClick={() => setPicked(s)}
            className={`-mb-px flex flex-1 items-center justify-center gap-1.5 border-b-4 px-2 py-2 text-xs font-medium sm:flex-none sm:px-4 sm:text-sm ${tab === s ? `${SEV[s].border} text-zinc-900` : "border-transparent text-zinc-600 hover:text-zinc-900"}`}>
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${SEV[s].dot}`} />
            <span>{SEV[s].label}</span>
            <span className="rounded-full bg-zinc-100 px-1.5 text-zinc-700">{items.length}</span>
          </button>
        ))}
      </div>
      <ul id="risk-panel" role="tabpanel" aria-labelledby={`risk-tab-${tab}`} className="mt-3 space-y-2">
        {groups.find((g) => g.s === tab)!.items.map((w, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEV[w.severity].dot}`} />
            <span className="min-w-0">{w.message}<RuleText entry={w.rule_id} className="mt-0.5 block text-xs text-zinc-600" /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
