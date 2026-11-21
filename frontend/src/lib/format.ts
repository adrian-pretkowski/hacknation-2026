// Formatowanie do wyświetlenia. Nie przelicza kwot (backend zwraca wartości dokładne jako string).
// Ułamek dłuższy niż 2 cyfry jest skracany z oznaczeniem „…”, bo zasady zaokrąglania ZUS nie są potwierdzone (GAP-001).
export function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const negative = value.startsWith("-");
  const [intPart, fraction = ""] = value.replace("-", "").split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const shown = fraction.length > 2 ? `${fraction.slice(0, 2)}…` : fraction.padEnd(2, "0");
  return `${negative ? "-" : ""}${grouped},${shown} zł`;
}

export function formatRate(value: string | null | undefined): string {
  if (!value) return "—";
  const percent = (Number(value) * 100).toLocaleString("pl-PL", { maximumFractionDigits: 2 });
  return `${percent}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}.${m}.${y}`;
}

export const STATUS_LABEL: Record<string, string> = {
  ELIGIBLE: "Przysługuje",
  NOT_ELIGIBLE: "Nie przysługuje",
  NEEDS_DATA: "Potrzebne dane",
  NEEDS_REVIEW: "Wymaga weryfikacji",
  OUT_OF_SCOPE: "Poza zakresem",
};
