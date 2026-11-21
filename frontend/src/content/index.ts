// Treści przewodnika (BA-02, interfejs I4): bloki ContentBlock z contracts/openapi.yaml.
// Źródła: zus_rules/03 (rule_ids), wyciąg KP, ustawa zasiłkowa, Poradnik dla rodziców ZUS 2026; lista organizacji
// wsparcia jest przykładowa (M16 d — ZUS nie ma zweryfikowanej listy). Typ sprawdza `npm run typecheck`.
import type { components } from "@/lib/api-types";
import guide from "./guide.json";
import legalProtection from "./legal_protection.json";
import risks from "./risks.json";
import sensitive from "./sensitive.json";
import support from "./support.json";

export type ContentBlock = components["schemas"]["ContentBlock"];

export const GUIDE: ContentBlock[] = guide as ContentBlock[];
export const RISKS: ContentBlock[] = risks as ContentBlock[];
export const LEGAL_PROTECTION: ContentBlock[] = legalProtection as ContentBlock[];
export const SUPPORT: ContentBlock[] = support as ContentBlock[];
export const SENSITIVE: ContentBlock[] = sensitive as ContentBlock[];

/** Wszystkie bloki — do testu spójności (unikalne id) i wyszukiwania po `rule_ids`. */
export const ALL_CONTENT: ContentBlock[] = [...GUIDE, ...RISKS, ...LEGAL_PROTECTION, ...SUPPORT, ...SENSITIVE];
