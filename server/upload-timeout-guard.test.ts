import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const uploadCode = fs.readFileSync(
  path.join(__dirname, "../client/src/pages/Upload.tsx"),
  "utf-8"
);

const guestUploadCode = fs.readFileSync(
  path.join(__dirname, "../client/src/pages/GuestUpload.tsx"),
  "utf-8"
);

const routersCode = fs.readFileSync(
  path.join(__dirname, "./routers.ts"),
  "utf-8"
);

describe("Upload.tsx — Analyze timeout and redirect guard", () => {
  it("uses Promise.race with a timeout for analyzeMutation", () => {
    expect(uploadCode).toContain("Promise.race");
    expect(uploadCode).toContain("setTimeout(resolve, 10_000)");
  });

  it("navigates to review page after analyze (even on timeout)", () => {
    const raceIdx = uploadCode.indexOf("Promise.race");
    const navigateIdx = uploadCode.indexOf("navigate(`/review/", raceIdx);
    expect(raceIdx).toBeGreaterThan(-1);
    expect(navigateIdx).toBeGreaterThan(raceIdx);
  });

  it("catches analyze errors and navigates anyway", () => {
    expect(uploadCode).toContain("Analyze call error (navigating anyway)");
  });

  it("prevents onboarding redirect during upload or analyze", () => {
    // The useEffect should check uploading || analyzing before redirecting
    expect(uploadCode).toContain("if (uploading || analyzing) return;");
  });

  it("includes uploading and analyzing in useEffect dependency array", () => {
    // Find the onboarding redirect useEffect
    const effectIdx = uploadCode.indexOf("if (uploading || analyzing) return;");
    expect(effectIdx).toBeGreaterThan(-1);
    // The dependency array should include uploading and analyzing
    const afterEffect = uploadCode.slice(effectIdx, effectIdx + 500);
    expect(afterEffect).toContain("uploading");
    expect(afterEffect).toContain("analyzing");
  });
});

describe("GuestUpload.tsx — Analyze timeout", () => {
  it("uses Promise.race with a timeout for analyzeMutation", () => {
    expect(guestUploadCode).toContain("Promise.race");
    expect(guestUploadCode).toContain("setTimeout(resolve, 10_000)");
  });

  it("navigates to guest review page after analyze", () => {
    const raceIdx = guestUploadCode.indexOf("Promise.race");
    const navigateIdx = guestUploadCode.indexOf("navigate(`/guest/review/", raceIdx);
    expect(raceIdx).toBeGreaterThan(-1);
    expect(navigateIdx).toBeGreaterThan(raceIdx);
  });

  it("catches analyze errors and navigates anyway (unless limit)", () => {
    expect(guestUploadCode).toContain("Analyze call error (navigating anyway)");
  });
});

describe("Server — Analyze mutation logging", () => {
  it("has logging at the start of analyze mutation", () => {
    expect(routersCode).toContain("[Analyze] Start reviewId=");
  });

  it("has logging for idempotent returns", () => {
    expect(routersCode).toContain("[Analyze] Already analyzing");
    expect(routersCode).toContain("[Analyze] Already completed");
  });

  it("has logging before returning from fire-and-forget", () => {
    expect(routersCode).toContain("[Analyze] Marked as analyzing, returning immediately");
  });
});
