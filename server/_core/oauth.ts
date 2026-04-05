/**
 * Railway Auth Module — Email + Password Authentication
 * Replaces Manus OAuth with a self-contained auth system.
 * 
 * Endpoints:
 *   POST /api/auth/register  — Create new account
 *   POST /api/auth/login     — Login with email+password
 *   GET  /api/auth/relay     — (backward compat, redirects to /)
 *   GET  /api/oauth/callback — (backward compat, redirects to /)
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import bcrypt from "bcryptjs";

export function registerOAuthRoutes(app: Express) {
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

      // Create user with email-based openId (since openId is required/unique)
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

      // Migrate guest data if fingerprint cookie exists
      const guestFingerprint = req.cookies?.["guest_fingerprint"] || null;
      if (guestFingerprint) {
        db.migrateGuestToUser(guestFingerprint, user.id).catch((err: any) => {
          console.warn("[Auth] Guest migration failed:", err?.message);
        });
      }

      // Create session
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[Auth] New user registered: ${email}`);
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Registration failed:", error);
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
        res.status(401).json({ 
          error: "המשתמש נרשם דרך מערכת ישנה. יש להירשם מחדש עם סיסמה.",
          needsReregister: true 
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

      // Migrate guest data if fingerprint cookie exists
      const guestFingerprint = req.cookies?.["guest_fingerprint"] || null;
      if (guestFingerprint) {
        db.migrateGuestToUser(guestFingerprint, user.id).catch((err: any) => {
          console.warn("[Auth] Guest migration failed:", err?.message);
        });
      }

      // Create session
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[Auth] User logged in: ${email}`);
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "שגיאה בהתחברות" });
    }
  });

  // Backward compatibility: old OAuth callback just redirects
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/");
  });

  // Backward compatibility: auth relay just redirects
  app.get("/api/auth/relay", (_req: Request, res: Response) => {
    res.redirect(302, "/");
  });
}
