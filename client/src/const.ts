export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * The canonical origin used for the OAuth redirect URI.
 * Uses the current window origin so it works on any domain
 * (production totallook.ai, staging manus.space, dev tunnels, etc.).
 */
const getCanonicalOrigin = () => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

const getSafeFallbackUrl = () => {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/`;
};

/**
 * Build the OAuth login URL.
 *
 * – The `redirectUri` points at the current origin's callback.
 * – The `state` parameter carries **both** the redirect URI (needed by the
 *   token-exchange step) **and** the caller's origin so the server can send
 *   the user back to the correct domain after login.
 *
 * State format (base64-encoded JSON):
 *   { "redirectUri": "https://<current-origin>/api/oauth/callback", "returnOrigin": "https://<current-origin>" }
 */
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = (import.meta.env.VITE_OAUTH_PORTAL_URL || "").trim();
  const appId = (import.meta.env.VITE_APP_ID || "").trim();

  const canonicalOrigin = getCanonicalOrigin();

  // Always use the current origin for the redirect URI
  const redirectUri = `${canonicalOrigin}/api/oauth/callback`;

  // In preview/dev tunnels OAuth env vars may be missing.
  // Return a safe URL instead of crashing the entire app.
  if (!oauthPortalUrl || !appId) {
    return getSafeFallbackUrl();
  }

  // Include guest fingerprint in state so server can migrate guest data even if cookie is lost
  const guestFp = typeof localStorage !== 'undefined' ? localStorage.getItem('tl_guest_fp') : null;
  // Encode both the redirect URI and the caller's origin + optional path
  const statePayload = JSON.stringify({
    redirectUri,
    returnOrigin: canonicalOrigin,
    returnPath: returnPath || "/",
    ...(guestFp ? { guestFingerprint: guestFp } : {}),
  });
  const state = btoa(statePayload);

  let url: URL;
  try {
    const normalizedPortal = /^https?:\/\//.test(oauthPortalUrl)
      ? oauthPortalUrl
      : `https://${oauthPortalUrl}`;
    url = new URL("/app-auth", normalizedPortal);
  } catch {
    return getSafeFallbackUrl();
  }
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
