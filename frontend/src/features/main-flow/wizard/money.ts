// FE1-15: jedno źródło normalizacji kwot z pól kreatora (pole, walidacja, żądanie, optymalizator, podsumowanie).
// „7 800,50” → "7800.50"; końcowy separator („7800,”) jest pomijany.

const canon = (raw: string) => raw.trim().replace(/\s/g, "").replace(",", ".").replace(/\.$/, "");

/** Kwota ≥ 0 jako string dziesiętny z kropką (najwyżej 2 miejsca) albo null — np. zaległość w składkach może być 0. */
export function parseMoney(raw: string): string | null {
  const v = canon(raw);
  return /^\d+(\.\d{1,2})?$/.test(v) ? v : null;
}

/** Kwota > 0 (wynagrodzenie, podstawa) albo null. */
export function normalizeMoney(raw: string): string | null {
  const v = parseMoney(raw);
  return v !== null && Number(v) > 0 ? v : null;
}

/** Komunikat przy polu wynagrodzenia; pusta wartość = „nie podano” (bez błędu). */
export function moneyError(raw: string): string | undefined {
  if (raw.trim() === "") return undefined;
  const v = parseMoney(raw);
  if (v === null) return "Wpisz kwotę w złotych, np. 7800 albo 7800,50 (najwyżej 2 miejsca po przecinku).";
  if (Number(v) <= 0) return "Kwota musi być większa od zera — jeśli jej nie znasz, zostaw pole puste.";
  return undefined;
}
