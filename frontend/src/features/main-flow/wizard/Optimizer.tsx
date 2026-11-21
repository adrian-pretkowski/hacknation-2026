"use client";

// Krok kreatora „Optymalizacja” (BE2-07): planer urlopów obojga rodziców na API /api/planner/suggest.
// Graf decyzji i kwoty liczy backend (zus_rules/03_rules.yaml) — tu tylko wyświetlanie i zapis wyborów w odpowiedziach.
import { useEffect, useState } from "react";
import { ApiError, type PlannerChoice, type PlannerPlan, type PlannerSuggestResponse, plannerSuggest } from "@/lib/api";
import { formatMoney, formatRate } from "@/lib/format";
import { RuleList, RuleText } from "../RuleList";
import { baseFromGross } from "../preview/engine";
import type { Answers } from "./answers";
import { Choice, Slider, TRI_OPTIONS } from "./fields";

const STEP_TITLE: Record<string, string> = {
  COMBINED_815: "Wniosek 81,5%",
  MATERNITY_TRANSFER: "Podział macierzyńskiego",
  PATERNITY: "Urlop ojcowski",
  FATHER_RESERVED_9W: "9 tygodni taty",
  SHARED_PARENTAL_SPLIT: "Wspólna część rodzicielskiego",
  WORK_MOTHER: "Praca mamy na rodzicielskim",
  WORK_FATHER: "Praca taty na rodzicielskim",
};
const STEP_COUNT = Object.keys(STEP_TITLE).length;
const PARENT = { MOTHER: "Mama", FATHER: "Tata" } as const;
const box = "rounded-xl border border-zinc-200 p-4";

const clean = (v: string) => {
  const n = v.trim().replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(n) && Number(n) > 0 ? n : null;
};

/** Czy krok „Optymalizacja” ma sens: rodzic biologiczny, przed porodem, mama ubezpieczona. */
export function optimizerVisible(a: Answers): boolean {
  if (a.sensitive || a.stage === "BORN" || (a.role !== "MOTHER" && a.role !== "FATHER") || a.title === "NONE") return false;
  return a.role === "MOTHER" || a.partnerInsured === "YES";
}

