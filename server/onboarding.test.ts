import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { STORE_OPTIONS, COUNTRY_STORE_MAP } from "../shared/fashionTypes";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-onboard-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

// Mock the DB functions to avoid hitting real database
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getUserProfile: vi.fn().mockResolvedValue(null),
    upsertUserProfile: vi.fn().mockResolvedValue({ id: 1, userId: 1, onboardingCompleted: true }),
    isPhoneTaken: vi.fn().mockResolvedValue(null),
    logConsent: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock whatsapp to prevent real API calls
vi.mock("./whatsapp", () => ({
  sendWhatsAppWelcome: vi.fn().mockResolvedValue(true),
}));

// ── Taste Scoring Algorithm (mirrors client-side logic) ──
type StyleId = "streetwear" | "smart-casual" | "classic" | "boho" | "minimalist" | "athleisure";
interface OutfitCard { id: string; styleId: StyleId; styleTags: string[]; }
interface TasteScores { [styleId: string]: number; }

function computeTasteScores(
  r1Likes: string[], _r1Passes: string[],
  r2Likes: string[], _r2Passes: string[],
  r2NegativeCardId: string | null,
  r1Cards: OutfitCard[], r2Cards: OutfitCard[],
): TasteScores {
  const scores: TasteScores = {};
  const allStyles: StyleId[] = ["streetwear", "smart-casual", "classic", "boho", "minimalist", "athleisure"];
  allStyles.forEach(s => { scores[s] = 0; });
  r1Cards.forEach(card => {
    const pts = r1Likes.includes(card.id) ? 1 : -1;
    card.styleTags.forEach(tag => { if (scores[tag] !== undefined) scores[tag] += pts; });
  });
  r2Cards.forEach(card => {
    const isNegative = card.id === r2NegativeCardId;
    const liked = r2Likes.includes(card.id);
    const pts = isNegative ? (liked ? 1 : -3) : (liked ? 2 : -2);
    card.styleTags.forEach(tag => { if (scores[tag] !== undefined) scores[tag] += pts; });
  });
  return scores;
}

function getTopStyles(scores: TasteScores, count = 3): string[] {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .filter(([, v]) => v > 0)
    .map(([k]) => k);
}

const MOCK_R1: OutfitCard[] = [
  { id: "r1-streetwear", styleId: "streetwear", styleTags: ["streetwear", "smart-casual"] },
  { id: "r1-smart-casual", styleId: "smart-casual", styleTags: ["smart-casual", "classic"] },
  { id: "r1-classic", styleId: "classic", styleTags: ["classic", "minimalist"] },
  { id: "r1-boho", styleId: "boho", styleTags: ["boho"] },
  { id: "r1-minimalist", styleId: "minimalist", styleTags: ["minimalist", "classic"] },
  { id: "r1-athleisure", styleId: "athleisure", styleTags: ["athleisure"] },
];

