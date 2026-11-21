"use client";

// FE1-03: panel admina parametrów prawnych — lista (wartość, jednostka, źródło, status, wersja, valid_from),
// edycja z datą obowiązywania i powodem (PUT /api/admin/parameters, konflikt wersji → 409) oraz podgląd skutku
// na przykładowej sprawie (POST /api/evaluate) — zmiana jest widoczna w kolejnym wyliczeniu bez restartu (BE2-05).
import { useEffect, useMemo, useState } from "react";
import {
  API_MODE, ApiError, type EvaluateResponse, type Parameter, type ParameterList, evaluate, listParameters,
  updateParameters,
} from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { PARAMS } from "../main-flow/preview/params";
import { STATUS_HEADLINE } from "../main-flow/wizard/labels";
import { DEMO_REQUEST } from "./demoRequest";

const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";
const inputCls = "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zus-navy focus:outline-none focus:ring-2 focus:ring-zus-navy/30";
const btn = "rounded-md bg-zus-navy px-4 py-2 text-sm font-semibold text-white hover:bg-zus-navy/90 disabled:opacity-50";
const btnGhost = "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zus-navy hover:bg-zinc-50";
const TOKEN_KEY = "pr-admin-token"; // tylko sessionStorage (zamknięcie karty = wylogowanie)
const STATUS_LABEL: Record<string, string> = { CONFIRMED: "potwierdzony", UNCONFIRMED: "niepotwierdzony", MISSING: "brak wartości" };

/** Wartość parametru do wyświetlenia / edycji: tabela jako JSON, liczba jako tekst. */
const show = (v: unknown) => v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
const isTable = (p: Parameter) => p.value !== null && typeof p.value === "object" && !Array.isArray(p.value);
const editable = (p: Parameter) => !Array.isArray(p.value); // lista z pliku (PUBLIC_HOLIDAYS) — edycja pliku, nie panelu

export function AdminParameters() {
  // token z tej karty (sessionStorage); na serwerze pusty — pole ma suppressHydrationWarning
  const [token, setToken] = useState(() => typeof window === "undefined" ? "" : sessionStorage.getItem(TOKEN_KEY) ?? "");
  const [data, setData] = useState<ParameterList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = async (t = token) => {
    setBusy(true);
    setError(null);
    try {
      setData(await listParameters(t));
      sessionStorage.setItem(TOKEN_KEY, t);
    } catch (e) {
      setData(null);
      setError(e instanceof ApiError ? e.message : "Nie udało się wczytać parametrów.");
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
          (data oceny sprawy) i jest widoczna w kolejnym wyliczeniu — bez restartu.</p>
      </header>

      <form className={`${card} flex flex-col gap-3 sm:flex-row sm:items-end`} onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <label className="flex-1 text-sm font-medium">Token administratora
          <input type="password" autoComplete="off" suppressHydrationWarning className={`${inputCls} mt-1`} value={token} onChange={(e) => setToken(e.target.value)}
            aria-describedby="token-hint" />
          <span id="token-hint" className="mt-1 block text-xs font-normal text-zinc-600">Wartość ADMIN_TOKEN z konfiguracji serwera. Przechowywana tylko w tej karcie.</span>
        </label>
        <button type="submit" className={btn} disabled={busy || !token || API_MODE === "mock"}>{busy ? "Wczytuję…" : "Wczytaj parametry"}</button>
      </form>
      {API_MODE === "mock" && <p className="text-sm text-zinc-700">Tryb demo bez backendu — panel admina jest niedostępny.</p>}
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
                      const next = await updateParameters(token, {
                        base_parameters_version: data.parameters_version,
                        changes: [{ name: p.name, value, valid_from: validFrom || null, reason }],
                      });
                      setData(next);
                      setEditing(null);
                      setSaved(`Zapisano ${p.name} — wersja parametrów ${next.parameters_version}${validFrom ? `, obowiązuje od ${formatDate(validFrom)}` : ""}.`);
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
          <div><dt className="text-zinc-600">Stawka</dt><dd className="font-medium">{b.rate ? `${(Number(b.rate) * 100).toLocaleString("pl-PL")}%` : "—"}</dd></div>
          <div><dt className="text-zinc-600">Dziennie</dt><dd className="font-medium">{formatMoney(b.daily_amount_exact)}</dd></div>
          <div><dt className="text-zinc-600">Łącznie ({b.days ?? 0} dni)</dt><dd className="font-medium">{formatMoney(b.total_amount_exact)}</dd></div>
        </dl>
      )}
      {b && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-zus-navy">Pokaż, jak to policzyliśmy</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Podstawa {formatMoney(b.base?.amount_exact ?? null)} × stawka {b.rate ? `${(Number(b.rate) * 100).toLocaleString("pl-PL")}%` : "—"} / {PARAMS.MONTH_AS_DAYS}
              = {formatMoney(b.daily_amount_exact)} dziennie; × {b.days ?? 0} dni = {formatMoney(b.total_amount_exact)}.</li>
            {b.explanation && <li className="whitespace-pre-line">{b.explanation}</li>}
            <li>Reguły: {b.applied_rules.join(", ") || "—"}.</li>
            {(result?.assumptions ?? []).map((a) => <li key={a.code}>Założenie: {a.text}</li>)}
            {(result?.not_evaluated_rules ?? []).length > 0 && <li>Nieoceniane w tej wersji: {result!.not_evaluated_rules!.join(", ")}.</li>}
          </ul>
        </details>
      )}
    </section>
  );
}
