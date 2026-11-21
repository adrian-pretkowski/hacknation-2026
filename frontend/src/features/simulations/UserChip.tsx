"use client";

// Nagłówek: kto jest zalogowany (SYMULACJA). Neutralny przycisk, bez znaków usług zewnętrznych.
import { useSimSession } from "./session";
import { fullName, initials } from "./users";

const cls = "inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:border-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

export function UserChip() {
  const { user, requestLogin, openAccount } = useSimSession();
  if (!user) {
    return (
      <button type="button" onClick={() => requestLogin()} className={cls}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="6" y="2.5" width="8" height="15" rx="2" /><path d="M9 14.5h2" strokeLinecap="round" /></svg>
        <span>Zaloguj się</span>
        <span className="rounded bg-amber-200 px-1 text-[10px] font-bold tracking-wider text-amber-950">SYMULACJA</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={openAccount} className={cls}>
      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-semibold">{initials(user)}</span>
      <span className="max-w-[9rem] truncate sm:max-w-none">{fullName(user)}</span>
      <span className="hidden rounded bg-amber-200 px-1 text-[10px] font-bold tracking-wider text-amber-950 sm:inline">TEST</span>
      {/* FE1-28 (WCAG 2.5.3): nazwa przycisku zaczyna się od widocznego tekstu - bez aria-label, dopisek tylko dla czytników */}
      <span className="sr-only"> - konto testowe, otwórz dane konta (symulacja)</span>
    </button>
  );
}