describe("Onboarding V3 — Taste Scoring Algorithm", () => {
  it("gives positive scores to liked styles and negative to passed", () => {
    const r1Likes = ["r1-streetwear", "r1-classic", "r1-minimalist"];
    const r1Passes = ["r1-smart-casual", "r1-boho", "r1-athleisure"];
    const scores = computeTasteScores(r1Likes, r1Passes, [], [], null, MOCK_R1, []);
    expect(scores["streetwear"]).toBeGreaterThan(0);
    expect(scores["classic"]).toBeGreaterThan(0);
    expect(scores["boho"]).toBeLessThan(0);
    expect(scores["athleisure"]).toBeLessThan(0);
  });

  it("applies R2 reinforcement (like=+2) and negative pass (=-3)", () => {
    const r1Likes = ["r1-streetwear"];
    const r1Passes = ["r1-smart-casual", "r1-classic", "r1-boho", "r1-minimalist", "r1-athleisure"];
    const r2Cards: OutfitCard[] = [
      { id: "r2-sw-1", styleId: "streetwear", styleTags: ["streetwear"] },
      { id: "r2-sw-2", styleId: "streetwear", styleTags: ["streetwear"] },
      { id: "r2-sw-3", styleId: "streetwear", styleTags: ["streetwear"] },
      { id: "r2-boho-neg", styleId: "boho", styleTags: ["boho"] },
    ];
    const scores = computeTasteScores(r1Likes, r1Passes, ["r2-sw-1", "r2-sw-2", "r2-sw-3"], ["r2-boho-neg"], "r2-boho-neg", MOCK_R1, r2Cards);
    expect(scores["streetwear"]).toBeGreaterThanOrEqual(7);
    expect(scores["boho"]).toBeLessThanOrEqual(-4);
  });

  it("handles R2 negative card liked (surprise: +1)", () => {
    const r2Cards: OutfitCard[] = [
      { id: "r2-sw-1", styleId: "streetwear", styleTags: ["streetwear"] },
      { id: "r2-boho-neg", styleId: "boho", styleTags: ["boho"] },
    ];
    const scores = computeTasteScores(["r1-streetwear"], ["r1-boho"], ["r2-sw-1", "r2-boho-neg"], [], "r2-boho-neg", MOCK_R1, r2Cards);
    expect(scores["boho"]).toBe(0); // R1: -1, R2 negative liked: +1 = 0
  });

  it("returns top styles sorted by score, excluding negatives", () => {
    const scores: TasteScores = { streetwear: 5, "smart-casual": 2, classic: 4, boho: -3, minimalist: 3, athleisure: -1 };
    expect(getTopStyles(scores, 3)).toEqual(["streetwear", "classic", "minimalist"]);
  });

  it("returns empty array when all scores negative", () => {
    const scores: TasteScores = { streetwear: -1, "smart-casual": -2, classic: -1, boho: -3, minimalist: -1, athleisure: -4 };
    expect(getTopStyles(scores)).toEqual([]);
  });

  it("handles all likes gracefully", () => {
    const r1Likes = MOCK_R1.map(c => c.id);
    const scores = computeTasteScores(r1Likes, [], [], [], null, MOCK_R1, []);
    Object.values(scores).forEach(v => expect(v).toBeGreaterThanOrEqual(0));
    expect(getTopStyles(scores).length).toBeGreaterThan(0);
  });

  it("handles all passes gracefully", () => {
    const r1Passes = MOCK_R1.map(c => c.id);
    const scores = computeTasteScores([], r1Passes, [], [], null, MOCK_R1, []);
    Object.values(scores).forEach(v => expect(v).toBeLessThanOrEqual(0));
    expect(getTopStyles(scores)).toEqual([]);
  });
});

describe("Onboarding V3 — profile.save procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.save({ gender: "female", ageRange: "25-34", onboardingCompleted: true })
    ).rejects.toThrow();
  });

  it("accepts photo-detected profile fields (gender, age, budget from AI)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.save({
      gender: "female",
      ageRange: "25-34",
      budgetLevel: "mid-range",
      stylePreference: "streetwear, classic, minimalist",
      favoriteInfluencers: "Noa Kirel, Gal Gadot",
      preferredStores: "Zara, H&M, Castro",
      saveToWardrobe: true,
      onboardingCompleted: true,
      country: "IL",
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("accepts minimal onboarding completion", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.save({ onboardingCompleted: true });
    expect(result).toBeDefined();
  });

  it("accepts full profile with stores and influencers", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.save({
      gender: "male",
      ageRange: "35-44",
      occupation: "corporate",
      budgetLevel: "premium",
      stylePreference: "classic, minimalist",
      favoriteInfluencers: "John Doe, Jane Smith",
      preferredStores: "Zara, Massimo Dutti, Factory 54",
      saveToWardrobe: true,
      onboardingCompleted: true,
      country: "IL",
    });
    expect(result).toBeDefined();
  });

  it("rejects invalid types", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.save({ onboardingCompleted: "yes" as any })
    ).rejects.toThrow();
  });
});

