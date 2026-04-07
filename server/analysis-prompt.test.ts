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
    // The material rules are always in Hebrew terms since they're about Hebrew output
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
    // The main profile section includes JEWELRY, so the fallback should NOT add another
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
    expect(prompt).toContain("PHONE CASE");
  });

  it("includes PHONE CASE SCORING EXCEPTION section", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("PHONE CASE SCORING EXCEPTION (CRITICAL)");
  });

  it("requires phone case to be included in items array", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("you MUST still include it as an item");
  });

  it("prohibits phone case from influencing overall score", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("phone case MUST NOT influence the overall score");
  });

  it("prohibits phone case from influencing accessories category score (Hebrew)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain('phone case MUST NOT influence the overall score or the "אקססוריז ותכשיטים" category score');
  });

  it("prohibits phone case from influencing accessories category score (English)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "en");
    expect(prompt).toContain('phone case MUST NOT influence the overall score or the "Accessories & Jewelry" category score');
  });

  it("explains the reason for phone case exception", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("users typically photograph themselves holding the same phone every time");
  });

  it("handles phone case as only accessory scenario", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("If the phone case is the ONLY accessory visible");
    expect(prompt).toContain("set the accessories category score based on the absence of other accessories");
  });

  it("includes accessories reminder about phone case exclusion near scoring section", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain('REMINDER: The "אקססוריז ותכשיטים" category score must NOT factor in the phone case');
  });

  it("includes accessories reminder in English prompt", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "en");
    expect(prompt).toContain('REMINDER: The "Accessories & Jewelry" category score must NOT factor in the phone case');
  });
});

// ─── General Prompt Structure ─────────────────────────────────────────────────

describe("General prompt structure for analysis", () => {
  it("includes scoring rules with 5-10 range", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Scores for VISIBLE categories MUST be between 5 and 10");
  });

  it("includes non-visible category rules with null scores", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("NON-VISIBLE CATEGORY RULES (CRITICAL)");
    expect(prompt).toContain("set its score to null");
  });

  it("includes image quality check guidance", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("IMAGE QUALITY CHECK");
  });

  it("includes 8 score categories in Hebrew", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("איכות הפריטים");
    expect(prompt).toContain("התאמת גזרה");
    expect(prompt).toContain("צבעוניות");
    expect(prompt).toContain("שכבתיות");
    expect(prompt).toContain("אקססוריז ותכשיטים");
    expect(prompt).toContain("נעליים");
    expect(prompt).toContain("זיהוי מותגים");
  });

  it("includes 8 score categories in English", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "en");
    expect(prompt).toContain("Item Quality");
    expect(prompt).toContain("Fit");
    expect(prompt).toContain("Color Palette");
    expect(prompt).toContain("Layering");
    expect(prompt).toContain("Accessories & Jewelry");
    expect(prompt).toContain("Footwear");
    expect(prompt).toContain("Brand Recognition");
  });

  it("includes brand identification guidance with confidence levels", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("BRAND IDENTIFICATION");
    expect(prompt).toContain("ZERO TOLERANCE FOR EMPTY BRANDS");
    expect(prompt).toContain("brandConfidence");
    expect(prompt).toContain("ייתכן");
  });

  it("includes product variety rules for shopping links", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("PRODUCT VARIETY WITHIN SHOPPING LINKS");
    expect(prompt).toContain("Different STYLES");
    expect(prompt).toContain("Different PRICE RANGES");
    expect(prompt).toContain("Different BRANDS");
  });

  it("includes occasion context when provided", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "work", null, [], "he");
    expect(prompt).toContain("WORK / OFFICE");
    expect(prompt).toContain("OCCASION CONTEXT");
  });

  it("does not include occasion context when not provided", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).not.toContain("OCCASION CONTEXT");
  });

  it("includes wardrobe items when provided", () => {
    const wardrobeItems = [
      { itemType: "shoes", name: "Nike Air Force 1", color: "white", brand: "Nike" },
    ];
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), wardrobeItems, "he");
    expect(prompt).toContain("Nike Air Force 1");
  });

  it("includes gender-specific influencer constraint for male users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, { gender: "male", budgetLevel: "mid-range" }, [], "he");
    expect(prompt).toContain("ONLY suggest and reference MALE or UNISEX fashion influencers");
  });

  it("includes gender-specific influencer constraint for female users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, { gender: "female", budgetLevel: "mid-range" }, [], "he");
    expect(prompt).toContain("ONLY suggest and reference FEMALE or UNISEX fashion influencers");
  });
});

