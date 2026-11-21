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

export function Intro({ headingRef, onStart, onPreset, onSensitive, presets }: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
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
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={onStart}
              className="rounded-full bg-zus-green-dark px-6 py-3 text-base font-semibold text-white hover:bg-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
              Zaczynamy →
            </button>
            <a href="#jak-to-dziala"
              className="rounded-full border border-zinc-300 px-6 py-3 text-base font-semibold text-zus-navy hover:border-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
              Jak to działa?
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-600">Wynik ma charakter informacyjny i nie jest decyzją ZUS.</p>
        </div>
        <div className="hidden justify-center md:flex"><Illustration /></div>
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

      <section className="rounded-2xl bg-zus-gray-50 p-5 text-sm">
        <h2 className="font-semibold text-zus-navy">Gdy ciąża nie zakończyła się szczęśliwie</h2>
        <p className="mt-1 text-zinc-700">Przygotowaliśmy spokojniejszą ścieżkę: mniej pytań, najpierw informacje o wsparciu, kwoty tylko na życzenie.</p>
        <button type="button" onClick={onSensitive} className="mt-3 font-medium text-zus-navy underline underline-offset-2">Przejdź do trybu spokojnego</button>
      </section>
    </div>
  );
}
