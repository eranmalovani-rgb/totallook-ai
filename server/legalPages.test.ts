import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Legal pages", () => {
  const clientSrcDir = path.resolve(__dirname, "../client/src");

  it("Terms page component exists", () => {
    const termsPath = path.join(clientSrcDir, "pages/Terms.tsx");
    expect(fs.existsSync(termsPath)).toBe(true);
  });

  it("Privacy page component exists", () => {
    const privacyPath = path.join(clientSrcDir, "pages/Privacy.tsx");
    expect(fs.existsSync(privacyPath)).toBe(true);
  });

  it("Terms page contains Hebrew content", () => {
    const termsContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Terms.tsx"),
      "utf-8"
    );
    expect(termsContent).toContain("תנאי שימוש");
    expect(termsContent).toContain("Terms of Service");
    expect(termsContent).toContain("eranmalovani@gmail.com");
    expect(termsContent).toContain("קניין רוחני");
    expect(termsContent).toContain("הגבלת אחריות");
  });

  it("Privacy page contains Hebrew content", () => {
    const privacyContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Privacy.tsx"),
      "utf-8"
    );
    expect(privacyContent).toContain("מדיניות פרטיות");
    expect(privacyContent).toContain("Privacy Policy");
    expect(privacyContent).toContain("eranmalovani@gmail.com");
    expect(privacyContent).toContain("עוגיות");
    expect(privacyContent).toContain("זכויות המשתמש");
  });

  it("Terms page contains English content", () => {
    const termsContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Terms.tsx"),
      "utf-8"
    );
    expect(termsContent).toContain("Intellectual Property");
    expect(termsContent).toContain("Limitation of Liability");
    expect(termsContent).toContain("Acceptable and Prohibited Use");
    expect(termsContent).toContain("AI-Generated Content");
  });

  it("Privacy page contains English content", () => {
    const privacyContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Privacy.tsx"),
      "utf-8"
    );
    expect(privacyContent).toContain("Information We Collect");
    expect(privacyContent).toContain("Data Storage and Security");
    expect(privacyContent).toContain("Cookies");
    expect(privacyContent).toContain("User Rights");
    expect(privacyContent).toContain("Children's Privacy");
  });

  it("App.tsx has routes for /terms and /privacy", () => {
    const appContent = fs.readFileSync(
      path.join(clientSrcDir, "App.tsx"),
      "utf-8"
    );
    expect(appContent).toContain('path="/terms"');
    expect(appContent).toContain('path="/privacy"');
    expect(appContent).toContain("import Terms");
    expect(appContent).toContain("import Privacy");
  });

  it("Home page footer has links to terms and privacy", () => {
    const homeContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Home.tsx"),
      "utf-8"
    );
    expect(homeContent).toContain('href="/terms"');
    expect(homeContent).toContain('href="/privacy"');
  });

  it("Upload page has footer links to terms and privacy", () => {
    const uploadContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Upload.tsx"),
      "utf-8"
    );
    expect(uploadContent).toContain('href="/terms"');
    expect(uploadContent).toContain('href="/privacy"');
    expect(uploadContent).toContain('eranmalovani@gmail.com');
  });

  it("Terms page links to privacy and vice versa", () => {
    const termsContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Terms.tsx"),
      "utf-8"
    );
    const privacyContent = fs.readFileSync(
      path.join(clientSrcDir, "pages/Privacy.tsx"),
      "utf-8"
    );
    expect(termsContent).toContain('href="/privacy"');
    expect(privacyContent).toContain('href="/terms"');
  });
});
