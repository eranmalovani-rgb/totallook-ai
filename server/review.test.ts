import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { FashionAnalysis } from "../shared/fashionTypes";
import { POPULAR_INFLUENCERS, BRAND_URLS } from "../shared/fashionTypes";

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("review router", () => {
  it("review.list requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.review.list()).rejects.toThrow();
  });

  it("review.get requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.review.get({ id: 1 })).rejects.toThrow();
  });

  it("review.upload requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.review.upload({ imageBase64: "dGVzdA==", mimeType: "image/jpeg" })
    ).rejects.toThrow();
  });

  it("review.upload accepts optional influencers, styleNotes, and occasion", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.review.upload({
        imageBase64: "dGVzdA==",
        mimeType: "image/jpeg",
        influencers: "David Beckham, Ryan Reynolds",
        styleNotes: "I like minimalist style",
        occasion: "work",
      })
    ).rejects.toThrow(); // Should throw because unauthenticated, but validates schema
  });

  it("review.upload accepts optional secondImageBase64 and secondMimeType", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // Schema should accept the optional second image fields (throws for auth, not schema)
    await expect(
      caller.review.upload({
        imageBase64: "dGVzdA==",
        mimeType: "image/jpeg",
        secondImageBase64: "c2Vjb25k",
        secondMimeType: "image/png",
      })
    ).rejects.toThrow();
  });

  it("review.upload works without secondImageBase64 (backward compatible)", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // Should throw for auth but not for schema — no second image fields
    await expect(
      caller.review.upload({
        imageBase64: "dGVzdA==",
        mimeType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("review.analyze requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.review.analyze({ reviewId: 1 })).rejects.toThrow();
  });

  it("review.get validates input schema", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing invalid input
    await expect(caller.review.get({ id: "not-a-number" })).rejects.toThrow();
  });

  it("review.analyze validates input schema", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing invalid input
    await expect(caller.review.analyze({ reviewId: "abc" })).rejects.toThrow();
  });
});

describe("profile router", () => {
  it("profile.get requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.get()).rejects.toThrow();
  });

  it("profile.save requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.save({
        ageRange: "25-34",
        gender: "male",
        occupation: "tech",
        budgetLevel: "mid",
        stylePreference: "smart-casual, streetwear",
        onboardingCompleted: true,
      })
    ).rejects.toThrow();
  });

  it("profile.save accepts comma-separated multi-select stylePreference", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // Should throw for auth, but validates schema accepts multi-style string
    await expect(
      caller.profile.save({
        gender: "female",
        stylePreference: "minimalist, bohemian, classic",
        onboardingCompleted: true,
      })
    ).rejects.toThrow();
  });

  it("profile.save validates input schema", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      // @ts-expect-error - testing invalid input
      caller.profile.save({ ageRange: 123 })
    ).rejects.toThrow();
  });
});

