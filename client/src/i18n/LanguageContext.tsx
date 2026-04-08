import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { translations, type Language } from "./translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (section: string, key: string) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "totallook-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      // Check URL query parameter first (?lang=en or ?lang=he)
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get("lang");
      if (urlLang === "en" || urlLang === "he") {
        localStorage.setItem(STORAGE_KEY, urlLang);
        return urlLang;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "he") return stored;
    }
    return "he";
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  }, []);

  const dir = lang === "he" ? "rtl" : "ltr";

  // Update document direction when language changes
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const t = useCallback(
    (section: string, key: string): any => {
      const sec = (translations as any)[section];
      if (!sec) return key;
      const entry = sec[key];
      if (!entry) return key;
      // Handle arrays (like loading.steps and loading.facts)
      if (Array.isArray(entry)) {
        return entry.map((item: any) => (typeof item === "object" && item[lang] ? item[lang] : item));
      }
      // Handle nested objects (like budgetOptions with label/range)
      if (typeof entry === "string") return entry;
      if (entry[lang]) return entry[lang];
      return key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
