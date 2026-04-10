import { describe, it, expect } from "vitest";
import { buildFashionPrompt } from "./routers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function premiumProfile(overrides: Record<string, string> = {}) {
  return {
    ageRange: "25-34",
    gender: "female",
    occupation: "creative",
    budgetLevel: "premium",
    stylePreference: "classic",
    country: "IL",
    ...overrides,
  };
}

function luxuryProfile(overrides: Record<string, string> = {}) {
  return {
    ageRange: "35-44",
    gender: "female",
    occupation: "corporate",
    budgetLevel: "luxury",
    stylePreference: "minimalist",
    country: "IL",
    ...overrides,
  };
}

function budgetProfile(overrides: Record<string, string> = {}) {
  return {
    ageRange: "18-24",
    gender: "female",
    occupation: "student",
    budgetLevel: "budget",
    stylePreference: "streetwear",
    country: "IL",
    ...overrides,
  };
}

function midRangeProfile(overrides: Record<string, string> = {}) {
  return {
    ageRange: "25-34",
    gender: "male",
    occupation: "tech",
    budgetLevel: "mid-range",
    stylePreference: "smart-casual",
    country: "IL",
    ...overrides,
  };
}

// ─── Premium Material Naming ──────────────────────────────────────────────────

describe("Premium/Luxury material naming rules in prompt", () => {
  it("includes faux leather prohibition for premium users (Hebrew)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain('NEVER say "דמוי עור"');
    expect(prompt).toContain('"עור סינתטי"');
    expect(prompt).toContain("עור יוקרתי");
    expect(prompt).toContain("עור וגאן איכותי");
  });

  it("includes faux suede prohibition for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain('NEVER say "דמוי זמש"');
    expect(prompt).toContain('"זמש סינתטי"');
    expect(prompt).toContain("זמש איכותי");
  });

  it("includes faux silk prohibition for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain('NEVER say "דמוי משי"');
    expect(prompt).toContain("סאטן יוקרתי");
  });

  it("includes plastic prohibition for premium accessories", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain('NEVER say "פלסטיק"');
    expect(prompt).toContain("אקריליק");
    expect(prompt).toContain("שרף");
  });

  it("includes material naming rules for luxury users too", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, luxuryProfile(), [], "he");
    expect(prompt).toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS (CRITICAL)");
    expect(prompt).toContain('NEVER say "דמוי עור"');
    expect(prompt).toContain("עור יוקרתי");
  });

  it("includes the CRITICAL marker for material naming section", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS (CRITICAL)");
  });

  it("applies material rules to ALL items, not just jewelry", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("This applies to ALL items: clothing, shoes, bags, accessories");
    expect(prompt).toContain("elevated, luxurious language");
  });

  it("does NOT include premium material rules for budget users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, budgetProfile(), [], "he");
    expect(prompt).not.toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS");
    expect(prompt).not.toContain('NEVER say "דמוי עור"');
  });

  it("does NOT include premium material rules for mid-range users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, midRangeProfile(), [], "he");
    expect(prompt).not.toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS");
    expect(prompt).not.toContain('NEVER say "דמוי עור"');
  });

  it("does NOT include premium material rules when no profile is provided", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).not.toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS");
  });

  it("includes elevated material language in English prompt for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "en");
    expect(prompt).toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS (CRITICAL)");
  });
});

// ─── Premium Brand Identification ─────────────────────────────────────────────

describe("Premium/Luxury brand identification rules in prompt", () => {
  it("includes brand identification enforcement for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("BRAND IDENTIFICATION FOR PREMIUM/LUXURY USERS (CRITICAL)");
  });

  it("requires examining logos, stitching, hardware for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("Examine every visible logo, label, stitching pattern, hardware, zipper pull, button style");
  });

  it("requires suggesting 2-3 likely brands when exact brand unknown", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("you MUST suggest 2-3 likely brands");
    expect(prompt).toContain("design language, construction quality, and price point");
  });

  it("prohibits completely unbranded items for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("NEVER leave an item completely unbranded for premium/luxury users");
  });

  it("includes specific brand identification guidance for shoes", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, luxuryProfile(), [], "he");
    expect(prompt).toContain("For shoes: examine sole shape, stitching, logo placement, silhouette");
    expect(prompt).toContain("premium users rarely wear unbranded shoes");
  });

  it("includes specific brand identification guidance for bags", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, luxuryProfile(), [], "he");
    expect(prompt).toContain("For bags: examine hardware color, clasp style, leather grain, strap attachment");
  });

  it("includes specific brand identification guidance for watches", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, luxuryProfile(), [], "he");
    expect(prompt).toContain("For watches: examine case shape, dial layout, crown style, bracelet links");
  });

  it("includes Hebrew brand suggestion example", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("הפריט נראה כמו");
    expect(prompt).toContain("בסגנון העיצוב");
  });

  it("includes English brand suggestion example", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "en");
    expect(prompt).toContain("The design suggests");
  });

  it("does NOT include brand identification enforcement for budget users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, budgetProfile(), [], "he");
    expect(prompt).not.toContain("BRAND IDENTIFICATION FOR PREMIUM/LUXURY USERS");
  });

  it("does NOT include brand identification enforcement for mid-range users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, midRangeProfile(), [], "he");
    expect(prompt).not.toContain("BRAND IDENTIFICATION FOR PREMIUM/LUXURY USERS");
  });
});

