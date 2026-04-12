/**
 * Tests for Stage 113b: Budget tier upgrade helpers
 * - getNextBudgetTier: tier progression logic
 * - getBudgetTierLabel: display labels
 * - BUDGET_TIER_ORDER: tier ordering
 */
import { describe, it, expect } from "vitest";
import {
  getNextBudgetTier,
  getBudgetTierLabel,
  BUDGET_TIER_ORDER,
  BUDGET_STORE_MAP,
} from "../shared/fashionTypes";

describe("BUDGET_TIER_ORDER", () => {
  it("should have 4 tiers in correct order", () => {
    expect(BUDGET_TIER_ORDER).toEqual(["budget", "mid-range", "premium", "luxury"]);
    expect(BUDGET_TIER_ORDER.length).toBe(4);
  });
});

describe("getNextBudgetTier", () => {
  it("should upgrade budget to mid-range", () => {
    expect(getNextBudgetTier("budget")).toBe("mid-range");
  });

  it("should upgrade mid-range to premium", () => {
    expect(getNextBudgetTier("mid-range")).toBe("premium");
  });

  it("should upgrade premium to luxury", () => {
    expect(getNextBudgetTier("premium")).toBe("luxury");
  });

  it("should keep luxury at luxury (max tier)", () => {
    expect(getNextBudgetTier("luxury")).toBe("luxury");
  });

  it("should default unknown tier to mid-range", () => {
    expect(getNextBudgetTier("unknown")).toBe("mid-range");
    expect(getNextBudgetTier("")).toBe("mid-range");
    expect(getNextBudgetTier("high")).toBe("mid-range");
  });

  it("should handle each tier having stores in BUDGET_STORE_MAP", () => {
    for (const tier of BUDGET_TIER_ORDER) {
      const stores = BUDGET_STORE_MAP[tier];
      expect(stores).toBeDefined();
      expect(stores.length).toBeGreaterThan(0);
    }
  });

  it("should produce valid next tiers that exist in BUDGET_STORE_MAP", () => {
    for (const tier of BUDGET_TIER_ORDER) {
      const next = getNextBudgetTier(tier);
      expect(BUDGET_STORE_MAP[next]).toBeDefined();
    }
  });
});

describe("getBudgetTierLabel", () => {
  it("should return Hebrew labels", () => {
    expect(getBudgetTierLabel("budget", "he")).toBe("בסיסי");
    expect(getBudgetTierLabel("mid-range", "he")).toBe("בינוני");
    expect(getBudgetTierLabel("premium", "he")).toBe("גבוה");
    expect(getBudgetTierLabel("luxury", "he")).toBe("פרמיום");
  });

  it("should return English labels", () => {
    expect(getBudgetTierLabel("budget", "en")).toBe("Budget");
    expect(getBudgetTierLabel("mid-range", "en")).toBe("Mid-Range");
    expect(getBudgetTierLabel("premium", "en")).toBe("Premium");
    expect(getBudgetTierLabel("luxury", "en")).toBe("Luxury");
  });

  it("should return the raw tier string for unknown tiers", () => {
    expect(getBudgetTierLabel("unknown", "he")).toBe("unknown");
    expect(getBudgetTierLabel("unknown", "en")).toBe("unknown");
  });
});

describe("Store tier upgrade flow", () => {
  it("should produce a full upgrade chain: budget → mid-range → premium → luxury → luxury", () => {
    let tier = "budget";
    const chain: string[] = [tier];
    for (let i = 0; i < 5; i++) {
      tier = getNextBudgetTier(tier);
      chain.push(tier);
    }
    expect(chain).toEqual(["budget", "mid-range", "premium", "luxury", "luxury", "luxury"]);
  });

  it("should always produce stores from the next tier that are different from current tier", () => {
    const tiers = ["budget", "mid-range", "premium"] as const;
    for (const current of tiers) {
      const next = getNextBudgetTier(current);
      const currentStores = new Set(BUDGET_STORE_MAP[current]);
      const nextStores = BUDGET_STORE_MAP[next];
      // At least some stores should be different
      const differentStores = nextStores.filter(s => !currentStores.has(s));
      expect(differentStores.length).toBeGreaterThan(0);
    }
  });
});
