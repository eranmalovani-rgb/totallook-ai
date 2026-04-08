import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(userId?: number, role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser | null = userId
    ? {
        id: userId,
        openId: `test-user-${userId}`,
        email: `test${userId}@example.com`,
        name: `Test User ${userId}`,
        loginMethod: "manus",
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("admin procedures", () => {
  describe("admin.stats", () => {
    it("returns stats for admin user", async () => {
      const caller = appRouter.createCaller(createContext(1, "admin"));
      const stats = await caller.admin.stats();
      expect(stats).toHaveProperty("totalUsers");
      expect(stats).toHaveProperty("totalReviews");
      expect(stats).toHaveProperty("completedReviews");
      expect(stats).toHaveProperty("totalFeedPosts");
      expect(stats).toHaveProperty("totalLikes");
      expect(typeof stats.totalUsers).toBe("number");
      expect(typeof stats.totalReviews).toBe("number");
    });

    it("rejects non-admin user", async () => {
      const caller = appRouter.createCaller(createContext(1, "user"));
      await expect(caller.admin.stats()).rejects.toThrow();
    });

    it("rejects unauthenticated user", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.admin.stats()).rejects.toThrow();
    });
  });

  describe("admin.allReviews", () => {
    it("returns reviews list for admin", async () => {
      const caller = appRouter.createCaller(createContext(1, "admin"));
      const result = await caller.admin.allReviews({ limit: 10, offset: 0 });
      expect(result).toHaveProperty("reviews");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.reviews)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("rejects non-admin user", async () => {
      const caller = appRouter.createCaller(createContext(1, "user"));
      await expect(caller.admin.allReviews({ limit: 10, offset: 0 })).rejects.toThrow();
    });

    it("rejects unauthenticated user", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.admin.allReviews({ limit: 10, offset: 0 })).rejects.toThrow();
    });

    it("respects limit and offset parameters", async () => {
      const caller = appRouter.createCaller(createContext(1, "admin"));
      const result = await caller.admin.allReviews({ limit: 5, offset: 0 });
      expect(result.reviews.length).toBeLessThanOrEqual(5);
    });
  });

  describe("admin.allUsers", () => {
    it("returns users list for admin", async () => {
      const caller = appRouter.createCaller(createContext(1, "admin"));
      const result = await caller.admin.allUsers({ limit: 10, offset: 0 });
      expect(result).toHaveProperty("users");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.users)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("includes reviewCount and feedPostCount for each user", async () => {
      const caller = appRouter.createCaller(createContext(1, "admin"));
      const result = await caller.admin.allUsers({ limit: 10, offset: 0 });
      if (result.users.length > 0) {
        const user = result.users[0];
        expect(user).toHaveProperty("reviewCount");
        expect(user).toHaveProperty("feedPostCount");
        expect(typeof user.reviewCount).toBe("number");
        expect(typeof user.feedPostCount).toBe("number");
      }
    });

    it("rejects non-admin user", async () => {
      const caller = appRouter.createCaller(createContext(1, "user"));
      await expect(caller.admin.allUsers({ limit: 10, offset: 0 })).rejects.toThrow();
    });
  });

  describe("admin.deleteReview", () => {
    it("rejects non-admin user", async () => {
      const caller = appRouter.createCaller(createContext(1, "user"));
      await expect(caller.admin.deleteReview({ reviewId: 999 })).rejects.toThrow();
    });

    it("rejects unauthenticated user", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.admin.deleteReview({ reviewId: 999 })).rejects.toThrow();
    });
  });
});