// ─── Budget-Specific Behavior ─────────────────────────────────────────────────

describe("Budget-level specific prompt behavior", () => {
  it("includes budget matching guidance for all profiles", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("Shopping links MUST match their budget level");
  });

  it("warns against suggesting luxury to budget users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, budgetProfile(), [], "he");
    expect(prompt).toContain("don't suggest luxury brands to budget users");
  });

  it("warns against suggesting fast fashion to luxury users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, luxuryProfile(), [], "he");
    expect(prompt).toContain("don't suggest fast fashion to luxury users");
  });

  it("includes preferred stores guidance when user has preferred stores", () => {
    const profile = premiumProfile({ preferredStores: "Farfetch, SSENSE" });
    const prompt = buildFashionPrompt(undefined, undefined, undefined, profile, [], "he");
    expect(prompt).toContain("PREFERRED STORES");
    expect(prompt).toContain("At least 50% of shopping links should come from their preferred stores");
  });

  it("includes jewelry higher-end assumption for premium users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("Silver-toned jewelry on a premium/luxury user is more likely white gold, platinum, or palladium");
  });

  it("includes jewelry higher-end assumption for luxury users", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, luxuryProfile(), [], "he");
    expect(prompt).toContain("Transparent stones are more likely diamonds or high-quality crystals");
  });
});

// ─── Deep Analysis Methodology ───────────────────────────────────────────────

describe("Deep analysis methodology in prompt (all users)", () => {
  it("includes ANALYSIS METHODOLOGY section", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("ANALYSIS METHODOLOGY");
    expect(prompt).toContain("THINK DEEPLY BEFORE RESPONDING");
  });

  it("includes full body scan instruction", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("FULL BODY SCAN");
    expect(prompt).toContain("Start from the top of the head and scan down");
  });

  it("includes material analysis step", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("MATERIAL ANALYSIS");
    expect(prompt).toContain("examine the fabric/material closely");
    expect(prompt).toContain("texture, sheen, drape, weight, weave pattern");
  });

  it("includes color precision instruction", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("COLOR PRECISION");
    expect(prompt).toContain("specify the exact shade");
  });

  it("includes fit and silhouette analysis", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("FIT & SILHOUETTE");
    expect(prompt).toContain("oversized, relaxed, regular, slim, tailored");
  });

  it("includes construction details instruction", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("CONSTRUCTION DETAILS");
    expect(prompt).toContain("stitching quality");
  });

  it("includes brand identification as final step after visual analysis", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("BRAND IDENTIFICATION: Only AFTER examining all visual details");
  });

  it("includes styling coherence evaluation", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("STYLING COHERENCE");
    expect(prompt).toContain("proportion, color story, style consistency");
  });

  it("emphasizes accuracy over speed", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Accuracy and depth matter more than speed");
  });

  it("includes confidence levels for brand identification", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("HIGH CONFIDENCE");
    expect(prompt).toContain("MEDIUM CONFIDENCE");
    expect(prompt).toContain("LOW CONFIDENCE");
  });

  it("warns against wrong brand identification", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("a wrong brand identification is worse than no identification");
  });

  it("applies deep analysis methodology for budget users too", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, budgetProfile(), [], "he");
    expect(prompt).toContain("ANALYSIS METHODOLOGY");
    expect(prompt).toContain("FULL BODY SCAN");
    expect(prompt).toContain("MATERIAL ANALYSIS");
  });

  it("applies deep analysis methodology for guest users (no profile)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "en");
    expect(prompt).toContain("ANALYSIS METHODOLOGY");
    expect(prompt).toContain("FULL BODY SCAN");
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

  it("includes specific material examples in prompt", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("cotton");
    expect(prompt).toContain("linen");
    expect(prompt).toContain("wool");
    expect(prompt).toContain("cashmere");
    expect(prompt).toContain("silk");
    expect(prompt).toContain("denim");
    expect(prompt).toContain("leather");
  });

  it("includes footwear brand markers for identification", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("FOOTWEAR");
    expect(prompt).toContain("Nike");
    expect(prompt).toContain("Adidas");
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

// ─── Weather & Time-Aware Scoring ────────────────────────────────────────────

describe("Weather & time-aware scoring rules in prompt", () => {
  it("includes WEATHER & TIME-AWARE SCORING section", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(prompt).toContain("WEATHER & TIME-AWARE SCORING (CRITICAL)");
  });

  it("instructs not to penalize missing layers in warm weather", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "evening", premiumProfile(), [], "he");
    expect(prompt).toContain("Do NOT penalize for missing layers when the occasion implies warm weather");
  });

  it("instructs not to suggest sunglasses at night events", () => {
    const prompt = buildFashionPrompt(undefined, undefined, "evening", premiumProfile(), [], "he");
    expect(prompt).toContain("Do NOT suggest or penalize for missing SUNGLASSES at evening/night events");
  });

  it("lists evening, date, friends as nighttime contexts for sunglasses rule", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain('"evening"');
    expect(prompt).toContain('"date"');
    expect(prompt).toContain('"friends"');
  });

  it("instructs not to suggest heavy layers for warm-weather occasions", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("do NOT suggest adding heavy layers, scarves, or coats as improvements");
  });

  it("includes the practical fashion advice principle", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Fashion advice must be PRACTICAL");
  });

  it("weather rules apply regardless of budget level", () => {
    const budgetPrompt = buildFashionPrompt(undefined, undefined, undefined, budgetProfile(), [], "he");
    const premiumPrompt = buildFashionPrompt(undefined, undefined, undefined, premiumProfile(), [], "he");
    expect(budgetPrompt).toContain("WEATHER & TIME-AWARE SCORING (CRITICAL)");
    expect(premiumPrompt).toContain("WEATHER & TIME-AWARE SCORING (CRITICAL)");
  });

  it("weather rules apply even without a profile", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("WEATHER & TIME-AWARE SCORING (CRITICAL)");
  });
});

