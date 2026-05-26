export type EmergencyInfo = {
  number: string;
  label: string;
};

const EMERGENCY: Record<string, EmergencyInfo> = {
  // South Asia
  IN: { number: "112", label: "National Emergency" },
  PK: { number: "115", label: "Rescue / Ambulance" },
  BD: { number: "999", label: "National Emergency" },
  LK: { number: "110", label: "Ambulance" },
  NP: { number: "102", label: "Ambulance" },
  // Southeast Asia
  MY: { number: "999", label: "Emergency" },
  SG: { number: "995", label: "Ambulance / Fire" },
  PH: { number: "911", label: "Emergency" },
  ID: { number: "118", label: "Ambulance" },
  TH: { number: "1669", label: "Ambulance" },
  VN: { number: "115", label: "Ambulance" },
  // East Asia
  JP: { number: "119", label: "Ambulance / Fire" },
  CN: { number: "120", label: "Ambulance" },
  KR: { number: "119", label: "Ambulance / Fire" },
  TW: { number: "119", label: "Ambulance / Fire" },
  HK: { number: "999", label: "Emergency" },
  // Middle East
  AE: { number: "998", label: "Ambulance" },
  SA: { number: "920", label: "Ambulance" },
  QA: { number: "999", label: "Emergency" },
  KW: { number: "112", label: "Emergency" },
  BH: { number: "999", label: "Emergency" },
  OM: { number: "9999", label: "Emergency" },
  IL: { number: "101", label: "Ambulance" },
  // Europe
  GB: { number: "999", label: "Emergency" },
  IE: { number: "999", label: "Emergency" },
  DE: { number: "112", label: "Emergency" },
  FR: { number: "15", label: "SAMU (Ambulance)" },
  IT: { number: "118", label: "Ambulance" },
  ES: { number: "112", label: "Emergency" },
  PT: { number: "112", label: "Emergency" },
  NL: { number: "112", label: "Emergency" },
  BE: { number: "112", label: "Emergency" },
  CH: { number: "144", label: "Ambulance" },
  AT: { number: "144", label: "Ambulance" },
  SE: { number: "112", label: "Emergency" },
  NO: { number: "113", label: "Ambulance" },
  DK: { number: "112", label: "Emergency" },
  FI: { number: "112", label: "Emergency" },
  PL: { number: "112", label: "Emergency" },
  RU: { number: "103", label: "Ambulance" },
  TR: { number: "112", label: "Emergency" },
  GR: { number: "166", label: "Ambulance" },
  RO: { number: "112", label: "Emergency" },
  UA: { number: "103", label: "Ambulance" },
  // Americas
  US: { number: "911", label: "Emergency" },
  CA: { number: "911", label: "Emergency" },
  MX: { number: "911", label: "Emergency" },
  BR: { number: "192", label: "SAMU (Ambulance)" },
  AR: { number: "107", label: "Ambulance" },
  CL: { number: "131", label: "Ambulance" },
  CO: { number: "125", label: "Ambulance" },
  PE: { number: "117", label: "Ambulance" },
  // Africa
  ZA: { number: "10177", label: "Ambulance" },
  KE: { number: "999", label: "Emergency" },
  NG: { number: "199", label: "Ambulance" },
  EG: { number: "123", label: "Ambulance" },
  ET: { number: "907", label: "Ambulance" },
  // Oceania
  AU: { number: "000", label: "Emergency" },
  NZ: { number: "111", label: "Emergency" },
};

export function getCountryEmergency(countryCode: string): EmergencyInfo {
  return EMERGENCY[countryCode?.toUpperCase()] ?? { number: "112", label: "International Emergency" };
}
