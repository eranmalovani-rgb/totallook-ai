import { describe, it, expect } from "vitest";
import { getCurrencySymbol, getCurrencyLabel, getCountryLocale } from "../shared/currency";

describe("currency helpers", () => {
  describe("getCurrencySymbol", () => {
    it("returns ₪ for Israel", () => {
      expect(getCurrencySymbol("IL")).toBe("₪");
    });

    it("returns € for Germany", () => {
      expect(getCurrencySymbol("DE")).toBe("€");
    });

    it("returns £ for UK", () => {
      expect(getCurrencySymbol("GB")).toBe("£");
    });

    it("returns $ for US", () => {
      expect(getCurrencySymbol("US")).toBe("$");
    });

    it("returns ¥ for Japan", () => {
      expect(getCurrencySymbol("JP")).toBe("¥");
    });

    it("returns ₩ for Korea", () => {
      expect(getCurrencySymbol("KR")).toBe("₩");
    });

    it("returns ₹ for India", () => {
      expect(getCurrencySymbol("IN")).toBe("₹");
    });

    it("returns R$ for Brazil", () => {
      expect(getCurrencySymbol("BR")).toBe("R$");
    });

    it("returns A$ for Australia", () => {
      expect(getCurrencySymbol("AU")).toBe("A$");
    });

    it("returns $ for null country", () => {
      expect(getCurrencySymbol(null)).toBe("$");
    });

    it("returns $ for undefined country", () => {
      expect(getCurrencySymbol(undefined)).toBe("$");
    });

    it("returns $ for unknown country code", () => {
      expect(getCurrencySymbol("ZZ")).toBe("$");
    });
  });

  describe("getCurrencyLabel", () => {
    it("returns ILS (₪) for Israel", () => {
      expect(getCurrencyLabel("IL")).toBe("ILS (₪)");
    });

    it("returns EUR (€) for Germany", () => {
      expect(getCurrencyLabel("DE")).toBe("EUR (€)");
    });

    it("returns EUR (€) for France", () => {
      expect(getCurrencyLabel("FR")).toBe("EUR (€)");
    });

    it("returns GBP (£) for UK", () => {
      expect(getCurrencyLabel("GB")).toBe("GBP (£)");
    });

    it("returns USD ($) for US", () => {
      expect(getCurrencyLabel("US")).toBe("USD ($)");
    });

    it("returns USD ($) for null country", () => {
      expect(getCurrencyLabel(null)).toBe("USD ($)");
    });

    it("returns USD ($) for unknown country", () => {
      expect(getCurrencyLabel("ZZ")).toBe("USD ($)");
    });
  });

  describe("getCountryLocale", () => {
    it("returns Israel for IL", () => {
      expect(getCountryLocale("IL")).toBe("Israel");
    });

    it("returns Germany for DE", () => {
      expect(getCountryLocale("DE")).toBe("Germany");
    });

    it("returns United Kingdom for GB", () => {
      expect(getCountryLocale("GB")).toBe("United Kingdom");
    });

    it("returns empty string for null", () => {
      expect(getCountryLocale(null)).toBe("");
    });

    it("returns empty string for unknown country", () => {
      expect(getCountryLocale("ZZ")).toBe("");
    });
  });
});
