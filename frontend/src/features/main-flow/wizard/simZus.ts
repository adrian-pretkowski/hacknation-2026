// SYMULACJA pobrania danych z systemów ZUS - wyłącznie dane syntetyczne, bez żadnego połączenia z ZUS.
// Docelowo: GET /api/sim/zus-profile i GET /api/sim/debt-certificate (contracts/openapi.yaml, x-status: planned, INT-03).
// Wartości poniżej są przykładowe i deterministyczne; nie odpowiadają żadnej rzeczywistej osobie ani sprawie.
import { formatMoney } from "@/lib/format";
import { PARAMS } from "../preview/params";
import type { Answers } from "./answers";

export type SimSource = "insurance" | "salary" | "debt" | "usedLeave" | "partner";

export type SimResult = { patch: Partial<Answers>; summary: string[] };

const SIM_DELAY_MS = 700;

function yearsBefore(iso: string, years: number): string {
  const base = iso || new Date().toISOString().slice(0, 10);
  const y = Number(base.slice(0, 4)) - years;
  return `${y}-${base.slice(5, 7)}-01`;
}

function build(source: SimSource, a: Answers): SimResult {
  switch (source) {
    case "insurance": {
      const insuredFrom = yearsBefore(a.eventDate, a.title === "SELF_EMPLOYED" ? 2 : 4);
      const patch: Partial<Answers> = { insuredFrom };
      const summary = [`ubezpieczenie chorobowe od ${insuredFrom.split("-").reverse().join(".")}`];
      if (a.title === "EMPLOYMENT" || a.title === "MANDATE") {
        patch.payerSize = "GT20";
        summary.push(`płatnik zgłasza więcej niż ${PARAMS.PAYER_INSURED_THRESHOLD} osób`);
      }
      if (a.title === "MANDATE" || a.title === "SELF_EMPLOYED") {
        patch.voluntarySickness = "YES";
        summary.push("dobrowolne ubezpieczenie chorobowe: opłacane");
      }
      if (a.title === "EMPLOYMENT" && a.contractType === null) {
        patch.contractType = "INDEFINITE";
        summary.push("umowa na czas nieokreślony");
      }
      return { patch, summary };
    }
    case "salary": {
      const salaryGross = a.title === "SELF_EMPLOYED" ? "5000" : a.title === "MANDATE" ? "4800" : "7500";
      return { patch: { salaryGross }, summary: [`średnia podstawa z 12 miesięcy: ok. ${formatMoney(salaryGross)} brutto / mies.`] };
    }
    case "debt":
      return { patch: { debt: "0.00" }, summary: ["brak zaległości w składkach na wskazany dzień"] };
    case "usedLeave":
      return {
        patch: { usedMaternityFully: "YES", usedParentalMotherWeeks: "12", usedParentalFatherWeeks: "0", usedParts: "1", usedVariant: "FULL_100_70" },
        summary: ["macierzyński wykorzystany w całości", "rodzicielski mamy: 12 tyg. w 1 części", "wariant 100% / 70%"],
      };
    case "partner":
      return { patch: { partnerInsured: "YES" }, summary: ["partnerka podlega ubezpieczeniu chorobowemu"] };
  }
}

/** Zwraca dane syntetyczne po krótkim opóźnieniu, aby imitować zapytanie do usługi. */
export function simFetchFromZus(source: SimSource, a: Answers): Promise<SimResult> {
  return new Promise((resolve) => setTimeout(() => resolve(build(source, a)), SIM_DELAY_MS));
}
