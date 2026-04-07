/** Country code → display name mapping (English + Hebrew) */
export const COUNTRY_NAMES: Record<string, { en: string; he: string; flag: string }> = {
  IL: { en: "Israel", he: "ישראל", flag: "🇮🇱" },
  DE: { en: "Germany", he: "גרמניה", flag: "🇩🇪" },
  FR: { en: "France", he: "צרפת", flag: "🇫🇷" },
  GB: { en: "United Kingdom", he: "בריטניה", flag: "🇬🇧" },
  US: { en: "United States", he: "ארה\"ב", flag: "🇺🇸" },
  ES: { en: "Spain", he: "ספרד", flag: "🇪🇸" },
  IT: { en: "Italy", he: "איטליה", flag: "🇮🇹" },
  BR: { en: "Brazil", he: "ברזיל", flag: "🇧🇷" },
  AU: { en: "Australia", he: "אוסטרליה", flag: "🇦🇺" },
  JP: { en: "Japan", he: "יפן", flag: "🇯🇵" },
  KR: { en: "South Korea", he: "דרום קוריאה", flag: "🇰🇷" },
  IN: { en: "India", he: "הודו", flag: "🇮🇳" },
};

/** Get the flag emoji for a country code */
export function getCountryFlag(code: string): string {
  return COUNTRY_NAMES[code]?.flag ?? "🌍";
}

/** Get the display name for a country code */
export function getCountryName(code: string, lang: "he" | "en"): string {
  return COUNTRY_NAMES[code]?.[lang] ?? code;
}
