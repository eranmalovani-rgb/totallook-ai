import { COUNTRY_STORE_MAP } from "./fashionTypes";

/**
 * Extract the currency symbol (e.g. "₪", "€", "$") from a country code.
 * Falls back to "$" for unknown countries.
 */
export function getCurrencySymbol(countryCode: string | null | undefined): string {
  if (!countryCode) return "$";
  const data = COUNTRY_STORE_MAP[countryCode];
  if (!data) return "$";
  // Currency format is "ILS (₪)" — extract the symbol inside parentheses
  const match = data.currency.match(/\((.+?)\)/);
  return match ? match[1] : "$";
}

/**
 * Get the full currency label (e.g. "ILS (₪)", "EUR (€)") from a country code.
 * Falls back to "USD ($)" for unknown countries.
 */
export function getCurrencyLabel(countryCode: string | null | undefined): string {
  if (!countryCode) return "USD ($)";
  const data = COUNTRY_STORE_MAP[countryCode];
  return data?.currency ?? "USD ($)";
}

/**
 * Get the locale name for a country code (e.g. "Israel", "Germany").
 */
export function getCountryLocale(countryCode: string | null | undefined): string {
  if (!countryCode) return "";
  return COUNTRY_STORE_MAP[countryCode]?.locale ?? "";
}
