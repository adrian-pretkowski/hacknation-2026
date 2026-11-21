"use client";

/* FE1-32: oś czasu wyniku (wybór lidera): paski z opisem w środku i podziałką miesięcy, a pod przyciskiem
 * „Pokaż szczegóły” pionowa ścieżka okresów (daty, dni, stawka podstawy, kwota, błędy planu).
 * Tylko prezentacja danych podglądu (daty, dni, kwoty jako string) - bez przeliczania kwot. */

import { useState } from "react";
import type { EvaluateResponse } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Seg } from "../preview/engine";
import { RuleText } from "../RuleList";
import { addMonths, daysBetween, periodDays } from "../preview/exact";
import { LEAVE_COLOR, LEAVE_LABEL, PARENT_LABEL } from "./labels";
import { todayIso } from "./request";
import { PARAMS } from "../preview/params";

type ReturnToWork = NonNullable<EvaluateResponse["return_to_work"]>;
type PlanErrors = NonNullable<EvaluateResponse["plan_errors"]>;
type Props = { segments: Seg[]; returnToWork?: ReturnToWork };

/** FE1-02: błąd planu → rodzaj urlopu, przy którym go pokazujemy (PAR-* → rodzicielski, PAT-* → ojcowski,
 * MAT-DUR-* → macierzyński); inne (np. MAT-SHARE-007) - lista pod osią czasu. */
const errorLeave = (ruleId: string): string | null => ruleId.startsWith("PAR-") ? "PARENTAL_LEAVE"
  : ruleId.startsWith("PAT-") ? "PATERNITY_LEAVE" : ruleId.startsWith("MAT-DUR-") ? "MATERNITY_LEAVE" : null;
// liczby z parametrów (panel admina, FE1-37), nie wpisane w tekst - funkcja, bo PARAMS wczytują się z API po starcie
const planErrorText = (): Record<string, string> => ({
  PRE_BIRTH_TOO_EARLY: `urlop przed porodem może zacząć się najwcześniej ${PARAMS.PRE_BIRTH_MAX_WEEKS} tygodni przed porodem - przyjęto dzień porodu.`,
  MATERNITY_START_AFTER_BIRTH: "urlop macierzyński nie może zacząć się po porodzie - przyjęto dzień porodu.",
  WORK_WEEKS_EXCEED_POOL: "za dużo tygodni pracy w stosunku do puli urlopu.",
  WORK_FRACTION_TOO_HIGH: `praca w czasie rodzicielskiego najwyżej na ${fractionText(String(PARAMS.PARENTAL_WORK_MAX_FRACTION))} etatu.`,
  PARENTAL_EXT_CAP_EXCEEDED: "łączny wymiar rodzicielskiego z pracą przekracza limit.",
  PARENTAL_PARTS_EXHAUSTED: "wykorzystano wszystkie części urlopu rodzicielskiego.",
  PATERNITY_AFTER_12_MONTHS: `ojcowski musi skończyć się przed ukończeniem przez dziecko ${PARAMS.PATERNITY_CHILD_AGE_MONTHS} miesięcy.`,
});
const errorLine = (e: PlanErrors[number]) => <>Plan do poprawy: {planErrorText()[e.code] ?? e.code}<RuleText entry={e.rule_id} className="block text-xs" /></>;
const fractionText = (f: string) => f === "0.5" ? "½" : f === "0.25" ? "¼" : f.replace(".", ",");
/** stawka jako % podstawy wymiaru (prezentacja stringu z silnika, bez liczenia kwot) */
const rateText = (s: Seg) => (Number(s.rate) * 100).toLocaleString("pl-PL") + "% podstawy"
  + (s.work_fraction !== "0" ? " × " + (1 - Number(s.work_fraction)).toLocaleString("pl-PL") + " (praca " + fractionText(s.work_fraction) + " etatu)" : "");