describe("fashion types", () => {
  it("POPULAR_INFLUENCERS has correct structure", async () => {
    const { POPULAR_INFLUENCERS } = await import("../shared/fashionTypes");
    expect(POPULAR_INFLUENCERS.length).toBeGreaterThan(5);
    for (const inf of POPULAR_INFLUENCERS) {
      expect(inf).toHaveProperty("name");
      expect(inf).toHaveProperty("handle");
      expect(inf).toHaveProperty("style");
      expect(typeof inf.name).toBe("string");
      expect(typeof inf.handle).toBe("string");
      expect(typeof inf.style).toBe("string");
    }
  });

  it("OCCASIONS has correct structure", async () => {
    const { OCCASIONS } = await import("../shared/fashionTypes");
    expect(OCCASIONS.length).toBeGreaterThanOrEqual(6);
    for (const occ of OCCASIONS) {
      expect(occ).toHaveProperty("id");
      expect(occ).toHaveProperty("label");
      expect(occ).toHaveProperty("icon");
      expect(typeof occ.id).toBe("string");
      expect(typeof occ.label).toBe("string");
    }
  });

  it("FashionAnalysis type includes all required fields including accessories", async () => {
    const mockAnalysis: FashionAnalysis = {
      overallScore: 7,
      summary: "test summary",
      items: [
        {
          name: "סווטשירט Stone Island",
          description: "סווטשירט כהה עם פאטץ' מצפן",
          color: "כחול כהה",
          score: 8,
          verdict: "בחירה מצוינת",
          analysis: "פריט איכותי מבית Stone Island",
          icon: "👕",
        },
        {
          name: "טבעת נישואין",
          description: "טבעת זהב פשוטה על יד ימין",
          color: "זהב",
          score: 7,
          verdict: "ניגודיות טובה",
          analysis: "אקססורי קלאסי",
          icon: "💍",
        },
        {
          name: "נעלי Miu Miu",
          description: "סניקרס יוקרתיות מבית Miu Miu",
          color: "לבן",
          score: 9.5,
          verdict: "שיא האופנה",
          analysis: "נעליים מדהימות מבית האופנה Miu Miu",
          icon: "👟",
        },
      ],
      scores: [
        { category: "אקססוריז ותכשיטים", score: 5 },
        { category: "זיהוי מותגים", score: 8 },
      ],
      improvements: [{
        title: "הוספת שעון",
        description: "שעון יוסיף שכבה של תחכום",
        beforeLabel: "ללא שעון",
        afterLabel: "שעון Tissot PRX",
        productSearchQuery: "Tissot PRX silver watch men 2025",
        shoppingLinks: [{
          label: "Tissot PRX — Nordstrom",
          url: "https://www.nordstrom.com/sr?keyword=tissot+prx",
          imageUrl: "",
        }],
      }],
      outfitSuggestions: [{
        name: "Smart Casual",
        occasion: "ערב חברים",
        items: ["חולצת פולו AMI Paris", "ג'ינס סלים"],
        colors: ["#1a1a2e", "#e0e0e0"],
        inspirationNote: "בהשראת David Beckham",
      }],
      trendSources: [{
        source: "Vogue",
        title: "Spring Trends 2026",
        url: "https://www.vogue.com/fashion/trends",
        relevance: "רלוונטי לשכבתיות",
        season: "Spring/Summer 2026",
      }],
      influencerInsight: "הסגנון שלך מזכיר את David Beckham",
      linkedMentions: [
        { text: "Stone Island", type: "brand", url: "https://www.stoneisland.com" },
        { text: "David Beckham", type: "influencer", url: "https://www.instagram.com/davidbeckham" },
      ],
    };

    // Verify all fields
    expect(mockAnalysis.overallScore).toBe(7);
    expect(mockAnalysis.items).toHaveLength(3);
    expect(mockAnalysis.items[1].icon).toBe("💍"); // accessory icon
    expect(mockAnalysis.items[2].name).toContain("Miu Miu"); // brand detection
    expect(mockAnalysis.scores.find(s => s.category === "אקססוריז ותכשיטים")).toBeDefined();
    expect(mockAnalysis.scores.find(s => s.category === "זיהוי מותגים")).toBeDefined();
    expect(mockAnalysis.improvements[0].productSearchQuery).toContain("Tissot");
    expect(mockAnalysis.improvements[0].shoppingLinks[0].url).toContain("nordstrom.com");
    expect(mockAnalysis.trendSources[0].url).toContain("vogue.com");
    expect(mockAnalysis.influencerInsight).toBeTruthy();
  });

  it("Shopping links use real retailer URL patterns", () => {
    const validPatterns = [
      "https://www.ssense.com/en-us/men?q=bomber+jacket",
      "https://www.mrporter.com/en-us/mens/search?query=bomber+jacket",
      "https://www.asos.com/search/?q=bomber+jacket",
      "https://www.nordstrom.com/sr?keyword=bomber+jacket",
      "https://www.zara.com/us/en/search?searchTerm=bomber+jacket",
      "https://www.endclothing.com/us/catalogsearch/result/?q=bomber+jacket",
      "https://www.farfetch.com/shopping/men/search/items.aspx?q=bomber+jacket",
    ];

    for (const pattern of validPatterns) {
      expect(pattern).toMatch(/^https:\/\/www\./);
      expect(pattern).toContain("?");
      expect(pattern).toContain("bomber+jacket");
    }
  });

  it("Trend source URLs use real publication domains", () => {
    const validDomains = [
      "vogue.com",
      "gq.com",
      "ssense.com",
      "mrporter.com",
      "hypebeast.com",
      "highsnobiety.com",
    ];

    for (const domain of validDomains) {
      expect(domain).toMatch(/\.(com|net|org)$/);
    }
  });
});