// ─── Overall Score Weighting ─────────────────────────────────────────────────

describe("Overall score weighting rules in prompt", () => {
  it("includes OVERALL SCORE WEIGHTING section", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("OVERALL SCORE WEIGHTING (CRITICAL)");
  });

  it("defines HIGH WEIGHT categories (quality, fit, color, style match)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("HIGH WEIGHT categories");
    expect(prompt).toContain("Item Quality");
    expect(prompt).toContain("Fit");
    expect(prompt).toContain("Color Palette");
    expect(prompt).toContain("Age & Style Match");
  });

  it("defines MEDIUM WEIGHT categories (footwear, brand recognition)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("MEDIUM WEIGHT categories");
    expect(prompt).toContain("Footwear");
    expect(prompt).toContain("Brand Recognition");
  });

  it("defines LOW WEIGHT categories (layering, accessories)", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("LOW WEIGHT categories");
    expect(prompt).toContain("Layering");
    expect(prompt).toContain("Accessories & Jewelry");
  });

  it("states that excellent core elements should still score 9+ overall", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("should still score 9+ overall");
  });

  it("instructs not to let low layering/accessories drag down overall score", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).toContain("Do NOT let a low layering or accessories score drag down");
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
    expect(prompt).toContain("overall score MUST be 6 or below");
    expect(prompt).toContain("summary");
    expect(prompt).toContain("mention how well the outfit fits");
  });

  it("does NOT include occasion-fit rules when no occasion is set", () => {
    const prompt = buildFashionPrompt(undefined, undefined, undefined, null, [], "he");
    expect(prompt).not.toContain("CRITICAL OCCASION-FIT SCORING RULES");
  });

  it("includes specific appropriateness criteria for each occasion", () => {
    // Work: too casual scores low
    const workPrompt = buildFashionPrompt(undefined, undefined, "work", null, [], "he");
    expect(workPrompt).toContain("Too casual");

    // Evening: casual wear inappropriate
    const eveningPrompt = buildFashionPrompt(undefined, undefined, "evening", null, [], "he");
    expect(eveningPrompt).toContain("Casual wear would be very inappropriate");

    // Coffee: not overdressed
    const coffeePrompt = buildFashionPrompt(undefined, undefined, "coffee", null, [], "he");
    expect(coffeePrompt).toContain("not overdressed");

    // Family: respectful and put-together
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
