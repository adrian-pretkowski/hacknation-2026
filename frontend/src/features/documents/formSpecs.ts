// FE1-23: układ formularzy pism — sekcje z najważniejszymi polami, etykiety po ludzku i pola wymagane.
// Pola wskazujemy krótkim ID (`p1_000`, `p2_17`) — pełna nazwa pola PDF pochodzi z metadanych (public/forms/<KOD>.json),
// więc po regeneracji szablonu poprawia się tylko ten plik (zalecenie z docs/wnioski-pdf/*_instrukcja.md).
// Pola z PDF, których tu nie ma, formularz pokazuje w części „Pozostałe pola formularza” (z etykietą z metadanych).
import { formatRate } from "@/lib/format";
import { PARAMS } from "@/features/main-flow/preview/params";
import type { FormCode } from "./forms";

const PAYER_SIZE: [string, string] = [`do ${PARAMS.PAYER_INSURED_THRESHOLD} ubezpieczonych`, `powyżej ${PARAMS.PAYER_INSURED_THRESHOLD} ubezpieczonych`];

/** Odczyt wartości po krótkim ID — dla warunków „wymagane, jeśli…”. */
export type Get = (id: string) => string | boolean | undefined;

export type SpecField = {
  id: string;
  label?: string;
  hint?: string;
  required?: boolean | ((get: Get) => boolean);
  /** pole wyboru jednej z dwóch opcji (TAK/NIE albo inne): id = pierwsze pole, no = drugie */
  no?: string;
  options?: [string, string];
};

export type SpecSection = {
  id: string;
  title: string;
  text?: string;
  fields: SpecField[];
  /** co najmniej jedno z pól (checkboxów) musi być zaznaczone */
  oneOf?: { ids: string[]; message: string };
};

const on = (id: string) => (get: Get) => get(id) === true;
const is = (id: string, v: string) => (get: Get) => get(id) === v;
const empty = (id: string) => (get: Get) => !get(id);

const PESEL_HINT = "11 cyfr. Jeśli nie masz numeru PESEL, zostaw puste i podaj dokument tożsamości.";
const DOC_LABEL = "Rodzaj, seria i numer dokumentu tożsamości";
const DOC_HINT = "Tylko gdy brak numeru PESEL.";
const BANK_HINT = "26 cyfr bez spacji i bez „PL”. Pole dobrowolne — bez rachunku zasiłek przyjdzie przekazem pocztowym.";
const PERIOD_HINT = "Daty od–do, np. 01.03.2027–18.07.2027.";
const SIGN_HINT = "Data wypełnienia — domyślnie dziś.";

/** Dane osoby (PESEL, data urodzenia, dokument, imię, nazwisko) — kolejne ID od `ids[0]`. */
function person(ids: [string, string, string, string, string]): SpecField[] {
  const [pesel, birth, doc, first, last] = ids;
  return [
    { id: pesel, label: "PESEL", hint: PESEL_HINT, required: empty(doc) },
    { id: birth, label: "Data urodzenia", hint: "Podaj, jeśli nie ma numeru PESEL." },
    { id: doc, label: DOC_LABEL, hint: DOC_HINT, required: empty(pesel) },
    { id: first, label: "Imię", required: true },
    { id: last, label: "Nazwisko", required: true },
  ];
}

/** Adres (ulica, dom, lokal, kod, miejscowość, państwo[, telefon]). */
function address(ids: string[]): SpecField[] {
  const [street, house, flat, zip, city, country, phone] = ids;
  const f: SpecField[] = [
    { id: street, label: "Ulica" },
    { id: house, label: "Numer domu", required: true },
    { id: flat, label: "Numer lokalu" },
    { id: zip, label: "Kod pocztowy", hint: "Format 00-000.", required: empty(country) },
    { id: city, label: "Miejscowość", required: true },
    { id: country, label: "Nazwa państwa", hint: "Tylko gdy adres jest poza Polską." },
  ];
  if (phone) f.push({ id: phone, label: "Numer telefonu" });
  return f;
}

