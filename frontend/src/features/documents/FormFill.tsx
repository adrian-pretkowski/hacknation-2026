"use client";

// FE1-23: formularz pisma generowany z metadanych pól PDF (public/forms/<KOD>.json) i układu z formSpecs.ts.
// Prefill: konto testowe (SYMULACJA) + odpowiedzi kreatora; puste pola wymagane są oznaczone „Uzupełnij”.
// „Prześlij” = walidacja → wypełniony PDF (pobierany jako dowód) → potwierdzenie wysyłki (SYMULACJA, nic nie trafia do ZUS).
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Answers } from "@/features/main-flow/wizard/answers";
import { inputCls } from "@/features/main-flow/wizard/fields";
import { useSimSession } from "@/features/simulations/session";
import { SimBanner } from "@/features/simulations/ui";
import { FORMS, type FormCode } from "./forms";
import { FORM_SPECS, type Get, type SpecField, type SpecSection } from "./formSpecs";
import { downloadPdf, fillPdf, inputKind, loadFieldMeta, type PdfFieldMeta, type Values } from "./pdfForm";
import { buildPrefill, type Source, todayIso } from "./prefill";

const btn = "rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark disabled:opacity-60";
const SOURCE_LABEL: Record<Source, string> = { account: "z konta", wizard: "z kreatora", today: "dzisiejsza data" };
const TABLE_RE = /_tab(\d+)_r(\d+)_c(\d+)$/;

/** Odmiana liczebnika: 1 pole, 2 pola, 5 pól. */
const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

const shortId = (name: string) => name.split("_").slice(0, 2).join("_");
const isEmpty = (v: string | boolean | undefined) => v === undefined || v === false || (typeof v === "string" && v.trim() === "");

type Resolved = SpecField & { meta: PdfFieldMeta; noMeta?: PdfFieldMeta };

