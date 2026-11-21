import { permanentRedirect } from "next/navigation";

// FE1-30: dawny adres „trybu spokojnego” - stałe przekierowanie na ścieżkę po stracie (stare linki dalej działają).
export default function LegacySensitiveGuidePage() {
  permanentRedirect("/wsparcie/po-stracie");
}
