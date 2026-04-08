import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock generateImage
const mockGenerateImage = vi.fn();
vi.mock("./_core/imageGeneration", () => ({
  generateImage: (...args: any[]) => mockGenerateImage(...args),
}));

// Mock DB cache functions
const mockGetCachedProductImage = vi.fn();
const mockSaveProductImageToCache = vi.fn();
const mockNormalizeProductKey = vi.fn((label: string, category: string) => `${label}::${category}`);
vi.mock("./db", () => ({
  getCachedProductImage: (...args: any[]) => mockGetCachedProductImage(...args),
  saveProductImageToCache: (...args: any[]) => mockSaveProductImageToCache(...args),
  normalizeProductKey: (...args: any[]) => mockNormalizeProductKey(...args),
}));

// Mock fetch for testImageUrl
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { enrichAnalysisWithProductImages, generateImagesForImprovement } from "./productImages";
import type { FashionAnalysis } from "../shared/fashionTypes";

function makeAnalysis(improvements: any[]): FashionAnalysis {
  return {
    overallScore: 7.5,
    summary: "Test analysis",
    items: [],
    scores: { fit: 7, color: 8, style: 7.5, occasion: 7, trend: 7.5 },
    improvements,
    outfitSuggestions: [],
    trendSources: [],
    linkedMentions: [],
  } as FashionAnalysis;
}

describe("enrichAnalysisWithProductImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockRejectedValue(new Error("not found")); // default: existing URLs don't work
    mockGetCachedProductImage.mockResolvedValue(null); // default: no cache
    mockSaveProductImageToCache.mockResolvedValue(undefined); // default: cache save succeeds
  });

  it("returns analysis unchanged when no improvements", async () => {
    const analysis = makeAnalysis([]);
    const result = await enrichAnalysisWithProductImages(analysis);
    expect(result.improvements).toEqual([]);
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  it("generates unique image for EACH shopping link", async () => {
    let callCount = 0;
    mockGenerateImage.mockImplementation(async () => {
      callCount++;
      return { url: `https://cdn.example.com/image-${callCount}.png` };
    });

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Get better shoes",
        productSearchQuery: "men shoes",
        shoppingLinks: [
          { label: "Nike Air Force 1 — SSENSE", url: "https://ssense.com/search?q=nike", imageUrl: "" },
          { label: "Adidas Stan Smith — ASOS", url: "https://asos.com/search?q=adidas", imageUrl: "" },
          { label: "New Balance 550 — END.", url: "https://endclothing.com/search?q=nb", imageUrl: "" },
        ],
      },
    ]);

    const result = await enrichAnalysisWithProductImages(analysis);

    // Each link should get its own unique image (domain dedup may trigger extra calls)
    expect(mockGenerateImage).toHaveBeenCalledTimes(callCount);
    expect(result.improvements[0].shoppingLinks[0].imageUrl).toBeTruthy();
    expect(result.improvements[0].shoppingLinks[1].imageUrl).toBeTruthy();
    expect(result.improvements[0].shoppingLinks[2].imageUrl).toBeTruthy();

    // All images should be different
    const urls = result.improvements[0].shoppingLinks.map(l => l.imageUrl);
    expect(new Set(urls).size).toBe(3);
  });

  it("generates images across multiple improvements", async () => {
    let callCount = 0;
    mockGenerateImage.mockImplementation(async () => {
      callCount++;
      return { url: `https://cdn.totallook.ai/img-${callCount}.png` };
    });

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
          { label: "Adidas — ASOS", url: "https://asos.com/search", imageUrl: "" },
        ],
      },
      {
        title: "Jacket",
        description: "Better jacket",
        productSearchQuery: "jacket",
        shoppingLinks: [
          { label: "Zara Blazer — Zara", url: "https://zara.com/search", imageUrl: "" },
        ],
      },
    ]);

    const result = await enrichAnalysisWithProductImages(analysis);

    expect(mockGenerateImage).toHaveBeenCalledTimes(3);
    expect(result.improvements[0].shoppingLinks[0].imageUrl).toBeTruthy();
    expect(result.improvements[0].shoppingLinks[1].imageUrl).toBeTruthy();
    expect(result.improvements[1].shoppingLinks[0].imageUrl).toBeTruthy();

    // All 3 images should be different
    const allUrls = [
      result.improvements[0].shoppingLinks[0].imageUrl,
      result.improvements[0].shoppingLinks[1].imageUrl,
      result.improvements[1].shoppingLinks[0].imageUrl,
    ];
    expect(new Set(allUrls).size).toBe(3);
  });

  it("calls onImageReady callback for each generated image", async () => {
    let callCount = 0;
    mockGenerateImage.mockImplementation(async () => {
      callCount++;
      return { url: `https://cdn.totallook.ai/img-${callCount}.png` };
    });

    const onImageReady = vi.fn().mockResolvedValue(undefined);

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
          { label: "Adidas — ASOS", url: "https://asos.com/search", imageUrl: "" },
        ],
      },
    ]);

    await enrichAnalysisWithProductImages(analysis, onImageReady);

    expect(onImageReady).toHaveBeenCalledTimes(2);
    // First call: impIdx=0, linkIdx=0
    expect(onImageReady.mock.calls[0][0]).toBe(0);
    expect(onImageReady.mock.calls[0][1]).toBe(0);
    expect(onImageReady.mock.calls[0][2]).toContain("https://cdn.totallook.ai/img-");
    // Second call: impIdx=0, linkIdx=1
    expect(onImageReady.mock.calls[1][0]).toBe(0);
    expect(onImageReady.mock.calls[1][1]).toBe(1);
    expect(onImageReady.mock.calls[1][2]).toContain("https://cdn.totallook.ai/img-");
  });

  it("handles individual image generation failures gracefully", async () => {
    let callCount = 0;
    mockGenerateImage.mockImplementation(async () => {
      callCount++;
      if (callCount === 2) throw new Error("API rate limit");
      return { url: `https://cdn.totallook.ai/img-${callCount}.png` };
    });

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
          { label: "Adidas — ASOS", url: "https://asos.com/search", imageUrl: "" },
          { label: "NB — END.", url: "https://endclothing.com/search", imageUrl: "" },
        ],
      },
    ]);

    const result = await enrichAnalysisWithProductImages(analysis);

    // Link 0 and 2 should have AI-generated images, link 1 gets a category placeholder (not empty)
    expect(result.improvements[0].shoppingLinks[0].imageUrl).toBeTruthy();
    // Failed images now get a category-aware placeholder from Unsplash instead of empty string
    expect(result.improvements[0].shoppingLinks[1].imageUrl).toContain("unsplash.com");
    expect(result.improvements[0].shoppingLinks[2].imageUrl).toBeTruthy();
  });

  it("skips generation when existing image URL is valid and accessible", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (h: string) => h === "content-type" ? "image/jpeg" : "" },
    });

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "https://cdn.totallook.ai/existing.jpg" },
        ],
      },
    ]);

    const result = await enrichAnalysisWithProductImages(analysis);

    // Should not generate a new image since existing one works
    expect(mockGenerateImage).not.toHaveBeenCalled();
    expect(result.improvements[0].shoppingLinks[0].imageUrl).toBe("https://cdn.totallook.ai/existing.jpg");
  });

  it("generates new image when existing URL returns 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      headers: { get: () => "" },
    });
    mockGenerateImage.mockResolvedValueOnce({ url: "https://cdn.totallook.ai/new.png" });

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "https://cdn.totallook.ai/broken.jpg" },
        ],
      },
    ]);

    const result = await enrichAnalysisWithProductImages(analysis);

    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    expect(result.improvements[0].shoppingLinks[0].imageUrl).toBe("https://cdn.totallook.ai/new.png");
  });

  it("does not mutate the original analysis object", async () => {
    mockGenerateImage.mockResolvedValue({ url: "https://cdn.totallook.ai/new.png" });

    const original = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
        ],
      },
    ]);

    const originalImageUrl = original.improvements[0].shoppingLinks[0].imageUrl;
    await enrichAnalysisWithProductImages(original);

    // Original should not be mutated
    expect(original.improvements[0].shoppingLinks[0].imageUrl).toBe(originalImageUrl);
  });

  it("handles onImageReady callback errors without stopping generation", async () => {
    let callCount = 0;
    mockGenerateImage.mockImplementation(async () => {
      callCount++;
      return { url: `https://cdn.totallook.ai/img-${callCount}.png` };
    });

    const onImageReady = vi.fn()
      .mockRejectedValueOnce(new Error("DB connection failed"))
      .mockResolvedValue(undefined);

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
          { label: "Adidas — ASOS", url: "https://asos.com/search", imageUrl: "" },
        ],
      },
    ]);

    const result = await enrichAnalysisWithProductImages(analysis, onImageReady);

    // Both images should still be generated even though first callback failed
    expect(mockGenerateImage).toHaveBeenCalledTimes(2);
    expect(result.improvements[0].shoppingLinks[0].imageUrl).toBeTruthy();
    expect(result.improvements[0].shoppingLinks[1].imageUrl).toBeTruthy();
  });

  it("uses product-specific prompts with link label", async () => {
    mockGenerateImage.mockResolvedValue({ url: "https://cdn.totallook.ai/img.png" });

    const analysis = makeAnalysis([
      {
        title: "Watch",
        description: "Better watch",
        productSearchQuery: "men luxury watch",
        shoppingLinks: [
          { label: "Tissot PRX Powermatic 80 — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
        ],
      },
    ]);

    await enrichAnalysisWithProductImages(analysis);

    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    const prompt = mockGenerateImage.mock.calls[0][0].prompt;
    expect(prompt).toContain("Tissot PRX Powermatic 80");
    expect(prompt).toContain("men luxury watch");
  });

  it("uses cached image when available instead of generating new one", async () => {
    mockGetCachedProductImage.mockResolvedValueOnce("https://cdn.totallook.ai/cached.png");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (h: string) => h === "content-type" ? "image/png" : "" },
    });

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
        ],
      },
    ]);

    const result = await enrichAnalysisWithProductImages(analysis);

    // Should use cached image, not generate new one
    expect(mockGenerateImage).not.toHaveBeenCalled();
    expect(result.improvements[0].shoppingLinks[0].imageUrl).toBe("https://cdn.totallook.ai/cached.png");
  });

  it("saves generated images to cache", async () => {
    mockGenerateImage.mockResolvedValueOnce({ url: "https://cdn.totallook.ai/new.png" });

    const analysis = makeAnalysis([
      {
        title: "Shoes",
        description: "Better shoes",
        productSearchQuery: "shoes",
        shoppingLinks: [
          { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
        ],
      },
    ]);

    await enrichAnalysisWithProductImages(analysis);

    // Should save to cache after generating
    expect(mockSaveProductImageToCache).toHaveBeenCalledTimes(1);
    expect(mockSaveProductImageToCache.mock.calls[0][0]).toMatchObject({
      imageUrl: "https://cdn.totallook.ai/new.png",
      originalLabel: "Nike — SSENSE",
      categoryQuery: "shoes",
    });
  });
});

