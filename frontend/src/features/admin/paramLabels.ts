// FE1-28: polskie, czytelne nazwy parametrów prawnych (`zus_rules/03_rules.yaml` meta.parameters) i jednostek
// do panelu admina. Tylko etykiety - wartości i źródła przychodzą z API (GET /api/admin/parameters).
// Nowy parametr w 03 bez wpisu tutaj pokaże się pod swoim kodem (fallback), więc słownik nie blokuje silnika.

export const PARAM_LABELS: Record<string, string> = {
  // okresy wyczekiwania i ubezpieczenia
  WAITING_DAYS_MANDATORY: "Okres wyczekiwania - ubezpieczenie obowiązkowe",
  WAITING_DAYS_VOLUNTARY: "Okres wyczekiwania - ubezpieczenie dobrowolne",
  INSURANCE_GAP_MAX_DAYS: "Najdłuższa przerwa między okresami ubezpieczenia, przy której poprzednie okresy wlicza się do okresu wyczekiwania",
  GRADUATE_WINDOW_DAYS: "Absolwent - czas na objęcie ubezpieczeniem od ukończenia szkoły",
  MANDATORY_HISTORY_YEARS: "Staż ubezpieczenia obowiązkowego zwalniający z okresu wyczekiwania",
  // zasiłek chorobowy
  AFTER_TITLE_ONSET_MAX_DAYS: "Niezdolność do pracy po ustaniu ubezpieczenia - najpóźniej od ustania",
  AFTER_TITLE_ONSET_MAX_MONTHS_CODE_E: "Niezdolność po ustaniu ubezpieczenia - choroba zakaźna (kod E)",
  AFTER_TITLE_MIN_INCAPACITY_DAYS: "Najkrótsza niezdolność do pracy uprawniająca do zasiłku po ustaniu ubezpieczenia",
  BENEFIT_PERIOD_STD_DAYS: "Okres zasiłkowy - standardowy",
  BENEFIT_PERIOD_PREGNANCY_TB_DAYS: "Okres zasiłkowy - ciąża lub gruźlica",
  AFTER_TITLE_MAX_DAYS: "Najdłuższy zasiłek chorobowy po ustaniu ubezpieczenia",
  BENEFIT_PERIOD_BREAK_DAYS: "Najdłuższa przerwa, przy której niezdolność wlicza się do tego samego okresu zasiłkowego",
  SICK_RATE_STD: "Stawka zasiłku chorobowego - standardowa",
  SICK_RATE_FULL: "Stawka zasiłku chorobowego - w ciąży",
  ALCOHOL_EXCLUDED_DAYS: "Dni bez zasiłku przy niezdolności z powodu nadużycia alkoholu",
  MONTH_AS_DAYS: "Liczba dni w miesiącu do wyliczenia stawki dziennej",
  SICK_PAY_DAYS_STD: "Wynagrodzenie chorobowe od pracodawcy - dni w roku",
  SICK_PAY_DAYS_50PLUS: "Wynagrodzenie chorobowe od pracodawcy - dni w roku (osoby po 50. roku życia)",
  SICK_PAY_AGE_THRESHOLD: "Wiek, od którego pracodawca płaci krócej",
  SICK_PAY_RATE_STD: "Stawka wynagrodzenia chorobowego - standardowa",
  SICK_PAY_RATE_PREGNANCY: "Stawka wynagrodzenia chorobowego - w ciąży",
  // świadczenie rehabilitacyjne
  REHAB_MAX_MONTHS: "Świadczenie rehabilitacyjne - najdłuższy okres",
  REHAB_RATE_FIRST_3M: "Świadczenie rehabilitacyjne - stawka przez pierwsze 3 miesiące",
  REHAB_RATE_REST: "Świadczenie rehabilitacyjne - stawka za pozostały okres",
  REHAB_RATE_PREGNANCY: "Świadczenie rehabilitacyjne - stawka w ciąży",
  // urlop i zasiłek macierzyński
  MATERNITY_WEEKS_BY_CHILDREN: "Urlop macierzyński - wymiar wg liczby dzieci urodzonych przy jednym porodzie",
  PRE_BIRTH_MAX_WEEKS: "Urlop macierzyński - najwięcej tygodni przed porodem",
  MOTHER_MIN_WEEKS_BEFORE_TRANSFER: "Najmniej tygodni urlopu macierzyńskiego wykorzystanych przez matkę po porodzie przed rezygnacją na rzecz ojca",
  MOTHER_MIN_WEEKS_SPECIAL: "Tygodnie wykorzystane przez matkę przy przejęciu urlopu w szczególnych sytuacjach",
  STILLBIRTH_LEAVE_WEEKS: "Urlop po urodzeniu martwego dziecka",
  CHILD_DEATH_MIN_DAYS: "Najkrótszy urlop po śmierci dziecka (dni od śmierci)",
  ABANDONMENT_MIN_WEEKS: "Urlop matki, która oddała dziecko do adopcji lub domu małego dziecka - co najmniej",
  ADOPTION_CHILD_AGE_MAX: "Adopcja - górny wiek dziecka",
  FOSTER_CHILD_AGE_MAX: "Rodzina zastępcza - górny wiek dziecka",
  FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED: "Rodzina zastępcza - górny wiek dziecka z odroczonym obowiązkiem szkolnym",
  MATERNITY_LIKE_GUARANTEED_WEEKS: "Urlop na warunkach macierzyńskiego - gwarantowane tygodnie",
  WEEK_AS_DAYS: "Liczba dni w tygodniu urlopu",
  // urlop uzupełniający (wcześniaki, hospitalizacja)
  SUPP_CAP_WEEK_EARLY: "Urlop uzupełniający - pobyt w szpitalu liczony do upływu tego tygodnia po porodzie (poród przed 28. tyg. ciąży lub masa do progu)",
  SUPP_CAP_WEEK_PRETERM: "Urlop uzupełniający - pobyt w szpitalu liczony do upływu tego tygodnia po porodzie (pozostałe wcześniaki i dzieci donoszone)",
  SUPP_TERM_WINDOW_FIRST_DAY: "Urlop uzupełniający - początek okna hospitalizacji dziecka donoszonego",
  SUPP_TERM_WINDOW_LAST_DAY: "Urlop uzupełniający - koniec okna hospitalizacji dziecka donoszonego",
  SUPP_TERM_MIN_CONSECUTIVE_DAYS: "Urlop uzupełniający - najkrótszy nieprzerwany pobyt w szpitalu",
  SUPP_WEIGHT_THRESHOLD_G: "Urlop uzupełniający - próg masy urodzeniowej",
  SUPP_GESTATION_EARLY_WEEK: "Urlop uzupełniający - poród przed tym tygodniem ciąży",
  SUPP_GESTATION_TERM_WEEK: "Urlop uzupełniający - poród od tego tygodnia ciąży (donoszona ciąża)",
  // urlop rodzicielski
  PARENTAL_WEEKS_SINGLE: "Urlop rodzicielski - jedno dziecko",
  PARENTAL_WEEKS_MULTIPLE: "Urlop rodzicielski - ciąża mnoga",
  PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE: "Urlop rodzicielski - jedno dziecko z zaświadczeniem „Za życiem”",
  PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE: "Urlop rodzicielski - ciąża mnoga z zaświadczeniem „Za życiem”",
  PARENTAL_WEEKS_ADOPT_GUARANTEED: "Urlop rodzicielski przy adopcji - gwarantowane tygodnie",
  PARENTAL_WEEKS_ADOPT_GUARANTEED_ZA_ZYCIEM: "Urlop rodzicielski przy adopcji - gwarantowane tygodnie („Za życiem”)",
  PARENTAL_NONTRANSFERABLE_WEEKS: "Urlop rodzicielski - tygodnie nieprzenoszalne na drugiego rodzica",
  PARENTAL_MAX_PARTS: "Urlop rodzicielski - najwięcej części",
  PARENTAL_CHILD_AGE_YEAR_LIMIT: "Urlop rodzicielski - do końca roku, w którym dziecko kończy",
  PARENTAL_WORK_MAX_FRACTION: "Urlop rodzicielski - najwyższy wymiar pracy przy łączeniu z urlopem",
  PARENTAL_EXT_CAP: "Urlop rodzicielski łączony z pracą - najdłuższy łączny wymiar",
  // urlop ojcowski
  PATERNITY_WEEKS: "Urlop ojcowski - wymiar",
  PATERNITY_MAX_PARTS: "Urlop ojcowski - najwięcej części",
  PATERNITY_MIN_PART_WEEKS: "Urlop ojcowski - najkrótsza część",
  PATERNITY_CHILD_AGE_MONTHS: "Urlop ojcowski - do ukończenia przez dziecko",
  PATERNITY_ADOPTION_WINDOW_MONTHS: "Urlop ojcowski przy adopcji - czas od uprawomocnienia postanowienia",
  // stawki zasiłku macierzyńskiego
  MAT_RATE_FULL: "Stawka zasiłku macierzyńskiego - urlop macierzyński",
  MAT_RATE_PARENTAL: "Stawka zasiłku macierzyńskiego - urlop rodzicielski",
  MAT_RATE_COMBINED: "Stawka zasiłku macierzyńskiego - wniosek o cały okres od razu",
  APP_COMBINED_DEADLINE_DAYS: "Termin wniosku o stawkę za cały okres (od porodu)",
  PUBLIC_HOLIDAYS: "Dni ustawowo wolne od pracy",
  PARENTAL_BENEFIT_FLOOR_MONTHLY: "Najniższy zasiłek macierzyński za urlop rodzicielski (miesięcznie)",
  // podstawa wymiaru
  MIN_BASE_ROUNDING_STEP: "Zaokrąglenie minimalnej podstawy wymiaru",
  CONTRIBUTION_DEDUCTION_RATE: "Potrącenie składek na ubezpieczenia społeczne z podstawy",
  MIN_WAGE_2026_MONTHLY: "Minimalne wynagrodzenie 2026 (miesięcznie)",
  VOLUNTARY_MAX_CONTRIB_BASE_2026: "Ubezpieczenie dobrowolne - najwyższa podstawa składek 2026",
  JDG_MIN_CONTRIB_BASE_2026: "Działalność gospodarcza - najniższa podstawa składek 2026",
  JDG_PREFERENTIAL_CONTRIB_BASE_2026: "Działalność gospodarcza - preferencyjna podstawa składek 2026",
  JDG_PREFERENTIAL_MONTHS: "Działalność gospodarcza - okres składek preferencyjnych",
  AVERAGE_WAGE_CAP_AFTER_TITLE: "Górna granica podstawy zasiłku po ustaniu ubezpieczenia (przeciętne wynagrodzenie)",
  STUDENT_AGE_LIMIT_YEARS: "Uczeń / student na zleceniu - wiek, do którego nie podlega ubezpieczeniu",
  START_RELIEF_MONTHS: "Ulga na start - okres bez składek społecznych",
  // płatnik, zaległości, terminy wypłaty
  PAYER_INSURED_THRESHOLD: "Płatnik wypłaca zasiłki sam powyżej tej liczby ubezpieczonych",
  DEBT_THRESHOLD_MIN_WAGE_RATIO: "Zaległość w składkach blokująca zasiłek - próg (część minimalnego wynagrodzenia)",
  DEBT_REPAYMENT_LIMIT_MONTHS: "Zaległość - czas na spłatę, by zachować zasiłek",
  CLAIM_LIMIT_MONTHS: "Przedawnienie prawa do zasiłku",
  CLAIM_LIMIT_YEARS_PAYER_ERROR: "Wypłata wyrównania przy błędzie płatnika - wstecz",
  PAYMENT_DEADLINE_DAYS: "Termin wypłaty zasiłku od kompletu dokumentów",
  PAYMENT_DEADLINE_AFTER_DEBT_DAYS: "Termin wypłaty po spłacie zaległości",
  PAYER_FORWARD_DAYS: "Termin przekazania dokumentów przez płatnika do ZUS",
  // terminy wniosków urlopowych
  LEAVE_APP_PARENTAL_DAYS_BEFORE: "Wniosek o urlop rodzicielski - najpóźniej przed rozpoczęciem",
  LEAVE_APP_MATERNITY_PRE_BIRTH_DAYS_BEFORE: "Wniosek o urlop macierzyński przed porodem - najpóźniej przed rozpoczęciem",
  LEAVE_APP_MATERNITY_FOR_FATHER_DAYS_BEFORE: "Wniosek ojca o przejęcie urlopu macierzyńskiego - najpóźniej przed rozpoczęciem",
  LEAVE_APP_PATERNITY_DAYS_BEFORE: "Wniosek o urlop ojcowski - najpóźniej przed rozpoczęciem",
  LEAVE_APP_SUPPLEMENTARY_DAYS_BEFORE_MATERNITY_END: "Wniosek o urlop uzupełniający - najpóźniej przed końcem macierzyńskiego",
  LEAVE_APP_RESIGNATION_DAYS_BEFORE_RETURN: "Rezygnacja z części urlopu - najpóźniej przed powrotem do pracy",
  LEAVE_APP_MATERNITY_LIKE_DAYS_AFTER_ACCEPTANCE: "Wniosek o urlop na warunkach macierzyńskiego - po przyjęciu dziecka",
  // ryzyka (parametry projektowe zespołu)
  RISK_WINDOW_DAYS: "Ryzyko: tytuł ubezpieczenia rozpoczęty krótko przed ciążą",
  RISK_INCREASE_FACTOR: "Ryzyko: podstawa składek w ciąży wyższa niż średnia sprzed ciąży razy ten mnożnik",
  RISK_BASE_MONTHS_BEFORE_PREGNANCY: "Ryzyko: okres porównania podstawy sprzed ciąży",
  ROUNDING_POLICY: "Zasady zaokrąglania kwot",
};

