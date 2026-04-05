/**
 * Railway Auth Module — Multi-Provider Authentication
 * Supports: Google OAuth, Apple Sign In, Email+Password
 * 
 * Endpoints:
 *   POST /api/auth/register       — Create new account with email+password
 *   POST /api/auth/login          — Login with email+password
 *   GET  /api/auth/google         — Start Google OAuth flow
 *   GET  /api/auth/google/callback — Google OAuth callback
 *   POST /api/auth/google/token   — Google One-Tap / mobile token verification
 *   POST /api/auth/apple/token    — Apple Sign In token verification
 *   GET  /api/oauth/callback      — (backward compat, redirects to /)
 *   GET  /api/auth/relay          — (backward compat, redirects to /)
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { ENV } from "./env";
import * as jose from "jose";
import {
  decodeOAuthState,
  encodeOAuthState,
  getCanonicalSiteOrigin,
  resolveReturnOrigin,
  sanitizeReturnPath,
} from "./oauthOrigin";

// ============ Google OAuth Setup ============
function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  
  // Always use a canonical callback origin to avoid redirect URI mismatches
  // between www/non-www and preview aliases.
  const callbackOrigin = getCanonicalSiteOrigin(ENV.siteUrl);
  const redirectUri = `${callbackOrigin}/api/auth/google/callback`;
  
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

// ============ Apple Sign In Helpers ============
async function verifyAppleToken(idToken: string): Promise<{
  sub: string;
  email?: string;
  email_verified?: boolean;
} | null> {
  try {
    // Fetch Apple's public keys
    const JWKS = jose.createRemoteJWKSet(
      new URL("https://appleid.apple.com/auth/keys")
    );
    
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_CLIENT_ID,
    });
    
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
    };
  } catch (error) {
    console.error("[Auth/Apple] Token verification failed:", error);
    return null;
  }
}

// ============ Shared Auth Helpers ============
async function createSessionAndSetCookie(
  req: Request,
  res: Response,
  openId: string,
  name: string
) {
  const sessionToken = await sdk.createSessionToken(openId, {
    name,
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  return sessionToken;
}

async function handleGuestMigration(req: Request, userId: number) {
  const guestFingerprint = req.cookies?.["guest_fingerprint"] || null;
  if (guestFingerprint) {
    db.migrateGuestToUser(guestFingerprint, userId).catch((err: any) => {
      console.warn("[Auth] Guest migration failed:", err?.message);
    });
  }
}

async function findOrCreateOAuthUser(params: {
  provider: "google" | "apple";
  providerId: string;
  email?: string | null;
  name?: string | null;
}) {
  const { provider, providerId, email, name } = params;
  const openId = `${provider}_${providerId}`;

  // First, try to find by openId (returning user with same provider)
  let user = await db.getUserByOpenId(openId);
  
  if (!user && email) {
    // Check if user exists with this email (from another provider or email registration)
    const existingUser = await db.getUserByEmail(email.toLowerCase().trim());
    
    if (existingUser) {
      // Link this provider to existing account by updating openId
      // But we can't change openId since it's unique. Instead, create a new entry
      // that maps to the same email. The user can use either method.
      // For simplicity: if user exists with same email, just log them in as that user.
      user = existingUser;
      console.log(`[Auth/${provider}] Linked to existing user by email: ${email}`);
    }
  }

  if (!user) {
    // Create new user
    await db.upsertUser({
      openId,
      name: name || null,
      email: email?.toLowerCase().trim() || null,
      loginMethod: provider,
      lastSignedIn: new Date(),
    });
    user = await db.getUserByOpenId(openId);
  } else {
    // Update last sign in
    await db.upsertUser({
      openId: user.openId,
      name: name || user.name,
      lastSignedIn: new Date(),
    });
  }

  return user;
}

// ============ Route Registration ============
export function registerOAuthRoutes(app: Express) {
  
  // ──────────── Email + Password ────────────

  /**
   * Register a new user with email + password
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "אימייל וסיסמה נדרשים" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "הסיסמה חייבת להכיל לפחות 6 תווים" });
        return;
      }

      // Check if user already exists by email
      const existingUser = await db.getUserByEmail(email.toLowerCase().trim());
      if (existingUser) {
        res.status(409).json({ error: "כתובת האימייל כבר רשומה במערכת" });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user with email-based openId
      const openId = `email_${email.toLowerCase().trim()}`;
      
      await db.upsertUser({
        openId,
        name: name || null,
        email: email.toLowerCase().trim(),
        loginMethod: "email",
        lastSignedIn: new Date(),
        passwordHash,
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        res.status(500).json({ error: "שגיאה ביצירת המשתמש" });
        return;
      }

      await handleGuestMigration(req, user.id);
      await createSessionAndSetCookie(req, res, openId, name || "");

      console.log(`[Auth/Email] New user registered: ${email}`);
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth/Email] Registration failed:", error);
      res.status(500).json({ error: "שגיאה בהרשמה" });
    }
  });

  /**
   * Login with email + password
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "אימייל וסיסמה נדרשים" });
        return;
      }

      const user = await db.getUserByEmail(email.toLowerCase().trim());
      if (!user) {
        res.status(401).json({ error: "אימייל או סיסמה שגויים" });
        return;
      }

      // Verify password
      if (!user.passwordHash) {
        // User registered via OAuth, suggest using that method
        const method = user.loginMethod === "google" ? "Google" : 
                       user.loginMethod === "apple" ? "Apple" : "מערכת ישנה";
        res.status(401).json({ 
          error: `המשתמש נרשם דרך ${method}. יש להתחבר באותה שיטה.`,
          loginMethod: user.loginMethod,
        });
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "אימייל או סיסמה שגויים" });
        return;
      }

      // Update last sign in
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      await handleGuestMigration(req, user.id);
      await createSessionAndSetCookie(req, res, user.openId, user.name || "");

      console.log(`[Auth/Email] User logged in: ${email}`);
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth/Email] Login failed:", error);
      res.status(500).json({ error: "שגיאה בהתחברות" });
    }
  });

  // ──────────── Google OAuth ────────────

  /**
   * Start Google OAuth flow (redirect to Google)
   */
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const requestedOrigin = typeof req.query.origin === "string"
      ? req.query.origin
      : Array.isArray(req.headers.origin)
        ? req.headers.origin[0]
        : req.headers.origin;
    const origin = resolveReturnOrigin(requestedOrigin, ENV.siteUrl);
    const returnPath = sanitizeReturnPath(req.query.returnPath);
    const client = getGoogleClient();
    
    if (!client) {
      res.redirect(`${origin}/login?error=google_failed`);
      return;
    }

    const state = encodeOAuthState({ returnPath, origin });
    
    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      state,
      prompt: "select_account",
    });

    res.redirect(authUrl);
  });

  /**
   * Google OAuth callback
   */
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      
      let returnPath = "/";
      let origin = getCanonicalSiteOrigin(ENV.siteUrl);
      
      if (state) {
        const decoded = decodeOAuthState(state);
        returnPath = sanitizeReturnPath(decoded.returnPath);
        origin = resolveReturnOrigin(decoded.origin, ENV.siteUrl);
      }

      const client = getGoogleClient();
      if (!client || !code) {
        res.redirect(`${origin}/login?error=google_failed`);
        return;
      }

      const { tokens } = await client.getToken(code as string);
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        res.redirect(`${origin}/login?error=google_failed`);
        return;
      }

      const user = await findOrCreateOAuthUser({
        provider: "google",
        providerId: payload.sub,
        email: payload.email,
        name: payload.name,
      });

      if (!user) {
        res.redirect(`${origin}/login?error=user_creation_failed`);
        return;
      }

      await handleGuestMigration(req, user.id);
      await createSessionAndSetCookie(req, res, user.openId, user.name || "");

      console.log(`[Auth/Google] User logged in: ${payload.email}`);
      res.redirect(`${origin}${returnPath}`);
    } catch (error) {
      console.error("[Auth/Google] Callback failed:", error);
      const fallbackOrigin = getCanonicalSiteOrigin(ENV.siteUrl);
      res.redirect(`${fallbackOrigin}/login?error=google_failed`);
    }
  });

  /**
   * Google One-Tap / Mobile token verification
   * Used when the client-side Google Sign-In returns a credential token directly
   */
  app.post("/api/auth/google/token", async (req: Request, res: Response) => {
    try {
      const { credential, returnPath } = req.body;
      
      if (!credential) {
        res.status(400).json({ error: "Missing Google credential" });
        return;
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        res.status(503).json({ error: "Google OAuth is not configured" });
        return;
      }

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        res.status(401).json({ error: "Invalid Google token" });
        return;
      }

      const user = await findOrCreateOAuthUser({
        provider: "google",
        providerId: payload.sub,
        email: payload.email,
        name: payload.name,
      });

      if (!user) {
        res.status(500).json({ error: "שגיאה ביצירת המשתמש" });
        return;
      }

      await handleGuestMigration(req, user.id);
      await createSessionAndSetCookie(req, res, user.openId, user.name || "");

      console.log(`[Auth/Google] User logged in via token: ${payload.email}`);
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth/Google] Token verification failed:", error);
      res.status(401).json({ error: "Google authentication failed" });
    }
  });

  // ──────────── Apple Sign In ────────────

  /**
   * Apple Sign In token verification
   * The client-side Apple Sign In JS SDK returns an id_token
   */
  app.post("/api/auth/apple/token", async (req: Request, res: Response) => {
    try {
      const { id_token, user: appleUser } = req.body;
      
      if (!id_token) {
        res.status(400).json({ error: "Missing Apple id_token" });
        return;
      }

      if (!process.env.APPLE_CLIENT_ID) {
        res.status(503).json({ error: "Apple Sign In is not configured" });
        return;
      }

      const applePayload = await verifyAppleToken(id_token);
      if (!applePayload) {
        res.status(401).json({ error: "Invalid Apple token" });
        return;
      }

      // Apple only sends name on first sign-in
      const name = appleUser?.name 
        ? `${appleUser.name.firstName || ""} ${appleUser.name.lastName || ""}`.trim()
        : null;

      const user = await findOrCreateOAuthUser({
        provider: "apple",
        providerId: applePayload.sub,
        email: applePayload.email,
        name,
      });

      if (!user) {
        res.status(500).json({ error: "שגיאה ביצירת המשתמש" });
        return;
      }

      await handleGuestMigration(req, user.id);
      await createSessionAndSetCookie(req, res, user.openId, user.name || "");

      console.log(`[Auth/Apple] User logged in: ${applePayload.email || applePayload.sub}`);
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth/Apple] Token verification failed:", error);
      res.status(401).json({ error: "Apple authentication failed" });
    }
  });

  // Apple can also POST to a callback URL (for web-based flow)
  app.post("/api/auth/apple/callback", async (req: Request, res: Response) => {
    try {
      const { id_token, user: appleUserStr } = req.body;
      
      if (!id_token || !process.env.APPLE_CLIENT_ID) {
        res.redirect("/login?error=apple_failed");
        return;
      }

      const applePayload = await verifyAppleToken(id_token);
      if (!applePayload) {
        res.redirect("/login?error=apple_failed");
        return;
      }

      let name: string | null = null;
      if (appleUserStr) {
        try {
          const appleUser = typeof appleUserStr === "string" ? JSON.parse(appleUserStr) : appleUserStr;
          name = appleUser?.name 
            ? `${appleUser.name.firstName || ""} ${appleUser.name.lastName || ""}`.trim()
            : null;
        } catch {}
      }

      const user = await findOrCreateOAuthUser({
        provider: "apple",
        providerId: applePayload.sub,
        email: applePayload.email,
        name,
      });

      if (!user) {
        res.redirect("/login?error=user_creation_failed");
        return;
      }

      await handleGuestMigration(req, user.id);
      await createSessionAndSetCookie(req, res, user.openId, user.name || "");

      console.log(`[Auth/Apple] User logged in via callback: ${applePayload.email || applePayload.sub}`);
      res.redirect("/");
    } catch (error) {
      console.error("[Auth/Apple] Callback failed:", error);
      res.redirect("/login?error=apple_failed");
    }
  });

  // ──────────── Auth Info Endpoint ────────────

  /**
   * Returns available auth providers (for client to show correct buttons)
   */
  app.get("/api/auth/providers", (_req: Request, res: Response) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || null;
    res.json({
      email: true,
      google: !!googleClientId,
      apple: !!process.env.APPLE_CLIENT_ID,
      googleClientId,
      googleOAuthRedirectConfigured: !!(googleClientId && googleClientSecret),
      appleClientId: process.env.APPLE_CLIENT_ID || null,
    });
  });

  // ──────────── Backward Compatibility ────────────

  // Old OAuth callback just redirects
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/");
  });

  // Auth relay just redirects
  app.get("/api/auth/relay", (_req: Request, res: Response) => {
    res.redirect(302, "/");
  });
}
