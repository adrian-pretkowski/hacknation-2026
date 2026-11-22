// FE1-10: klasyczna walidacja pól kreatora - komunikat przy polu i blokada „Dalej” dla wartości, które nie mogą
// być prawdziwe (np. planowana data porodu w przeszłości). Braki danych NIE są tu błędem (UNKNOWN → silnik pyta),
// a sytuacje prawnie istotne (np. ubezpieczenie od dnia po porodzie) ocenia silnik, nie walidator.
// Granice z PARAMS (PRE_BIRTH_MAX_WEEKS, WEEK_AS_DAYS) - bez liczb z przepisów w kodzie.
import { PARAMS } from "../preview/params";
import { addDays } from "../preview/exact";
import { type Answers, hasContractEnd } from "./answers";
import { todayIso } from "./request";

export type DateFieldKey = "eventDate" | "deathDate" | "insuredFrom" | "contractEnd" | "maternityStart"
  // FE1-57: daty, które wcześniej przechodziły bez sprawdzenia
  | "sickLeaveFrom" | "sickLeaveTo" | "birthDate" | "childBirthDate" | "courtApplicationDate" | "adoptionFinalDate";
export type FieldErrors = Partial<Record<DateFieldKey, string>>;

/** FE1-57: najdłuższy czas od dziś do planowanego porodu, który ma sens (ciąża ~40 tyg.) - granica medyczna, nie prawna. */
export const PREGNANCY_MAX_WEEKS = 42;

