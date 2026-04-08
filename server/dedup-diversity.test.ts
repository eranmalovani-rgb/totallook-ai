import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routersSource = fs.readFileSync(
  path.resolve(__dirname, "routers.ts"),
  "utf-8"
);

describe("Fallback Shopping Links Diversity", () => {
  it("should have 5 different store pools in FALLBACK_STORE_POOLS", () => {
    const poolMatches = routersSource.match(/FALLBACK_STORE_POOLS\s*=\s*\[([\s\S]*?)\];\s*let fallbackPoolIndex/);
    expect(poolMatches).toBeTruthy();
    // Count the inner arrays (each pool is [...])
    const poolContent = poolMatches![1];
    const innerArrays = poolContent.match(/\[\s*\{/g);
    expect(innerArrays).toBeTruthy();
    expect(innerArrays!.length).toBeGreaterThanOrEqual(5);
  });

  it("should have at least 3 stores per pool", () => {
    const poolMatches = routersSource.match(/FALLBACK_STORE_POOLS\s*=\s*\[([\s\S]*?)\];\s*let fallbackPoolIndex/);
    expect(poolMatches).toBeTruthy();
    const poolContent = poolMatches![1];
    // Each store entry has { name: "...", url: ... }
    const storeNames = poolContent.match(/name:\s*"([^"]+)"/g);
    expect(storeNames).toBeTruthy();
    // At least 15 stores across 5 pools (3 per pool)
    expect(storeNames!.length).toBeGreaterThanOrEqual(15);
  });

  it("should have no duplicate stores across all pools", () => {
    const poolMatches = routersSource.match(/FALLBACK_STORE_POOLS\s*=\s*\[([\s\S]*?)\];\s*let fallbackPoolIndex/);
    expect(poolMatches).toBeTruthy();
    const poolContent = poolMatches![1];
    const storeNames = poolContent.match(/name:\s*"([^"]+)"/g)!.map(m => m.replace(/name:\s*"/, "").replace(/"$/, ""));
    const uniqueNames = new Set(storeNames);
    expect(uniqueNames.size).toBe(storeNames.length);
  });

  it("buildFallbackShoppingLinks should rotate through pools via fallbackPoolIndex", () => {
    // Verify the function uses fallbackPoolIndex to rotate
    const fnMatch = routersSource.match(/function buildFallbackShoppingLinks[\s\S]*?^}/m);
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("fallbackPoolIndex");
    expect(fnBody).toContain("FALLBACK_STORE_POOLS");
    expect(fnBody).toContain("fallbackPoolIndex++");
  });
});

describe("Global Dedup in sanitizeRecommendationsPayload", () => {
  it("should track store domains per improvement (max 1 same store per improvement)", () => {
    // Find the sanitizeRecommendationsPayload function
    const fnStart = routersSource.indexOf("function sanitizeRecommendationsPayload(");
    expect(fnStart).toBeGreaterThan(0);
    const fnSection = routersSource.substring(fnStart, fnStart + 5000);
    
    // Should have per-improvement store tracking
    expect(fnSection).toContain("impStoreDomains");
    expect(fnSection).toContain("impStoreDomains.has(domain)");
  });

  it("should limit same store to max 2 appearances globally across all improvements", () => {
    const fnStart = routersSource.indexOf("function sanitizeRecommendationsPayload(");
    expect(fnStart).toBeGreaterThan(0);
    const fnSection = routersSource.substring(fnStart, fnStart + 5000);
    
    // Should have global store domain count tracking
    expect(fnSection).toContain("globalStoreDomainCounts");
    // Should check if store appears >= 2 times
    expect(fnSection).toContain(">= 2");
  });

  it("should extract store domain from URL for dedup", () => {
    const fnStart = routersSource.indexOf("function sanitizeRecommendationsPayload(");
    expect(fnStart).toBeGreaterThan(0);
    const fnSection = routersSource.substring(fnStart, fnStart + 5000);
    
    // Should have extractStoreDomain helper
    expect(fnSection).toContain("extractStoreDomain");
    expect(fnSection).toContain("hostname");
  });

  it("should reset fallbackPoolIndex at the start of each analysis", () => {
    const fnStart = routersSource.indexOf("function sanitizeRecommendationsPayload(");
    expect(fnStart).toBeGreaterThan(0);
    const fnSection = routersSource.substring(fnStart, fnStart + 5000);
    
    // Should reset the pool index for consistent rotation per analysis
    expect(fnSection).toContain("fallbackPoolIndex = 0");
  });

  it("should deduplicate by both URL and title across improvements", () => {
    const fnStart = routersSource.indexOf("function sanitizeRecommendationsPayload(");
    expect(fnStart).toBeGreaterThan(0);
    const fnSection = routersSource.substring(fnStart, fnStart + 5000);
    
    expect(fnSection).toContain("globalSeenUrls");
    expect(fnSection).toContain("globalSeenTitles");
  });

  it("should apply store domain dedup to fallback refill links too", () => {
    const fnStart = routersSource.indexOf("function sanitizeRecommendationsPayload(");
    expect(fnStart).toBeGreaterThan(0);
    const fnSection = routersSource.substring(fnStart, fnStart + 5000);
    
    // The fallback refill section should also check store domains
    const refillSection = fnSection.substring(fnSection.indexOf("Post-dedup refill"));
    expect(refillSection).toContain("impStoreDomains.has(domain)");
    expect(refillSection).toContain("globalStoreDomainCounts");
  });
});

describe("Stage 1 Optimization", () => {
  it("should use maxTokens 2200 for Stage 1 core analysis (both auth and guest)", () => {
    // Find both analyze procedures — need larger window since procedures are huge
    const authAnalyze = routersSource.indexOf("analyze: protectedProcedure");
    const guestAnalyze = routersSource.indexOf("analyze: publicProcedure");
    expect(authAnalyze).toBeGreaterThan(0);
    expect(guestAnalyze).toBeGreaterThan(0);
    
    // Use 10K window to capture the maxTokens line
    const authSection = routersSource.substring(authAnalyze, authAnalyze + 10000);
    const guestSection = routersSource.substring(guestAnalyze, guestAnalyze + 10000);
    
    expect(authSection).toContain("maxTokens: 2200");
    expect(guestSection).toContain("maxTokens: 2200");
  });

  it("should use 800ms retry delay instead of 1500ms", () => {
    // Check both analyze procedures use faster retry — need larger window
    const authAnalyze = routersSource.indexOf("analyze: protectedProcedure");
    const guestAnalyze = routersSource.indexOf("analyze: publicProcedure");
    
    const authSection = routersSource.substring(authAnalyze, authAnalyze + 10000);
    const guestSection = routersSource.substring(guestAnalyze, guestAnalyze + 10000);
    
    expect(authSection).toContain("800 * Math.pow(2, attempt - 1)");
    expect(guestSection).toContain("800 * Math.pow(2, attempt - 1)");
    
    // Should NOT have old 1500ms delay
    expect(authSection).not.toContain("1500 * Math.pow");
    expect(guestSection).not.toContain("1500 * Math.pow");
  });
});
