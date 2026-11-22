"use client";

// Krok kreatora „Optymalizacja” (BE2-07): planer urlopów obojga rodziców na API /api/planner/suggest.
// Graf decyzji i kwoty liczy backend (zus_rules/03_rules.yaml) - tu tylko wyświetlanie i zapis wyborów w odpowiedziach.
import { useEffect, useRef, useState } from "react";
import { ApiError, type PlannerChoice, type PlannerPlan, type PlannerSuggestResponse, plannerSuggest } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { RuleList, RuleText } from "../RuleList";
import { baseFromGross } from "../preview/engine";
import { type Answers, plannerInputsKey } from "./answers";
import { PlannerPlanCard } from "./PlannerPlanCard";
import { Choice, MoneyField, TRI_OPTIONS } from "./fields";
import { normalizeMoney } from "./money";

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

const clean = normalizeMoney; // FE1-15: wspólna normalizacja kwot (money.ts)

/** Czy krok „Optymalizacja” ma sens: rodzic biologiczny, przed porodem, mama ubezpieczona. */
export function optimizerVisible(a: Answers): boolean {
  if (a.sensitive || a.stage === "BORN" || (a.role !== "MOTHER" && a.role !== "FATHER") || a.title === "NONE") return false;
  return a.role === "MOTHER" || a.partnerInsured === "YES";
}