export function Optimizer({ a, set }: { a: Answers; set: (patch: Partial<Answers>) => void }) {
  const [data, setData] = useState<PlannerSuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isMother = a.role === "MOTHER";
  const ownGross = clean(a.salaryGross);
  const partnerGross = clean(a.partnerSalaryGross);
  const fatherInsured = isMother ? a.partnerInsured !== "NO" : true;
  const motherGross = isMother ? ownGross : partnerGross;
  const fatherGross = isMother ? partnerGross : ownGross;
  const choices = a.plannerChoices;
  const setChoices = (plannerChoices: PlannerChoice[]) => set({ plannerChoices });
  const missing = !ownGross ? "Wróć do kroku „Wynagrodzenie” i podaj swoje wynagrodzenie."
    : !motherGross || (fatherInsured && !fatherGross) ? `Podaj wynagrodzenie ${isMother ? "taty" : "mamy"}, żeby porównać wybory obojga rodziców.` : null;

  useEffect(() => {
    if (missing || !motherGross) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      plannerSuggest({
        profile: {
          children_count: Math.min(Math.max(a.children, 1), 10), za_zyciem: a.zaZyciem,
          mother: { base_monthly: baseFromGross(motherGross), gross_monthly: motherGross, insured: true },
          father: fatherInsured && fatherGross
            ? { base_monthly: baseFromGross(fatherGross), gross_monthly: fatherGross, insured: true }
            : { base_monthly: null, insured: false },
        },
        choices, objective: a.plannerObjective, lookback: 3,
      })
        .then((r) => {
          if (cancelled) return;
          setData(r); setError(null);
          // wybór niezgodny z regułami (np. po zmianie liczby dzieci) → wracamy do ostatniego poprawnego kroku
          if (r.status === "INVALID_CHOICE" && r.invalid_choice) set({ plannerChoices: choices.slice(0, r.invalid_choice.index) });
        })
        .catch((e: unknown) => { if (!cancelled) setError(e instanceof ApiError ? e.message : "Nie udało się pobrać podpowiedzi."); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // set jest stabilne w obrębie kreatora; zależymy od danych wejściowych planera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, motherGross, fatherGross, fatherInsured, a.children, a.zaZyciem, a.plannerObjective, choices]);

  const done = data?.current_best_plan?.choices.slice(0, choices.length) ?? [];
  const plan = data?.current_best_plan;
  const apply = (p: PlannerPlan) => set(answersFromPlan(p));

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-700">
        Planer sprawdza wszystkie dozwolone podziały urlopów między mamę i tatę. Przy każdej odpowiedzi widzisz, ile
        rodzina może łącznie dostać, jeśli dalej wybierze najlepiej. Jeśli wcześniejszy wybór okaże się gorszy, planer
        podpowie, do którego kroku wrócić.
      </p>
      {isMother && (
        <Choice legend="Czy tata ma ubezpieczenie chorobowe?" value={a.partnerInsured} columns={3}
          onChange={(partnerInsured) => set({ partnerInsured, plannerChoices: [] })} options={TRI_OPTIONS} />
      )}
      {fatherInsured && (
        <Slider label={`Wynagrodzenie brutto ${isMother ? "taty" : "mamy"} (zł / miesiąc)`} unit="zł" money min={0} max={30000} step={100}
          value={a.partnerSalaryGross} emptyLabel="nie podano"
          hint="Potrzebne, żeby porównać, komu bardziej opłaca się wziąć część urlopu."
          onChange={(partnerSalaryGross) => set({ partnerSalaryGross, plannerChoices: [] })} />
      )}
      <Choice legend="Co jest dla Was ważniejsze?" value={a.plannerObjective} columns={2}
        onChange={(plannerObjective) => set({ plannerObjective, plannerChoices: [] })}
        options={[{ value: "MAX_MONEY", label: "Jak najwięcej pieniędzy" }, { value: "MAX_TIME", label: "Jak najdłużej z dzieckiem" }]} />

      {missing && <p className="rounded-lg bg-zus-yellow-50 px-3 py-2 text-sm">{missing}</p>}
      {error && <p className="rounded-lg bg-zus-red-50 px-3 py-2 text-sm text-zus-red" role="alert">{error}</p>}

      {!missing && done.length > 0 && (
        <div className={box}>
          <p className="text-sm font-semibold">Wasze wybory</p>
          <ol className="mt-1 divide-y divide-zinc-100 text-sm">
            {done.map((c, i) => (
              <li key={c.step_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="text-xs tabular-nums text-zinc-500">{i + 1}/{STEP_COUNT}</span>
                <span className="min-w-0 flex-1"><span className="text-zinc-600">{STEP_TITLE[c.step_id] ?? c.step_id}:</span> {c.label}</span>
                <button type="button" onClick={() => setChoices(choices.slice(0, i))}
                  className="rounded px-2 py-1 text-xs font-medium text-zus-navy underline underline-offset-2 hover:bg-zus-blue-50">Zmień</button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!missing && (data?.backtrack ?? []).map((b) => (
        <div key={b.step_index} className="rounded-xl border-l-8 border-l-zus-yellow bg-zus-yellow-50 p-4 text-sm" aria-live="polite">
          <p className="font-semibold">Możecie zyskać {formatMoney(b.gain_preview ?? b.gain_exact)}</p>
          <p className="mt-1">
            Wróć o {b.steps_back} {b.steps_back === 1 ? "krok" : "kroki"} do „{STEP_TITLE[b.step_id]}”: zamiast „{b.current_label}”
            wybierz „{b.suggested_label}”.
          </p>
          <button type="button" onClick={() => setChoices([...choices.slice(0, b.step_index), b.suggested_value])}
            className="mt-3 rounded-full bg-zus-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Zmień ten wybór</button>
        </div>
      ))}

      {!missing && data?.step && (
        <fieldset className={box} aria-busy={loading}>
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zus-green-dark">
            Decyzja {data.step.index + 1} z {STEP_COUNT} · {data.step.title}
          </legend>
          <p className="text-base font-semibold text-balance">{data.step.question}</p>
          {data.step.hint && <p className="mt-1 text-sm text-zinc-700">{data.step.hint}</p>}
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
            {(data.options ?? []).map((o) => (
              <li key={String(o.value)}>
                {o.feasible ? (
                  <button type="button" onClick={() => setChoices([...choices, o.value])}
                    className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-left text-sm hover:bg-zus-green-50 focus-visible:outline-2 focus-visible:outline-zus-green-dark ${o.recommended ? "border-zus-green-dark bg-zus-green-50" : "border-zinc-200"}`}>
                    <span className="min-w-0 flex-1 font-medium">{o.label}</span>
                    {o.recommended && <span className="rounded-full bg-zus-green-dark px-2 py-0.5 text-xs text-white">Polecane</span>}
                    {o.needs_review && <span className="rounded-full bg-zus-yellow-50 px-2 py-0.5 text-xs">do weryfikacji</span>}
                    <span className="tabular-nums">{formatMoney(o.best_total_preview)}</span>
                    {!o.recommended && o.loss_vs_best_preview && Number(o.loss_vs_best_preview) >= 0.01 && (
                      <span className="w-full text-xs tabular-nums text-zus-red sm:w-auto">−{formatMoney(o.loss_vs_best_preview)}</span>
                    )}
                  </button>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500">
                    <span className="line-through">{o.label}</span>
                    <span className="ml-2 text-xs">Niedozwolone: {o.blocked_reason}</span>
                    {o.blocked_by_rule && <RuleText entry={o.blocked_by_rule} className="mt-1 block text-xs" />}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {data.explanation && <p className="mt-3 text-sm text-zinc-700" aria-live="polite">{data.explanation}</p>}
          <div className="mt-1 text-xs text-zinc-500">Przepisy:<RuleList ids={data.step.rule_ids} /></div>
        </fieldset>
      )}

      {!missing && plan && (
        <div className="rounded-xl bg-zus-gray-50 p-4" aria-live="polite">
          <p className="text-sm font-semibold">{data?.status === "COMPLETE" ? "Wasz plan" : "Najlepszy plan przy Waszych dotychczasowych wyborach"}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zus-navy">{formatMoney(plan.totals.best_total_preview)}</p>
          <p className="text-xs text-zinc-600">
            Mama {formatMoney(plan.totals.mother_preview)} · Tata {formatMoney(plan.totals.father_preview)} · {plan.totals.covered_weeks} tyg. opieki nad dzieckiem
          </p>
          {plan.needs_review && <div className="mt-2 text-xs">Część planu wymaga weryfikacji:<RuleList ids={plan.review_rules} /></div>}
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-medium">Rozliczenie</summary>
            <ul className="mt-2 divide-y divide-zinc-200">
              {plan.items.map((i, n) => (
                <li key={n} className="py-2">
                  <p className="flex gap-2"><span className="min-w-0 flex-1">{i.label}</span><span className="tabular-nums">{formatMoney(i.amount_exact)}</span></p>
                  <p className="text-xs text-zinc-500">{PARENT[i.parent]} · {i.days} dni{i.rate ? ` · ${formatRate(i.rate)}` : ""}</p>
                  <RuleList ids={i.rule_ids} className="text-xs text-zinc-500" />
                </li>
              ))}
            </ul>
          </details>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => apply(plan)}
              className="rounded-full bg-zus-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-zus-navy">
              Użyj tego planu w kreatorze
            </button>
            {choices.length > 0 && (
              <button type="button" onClick={() => setChoices([])} className="rounded-full px-4 py-2 text-sm font-semibold text-zus-navy hover:underline">
                Zacznij decyzje od nowa
              </button>
            )}
          </div>
          {a.plannerApplied && <p className="mt-2 text-xs text-zus-green-dark">Plan przeniesiony do kroku „Plany” i wyniku.</p>}
        </div>
      )}
      {data && !missing && (
        <details className="text-xs text-zinc-600">
          <summary className="cursor-pointer">Założenia planera</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">{data.assumptions.map((x) => <li key={x.code}>{x.text}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

/** Przeniesienie planu do pól kreatora (krok „Plany”): tygodnie taty, przejęcie macierzyńskiego, praca mamy, wariant. */
export function answersFromPlan(plan: PlannerPlan): Partial<Answers> {
  const pick = (id: string) => plan.choices.find((c) => c.step_id === id)?.value;
  const reserved = Number(pick("FATHER_RESERVED_9W") ?? 0);
  const shared = Number(pick("SHARED_PARENTAL_SPLIT") ?? 0);
  const work = String(pick("WORK_MOTHER") ?? "0");
  const motherParentalDays = plan.items
    .filter((i) => i.parent === "MOTHER" && i.kind === "PARENTAL_LEAVE").reduce((n, i) => n + i.days, 0);
  return {
    fatherParentalWeeks: reserved + shared,
    fatherTakesOverMaternity: Number(pick("MATERNITY_TRANSFER") ?? 0) > 0,
    workFraction: work === "0.25" || work === "0.5" ? work : "0",
    workWeeks: work === "0" ? "" : String(Math.round(motherParentalDays / 7)),
    plannerVariant: pick("COMBINED_815") === true ? "COMBINED_815" : "FULL_100_70",
    plannerApplied: true,
  };
}
