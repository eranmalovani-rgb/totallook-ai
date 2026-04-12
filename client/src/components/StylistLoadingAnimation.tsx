/**
 * StylistLoadingAnimation — An engaging multi-step animation for Fix My Look loading.
 * Shows a stylist character going through stages: measuring, selecting, trying on, final touches.
 * Each stage has its own SVG animation, progress indicator, and descriptive text.
 */

import { useState, useEffect, useRef } from "react";

interface StylistLoadingAnimationProps {
  isHebrew: boolean;
}

// Each stage lasts ~18 seconds, cycling through 4 stages for ~72s total (matching Fix My Look processing time)
const STAGE_DURATION = 18000;

interface Stage {
  titleHe: string;
  titleEn: string;
  subtitleHe: string;
  subtitleEn: string;
  tipsHe: string[];
  tipsEn: string[];
}

const STAGES: Stage[] = [
  {
    titleHe: "מודדת אותך...",
    titleEn: "Taking your measurements...",
    subtitleHe: "הסטייליסטית שלנו בודקת את הפרופורציות והגזרה",
    subtitleEn: "Our stylist is checking your proportions and fit",
    tipsHe: ["גזרה נכונה משנה הכל", "הפרופורציות חשובות יותר מהמותג", "התאמה לגוף = ביטחון"],
    tipsEn: ["The right fit changes everything", "Proportions matter more than brand", "Body-fit = confidence"],
  },
  {
    titleHe: "בוחרת פריטים מהקולקציה...",
    titleEn: "Selecting items from the collection...",
    subtitleHe: "מתאימה צבעים, בדים ודפוסים ללוק שלך",
    subtitleEn: "Matching colors, fabrics and patterns to your look",
    tipsHe: ["צבעים משלימים יוצרים הרמוניה", "בד איכותי מרגיש ונראה אחרת", "פחות זה יותר — כל פריט חשוב"],
    tipsEn: ["Complementary colors create harmony", "Quality fabric feels and looks different", "Less is more — every piece counts"],
  },
  {
    titleHe: "מלבישה אותך...",
    titleEn: "Dressing you up...",
    subtitleHe: "מנסה את השילובים ובודקת התאמה",
    subtitleEn: "Trying combinations and checking the match",
    tipsHe: ["שכבות נכונות מוסיפות עומק", "כל פרט קטן משנה את התמונה", "הסטיילינג הוא אמנות"],
    tipsEn: ["Proper layering adds depth", "Every small detail changes the picture", "Styling is an art"],
  },
  {
    titleHe: "נגיעות אחרונות...",
    titleEn: "Final touches...",
    subtitleHe: "מוודאת שהכל מושלם — עוד רגע מוכן!",
    subtitleEn: "Making sure everything is perfect — almost ready!",
    tipsHe: ["אקססוריז משלימים את הלוק", "הפרט האחרון עושה את ההבדל", "מוכן לצאת בסטייל!"],
    tipsEn: ["Accessories complete the look", "The last detail makes the difference", "Ready to step out in style!"],
  },
];

