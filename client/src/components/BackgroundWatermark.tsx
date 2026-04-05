import { useEffect, useRef, useState } from "react";

// Gold lines on black background — use mix-blend-mode: lighten so black disappears
const WATERMARK_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/totallook-bg-couple-gold-HoHYFLhbUfdMBcbAFTsWob.webp";

// Opacity range: starts at MIN, increases to MAX as user scrolls
const MIN_OPACITY = 0.06;
const MAX_OPACITY = 0.14;
// Pixels of scroll to reach max opacity
const SCROLL_RANGE = 1200;
// Fade-in duration on page load (ms)
const FADE_IN_DURATION = 2500;

export default function BackgroundWatermark() {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Trigger fade-in shortly after mount
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const progress = Math.min(scrollY / SCROLL_RANGE, 1);
        const opacity = MIN_OPACITY + progress * (MAX_OPACITY - MIN_OPACITY);
        el.style.opacity = String(opacity);
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Set initial opacity
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [loaded]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `url('${WATERMARK_URL}')`,
        backgroundSize: "380px auto",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        mixBlendMode: "lighten",
        opacity: 0,
        pointerEvents: "none",
        zIndex: 0,
        transition: loaded
          ? `opacity ${FADE_IN_DURATION}ms ease-out`
          : "none",
      }}
    />
  );
}
