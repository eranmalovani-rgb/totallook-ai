import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-" + userId,
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

function createPublicContext(): { ctx: TrpcContext } {
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

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    deleteReviewById: vi.fn(),
    deleteGuestSession: vi.fn(),
    getReviewById: vi.fn(),
  };
});

import { deleteReviewById, deleteGuestSession, getReviewById } from "./db";

describe("review.deleteOne", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteReviewById with correct userId and reviewId", async () => {
    const { ctx } = createAuthContext(42);
    const caller = appRouter.createCaller(ctx);
    
    (deleteReviewById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    
    const result = await caller.review.deleteOne({ reviewId: 123 });
    
    expect(deleteReviewById).toHaveBeenCalledWith(123, 42);
    expect(result).toEqual({ success: true });
  });

  it("should throw if user is not authenticated", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.review.deleteOne({ reviewId: 123 })
    ).rejects.toThrow();
  });

  it("should propagate errors from deleteReviewById", async () => {
    const { ctx } = createAuthContext(42);
    const caller = appRouter.createCaller(ctx);
    
    (deleteReviewById as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Review not found or not owned by user")
    );
    
    await expect(
      caller.review.deleteOne({ reviewId: 999 })
    ).rejects.toThrow();
  });
});

describe("guest.deleteAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteGuestSession with correct sessionId and fingerprint", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    (deleteGuestSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    
    const result = await caller.guest.deleteAnalysis({
      sessionId: 456,
      fingerprint: "abc12345678",
    });
    
    expect(deleteGuestSession).toHaveBeenCalledWith(456, "abc12345678");
    expect(result).toEqual({ success: true });
  });

  it("should reject fingerprint that is too short", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.guest.deleteAnalysis({
        sessionId: 456,
        fingerprint: "short",
      })
    ).rejects.toThrow();
  });

  it("should propagate errors from deleteGuestSession", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    (deleteGuestSession as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Session not found or fingerprint mismatch")
    );
    
    await expect(
      caller.guest.deleteAnalysis({
        sessionId: 789,
        fingerprint: "valid-fingerprint-12345",
      })
    ).rejects.toThrow();
  });
});
