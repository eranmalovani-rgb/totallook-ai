/**
 * Tests for preferred store fallback behavior (Stage 9)
 * Verifies that:
 * 1. buildFallbackShoppingLinks uses preferred stores when available
 * 2. sanitizeRecommendationsPayload passes preferredStores through
 * 3. Guest profileForPrompt includes preferredStores
 * 4. Anonymous guests (no preferredStores) get generic fallback stores
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routersPath = path.join(__dirname, "routers.ts");
const routersCode = fs.readFileSync(routersPath, "utf-8");

describe("Preferred Stores — buildFallbackShoppingLinks", () => {
  it("accepts preferredStores parameter", () => {
    // The function signature should include preferredStores
    const fnMatch = routersCode.match(/function buildFallbackShoppingLinks\([^)]+\)/);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain("preferredStores");
  });

  it("uses PREFERRED_STORE_SEARCH_PATTERNS when preferredStores is provided", () => {
    // The function should check for preferredStores and use the mapping
    expect(routersCode).toContain("STORE_NAME_TO_URL");
  });

  it("falls back to FALLBACK_STORE_POOLS when no preferredStores", () => {
    // The function should still have the generic fallback
    expect(routersCode).toContain("FALLBACK_STORE_POOLS");
  });

  it("maps store names to search URLs correctly", () => {
    // Check that the mapping includes common stores
    expect(routersCode).toContain("\"Zara\":");
    expect(routersCode).toContain("\"ASOS\":");
    expect(routersCode).toContain("\"H&M\":");
  });
});

describe("Preferred Stores — sanitizeRecommendationsPayload", () => {
  it("accepts preferredStores parameter", () => {
    const fnMatch = routersCode.match(/function sanitizeRecommendationsPayload\([^)]+\)/s);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain("preferredStores");
  });

  it("passes preferredStores to normalizeImprovementShoppingLinks", () => {
    // Find the sanitize function body and check it passes preferredStores
    const sanitizeStart = routersCode.indexOf("function sanitizeRecommendationsPayload(");
    expect(sanitizeStart).toBeGreaterThan(-1);
    const section = routersCode.slice(sanitizeStart, sanitizeStart + 5000);
    expect(section).toContain("normalizeImprovementShoppingLinks(imp, lang, preferredStores)");
  });
});

describe("Preferred Stores — normalizeImprovementShoppingLinks", () => {
  it("accepts preferredStores parameter", () => {
    const fnMatch = routersCode.match(/function normalizeImprovementShoppingLinks\([^)]+\)/);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain("preferredStores");
  });

  it("passes preferredStores to buildFallbackShoppingLinks", () => {
    const fnStart = routersCode.indexOf("function normalizeImprovementShoppingLinks(");
    expect(fnStart).toBeGreaterThan(-1);
    const section = routersCode.slice(fnStart, fnStart + 2000);
    expect(section).toContain("buildFallbackShoppingLinks(");
    expect(section).toContain("preferredStores");
  });
});

describe("Preferred Stores — Authenticated analyze procedure", () => {
  it("passes preferredStores to sanitizeRecommendationsPayload", () => {
    // Find the authenticated analyze procedure's sanitize call
    const analyzeStart = routersCode.indexOf("analyze: protectedProcedure");
    expect(analyzeStart).toBeGreaterThan(-1);
    const section = routersCode.slice(analyzeStart, analyzeStart + 40000);
    const sanitizeCall = section.indexOf("sanitizeRecommendationsPayload(");
    expect(sanitizeCall).toBeGreaterThan(-1);
    const callSection = section.slice(sanitizeCall, sanitizeCall + 500);
    expect(callSection).toContain("profileContext?.preferredStores");
  });
});

describe("Preferred Stores — Guest analyze procedure", () => {
  it("includes preferredStores in profileForPrompt", () => {
    // Find the guest analyze procedure's profileForPrompt
    const guestAnalyzeStart = routersCode.indexOf("analyze: publicProcedure");
    expect(guestAnalyzeStart).toBeGreaterThan(-1);
    const section = routersCode.slice(guestAnalyzeStart, guestAnalyzeStart + 5000);
    expect(section).toContain("preferredStores: guestProfile.preferredStores");
  });

  it("passes preferredStores to sanitizeRecommendationsPayload", () => {
    const guestAnalyzeStart = routersCode.indexOf("analyze: publicProcedure");
    expect(guestAnalyzeStart).toBeGreaterThan(-1);
    const section = routersCode.slice(guestAnalyzeStart, guestAnalyzeStart + 40000);
    const sanitizeCall = section.indexOf("sanitizeRecommendationsPayload(");
    expect(sanitizeCall).toBeGreaterThan(-1);
    const callSection = section.slice(sanitizeCall, sanitizeCall + 500);
    expect(callSection).toContain("guestProfile?.preferredStores");
  });
});

describe("Preferred Stores — Three-case distinction", () => {  it("buildFallbackShoppingLinks handles null preferredStores (anonymous guest)", () => {
    // When preferredStores is null, should use FALLBACK_STORE_POOLS
    const fnStart = routersCode.indexOf("function buildFallbackShoppingLinks(");
    expect(fnStart).toBeGreaterThan(-1);
    const section = routersCode.slice(fnStart, fnStart + 3000);
    // Should have a check for preferredStores existence (if (preferredStores) { ... })
    expect(section).toContain("if (preferredStores)");
  });

  it("buildFallbackShoppingLinks handles provided preferredStores (onboarded user/guest)", () => {
    const fnStart = routersCode.indexOf("function buildFallbackShoppingLinks(");
    expect(fnStart).toBeGreaterThan(-1);
    const section = routersCode.slice(fnStart, fnStart + 3000);
    // Should split comma-separated store names and iterate
    expect(section).toContain('preferredStores.split(",")');
    // Should use STORE_NAME_TO_URL mapping
    expect(section).toContain("STORE_NAME_TO_URL");
  });
});

describe("WhatsApp Review — Parity with GuestReview", () => {
  const waReviewPath = path.join(__dirname, "../client/src/pages/WhatsAppReview.tsx");
  const waReviewCode = fs.readFileSync(waReviewPath, "utf-8");

  it("has full improvements card with Accordion (not limited to 2)", () => {
    expect(waReviewCode).toContain("Accordion");
    expect(waReviewCode).toContain("AccordionItem");
    expect(waReviewCode).toContain("AccordionTrigger");
    expect(waReviewCode).toContain("AccordionContent");
    // Should NOT have the old limited pattern
    expect(waReviewCode).not.toContain("slice(0, 2)");
  });

  it("has outfit suggestions card", () => {
    expect(waReviewCode).toContain("outfitSuggestions");
    expect(waReviewCode).toContain("key=\"outfits\"");
  });

  it("has trends card", () => {
    expect(waReviewCode).toContain("trendSources");
    expect(waReviewCode).toContain("key=\"trends\"");
  });

  it("has progressive analysis support (polling)", () => {
    expect(waReviewCode).toContain("refetchInterval");
    expect(waReviewCode).toContain("hasPartialResults");
  });

  it("has StoreLogo component for shopping links", () => {
    expect(waReviewCode).toContain("StoreLogo");
    expect(waReviewCode).toContain("extractStoreFromUrl");
  });

  it("has shopping links in improvements (not just first link)", () => {
    // Should show all shopping links, not just slice(0,1)
    expect(waReviewCode).not.toMatch(/shoppingLinks\?\.slice\(0,\s*1\)/);
  });
});