describe("generateImagesForImprovement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockRejectedValue(new Error("not found"));
    mockGetCachedProductImage.mockResolvedValue(null);
    mockSaveProductImageToCache.mockResolvedValue(undefined);
  });

  it("generates images for all links in a single improvement", async () => {
    let callCount = 0;
    mockGenerateImage.mockImplementation(async () => {
      callCount++;
      return { url: `https://cdn.totallook.ai/lazy-${callCount}.png` };
    });

    const improvement = {
      shoppingLinks: [
        { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
        { label: "Adidas — ASOS", url: "https://asos.com/search", imageUrl: "" },
      ],
      productSearchQuery: "shoes",
    };

    const result = await generateImagesForImprovement(improvement);

    expect(mockGenerateImage).toHaveBeenCalledTimes(2);
    expect(result[0].imageUrl).toBe("https://cdn.totallook.ai/lazy-1.png");
    expect(result[1].imageUrl).toBe("https://cdn.totallook.ai/lazy-2.png");
  });

  it("calls onImageReady callback for each generated image", async () => {
    let callCount = 0;
    mockGenerateImage.mockImplementation(async () => {
      callCount++;
      return { url: `https://cdn.totallook.ai/lazy-${callCount}.png` };
    });

    const onImageReady = vi.fn().mockResolvedValue(undefined);

    const improvement = {
      shoppingLinks: [
        { label: "Nike — SSENSE", url: "https://ssense.com/search", imageUrl: "" },
      ],
      productSearchQuery: "shoes",
    };

    await generateImagesForImprovement(improvement, onImageReady);

    expect(onImageReady).toHaveBeenCalledTimes(1);
    expect(onImageReady.mock.calls[0][0]).toBe(0); // linkIdx
    expect(onImageReady.mock.calls[0][1]).toContain("https://cdn.totallook.ai/lazy-");
  });
});
