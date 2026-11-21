// Katalog pism do szybkiego złożenia (FE1-11, docs/FORMS_FLOW.md): ZAM, Z-3, Z-3a, ZAS-12, ZAS-53.
// Symbole formularzy pochodzą z treści zadania i informacji ZUS, nie z rozporządzenia (CONF-007, APP-DOC-003) —
// w UI z dopiskiem „wg informacji ZUS”. Terminy liczbowe tylko z PARAMS (bez liczb z przepisów w kodzie).
import { PARAMS } from "@/features/main-flow/preview/params";

export type FormCode = "ZAM" | "Z-3" | "Z-3a" | "ZAS-12" | "ZAS-53";

export type FormInfo = {
  code: FormCode;
  /** pełna nazwa pisma */
  name: string;
  /** do czego służy — jedno zdanie */
  purpose: string;
  /** kto wypełnia / kogo dotyczy */
  who: string;
  /** kiedy złożyć */
  when: string;
  /** gdzie trafia */
  submitTo: string;
  /** kto wypełnia: Ty czy płatnik składek (kolor kafelka) */
  filledBy: "YOU" | "PAYER";
  /** doc_type z `missing_documents` (silnik / podgląd), dla których pismo jest polecane */
  docTypes: string[];
};

export const FORMS: Record<FormCode, FormInfo> = {
  ZAM: {
    code: "ZAM",
    name: "Wniosek o zasiłek macierzyński",
    purpose: "Wniosek o zasiłek za urlop macierzyński, rodzicielski i ojcowski. Od 24.10.2026 zastępuje też dawne druki ZUR i ZAO.",
    who: "Wypełniasz Ty — mama lub tata, gdy zasiłek wypłaca ZUS (np. działalność gospodarcza, umowa zlecenia).",
    when: `Po urodzeniu lub przyjęciu dziecka, razem z odpisem aktu urodzenia. Wariant 81,5% za cały okres — w ciągu ${PARAMS.APP_COMBINED_DEADLINE_DAYS} dni od porodu.`,
    submitTo: "Do ZUS (eZUS lub placówka) albo do płatnika, jeśli to on wypłaca zasiłek.",
    filledBy: "YOU",
    docTypes: ["ZAM_APPLICATION", "MATERNITY_APPLICATION_ANNEX6"],
  },
  "Z-3": {
    code: "Z-3",
    name: "Zaświadczenie płatnika składek — pracownik",
    purpose: "Dane o zatrudnieniu i wynagrodzeniu, z których ZUS liczy podstawę zasiłku.",
    who: "Wypełnia pracodawca — dotyczy osoby na umowie o pracę.",
    when: `Gdy zasiłek wypłaca ZUS (pracodawca do ${PARAMS.PAYER_INSURED_THRESHOLD} ubezpieczonych) — dołącza się je do wniosku o zasiłek macierzyński lub chorobowy.`,
    submitTo: "Pracodawca przekazuje je do ZUS.",
    filledBy: "PAYER",
    docTypes: ["PAYER_CERTIFICATE_Z3", "PAYER_CERTIFICATE_Z3_OR_Z3A"],
  },
  "Z-3a": {
    code: "Z-3a",
    name: "Zaświadczenie płatnika składek — osoba niebędąca pracownikiem",
    purpose: "Dane o ubezpieczeniu i przychodzie, z których ZUS liczy podstawę zasiłku.",
    who: "Wypełnia płatnik składek (np. zleceniodawca) — dotyczy osoby, która nie jest pracownikiem.",
    when: "Gdy zasiłek wypłaca ZUS — dołącza się je do wniosku o zasiłek macierzyński lub chorobowy.",
    submitTo: "Płatnik przekazuje je do ZUS.",
    filledBy: "PAYER",
    docTypes: ["PAYER_CERTIFICATE_Z3A", "PAYER_CERTIFICATE_Z3_OR_Z3A"],
  },
  "ZAS-12": {
    code: "ZAS-12",
    name: "Zaświadczenie płatnika — zasiłek za dalszy okres",
    purpose: "Wniosek o wypłatę zasiłku chorobowego za kolejne zwolnienie lekarskie, które trwa bez przerwy po poprzednim.",
    who: "Wypełnia płatnik składek (zwykle pracodawca). Zamiast niego można użyć Z-3 lub Z-3a.",
    when: "Gdy w ciąży dostajesz kolejne zwolnienie (e-ZLA) w ciągłości z poprzednim — niezwłocznie po jego otrzymaniu.",
    submitTo: "Płatnik przekazuje je do ZUS.",
    filledBy: "PAYER",
    docTypes: [], // silnik nie wskazuje jeszcze tego pisma — polecane tylko ręcznie
  },
  "ZAS-53": {
    code: "ZAS-53",
    name: "Wniosek o zasiłek chorobowy",
    purpose: "Wniosek o zasiłek chorobowy wypłacany przez ZUS, np. za zwolnienie lekarskie w ciąży.",
    who: "Wypełniasz Ty — zwłaszcza przy działalności gospodarczej, gdy nie ma płatnika, który wystawi Z-3 lub Z-3a.",
    when: "W czasie niezdolności do pracy, razem z pierwszym zwolnieniem lekarskim (e-ZLA).",
    submitTo: "Do ZUS (eZUS lub placówka).",
    filledBy: "YOU",
    docTypes: ["SICKNESS_APPLICATION_ANNEX1"],
  },
};

/** Grupy kafelków — kolejność jak w wymaganiu (docs/FORMS_FLOW.md). */
export const FORM_GROUPS: { id: string; title: string; text: string; codes: FormCode[] }[] = [
  { id: "maternity", title: "Zasiłek macierzyński", text: "Jeden wniosek na macierzyński, rodzicielski i ojcowski.", codes: ["ZAM"] },
  { id: "payer", title: "Zaświadczenia płatnika składek", text: "Wystawia pracodawca lub zleceniodawca, gdy zasiłek wypłaca ZUS.", codes: ["Z-3", "Z-3a"] },
  { id: "sickness", title: "Zasiłek chorobowy w ciąży", text: "Zwolnienie lekarskie w ciąży i jego przedłużenie.", codes: ["ZAS-12", "ZAS-53"] },
];

export const FORM_CODES: FormCode[] = FORM_GROUPS.flatMap((g) => g.codes);

export const isFormCode = (s: string): s is FormCode => (FORM_CODES as string[]).includes(s);

/** Pisma polecane do wyniku: dopasowanie po `doc_type` z `missing_documents`. */
export function formsForDocTypes(docTypes: string[]): FormCode[] {
  const set = new Set(docTypes);
  return FORM_CODES.filter((c) => FORMS[c].docTypes.some((d) => set.has(d)));
}
