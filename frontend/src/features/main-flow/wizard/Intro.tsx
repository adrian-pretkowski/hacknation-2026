"use client";

// Ekran startowy kreatora: krótko, co dostaniecie, trzy kroki „jak to działa” i gotowe przykłady (dane syntetyczne).
import type { RefObject } from "react";
import type { Answers } from "./answers";

const HOW: { n: string; icon: "ask" | "plan" | "docs"; title: string; text: string }[] = [
  { n: "1", icon: "ask", title: "Odpowiadacie na kilka pytań", text: "Tylko te, które mają znaczenie w Waszej sytuacji. Każde pytanie można pominąć i wrócić do niego później." },
  { n: "2", icon: "plan", title: "Widzicie plan na osi czasu", text: "Urlopy obojga rodziców, kwoty zasiłków i porównanie wariantów wypłaty w jednym miejscu." },
  { n: "3", icon: "docs", title: "Wiecie, co i kiedy złożyć", text: "Lista dokumentów, adresat każdego wniosku, terminy i ryzyka, na które trzeba uważać." },
];

type PresetKind = "mother" | "twins" | "father" | "business" | "progress";
/** FE1-47: ikona kafelka gotowego przykładu dobrana po treści etykiety; nowe przykłady dostają ikonę domyślną (mama). */
function presetKind(label: string): PresetKind {
  const l = label.toLowerCase();
  if (/bliźn|trojacz|wieloraczk/.test(l)) return "twins";
  if (/\btata\b|ojciec|ojcowski/.test(l)) return "father";
  if (/jdg|działalno|firm|zaległo|składk/.test(l)) return "business";
  if (/wykorzystan|z 20\d\d|część urlopu/.test(l)) return "progress";
  return "mother";
}

function PresetIcon({ kind }: { kind: PresetKind }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {kind === "mother" && <><circle cx="12" cy="6" r="2.5" /><path d="M7 20c0-4 2-7 5-7s5 3 5 7" /><circle cx="12" cy="16.5" r="1.8" /></>}
      {kind === "twins" && <><circle cx="8" cy="8" r="2.5" /><circle cx="16" cy="8" r="2.5" /><path d="M3.5 19c0-3 2-5 4.5-5s4 1.5 4 3.5M12 17.5c0-2 1.5-3.5 4-3.5s4.5 2 4.5 5" /></>}
      {kind === "father" && <><circle cx="10" cy="5.5" r="2.5" /><path d="M5 20v-5c0-2.5 2-4.5 5-4.5s5 2 5 4.5" /><circle cx="17.5" cy="13" r="1.8" /><path d="M15 20c0-1.8 1.1-3 2.5-3s2.5 1.2 2.5 3" /></>}
      {kind === "business" && <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></>}
      {kind === "progress" && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="M7 14h5" strokeWidth="3" /><path d="M13 14h4" strokeDasharray="1.5 1.5" /></>}
    </svg>
  );
}

/** FE1-46: ikony liniowe kroków „Jak to działa” (ozdobne). */
function HowIcon({ kind }: { kind: "ask" | "plan" | "docs" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {kind === "ask" && <><path d="M4 5h16v10H9l-5 4z" /><path d="M9 9h6M9 12h4" /></>}
      {kind === "plan" && <><path d="M3 19h18" /><rect x="4" y="6" width="7" height="4" rx="1.5" /><rect x="9" y="12" width="11" height="4" rx="1.5" /></>}
      {kind === "docs" && <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="m10 14 2 2 3-4" /></>}
    </svg>
  );
}

/** FE1-30: tło sekcji powitalnej - rodzina tuląca maluszka, pozytywka nad łóżeczkiem, delikatne serduszka. Ozdobne (aria-hidden). */
function HeroBackdrop() {
  const hang = "absolute top-0 hidden flex-col items-center md:flex";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-zus-green-50 via-white to-amber-50" />
      <div className="absolute -top-24 -right-10 h-80 w-80 rounded-full bg-amber-100/70 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-zus-green-50 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-amber-50 blur-3xl" />

      {/* pozytywka nad łóżeczkiem: gwiazdka, księżyc, chmurka na nitkach */}
      <div className={`${hang} right-[24%]`}><span className="h-10 w-px bg-zus-green-dark/30" />
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-amber-200 stroke-amber-400/70" strokeWidth="1"><path d="M12 2.5l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.4l-5.4 2.9 1.1-6.1-4.5-4.3 6.1-.8z" strokeLinejoin="round" /></svg></div>
      <div className={`${hang} right-[17%]`}><span className="h-12 w-px bg-zus-green-dark/30" />
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-zus-blue-50 stroke-zus-blue/40" strokeWidth="1"><path d="M20 13.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 9.5z" strokeLinejoin="round" /></svg></div>
      <div className={`${hang} right-[9%]`}><span className="h-7 w-px bg-zus-green-dark/30" />
        <svg viewBox="0 0 32 20" className="h-6 w-9 fill-white stroke-zus-blue/40" strokeWidth="1"><path d="M8 18a6 6 0 0 1-.6-12A8 8 0 0 1 22.5 5 6.5 6.5 0 0 1 25 18z" strokeLinejoin="round" /></svg></div>

      {/* rozsypane serduszka */}
      {[
        "top-2 left-2 h-4 w-4 text-zus-green/40 -rotate-12 sm:top-6 sm:left-6 sm:h-5 sm:w-5",
        "bottom-8 left-[44%] hidden h-6 w-6 text-zus-green/30 rotate-12 sm:block",
        "top-1/2 left-[60%] h-4 w-4 text-amber-400/40 hidden md:block",
        "bottom-2 right-3 h-5 w-5 text-zus-green/40 md:hidden",
      ].map((c) => (
        <svg key={c} viewBox="0 0 24 24" className={`absolute fill-current ${c}`}>
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2 0 3.5 1.1 4.3 2.6.8-1.5 2.3-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
        </svg>
      ))}
    </div>
  );
}

