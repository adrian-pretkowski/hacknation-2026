"use client";

/* FE1-38: kalendarz terminów jako kartki z kalendarza + eksport .ics (wybór lidera z 3 propozycji). */
import type { EvaluateResponse } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { daysBetween } from "../preview/exact";
import { buildIcs, downloadIcs } from "./ics";
import { DEADLINE_LABEL, PARENT_LABEL } from "./labels";
import { todayIso } from "./request";

type Deadline = NonNullable<EvaluateResponse["deadlines"]>[number];
type Item = Deadline & { left: number; label: string; whoLabel: string };
type Urgency = "past" | "now" | "soon" | "later";

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const HEAD: Record<Urgency, string> = {
  past: "bg-zinc-500 text-white", now: "bg-zus-red text-white", soon: "bg-zus-yellow text-zus-ink", later: "bg-zus-green-dark text-white",
};

const urgency = (left: number): Urgency => (left < 0 ? "past" : left <= 14 ? "now" : left <= 60 ? "soon" : "later");
const years = (n: number) => (n === 1 ? "rok" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "lata" : "lat");
/** Dokładnie w dniach do 2 miesięcy, dalej w przybliżeniu (dokładna data jest na kartce). */
const leftText = (left: number) => {
  if (left < 0) return "termin minął";
  if (left === 0) return "dziś";
  if (left === 1) return "jutro";
  if (left <= 60) return `za ${left} dni`;
  if (left < 365) return `za ok. ${Math.round(left / 30.44)} mies.`;
  const y = Math.round(left / 365.25);
  return `za ok. ${y} ${years(y)}`;
};
/** Etykieta: część przed nawiasem jako tytuł, nawias jako dopisek. */
const split = (label: string) => {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(label);
  return m ? { title: m[1], note: m[2] } : { title: label, note: "" };
};

export function Deadlines({ response }: { response: EvaluateResponse }) {
  const today = todayIso();
  const items: Item[] = [...(response.deadlines ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      left: daysBetween(today, d.date),
      label: DEADLINE_LABEL[d.code] ?? d.code,
      whoLabel: PARENT_LABEL[d.who ?? ""] ?? d.who ?? "",
    }));
  if (items.length === 0) return null;
  const upcoming = items.filter((i) => i.left >= 0);

  const exportIcs = () => downloadIcs(buildIcs(upcoming.map((i) => ({
    uid: `${i.code}-${i.who ?? "x"}-${i.date}`,
    date: i.date,
    summary: split(i.label).title,
    description: [i.whoLabel, i.label].filter(Boolean).join(". "),
  }))), "terminy-rodzicielskie.ics");

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5" aria-labelledby="dl-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="dl-h" className="text-lg font-semibold">Kalendarz terminów</h3>
        <button type="button" onClick={exportIcs} disabled={upcoming.length === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-zus-green-dark px-3 py-1.5 text-sm font-medium text-zus-green-dark hover:bg-zus-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-500 disabled:hover:bg-transparent">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M12 14v4M10 16h4" />
          </svg>
          {upcoming.length === 0 ? "Brak nadchodzących terminów" : `Dodaj ${upcoming.length === 1 ? "termin" : "terminy"} do kalendarza (.ics)`}
        </button>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => {
          const u = urgency(i.left);
          const { title, note } = split(i.label);
          return (
            <li key={`${i.code}-${i.who ?? ""}-${i.date}`} className={`flex gap-3 rounded-lg border border-zinc-200 p-3 ${u === "past" ? "bg-zus-gray-50" : ""}`}>
              <div className="flex w-14 shrink-0 flex-col self-start overflow-hidden rounded-md border border-zinc-200 text-center shadow-sm" aria-hidden="true">
                <span className={`py-0.5 text-[11px] font-semibold uppercase ${HEAD[u]}`}>{MONTHS[Number(i.date.slice(5, 7)) - 1]}</span>
                <span className="py-1 text-2xl font-bold leading-none tabular-nums text-zus-ink">{Number(i.date.slice(8, 10))}</span>
                <span className="pb-0.5 text-[10px] text-zinc-600">{i.date.slice(0, 4)}</span>
              </div>
              <div className="min-w-0 text-sm">
                <p className="sr-only">{formatDate(i.date)}</p>
                <p className={`text-xs font-semibold ${u === "now" ? "text-zus-red" : "text-zinc-600"}`}>{leftText(i.left)}{i.whoLabel ? ` · ${i.whoLabel}` : ""}</p>
                <p className={`font-medium leading-snug ${u === "past" ? "text-zinc-600 line-through" : "text-zus-ink"}`}>{title}</p>
                {note && <p className="mt-0.5 text-xs text-zinc-600">{note}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-zinc-600">Plik .ics otworzysz w Google, Outlook i Apple Kalendarz - doda nadchodzące terminy z przypomnieniem 3 dni wcześniej.</p>
    </section>
  );
}
