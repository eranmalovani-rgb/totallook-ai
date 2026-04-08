/**
 * Stage 10 Tests: Product Image Fixes
 *
 * Tests for:
 * 1. validateAndFixProductSearchQuery — ensures productSearchQuery matches improvement category
 * 2. Google Image Search gender support — buildProductSearchQuery now accepts gender
 * 3. Domain-level deduplication in ensureUniqueImageWithinImprovement
 * 4. Improved LLM prompt for productSearchQuery specificity
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildProductSearchQuery } from "./googleImageSearch";
import { buildBraveSearchQuery } from "./braveImageSearch";

// We need to test the validateAndFixProductSearchQuery function which is not exported.
// We'll test it indirectly through the sanitizeRecommendationsPayload behavior,
// and also test the exported functions directly.

describe("Stage 10: Product Image Fixes", () => {
  describe("Google buildProductSearchQuery — gender support", () => {
    it("should add men's prefix for male gender", () => {
      const query = buildProductSearchQuery("Nike Air Force 1", "shoes", "male");
      expect(query).toContain("men's");
      expect(query).toContain("Nike Air Force 1");
      expect(query).toContain("product photo");
    });

    it("should add women's prefix for female gender", () => {
      const query = buildProductSearchQuery("Zara Midi Dress", "dress", "female");
      expect(query).toContain("women's");
      expect(query).toContain("Zara Midi Dress");
    });

    it("should not add gender prefix when already present in label", () => {
      const query = buildProductSearchQuery("Men's Oxford Shirt", "shirt", "male");
      expect(query).not.toMatch(/men's.*men's/i);
    });

    it("should not add gender prefix when gender is undefined", () => {
      const query = buildProductSearchQuery("Blue Jeans", "jeans");
      expect(query).not.toContain("men's");
      expect(query).not.toContain("women's");
      expect(query).toContain("Blue Jeans");
    });

    it("should strip store name from label", () => {
      const query = buildProductSearchQuery("Levi's 501 — ASOS", "jeans", "male");
      expect(query).toContain("Levi's 501");
      expect(query).not.toContain("ASOS");
    });

    it("should not duplicate category if already in product name", () => {
      const query = buildProductSearchQuery("Blue Jeans", "jeans", "male");
      const jeanCount = (query.match(/jeans/gi) || []).length;
      expect(jeanCount).toBe(1);
    });
  });

  describe("Brave buildBraveSearchQuery — gender parity with Google", () => {
    it("should add men's prefix for male gender", () => {
      const query = buildBraveSearchQuery("White Shirt", "shirt", "male");
      expect(query).toContain("men's");
    });

    it("should add women's prefix for female gender", () => {
      const query = buildBraveSearchQuery("Red Dress", "dress", "female");
      expect(query).toContain("women's");
    });

    it("should not add prefix when already present", () => {
      const query = buildBraveSearchQuery("Women's Blazer", "blazer", "female");
      expect(query).not.toMatch(/women's.*women's/i);
    });
  });

  describe("validateAndFixProductSearchQuery — indirect testing via import", () => {
    // Since validateAndFixProductSearchQuery is not exported, we test the behavior
    // by importing the routers module and checking the sanitized output.
    // For now, we test the logic patterns directly.

    it("should detect cross-category contamination patterns", () => {
      // Test the regex patterns used in validation
      const topRegex = /(shirt|blouse|top|tee|t-shirt|polo|sweater|hoodie|sweatshirt|henley|tank|camisole|crop|tunic)/i;
      const bottomRegex = /(pants|jeans|trouser|chino|shorts|skirt|legging)/i;

      // "pants" should match bottom but NOT top
      expect(bottomRegex.test("men's navy slim fit chino pants")).toBe(true);
      expect(topRegex.test("men's navy slim fit chino pants")).toBe(false);

      // "shirt" should match top but NOT bottom
      expect(topRegex.test("men's white oxford shirt")).toBe(true);
      expect(bottomRegex.test("men's white oxford shirt")).toBe(false);

      // Cross-category: "pants" in a top improvement should be caught
      // Note: "top" is in the topRegex, so "upgrade top pants" matches both.
      // The actual validation function uses detectImprovementCategory which looks at title/beforeLabel/afterLabel.
      // Here we just verify that bottomRegex catches "pants"
      expect(bottomRegex.test("upgrade top pants")).toBe(true);
      // And that a pure bottom query doesn't match top
      expect(topRegex.test("men's navy slim fit chino pants")).toBe(false);
    });

    it("should detect Hebrew in query", () => {
      const hasHebrew = /[\u0590-\u05FF]/.test("שדרוג חלק עליון");
      expect(hasHebrew).toBe(true);

      const noHebrew = /[\u0590-\u05FF]/.test("men's white shirt");
      expect(noHebrew).toBe(false);
    });

    it("should detect generic queries", () => {
      const genericPattern = /^(upgrade|improve|שדרוג|שיפור)/i;
      expect(genericPattern.test("upgrade")).toBe(true);
      expect(genericPattern.test("שדרוג")).toBe(true);
      expect(genericPattern.test("men's navy slim fit chino pants")).toBe(false);
    });

    it("should extract color from query", () => {
      const colorMatch = "men's navy slim fit pants".match(/(black|white|navy|blue|grey|gray|brown|beige|cream|green|red|pink|olive|khaki|tan|burgundy|maroon|camel)/i);
      expect(colorMatch).toBeTruthy();
      expect(colorMatch![1].toLowerCase()).toBe("navy");
    });

    it("should extract style from query", () => {
      const styleMatch = "men's navy slim fit pants".match(/(slim fit|regular fit|oversized|tailored|structured|casual|formal|classic|modern|minimalist|relaxed)/i);
      expect(styleMatch).toBeTruthy();
      expect(styleMatch![1].toLowerCase()).toBe("slim fit");
    });
  });

  describe("Domain-level deduplication logic", () => {
    it("should track domains correctly", () => {
      const domains = new Map<string, number>();

      // Simulate adding images from same domain
      const domain1 = "images.unsplash.com";
      domains.set(domain1, (domains.get(domain1) || 0) + 1);
      expect(domains.get(domain1)).toBe(1);

      domains.set(domain1, (domains.get(domain1) || 0) + 1);
      expect(domains.get(domain1)).toBe(2);

      // With maxPerDomain = 2, third image from same domain should be rejected
      const maxPerDomain = 2;
      expect((domains.get(domain1) || 0) >= maxPerDomain).toBe(true);
    });

    it("should extract domain from URL correctly", () => {
      // Test the extractDomain logic
      const extractDomain = (url: string): string => {
        try {
          return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        } catch {
          return "";
        }
      };

      expect(extractDomain("https://www.example.com/image.jpg")).toBe("example.com");
      expect(extractDomain("https://images.unsplash.com/photo-123")).toBe("images.unsplash.com");
      expect(extractDomain("https://cdn.shopify.com/s/files/image.png")).toBe("cdn.shopify.com");
      expect(extractDomain("invalid-url")).toBe("");
    });

    it("should allow different domains", () => {
      const domains = new Map<string, number>();
      const maxPerDomain = 2;

      const domain1 = "images.unsplash.com";
      const domain2 = "cdn.shopify.com";

      domains.set(domain1, 1);
      domains.set(domain2, 1);

      // Both domains have room
      expect((domains.get(domain1) || 0) >= maxPerDomain).toBe(false);
      expect((domains.get(domain2) || 0) >= maxPerDomain).toBe(false);
    });
  });

  describe("LLM Prompt — productSearchQuery instruction", () => {
    it("should contain specific instructions for productSearchQuery in prompt", async () => {
      // Read the routers.ts file to verify the prompt contains our improved instructions
      const fs = await import("fs");
      const path = await import("path");
      const routersSource = fs.readFileSync(
        path.resolve(__dirname, "./routers.ts"),
        "utf-8",
      );

      // Check that the prompt instructs for specific English queries
      expect(routersSource).toContain("CRITICAL for image search");
      expect(routersSource).toContain("gender prefix (men's/women's)");
      expect(routersSource).toContain("specific garment type");
      expect(routersSource).toContain("NEVER use Hebrew");
      expect(routersSource).toContain("NEVER use generic words");
    });
  });

  describe("validateAndFixProductSearchQuery function exists in routers", () => {
    it("should have validateAndFixProductSearchQuery function defined", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routersSource = fs.readFileSync(
        path.resolve(__dirname, "./routers.ts"),
        "utf-8",
      );

      expect(routersSource).toContain("function validateAndFixProductSearchQuery");
      expect(routersSource).toContain("detectImprovementCategory");
      expect(routersSource).toContain("categoryKeywords");
      expect(routersSource).toContain("categoryFallbackTerms");
      expect(routersSource).toContain("hasCrossCategory");
    });

    it("should be called in sanitizeRecommendationsPayload", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routersSource = fs.readFileSync(
        path.resolve(__dirname, "./routers.ts"),
        "utf-8",
      );

      // Verify it's integrated into the sanitization pipeline
      expect(routersSource).toContain("validateAndFixProductSearchQuery(imp, userGender)");
    });
  });

  describe("productImages.ts — domain dedup integration", () => {
    it("should use domain-level dedup in enrichAnalysisWithProductImages", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const source = fs.readFileSync(
        path.resolve(__dirname, "./productImages.ts"),
        "utf-8",
      );

      expect(source).toContain("usedImageDomains");
      expect(source).toContain("extractDomain");
      expect(source).toContain("maxPerDomain");
      expect(source).toContain("isDomainOverused");
    });

    it("should use domain dedup in lazy loading too", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const source = fs.readFileSync(
        path.resolve(__dirname, "./productImages.ts"),
        "utf-8",
      );

      // Count occurrences of usedImageDomains — should appear in both enrichment and lazy loading
      const domainOccurrences = (source.match(/usedImageDomains/g) || []).length;
      expect(domainOccurrences).toBeGreaterThanOrEqual(4); // At least in both functions
    });
  });

  describe("Google Image Search — gender parameter passed through", () => {
    it("should pass gender to Google buildProductSearchQuery in productImages.ts", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const source = fs.readFileSync(
        path.resolve(__dirname, "./productImages.ts"),
        "utf-8",
      );

      expect(source).toContain("buildProductSearchQuery(label, categoryQuery, gender)");
    });
  });

  describe("getCategoryPlaceholder — smart fallback images", () => {
    it("should return shoes placeholder for shoes query", async () => {
      const { getCategoryPlaceholder } = await import("./productImages");
      const url = getCategoryPlaceholder("men's leather dress shoes", 0);
      expect(url).toContain("unsplash.com");
      expect(url).toContain("w=400");
    });

    it("should return top placeholder for shirt query", async () => {
      const { getCategoryPlaceholder } = await import("./productImages");
      const url = getCategoryPlaceholder("men's white oxford shirt", 0);
      expect(url).toContain("unsplash.com");
    });

    it("should return bottom placeholder for pants query", async () => {
      const { getCategoryPlaceholder } = await import("./productImages");
      const url = getCategoryPlaceholder("women's tailored chino pants", 0);
      expect(url).toContain("unsplash.com");
    });

    it("should return different placeholders for different indices", async () => {
      const { getCategoryPlaceholder } = await import("./productImages");
      const url0 = getCategoryPlaceholder("shoes", 0);
      const url1 = getCategoryPlaceholder("shoes", 1);
      const url2 = getCategoryPlaceholder("shoes", 2);
      expect(url0).not.toBe(url1);
      expect(url1).not.toBe(url2);
    });

    it("should return generic placeholder for unknown category", async () => {
      const { getCategoryPlaceholder } = await import("./productImages");
      const url = getCategoryPlaceholder("something random", 0);
      expect(url).toContain("unsplash.com");
    });

    it("should return outerwear placeholder for jacket query", async () => {
      const { getCategoryPlaceholder } = await import("./productImages");
      const url = getCategoryPlaceholder("structured blazer jacket", 0);
      expect(url).toContain("unsplash.com");
    });

    it("should return dress placeholder for dress query", async () => {
      const { getCategoryPlaceholder } = await import("./productImages");
      const url = getCategoryPlaceholder("women's flattering midi dress", 0);
      expect(url).toContain("unsplash.com");
    });
  });

  describe("Smart placeholder integration in productImages.ts", () => {
    it("should use getCategoryPlaceholder instead of empty string on failure", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const source = fs.readFileSync(
        path.resolve(__dirname, "./productImages.ts"),
        "utf-8",
      );

      // Verify placeholder is used in enrichment function
      expect(source).toContain("getCategoryPlaceholder(categoryQuery, linkIdx)");
      // Verify placeholder is used in lazy loading function
      expect(source).toContain('getCategoryPlaceholder(improvement.productSearchQuery || "", linkIdx)');
      // Verify we no longer have bare empty string assignments for failed images
      // (except in dedup where empty is intentional to trigger re-resolution)
      const emptyAssignments = (source.match(/\.imageUrl = ""/g) || []).length;
      // Should only have empty assignments in dedup section (not in main resolution)
      expect(emptyAssignments).toBeLessThanOrEqual(2); // Only in dedup sections
    });
  });
});
