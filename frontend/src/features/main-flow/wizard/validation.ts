// FE1-10: klasyczna walidacja pól kreatora — komunikat przy polu i blokada „Dalej” dla wartości, które nie mogą
// być prawdziwe (np. planowana data porodu w przeszłości). Braki danych NIE są tu błędem (UNKNOWN → silnik pyta),
// a sytuacje prawnie istotne (np. ubezpieczenie od dnia po porodzie) ocenia silnik, nie walidator.
// Granice z PARAMS (PRE_BIRTH_MAX_WEEKS, WEEK_AS_DAYS) — bez liczb z przepisów w kodzie.
import { PARAMS } from "../preview/params";
import { addDays } from "../preview/exact";
import type { Answers } from "./answers";
import { todayIso } from "./request";

export type DateField = "eventDate" | "deathDate" | "insuredFrom" | "contractEnd" | "maternityStart";
export type FieldErrors = Partial<Record<DateField, string>>;

/** Daty z kreatora (ISO RRRR-MM-DD) porównywane leksykalnie; puste pole = brak błędu (UNKNOWN). */
export function dateErrors(a: Answers, today = todayIso()): FieldErrors {
  const e: FieldErrors = {};
  const ev = a.eventDate;
  if (ev) {
    if (a.role !== "GUARDIAN" && a.stage === "PREGNANT" && ev < today) {
      e.eventDate = "Data planowanego porodu jest ustawiona na datę w przeszłości. Jeśli dziecko już się urodziło, wróć do kroku „Etap” i wybierz „Dziecko już się urodziło”.";
    } else if (a.role !== "GUARDIAN" && a.stage === "BORN" && ev > today) {
      e.eventDate = "Data porodu jest w przyszłości. Jeśli dziecko jeszcze się nie urodziło, wróć do kroku „Etap” i wybierz ciążę.";
    }
  }
  if (a.lossKind === "DIED" && a.deathDate) {
    if (ev && a.deathDate < ev) e.deathDate = "Data śmierci dziecka nie może być wcześniejsza niż data porodu.";
    else if (a.deathDate > today) e.deathDate = "Data śmierci dziecka jest w przyszłości.";
  }
  if (a.title && a.title !== "NONE" && a.insuredFrom) {
    if (a.insuredFrom > today) e.insuredFrom = "Data początku ubezpieczenia jest w przyszłości — podaj dzień, od którego już podlegasz ubezpieczeniu.";
  }
  if (a.title === "EMPLOYMENT" && a.contractType === "FIXED_TERM" && a.contractEnd && a.insuredFrom && a.contractEnd < a.insuredFrom) {
    e.contractEnd = "Umowa nie może kończyć się przed dniem, od którego podlegasz ubezpieczeniu.";
  }
  if (a.maternityStart && ev && a.role === "MOTHER") {
    const earliest = addDays(ev, -PARAMS.PRE_BIRTH_MAX_WEEKS * PARAMS.WEEK_AS_DAYS);
    if (a.maternityStart > ev) e.maternityStart = "Urlop macierzyński nie może zacząć się po dniu porodu.";
    else if (a.maternityStart < earliest) {
      e.maternityStart = `Przed porodem można wykorzystać najwyżej ${PARAMS.PRE_BIRTH_MAX_WEEKS} tygodni urlopu — najwcześniej od ${earliest.split("-").reverse().join(".")}.`;
    }
  }
  return e;
}

export const hasErrors = (a: Answers, ...fields: DateField[]) => {
  const e = dateErrors(a);
  return fields.some((f) => !!e[f]);
};
