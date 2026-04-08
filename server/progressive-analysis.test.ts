import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const routersCode = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
const dbCode = readFileSync(resolve(__dirname, "db.ts"), "utf-8");
const reviewPageCode = readFileSync(resolve(__dirname, "../client/src/pages/ReviewPage.tsx"), "utf-8");
const guestReviewCode = readFileSync(resolve(__dirname, "../client/src/pages/GuestReview.tsx"), "utf-8");

describe("Progressive Analysis — Server Side", () => {
  it("should have savePartialAnalysis function in db.ts", () => {
    expect(dbCode).toContain("export async function savePartialAnalysis");
  });

  it("should have savePartialGuestAnalysis function in db.ts", () => {
    expect(dbCode).toContain("export async function savePartialGuestAnalysis");
  });

  it("savePartialAnalysis should save with status 'analyzing' (not completed)", () => {
    // Find the function body
    const fnStart = dbCode.indexOf("export async function savePartialAnalysis");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = dbCode.substring(fnStart, fnStart + 1000);
    // Should NOT set status to completed
    expect(fnBody).not.toContain("status: \"completed\"");
    // Should keep status as analyzing (or not change it)
    expect(fnBody).toContain("analysisJson");
  });

  it("savePartialGuestAnalysis should save with status 'analyzing' (not completed)", () => {
    const fnStart = dbCode.indexOf("export async function savePartialGuestAnalysis");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = dbCode.substring(fnStart, fnStart + 1000);
    expect(fnBody).not.toContain("status: \"completed\"");
    expect(fnBody).toContain("analysisJson");
  });

  it("should import savePartialAnalysis in routers.ts", () => {
    expect(routersCode).toContain("savePartialAnalysis");
  });

  it("should import savePartialGuestAnalysis in routers.ts", () => {
    expect(routersCode).toContain("savePartialGuestAnalysis");
  });

  it("should save partial results with _stage: 'core' after Stage 1 in authenticated analyze", () => {
    // Find the analyze procedure
    const analyzeStart = routersCode.indexOf("analyze: protectedProcedure");
    expect(analyzeStart).toBeGreaterThan(-1);
    const analyzeSection = routersCode.substring(analyzeStart, analyzeStart + 40000);
    
    // Should contain the partial save with _stage: 'core'
    expect(analyzeSection).toContain("_stage: \"core\"");
    expect(analyzeSection).toContain("savePartialAnalysis");
  });

  it("should save partial results with _stage: 'core' after Stage 1 in guest analyze", () => {
    // Find the guest analyze procedure
    const guestAnalyzeStart = routersCode.indexOf("analyze: publicProcedure");
    expect(guestAnalyzeStart).toBeGreaterThan(-1);
    const guestSection = routersCode.substring(guestAnalyzeStart, guestAnalyzeStart + 40000);
    
    expect(guestSection).toContain("_stage: \"core\"");
    expect(guestSection).toContain("savePartialGuestAnalysis");
  });

  it("should mark final analysis with _stage: 'complete'", () => {
    // The final save should include _stage: 'complete'
    expect(routersCode).toContain('_stage = "complete"');
  });

  it("should have a 2-minute timeout safety net for authenticated analyze", () => {
    const analyzeStart = routersCode.indexOf("analyze: protectedProcedure");
    const analyzeSection = routersCode.substring(analyzeStart, analyzeStart + 2000);
    expect(analyzeSection).toContain("120_000");
    expect(analyzeSection).toContain("ANALYSIS_TIMEOUT");
  });

  it("should have a 2-minute timeout safety net for guest analyze", () => {
    const guestStart = routersCode.indexOf("analyze: publicProcedure");
    const guestSection = routersCode.substring(guestStart, guestStart + 2000);
    expect(guestSection).toContain("120_000");
    expect(guestSection).toContain("GUEST_ANALYSIS_TIMEOUT");
  });
});

describe("Progressive Analysis — Client Side (ReviewPage)", () => {
  it("should detect partial results via _stage === 'core'", () => {
    expect(reviewPageCode).toContain("_stage");
    expect(reviewPageCode).toContain("hasPartialResults");
  });

  it("should show spinner page only when no partial results available", () => {
    expect(reviewPageCode).toContain("!hasPartialResults");
  });

  it("should show progressive loading banner when hasPartialResults is true", () => {
    expect(reviewPageCode).toContain("hasPartialResults && (");
    // Should show a loading message in Hebrew
    expect(reviewPageCode).toContain("טוען המלצות והשראה");
  });

  it("should still poll for updates every 3 seconds when analyzing", () => {
    expect(reviewPageCode).toContain("refetchInterval");
    expect(reviewPageCode).toContain("3000");
  });
});

describe("Progressive Analysis — Client Side (GuestReview)", () => {
  it("should detect partial results via _stage === 'core'", () => {
    expect(guestReviewCode).toContain("_stage");
    expect(guestReviewCode).toContain("hasPartialResults");
  });

  it("should show spinner page only when no partial results available", () => {
    expect(guestReviewCode).toContain("!hasPartialResults");
  });

  it("should show progressive loading banner when hasPartialResults is true", () => {
    expect(guestReviewCode).toContain("hasPartialResults && (");
    expect(guestReviewCode).toContain("טוען המלצות והשראה");
  });

  it("should still poll for updates every 2 seconds when analyzing", () => {
    expect(guestReviewCode).toContain("refetchInterval");
    expect(guestReviewCode).toContain("2000");
  });
});