export default function StylistLoadingAnimation({ isHebrew }: StylistLoadingAnimationProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Cycle through stages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage(prev => (prev + 1) % STAGES.length);
      setTipIndex(0);
    }, STAGE_DURATION);
    return () => clearInterval(interval);
  }, []);

  // Cycle tips within each stage
  useEffect(() => {
    const tipInterval = setInterval(() => {
      const stage = STAGES[currentStage];
      const tips = isHebrew ? stage.tipsHe : stage.tipsEn;
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(tipInterval);
  }, [currentStage, isHebrew]);

  // Smooth progress bar
  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      // Progress goes up to 95% over ~80 seconds, never reaches 100% until done
      const p = Math.min(95, (elapsed / 80000) * 95);
      setProgress(p);
    }, 200);
    return () => clearInterval(tick);
  }, []);

  const stage = STAGES[currentStage];
  const tips = isHebrew ? stage.tipsHe : stage.tipsEn;

  return (
    <div className="py-8 flex flex-col items-center gap-6 w-full max-w-sm mx-auto" dir={isHebrew ? "rtl" : "ltr"}>
      {/* Main animation area */}
      <div className="relative w-48 h-48">
        {/* Background glow */}
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-stylist-glow" />
        
        {/* Stage-specific SVG animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          {currentStage === 0 && <MeasuringAnimation />}
          {currentStage === 1 && <SelectingAnimation />}
          {currentStage === 2 && <DressingAnimation />}
          {currentStage === 3 && <FinalTouchesAnimation />}
        </div>

        {/* Stage indicator dots */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i === currentStage
                  ? "bg-primary w-6"
                  : i < currentStage
                  ? "bg-primary/60"
                  : "bg-primary/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Text content */}
      <div className="text-center space-y-2 min-h-[100px]">
        <h3 className="text-lg font-bold text-foreground animate-stylist-fade-in" key={`title-${currentStage}`}>
          {isHebrew ? stage.titleHe : stage.titleEn}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isHebrew ? stage.subtitleHe : stage.subtitleEn}
        </p>
        
        {/* Fashion tip */}
        <div className="mt-3 px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-primary/80 animate-stylist-fade-in" key={`tip-${currentStage}-${tipIndex}`}>
            ✨ {tips[tipIndex]}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full space-y-1.5">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-[#FF2E9F] to-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-center text-muted-foreground">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}

// ── Stage 1: Measuring Animation ──
function MeasuringAnimation() {
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stylist figure */}
      <circle cx="60" cy="28" r="10" className="fill-primary/20 stroke-primary" strokeWidth="1.5" />
      {/* Hair */}
      <path d="M50 24 Q55 14, 65 16 Q72 18, 70 28" className="fill-primary/30" />
      {/* Body */}
      <path d="M60 38 L60 70" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      {/* Arms — one holding measuring tape */}
      <path d="M60 48 L40 58" className="stroke-primary" strokeWidth="2" strokeLinecap="round">
        <animate attributeName="d" values="M60 48 L40 58;M60 48 L38 52;M60 48 L40 58" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M60 48 L80 55" className="stroke-primary" strokeWidth="2" strokeLinecap="round">
        <animate attributeName="d" values="M60 48 L80 55;M60 48 L82 48;M60 48 L80 55" dur="2s" repeatCount="indefinite" />
      </path>
      {/* Legs */}
      <path d="M60 70 L50 95" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 70 L70 95" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      
      {/* Measuring tape — animated */}
      <line x1="36" y1="56" x2="84" y2="48" className="stroke-[#FF2E9F]" strokeWidth="1.5" strokeDasharray="4 2">
        <animate attributeName="x2" values="84;78;84" dur="2s" repeatCount="indefinite" />
        <animate attributeName="y2" values="48;44;48" dur="2s" repeatCount="indefinite" />
      </line>
      {/* Tape markings */}
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <line
          key={i}
          x1={40 + i * 6}
          y1="53"
          x2={40 + i * 6}
          y2={i % 2 === 0 ? "50" : "51.5"}
          className="stroke-[#FF2E9F]/60"
          strokeWidth="0.8"
        >
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
        </line>
      ))}
      
      {/* Floating measurement numbers */}
      <text x="82" y="42" className="fill-[#FF2E9F] text-[7px] font-mono" opacity="0.8">
        <animate attributeName="opacity" values="0;0.8;0" dur="3s" repeatCount="indefinite" />
        cm
      </text>
    </svg>
  );
}

