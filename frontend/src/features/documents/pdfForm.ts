// FE1-19: wypełnianie szablonów PDF pism (AcroForm) w przeglądarce — pdf-lib + osadzona czcionka DejaVu Sans (polskie znaki).
// Szablony i metadane pól: public/forms/<KOD>.pdf i <KOD>.json (kopie z docs/wnioski-pdf/; opis formatu: *_formularz_instrukcja.md).
// Wartości trzymamy pod pełną nazwą pola PDF; typ pola (comb, data, checkbox) wynika z metadanych.
import type { FormCode } from "./forms";

export type PdfFieldMeta = {
  name: string;
  page: number;
  /** "text" | "multiline" | "checkbox" | "comb(N)" */
  type: string;
  label_guess: string;
  rect: [number, number, number, number];
};

/** Wartość pola w formularzu: tekst (data jako RRRR-MM-DD) albo stan checkboxa. Para TAK/NIE: "TAK" | "NIE" | "" pod nazwą pola TAK. */
export type Values = Record<string, string | boolean>;

export type InputKind = "text" | "multiline" | "digits" | "date" | "checkbox";

export const FORM_FILES: Record<FormCode, string> = {
  ZAM: "ZAM", "Z-3": "Z-3", "Z-3a": "Z-3a", "ZAS-12": "ZAS-12", "ZAS-53": "ZAS-53",
};

const combLen = (type: string): number | null => {
  const m = /^comb\((\d+)\)$/.exec(type);
  return m ? Number(m[1]) : null;
};

/** Rodzaj pola formularza: comb(8) to we wszystkich pismach data dd/mm/rrrr, pozostałe comb(N) to cyfry (PESEL, NIP, REGON, rachunek). */
export function inputKind(meta: PdfFieldMeta): { kind: InputKind; len?: number } {
  if (meta.type === "checkbox") return { kind: "checkbox" };
  if (meta.type === "multiline") return { kind: "multiline" };
  const n = combLen(meta.type);
  if (n === 8) return { kind: "date", len: 8 };
  if (n !== null) return { kind: "digits", len: n };
  return { kind: "text" };
}

export async function loadFieldMeta(code: FormCode): Promise<PdfFieldMeta[]> {
  const res = await fetch(`/forms/${FORM_FILES[code]}.json`);
  if (!res.ok) throw new Error(`Nie udało się wczytać opisu pól ${code} (HTTP ${res.status}).`);
  return (await res.json()) as PdfFieldMeta[];
}

/** RRRR-MM-DD → ddmmrrrr (format komórek daty na formularzach). */
export const isoToComb = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}` : "");

/** Wypełnia szablon i zwraca bajty PDF. Tekst WIELKIMI LITERAMI (wymóg formularzy), pola comb bez separatorów. */
export async function fillPdf(code: FormCode, meta: PdfFieldMeta[], values: Values, pairs: Record<string, string>): Promise<Uint8Array> {
  const [{ PDFDocument }, fontkitMod, pdfBytes, fontBytes] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
    fetch(`/forms/${FORM_FILES[code]}.pdf`).then((r) => { if (!r.ok) throw new Error(`Brak szablonu ${code}.pdf`); return r.arrayBuffer(); }),
    fetch("/forms/fonts/DejaVuSans.ttf").then((r) => { if (!r.ok) throw new Error("Brak czcionki formularza"); return r.arrayBuffer(); }),
  ]);
  const pdf = await PDFDocument.load(pdfBytes);
  pdf.registerFontkit(fontkitMod.default);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const form = pdf.getForm();
  for (const m of meta) {
    const v = values[m.name];
    const { kind } = inputKind(m);
    if (kind === "checkbox") {
      if (v === true) form.getCheckBox(m.name).check();
      continue;
    }
    if (typeof v !== "string" || v.trim() === "") continue;
    let text = kind === "date" ? isoToComb(v) : kind === "digits" ? v.replace(/\s+/g, "") : v.trim().toLocaleUpperCase("pl-PL");
    const field = form.getTextField(m.name);
    const max = field.getMaxLength();
    if (max !== undefined && text.length > max) text = text.slice(0, max);
    field.setText(text);
  }
  // Pary TAK/NIE: wartość pod nazwą pola TAK, zaznaczamy odpowiedni checkbox.
  for (const [yes, no] of Object.entries(pairs)) {
    const v = values[yes];
    if (v === "TAK") form.getCheckBox(yes).check();
    if (v === "NIE") form.getCheckBox(no).check();
  }
  form.updateFieldAppearances(font);
  return pdf.save();
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
