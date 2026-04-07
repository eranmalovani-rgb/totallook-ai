/**
 * GlobalWhatsAppPopup — Shows the WhatsApp phone registration popup
 * only for REGISTERED (authenticated) users who haven't saved a phone number yet.
 *
 * Shows for:
 * - Authenticated users who haven't saved a phone number yet (3s delay)
 *
 * Won't show if:
 * - User is a guest (not authenticated)
 * - User is on the home page ("/") or onboarding page ("/onboarding")
 * - User dismissed with "Don't show again" (localStorage)
 * - Already shown this session (sessionStorage)
 * - Authenticated user already has a phone number saved
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import WhatsAppPhoneReminder, { HIDE_WHATSAPP_PHONE_MODAL_KEY } from "./WhatsAppPhoneReminder";
import { useCountry } from "@/hooks/useCountry";
import { useLocation } from "wouter";

/** Session key to prevent showing more than once per session */
const SESSION_SHOWN_KEY = "whatsappPopupShownThisSession";

export default function GlobalWhatsAppPopup() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: userProfile, isLoading: profileLoading } = trpc.profile.get.useQuery(
    undefined,
    { enabled: isAuthenticated },
  );
  const { country: detectedCountry } = useCountry();

  const [showPopup, setShowPopup] = useState(false);
  const shownRef = useRef(false);

  const [location] = useLocation();

  useEffect(() => {
    // Only show for authenticated (registered) users — NOT guests
    if (!isAuthenticated) return;

    // Don't show on home page or onboarding page
    if (location === "/" || location.startsWith("/onboarding")) return;

    // Wait for auth and profile to finish loading
    if (authLoading || profileLoading) return;

    // If already has phone number — don't show
    if (userProfile?.phoneNumber) return;

    // Don't show if already shown this render cycle
    if (shownRef.current) return;

    // Check "Don't show again" preference
    try {
      if (localStorage.getItem(HIDE_WHATSAPP_PHONE_MODAL_KEY) === "true") return;
    } catch { /* localStorage unavailable */ }

    // Check if already shown this session
    try {
      if (sessionStorage.getItem(SESSION_SHOWN_KEY) === "true") return;
    } catch { /* sessionStorage unavailable */ }

    const timer = setTimeout(() => {
      setShowPopup(true);
      shownRef.current = true;
      try {
        sessionStorage.setItem(SESSION_SHOWN_KEY, "true");
      } catch { /* sessionStorage unavailable */ }
    }, 3000);

    return () => clearTimeout(timer);
  }, [authLoading, profileLoading, isAuthenticated, userProfile, location]);

  if (!showPopup) return null;

  return (
    <WhatsAppPhoneReminder
      open={showPopup}
      onClose={() => setShowPopup(false)}
      isGuest={false}
      defaultCountry={detectedCountry || "IL"}
    />
  );
}