// ── Stage 2: Selecting from rack Animation ──
function SelectingAnimation() {
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clothing rack */}
      <line x1="15" y1="25" x2="105" y2="25" className="stroke-muted-foreground/40" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="25" x2="20" y2="95" className="stroke-muted-foreground/30" strokeWidth="1.5" />
      <line x1="100" y1="25" x2="100" y2="95" className="stroke-muted-foreground/30" strokeWidth="1.5" />
      
      {/* Hangers with clothes */}
      {/* Hanger 1 — shirt */}
      <g className="animate-stylist-sway" style={{ transformOrigin: "35px 25px" }}>
        <path d="M35 25 L25 35 L45 35 Z" className="stroke-muted-foreground/50" strokeWidth="1" fill="none" />
        <rect x="27" y="35" width="16" height="22" rx="2" className="fill-blue-500/20 stroke-blue-500/40" strokeWidth="0.8" />
      </g>
      
      {/* Hanger 2 — pants */}
      <g className="animate-stylist-sway-delayed" style={{ transformOrigin: "55px 25px" }}>
        <path d="M55 25 L45 35 L65 35 Z" className="stroke-muted-foreground/50" strokeWidth="1" fill="none" />
        <path d="M48 35 L48 60 L52 60 L55 35 L58 60 L62 60 L62 35" className="fill-stone-500/20 stroke-stone-500/40" strokeWidth="0.8" />
      </g>
      
      {/* Hanger 3 — jacket (being selected — highlighted) */}
      <g className="animate-stylist-selected" style={{ transformOrigin: "78px 25px" }}>
        <path d="M78 25 L68 35 L88 35 Z" className="stroke-primary" strokeWidth="1.2" fill="none" />
        <path d="M70 35 L70 58 L86 58 L86 35 M74 35 L74 58 M82 35 L82 58" className="fill-primary/15 stroke-primary/60" strokeWidth="0.8" />
        {/* Sparkle on selected item */}
        <circle cx="90" cy="30" r="2" className="fill-[#FF2E9F]">
          <animate attributeName="r" values="0;2;0" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>
      
      {/* Stylist hand reaching */}
      <path d="M60 100 Q65 85, 78 60" className="stroke-primary/60" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2">
        <animate attributeName="d" values="M60 100 Q65 85, 78 60;M60 100 Q68 80, 80 55;M60 100 Q65 85, 78 60" dur="2.5s" repeatCount="indefinite" />
      </path>
      
      {/* Color swatches floating */}
      <rect x="8" y="75" width="8" height="8" rx="2" className="fill-rose-400/40">
        <animate attributeName="y" values="75;72;75" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="8" y="87" width="8" height="8" rx="2" className="fill-blue-400/40">
        <animate attributeName="y" values="87;84;87" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </rect>
      <rect x="8" y="99" width="8" height="8" rx="2" className="fill-[#FF2E9F]/40">
        <animate attributeName="y" values="99;96;99" dur="2s" begin="0.6s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

// ── Stage 3: Dressing/Trying on Animation ──
function DressingAnimation() {
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mirror frame */}
      <rect x="25" y="8" width="70" height="100" rx="35" className="stroke-muted-foreground/30" strokeWidth="1.5" fill="none" />
      <rect x="28" y="11" width="64" height="94" rx="32" className="fill-primary/3" />
      
      {/* Figure in mirror */}
      <circle cx="60" cy="35" r="9" className="fill-primary/15 stroke-primary/50" strokeWidth="1" />
      {/* Shirt being put on — animated */}
      <g>
        <rect x="47" y="48" width="26" height="28" rx="3" className="fill-primary/10 stroke-primary/40" strokeWidth="1">
          <animate attributeName="opacity" values="0.3;1;1;0.3" dur="3s" repeatCount="indefinite" />
          <animate attributeName="y" values="42;48;48;42" dur="3s" repeatCount="indefinite" />
        </rect>
        {/* Collar */}
        <path d="M53 48 L60 53 L67 48" className="stroke-primary/50" strokeWidth="0.8" fill="none">
          <animate attributeName="opacity" values="0.3;1;1;0.3" dur="3s" repeatCount="indefinite" />
        </path>
      </g>
      
      {/* Arms */}
      <path d="M47 55 L35 65" className="stroke-primary/40" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="d" values="M47 55 L35 65;M47 55 L33 60;M47 55 L35 65" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M73 55 L85 65" className="stroke-primary/40" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="d" values="M73 55 L85 65;M73 55 L87 60;M73 55 L85 65" dur="2s" repeatCount="indefinite" />
      </path>
      
      {/* Pants */}
      <path d="M50 76 L48 98 M70 76 L72 98" className="stroke-primary/30" strokeWidth="2" strokeLinecap="round" />
      
      {/* Reflection shimmer */}
      <rect x="28" y="11" width="64" height="94" rx="32" fill="url(#mirrorShimmer)" opacity="0.4" />
      <defs>
        <linearGradient id="mirrorShimmer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="transparent" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            values="0 -1;0 1"
            dur="3s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      
      {/* Checkmark appearing */}
      <circle cx="85" cy="20" r="8" className="fill-green-500/20 stroke-green-500/50" strokeWidth="1">
        <animate attributeName="opacity" values="0;0;1;1;0" dur="3s" repeatCount="indefinite" />
      </circle>
      <path d="M81 20 L84 23 L89 17" className="stroke-green-500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <animate attributeName="opacity" values="0;0;1;1;0" dur="3s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

