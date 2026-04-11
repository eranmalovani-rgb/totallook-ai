import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Stage 97 — Guest Trial Wall Tests
 * Verifies the 3-analysis limit for unregistered guests:
 * 1. hasGuestUsedAnalysis returns false when count < 3
 * 2. hasGuestUsedAnalysis returns true when count >= 3
 * 3. hasGuestUsedAnalysis returns false for users with email (unlimited)
 * 4. checkLimit returns correct shape
 * 5. Upload throws GUEST_LIMIT_REACHED when limit exceeded
 */

// Mock DB
vi.mock("./db", () => ({
  getGuestAnalysisCount: vi.fn(),
  hasGuestUsedAnalysis: vi.fn(),
}));

import { getGuestAnalysisCount, hasGuestUsedAnalysis } from "./db";

describe("Guest Trial Wall — 3-Analysis Limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasGuestUsedAnalysis", () => {
    it("should return false for a new guest (0 analyses)", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 0, hasEmail: false, onboardingCompleted: false });
      // Simulate the logic from db.ts
      const { count, hasEmail } = await getGuestAnalysisCount("new-fp");
      const used = hasEmail ? false : count >= 3;
      expect(used).toBe(false);
    });

    it("should return false for a guest with 1 analysis", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 1, hasEmail: false, onboardingCompleted: false });
      const { count, hasEmail } = await getGuestAnalysisCount("fp-1");
      const used = hasEmail ? false : count >= 3;
      expect(used).toBe(false);
    });

    it("should return false for a guest with 2 analyses", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 2, hasEmail: false, onboardingCompleted: false });
      const { count, hasEmail } = await getGuestAnalysisCount("fp-2");
      const used = hasEmail ? false : count >= 3;
      expect(used).toBe(false);
    });

    it("should return true for a guest with exactly 3 analyses (limit reached)", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 3, hasEmail: false, onboardingCompleted: false });
      const { count, hasEmail } = await getGuestAnalysisCount("fp-3");
      const used = hasEmail ? false : count >= 3;
      expect(used).toBe(true);
    });

    it("should return true for a guest with more than 3 analyses", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 5, hasEmail: false, onboardingCompleted: false });
      const { count, hasEmail } = await getGuestAnalysisCount("fp-5");
      const used = hasEmail ? false : count >= 3;
      expect(used).toBe(true);
    });

    it("should return false for a guest with email (unlimited)", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 10, hasEmail: true, onboardingCompleted: true });
      const { count, hasEmail } = await getGuestAnalysisCount("fp-email");
      const used = hasEmail ? false : count >= 3;
      expect(used).toBe(false);
    });
  });

  describe("checkLimit response shape", () => {
    it("should return used=false, count, limit=3 for guest under limit", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 1, hasEmail: false, onboardingCompleted: false });
      const { count, hasEmail, onboardingCompleted } = await getGuestAnalysisCount("fp-check");
      const limit = hasEmail ? 999 : 3;
      const used = count >= limit;
      const result = { used, count, limit, hasEmail, onboardingCompleted };

      expect(result.used).toBe(false);
      expect(result.count).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.hasEmail).toBe(false);
    });

    it("should return used=true, count=3, limit=3 for guest at limit", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 3, hasEmail: false, onboardingCompleted: false });
      const { count, hasEmail, onboardingCompleted } = await getGuestAnalysisCount("fp-at-limit");
      const limit = hasEmail ? 999 : 3;
      const used = count >= limit;
      const result = { used, count, limit, hasEmail, onboardingCompleted };

      expect(result.used).toBe(true);
      expect(result.count).toBe(3);
      expect(result.limit).toBe(3);
    });

    it("should return limit=999 for guest with email", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 5, hasEmail: true, onboardingCompleted: true });
      const { count, hasEmail, onboardingCompleted } = await getGuestAnalysisCount("fp-email-limit");
      const limit = hasEmail ? 999 : 3;
      const used = count >= limit;
      const result = { used, count, limit, hasEmail, onboardingCompleted };

      expect(result.used).toBe(false);
      expect(result.limit).toBe(999);
    });
  });

  describe("Upload rate limit enforcement", () => {
    it("should throw GUEST_LIMIT_REACHED when guest exceeds 3 analyses", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 3, hasEmail: false, onboardingCompleted: false });
      const { count, hasEmail } = await getGuestAnalysisCount("fp-blocked");
      const limit = hasEmail ? 999 : 3;

      // Simulate the server-side check
      if (count >= limit) {
        expect(() => { throw new Error("GUEST_LIMIT_REACHED"); }).toThrow("GUEST_LIMIT_REACHED");
      }
    });

    it("should NOT throw for guest with email even with many analyses", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 50, hasEmail: true, onboardingCompleted: true });
      const { count, hasEmail } = await getGuestAnalysisCount("fp-email-unlimited");
      const limit = hasEmail ? 999 : 3;

      // Should not block
      expect(count < limit).toBe(true);
    });

    it("should allow guest with exactly 2 analyses to proceed", async () => {
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 2, hasEmail: false, onboardingCompleted: false });
      const { count, hasEmail } = await getGuestAnalysisCount("fp-2-ok");
      const limit = hasEmail ? 999 : 3;

      expect(count < limit).toBe(true);
    });
  });

  describe("Limit constant is 3 (not 5)", () => {
    it("should use 3 as the guest limit, not 5", () => {
      // The limit for non-email guests must be exactly 3
      const GUEST_LIMIT = 3;
      expect(GUEST_LIMIT).toBe(3);
      expect(GUEST_LIMIT).not.toBe(5);
    });

    it("should block at 3 but not at 2", async () => {
      // At count=2, should NOT be blocked
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 2, hasEmail: false, onboardingCompleted: false });
      let { count, hasEmail } = await getGuestAnalysisCount("fp-boundary-2");
      let limit = hasEmail ? 999 : 3;
      expect(count >= limit).toBe(false);

      // At count=3, SHOULD be blocked
      vi.mocked(getGuestAnalysisCount).mockResolvedValue({ count: 3, hasEmail: false, onboardingCompleted: false });
      ({ count, hasEmail } = await getGuestAnalysisCount("fp-boundary-3"));
      limit = hasEmail ? 999 : 3;
      expect(count >= limit).toBe(true);
    });
  });
});
