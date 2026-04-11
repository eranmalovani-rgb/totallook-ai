import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Privacy & Consent features", () => {
  const clientSrcDir = path.resolve(__dirname, "../client/src");

  it("CookieConsent component exists and has accept/decline", () => {
    const cookiePath = path.join(clientSrcDir, "components/CookieConsent.tsx");
    expect(fs.existsSync(cookiePath)).toBe(true);
    const content = fs.readFileSync(cookiePath, "utf-8");
    expect(content).toContain("totallook_cookie_consent");
    expect(content).toContain("hasCookieConsent");
    // Has both accept and decline
    expect(content).toContain("accepted");
    expect(content).toContain("declined");
  });

  it("CookieConsent is mounted in App.tsx", () => {
    const appContent = fs.readFileSync(
      path.join(clientSrcDir, "App.tsx"),
      "utf-8"
    );
    expect(appContent).toContain("CookieConsent");
    expect(appContent).toContain("import CookieConsent");
  });

  it("Onboarding page has terms consent checkbox", () => {
    const onboardingContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Onboarding.tsx"),
      "utf-8"
    );
    expect(onboardingContent).toContain("agreedToTerms");
    expect(onboardingContent).toContain('href="/terms"');
    expect(onboardingContent).toContain('href="/privacy"');
    expect(onboardingContent).toContain("תנאי השימוש");
    expect(onboardingContent).toContain("מדיניות הפרטיות");
  });

  it("GuestUpload page has terms consent checkbox", () => {
    const guestContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/GuestUpload.tsx"),
      "utf-8"
    );
    expect(guestContent).toContain("agreedToTerms");
    expect(guestContent).toContain('href="/terms"');
    expect(guestContent).toContain('href="/privacy"');
    expect(guestContent).toContain("Terms of Service");
    expect(guestContent).toContain("Privacy Policy");
  });

  it("Profile page has privacy & data section with export and delete", () => {
    const profileContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Profile.tsx"),
      "utf-8"
    );
    expect(profileContent).toContain("PrivacyDataSection");
    expect(profileContent).toContain("exportMyData");
    expect(profileContent).toContain("deleteAccount");
    expect(profileContent).toContain("פרטיות ונתונים"); // Hebrew: Privacy & Data
    expect(profileContent).toContain("ייצוא הנתונים שלי"); // Hebrew: Export My Data
    expect(profileContent).toContain("מחיקת חשבון"); // Hebrew: Delete Account
  });

  it("Profile page has consent toggles for marketing and WhatsApp", () => {
    const profileContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Profile.tsx"),
      "utf-8"
    );
    expect(profileContent).toContain("marketingConsent");
    expect(profileContent).toContain("whatsappConsent");
    expect(profileContent).toContain("logConsent");
    expect(profileContent).toContain("getMyConsents");
    expect(profileContent).toContain("תקשורת שיווקית"); // Hebrew: Marketing Communications
    expect(profileContent).toContain("הודעות WhatsApp"); // Hebrew: WhatsApp Messages
  });

  it("Server has consent logging and retrieval endpoints", () => {
    const routersContent = fs.readFileSync(
      path.resolve(__dirname, "routers.ts"),
      "utf-8"
    );
    expect(routersContent).toContain("logConsent");
    expect(routersContent).toContain("getMyConsents");
    expect(routersContent).toContain("getUserConsents");
    expect(routersContent).toContain('consentType: z.enum(');
  });

  it("Database has consent helper functions", () => {
    const dbContent = fs.readFileSync(
      path.resolve(__dirname, "db.ts"),
      "utf-8"
    );
    expect(dbContent).toContain("logConsent");
    expect(dbContent).toContain("getUserConsents");
  });

  it("Privacy and Terms pages exist and link to each other", () => {
    const privacyContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Privacy.tsx"),
      "utf-8"
    );
    const termsContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Terms.tsx"),
      "utf-8"
    );
    expect(privacyContent).toContain('href="/terms"');
    expect(termsContent).toContain('href="/privacy"');
  });

  it("Footer links to privacy and terms from main pages", () => {
    const homeContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Home.tsx"),
      "utf-8"
    );
    expect(homeContent).toContain('href="/terms"');
    expect(homeContent).toContain('href="/privacy"');
  });
});