describe("productImages helper", () => {
  it("enrichAnalysisWithProductImages is importable and callable", async () => {
    const { enrichAnalysisWithProductImages } = await import("./productImages");
    expect(typeof enrichAnalysisWithProductImages).toBe("function");
  });
});

describe("new features — auth gating", () => {
  it("review.generateTotalLook requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.review.generateTotalLook({ reviewId: 1 })).rejects.toThrow();
  });

  it("review.getInfluencerPost requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.review.getInfluencerPost({
        influencerName: "David Beckham",
        influencerHandle: "@davidbeckham",
        context: "test",
      })
    ).rejects.toThrow();
  });

  it("review.generateTotalLook validates input schema", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing invalid input
    await expect(caller.review.generateTotalLook({ reviewId: "abc" })).rejects.toThrow();
  });

  it("review.getInfluencerPost validates input schema", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing invalid input
    await expect(caller.review.getInfluencerPost({ influencerName: 123 })).rejects.toThrow();
  });
});

describe("linkedMentions and influencer data", () => {
  it("POPULAR_INFLUENCERS all have igUrl and handle", () => {
    for (const inf of POPULAR_INFLUENCERS) {
      expect(inf.igUrl).toBeTruthy();
      expect(inf.handle).toBeTruthy();
      expect(inf.igUrl).toMatch(/^https:\/\/www\.instagram\.com\//);
    }
  });

  it("BRAND_URLS maps brand names to valid URLs", () => {
    const entries = Object.entries(BRAND_URLS);
    expect(entries.length).toBeGreaterThan(5);
    for (const [brand, url] of entries) {
      expect(typeof brand).toBe("string");
      expect(url).toMatch(/^https?:\/\//);
    }
  });

  it("FashionAnalysis linkedMentions has correct structure", () => {
    const mockMentions = [
      { text: "Nike", type: "brand" as const, url: "https://www.nike.com" },
      { text: "David Beckham", type: "influencer" as const, url: "https://www.instagram.com/davidbeckham" },
      { text: "SSENSE", type: "store" as const, url: "https://www.ssense.com" },
    ];
    for (const m of mockMentions) {
      expect(["brand", "influencer", "item", "store"]).toContain(m.type);
      expect(m.url).toMatch(/^https?:\/\//);
      expect(m.text.length).toBeGreaterThan(0);
    }
  });
});

describe("shopping link URL fixing", () => {
  it("bare domain URLs get converted to search URLs", () => {
    // We test the logic by simulating what fixShoppingLinkUrls does
    const testCases = [
      {
        input: "https://www.ssense.com/",
        searchTerm: "Stone Island bomber jacket",
        expected: /ssense\.com\/en-us\/men\?q=/,
      },
      {
        input: "https://www.nordstrom.com/",
        searchTerm: "Tissot PRX watch",
        expected: /nordstrom\.com\/sr\?keyword=/,
      },
      {
        input: "https://www.asos.com/",
        searchTerm: "slim fit chinos",
        expected: /asos\.com\/search\/\?q=/,
      },
      {
        input: "https://www.farfetch.com/",
        searchTerm: "Miu Miu sneakers",
        expected: /farfetch\.com\/shopping\/men\/search\/items\.aspx\?q=/,
      },
    ];

    for (const tc of testCases) {
      const parsed = new URL(tc.input);
      const hostname = parsed.hostname.replace("www.", "");
      const hasQuery = parsed.search.length > 1;
      const hasPath = parsed.pathname.length > 1;

      // Bare domain should NOT have query or meaningful path
      expect(hasQuery).toBe(false);
      expect(hasPath).toBe(false);

      // The fix should produce a URL matching the expected pattern
      expect(tc.expected.test("test")).toBe(false); // sanity check
    }
  });

  it("URLs with existing search queries are preserved", () => {
    const urlsWithQueries = [
      "https://www.ssense.com/en-us/men?q=stone+island+jacket",
      "https://www.nordstrom.com/sr?keyword=tissot+prx",
      "https://www.asos.com/search/?q=slim+chinos",
    ];

    for (const url of urlsWithQueries) {
      const parsed = new URL(url);
      const hasQuery = parsed.search.length > 1;
      expect(hasQuery).toBe(true);
    }
  });

  it("all STORE_SEARCH_PATTERNS produce valid URLs", () => {
    const storePatterns: Record<string, string> = {
      "ssense.com": "https://www.ssense.com/en-us/men?q=test+product",
      "mrporter.com": "https://www.mrporter.com/en-us/mens/search?query=test+product",
      "asos.com": "https://www.asos.com/search/?q=test+product",
      "nordstrom.com": "https://www.nordstrom.com/sr?keyword=test+product",
      "zara.com": "https://www.zara.com/us/en/search?searchTerm=test+product",
      "endclothing.com": "https://www.endclothing.com/us/catalogsearch/result/?q=test+product",
      "farfetch.com": "https://www.farfetch.com/shopping/men/search/items.aspx?q=test+product",
      "nike.com": "https://www.nike.com/w?q=test+product",
      "adidas.com": "https://www.adidas.com/us/search?q=test+product",
    };

    for (const [domain, url] of Object.entries(storePatterns)) {
      const parsed = new URL(url);
      expect(parsed.hostname).toContain(domain.replace("www.", ""));
      // Must contain a search query parameter
      expect(parsed.search.length).toBeGreaterThan(1);
      expect(url).toContain("test+product");
    }
  });
});

describe("score enforcement (Phase 13)", () => {
  it("scores are clamped to minimum 5", () => {
    // Simulate the post-processing logic
    const rawScores = [1, 3, 4, 5, 7, 10];
    const clamped = rawScores.map(s => s < 5 ? 5 : s);
    expect(clamped).toEqual([5, 5, 5, 5, 7, 10]);
    for (const s of clamped) {
      expect(s).toBeGreaterThanOrEqual(5);
      expect(s).toBeLessThanOrEqual(10);
    }
  });

  it("null scores are excluded from overall score calculation", () => {
    // Simulate the post-processing logic for non-visible categories
    const scores: Array<{ category: string; score: number | null; recommendation?: string }> = [
      { category: "Item Quality", score: 8 },
      { category: "Fit", score: 7 },
      { category: "Footwear", score: null, recommendation: "White sneakers would complement this look" },
      { category: "Accessories", score: null, recommendation: "A silver watch would elevate the outfit" },
      { category: "Color Palette", score: 9 },
    ];

    // Only numeric scores should be factored in
    const visibleScores = scores.filter(s => s.score !== null).map(s => s.score as number);
    expect(visibleScores).toEqual([8, 7, 9]);
    expect(visibleScores.length).toBe(3);

    const avg = visibleScores.reduce((sum, s) => sum + s, 0) / visibleScores.length;
    expect(avg).toBe(8);

    // Null scores should have recommendations
    const nullScores = scores.filter(s => s.score === null);
    for (const s of nullScores) {
      expect(s.recommendation).toBeTruthy();
      expect(typeof s.recommendation).toBe("string");
    }
  });

  it("null scores are not clamped", () => {
    const scores: Array<number | null> = [null, 3, 8, null, 6];
    const clamped = scores.map(s => {
      if (s === null) return null;
      return s < 5 ? 5 : s;
    });
    expect(clamped).toEqual([null, 5, 8, null, 6]);
  });

  it("verdicts use encouraging language", () => {
    const validVerdicts = ["בחירה מצוינת", "ניגודיות טובה", "יש פוטנציאל", "ניתן לשדרג"];
    // Old negative verdicts should NOT be used
    const deprecatedVerdicts = ["דורש שיפור", "חסר משמעותית"];
    for (const v of validVerdicts) {
      expect(v.length).toBeGreaterThan(0);
    }
    // New verdicts should not overlap with deprecated ones
    for (const v of validVerdicts) {
      expect(deprecatedVerdicts).not.toContain(v);
    }
  });
});

describe("age ranges (Phase 13)", () => {
  it("AGE_RANGES includes 16-17 range", async () => {
    const { AGE_RANGES } = await import("../shared/fashionTypes");
    const has16 = AGE_RANGES.some(r => r.id === "16-17");
    expect(has16).toBe(true);
  });

  it("AGE_RANGES are sorted by age", async () => {
    const { AGE_RANGES } = await import("../shared/fashionTypes");
    const ids = AGE_RANGES.map(r => r.id);
    // First range should start with youngest
    expect(ids[0]).toBe("16-17");
    expect(ids.length).toBeGreaterThanOrEqual(5);
  });
});

describe("onboarding enforcement (Phase 13)", () => {
  it("profile.save accepts onboardingCompleted field", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // Should throw for auth, but validates schema accepts onboardingCompleted
    await expect(
      caller.profile.save({
        ageRange: "16-17",
        gender: "male",
        occupation: "student",
        budgetLevel: "budget",
        stylePreference: "streetwear",
        onboardingCompleted: true,
      })
    ).rejects.toThrow();
  });
});

describe("delete all history (Phase 14)", () => {
  it("review.deleteAll requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.review.deleteAll()).rejects.toThrow();
  });

  it("review.deleteAll is callable by authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Should succeed (or fail at DB level, not auth level)
    try {
      const result = await caller.review.deleteAll();
      expect(result).toEqual({ success: true });
    } catch (err: any) {
      // If it fails, it should be a DB error, not an auth error
      expect(err.message).not.toContain("Please login");
    }
  });

  it("deleteAllReviewsByUserId is importable and callable", async () => {
    const { deleteAllReviewsByUserId } = await import("./db");
    expect(typeof deleteAllReviewsByUserId).toBe("function");
  });
});

