import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const STORAGE_KEY = "tl_guest_fp";
const COOKIE_NAME = "guest_fingerprint";

/** Set a cookie so the server can read the fingerprint during OAuth callback for migration */
function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage first
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      setFingerprint(cached);
      // Ensure cookie is also set (may have been cleared)
      setCookie(COOKIE_NAME, cached);
      return;
    }

    // Generate new fingerprint
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        const visitorId = result.visitorId;
        localStorage.setItem(STORAGE_KEY, visitorId);
        setCookie(COOKIE_NAME, visitorId);
        setFingerprint(visitorId);
      })
      .catch((err) => {
        console.warn("[Fingerprint] Failed to generate:", err);
        // Fallback: random ID
        const fallback = "fb_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY, fallback);
        setCookie(COOKIE_NAME, fallback);
        setFingerprint(fallback);
      });
  }, []);

  return fingerprint;
}
