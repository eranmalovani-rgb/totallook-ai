import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Login / Register page — Multi-provider authentication
 * Supports: Google OAuth, Apple Sign In, Email + Password
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

  // Initialize Google Sign-In
  useEffect(() => {
    if (!providers?.google || !providers.googleClientId) return;

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (window as any).google?.accounts.id.initialize({
        client_id: providers.googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
      });
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [providers?.google, providers?.googleClientId]);

  // Google credential response handler
  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential, returnPath }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ההתחברות עם Google נכשלה");
        return;
      }
      window.location.href = returnPath;
    } catch {
      setError("שגיאת רשת. נסה שוב.");
    } finally {
      setGoogleLoading(false);
    }
  }, [returnPath]);

  // Google Sign-In button click
  const handleGoogleLogin = () => {
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: redirect to server-side OAuth flow
          window.location.href = `/api/auth/google?returnPath=${encodeURIComponent(returnPath)}&origin=${encodeURIComponent(window.location.origin)}`;
        }
      });
    } else {
      // Fallback: redirect to server-side OAuth flow
      window.location.href = `/api/auth/google?returnPath=${encodeURIComponent(returnPath)}&origin=${encodeURIComponent(window.location.origin)}`;
    }
  };

  // Apple Sign-In handler
  const handleAppleLogin = async () => {
    setAppleLoading(true);
    setError("");
    
    try {
      // Load Apple JS SDK if not loaded
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
      
      // Send token to our server
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
        // If user registered via OAuth, suggest that method
        if (data.loginMethod === "google") {
          setError("המשתמש נרשם דרך Google. לחץ על כפתור Google למטה.");
        } else if (data.loginMethod === "apple") {
          setError("המשתמש נרשם דרך Apple. לחץ על כפתור Apple למטה.");
        }
        return;
      }

      // Success — redirect to return path
      window.location.href = returnPath;
    } catch (err) {
      setError("שגיאת רשת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-l from-purple-400 to-blue-400 bg-clip-text text-transparent">
            TotalLook.ai
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === "login" ? "התחברות לחשבון" : "יצירת חשבון חדש"}
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          {/* Google Sign In */}
          {providers?.google && (
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-800 font-medium hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50"
              dir="ltr"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>
          )}

          {/* Apple Sign In */}
          {providers?.apple && (
            <button
              onClick={handleAppleLogin}
              disabled={appleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-900 transition-colors border border-gray-700 disabled:opacity-50"
              dir="ltr"
            >
              {appleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <AppleIcon />
              )}
              Continue with Apple
            </button>
          )}
        </div>

        {/* Divider */}
        {(providers?.google || providers?.apple) && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">או</span>
            </div>
          </div>
        )}

        {/* Email + Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1">שם</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="השם שלך"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="your@email.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder={mode === "register" ? "לפחות 6 תווים" : "הסיסמה שלך"}
              dir="ltr"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-l from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : mode === "login" ? "התחבר" : "הירשם"}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? (
              <>אין לך חשבון? <span className="text-purple-400">הירשם כאן</span></>
            ) : (
              <>יש לך חשבון? <span className="text-purple-400">התחבר כאן</span></>
            )}
          </button>
        </div>

        {/* Guest option */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            המשך כאורח →
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          בהתחברות אתה מסכים ל
          <a href="/privacy" className="underline hover:text-muted-foreground/60">מדיניות הפרטיות</a>
          {" "}ול
          <a href="/terms" className="underline hover:text-muted-foreground/60">תנאי השימוש</a>
        </p>
      </div>
    </div>
  );
}
