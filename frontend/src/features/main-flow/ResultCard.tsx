import type { Benefit, EvaluateResponse } from "@/lib/api";
import { STATUS_LABEL, formatDate, formatMoney, formatRate, legalBasisText, legalText } from "@/lib/format";
import { ruleLabel } from "./rules";
import { RuleList } from "./RuleList";

const STATUS_STYLE: Record<string, string> = {
  ELIGIBLE: "bg-emerald-100 text-emerald-900",
  NOT_ELIGIBLE: "bg-red-100 text-red-900",
  NEEDS_DATA: "bg-sky-100 text-sky-900",
  NEEDS_REVIEW: "bg-amber-100 text-amber-900",
  OUT_OF_SCOPE: "bg-zinc-200 text-zinc-800",
};

function BenefitCard({ benefit }: { benefit: Benefit }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-label="Wynik: zasiłek macierzyński">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Zasiłek macierzyński - urlop macierzyński</h3>
        <span className={`rounded px-2 py-1 text-sm font-medium ${STATUS_STYLE[benefit.status] ?? ""}`}>
          {STATUS_LABEL[benefit.status] ?? benefit.status}
        </span>
      </header>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-zinc-500">Okres</dt><dd data-testid="period">{formatDate(benefit.period?.from)} – {formatDate(benefit.period?.to)} ({benefit.period?.max_weeks ?? "-"} tyg., {benefit.days ?? "-"} dni)</dd></div>
        <div><dt className="text-zinc-500">Stawka</dt><dd data-testid="rate">{formatRate(benefit.rate)} podstawy</dd></div>
        <div><dt className="text-zinc-500">Za dzień</dt><dd>{formatMoney(benefit.daily_amount_exact)}</dd></div>
        <div><dt className="text-zinc-500">Łącznie za okres</dt><dd data-testid="total" className="text-base font-semibold">{formatMoney(benefit.total_amount_exact)}</dd></div>
      </dl>
      <ul className="mt-4 space-y-2 text-sm">
        {benefit.reasons.map((reason) => {
          const rule = ruleLabel(reason.rule_id);
          const basis = reason.legal_basis?.map(legalBasisText).join("; ") || (rule ? legalText(rule.basis) : undefined);
          return (
            <li key={reason.code} className="rounded bg-zinc-50 p-2">
              {reason.message}
              <span className="block text-xs text-zinc-500" title={reason.rule_id}>
                {rule?.name ?? reason.rule_id} · {basis}
                {rule && <span className="block">{legalText(rule.description)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function ResultCard({ result }: { result: EvaluateResponse }) {
  return (
    <section aria-live="polite" className="space-y-4">
      {result.benefits.map((benefit) => <BenefitCard key={`${benefit.benefit_type}-${benefit.leave_type}`} benefit={benefit} />)}
      {result.missing_data.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm">
          <p className="font-medium">Uzupełnij dane, aby dokończyć wyliczenie:</p>
          <ul className="mt-2 list-disc pl-5">{result.missing_data.map((m) => <li key={m.field}>{m.field}</li>)}</ul>
        </div>
      )}
      <details className="text-xs text-zinc-600">
        <summary className="cursor-pointer">Założenia i ograniczenia tej wersji ({result.engine})</summary>
        <ul className="mt-2 list-disc pl-5">{result.assumptions.map((a) => <li key={a.code}>{a.text}</li>)}</ul>
        {result.not_evaluated_rules.length > 0 && <div className="mt-2">Jeszcze nieoceniane przepisy:<RuleList ids={result.not_evaluated_rules} /></div>}
      </details>
    </section>
  );
}