/** Rodzice przytulający maluszka w kocyku, w świetle wschodzącego słońca. Ozdobne. */
function FamilyIllustration() {
  const heart = "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2 0 3.5 1.1 4.3 2.6.8-1.5 2.3-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z";
  return (
    <svg viewBox="0 0 240 210" className="h-auto w-full max-w-xs" aria-hidden="true">
      <circle cx="120" cy="120" r="88" className="fill-amber-100" />
      <circle cx="120" cy="120" r="64" className="fill-amber-50" />
      {/* rodzic 1 */}
      <path d="M44 210c0-62 14-100 46-104 26-2 34 22 34 44v60z" className="fill-zus-navy" />
      <circle cx="88" cy="78" r="20" className="fill-orange-200" />
      <path d="M68 76c0-16 10-24 22-24 11 0 19 7 19 17-8 1-20-3-26-10-3 7-8 13-15 17z" className="fill-zus-ink" />
      {/* rodzic 2 */}
      <path d="M116 210v-58c0-24 10-42 36-42 28 2 44 40 44 100z" className="fill-zus-green-dark" />
      <circle cx="152" cy="86" r="19" className="fill-orange-100" />
      <path d="M133 84c0-14 9-22 20-22 12 0 20 9 19 22-6-6-15-9-24-9-6 0-11 3-15 9z" className="fill-amber-800" />
      <circle cx="166" cy="62" r="8" className="fill-amber-800" />
      {/* maluszek w kocyku */}
      <ellipse cx="122" cy="156" rx="40" ry="22" transform="rotate(-8 122 156)" className="fill-amber-50 stroke-white" strokeWidth="3" />
      <path d="M92 158c14 10 40 10 62-2" className="fill-none stroke-amber-200" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="148" r="13" className="fill-orange-100 stroke-white" strokeWidth="2" />
      <path d="M95 148q2 2 4 0M103 147q2 2 4 0" className="fill-none stroke-zus-ink" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="96" cy="153" r="2" className="fill-zus-green/50" />
      {/* ramiona obejmujące */}
      <path d="M70 150c10 26 40 30 62 22" className="fill-none stroke-zus-navy" strokeWidth="10" strokeLinecap="round" />
      <path d="M182 150c-6 22-28 30-46 26" className="fill-none stroke-zus-green-dark" strokeWidth="10" strokeLinecap="round" />
      {/* serduszka nad rodziną */}
      <g className="fill-zus-green"><path d={heart} transform="translate(108 14) scale(.9)" /></g>
      <g className="fill-zus-green/50"><path d={heart} transform="translate(138 30) scale(.55)" /></g>
      <g className="fill-amber-300"><path d={heart} transform="translate(86 34) scale(.45)" /></g>
    </svg>
  );
}

/** Ikona karty wyboru drogi - rysowana dużym, cienkim konturem jako ozdobne tło karty. */
function PathIcon({ icon, className }: { icon: "plan" | "forms"; className: string }) {
  return icon === "plan" ? (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M7 14h4M7 17h7" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" />
    </svg>
  );
}

/** Karta wyboru drogi na ekranie startowym - cała klikalna (after:inset-0 na przycisku).
 *  FE1-35: ikona jako duże ozdobne tło w rogu karty (z poświatą i delikatnym gradientem), lekko obraca się przy najechaniu. */
