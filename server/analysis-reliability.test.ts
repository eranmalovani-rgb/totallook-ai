import { describe, it, expect } from "vitest";

/**
 * Tests for Stage 7: Analysis Reliability & Performance improvements
 * These tests verify the configuration and logic changes without requiring live API calls.
 */

describe("Analysis Reliability Improvements", () => {
  describe("7.1: LLM Timeout increased to 45s", () => {
    it("should have LLM timeout set to 45000ms", async () => {
      const fs = await import("fs");
      const llmCode = fs.readFileSync("server/_core/llm.ts", "utf-8");
      // Verify the timeout is 45000ms (was 30000ms)
      expect(llmCode).toContain("const timeoutMs = 45000;");
      expect(llmCode).not.toContain("const timeoutMs = 30000;");
    });
  });

  describe("7.2: Client-side timeout increased to 120s", () => {
    it("should have 120s timeout in tRPC client fetch", async () => {
      const fs = await import("fs");
      const mainCode = fs.readFileSync("client/src/main.tsx", "utf-8");
      // Verify the 120s timeout is configured
      expect(mainCode).toContain("120_000");
      expect(mainCode).toContain("AbortController");
      expect(mainCode).toContain("clearTimeout");
    });
  });

  describe("7.3: Auto-retry in client", () => {
    it("should have auto-retry logic in GuestUpload.tsx", async () => {
      const fs = await import("fs");
      const guestCode = fs.readFileSync("client/src/pages/GuestUpload.tsx", "utf-8");
      expect(guestCode).toContain("MAX_AUTO_RETRIES");
      expect(guestCode).toContain("auto-retrying");
      expect(guestCode).toContain("analysisAttempt");
    });

    it("should have auto-retry logic in Upload.tsx", async () => {
      const fs = await import("fs");
      const uploadCode = fs.readFileSync("client/src/pages/Upload.tsx", "utf-8");
      expect(uploadCode).toContain("MAX_AUTO_RETRIES");
      expect(uploadCode).toContain("auto-retrying");
      expect(uploadCode).toContain("analysisAttempt");
    });

    it("should not auto-retry on non-retryable errors (limit, completed)", async () => {
      const fs = await import("fs");
      const guestCode = fs.readFileSync("client/src/pages/GuestUpload.tsx", "utf-8");
      expect(guestCode).toContain("isNonRetryable");
      expect(guestCode).toContain('"in progress"');
      expect(guestCode).toContain('"completed"');
    });
  });

  describe("7.4: Better error messages", () => {
    it("should have specific Hebrew error messages for different error types", async () => {
      const fs = await import("fs");
      const guestCode = fs.readFileSync("client/src/pages/GuestUpload.tsx", "utf-8");
      // Rate limit error
      expect(guestCode).toContain("שירות הניתוח עמוס כרגע");
      // Timeout error
      expect(guestCode).toContain("הניתוח לקח יותר מדי זמן");
      // In progress error
      expect(guestCode).toContain("הניתוח כבר רץ ברקע");
      // Generic error
      expect(guestCode).toContain("אירעה שגיאה בניתוח");
      // All errors mention image is saved
      expect(guestCode).toContain("התמונה נשמרה");
    });

    it("should have specific English error messages for different error types", async () => {
      const fs = await import("fs");
      const guestCode = fs.readFileSync("client/src/pages/GuestUpload.tsx", "utf-8");
      expect(guestCode).toContain("Analysis service is busy");
      expect(guestCode).toContain("Analysis took too long");
      expect(guestCode).toContain("Analysis is already running");
      expect(guestCode).toContain("An error occurred");
      expect(guestCode).toContain("Your image is saved");
    });
  });

  describe("7.5: Streaming progress with time-based stages", () => {
    it("should have time-based stages in FashionLoadingAnimation", async () => {
      const fs = await import("fs");
      const loadingCode = fs.readFileSync("client/src/components/FashionLoadingAnimation.tsx", "utf-8");
      // Verify time-based stages exist
      expect(loadingCode).toContain("STAGES_HE");
      expect(loadingCode).toContain("STAGES_EN");
      expect(loadingCode).toContain("elapsed");
      expect(loadingCode).toContain("formatTime");
    });

    it("should accept attempt prop for auto-retry indicator", async () => {
      const fs = await import("fs");
      const loadingCode = fs.readFileSync("client/src/components/FashionLoadingAnimation.tsx", "utf-8");
      expect(loadingCode).toContain("attempt?:");
      expect(loadingCode).toContain("Auto-retrying");
      expect(loadingCode).toContain("מנסה שוב אוטומטית");
    });

    it("should pass attempt prop from upload pages", async () => {
      const fs = await import("fs");
      const guestCode = fs.readFileSync("client/src/pages/GuestUpload.tsx", "utf-8");
      const uploadCode = fs.readFileSync("client/src/pages/Upload.tsx", "utf-8");
      expect(guestCode).toContain("attempt={analysisAttempt}");
      expect(uploadCode).toContain("attempt={analysisAttempt}");
    });
  });

  describe("7.8: ReviewPage RetryAnalyzeButton consistency", () => {
    it("should have auto-retry logic in RetryAnalyzeButton", async () => {
      const fs = await import("fs");
      const reviewCode = fs.readFileSync("client/src/pages/ReviewPage.tsx", "utf-8");
      expect(reviewCode).toContain("MAX_RETRIES");
      expect(reviewCode).toContain("auto-retrying");
    });

    it("should have specific error messages for timeout, rate-limit, in-progress", async () => {
      const fs = await import("fs");
      const reviewCode = fs.readFileSync("client/src/pages/ReviewPage.tsx", "utf-8");
      // Timeout handling
      expect(reviewCode).toContain('msg.includes("timeout")');
      // Rate limit handling
      expect(reviewCode).toContain('msg.includes("quota")');
      // In-progress handling
      expect(reviewCode).toContain('msg.includes("in progress")');
      // Hebrew messages
      expect(reviewCode).toContain("שירות הניתוח עמוס");
      expect(reviewCode).toContain("הניתוח לקח יותר מדי זמן");
      expect(reviewCode).toContain("הניתוח כבר רץ");
    });
  });

  describe("Server-side retry support", () => {
    it("should allow retrying failed guest sessions", async () => {
      const fs = await import("fs");
      const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
      // Guest analyze should reset failed sessions
      expect(routerCode).toContain('if (session.status === "failed")');
      expect(routerCode).toContain('updateGuestSessionStatus(input.sessionId, "pending")');
    });

    it("should allow retrying failed registered user reviews", async () => {
      const fs = await import("fs");
      const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
      // Registered analyze should reset failed reviews
      expect(routerCode).toContain('if (review.status === "failed")');
      expect(routerCode).toContain('updateReviewStatus(input.reviewId, "pending")');
    });
  });
});
