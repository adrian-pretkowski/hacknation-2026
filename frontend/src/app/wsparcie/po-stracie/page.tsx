import type { Metadata } from "next";
import { Guide } from "@/features/support/Guide";

export const metadata: Metadata = { title: "Wsparcie po stracie dziecka · Przewodnik Przyszłego Rodzica" };

// FE2-05: ścieżka po stracie (tryb wrażliwy) - wsparcie na górze, pozostałe informacje na żądanie. FE1-28: dawniej /wsparcie/spokojny.
export default function SensitiveGuidePage() {
  return <Guide sensitive />;
}
