"use client";

// Ekran startowy kreatora: krótko, co dostaniecie, trzy kroki „jak to działa” i gotowe przykłady (dane syntetyczne).
import type { RefObject } from "react";
import type { Answers } from "./answers";

const HOW = [
  { n: "1", title: "Odpowiadacie na kilka pytań", text: "Tylko te, które mają znaczenie w Waszej sytuacji. Każde pytanie można pominąć i wrócić do niego później." },
  { n: "2", title: "Widzicie plan na osi czasu", text: "Urlopy obojga rodziców, kwoty zasiłków i porównanie wariantów wypłaty w jednym miejscu." },
  { n: "3", title: "Wiecie, co i kiedy złożyć", text: "Lista dokumentów, adresat każdego wniosku, terminy i ryzyka, na które trzeba uważać." },
];

function Illustration() {
  return (
    <svg viewBox="0 0 220 160" className="h-auto w-full max-w-xs" aria-hidden="true">
      <rect x="10" y="20" width="200" height="120" rx="16" className="fill-zus-green-50" />
      <rect x="28" y="44" width="70" height="12" rx="6" className="fill-zus-navy" />
      <rect x="98" y="44" width="56" height="12" rx="6" className="fill-zus-green" />
      <rect x="154" y="44" width="38" height="12" rx="6" className="fill-zus-yellow" />
      <rect x="62" y="68" width="24" height="12" rx="6" className="fill-zus-blue" />
      <rect x="86" y="68" width="40" height="12" rx="6" className="fill-zus-green" />
      <circle cx="40" cy="108" r="12" className="fill-white stroke-zus-green-dark" strokeWidth="3" />
      <path d="M34 108l4 4 8-8" className="stroke-zus-green-dark" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="60" y="102" width="90" height="6" rx="3" className="fill-zus-gray" />
      <rect x="60" y="112" width="60" height="6" rx="3" className="fill-zus-gray" />
    </svg>
  );
}

