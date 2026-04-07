/**
 * PhoneInput — Reusable phone number input with country code dropdown.
 * Shows flag + dial code, defaults to Israel (+972).
 * Outputs full E.164 formatted number.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Phone, MessageCircle } from "lucide-react";

export interface CountryDialCode {
  code: string;      // ISO 2-letter
  name: string;      // Display name
  dialCode: string;  // e.g. "+972"
  flag: string;      // Emoji flag
}

const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "AE", name: "UAE", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
];

/** Parse an E.164 phone number into { countryCode, localNumber } */
function parseE164(phone: string): { countryCode: string; localNumber: string } | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, "");
  // Try to match against known dial codes (longest first)
  const sorted = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (cleaned.startsWith(c.dialCode)) {
      return { countryCode: c.code, localNumber: cleaned.slice(c.dialCode.length) };
    }
  }
  // Fallback: if starts with +, strip it
  if (cleaned.startsWith("+")) {
    return { countryCode: "IL", localNumber: cleaned.slice(1) };
  }
  return { countryCode: "IL", localNumber: cleaned };
}

/** Format local number to E.164 */
export function toE164(dialCode: string, localNumber: string): string {
  const cleaned = localNumber.replace(/\D/g, "");
  // Remove leading zero (common in Israel: 052 → 52)
  const withoutLeadingZero = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
  return `${dialCode}${withoutLeadingZero}`;
}

interface PhoneInputProps {
  value: string;                    // E.164 format or empty
  onChange: (e164: string) => void; // Called with E.164 format
  defaultCountry?: string;          // ISO code, defaults to "IL"
  placeholder?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
  dir?: "rtl" | "ltr";
  className?: string;
}

export default function PhoneInput({
  value,
  onChange,
  defaultCountry = "IL",
  placeholder,
  label,
  hint,
  disabled = false,
  dir = "rtl",
  className = "",
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse initial value
  const parsed = useMemo(() => parseE164(value), [value]);
  const [selectedCountry, setSelectedCountry] = useState<CountryDialCode>(() => {
    const code = parsed?.countryCode || defaultCountry;
    return COUNTRY_DIAL_CODES.find(c => c.code === code) || COUNTRY_DIAL_CODES[0];
  });
  const [localNumber, setLocalNumber] = useState(() => parsed?.localNumber || "");

  // Sync when value changes externally
  useEffect(() => {
    if (value) {
      const p = parseE164(value);
      if (p) {
        const country = COUNTRY_DIAL_CODES.find(c => c.code === p.countryCode);
        if (country) setSelectedCountry(country);
        setLocalNumber(p.localNumber);
      }
    } else {
      setLocalNumber("");
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLocalChange = (raw: string) => {
    // Allow only digits and spaces
    const cleaned = raw.replace(/[^\d\s]/g, "");
    setLocalNumber(cleaned);
    const e164 = toE164(selectedCountry.dialCode, cleaned);
    // Only emit if there's actual content
    if (cleaned.replace(/\s/g, "").length > 0) {
      onChange(e164);
    } else {
      onChange("");
    }
  };

  const handleCountrySelect = (country: CountryDialCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    // Re-emit with new country code
    if (localNumber.replace(/\s/g, "").length > 0) {
      onChange(toE164(country.dialCode, localNumber));
    }
    inputRef.current?.focus();
  };

  const isRtl = dir === "rtl";

  return (
    <div className={`space-y-1.5 ${className}`} dir="ltr">
      {label && (
        <label className="block text-sm font-medium text-foreground" dir={dir}>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-green-500" />
            {label}
          </span>
        </label>
      )}

      <div className="flex items-center gap-0">
        {/* Country code dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              flex items-center gap-1 px-3 py-2.5 
              bg-card border border-white/10 rounded-l-xl
              text-sm font-medium text-foreground
              hover:border-primary/30 transition-colors
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              ${isOpen ? "border-primary/50" : ""}
            `}
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-muted-foreground text-xs">{selectedCountry.dialCode}</span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 max-h-60 overflow-y-auto z-50 bg-card border border-white/10 rounded-xl shadow-xl">
              {COUNTRY_DIAL_CODES.map(country => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                    hover:bg-primary/10 transition-colors
                    ${selectedCountry.code === country.code ? "bg-primary/5 text-primary" : "text-foreground"}
                  `}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-muted-foreground text-xs">{country.dialCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone number input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={e => handleLocalChange(e.target.value)}
          placeholder={placeholder || (selectedCountry.code === "IL" ? "52 123 4567" : "Phone number")}
          disabled={disabled}
          className={`
            flex-1 px-3 py-2.5
            bg-card border border-white/10 border-l-0 rounded-r-xl
            text-sm text-foreground placeholder:text-muted-foreground/50
            focus:outline-none focus:border-primary/50
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          dir="ltr"
        />
      </div>

      {hint && (
        <p className="text-xs text-muted-foreground" dir={dir}>
          {hint}
        </p>
      )}
    </div>
  );
}

export { COUNTRY_DIAL_CODES, parseE164 };
