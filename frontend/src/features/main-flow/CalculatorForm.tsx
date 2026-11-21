"use client";

import { useState } from "react";
import { ApiError, type EvaluateRequest, type EvaluateResponse, evaluate } from "@/lib/api";
import { ResultCard } from "./ResultCard";

const TITLE_OPTIONS = [
  { value: "EMPLOYMENT_CONTRACT|MANDATORY", label: "Umowa o pracę" },
  { value: "CIVIL_CONTRACT_MANDATE|VOLUNTARY", label: "Umowa zlecenia (dobrowolne chorobowe)" },
  { value: "SELF_EMPLOYED|VOLUNTARY", label: "Działalność gospodarcza (dobrowolne chorobowe)" },
];

const field = "mt-1 w-full rounded border border-zinc-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";

export function CalculatorForm() {
  const [birthDate, setBirthDate] = useState("2027-03-15");
  const [children, setChildren] = useState("1");
  const [base, setBase] = useState("6000.00");
  const [title, setTitle] = useState(TITLE_OPTIONS[0].value);
  const [insuredFrom, setInsuredFrom] = useState("2022-02-01");
  const [combined, setCombined] = useState(true);
  const [debt, setDebt] = useState("");
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const [titleType, mode] = title.split("|");
    const request: EvaluateRequest = {
      person: { role: "MOTHER" },
      insurance: { titles: [{ title_type: titleType as never, sickness_insurance_mode: mode as never, from: insuredFrom, to: null }] },
      event: { type: "BIRTH", date: birthDate || null },
      children: { count_at_birth: children ? Number(children) : null },
      income_history: { manual_base_override: base || null },
      applications: { combined_815_planned: combined },
      debt: { amount_on_right_date: debt || null },
    };
    setLoading(true);
    setError(null);
    try {
      setResult(await evaluate(request));
    } catch (e) {
      setResult(null);
      setError(e instanceof ApiError ? e.message : "Nieoczekiwany błąd.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-label="Dane do wyliczenia">
        <label className="block text-sm font-medium">Data porodu (przewidywana lub faktyczna)
          <input type="date" className={field} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} name="birthDate" />
        </label>
        <label className="block text-sm font-medium">Liczba dzieci urodzonych przy jednym porodzie
          <input type="number" min={1} className={field} value={children} onChange={(e) => setChildren(e.target.value)} name="children" />
        </label>
        <label className="block text-sm font-medium">Tytuł ubezpieczenia
          <select className={field} value={title} onChange={(e) => setTitle(e.target.value)} name="title">
            {TITLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Ubezpieczenie chorobowe od
          <input type="date" className={field} value={insuredFrom} onChange={(e) => setInsuredFrom(e.target.value)} name="insuredFrom" />
        </label>
        <label className="block text-sm font-medium">Podstawa wymiaru zasiłku (zł / miesiąc)
          <input inputMode="decimal" className={field} value={base} onChange={(e) => setBase(e.target.value.replace(",", "."))} name="base" />
          <span className="text-xs font-normal text-zinc-500">Na razie wpisywana ręcznie; wyliczanie z historii wynagrodzeń - w kolejnym etapie.</span>
        </label>
        {title.startsWith("SELF_EMPLOYED") && (
          <label className="block text-sm font-medium">Zadłużenie składkowe w dniu porodu (zł)
            <input inputMode="decimal" className={field} value={debt} onChange={(e) => setDebt(e.target.value.replace(",", "."))} name="debt" />
          </label>
        )}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={combined} onChange={(e) => setCombined(e.target.checked)} name="combined" />
          <span>Złożę wniosek o łączny zasiłek (macierzyński + rodzicielski) w ciągu 21 dni od porodu - 81,5%</span>
        </label>
        <button type="submit" disabled={loading} className="w-full rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          {loading ? "Liczę…" : "Oblicz"}
        </button>
      </form>
      <div>
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        {result ? <ResultCard result={result} /> : !error && <p className="text-sm text-zinc-600">Wypełnij formularz i kliknij „Oblicz”.</p>}
      </div>
    </div>
  );
}