/** Karta wyboru drogi na ekranie startowym — cała klikalna (after:inset-0 na przycisku). */
function PathCard({ tag, title, text, points, cta, onClick, icon, primary }: {
  tag: string; title: string; text: string; points: string[]; cta: string; onClick: () => void; icon: "plan" | "forms"; primary?: boolean;
}) {
  return (
    <li className={`relative flex flex-col rounded-2xl border-2 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${
      primary ? "border-zus-green-dark" : "border-zinc-200 hover:border-zus-navy"}`}>
      <span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-xl ${primary ? "bg-zus-green-50 text-zus-green-dark" : "bg-zus-blue-50 text-zus-navy"}`}>
        {icon === "plan" ? (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M7 14h4M7 17h7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" />
          </svg>
        )}
      </span>
      <p className="mt-4 text-xs font-semibold tracking-wider text-zinc-600 uppercase">{tag}</p>
      <h3 className="mt-1 text-lg font-semibold text-zus-navy">{title}</h3>
      <p className="mt-1 text-sm text-zinc-700">{text}</p>
      <ul className="mt-3 space-y-1 text-sm text-zinc-700">
        {points.map((p) => <li key={p} className="flex gap-2"><span aria-hidden="true" className="text-zus-green-dark">✓</span>{p}</li>)}
      </ul>
      <button type="button" onClick={onClick}
        className={`mt-5 self-start rounded-full px-5 py-2.5 text-sm font-semibold after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-zus-green-dark ${
          primary ? "bg-zus-green-dark text-white hover:bg-zus-navy" : "border border-zus-navy text-zus-navy hover:bg-zus-blue-50"}`}>
        {cta}
      </button>
    </li>
  );
}

export function Intro({ headingRef, onStart, onForms, onPreset, onSensitive, presets }: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
  onForms: () => void;
  onPreset: (a: Partial<Answers>) => void;
  onSensitive: () => void;
  presets: { id: string; label: string; answers: Partial<Answers> }[];
}) {
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 rounded-3xl bg-white px-5 py-8 sm:px-10 sm:py-12 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zus-green-dark">Urlopy i zasiłki dla rodziców</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-semibold leading-tight text-zus-navy focus:outline-none sm:text-4xl">
            Zaplanujcie urlopy po narodzinach dziecka bez zgadywania
          </h1>
          <p className="mt-4 max-w-xl text-base text-zinc-700">
            W kilka minut sprawdzicie, co Wam przysługuje, na jak długo i ile wyniesie zasiłek, a do tego co, gdzie i do kiedy złożyć.
          </p>
          <button type="button" onClick={() => document.getElementById("jak-to-dziala")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="mt-4 text-sm font-semibold text-zus-navy underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
            Jak to działa?
          </button>
          <p className="mt-4 text-xs text-zinc-600">Wynik ma charakter informacyjny i nie jest decyzją ZUS.</p>
        </div>
        <div className="hidden justify-center md:flex"><Illustration /></div>
      </section>

      {/* FE1-11: wybór drogi — kreator (pełny plan) albo szybkie pisma (docs/FORMS_FLOW.md) */}
      <section aria-labelledby="start-h" className="-mt-4">
        <h2 id="start-h" className="text-xl font-semibold text-zus-navy">Od czego chcesz zacząć?</h2>
        <p className="mt-1 text-sm text-zinc-600">Możesz w każdej chwili przejść na drugą drogę — z planu do pism i z powrotem.</p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          <PathCard primary icon="plan" tag="Kilka minut" title="Sprawdź, co Ci przysługuje"
            text="Odpowiesz na kilka pytań, a my policzymy urlopy i zasiłki obojga rodziców."
            points={["okresy i kwoty na osi czasu", "terminy, ryzyka i lista dokumentów", "na końcu — pisma do wypełnienia"]}
            cta="Zaczynamy →" onClick={onStart} />
          <PathCard icon="forms" tag="Wiem, czego potrzebuję" title="Złóż pisma szybko"
            text="Wybierz pismo z listy: ZAM, Z-3, Z-3a, ZAS-12 lub ZAS-53 — z opisem, kto je składa i kiedy."
            points={["bez wypełniania kreatora", "opis każdego pisma w jednym miejscu", "od razu do wypełnienia"]}
            cta="Wybierz pismo →" onClick={onForms} />
        </ul>

        {/* FE1-14: ścieżka dla rodziców po stracie — tuż pod wyborem drogi, wyraźna i ciepła, nie na dole strony */}
        <section aria-labelledby="loss-h" className="mt-4 flex flex-col gap-4 rounded-2xl border border-zus-blue/30 bg-zus-blue-50 p-5 text-zus-navy sm:flex-row sm:items-center sm:p-6">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-zus-blue">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2 0 3.5 1.1 4.3 2.6.8-1.5 2.3-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="loss-h" className="text-lg font-semibold">Gdy ciąża nie zakończyła się szczęśliwie</h3>
            <p className="mt-1 text-sm">Bardzo nam przykro. Przygotowaliśmy spokojniejszą ścieżkę: mniej pytań, najpierw wsparcie i kontakty do osób, które pomagają po stracie dziecka, a kwoty tylko wtedy, gdy zechcesz je zobaczyć.</p>
          </div>
          <button type="button" onClick={onSensitive}
            className="shrink-0 self-start rounded-full bg-zus-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-zus-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-navy sm:self-center">
            Przejdź do trybu spokojnego
          </button>
        </section>
      </section>

      <section id="jak-to-dziala" aria-labelledby="how-h" className="scroll-mt-4">
        <h2 id="how-h" className="text-xl font-semibold text-zus-navy">Jak to działa</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {HOW.map((h) => (
            <li key={h.n} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zus-green-50 text-base font-semibold text-zus-green-dark">{h.n}</span>
              <h3 className="mt-3 font-semibold text-zus-navy">{h.title}</h3>
              <p className="mt-1 text-sm text-zinc-700">{h.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ex-h">
        <h2 id="ex-h" className="text-xl font-semibold text-zus-navy">Albo zobaczcie gotowy przykład</h2>
        <p className="mt-1 text-sm text-zinc-600">Przykładowe dane, niezwiązane z żadną prawdziwą sprawą. Każdą odpowiedź możecie potem zmienić.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPreset(p.answers)}
                className="flex h-full w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left text-sm font-medium text-zinc-900 hover:border-zus-green-dark focus-visible:outline-2 focus-visible:outline-zus-green-dark">
                <span>{p.label}</span><span aria-hidden="true" className="text-zus-green-dark">→</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
