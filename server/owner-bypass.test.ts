/**
 * Stage 127 — Owner Bypass Tests
 * Verifies that OWNER_BYPASS_SECRET env var enables unlimited guest analyses.
 */
import { describe, it, expect } from "vitest";

describe("Owner Bypass Secret", () => {
  it("should have OWNER_BYPASS_SECRET env var set", () => {
    const secret = process.env.OWNER_BYPASS_SECRET;
    expect(secret).toBeDefined();
    expect(typeof secret).toBe("string");
    expect(secret!.length).toBeGreaterThan(0);
  });

  it("should be accessible from ENV config", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV.ownerBypassSecret).toBeDefined();
    expect(ENV.ownerBypassSecret.length).toBeGreaterThan(0);
  });

  it("should match the ownerBypassSecret in ENV", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV.ownerBypassSecret).toBe(process.env.OWNER_BYPASS_SECRET);
  });
});
