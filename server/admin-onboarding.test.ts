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

describe("admin.resetOnboarding", () => {
  it("resets onboarding for admin user", async () => {
    const caller = appRouter.createCaller(createContext(1, "admin"));
    const result = await caller.admin.resetOnboarding();
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createContext(2, "user"));
    await expect(caller.admin.resetOnboarding()).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.admin.resetOnboarding()).rejects.toThrow();
  });
});
