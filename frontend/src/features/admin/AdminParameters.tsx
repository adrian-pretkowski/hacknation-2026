"use client";

// FE1-03: panel admina parametrów prawnych - lista (wartość, jednostka, źródło, status, wersja, valid_from),
// edycja z datą obowiązywania i powodem (PUT /api/admin/parameters, konflikt wersji → 409) oraz podgląd skutku
// na przykładowej sprawie (POST /api/evaluate) - zmiana jest widoczna w kolejnym wyliczeniu bez restartu (BE2-05).
import { useEffect, useMemo, useState } from "react";
import {
  API_MODE, ApiError, type EvaluateResponse, type Parameter, type ParameterList, evaluate, listParameters,
  resetParameters, updateParameters,
} from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { RuleList } from "../main-flow/RuleList";
import { PARAMS } from "../main-flow/preview/params";
import { STATUS_HEADLINE } from "../main-flow/wizard/labels";
import { DEMO_REQUEST } from "./demoRequest";

const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";
const inputCls = "w-full rounded-md border border-zinc-500 bg-white px-3 py-2 text-sm focus:border-zus-navy focus:outline-none focus:ring-2 focus:ring-zus-navy/30";
const btn = "rounded-md bg-zus-navy px-4 py-2 text-sm font-semibold text-white hover:bg-zus-navy/90 disabled:opacity-50";
const btnGhost = "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zus-navy hover:bg-zinc-50";
const STATUS_LABEL: Record<string, string> = { CONFIRMED: "potwierdzony", UNCONFIRMED: "niepotwierdzony", MISSING: "brak wartości" };

/** Wartość parametru do wyświetlenia / edycji: tabela jako JSON, liczba jako tekst. */
const show = (v: unknown) => v === null || v === undefined ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v);
const isTable = (p: Parameter) => p.value !== null && typeof p.value === "object" && !Array.isArray(p.value);
const editable = (p: Parameter) => !Array.isArray(p.value); // lista z pliku (PUBLIC_HOLIDAYS) - edycja pliku, nie panelu

