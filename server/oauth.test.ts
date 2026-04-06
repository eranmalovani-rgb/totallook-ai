import { describe, expect, it, vi, beforeEach } from "vitest";
import { sdk } from "./_core/sdk";

/* ═══════════════════════════════════════════════════════════════════════════
 * OAuth Login Flow — Comprehensive Tests
 *
 * Tests cover:
 *  1. State encoding (frontend getLoginUrl logic, tested server-side via decode)
 *  2. State decoding — new JSON format & legacy plain-string format
 *  3. Allowed-origins whitelist
 *  4. Redirect decision logic (same-origin vs cross-origin)
 *  5. Edge cases: malformed state, missing fields, www redirect
 * ═══════════════════════════════════════════════════════════════════════════ */

const CANONICAL_ORIGIN = "https://fashionrev-sgdphkr3.manus.space";
const CANONICAL_CALLBACK = `${CANONICAL_ORIGIN}/api/oauth/callback`;

// ── Helper: simulate what the frontend getLoginUrl() produces ──────────────
function encodeNewState(origin: string, returnPath = "/"): string {
  const payload = JSON.stringify({
    redirectUri: CANONICAL_CALLBACK,
    returnOrigin: origin,
    returnPath,
  });
  return btoa(payload);
}

// ── Helper: simulate the old/legacy state format (plain redirect URI) ──────
function encodeLegacyState(redirectUri: string): string {
  return btoa(redirectUri);
}

// ── Import the isAllowedOrigin logic (re-implement for unit testing) ────────
const ALLOWED_ORIGINS = new Set([
  "https://fashionrev-sgdphkr3.manus.space",
  "https://totallook.ai",
  "https://www.totallook.ai",
]);

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:")) return true;
  if (/^https:\/\/[^/]+\.manus\.computer$/.test(origin)) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. STATE ENCODING — Frontend produces correct state for each domain
 * ═══════════════════════════════════════════════════════════════════════════ */