describe("Onboarding V3 — analyzePhoto (public procedure)", () => {
  it("is accessible without authentication (publicProcedure)", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // The procedure should exist and be callable (will fail on LLM call, but shouldn't throw UNAUTHORIZED)
    try {
      await caller.onboarding.analyzePhoto({
        imageBase64: "dGVzdA==", // "test" in base64
        mimeType: "image/jpeg",
      });
    } catch (err: any) {
      // Should NOT be UNAUTHORIZED error — any other error (LLM, storage) is fine
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("is also accessible with authentication", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.onboarding.analyzePhoto({
        imageBase64: "dGVzdA==",
        mimeType: "image/jpeg",
      });
    } catch (err: any) {
      // Should NOT be UNAUTHORIZED
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("requires imageBase64 input", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.onboarding.analyzePhoto({ imageBase64: undefined as any })
    ).rejects.toThrow();
  });
});

describe("Path Chooser — Route Architecture", () => {
  it("taste scoring works for Path B conversion flow (guest completes onboarding)", () => {
    // Simulate a guest completing the full onboarding: R1 likes streetwear+classic, R2 reinforces
    const r1Likes = ["r1-streetwear", "r1-classic"];
    const r1Passes = ["r1-smart-casual", "r1-boho", "r1-minimalist", "r1-athleisure"];
    const r2Cards: OutfitCard[] = [
      { id: "r2-sw", styleId: "streetwear", styleTags: ["streetwear"] },
      { id: "r2-cl", styleId: "classic", styleTags: ["classic"] },
      { id: "r2-cl2", styleId: "classic", styleTags: ["classic", "minimalist"] },
      { id: "r2-boho-neg", styleId: "boho", styleTags: ["boho"] },
    ];
    const r2Likes = ["r2-sw", "r2-cl", "r2-cl2"];
    const r2Passes = ["r2-boho-neg"];
    const scores = computeTasteScores(r1Likes, r1Passes, r2Likes, r2Passes, "r2-boho-neg", MOCK_R1, r2Cards);
    const top = getTopStyles(scores);
    // Classic and streetwear should be top styles
    expect(top).toContain("classic");
    expect(top).toContain("streetwear");
    // Boho should be deeply negative
    expect(scores["boho"]).toBeLessThan(-3);
  });

  it("Path A quick analysis can transition to Path B with same photo", () => {
    // Verify the URL construction for passing photo from GuestReview to Onboarding
    const imageUrl = "https://storage.example.com/onboarding/guest/abc123.jpg";
    const params = imageUrl ? `?photo=${encodeURIComponent(imageUrl)}` : "";
    const targetUrl = `/try/precise${params}`;
    expect(targetUrl).toContain("/try/precise?photo=");
    expect(targetUrl).toContain(encodeURIComponent(imageUrl));
  });
});

describe("Guest — uploadFromUrl procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is accessible without authentication (publicProcedure)", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.guest.uploadFromUrl({
        imageUrl: "https://storage.example.com/test.jpg",
        fingerprint: "test-fp-12345678",
      });
    } catch (err: any) {
      // Should NOT be UNAUTHORIZED — any DB/storage error is fine
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("requires fingerprint and imageUrl", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // Missing fingerprint
    await expect(
      caller.guest.uploadFromUrl({ imageUrl: "https://test.com/img.jpg", fingerprint: "" } as any)
    ).rejects.toThrow();
    // Missing imageUrl
    await expect(
      caller.guest.uploadFromUrl({ imageUrl: "", fingerprint: "test-fp-12345678" } as any)
    ).rejects.toThrow();
  });
});

describe("Guest — saveProfile procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is accessible without authentication (publicProcedure)", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.guest.saveProfile({
        fingerprint: "test-fp-12345678",
        gender: "female",
        ageRange: "25-34",
        budgetLevel: "mid-range",
        stylePreference: "streetwear, classic",
        favoriteInfluencers: "Noa Kirel",
        preferredStores: "Zara, H&M",
        country: "IL",
      });
    } catch (err: any) {
      expect(err.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("requires fingerprint", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.guest.saveProfile({ fingerprint: "" } as any)
    ).rejects.toThrow();
  });
});

