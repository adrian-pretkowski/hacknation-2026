import type { Metadata } from "next";
import { SimSessionProvider } from "@/features/simulations/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Przewodnik Przyszłego Rodzica",
  description: "Kalkulator i przewodnik po zasiłkach związanych z rodzicielstwem (prototyp HackNation 2026).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900"><SimSessionProvider>{children}</SimSessionProvider></body>
    </html>
  );
}
