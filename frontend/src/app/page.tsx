import Link from "next/link";
import { AppVersion } from "@/components/AppVersion";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { MAIN_ID, SkipLink } from "@/components/SkipLink";
import { Wizard } from "@/features/main-flow/wizard/Wizard";
import { UserChip } from "@/features/simulations/UserChip";
import { BrandLogo } from "@/components/BrandLogo";

export default function Home() {
  return (
    <>
      <SkipLink />
      <DemoModeBanner />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-[78rem] flex-wrap items-center gap-3 px-4 py-4">
          <BrandLogo />
          <p className="min-w-0 flex-1 basis-[calc(100%-3rem)] text-lg font-semibold tracking-tight text-zus-navy sm:basis-0 sm:text-xl">Przewodnik Przyszłego Rodzica</p>
          <Link href="/sprawy" className="text-sm font-medium text-zus-navy underline underline-offset-2">Przykładowe wnioski</Link>
          <Link href="/wsparcie" className="text-sm font-medium text-zus-navy underline underline-offset-2">Przewodnik</Link>
          <Link href="/admin" className="rounded-md border border-zus-navy px-3 py-1.5 text-sm font-medium text-zus-navy hover:bg-zinc-50">Panel admina</Link>
          <UserChip />
        </div>
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto w-full max-w-[78rem] flex-1 px-4 py-6 sm:py-10 focus:outline-none">
        <Wizard />
      </main>
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-[78rem] px-4 py-4 text-xs text-zinc-600">
          Prototyp HackNation 2026. Wynik ma charakter informacyjny i nie jest decyzją ZUS. Integracje z systemami zewnętrznymi są symulowane.
          <AppVersion />
        </div>
      </footer>
    </>
  );
}
