"use client";

import { useEffect, useMemo, useState } from "react";
import { MatchedFormPicker } from "@/features/documents/FormPicker";
import { type FormCode, formsForDocTypes } from "@/features/documents/forms";
import { API_MODE, type EvaluateResponse, evaluate } from "@/lib/api";
import { formatDate, formatMoney, formatRate } from "@/lib/format";
import { RuleList, RuleText } from "../RuleList";
import { useApiParams } from "../preview/apiParams";
import { type PreviewResult, compareTotals, negligible, previewEvaluate } from "../preview/engine";
import { PARAMS } from "../preview/params";
import { daysBetween } from "../preview/exact";
import type { Answers, Variant } from "./answers";
import {
  DEADLINE_LABEL, DOC_LABEL, FIELD_QUESTION, FIELD_STEP, LEAVE_LABEL, PARENT_LABEL, PAYER_LABEL,
  STATUS_HEADLINE, SUBMIT_LABEL,
} from "./labels";
import { sicknessMode, todayIso, toEvaluateRequest, toSickLeaveRequest } from "./request";
import { TimelineView } from "./TimelineView";

const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";
/** Zasiłek przysługuje i ma niezerową kwotę (bez przeliczania - test tekstu kwoty). */
const hasPayout = (p: PreviewResult) => p.response.overall_status !== "NOT_ELIGIBLE"
  && !!p.summary.ownTotal && !/^0+(\.0*)?$/.test(p.summary.ownTotal);

