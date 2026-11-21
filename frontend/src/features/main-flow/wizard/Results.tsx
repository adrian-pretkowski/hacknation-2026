"use client";

import { useEffect, useMemo, useState } from "react";
import { FormPicker } from "@/features/documents/FormPicker";
import { type FormCode, formsForDocTypes } from "@/features/documents/forms";
import { API_MODE, type EvaluateResponse, evaluate } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { type PreviewResult, type Seg, compareTotals, negligible, previewEvaluate } from "../preview/engine";
import { daysBetween } from "../preview/exact";
import type { Answers, Variant } from "./answers";
import {
  DEADLINE_LABEL, DOC_LABEL, FIELD_QUESTION, FIELD_STEP, LEAVE_COLOR, LEAVE_LABEL, PARENT_LABEL, PAYER_LABEL,
  STATUS_HEADLINE, SUBMIT_LABEL,
} from "./labels";
import { todayIso, toEvaluateRequest } from "./request";

const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";
/** Zasiłek przysługuje i ma niezerową kwotę (bez przeliczania — test tekstu kwoty). */
const hasPayout = (p: PreviewResult) => p.response.overall_status !== "NOT_ELIGIBLE"
  && !!p.summary.ownTotal && !/^0+(\.0*)?$/.test(p.summary.ownTotal);
const pct = (rate: string, work = "0") => `${(Number(rate) * 100).toLocaleString("pl-PL")}%${work !== "0" ? ` × ${(1 - Number(work)).toLocaleString("pl-PL")}` : ""}`;

export function Results({ answers, onEdit, canEdit = () => true, onOpenForm }: {
  answers: Answers; onEdit: (stepId: string) => void; canEdit?: (stepId: string) => boolean;
  /** FE1-11: klik w kafelek pisma na podsumowaniu (etap 2) */
  onOpenForm?: (code: FormCode) => void;
}) {
  const reqA = useMemo(() => toEvaluateRequest(answers, "COMBINED_815"), [answers]);
  const reqB = useMemo(() => toEvaluateRequest(answers, "FULL_100_70"), [answers]);
  const pA = useMemo(() => previewEvaluate(reqA), [reqA]);
  const pB = useMemo(() => previewEvaluate(reqB), [reqB]);
  const cmp = compareTotals(pA.summary.ownTotal, pB.summary.ownTotal);
  const recommended: Variant = cmp?.better === "A" ? "COMBINED_815" : "FULL_100_70";
  // wariant z planera (krok „Optymalizacja”), jeśli użytkownik przeniósł plan do kreatora
  const [chosen, setChosen] = useState<Variant | null>(answers.plannerApplied ? answers.plannerVariant : null);
  const variant = chosen ?? recommended;
  const current = variant === "COMBINED_815" ? pA : pB;
  const r = current.response;
  const sensitive = answers.sensitive;

  return (
    <div className="space-y-5" aria-live="polite">
      {sensitive && <SupportBlock kind="loss" />}
      <StatusHeader result={current} onEdit={onEdit} canEdit={canEdit} />
      {current.summary.remaining && <Remaining p={current} />}
      {/* bez okresów i błędów planu (np. brak prawa) nie pokazujemy pustego panelu */}
      {(current.summary.segments.length > 0 || (r.plan_errors ?? []).length > 0) && (sensitive ? (
        <details className={card}>
          <summary className="cursor-pointer text-base font-semibold">Pokaż okresy i kwoty</summary>
          <Timeline segments={current.summary.segments} planErrors={r.plan_errors ?? []} returnToWork={r.return_to_work ?? []} />
        </details>
      ) : <Timeline segments={current.summary.segments} planErrors={r.plan_errors ?? []} returnToWork={r.return_to_work ?? []} />)}
      {/* porównanie wariantów tylko gdy zasiłek przysługuje i jest kwota w obu wariantach */}
      {current.summary.combinedEligible && hasPayout(pA) && hasPayout(pB) && cmp && (
        <VariantComparison pA={pA} pB={pB} variant={variant} recommended={recommended} onChoose={setChosen} />
      )}
      <Deadlines response={r} />
      <RiskRadar response={r} />
      <Documents response={r} payer={current.summary.payer} />
      {onOpenForm && <FormsToFill response={r} onOpen={onOpenForm} />}
      {(answers.preterm || answers.zaZyciem) && !sensitive && <SupportBlock kind={answers.preterm ? "preterm" : "zazyciem"} />}
      <CalcDetails p={current} />
      {!sensitive && <EngineCrossCheck answers={answers} variant={variant} preview={current} />}
    </div>
  );
}

