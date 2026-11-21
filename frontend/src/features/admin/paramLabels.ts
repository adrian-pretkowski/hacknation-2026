// FE1-28: polskie, czytelne nazwy parametrów prawnych (`zus_rules/03_rules.yaml` meta.parameters) i jednostek
// do panelu admina. Tylko etykiety - wartości i źródła przychodzą z API (GET /api/admin/parameters).
// Nowy parametr w 03 bez wpisu tutaj pokaże się pod swoim kodem (fallback), więc słownik nie blokuje silnika.

export const PARAM_LABELS: Record<string, string> = {
  // okresy wyczekiwania i ubezpieczenia
  WAITING_DAYS_MANDATORY: "Okres wyczekiwania - ubezpieczenie obowiązkowe",
  WAITING_DAYS_VOLUNTARY: "Okres wyczekiwania - ubezpieczenie dobrowolne",
  INSURANCE_GAP_MAX_DAYS: "Najdłuższa przerwa w ubezpieczeniu wliczana do okresu wyczekiwania",
  GRADUATE_WINDOW_DAYS: "Absolwent - czas na objęcie ubezpieczeniem od ukończenia szkoły",
  MANDATORY_HISTORY_YEARS: "Staż ubezpieczenia obowiązkowego zwalniający z okresu wyczekiwania",
  // zasiłek chorobowy
  AFTER_TITLE_ONSET_MAX_DAYS: "Niezdolność do pracy po ustaniu ubezpieczenia - najpóźniej od ustania",
  AFTER_TITLE_ONSET_MAX_MONTHS_CODE_E: "Niezdolność po ustaniu ubezpieczenia - choroba zakaźna (kod E)",
  AFTER_TITLE_MIN_INCAPACITY_DAYS: "Najkrótsza niezdolność do pracy uprawniająca do zasiłku po ustaniu ubezpieczenia",
  BENEFIT_PERIOD_STD_DAYS: "Okres zasiłkowy - standardowy",
  BENEFIT_PERIOD_PREGNANCY_TB_DAYS: "Okres zasiłkowy - ciąża lub gruźlica",
  AFTER_TITLE_MAX_DAYS: "Najdłuższy zasiłek chorobowy po ustaniu ubezpieczenia",
  BENEFIT_PERIOD_BREAK_DAYS: "Przerwa, po której liczy się nowy okres zasiłkowy",
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
  MOTHER_MIN_WEEKS_BEFORE_TRANSFER: "Tygodnie, które matka wykorzystuje przed przekazaniem urlopu ojcu",
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
  SUPP_CAP_WEEK_EARLY: "Urlop uzupełniający - najwięcej tygodni (poród przed 28. tyg. lub masa do progu)",
  SUPP_CAP_WEEK_PRETERM: "Urlop uzupełniający - najwięcej tygodni (pozostałe wcześniaki / hospitalizacja)",
  SUPP_TERM_WINDOW_FIRST_DAY: "Urlop uzupełniający - początek okna hospitalizacji (dzień po porodzie)",
  SUPP_TERM_WINDOW_LAST_DAY: "Urlop uzupełniający - koniec okna hospitalizacji (dzień po porodzie)",
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
  PARENTAL_EXT_CAP: "Urlop rodzicielski łączony z pracą - najdłuższe wydłużenie",
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
  RISK_INCREASE_FACTOR: "Ryzyko: wzrost podstawy składek w czasie ciąży (krotność)",
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

export const paramLabel = (name: string) => PARAM_LABELS[name] ?? name;
export const unitLabel = (unit: string) => UNIT_LABELS[unit] ?? unit;

/** Wartość do wyświetlenia (bez przeliczeń kwot): stawki jako %, tabele jako „klucz: wartość”. */
export function formatParamValue(value: unknown, unit: string): string {
  if (value === null || value === undefined) return "brak wartości";
  if (Array.isArray(value)) return `${value.length} pozycji`;
  if (typeof value === "object") {
    const suffix = unitLabel(unit) ? ` ${unitLabel(unit)}` : "";
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join(" · ") + suffix;
  }
  const text = String(value);
  if (unit === "ratio" && /^-?\d+(\.\d+)?$/.test(text)) {
    return `${shiftDecimal(text, 2)}%`;
  }
  const num = /^-?\d+(\.\d+)?$/.test(text) ? text.replace(".", ",") : text;
  return unitLabel(unit) && unit !== "ratio" ? `${num} ${unitLabel(unit)}` : num;
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