export function Optimizer({ a, set, onApplied }: {
  a: Answers; set: (patch: Partial<Answers>) => void;
  /** FE1-62: po „Użyj tego planu” kreator przechodzi do wyniku „Twój plan” */
  onApplied?: () => void;
}) {
  const [data, setData] = useState<PlannerSuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isMother = a.role === "MOTHER";
  const ownGross = clean(a.salaryGross);
  const partnerGross = clean(a.partnerSalaryGross);
  const fatherInsured = isMother ? a.partnerInsured !== "NO" : true;
  const motherGross = isMother ? ownGross : partnerGross;
  const fatherGross = isMother ? partnerGross : ownGross;
  // planer (API) dostaje podstawę bez granic - minimum i limit nakłada silnik, nie przeglądarka (review FE1-20)
  const motherBase = motherGross ? baseFromGross(motherGross) : null;
  const fatherBase = fatherGross ? baseFromGross(fatherGross) : null;
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
          mother: { base_monthly: motherBase, gross_monthly: motherGross, insured: true },
          father: fatherInsured && fatherGross
            ? { base_monthly: fatherBase, gross_monthly: fatherGross, insured: true }
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
  }, [missing, motherGross, fatherGross, motherBase, fatherBase, fatherInsured, a.children, a.zaZyciem, a.plannerObjective, choices]);

  const done = data?.current_best_plan?.choices.slice(0, choices.length) ?? [];
  const plan = data?.current_best_plan;
  // FE1-62: zapisujemy też kopię planu (kwoty z API) i podpis danych - wynik pokazuje plan rodziny, a nie tylko część wypełniającego
  const apply = (p: PlannerPlan) => {
    set({ ...answersFromPlan(p), plannerPlan: p, plannerKey: plannerInputsKey(a) });
    onApplied?.();
  };
  const complete = data?.status === "COMPLETE";
  const stepIndex = data?.step ? data.step.index : complete ? STEP_COUNT : choices.length;

  // FE1-59: ustawienia zwinięte do jednej linii, gdy są kompletne
  // otwarte na start, gdy brakuje danych; zwijane dopiero przyciskiem (nie w trakcie wpisywania kwoty)
  const [editSettings, setEditSettings] = useState(() => !!missing);
  const settingsCollapsed = !missing && !editSettings;

  // FE1-59: po wyborze odpowiedzi przewijamy do kolejnej decyzji na osi
  const cardRef = useRef<HTMLDivElement>(null);
  const picked = useRef(false);
  const choose = (next: PlannerChoice[]) => { picked.current = true; setChoices(next); };
  useEffect(() => {
    if (!picked.current || loading) return;
    picked.current = false;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data, loading]);

  const settingsSummary = [
    isMother ? `tata ${a.partnerInsured === "YES" ? "ubezpieczony" : a.partnerInsured === "NO" ? "bez ubezpieczenia" : "ubezpieczenie: nie wiem"}` : null,
    fatherInsured && partnerGross ? `${isMother ? "tata" : "mama"} ${formatMoney(partnerGross)} brutto` : null,
    a.plannerObjective === "MAX_MONEY" ? "cel: spokojniejszy budżet" : "cel: więcej wspólnego czasu",
  ].filter(Boolean).join(" · ");

  const settings = settingsCollapsed ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-zus-gray-50 px-3 py-2 text-sm">
      <span className="font-semibold">Ustawienia:</span>
      <span className="min-w-0 flex-1 text-zinc-700">{settingsSummary}</span>
      <button type="button" onClick={() => setEditSettings(true)}
        className="rounded px-2 py-1 text-xs font-medium text-zus-navy underline underline-offset-2 hover:bg-zus-blue-50">Zmień</button>
    </div>
  ) : (
    <div className="space-y-5">
      {isMother && (
        <Choice legend="Czy tata ma ubezpieczenie chorobowe?" value={a.partnerInsured} columns={3}
          onChange={(partnerInsured) => set({ partnerInsured, plannerChoices: [] })} options={TRI_OPTIONS} />
      )}
      {fatherInsured && (
        <MoneyField label={`Wynagrodzenie brutto ${isMother ? "taty" : "mamy"} (zł / miesiąc)`}
          value={a.partnerSalaryGross} emptyLabel="nie podano"
          hint="Potrzebne, żeby porównać, komu bardziej opłaca się wziąć część urlopu."
          onChange={(partnerSalaryGross) => set({ partnerSalaryGross, plannerChoices: [] })} />
      )}
      <Choice legend="Jak chcecie ułożyć ten czas?" value={a.plannerObjective} columns={2}
        hint="Każdy wybór jest dobry - to tylko podpowiedź dla planera. Możesz go zmienić w dowolnej chwili."
        onChange={(plannerObjective) => set({ plannerObjective, plannerChoices: [] })}
        options={[
          { value: "MAX_TIME", label: "Więcej wspólnego czasu", description: "Podział, w którym urlop z dzieckiem trwa najdłużej." },
          { value: "MAX_MONEY", label: "Spokojniejszy domowy budżet", description: "Podział, w którym rodzina otrzyma łącznie najwyższe świadczenie." },
        ]} />
      {!missing && (
        <button type="button" onClick={() => setEditSettings(false)}
          className="rounded-full bg-zus-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Gotowe - przejdź do decyzji</button>
      )}
    </div>
  );

  const backtrack = !missing && (data?.backtrack ?? []).map((b) => (
    <div key={b.step_index} className="rounded-xl border-l-8 border-l-zus-yellow bg-zus-yellow-50 p-4 text-sm" aria-live="polite">
      <p className="font-semibold">Możecie zyskać {formatMoney(b.gain_preview ?? b.gain_exact)}</p>
      <p className="mt-1">
        Wróć o {b.steps_back} {b.steps_back === 1 ? "krok" : "kroki"} do „{STEP_TITLE[b.step_id]}”: zamiast „{b.current_label}”
        wybierz „{b.suggested_label}”.
      </p>
      <button type="button" onClick={() => choose([...choices.slice(0, b.step_index), b.suggested_value])}
        className="mt-3 rounded-full bg-zus-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Zmień ten wybór</button>
    </div>
  ));

  const optionList = data?.step && (
    <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
      {(data.options ?? []).map((o) => (
        <li key={String(o.value)}>
          {o.feasible ? (
            <button type="button" onClick={() => choose([...choices, o.value])}
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
  );
  const stepFooter = data?.step && (
    <>
      {data.explanation && <p className="mt-3 text-sm text-zinc-700" aria-live="polite">{data.explanation}</p>}
      <div className="mt-1 text-xs text-zinc-600">Przepisy:<RuleList ids={data.step.rule_ids} /></div>
    </>
  );

  // FE1-59: oś 7 decyzji (gotowe zwinięte, bieżąca rozwinięta, przyszłe z podpowiedzią)
  const timeline = !missing && data && (
    <div ref={cardRef} className="scroll-mt-4">
      <ol className="relative space-y-0 border-l-2 border-zinc-200 pl-0" aria-label={`Decyzje planera: ${Math.min(stepIndex, STEP_COUNT)} z ${STEP_COUNT} gotowe`}>
        {STEP_IDS.map((id, i) => {
          const doneChoice = i < choices.length ? done[i] : undefined;
          const current = data.step && i === data.step.index;
          const hintLabel = plan?.choices[i]?.label;
          return (
            <li key={id} className="relative pb-3 pl-6 last:pb-0">
              <span aria-hidden className={`absolute -left-[11px] top-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${doneChoice ? "bg-zus-green-dark text-white" : current ? "bg-white text-zus-green-dark ring-4 ring-zus-green-dark" : "bg-zinc-200 text-zinc-500"}`}>
                {doneChoice ? "✓" : i + 1}
              </span>
              {current && data.step ? (
                <fieldset className="rounded-xl border-2 border-zus-green-dark bg-zus-green-50/40 p-4 shadow-sm" aria-busy={loading}>
                  <legend className="px-1 text-sm font-semibold text-zus-green-dark">
                    Teraz: decyzja {i + 1} z {STEP_COUNT} · {data.step.title}
                  </legend>
                  <p className="text-base font-semibold text-balance">{data.step.question}</p>
                  {data.step.hint && <p className="mt-1 text-sm text-zinc-700">{data.step.hint}</p>}
                  {optionList}
                  {stepFooter}
                </fieldset>
              ) : (
                <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm ${doneChoice ? "" : "text-zinc-500"}`}>
                  <span className="min-w-0 flex-1">
                    <span className={doneChoice ? "font-medium" : ""}>{i + 1}. {STEP_TITLE[id]}</span>
                    {doneChoice && <span className="text-zinc-700">: {doneChoice.label}</span>}
                    {!doneChoice && hintLabel && <span className="text-xs"> - polecane: {hintLabel}</span>}
                  </span>
                  {doneChoice && (
                    <button type="button" onClick={() => choose(choices.slice(0, i))}
                      className="rounded px-2 py-1 text-xs font-medium text-zus-navy underline underline-offset-2 hover:bg-zus-blue-50">Zmień</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );

  const planCard = !missing && plan && (
    <PlannerPlanCard plan={plan} title={complete ? "Wasz plan" : "Najlepszy plan przy Waszych dotychczasowych wyborach"}
      assumptions={data?.assumptions ?? []}>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => apply(plan)}
          className="rounded-full bg-zus-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-zus-navy">
          Użyj tego planu w kreatorze
        </button>
        {choices.length > 0 && (
          <button type="button" onClick={() => choose([])} className="rounded-full px-4 py-2 text-sm font-semibold text-zus-navy hover:underline">
            Zacznij decyzje od nowa
          </button>
        )}
      </div>
      {a.plannerApplied && a.plannerPlan && a.plannerKey === plannerInputsKey(a) && (
        <p className="mt-2 text-xs text-zus-green-dark" role="status">Plan przeniesiony do kroku „Plany” i do wyniku „Twój plan”.</p>
      )}
    </PlannerPlanCard>
  );
  const assumptionsBox = data && !missing && (
    <details className="text-xs text-zinc-600">
      <summary className="cursor-pointer">Założenia planera</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">{data.assumptions.map((x) => <li key={x.code}>{x.text}</li>)}</ul>
    </details>
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-700">
        Planer sprawdza wszystkie dozwolone podziały urlopów między mamę i tatę. Przy każdej odpowiedzi widzisz, ile
        rodzina może łącznie dostać, jeśli dalej wybierze najlepiej. Jeśli wcześniejszy wybór okaże się gorszy, planer
        podpowie, do którego kroku wrócić.
      </p>
      {settings}

      {missing && <p className="rounded-lg bg-zus-yellow-50 px-3 py-2 text-sm">{missing}</p>}
      {error && <p className="rounded-lg bg-zus-red-50 px-3 py-2 text-sm text-zus-red" role="alert">{error}</p>}

      {backtrack}
      {timeline}

      {planCard}
      {assumptionsBox}
    </div>
  );
}

const STEP_IDS = Object.keys(STEP_TITLE);

/** Przeniesienie planu do pól kreatora (krok „Plany”): tygodnie taty, przejęcie macierzyńskiego, praca mamy, wariant. */
export function answersFromPlan(plan: PlannerPlan): Partial<Answers> {
  const pick = (id: string) => plan.choices.find((c) => c.step_id === id)?.value;
  const reserved = Number(pick("FATHER_RESERVED_9W") ?? 0);
  const shared = Number(pick("SHARED_PARENTAL_SPLIT") ?? 0);
  const work = String(pick("WORK_MOTHER") ?? "0");
  const transfer = Number(pick("MATERNITY_TRANSFER") ?? 0);
  const paternity = pick("PATERNITY");
  const motherParentalDays = plan.items
    .filter((i) => i.parent === "MOTHER" && i.kind === "PARENTAL_LEAVE").reduce((n, i) => n + i.days, 0);
  return {
    fatherParentalWeeks: reserved + shared,
    // FE1-62: pełna liczba tygodni przejęcia i ojcowskiego (wcześniej tylko tak/nie, ojcowski pomijany)
    fatherTakesOverMaternity: transfer > 0,
    fatherMaternityWeeks: transfer > 0 ? transfer : null,
    paternityWeeks: paternity === undefined ? null : Number(paternity),
    workFraction: work === "0.25" || work === "0.5" ? work : "0",
    workWeeks: work === "0" ? "" : String(Math.round(motherParentalDays / 7)),
    plannerVariant: pick("COMBINED_815") === true ? "COMBINED_815" : "FULL_100_70",
    plannerApplied: true,
  };
}
