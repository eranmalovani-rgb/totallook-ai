/**
 * Tests for phone number uniqueness enforcement and normalizePhone utility.
 */
import { describe, it, expect } from "vitest";
import { normalizePhone } from "../shared/phone";

describe("normalizePhone", () => {
  it("should strip whatsapp: prefix", () => {
    expect(normalizePhone("whatsapp:+972521234567")).toBe("+972521234567");
  });

  it("should strip whatsapp: prefix case-insensitively", () => {
    expect(normalizePhone("WhatsApp:+972521234567")).toBe("+972521234567");
  });

  it("should strip spaces and dashes", () => {
    expect(normalizePhone("+972 52-123-4567")).toBe("+972521234567");
  });

  it("should strip parentheses", () => {
    expect(normalizePhone("+1 (212) 555-1234")).toBe("+12125551234");
  });

  it("should add + prefix if missing", () => {
    expect(normalizePhone("972521234567")).toBe("+972521234567");
  });

  it("should keep existing + prefix", () => {
    expect(normalizePhone("+972521234567")).toBe("+972521234567");
  });

  it("should return empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
  });

  it("should return empty string for null-like input", () => {
    // @ts-ignore - testing edge case
    expect(normalizePhone(null as any)).toBe("");
    // @ts-ignore
    expect(normalizePhone(undefined as any)).toBe("");
  });

  it("should normalize different representations of the same number to the same result", () => {
    const variants = [
      "+972521234567",
      "972521234567",
      "+972 52 123 4567",
      "whatsapp:+972521234567",
      "+972-52-123-4567",
      "WhatsApp:+972521234567",
    ];
    const normalized = variants.map(normalizePhone);
    // All should be the same
    const unique = new Set(normalized);
    expect(unique.size).toBe(1);
    expect(normalized[0]).toBe("+972521234567");
  });

  it("should handle US numbers consistently", () => {
    expect(normalizePhone("+1 212 555 1234")).toBe("+12125551234");
    expect(normalizePhone("whatsapp:+12125551234")).toBe("+12125551234");
    expect(normalizePhone("12125551234")).toBe("+12125551234");
  });
});

describe("Phone uniqueness logic", () => {
  it("normalizePhone ensures same number in different formats matches", () => {
    // This simulates what happens when:
    // - User A saves "+972521234567" in their profile
    // - User B tries to save "972 52 123 4567" in their profile
    // Both should normalize to the same value, so the DB check catches the duplicate
    const userAPhone = normalizePhone("+972521234567");
    const userBPhone = normalizePhone("972 52 123 4567");
    expect(userAPhone).toBe(userBPhone);
  });

  it("normalizePhone ensures WhatsApp format matches profile format", () => {
    // This simulates what happens when:
    // - User saves "+972521234567" in their profile
    // - WhatsApp sends "whatsapp:+972521234567" in webhook
    // findUserByPhoneNumber should match them
    const profilePhone = normalizePhone("+972521234567");
    const whatsappPhone = normalizePhone("whatsapp:+972521234567");
    expect(profilePhone).toBe(whatsappPhone);
  });

  it("different phone numbers should NOT match", () => {
    const phone1 = normalizePhone("+972521234567");
    const phone2 = normalizePhone("+972521234568");
    expect(phone1).not.toBe(phone2);
  });

  it("different country codes should NOT match", () => {
    const israelPhone = normalizePhone("+972521234567");
    const usPhone = normalizePhone("+1521234567");
    expect(israelPhone).not.toBe(usPhone);
  });
});
