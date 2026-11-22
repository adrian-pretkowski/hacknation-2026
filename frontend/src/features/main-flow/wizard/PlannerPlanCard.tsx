"use client";

// FE1-62: karta planu z planera (BE2-07) - ta sama w kroku „Optymalizacja” i w wyniku „Twój plan”.
// Kwoty liczy silnik planera w API (bez przeliczania w przeglądarce); blok wyjaśnienia jak w D19.
import type { ReactNode } from "react";
import type { PlannerPlan } from "@/lib/api";
import { formatMoney, formatRate } from "@/lib/format";
import { RuleList } from "../RuleList";
import { PARAMS } from "../preview/params";

const PARENT = { MOTHER: "Mama", FATHER: "Tata" } as const;

export function PlannerPlanCard({ plan, title, assumptions = [], children, note }: {
  plan: PlannerPlan; title: string; assumptions?: { code: string; text: string }[]; children?: ReactNode; note?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-zus-gray-50 p-4" aria-live="polite" data-testid="planner-plan">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zus-navy">{formatMoney(plan.totals.best_total_preview)}</p>
      <p className="text-xs text-zinc-600">
        Mama {formatMoney(plan.totals.mother_preview)} · Tata {formatMoney(plan.totals.father_preview)} · {plan.totals.covered_weeks} tyg. opieki nad dzieckiem
      </p>
      {note}
      {plan.choices.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Decyzje w planie">
          {plan.choices.map((c) => (
            <li key={c.step_id} className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-700">{c.label}</li>
          ))}
        </ul>
      )}
      {plan.needs_review && <div className="mt-2 text-xs">Część planu wymaga weryfikacji:<RuleList ids={plan.review_rules} /></div>}
      {/* D19: każda kwota z blokiem wyjaśnienia - kroki, dni × stawka, przepisy, założenia (FE1-42 w raporcie INT-15) */}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium">Pokaż, jak to policzyliśmy</summary>
        <p className="mt-2 text-xs text-zinc-600">Każda pozycja: podstawa wymiaru × stawka ÷ {PARAMS.MONTH_AS_DAYS} × liczba dni
          (kwoty liczy silnik planera w API, bez zaokrągleń).</p>
        <ul className="mt-2 divide-y divide-zinc-200">
          {plan.items.map((i, n) => (
            <li key={n} className="py-2">
              <p className="flex gap-2"><span className="min-w-0 flex-1">{i.label}</span><span className="tabular-nums">{formatMoney(i.amount_exact)}</span></p>
              <p className="text-xs text-zinc-500">{PARENT[i.parent]} · {i.days} dni{i.rate ? ` × stawka ${formatRate(i.rate)}` : ""}
                {i.rate ? ` (podstawa ${PARENT[i.parent]?.toLowerCase() ?? ""} × ${formatRate(i.rate)} ÷ ${PARAMS.MONTH_AS_DAYS} × ${i.days} dni)` : ""}</p>
              <RuleList ids={i.rule_ids} className="text-xs text-zinc-600" />
            </li>
          ))}
        </ul>
        {assumptions.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-600">{assumptions.map((x) => <li key={x.code}>{x.text}</li>)}</ul>
        )}
      </details>
      {children}
    </div>
  );
}
