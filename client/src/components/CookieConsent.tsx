import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { useLanguage } from "@/i18n";
import { Link } from "wouter";

const COOKIE_CONSENT_KEY = "totallook_cookie_consent";

type ConsentState = "accepted" | "declined" | null;

function getConsentState(): ConsentState {
  try {
    const val = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (val === "accepted" || val === "declined") return val;
    return null;
  } catch {
    return null;
  }
}

function setConsentState(state: "accepted" | "declined") {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, state);
  } catch {
    // localStorage not available
  }
}

export function hasCookieConsent(): boolean {
  return getConsentState() === "accepted";
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { lang, dir } = useLanguage();

  useEffect(() => {
    // Show banner only if no consent decision has been made
    const state = getConsentState();
    if (state === null) {
      // Small delay to avoid layout shift on load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setConsentState("accepted");
    setVisible(false);
  };

  const handleDecline = () => {
    setConsentState("declined");
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-5 duration-500"
      dir={dir}
    >
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1">
              {lang === "he" ? "עוגיות ופרטיות" : "Cookies & Privacy"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === "he"
                ? "אנחנו משתמשים בעוגיות חיוניות בלבד לצורך תפקוד האתר (התחברות, שפה). איננו משתמשים בעוגיות מעקב, פרסום או צד שלישי. התמונות שלך מעובדות באופן מאובטח ולא משמשות לאימון AI."
                : "We use only essential cookies for site functionality (login, language). We do not use tracking, advertising, or third-party cookies. Your photos are processed securely and never used for AI training."}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {lang === "he" ? "קרא/י את " : "Read our "}
              <Link href="/privacy" className="text-primary hover:underline">
                {lang === "he" ? "מדיניות הפרטיות" : "Privacy Policy"}
              </Link>
              {lang === "he" ? " ו" : " and "}
              <Link href="/terms" className="text-primary hover:underline">
                {lang === "he" ? "תנאי השימוש" : "Terms of Service"}
              </Link>
              {lang === "he" ? " שלנו." : "."}
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="shrink-0 p-1 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDecline}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {lang === "he" ? "דחייה" : "Decline"}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="text-xs rounded-xl"
          >
            {lang === "he" ? "מסכים/ה" : "Accept"}
          </Button>
        </div>
      </div>
    </div>
  );
}