export const UNIT_LABELS: Record<string, string> = {
  days: "dni",
  weeks: "tygodnie",
  months: "miesiące",
  years: "lata",
  ratio: "stawka (%)",
  ratio_of_fte: "część etatu",
  PLN: "zł",
  grams: "gramy",
  count: "liczba",
  dates: "lista dat",
  gestation_week: "tydzień ciąży",
  insured_persons: "liczba ubezpieczonych",
  days_per_calendar_year: "dni w roku kalendarzowym",
  days_after_event: "dni od porodu",
  days_before_start: "dni przed rozpoczęciem",
  days_before_maternity_end: "dni przed końcem urlopu macierzyńskiego",
  days_before_return: "dni przed powrotem do pracy",
  days_after_acceptance: "dni od przyjęcia dziecka",
  days_before_pregnancy_start: "dni przed początkiem ciąży",
  weeks_after_birth: "tygodnie od porodu",
  day_number_birth_is_1: "dzień (dzień porodu = 1)",
  none: "",
};

/** Odmiana jednostki przy liczbie całkowitej: [1, 2-4, 5+] + opcjonalny dopisek (np. „przed rozpoczęciem”). */
const UNIT_FORMS: Record<string, { forms: [string, string, string]; suffix?: string }> = {
  days: { forms: ["dzień", "dni", "dni"] },
  weeks: { forms: ["tydzień", "tygodnie", "tygodni"] },
  months: { forms: ["miesiąc", "miesiące", "miesięcy"] },
  years: { forms: ["rok", "lata", "lat"] },
  grams: { forms: ["g", "g", "g"] },
  days_per_calendar_year: { forms: ["dzień", "dni", "dni"], suffix: "w roku kalendarzowym" },
  days_after_event: { forms: ["dzień", "dni", "dni"], suffix: "od porodu" },
  days_before_start: { forms: ["dzień", "dni", "dni"], suffix: "przed rozpoczęciem" },
  days_before_maternity_end: { forms: ["dzień", "dni", "dni"], suffix: "przed końcem urlopu macierzyńskiego" },
  days_before_return: { forms: ["dzień", "dni", "dni"], suffix: "przed powrotem do pracy" },
  days_after_acceptance: { forms: ["dzień", "dni", "dni"], suffix: "od przyjęcia dziecka" },
  days_before_pregnancy_start: { forms: ["dzień", "dni", "dni"], suffix: "przed początkiem ciąży" },
  weeks_after_birth: { forms: ["tydzień", "tygodnie", "tygodni"], suffix: "po porodzie" },
  insured_persons: { forms: ["ubezpieczony", "ubezpieczonych", "ubezpieczonych"] },
};

