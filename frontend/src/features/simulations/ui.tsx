"use client";

// Wspólne elementy ekranów symulacji: stały baner „SYMULACJA”, okno modalne (natywny <dialog>), poglądowy kod QR.
// Własny, neutralny wygląd (szarości + bursztyn) - bez logotypów, kolorów i znaków ZUS ani aplikacji rządowych.
import { useEffect, useRef } from "react";

export function SimBanner({ integration }: { integration: string }) {
  return (
    <p role="note" className="flex items-start gap-2 bg-amber-100 px-4 py-2 text-xs font-medium text-amber-950 sm:text-sm">
      <span className="shrink-0 rounded bg-amber-900 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-white">SYMULACJA</span>
      <span>W wersji produkcyjnej: integracja z {integration}. Tu wszystko jest fikcyjne - bez połączenia z żadnym systemem.</span>
    </p>
  );
}

export function SimModal({ title, integration, onClose, children, wide = false }: {
  title: string; integration: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    // Po zamknięciu fokus wraca do elementu, który otworzył okno (WCAG 2.4.3).
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (d && !d.open) d.showModal();
    return () => {
      d?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog ref={ref} aria-labelledby="sim-modal-title" onCancel={(e) => { e.preventDefault(); onClose(); }}
      className={`m-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-hidden rounded-2xl p-0 shadow-2xl backdrop:bg-zinc-900/60 ${wide ? "max-w-3xl" : "max-w-xl"}`}>
      <div className="flex max-h-[calc(100dvh-1rem)] flex-col">
        <SimBanner integration={integration} />
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3">
          <h2 id="sim-modal-title" className="text-base font-semibold text-zinc-900 sm:text-lg">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Zamknij"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-900">
            ×
          </button>
        </div>
        <div tabIndex={0} role="region" aria-labelledby="sim-modal-title" className="overflow-y-auto px-5 py-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-900">{children}</div>
      </div>
    </dialog>
  );
}

/** Kod QR poglądowy: deterministyczny wzór z wzorcami pozycjonującymi - nie koduje żadnych danych i nie da się go zeskanować. */
export function PseudoQr({ seed, size = 176 }: { seed: string; size?: number }) {
  const n = 25;
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rand = () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rand() > 0.52) cells.push([x, y]);
  const finder = (x: number, y: number) => (
    <g key={`f${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="currentColor" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="white" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} role="img" aria-label="Poglądowy kod QR (symulacja)"
      className="rounded-lg bg-white text-zinc-900" shapeRendering="crispEdges">
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="white" />
      {finder(0, 0)}{finder(n - 7, 0)}{finder(0, n - 7)}
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />)}
    </svg>
  );
}

export const simBtn = "rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50";
export const simBtnPrimary = `${simBtn} bg-zinc-900 text-white hover:bg-zinc-700`;
export const simBtnSecondary = `${simBtn} border border-zinc-300 bg-white text-zinc-900 hover:border-zinc-900`;
