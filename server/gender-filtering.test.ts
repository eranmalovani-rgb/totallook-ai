import { describe, it, expect } from "vitest";
import { pickInfluencersForProfile, buildRecommendationsPromptFromCore, buildFashionPrompt } from "./routers";
import { autoMatchInfluencers, type MatchProfile } from "../shared/influencerMatcher";
import { POPULAR_INFLUENCERS } from "../shared/fashionTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maleProfile(overrides: Record<string, string> = {}) {
  return {
    ageRange: "25-34",
    gender: "male",
    budgetLevel: "mid-range",
    stylePreference: "smart-casual",
    country: "IL",
    ...overrides,
  };
}

function femaleProfile(overrides: Record<string, string> = {}) {
  return {
    ageRange: "25-34",
    gender: "female",
    budgetLevel: "mid-range",
    stylePreference: "classic",
    country: "IL",
    ...overrides,
  };
}

// ─── pickInfluencersForProfile ──────────────────────────────────────────────

describe("pickInfluencersForProfile gender filtering", () => {
  it("returns only male or unisex influencers for male gender", () => {
    const picked = pickInfluencersForProfile("male", 10);
    for (const inf of picked) {
      const known = POPULAR_INFLUENCERS.find((p) => p.name === inf.name);
      expect(known).toBeDefined();
      expect(["male", "unisex"]).toContain(known!.gender);
    }
    expect(picked.length).toBeGreaterThan(0);
  });

  it("returns only female or unisex influencers for female gender", () => {
    const picked = pickInfluencersForProfile("female", 10);
    for (const inf of picked) {
      const known = POPULAR_INFLUENCERS.find((p) => p.name === inf.name);
      expect(known).toBeDefined();
      expect(["female", "unisex"]).toContain(known!.gender);
    }
    expect(picked.length).toBeGreaterThan(0);
  });

  it("returns all genders when gender is not specified", () => {
    const picked = pickInfluencersForProfile(null, 100);
    // Should include male, female, and unisex since no gender filter
    expect(picked.length).toBe(Math.max(1, 100));
    const genders = new Set(picked.map(p => {
      const known = POPULAR_INFLUENCERS.find(inf => inf.name === p.name);
      return known?.gender;
    }));
    // Should have more than one gender type
    expect(genders.size).toBeGreaterThan(1);
  });

  it("returns all genders when gender is empty string", () => {
    const picked = pickInfluencersForProfile("", 100);
    expect(picked.length).toBe(Math.max(1, 100));
  });
});

// ─── autoMatchInfluencers ───────────────────────────────────────────────────

describe("autoMatchInfluencers gender filtering", () => {
  it("never returns female influencers for male profile", () => {
    const profile: MatchProfile = { gender: "male", ageRange: "25-34", stylePreference: "streetwear" };
    const matched = autoMatchInfluencers(profile, 5, "IL");
    for (const inf of matched) {
      expect(inf.gender).not.toBe("female");
    }
    expect(matched.length).toBeGreaterThan(0);
  });

  it("never returns male influencers for female profile", () => {
    const profile: MatchProfile = { gender: "female", ageRange: "25-34", stylePreference: "classic" };
    const matched = autoMatchInfluencers(profile, 5, "IL");
    for (const inf of matched) {
      expect(inf.gender).not.toBe("male");
    }
    expect(matched.length).toBeGreaterThan(0);
  });

  it("does not include wrong-gender influencers even with large count", () => {
    const maleMatched = autoMatchInfluencers({ gender: "male" }, 20);
    const femaleMatched = autoMatchInfluencers({ gender: "female" }, 20);
    // Male results should never have female-only influencers
    for (const inf of maleMatched) {
      expect(inf.gender).not.toBe("female");
    }
    // Female results should never have male-only influencers
    for (const inf of femaleMatched) {
      expect(inf.gender).not.toBe("male");
    }
  });

  it("disqualifies wrong-gender influencers with -100 score", () => {
    const profile: MatchProfile = { gender: "male", stylePreference: "streetwear" };
    const matched = autoMatchInfluencers(profile, 100);
    const femaleInResults = matched.filter((inf) => inf.gender === "female");
    expect(femaleInResults.length).toBe(0);
  });
});

// ─── Stage 1 prompt gender constraints ──────────────────────────────────────

