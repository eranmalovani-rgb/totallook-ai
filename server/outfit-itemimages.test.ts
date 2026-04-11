import { describe, it, expect } from "vitest";
import type { OutfitSuggestion } from "../shared/fashionTypes";

describe("OutfitSuggestion itemImages", () => {
  it("should accept itemImages field in OutfitSuggestion", () => {
    const outfit: OutfitSuggestion = {
      name: "Clean balanced look",
      occasion: "daily",
      items: ["Navy Polo", "Chinos", "White Sneakers"],
      colors: ["navy", "beige", "white"],
      inspirationNote: "A versatile base look",
      itemImages: [
        "https://example.com/polo.jpg",
        "https://example.com/chinos.jpg",
        "https://example.com/sneakers.jpg",
      ],
    };
    expect(outfit.itemImages).toBeDefined();
    expect(outfit.itemImages!.length).toBe(3);
    expect(outfit.itemImages![0]).toContain("polo");
  });

  it("should allow empty itemImages array", () => {
    const outfit: OutfitSuggestion = {
      name: "Elevated modern look",
      occasion: "going out",
      items: ["Blazer", "Slim pants"],
      colors: ["black", "grey"],
      inspirationNote: "Polished look",
      itemImages: [],
    };
    expect(outfit.itemImages).toEqual([]);
  });

  it("should allow undefined itemImages (backward compat)", () => {
    const outfit: OutfitSuggestion = {
      name: "Fallback look",
      occasion: "daily",
      items: ["Top", "Bottom"],
      colors: ["black"],
      inspirationNote: "Simple",
    };
    expect(outfit.itemImages).toBeUndefined();
  });

  it("should filter empty strings from itemImages for display", () => {
    const outfit: OutfitSuggestion = {
      name: "Mixed look",
      occasion: "daily",
      items: ["Polo", "Chinos", "Sneakers", "Watch"],
      colors: ["navy"],
      inspirationNote: "Mixed",
      itemImages: [
        "https://example.com/polo.jpg",
        "",
        "https://example.com/sneakers.jpg",
        "",
      ],
    };
    // Frontend filters empty strings: (outfit.itemImages || []).filter(Boolean)
    const displayImages = (outfit.itemImages || []).filter(Boolean);
    expect(displayImages.length).toBe(2);
    expect(displayImages[0]).toContain("polo");
    expect(displayImages[1]).toContain("sneakers");
  });

  it("should have parallel arrays (items and itemImages same length)", () => {
    const items = ["Navy Polo", "Beige Chinos", "White Sneakers"];
    const itemImages = [
      "https://example.com/polo.jpg",
      "https://example.com/chinos.jpg",
      "https://example.com/sneakers.jpg",
    ];
    expect(items.length).toBe(itemImages.length);
  });
});
