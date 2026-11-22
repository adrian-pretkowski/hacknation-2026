// FE1-05: progi w treści pytań z parametrów (nie wpisujemy liczb z przepisów).
import { PARAMS } from "../preview/params";

export const LEAVE_LABEL: Record<string, string> = {
  MATERNITY_LEAVE: "Urlop macierzyński",
  MATERNITY_LEAVE_TRANSFERRED: "Macierzyński przejęty przez tatę",
  MATERNITY_LIKE_LEAVE: "Urlop na warunkach macierzyńskiego",
  SUPPLEMENTARY_MATERNITY_LEAVE: "Urlop uzupełniający",
  PARENTAL_LEAVE: "Urlop rodzicielski",
  PATERNITY_LEAVE: "Urlop ojcowski",
};

export const LEAVE_COLOR: Record<string, string> = {
  MATERNITY_LEAVE: "bg-zus-navy",
  MATERNITY_LEAVE_TRANSFERRED: "bg-zus-blue",
  MATERNITY_LIKE_LEAVE: "bg-zus-navy",
  SUPPLEMENTARY_MATERNITY_LEAVE: "bg-zus-yellow",
  PARENTAL_LEAVE: "bg-zus-green",
  PATERNITY_LEAVE: "bg-zus-blue",
};

export const PARENT_LABEL: Record<string, string> = { MOTHER: "Mama", FATHER: "Tata", "MOTHER/FATHER": "Mama lub tata" };

export const DEADLINE_LABEL: Record<string, string> = {
  APP_COMBINED_815: "Ostatni dzień na wniosek o wariant 81,5% (macierzyński + rodzicielski łącznie)",
  PARENTAL_APPLICATION_IF_SEPARATE: "Wniosek o rodzicielski, jeśli składasz go osobno (21 dni przed startem)",
  PARENTAL_APPLICATION: "Wniosek o dalszą część rodzicielskiego (21 dni przed startem)",
  FATHER_PARENTAL_APPLICATION: "Wniosek taty o rodzicielski (21 dni przed startem)",
  PATERNITY_APPLICATION: "Wniosek o urlop ojcowski (7 dni przed startem)",
  PATERNITY_LATEST_END: "Ojcowski trzeba wykorzystać do tego dnia (12 mies. życia dziecka; dzień do potwierdzenia)",
  SUPPLEMENTARY_APPLICATION: "Wniosek o urlop uzupełniający (21 dni przed końcem macierzyńskiego)",
  WORK_DURING_PARENTAL_APPLICATION: "Wniosek o łączenie urlopu z pracą (21 dni przed podjęciem pracy)",
  PARENTAL_FINAL_DATE: "Koniec możliwości korzystania z rodzicielskiego (31.12 roku 6. urodzin)",
  PARENTAL_LATEST_CONTINUOUS_APPLICATION: "Najpóźniejszy wniosek, aby wykorzystać całą resztę ciągiem",
  RATE_MAT_TOPUP_APPLICATION: "Wniosek o wyrównanie zasiłku macierzyńskiego do 100%",
  // FE1-25: kody jak w backendzie (f_leave_application_deadlines)
  LEAVE_APP_MATERNITY_PRE_BIRTH: "Wniosek o część urlopu macierzyńskiego przed porodem (14 dni przed startem; termin z Poradnika ZUS, do potwierdzenia)",
  LEAVE_APP_MATERNITY_FOR_FATHER: "Wniosek taty o przejęcie części urlopu macierzyńskiego (14 dni przed startem)",
  LEAVE_APP_MATERNITY_RESIGNATION: "Rezygnacja mamy z dalszej części macierzyńskiego (7 dni przed powrotem do pracy)",
  PATERNITY_LATEST_END_ADOPTION: "Ojcowski przy adopcji trzeba wykorzystać do tego dnia (12 mies. od uprawomocnienia postanowienia, najpóźniej przed 14. urodzinami dziecka)",
  LEAVE_APP_MATERNITY_LIKE: "Wniosek o urlop na warunkach macierzyńskiego (do 7 dni od przyjęcia dziecka)",
};