/** Klucze tabel (MATERNITY_WEEKS_BY_CHILDREN, PARENTAL_EXT_CAP) po polsku. */
const TABLE_KEYS: Record<string, string> = {
  "1": "1 dziecko", "2": "2 dzieci", "3": "3 dzieci", "4": "4 dzieci", "5+": "5 i więcej dzieci",
  single: "jedno dziecko", multiple: "ciąża mnoga",
  za_zyciem_single: "„Za życiem” - jedno dziecko", za_zyciem_multiple: "„Za życiem” - ciąża mnoga",
};

/** Stawki pokazywane jako mnożnik (×), nie jako procent. */
const FACTOR_PARAMS = new Set(["RISK_INCREASE_FACTOR"]);

export const paramLabel = (name: string) => PARAM_LABELS[name] ?? name;
export const unitLabel = (unit: string) => UNIT_LABELS[unit] ?? unit;

const DECIMAL = /^-?\d+(\.\d+)?$/;

function plural(n: number, [one, few, many]: [string, string, string]): string {
  if (n === 1) return one;
  const d = n % 10, dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
}

/** Liczba z jednostką po polsku: „15 tygodni po porodzie”, „5. dzień (dzień porodu = 1.)”, „1000 g”. */
function withUnit(text: string, unit: string): string {
  if (!DECIMAL.test(text)) return text;
  const num = text.replace(".", ",");
  if (unit === "day_number_birth_is_1") return `${num}. dzień (dzień porodu = 1.)`;
  if (unit === "gestation_week") return `${num}. tydzień ciąży`;
  const spec = UNIT_FORMS[unit];
  if (spec && /^\d+$/.test(text)) return [num, plural(Number(text), spec.forms), spec.suffix].filter(Boolean).join(" ");
  if (unit === "PLN") return `${num} zł`;
  if (unit === "ratio_of_fte") return `${num} etatu`;
  return num;
}

