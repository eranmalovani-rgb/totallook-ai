/**
 * Tests for fixShoppingLinkUrls — production-style 2-argument contract
 * (gender-based store URL conversion, no preferredStores parameter)
 */
import { describe, it, expect } from "vitest";
import { fixShoppingLinkUrls, type GenderCategory } from "./routers";
import type { FashionAnalysis, ShoppingLink } from "../shared/fashionTypes";

// Helper to create a minimal FashionAnalysis with shopping links
function makeAnalysis(links: ShoppingLink[]): FashionAnalysis {
  return {
    overallScore: 7,
    overallSummary: "Test",
    scores: [],
    improvements: [
      {
        category: "tops",
        currentItem: "T-shirt",
        suggestion: "Try a button-down",
        productSearchQuery: "blue button down shirt",
        shoppingLinks: links,
      },
    ],
    outfitSuggestions: [],
    trendSources: [],
    influencerInsight: "",
  } as any;
}

describe("fixShoppingLinkUrls (production 2-arg)", () => {
  it("should convert direct product URLs to search URLs", () => {
    const analysis = makeAnalysis([
      { label: "Blue Shirt — Zara", url: "https://www.zara.com/il/en/shirt-p12345.html", imageUrl: "" },
    ]);
    const fixed = fixShoppingLinkUrls(analysis, "male");
    const link = fixed.improvements[0].shoppingLinks![0];
    // Should convert product URL to search URL
    expect(link.url).toContain("zara.com");
  });

  it("should preserve valid search URLs", () => {
    const analysis = makeAnalysis([
      { label: "Blue Shirt", url: "https://www.zara.com/il/en/search?searchTerm=blue+shirt", imageUrl: "" },
    ]);
    const fixed = fixShoppingLinkUrls(analysis, "male");
    const link = fixed.improvements[0].shoppingLinks![0];
    expect(link.url).toContain("zara.com");
    expect(link.url).toContain("search");
  });

  it("should handle male gender correctly", () => {
    const analysis = makeAnalysis([
      { label: "Shirt", url: "https://www.asos.com/shirt", imageUrl: "" },
    ]);
    const fixed = fixShoppingLinkUrls(analysis, "male");
    const link = fixed.improvements[0].shoppingLinks![0];
    expect(link.url).toContain("asos.com");
  });

  it("should handle female gender correctly", () => {
    const analysis = makeAnalysis([
      { label: "Dress", url: "https://www.asos.com/dress", imageUrl: "" },
    ]);
    const fixed = fixShoppingLinkUrls(analysis, "female");
    const link = fixed.improvements[0].shoppingLinks![0];
    expect(link.url).toContain("asos.com");
  });

  it("should handle multiple improvements", () => {
    const analysis = {
      ...makeAnalysis([]),
      improvements: [
        {
          category: "tops",
          currentItem: "T-shirt",
          suggestion: "Try a button-down",
          productSearchQuery: "blue button down shirt",
          shoppingLinks: [
            { label: "Blue Shirt", url: "https://www.hm.com/shirt", imageUrl: "" },
          ],
        },
        {
          category: "bottoms",
          currentItem: "Jeans",
          suggestion: "Try chinos",
          productSearchQuery: "khaki chinos",
          shoppingLinks: [
            { label: "Khaki Chinos", url: "https://www.nordstrom.com/chinos", imageUrl: "" },
          ],
        },
      ],
    } as any;
    const fixed = fixShoppingLinkUrls(analysis, "male");
    expect(fixed.improvements.length).toBe(2);
    expect(fixed.improvements[0].shoppingLinks!.length).toBe(1);
    expect(fixed.improvements[1].shoppingLinks!.length).toBe(1);
  });

  it("should handle empty shopping links gracefully", () => {
    const analysis = makeAnalysis([]);
    const fixed = fixShoppingLinkUrls(analysis, "male");
    expect(fixed.improvements[0].shoppingLinks!.length).toBe(0);
  });

  it("should default to male when no gender specified", () => {
    const analysis = makeAnalysis([
      { label: "Shirt", url: "https://www.asos.com/shirt", imageUrl: "" },
    ]);
    const fixed = fixShoppingLinkUrls(analysis);
    const link = fixed.improvements[0].shoppingLinks![0];
    expect(link.url).toContain("asos.com");
  });
});
