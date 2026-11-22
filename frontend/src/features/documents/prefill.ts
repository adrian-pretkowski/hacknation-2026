// FE1-23: wstępne wypełnienie pism danymi z konta testowego (SYMULACJA) i z odpowiedzi kreatora.
// Dane osobowe poniżej są FIKCYJNE (do demonstracji) - nie odpowiadają żadnej rzeczywistej osobie, firmie ani rachunkowi.
// Czego nie wiemy, nie zgadujemy: pole zostaje puste, a formularz prosi o uzupełnienie (jak NEEDS_DATA w silniku).
import { formatDate } from "@/lib/format";
import type { Answers } from "@/features/main-flow/wizard/answers";
import type { TestUser } from "@/features/simulations/users";
import type { FormCode } from "./forms";

export type Source = "account" | "wizard" | "today";
/** Wartości po krótkim ID pola (`p1_000`) i źródło każdej z nich. */
export type Prefill = { values: Record<string, string | boolean>; source: Record<string, Source> };

type Person = { pesel: string; birth: string; street: string; house: string; flat: string; zip: string; city: string; phone: string; bank: string };
type Payer = { nip: string; regon: string; street: string; house: string; flat: string; zip: string; city: string; phone: string };

// Fikcyjne dane kont testowych (klucz = TestUser.id). Numery celowo nie przechodzą sum kontrolnych.
const PERSON: Record<string, Person> = {
  employee_mother: { pesel: "92051500000", birth: "1992-05-15", street: "Przykładowa", house: "12", flat: "4", zip: "00-950", city: "Warszawa", phone: "500000001", bank: "00000000000000000000000001" },
  self_employed_debt: { pesel: "89110300000", birth: "1989-11-03", street: "Testowa", house: "7", flat: "", zip: "30-001", city: "Kraków", phone: "500000002", bank: "00000000000000000000000002" },
  father_takeover: { pesel: "88022000000", birth: "1988-02-20", street: "Próbna", house: "3", flat: "15", zip: "80-001", city: "Gdańsk", phone: "500000003", bank: "00000000000000000000000003" },
  mandate_mother_after_birth: { pesel: "95070800000", birth: "1995-07-08", street: "Wzorcowa", house: "21", flat: "2", zip: "50-001", city: "Wrocław", phone: "500000004", bank: "00000000000000000000000004" },
};
const PAYER: Record<string, Payer> = {
  employee_mother: { nip: "0000000001", regon: "000000001", street: "Biurowa", house: "1", flat: "", zip: "00-001", city: "Warszawa", phone: "220000001" },
  father_takeover: { nip: "0000000003", regon: "000000003", street: "Warsztatowa", house: "8", flat: "", zip: "80-002", city: "Gdańsk", phone: "580000003" },
  mandate_mother_after_birth: { nip: "0000000004", regon: "000000004", street: "Usługowa", house: "40", flat: "", zip: "50-002", city: "Wrocław", phone: "710000004" },
};

const pl = (iso: string) => formatDate(iso);

class Builder {
  values: Prefill["values"] = {};
  source: Prefill["source"] = {};
  set(id: string, v: string | boolean | null | undefined, src: Source) {
    if (v === null || v === undefined || v === "" || v === false) return;
    this.values[id] = v;
    this.source[id] = src;
  }
  setMany(ids: (string | undefined)[], vs: (string | undefined)[], src: Source) {
    ids.forEach((id, i) => id && this.set(id, vs[i], src));
  }
}

