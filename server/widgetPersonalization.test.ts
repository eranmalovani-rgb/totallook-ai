import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all database functions
vi.mock("./db", () => ({
  getReviewsByUserId: vi.fn(),
  getWardrobeByUserId: vi.fn(),
  getUserProfile: vi.fn(),
}));

// Mock other dependencies
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./_core/imageGeneration", () => ({ generateImage: vi.fn() }));
vi.mock("./productImages", () => ({
  enrichAnalysisWithProductImages: vi.fn(),
  generateImagesForImprovement: vi.fn(),
}));
vi.mock("probe-image-size", () => ({ default: vi.fn() }));

import { getReviewsByUserId, getWardrobeByUserId, getUserProfile } from "./db";

const mockGetReviews = getReviewsByUserId as ReturnType<typeof vi.fn>;
const mockGetWardrobe = getWardrobeByUserId as ReturnType<typeof vi.fn>;
const mockGetProfile = getUserProfile as ReturnType<typeof vi.fn>;

// Import the router after mocking
const { appRouter } = await import("./routers");
const caller = appRouter.createCaller({
  user: { id: 1, name: "Test User", openId: "test-open-id", role: "user" },
} as any);

describe("tasteProfile.widgetPersonalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns hasData: false when user has no completed reviews", async () => {
    mockGetReviews.mockResolvedValue([]);
    mockGetWardrobe.mockResolvedValue([]);
    mockGetProfile.mockResolvedValue(null);

    const result = await caller.tasteProfile.widgetPersonalization({
      productCategory: "jacket",
      productColors: ["#9b8bb4"],
      productName: "Classic Blazer",
    });

    expect(result.hasData).toBe(false);
    expect(result.matchingWardrobeItems).toEqual([]);
    expect(result.recentLooks).toEqual([]);
  });

  it("returns matching wardrobe items for a jacket product", async () => {
    mockGetReviews.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        status: "completed",
        createdAt: new Date("2026-03-29"),
        overallScore: 7,
        imageUrl: "https://example.com/look1.jpg",
        analysisJson: {
          overallScore: 7,
          summary: "Classic minimalist look",
          items: [
            { name: "White Shirt", color: "white", score: 8, brand: "Zara" },
            { name: "Black Pants", color: "black", score: 7, brand: "H&M" },
          ],
          scores: [{ category: "Color Harmony", score: 8 }],
          improvements: [
            { title: "Add a blazer", description: "A structured jacket would elevate this look" },
          ],
        },
      },
    ]);

    mockGetWardrobe.mockResolvedValue([
      {
        id: 10,
        userId: 1,
        itemType: "shirt",
        name: "White Oxford Shirt",
        color: "white",
        brand: "Zara",
        score: 8,
        itemImageUrl: "https://example.com/shirt.jpg",
        sourceImageUrl: "https://example.com/source.jpg",
        styleNote: "Classic white shirt",
        createdAt: new Date(),
      },
      {
        id: 11,
        userId: 1,
        itemType: "pants",
        name: "Black Chinos",
        color: "black",
        brand: "H&M",
        score: 7,
        itemImageUrl: null,
        sourceImageUrl: "https://example.com/source2.jpg",
        styleNote: "Slim fit chinos",
        createdAt: new Date(),
      },
      {
        id: 12,
        userId: 1,
        itemType: "jacket",
        name: "Navy Blazer",
        color: "navy",
        brand: "Massimo Dutti",
        score: 9,
        itemImageUrl: null,
        sourceImageUrl: null,
        styleNote: "Structured blazer",
        createdAt: new Date(),
      },
    ]);

    mockGetProfile.mockResolvedValue({
      gender: "female",
      stylePreference: "classic,minimalist",
      budgetLevel: "mid-range",
    });

    const result = await caller.tasteProfile.widgetPersonalization({
      productCategory: "jacket",
      productColors: ["#9b8bb4", "#1a1a1a"],
      productName: "Classic Lavender Blazer",
    });

    expect(result.hasData).toBe(true);
    // Jacket pairs with shirt, pants, etc. — should find the shirt and pants
    expect(result.matchingWardrobeItems.length).toBeGreaterThanOrEqual(1);
    // Should NOT include the jacket itself (same category)
    const matchTypes = result.matchingWardrobeItems.map((i: any) => i.itemType);
    expect(matchTypes).toContain("shirt");
    expect(matchTypes).toContain("pants");
    expect(matchTypes).not.toContain("jacket");
  });

  it("returns recent looks with improvement suggestions", async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 2);

    mockGetReviews.mockResolvedValue([
      {
        id: 5,
        userId: 1,
        status: "completed",
        createdAt: recentDate,
        overallScore: 6,
        imageUrl: "https://example.com/recent-look.jpg",
        analysisJson: {
          overallScore: 6,
          summary: "Casual smart look",
          items: [
            { name: "Blue Shirt", color: "blue", score: 7 },
            { name: "Gray Pants", color: "gray", score: 6 },
          ],
          scores: [{ category: "Overall", score: 6 }],
          improvements: [
            { title: "Add a structured jacket", description: "A blazer would complete this look" },
          ],
        },
      },
    ]);

    mockGetWardrobe.mockResolvedValue([]);
    mockGetProfile.mockResolvedValue(null);

    const result = await caller.tasteProfile.widgetPersonalization({
      productCategory: "jacket",
      productColors: ["#9b8bb4"],
      productName: "Classic Blazer",
    });

    expect(result.hasData).toBe(true);
    expect(result.recentLooks.length).toBe(1);
    expect(result.recentLooks[0].overallScore).toBe(6);
    expect(result.recentLooks[0].imageUrl).toBe("https://example.com/recent-look.jpg");
    expect(result.recentLooks[0].dayNameEn).toBeTruthy();
    expect(result.recentLooks[0].dayNameHe).toBeTruthy();
  });

  it("returns personal insights from taste profile data", async () => {
    mockGetReviews.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        status: "completed",
        createdAt: new Date("2026-03-01"),
        overallScore: 6,
        imageUrl: "https://example.com/look1.jpg",
        analysisJson: {
          overallScore: 6,
          summary: "Classic minimalist outfit",
          items: [
            { name: "Shirt", color: "white", score: 7 },
            { name: "Pants", color: "black", score: 8 },
          ],
          scores: [],
          improvements: [],
        },
      },
      {
        id: 2,
        userId: 1,
        status: "completed",
        createdAt: new Date("2026-03-15"),
        overallScore: 8,
        imageUrl: "https://example.com/look2.jpg",
        analysisJson: {
          overallScore: 8,
          summary: "Classic elegant look",
          items: [
            { name: "Blazer", color: "navy", score: 9 },
            { name: "Trousers", color: "gray", score: 8 },
          ],
          scores: [],
          improvements: [],
        },
      },
    ]);

    mockGetWardrobe.mockResolvedValue([]);
    mockGetProfile.mockResolvedValue({ gender: "male", budgetLevel: "mid-range" });

    const result = await caller.tasteProfile.widgetPersonalization({
      productCategory: "dress",
      productColors: ["#2d2d2d"],
      productName: "Elegant Maxi Dress",
    });

    expect(result.hasData).toBe(true);
    expect(result.personalInsights.dominantStyle).toBe("classic");
    expect(result.personalInsights.topColors.length).toBeGreaterThan(0);
    expect(result.personalInsights.avgScore).toBeGreaterThan(0);
    expect(result.personalInsights.totalLooks).toBe(2);
  });

  it("builds complete look suggestion from wardrobe items", async () => {
    mockGetReviews.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        status: "completed",
        createdAt: new Date(),
        overallScore: 7,
        imageUrl: "https://example.com/look.jpg",
        analysisJson: {
          overallScore: 7,
          summary: "Smart casual",
          items: [{ name: "Top", color: "white", score: 7 }],
          scores: [],
          improvements: [],
        },
      },
    ]);

    mockGetWardrobe.mockResolvedValue([
      {
        id: 20,
        userId: 1,
        itemType: "jacket",
        name: "Denim Jacket",
        color: "blue",
        brand: "Levi's",
        score: 7,
        itemImageUrl: "https://example.com/denim.jpg",
        sourceImageUrl: null,
        styleNote: "Classic denim",
        createdAt: new Date(),
      },
      {
        id: 21,
        userId: 1,
        itemType: "shoes",
        name: "White Sneakers",
        color: "white",
        brand: "Nike",
        score: 8,
        itemImageUrl: "https://example.com/sneakers.jpg",
        sourceImageUrl: null,
        styleNote: "Clean sneakers",
        createdAt: new Date(),
      },
      {
        id: 22,
        userId: 1,
        itemType: "bag",
        name: "Leather Bag",
        color: "brown",
        brand: null,
        score: 7,
        itemImageUrl: null,
        sourceImageUrl: null,
        styleNote: "Everyday bag",
        createdAt: new Date(),
      },
    ]);

    mockGetProfile.mockResolvedValue(null);

    const result = await caller.tasteProfile.widgetPersonalization({
      productCategory: "dress",
      productColors: ["#2d2d2d"],
      productName: "Elegant Maxi Dress",
    });

    expect(result.hasData).toBe(true);
    // Dress pairs with jacket, shoes, bag, accessory
    expect(result.matchingWardrobeItems.length).toBeGreaterThanOrEqual(2);
    expect(result.completeLookSuggestion.length).toBeGreaterThanOrEqual(1);
    expect(result.completeLookSuggestion.length).toBeLessThanOrEqual(3);
  });
});