/** Dane płatnika składek (NIP, REGON, PESEL, dokument, nazwa). */
function payer(ids: [string, string, string, string, string], requiredName: boolean): SpecField[] {
  const [nip, regon, pesel, doc, name] = ids;
  return [
    { id: nip, label: "NIP", hint: "10 cyfr." },
    { id: regon, label: "REGON", hint: "9 lub 14 cyfr." },
    { id: pesel, label: "PESEL płatnika", hint: "Podaj, gdy płatnik nie ma NIP (np. osoba fizyczna)." },
    { id: doc, label: DOC_LABEL, hint: "Gdy płatnik nie ma NIP ani PESEL." },
    { id: name, label: "Nazwa albo imię i nazwisko płatnika", required: requiredName },
  ];
}

/** Pkt 4 „Czy niezdolność do pracy powstała z powodu…” (Z-3, Z-3a). */
function incapacityCause(cbs: [string, string, string], yes: string, no: string, doc: string): SpecField[] {
  return [
    { id: yes, no, label: "4. Czy niezdolność do pracy powstała z powodu choroby zawodowej, wypadku przy pracy lub w drodze do/z pracy?" },
    { id: cbs[0], label: "choroby zawodowej" },
    { id: cbs[1], label: "wypadku przy pracy" },
    { id: cbs[2], label: "wypadku w drodze do pracy lub z pracy" },
    { id: doc, label: "Jeśli TAK — rodzaj dokumentu (decyzja / protokół / karta wypadku), numer i data", required: is(yes, "TAK") },
  ];
}

/** Pkt 5 „Czy w okresie niezdolności do pracy … korzysta z urlopu bezpłatnego…” (Z-3, Z-3a). */
function absence(cbs: [string, string, string, string, string, string], yes: string, no: string, period: string): SpecField[] {
  const labels = ["korzysta z urlopu bezpłatnego", "przebywa w areszcie tymczasowym", "korzysta z urlopu opiekuńczego z Kodeksu pracy",
    "korzysta z urlopu wychowawczego", "odbywa karę pozbawienia wolności", "ma usprawiedliwioną nieobecność (śmierć pracodawcy, art. 63² § 8 KP)"];
  return [
    { id: yes, no, label: "5. Czy w okresie niezdolności do pracy (choroba, opieka, macierzyństwo) zachodzi któraś z sytuacji poniżej?" },
    ...cbs.map((id, i) => ({ id, label: labels[i] })),
    { id: period, label: "Jeśli TAK — okresy od–do", required: is(yes, "TAK") },
  ];
}

/** „Informacje o wypłaconych świadczeniach”: pytanie TAK/NIE + okresy i kody literowe. */
const paid = (yes: string, no: string, details: string, label: string): SpecField[] => [
  { id: yes, no, label },
  { id: details, label: "Jeśli TAK — okresy od–do i kod literowy", required: is(yes, "TAK") },
];

const benefitPair = (chk: string, period: string, label: string): SpecField[] => [
  { id: chk, label },
  { id: period, label: `${label[0].toUpperCase()}${label.slice(1)} — za okres`, hint: `${PERIOD_HINT} Jeśli znasz — także seria i numer zwolnienia.`, required: on(chk) },
];

