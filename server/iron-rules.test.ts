import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const routersSource = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
const doctrineSource = readFileSync(resolve(__dirname, "../shared/fashionDoctrine.ts"), "utf-8");

describe("Iron Rules — Fashion Doctrine", () => {
  it("should contain ironRules function in fashionDoctrine", () => {
    expect(doctrineSource).toContain("export function ironRules()");
  });

  it("should include IRON RULES section with absolute prohibitions", () => {
    expect(doctrineSource).toContain("IRON RULES — ABSOLUTE PROHIBITIONS");
  });

  it("should prohibit shorts for formal looks", () => {
    expect(doctrineSource).toContain("Shorts (שורטס) are FORBIDDEN");
  });

  it("should include formality levels", () => {
    expect(doctrineSource).toContain("FORMALITY LEVELS");
    expect(doctrineSource).toContain("CASUAL");
    expect(doctrineSource).toContain("SMART-CASUAL");
    expect(doctrineSource).toContain("BUSINESS-CASUAL");
    expect(doctrineSource).toContain("FORMAL/ELEGANT");
    expect(doctrineSource).toContain("BLACK-TIE/LUXURY");
  });

  it("should include violation examples", () => {
    expect(doctrineSource).toContain("Person in black suit → suggest shorts (CATASTROPHIC)");
    expect(doctrineSource).toContain("Person in evening dress → suggest sneakers (CATASTROPHIC)");
  });

  it("should include correct examples", () => {
    expect(doctrineSource).toContain("Person in black suit → suggest better quality Oxford shoes");
    expect(doctrineSource).toContain("Person in evening dress → suggest statement earrings");
  });
});

describe("Iron Rules — Stage 2 Prompt Injection", () => {
  it("should include ironRules() in getDoctrineForStage2", () => {
    expect(doctrineSource).toContain("ironRules(),\n    coreStyleLaws(),\n    upgradeStrategy(),");
  });

  it("should include ironRules() in getDoctrineForStage2Slim", () => {
    expect(doctrineSource).toContain("ironRules(),\n    coreStyleLaws(),\n    upgradeStrategy(),\n    colorHarmonyRules(),");
  });

  it("should include iron rules reminder in Hebrew prompt", () => {
    expect(routersSource).toContain("כללי ברזל — איסורים מוחלטים");
    expect(routersSource).toContain("שורטס אסור להמליץ");
  });

  it("should include iron rules reminder in English prompt", () => {
    expect(routersSource).toContain("IRON RULES — ABSOLUTE PROHIBITIONS (violation = CRITICAL FAILURE)");
    expect(routersSource).toContain("SHORTS are FORBIDDEN as a recommendation");
  });
});

describe("Iron Rules — Server-side Formality Guard", () => {
  it("should have detectFormalityLevel function", () => {
    expect(routersSource).toContain("function detectFormalityLevel(core: FashionAnalysisCorePayload): number");
  });

  it("should filter forbidden items for formal looks", () => {
    expect(routersSource).toContain("IRON RULES: Server-side formality guard");
    expect(routersSource).toContain("FORBIDDEN_FOR_FORMAL");
    expect(routersSource).toContain('"shorts"');
    expect(routersSource).toContain('"flip-flop"');
    expect(routersSource).toContain('"tank top"');
    expect(routersSource).toContain('"hoodie"');
    expect(routersSource).toContain('"sweatpants"');
    expect(routersSource).toContain('"crop top"');
    expect(routersSource).toContain('"sandal"');
  });

  it("should detect formal level from black + tailored", () => {
    expect(routersSource).toContain("hasBlackDominant && hasTailored");
  });

  it("should detect formal level from suit/dress keywords", () => {
    expect(routersSource).toContain('"suit"');
    expect(routersSource).toContain('"dress shoes"');
    expect(routersSource).toContain('"evening dress"');
  });

  it("should log filtered recommendations", () => {
    expect(routersSource).toContain("[IronRules] Filtered out inappropriate recommendation");
  });
});

describe("Iron Rules — Profile Migration", () => {
  const dbSource = readFileSync(resolve(__dirname, "db.ts"), "utf-8");

  it("should copy all guest fields to user profile on migration", () => {
    expect(dbSource).toContain("favoriteBrands: guestProfile.favoriteBrands");
    expect(dbSource).toContain("country: guestProfile.country");
    expect(dbSource).toContain("favoriteInfluencers: guestProfile.favoriteInfluencers");
    expect(dbSource).toContain("preferredStores: guestProfile.preferredStores");
  });

  it("should fill empty fields on existing profiles", () => {
    expect(dbSource).toContain("Profile exists — fill in any empty fields from guest data");
    expect(dbSource).toContain("fieldsToFill");
  });
});
