/**
 * Unit tests for Brave Image Search module.
 * Tests buildBraveSearchQuery, pickBestBraveImage, and searchBraveImages.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildBraveSearchQuery,
  pickBestBraveImage,
  searchBraveImages,
  resetBraveCircuitBreaker,
  type BraveImageResult,
} from "./braveImageSearch";

/* ------------------------------------------------------------------ */
/*  buildBraveSearchQuery                                              */
/* ------------------------------------------------------------------ */
describe("buildBraveSearchQuery", () => {
  it("strips store name after dash", () => {
    const q = buildBraveSearchQuery("Levi's 501 Original - ASOS", "jeans");
    expect(q).toContain("Levi's 501 Original");
    expect(q).toContain("ASOS"); // Store name kept for visual diversity
    expect(q).toContain("jeans");
    expect(q).toContain("product photo");
  });

  it("strips store name after em-dash", () => {
    const q = buildBraveSearchQuery("Nike Air Max — Foot Locker", "sneakers");
    expect(q).toContain("Nike Air Max");
    expect(q).not.toContain("Foot Locker");
    expect(q).toContain("sneakers");
  });

  it("includes category when not already in label", () => {
    const q = buildBraveSearchQuery("Classic White Shirt", "dress shirt");
    expect(q).toContain("Classic White Shirt");
    expect(q).toContain("dress shirt");
  });

  it("does not duplicate category when already in label", () => {
    const q = buildBraveSearchQuery("Blue Jeans Slim Fit", "jeans");
    // "jeans" should appear only once (from the label)
    const jeanCount = (q.match(/jeans/gi) || []).length;
    expect(jeanCount).toBe(1);
  });

  it("handles label without separator", () => {
    const q = buildBraveSearchQuery("Adidas Ultraboost", "running shoes");
    expect(q).toContain("Adidas Ultraboost");
    expect(q).toContain("running shoes");
    expect(q).toContain("product photo");
  });

  it("handles empty category", () => {
    const q = buildBraveSearchQuery("Red Dress", "");
    expect(q).toContain("Red Dress");
    expect(q).toContain("product photo");
  });

  it("adds gender prefix for male", () => {
    const q = buildBraveSearchQuery("White Shirt", "shirt", "male");
    expect(q).toContain("men's");
  });

  it("adds gender prefix for female", () => {
    const q = buildBraveSearchQuery("White Shirt", "shirt", "female");
    expect(q).toContain("women's");
  });

  it("uses English categoryQuery when label is Hebrew", () => {
    const q = buildBraveSearchQuery("חולצה טי-שירט צווארון וי משי לבן — Farfetch", "men's white luxury silk v-neck t-shirt", "male");
    expect(q).not.toMatch(/[\u0590-\u05FF]/); // No Hebrew characters
    expect(q).toContain("men's white luxury silk v-neck t-shirt");
    expect(q).toContain("product photo");
  });

  it("uses English categoryQuery for pure Hebrew label without store name", () => {
    const q = buildBraveSearchQuery("שעון יוקרתי עם רצועת עור שחורה", "luxury leather watch black strap", "male");
    expect(q).not.toMatch(/[\u0590-\u05FF]/); // No Hebrew characters
    expect(q).toContain("luxury leather watch black strap");
  });

  it("does not replace English label with categoryQuery", () => {
    const q = buildBraveSearchQuery("tailored shirt premium — Farfetch", "tailored shirt premium", "male");
    expect(q).toContain("tailored shirt premium");
    expect(q).toContain("Farfetch"); // Store name kept for visual diversity
  });
});

