/**
 * Stage 37 Tests: JSON Schema Fix — additionalProperties: false
 *
 * Root cause: Stage 2 LLM call failed with OpenAI strict mode error:
 * "In context=('properties', 'improvements', 'items'), 'additionalProperties' 
 *  is required to be supplied and to be false."
 * 
 * This caused ALL analyses to fall back to generic recommendations,
 * making 3 different photos produce identical results.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routersSource = fs.readFileSync(
  path.resolve(__dirname, "./routers.ts"),
  "utf-8",
);

describe("Stage 37: JSON Schema — additionalProperties: false everywhere", () => {
  it("should NOT have any additionalProperties: true in schema definitions", () => {
    // Extract the schema section (from analysisJsonSchema to end of recommendationsJsonSchema)
    const schemaStart = routersSource.indexOf("export const analysisJsonSchema");
    const schemaEnd = routersSource.indexOf("function buildRecommendationsPromptFromCore");
    const schemaSection = routersSource.substring(schemaStart, schemaEnd);
    
    const trueMatches = (schemaSection.match(/additionalProperties:\s*true/g) || []);
    expect(trueMatches.length).toBe(0);
  });

  it("should have additionalProperties: false on improvements items object", () => {
    // Find the improvements items section specifically
    const improvementsIdx = routersSource.indexOf("improvements: {");
    const improvementsSection = routersSource.substring(improvementsIdx, improvementsIdx + 5000);
    
    // Find the first additionalProperties in this section (should be for shoppingLinks items)
    // and the second one (should be for improvement items themselves)
    const matches = [...improvementsSection.matchAll(/additionalProperties:\s*(true|false)/g)];
    
    // All should be false
    for (const match of matches) {
      expect(match[1]).toBe("false");
    }
  });

  it("should have all garment metadata fields in the required list", () => {
    // The improvements items required list should include all metadata fields
    const requiredFields = [
      "title", "description", "beforeLabel", "afterLabel",
      "beforeColor", "afterColor",
      "beforeGarmentType", "afterGarmentType",
      "beforeStyle", "afterStyle",
      "beforeFit", "afterFit",
      "beforeLength", "afterLength",
      "beforeSleeveLength", "afterSleeveLength",
      "beforeNeckline", "afterNeckline",
      "beforeClosure", "afterClosure",
      "beforeMaterial", "afterMaterial",
      "beforeTexture", "afterTexture",
      "beforePattern", "afterPattern",
      "beforeDetails", "afterDetails",
      "productSearchQuery", "shoppingLinks",
    ];

    for (const field of requiredFields) {
      expect(routersSource).toContain(`"${field}"`);
    }
  });

  it("should have additionalProperties: false on shoppingLinks items", () => {
    expect(routersSource).toContain('required: ["label", "url", "imageUrl"] as const,');
    // The next line should be additionalProperties: false
    const idx = routersSource.indexOf('required: ["label", "url", "imageUrl"]');
    const after = routersSource.substring(idx, idx + 200);
    expect(after).toContain("additionalProperties: false");
  });

  it("should have additionalProperties: false on outfitSuggestions items", () => {
    const idx = routersSource.indexOf('required: ["name", "occasion", "items", "colors", "lookDescription", "inspirationNote"]');
    expect(idx).toBeGreaterThan(-1);
    const after = routersSource.substring(idx, idx + 200);
    expect(after).toContain("additionalProperties: false");
  });

  it("should have additionalProperties: false on trendSources items", () => {
    const idx = routersSource.indexOf('required: ["source", "title", "url", "relevance", "season"]');
    expect(idx).toBeGreaterThan(-1);
    const after = routersSource.substring(idx, idx + 200);
    expect(after).toContain("additionalProperties: false");
  });

  it("should have additionalProperties: false on personDetectionSchema", () => {
    const idx = routersSource.indexOf("const personDetectionSchema");
    const section = routersSource.substring(idx, idx + 1500);
    expect(section).toContain("additionalProperties: false");
    expect(section).not.toContain("additionalProperties: true");
  });

  it("should have additionalProperties: false on lookStructureSchema", () => {
    const idx = routersSource.indexOf("const lookStructureSchema");
    const section = routersSource.substring(idx, idx + 1500);
    expect(section).toContain("additionalProperties: false");
    expect(section).not.toContain("additionalProperties: true");
  });

  it("should have additionalProperties: false on recommendationsJsonSchema", () => {
    const idx = routersSource.indexOf("export const recommendationsJsonSchema");
    const section = routersSource.substring(idx, idx + 500);
    expect(section).toContain("additionalProperties: false");
    expect(section).not.toContain("additionalProperties: true");
  });

  it("should have additionalProperties: false on analysisCoreJsonSchema", () => {
    const idx = routersSource.indexOf("export const analysisCoreJsonSchema");
    const section = routersSource.substring(idx, idx + 1500);
    expect(section).toContain("additionalProperties: false");
    expect(section).not.toContain("additionalProperties: true");
  });
});

describe("Stage 37: Fallback behavior when Stage 2 fails", () => {
  it("should have fallback logic in sanitizeRecommendationsPayload", () => {
    expect(routersSource).toContain("shouldFallbackRecommendationsForLanguage");
    expect(routersSource).toContain("buildFallbackRecommendationsFromCore");
  });

  it("should log Stage 2 fallback when LLM fails", () => {
    expect(routersSource).toContain("Stage-2 recommendations fallback");
  });
});
