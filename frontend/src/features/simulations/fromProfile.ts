// SYMULACJA: dane do kreatora z konta zalogowanego użytkownika testowego (docelowo GET /api/sim/zus-profile i /api/sim/debt-certificate).
import { formatDate, formatMoney } from "@/lib/format";
import { PARAMS } from "../main-flow/preview/params";
import type { Answers } from "../main-flow/wizard/answers";
import type { SimResult, SimSource } from "../main-flow/wizard/simZus";
import { localToday, simDebtCertificate, usedLeaveText } from "./simApi";
import { type TestUser, fullName } from "./users";

const TITLE_LABEL: Record<TestUser["title"], string> = {
  EMPLOYMENT: "umowa o pracę", MANDATE: "umowa zlecenia", SELF_EMPLOYED: "działalność gospodarcza",
};

const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 600));

export async function fetchFromProfile(source: SimSource, a: Answers, u: TestUser): Promise<SimResult> {
  const who = `konto testowe: ${fullName(u)}`;
  switch (source) {
    case "insurance": {
      const patch: Partial<Answers> = { title: u.title, insuredFrom: u.insuredFrom, payerSize: u.payerSize };
      const summary = [who, `tytuł ubezpieczenia: ${TITLE_LABEL[u.title]}`, `ubezpieczenie chorobowe od ${formatDate(u.insuredFrom)}`];
      if (u.title !== "EMPLOYMENT") {
        patch.voluntarySickness = u.voluntarySickness ? "YES" : "NO";
        summary.push(`dobrowolne ubezpieczenie chorobowe: ${u.voluntarySickness ? "opłacane" : "brak"}`);
      }
      if (u.contractType) { patch.contractType = u.contractType; summary.push("umowa na czas nieokreślony"); }
      if (u.payerSize === "GT20") summary.push(`zasiłek wypłaca płatnik (zgłasza więcej niż ${PARAMS.PAYER_INSURED_THRESHOLD} osób)`);
      if (u.payerSize === "LE20") summary.push(`zasiłek wypłaca ZUS (płatnik zgłasza ${PARAMS.PAYER_INSURED_THRESHOLD} osób lub mniej)`);
      return wait({ patch, summary });
    }
    case "salary":
      return wait({ patch: { salaryGross: u.salaryAvg }, summary: [who, `średnia podstawa z 12 miesięcy: ${formatMoney(u.salaryAvg)} brutto / mies.`] });
    case "debt": {
      const asOf = a.eventDate || localToday();
      const c = await simDebtCertificate(u.id, asOf);
      return {
        patch: { debt: c.amount },
        summary: [who, `zaświadczenie ${c.certificate_number}: zaległość ${formatMoney(c.amount)} na dzień ${formatDate(c.as_of)}`,
          c.exceeds_threshold ? `przekracza próg ${formatMoney(c.threshold)}` : `nie przekracza progu ${formatMoney(c.threshold)}`],
      };
    }
    case "usedLeave":
      return wait(u.usedLeave
        ? { patch: u.usedLeave, summary: [who, `wykorzystane: ${usedLeaveText(u.usedLeave)}`] }
        : { patch: { usedMaternityFully: "NO", usedParentalMotherWeeks: "0", usedParentalFatherWeeks: "0", usedParts: "0" }, summary: [who, "brak wypłaconych zasiłków macierzyńskich i rodzicielskich"] });
    case "partner":
      return wait({ patch: { partnerInsured: u.partnerInsured ? "YES" : "NO" },
        summary: [who, u.partnerInsured ? "druga osoba podlega ubezpieczeniu chorobowemu" : "druga osoba nie podlega ubezpieczeniu chorobowemu"] });
  }
}
