import type { Metadata } from "next";
import Link from "next/link";
import { AppVersion } from "@/components/AppVersion";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { MAIN_ID, SkipLink } from "@/components/SkipLink";
import { AdminParameters } from "@/features/admin/AdminParameters";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = { title: "Parametry prawne - panel administratora · Przewodnik Przyszłego Rodzica" };

// FE1-03: panel admina parametrów (GET/PUT /api/admin/parameters).
export default function AdminPage() {
  return (
    <>
      <SkipLink />
      <DemoModeBanner />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4">
          <BrandLogo />
          <p className="min-w-0 flex-1 basis-[calc(100%-3rem)] text-lg font-semibold tracking-tight text-zus-navy sm:basis-0 sm:text-xl">Przewodnik Przyszłego Rodzica</p>
          <Link href="/" className="text-sm font-medium text-zus-navy underline underline-offset-2">Strona główna</Link>
        </div>
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10 focus:outline-none">
        <AdminParameters />
      </main>
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-zinc-600">
          Prototyp HackNation 2026. Panel administratora - zmiany parametrów działają od razu w kolejnych wyliczeniach.
          <AppVersion />
        </div>
      </footer>
    </>
  );
}
