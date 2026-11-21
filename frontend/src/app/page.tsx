import { DemoModeBanner } from "@/components/DemoModeBanner";
import { Wizard } from "@/features/main-flow/wizard/Wizard";

export default function Home() {
  return (
    <>
      <DemoModeBanner />
      <header className="border-b-4 border-zus-green bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <p className="text-xl font-semibold tracking-tight text-zus-navy sm:text-2xl">Przewodnik Przyszłego Rodzica</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <h1 className="text-lg font-semibold text-zus-navy sm:text-xl">Urlopy i zasiłki dla rodziców — sprawdź w kilku krokach</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-700">
          Pokażemy, co Wam przysługuje, na jak długo, ile wyniesie, co i gdzie złożyć oraz na co uważać. Wynik ma charakter
          informacyjny i nie jest decyzją ZUS.
        </p>
        <div className="mt-6">
          <Wizard />
        </div>
      </main>
    </>
  );
}