/** Błąd formatu pola (gdy wypełnione). */
function formatError(meta: PdfFieldMeta, v: string): string | null {
  const { kind, len } = inputKind(meta);
  const n = meta.name;
  if (kind === "digits") {
    const s = v.replace(/\s+/g, "");
    if (!/^\d+$/.test(s)) return "Wpisz same cyfry.";
    if (n.includes("pesel") && s.length !== 11) return "PESEL ma 11 cyfr.";
    if (n.includes("nip") && s.length !== 10) return "NIP ma 10 cyfr.";
    if (n.includes("rachunek") && s.length !== 26) return "Numer rachunku ma 26 cyfr.";
    if (n.includes("regon") && s.length !== 9 && s.length !== 14) return "REGON ma 9 lub 14 cyfr.";
    if (len && s.length > len) return `Najwyżej ${len} cyfr.`;
  }
  if (kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Podaj poprawną datę.";
  if (kind === "text" && n.includes("kod_pocztowy") && !/^\d{2}-\d{3}$/.test(v.trim())) return "Kod pocztowy w formacie 00-000.";
  return null;
}

export function FormFill({ code, answers, onCancel, cancelLabel }: {
  code: FormCode; answers: Answers | null; onCancel: () => void; cancelLabel: string;
}) {
  const { user, requestLogin } = useSimSession();
  const [meta, setMeta] = useState<PdfFieldMeta[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Values>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ id: string; fileName: string; bytes: Uint8Array } | null>(null);
  const [openRest, setOpenRest] = useState<Record<number, boolean>>({});
  const idp = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let alive = true;
    loadFieldMeta(code).then((m) => { if (alive) setMeta(m); }, (e: Error) => { if (alive) setLoadError(e.message); });
    return () => { alive = false; };
  }, [code]);

  const byShort = useMemo(() => new Map((meta ?? []).map((m) => [shortId(m.name), m])), [meta]);
  const prefill = useMemo(() => buildPrefill(code, answers, user), [code, answers, user]);

  // Wartości = prefill (po pełnej nazwie pola) nadpisany zmianami użytkownika.
  const { values, source } = useMemo(() => {
    const v: Values = {};
    const s: Record<string, Source> = {};
    for (const [id, val] of Object.entries(prefill.values)) {
      const m = byShort.get(id);
      if (m) { v[m.name] = val; s[m.name] = prefill.source[id]; }
    }
    for (const k of Object.keys(edits)) delete s[k];
    return { values: { ...v, ...edits }, source: s };
  }, [prefill, byShort, edits]);

  const get: Get = (id) => { const m = byShort.get(id); return m ? values[m.name] : undefined; };
  const set = (name: string, v: string | boolean) => setEdits((e) => ({ ...e, [name]: v }));

  const sections = useMemo(() => FORM_SPECS[code].map((s) => ({
    ...s,
    resolved: s.fields.flatMap((f): Resolved[] => {
      const m = byShort.get(f.id);
      if (!m) return [];
      return [{ ...f, meta: m, noMeta: f.no ? byShort.get(f.no) : undefined }];
    }),
  })), [code, byShort]);

  const pairs = useMemo(() => Object.fromEntries(sections.flatMap((s) => s.resolved.filter((f) => f.noMeta).map((f) => [f.meta.name, f.noMeta!.name]))), [sections]);
  const covered = useMemo(() => new Set(sections.flatMap((s) => s.resolved.flatMap((f) => [f.meta.name, ...(f.noMeta ? [f.noMeta.name] : [])]))), [sections]);
  const rest = useMemo(() => (meta ?? []).filter((m) => !covered.has(m.name)), [meta, covered]);

  const isRequired = (f: SpecField) => (typeof f.required === "function" ? f.required(get) : !!f.required);

  // Walidacja: wymagane, format, „co najmniej jedno”. Klucz = pełna nazwa pola albo `oneOf:<sekcja>`.
  const errors = useMemo(() => {
    const out: { key: string; label: string; message: string }[] = [];
    if (!meta) return out;
    for (const s of sections) {
      if (s.oneOf && !s.oneOf.ids.some((id) => get(id) === true)) out.push({ key: `oneOf:${s.id}`, label: s.title, message: s.oneOf.message });
      for (const f of s.resolved) {
        const v = values[f.meta.name];
        const label = f.label ?? f.meta.label_guess;
        if (isEmpty(v)) {
          if (isRequired(f)) out.push({ key: f.meta.name, label, message: f.noMeta ? "Wybierz jedną z odpowiedzi." : "To pole jest wymagane - uzupełnij je." });
        } else if (typeof v === "string" && !f.noMeta) {
          const e = formatError(f.meta, v);
          if (e) out.push({ key: f.meta.name, label, message: e });
        }
      }
    }
    for (const m of rest) {
      const v = values[m.name];
      if (typeof v === "string" && v.trim()) {
        const e = formatError(m, v);
        if (e) out.push({ key: m.name, label: `${m.label_guess} (str. ${m.page})`, message: e });
      }
    }
    return out;
    // get/isRequired zależą wyłącznie od values i byShort
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, sections, values, rest]);
  const errorMap = new Map(errors.map((e) => [e.key, e.message]));
  const missingRequired = sections.reduce((n, s) => n + s.resolved.filter((f) => isRequired(f) && isEmpty(values[f.meta.name])).length, 0);
  const filledCount = Object.values(source).filter((s) => s !== "today").length;

  const fieldId = (name: string) => `${idp}-${name}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    setSendError(null);
    if (!meta) return;
    if (errors.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      const bytes = await fillPdf(code, meta, values, pairs);
      const fileName = `${code}_wypelniony_${todayIso()}.pdf`;
      downloadPdf(bytes, fileName);
      const id = `SYM-${code}-${Date.now().toString(36).toUpperCase()}`;
      setSent({ id, fileName, bytes });
      requestAnimationFrame(() => { doneRef.current?.focus(); doneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Nie udało się przygotować pliku PDF.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <section aria-labelledby={`${idp}-done`} className="overflow-hidden rounded-2xl border border-zus-green-dark bg-white">
        <SimBanner integration="ZUS (eZUS/PUE) - elektroniczne złożenie pisma" />
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zus-green-50 text-2xl text-zus-green-dark">✓</span>
            <div>
              <h3 id={`${idp}-done`} ref={doneRef} tabIndex={-1} className="text-xl font-semibold text-zus-navy focus:outline-none">
                Hej, Twoje pismo {code} zostało wysłane do ZUS!
              </h3>
              <p role="status" className="mt-2 text-sm text-zinc-700">
                Numer zgłoszenia: <strong>{sent.id}</strong>. To SYMULACJA - w wersji demonstracyjnej nic nie trafia do ZUS.
              </p>
              <p className="mt-2 text-sm text-zinc-700">
                Wypełniony formularz pobrał się na Twoje urządzenie jako <strong className="break-all">{sent.fileName}</strong> - zachowaj go jako potwierdzenie.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => downloadPdf(sent.bytes, sent.fileName)} className={`${btn} border border-zinc-300 bg-white text-zus-navy hover:border-zus-navy`}>
              Pobierz PDF ponownie
            </button>
            <button type="button" onClick={onCancel} className={`${btn} bg-zus-green-dark text-white hover:bg-zus-navy`}>{cancelLabel}</button>
          </div>
        </div>
      </section>
    );
  }

  if (loadError) return <p role="alert" className="rounded-xl bg-zus-red-50 p-4 text-sm text-zus-red">{loadError}</p>;
  if (!meta) return <p role="status" className="text-sm text-zinc-600">Wczytujemy formularz {code}…</p>;

  const renderField = (f: Resolved) => {
    const name = f.meta.name;
    const id = fieldId(name);
    const label = f.label ?? f.meta.label_guess;
    const req = isRequired(f);
    const v = values[name];
    const err = attempted ? errorMap.get(name) : undefined;
    const errId = `${id}-err`;
    const src = source[name];
    const needs = req && isEmpty(v);
    const badge = (
      <>
        {src && <span className="ml-2 rounded-full bg-zus-blue-50 px-2 py-0.5 text-[11px] font-semibold text-zus-navy">{SOURCE_LABEL[src]}</span>}
        {needs && <span className="ml-2 rounded-full bg-zus-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Uzupełnij</span>}
      </>
    );
    const ring = needs ? "border-amber-400 bg-zus-yellow-50/40" : "";
    if (f.noMeta) {
      const [yes, no] = f.options ?? ["TAK", "NIE"];
      return (
        <fieldset key={name} className="sm:col-span-2" aria-describedby={err ? errId : undefined}>
          <legend className="text-sm font-medium">{label}{req && <span aria-hidden="true" className="text-zus-red"> *</span>}{badge}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[["TAK", yes], ["NIE", no]].map(([val, text]) => (
              <label key={val} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-zus-green-dark ${v === val ? "border-zus-green-dark bg-zus-green-50" : "border-zinc-300 bg-white"}`}>
                <input type="radio" name={id} value={val} checked={v === val} onChange={() => set(name, val)} className="h-4 w-4 accent-zus-green-dark" />
                {text}
              </label>
            ))}
            {!isEmpty(v) && !req && (
              <button type="button" onClick={() => set(name, "")} className="text-xs font-semibold text-zus-navy underline underline-offset-2">Wyczyść</button>
            )}
          </div>
          {err && <p id={errId} role="alert" className="mt-1 text-sm text-zus-red">{err}</p>}
        </fieldset>
      );
    }
    const { kind, len } = inputKind(f.meta);
    if (kind === "checkbox") {
      return (
        <label key={name} htmlFor={id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm sm:col-span-2 ${v === true ? "border-zus-green-dark bg-zus-green-50" : "border-zinc-200 bg-white"}`}>
          <input id={id} type="checkbox" checked={v === true} onChange={(e) => set(name, e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-zus-green-dark" />
          <span>{label}{badge}</span>
        </label>
      );
    }
    const common = {
      id, value: typeof v === "string" ? v : "", "aria-invalid": err ? true : undefined, "aria-describedby": err ? errId : undefined,
      "aria-required": req || undefined, className: `${inputCls} ${ring}`,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(name, e.target.value),
    };
    return (
      <div key={name} className={kind === "multiline" || kind === "digits" && (len ?? 0) > 14 ? "sm:col-span-2" : ""}>
        <label htmlFor={id} className="block text-sm font-medium">{label}{req && <span aria-hidden="true" className="text-zus-red"> *</span>}{badge}</label>
        {kind === "multiline" ? <textarea rows={3} {...common} />
          : kind === "date" ? <input type="date" {...common} />
            : kind === "digits" ? <input type="text" inputMode="numeric" autoComplete="off" maxLength={len ? len + 6 : undefined} {...common} />
              : <input type="text" {...common} />}
        {f.hint && <span className="mt-1 block text-xs text-zinc-600">{f.hint}</span>}
        {err && <p id={errId} role="alert" className="mt-1 text-sm text-zus-red">{err}</p>}
      </div>
    );
  };

  // Pozostałe pola: wg stron; tabele (np. składniki wynagrodzenia) jako siatka komórek.
  const restPages = [...new Set(rest.map((m) => m.page))].sort((x, y) => x - y);
  const renderRest = (page: number) => {
    const items = rest.filter((m) => m.page === page);
    const plain = items.filter((m) => !TABLE_RE.test(m.name));
    const tables = new Map<string, PdfFieldMeta[]>();
    for (const m of items.filter((x) => TABLE_RE.test(x.name))) {
      const t = TABLE_RE.exec(m.name)![1];
      tables.set(t, [...(tables.get(t) ?? []), m]);
    }
    return (
      <div className="space-y-5">
        {plain.length > 0 && <div className="grid gap-4 sm:grid-cols-2">{plain.map((m) => renderField({ id: shortId(m.name), meta: m }))}</div>}
        {[...tables.entries()].map(([t, cells]) => {
          const rows = [...new Set(cells.map((c) => Number(TABLE_RE.exec(c.name)![2])))].sort((a, b) => a - b);
          const cols = [...new Set(cells.map((c) => Number(TABLE_RE.exec(c.name)![3])))].sort((a, b) => a - b);
          const cell = (r: number, c: number) => cells.find((x) => { const m = TABLE_RE.exec(x.name)!; return Number(m[2]) === r && Number(m[3]) === c; });
          return (
            <div key={t} className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <caption className="mb-1 text-left text-sm font-medium">Tabela {t} (strona {page}) - kolumny jak na formularzu</caption>
                <thead><tr><th scope="col" className="p-1 text-left">Wiersz</th>{cols.map((c) => <th key={c} scope="col" className="p-1">kol. {c}</th>)}</tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r}>
                      <th scope="row" className="p-1 text-left font-normal">{r}</th>
                      {cols.map((c) => {
                        const m = cell(r, c);
                        return <td key={c} className="p-0.5">{m && (
                          <input aria-label={`Tabela ${t}, wiersz ${r}, kolumna ${c}`} value={typeof values[m.name] === "string" ? (values[m.name] as string) : ""}
                            onChange={(e) => set(m.name, e.target.value)} className="w-20 rounded border border-zinc-300 px-1.5 py-1 text-xs focus-visible:ring-2 focus-visible:ring-zus-green-dark focus-visible:outline-none" />
                        )}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  const sectionBox = (s: SpecSection & { resolved: Resolved[] }) => {
    const groupErr = attempted ? errorMap.get(`oneOf:${s.id}`) : undefined;
    return (
      <fieldset key={s.id} className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <legend className="px-1 text-base font-semibold text-zus-navy">{s.title}</legend>
        {s.text && <p className="mb-3 text-sm text-zinc-600">{s.text}</p>}
        {s.oneOf && <p className="mb-3 text-xs text-zinc-600">Zaznacz co najmniej jedną pozycję.<span aria-hidden="true" className="text-zus-red"> *</span></p>}
        <div className="grid gap-4 sm:grid-cols-2">{s.resolved.map(renderField)}</div>
        {groupErr && <p role="alert" className="mt-2 text-sm text-zus-red">{groupErr}</p>}
      </fieldset>
    );
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-5" aria-label={`Formularz ${code} - ${FORMS[code].name}`}>
      <div className="overflow-hidden rounded-2xl border border-amber-300 bg-white">
        <SimBanner integration="ZUS (eZUS/PUE) - elektroniczne złożenie pisma" />
        <div className="space-y-2 p-4 text-sm text-zinc-700">
          <p>
            {filledCount > 0
              ? <>Uzupełniliśmy <strong>{filledCount}</strong> {plural(filledCount, "pole", "pola", "pól")} danymi{" "}
                {user ? <>z konta <strong>{user.firstName} {user.lastName}</strong> (SYMULACJA)</> : null}{user && answers ? " i " : ""}{answers ? "z Twoich odpowiedzi w kreatorze" : ""}. Sprawdź je przed wysłaniem.</>
              : "Nie mamy jeszcze Twoich danych - wypełnij pola poniżej."}
          </p>
          {missingRequired > 0 && (
            <p className="font-medium text-amber-900">Brakuje {missingRequired} {missingRequired === 1 ? "wymaganego pola" : "wymaganych pól"} - {missingRequired === 1 ? "jest oznaczone" : "są oznaczone"} „Uzupełnij”. Prosimy o uzupełnienie.</p>
          )}
          {!user && (
            <p>
              Masz konto testowe?{" "}
              <button type="button" onClick={() => requestLogin()} className="font-semibold text-zus-navy underline underline-offset-2">Zaloguj się (SYMULACJA)</button>
              {" "}- uzupełnimy dane osobowe i płatnika.
            </p>
          )}
          <p className="text-xs text-zinc-600">Pola oznaczone <span className="text-zus-red">*</span> są wymagane. Tekst w pliku PDF zapiszemy WIELKIMI LITERAMI, jak wymaga formularz.</p>
        </div>
      </div>

      {attempted && errors.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-2xl border border-zus-red bg-zus-red-50 p-4 text-sm focus:outline-none">
          <p className="font-semibold text-zus-red">Popraw {errors.length} {plural(errors.length, "pole", "pola", "pól")}, zanim prześlesz pismo:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.slice(0, 12).map((e) => (
              <li key={e.key}>
                {e.key.startsWith("oneOf:") ? <span>{e.label}: {e.message}</span>
                  : <a href={`#${fieldId(e.key)}`} className="underline underline-offset-2">{e.label}</a>}
                {!e.key.startsWith("oneOf:") && <span> - {e.message}</span>}
              </li>
            ))}
            {errors.length > 12 && <li>…i {errors.length - 12} więcej</li>}
          </ul>
        </div>
      )}

      {sections.map(sectionBox)}

      {rest.length > 0 && (
        <section aria-labelledby={`${idp}-rest`} className="rounded-2xl border border-zinc-200 bg-zus-gray-50 p-5 sm:p-6">
          <h3 id={`${idp}-rest`} className="text-base font-semibold text-zus-navy">Pozostałe pola formularza ({rest.length})</h3>
          <p className="mt-1 text-sm text-zinc-600">Rzadziej potrzebne pola z wzoru {code}, według stron formularza. Wypełnij te, które Cię dotyczą.</p>
          <div className="mt-3 space-y-2">
            {restPages.map((p) => (
              <details key={p} className="rounded-xl border border-zinc-200 bg-white" onToggle={(e) => { const isOpen = (e.currentTarget as HTMLDetailsElement).open; setOpenRest((o) => ({ ...o, [p]: isOpen })); }}>
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zus-navy">Strona {p} ({rest.filter((m) => m.page === p).length} {plural(rest.filter((m) => m.page === p).length, "pole", "pola", "pól")})</summary>
                {openRest[p] && <div className="border-t border-zinc-100 p-4">{renderRest(p)}</div>}
              </details>
            ))}
          </div>
        </section>
      )}

      {sendError && <p role="alert" className="rounded-xl bg-zus-red-50 p-4 text-sm text-zus-red">{sendError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onCancel} className={`${btn} border border-zinc-300 bg-white text-zus-navy hover:border-zus-navy`}>Anuluj</button>
        <button type="submit" disabled={busy} className={`${btn} bg-zus-green-dark text-white hover:bg-zus-navy`}>
          {busy ? "Przygotowujemy pismo…" : "Prześlij"}
        </button>
        <span className="text-xs text-zinc-600">Wysyłka to SYMULACJA. Po przesłaniu pobierzesz wypełniony PDF.</span>
      </div>
    </form>
  );
}