describe("OAuth state encoding (frontend getLoginUrl simulation)", () => {
  it("encodes state from totallook.ai with canonical redirect URI", () => {
    const state = encodeNewState("https://totallook.ai");
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.redirectUri).toBe(CANONICAL_CALLBACK);
    expect(decoded.returnOrigin).toBe("https://totallook.ai");
    expect(decoded.returnPath).toBe("/");
  });

  it("encodes state from www.totallook.ai with canonical redirect URI", () => {
    const state = encodeNewState("https://www.totallook.ai");
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.redirectUri).toBe(CANONICAL_CALLBACK);
    expect(decoded.returnOrigin).toBe("https://www.totallook.ai");
    expect(decoded.returnPath).toBe("/");
  });

  it("encodes state from manus.space (same origin) with canonical redirect URI", () => {
    const state = encodeNewState(CANONICAL_ORIGIN);
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.redirectUri).toBe(CANONICAL_CALLBACK);
    expect(decoded.returnOrigin).toBe(CANONICAL_ORIGIN);
    expect(decoded.returnPath).toBe("/");
  });

  it("encodes state from dev preview (.manus.computer) with canonical redirect URI", () => {
    const devOrigin = "https://3000-abc123def-xyz.sg1.manus.computer";
    const state = encodeNewState(devOrigin);
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.redirectUri).toBe(CANONICAL_CALLBACK);
    expect(decoded.returnOrigin).toBe(devOrigin);
    expect(decoded.returnPath).toBe("/");
  });

  it("preserves custom returnPath in state", () => {
    const state = encodeNewState("https://totallook.ai", "/upload");
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.returnPath).toBe("/upload");
  });

  it("redirect URI in state NEVER contains the custom domain", () => {
    const origins = [
      "https://totallook.ai",
      "https://www.totallook.ai",
      "https://3000-abc.manus.computer",
      "http://localhost:3000",
    ];
    for (const origin of origins) {
      const state = encodeNewState(origin);
      const decoded = sdk.decodeOAuthState(state);
      expect(decoded.redirectUri).toBe(CANONICAL_CALLBACK);
      expect(decoded.redirectUri).not.toContain(origin.replace(/^https?:\/\//, ""));
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. STATE DECODING — Server correctly parses both formats
 * ═══════════════════════════════════════════════════════════════════════════ */
describe("OAuth state decoding (server sdk.decodeOAuthState)", () => {
  it("decodes new JSON format with all fields", () => {
    const state = encodeNewState("https://totallook.ai", "/history");
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.redirectUri).toBe(CANONICAL_CALLBACK);
    expect(decoded.returnOrigin).toBe("https://totallook.ai");
    expect(decoded.returnPath).toBe("/history");
  });

  it("decodes legacy plain-string format (backward compatibility)", () => {
    const legacyRedirectUri = "https://fashionrev-sgdphkr3.manus.space/api/oauth/callback";
    const state = encodeLegacyState(legacyRedirectUri);
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.redirectUri).toBe(legacyRedirectUri);
    expect(decoded.returnOrigin).toBeUndefined();
    expect(decoded.returnPath).toBeUndefined();
  });

  it("decodes legacy format from old totallook.ai state (before fix)", () => {
    // This is what the old code produced — a plain redirect URI from the custom domain
    const oldRedirectUri = "https://totallook.ai/api/oauth/callback";
    const state = encodeLegacyState(oldRedirectUri);
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.redirectUri).toBe(oldRedirectUri);
    expect(decoded.returnOrigin).toBeUndefined();
  });

  it("handles JSON state with missing returnOrigin gracefully", () => {
    const payload = JSON.stringify({ redirectUri: CANONICAL_CALLBACK });
    const state = btoa(payload);
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.redirectUri).toBe(CANONICAL_CALLBACK);
    expect(decoded.returnOrigin).toBeUndefined();
    expect(decoded.returnPath).toBe("/");
  });

  it("handles JSON state with missing returnPath — defaults to /", () => {
    const payload = JSON.stringify({
      redirectUri: CANONICAL_CALLBACK,
      returnOrigin: "https://totallook.ai",
    });
    const state = btoa(payload);
    const decoded = sdk.decodeOAuthState(state);

    expect(decoded.returnPath).toBe("/");
  });

  it("handles malformed base64 gracefully without throwing", () => {
    // Corrupted state should not crash the server — returns empty redirectUri
    expect(() => sdk.decodeOAuthState("not-valid-base64!!!")).not.toThrow();
    const decoded = sdk.decodeOAuthState("not-valid-base64!!!");
    expect(decoded.redirectUri).toBe("");
    expect(decoded.returnOrigin).toBeUndefined();
  });

  it("handles empty JSON object — falls back to decoded string", () => {
    const state = btoa("{}");
    const decoded = sdk.decodeOAuthState(state);
    // No redirectUri field → falls back to the raw decoded string
    expect(decoded.redirectUri).toBe("{}");
    expect(decoded.returnOrigin).toBeUndefined();
  });

  it("handles JSON with wrong types — falls back to decoded string", () => {
    const state = btoa(JSON.stringify({ redirectUri: 12345 }));
    const decoded = sdk.decodeOAuthState(state);
    expect(decoded.redirectUri).toBe(JSON.stringify({ redirectUri: 12345 }));
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. ALLOWED ORIGINS WHITELIST
 * ═══════════════════════════════════════════════════════════════════════════ */
describe("OAuth allowed origins whitelist", () => {
  it("accepts totallook.ai", () => {
    expect(isAllowedOrigin("https://totallook.ai")).toBe(true);
  });

  it("accepts www.totallook.ai", () => {
    expect(isAllowedOrigin("https://www.totallook.ai")).toBe(true);
  });

  it("accepts canonical manus.space domain", () => {
    expect(isAllowedOrigin(CANONICAL_ORIGIN)).toBe(true);
  });

  it("accepts localhost dev origins", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
    expect(isAllowedOrigin("https://localhost:3000")).toBe(true);
  });

  it("accepts any .manus.computer dev preview origin", () => {
    expect(isAllowedOrigin("https://3000-abc123-xyz.sg1.manus.computer")).toBe(true);
    expect(isAllowedOrigin("https://3000-iva2i8is3f91ewr249bia-1cd744b4.us2.manus.computer")).toBe(true);
  });

  it("REJECTS unknown/malicious origins", () => {
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
    expect(isAllowedOrigin("https://totallook.ai.evil.com")).toBe(false);
    expect(isAllowedOrigin("https://fake-totallook.ai")).toBe(false);
    expect(isAllowedOrigin("https://manus.computer.evil.com")).toBe(false);
  });

  it("REJECTS http:// versions of production domains (must be https)", () => {
    expect(isAllowedOrigin("http://totallook.ai")).toBe(false);
    expect(isAllowedOrigin("http://www.totallook.ai")).toBe(false);
    expect(isAllowedOrigin("http://fashionrev-sgdphkr3.manus.space")).toBe(false);
  });

  it("REJECTS origins with trailing paths or slashes", () => {
    expect(isAllowedOrigin("https://totallook.ai/")).toBe(false);
    expect(isAllowedOrigin("https://totallook.ai/some/path")).toBe(false);
  });

  it("REJECTS empty string", () => {
    expect(isAllowedOrigin("")).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. REDIRECT DECISION LOGIC — same-origin vs cross-origin
 * ═══════════════════════════════════════════════════════════════════════════ */
describe("OAuth redirect decision logic", () => {
  // Simulate the server-side redirect decision from oauth.ts
  function getRedirectTarget(
    returnOrigin: string | undefined,
    returnPath: string,
    currentOrigin: string
  ): { type: "relay" | "local"; url: string } {
    if (returnOrigin && isAllowedOrigin(returnOrigin) && returnOrigin !== currentOrigin) {
      const relayUrl = new URL("/api/auth/relay", returnOrigin);
      relayUrl.searchParams.set("token", "test-token");
      relayUrl.searchParams.set("returnPath", returnPath);
      return { type: "relay", url: relayUrl.toString() };
    }
    return { type: "local", url: returnPath };
  }

  it("redirects to relay when user came from totallook.ai (cross-origin)", () => {
    const result = getRedirectTarget("https://totallook.ai", "/", CANONICAL_ORIGIN);
    expect(result.type).toBe("relay");
    expect(result.url).toContain("https://totallook.ai/api/auth/relay");
    expect(result.url).toContain("token=test-token");
    expect(result.url).toContain("returnPath=%2F");
  });

  it("redirects to relay when user came from www.totallook.ai (cross-origin)", () => {
    const result = getRedirectTarget("https://www.totallook.ai", "/upload", CANONICAL_ORIGIN);
    expect(result.type).toBe("relay");
    expect(result.url).toContain("https://www.totallook.ai/api/auth/relay");
    expect(result.url).toContain("returnPath=%2Fupload");
  });

  it("redirects locally when user came from same origin (manus.space)", () => {
    const result = getRedirectTarget(CANONICAL_ORIGIN, "/", CANONICAL_ORIGIN);
    expect(result.type).toBe("local");
    expect(result.url).toBe("/");
  });

  it("redirects locally when returnOrigin is undefined (legacy state)", () => {
    const result = getRedirectTarget(undefined, "/", CANONICAL_ORIGIN);
    expect(result.type).toBe("local");
    expect(result.url).toBe("/");
  });

  it("redirects locally when returnOrigin is a malicious domain (not allowed)", () => {
    const result = getRedirectTarget("https://evil.com", "/steal", CANONICAL_ORIGIN);
    expect(result.type).toBe("local");
    expect(result.url).toBe("/steal");
  });

  it("preserves returnPath in relay redirect", () => {
    const result = getRedirectTarget("https://totallook.ai", "/history", CANONICAL_ORIGIN);
    expect(result.type).toBe("relay");
    expect(result.url).toContain("returnPath=%2Fhistory");
  });

  it("redirects to relay for dev preview origins (cross-origin)", () => {
    const devOrigin = "https://3000-abc123.sg1.manus.computer";
    const result = getRedirectTarget(devOrigin, "/", CANONICAL_ORIGIN);
    expect(result.type).toBe("relay");
    expect(result.url).toContain(`${devOrigin}/api/auth/relay`);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. END-TO-END FLOW SIMULATION — Full login journey per domain
 * ═══════════════════════════════════════════════════════════════════════════ */
describe("OAuth end-to-end flow simulation", () => {
  // Simulates: user clicks login → state encoded → server decodes → decides redirect
  function simulateLoginFlow(userOrigin: string, returnPath = "/") {
    // Step 1: Frontend encodes state (getLoginUrl)
    const state = encodeNewState(userOrigin, returnPath);

    // Step 2: Server decodes state (after OAuth provider callback)
    const decoded = sdk.decodeOAuthState(state);

    // Step 3: Server decides where to redirect
    const serverOrigin = CANONICAL_ORIGIN;
    const shouldRelay =
      decoded.returnOrigin &&
      isAllowedOrigin(decoded.returnOrigin) &&
      decoded.returnOrigin !== serverOrigin;

    return {
      redirectUri: decoded.redirectUri,
      returnOrigin: decoded.returnOrigin,
      returnPath: decoded.returnPath,
      shouldRelay,
      redirectUriIsCanonical: decoded.redirectUri === CANONICAL_CALLBACK,
    };
  }

  it("totallook.ai → canonical redirect URI + relay back", () => {
    const flow = simulateLoginFlow("https://totallook.ai");
    expect(flow.redirectUriIsCanonical).toBe(true);
    expect(flow.shouldRelay).toBe(true);
    expect(flow.returnOrigin).toBe("https://totallook.ai");
  });

  it("www.totallook.ai → canonical redirect URI + relay back", () => {
    const flow = simulateLoginFlow("https://www.totallook.ai");
    expect(flow.redirectUriIsCanonical).toBe(true);
    expect(flow.shouldRelay).toBe(true);
    expect(flow.returnOrigin).toBe("https://www.totallook.ai");
  });

  it("manus.space → canonical redirect URI + NO relay (same origin)", () => {
    const flow = simulateLoginFlow(CANONICAL_ORIGIN);
    expect(flow.redirectUriIsCanonical).toBe(true);
    expect(flow.shouldRelay).toBe(false);
    expect(flow.returnOrigin).toBe(CANONICAL_ORIGIN);
  });

  it("dev preview → canonical redirect URI + relay back", () => {
    const flow = simulateLoginFlow("https://3000-abc123.sg1.manus.computer");
    expect(flow.redirectUriIsCanonical).toBe(true);
    expect(flow.shouldRelay).toBe(true);
  });

  it("localhost → canonical redirect URI + relay back", () => {
    const flow = simulateLoginFlow("http://localhost:3000");
    expect(flow.redirectUriIsCanonical).toBe(true);
    expect(flow.shouldRelay).toBe(true);
  });

  it("totallook.ai with /upload path → relay preserves path", () => {
    const flow = simulateLoginFlow("https://totallook.ai", "/upload");
    expect(flow.shouldRelay).toBe(true);
    expect(flow.returnPath).toBe("/upload");
  });

  it("malicious origin → canonical redirect URI but NO relay (blocked)", () => {
    const flow = simulateLoginFlow("https://evil.com");
    expect(flow.redirectUriIsCanonical).toBe(true);
    expect(flow.shouldRelay).toBe(false); // blocked by whitelist
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 6. WWW REDIRECT MIDDLEWARE — www.totallook.ai → totallook.ai
 * ═══════════════════════════════════════════════════════════════════════════ */
describe("www redirect middleware logic", () => {
  // Simulates the middleware from server/_core/index.ts
  function shouldRedirectWww(host: string): { redirect: boolean; target?: string } {
    if (host.startsWith("www.")) {
      const nonWwwHost = host.replace(/^www\./, "");
      return { redirect: true, target: `https://${nonWwwHost}` };
    }
    return { redirect: false };
  }

  it("redirects www.totallook.ai to totallook.ai", () => {
    const result = shouldRedirectWww("www.totallook.ai");
    expect(result.redirect).toBe(true);
    expect(result.target).toBe("https://totallook.ai");
  });

  it("does NOT redirect totallook.ai (no www)", () => {
    const result = shouldRedirectWww("totallook.ai");
    expect(result.redirect).toBe(false);
  });

  it("does NOT redirect manus.space domain", () => {
    const result = shouldRedirectWww("fashionrev-sgdphkr3.manus.space");
    expect(result.redirect).toBe(false);
  });

  it("does NOT redirect localhost", () => {
    const result = shouldRedirectWww("localhost:3000");
    expect(result.redirect).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 7. RELAY ENDPOINT VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════ */
describe("OAuth relay endpoint validation", () => {
  it("valid session token is accepted by verifySession", async () => {
    // Create a real token and verify it
    const token = await sdk.createSessionToken("test-open-id", {
      name: "Test User",
      expiresInMs: 60000,
    });
    const session = await sdk.verifySession(token);
    expect(session).not.toBeNull();
    expect(session?.openId).toBe("test-open-id");
  });

  it("expired/invalid token is rejected by verifySession", async () => {
    const session = await sdk.verifySession("invalid-token-garbage");
    expect(session).toBeNull();
  });

  it("empty token is rejected by verifySession", async () => {
    const session = await sdk.verifySession("");
    expect(session).toBeNull();
  });

  it("null token is rejected by verifySession", async () => {
    const session = await sdk.verifySession(null);
    expect(session).toBeNull();
  });

  it("undefined token is rejected by verifySession", async () => {
    const session = await sdk.verifySession(undefined);
    expect(session).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 8. SECURITY — Open redirect prevention
 * ═══════════════════════════════════════════════════════════════════════════ */
describe("OAuth security — open redirect prevention", () => {
  it("attacker cannot redirect to evil.com via returnOrigin", () => {
    const state = encodeNewState("https://evil.com");
    const decoded = sdk.decodeOAuthState(state);

    // The redirect URI is still canonical (good)
    expect(decoded.redirectUri).toBe(CANONICAL_CALLBACK);

    // But the returnOrigin is evil.com — server must NOT relay to it
    expect(isAllowedOrigin(decoded.returnOrigin!)).toBe(false);
  });

  it("attacker cannot use subdomain spoofing", () => {
    expect(isAllowedOrigin("https://totallook.ai.evil.com")).toBe(false);
    expect(isAllowedOrigin("https://evil-totallook.ai")).toBe(false);
    expect(isAllowedOrigin("https://manus.space.evil.com")).toBe(false);
  });

  it("attacker cannot use protocol downgrade", () => {
    expect(isAllowedOrigin("http://totallook.ai")).toBe(false);
    expect(isAllowedOrigin("http://fashionrev-sgdphkr3.manus.space")).toBe(false);
  });

  it("attacker cannot inject path into origin", () => {
    expect(isAllowedOrigin("https://totallook.ai/evil")).toBe(false);
    expect(isAllowedOrigin("https://totallook.ai/api/auth/relay?token=stolen")).toBe(false);
  });

  it("relay endpoint rejects forged tokens", async () => {
    const session = await sdk.verifySession("eyJhbGciOiJIUzI1NiJ9.eyJmYWtlIjp0cnVlfQ.fake-signature");
    expect(session).toBeNull();
  });
});
