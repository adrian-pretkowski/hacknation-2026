"use client";

/* FE1-45: panel „Porównanie wariantów wypłaty” - dwie karty z paskiem okresów (wybór lidera z 3 propozycji). */
import { formatDate, formatMoney, formatRate } from "@/lib/format";
import { type PreviewResult, compareTotals, negligible } from "../preview/engine";
import { PARAMS } from "../preview/params";
import type { Variant } from "./answers";
import { LEAVE_LABEL } from "./labels";

type Props = { pA: PreviewResult; pB: PreviewResult; variant: Variant; recommended: Variant; onChoose: (v: Variant) => void };
type Phase = { rate: string; level: number; days: number; daily: string | null; leaves: string[] };

const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";

/** Okresy własne pogrupowane po stawce (dni sumowane, kwota dzienna z kroków obliczeń - bez przeliczania kwot). */
function phases(p: PreviewResult): Phase[] {
  const daily = new Map(p.summary.calcSteps
    .filter((s) => s.label.startsWith("Zasiłek za dzień przy "))
    .map((s) => [s.label.replace("Zasiłek za dzień przy ", ""), s.value] as const));
  const out: Phase[] = [];
  for (const s of p.summary.segments.filter((x) => x.own && !x.history)) {
    const rate = formatRate(s.rate);
    const leave = LEAVE_LABEL[s.leave_type]?.replace(/^Urlop /, "") ?? s.leave_type;
    const last = out[out.length - 1];
    if (last && last.rate === rate) {
      last.days += s.days;
      if (!last.leaves.includes(leave)) last.leaves.push(leave);
    } else out.push({ rate, level: Number(s.rate), days: s.days, daily: daily.get(rate) ?? null, leaves: [leave] });
  }
  return out;
}

function useModel({ pA, pB, recommended }: Props) {
  const c = compareTotals(pA.summary.ownTotal, pB.summary.ownTotal)!;
  const small = negligible(c.diff, pB.summary.ownTotal!);
  const dl = pA.response.deadlines?.find((d) => d.code === "APP_COMBINED_815")?.date;
  const opts = [
    { v: "COMBINED_815" as Variant, letter: "A", name: "Równe raty", rateLabel: formatRate(PARAMS.MAT_RATE_COMBINED) + " przez cały okres",
      p: pA, ph: phases(pA), needsApp: true,
      pros: ["Ta sama kwota co miesiąc - łatwiej planować budżet"],
      cons: [`Wniosek do ${formatDate(dl)} (${PARAMS.APP_COMBINED_DEADLINE_DAYS} dni od porodu)`] },
    { v: "FULL_100_70" as Variant, letter: "B", name: "Więcej na start", rateLabel: "100% → 70%",
      p: pB, ph: phases(pB), needsApp: false,
      pros: ["Pełne 100% przez macierzyński", "Bez dodatkowego wniosku"],
      cons: ["Niższa kwota w rodzicielskim"] },
  ];
  return { c, small, dl, opts, recommendedLetter: recommended === "COMBINED_815" ? "A" : "B" };
}

const RISK = "Jeśli w 1. roku życia dziecka nie wykorzystasz ani dnia rodzicielskiego, za rodzicielski dostaniesz 70%, a macierzyński wyrówna się do 100% dopiero na wniosek.";

function Verdict({ small, better, diff }: { small: boolean; better: string; diff: string }) {
  return small ? (
    <p className="inline-flex items-center gap-2 rounded-full border border-zus-green-100 bg-zus-green-50 px-3 py-1 text-sm text-zus-ink">
      <span aria-hidden="true" className="text-zus-green-dark">=</span> Suma praktycznie ta sama (różnica {formatMoney(diff)}) - różni się rozkład w czasie
    </p>
  ) : (
    <p className="inline-flex items-center gap-2 rounded-full border border-zus-green-100 bg-zus-green-50 px-3 py-1 text-sm text-zus-ink">
      <span aria-hidden="true" className="text-zus-green-dark">▲</span> Wariant <strong>{better}</strong> daje o <strong>{formatMoney(diff)}</strong> więcej
    </p>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-zus-green-dark" : "border-zinc-400"}`}>
      {on && <span className="h-2.5 w-2.5 rounded-full bg-zus-green-dark" />}
    </span>
  );
}

