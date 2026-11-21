// Dokładna arytmetyka kwot (ułamki na BigInt) i dat kalendarzowych dla podglądu planu.
// Bez float i bez zaokrągleń pośrednich (CLAUDE.md, D12). Daty jako ISO "YYYY-MM-DD", okresy [from, to] włącznie.

export type Ratio = { n: bigint; d: bigint };
const B0 = BigInt(0);
const B1 = BigInt(1);
const B10 = BigInt(10);

function gcd(a: bigint, b: bigint): bigint {
  let x = a < B0 ? -a : a;
  let y = b < B0 ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x || B1;
}

function norm(n: bigint, d: bigint): Ratio {
  if (d < B0) [n, d] = [-n, -d];
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/** "6903.20" | "0.815" | 30 → ułamek dokładny. */
export function ratio(value: string | number | bigint): Ratio {
  if (typeof value === "bigint") return { n: value, d: B1 };
  const text = String(value).trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error(`Niepoprawna liczba: ${text}`);
  const [int, frac = ""] = text.split(".");
  return norm(BigInt(int + frac), B10 ** BigInt(frac.length));
}

export const ZERO = ratio(0);
export const add = (a: Ratio, b: Ratio) => norm(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Ratio, b: Ratio) => norm(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Ratio, b: Ratio) => norm(a.n * b.n, a.d * b.d);
export const div = (a: Ratio, b: Ratio) => norm(a.n * b.d, a.d * b.n);
export const sum = (items: Ratio[]) => items.reduce(add, ZERO);
export const cmp = (a: Ratio, b: Ratio) => {
  const diff = a.n * b.d - b.n * a.d;
  return diff === B0 ? 0 : diff > B0 ? 1 : -1;
};

/** Zapis dziesiętny bez zaokrąglenia; rozwinięcia nieskończone obcinane na 12. miejscu (FE pokazuje 2 cyfry z „…”). */
export function toDecimalString(value: Ratio, maxFraction = 12): string {
  const negative = value.n < B0;
  const n = negative ? -value.n : value.n;
  const int = n / value.d;
  let rest = n % value.d;
  let frac = "";
  while (rest && frac.length < maxFraction) {
    rest *= B10;
    frac += (rest / value.d).toString();
    rest %= value.d;
  }
  return `${negative ? "-" : ""}${int}${frac ? `.${frac}` : ""}`;
}

/** Zaokrąglenie do groszy, połówki w górę (ROUND_HALF_UP) — tylko tam, gdzie zasadę potwierdził mentor (M07a). */
export function roundCents(value: Ratio): Ratio {
  const hundred = BigInt(100);
  const two = BigInt(2);
  const negative = value.n < B0;
  const n = negative ? -value.n : value.n;
  const q = (n * hundred * two + value.d) / (two * value.d);
  return norm(negative ? -q : q, hundred);
}

/** Liczba całkowita w górę (np. niepełny tydzień liczony jako pełny). */
export function ceilInt(value: Ratio): number {
  const q = value.n / value.d;
  return Number(value.n % value.d === B0 || value.n < B0 ? q : q + B1);
}

// ---------- daty ----------
const DAY_MS = 86_400_000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const addDays = (iso: string, days: number) => fromUtc(toUtc(iso) + days * DAY_MS);
export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
/** Liczba dni okresu [from, to] włącznie. */
export const periodDays = (from: string, to: string) => daysBetween(from, to) + 1;
export const minDate = (a: string, b: string) => (a <= b ? a : b);
export const maxDate = (a: string, b: string) => (a >= b ? a : b);

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return fromUtc(target.getTime());
}

export const yearOf = (iso: string) => Number(iso.slice(0, 4));
export const endOfYear = (year: number) => `${year}-12-31`;
