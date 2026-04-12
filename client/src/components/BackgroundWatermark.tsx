import { useEffect, useRef, useState } from "react";

// Opacity range: starts at MIN, increases to MAX as user scrolls
const MIN_OPACITY = 0.04;
const MAX_OPACITY = 0.10;
// Pixels of scroll to reach max opacity
const SCROLL_RANGE = 1200;
// Fade-in duration on page load (ms)
const FADE_IN_DURATION = 2500;

/**
 * Subtle studio-themed background watermark.
 * Renders repeating SVG pattern of fashion studio elements:
 * hangers, measuring tape marks, scissors, and geometric lines.
 * Uses mix-blend-mode: lighten so only the gold lines show on dark bg.
 */
export default function BackgroundWatermark() {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
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
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [loaded]);

  // SVG pattern tile — fashion elements in pink/purple glow on transparent
  const patternSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400">
  <defs>
    <style>
      .pk { stroke: #FF2E9F; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .pk-fill { fill: #FF2E9F; }
      .pr { stroke: #7B2EFF; fill: none; stroke-width: 0.5; stroke-linecap: round; }
    </style>
  </defs>

  <!-- Hanger 1 -->
  <g transform="translate(50, 50)">
    <path d="M0,-12 C0,-18 6,-20 6,-14" class="pk" stroke-width="1"/>
    <path d="M0,-8 L-22,14 M0,-8 L22,14" class="pk" stroke-width="1"/>
    <line x1="-22" y1="14" x2="22" y2="14" class="pk" stroke-width="1"/>
  </g>

  <!-- Measuring tape -->
  <g transform="translate(160, 120)">
    <line x1="-60" y1="0" x2="60" y2="0" class="pr"/>
    <line x1="-60" y1="0" x2="-60" y2="5" class="pr"/>
    <line x1="-30" y1="0" x2="-30" y2="5" class="pr"/>
    <line x1="0" y1="0" x2="0" y2="6" class="pr"/>
    <line x1="30" y1="0" x2="30" y2="5" class="pr"/>
    <line x1="60" y1="0" x2="60" y2="5" class="pr"/>
  </g>

  <!-- Scissors -->
  <g transform="translate(260, 60) scale(0.8)">
    <circle cx="-6" cy="8" r="5" class="pk" stroke-width="0.8"/>
    <circle cx="6" cy="8" r="5" class="pk" stroke-width="0.8"/>
    <line x1="-3" y1="4" x2="4" y2="-10" class="pk" stroke-width="0.8"/>
    <line x1="3" y1="4" x2="-4" y2="-10" class="pk" stroke-width="0.8"/>
  </g>

  <!-- Hanger 2 -->
  <g transform="translate(240, 280) rotate(-8)">
    <path d="M0,-10 C0,-16 5,-17 5,-12" class="pr" stroke-width="0.8"/>
    <path d="M0,-7 L-18,11 M0,-7 L18,11" class="pr" stroke-width="0.8"/>
    <line x1="-18" y1="11" x2="18" y2="11" class="pr" stroke-width="0.8"/>
  </g>

  <!-- Diamond -->
  <g transform="translate(160, 210)">
    <path d="M0,-16 L12,0 L0,16 L-12,0 Z" class="pk" stroke-width="0.5"/>
    <circle cx="0" cy="0" r="2" class="pk-fill" opacity="0.4"/>
  </g>

  <!-- Needle & thread -->
  <g transform="translate(70, 300)">
    <line x1="0" y1="0" x2="0" y2="-20" class="pr"/>
    <ellipse cx="0" cy="-22" rx="2" ry="3" class="pk" stroke-width="0.5"/>
    <path d="M0,0 C10,8 -5,16 8,24" class="pr" stroke-dasharray="2,2"/>
  </g>

  <!-- Vertical tape -->
  <g transform="translate(300, 180)">
    <line x1="0" y1="-40" x2="0" y2="40" class="pr"/>
    <line x1="0" y1="-40" x2="4" y2="-40" class="pr"/>
    <line x1="0" y1="-20" x2="4" y2="-20" class="pr"/>
    <line x1="0" y1="0" x2="5" y2="0" class="pr"/>
    <line x1="0" y1="20" x2="4" y2="20" class="pr"/>
    <line x1="0" y1="40" x2="4" y2="40" class="pr"/>
  </g>

  <!-- Button -->
  <g transform="translate(120, 350)">
    <circle cx="0" cy="0" r="6" class="pk" stroke-width="0.5"/>
    <circle cx="0" cy="0" r="4" class="pk" stroke-width="0.3"/>
    <circle cx="-1.5" cy="-1.5" r="0.7" class="pk-fill" opacity="0.5"/>
    <circle cx="1.5" cy="-1.5" r="0.7" class="pk-fill" opacity="0.5"/>
    <circle cx="-1.5" cy="1.5" r="0.7" class="pk-fill" opacity="0.5"/>
    <circle cx="1.5" cy="1.5" r="0.7" class="pk-fill" opacity="0.5"/>
  </g>

  <!-- Accent lines -->
  <line x1="10" y1="160" x2="40" y2="180" class="pr" opacity="0.3"/>
  <line x1="280" y1="340" x2="310" y2="360" class="pr" opacity="0.3"/>

  <!-- Sparkle -->
  <g transform="translate(200, 380)">
    <line x1="0" y1="-4" x2="0" y2="4" class="pk" stroke-width="0.5"/>
    <line x1="-4" y1="0" x2="4" y2="0" class="pk" stroke-width="0.5"/>
    <line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5" class="pr" opacity="0.5"/>
    <line x1="2.5" y1="-2.5" x2="-2.5" y2="2.5" class="pr" opacity="0.5"/>
  </g>

  <!-- Hanger 3 -->
  <g transform="translate(180, 40) scale(0.6)">
    <path d="M0,-10 C0,-16 5,-17 5,-12" class="pk" stroke-width="0.8"/>
    <path d="M0,-7 L-18,11 M0,-7 L18,11" class="pk" stroke-width="0.8"/>
    <line x1="-18" y1="11" x2="18" y2="11" class="pk" stroke-width="0.8"/>
  </g>

</svg>`.trim();

  const encodedSvg = `data:image/svg+xml,${encodeURIComponent(patternSvg)}`;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `url("${encodedSvg}")`,
        backgroundSize: "320px 400px",
        backgroundPosition: "center center",
        backgroundRepeat: "repeat",
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
