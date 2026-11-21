import { DemoModeBanner } from "@/components/DemoModeBanner";
import { CalculatorForm } from "@/features/main-flow/CalculatorForm";

export default function Home() {
  return (
    <>
      <DemoModeBanner />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Przewodnik Przyszłego Rodzica</h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          Sprawdź, ile i na jak długo przysługuje zasiłek macierzyński. Wynik ma charakter informacyjny i nie jest decyzją ZUS.
        </p>
        <div className="mt-6">
          <CalculatorForm />
        </div>
      </main>
    </>
  );
}
