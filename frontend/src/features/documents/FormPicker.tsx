"use client";

// Kafelki pism (FE1-11): ten sam komponent na ścieżce „Szybkie pisma” i na podsumowaniu wyniku.
// Klik → onOpen(kod) - ekran pisma z formularzem do wypełnienia (etap 3: FE1-23).
import { useId, useState } from "react";
import type { Answers } from "@/features/main-flow/wizard/answers";
import { FormFill } from "./FormFill";
import { FORM_CODES, FORM_GROUPS, FORMS, type FormCode } from "./forms";

const TONE = {
  YOU: { badge: "bg-zus-green-dark text-white", fold: "fill-zus-green-100", label: "Wypełniasz Ty" },
  PAYER: { badge: "bg-zus-navy text-white", fold: "fill-zus-blue-50", label: "Wypełnia płatnik" },
} as const;

/** Ikona pisma: kartka z zagiętym rogiem i symbolem formularza. */
export function FormIcon({ code, size = "md" }: { code: FormCode; size?: "md" | "lg" }) {
  const t = TONE[FORMS[code].filledBy];
  const box = size === "lg" ? "h-20 w-16" : "h-16 w-[3.25rem]";
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 ${box}`}>
      <svg viewBox="0 0 52 64" className="h-full w-full">
        <path d="M4 2h32l12 12v46a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" className="fill-white stroke-zinc-300" strokeWidth="2" />
        <path d="M36 2v10a2 2 0 0 0 2 2h10z" className={t.fold} />
        <rect x="9" y="38" width="30" height="3" rx="1.5" className="fill-zus-gray" />
        <rect x="9" y="45" width="24" height="3" rx="1.5" className="fill-zus-gray" />
        <rect x="9" y="52" width="28" height="3" rx="1.5" className="fill-zus-gray" />
      </svg>
      <span className={`absolute top-4 left-1 rounded px-1 py-0.5 text-[10px] leading-none font-bold whitespace-nowrap ${t.badge}`}>{code}</span>
    </span>
  );
}

function FormTile({ code, recommended, onOpen, level }: { code: FormCode; recommended: boolean; onOpen: (c: FormCode) => void; level: 4 | 5 }) {
  const H = level === 4 ? "h4" : "h5";
  const f = FORMS[code];
  const t = TONE[f.filledBy];
  return (
    <li className={`relative flex h-full flex-col rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
      recommended ? "border-zus-green-dark ring-1 ring-zus-green-dark" : "border-zinc-200 hover:border-zus-navy"}`}>
      <div className="flex items-start gap-4">
        <FormIcon code={code} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">{t.label}</span>
            {recommended && <span className="rounded-full bg-zus-green-50 px-2 py-0.5 text-xs font-semibold text-zus-green-dark">Pasuje do Twojego planu</span>}
          </div>
          <H className="mt-1 text-base leading-snug font-semibold text-zus-navy">{f.name}</H>
          <p className="mt-1 text-sm text-zinc-700">{f.purpose}</p>
        </div>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div><dt className="inline font-semibold text-zinc-900">Kiedy: </dt><dd className="inline text-zinc-700">{f.when}</dd></div>
        <div><dt className="inline font-semibold text-zinc-900">Kto: </dt><dd className="inline text-zinc-700">{f.who}</dd></div>
      </dl>
      {/* cały kafelek klikalny (after:inset-0), nazwa przycisku krótka dla czytników ekranu */}
      <button type="button" onClick={() => onOpen(code)} aria-label={`Wypełnij ${code} - ${f.name}`}
        className="mt-auto self-start pt-4 text-sm font-semibold text-zus-green-dark after:absolute after:inset-0 after:rounded-2xl hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-zus-green-dark">
        Wypełnij {code} →
      </button>
    </li>
  );
}

/** headingLevel = poziom nagłówków grup (tytuły kafelków o jeden niżej). */
export function FormPicker({ onOpen, recommended = [], headingLevel = 3, codes, showLegend = true }: {
  onOpen: (code: FormCode) => void;
  recommended?: FormCode[];
  headingLevel?: 3 | 4;
  /** tylko te pisma (domyślnie wszystkie); puste grupy są pomijane */
  codes?: FormCode[];
  showLegend?: boolean;
}) {
  const H = headingLevel === 3 ? "h3" : "h4";
  const idp = useId();
  return (
    <div className="space-y-6">
      {FORM_GROUPS.map((g) => ({ ...g, codes: g.codes.filter((c) => !codes || codes.includes(c)) })).filter((g) => g.codes.length > 0).map((g) => (
        <section key={g.id} aria-labelledby={`${idp}-${g.id}`}>
          <H id={`${idp}-${g.id}`} className="text-base font-semibold text-zus-navy">{g.title}</H>
          <p className="text-sm text-zinc-600">{g.text}</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {g.codes.map((c) => <FormTile key={c} code={c} recommended={recommended.includes(c)} onOpen={onOpen} level={headingLevel === 3 ? 4 : 5} />)}
          </ul>
        </section>
      ))}
      {showLegend && <p className="text-xs text-zinc-600">Symbole i nazwy formularzy wg informacji ZUS. Kolor ikony: zielony - wypełniasz Ty, granatowy - wypełnia płatnik składek.</p>}
    </div>
  );
}

/** Na wyniku (FE1-16): widać tylko pisma dopasowane do planu, pozostałe po kliknięciu „Pokaż pozostałe pisma”.
 *  Bez dopasowania - informacja, że nic nie pasuje, i ten sam przycisk (wszystkie pisma zwinięte). */
export function MatchedFormPicker({ onOpen, recommended, headingLevel = 4 }: {
  onOpen: (code: FormCode) => void; recommended: FormCode[]; headingLevel?: 3 | 4;
}) {
  const [open, setOpen] = useState(false);
  const restId = useId();
  const rest = FORM_CODES.filter((c) => !recommended.includes(c));
  return (
    <div className="space-y-5">
      {recommended.length > 0
        ? <FormPicker onOpen={onOpen} recommended={recommended} codes={recommended} headingLevel={headingLevel} showLegend={false} />
        : <p role="status" className="rounded-xl bg-zus-gray-50 p-4 text-sm text-zinc-700">Do Twojego aktualnego planu nie pasuje żadne z tych pism. Możesz je przejrzeć poniżej, jeśli Twoja sytuacja się zmieni.</p>}
      {rest.length > 0 && (
        <div className={recommended.length > 0 ? "border-t border-zinc-100 pt-4" : ""}>
          <button type="button" aria-expanded={open} aria-controls={restId} onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zus-navy hover:border-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
            <span aria-hidden="true" className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
            {open ? "Ukryj pozostałe pisma" : `Pokaż pozostałe pisma (${rest.length})`}
          </button>
          <div id={restId} hidden={!open} className="mt-4">
            {open && <FormPicker onOpen={onOpen} codes={rest} headingLevel={headingLevel} />}
          </div>
        </div>
      )}
    </div>
  );
}

/** Ekran pojedynczego pisma: opis i formularz do wypełnienia (FE1-23) - Anuluj wraca, Prześlij pobiera wypełniony PDF. */
export function FormDetail({ code, onBack, backLabel, answers = null }: { code: FormCode; onBack: () => void; backLabel: string; answers?: Answers | null }) {
  const f = FORMS[code];
  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:flex-row sm:p-7">
        <FormIcon code={code} size="lg" />
        <div className="min-w-0">
          <p className="text-sm text-zinc-700">{f.purpose}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="font-semibold text-zinc-900">Kiedy złożyć</dt><dd className="mt-0.5 text-zinc-700">{f.when}</dd></div>
            <div><dt className="font-semibold text-zinc-900">Kto wypełnia</dt><dd className="mt-0.5 text-zinc-700">{f.who}</dd></div>
            <div><dt className="font-semibold text-zinc-900">Gdzie trafia</dt><dd className="mt-0.5 text-zinc-700">{f.submitTo}</dd></div>
          </dl>
        </div>
      </section>
      <FormFill key={code} code={code} answers={answers} onCancel={onBack} cancelLabel={`← ${backLabel}`} />
    </div>
  );
}
