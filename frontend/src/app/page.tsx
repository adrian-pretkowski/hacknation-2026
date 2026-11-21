import Link from "next/link";
import { AppVersion } from "@/components/AppVersion";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { Wizard } from "@/features/main-flow/wizard/Wizard";
import { UserChip } from "@/features/simulations/UserChip";

export default function Home() {
  return (
    <>
      <DemoModeBanner />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-zus-green-dark text-sm font-bold text-white">PR</span>
          <p className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-zus-navy sm:text-xl">Przewodnik Przyszłego Rodzica</p>
          <Link href="/wsparcie" className="text-sm font-medium text-zus-navy underline underline-offset-2">Przewodnik</Link>
          <UserChip />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <Wizard />
      </main>
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-zinc-600">
          Prototyp HackNation 2026. Wynik ma charakter informacyjny i nie jest decyzją ZUS. Integracje z systemami zewnętrznymi są symulowane.
          <AppVersion />
        </div>
      </footer>
    </>
  );
}