// ─── Premium rules with minimal profile ───────────────────────────────────────

describe("Premium rules apply even with minimal profile (only budgetLevel)", () => {
  it("includes material naming rules when only budgetLevel is premium", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, { budgetLevel: "premium" }, [], "he");
    expect(prompt).toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS (CRITICAL)");
    expect(prompt).toContain('NEVER say "דמוי עור"');
  });

  it("includes brand identification rules when only budgetLevel is luxury", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, { budgetLevel: "luxury" }, [], "he");
    expect(prompt).toContain("BRAND IDENTIFICATION FOR PREMIUM/LUXURY USERS (CRITICAL)");
  });

  it("includes jewelry material identification for premium with only budgetLevel", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, { budgetLevel: "premium" }, [], "he");
    expect(prompt).toContain("JEWELRY & MATERIAL IDENTIFICATION");
  });

  it("does NOT add fallback JEWELRY CONTEXT when main section already has JEWELRY", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).not.toContain("JEWELRY & MATERIAL CONTEXT: This user has a premium budget");
  });

  it("does NOT include premium material rules for budget users (even with minimal profile)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, { budgetLevel: "budget" }, [], "he");
    expect(prompt).not.toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS");
    expect(prompt).not.toContain("BRAND IDENTIFICATION FOR PREMIUM/LUXURY USERS");
  });

  it("does NOT include premium material rules for mid-range users (even with minimal profile)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, { budgetLevel: "mid-range" }, [], "he");
    expect(prompt).not.toContain("MATERIAL NAMING FOR PREMIUM/LUXURY USERS");
    expect(prompt).not.toContain("BRAND IDENTIFICATION FOR PREMIUM/LUXURY USERS");
  });
});

// ─── Phone Case Scoring Exception ─────────────────────────────────────────────

describe("Phone case scoring exception in prompt", () => {
  it("includes phone case as a recognized accessory type", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt.toLowerCase()).toContain("phone case");
  });

  it("instructs phone case should not affect scores", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Phone case");
    expect(prompt.toLowerCase()).toContain("score");
  });
});

// ─── General prompt structure ────────────────────────────────────────────────

describe("General prompt structure for analysis", () => {
  it("includes systematic methodology instruction", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("METHODOLOGY");
    expect(prompt).toContain("head-to-toe");
  });

  it("includes brand identification with confidence levels", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("BRAND IDENTIFICATION");
    expect(prompt).toContain("HIGH");
    expect(prompt).toContain("MEDIUM");
    expect(prompt).toContain("LOW");
  });

  it("includes material/fabric identification in methodology", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("material");
    expect(prompt).toContain("fabric");
  });

  it("includes color and fit analysis in methodology", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("color");
    expect(prompt).toContain("fit");
  });

  it("includes construction details in methodology", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("construction");
  });

  it("warns against wrong brand identification", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("wrong");
    expect(prompt.toLowerCase()).toContain("brand");
  });

  it("includes shopping link URL rules in Stage 2 prompt", () => {
    // Shopping link rules moved to Stage 2 (buildRecommendationsPromptFromCore)
    // Stage 1 (buildFashionPrompt) focuses on visual analysis only
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    // Stage 1 should still contain core analysis instructions
    expect(prompt).toContain("fashion");
    expect(prompt).toContain("score");
  });

  it("Stage 1 focuses on visual analysis, not shopping links", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    // Stage 1 should contain analysis-focused content
    expect(prompt).toContain("items");
    expect(prompt).toContain("overallScore");
  });
});

