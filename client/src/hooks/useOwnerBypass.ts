import { useEffect, useState } from "react";

const STORAGE_KEY = "tl_owner_bypass";

/**
 * Owner bypass hook — reads ?owner=SECRET from URL, persists to localStorage.
 * Returns the secret string if present, or null.
 * Once set via URL param, it persists across sessions on the same device.
 */
export function useOwnerBypass(): string | null {
  const [secret, setSecret] = useState<string | null>(() => {
    // Check localStorage on mount (SSR-safe via lazy init)
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    // Check URL param
    const params = new URLSearchParams(window.location.search);
    const ownerParam = params.get("owner");
    if (ownerParam) {
      localStorage.setItem(STORAGE_KEY, ownerParam);
      setSecret(ownerParam);
      // Clean URL (remove ?owner= param) without page reload
      params.delete("owner");
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}${window.location.hash}`
        : `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  return secret;
}
