"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FormDetail, FormPicker } from "@/features/documents/FormPicker";
import { FORMS, type FormCode } from "@/features/documents/forms";
import { type Answers, EMPTY_ANSWERS, PRESETS } from "./answers";
import { Intro } from "./Intro";
import { Results } from "./Results";
import { STEPS } from "./steps";

const btn = "rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark";

// Widok kreatora: ekran startowy → kroki → wynik. Każde przejście trafia do historii przeglądarki,
// więc przycisk „Wstecz” w przeglądarce (i gest wstecz na telefonie) cofa o jeden krok.
// FE1-11: „forms” = ścieżka szybkich pism, „form” = ekran jednego pisma (z listy pism albo z wyniku).
type View = { kind: "intro" } | { kind: "step"; index: number } | { kind: "result" }
  | { kind: "forms" } | { kind: "form"; code: FormCode; from: "forms" | "result" };

export function Wizard() {
  const [a, setA] = useState<Answers>(EMPTY_ANSWERS);
  const [view, setView] = useState<View>({ kind: "intro" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [storyOpen, setStoryOpen] = useState(false);
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
  const openForm = (code: FormCode, from: "forms" | "result") => show({ kind: "form", code, from });
  const answered = steps.filter((s, i) => (done || i < index) && s.summary(a)).length;
  const progress = done ? 100 : Math.round(((index + 1) / (steps.length + 1)) * 100);

  if (view.kind === "intro") {
    return <Intro headingRef={headingRef} onStart={start} onForms={() => show({ kind: "forms" })} onPreset={loadPreset} onSensitive={startSensitive} presets={PRESETS} />;
  }

  if (view.kind === "forms" || view.kind === "form") {
    const homeBtn = "inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zus-navy hover:border-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark";
    return (
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => show({ kind: "intro" })} className={homeBtn}>← Strona startowa</button>
        <p className="mt-6 text-xs font-semibold tracking-wider text-zus-green-dark uppercase">{view.kind === "forms" ? "Szybkie pisma" : `Pismo ${view.code}`}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 mb-2 scroll-mt-4 text-2xl font-semibold text-zus-navy focus:outline-none">
          {view.kind === "forms" ? "Które pismo chcesz złożyć?" : FORMS[view.code].name}
        </h2>
        {view.kind === "forms" ? (
          <>
            <p className="mb-6 text-sm text-zinc-700">Kliknij pismo, aby je wypełnić. Nie wiesz, które wybrać?{" "}
              <button type="button" onClick={start} className="font-semibold text-zus-navy underline underline-offset-2">Sprawdź w kreatorze, co Ci przysługuje</button> — na końcu podpowiemy pisma.</p>
            <FormPicker onOpen={(c) => openForm(c, "forms")} />
          </>
        ) : (
          <div className="mt-4">
            <FormDetail code={view.code} onBack={() => show(view.from === "result" ? { kind: "result" } : { kind: "forms" })}
              backLabel={view.from === "result" ? "Wróć do planu" : "Wróć do listy pism"} />
          </div>
        )}
      </div>
    );
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
        <section aria-labelledby="story-h" className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="story-h" className="text-base font-semibold text-zus-navy">Twoja historia</h2>
            <span className="text-xs text-zinc-600">{done ? "Gotowe" : `Krok ${index + 1} z ${steps.length}`}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp">
            <div className="h-full rounded-full bg-zus-green transition-all" style={{ width: `${progress}%` }} />
          </div>
          <button type="button" onClick={() => setStoryOpen((o) => !o)} aria-expanded={storyOpen}
            className="mt-3 w-full rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold text-zus-navy lg:hidden">
            {storyOpen ? "Ukryj historię" : `Pokaż historię (${answered})`}
          </button>
          <ol className={`mt-4 ${storyOpen ? "block" : "hidden"} lg:block`}>
            {steps.map((s, i) => {
              const current = !done && i === index;
              const visited = done || i < index;
              const complete = s.complete(a) && visited;
              const summary = s.summary(a);
              return (
                <li key={s.id} className="relative pb-4 pl-9 last:pb-0">
                  <span aria-hidden="true" className="absolute top-7 bottom-0 left-[11px] w-0.5 bg-zinc-200" />
                  <span aria-hidden="true" className={`absolute top-0.5 left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-semibold ${
                    current ? "border-zus-green-dark bg-zus-green-dark text-white" : complete ? "border-zus-green-dark bg-zus-green-50 text-zus-green-dark" : "border-zinc-300 bg-white text-zinc-500"}`}>
                    {complete ? "✓" : i + 1}
                  </span>
                  <button type="button" onClick={() => go(i)} aria-current={current ? "step" : undefined}
                    className={`group block w-full rounded-lg px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-zus-green-dark ${current ? "bg-zus-green-50" : "hover:bg-zinc-50"}`}>
                    <span className={`block text-xs ${current ? "font-semibold text-zus-green-dark" : "text-zinc-500"}`}>
                      {current ? `Teraz: ${s.title}` : s.title}
                    </span>
                    {(visited || current) && summary ? (
                      <span className={`mt-0.5 block text-sm ${visited ? "font-semibold text-zus-navy" : "text-zus-navy"}`}>
                        <span className="sr-only">Wybrano: </span>{summary}
                      </span>
                    ) : !visited && !current ? null : (
                      <span className="mt-0.5 block text-sm text-zinc-500">jeszcze bez odpowiedzi</span>
                    )}
                    {visited && <span className="mt-0.5 block text-xs text-zinc-500 underline-offset-2 group-hover:text-zus-navy group-hover:underline">zmień</span>}
                    {complete && <span className="sr-only"> (uzupełniony)</span>}
                  </button>
                </li>
              );
            })}
            <li className="relative pl-9">
              <span aria-hidden="true" className={`absolute top-0.5 left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] ${done ? "border-zus-green-dark bg-zus-green-dark text-white" : "border-zinc-300 bg-white text-zinc-500"}`}>★</span>
              <button type="button" onClick={() => show({ kind: "result" })} aria-current={done ? "step" : undefined}
                className={`block w-full rounded-lg px-2 py-1 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-zus-green-dark ${done ? "bg-zus-green-50 text-zus-navy" : "text-zus-navy hover:bg-zinc-50"}`}>
                Twój plan
              </button>
            </li>
          </ol>
        </section>
        {!a.sensitive ? (
          <button type="button" onClick={startSensitive}
            className="mt-4 flex w-full items-start gap-2 rounded-xl border border-zus-blue/30 bg-zus-blue-50 p-3 text-left text-zus-navy hover:border-zus-blue/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-navy">
            <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-zus-blue">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2 0 3.5 1.1 4.3 2.6.8-1.5 2.3-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Gdy ciąża nie zakończyła się szczęśliwie</span>
              <span className="mt-0.5 block text-xs underline underline-offset-2">Przejdź do trybu spokojnego</span>
            </span>
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
            <Results answers={a} onEdit={editStep} canEdit={(id) => steps.some((s) => s.id === id)} onOpenForm={(c) => openForm(c, "result")} />
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
