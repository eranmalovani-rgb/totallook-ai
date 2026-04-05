import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

/**
 * Login / Register page — Email + Password authentication
 * Replaces Manus OAuth portal with a self-contained auth page.
 */
export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get return path from URL params
  const params = new URLSearchParams(window.location.search);
  const returnPath = params.get("returnPath") || "/";

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
        if (data.needsReregister) {
          setMode("register");
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

        {/* Form */}
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
            {loading ? "..." : mode === "login" ? "התחבר" : "הירשם"}
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
      </div>
    </div>
  );
}