function StatusHeader({ result, onEdit, canEdit }: {
  result: PreviewResult; onEdit: (s: string) => void; canEdit: (s: string) => boolean;
}) {
  const r = result.response;
  const tone = r.overall_status === "ELIGIBLE" ? "border-l-zus-green"
    : r.overall_status === "NOT_ELIGIBLE" ? "border-l-zus-red" : "border-l-zus-yellow";
  const ownBenefits = r.benefits.filter((b) => b.segments?.some((s) => s.parent === result.summary.applicant));
  const reasons = (ownBenefits.length ? ownBenefits : r.benefits).flatMap((b) => b.reasons).filter((x) => x.code !== "OTHER_PARENT_DATA").filter((x, i, arr) => arr.findIndex((y) => y.code === x.code) === i);
  return (
    <section className={`rounded-lg border border-zinc-200 border-l-8 bg-white p-4 sm:p-5 ${tone}`} aria-labelledby="status-h">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">{r.mode === "FORECAST" ? "Prognoza" : "Wynik"} · podgląd</p>
      <h2 id="status-h" className="mt-1 text-xl font-semibold">{STATUS_HEADLINE[r.overall_status]}</h2>
      {result.summary.ownTotal && r.overall_status !== "NOT_ELIGIBLE" && (
        <p className="mt-2 text-sm">Łącznie {result.summary.applicant === "MOTHER" ? "dla Ciebie" : "dla Ciebie (tata)"}:{" "}
          <strong className="text-lg">{formatMoney(result.summary.ownTotal)}</strong> brutto za {ownBenefits.reduce((n, b) => n + (b.days ?? 0), 0)} dni
          {" "}({ownBenefits.map((b) => LEAVE_LABEL[b.leave_type ?? ""]?.toLowerCase()).join(", ")}).</p>
      )}
      {reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {reasons.map((x) => (
            <li key={x.code}>{x.message}{" "}
              {!!x.legal_basis?.length && <span className="text-xs text-zinc-600">({x.legal_basis.map((l) => `${l.document === "USTAWA" ? "ustawa zasiłkowa" : l.document} ${l.location}`).join("; ")})</span>}
            </li>
          ))}
        </ul>
      )}
      {r.missing_data.length > 0 && (
        <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm">
          <p className="font-medium">Uzupełnij, aby dokończyć wyliczenie:</p>
          <ul className="mt-1 space-y-1">
            {r.missing_data.map((m) => (
              <li key={m.field} className="flex flex-wrap items-center gap-2">
                <span>{FIELD_QUESTION[m.field] ?? m.field}</span>
                {FIELD_STEP[m.field] && canEdit(FIELD_STEP[m.field]) && (
                  <button type="button" onClick={() => onEdit(FIELD_STEP[m.field])} className="text-zus-navy underline underline-offset-2">uzupełnij</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Remaining({ p }: { p: PreviewResult }) {
  const rem = p.summary.remaining!;
  const rows: [string, string][] = [
    ["Pula urlopu rodzicielskiego", `${p.summary.parentalPoolWeeks} tyg.`],
    ["Pozostało łącznie", `${rem.totalWeeks} tyg.`],
    ["Mama może jeszcze", `${rem.motherWeeks} tyg.`],
    ["Tata może", `do ${rem.fatherWeeks} tyg., w tym ${p.summary.nonTransferableWeeks} tylko dla niego`],
    ["Części do wykorzystania", `${rem.partsLeft} z ${p.summary.maxParts} (na rodzinę)`],
    ["Termin końcowy", formatDate(rem.finalDate)],
    ["Aby wykorzystać całość ciągiem", `start najpóźniej ${formatDate(rem.latestContinuousStart)}, wniosek do ${formatDate(rem.latestApplication)}`],
  ];
  return (
    <section className={card} aria-labelledby="rem-h">
      <h3 id="rem-h" className="text-lg font-semibold">Ile zostało i do kiedy</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-zinc-100 pb-1 sm:block">
            <dt className="text-zinc-600">{k}</dt><dd className="text-right font-medium sm:text-left">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type PlanErrors = NonNullable<EvaluateResponse["plan_errors"]>;
type ReturnToWork = NonNullable<EvaluateResponse["return_to_work"]>;

/** FE1-02: błąd planu → rodzaj urlopu, przy którym go pokazujemy (PAR-* → rodzicielski, PAT-* → ojcowski,
 * MAT-DUR-* → macierzyński); inne (np. MAT-SHARE-007) — lista pod osią czasu. */
const errorLeave = (ruleId: string): string | null => ruleId.startsWith("PAR-") ? "PARENTAL_LEAVE"
  : ruleId.startsWith("PAT-") ? "PATERNITY_LEAVE" : ruleId.startsWith("MAT-DUR-") ? "MATERNITY_LEAVE" : null;
const fractionText = (f: string) => f === "0.5" ? "½" : f === "0.25" ? "¼" : f.replace(".", ",");
const workText = (s: Seg) => s.work_fraction !== "0" ? ` + praca ${fractionText(s.work_fraction)} etatu` : "";
const segLabel = (s: Seg) => `${PARENT_LABEL[s.parent]}: ${LEAVE_LABEL[s.leave_type]}${s.reserved_9w ? " (9 tyg. tylko dla taty)" : ""}`
  + `${s.history ? " — wykorzystany" : ""}${workText(s)}`;
const amountText = (s: Seg) => s.history ? "—" : s.own ? formatMoney(s.amount) : "zależy od zarobków drugiego rodzica";

function Timeline({ segments, planErrors, returnToWork = [] }: {
  segments: Seg[]; planErrors: PlanErrors; returnToWork?: ReturnToWork;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (segments.length === 0) return null;
  const start = segments.map((s) => s.from).sort()[0];
  const end = segments.map((s) => s.to).sort().at(-1)!;
  const span = Math.max(daysBetween(start, end) + 1, 1);
  const lanes = (["MOTHER", "FATHER"] as const).filter((p) => segments.some((s) => s.parent === p));
  const today = todayIso();
  const pos = (d: string) => (daysBetween(start, d) / span) * 100;
  const todayPos = today >= start && today <= end ? pos(today) : null;
  const legend = [...new Set(segments.map((s) => s.leave_type))];
  // każdy błąd przy jednym okresie: pierwszym (nie historycznym) okresie danego rodzaju urlopu
  const owner = (e: PlanErrors[number]) => segments.findIndex((s) => !s.history && errorLeave(e.rule_id) === s.leave_type);
  const errorsOf = (s: Seg) => planErrors.filter((e) => owner(e) === segments.indexOf(s));
  const unplaced = planErrors.filter((e) => owner(e) < 0);
  // klawiatura: Tab po paskach, ← → do sąsiedniego paska (kolejność jak w tabeli), Escape zamyka szczegóły
  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "Escape") { setActive(null); return; }
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null || next < 0 || next >= segments.length) return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`tl-bar-${next}`)?.focus();
  };
  const detail = active !== null ? segments[active] : null;
  const errorLine = (e: PlanErrors[number]) => `Plan do poprawy: ${PLAN_ERROR[e.code] ?? e.code} (${e.rule_id})`;
  return (
    <section className={card} aria-labelledby="tl-h">
      <h3 id="tl-h" className="text-lg font-semibold">Oś czasu</h3>
      <p className="text-sm text-zinc-600">{formatDate(start)} – {formatDate(end)}. Paski jasne = już wykorzystane, kreskowane = do weryfikacji.
        <span className="sr-only"> Paski można przeglądać klawiszem Tab oraz strzałkami w lewo i w prawo.</span></p>
      <div className="mt-4 space-y-3" role="group" aria-label="Oś czasu urlopów">
        {lanes.map((lane) => {
          const rtw = returnToWork.find((r) => r.parent === lane);
          return (
            <div key={lane} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs font-medium text-zinc-700">{PARENT_LABEL[lane]}</span>
              <div className="relative h-8 min-w-0 flex-1 rounded bg-zinc-100">
                {segments.map((s, i) => s.parent !== lane ? null : (
                  <button key={i} id={`tl-bar-${i}`} type="button"
                    aria-label={`${segLabel(s)}, ${formatDate(s.from)} – ${formatDate(s.to)}, ${s.days} dni${errorsOf(s).length ? ", plan do poprawy" : ""}`}
                    aria-pressed={active === i} aria-controls="tl-detail"
                    onClick={() => setActive(i)} onFocus={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}
                    title={`${LEAVE_LABEL[s.leave_type]} ${formatDate(s.from)}–${formatDate(s.to)}`}
                    className={`absolute top-1 bottom-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-navy ${LEAVE_COLOR[s.leave_type]} ${s.history ? "opacity-35" : ""} ${s.work_fraction !== "0" ? "bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgba(255,255,255,.45)_4px_8px)]" : ""} ${s.needs_review ? "outline-2 outline-dashed outline-zus-yellow" : ""} ${errorsOf(s).length ? "ring-2 ring-zus-red" : ""} ${active === i ? "ring-2 ring-zinc-900" : ""}`}
                    style={{ left: `${pos(s.from)}%`, width: `max(${(s.days / span) * 100}%, 6px)` }} />
                ))}
                {todayPos !== null && <div aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-zinc-900" style={{ left: `${todayPos}%` }} />}
                {/* powrót do pracy = dzień po ostatnim okresie; przy końcu osi znacznik na prawej krawędzi */}
                {rtw && rtw.date >= start && (
                  <div aria-hidden="true" className="absolute -inset-y-1 w-0.5 bg-zus-red" style={{ left: `min(${Math.min(pos(rtw.date), 100)}%, calc(100% - 2px))` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p id="tl-detail" aria-live="polite" className="mt-2 min-h-5 text-sm text-zinc-800">
        {detail && <>{segLabel(detail)}: {formatDate(detail.from)} – {formatDate(detail.to)} ({detail.days} dni), stawka {pct(detail.rate, detail.work_fraction)}, {amountText(detail)}.</>}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-700" aria-hidden="true">
        {legend.map((l) => <li key={l} className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${LEAVE_COLOR[l]}`} />{LEAVE_LABEL[l]}</li>)}
        {todayPos !== null && <li className="flex items-center gap-1"><span className="inline-block h-3 w-0.5 bg-zinc-900" />dziś</li>}
        {returnToWork.length > 0 && <li className="flex items-center gap-1"><span className="inline-block h-3 w-0.5 bg-zus-red" />powrót do pracy</li>}
      </ul>
      {/* telefon i wąski tablet: karty zamiast tabeli — bez przewijania w poziomie */}
      <ul className="mt-4 space-y-2 md:hidden">
        {segments.map((s, i) => (
          <li key={i} className={`rounded border px-3 py-2 text-sm ${errorsOf(s).length ? "border-zus-red" : "border-zinc-200"} ${s.history ? "text-zinc-500" : ""} ${active === i ? "bg-zinc-50" : ""}`}>
            <p className="font-medium">{segLabel(s)}</p>
            <p>{formatDate(s.from)} – {formatDate(s.to)} <span className="text-zinc-500">({s.days} dni)</span></p>
            <p className="flex justify-between gap-2"><span>{pct(s.rate, s.work_fraction)}{s.needs_review ? " ?" : ""}</span>
              <span className="text-right">{amountText(s)}</span></p>
            {errorsOf(s).map((e, k) => <p key={k} className="mt-1 text-zus-red">{errorLine(e)}</p>)}
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Okresy urlopów i zasiłków</caption>
        <thead className="text-xs text-zinc-600"><tr><th className="py-1 pr-2">Kto</th><th className="pr-2">Okres</th><th className="pr-2">Od – do</th><th className="pr-2">Stawka</th><th className="text-right">Kwota</th></tr></thead>
        <tbody>
          {segments.map((s, i) => (
            <tr key={i} className={`border-t border-zinc-100 ${s.history ? "text-zinc-500" : ""} ${active === i ? "bg-zinc-50" : ""}`}>
              <td className="py-1.5 pr-2">{PARENT_LABEL[s.parent]}</td>
              <td className="pr-2">{LEAVE_LABEL[s.leave_type]}{s.reserved_9w ? " (9 tyg. tylko dla taty)" : ""}{s.history ? " — wykorzystany" : ""}{workText(s)}
                {errorsOf(s).map((e, k) => <span key={k} className="block text-zus-red">{errorLine(e)}</span>)}</td>
              <td className="whitespace-nowrap pr-2">{formatDate(s.from)} – {formatDate(s.to)} <span className="text-zinc-500">({s.days} dni)</span></td>
              <td className="whitespace-nowrap pr-2">{pct(s.rate, s.work_fraction)}{s.needs_review ? " ?" : ""}</td>
              <td className="whitespace-nowrap text-right">{amountText(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {returnToWork.length > 0 && (
        <p className="mt-3 text-sm">Powrót do pracy: {returnToWork.map((r) => `${PARENT_LABEL[r.parent] ?? r.parent} ${formatDate(r.date)}${r.part_time_fraction ? ` (${fractionText(r.part_time_fraction)} etatu)` : ""}`).join(" · ")}.</p>
      )}
      {unplaced.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-zus-red" role="alert">
          {unplaced.map((e, i) => <li key={i}>{errorLine(e)}</li>)}
        </ul>
      )}
    </section>
  );
}

const PLAN_ERROR: Record<string, string> = {
  PRE_BIRTH_TOO_EARLY: "urlop przed porodem może zacząć się najwcześniej 6 tygodni przed porodem — przyjęto dzień porodu.",
  MATERNITY_START_AFTER_BIRTH: "urlop macierzyński nie może zacząć się po porodzie — przyjęto dzień porodu.",
  WORK_WEEKS_EXCEED_POOL: "za dużo tygodni pracy w stosunku do puli urlopu.",
  WORK_FRACTION_TOO_HIGH: "praca w czasie rodzicielskiego najwyżej na ½ etatu.",
  PARENTAL_EXT_CAP_EXCEEDED: "łączny wymiar rodzicielskiego z pracą przekracza limit.",
  PARENTAL_PARTS_EXHAUSTED: "wykorzystano wszystkie części urlopu rodzicielskiego.",
  PATERNITY_AFTER_12_MONTHS: "ojcowski musi skończyć się przed ukończeniem przez dziecko 12 miesięcy.",
};

function VariantComparison({ pA, pB, variant, recommended, onChoose }: {
  pA: PreviewResult; pB: PreviewResult; variant: Variant; recommended: Variant; onChoose: (v: Variant) => void;
}) {
  const c = compareTotals(pA.summary.ownTotal, pB.summary.ownTotal)!;
  const small = negligible(c.diff, pB.summary.ownTotal!);
  const dl = pA.response.deadlines?.find((d) => d.code === "APP_COMBINED_815")?.date;
  const monthly = (p: PreviewResult) => p.summary.calcSteps.filter((s) => s.label.startsWith("Zasiłek za dzień"));
  const options: { v: Variant; title: string; p: PreviewResult; note: string }[] = [
    { v: "COMBINED_815", title: "A: 81,5% przez cały okres", p: pA, note: `Równe raty. Wymaga wniosku do ${formatDate(dl)} (21 dni od porodu).` },
    { v: "FULL_100_70", title: "B: 100% → 70%", p: pB, note: "Więcej na początku, mniej w rodzicielskim. Bez dodatkowego wniosku." },
  ];
  return (
    <section className={card} aria-labelledby="var-h">
      <h3 id="var-h" className="text-lg font-semibold">Porównanie wariantów wypłaty</h3>
      <p className="mt-1 text-sm text-zinc-700">
        {small ? <>Suma jest praktycznie taka sama (różnica {formatMoney(c.diff)}). Różni się rozkład w czasie.</>
          : <>Korzystniejszy jest wariant <strong>{c.better}</strong> — o <strong>{formatMoney(c.diff)}</strong> więcej.</>}
        {" "}Rekomendacja zależy od sytuacji (np. przy bliźniętach więcej tygodni płatnych 100%).
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Wybierz wariant do planu">
        {options.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={variant === o.v} onClick={() => onChoose(o.v)}
            className={`rounded-lg border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-zus-green-dark ${variant === o.v ? "border-zus-green-dark bg-zus-green-50" : "border-zinc-200 hover:border-zinc-400"}`}>
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{o.title}</span>
              {recommended === o.v && !small && <span className="rounded bg-zus-green-100 px-2 py-0.5 text-xs font-medium text-zus-navy">rekomendowany</span>}
            </span>
            <span className="mt-1 block text-xl font-semibold">{formatMoney(o.p.summary.ownTotal)}</span>
            <span className="block text-zinc-600">{monthly(o.p).map((s) => `${s.label.replace("Zasiłek za dzień przy ", "")}: ${formatMoney(s.value)}/dzień`).join(" · ")}</span>
            <span className="mt-1 block text-zinc-700">{o.note}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-600">Ryzyko wariantu A: jeśli w 1. roku życia dziecka nie wykorzystasz ani dnia rodzicielskiego, za rodzicielski dostaniesz 70%, a macierzyński wyrówna się do 100% dopiero na wniosek.</p>
    </section>
  );
}

function Deadlines({ response }: { response: EvaluateResponse }) {
  const list = response.deadlines ?? [];
  if (list.length === 0) return null;
  const today = todayIso();
  return (
    <section className={card} aria-labelledby="dl-h">
      <h3 id="dl-h" className="text-lg font-semibold">Kalendarz terminów</h3>
      <ol className="mt-3 space-y-2">
        {list.map((d, i) => {
          const left = daysBetween(today, d.date);
          const tone = left < 0 ? "text-zinc-500 line-through" : left <= 14 ? "text-zus-red" : "text-zus-ink";
          return (
            <li key={i} className="flex flex-col gap-0.5 border-l-4 border-zus-green-dark pl-3 text-sm sm:flex-row sm:items-baseline sm:gap-3">
              <span className={`shrink-0 font-semibold tabular-nums ${tone}`}>{formatDate(d.date)}</span>
              <span className="flex-1">{DEADLINE_LABEL[d.code] ?? d.code} <span className="text-zinc-500">· {PARENT_LABEL[d.who ?? ""] ?? d.who}</span></span>
              <span className={`shrink-0 text-xs ${tone}`}>{left < 0 ? "minął" : left === 0 ? "dziś" : `za ${left} dni`}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const SEVERITY = {
  CRITICAL: { label: "Czerwona flaga", cls: "border-l-zus-red", dot: "bg-zus-red" },
  WARNING: { label: "Uwaga", cls: "border-l-zus-yellow", dot: "bg-zus-yellow" },
  INFO: { label: "Dobrze wiedzieć", cls: "border-l-zus-green", dot: "bg-zus-green" },
} as const;

function RiskRadar({ response }: { response: EvaluateResponse }) {
  const list = [...(response.warnings ?? [])].sort((a, b) => ["CRITICAL", "WARNING", "INFO"].indexOf(a.severity) - ["CRITICAL", "WARNING", "INFO"].indexOf(b.severity));
  if (list.length === 0) return null;
  return (
    <section className={card} aria-labelledby="risk-h">
      <h3 id="risk-h" className="text-lg font-semibold">Radar ryzyk</h3>
      <ul className="mt-3 space-y-2">
        {list.map((w, i) => (
          <li key={i} className={`flex gap-3 border-l-4 bg-zus-gray-50 px-3 py-2 text-sm ${SEVERITY[w.severity].cls}`}>
            <span><span className="font-medium">{SEVERITY[w.severity].label}: </span>{w.message} <span className="text-xs opacity-70">({w.rule_id})</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Documents({ response, payer }: { response: EvaluateResponse; payer: string | null }) {
  const docs = response.missing_documents ?? [];
  if (docs.length === 0) return null;
  return (
    <section className={card} aria-labelledby="doc-h">
      <h3 id="doc-h" className="text-lg font-semibold">Co i gdzie złożyć</h3>
      {payer && <p className="mt-1 text-sm text-zinc-700">{PAYER_LABEL[payer]}</p>}
      <ul className="mt-3 divide-y divide-zinc-100 text-sm">
        {docs.map((d, i) => (
          <li key={i} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-4">
            <span className="font-medium">{DOC_LABEL[d.doc_type] ?? d.doc_type}</span>
            <span className="text-zinc-600">{d.submit_to ? SUBMIT_LABEL[d.submit_to] : ""}{d.provider ? ` · wystawia: ${d.provider}` : ""}{d.obtainable_by_zus ? " · ZUS może pobrać sam" : ""}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-zinc-600">Wysyłka wniosków i pobranie odpisu z USC w tym demo to SYMULACJA.</p>
    </section>
  );
}

/** FE1-11 etap 2: te same kafelki pism co na ścieżce „Szybkie pisma”; polecane wg `missing_documents`. */
function FormsToFill({ response, onOpen }: { response: EvaluateResponse; onOpen: (code: FormCode) => void }) {
  const recommended = formsForDocTypes((response.missing_documents ?? []).map((d) => d.doc_type));
  return (
    <section className={card} aria-labelledby="forms-h">
      <h3 id="forms-h" className="text-lg font-semibold">Pisma do wypełnienia</h3>
      <p className="mt-1 mb-4 text-sm text-zinc-700">
        {recommended.length > 0
          ? `Do Twojego planu pasuje: ${recommended.join(", ")}. Pozostałe pisma też możesz otworzyć.`
          : "Kliknij pismo, aby je wypełnić."}
      </p>
      <FormPicker onOpen={onOpen} recommended={recommended} headingLevel={4} />
    </section>
  );
}

function SupportBlock({ kind }: { kind: "loss" | "preterm" | "zazyciem" }) {
  const text = {
    loss: { h: "Nie jesteś sama(-sam)", p: "Pokazujemy tylko najważniejsze informacje. Szczegóły wyliczeń są niżej, rozwinięte na żądanie. Możesz skorzystać z pomocy psychologa w szpitalu, grup wsparcia dla rodziców po stracie dziecka oraz fundacji pomagających w żałobie okołoporodowej." },
    preterm: { h: "Wsparcie dla rodziców wcześniaków", p: "Fundacje i stowarzyszenia rodziców wcześniaków pomagają w opiece po wyjściu ze szpitala, rehabilitacji i kontaktach z innymi rodzicami." },
    zazyciem: { h: "Program „Za życiem”", p: "Asystent rodziny i koordynowana opieka — informacje w gminie lub ośrodku pomocy społecznej." },
  }[kind];
  return (
    <section className="rounded-lg border-l-8 border-l-zus-blue bg-zus-blue-50 p-4 text-sm text-zus-navy sm:p-5" aria-labelledby={`sup-${kind}`}>
      <h3 id={`sup-${kind}`} className="text-base font-semibold">{text.h}</h3>
      <p className="mt-1">{text.p}</p>
      <p className="mt-2 text-xs">Lista organizacji i przydatne linki: <a href={kind === "loss" ? "/przewodnik/spokojny" : "/przewodnik"} className="font-medium underline underline-offset-2">przewodnik</a>. Rzecznik Praw Pacjenta: 800 190 590.</p>
    </section>
  );
}

function CalcDetails({ p }: { p: PreviewResult }) {
  const r = p.response;
  return (
    <details className={card}>
      <summary className="cursor-pointer text-base font-semibold">Pokaż, jak to policzyliśmy</summary>
      <dl className="mt-3 space-y-2 text-sm">
        {p.summary.calcSteps.map((s) => (
          <div key={s.label}><dt className="font-medium">{s.label}: {formatMoney(s.value)}</dt><dd className="text-xs text-zinc-600">{s.basis}</dd></div>
        ))}
      </dl>
      <ul className="mt-3 space-y-1 text-sm">
        {r.benefits.filter((b) => b.total_amount_exact).map((b) => (
          <li key={`${b.leave_type}-${b.period?.from}`}>{LEAVE_LABEL[b.leave_type ?? ""]}: {b.days} dni × stawka dzienna = <strong>{formatMoney(b.total_amount_exact)}</strong>
            <span className="block text-xs text-zinc-600">reguły: {b.applied_rules.join(", ")}</span></li>
        ))}
      </ul>
      <ul className="mt-3 list-disc pl-5 text-xs text-zinc-600">
        {r.assumptions.map((a) => <li key={a.code}>{a.text}</li>)}
        <li>Tydzień = 7 dni, miesiąc = 30 dni (zasiłek za dzień = 1/30 kwoty miesięcznej). Kwoty brutto, przed zaliczką PIT.</li>
        <li>Jeszcze nieoceniane: {r.not_evaluated_rules.join(", ")}.</li>
      </ul>
    </details>
  );
}

function EngineCrossCheck({ answers, variant, preview }: { answers: Answers; variant: Variant; preview: PreviewResult }) {
  const [state, setState] = useState<{ key: string; r?: EvaluateResponse; error?: string } | null>(null);
  const request = useMemo(() => toEvaluateRequest(answers, variant), [answers, variant]);
  const key = JSON.stringify(request);
  useEffect(() => {
    let alive = true;
    evaluate(request).then((r) => alive && setState({ key, r }), (e: Error) => alive && setState({ key, error: e.message }));
    return () => { alive = false; };
  }, [key, request]);
  if (!state || state.key !== key) return <p className="text-xs text-zinc-500">Sprawdzam wynik w silniku API…</p>;
  if (state.error) return <p className="text-xs text-zinc-500">Silnik API niedostępny ({state.error}) — pokazujemy sam podgląd.</p>;
  const engine = state.r!;
  const mat = engine.benefits.find((b) => b.leave_type === "MATERNITY_LEAVE");
  const mine = preview.response.benefits.find((b) => b.leave_type === "MATERNITY_LEAVE" && b.total_amount_exact);
  const same = mat?.total_amount_exact && mine?.total_amount_exact
    && mat.total_amount_exact.slice(0, mat.total_amount_exact.indexOf(".") + 3) === mine.total_amount_exact.slice(0, mine.total_amount_exact.indexOf(".") + 3);
  return (
    <section className="rounded-lg border border-dashed border-zinc-300 p-4 text-xs text-zinc-700">
      <p className="font-medium">Kontrola krzyżowa z silnikiem API ({engine.engine}{API_MODE === "mock" ? ", tryb demo" : ""})</p>
      {mat ? (
        <p className="mt-1">Urlop macierzyński: status {mat.status}, {mat.days ?? "—"} dni, {formatMoney(mat.total_amount_exact)}
          {mine ? (same ? " — zgodne z podglądem ✓" : ` — podgląd: ${formatMoney(mine.total_amount_exact)} (różnica do wyjaśnienia)`) : ""}.</p>
      ) : <p className="mt-1">Silnik nie zwrócił urlopu macierzyńskiego dla tych danych (status {engine.overall_status}).</p>}
      <p className="mt-1 text-zinc-500">Rodzicielski, ojcowski, uzupełniający, terminy, ryzyka i dokumenty liczy tymczasowo podgląd w przeglądarce — docelowo silnik reguł (BE2).</p>
    </section>
  );
}
