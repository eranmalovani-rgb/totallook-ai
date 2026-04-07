import { useState, useEffect } from "react";

const STORAGE_KEY = "totallook-user-country";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedCountry {
  code: string;
  timestamp: number;
}

/**
 * Detect the user's country code (ISO 3166-1 alpha-2) via multiple strategies:
 * 1. Check localStorage cache (valid for 24h)
 * 2. Try IP geolocation APIs (most accurate — actual physical location)
 * 3. Fall back to navigator.language locale hint ONLY if it looks like a real locale
 *    (e.g. "he-IL" → "IL") but NOT generic language-region combos like "en-GB"
 *    which just indicate language preference, not physical location.
 * 
 * Returns uppercase 2-letter country code or null while loading.
 */
export function useCountry(): { country: string | null; loading: boolean } {
  const [country, setCountry] = useState<string | null>(() => {
    // Check cache first (synchronous)
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: CachedCountry = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
          return parsed.code;
        }
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(country === null);

  useEffect(() => {
    if (country) return; // Already resolved from cache

    let cancelled = false;

    async function detect() {
      // Strategy 1: IP geolocation API (most accurate — reflects physical location)
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.country_code && !cancelled) {
            const code = data.country_code.toUpperCase();
            saveCountry(code);
            setCountry(code);
            setLoading(false);
            return;
          }
        }
      } catch {}

      // Strategy 2: Fallback IP geolocation API
      try {
        const res = await fetch("https://api.country.is/", { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.country && !cancelled) {
            const code = data.country.toUpperCase();
            saveCountry(code);
            setCountry(code);
            setLoading(false);
            return;
          }
        }
      } catch {}

      // Strategy 3: navigator.language locale hint — ONLY trust non-English locales
      // "he-IL" → IL (trustworthy — Hebrew is specific to Israel)
      // "de-DE" → DE (trustworthy — German locale set to Germany)
      // "en-GB" → SKIP (untrustworthy — many non-UK users set English-GB as language)
      // "en-US" → SKIP (untrustworthy — many non-US users set English-US as language)
      const navLang = navigator.language || (navigator as any).userLanguage || "";
      const parts = navLang.split("-");
      if (parts.length >= 2) {
        const langCode = parts[0].toLowerCase();
        const regionCode = parts[parts.length - 1].toUpperCase();
        // Only trust the locale if the language is NOT English
        // English is used globally as a default, so en-GB/en-US/en-AU don't indicate location
        if (langCode !== "en" && /^[A-Z]{2}$/.test(regionCode)) {
          if (!cancelled) {
            saveCountry(regionCode);
            setCountry(regionCode);
            setLoading(false);
            return;
          }
        }
      }

      // Final fallback: default to "US" if nothing works
      if (!cancelled) {
        saveCountry("US");
        setCountry("US");
        setLoading(false);
      }
    }

    detect();

    return () => { cancelled = true; };
  }, [country]);

  return { country, loading };
}

function saveCountry(code: string) {
  try {
    const cached: CachedCountry = { code, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {}
}