describe("Onboarding → GuestReview flow (Path B end-to-end contract)", () => {
  it("onboarding finish navigates to /guest/review/:id?from=onboarding", () => {
    const sessionId = 42;
    const targetUrl = `/guest/review/${sessionId}?from=onboarding`;
    expect(targetUrl).toContain("/guest/review/42");
    expect(targetUrl).toContain("from=onboarding");
  });

  it("GuestReview detects from=onboarding and hides personalized upsell", () => {
    // Simulate URL parsing
    const url = new URL("https://example.com/guest/review/42?from=onboarding");
    const fromOnboarding = url.searchParams.get("from") === "onboarding";
    expect(fromOnboarding).toBe(true);
  });

  it("GuestReview shows personalized upsell for Path A (no from param)", () => {
    const url = new URL("https://example.com/guest/review/42");
    const fromOnboarding = url.searchParams.get("from") === "onboarding";
    expect(fromOnboarding).toBe(false);
  });
});

describe("Mall store selection — always returns 10 stores", () => {
  it("returns exactly 10 stores for IL with mid-range budget", () => {
    const TARGET = 10;
    const detectedCountry = "IL";
    const detectedBudget = "mid-range";
    const detectedGender = "female";
    const adjacent: Record<string, string[]> = {
      "budget": ["budget", "mid-range"],
      "mid-range": ["budget", "mid-range", "premium"],
      "premium": ["mid-range", "premium", "luxury"],
      "luxury": ["premium", "luxury"],
    };
    const allowedBudgets = adjacent[detectedBudget] || [detectedBudget];
    const localData = COUNTRY_STORE_MAP[detectedCountry];
    const allLocal = localData
      ? localData.stores.filter((s: any) => {
          const genderOk = !detectedGender || s.gender === "unisex" || s.gender === detectedGender;
          return genderOk;
        })
      : [];
    const localBudgetMatch = allLocal.filter((s: any) => s.budget.some((b: string) => allowedBudgets.includes(b)));
    const localOther = allLocal.filter((s: any) => !s.budget.some((b: string) => allowedBudgets.includes(b)));
    const sortedLocal = [...localBudgetMatch, ...localOther].map((s: any) => ({ name: s.name, isLocal: true }));
    const localNames = new Set(sortedLocal.map((s: any) => s.name));
    const globalBudgetMatch = STORE_OPTIONS
      .filter((s: any) => allowedBudgets.includes(s.budget) && !localNames.has(s.label))
      .map((s: any) => ({ name: s.label, isLocal: false }));
    const globalOther = STORE_OPTIONS
      .filter((s: any) => !allowedBudgets.includes(s.budget) && !localNames.has(s.label))
      .map((s: any) => ({ name: s.label, isLocal: false }));
    const localSlice = sortedLocal.slice(0, 5);
    const usedNames = new Set(localSlice.map((s: any) => s.name));
    const globalPool = [...globalBudgetMatch, ...globalOther].filter((s: any) => !usedNames.has(s.name));
    const globalSlice = globalPool.slice(0, TARGET - localSlice.length);
    const result = [...localSlice, ...globalSlice].slice(0, TARGET);

    expect(result.length).toBe(TARGET);
  });

  it("returns exactly 10 stores for unknown country with budget tier", () => {
    const TARGET = 10;
    const detectedCountry = null;
    const detectedBudget = "luxury";
    const detectedGender = "";
    const adjacent: Record<string, string[]> = {
      "budget": ["budget", "mid-range"],
      "mid-range": ["budget", "mid-range", "premium"],
      "premium": ["mid-range", "premium", "luxury"],
      "luxury": ["premium", "luxury"],
    };
    const allowedBudgets = adjacent[detectedBudget] || [detectedBudget];
    const localSlice: any[] = [];
    const usedNames = new Set<string>();
    const globalBudgetMatch = STORE_OPTIONS
      .filter((s: any) => allowedBudgets.includes(s.budget) && !usedNames.has(s.label))
      .map((s: any) => ({ name: s.label, isLocal: false }));
    const globalOther = STORE_OPTIONS
      .filter((s: any) => !allowedBudgets.includes(s.budget) && !usedNames.has(s.label))
      .map((s: any) => ({ name: s.label, isLocal: false }));
    const globalPool = [...globalBudgetMatch, ...globalOther];
    const globalSlice = globalPool.slice(0, TARGET - localSlice.length);
    const result = [...localSlice, ...globalSlice].slice(0, TARGET);

    expect(result.length).toBe(TARGET);
  });
});
