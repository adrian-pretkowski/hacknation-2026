// FE1-30 (WCAG 2.4.1): link „Przejdź do treści” - pierwszy element strony, widoczny po fokusie z klawiatury.
export const MAIN_ID = "tresc";

export function SkipLink() {
  return (
    <a href={`#${MAIN_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-zus-navy focus:shadow-lg focus:outline-2 focus:outline-zus-green-dark">
      Przejdź do treści
    </a>
  );
}
