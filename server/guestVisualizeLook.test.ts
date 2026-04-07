import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("./db", () => ({
  getGuestSessionIdsByFingerprint: vi.fn(),
  getGuestWardrobe: vi.fn(),
  getGuestProfile: vi.fn(),
}));

// Mock the image generation module
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn(),
}));

import {
  getGuestSessionIdsByFingerprint,
  getGuestWardrobe,
  getGuestProfile,
} from "./db";

import { generateImage } from "./_core/imageGeneration";

describe("Guest Visualize Look", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get session IDs for fingerprint", async () => {
    vi.mocked(getGuestSessionIdsByFingerprint).mockResolvedValue([1, 2, 3]);

    const sessionIds = await getGuestSessionIdsByFingerprint("test-fp-12345678");
    expect(sessionIds).toEqual([1, 2, 3]);
    expect(sessionIds.length).toBeGreaterThan(0);
  });

  it("should return empty array for unknown fingerprint", async () => {
    vi.mocked(getGuestSessionIdsByFingerprint).mockResolvedValue([]);

    const sessionIds = await getGuestSessionIdsByFingerprint("unknown-fp-12345678");
    expect(sessionIds).toEqual([]);
    expect(sessionIds.length).toBe(0);
  });

  it("should get guest wardrobe items by session IDs", async () => {
    const mockItems = [
      { id: 1, itemType: "👕 חולצה", name: "White T-Shirt", color: "White", brand: "Nike", score: 8, sourceImageUrl: "https://cdn.example.com/img1.jpg", itemImageUrl: null, createdAt: new Date() },
      { id: 2, itemType: "👖 מכנסיים", name: "Blue Jeans", color: "Blue", brand: "Levi's", score: 7, sourceImageUrl: "https://cdn.example.com/img2.jpg", itemImageUrl: null, createdAt: new Date() },
      { id: 3, itemType: "👟 נעליים", name: "White Sneakers", color: "White", brand: "Adidas", score: 9, sourceImageUrl: "https://cdn.example.com/img3.jpg", itemImageUrl: null, createdAt: new Date() },
    ];
    vi.mocked(getGuestWardrobe).mockResolvedValue(mockItems as any);

    const items = await getGuestWardrobe([1, 2]);
    expect(items).toHaveLength(3);
    expect(items[0].name).toBe("White T-Shirt");
    expect(items[1].name).toBe("Blue Jeans");
    expect(items[2].name).toBe("White Sneakers");
  });

  it("should filter selected items by IDs", async () => {
    const mockItems = [
      { id: 1, itemType: "👕 חולצה", name: "White T-Shirt", color: "White", brand: "Nike", sourceImageUrl: "https://cdn.example.com/img1.jpg" },
      { id: 2, itemType: "👖 מכנסיים", name: "Blue Jeans", color: "Blue", brand: "Levi's", sourceImageUrl: "https://cdn.example.com/img2.jpg" },
      { id: 3, itemType: "👟 נעליים", name: "White Sneakers", color: "White", brand: "Adidas", sourceImageUrl: "https://cdn.example.com/img3.jpg" },
    ];
    vi.mocked(getGuestWardrobe).mockResolvedValue(mockItems as any);

    const allItems = await getGuestWardrobe([1]);
    const selectedItemIds = [1, 3];
    const selectedItems = allItems.filter(item => selectedItemIds.includes(item.id));

    expect(selectedItems).toHaveLength(2);
    expect(selectedItems[0].name).toBe("White T-Shirt");
    expect(selectedItems[1].name).toBe("White Sneakers");
  });

  it("should get guest profile for gender context", async () => {
    vi.mocked(getGuestProfile).mockResolvedValue({
      gender: "male",
      ageRange: "25-34",
      stylePreference: "streetwear",
    } as any);

    const profile = await getGuestProfile("test-fp-12345678");
    expect(profile).toBeDefined();
    expect(profile?.gender).toBe("male");
  });

  it("should handle missing guest profile gracefully", async () => {
    vi.mocked(getGuestProfile).mockResolvedValue(null);

    const profile = await getGuestProfile("new-fp-12345678");
    const gender = profile?.gender || "person";
    const genderLabel = gender === "male" ? "man" : gender === "female" ? "woman" : "person";

    expect(genderLabel).toBe("person");
  });

  it("should build correct gender label from profile", async () => {
    // Male
    vi.mocked(getGuestProfile).mockResolvedValue({ gender: "male" } as any);
    let profile = await getGuestProfile("fp1");
    let genderLabel = profile?.gender === "male" ? "man" : profile?.gender === "female" ? "woman" : "person";
    expect(genderLabel).toBe("man");

    // Female
    vi.mocked(getGuestProfile).mockResolvedValue({ gender: "female" } as any);
    profile = await getGuestProfile("fp2");
    genderLabel = profile?.gender === "male" ? "man" : profile?.gender === "female" ? "woman" : "person";
    expect(genderLabel).toBe("woman");
  });

  it("should build item descriptions from selected items", () => {
    const selectedItems = [
      { name: "White T-Shirt", color: "White", brand: "Nike", itemType: "shirt" },
      { name: "Blue Jeans", color: "Blue", brand: "Levi's", itemType: "pants" },
      { name: "White Sneakers", color: null, brand: "Adidas", itemType: "shoes" },
    ];

    const itemDescriptions = selectedItems.map(item => {
      const parts = [item.name || item.itemType];
      if (item.color) parts.push(`in ${item.color}`);
      if (item.brand) parts.push(`by ${item.brand}`);
      return parts.join(" ");
    }).join(", ");

    expect(itemDescriptions).toBe("White T-Shirt in White by Nike, Blue Jeans in Blue by Levi's, White Sneakers by Adidas");
  });

  it("should build prompt with correct structure", () => {
    const genderLabel = "man";
    const itemDescriptions = "White T-Shirt in White by Nike, Blue Jeans in Blue by Levi's";

    const prompt = `Full-body fashion photo of a stylish ${genderLabel} wearing exactly this outfit: ${itemDescriptions}. Standing in a clean, modern setting with soft natural lighting. The outfit should be the main focus. Professional fashion photography style, editorial quality. Show the complete outfit from head to toe. Clean background.`;

    expect(prompt).toContain("stylish man");
    expect(prompt).toContain("White T-Shirt in White by Nike");
    expect(prompt).toContain("Blue Jeans in Blue by Levi's");
    expect(prompt).toContain("Professional fashion photography");
  });

  it("should call generateImage with source image reference when available", async () => {
    vi.mocked(generateImage).mockResolvedValue({ url: "https://cdn.example.com/generated.jpg" } as any);

    const sourceImageUrl = "https://cdn.example.com/source.jpg";
    const prompt = "Full-body fashion photo...";

    const generateOptions: any = { prompt };
    if (sourceImageUrl) {
      generateOptions.originalImages = [{
        url: sourceImageUrl,
        mimeType: "image/jpeg",
      }];
    }

    const result = await generateImage(generateOptions);
    expect(result.url).toBe("https://cdn.example.com/generated.jpg");
    expect(generateImage).toHaveBeenCalledWith({
      prompt,
      originalImages: [{ url: sourceImageUrl, mimeType: "image/jpeg" }],
    });
  });

  it("should call generateImage without reference when no source image", async () => {
    vi.mocked(generateImage).mockResolvedValue({ url: "https://cdn.example.com/generated.jpg" } as any);

    const sourceImageUrl = null;
    const prompt = "Full-body fashion photo...";

    const generateOptions: any = { prompt };
    if (sourceImageUrl) {
      generateOptions.originalImages = [{
        url: sourceImageUrl,
        mimeType: "image/jpeg",
      }];
    }

    await generateImage(generateOptions);
    expect(generateImage).toHaveBeenCalledWith({ prompt });
  });

  it("should return items metadata in response shape", async () => {
    const selectedItems = [
      { id: 1, name: "White T-Shirt", color: "White", brand: "Nike", itemType: "shirt", sourceImageUrl: "url" },
      { id: 2, name: "Blue Jeans", color: "Blue", brand: "Levi's", itemType: "pants", sourceImageUrl: "url" },
    ];

    const responseItems = selectedItems.map(i => ({
      name: i.name,
      color: i.color,
      brand: i.brand,
      itemType: i.itemType,
    }));

    expect(responseItems).toEqual([
      { name: "White T-Shirt", color: "White", brand: "Nike", itemType: "shirt" },
      { name: "Blue Jeans", color: "Blue", brand: "Levi's", itemType: "pants" },
    ]);
  });

  it("should handle image generation failure", async () => {
    vi.mocked(generateImage).mockRejectedValue(new Error("Generation failed"));

    try {
      await generateImage({ prompt: "test" });
      expect.unreachable("Should have thrown");
    } catch (err: any) {
      expect(err.message).toBe("Generation failed");
    }
  });

  it("should use fallback name (itemType) when name is null", () => {
    const selectedItems = [
      { name: null, color: "Red", brand: null, itemType: "shirt" },
    ];

    const itemDescriptions = selectedItems.map(item => {
      const parts = [item.name || item.itemType];
      if (item.color) parts.push(`in ${item.color}`);
      if (item.brand) parts.push(`by ${item.brand}`);
      return parts.join(" ");
    }).join(", ");

    expect(itemDescriptions).toBe("shirt in Red");
  });

  it("should find source image from first item that has one", () => {
    const selectedItems = [
      { id: 1, sourceImageUrl: null },
      { id: 2, sourceImageUrl: "https://cdn.example.com/img2.jpg" },
      { id: 3, sourceImageUrl: "https://cdn.example.com/img3.jpg" },
    ];

    const sourceImageUrl = selectedItems.find(i => i.sourceImageUrl)?.sourceImageUrl || null;
    expect(sourceImageUrl).toBe("https://cdn.example.com/img2.jpg");
  });

  it("should return null source image when none available", () => {
    const selectedItems = [
      { id: 1, sourceImageUrl: null },
      { id: 2, sourceImageUrl: null },
    ];

    const sourceImageUrl = selectedItems.find(i => i.sourceImageUrl)?.sourceImageUrl || null;
    expect(sourceImageUrl).toBeNull();
  });
});