export const DOC_LABEL: Record<string, string> = {
  BIRTH_CERTIFICATE_SHORT: "Skrócony odpis aktu urodzenia dziecka",
  STILLBIRTH_CERTIFICATE: "Zaświadczenie o martwym urodzeniu",
  DEATH_CERTIFICATE: "Akt zgonu dziecka (odpis) lub karta zgonu",
  COURT_OR_PLACEMENT_CERTIFICATE: "Zaświadczenie sądu o wniosku o przysposobienie / postanowienie o umieszczeniu dziecka",
  LEAVE_APPLICATION_MATERNITY_AND_PARENTAL: "Wniosek o urlop macierzyński i rodzicielski (łącznie) + wniosek o 81,5%",
  LEAVE_APPLICATION_MATERNITY: "Wniosek o urlop macierzyński",
  LEAVE_APPLICATION_PATERNITY: "Wniosek o urlop ojcowski",
  LEAVE_APPLICATION_PARENTAL: "Wniosek o urlop rodzicielski",
  ZAM_APPLICATION: "Wniosek o zasiłek macierzyński (ZUS ZAM)",
  APPLICATION_COMBINED_815: "Wniosek o zasiłek w wysokości 81,5% za macierzyński i rodzicielski",
  PAYER_CERTIFICATE_Z3: "Zaświadczenie płatnika składek (Z-3)",
  HOSPITAL_STAY_CERTIFICATE: "Zaświadczenie ze szpitala o pobycie dziecka",
};

export const PAYER_LABEL: Record<string, string> = {
  CONTRIBUTION_PAYER: "Zasiłek wypłaca pracodawca (płatnik > 20 ubezpieczonych).",
  ZUS: "Zasiłek wypłaca ZUS.",
};

export const STATUS_HEADLINE: Record<string, string> = {
  ELIGIBLE: "Przysługuje",
  NOT_ELIGIBLE: "Nie przysługuje",
  NEEDS_DATA: "Potrzebujemy jeszcze kilku danych",
  NEEDS_REVIEW: "Wymaga weryfikacji",
  OUT_OF_SCOPE: "Poza zakresem",
};

export const FIELD_QUESTION: Record<string, string> = {
  "event.court_adoption_application_date": "Podaj datę złożenia wniosku do sądu o przysposobienie.",
  "person.role": "Wybierz, kim jesteś (mama, tata, opiekun).",
  "person.birth_date": "Podaj datę urodzenia (od 50. roku życia pracodawca płaci krócej).",
  "benefit_history.sickness_periods": "Czy w ostatnich miesiącach byłaś na innych zwolnieniach lekarskich?",
  "benefit_history.employer_sick_pay_days_in_year": "Ile dni wynagrodzenia chorobowego wypłacił Ci pracodawca w tym roku?",
  "event.date": "Podaj datę porodu lub przyjęcia dziecka.",
  "insurance.titles": "Podaj tytuł ubezpieczenia i datę jego rozpoczęcia.",
  "insurance.titles[0].sickness_insurance_mode": "Czy opłacasz dobrowolne ubezpieczenie chorobowe?",
  "employment.working_time_fraction": "Czy pracujesz na pełny etat? (minimalna podstawa zasiłku)",
  "income_history.manual_base_override": "Podaj wynagrodzenie, aby policzyć kwoty.",
  "children.count_at_birth": "Ile dzieci urodziło się przy jednym porodzie?",
  "children.count_at_event": "Ile dzieci przyjmujesz?",
  "debt.amount_on_right_date": "Podaj kwotę zaległości w składkach (0, jeśli brak).",
  "employment.extended_until_birth_kp177": "Czy umowa kończy się po upływie 3. miesiąca ciąży?",
  "mother.sickness_insured": "Czy partnerka ma ubezpieczenie chorobowe?",
  "birth.completed_gestation_weeks": "Podaj tydzień ciąży lub masę urodzeniową dziecka.",
  // FE1-37: getter - próg z panelu admina czytany przy wyświetleniu
  get "birth.weight_at_most_threshold"() { return `Czy masa urodzeniowa dziecka wynosiła najwyżej ${PARAMS.SUPP_WEIGHT_THRESHOLD_G.toLocaleString("pl-PL")} g?`; },
  "children.hospital_stays": "Ile tygodni dziecko było w szpitalu?",
  "payer.insured_count_on_nov30_prev_year": "Ile osób zgłasza do ubezpieczenia Twój pracodawca? (ustala, kto wypłaca)",
  "children.items[].birth_date": "Podaj wiek dziecka.",
};

export const FIELD_STEP: Record<string, string> = {
  "event.date": "event", "children.count_at_birth": "event", "children.count_at_event": "event", "children.items[].birth_date": "event",
  "insurance.titles": "insurance", "insurance.titles[0].sickness_insurance_mode": "insurance", "debt.amount_on_right_date": "insurance",
  "employment.extended_until_birth_kp177": "insurance", "employment.working_time_fraction": "insurance", "payer.insured_count_on_nov30_prev_year": "insurance",
  "income_history.manual_base_override": "salary", "mother.sickness_insured": "partner",
  "birth.completed_gestation_weeks": "special", "birth.weight_at_most_threshold": "special", "children.hospital_stays": "special",
};