/** Wartość do wyświetlenia (bez przeliczeń kwot): stawki jako %, tabele jako „klucz: wartość”, listy dat - liczba i zakres. */
export function formatParamValue(value: unknown, unit: string, name = ""): string {
  if (value === null || value === undefined) return "brak wartości";
  if (Array.isArray(value)) {
    const days = value.map(String).sort();
    return days.length ? `${days.length} dni (${formatIsoDate(days[0])} - ${formatIsoDate(days[days.length - 1])})` : "pusta lista";
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${TABLE_KEYS[k] ?? k}: ${withUnit(String(v), unit)}`).join(" · ");
  }
  const text = String(value);
  if (unit === "ratio" && DECIMAL.test(text)) {
    return FACTOR_PARAMS.has(name) ? `${text.replace(".", ",")}×` : `${shiftDecimal(text, 2)}%`;
  }
  return withUnit(text, unit);
}

/** RRRR-MM-DD → DD.MM.RRRR (bez obiektu Date - bez przesunięć strefy czasowej). */
export function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Przesunięcie przecinka dziesiętnego na stringu (0.815 → 81,5) - bez arytmetyki zmiennoprzecinkowej. */
function shiftDecimal(text: string, places: number): string {
  const neg = text.startsWith("-");
  const [int, frac = ""] = (neg ? text.slice(1) : text).split(".");
  const padded = frac.padEnd(places, "0");
  const whole = (int + padded.slice(0, places)).replace(/^0+(?=\d)/, "");
  const rest = padded.slice(places).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${rest ? `,${rest}` : ""}`;
}
