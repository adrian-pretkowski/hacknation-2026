/** Stopka: wyróżnienie jakości interfejsu - responsywność (RWD) i dostępność WCAG 2.2 AA (FE1-63). */
const BADGES = [
  {
    label: "Responsywna",
    detail: "telefon · tablet · komputer",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <rect x="2" y="4" width="14" height="10" rx="1.5" />
        <path d="M6 18h6M9 14v4" />
        <rect x="17" y="8" width="5" height="12" rx="1" />
      </svg>
    ),
  },
  {
    label: "WCAG 2.2 AA",
    detail: "dostępność cyfrowa",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="4.5" r="1.8" />
        <path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3 6M12 14.5l3 6" />
      </svg>
    ),
  },
];

export function FooterBadges() {
  return (
    <ul aria-label="Jakość interfejsu" className="mt-3 flex flex-wrap gap-2" data-testid="footer-badges">
      {BADGES.map((b) => (
        <li
          key={b.label}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-2 pr-3 text-emerald-900"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white">{b.icon}</span>
          <span>
            <span className="font-semibold">{b.label}</span>
            <span className="text-emerald-800"> - {b.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
