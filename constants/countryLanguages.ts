import type { Language } from "../context/LanguageContext";

export type LangOption = {
  label: string;   // Native script display label
  appLang: Language;
};

export const DEFAULT_LANG: LangOption = { label: "English", appLang: "English" };

const E:  LangOption = { label: "English",          appLang: "English"          };
const HI: LangOption = { label: "हिंदी",             appLang: "हिंदी"             };
const GU: LangOption = { label: "ગુજરાતી",           appLang: "ગુજરાતી"           };
const TA: LangOption = { label: "தமிழ்",             appLang: "தமிழ்"             };
const BN: LangOption = { label: "বাংলা",             appLang: "বাংলা"             };
const MR: LangOption = { label: "मराठी",             appLang: "मराठी"             };
const ES: LangOption = { label: "Español",           appLang: "Español"           };
const FR: LangOption = { label: "Français",          appLang: "Français"          };
const PT: LangOption = { label: "Português",         appLang: "Português"         };
const DE: LangOption = { label: "Deutsch",           appLang: "Deutsch"           };
const AR: LangOption = { label: "العربية",           appLang: "العربية"           };
const JA: LangOption = { label: "日本語",             appLang: "日本語"             };
const ZH: LangOption = { label: "中文",               appLang: "中文"               };
const KO: LangOption = { label: "한국어",             appLang: "한국어"             };
const IT: LangOption = { label: "Italiano",          appLang: "Italiano"          };
const RU: LangOption = { label: "Русский",           appLang: "Русский"           };
const TR: LangOption = { label: "Türkçe",            appLang: "Türkçe"            };
const ID: LangOption = { label: "Bahasa Indonesia",  appLang: "Bahasa Indonesia"  };
const FL: LangOption = { label: "Filipino",          appLang: "Filipino"          };
const TH: LangOption = { label: "ภาษาไทย",           appLang: "ภาษาไทย"           };
const VI: LangOption = { label: "Tiếng Việt",        appLang: "Tiếng Việt"        };
const SW: LangOption = { label: "Kiswahili",         appLang: "Kiswahili"         };
const MS:  LangOption = { label: "Bahasa Melayu",     appLang: "Bahasa Melayu"     };
const PAL: LangOption = { label: "ਪੰਜਾਬੀ",            appLang: "ਪੰਜਾਬੀ"            };
const MAL: LangOption = { label: "മലയാളം",            appLang: "മലയാളം"            };
const TEL: LangOption = { label: "తెలుగు",            appLang: "తెలుగు"            };
const HRY: LangOption = { label: "हरियाणवी",          appLang: "हरियाणवी"          };

