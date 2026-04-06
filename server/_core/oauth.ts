import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { notifyOwner } from "./notification";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Allowed origins that we trust for post-login redirects.
 * This prevents open-redirect attacks — only our own domains are accepted.
 */
const ALLOWED_ORIGINS = new Set([
  "https://fashionrev-sgdphkr3.manus.space",
  "https://totallook.ai",
  "https://www.totallook.ai",
]);

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Also allow localhost / dev-server origins for development
  if (origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:")) return true;
  // Allow any *.manus.computer dev preview origins
  if (/^https:\/\/[^/]+\.manus\.computer$/.test(origin)) return true;
  return false;
}

/**
 * Fire-and-forget: notify the owner about a new user signup.
 * Uses the built-in Manus notification service.
 * Never throws — errors are logged and swallowed.
 */
async function notifyNewUserSignup(userName: string | null, email: string | null, loginMethod: string | null) {
  try {
    const displayName = userName || "משתמש אנונימי";
    const emailStr = email ? ` (${email})` : "";
    const methodStr = loginMethod ? ` דרך ${loginMethod}` : "";
    const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

    await notifyOwner({
      title: `🆕 משתמש חדש נרשם: ${displayName}`,
      content: `משתמש חדש נרשם ל-TotalLook.ai!\n\nשם: ${displayName}${emailStr}\nשיטת התחברות: ${methodStr || "לא ידוע"}\nזמן: ${now}`,
    });

    console.log(`[OAuth] New user notification sent for: ${displayName}`);
  } catch (err) {
    console.warn("[OAuth] Failed to send new user notification:", err);
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // Parse state to extract returnOrigin (the domain the user came from)
      const stateData = sdk.decodeOAuthState(state);
      const returnOrigin = stateData.returnOrigin;
      const returnPath = stateData.returnPath || "/";

      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is a new user (not yet in DB)
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Fire-and-forget notification for new users
      if (isNewUser) {
        notifyNewUserSignup(
          userInfo.name || null,
          userInfo.email ?? null,
          userInfo.loginMethod ?? userInfo.platform ?? null
        );
      }

      // Get the user's DB id for guest migration
      const dbUser = await db.getUserByOpenId(userInfo.openId);

      // Fire-and-forget: migrate guest data to the new registered user
      // The fingerprint is passed via a cookie set by the guest flow
      if (dbUser?.id) {
        const guestFingerprint = req.cookies?.["guest_fingerprint"] || null;
        if (guestFingerprint) {
          db.migrateGuestToUser(guestFingerprint, dbUser.id).catch((err: any) => {
            console.warn("[OAuth] Guest migration failed:", err?.message);
          });
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // If the user came from a different domain (e.g. totallook.ai), redirect
      // them back there.  The session cookie is set with sameSite=none + secure,
      // so it will be sent on cross-site requests.  But because the cookie
      // domain is the canonical manus.space, we need a small relay: redirect to
      // the return origin with the session token as a query parameter so that
      // origin can set its own cookie.
      const currentOrigin = `${req.protocol}://${req.get("host")}`;

      if (returnOrigin && isAllowedOrigin(returnOrigin) && returnOrigin !== currentOrigin) {
        // Redirect to the return origin's auth-relay endpoint with the token
        const relayUrl = new URL("/api/auth/relay", returnOrigin);
        relayUrl.searchParams.set("token", sessionToken);
        relayUrl.searchParams.set("returnPath", returnPath);
        console.log(`[OAuth] Redirecting to return origin: ${returnOrigin}${returnPath}`);
        res.redirect(302, relayUrl.toString());
      } else {
        // Same origin or no return origin — redirect to home
        res.redirect(302, returnPath);
      }
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  /**
   * Auth relay endpoint — receives a session token from the canonical domain
   * and sets it as a cookie on this domain, then redirects to the return path.
   * This allows cross-domain login: OAuth completes on manus.space, then the
   * user is bounced here to get the cookie set on totallook.ai.
   */
  app.get("/api/auth/relay", async (req: Request, res: Response) => {
    const token = getQueryParam(req, "token");
    const returnPath = getQueryParam(req, "returnPath") || "/";

    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    // Verify the token is valid before setting it as a cookie
    const session = await sdk.verifySession(token);
    if (!session) {
      res.status(401).json({ error: "Invalid session token" });
      return;
    }

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    console.log(`[OAuth] Auth relay: cookie set, redirecting to ${returnPath}`);
    res.redirect(302, returnPath);
  });
}