// ── Stage 4: Final Touches Animation ──
function FinalTouchesAnimation() {
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Completed figure */}
      <circle cx="60" cy="28" r="10" className="fill-primary/20 stroke-primary" strokeWidth="1.5" />
      {/* Styled hair */}
      <path d="M50 24 Q55 14, 65 16 Q72 18, 70 28" className="fill-primary/30" />
      
      {/* Nice shirt */}
      <rect x="47" y="40" width="26" height="25" rx="3" className="fill-primary/15 stroke-primary/50" strokeWidth="1" />
      <path d="M53 40 L60 45 L67 40" className="stroke-primary/60" strokeWidth="0.8" fill="none" />
      
      {/* Arms in confident pose */}
      <path d="M47 48 L35 42" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M73 48 L85 42" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Pants */}
      <path d="M50 65 L48 90 M70 65 L72 90" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
      
      {/* Sparkles around the figure */}
      {[
        { cx: 30, cy: 30, delay: "0s" },
        { cx: 90, cy: 35, delay: "0.4s" },
        { cx: 25, cy: 65, delay: "0.8s" },
        { cx: 95, cy: 70, delay: "1.2s" },
        { cx: 40, cy: 95, delay: "0.6s" },
        { cx: 80, cy: 95, delay: "1s" },
        { cx: 60, cy: 10, delay: "0.2s" },
        { cx: 15, cy: 50, delay: "1.4s" },
        { cx: 105, cy: 50, delay: "0.3s" },
      ].map((spark, i) => (
        <g key={i}>
          {/* 4-point star sparkle */}
          <path
            d={`M${spark.cx} ${spark.cy - 4} L${spark.cx + 1.5} ${spark.cy - 1.5} L${spark.cx + 4} ${spark.cy} L${spark.cx + 1.5} ${spark.cy + 1.5} L${spark.cx} ${spark.cy + 4} L${spark.cx - 1.5} ${spark.cy + 1.5} L${spark.cx - 4} ${spark.cy} L${spark.cx - 1.5} ${spark.cy - 1.5} Z`}
            className="fill-[#FF2E9F]"
          >
            <animate attributeName="opacity" values="0;1;0" dur="2s" begin={spark.delay} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="scale" values="0.3;1;0.3" dur="2s" begin={spark.delay} repeatCount="indefinite" additive="sum" />
          </path>
        </g>
      ))}
      
      {/* Score badge */}
      <g>
        <circle cx="98" cy="15" r="12" className="fill-[#FF2E9F]/20 stroke-[#FF2E9F]/50" strokeWidth="1">
          <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="98" y="18" textAnchor="middle" className="fill-[#FF2E9F] text-[8px] font-bold">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          +✨
        </text>
      </g>
    </svg>
  );
}