/* ------------------------------------------------------------------ */
/*  pickBestBraveImage (no HEAD checks — pure scoring)                 */
/* ------------------------------------------------------------------ */
describe("pickBestBraveImage", () => {
  const makeResult = (overrides: Partial<BraveImageResult> = {}): BraveImageResult => ({
    url: "https://example.com/product.jpg",
    thumbnailUrl: "https://example.com/thumb.jpg",
    width: 500,
    height: 600,
    title: "Product",
    sourceUrl: "https://example.com/page",
    confidence: "high",
    ...overrides,
  });

  it("prefers high confidence portrait images", async () => {
    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/wide.jpg", width: 1200, height: 400, confidence: "low" }),
      makeResult({ url: "https://b.com/portrait.jpg", width: 500, height: 700, confidence: "high" }),
      makeResult({ url: "https://c.com/small.jpg", width: 100, height: 100, confidence: "high" }),
    ];
    const best = await pickBestBraveImage(results);
    expect(best).toBe("https://b.com/portrait.jpg");
  });

  it("penalizes very small images", async () => {
    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/tiny.jpg", width: 50, height: 50, confidence: "high" }),
      makeResult({ url: "https://b.com/normal.jpg", width: 400, height: 500, confidence: "medium" }),
    ];
    const best = await pickBestBraveImage(results);
    expect(best).toBe("https://b.com/normal.jpg");
  });

  it("filters out usedUrls", async () => {
    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/used.jpg", width: 500, height: 600, confidence: "high" }),
      makeResult({ url: "https://b.com/new.jpg", width: 400, height: 500, confidence: "high" }),
    ];
    const used = new Set(["https://a.com/used.jpg"]);
    const best = await pickBestBraveImage(results, used);
    expect(best).toBe("https://b.com/new.jpg");
  });

  it("returns empty string for empty results", async () => {
    const best = await pickBestBraveImage([]);
    expect(best).toBe("");
  });

  it("returns best URL directly without HEAD check (no fetch calls)", async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/img.jpg", width: 500, height: 600, confidence: "high" }),
    ];
    const best = await pickBestBraveImage(results);
    expect(best).toBe("https://a.com/img.jpg");
    // No HEAD checks should be made
    expect(mockFetch).not.toHaveBeenCalled();

    globalThis.fetch = originalFetch;
  });

  it("returns empty string when all results are in usedUrls", async () => {
    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/img1.jpg" }),
      makeResult({ url: "https://b.com/img2.jpg" }),
    ];
    const used = new Set(["https://a.com/img1.jpg", "https://b.com/img2.jpg"]);
    const best = await pickBestBraveImage(results, used);
    expect(best).toBe("");
  });

  it("applies cross-category penalty for wrong category images", async () => {
    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/pants.jpg", width: 500, height: 600, confidence: "high", title: "Blue Jeans Slim Fit" }),
      makeResult({ url: "https://b.com/shirt.jpg", width: 400, height: 500, confidence: "medium", title: "White Cotton Shirt" }),
    ];
    // When searching for shirts, pants should be penalized
    const best = await pickBestBraveImage(results, undefined, "shirt");
    expect(best).toBe("https://b.com/shirt.jpg");
  });

  it("hard-rejects pants images when searching for tops/sweatshirts even with high confidence", async () => {
    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/pants1.jpg", width: 600, height: 800, confidence: "high", title: "Men's Black Slim Fit Pants" }),
      makeResult({ url: "https://b.com/pants2.jpg", width: 500, height: 700, confidence: "high", title: "Navy Chino Trousers" }),
      makeResult({ url: "https://c.com/sweatshirt.jpg", width: 300, height: 400, confidence: "low", title: "Grey Crewneck Sweatshirt" }),
    ];
    // Even though pants have higher confidence and better dimensions, sweatshirt should win for top category
    const best = await pickBestBraveImage(results, undefined, "sweatshirt");
    expect(best).toBe("https://c.com/sweatshirt.jpg");
  });

  it("hard-rejects top images when searching for bottoms", async () => {
    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/shirt.jpg", width: 600, height: 800, confidence: "high", title: "Men's White Polo Shirt" }),
      makeResult({ url: "https://b.com/jeans.jpg", width: 300, height: 400, confidence: "low", title: "Slim Fit Denim Jeans" }),
    ];
    const best = await pickBestBraveImage(results, undefined, "jeans");
    expect(best).toBe("https://b.com/jeans.jpg");
  });

  it("gives bonus to images matching expected category", async () => {
    const results: BraveImageResult[] = [
      makeResult({ url: "https://a.com/generic.jpg", width: 500, height: 600, confidence: "high", title: "Fashion Product" }),
      makeResult({ url: "https://b.com/shirt.jpg", width: 500, height: 600, confidence: "high", title: "Cotton T-Shirt" }),
    ];
    // Both have same dimensions and confidence, but the shirt title should get a category bonus
    const best = await pickBestBraveImage(results, undefined, "shirt");
    expect(best).toBe("https://b.com/shirt.jpg");
  });
});

/* ------------------------------------------------------------------ */
/*  searchBraveImages                                                  */
/* ------------------------------------------------------------------ */
describe("searchBraveImages", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.BRAVE_SEARCH_API_KEY = "test-brave-key-123";
    resetBraveCircuitBreaker();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it("returns empty array on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limited"),
    });

    const results = await searchBraveImages("test query");
    expect(results).toEqual([]);
  });

  it("returns empty array when no results in response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ type: "images", results: [] }),
    });

    const results = await searchBraveImages("test query");
    expect(results).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const results = await searchBraveImages("test query");
    expect(results).toEqual([]);
  });

  it("returns empty array on timeout (AbortError)", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const results = await searchBraveImages("test query");
    expect(results).toEqual([]);
  });

  it("parses Brave API response correctly", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "images",
          results: [
            {
              title: "Blue Dress Product",
              url: "https://shop.com/blue-dress",
              properties: {
                url: "https://cdn.shop.com/blue-dress.jpg",
                width: 500,
                height: 700,
              },
              thumbnail: {
                src: "https://imgs.brave.com/thumb.jpg",
                width: 200,
                height: 280,
              },
              confidence: "high",
            },
          ],
        }),
    });

    const results = await searchBraveImages("blue dress");
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://cdn.shop.com/blue-dress.jpg");
    expect(results[0].thumbnailUrl).toBe("https://imgs.brave.com/thumb.jpg");
    expect(results[0].width).toBe(500);
    expect(results[0].height).toBe(700);
    expect(results[0].title).toBe("Blue Dress Product");
    expect(results[0].sourceUrl).toBe("https://shop.com/blue-dress");
    expect(results[0].confidence).toBe("high");
  });

  it("sends correct headers and params", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation((url: any, opts: any) => {
      capturedUrl = typeof url === "string" ? url : url.toString();
      capturedHeaders = Object.fromEntries(
        Object.entries(opts?.headers || {}).map(([k, v]) => [k, String(v)]),
      );
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: "images", results: [] }),
      });
    });

    await searchBraveImages("test query", 3);

    expect(capturedUrl).toContain("api.search.brave.com/res/v1/images/search");
    expect(capturedUrl).toContain("q=test+query");
    expect(capturedUrl).toContain("count=3");
    expect(capturedUrl).toContain("safesearch=strict");
    expect(capturedHeaders["X-Subscription-Token"]).toBeDefined();
    expect(capturedHeaders["Accept"]).toBe("application/json");
  });

  it("clamps count to valid range", async () => {
    let capturedUrl = "";
    globalThis.fetch = vi.fn().mockImplementation((url: any) => {
      capturedUrl = typeof url === "string" ? url : url.toString();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: "images", results: [] }),
      });
    });

    await searchBraveImages("test", 50);
    expect(capturedUrl).toContain("count=20");

    await searchBraveImages("test", 0);
    expect(capturedUrl).toContain("count=1");
  });
});
