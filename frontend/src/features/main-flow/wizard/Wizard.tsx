"use client";

import { useMemo, useRef, useState } from "react";
import { type Answers, EMPTY_ANSWERS, PRESETS } from "./answers";
import { Results } from "./Results";
import { STEPS } from "./steps";

const btn = "rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark";

export function Wizard() {
  const [a, setA] = useState<Answers>(EMPTY_ANSWERS);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const steps = useMemo(() => STEPS.filter((s) => s.visible(a)), [a]);
  const step = steps[Math.min(index, steps.length - 1)];
  const set = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));
  const focusTop = () => requestAnimationFrame(() => headingRef.current?.focus());

  const go = (i: number) => { setIndex(Math.max(0, Math.min(i, steps.length - 1))); setDone(false); focusTop(); };
  const next = () => { if (index >= steps.length - 1) { setDone(true); focusTop(); } else go(index + 1); };
  const editStep = (id: string) => { const i = steps.findIndex((s) => s.id === id); go(i < 0 ? 0 : i); };
  const loadPreset = (answers: Partial<Answers>) => { setA({ ...EMPTY_ANSWERS, ...answers }); setDone(true); focusTop(); };
  const startSensitive = () => { setA({ ...EMPTY_ANSWERS, sensitive: true, role: "MOTHER", stage: "BORN", stillborn: true }); setIndex(0); setDone(false); focusTop(); };
  const progress = done ? 100 : Math.round((index / steps.length) * 100);

  return (
    <div className="space-y-5">
      {!a.sensitive && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-600">Przykłady:</span>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => loadPreset(p.answers)}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1 hover:border-zus-green-dark focus-visible:outline-2 focus-visible:outline-zus-green-dark">{p.label}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Kroki kreatora" className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp">
            <div className="h-full bg-zus-green transition-all" style={{ width: `${progress}%` }} />
          </div>
          <ol className="mt-3 flex gap-1 overflow-x-auto pb-1 text-sm lg:flex-col lg:overflow-visible">
            {steps.map((s, i) => (
              <li key={s.id} className="relative shrink-0">
                <button type="button" onClick={() => go(i)} aria-current={!done && i === index ? "step" : undefined}
                  className={`w-full rounded-md px-3 py-1.5 text-left ${!done && i === index ? "bg-zus-green-100 font-medium text-zus-navy" : "text-zinc-700 hover:bg-zinc-100"}`}>
                  <span className="mr-1 text-zinc-400">{i + 1}.</span>{s.title}{s.complete(a) && <span className="sr-only"> (uzupełniony)</span>}
                </button>
              </li>
            ))}
            <li className="shrink-0">
              <button type="button" onClick={() => { setDone(true); focusTop(); }} aria-current={done ? "step" : undefined}
                className={`w-full rounded-md px-3 py-1.5 text-left ${done ? "bg-zus-green-100 font-medium text-zus-navy" : "text-zinc-700 hover:bg-zinc-100"}`}>
                <span className="mr-1 text-zinc-400">✓</span>Wynik
              </button>
            </li>
          </ol>
          {!a.sensitive ? (
            <button type="button" onClick={startSensitive} className="mt-3 text-left text-xs text-zinc-600 underline underline-offset-2">
              Poród martwego dziecka lub strata dziecka — tryb spokojny
            </button>
          ) : (
            <button type="button" onClick={() => { setA(EMPTY_ANSWERS); setIndex(0); setDone(false); }} className="mt-3 text-left text-xs text-zinc-600 underline underline-offset-2">
              Wyjdź z trybu spokojnego
            </button>
          )}
        </nav>

        <div className="min-w-0">
          <h2 ref={headingRef} tabIndex={-1} className="mb-3 text-lg font-semibold focus:outline-none">
            {done ? "Twój plan" : `Krok ${index + 1} z ${steps.length}: ${step.title}`}
          </h2>
          {done ? (
            <Results answers={a} onEdit={editStep} />
          ) : (
            <form className="space-y-5 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6"
              onSubmit={(e) => { e.preventDefault(); next(); }}>
              {step.render({ a, set })}
              <div className="flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-4">
                <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={`${btn} border border-zinc-300 disabled:opacity-40`}>Wstecz</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setDone(true); focusTop(); }} className={`${btn} text-zus-navy underline-offset-2 hover:underline`}>Pokaż wynik teraz</button>
                  <button type="submit" disabled={!step.complete(a)} className={`${btn} bg-zus-green-dark text-white hover:bg-zus-navy disabled:opacity-50`}>
                    {index >= steps.length - 1 ? "Pokaż wynik" : "Dalej"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