describe("Stage 1 prompt gender constraints for influencers", () => {
  it("includes MALE influencer constraint for male users (Hebrew)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, maleProfile(), [], "he");
    expect(prompt).toContain("ONLY suggest and reference MALE or UNISEX fashion influencers");
    expect(prompt).toContain("Do NOT mention any female fashion influencers");
  });

  it("includes FEMALE influencer constraint for female users (Hebrew)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, femaleProfile(), [], "he");
    expect(prompt).toContain("ONLY suggest and reference FEMALE or UNISEX fashion influencers");
    expect(prompt).toContain("Do NOT mention any male fashion influencers");
  });

  it("includes MALE influencer constraint for male users (English)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, maleProfile(), [], "en");
    expect(prompt).toContain("ONLY suggest and reference MALE or UNISEX fashion influencers");
  });

  it("includes FEMALE influencer constraint for female users (English)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, femaleProfile(), [], "en");
    expect(prompt).toContain("ONLY suggest and reference FEMALE or UNISEX fashion influencers");
  });

  it("does NOT include gender constraint when no profile", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).not.toContain("ONLY suggest and reference MALE");
    expect(prompt).not.toContain("ONLY suggest and reference FEMALE");
  });
});

// ─── Stage 2 prompt gender constraints ──────────────────────────────────────

describe("Stage 2 prompt gender constraints for influencers", () => {
  it("includes male gender line for male users (Hebrew)", () => {
    const prompt = buildRecommendationsPromptFromCore("he", undefined, "male");
    expect(prompt).toContain("גבר");
    expect(prompt).toContain("גבריות או יוניסקס");
  });

  it("includes female gender line for female users (Hebrew)", () => {
    const prompt = buildRecommendationsPromptFromCore("he", undefined, "female");
    expect(prompt).toContain("אישה");
    expect(prompt).toContain("נשיות או יוניסקס");
  });

  it("includes male gender line for male users (English)", () => {
    const prompt = buildRecommendationsPromptFromCore("en", undefined, "male");
    expect(prompt).toContain("male or unisex only");
  });

  it("includes female gender line for female users (English)", () => {
    const prompt = buildRecommendationsPromptFromCore("en", undefined, "female");
    expect(prompt).toContain("female or unisex only");
  });

  it("includes gender-specific verb forms for female (Hebrew)", () => {
    const prompt = buildRecommendationsPromptFromCore("he", undefined, "female");
    expect(prompt).toContain("החליפי");
    expect(prompt).toContain("שקלי");
  });

  it("includes gender-specific verb forms for male (Hebrew)", () => {
    const prompt = buildRecommendationsPromptFromCore("he", undefined, "male");
    expect(prompt).toContain("החלף");
    expect(prompt).toContain("שקול");
  });
});

// ─── POPULAR_INFLUENCERS data integrity ─────────────────────────────────────

describe("POPULAR_INFLUENCERS data integrity", () => {
  it("every influencer has a valid gender field", () => {
    for (const inf of POPULAR_INFLUENCERS) {
      expect(["male", "female", "unisex"]).toContain(inf.gender);
    }
  });

  it("has at least 3 male influencers", () => {
    const males = POPULAR_INFLUENCERS.filter((inf) => inf.gender === "male");
    expect(males.length).toBeGreaterThanOrEqual(3);
  });

  it("has at least 3 female influencers", () => {
    const females = POPULAR_INFLUENCERS.filter((inf) => inf.gender === "female");
    expect(females.length).toBeGreaterThanOrEqual(3);
  });

  it("every influencer has ageRanges array", () => {
    for (const inf of POPULAR_INFLUENCERS) {
      expect(Array.isArray(inf.ageRanges)).toBe(true);
      expect(inf.ageRanges.length).toBeGreaterThan(0);
    }
  });

  it("every influencer has styleTags array", () => {
    for (const inf of POPULAR_INFLUENCERS) {
      expect(Array.isArray(inf.styleTags)).toBe(true);
      expect(inf.styleTags.length).toBeGreaterThan(0);
    }
  });

  it("every influencer has budgetLevels array", () => {
    for (const inf of POPULAR_INFLUENCERS) {
      expect(Array.isArray(inf.budgetLevels)).toBe(true);
      expect(inf.budgetLevels.length).toBeGreaterThan(0);
    }
  });
});
