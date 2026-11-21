import type { Metadata } from "next";
import { Guide } from "@/features/support/Guide";

export const metadata: Metadata = { title: "Wsparcie po stracie dziecka · Przewodnik Przyszłego Rodzica" };

// FE2-05: tryb wrażliwy - wsparcie na górze, pozostałe informacje na żądanie.
export default function SensitiveGuidePage() {
  return <Guide sensitive />;
}
