import { describe, it, expect } from "vitest";

/**
 * Visibility Guard Tests — Stage 138
 * Tests the logic for blocking Fix My Look on items not visible in the photo.
 */

// Replicate the server-side visibility guard logic for testing
function getBlockedZones(personDetection: { feetVisible: boolean; fullBodyVisible: boolean } | null | undefined): Set<string> {
  const blocked = new Set<string>();
  if (!personDetection) return blocked;
  if (personDetection.feetVisible === false) blocked.add("footwear");
  if (personDetection.fullBodyVisible === false && personDetection.feetVisible === false) blocked.add("lower");
  return blocked;
}

// Replicate the client-side keyword-based blocking
function isImprovementBlockedByKeywords(
  impText: string,
  blockedZones: Set<string>
): boolean {
  if (blockedZones.size === 0) return false;
  const lower = impText.toLowerCase();
  if (blockedZones.has("footwear")) {
    const shoeKeywords = ["נעל", "shoe", "sneaker", "סניקרס", "boot", "מגף", "sandal", "סנדל", "heel", "עקב", "loafer"];
    if (shoeKeywords.some(kw => lower.includes(kw))) return true;
  }
  if (blockedZones.has("lower")) {
    const lowerKeywords = ["מכנס", "pants", "jeans", "ג'ינס", "trousers", "shorts", "שורט", "skirt", "חצאית"];
    if (lowerKeywords.some(kw => lower.includes(kw))) return true;
  }
  return false;
}

describe("Visibility Guard — getBlockedZones", () => {
  it("returns empty set when personDetection is null", () => {
    expect(getBlockedZones(null).size).toBe(0);
  });

  it("returns empty set when personDetection is undefined", () => {
    expect(getBlockedZones(undefined).size).toBe(0);
  });

  it("returns empty set when both feet and full body are visible", () => {
    const zones = getBlockedZones({ feetVisible: true, fullBodyVisible: true });
    expect(zones.size).toBe(0);
  });

  it("blocks footwear when feet are not visible", () => {
    const zones = getBlockedZones({ feetVisible: false, fullBodyVisible: true });
    expect(zones.has("footwear")).toBe(true);
    expect(zones.has("lower")).toBe(false);
  });

  it("blocks footwear AND lower when both feet and full body are not visible", () => {
    const zones = getBlockedZones({ feetVisible: false, fullBodyVisible: false });
    expect(zones.has("footwear")).toBe(true);
    expect(zones.has("lower")).toBe(true);
  });

  it("does NOT block lower when full body is not visible but feet ARE visible", () => {
    // This case: photo shows feet but not full body (e.g., close-up of lower body)
    const zones = getBlockedZones({ feetVisible: true, fullBodyVisible: false });
    expect(zones.has("footwear")).toBe(false);
    expect(zones.has("lower")).toBe(false);
  });
});

describe("Visibility Guard — keyword-based blocking", () => {
  it("blocks shoe-related improvements when footwear is blocked", () => {
    const blocked = new Set(["footwear"]);
    expect(isImprovementBlockedByKeywords("שדרג נעליים", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Upgrade shoes", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Replace sneakers", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Try loafer style", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Boot upgrade", blocked)).toBe(true);
  });

  it("does NOT block shirt improvements when only footwear is blocked", () => {
    const blocked = new Set(["footwear"]);
    expect(isImprovementBlockedByKeywords("שדרג חולצה", blocked)).toBe(false);
    expect(isImprovementBlockedByKeywords("Upgrade shirt", blocked)).toBe(false);
    expect(isImprovementBlockedByKeywords("Replace jacket", blocked)).toBe(false);
  });

  it("blocks pants-related improvements when lower is blocked", () => {
    const blocked = new Set(["lower"]);
    expect(isImprovementBlockedByKeywords("שדרג מכנסיים", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Upgrade pants", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Replace jeans", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Try shorts", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Skirt upgrade", blocked)).toBe(true);
  });

  it("does NOT block upper body improvements when only lower is blocked", () => {
    const blocked = new Set(["lower"]);
    expect(isImprovementBlockedByKeywords("שדרג חולצה", blocked)).toBe(false);
    expect(isImprovementBlockedByKeywords("Upgrade jacket", blocked)).toBe(false);
  });

  it("blocks both footwear and lower when both zones are blocked", () => {
    const blocked = new Set(["footwear", "lower"]);
    expect(isImprovementBlockedByKeywords("Upgrade shoes", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Replace pants", blocked)).toBe(true);
    expect(isImprovementBlockedByKeywords("Upgrade shirt", blocked)).toBe(false);
  });

  it("returns false when no zones are blocked", () => {
    const blocked = new Set<string>();
    expect(isImprovementBlockedByKeywords("Upgrade shoes", blocked)).toBe(false);
    expect(isImprovementBlockedByKeywords("Replace pants", blocked)).toBe(false);
  });
});

describe("Visibility Guard — bodyZone-based blocking", () => {
  it("blocks item with bodyZone 'footwear' when footwear zone is blocked", () => {
    const blocked = new Set(["footwear"]);
    const item = { bodyZone: "footwear" };
    expect(item.bodyZone && blocked.has(item.bodyZone)).toBe(true);
  });

  it("blocks item with bodyZone 'lower' when lower zone is blocked", () => {
    const blocked = new Set(["lower"]);
    const item = { bodyZone: "lower" };
    expect(item.bodyZone && blocked.has(item.bodyZone)).toBe(true);
  });

  it("does NOT block item with bodyZone 'upper' when only footwear/lower are blocked", () => {
    const blocked = new Set(["footwear", "lower"]);
    const item = { bodyZone: "upper" };
    expect(blocked.has(item.bodyZone)).toBe(false);
  });

  it("does NOT block item with bodyZone 'accessory' when only footwear/lower are blocked", () => {
    const blocked = new Set(["footwear", "lower"]);
    const item = { bodyZone: "accessory" };
    expect(blocked.has(item.bodyZone)).toBe(false);
  });

  it("does NOT block item without bodyZone", () => {
    const blocked = new Set(["footwear", "lower"]);
    const item = { bodyZone: undefined };
    expect(item.bodyZone && blocked.has(item.bodyZone)).toBeFalsy();
  });
});