function PathCard({ tag, title, text, points, cta, onClick, icon, primary }: {
  tag: string; title: string; text: string; points: string[]; cta: string; onClick: () => void; icon: "plan" | "forms"; primary?: boolean;
}) {
  return (
    <li className={`group relative isolate flex flex-col rounded-2xl border-2 bg-linear-to-br via-white to-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6 ${
      primary ? "border-zus-green-dark from-zus-green-50" : "border-zinc-200 from-zus-blue-50 hover:border-zus-navy"}`}>
      {/* overflow-hidden tylko na tle - nie ucina obwódki fokusu przycisku (after:inset-0 + outline-offset) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[14px]">
        <div className={`absolute -right-12 -bottom-12 h-56 w-56 rounded-full blur-2xl ${primary ? "bg-zus-green-50" : "bg-zus-blue-50"}`} />
        <PathIcon icon={icon} className={`absolute -right-6 -bottom-8 h-44 w-44 -rotate-12 transition duration-500 group-hover:-rotate-6 group-hover:scale-105 sm:h-52 sm:w-52 ${
          primary ? "text-zus-green-dark/15" : "text-zus-navy/10"}`} />
      </div>
      <p className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase ${primary ? "bg-zus-green-dark text-white" : "bg-zus-blue-50 text-zus-navy"}`}>{tag}</p>
      <h3 className="mt-3 text-xl font-semibold text-zus-navy">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-700">{text}</p>
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
      <section className="relative isolate grid items-center gap-8 overflow-hidden rounded-3xl border border-zus-green-50 bg-white px-5 py-8 sm:px-10 sm:py-12 md:grid-cols-[minmax(0,1fr)_16rem]">
        <HeroBackdrop />
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
        <div className="hidden justify-center md:flex"><FamilyIllustration /></div>
      </section>

      {/* FE1-11: wybór drogi - kreator (pełny plan) albo szybkie pisma (docs/FORMS_FLOW.md) */}
      <section aria-labelledby="start-h" className="-mt-4">
        <h2 id="start-h" className="text-xl font-semibold text-zus-navy">Od czego chcesz zacząć?</h2>
        <p className="mt-1 text-sm text-zinc-600">Możesz w każdej chwili przejść na drugą drogę - z planu do pism i z powrotem.</p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          <PathCard primary icon="plan" tag="Kilka minut" title="Sprawdź, co Ci przysługuje"
            text="Odpowiesz na kilka pytań, a my policzymy urlopy i zasiłki obojga rodziców."
            points={["okresy i kwoty na osi czasu", "terminy, ryzyka i lista dokumentów", "na końcu - pisma do wypełnienia"]}
            cta="Zaczynamy →" onClick={onStart} />
          <PathCard icon="forms" tag="Wiem, czego potrzebuję" title="Złóż pisma szybko"
            text="Wybierz pismo z listy: ZAM, Z-3, Z-3a, ZAS-12 lub ZAS-53 - z opisem, kto je składa i kiedy."
            points={["bez wypełniania kreatora", "opis każdego pisma w jednym miejscu", "od razu do wypełnienia"]}
            cta="Wybierz pismo →" onClick={onForms} />
        </ul>

        {/* FE1-16: ścieżka dla rodziców po stracie - tuż pod wyborem drogi, wyraźna i ciepła, nie na dole strony */}
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
            Przejdź do ścieżki po stracie
          </button>
        </section>
      </section>

      {/* FE1-46: stonowany panel - kroki połączone linią, ikony liniowe; nie konkuruje z wyborem drogi */}
      <section id="jak-to-dziala" aria-labelledby="how-h" className="scroll-mt-4 rounded-3xl border border-zinc-200/80 bg-linear-to-b from-white to-zus-green-50/60 px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-zus-green-dark md:text-center">W trzech krokach</p>
        <h2 id="how-h" className="mt-1 text-xl font-semibold text-zus-navy md:text-center">Jak to działa</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3 md:gap-8">
          {HOW.map((h, i) => (
            <li key={h.n} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
              {i < HOW.length - 1 && (
                <span aria-hidden="true" className="absolute top-14 bottom-[-1.25rem] left-6 border-l-2 border-dashed border-zus-green-100 md:top-6 md:right-[-50%] md:bottom-auto md:left-[calc(50%+2.25rem)] md:border-t-2 md:border-l-0" />
              )}
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-zus-green-dark shadow-sm ring-1 ring-zus-green-100">
                <HowIcon kind={h.icon} />
                <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zus-green-dark text-[11px] font-semibold text-white">{h.n}</span>
              </span>
              <div className="min-w-0 md:mt-0 md:max-w-xs">
                <h3 className="font-semibold text-zus-navy"><span className="sr-only">Krok {h.n}: </span>{h.title}</h3>
                <p className="mt-1 text-sm text-zinc-700">{h.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ex-h">
        <h2 id="ex-h" className="text-xl font-semibold text-zus-navy">Albo zobaczcie gotowy przykład</h2>
        <p className="mt-1 text-sm text-zinc-600">Przykładowe dane, niezwiązane z żadną prawdziwą sprawą. Każdą odpowiedź możecie potem zmienić.</p>
        {/* FE1-47: kafelki z ikoną dobraną do przykładu - stonowane, bez konkurowania z wyborem drogi */}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPreset(p.answers)}
                className="group flex h-full w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 pr-4 text-left text-sm font-medium text-zus-ink transition hover:-translate-y-0.5 hover:border-zus-green-100 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zus-green-50 text-zus-green-dark transition group-hover:bg-zus-green-100">
                  <PresetIcon kind={presetKind(p.label)} />
                </span>
                <span className="min-w-0 flex-1">{p.label}</span>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zus-green-dark transition group-hover:translate-x-0.5 group-hover:border-zus-green-dark group-hover:bg-zus-green-dark group-hover:text-white motion-reduce:transition-none">→</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
