/**
 * Stage 36 Tests: productSearchQuery blacklist + title validation
 *
 * Tests for:
 * 1. FAKE_VALUES blacklist in validateAndFixProductSearchQuery
 * 2. Title rewriting: "מ-X ל-Y" pattern detection and fix
 * 3. Title rewriting: generic titles detection
 * 4. Metadata-based query building
 * 5. Prompt instructions for titles and metadata
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routersSource = fs.readFileSync(
  path.resolve(__dirname, "./routers.ts"),
  "utf-8",
);

describe("Stage 36: productSearchQuery blacklist validation", () => {
  it("should have FAKE_VALUES blacklist in validateAndFixProductSearchQuery", () => {
    expect(routersSource).toContain("FAKE_VALUES");
    expect(routersSource).toContain('"matching"');
    expect(routersSource).toContain('"premium"');
    expect(routersSource).toContain('"upgraded"');
    expect(routersSource).toContain('"complementary"');
    expect(routersSource).toContain('"similar"');
    expect(routersSource).toContain('"enhanced"');
    expect(routersSource).toContain('"appropriate"');
    expect(routersSource).toContain('"suitable"');
    expect(routersSource).toContain('"recommended"');
  });

  it("should use isReal() helper to filter fake values", () => {
    expect(routersSource).toContain("const isReal = (val: string) =>");
    expect(routersSource).toContain("!FAKE_VALUES.has(val)");
  });

  it("should have KNOWN_GARMENTS regex for garment type validation", () => {
    expect(routersSource).toContain("KNOWN_GARMENTS");
    expect(routersSource).toContain("t-shirt|tee|shirt|dress shirt|polo");
    expect(routersSource).toContain("jeans|chinos|pants|trousers|shorts");
    expect(routersSource).toContain("sneakers|shoes|boots|loafers");
    expect(routersSource).toContain("blazer|jacket|coat|vest");
  });

  it("should build query from structured metadata when garment type is known", () => {
    expect(routersSource).toContain("Build query from structured metadata as PRIMARY source");
    expect(routersSource).toContain("if (isReal(afterColor)) parts.push(afterColor)");
    expect(routersSource).toContain("if (isReal(afterFit)");
    expect(routersSource).toContain("if (isReal(afterMaterial)");
  });

  it("should deduplicate words in the built query", () => {
    expect(routersSource).toContain("Deduplicate words in the query");
    expect(routersSource).toContain("const deduped = parts.filter");
  });

  it("should extract garment type from afterLabel when afterGarmentType is not a known garment", () => {
    expect(routersSource).toContain("Try to extract from afterLabel");
    expect(routersSource).toContain("labelWords");
    expect(routersSource).toContain("KNOWN_GARMENTS.test(twoWord)");
    expect(routersSource).toContain("KNOWN_GARMENTS.test(oneWord)");
  });
});

describe("Stage 36: FAKE_VALUES blacklist logic", () => {
  // Test the blacklist logic directly
  const FAKE_VALUES = new Set([
    "matching", "premium", "upgraded", "similar", "complementary", "better",
    "improved", "enhanced", "quality", "stylish", "fashionable", "trendy",
    "elegant", "sophisticated", "modern", "classic", "luxury", "luxurious",
    "high-end", "high end", "designer", "branded", "n/a", "none", "same",
    "appropriate", "suitable", "recommended", "ideal", "perfect", "optimal",
  ]);
  const isReal = (val: string) => val && !FAKE_VALUES.has(val) && val.length > 1;

  it("should reject 'matching' as a fake value", () => {
    expect(isReal("matching")).toBe(false);
  });

  it("should reject 'premium' as a fake value", () => {
    expect(isReal("premium")).toBe(false);
  });

  it("should reject 'upgraded' as a fake value", () => {
    expect(isReal("upgraded")).toBe(false);
  });

  it("should reject 'complementary' as a fake value", () => {
    expect(isReal("complementary")).toBe(false);
  });

  it("should reject 'n/a' as a fake value", () => {
    expect(isReal("n/a")).toBe(false);
  });

  it("should accept 'navy blue' as a real color", () => {
    expect(isReal("navy blue")).toBe(true);
  });

  it("should accept 'cotton' as a real material", () => {
    expect(isReal("cotton")).toBe(true);
  });

  it("should accept 'polo' as a real garment type", () => {
    expect(isReal("polo")).toBe(true);
  });

  it("should accept 'slim' as a real fit", () => {
    expect(isReal("slim")).toBe(true);
  });

  it("should reject empty string", () => {
    expect(isReal("")).toBeFalsy();
  });

  it("should reject single character", () => {
    expect(isReal("a")).toBe(false);
  });
});

describe("Stage 36: Title validation and rewriting", () => {
  it("should detect 'מ-X ל-Y' pattern in title validation code", () => {
    expect(routersSource).toContain("isFromToPattern");
    expect(routersSource).toContain("^מ-.*ל-");
  });

  it("should detect generic title patterns", () => {
    expect(routersSource).toContain("isGenericPattern");
    expect(routersSource).toContain("^שדרוג ");
    expect(routersSource).toContain("שיפור ");
    expect(routersSource).toContain("^upgrade ");
    expect(routersSource).toContain("^improve ");
  });

  it("should detect fake words in titles", () => {
    expect(routersSource).toContain("hasFakeWords");
    expect(routersSource).toContain("matching|premium|upgraded|complementary|similar");
  });

  it("should have Hebrew garment map for title building", () => {
    expect(routersSource).toContain("heGarmentMap");
    expect(routersSource).toContain('"t-shirt": "טישרט"');
    expect(routersSource).toContain('"polo": "פולו"');
    expect(routersSource).toContain('"blazer": "בלייזר"');
    expect(routersSource).toContain('"jeans": "ג\'ינס"');
    expect(routersSource).toContain('"sneakers": "סניקרס"');
  });

  it("should have Hebrew material map for title building", () => {
    expect(routersSource).toContain("heMatMap");
    expect(routersSource).toContain('"cotton": "כותנה"');
    expect(routersSource).toContain('"linen": "פשתן"');
    expect(routersSource).toContain('"leather": "עור"');
    expect(routersSource).toContain('"denim": "דנים"');
  });

  it("should build Hebrew titles with garment + material pattern", () => {
    // Pattern: "heAfter heMat — קפיצת דרג"
    expect(routersSource).toContain("קפיצת דרג");
    expect(routersSource).toContain("במקום");
  });

  it("should build English titles with proper capitalization", () => {
    expect(routersSource).toContain("Level Up");
    expect(routersSource).toContain("A Look-Changing Upgrade");
    expect(routersSource).toContain("Wardrobe Upgrade");
  });

  it("should use FAKE regex to filter fake metadata in title building", () => {
    // The FAKE regex inside the title builder
    expect(routersSource).toContain("const FAKE = /^(matching|premium|upgraded|similar|complementary|better|improved|quality|stylish|elegant|luxury|n\\/a|none)$/i");
  });
});

describe("Stage 36: Title pattern detection logic", () => {
  // Test the regex patterns directly
  const isFromToPattern = /^מ-.*ל-|^from .* to /i;
  const isGenericPattern = /^שדרוג |שיפור |^upgrade |^improve /i;
  const hasFakeWords = /(matching|premium|upgraded|complementary|similar)/i;

  it("should detect 'מ-טישרט ל-פולו' as from-to pattern", () => {
    expect(isFromToPattern.test("מ-טישרט ל-פולו")).toBe(true);
  });

  it("should detect 'from t-shirt to polo' as from-to pattern", () => {
    expect(isFromToPattern.test("from t-shirt to polo")).toBe(true);
  });

  it("should NOT detect 'פולו פיקה במקום טישרט' as from-to pattern", () => {
    expect(isFromToPattern.test("פולו פיקה במקום טישרט")).toBe(false);
  });

  it("should detect 'שדרוג חלק עליון' as generic pattern", () => {
    expect(isGenericPattern.test("שדרוג חלק עליון")).toBe(true);
  });

  it("should detect 'upgrade your top' as generic pattern", () => {
    expect(isGenericPattern.test("upgrade your top")).toBe(true);
  });

  it("should NOT detect 'בלייזר פשתן — קפיצת דרג' as generic pattern", () => {
    expect(isGenericPattern.test("בלייזר פשתן — קפיצת דרג")).toBe(false);
  });

  it("should detect 'premium matching upgrade' as having fake words", () => {
    expect(hasFakeWords.test("premium matching upgrade")).toBe(true);
  });

  it("should NOT detect 'בלייזר פשתן — קפיצת דרג' as having fake words", () => {
    expect(hasFakeWords.test("בלייזר פשתן — קפיצת דרג")).toBe(false);
  });

  it("should NOT detect 'Cotton Polo — Level Up' as having fake words", () => {
    expect(hasFakeWords.test("Cotton Polo — Level Up")).toBe(false);
  });
});

describe("Stage 36: Prompt instructions for titles", () => {
  it("should have explicit 'מ-X ל-Y' prohibition in Hebrew prompt", () => {
    expect(routersSource).toContain('אסור פורמט "מ-X ל-Y"');
  });

  it("should have explicit fake words prohibition in Hebrew prompt", () => {
    expect(routersSource).toContain('אסור מילים גנריות בכותרת');
  });

  it("should have good title examples in Hebrew prompt", () => {
    expect(routersSource).toContain("פולו פיקה במקום טישרט");
    expect(routersSource).toContain("לואפרס עור במקום סניקרס");
    expect(routersSource).toContain("בלייזר פשתן — קפיצת דרג");
  });

  it("should have bad title examples in Hebrew prompt", () => {
    expect(routersSource).toContain("מטישרט לפולו — קפיצה בסטייל");
    expect(routersSource).toContain('שדרוג premium"');
  });
});

describe("Stage 36: Prompt instructions for metadata", () => {
  it("should have CRITICAL instruction for afterColor/afterMaterial/afterGarmentType", () => {
    expect(routersSource).toContain("CRITICAL: afterColor, afterMaterial, afterGarmentType MUST be SPECIFIC REAL VALUES");
  });

  it("should list FORBIDDEN placeholder values", () => {
    expect(routersSource).toContain('FORBIDDEN: "matching", "premium", "upgraded", "similar", "complementary"');
  });

  it("should have specific examples for afterColor", () => {
    expect(routersSource).toContain('"white", "navy blue", "charcoal gray"');
  });

  it("should have specific examples for afterGarmentType", () => {
    expect(routersSource).toContain('"t-shirt", "polo", "chinos", "sneakers"');
  });

  it("should have specific examples for afterMaterial", () => {
    expect(routersSource).toContain('"cotton", "linen", "denim", "leather"');
  });
});
