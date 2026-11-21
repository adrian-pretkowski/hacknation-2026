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
      <legend className="text-base font-medium">{legend}</legend>
      {hint && <p className="text-sm text-zinc-600">{hint}</p>}
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition focus-within:ring-2 focus-within:ring-zus-green-dark ${
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
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm">
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
