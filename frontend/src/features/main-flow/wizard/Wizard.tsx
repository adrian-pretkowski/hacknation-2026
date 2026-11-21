"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Answers, EMPTY_ANSWERS, PRESETS } from "./answers";
import { Intro } from "./Intro";
import { Results } from "./Results";
import { STEPS } from "./steps";

const btn = "rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark";

// Widok kreatora: ekran startowy → kroki → wynik. Każde przejście trafia do historii przeglądarki,
// więc przycisk „Wstecz” w przeglądarce (i gest wstecz na telefonie) cofa o jeden krok.
type View = { kind: "intro" } | { kind: "step"; index: number } | { kind: "result" };

export function Wizard() {
  const [a, setA] = useState<Answers>(EMPTY_ANSWERS);
  const [view, setView] = useState<View>({ kind: "intro" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const steps = useMemo(() => STEPS.filter((s) => s.visible(a)), [a]);
  const index = view.kind === "step" ? Math.min(view.index, steps.length - 1) : steps.length - 1;
  const step = steps[index];
  const done = view.kind === "result";
  const set = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const v = (e.state as { wizard?: View } | null)?.wizard;
      // Zdarzenia bez stanu kreatora (np. przejście do kotwicy na stronie startowej) nie zmieniają widoku.
      if (!v) { setView((cur) => (cur.kind === "intro" ? cur : { kind: "intro" })); return; }
      setView(v);
      requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const show = (v: View) => {
    setView(v);
    window.history.pushState({ wizard: v }, "");
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };
  const go = (i: number) => (i < 0 ? show({ kind: "intro" }) : show({ kind: "step", index: Math.min(i, steps.length - 1) }));
  const next = () => (index >= steps.length - 1 ? show({ kind: "result" }) : go(index + 1));
  const back = () => (done ? go(steps.length - 1) : go(index - 1));
  const editStep = (id: string) => { const i = steps.findIndex((s) => s.id === id); go(i < 0 ? 0 : i); };
  const loadPreset = (answers: Partial<Answers>) => { setA({ ...EMPTY_ANSWERS, ...answers }); show({ kind: "result" }); };
  const start = () => { setA(EMPTY_ANSWERS); show({ kind: "step", index: 0 }); };
  const startSensitive = () => { setA({ ...EMPTY_ANSWERS, sensitive: true, role: "MOTHER", stage: "BORN", stillborn: true }); show({ kind: "step", index: 0 }); };
  const progress = done ? 100 : Math.round(((index + 1) / (steps.length + 1)) * 100);

  if (view.kind === "intro") {
    return <Intro headingRef={headingRef} onStart={start} onPreset={loadPreset} onSensitive={startSensitive} presets={PRESETS} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <nav aria-label="Kroki kreatora" className="min-w-0 lg:sticky lg:top-4 lg:self-start">
        <button type="button" onClick={() => show({ kind: "intro" })}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zus-navy hover:border-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5 10 4l7 5.5M5 8v8h10V8" />
          </svg>
          Strona startowa
        </button>
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span>{done ? "Gotowe" : `Krok ${index + 1} z ${steps.length}`}</span><span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp">
          <div className="h-full rounded-full bg-zus-green transition-all" style={{ width: `${progress}%` }} />
        </div>
        <ol className="relative mt-4 flex gap-1 overflow-x-auto pb-1 text-sm lg:flex-col lg:overflow-visible">
          {steps.map((s, i) => {
            const current = !done && i === index;
            const visited = done || i < index;
            const complete = s.complete(a) && visited;
            const summary = s.summary(a);
            return (
              <li key={s.id} className="relative shrink-0">
                <button type="button" onClick={() => go(i)} aria-current={current ? "step" : undefined}
                  className={`flex w-full items-start gap-2 rounded-full px-2 py-1.5 text-left lg:rounded-lg ${current ? "bg-zus-green-50 font-semibold text-zus-navy" : "text-zinc-700 hover:bg-zinc-100"}`}>
                  <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    current ? "border-zus-green-dark bg-zus-green-dark text-white" : complete ? "border-zus-green-dark text-zus-green-dark" : "border-zinc-300 text-zinc-500"}`}>
                    {complete ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap lg:whitespace-normal">{s.title}</span>
                    {(visited || current) && summary && (
                      <span className="block max-w-[14rem] truncate text-xs font-medium text-zus-green-dark lg:max-w-none lg:whitespace-normal">
                        <span className="sr-only">Wybrano: </span>{summary}
                      </span>
                    )}
                  </span>
                  {complete && <span className="sr-only"> (uzupełniony)</span>}
                </button>
              </li>
            );
          })}
          <li className="shrink-0">
            <button type="button" onClick={() => show({ kind: "result" })} aria-current={done ? "step" : undefined}
              className={`flex w-full items-center gap-2 rounded-full px-2 py-1.5 text-left lg:rounded-lg ${done ? "bg-zus-green-50 font-semibold text-zus-navy" : "text-zinc-700 hover:bg-zinc-100"}`}>
              <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${done ? "border-zus-green-dark bg-zus-green-dark text-white" : "border-zinc-300 text-zinc-500"}`}>★</span>
              Twój plan
            </button>
          </li>
        </ol>
        {!a.sensitive ? (
          <button type="button" onClick={startSensitive} className="mt-4 text-left text-xs text-zinc-600 underline underline-offset-2">
            Poród martwego dziecka lub strata dziecka — tryb spokojny
          </button>
        ) : (
          <button type="button" onClick={start} className="mt-4 text-left text-xs text-zinc-600 underline underline-offset-2">
            Wyjdź z trybu spokojnego
          </button>
        )}
      </nav>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-zus-green-dark">{done ? "Wynik" : `Krok ${index + 1} z ${steps.length}`}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 mb-4 scroll-mt-4 text-2xl font-semibold text-zus-navy focus:outline-none">
          {done ? "Twój plan" : step.title}
        </h2>
        {done ? (
          <>
            <Results answers={a} onEdit={editStep} />
            <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
              <button type="button" onClick={back} className={`${btn} border border-zinc-300 bg-white text-zus-navy hover:border-zus-navy`}>← Wstecz</button>
              <button type="button" onClick={() => go(0)} className={`${btn} text-zus-navy hover:underline`}>Zmień odpowiedzi od początku</button>
            </div>
          </>
        ) : (
          <form className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7"
            onSubmit={(e) => { e.preventDefault(); next(); }}>
            {step.render({ a, set })}
            <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={back} className={`${btn} border border-zinc-300 bg-white text-zus-navy hover:border-zus-navy`}>
                ← Wstecz
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <button type="button" onClick={() => show({ kind: "result" })} className={`${btn} text-zus-navy hover:underline`}>Pokaż wynik teraz</button>
                <button type="submit" disabled={!step.complete(a)} className={`${btn} bg-zus-green-dark text-white hover:bg-zus-navy disabled:opacity-50`}>
                  {index >= steps.length - 1 ? "Pokaż plan →" : "Dalej →"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
