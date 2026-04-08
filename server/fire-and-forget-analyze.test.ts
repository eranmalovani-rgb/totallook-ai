/**
 * Tests for Stage 6: Fire-and-forget analyze pattern
 * 
 * The analyze mutation should:
 * 1. Return immediately with { success: true, reviewId } (not wait for LLM)
 * 2. Mark the review as "analyzing" before returning
 * 3. Run the actual analysis in the background
 * 4. Be idempotent: calling analyze on an already-analyzing review returns success
 * 5. Be idempotent: calling analyze on a completed review returns success
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";

const ROUTERS_PATH = "server/routers.ts";
const UPLOAD_PATH = "client/src/pages/Upload.tsx";
const GUEST_UPLOAD_PATH = "client/src/pages/GuestUpload.tsx";

describe("Fire-and-forget analyze pattern", () => {
  const routersCode = fs.readFileSync(ROUTERS_PATH, "utf-8");
  const uploadCode = fs.readFileSync(UPLOAD_PATH, "utf-8");
  const guestUploadCode = fs.readFileSync(GUEST_UPLOAD_PATH, "utf-8");

  describe("Server-side: review.analyze", () => {
    it("should return immediately without awaiting the analysis", () => {
      // The analyze mutation should have a fire-and-forget pattern:
      // 1. updateReviewStatus("analyzing") is called synchronously
      // 2. Background analysis is launched with (async () => { ... })()
      // 3. Return { success: true, reviewId } immediately
      expect(routersCode).toContain("return { success: true, reviewId: input.reviewId }");
    });

    it("should launch background analysis with (async () => { ... })()", () => {
      // The background analysis should be wrapped in an IIFE
      // The analyze procedure is very large (~33K chars)
      const startIdx = routersCode.indexOf("analyze: protectedProcedure");
      const endIdx = routersCode.indexOf("get: protectedProcedure", startIdx + 100);
      const analyzeSection = routersCode.substring(startIdx, endIdx);
      expect(analyzeSection).toContain("(async () => {");
      expect(analyzeSection).toContain("})().catch((bgErr)");
    });

    it("should be idempotent for already-analyzing reviews", () => {
      const analyzeSection = routersCode.substring(
        routersCode.indexOf("analyze: protectedProcedure"),
        routersCode.indexOf("analyze: protectedProcedure") + 700
      );
      expect(analyzeSection).toContain('review.status === "analyzing"');
      expect(analyzeSection).toContain("return { success: true");
    });

    it("should be idempotent for completed reviews", () => {
      const analyzeSection = routersCode.substring(
        routersCode.indexOf("analyze: protectedProcedure"),
        routersCode.indexOf("analyze: protectedProcedure") + 700
      );
      expect(analyzeSection).toContain('review.status === "completed"');
      expect(analyzeSection).toContain("return { success: true");
    });

    it("should mark review as analyzing before launching background job", () => {
      // The structure should be:
      // 1. await updateReviewStatus("analyzing")
      // 2. (async () => { ... })()  <-- background job
      // 3. return { success: true }  <-- immediate return
      const startIdx = routersCode.indexOf("analyze: protectedProcedure");
      const endIdx = routersCode.indexOf("get: protectedProcedure", startIdx + 100);
      const fullSection = routersCode.substring(startIdx, endIdx);
      const analyzingIdx = fullSection.indexOf('updateReviewStatus(input.reviewId, "analyzing")');
      const iifeIdx = fullSection.indexOf("(async () => {");
      const finalReturnIdx = fullSection.lastIndexOf("return { success: true, reviewId");
      expect(analyzingIdx).toBeGreaterThan(-1);
      expect(iifeIdx).toBeGreaterThan(-1);
      expect(finalReturnIdx).toBeGreaterThan(-1);
      // Order: analyzing status → IIFE launch → return
      expect(analyzingIdx).toBeLessThan(iifeIdx);
      expect(iifeIdx).toBeLessThan(finalReturnIdx);
    });

    it("should mark review as failed if background analysis fails", () => {
      // The analyze procedure is very large (~33K chars), so we need the full section
      const startIdx = routersCode.indexOf("analyze: protectedProcedure");
      const endIdx = routersCode.indexOf("get: protectedProcedure", startIdx + 100);
      const fullAnalyzeSection = routersCode.substring(startIdx, endIdx);
      expect(fullAnalyzeSection).toContain('updateReviewStatus(input.reviewId, "failed")');
    });

    it("should capture userId before returning (ctx may not be available in background)", () => {
      const analyzeSection = routersCode.substring(
        routersCode.indexOf("analyze: protectedProcedure"),
        routersCode.indexOf("analyze: protectedProcedure") + 1500
      );
      expect(analyzeSection).toContain("const userId = ctx.user.id");
    });

    it("should use captured userId instead of ctx.user.id in background", () => {
      // Inside the background IIFE, we should use userId, not ctx.user.id
      // Find the IIFE start and the catch block that ends it
      const bgStart = routersCode.indexOf("(async () => {");
      const bgEnd = routersCode.indexOf("})().catch((bgErr)");
      const bgSection = routersCode.substring(bgStart, bgEnd);
      expect(bgSection).toContain("getUserProfile(userId)");
      expect(bgSection).toContain("getWardrobeByUserId(userId");
      // Should NOT use ctx.user.id in the background section
      expect(bgSection).not.toContain("ctx.user.id");
    });
  });

  describe("Server-side: guest.analyze", () => {
    // The guest analyze procedure is very large (500+ lines), so we need a big window
    const guestAnalyzeIdx = routersCode.lastIndexOf("analyze: publicProcedure");
    // Find the next procedure after guest analyze to bound the section
    const nextProcIdx = routersCode.indexOf("getResult: publicProcedure", guestAnalyzeIdx);
    const guestSection = routersCode.substring(guestAnalyzeIdx, nextProcIdx > 0 ? nextProcIdx : guestAnalyzeIdx + 30000);

    it("should return immediately with sessionId", () => {
      expect(guestSection).toContain("return { success: true, sessionId: input.sessionId }");
    });

    it("should be idempotent for already-analyzing sessions", () => {
      expect(guestSection).toContain('session.status === "analyzing"');
    });

    it("should be idempotent for completed sessions", () => {
      expect(guestSection).toContain('session.status === "completed"');
    });

    it("should launch background analysis", () => {
      expect(guestSection).toContain("(async () => {");
      expect(guestSection).toContain("})().catch((bgErr)");
    });

    it("should mark session as failed on background error", () => {
      expect(guestSection).toContain('updateGuestSessionStatus(input.sessionId, "failed")');
    });
  });

  describe("Client-side: Upload.tsx", () => {
    it("should navigate to ReviewPage even if analyze call fails", () => {
      expect(uploadCode).toContain("Analyze call error (navigating anyway)");
      // After the try/catch for analyze, it should still navigate
      const navigateIdx = uploadCode.indexOf("navigate(`/review/${reviewId}`)");
      expect(navigateIdx).toBeGreaterThan(-1);
    });

    it("should not show timeout error (server handles it in background)", () => {
      // The outer catch should only handle upload errors, not analyze timeouts
      const outerCatch = uploadCode.substring(
        uploadCode.indexOf("[Upload] Upload error:"),
        uploadCode.indexOf("[Upload] Upload error:") + 500
      );
      expect(outerCatch).not.toContain("timeoutError");
    });
  });

  describe("Client-side: GuestUpload.tsx", () => {
    it("should navigate to GuestReview even if analyze call fails", () => {
      expect(guestUploadCode).toContain("Analyze call error (navigating anyway)");
      const navigateIdx = guestUploadCode.indexOf("navigate(`/guest/review/${sessionId}`)");
      expect(navigateIdx).toBeGreaterThan(-1);
    });

    it("should still block navigation for limit errors", () => {
      expect(guestUploadCode).toContain("setLimitReached(true)");
      expect(guestUploadCode).toContain("return;");
    });
  });

  describe("ReviewPage polling", () => {
    const reviewPageCode = fs.readFileSync("client/src/pages/ReviewPage.tsx", "utf-8");

    it("should poll every 3s when status is pending or analyzing", () => {
      expect(reviewPageCode).toContain('status === "pending" || status === "analyzing"');
      expect(reviewPageCode).toContain("return 3000");
    });

    it("should show loading state for pending/analyzing reviews", () => {
      expect(reviewPageCode).toContain('review.status === "pending" || review.status === "analyzing"');
    });

    it("should show failed state with retry button", () => {
      expect(reviewPageCode).toContain('review.status === "failed"');
      expect(reviewPageCode).toContain("RetryAnalyzeButton");
    });
  });

  describe("GuestReview polling", () => {
    const guestReviewCode = fs.readFileSync("client/src/pages/GuestReview.tsx", "utf-8");

    it("should poll every 2s when status is analyzing or pending", () => {
      expect(guestReviewCode).toContain('d.status === "analyzing" || d.status === "pending"');
      expect(guestReviewCode).toContain("return 2000");
    });

    it("should show loading state for analyzing/pending sessions", () => {
      expect(guestReviewCode).toContain('result.status === "analyzing" || result.status === "pending"');
    });
  });
});
