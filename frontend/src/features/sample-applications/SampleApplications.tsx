"use client";

// FE1-38: wybór przykładowego wniosku (GET /api/cases) albo upload PDF (POST /api/cases/upload), wynik silnika reguł
// z weryfikacją ubezpieczenia (insurance_verification) i porównaniem z decyzją (POST /api/cases/{id}/evaluate).
// Wymóg zadania § 4 i § 6. Dane spraw są syntetyczne; upload nie zapisuje pliku i nie używa AI (M16e, D22).
import { useEffect, useRef, useState } from "react";
import {
  API_MODE, ApiError, type CaseEvaluation, type CaseSummary, type CaseUploadResult, type EvaluateResponse, evaluate,
  evaluateCase, listCases, uploadCase,
} from "@/lib/api";
import { STATUS_LABEL, formatDate, formatMoney, formatRate } from "@/lib/format";
import { RuleList } from "../main-flow/RuleList";
import { PARAMS } from "../main-flow/preview/params";
import { LEAVE_LABEL } from "../main-flow/wizard/labels";

const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";
const btnGhost = "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zus-navy hover:bg-zinc-50 disabled:opacity-50";

const BENEFIT_LABEL: Record<string, string> = {
  EMPLOYER_SICK_PAY: "Wynagrodzenie chorobowe", SICKNESS_BENEFIT: "Zasiłek chorobowy", REHABILITATION_BENEFIT: "Świadczenie rehabilitacyjne",
  MATERNITY_BENEFIT: "Zasiłek macierzyński", MATERNITY_EQUIVALENT_ALLOWANCE: "Zasiłek w wysokości macierzyńskiego",
};
const EVENT_LABEL: Record<string, string> = {
  BIRTH: "Urodzenie dziecka", ADOPTION: "Przysposobienie", FOSTER: "Rodzina zastępcza",
  PREGNANCY_INCAPACITY: "Niezdolność do pracy w ciąży", SICKNESS: "Choroba",
};
const TRI_LABEL: Record<string, string> = { TRUE: "tak", FALSE: "nie", UNKNOWN: "brak danych", NOT_REQUIRED: "nie dotyczy" };
const MODE_LABEL: Record<string, string> = { MANDATORY: "obowiązkowe", VOLUNTARY: "dobrowolne", NONE: "brak" };
const MATCH_LABEL: Record<string, { text: string; cls: string }> = {
  MATCH: { text: "Zgodne z decyzją", cls: "bg-zus-green-50 text-zus-green-dark" },
  MATCH_WITH_TOLERANCE: { text: "Zgodne z tolerancją ±0,01 zł/dzień", cls: "bg-zus-green-50 text-zus-green-dark" },
  MISMATCH: { text: "Różnica względem decyzji", cls: "bg-red-50 text-zus-red" },
  NO_EXPECTED: { text: "Brak decyzji do porównania", cls: "bg-zinc-100 text-zinc-700" },
};
const FIELD_LABEL: Record<string, string> = {
  status: "Status", benefit_type: "Świadczenie", leave_type: "Rodzaj urlopu", period_from: "Okres od", period_to: "Okres do",
  base_amount: "Podstawa wymiaru", rate: "Stawka", total_amount: "Kwota łącznie",
};
const UPLOAD_METHOD: Record<string, string> = {
  FIXTURE_MATCH: "Rozpoznany przykładowy wniosek - dane wczytane bez udziału AI.",
  MANUAL_REQUIRED: "Nie rozpoznano wniosku - uzupełnij dane w kreatorze (aplikacja nie odczytuje treści dokumentów przez AI).",
  AI_EXTRACTION: "Odczyt AI (wyłączony w tej wersji).",
};

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; response: EvaluateResponse; evaluation?: CaseEvaluation; upload?: CaseUploadResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (API_MODE === "mock") return;
    let alive = true;
    listCases().then((l) => alive && setCases(l.items), (e) => alive && setError(errorText(e, "Nie udało się wczytać listy wniosków.")));
    return () => { alive = false; };
  }, []);

  useEffect(() => { if (result) resultRef.current?.focus(); }, [result]);

  const run = async (c: CaseSummary) => {
    setSelected(c.case_id);
    setBusy(true);
    setError(null);
    try {
      const evaluation = await evaluateCase(c.case_id);
      setResult({ title: c.title, response: evaluation.result, evaluation });
    } catch (e) {
      setError(errorText(e, "Nie udało się ocenić wniosku."));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    setSelected(null);
    setBusy(true);
    setError(null);
    try {
      const up = await uploadCase(file);
      const response = await evaluate(up.extracted_input);
      setResult({ title: `Wgrany plik: ${file.name}`, response, upload: up });
    } catch (e) {
      setError(errorText(e, "Nie udało się wczytać pliku."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-zus-green-dark">Przykładowe wnioski</p>
        <h1 className="text-2xl font-semibold text-zus-navy">Sprawdź wniosek i ubezpieczenie</h1>
        <p className="mt-1 text-sm text-zinc-600">Wybierz przykładowy wniosek albo wgraj plik PDF. Silnik reguł sprawdzi, czy osoba ma
          ubezpieczenie chorobowe, ustali prawo do zasiłku i kwotę, a przy wniosku z decyzją porówna wynik z decyzją.
          Dane są fikcyjne; plik nie jest zapisywany.</p>
      </header>

      {API_MODE === "mock" && <p className="text-sm text-zinc-700">Tryb demo bez backendu - przykładowe wnioski są niedostępne.</p>}
      {error && <p role="alert" className="rounded-md border border-zus-red bg-red-50 px-3 py-2 text-sm text-zus-red">{error}</p>}

      <section className={card} aria-labelledby="cases-h">
        <h2 id="cases-h" className="text-lg font-semibold">Wybierz przykładowy wniosek</h2>
        {!cases && !error && API_MODE !== "mock" && <p role="status" className="mt-2 text-sm text-zinc-600">Wczytuję wnioski…</p>}
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {(cases ?? []).map((c) => (
            <li key={c.case_id} className={`flex flex-col gap-2 rounded-md border p-3 text-sm ${selected === c.case_id ? "border-zus-green-dark bg-zus-green-50" : "border-zinc-200"}`}>
              <p className="font-medium">{c.title}</p>
              <p className="text-xs text-zinc-600">{EVENT_LABEL[c.event_type ?? ""] ?? c.event_type}
                {" · "}{c.source === "SYNTHETIC" ? "dane syntetyczne" : "przykład z materiałów"}{c.has_expected ? " · z decyzją do porównania" : ""}</p>
              <button type="button" className={`${btnGhost} self-start`} disabled={busy} onClick={() => void run(c)}
                aria-label={`Sprawdź wniosek: ${c.title}`}>{busy && selected === c.case_id ? "Sprawdzam…" : "Sprawdź"}</button>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="upload-h">
        <h2 id="upload-h" className="text-lg font-semibold">Albo wgraj wniosek (PDF)</h2>
        <p className="mt-1 text-sm text-zinc-600">Rozpoznajemy przykładowe formularze. Treść innych dokumentów nie jest odczytywana
          automatycznie - wtedy wskażemy, jakie dane uzupełnić. Maksymalnie 10 MB.</p>
        <label className="mt-3 block text-sm font-medium">Plik PDF
          <input type="file" accept="application/pdf,.pdf" disabled={busy || API_MODE === "mock"}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zus-navy file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        </label>
      </section>

      {result && (
        <section className="space-y-4" aria-live="polite">
          <h2 ref={resultRef} tabIndex={-1} className="text-xl font-semibold text-zus-navy focus:outline-none">Wynik: {result.title}</h2>
          {result.upload && <UploadInfo upload={result.upload} />}
          <Verification response={result.response} />
          <BenefitsCard response={result.response} />
          {result.evaluation && <Comparison evaluation={result.evaluation} />}
          <CalcDetails response={result.response} />
        </section>
      )}
    </div>
  );
}

function UploadInfo({ upload }: { upload: CaseUploadResult }) {
  return (
    <div className={card}>
      <p className="text-sm">{UPLOAD_METHOD[upload.extraction_method] ?? upload.extraction_method}</p>
      {upload.missing_fields.length > 0 && (
        <><p className="mt-2 text-sm font-medium">Brakujące dane:</p>
          <ul className="mt-1 list-disc pl-5 text-sm">{upload.missing_fields.map((f) => <li key={f}><code className="break-all">{f}</code></li>)}</ul></>
      )}
      {(upload.warnings ?? []).map((w) => <p key={w} className="mt-1 text-xs text-zinc-600">{w}</p>)}
    </div>
  );
}

function Verification({ response }: { response: EvaluateResponse }) {
  const v = response.insurance_verification;
  return (
    <div className={card}>
      <h3 className="text-lg font-semibold">Weryfikacja ubezpieczenia</h3>
      {!v ? <p className="mt-1 text-sm text-zinc-600">Brak danych o tytułach ubezpieczenia - nie da się zweryfikować.</p> : (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-zinc-600">Ubezpieczenie chorobowe w dniu zdarzenia</dt><dd className="font-medium">{TRI_LABEL[v.sickness_insured_on_event_date ?? "UNKNOWN"]}</dd></div>
          <div><dt className="text-zinc-600">Rodzaj ubezpieczenia</dt><dd className="font-medium">{v.insurance_mode ? MODE_LABEL[v.insurance_mode] : "brak danych"}</dd></div>
          <div><dt className="text-zinc-600">Nieprzerwane ubezpieczenie</dt><dd className="font-medium">{v.continuous_insurance_days ?? "-"} dni</dd></div>
          <div><dt className="text-zinc-600">Okres wyczekiwania</dt><dd className="font-medium">{TRI_LABEL[v.waiting_period_met ?? "UNKNOWN"]}</dd></div>
        </dl>
      )}
      {v?.rule_ids?.length ? <><p className="mt-2 text-xs text-zinc-600">Przepisy:</p><RuleList ids={v.rule_ids} className="text-xs text-zinc-600" /></> : null}
    </div>
  );
}

function BenefitsCard({ response }: { response: EvaluateResponse }) {
  return (
    <div className={card}>
      <h3 className="text-lg font-semibold">Prawo do zasiłku: {STATUS_LABEL[response.overall_status] ?? response.overall_status}</h3>
      <ul className="mt-3 space-y-3 text-sm">
        {response.benefits.map((b, i) => (
          <li key={i} className="border-t border-zinc-100 pt-2">
            <p className="font-medium">{LEAVE_LABEL[b.leave_type ?? ""] ?? BENEFIT_LABEL[b.benefit_type] ?? b.benefit_type}: {STATUS_LABEL[b.status] ?? b.status}</p>
            {b.period && <p>{formatDate(b.period.from)} – {formatDate(b.period.to)}{b.days ? ` (${b.days} dni)` : ""}</p>}
            {b.total_amount_exact && <p>Stawka {formatRate(b.rate)}, {formatMoney(b.daily_amount_exact)} dziennie, łącznie <strong>{formatMoney(b.total_amount_exact)}</strong> brutto</p>}
            {b.reasons.map((x) => <p key={x.code} className="text-zinc-700">{x.message}</p>)}
          </li>
        ))}
      </ul>
      {response.missing_data.length > 0 && (
        <><p className="mt-3 text-sm font-medium">Brakuje danych:</p>
          <ul className="mt-1 list-disc pl-5 text-sm">{response.missing_data.map((m) => <li key={m.field}><code className="break-all">{m.field}</code></li>)}</ul></>
      )}
    </div>
  );
}

function Comparison({ evaluation }: { evaluation: CaseEvaluation }) {
  const m = MATCH_LABEL[evaluation.overall_match];
  return (
    <div className={card}>
      <h3 className="text-lg font-semibold">Porównanie z decyzją</h3>
      <p className={`mt-2 inline-block rounded px-2 py-1 text-sm font-medium ${m.cls}`}>{m.text}</p>
      {evaluation.comparison.length > 0 && (
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {evaluation.comparison.map((c) => (
            <li key={c.field} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-4">
              <span className="font-medium">{FIELD_LABEL[c.field] ?? c.field}</span>
              <span className="break-words">decyzja: {c.expected ?? "-"} · silnik: {c.actual ?? "-"}{" "}
                <span className={c.match || c.match_with_tolerance ? "text-zus-green-dark" : "text-zus-red"}>{c.match ? "✓" : c.match_with_tolerance ? "≈" : "✗"}</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CalcDetails({ response }: { response: EvaluateResponse }) {
  const withAmount = response.benefits.filter((b) => b.total_amount_exact);
  return (
    <details className={card}>
      <summary className="cursor-pointer text-base font-semibold">Pokaż, jak to policzyliśmy</summary>
      <ul className="mt-3 space-y-2 text-sm">
        {withAmount.map((b, i) => (
          <li key={i}>
            <p className="font-medium">{LEAVE_LABEL[b.leave_type ?? ""] ?? BENEFIT_LABEL[b.benefit_type] ?? b.benefit_type}</p>
            <p>Podstawa {formatMoney(b.base?.amount_exact ?? null)} × stawka {formatRate(b.rate)} ÷ {PARAMS.MONTH_AS_DAYS} = {formatMoney(b.daily_amount_exact)} dziennie;
              {" "}× {b.days ?? 0} dni = {formatMoney(b.total_amount_exact)}.</p>
            {b.explanation && <p className="whitespace-pre-line text-zinc-700">{b.explanation}</p>}
            <p className="text-xs text-zinc-600">Przepisy:</p><RuleList ids={b.applied_rules} className="text-xs text-zinc-600" />
          </li>
        ))}
        {withAmount.length === 0 && <li>Brak kwoty do wyliczenia - status i uzasadnienie wyżej.</li>}
      </ul>
      <ul className="mt-3 list-disc pl-5 text-xs text-zinc-600">
        {response.assumptions.map((a) => <li key={a.code}>{a.text}</li>)}
        {response.not_evaluated_rules.length > 0 && <li>Jeszcze nieoceniane:<RuleList ids={response.not_evaluated_rules} className="mt-1" /></li>}
      </ul>
    </details>
  );
}