export function Results({ answers, onEdit, canEdit = () => true, onOpenForm }: {
  answers: Answers; onEdit: (stepId: string) => void; canEdit?: (stepId: string) => boolean;
  /** FE1-11: klik w kafelek pisma na podsumowaniu (etap 2) */
  onOpenForm?: (code: FormCode) => void;
}) {
  // FE1-39: parametry z API (panel admina) - po ich wczytaniu plan liczy się od nowa
  const { version: paramsVersion } = useApiParams();
  // paramsVersion jest kluczem odświeżenia: PARAMS (moduł) zmieniają się po wczytaniu z API, odpowiedzi - nie
  const reqA = useMemo(() => ({ ...toEvaluateRequest(answers, "COMBINED_815"), params_version: paramsVersion }), [answers, paramsVersion]);
  const reqB = useMemo(() => ({ ...toEvaluateRequest(answers, "FULL_100_70"), params_version: paramsVersion }), [answers, paramsVersion]);
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
      {/* FE1-16: wsparcie zawsze na samej górze wyniku - najpierw człowiek, potem kwoty */}
      {sensitive && <SupportBlock kind="loss" />}
      {(answers.preterm || answers.zaZyciem) && !sensitive && <SupportBlock kind={answers.preterm ? "preterm" : "zazyciem"} />}
      <StatusHeader result={current} onEdit={onEdit} canEdit={canEdit} />
      <SickLeaveCard answers={answers} />
      {current.summary.remaining && <Remaining p={current} />}
      {/* bez okresów i błędów planu (np. brak prawa) nie pokazujemy pustego panelu */}
      {(current.summary.segments.length > 0 || (r.plan_errors ?? []).length > 0) && (sensitive ? (
        <details className={card}>
          <summary className="cursor-pointer text-base font-semibold">Pokaż okresy i kwoty</summary>
          <TimelineView segments={current.summary.segments} planErrors={r.plan_errors ?? []} returnToWork={r.return_to_work ?? []} />
        </details>
      ) : <TimelineView segments={current.summary.segments} planErrors={r.plan_errors ?? []} returnToWork={r.return_to_work ?? []} />)}
      {/* porównanie wariantów tylko gdy zasiłek przysługuje i jest kwota w obu wariantach */}
      {current.summary.combinedEligible && hasPayout(pA) && hasPayout(pB) && cmp && (
        <VariantComparison pA={pA} pB={pB} variant={variant} recommended={recommended} onChoose={setChosen} />
      )}
      <Deadlines response={r} />
      <RiskRadar response={r} />
      <Documents response={r} payer={current.summary.payer} />
      {onOpenForm && <FormsToFill response={r} onOpen={onOpenForm} />}
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
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">{r.mode === "FORECAST" ? "Prognoza" : "Wynik"}</p>
      <h2 id="status-h" className="mt-1 text-xl font-semibold">{STATUS_HEADLINE[r.overall_status]}</h2>
      {result.summary.ownTotal && r.overall_status !== "NOT_ELIGIBLE" && (
        <OwnTotal applicant={result.summary.applicant} total={result.summary.ownTotal}
          days={ownBenefits.reduce((n, b) => n + (b.days ?? 0), 0)}
          leaves={[...new Set(ownBenefits.map((b) => LEAVE_LABEL[b.leave_type ?? ""]).filter(Boolean))]} />
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

/** FE1-33: wyrazista suma dla wnioskodawcy - duża kwota, dni i rodzaje świadczeń. */
function OwnTotal({ applicant, total, days, leaves }: {
  applicant: string; total: string; days: number; leaves: string[];
}) {
  return (
    <div className="mt-4 rounded-lg border border-zus-green-100 bg-zus-green-50 p-4 sm:flex sm:items-end sm:justify-between sm:gap-6 sm:p-5" data-testid="own-total">
      <div>
        <p className="text-sm font-medium text-zus-green-dark">
          Łącznie {applicant === "MOTHER" ? "dla Ciebie" : "dla Ciebie (tata)"}
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-zus-ink sm:text-4xl">
          {formatMoney(total)}
          <span className="ml-2 align-middle text-base font-medium text-zinc-700">brutto</span>
        </p>
      </div>
      <div className="mt-3 sm:mt-0 sm:text-right">
        <p className="text-sm text-zinc-700">za <strong className="text-lg text-zus-ink">{days}</strong> dni</p>
        {leaves.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2 sm:justify-end" aria-label="Rodzaje świadczeń">
            {leaves.map((l) => (
              <li key={l} className="rounded-full border border-zus-green-100 bg-white px-3 py-1 text-xs font-medium text-zus-green-dark">{l}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Remaining({ p }: { p: PreviewResult }) {
  const rem = p.summary.remaining!;
  const rows: [string, string][] = [
    ...(rem.maternityWeeks !== null ? [["Urlop macierzyński - zostało",
      `${rem.maternityWeeks} tyg.${rem.maternityEnd ? `, do ${formatDate(rem.maternityEnd)} (licząc od dnia porodu)` : " (do przejęcia przez tatę)"}`] as [string, string]] : []),
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

function VariantComparison({ pA, pB, variant, recommended, onChoose }: {
  pA: PreviewResult; pB: PreviewResult; variant: Variant; recommended: Variant; onChoose: (v: Variant) => void;
}) {
  const c = compareTotals(pA.summary.ownTotal, pB.summary.ownTotal)!;
  const small = negligible(c.diff, pB.summary.ownTotal!);
  const dl = pA.response.deadlines?.find((d) => d.code === "APP_COMBINED_815")?.date;
  const monthly = (p: PreviewResult) => p.summary.calcSteps.filter((s) => s.label.startsWith("Zasiłek za dzień"));
  const options: { v: Variant; title: string; p: PreviewResult; note: string }[] = [
    { v: "COMBINED_815", title: `A: ${formatRate(PARAMS.MAT_RATE_COMBINED)} przez cały okres`, p: pA, note: `Równe raty. Wymaga wniosku do ${formatDate(dl)} (${PARAMS.APP_COMBINED_DEADLINE_DAYS} dni od porodu).` },
    { v: "FULL_100_70", title: "B: 100% → 70%", p: pB, note: "Więcej na początku, mniej w rodzicielskim. Bez dodatkowego wniosku." },
  ];
  return (
    <section className={card} aria-labelledby="var-h">
      <h3 id="var-h" className="text-lg font-semibold">Porównanie wariantów wypłaty</h3>
      <p className="mt-1 text-sm text-zinc-700">
        {small ? <>Suma jest praktycznie taka sama (różnica {formatMoney(c.diff)}). Różni się rozkład w czasie.</>
          : <>Korzystniejszy jest wariant <strong>{c.better}</strong> - o <strong>{formatMoney(c.diff)}</strong> więcej.</>}
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
            <span><span className="font-medium">{SEVERITY[w.severity].label}: </span>{w.message} <RuleText entry={w.rule_id} className="mt-0.5 block text-xs" /></span>
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
          ? `Do Twojego planu pasuje: ${recommended.join(", ")}.`
          : "Pisma dobieramy do Twojego planu."}
      </p>
      <MatchedFormPicker onOpen={onOpen} recommended={recommended} headingLevel={4} />
    </section>
  );
}

function HeartIcon() {
  return (
    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-zus-blue">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2 0 3.5 1.1 4.3 2.6.8-1.5 2.3-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
    </span>
  );
}

function SupportBlock({ kind }: { kind: "loss" | "preterm" | "zazyciem" }) {
  const text = {
    loss: { h: "Nie jesteś sama(-sam)", p: "Pokazujemy tylko najważniejsze informacje. Szczegóły wyliczeń są niżej, rozwinięte na żądanie. Możesz skorzystać z pomocy psychologa w szpitalu, grup wsparcia dla rodziców po stracie dziecka oraz fundacji pomagających w żałobie okołoporodowej." },
    preterm: { h: "Wsparcie dla rodziców wcześniaków", p: "Fundacje i stowarzyszenia rodziców wcześniaków pomagają w opiece po wyjściu ze szpitala, rehabilitacji i kontaktach z innymi rodzicami." },
    zazyciem: { h: "Program „Za życiem”", p: "Asystent rodziny i koordynowana opieka - informacje w gminie lub ośrodku pomocy społecznej." },
  }[kind];
  return (
    <section className="flex gap-4 rounded-2xl border border-zus-blue/30 bg-zus-blue-50 p-5 text-zus-navy sm:p-6" aria-labelledby={`sup-${kind}`}>
      <HeartIcon />
      <div className="min-w-0">
        <h3 id={`sup-${kind}`} className="text-lg font-semibold">{text.h}</h3>
        <p className="mt-1 text-base">{text.p}</p>
        <p className="mt-3 text-sm">Lista organizacji i przydatne linki: <a href={kind === "loss" ? "/wsparcie/po-stracie" : "/wsparcie"} target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">przewodnik<span className="sr-only"> (otwiera się w nowej karcie - wynik zostaje)</span></a>. Rzecznik Praw Pacjenta: <a href="tel:800190590" className="font-semibold underline underline-offset-2">800 190 590</a>.</p>
      </div>
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
            <span className="block text-xs text-zinc-600">Przepisy:</span><RuleList ids={b.applied_rules} className="text-xs text-zinc-600" /></li>
        ))}
      </ul>
      <ul className="mt-3 list-disc pl-5 text-xs text-zinc-600">
        {r.assumptions.map((a) => <li key={a.code}>{a.text}</li>)}
        <li>Tydzień = 7 dni, miesiąc = 30 dni (zasiłek za dzień = 1/30 kwoty miesięcznej). Kwoty brutto, przed zaliczką PIT.</li>
        {r.not_evaluated_rules.length > 0 && <li>Jeszcze nieoceniane:<RuleList ids={r.not_evaluated_rules} className="mt-1" /></li>}
      </ul>
    </details>
  );
}

/** FE1-39: wynik silnika reguł (POST /api/evaluate) dla tych samych odpowiedzi. Plan obojga rodziców liczy się
 * w przeglądarce na parametrach z API; urlop macierzyński, status i braki danych sprawdza silnik. Przy rozbieżności
 * rozstrzyga silnik - karta jest wtedy wyróżniona i pokazuje jego uzasadnienie. */
function EngineCrossCheck({ answers, variant, preview }: { answers: Answers; variant: Variant; preview: PreviewResult }) {
  const [state, setState] = useState<{ key: string; r?: EvaluateResponse; error?: string } | null>(null);
  const request = useMemo(() => toEvaluateRequest(answers, variant), [answers, variant]);
  const key = JSON.stringify(request);
  useEffect(() => {
    let alive = true;
    evaluate(request).then((r) => alive && setState({ key, r }), (e: Error) => alive && setState({ key, error: e.message }));
    return () => { alive = false; };
  }, [key, request]);
  if (!state || state.key !== key) return <p className="text-xs text-zinc-500" role="status">Sprawdzam wynik w silniku reguł…</p>;
  if (state.error) return <p className="text-xs text-zinc-500">Silnik reguł niedostępny ({state.error}) - wynik policzony w przeglądarce na kopii parametrów.</p>;
  const engine = state.r!;
  const mat = engine.benefits.find((b) => b.leave_type === "MATERNITY_LEAVE");
  const mine = preview.response.benefits.find((b) => b.leave_type === "MATERNITY_LEAVE" && b.total_amount_exact);
  const cents = (v: string) => v.slice(0, v.indexOf(".") < 0 ? v.length : v.indexOf(".") + 3);
  const same = !mat || !mine || (mat.status === mine.status
    && (!mat.total_amount_exact || !mine.total_amount_exact || cents(mat.total_amount_exact) === cents(mine.total_amount_exact)));
  return (
    <section aria-labelledby="engine-h" className={same ? "rounded-lg border border-dashed border-zinc-300 p-4 text-xs text-zinc-700"
      : "rounded-lg border-2 border-zus-yellow bg-amber-50 p-4 text-sm text-zinc-800"}>
      <p id="engine-h" className="font-medium">Sprawdzenie w silniku reguł ({engine.engine}{API_MODE === "mock" ? ", tryb demo" : ""})</p>
      {mat ? (
        <p className="mt-1">Urlop macierzyński: {STATUS_HEADLINE[mat.status] ?? mat.status}, {mat.days ?? "-"} dni, {formatMoney(mat.total_amount_exact)}
          {mine ? (same ? " - zgodne z planem ✓" : ` - plan w przeglądarce: ${formatMoney(mine.total_amount_exact)}. Rozstrzyga wynik silnika.`) : ""}</p>
      ) : <p className="mt-1">Wynik silnika dla tych danych: {STATUS_HEADLINE[engine.overall_status] ?? engine.overall_status}.</p>}
      {!same && mat?.reasons.map((x) => <p key={x.code} className="mt-1">{x.message}</p>)}
      <p className="mt-1 text-zinc-500">Plan obojga rodziców (rodzicielski, ojcowski, terminy) liczymy w przeglądarce na parametrach z panelu administratora.</p>
    </section>
  );
}

const BENEFIT_TYPE_LABEL: Record<string, string> = {
  EMPLOYER_SICK_PAY: "Wynagrodzenie chorobowe (płaci pracodawca)", SICKNESS_BENEFIT: "Zasiłek chorobowy",
  REHABILITATION_BENEFIT: "Świadczenie rehabilitacyjne",
};

/** FE1-41, FE1-43: zasiłek chorobowy w ciąży (wymaganie a) - zawsze dla mamy w ciąży: zasady z parametrów (stawka,
 * 270 dni, kto płaci, okres wyczekiwania, świadczenie rehabilitacyjne) i wynik silnika reguł: przy podanym L4 okres
 * i kwoty, bez L4 - ocena prawa „gdyby zwolnienie zaczęło się dziś” (także brak prawa z uzasadnieniem). Kwoty tylko z API. */
function SickLeaveCard({ answers }: { answers: Answers }) {
  const { version: paramsVersion } = useApiParams(); // MONTH_AS_DAYS w hipotetycznym L4 pochodzi z parametrów API
  const built = useMemo(() => toSickLeaveRequest(answers), [answers, paramsVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const request = built?.request ?? null;
  const hypothetical = built?.hypothetical ?? true;
  const key = request ? JSON.stringify(request) : null;
  const [state, setState] = useState<{ key: string; r?: EvaluateResponse; error?: string } | null>(null);
  useEffect(() => {
    if (!request || !key) return;
    let alive = true;
    evaluate(request).then((r) => alive && setState({ key, r }), (e: Error) => alive && setState({ key, error: e.message }));
    return () => { alive = false; };
  }, [key, request]);
  if (!request) return null;
  const loading = !state || state.key !== key;
  const r = !loading && !state.error ? state.r! : null;
  const paid = (r?.benefits ?? []).filter((b) => b.total_amount_exact);
  const refused = r?.overall_status === "NOT_ELIGIBLE";
  // informacja z odpowiedzi (nie ocena prawa) - ta sama logika co tryb w żądaniu; nie przy wyniku ELIGIBLE silnika
  const noSicknessInsurance = sicknessMode(answers) === "NONE" && r?.overall_status !== "ELIGIBLE";
  return (
    <section className={`${card} ${refused ? "border-l-8 border-l-zus-red" : ""}`} aria-labelledby="sick-h" aria-live="polite">
      <h3 id="sick-h" className="text-lg font-semibold">Zasiłek chorobowy w ciąży{r ? `: ${STATUS_HEADLINE[r.overall_status] ?? r.overall_status}` : ""}</h3>
      <p className="mt-1 text-sm text-zinc-700">{hypothetical
        ? `Gdyby zwolnienie lekarskie (L4) zaczęło się dziś i trwało ${PARAMS.MONTH_AS_DAYS} dni - wynik silnika reguł dla Twoich danych:`
        : `Twoje zwolnienie od ${formatDate(answers.sickLeaveFrom)}${answers.sickLeaveTo ? ` do ${formatDate(answers.sickLeaveTo)}` : ""} - wynik silnika reguł:`}</p>
      {loading && <p className="mt-2 text-sm text-zinc-600" role="status">Sprawdzam w silniku reguł…</p>}
      {state?.error && state.key === key && <p className="mt-2 text-sm text-zinc-600">Silnik reguł jest teraz niedostępny ({state.error}) - poniżej zasady ogólne.</p>}
      {refused && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-zus-red">Zasiłek chorobowy teraz Ci nie przysługuje - przyczyna poniżej.</p>}
      {noSicknessInsurance && !refused && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-zinc-800">Z Twoich odpowiedzi wynika, że nie masz ubezpieczenia chorobowego.
          {" "}Bez niego zasiłek chorobowy nie przysługuje - sprawdź tytuł ubezpieczenia (np. w PUE/eZUS), jeśli nie masz pewności.</p>
      )}
      {r && r.overall_status === "NEEDS_DATA" && r.missing_data.length === 0 && (
        <p className="mt-2 text-sm text-zinc-700">Silnik nie rozstrzygnął prawa dla tych danych - wymaga to weryfikacji w ZUS.</p>
      )}
      {r && <ul className="mt-3 space-y-2 text-sm">
        {r.benefits.map((b, i) => (
          <li key={i} className="border-t border-zinc-100 pt-2">
            <p className="font-medium">{BENEFIT_TYPE_LABEL[b.benefit_type] ?? b.benefit_type}: {STATUS_HEADLINE[b.status] ?? b.status}</p>
            {b.period?.from && <p>{formatDate(b.period.from)} – {formatDate(b.period.to)}{b.days ? ` (${b.days} dni)` : ""}{b.rate ? `, ${formatRate(b.rate)} podstawy` : ""}</p>}
            {b.total_amount_exact && <p>Łącznie <strong>{formatMoney(b.total_amount_exact)}</strong> brutto ({formatMoney(b.daily_amount_exact)} dziennie)
              {b.status !== "ELIGIBLE" ? " - wstępnie, do uzupełnienia danych niżej" : ""}</p>}
            {b.reasons.map((x) => <p key={x.code} className="text-zinc-700">{x.message}</p>)}
          </li>
        ))}
      </ul>}
      {r && r.missing_data.length > 0 && (
        <p className="mt-2 text-sm">Do pełnego wyliczenia potrzeba: {r.missing_data.map((m) => (FIELD_QUESTION[m.field] ?? m.field).replace(/\.$/, "")).join("; ")}.</p>
      )}
      <SicknessRules />
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-zus-navy">Pokaż, jak to policzyliśmy - zasiłek chorobowy</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {paid.map((b, i) => (
            <li key={i}>{BENEFIT_TYPE_LABEL[b.benefit_type] ?? b.benefit_type}: podstawa {formatMoney(b.base?.amount_exact ?? null)} × {formatRate(b.rate ?? "0")}
              {" "}÷ {PARAMS.MONTH_AS_DAYS} = {formatMoney(b.daily_amount_exact)} dziennie; × {b.days ?? 0} dni = {formatMoney(b.total_amount_exact)}.
              {b.explanation && <span className="block whitespace-pre-line text-xs text-zinc-600">{b.explanation}</span>}
              <span className="block text-xs text-zinc-600">Przepisy:</span><RuleList ids={b.applied_rules} className="text-xs text-zinc-600" /></li>
          ))}
          {paid.length === 0 && <li>Brak kwoty - status i uzasadnienie wyżej.</li>}
          <li className="text-xs text-zinc-600">{hypothetical
            ? `Założenie: zwolnienie lekarskie w ciąży (kod B) od dziś przez ${PARAMS.MONTH_AS_DAYS} dni z powodu choroby, potwierdzone e-ZLA, bez wcześniejszych zwolnień w tym roku.`
            : "Założenie z Twojej odpowiedzi „jestem na zwolnieniu”: niezdolność do pracy z powodu choroby, potwierdzona zaświadczeniem lekarskim (e-ZLA)."}</li>
          {r?.assumptions.map((x) => <li key={x.code} className="text-xs text-zinc-600">{x.text}</li>)}
          {r && r.not_evaluated_rules.length > 0 && <li className="text-xs text-zinc-600">Jeszcze nieoceniane:<RuleList ids={r.not_evaluated_rules} /></li>}
        </ul>
      </details>
    </section>
  );
}

/** FE1-43: zasady zasiłku chorobowego w ciąży - liczby z parametrów (panel admina), nie wpisane w tekst. */
function SicknessRules() {
  const p = PARAMS;
  return (
    <div className="mt-3 rounded-md bg-zus-gray-50 p-3 text-sm">
      <p className="font-medium">Jak to działa</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li>Zwolnienie w ciąży (kod B na e-ZLA): {formatRate(p.SICK_RATE_FULL)} podstawy wymiaru - zamiast zwykłych {formatRate(p.SICK_RATE_STD)}.</li>
        <li>Najdłużej {p.BENEFIT_PERIOD_PREGNANCY_TB_DAYS} dni w okresie zasiłkowym (w ciąży dłużej niż zwykle).</li>
        <li>Na umowie o pracę pierwsze {p.SICK_PAY_DAYS_STD} dni zwolnienia w roku ({p.SICK_PAY_DAYS_50PLUS} dni od roku następującego po roku, w którym kończysz {p.SICK_PAY_AGE_THRESHOLD} lat)
          {" "}płaci pracodawca jako wynagrodzenie chorobowe. Potem zasiłek: wypłaca pracodawca, gdy zgłasza do ubezpieczenia więcej niż {p.PAYER_INSURED_THRESHOLD} osób, a w pozostałych przypadkach ZUS.</li>
        <li>Prawo do zasiłku po okresie wyczekiwania: {p.WAITING_DAYS_MANDATORY} dni nieprzerwanego ubezpieczenia obowiązkowego (np. umowa o pracę)
          {" "}albo {p.WAITING_DAYS_VOLUNTARY} dni dobrowolnego (działalność, zlecenie). Krótszy okres ubezpieczenia = brak zasiłku (z wyjątkami, które ocenia silnik).</li>
        <li>Bez ubezpieczenia chorobowego (np. ulga na start, student na zleceniu) zasiłek chorobowy nie przysługuje.</li>
        <li>Po wyczerpaniu {p.BENEFIT_PERIOD_PREGNANCY_TB_DAYS} dni, gdy dalsze leczenie rokuje powrót do pracy, można wnioskować o świadczenie rehabilitacyjne (w tej wersji tylko informacja).</li>
        <li>Zwolnienie (e-ZLA) lekarz wysyła elektronicznie do ZUS i płatnika składek. Pisma, które mogą być potrzebne (np. Z-3, ZAS-53), są w sekcji „Pisma do wypełnienia”.</li>
      </ul>
    </div>
  );
}
