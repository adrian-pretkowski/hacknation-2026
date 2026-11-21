// FE1-15: jedno źródło normalizacji kwot z pól kreatora (pole, walidacja, żądanie, optymalizator, podsumowanie).
// „7 800,50” → "7800.50"; końcowy separator („7800,”) jest pomijany; pusta / błędna / 0 → null.

/** Kwota jako string dziesiętny z kropką (najwyżej 2 miejsca, > 0) albo null. */
export function normalizeMoney(raw: string): string | null {
  const v = raw.trim().replace(/\s/g, "").replace(",", ".").replace(/\.$/, "");
  return /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 ? v : null;
}

/** Komunikat przy polu kwoty; pusta wartość = „nie podano” (bez błędu). */
export function moneyError(raw: string): string | undefined {
  if (raw.trim() === "") return undefined;
  if (normalizeMoney(raw) !== null) return undefined;
  const v = raw.trim().replace(/\s/g, "").replace(",", ".").replace(/\.$/, "");
  if (/^\d+(\.\d{1,2})?$/.test(v)) return "Kwota musi być większa od zera — jeśli jej nie znasz, zostaw pole puste.";
  return "Wpisz kwotę w złotych, np. 7800 albo 7800,50 (najwyżej 2 miejsca po przecinku).";
}