/** Daty z kreatora (ISO RRRR-MM-DD) porównywane leksykalnie; puste pole = brak błędu (UNKNOWN). */
export function dateErrors(a: Answers, today = todayIso()): FieldErrors {
  const e: FieldErrors = {};
  const ev = a.eventDate;
  if (ev) {
    if (a.role !== "GUARDIAN" && a.stage === "PREGNANT" && ev < today) {
      e.eventDate = "Data planowanego porodu jest ustawiona na datę w przeszłości. Jeśli dziecko już się urodziło, wróć do kroku „Etap” i wybierz „Dziecko już się urodziło”.";
    } else if (a.role !== "GUARDIAN" && a.stage === "PREGNANT" && ev > addDays(today, PREGNANCY_MAX_WEEKS * PARAMS.WEEK_AS_DAYS)) {
      e.eventDate = `Planowana data porodu jest za ponad ${PREGNANCY_MAX_WEEKS} tygodnie od dziś - sprawdź datę (zwłaszcza rok).`;
    } else if (a.role !== "GUARDIAN" && a.stage === "BORN" && ev > today) {
      e.eventDate = "Data porodu jest w przyszłości. Jeśli dziecko jeszcze się nie urodziło, wróć do kroku „Etap” i wybierz ciążę.";
    }
  }
  // FE1-57: pytania widoczne tylko dla mamy w ciąży - poza tym przypadkiem stare wartości nie blokują kroku
  const pregnantMother = a.role === "MOTHER" && a.stage === "PREGNANT";
  if (pregnantMother && a.birthDate && a.birthDate > today) e.birthDate = "Data urodzenia jest w przyszłości.";
  if (pregnantMother && a.sickLeave === "YES") {
    if (a.sickLeaveFrom && a.sickLeaveFrom > today) {
      e.sickLeaveFrom = "Zwolnienie nie może zaczynać się w przyszłości - podaj zwolnienie, które trwa albo już się skończyło.";
    } else if (a.sickLeaveFrom && ev && a.sickLeaveFrom >= ev) {
      e.sickLeaveFrom = "Zwolnienie w ciąży musi zacząć się przed porodem.";
    }
    if (a.sickLeaveFrom && a.sickLeaveTo && a.sickLeaveTo < a.sickLeaveFrom) {
      e.sickLeaveTo = "Koniec zwolnienia nie może być wcześniejszy niż jego początek.";
    }
  }
  // FE1-57: przyjęcie dziecka - kolejność: urodzenie → wniosek do sądu → uprawomocnienie, przyjęcie nie przed urodzeniem
  if (a.role === "GUARDIAN") {
    const cb = a.childBirthDate;
    if (cb && cb > today) e.childBirthDate = "Data urodzenia dziecka jest w przyszłości.";
    else if (cb && ev && cb > ev) e.childBirthDate = "Dziecko nie może zostać przyjęte przed dniem urodzenia - sprawdź datę urodzenia i datę przyjęcia.";
    if (a.guardianKind === "ADOPTION") {
      const court = a.courtApplicationDate;
      if (court && cb && court < cb) e.courtApplicationDate = "Wniosek o przysposobienie nie mógł zostać złożony przed urodzeniem dziecka.";
      if (a.adoptionFinalDate && court && a.adoptionFinalDate < court) {
        e.adoptionFinalDate = "Postanowienie nie może uprawomocnić się przed złożeniem wniosku do sądu.";
      } else if (a.adoptionFinalDate && cb && a.adoptionFinalDate < cb) {
        e.adoptionFinalDate = "Postanowienie o przysposobieniu nie może uprawomocnić się przed urodzeniem dziecka.";
      }
    }
  }
  if (pregnantMother && a.title && a.title !== "NONE" && a.birthDate && a.insuredFrom && a.insuredFrom < a.birthDate) {
    e.insuredFrom = "Ubezpieczenie nie mogło zacząć się przed Twoimi urodzinami - sprawdź tę datę i datę urodzenia.";
  }
  if (a.lossKind === "DIED" && a.deathDate) {
    if (ev && a.deathDate < ev) e.deathDate = "Data śmierci dziecka nie może być wcześniejsza niż data porodu.";
    else if (a.deathDate > today) e.deathDate = "Data śmierci dziecka jest w przyszłości.";
  }
  // Początek ubezpieczenia NIE jest blokowany: przyszła data bywa prawdziwa (nowa umowa), a skutek prawny zależy od
  // świadczenia (macierzyński - dzień porodu, art. 29; ojcowski - dzień startu urlopu, PAT-ELIG-001). Ocenia silnik;
  // kreator pokazuje tylko ostrzeżenie (dateWarnings).
  if (a.title === "EMPLOYMENT" && hasContractEnd(a.contractType) && a.contractEnd && a.insuredFrom && a.contractEnd < a.insuredFrom) {
    e.contractEnd = "Umowa nie może kończyć się przed dniem, od którego podlegasz ubezpieczeniu.";
  }
  if (a.maternityStart && ev && a.role === "MOTHER") {
    const earliest = addDays(ev, -PARAMS.PRE_BIRTH_MAX_WEEKS * PARAMS.WEEK_AS_DAYS);
    if (a.maternityStart > ev) e.maternityStart = "Urlop macierzyński nie może zacząć się po dniu porodu.";
    else if (a.maternityStart < earliest) {
      e.maternityStart = `Przed porodem można wykorzystać najwyżej ${PARAMS.PRE_BIRTH_MAX_WEEKS} tygodni urlopu - najwcześniej od ${earliest.split("-").reverse().join(".")}.`;
    }
  }
  return e;
}

/** FE1-10: ostrzeżenia bez blokady „Dalej” - sytuacje możliwe, ale istotne dla wyniku (ocena w silniku). */
export function dateWarnings(a: Answers): FieldErrors {
  const w: FieldErrors = {};
  const ev = a.eventDate;
  if (a.title && a.title !== "NONE" && a.insuredFrom && ev && a.insuredFrom > ev && a.role === "MOTHER") {
    w.insuredFrom = "Ubezpieczenie zaczyna się po dniu porodu - zasiłek macierzyński wymaga ubezpieczenia w dniu porodu. Sprawdzimy to w wyniku.";
  }
  return w;
}

export const hasErrors = (a: Answers, ...fields: DateFieldKey[]) => {
  const e = dateErrors(a);
  return fields.some((f) => !!e[f]);
};
