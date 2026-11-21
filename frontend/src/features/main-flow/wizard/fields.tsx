"use client";

import { useId } from "react";

export const inputCls =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-zus-green-dark";

export function Choice<T extends string>({ legend, hint, value, options, onChange, columns = 2 }: {
  legend: string;
  hint?: string;
  value: T | null;
  options: { value: T; label: string; description?: string }[];
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const name = useId();
  const cols = columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-semibold text-zus-navy">{legend}</legend>
      {hint && <p className="text-sm text-zinc-600">{hint}</p>}
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition focus-within:ring-2 focus-within:ring-zus-green-dark ${
                checked ? "border-zus-green-dark bg-zus-green-50" : "border-zinc-200 bg-white hover:border-zinc-400"}`}>
              <input type="radio" name={name} value={o.value} aria-label={o.label} className="mt-0.5 h-4 w-4 accent-zus-green-dark" checked={checked}
                onChange={() => onChange(o.value)} />
              <span>
                <span className="block font-medium">{o.label}</span>
                {o.description && <span className="block text-zinc-600">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-zinc-600">{hint}</span>}
    </label>
  );
}

export function Check({ label, checked, onChange, hint }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-zus-green-dark" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-zinc-600">{hint}</span>}
      </span>
    </label>
  );
}

export const TRI_OPTIONS = [
  { value: "YES" as const, label: "Tak" },
  { value: "NO" as const, label: "Nie" },
  { value: "UNKNOWN" as const, label: "Nie wiem" },
];

/** Suwak z polem liczbowym obok (precyzyjna wartość). Pusta wartość = „nie podano” (UNKNOWN w silniku). */
export function Slider({ label, hint, value, onChange, min, max, step = 1, unit, emptyLabel = "nie podano" }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  min: number; max: number; step?: number; unit: string; emptyLabel?: string;
}) {
  const id = useId();
  const num = value === "" ? null : Number(value);
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-medium">{label}</label>
        <span className="text-base font-semibold text-zus-navy" aria-hidden="true">
          {num === null ? <span className="text-sm font-normal text-zinc-500">{emptyLabel}</span> : `${num.toLocaleString("pl-PL")} ${unit}`}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input id={id} type="range" min={min} max={max} step={step} value={num ?? min}
          aria-valuetext={num === null ? emptyLabel : `${num} ${unit}`}
          className={`h-2 w-full cursor-pointer accent-zus-green-dark ${num === null ? "opacity-50" : ""}`}
          onChange={(e) => onChange(e.target.value)} />
        <input inputMode="numeric" aria-label={`${label} — wpisz wartość`} placeholder="—"
          className="w-20 shrink-0 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-zus-green-dark"
          value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-zinc-500" aria-hidden="true">
        <span>{min.toLocaleString("pl-PL")}</span>
        {value !== "" && <button type="button" onClick={() => onChange("")} className="underline underline-offset-2 hover:text-zus-navy">wyczyść</button>}
        <span>{max.toLocaleString("pl-PL")}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

/** Lista rozwijana liczb z opcjonalną pozycją „Nie wiem” (pusta wartość). */
export function NumberSelect({ label, hint, value, onChange, from, to, unit, unknownLabel = "Nie wiem / nie podam" }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  from: number; to: number; unit?: (n: number) => string; unknownLabel?: string | null;
}) {
  const opts = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <Field label={label} hint={hint}>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {unknownLabel !== null && <option value="">{unknownLabel}</option>}
        {opts.map((n) => <option key={n} value={String(n)}>{unit ? unit(n) : n}</option>)}
      </select>
    </Field>
  );
}

export function SimBadge() {
  return (
    <span className="rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
      Symulacja
    </span>
  );
}
