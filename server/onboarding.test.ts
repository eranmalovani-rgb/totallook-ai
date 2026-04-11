import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("Onboarding profile.save procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.profile.save({
        gender: "female",
        ageRange: "25-34",
        onboardingCompleted: true,
      })
    ).rejects.toThrow();
  });

  it("accepts Phase A quick-finish fields (no gender/age, tinder-derived style)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // New flow: Quick Finish after Tinder — no gender or age, just style + occupation from visual choices
    const result = await caller.profile.save({
      occupation: "creative",
      stylePreference: "classic, minimalist, streetwear",
      saveToWardrobe: true,
      onboardingCompleted: true,
      country: "IL",
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("accepts Phase A quick-finish with zero likes (empty style)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // User swiped left on everything — still valid, style derived from silhouette choice
    const result = await caller.profile.save({
      occupation: "freelance",
      stylePreference: "streetwear, smart-casual",
      saveToWardrobe: true,
      onboardingCompleted: true,
    });

    expect(result).toBeDefined();
  });

  it("accepts full Phase B fields (all profile data)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.save({
      gender: "male",
      ageRange: "35-44",
      occupation: "corporate",
      budgetLevel: "premium",
      stylePreference: "classic, minimalist",
      favoriteInfluencers: "John Doe, Jane Smith",
      preferredStores: "Zara, H&M",
      saveToWardrobe: true,
      onboardingCompleted: true,
      country: "US",
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("accepts minimal fields (empty save)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Minimal save — no fields at all, just marking onboarding
    const result = await caller.profile.save({
      onboardingCompleted: true,
    });

    expect(result).toBeDefined();
  });

  it("accepts taste-scored profile from Tinder R1+R2 flow", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Simulates: Venue=bar, R1 likes streetwear+classic+minimalist, R2 reinforced all 3, rejected boho negative
    const result = await caller.profile.save({
      occupation: "nightlife",
      stylePreference: "minimalist, classic, streetwear",
      saveToWardrobe: true,
      onboardingCompleted: true,
      country: "IL",
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("validates input schema — rejects invalid types", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // onboardingCompleted should be boolean, not string
    await expect(
      caller.profile.save({
        onboardingCompleted: "yes" as any,
      })
    ).rejects.toThrow();
  });
});