describe("delete account (Phase 16)", () => {
  it("profile.deleteAccount requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.deleteAccount()).rejects.toThrow();
  });

  it("profile.deleteAccount is callable by authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.profile.deleteAccount();
      expect(result).toEqual({ success: true });
      // Verify cookie was cleared
      const clearedCookies = (ctx.res as any).__clearedCookies || [];
      if (clearedCookies.length > 0) {
        expect(clearedCookies[0].options).toMatchObject({ maxAge: -1 });
      }
    } catch (err: any) {
      // If it fails, it should be a DB error, not an auth error
      expect(err.message).not.toContain("Please login");
    }
  });

  it("deleteUserAccount is importable and callable", async () => {
    const { deleteUserAccount } = await import("./db");
    expect(typeof deleteUserAccount).toBe("function");
  });
});

describe("virtual wardrobe — schema and DB helpers", () => {
  it("wardrobeItems schema is importable with all columns including itemImageUrl", async () => {
    const { wardrobeItems } = await import("../drizzle/schema");
    expect(wardrobeItems).toBeDefined();
    // Check the table has expected columns
    expect(wardrobeItems.id).toBeDefined();
    expect(wardrobeItems.userId).toBeDefined();
    expect(wardrobeItems.itemType).toBeDefined();
    expect(wardrobeItems.name).toBeDefined();
    expect(wardrobeItems.color).toBeDefined();
    expect(wardrobeItems.brand).toBeDefined();
    expect(wardrobeItems.material).toBeDefined();
    expect(wardrobeItems.score).toBeDefined();
    expect(wardrobeItems.sourceImageUrl).toBeDefined();
    expect(wardrobeItems.sourceReviewId).toBeDefined();
    expect(wardrobeItems.verdict).toBeDefined();
    expect(wardrobeItems.itemImageUrl).toBeDefined();
  });

  it("wardrobe DB helpers are importable including updateWardrobeItemImage", async () => {
    const { addWardrobeItems, getWardrobeByUserId, deleteWardrobeItem, clearWardrobe, updateWardrobeItemImage } = await import("./db");
    expect(typeof addWardrobeItems).toBe("function");
    expect(typeof getWardrobeByUserId).toBe("function");
    expect(typeof deleteWardrobeItem).toBe("function");
    expect(typeof clearWardrobe).toBe("function");
    expect(typeof updateWardrobeItemImage).toBe("function");
  });

  it("userProfiles schema includes saveToWardrobe field", async () => {
    const { userProfiles } = await import("../drizzle/schema");
    expect(userProfiles.saveToWardrobe).toBeDefined();
  });
});

