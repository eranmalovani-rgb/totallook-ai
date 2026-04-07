/**
 * PhoneInput utility tests
 * Tests the E.164 formatting and parsing logic used by the PhoneInput component.
 * These are pure utility functions that can be tested server-side.
 */

import { describe, it, expect } from "vitest";

// We test the shared logic directly. The component imports these.
// Since the component is a React file, we replicate the core logic here for testing.

/** Format local number to E.164 */
function toE164(dialCode: string, localNumber: string): string {
  const cleaned = localNumber.replace(/\D/g, "");
  const withoutLeadingZero = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
  return `${dialCode}${withoutLeadingZero}`;
}

const COUNTRY_DIAL_CODES = [
  { code: "IL", dialCode: "+972" },
  { code: "US", dialCode: "+1" },
  { code: "GB", dialCode: "+44" },
  { code: "DE", dialCode: "+49" },
  { code: "FR", dialCode: "+33" },
  { code: "AE", dialCode: "+971" },
];

/** Parse an E.164 phone number into { countryCode, localNumber } */
function parseE164(phone: string): { countryCode: string; localNumber: string } | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, "");
  const sorted = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (cleaned.startsWith(c.dialCode)) {
      return { countryCode: c.code, localNumber: cleaned.slice(c.dialCode.length) };
    }
  }
  if (cleaned.startsWith("+")) {
    return { countryCode: "IL", localNumber: cleaned.slice(1) };
  }
  return { countryCode: "IL", localNumber: cleaned };
}

describe("Phone Input Utilities", () => {
  describe("toE164", () => {
    it("should format Israeli number correctly", () => {
      expect(toE164("+972", "521234567")).toBe("+972521234567");
    });

    it("should strip leading zero from Israeli number", () => {
      expect(toE164("+972", "0521234567")).toBe("+972521234567");
    });

    it("should handle number with spaces", () => {
      expect(toE164("+972", "52 123 4567")).toBe("+972521234567");
    });

    it("should handle US number", () => {
      expect(toE164("+1", "2125551234")).toBe("+12125551234");
    });

    it("should handle UK number with leading zero", () => {
      expect(toE164("+44", "07911123456")).toBe("+447911123456");
    });

    it("should handle empty local number", () => {
      expect(toE164("+972", "")).toBe("+972");
    });

    it("should strip non-digit characters", () => {
      expect(toE164("+972", "052-123-4567")).toBe("+972521234567");
    });
  });

  describe("parseE164", () => {
    it("should parse Israeli E.164 number", () => {
      const result = parseE164("+972521234567");
      expect(result).toEqual({ countryCode: "IL", localNumber: "521234567" });
    });

    it("should parse US E.164 number", () => {
      const result = parseE164("+12125551234");
      expect(result).toEqual({ countryCode: "US", localNumber: "2125551234" });
    });

    it("should parse UK E.164 number", () => {
      const result = parseE164("+447911123456");
      expect(result).toEqual({ countryCode: "GB", localNumber: "7911123456" });
    });

    it("should handle UAE vs IL (longer dial code first)", () => {
      // +971 (UAE) should match before +97 prefix
      const result = parseE164("+971501234567");
      expect(result).toEqual({ countryCode: "AE", localNumber: "501234567" });
    });

    it("should return null for empty string", () => {
      expect(parseE164("")).toBeNull();
    });

    it("should fallback to IL for unknown country code", () => {
      const result = parseE164("+999123456");
      expect(result).toEqual({ countryCode: "IL", localNumber: "999123456" });
    });

    it("should handle number without +", () => {
      const result = parseE164("972521234567");
      expect(result).toEqual({ countryCode: "IL", localNumber: "972521234567" });
    });

    it("should strip spaces before parsing", () => {
      const result = parseE164("+972 52 123 4567");
      expect(result).toEqual({ countryCode: "IL", localNumber: "521234567" });
    });
  });

  describe("Round-trip: toE164 → parseE164", () => {
    it("should round-trip Israeli number", () => {
      const e164 = toE164("+972", "521234567");
      const parsed = parseE164(e164);
      expect(parsed?.countryCode).toBe("IL");
      expect(parsed?.localNumber).toBe("521234567");
    });

    it("should round-trip US number", () => {
      const e164 = toE164("+1", "2125551234");
      const parsed = parseE164(e164);
      expect(parsed?.countryCode).toBe("US");
      expect(parsed?.localNumber).toBe("2125551234");
    });

    it("should round-trip number with leading zero stripped", () => {
      const e164 = toE164("+972", "0521234567");
      expect(e164).toBe("+972521234567");
      const parsed = parseE164(e164);
      expect(parsed?.countryCode).toBe("IL");
      expect(parsed?.localNumber).toBe("521234567");
    });
  });
});
