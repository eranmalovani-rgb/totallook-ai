import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("comment procedures", () => {
  describe("feed.addComment", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.feed.addComment({ feedPostId: 999, content: "test" })
      ).rejects.toThrow();
    });

    it("validates content is not empty", async () => {
      const caller = appRouter.createCaller(createContext(1));
      await expect(
        caller.feed.addComment({ feedPostId: 999, content: "" })
      ).rejects.toThrow();
    });

    it("validates content max length (500 chars)", async () => {
      const caller = appRouter.createCaller(createContext(1));
      const longContent = "a".repeat(501);
      await expect(
        caller.feed.addComment({ feedPostId: 999, content: longContent })
      ).rejects.toThrow();
    });

    it("accepts valid comment with parentId for replies", async () => {
      const caller = appRouter.createCaller(createContext(1));
      // The DB accepts comments even for non-existent feedPostId (no FK constraint)
      const result = await caller.feed.addComment({ feedPostId: 999, content: "nice look!", parentId: 1 });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("commentId");
      expect(typeof result.commentId).toBe("number");
    });
  });

  describe("feed.getComments", () => {
    it("returns empty array for non-existent post", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.feed.getComments({ feedPostId: 99999 });
      expect(result).toHaveProperty("comments");
      expect(Array.isArray(result.comments)).toBe(true);
      expect(result.comments.length).toBe(0);
    });
  });

  describe("feed.commentCount", () => {
    it("returns zero for non-existent post", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.feed.commentCount({ feedPostId: 99999 });
      expect(result).toHaveProperty("count");
      expect(result.count).toBe(0);
    });
  });

  describe("feed.deleteComment", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.feed.deleteComment({ commentId: 999 })
      ).rejects.toThrow();
    });
  });
});

describe("wardrobe sharing procedures", () => {
  describe("wardrobeShare.generateLink", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.wardrobeShare.generateLink()).rejects.toThrow();
    });
  });

  describe("wardrobeShare.getToken", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.wardrobeShare.getToken()).rejects.toThrow();
    });
  });

  describe("wardrobeShare.view", () => {
    it("returns null for non-existent token", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.wardrobeShare.view({ token: "nonexistent-token-12345" });
      expect(result).toBeNull();
    });
  });

  describe("wardrobeShare.revokeLink", () => {
    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.wardrobeShare.revokeLink()).rejects.toThrow();
    });
  });
});
