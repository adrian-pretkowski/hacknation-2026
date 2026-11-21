import { permanentRedirect } from "next/navigation";

// FE1-28: dawny adres „trybu spokojnego” - stałe przekierowanie na ścieżkę po stracie (stare linki dalej działają).
export default function LegacySensitiveGuidePage() {
  permanentRedirect("/wsparcie/po-stracie");
}