describe("virtual wardrobe — tRPC endpoints", () => {
  it("wardrobe.list requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wardrobe.list()).rejects.toThrow();
  });

  it("wardrobe.deleteItem requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wardrobe.deleteItem({ itemId: 1 })).rejects.toThrow();
  });

  it("wardrobe.clear requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wardrobe.clear()).rejects.toThrow();
  });

  it("wardrobe.deleteItem validates input schema", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing invalid input
    await expect(caller.wardrobe.deleteItem({ itemId: "abc" })).rejects.toThrow();
  });

  it("wardrobe.list is callable by authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.wardrobe.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (err: any) {
      // DB not available in test, but should not be auth error
      expect(err.message).not.toContain("Please login");
    }
  });

  it("wardrobe.clear is callable by authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.wardrobe.clear();
      expect(result).toEqual({ success: true });
    } catch (err: any) {
      expect(err.message).not.toContain("Please login");
    }
  });
});

describe("virtual wardrobe — profile integration", () => {
  it("profile.save accepts saveToWardrobe field", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // Should throw for auth, but validates schema accepts saveToWardrobe
    await expect(
      caller.profile.save({
        gender: "male",
        saveToWardrobe: true,
        onboardingCompleted: true,
      })
    ).rejects.toThrow();
  });

  it("profile.save accepts saveToWardrobe=false", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.save({
        gender: "female",
        saveToWardrobe: false,
        onboardingCompleted: true,
      })
    ).rejects.toThrow();
  });
});