// Country code → ordered list of supported languages (English always first = default)
const MAP: Record<string, LangOption[]> = {
  // ── South Asia ──────────────────────────────────────────────────────────────
  IN: [E, HI, PAL, HRY, GU, MR, BN, TA, TEL, MAL],
  BD: [E, BN],
  PK: [E, HI, PAL],
  NP: [E, HI],
  LK: [E, TA],
  AF: [E, AR],
  MV: [E],

  // ── South-East Asia ─────────────────────────────────────────────────────────
  SG: [E, ZH, TA, MS],
  MY: [E, MS, ZH, TA],
  ID: [E, ID],
  PH: [E, FL],
  TH: [E, TH],
  VN: [E, VI],
  MM: [E],
  KH: [E],
  LA: [E],
  BN: [E, MS],
  TL: [E, FL],

  // ── East Asia ───────────────────────────────────────────────────────────────
  JP: [E, JA],
  CN: [E, ZH],
  TW: [E, ZH],
  HK: [E, ZH],
  MO: [E, ZH, PT],
  KR: [E, KO],
  MN: [E],

  // ── Middle East ─────────────────────────────────────────────────────────────
  AE: [E, AR],
  SA: [E, AR],
  QA: [E, AR],
  KW: [E, AR],
  BH: [E, AR],
  OM: [E, AR],
  YE: [E, AR],
  IQ: [E, AR],
  JO: [E, AR],
  LB: [E, AR],
  SY: [E, AR],
  PS: [E, AR],
  IL: [E, AR],
  TR: [E, TR],
  IR: [E, AR],

  // ── Central Asia ────────────────────────────────────────────────────────────
  KZ: [E, RU],
  UZ: [E, RU],
  TM: [E, RU],
  KG: [E, RU],
  TJ: [E, RU],

  // ── Europe — English-primary ─────────────────────────────────────────────
  GB: [E],
  IE: [E],
  MT: [E],

  // ── Europe — Germanic ───────────────────────────────────────────────────────
  DE: [E, DE],
  AT: [E, DE],
  LI: [E, DE],
  LU: [E, DE, FR],
  CH: [E, DE, FR, IT],

  // ── Europe — Romance ────────────────────────────────────────────────────────
  FR: [E, FR],
  BE: [E, FR, DE],
  MC: [E, FR],
  IT: [E, IT],
  SM: [E, IT],
  VA: [E, IT],
  ES: [E, ES],
  AD: [E, ES],
  PT: [E, PT],
  NL: [E, DE],
  RO: [E],
  MD: [E, RU],

  // ── Europe — Slavic & Nordic ─────────────────────────────────────────────
  RU: [E, RU],
  UA: [E, RU],
  BY: [E, RU],
  PL: [E],
  CZ: [E],
  SK: [E],
  HU: [E],
  HR: [E],
  SI: [E],
  RS: [E],
  BA: [E],
  ME: [E],
  MK: [E],
  AL: [E],
  BG: [E],
  GR: [E],
  CY: [E, AR],
  SE: [E],
  NO: [E],
  DK: [E],
  FI: [E],
  IS: [E],
  EE: [E],
  LV: [E],
  LT: [E],

  // ── Americas — English-primary ───────────────────────────────────────────
  US: [E],
  CA: [E, FR],
  AU: [E],
  NZ: [E],

  // ── Americas — Spanish ───────────────────────────────────────────────────
  MX: [E, ES],
  CO: [E, ES],
  AR: [E, ES],
  CL: [E, ES],
  PE: [E, ES],
  VE: [E, ES],
  EC: [E, ES],
  BO: [E, ES],
  PY: [E, ES],
  UY: [E, ES],
  CR: [E, ES],
  PA: [E, ES],
  GT: [E, ES],
  HN: [E, ES],
  SV: [E, ES],
  NI: [E, ES],
  DO: [E, ES],
  CU: [E, ES],
  PR: [E, ES],

  // ── Americas — Portuguese ────────────────────────────────────────────────
  BR: [E, PT],

  // ── Americas — Other ─────────────────────────────────────────────────────
  HT: [E, FR],
  JM: [E],
  TT: [E],
  BB: [E],
  GY: [E],
  SR: [E],
  BZ: [E, ES],

  // ── Africa — Arabic-speaking ─────────────────────────────────────────────
  EG: [E, AR],
  LY: [E, AR],
  TN: [E, AR, FR],
  DZ: [E, AR, FR],
  MA: [E, AR, FR],
  SD: [E, AR],
  SO: [E, AR],
  DJ: [E, AR, FR],
  MR: [E, AR, FR],

  // ── Africa — French-speaking ─────────────────────────────────────────────
  SN: [E, FR],
  CI: [E, FR],
  CM: [E, FR],
  ML: [E, FR],
  BF: [E, FR],
  NE: [E, FR],
  TD: [E, FR, AR],
  CF: [E, FR],
  CG: [E, FR],
  CD: [E, FR],
  GA: [E, FR],
  GQ: [E, ES, FR],
  RW: [E, FR],
  BI: [E, FR],
  MG: [E, FR],
  KM: [E, AR, FR],
  MU: [E, FR],
  SC: [E, FR],
  BJ: [E, FR],
  TG: [E, FR],
  GN: [E, FR],
  GW: [E, PT],

  // ── Africa — English-speaking ────────────────────────────────────────────
  NG: [E],
  KE: [E, SW],
  TZ: [E, SW],
  UG: [E, SW],
  ZA: [E],
  GH: [E],
  ET: [E],
  ZM: [E],
  ZW: [E],
  MW: [E],
  MZ: [E, PT],
  AO: [E, PT],
  CV: [E, PT],
  ST: [E, PT],
  NA: [E],
  BW: [E],
  LS: [E],
  SZ: [E],
  SL: [E],
  LR: [E],
  GM: [E],
  SS: [E],
  ER: [E],

  // ── Pacific ──────────────────────────────────────────────────────────────
  FJ: [E],
  PG: [E],
  SB: [E],
  VU: [E, FR],
  WS: [E],
  TO: [E],
  KI: [E],
  FM: [E],
  MH: [E],
  PW: [E],
};

const DEFAULT_LANGS: LangOption[] = [DEFAULT_LANG];

/**
 * Returns ordered list of app-supported languages for a given country code.
 * English is always index 0 (the default selection).
 */
export function getCountryLanguages(countryCode: string): LangOption[] {
  return MAP[countryCode] ?? DEFAULT_LANGS;
}