/** Dzisiejsza data lokalna RRRR-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function personFields(b: Builder, u: TestUser | null, ids: { pesel: string; birth: string; first: string; last: string; addr: string[]; phone?: string; bank?: string }) {
  if (!u) return;
  const p = PERSON[u.id];
  b.setMany([ids.first, ids.last], [u.firstName, u.lastName], "account");
  if (!p) return;
  b.setMany([ids.pesel, ids.birth], [p.pesel, p.birth], "account");
  b.setMany(ids.addr, [p.street, p.house, p.flat, p.zip, p.city], "account");
  if (ids.phone) b.set(ids.phone, p.phone, "account");
  if (ids.bank) b.set(ids.bank, p.bank, "account");
}

function payerFields(b: Builder, u: TestUser | null, ids: { nip: string; regon: string; pesel: string; name: string; addr?: string[]; phone?: string }) {
  if (!u) return;
  b.set(ids.name, u.payerName, "account");
  if (u.title === "SELF_EMPLOYED") {
    // Przy własnej działalności płatnikiem jest ubezpieczona - PESEL z konta, NIP nieznany (zostaje do uzupełnienia).
    const p = PERSON[u.id];
    if (p) b.set(ids.pesel, p.pesel, "account");
    return;
  }
  const p = PAYER[u.id];
  if (!p) return;
  b.setMany([ids.nip, ids.regon], [p.nip, p.regon], "account");
  if (ids.addr) b.setMany(ids.addr, [p.street, p.house, p.flat, p.zip, p.city], "account");
  if (ids.phone) b.set(ids.phone, p.phone, "account");
}

const ezlaPeriods = (u: TestUser | null, last = false) => {
  const list = u?.ezla ?? [];
  const pick = last ? list.slice(-1) : list;
  return pick.map((z) => `${pl(z.from)}–${pl(z.to)} (${z.certificate_id})`).join("; ");
};

/** Odpowiedzi kreatora uzupełnione danymi z konta (konto ma pierwszeństwo tylko tam, gdzie kreator nie ma odpowiedzi). */
function facts(a: Answers | null, u: TestUser | null) {
  return {
    role: a?.role ?? u?.role ?? null,
    title: a?.title ?? u?.title ?? null,
    stage: a?.stage ?? null,
    guardianKind: a?.guardianKind ?? null,
    eventDate: a?.eventDate || "",
    insuredFrom: a?.insuredFrom || u?.insuredFrom || "",
    contractType: a?.contractType ?? u?.contractType ?? null,
    payerSize: a && a.payerSize !== "UNKNOWN" ? a.payerSize : u?.payerSize ?? "UNKNOWN",
    voluntarySickness: a && a.voluntarySickness !== "UNKNOWN" ? a.voluntarySickness === "YES" : u?.voluntarySickness ?? null,
    variant: a?.plannerVariant ?? (a && a.usedVariant !== "UNKNOWN" ? a.usedVariant : null),
    zaZyciem: a?.zaZyciem ?? false,
    employerEnded: a?.employerEnded ?? "NO",
  };
}

const src = (a: Answers | null): Source => (a ? "wizard" : "account");