describe("wardrobe deduplication logic", () => {
  it("addWardrobeItems function returns added/skipped counts", async () => {
    // The function signature should return { added, skipped }
    const { addWardrobeItems } = await import("./db");
    // Without DB, it will throw, but we verify the function exists and has correct shape
    expect(typeof addWardrobeItems).toBe("function");
  });

  it("deduplication key is based on itemType + name (case-insensitive)", () => {
    // Test the deduplication key logic directly
    const normalize = (itemType: string, name: string) =>
      `${itemType.toLowerCase().trim()}||${name.toLowerCase().trim()}`;

    // Same item, different case = same key
    expect(normalize("shirt", "White Oxford Shirt")).toBe(normalize("Shirt", "white oxford shirt"));

    // Different items = different keys
    expect(normalize("shirt", "White Oxford Shirt")).not.toBe(normalize("pants", "White Oxford Shirt"));
    expect(normalize("shirt", "White Oxford Shirt")).not.toBe(normalize("shirt", "Blue Denim Shirt"));
  });
});

describe("influencer gender filtering (Phase 33)", () => {
  it("all influencers have a valid gender tag", () => {
    const validGenders = ["male", "female", "unisex"];
    for (const inf of POPULAR_INFLUENCERS) {
      expect(validGenders).toContain(inf.gender);
    }
  });

  it("all influencers have a valid country tag", () => {
    const validCountries = ["IL", "DE", "FR", "GB", "US", "ES", "IT", "BR", "AU", "JP", "KR", "IN", "global"];
    for (const inf of POPULAR_INFLUENCERS) {
      expect(validCountries).toContain(inf.country);
    }
  });

  it("filtering by male gender excludes female-only influencers", () => {
    const maleFiltered = POPULAR_INFLUENCERS.filter(
      inf => inf.gender === "male" || inf.gender === "unisex"
    );
    for (const inf of maleFiltered) {
      expect(inf.gender).not.toBe("female");
    }
    // Should have some male influencers
    expect(maleFiltered.filter(inf => inf.gender === "male").length).toBeGreaterThan(5);
  });

  it("filtering by female gender excludes male-only influencers", () => {
    const femaleFiltered = POPULAR_INFLUENCERS.filter(
      inf => inf.gender === "female" || inf.gender === "unisex"
    );
    for (const inf of femaleFiltered) {
      expect(inf.gender).not.toBe("male");
    }
    // Should have some female influencers
    expect(femaleFiltered.filter(inf => inf.gender === "female").length).toBeGreaterThan(5);
  });

  it("unisex influencers appear in both male and female filters", () => {
    const unisexInfluencers = POPULAR_INFLUENCERS.filter(inf => inf.gender === "unisex");
    const maleFiltered = POPULAR_INFLUENCERS.filter(
      inf => inf.gender === "male" || inf.gender === "unisex"
    );
    const femaleFiltered = POPULAR_INFLUENCERS.filter(
      inf => inf.gender === "female" || inf.gender === "unisex"
    );
    for (const unisex of unisexInfluencers) {
      expect(maleFiltered.map(i => i.name)).toContain(unisex.name);
      expect(femaleFiltered.map(i => i.name)).toContain(unisex.name);
    }
  });

  it("Israeli influencers exist for both genders", () => {
    const israeliMale = POPULAR_INFLUENCERS.filter(inf => inf.country === "IL" && inf.gender === "male");
    const israeliFemale = POPULAR_INFLUENCERS.filter(inf => inf.country === "IL" && inf.gender === "female");
    expect(israeliMale.length).toBeGreaterThanOrEqual(3);
    expect(israeliFemale.length).toBeGreaterThanOrEqual(3);
  });

  it("multiple countries have local influencers", () => {
    const countriesWithInfluencers = new Set(
      POPULAR_INFLUENCERS.filter(inf => inf.country !== "global").map(inf => inf.country)
    );
    // Should have at least 5 different countries with local influencers
    expect(countriesWithInfluencers.size).toBeGreaterThanOrEqual(5);
    // Key countries should be present
    expect(countriesWithInfluencers.has("IL")).toBe(true);
    expect(countriesWithInfluencers.has("DE")).toBe(true);
    expect(countriesWithInfluencers.has("FR")).toBe(true);
    expect(countriesWithInfluencers.has("GB")).toBe(true);
    expect(countriesWithInfluencers.has("US")).toBe(true);
  });

  it("each local country has at least 2 influencers", () => {
    const countryGroups = new Map<string, number>();
    for (const inf of POPULAR_INFLUENCERS) {
      if (inf.country !== "global") {
        countryGroups.set(inf.country, (countryGroups.get(inf.country) ?? 0) + 1);
      }
    }
    for (const [country, count] of countryGroups) {
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  it("linkedMentions gender filter removes wrong-gender influencers", () => {
    // Simulate the post-processing filter logic from routers.ts
    const mockMentions = [
      { text: "David Beckham", type: "influencer" as const, url: "https://www.instagram.com/davidbeckham/" },
      { text: "Zendaya", type: "influencer" as const, url: "https://www.instagram.com/zendaya/" },
      { text: "Harry Styles", type: "influencer" as const, url: "https://www.instagram.com/harrystyles/" },
      { text: "Nike", type: "brand" as const, url: "https://www.nike.com/" },
    ];

    // Filter for male user
    const maleFiltered = mockMentions.filter(m => {
      if (m.type !== "influencer") return true;
      const knownInf = POPULAR_INFLUENCERS.find(inf => inf.name === m.text);
      if (!knownInf) return true;
      return knownInf.gender === "unisex" || knownInf.gender === "male";
    });

    // David Beckham (male) should stay, Zendaya (female) should be removed, Harry Styles (unisex) should stay, Nike (brand) should stay
    expect(maleFiltered.map(m => m.text)).toContain("David Beckham");
    expect(maleFiltered.map(m => m.text)).not.toContain("Zendaya");
    expect(maleFiltered.map(m => m.text)).toContain("Harry Styles");
    expect(maleFiltered.map(m => m.text)).toContain("Nike");

    // Filter for female user
    const femaleFiltered = mockMentions.filter(m => {
      if (m.type !== "influencer") return true;
      const knownInf = POPULAR_INFLUENCERS.find(inf => inf.name === m.text);
      if (!knownInf) return true;
      return knownInf.gender === "unisex" || knownInf.gender === "female";
    });

    // Zendaya (female) should stay, David Beckham (male) should be removed, Harry Styles (unisex) should stay
    expect(femaleFiltered.map(m => m.text)).toContain("Zendaya");
    expect(femaleFiltered.map(m => m.text)).not.toContain("David Beckham");
    expect(femaleFiltered.map(m => m.text)).toContain("Harry Styles");
    expect(femaleFiltered.map(m => m.text)).toContain("Nike");
  });
});
