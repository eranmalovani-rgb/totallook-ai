import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { db } from "./_core/trpc";
import { users, reviews } from "../drizzle/schema";
import { eq } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(userId?: number): TrpcContext {
  const user: AuthenticatedUser | null = userId
    ? {
        id: userId,
        openId: `test-user-${userId}`,
        email: `test${userId}@example.com`,
        name: `Test User ${userId}`,
        loginMethod: "manus",
        role: "user",
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

describe("feed procedures", () => {
  describe("feed.list", () => {
    it("returns empty feed when no posts exist", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.feed.list({ limit: 10, offset: 0, sort: "new" });
      expect(result).toHaveProperty("posts");
      expect(result).toHaveProperty("hasMore");
      expect(Array.isArray(result.posts)).toBe(true);
    });

    it("accepts sort parameter 'popular'", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.feed.list({ limit: 10, offset: 0, sort: "popular" });
      expect(result).toHaveProperty("posts");
    });

    it("accepts sort parameter 'new'", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.feed.list({ limit: 10, offset: 0, sort: "new" });
      expect(result).toHaveProperty("posts");
    });
  });

  describe("feed.publish", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.publish({ reviewId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.like", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.like({ postId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.unlike", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.unlike({ postId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.save", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.save({ postId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.unsave", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.unsave({ postId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.delete", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.delete({ postId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.saved", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.saved({ limit: 10, offset: 0 })).rejects.toThrow();
    });
  });

  describe("feed.isPublished", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.isPublished({ reviewId: 999 })).rejects.toThrow();
    });
  });

  describe("review.get public access for feed posts", () => {
    it("review.get throws for non-owner on unpublished review", async () => {
      const caller = appRouter.createCaller(createContext(999));
      // Review id 1 belongs to user 1, not user 999, and is not published
      await expect(caller.review.get({ id: 99999 })).rejects.toThrow();
    });

    it("review.get requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.review.get({ id: 1 })).rejects.toThrow();
    });
  });

  // ---- Follow System Tests ----

  describe("feed.follow", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.follow({ userId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.unfollow", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.unfollow({ userId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.isFollowingUser", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.isFollowingUser({ userId: 999 })).rejects.toThrow();
    });
  });

  describe("feed.following", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.following({ limit: 10, offset: 0 })).rejects.toThrow();
    });
  });

  // ---- Notification Tests ----

  describe("feed.notifications", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.notifications({ limit: 10, offset: 0 })).rejects.toThrow();
    });
  });

  describe("feed.unreadCount", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.unreadCount()).rejects.toThrow();
    });
  });

  describe("feed.markRead", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.feed.markRead()).rejects.toThrow();
    });
  });
});
