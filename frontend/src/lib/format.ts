// Formatowanie do wyświetlenia. Nie przelicza kwot (backend zwraca wartości dokładne jako string).
// FE1-31: każda kwota pokazywana do 0,01 zł, połówki w górę (ROUND_HALF_UP jak M04/M07a) - bez „…”.
// Zaokrąglenie tylko na ekranie, na napisie dziesiętnym (BigInt, bez float); obliczenia zostają w silniku.
export function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const negative = value.startsWith("-");
  const [intPart = "0", fraction = ""] = value.replace(/^[-+]/, "").split(".");
  let cents = BigInt((intPart || "0") + fraction.padEnd(2, "0").slice(0, 2));
  if ((fraction[2] ?? "0") >= "5") cents += BigInt(1);
  const zl = (cents / BigInt(100)).toString();
  const gr = (cents % BigInt(100)).toString().padStart(2, "0");
  const grouped = zl.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative && cents > BigInt(0) ? "-" : ""}${grouped},${gr} zł`;
}

export function formatRate(value: string | null | undefined): string {
  if (!value) return "-";
  const percent = (Number(value) * 100).toLocaleString("pl-PL", { maximumFractionDigits: 2 });
  return `${percent}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
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
