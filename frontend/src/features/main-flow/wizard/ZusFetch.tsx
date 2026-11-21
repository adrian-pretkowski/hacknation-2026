"use client";

// Przycisk „Pobierz dane z ZUS” — SYMULACJA. Własny, neutralny wygląd (bez kolorów i znaków ZUS), stały opis symulacji.
import { useState } from "react";
import type { Answers } from "./answers";
import { SimBadge } from "./fields";
import { type SimSource, simFetchFromZus } from "./simZus";

export function ZusFetch({ source, what, a, set }: {
  source: SimSource; what: string; a: Answers; set: (patch: Partial<Answers>) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [summary, setSummary] = useState<string[]>([]);

  const run = async () => {
    setState("loading");
    const res = await simFetchFromZus(source, a);
    set(res.patch);
    setSummary(res.summary);
    setState("done");
  };

  return (
    <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50/60 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 text-zinc-800">
          <SimBadge />
          <span>{what}</span>
        </p>
        <button type="button" onClick={run} disabled={state === "loading"}
          className="rounded-md border border-zinc-700 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60">
          {state === "loading" ? "Pobieranie…" : state === "done" ? "Pobierz ponownie" : "Pobierz dane z ZUS"}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        SYMULACJA — w wersji produkcyjnej: integracja z systemami ZUS. Tu wstawiamy przykładowe dane, bez połączenia z ZUS.
      </p>
      <div aria-live="polite">
        {state === "done" && (
          <div className="mt-2 rounded-md bg-white p-2 text-xs text-zinc-800">
            <p className="font-medium">Uzupełniono przykładowymi danymi (symulacja) — sprawdź i popraw, jeśli trzeba:</p>
            <ul className="mt-1 list-disc pl-5">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