export function buildPrefill(code: FormCode, a: Answers | null, u: TestUser | null): Prefill {
  const b = new Builder();
  const f = facts(a, u);
  const s = src(a);
  switch (code) {
    case "ZAM": {
      personFields(b, u, { pesel: "p1_00", birth: "p1_01", first: "p1_03", last: "p1_04", addr: ["p1_05", "p1_06", "p1_07", "p1_08", "p1_09"], phone: "p1_11", bank: "p2_17" });
      payerFields(b, u, { nip: "p1_12", regon: "p1_13", pesel: "p1_14", name: "p1_16" });
      if (f.guardianKind === "ADOPTION") { b.set("p2_20", true, s); b.set("p2_34", true, s); }
      else if (f.guardianKind === "FOSTER_NON_PROFESSIONAL") { b.set("p2_20", true, s); b.set("p2_36", true, s); }
      else if (f.role === "MOTHER") b.set("p2_18", true, s);
      else if (f.role === "FATHER") b.set("p2_26", true, s);
      if (f.variant === "COMBINED_815") b.set("p2_30", true, "wizard");
      if (f.title === "SELF_EMPLOYED" && f.voluntarySickness !== null) b.set("p2_31", f.voluntarySickness ? "TAK" : "NIE", s);
      if (!f.guardianKind && f.stage === "BORN") b.set("p2_33", true, "wizard");
      // FE1-52: pracodawca w likwidacji/upadłości - poród po ustaniu zatrudnienia (p3_42) zamiast „przewidywanej daty porodu” (p3_40)
      const employerGone = !f.guardianKind && (f.employerEnded === "LIQUIDATION" || f.employerEnded === "BANKRUPTCY");
      if (employerGone) { b.set("p3_42", true, "wizard"); b.set(f.employerEnded === "LIQUIDATION" ? "p3_44" : "p3_43", true, "wizard"); }
      else if (!f.guardianKind && f.stage === "PREGNANT" && f.eventDate) { b.set("p3_40", true, "wizard"); b.set("p3_41", f.eventDate, "wizard"); }
      if (f.zaZyciem) b.set("p3_38", true, "wizard");
      b.set("p5_84", todayIso(), "today");
      break;
    }
    case "ZAS-53": {
      personFields(b, u, { pesel: "p1_000", birth: "p1_001", first: "p1_003", last: "p1_004", addr: ["p1_005", "p1_006", "p1_007", "p1_008", "p1_009"], phone: "p1_011", bank: "p2_017" });
      payerFields(b, u, { nip: "p1_012", regon: "p1_013", pesel: "p1_014", name: "p1_016" });
      b.set("p2_018", ezlaPeriods(u), "account");
      if (u) b.set(f.employerEnded === "NO" ? "p2_019" : "p2_020", true, s);
      b.set("p2_030", todayIso(), "today");
      break;
    }
    case "ZAS-12": {
      payerFields(b, u, { nip: "p1_000", regon: "p1_001", pesel: "p1_002", name: "p1_004", addr: ["p1_005", "p1_006", "p1_007", "p1_008", "p1_009"], phone: "p1_011" });
      personFields(b, u, { pesel: "p1_012", birth: "p1_013", first: "p1_015", last: "p1_016", addr: ["p2_017", "p2_018", "p2_019", "p2_020", "p2_021"], bank: "p2_023" });
      const period = ezlaPeriods(u, true);
      if (period) { b.set("p2_024", true, "account"); b.set("p2_025", period, "account"); }
      if (u && f.employerEnded === "NO") b.set("p2_028", "TAK", s);
      b.set("p2_032", todayIso(), "today");
      break;
    }
    case "Z-3":
    case "Z-3a": {
      payerFields(b, u, { nip: "p1_002", regon: "p1_003", pesel: "p1_004", name: "p1_006", addr: ["p1_007", "p1_008", "p1_009", "p1_010", "p1_011"], phone: "p1_013" });
      personFields(b, u, { pesel: "p1_014", birth: "p1_015", first: "p1_017", last: "p1_018", addr: ["p2_019", "p2_020", "p2_021", "p2_022", "p2_023"], bank: "p2_025" });
      if (u || a) b.set("p1_000", true, s);
      // Świadczenie: po porodzie - macierzyński; w ciąży ze zwolnieniem - chorobowy (okres z e-ZLA).
      if (f.stage === "BORN" || f.guardianKind) b.set("p2_030", true, "wizard");
      else if (u?.ezla.length) { b.set("p2_026", true, "account"); b.set("p2_027", ezlaPeriods(u, true), "account"); }
      if (f.payerSize === "LE20") b.set(code === "Z-3" ? "p4_078" : "p4_082", "TAK", s);
      if (f.payerSize === "GT20") b.set(code === "Z-3" ? "p4_078" : "p4_082", "NIE", s);
      if (code === "Z-3") {
        if (f.insuredFrom) b.set("p3_038", `od ${pl(f.insuredFrom)}`, s);
        if (f.role === "MOTHER" && f.stage === "BORN") b.set("p3_060", true, "wizard");
        b.set("p6_275", todayIso(), "today");
      } else {
        if (f.voluntarySickness !== null && f.title !== "EMPLOYMENT") b.set("p3_038", f.voluntarySickness ? "TAK" : "NIE", s);
        if (f.insuredFrom) b.set("p3_053", `od ${pl(f.insuredFrom)}`, s);
        b.set("p5_145", todayIso(), "today");
      }
      break;
    }
  }
  return { values: b.values, source: b.source };
}