/** Kolor okresu wg stawki: 100% najciemniejszy (kontrast tekstu AA na każdym tle). */
const tone = (level: number) => (level >= 0.999 ? "bg-zus-green-dark text-white" : level >= 0.8 ? "bg-[#7cc79c] text-zus-ink" : "bg-zus-green-100 text-zus-ink");

export function VariantComparison(props: Props) {
  const { c, small, opts, recommendedLetter } = useModel(props);
  const { variant, onChoose } = props;
  return (
    <section className={card} aria-labelledby="var-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="var-h" className="text-lg font-semibold">Porównanie wariantów wypłaty</h3>
        <Verdict small={small} better={c.better} diff={c.diff} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Wybierz wariant do planu">
        {opts.map((o) => {
          const on = variant === o.v;
          const days = o.ph.reduce((s, x) => s + x.days, 0) || 1;
          return (
            <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => onChoose(o.v)}
              className={`relative flex flex-col rounded-xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark ${on ? "border-zus-green-dark bg-white shadow-md" : "border-zinc-200 bg-white hover:border-zinc-400"}`}>
              <span className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${on ? "bg-zus-green-dark text-white" : "bg-zus-gray-50 text-zus-ink"}`}>{o.letter}</span>
                  <span>
                    <span className="block font-semibold text-zus-ink">{o.name}</span>
                    <span className="block text-xs text-zinc-600">{o.rateLabel}</span>
                  </span>
                </span>
                <Radio on={on} />
              </span>
              {recommendedLetter === o.letter && !small && (
                <span className="absolute -top-3 left-4 rounded-full bg-zus-green-dark px-2.5 py-0.5 text-xs font-semibold text-white">Rekomendowany</span>
              )}
              <span className="mt-4 block text-3xl font-bold tracking-tight text-zus-ink">{formatMoney(o.p.summary.ownTotal)}</span>
              <span className="text-xs text-zinc-600">łącznie brutto</span>
              <span className="mt-4 flex h-10 w-full overflow-hidden rounded-md" aria-hidden="true">
                {o.ph.map((p, i) => (
                  <span key={i} className={`flex items-center justify-center border-r-2 border-white text-xs font-semibold last:border-r-0 ${tone(p.level)}`}
                    style={{ width: `${(p.days / days) * 100}%` }}>{p.rate}</span>
                ))}
              </span>
              <span className="mt-2 grid gap-1 text-xs text-zinc-700">
                {o.ph.map((p, i) => (
                  <span key={i} className="flex justify-between gap-2">
                    <span>{p.leaves.join(" + ")} · {p.days} dni</span>
                    <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-zus-ink">{p.daily ? `${formatMoney(p.daily)}/dzień` : p.rate}</span>
                  </span>
                ))}
              </span>
              <span className="mt-4 grid gap-1 border-t border-zinc-100 pt-3 text-sm">
                {o.pros.map((t) => <span key={t} className="flex gap-2"><span aria-hidden="true" className="text-zus-green-dark">✓</span>{t}</span>)}
                {o.cons.map((t) => <span key={t} className="flex gap-2"><span aria-hidden="true" className="font-bold text-zus-yellow">!</span>{t}</span>)}
              </span>
            </button>
          );
        })}
      </div>
      <details className="mt-3 text-xs text-zinc-700">
        <summary className="cursor-pointer font-medium">Ryzyko wariantu A</summary>
        <p className="mt-1">{RISK}</p>
      </details>
    </section>
  );
}

