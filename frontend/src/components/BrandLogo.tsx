// FE1-51: znak aplikacji w nagłówku (wybór lidera z 3 propozycji: rodzice z maluszkiem, wersja B5) - ozdobny,
// nazwa aplikacji stoi obok jako tekst. Kolory z motywu (granat, zieleń) + pomarańczowy maluszek widoczny z daleka.
// Ten sam znak jest faviconem: app/icon.svg.
export function BrandLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={`shrink-0 ${className}`}>
      <rect width="40" height="40" rx="11" fill="#eef8f2"/>
      <circle cx="12" cy="11" r="4.2" fill="#00416e"/>
      <path d="M4 34c0-8 3.2-13.5 8-13.5 3.2 0 5.3 2.3 6.3 5.8L17.5 34z" fill="#00416e"/>
      <circle cx="28" cy="11" r="4.2" fill="#007a33"/>
      <path d="M36 34c0-8-3.2-13.5-8-13.5-3.2 0-5.3 2.3-6.3 5.8L22.5 34z" fill="#007a33"/>
      <ellipse cx="20" cy="30" rx="8.5" ry="5.4" fill="#ea580c" stroke="#fff" strokeWidth="2"/>
      <circle cx="20" cy="22" r="4.8" fill="#f59e0b" stroke="#fff" strokeWidth="2"/>
    </svg>
  );
}