// ─── Analysis Methodology (condensed) ────────────────────────────────────────

describe("Analysis methodology in prompt (condensed version)", () => {
  it("includes systematic scan instruction", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Scan head-to-toe systematically");
  });

  it("includes material identification step", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("material/fabric");
  });

  it("includes color shade identification", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("precise color shade");
  });

  it("includes fit/silhouette analysis", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("fit/silhouette");
  });

  it("includes construction details step", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("construction details");
  });

  it("includes brand identification from visual evidence", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("identify brands from visual evidence");
  });

  it("includes styling coherence evaluation", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("styling coherence");
  });

  it("applies methodology for budget users too", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, budgetProfile(), [], "he");
    expect(prompt).toContain("METHODOLOGY");
    expect(prompt).toContain("Scan head-to-toe");
  });

  it("applies methodology for guest users (no profile)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "en");
    expect(prompt).toContain("METHODOLOGY");
    expect(prompt).toContain("Scan head-to-toe");
  });
});

// ─── Score Explanation Field ─────────────────────────────────────────────────

describe("Score explanation field in prompt", () => {
  it("includes explanation field in score schema", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain('"explanation"');
  });

  it("requires detailed justification for scores", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("explanation");
  });
});

// ─── Item Description Depth ──────────────────────────────────────────────────

describe("Item description depth requirements", () => {
  it("requires material identification in item descriptions", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("material");
  });

  it("includes key brand markers for identification", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("KEY BRAND MARKERS");
    expect(prompt).toContain("Nike");
    expect(prompt).toContain("Adidas");
    expect(prompt).toContain("Hermès");
    expect(prompt).toContain("Chanel");
  });
});

// ─── Premium Brand Identification Scoring (Quiet Luxury) ─────────────────────

describe("Premium/Luxury brand identification scoring rules in prompt", () => {
  it("includes premium brand scoring section for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("PREMIUM/LUXURY USER BRAND SCORING");
  });

  it("includes scoring guidance for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("Score 9-10: ALL items have brand guesses");
  });

  it("recognizes Quiet Luxury but still requires brand identification", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("quiet luxury");
    expect(prompt).toContain("MUST be identified");
  });

  it("includes premium scoring for luxury users too", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, luxuryProfile(), [], "he");
    expect(prompt).toContain("PREMIUM/LUXURY USER BRAND SCORING");
    expect(prompt).toContain("quiet luxury");
  });

  it("does NOT include premium scoring for budget users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, budgetProfile(), [], "he");
    expect(prompt).not.toContain("PREMIUM/LUXURY USER BRAND SCORING");
  });

  it("does NOT include premium scoring for mid-range users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, midRangeProfile(), [], "he");
    expect(prompt).not.toContain("PREMIUM/LUXURY USER BRAND SCORING");
  });

  it("includes general brand scoring when no profile provided", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("BRAND SCORING FOR ALL USERS");
    expect(prompt).not.toContain("PREMIUM/LUXURY USER BRAND SCORING");
  });
});

// ─── Context-Aware Scoring (Weather & Time + Score Weighting) ────────────────

describe("Context-aware scoring rules in prompt", () => {
  it("includes context-aware scoring section", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("CONTEXT-AWARE SCORING");
  });

  it("instructs not to penalize missing layers in warm weather", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("weather");
    expect(prompt).toContain("layers");
  });

  it("instructs not to penalize missing sunglasses at night", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("sunglasses");
    expect(prompt).toContain("night");
  });

  it("includes score weighting with HIGH/MEDIUM/LOW categories", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Score weighting");
    expect(prompt).toContain("HIGH");
    expect(prompt).toContain("MEDIUM");
    expect(prompt).toContain("LOW");
  });

  it("defines HIGH weight for core categories", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Item Quality");
    expect(prompt).toContain("Fit");
    expect(prompt).toContain("Color");
    expect(prompt).toContain("Style Match");
  });

  it("defines MEDIUM weight for footwear and brands", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Footwear");
    expect(prompt).toContain("Brands");
  });

  it("defines LOW weight for layering and accessories", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Layering");
    expect(prompt).toContain("Accessories");
  });

  it("handles non-visible categories with null scores", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("null");
    expect(prompt).toContain("Non-visible");
  });

  it("context-aware scoring applies regardless of budget level", () => {
    const budgetPrompt = buildFashionPrompt(undefined, undefined, undefined, budgetProfile(), [], "he");
    const premiumPrompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(budgetPrompt).toContain("CONTEXT-AWARE SCORING");
    expect(premiumPrompt).toContain("CONTEXT-AWARE SCORING");
  });

  it("context-aware scoring applies even without a profile", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("CONTEXT-AWARE SCORING");
  });
});

