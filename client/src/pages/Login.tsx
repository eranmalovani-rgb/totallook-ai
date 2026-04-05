import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Sparkles } from "lucide-react";

/**
 * Login / Register page — Editorial Noir Design
 * Matches the app's dark editorial magazine aesthetic with gold accents,
 * Heebo/Playfair Display fonts, and glass-morphism elements.
 */

// Google icon SVG
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Apple icon SVG
const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

type AuthProviders = {
  email: boolean;
  google: boolean;
  apple: boolean;
  googleClientId: string | null;
  googleOAuthRedirectConfigured?: boolean;
  appleClientId: string | null;
};

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Get return path from URL params
  const params = new URLSearchParams(window.location.search);
  const returnPath = params.get("returnPath") || "/";
  const urlError = params.get("error");

  // Fetch available auth providers
  useEffect(() => {
    fetch("/api/auth/providers")
      .then(res => res.json())
      .then(data => setProviders(data))
      .catch(() => setProviders({ email: true, google: false, apple: false, googleClientId: null, appleClientId: null }));
  }, []);

  // Show URL error
  useEffect(() => {
    if (urlError === "google_failed") setError("ההתחברות עם Google נכשלה. נסה שוב.");
    if (urlError === "apple_failed") setError("ההתחברות עם Apple נכשלה. נסה שוב.");
    if (urlError === "user_creation_failed") setError("שגיאה ביצירת המשתמש. נסה שוב.");
  }, [urlError]);

  // Google Sign-In button click
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    window.location.href = `/api/auth/google?returnPath=${encodeURIComponent(returnPath)}&origin=${encodeURIComponent(window.location.origin)}`;
  };

  // Apple Sign-In handler
  const handleAppleLogin = async () => {
    setAppleLoading(true);
    setError("");
    
    try {
      if (!(window as any).AppleID) {
        const script = document.createElement("script");
        script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
      }

      (window as any).AppleID.auth.init({
        clientId: providers?.appleClientId,
        scope: "name email",
        redirectURI: `${window.location.origin}/api/auth/apple/callback`,
        usePopup: true,
      });

      const response = await (window as any).AppleID.auth.signIn();
      
      const res = await fetch("/api/auth/apple/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: response.authorization.id_token,
          user: response.user,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ההתחברות עם Apple נכשלה");
        return;
      }
      window.location.href = returnPath;
    } catch (err: any) {
      if (err?.error !== "popup_closed_by_user") {
        setError("ההתחברות עם Apple נכשלה. נסה שוב.");
      }
    } finally {
      setAppleLoading(false);
    }
  };

  // Email + Password submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register" && name) {
        body.name = name;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "שגיאה בהתחברות");
        if (data.loginMethod === "google") {
          setError("המשתמש נרשם דרך Google. לחץ על כפתור Google למטה.");
        } else if (data.loginMethod === "apple") {
          setError("המשתמש נרשם דרך Apple. לחץ על כפתור Apple למטה.");
        }
        return;
      }

      window.location.href = returnPath;
    } catch (err) {
      setError("שגיאת רשת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Subtle gold radial glow top-right */}
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.14 75), transparent 70%)" }}
        />
        {/* Subtle glow bottom-left */}
        <div
          className="absolute -bottom-48 -right-48 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.14 75), transparent 70%)" }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-[420px]">

          {/* ===== BRAND HEADER ===== */}
          <div className="text-center mb-10">
            {/* Sparkle icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ 
                  background: "oklch(0.75 0.14 75 / 10%)",
                  border: "1px solid oklch(0.75 0.14 75 / 20%)"
                }}
              >
                <Sparkles className="w-7 h-7" style={{ color: "oklch(0.75 0.14 75)" }} />
              </div>
            </div>

            {/* Brand wordmark — matching Navbar */}
            <div className="flex items-center justify-center gap-0 mb-3" dir="ltr">
              <span className="text-3xl font-bold bg-gradient-to-r from-amber-300 to-primary bg-clip-text text-transparent">
                TotalLook
              </span>
              <span className="text-lg text-muted-foreground/70 font-medium">
                .ai
              </span>
            </div>

            {/* Editorial accent rule */}
            <div className="editorial-rule-accent mx-auto mb-4" />

            {/* Tagline */}
            <p className="text-muted-foreground text-sm font-light">
              {mode === "login" ? "ברוכים השבים — התחברו לחשבון" : "הצטרפו לחוויית האופנה החכמה"}
            </p>
          </div>

          {/* ===== AUTH CARD ===== */}
          <div
            className="p-6 sm:p-8"
            style={{
              background: "oklch(0.10 0.005 75 / 80%)",
              border: "1px solid oklch(1 0 0 / 6%)",
              borderRadius: "var(--radius-lg)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* OAuth Buttons */}
            <div className="space-y-3 mb-5">
              {/* Google Sign In */}
              {providers?.google && (providers.googleOAuthRedirectConfigured ?? true) && (
                <button
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 font-medium transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: "white",
                    color: "#374151",
                    borderRadius: "var(--radius)",
                    fontSize: "0.9rem",
                  }}
                  dir="ltr"
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  המשך עם Google
                </button>
              )}

              {/* Apple Sign In */}
              {providers?.apple && (
                <button
                  onClick={handleAppleLogin}
                  disabled={appleLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 font-medium transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: "#000",
                    color: "#fff",
                    border: "1px solid oklch(1 0 0 / 12%)",
                    borderRadius: "var(--radius)",
                    fontSize: "0.9rem",
                  }}
                  dir="ltr"
                >
                  {appleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <AppleIcon />
                  )}
                  המשך עם Apple
                </button>
              )}
            </div>

            {/* Divider */}
            {(providers?.google || providers?.apple) && (
              <div className="relative my-6">
                <div className="editorial-rule" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="px-4 text-xs tracking-widest uppercase"
                    style={{
                      background: "oklch(0.10 0.005 75)",
                      color: "oklch(0.55 0.01 75)",
                      fontFamily: "'Heebo', sans-serif",
                    }}
                  >
                    או
                  </span>
                </div>
              </div>
            )}

            {/* Email + Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: "oklch(0.55 0.01 75)" }}>
                    שם
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-300"
                    style={{
                      background: "oklch(1 0 0 / 4%)",
                      border: "1px solid oklch(1 0 0 / 8%)",
                      borderRadius: "var(--radius)",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "oklch(0.75 0.14 75 / 40%)"}
                    onBlur={(e) => e.target.style.borderColor = "oklch(1 0 0 / 8%)"}
                    placeholder="השם שלך"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: "oklch(0.55 0.01 75)" }}>
                  אימייל
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-300"
                  style={{
                    background: "oklch(1 0 0 / 4%)",
                    border: "1px solid oklch(1 0 0 / 8%)",
                    borderRadius: "var(--radius)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "oklch(0.75 0.14 75 / 40%)"}
                  onBlur={(e) => e.target.style.borderColor = "oklch(1 0 0 / 8%)"}
                  placeholder="your@email.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: "oklch(0.55 0.01 75)" }}>
                  סיסמה
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-300"
                  style={{
                    background: "oklch(1 0 0 / 4%)",
                    border: "1px solid oklch(1 0 0 / 8%)",
                    borderRadius: "var(--radius)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "oklch(0.75 0.14 75 / 40%)"}
                  onBlur={(e) => e.target.style.borderColor = "oklch(1 0 0 / 8%)"}
                  placeholder={mode === "register" ? "לפחות 6 תווים" : "הסיסמה שלך"}
                  dir="ltr"
                />
              </div>

              {error && (
                <div
                  className="p-3 text-sm"
                  style={{
                    background: "oklch(0.65 0.25 25 / 8%)",
                    border: "1px solid oklch(0.65 0.25 25 / 20%)",
                    borderRadius: "var(--radius)",
                    color: "oklch(0.75 0.18 25)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit button — editorial gold filled */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 font-medium transition-all duration-300 disabled:opacity-50 mt-2"
                style={{
                  background: "oklch(0.75 0.14 75)",
                  color: "oklch(0.07 0.003 75)",
                  borderRadius: "var(--radius)",
                  border: "1px solid oklch(0.75 0.14 75)",
                  fontSize: "0.9rem",
                  letterSpacing: "0.03em",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "oklch(0.80 0.16 75)";
                  e.currentTarget.style.borderColor = "oklch(0.80 0.16 75)";
                  e.currentTarget.style.boxShadow = "0 0 25px oklch(0.75 0.14 75 / 20%)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "oklch(0.75 0.14 75)";
                  e.currentTarget.style.borderColor = "oklch(0.75 0.14 75)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : mode === "login" ? (
                  "התחבר"
                ) : (
                  "צור חשבון"
                )}
              </button>
            </form>

            {/* Toggle mode */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
                className="text-sm transition-colors duration-300"
                style={{ color: "oklch(0.55 0.01 75)" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "oklch(0.80 0.005 75)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "oklch(0.55 0.01 75)"}
              >
                {mode === "login" ? (
                  <>אין לך חשבון? <span style={{ color: "oklch(0.75 0.14 75)" }}>הירשם כאן</span></>
                ) : (
                  <>יש לך חשבון? <span style={{ color: "oklch(0.75 0.14 75)" }}>התחבר כאן</span></>
                )}
              </button>
            </div>
          </div>

          {/* ===== FOOTER SECTION ===== */}
          <div className="mt-8 text-center space-y-4">
            {/* Guest option */}
            <button
              onClick={() => navigate("/")}
              className="text-sm transition-all duration-300 group"
              style={{ color: "oklch(0.45 0.01 75)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "oklch(0.65 0.01 75)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "oklch(0.45 0.01 75)"}
            >
              רוצה רק לנסות? <span style={{ color: "oklch(0.75 0.14 75 / 70%)" }}>המשך כאורח →</span>
            </button>

            {/* Editorial rule */}
            <div className="editorial-rule mx-auto max-w-[200px]" />

            {/* Privacy note */}
            <p className="text-xs leading-relaxed" style={{ color: "oklch(0.40 0.005 75)" }}>
              בהתחברות אתה מסכים ל
              <a
                href="/privacy"
                className="underline underline-offset-2 transition-colors duration-300"
                style={{ color: "oklch(0.50 0.01 75)" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "oklch(0.75 0.14 75)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "oklch(0.50 0.01 75)"}
              >
                מדיניות הפרטיות
              </a>
              {" "}ול
              <a
                href="/terms"
                className="underline underline-offset-2 transition-colors duration-300"
                style={{ color: "oklch(0.50 0.01 75)" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "oklch(0.75 0.14 75)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "oklch(0.50 0.01 75)"}
              >
                תנאי השימוש
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
