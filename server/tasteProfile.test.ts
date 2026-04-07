import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "taste-test-user",
    email: "taste@example.com",
    name: "Taste User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("tasteProfile.get", () => {
  it("returns hasData: false when user has no completed reviews", async () => {
    // Use a user ID that likely has no reviews
    const ctx = createAuthContext(99999);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasteProfile.get();

    expect(result).toBeDefined();
    expect(result.hasData).toBe(false);
    expect(result.analysisCount).toBe(0);
    expect(result.overallTasteScore).toBe(0);
    expect(result.scoreHistory).toEqual([]);
    expect(result.styleMap).toEqual({});
    expect(result.colorPalette).toEqual([]);
    expect(result.brandAffinities).toEqual([]);
    expect(result.categoryScores).toEqual({});
    expect(result.strengths).toEqual([]);
    expect(result.improvements).toEqual([]);
    expect(result.wardrobeStats).toEqual({
      totalItems: 0,
      categories: {},
      topBrands: [],
      topColors: [],
    });
  });

  it("returns correct shape with profilePreferences", async () => {
    const ctx = createAuthContext(99999);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasteProfile.get();

    expect(result.profilePreferences).toBeDefined();
    expect(result.profilePreferences).toHaveProperty("gender");
    expect(result.profilePreferences).toHaveProperty("ageRange");
    expect(result.profilePreferences).toHaveProperty("budgetLevel");
    expect(result.profilePreferences).toHaveProperty("stylePreference");
  });

  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tasteProfile.get()).rejects.toThrow();
  });
});
