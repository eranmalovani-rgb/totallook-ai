import { describe, expect, it } from "vitest";
import {
  decodeOAuthState,
  encodeOAuthState,
  getCanonicalSiteOrigin,
  resolveReturnOrigin,
  sanitizeReturnPath,
} from "./oauthOrigin";

describe("oauthOrigin", () => {
  const siteUrl = "https://totallook.ai";

  it("canonicalizes site origin to non-www", () => {
    expect(getCanonicalSiteOrigin("https://www.totallook.ai/any/path")).toBe("https://totallook.ai");
  });

  it("accepts safe return origins and canonicalizes www", () => {
    expect(resolveReturnOrigin("https://www.totallook.ai", siteUrl)).toBe("https://totallook.ai");
    expect(resolveReturnOrigin("https://preview-123.manus.space", siteUrl)).toBe("https://totallook.ai");
  });

  it("rejects malicious return origin and falls back", () => {
    expect(resolveReturnOrigin("https://evil.example.com", siteUrl)).toBe("https://totallook.ai");
  });

  it("sanitizes return path", () => {
    expect(sanitizeReturnPath("/review/123")).toBe("/review/123");
    expect(sanitizeReturnPath("https://evil.example.com")).toBe("/");
    expect(sanitizeReturnPath("//evil.example.com")).toBe("/");
  });

  it("encodes and decodes oauth state", () => {
    const encoded = encodeOAuthState({
      returnPath: "/upload",
      origin: "https://totallook.ai",
    });
    expect(
      decodeOAuthState(encoded)
    ).toEqual({
      returnPath: "/upload",
      origin: "https://totallook.ai",
    });
  });

  it("supports legacy plain path state", () => {
    expect(decodeOAuthState("/profile")).toEqual({ returnPath: "/profile" });
  });
});