export function AdminParameters() {
  // demo: bez tokenu (D36) - lista wczytywana od razu po wejściu na stronę
  const [data, setData] = useState<ParameterList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(API_MODE !== "mock");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await listParameters());
    } catch (e) {
      setData(null);
      setError(e instanceof ApiError ? e.message : "Nie udało się wczytać parametrów.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (API_MODE === "mock") return;
    let cancelled = false;
    listParameters()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : "Nie udało się wczytać parametrów."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);

  const reset = async () => {
    setConfirmReset(false);
    setBusy(true);
    setError(null);
    try {
      const next = await resetParameters();
      setData(next);
      setEditing(null);
      setSaved(`Przywrócono wartości z zestawu reguł - wersja parametrów ${next.parameters_version}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Nie udało się przywrócić wartości.");
    } finally {
      setBusy(false);
    }
  };

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.parameters ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || p.source.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-zus-green-dark">Panel administratora</p>
        <h1 className="text-2xl font-semibold text-zus-navy">Parametry prawne</h1>
        <p className="mt-1 text-sm text-zinc-600">Stawki, wymiary i progi, z których liczy silnik reguł. Zmiana zaczyna obowiązywać od wskazanej daty
          (data oceny sprawy) i jest widoczna w kolejnym wyliczeniu - bez restartu.</p>
      </header>

      {busy && !data && <p role="status" className="text-sm text-zinc-600">Wczytuję parametry…</p>}
      {error && API_MODE !== "mock" && (
        <button type="button" className={btn} disabled={busy} onClick={() => void load()}>{busy ? "Wczytuję…" : "Spróbuj ponownie"}</button>
      )}
      {API_MODE === "mock" && <p className="text-sm text-zinc-700">Tryb demo bez backendu - panel admina jest niedostępny.</p>}
      {error && <p role="alert" className="rounded-md border border-zus-red bg-red-50 px-3 py-2 text-sm text-zus-red">{error}</p>}

      {data && (
        <>
          <section className={card} aria-labelledby="ver-h">
            <h2 id="ver-h" className="sr-only">Wersja</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div><dt className="text-zinc-600">Zestaw reguł</dt><dd className="font-medium">{data.ruleset_version}</dd></div>
              <div><dt className="text-zinc-600">Wersja parametrów</dt><dd className="font-medium">{data.parameters_version}</dd></div>
              <div><dt className="text-zinc-600">Nadpisane</dt><dd className="font-medium">{data.parameters.filter((p) => p.overridden).length} z {data.parameters.length}</dd></div>
            </dl>
            {data.parameters.some((p) => p.overridden) && !confirmReset && (
              <button type="button" className={`${btnGhost} mt-3`} disabled={busy} onClick={() => { setConfirmReset(true); setSaved(null); }}>
                Przywróć wartości z zestawu reguł
              </button>
            )}
            {confirmReset && (
              <div role="group" aria-label="Potwierdzenie przywrócenia wartości" className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                <p>Wszystkie nadpisania zostaną usunięte, a parametry wrócą do wartości z zestawu reguł.</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className={btn} disabled={busy} onClick={() => void reset()}>Tak, przywróć</button>
                  <button type="button" className={btnGhost} onClick={() => setConfirmReset(false)}>Anuluj</button>
                </div>
              </div>
            )}
            {saved && <p role="status" className="mt-3 text-sm text-zus-green-dark">{saved}</p>}
          </section>

          <DemoCheck version={data.parameters_version} />

          <section className={card} aria-labelledby="list-h">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="list-h" className="text-lg font-semibold">Lista parametrów</h2>
              <label className="text-sm sm:w-72"><span className="sr-only">Szukaj parametru</span>
                <input type="search" placeholder="Szukaj (nazwa lub źródło)" className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
            </div>
            <ul className="mt-4 divide-y divide-zinc-100">
              {items.map((p) => (
                <li key={p.name} className="py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-sm font-semibold">{p.name}</p>
                      <p className="break-words text-sm"><span className="font-medium">{show(p.value)}</span> <span className="text-zinc-600">{p.unit}</span></p>
                      <p className="break-words text-xs text-zinc-600">{p.source}</p>
                      <p className="mt-1 flex flex-wrap gap-2 text-xs">
                        {p.status && <span className="rounded bg-zinc-100 px-1.5 py-0.5">{STATUS_LABEL[p.status] ?? p.status}</span>}
                        {p.overridden && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">nadpisany</span>}
                        {p.valid_from && <span className="rounded bg-zinc-100 px-1.5 py-0.5">od {formatDate(p.valid_from)}</span>}
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5">wersja {p.version}</span>
                      </p>
                    </div>
                    {editable(p) && editing !== p.name && (
                      <button type="button" className={`${btnGhost} self-start`} onClick={() => { setEditing(p.name); setSaved(null); }}
                        aria-label={`Zmień ${p.name}`}>Zmień</button>
                    )}
                  </div>
                  {editing === p.name && (
                    <EditForm param={p} onCancel={() => setEditing(null)} onSave={async (value, validFrom, reason) => {
                      const next = await updateParameters({
                        base_parameters_version: data.parameters_version,
                        changes: [{ name: p.name, value, valid_from: validFrom || null, reason }],
                      });
                      setData(next);
                      setEditing(null);
                      setSaved(`Zapisano ${p.name} - wersja parametrów ${next.parameters_version}${validFrom ? `, obowiązuje od ${formatDate(validFrom)}` : ""}.`);
                    }} />
                  )}
                </li>
              ))}
            </ul>
            {items.length === 0 && <p className="mt-3 text-sm text-zinc-600">Brak parametrów pasujących do „{query}”.</p>}
          </section>
        </>
      )}
    </div>
  );
}

function EditForm({ param, onSave, onCancel }: {
  param: Parameter; onCancel: () => void;
  onSave: (value: unknown, validFrom: string, reason: string) => Promise<void>;
}) {
  const table = isTable(param);
  const [value, setValue] = useState(param.value === null ? "" : table ? JSON.stringify(param.value, null, 2) : String(param.value));
  const [validFrom, setValidFrom] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    let parsed: unknown = value.trim();
    if (table) {
      try { parsed = JSON.parse(value); } catch { setError("Tabela musi być poprawnym JSON-em (te same klucze)."); return; }
    }
    setBusy(true);
    try {
      await onSave(parsed, validFrom, reason.trim());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Nie udało się zapisać zmiany.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mt-3 grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2" aria-label={`Zmiana ${param.name}`}
      onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label className="text-sm font-medium sm:col-span-2">Nowa wartość ({param.unit})
        {table
          ? <textarea className={`${inputCls} mt-1 font-mono`} rows={4} value={value} onChange={(e) => setValue(e.target.value)} required />
          : <input className={`${inputCls} mt-1`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required autoFocus />}
      </label>
      <label className="text-sm font-medium">Obowiązuje od (pusta = od razu)
        <input type="date" className={`${inputCls} mt-1`} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
      </label>
      <label className="text-sm font-medium">Powód zmiany (np. wpis w docs/mentors.md)
        <input className={`${inputCls} mt-1`} value={reason} minLength={3} onChange={(e) => setReason(e.target.value)} required />
      </label>
      {error && <p role="alert" className="text-sm text-zus-red sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className={btn} disabled={busy}>{busy ? "Zapisuję…" : "Zapisz zmianę"}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>Anuluj</button>
      </div>
    </form>
  );
}

/** Skutek zmiany na przykładowej sprawie (dane syntetyczne): wyliczenie przez silnik reguł po każdej wersji. */
function DemoCheck({ version }: { version: number }) {
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    evaluate(DEMO_REQUEST)
      .then((r) => { if (!cancelled) { setResult(r); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : "Nie udało się przeliczyć przykładu."); });
    return () => { cancelled = true; };
  }, [version]);
  const b = result?.benefits.find((x) => x.leave_type === "MATERNITY_LEAVE");
  return (
    <section className={card} aria-labelledby="demo-h" aria-live="polite">
      <h2 id="demo-h" className="text-lg font-semibold">Podgląd skutku na przykładzie</h2>
      <p className="text-sm text-zinc-600">Sprawa syntetyczna: pracownica, 1 dziecko, poród 15.03.2027, podstawa 6000 zł, wniosek 81,5%
        (data oceny {formatDate(DEMO_REQUEST.evaluation?.as_of_date ?? null)}). Przeliczane po każdej zmianie parametrów.</p>
      {error && <p role="alert" className="mt-2 text-sm text-zus-red">{error}</p>}
      {b && (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
          <div><dt className="text-zinc-600">Status</dt><dd className="font-medium">{STATUS_HEADLINE[b.status] ?? b.status}</dd></div>
          <div><dt className="text-zinc-600">Stawka</dt><dd className="font-medium">{b.rate ? `${(Number(b.rate) * 100).toLocaleString("pl-PL")}%` : "-"}</dd></div>
          <div><dt className="text-zinc-600">Dziennie</dt><dd className="font-medium">{formatMoney(b.daily_amount_exact)}</dd></div>
          <div><dt className="text-zinc-600">Łącznie ({b.days ?? 0} dni)</dt><dd className="font-medium">{formatMoney(b.total_amount_exact)}</dd></div>
        </dl>
      )}
      {b && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-zus-navy">Pokaż, jak to policzyliśmy</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Podstawa {formatMoney(b.base?.amount_exact ?? null)} × stawka {b.rate ? `${(Number(b.rate) * 100).toLocaleString("pl-PL")}%` : "-"} / {PARAMS.MONTH_AS_DAYS}
              = {formatMoney(b.daily_amount_exact)} dziennie; × {b.days ?? 0} dni = {formatMoney(b.total_amount_exact)}.</li>
            {b.explanation && <li className="whitespace-pre-line">{b.explanation}</li>}
            <li>Przepisy:{b.applied_rules.length > 0 ? <RuleList ids={b.applied_rules} /> : " -"}</li>
            {(result?.assumptions ?? []).map((a) => <li key={a.code}>Założenie: {a.text}</li>)}
            {(result?.not_evaluated_rules ?? []).length > 0 && <li>Nieoceniane w tej wersji:<RuleList ids={result!.not_evaluated_rules!} /></li>}
          </ul>
        </details>
      )}
    </section>
  );
}
