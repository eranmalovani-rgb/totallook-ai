export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * The canonical origin used for the OAuth redirect URI.
 * Since the app is deployed on Railway with the custom domain totallook.ai,
 * we route the OAuth callback directly through this domain.
 */
const CANONICAL_ORIGIN = "https://totallook.ai";

const getSafeFallbackUrl = () => {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/`;
};

/**
 * Build the OAuth login URL.
 *
 * – The `redirectUri` points at the canonical totallook.ai callback.
 * – The `state` parameter carries **both** the redirect URI (needed by the
 *   token-exchange step) **and** the caller's origin so the server can send
 *   the user back to the correct domain after login.
 *
 * State format (base64-encoded JSON):
 *   { "redirectUri": "https://totallook.ai/api/oauth/callback", "returnOrigin": "https://totallook.ai" }
 */
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = (import.meta.env.VITE_OAUTH_PORTAL_URL || "").trim();
  const appId = (import.meta.env.VITE_APP_ID || "").trim();

  // Always use the canonical origin for the redirect URI
  const redirectUri = `${CANONICAL_ORIGIN}/api/oauth/callback`;

  // In preview/dev tunnels OAuth env vars may be missing.
  // Return a safe URL instead of crashing the entire app.
  if (!oauthPortalUrl || !appId) {
    return getSafeFallbackUrl();
  }

  // Encode both the redirect URI and the caller's origin + optional path
  const statePayload = JSON.stringify({
    redirectUri,
    returnOrigin: window.location.origin,
    returnPath: returnPath || "/",
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