export const FORM_SPECS: Record<FormCode, SpecSection[]> = {
  ZAM: [
    { id: "you", title: "Twoje dane", fields: person(["p1_00", "p1_01", "p1_02", "p1_03", "p1_04"]) },
    { id: "address", title: "Adres zamieszkania", fields: address(["p1_05", "p1_06", "p1_07", "p1_08", "p1_09", "p1_10", "p1_11"]) },
    { id: "payer", title: "Dane płatnika składek", text: "Twój pracodawca lub zleceniodawca. Przy własnej działalności — Ty.",
      fields: payer(["p1_12", "p1_13", "p1_14", "p1_15", "p1_16"], true) },
    { id: "bank", title: "Rachunek bankowy", fields: [{ id: "p2_17", label: "Numer rachunku", hint: BANK_HINT }] },
    { id: "scope", title: "Zakres wniosku", text: "Wnioskuję o zasiłek macierzyński za okres:",
      oneOf: { ids: ["p2_18", "p2_20", "p2_21", "p2_24", "p2_26"], message: "Zaznacz, za jaki urlop wnioskujesz o zasiłek." },
      fields: [
        { id: "p2_18", label: "urlopu macierzyńskiego" },
        { id: "p2_20", label: "urlopu na warunkach urlopu macierzyńskiego" },
        { id: "p2_19", label: "Okres urlopu macierzyńskiego / na warunkach urlopu macierzyńskiego", hint: PERIOD_HINT,
          required: (g) => g("p2_18") === true || g("p2_20") === true },
        { id: "p2_21", label: "urlopu rodzicielskiego" },
        { id: "p2_22", label: "Okres urlopu rodzicielskiego", hint: PERIOD_HINT, required: on("p2_21") },
        { id: "p2_23", label: "Która to część urlopu rodzicielskiego", hint: "Np. 1, 2." },
        { id: "p2_24", label: "uzupełniającego urlopu macierzyńskiego" },
        { id: "p2_25", label: "Okres uzupełniającego urlopu macierzyńskiego", hint: PERIOD_HINT, required: on("p2_24") },
        { id: "p2_26", label: "urlopu ojcowskiego" },
        { id: "p2_27", label: "Okres urlopu ojcowskiego", hint: PERIOD_HINT, required: on("p2_26") },
        { id: "p2_28", label: "Która to część urlopu ojcowskiego" },
        { id: "p2_29", label: "Data zakończenia zasiłku za urlop macierzyński / na warunkach urlopu macierzyńskiego", hint: "Wypełnij, jeśli wnioskujesz tylko o urlop rodzicielski." },
        { id: "p2_30", label: `Zamierzam skorzystać z pełnego wymiaru urlopu macierzyńskiego i rodzicielskiego (wariant ${formatRate(PARAMS.MAT_RATE_COMBINED)} za cały okres)` },
      ] },
    { id: "insurance", title: "Informacje o ubezpieczeniu",
      fields: [{ id: "p2_31", no: "p2_32", label: "Jeśli prowadzisz działalność gospodarczą (albo współpracujesz, jesteś duchownym lub marynarzem): czy masz ubezpieczenie chorobowe?" }] },
    { id: "reason", title: "Wnioskuję o zasiłek w związku z",
      oneOf: { ids: ["p2_33", "p2_34", "p2_36", "p3_40", "p3_42", "p3_50", "p4_57", "p5_69"], message: "Zaznacz, z jakiego powodu wnioskujesz o zasiłek (lub wybierz inny powód w „Pozostałych polach”)." },
      fields: [
        { id: "p2_33", label: "urodzeniem dziecka/dzieci" },
        { id: "p2_34", label: "przyjęciem dziecka na wychowanie i wystąpieniem do sądu o przysposobienie" },
        { id: "p2_36", label: "przyjęciem dziecka na wychowanie w rodzinie zastępczej (z wyjątkiem zawodowej)" },
        { id: "p2_35", label: "Data przyjęcia dziecka na wychowanie", required: (g) => g("p2_34") === true || g("p2_36") === true },
        { id: "p3_37", label: "Dane dziecka/dzieci", hint: "Imię i nazwisko, data i miejsce urodzenia.", required: (g) => g("p2_33") === true || g("p2_34") === true || g("p2_36") === true },
        { id: "p3_38", label: "Dziecko ma zaświadczenie „Za życiem” (art. 4 ust. 3 ustawy o wspieraniu kobiet w ciąży i rodzin)" },
        { id: "p3_39", label: "Imię/imiona dziecka z zaświadczeniem „Za życiem”", required: on("p3_38") },
        { id: "p3_40", label: "przewidywaną datą porodu (zasiłek przed porodem)" },
        { id: "p3_41", label: "Przewidywana data porodu", required: on("p3_40") },
      ] },
    { id: "other", title: "Drugi rodzic", text: "Wypełnij, jeśli wnioskujesz o zasiłek za urlop rodzicielski lub uzupełniający.",
      fields: [
        { id: "p5_76", no: "p5_77", label: "Czy drugi rodzic będzie korzystał z zasiłku za urlop rodzicielski / uzupełniający?" },
        { id: "p5_78", label: "Jeśli TAK — okres", hint: PERIOD_HINT, required: is("p5_76", "TAK") },
        { id: "p5_79", label: "PESEL drugiego rodzica" },
        { id: "p5_80", label: "Data urodzenia drugiego rodzica", hint: "Gdy nie ma numeru PESEL." },
        { id: "p5_81", label: DOC_LABEL, hint: DOC_HINT },
        { id: "p5_82", label: "Imię drugiego rodzica" },
        { id: "p5_83", label: "Nazwisko drugiego rodzica" },
      ] },
    { id: "paternity", title: "Oświadczenie (urlop ojcowski)", text: "Wypełnij, jeśli wnioskujesz o zasiłek za okres urlopu ojcowskiego.", fields: [
      { id: "p5_73", no: "p5_74", label: "Czy pobierałeś z innego tytułu zasiłek macierzyński za okres urlopu ojcowskiego?", required: on("p2_26") },
      { id: "p5_75", label: "Jeśli TAK — tytuł i okres pobierania", required: is("p5_73", "TAK") },
    ] },
    { id: "sign", title: "Oświadczenie", text: "Oświadczam, że dane zawarte we wniosku podałem/podałam zgodnie z prawdą.",
      fields: [{ id: "p5_84", label: "Data", hint: SIGN_HINT, required: true }] },
  ],

  "ZAS-53": [
    { id: "you", title: "Twoje dane", fields: person(["p1_000", "p1_001", "p1_002", "p1_003", "p1_004"]) },
    { id: "address", title: "Adres zamieszkania", fields: address(["p1_005", "p1_006", "p1_007", "p1_008", "p1_009", "p1_010", "p1_011"]) },
    { id: "payer", title: "Dane płatnika składek", text: "Przy własnej działalności — Ty.", fields: payer(["p1_012", "p1_013", "p1_014", "p1_015", "p1_016"], false) },
    { id: "bank", title: "Rachunek bankowy", fields: [{ id: "p2_017", label: "Numer rachunku", hint: BANK_HINT }] },
    { id: "request", title: "Składam wniosek o przyznanie zasiłku chorobowego",
      oneOf: { ids: ["p2_019", "p2_020"], message: "Zaznacz, kiedy przypada niezdolność do pracy." },
      fields: [
        { id: "p2_018", label: "Okres niezdolności do pracy", hint: `${PERIOD_HINT} Jeśli znasz — seria i numer zwolnienia lekarskiego.`, required: true },
        { id: "p2_019", label: "niezdolność przypada w okresie ubezpieczenia chorobowego/wypadkowego" },
        { id: "p2_020", label: "niezdolność przypada po ustaniu tytułu ubezpieczenia" },
        { id: "p2_021", label: "Data ustania tytułu ubezpieczenia", required: on("p2_020") },
      ] },
    { id: "cause", title: "Przyczyna niezdolności",
      fields: [
        { id: "p2_025", no: "p2_026", label: "Czy niezdolność wynika z choroby zawodowej, wypadku przy pracy lub w drodze do/z pracy?", required: true },
        { id: "p2_022", label: "choroby zawodowej" },
        { id: "p2_023", label: "wypadku przy pracy" },
        { id: "p2_024", label: "wypadku w drodze do pracy lub z pracy" },
        { id: "p2_027", label: "Jeśli TAK — rodzaj dokumentu (decyzja / protokół / karta wypadku), numer i data", required: is("p2_025", "TAK") },
        { id: "p2_028", no: "p2_029", label: "Jeśli jesteś marynarzem: czy za ten okres przysługuje Ci wynagrodzenie (art. 75 pkt 2 ustawy o pracy na morzu)?" },
      ] },
    { id: "sign", title: "Oświadczenie", fields: [{ id: "p2_030", label: "Data", hint: SIGN_HINT, required: true }] },
  ],

  "ZAS-12": [
    { id: "payer", title: "Dane płatnika składek", fields: payer(["p1_000", "p1_001", "p1_002", "p1_003", "p1_004"], true) },
    { id: "payerAddress", title: "Adres płatnika", fields: address(["p1_005", "p1_006", "p1_007", "p1_008", "p1_009", "p1_010", "p1_011"]) },
    { id: "insured", title: "Dane osoby ubezpieczonej", fields: person(["p1_012", "p1_013", "p1_014", "p1_015", "p1_016"]) },
    { id: "insuredAddress", title: "Adres osoby ubezpieczonej", fields: address(["p2_017", "p2_018", "p2_019", "p2_020", "p2_021", "p2_022"]) },
    { id: "bank", title: "Rachunek bankowy ubezpieczonego", fields: [{ id: "p2_023", label: "Numer rachunku", hint: BANK_HINT }] },
    { id: "request", title: "Ubezpieczony wnioskuje o",
      oneOf: { ids: ["p2_024", "p2_026"], message: "Zaznacz zasiłek, o który wnioskuje ubezpieczony." },
      fields: [...benefitPair("p2_024", "p2_025", "zasiłek chorobowy"), ...benefitPair("p2_026", "p2_027", "zasiłek opiekuńczy")] },
    { id: "employment", title: "Informacje o zatrudnieniu / ubezpieczeniu",
      fields: [
        { id: "p2_028", no: "p2_029", label: "Zatrudnienie / tytuł ubezpieczenia trwa nadal", required: true },
        { id: "p2_030", label: "Zatrudnienie / tytuł ubezpieczenia ustał z dniem", required: is("p2_028", "NIE") },
        { id: "p2_031", label: "Tytuł trwa, ale ubezpieczenie chorobowe ustało/ustanie z dniem" },
      ] },
    { id: "sign", title: "Oświadczenie płatnika", fields: [{ id: "p2_032", label: "Data", hint: SIGN_HINT, required: true }] },
  ],

  "Z-3": [
    { id: "kind", title: "Rodzaj wniosku", oneOf: { ids: ["p1_000", "p1_001"], message: "Zaznacz rodzaj wniosku." },
      fields: [{ id: "p1_000", label: "wniosek pierwszorazowy" }, { id: "p1_001", label: "wniosek o kontynuację świadczenia" }] },
    { id: "payer", title: "Dane płatnika składek (pracodawcy)", fields: [
      ...payer(["p1_002", "p1_003", "p1_004", "p1_005", "p1_006"], true),
      ...address(["p1_007", "p1_008", "p1_009", "p1_010", "p1_011", "p1_012", "p1_013"]),
    ] },
    { id: "insured", title: "Dane pracownika", fields: [
      ...person(["p1_014", "p1_015", "p1_016", "p1_017", "p1_018"]),
      ...address(["p2_019", "p2_020", "p2_021", "p2_022", "p2_023", "p2_024"]),
      { id: "p2_025", label: "Rachunek bankowy pracownika", hint: BANK_HINT },
    ] },
    { id: "benefit", title: "Pracownik wnioskuje o",
      oneOf: { ids: ["p2_026", "p2_028", "p2_030", "p2_032", "p2_034", "p2_036"], message: "Zaznacz świadczenie, o które wnioskuje pracownik." },
      fields: [
        ...benefitPair("p2_026", "p2_027", "zasiłek chorobowy"),
        ...benefitPair("p2_028", "p2_029", "zasiłek opiekuńczy"),
        ...benefitPair("p2_030", "p2_031", "zasiłek macierzyński"),
        ...benefitPair("p2_032", "p2_033", "zasiłek w wysokości zasiłku macierzyńskiego"),
        ...benefitPair("p2_034", "p2_035", "zasiłek wyrównawczy"),
        ...benefitPair("p2_036", "p2_037", "świadczenie rehabilitacyjne"),
      ] },
    { id: "employee", title: "Informacje o pracowniku", fields: [
      { id: "p3_038", label: "1. Jest zatrudniony — okres zatrudnienia", required: true },
      { id: "p3_039", label: "w wymiarze czasu pracy", hint: "Np. pełny etat, 1/2 etatu.", required: true },
      { id: "p3_040", label: "Od kiedy w tym wymiarze (data lub okres od–do)" },
      { id: "p3_041", no: "p3_042", label: "2. Czy jest zatrudniony na podstawie umowy o pracę tymczasową?", required: true },
      { id: "p3_043", no: "p3_044", label: "3. Czy wykonuje pracę za granicą?", required: true },
      ...incapacityCause(["p3_045", "p3_046", "p3_047"], "p3_048", "p3_049", "p3_050"),
      ...absence(["p3_051", "p3_052", "p3_053", "p3_054", "p3_055", "p3_056"], "p3_057", "p3_058", "p3_059"),
    ] },
    { id: "rights", title: "6. Pracownikowi udzielono", text: "Wypełnij, jeśli pracownik wnioskuje o zasiłek macierzyński.", fields: [
      { id: "p3_060", label: "urlop macierzyński" },
      { id: "p3_061", label: "urlop rodzicielski" },
      { id: "p3_062", label: "urlop na warunkach urlopu macierzyńskiego" },
      { id: "p3_063", label: "uzupełniający urlop macierzyński" },
      { id: "p3_064", label: "urlop ojcowski" },
      { id: "p3_065", label: "NIE (wniosek dotyczy zasiłku macierzyńskiego po ustaniu zatrudnienia)" },
      { id: "p3_066", label: "Okres od–do, data złożenia wniosku i stawka procentowa zasiłku (jeśli go wypłacałeś)" },
      { id: "p4_069", no: "p4_070", label: "7. Czy pracownik w czasie urlopu rodzicielskiego wykonuje pracę u swojego pracodawcy?" },
      { id: "p4_071", label: "Jeśli TAK — okres od–do i wymiar czasu pracy", required: is("p4_069", "TAK") },
      { id: "p3_067", label: "Dane dziecka/dzieci", hint: "Imię i nazwisko, data urodzenia.", required: on("p2_030") },
      { id: "p3_068", label: "Dane drugiego rodzica albo członka rodziny" },
    ] },
    { id: "paid", title: "Informacje o wypłaconych świadczeniach", fields: [
      ...paid("p4_072", "p4_073", "p4_074", "1. Czy wypłaciłeś wynagrodzenie za okresy niezdolności do pracy w tym roku (art. 92 Kodeksu pracy)?"),
      ...paid("p4_075", "p4_076", "p4_077", "2. Czy wypłaciłeś zasiłek chorobowy?"),
    ] },
    { id: "payerSize", title: "Liczba ubezpieczonych zgłoszonych do ubezpieczenia chorobowego",
      fields: [{ id: "p4_078", no: "p4_079", options: PAYER_SIZE, label: "Zgłosiłeś do ubezpieczenia chorobowego", required: true }] },
    { id: "contracts", title: "Inne umowy z pracownikiem", fields: [
      { id: "p5_271", no: "p5_272", label: "5. Czy z pracownikiem jest zawarta umowa zlecenia, agencyjna, o dzieło lub inna, albo przysługuje mu składnik wynagrodzenia przyznany do określonego terminu?" },
      { id: "p5_273", label: "Jeśli TAK — data, do której zawarto umowę (lub przysługuje składnik), i kwoty za poszczególne miesiące", required: is("p5_271", "TAK") },
    ] },
    { id: "sign", title: "Oświadczenie płatnika", fields: [
      { id: "p6_274", label: "Uwagi" },
      { id: "p6_275", label: "Data", hint: SIGN_HINT, required: true },
    ] },
  ],

  "Z-3a": [
    { id: "kind", title: "Rodzaj wniosku", oneOf: { ids: ["p1_000", "p1_001"], message: "Zaznacz rodzaj wniosku." },
      fields: [{ id: "p1_000", label: "pierwszy wniosek o świadczenie" }, { id: "p1_001", label: "wniosek o kontynuację świadczenia" }] },
    { id: "payer", title: "Dane płatnika składek (np. zleceniodawcy)", fields: [
      ...payer(["p1_002", "p1_003", "p1_004", "p1_005", "p1_006"], true),
      ...address(["p1_007", "p1_008", "p1_009", "p1_010", "p1_011", "p1_012", "p1_013"]),
    ] },
    { id: "insured", title: "Dane osoby ubezpieczonej", fields: [
      ...person(["p1_014", "p1_015", "p1_016", "p1_017", "p1_018"]),
      ...address(["p2_019", "p2_020", "p2_021", "p2_022", "p2_023", "p2_024"]),
      { id: "p2_025", label: "Rachunek bankowy", hint: BANK_HINT },
    ] },
    { id: "benefit", title: "Ubezpieczony wnioskuje o",
      oneOf: { ids: ["p2_026", "p2_028", "p2_030", "p2_032"], message: "Zaznacz świadczenie, o które wnioskuje ubezpieczony." },
      fields: [
        ...benefitPair("p2_026", "p2_027", "zasiłek chorobowy"),
        ...benefitPair("p2_028", "p2_029", "zasiłek opiekuńczy"),
        ...benefitPair("p2_030", "p2_031", "zasiłek macierzyński"),
        ...benefitPair("p2_032", "p2_033", "świadczenie rehabilitacyjne"),
        { id: "p2_034", label: "Wniosek o zasiłek macierzyński złożył w dniu" },
        { id: "p2_035", label: "Jeśli wypłacałeś zasiłek macierzyński — stawka procentowa" },
        { id: "p2_036", label: "Dane dziecka/dzieci", hint: "Imię i nazwisko, data urodzenia.", required: on("p2_030") },
        { id: "p3_037", label: "Dane drugiego rodzica albo członka rodziny" },
      ] },
    { id: "insurance", title: "Informacje o ubezpieczeniu", fields: [
      { id: "p3_038", no: "p3_039", label: "Objęty ubezpieczeniem chorobowym", required: true },
      { id: "p3_040", no: "p3_041", label: "Objęty ubezpieczeniem wypadkowym" },
      { id: "p3_053", label: "Ubezpieczeniu chorobowemu podlega (data lub okres)", required: is("p3_038", "TAK") },
      { id: "p3_054", label: "Ubezpieczeniu wypadkowemu podlega (data lub okres)" },
      { id: "p3_055", no: "p3_056", label: "3. Czy tytuł ubezpieczenia ustał?", required: true },
      { id: "p3_057", label: "Data ustania tytułu ubezpieczenia", required: is("p3_055", "TAK") },
      ...incapacityCause(["p4_058", "p4_059", "p4_060"], "p4_061", "p4_062", "p4_063"),
      ...absence(["p4_064", "p4_065", "p4_066", "p4_067", "p4_068", "p4_069"], "p4_070", "p4_071", "p4_072"),
    ] },
    { id: "paid", title: "Informacje o wypłaconych świadczeniach", fields: [
      ...paid("p4_073", "p4_074", "p4_075", "1. Czy wypłaciłeś wynagrodzenie za okresy niezdolności do pracy (art. 92 KP — praca nakładcza, służba zastępcza)?"),
      ...paid("p4_076", "p4_077", "p4_078", "2. Czy wypłaciłeś zasiłek chorobowy?"),
      ...paid("p4_079", "p4_080", "p4_081", "3. Czy wypłaciłeś uposażenie / stypendium / inne świadczenie za okresy niezdolności do pracy?"),
    ] },
    { id: "payerSize", title: "Liczba ubezpieczonych zgłoszonych do ubezpieczenia chorobowego",
      fields: [{ id: "p4_082", no: "p4_083", options: PAYER_SIZE, label: "Zgłosiłeś do ubezpieczenia chorobowego", required: true }] },
    { id: "sign", title: "Oświadczenie płatnika", fields: [
      { id: "p5_144", label: "Uwagi" },
      { id: "p5_145", label: "Data", hint: SIGN_HINT, required: true },
    ] },
  ],
};