const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";
/** jasne tło + mocny akcent: ciemny tekst na jasnym tle ma kontrast AA, kolor akcentu rozróżnia rodzaj urlopu */
const TINT: Record<string, string> = {
  MATERNITY_LEAVE: "bg-[#dce8f2]",
  MATERNITY_LEAVE_TRANSFERRED: "bg-zus-blue-50",
  MATERNITY_LIKE_LEAVE: "bg-[#dce8f2]",
  SUPPLEMENTARY_MATERNITY_LEAVE: "bg-zus-yellow-50",
  PARENTAL_LEAVE: "bg-zus-green-50",
  PATERNITY_LEAVE: "bg-zus-blue-50",
};
const ACCENT: Record<string, string> = {
  MATERNITY_LEAVE: "border-zus-navy",
  MATERNITY_LEAVE_TRANSFERRED: "border-zus-blue",
  MATERNITY_LIKE_LEAVE: "border-zus-navy",
  SUPPLEMENTARY_MATERNITY_LEAVE: "border-zus-yellow",
  PARENTAL_LEAVE: "border-zus-green",
  PATERNITY_LEAVE: "border-zus-blue",
};
const SHORT: Record<string, string> = {
  MATERNITY_LEAVE: "Macierzyński",
  MATERNITY_LEAVE_TRANSFERRED: "Macierzyński (przejęty)",
  MATERNITY_LIKE_LEAVE: "Na warunkach macierzyńskiego",
  SUPPLEMENTARY_MATERNITY_LEAVE: "Uzupełniający",
  PARENTAL_LEAVE: "Rodzicielski",
  PATERNITY_LEAVE: "Ojcowski",
};
const MONTH_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const monthOf = (iso: string) => Number(iso.slice(5, 7)) - 1;
const firstOfMonth = (iso: string) => iso.slice(0, 8) + "01";
const weeks = (days: number) => (days % 7 === 0 ? " = " + days / 7 + " tyg." : "");
const pc = (n: number) => n + "%";
const dni = (n: number) => (n === 1 ? "1 dzień" : n + " dni");
const amountOf = (s: Seg) => (s.history ? "wykorzystany" : s.own ? formatMoney(s.amount) : "kwota zależy od zarobków drugiego rodzica");
const lanesOf = (segments: Seg[]) => (["MOTHER", "FATHER"] as const).filter((p) => segments.some((s) => s.parent === p));
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

function bounds(segments: Seg[]) {
  const start = segments.map((s) => s.from).sort()[0];
  const end = segments.map((s) => s.to).sort().at(-1)!;
  return { start, end, span: Math.max(periodDays(start, end), 1) };
}

/** Wszystkie miesiące kalendarzowe osi (pierwsze dni miesięcy). */
function monthsBetween(start: string, end: string) {
  const out: string[] = [];
  for (let m = firstOfMonth(start); m <= end; m = addMonths(m, 1)) out.push(m);
  return out;
}

export function TimelineView({ segments, planErrors, returnToWork = [] }: Props & { planErrors: PlanErrors }) {
  const [open, setOpen] = useState(false);
  if (segments.length === 0) return null;
  const { start, end } = bounds(segments);
  // każdy błąd przy jednym okresie: pierwszym (nie historycznym) okresie danego rodzaju urlopu
  const owner = (e: PlanErrors[number]) => segments.findIndex((s) => !s.history && errorLeave(e.rule_id) === s.leave_type);
  const errorsOf = (s: Seg) => planErrors.filter((e) => owner(e) === segments.indexOf(s));
  const unplaced = planErrors.filter((e) => owner(e) < 0);
  const withErrors = segments.filter((s) => errorsOf(s).length > 0).length;
  return (
    <section className={card} aria-labelledby="tl-h">
      <h3 id="tl-h" className="text-lg font-semibold">Oś czasu</h3>
      <p className="text-sm text-zinc-600">{formatDate(start)} – {formatDate(end)}. Jaśniejsze paski = już wykorzystane, obramowanie przerywane = do weryfikacji.</p>
      <RibbonTimeline segments={segments} returnToWork={returnToWork} />
      {withErrors > 0 && !open && <p className="mt-2 text-sm text-zus-red">Plan wymaga poprawy przy {withErrors === 1 ? "jednym okresie" : withErrors + " okresach"} - zobacz szczegóły.</p>}
      <button type="button" aria-expanded={open} aria-controls="tl-details" onClick={() => setOpen((o) => !o)}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-zinc-500 bg-white px-4 py-2 text-sm font-medium text-zus-navy hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-navy">
        <span aria-hidden="true" className={cx("inline-block transition-transform", open && "rotate-90")}>▸</span>
        {open ? "Ukryj szczegóły okresów" : "Pokaż szczegóły okresów (daty, stawki, kwoty)"}
      </button>
      <div id="tl-details" hidden={!open}>
        {open && <VerticalPath segments={segments} returnToWork={returnToWork} errorsOf={errorsOf} />}
      </div>
      {returnToWork.length > 0 && (
        <p className="mt-3 text-sm">Powrót do pracy: {returnToWork.map((r) => (PARENT_LABEL[r.parent] ?? r.parent) + " " + formatDate(r.date) + (r.part_time_fraction ? " (" + fractionText(r.part_time_fraction) + " etatu)" : "")).join(" · ")}.</p>
      )}
      {unplaced.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-zus-red" role="alert">
          {unplaced.map((e, i) => <li key={i}>{errorLine(e)}</li>)}
        </ul>
      )}
    </section>
  );
}

/* ---------- paski z opisem w środku, podziałka miesięcy ---------- */

