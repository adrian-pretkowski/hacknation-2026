import type { Metadata } from "next";
import { Guide } from "@/features/support/Guide";

export const metadata: Metadata = { title: "Przewodnik - ryzyka, ochrona pracy, wsparcie · Przewodnik Przyszłego Rodzica" };

export default function GuidePage() {
  return <Guide />;
}
