import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/i18n";
import { useFingerprint } from "@/hooks/useFingerprint";
import WhatsAppLogo from "@/components/WhatsAppLogo";

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
  message?: string;
  showAfterScroll?: number;
}

export default function WhatsAppFloatingButton({
  phoneNumber = "972526211811",
  message = "היי! אני רוצה ניתוח אופנתי 👋",
  showAfterScroll = 300,
}: WhatsAppFloatingButtonProps) {
  const { dir, lang } = useLanguage();
  const fingerprint = useFingerprint();
  const trackPageView = trpc.tracking.trackPageView.useMutation();
  const [isVisible, setIsVisible] = useState(false);

  const href = useMemo(
    () => `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
    [phoneNumber, message]
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY >= showAfterScroll);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showAfterScroll]);

  const tooltipText =
    lang === "he" ? "שלח תמונה לניתוח" : "Send a photo for analysis";

  const handleClick = () => {
    if (!fingerprint) return;
    trackPageView
      .mutateAsync({
        fingerprint,
        page: `/cta/whatsapp/${lang}/floating`,
        referrer: window.location.pathname,
        screenWidth: window.innerWidth,
      })
      .catch(() => {});
  };

  if (!isVisible) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={tooltipText}
      aria-label={tooltipText}
      className={`group fixed z-[90] bottom-5 sm:bottom-6 ${dir === "rtl" ? "right-5 sm:right-6" : "left-5 sm:left-6"} whatsapp-fab h-14 w-14 sm:h-12 sm:w-12 rounded-full inline-flex items-center justify-center text-white`}
    >
      <WhatsAppLogo className="w-7 h-7 sm:w-6 sm:h-6" />
      <span className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md border border-border/60 bg-background/95 px-2.5 py-1 text-xs text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {tooltipText}
      </span>
    </a>
  );
}