function RibbonTimeline({ segments, returnToWork = [] }: Props) {
  const { start, end, span } = bounds(segments);
  const pos = (d: string) => (daysBetween(start, d) / span) * 100;
  const lanes = lanesOf(segments);
  const today = todayIso();
  const ticks = monthsBetween(start, end).filter((m) => m > start);
  // podpis co 1, 2, 3, 6 albo 12 miesięcy - maks. ok. 8 podpisów, żeby się nie zlewały
  const step = [1, 2, 3, 6, 12].find((k) => ticks.length / k <= 8) ?? 12;
  const label = (m: string) => MONTH_SHORT[monthOf(m)] + (monthOf(m) === 0 || m === ticks[0] ? " " + m.slice(0, 4) : "");
  return (
    <div>
      <div className="mt-4 flex gap-2" aria-hidden="true">
        <div className="w-12 shrink-0" />
        <div className="relative h-5 min-w-0 flex-1 text-[11px] text-zinc-600">
          {ticks.map((m, i) => (i % step === 0) && (
            <span key={m} className={cx("absolute top-0 -translate-x-1/2 whitespace-nowrap", i % (step * 2) !== 0 && "hidden sm:inline")} style={{ left: pc(pos(m)) }}>{label(m)}</span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {lanes.map((lane) => {
          const rtw = returnToWork.find((r) => r.parent === lane);
          return (
            <div key={lane} className="flex items-stretch gap-2">
              <span className="flex w-12 shrink-0 items-center text-sm font-semibold text-zinc-800">{PARENT_LABEL[lane]}</span>
              <div className="relative h-16 min-w-0 flex-1 rounded-md bg-zinc-50">
                {ticks.map((m) => <div key={m} aria-hidden="true" className="absolute inset-y-0 w-px bg-zinc-200" style={{ left: pc(pos(m)) }} />)}
                <ul aria-label={"Okresy: " + PARENT_LABEL[lane]}>
                  {segments.filter((s) => s.parent === lane).map((s, i) => {
                    const w = (s.days / span) * 100;
                    return (
                      <li key={i} title={LEAVE_LABEL[s.leave_type] + ": " + formatDate(s.from) + " – " + formatDate(s.to) + " (" + s.days + " dni)"}
                        className={cx("absolute top-1.5 bottom-1.5 overflow-hidden rounded-md border-l-[6px] px-2 py-1 text-zinc-900 shadow-sm",
                          TINT[s.leave_type], ACCENT[s.leave_type], s.history && "opacity-60", s.needs_review && "outline-2 outline-dashed outline-zus-yellow")}
                        style={{ left: pc(pos(s.from)), width: "max(" + w + "%, 10px)", zIndex: 100 - Math.min(Math.round(w), 99) }}>
                        <span className="sr-only">{LEAVE_LABEL[s.leave_type]}, {formatDate(s.from)} – {formatDate(s.to)}, {s.days} dni, {amountOf(s)}</span>
                        {w >= 9 && (
                          <span aria-hidden="true" className="block leading-tight">
                            <span className="block truncate text-xs font-semibold sm:text-sm">{SHORT[s.leave_type]}</span>
                            <span className="block truncate text-[11px] text-zinc-700 sm:text-xs">{dni(s.days)}{w >= 16 ? " · do " + formatDate(s.to) : ""}</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {/* krótki okres (pasek bez miejsca na opis) - podpis obok paska */}
                {segments.filter((s) => s.parent === lane && (s.days / span) * 100 < 9 && pos(s.to) < 80).map((s, i) => (
                  <span key={i} aria-hidden="true" className="absolute top-1/2 -translate-y-1/2 pl-2 text-xs leading-tight text-zinc-800" style={{ left: "calc(" + pc(pos(s.to)) + " + 10px)" }}>
                    <span className="block font-semibold">{SHORT[s.leave_type]}</span>{dni(s.days)}
                  </span>
                ))}
                {rtw && rtw.date >= start && (
                  <div aria-hidden="true" className="absolute -inset-y-1 z-[200] w-1 rounded bg-zus-red" style={{ left: "min(" + Math.min(pos(rtw.date), 100) + "%, calc(100% - 4px))" }} />
                )}
                {today >= start && today <= end && <div aria-hidden="true" className="absolute inset-y-0 z-[150] w-0.5 bg-zinc-900" style={{ left: pc(pos(today)) }} />}
              </div>
            </div>
          );
        })}
        {today >= start && today <= end && (
          <div className="flex gap-2" aria-hidden="true">
            <div className="w-12 shrink-0" />
            <div className="relative h-5 min-w-0 flex-1">
              <span className="absolute -translate-x-1/2 rounded bg-zinc-900 px-1.5 text-[11px] font-medium text-white" style={{ left: pc(pos(today)) }}>dziś</span>
            </div>
          </div>
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-700" aria-hidden="true">
        {[...new Set(segments.map((s) => s.leave_type))].map((l) => (
          <li key={l} className="flex items-center gap-1"><span className={cx("inline-block h-3 w-3 rounded-sm border-l-4", TINT[l], ACCENT[l])} />{LEAVE_LABEL[l]}</li>
        ))}
        {today >= start && today <= end && <li className="flex items-center gap-1"><span className="inline-block h-3 w-0.5 bg-zinc-900" />dziś</li>}
        {returnToWork.length > 0 && <li className="flex items-center gap-1"><span className="inline-block h-3 w-1 rounded bg-zus-red" />powrót do pracy</li>}
      </ul>
    </div>
  );
}

/* ---------- szczegóły: pionowa ścieżka - kamienie milowe i karty w kolejności dat ---------- */

type Item = { date: string; kind: "seg"; seg: Seg; parallel: boolean } | { date: string; kind: "rtw" | "today"; text: string };

function VerticalPath({ segments, returnToWork = [], errorsOf }: Props & { errorsOf: (s: Seg) => PlanErrors }) {
  const today = todayIso();
  const { start, end } = bounds(segments);
  const maxDays = Math.max(...segments.map((s) => s.days), 1);
  const sorted = [...segments].sort((a, b) => a.from.localeCompare(b.from) || a.parent.localeCompare(b.parent));
  const items: Item[] = sorted.map((s, i) => ({
    date: s.from, kind: "seg" as const, seg: s,
    parallel: sorted.slice(0, i).some((p) => p.parent !== s.parent && p.to >= s.from),
  }));
  for (const r of returnToWork) items.push({ date: r.date, kind: "rtw", text: (PARENT_LABEL[r.parent] ?? r.parent) + " wraca do pracy" });
  if (today >= start && today <= end) items.push({ date: today, kind: "today", text: "Dziś" });
  const order = (it: Item) => (it.kind === "seg" ? 1 : 0);
  items.sort((a, b) => a.date.localeCompare(b.date) || order(a) - order(b));
  return (
    <ol className="relative mt-4 ml-3 border-l-2 border-zinc-200" aria-label="Okresy urlopów po kolei">
        {items.map((it, i) => it.kind !== "seg" ? (
          <li key={i} className="relative py-2 pl-6">
            <span aria-hidden="true" className={cx("absolute -left-[9px] top-3 h-4 w-4 rounded-full ring-4 ring-white", it.kind === "rtw" ? "bg-zus-red" : "bg-zinc-900")} />
            <p className={cx("text-sm font-semibold", it.kind === "rtw" && "text-zus-red")}>{it.text} · {formatDate(it.date)}</p>
          </li>
        ) : (
          <li key={i} className="relative pb-4 pl-6">
            <span aria-hidden="true" className={cx("absolute -left-[11px] top-3 h-5 w-5 rounded-full ring-4 ring-white", LEAVE_COLOR[it.seg.leave_type])} />
            <p className="text-xs font-medium text-zinc-600">{formatDate(it.seg.from)}{it.parallel ? " · równolegle" : ""}</p>
            <div className={cx("mt-1 rounded-lg border-l-[6px] p-3", TINT[it.seg.leave_type], ACCENT[it.seg.leave_type], it.seg.history && "opacity-70", errorsOf(it.seg).length > 0 && "ring-2 ring-zus-red")}>
              <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-base font-semibold">{PARENT_LABEL[it.seg.parent]}: {LEAVE_LABEL[it.seg.leave_type]}{it.seg.reserved_9w ? " (9 tyg. tylko dla taty)" : ""}{it.seg.history ? " - wykorzystany" : ""}</span>
                <span className="text-sm font-semibold">{amountOf(it.seg)}</span>
              </p>
              <p className="text-sm text-zinc-800">{formatDate(it.seg.from)} – {formatDate(it.seg.to)} · <strong>{dni(it.seg.days)}</strong>{weeks(it.seg.days)}
                </p>
              <p className="text-sm text-zinc-800">Stawka: <strong>{rateText(it.seg)}</strong>{it.seg.needs_review ? " (do weryfikacji)" : ""}</p>
              {errorsOf(it.seg).map((e, k) => <p key={k} className="mt-1 text-sm text-zus-red">{errorLine(e)}</p>)}
              {/* długość okresu względem najdłuższego - porównanie „na oko” */}
              <div aria-hidden="true" className="mt-2 h-2 rounded-full bg-white/80">
                <div className={cx("h-2 rounded-full", LEAVE_COLOR[it.seg.leave_type])} style={{ width: pc(Math.max((it.seg.days / maxDays) * 100, 3)) }} />
              </div>
            </div>
          </li>
        ))}
        {returnToWork.length === 0 && (
          <li className="relative pl-6">
            <span aria-hidden="true" className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-zinc-400 bg-white" />
            <p className="text-sm text-zinc-600">Koniec planu · {formatDate(end)}</p>
          </li>
        )}
      </ol>
  );
}