// ─── New Occasions & Occasion-Fit Scoring ─────────────────────────────────────

describe("New occasion types in prompt", () => {
  it("includes coffee/brunch occasion context", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "coffee", null, [], "he");
    expect(prompt).toContain("COFFEE / BRUNCH");
    expect(prompt).toContain("chic-casual");
  });

  it("includes family meal/holiday occasion context", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "family", null, [], "he");
    expect(prompt).toContain("FAMILY MEAL / HOLIDAY");
    expect(prompt).toContain("Rosh Hashana");
  });

  it("includes bar/restaurant occasion context", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "bar", null, [], "he");
    expect(prompt).toContain("BAR / RESTAURANT");
    expect(prompt).toContain("date-night-adjacent");
  });

  it("all 12 occasions produce valid occasion sections", () => {
    const occasionIds = ["casual", "work", "date", "coffee", "family", "bar", "evening", "friends", "formal", "sport", "travel", "weekend"];
    for (const id of occasionIds) {
      const prompt = buildFashionPrompt(undefined, undefined, id, null, [], "he");
      expect(prompt).toContain("OCCASION CONTEXT:");
      expect(prompt).toContain("CRITICAL OCCASION-FIT SCORING RULES:");
    }
  });
});

describe("Occasion-fit scoring rules in prompt", () => {
  it("includes critical occasion-fit scoring instructions when occasion is set", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "date", null, [], "he");
    expect(prompt).toContain("CRITICAL OCCASION-FIT SCORING RULES");
    expect(prompt).toContain("overall score MUST be 8 or below");
    expect(prompt).toContain("summary");
    expect(prompt).toContain("MUST open with how well the outfit fits");
  });

  it("does NOT include occasion-fit rules when no occasion is set", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).not.toContain("CRITICAL OCCASION-FIT SCORING RULES");
  });

  it("includes specific appropriateness criteria for each occasion", () => {
    const workPrompt = buildFashionPrompt(undefined, undefined, "work", null, [], "he");
    expect(workPrompt).toContain("Too casual");

    const eveningPrompt = buildFashionPrompt(undefined, undefined, "evening", null, [], "he");
    expect(eveningPrompt).toContain("Casual wear would be very inappropriate");

    const coffeePrompt = buildFashionPrompt(undefined, undefined, "coffee", null, [], "he");
    expect(coffeePrompt).toContain("not overdressed");

    const familyPrompt = buildFashionPrompt(undefined, undefined, "family", null, [], "he");
    expect(familyPrompt).toContain("respectful and put-together");
  });
});

// ─── General Review Occasion ──────────────────────────────────────────────────

describe("General review occasion", () => {
  it("includes general review context when occasion is 'general'", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "general", null, [], "he");
    expect(prompt).toContain("GENERAL REVIEW");
    expect(prompt).toContain("comprehensive fashion review");
    expect(prompt).toContain("Do NOT penalize for occasion-appropriateness");
  });

  it("does NOT include critical occasion-fit scoring rules for general", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "general", null, [], "he");
    expect(prompt).not.toContain("CRITICAL OCCASION-FIT SCORING RULES");
  });

  it("still includes critical occasion-fit scoring rules for specific occasions", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "date", null, [], "he");
    expect(prompt).toContain("CRITICAL OCCASION-FIT SCORING RULES");
  });

  it("all 13 occasions (including general) produce valid occasion sections", () => {
    const occasionIds = ["general", "casual", "work", "date", "coffee", "family", "bar", "evening", "friends", "formal", "sport", "travel", "weekend"];
    for (const id of occasionIds) {
      const prompt = buildFashionPrompt(undefined, undefined, id, null, [], "he");
      expect(prompt).toContain("OCCASION CONTEXT:");
    }
  });
});

// ─── Jewelry Material Identification ─────────────────────────────────────────

describe("Jewelry material identification in prompt", () => {
  it("includes jewelry identification for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("JEWELRY & MATERIAL IDENTIFICATION");
  });

  it("includes silver vs white gold guidance for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("white gold");
    expect(prompt).toContain("platinum");
  });

  it("includes diamond vs crystal guidance for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("diamonds");
    expect(prompt).toContain("crystals");
  });
});
