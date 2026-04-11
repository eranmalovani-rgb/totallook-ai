import { useState, useEffect, useMemo } from "react";
import { OCCASIONS } from "../../../shared/fashionTypes";
import { useLanguage } from "@/i18n";

interface Props {
  uploading: boolean;
  analyzing: boolean;
  selectedOccasion: string;
  selectedInfluencers: string[];
  imagePreview?: string | null;
  attempt?: number;
}

/* ── Stage definitions ── */
const STAGES_HE = [
  { at: 0,  title: "סורקים את הלוק שלך", sub: "הסטייליסטית שלנו בודקת כל פרט" },
  { at: 12, title: "חדר ההלבשה נפתח", sub: "מודדים פריטים ובוחרים שילובים" },
  { at: 30, title: "בונים לוח השראה", sub: "מרכיבים את הלוק המושלם בשבילך" },
  { at: 52, title: "הלוק שלך מוכן!", sub: "עוד רגע חושפים את התוצאה" },
];
const STAGES_EN = [
  { at: 0,  title: "Scanning Your Look", sub: "Our stylist is examining every detail" },
  { at: 12, title: "The Fitting Room Opens", sub: "Trying on pieces and finding the perfect match" },
  { at: 30, title: "Building Your Mood Board", sub: "Assembling the perfect look just for you" },
  { at: 52, title: "Your Look Is Ready!", sub: "Revealing the results in a moment" },
];

const TIPS_HE = [
  "הצבע הכי פופולרי באופנת 2025 הוא בורגנדי 🍷",
  "בממוצע, אנשים לובשים רק 20% מהבגדים בארון 🤯",
  "הטרנד של Quiet Luxury צמח ב-60% ב-2024 💎",
  "חולצה לבנה איכותית — הפריט הכי רב-שימושי בארון 🤍",
  "צבע כחול נייבי נחשב ל\"שחור החדש\" באופנה עסקית 💼",
  "הצבע האדום מעלה את תחושת הביטחון העצמי ❤️",
  "אופנת Streetwear הפכה לתעשייה של 185 מיליארד דולר 🔥",
  "ג'ינס הומצא ב-1873 על ידי Levi Strauss 👖",
  "הטרנצ'קוט הומצא ב-1914 עבור חיילים בריטיים 🧥",
  "Hermès מייצר תיק Birkin אחד תוך 18 שעות עבודה ✋",
];
const TIPS_EN = [
  "The most popular color in 2025 fashion is burgundy 🍷",
  "On average, people only wear 20% of their wardrobe 🤯",
  "The Quiet Luxury trend grew by 60% in 2024 💎",
  "A quality white shirt is the most versatile wardrobe staple 🤍",
  "Navy blue is the 'new black' in business fashion 💼",
  "Wearing red boosts self-confidence and attractiveness ❤️",
  "Streetwear has become a $185 billion industry 🔥",
  "Jeans were invented in 1873 by Levi Strauss 👖",
  "The trench coat was invented in 1914 for British soldiers 🧥",
  "Hermès crafts a single Birkin bag in 18 hours ✋",
];

/* ── Garment detection labels that appear over the scanned image ── */
const DETECTION_LABELS_HE = [
  { text: "חולצה", pos: "top-[18%] right-[12%]", delay: 3 },
  { text: "מכנסיים", pos: "top-[58%] left-[10%]", delay: 6 },
  { text: "נעליים", pos: "bottom-[8%] right-[15%]", delay: 9 },
  { text: "אקססורי", pos: "top-[12%] left-[8%]", delay: 11 },
];
const DETECTION_LABELS_EN = [
  { text: "Top", pos: "top-[18%] right-[12%]", delay: 3 },
  { text: "Pants", pos: "top-[58%] left-[10%]", delay: 6 },
  { text: "Shoes", pos: "bottom-[8%] right-[15%]", delay: 9 },
  { text: "Accessory", pos: "top-[12%] left-[8%]", delay: 11 },
];

/* ── Mood board color swatches ── */
const SWATCH_COLORS = [
  "#1a1a2e", "#e2c275", "#8b4513", "#2c3e50",
  "#c0392b", "#f5f5dc", "#34495e", "#d4a843",
];

/* ── Clothing rack items for fitting room ── */
const RACK_ITEMS = ["👔", "👕", "🧥", "👖", "👗", "🧣"];

export default function StylingStudioAnimation({
  uploading,
  analyzing,
  selectedOccasion,
  selectedInfluencers,
  imagePreview,
  attempt = 0,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [scanY, setScanY] = useState(0);
  const [rackOffset, setRackOffset] = useState(0);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);
  const { t, lang } = useLanguage();

  const stages = lang === "he" ? STAGES_HE : STAGES_EN;
  const tips = lang === "he" ? TIPS_HE : TIPS_EN;
  const detectionLabels = lang === "he" ? DETECTION_LABELS_HE : DETECTION_LABELS_EN;

  // Elapsed timer
  useEffect(() => {
    if (!analyzing) { setElapsed(0); return; }
    const iv = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(iv);
  }, [analyzing]);

  // Stage index
  const stageIdx = stages.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);
  const stage = stages[stageIdx];

  // Progress 0-95%
  const nextAt = stageIdx < stages.length - 1 ? stages[stageIdx + 1].at : 80;
  const stageBase = stageIdx / (stages.length - 1);
  const within = Math.min(1, (elapsed - stage.at) / Math.max(1, nextAt - stage.at));
  const progress = Math.min(95, (stageBase + within / (stages.length - 1)) * 95);

  // Scan line (stage 0)
  useEffect(() => {
    if (!analyzing || stageIdx > 0) return;
    const iv = setInterval(() => setScanY(p => (p >= 100 ? 0 : p + 0.4)), 25);
    return () => clearInterval(iv);
  }, [analyzing, stageIdx]);

  // Rack animation (stage 1)
  useEffect(() => {
    if (!analyzing || stageIdx !== 1) return;
    const iv = setInterval(() => setRackOffset(p => (p + 1) % (RACK_ITEMS.length * 80)), 50);
    return () => clearInterval(iv);
  }, [analyzing, stageIdx]);

  // Sparkles (stage 3)
  useEffect(() => {
    if (!analyzing || stageIdx !== 3) { setSparkles([]); return; }
    const iv = setInterval(() => {
      setSparkles(prev => {
        const next = [...prev.filter(s => Date.now() - s.id < 2000)];
        if (next.length < 12) {
          next.push({
            id: Date.now(),
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 4 + Math.random() * 8,
            delay: Math.random() * 0.5,
          });
        }
        return next;
      });
    }, 200);
    return () => clearInterval(iv);
  }, [analyzing, stageIdx]);

  // Tip rotation
  useEffect(() => {
    if (!analyzing) return;
    const iv = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIdx(p => (p + 1) % tips.length);
        setTipVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(iv);
  }, [analyzing, tips.length]);

  // Mood board items (stage 2) — memoized
  const moodItems = useMemo(() => {
    return SWATCH_COLORS.map((color, i) => ({
      color,
      x: 10 + (i % 4) * 22,
      y: 15 + Math.floor(i / 4) * 40,
      rotation: -8 + Math.random() * 16,
      delay: i * 0.3,
    }));
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  };

  const getOccasionLabel = (occId: string) => t("occasions", occId) || occId;

  /* ── Uploading state ── */
  if (uploading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">📸</span>
          </div>
        </div>
        <span className="text-lg font-medium">{t("loading", "uploading")}</span>
      </div>
    );
  }

  /* ── Analyzing state ── */
  return (
    <div className="py-6 space-y-6">
      {/* Auto-retry */}
      {attempt > 0 && (
        <div className="max-w-sm mx-auto px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-xs text-amber-400">
            {lang === "he" ? "🔄 מנסה שוב אוטומטית..." : "🔄 Auto-retrying..."}
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STAGE 0 — SCANNING YOUR LOOK
          ═══════════════════════════════════════════════ */}
      {stageIdx === 0 && imagePreview && (
        <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_40px_rgba(212,168,67,0.15)]">
          <img
            src={imagePreview}
            alt="Scanning"
            className="w-full max-h-[380px] object-cover transition-all duration-1000"
            style={{ filter: "brightness(0.6) contrast(1.15) saturate(0.8)" }}
          />

          {/* Scan line with glow trail */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${scanY}%`,
              height: "2px",
              background: "linear-gradient(90deg, transparent 0%, #d4a843 15%, #fff 50%, #d4a843 85%, transparent 100%)",
              boxShadow: "0 0 25px 8px rgba(212,168,67,0.6), 0 0 80px 15px rgba(212,168,67,0.2)",
              transition: scanY === 0 ? "none" : "top 25ms linear",
            }}
          />
          {/* Scan trail */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${Math.max(0, scanY - 20)}%`,
              height: "20%",
              background: "linear-gradient(to bottom, transparent, rgba(212,168,67,0.06))",
              transition: scanY === 0 ? "none" : "top 25ms linear",
            }}
          />

          {/* Corner targeting brackets */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-primary/70 rounded-tl-sm" />
          <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-primary/70 rounded-tr-sm" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-primary/70 rounded-bl-sm" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-primary/70 rounded-br-sm" />

          {/* Animated grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(212,168,67,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Detection labels that appear one by one */}
          {detectionLabels.map((label, i) => (
            elapsed >= label.delay && (
              <div
                key={i}
                className={`absolute ${label.pos} px-2 py-0.5 rounded-md text-[10px] font-bold
                  bg-primary/90 text-black backdrop-blur-sm
                  animate-in fade-in zoom-in-95 duration-500`}
                style={{ animationDelay: `${(elapsed - label.delay) * 100}ms` }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse" />
                {label.text}
              </div>
            )
          ))}

          {/* Scan count overlay */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-primary/30">
            <span className="text-[11px] text-primary font-mono tabular-nums">
              {lang === "he" ? "פריטים שזוהו" : "Items detected"}: {Math.min(detectionLabels.length, detectionLabels.filter(l => elapsed >= l.delay).length)}
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STAGE 1 — FITTING ROOM
          ═══════════════════════════════════════════════ */}
      {stageIdx === 1 && (
        <div className="relative max-w-sm mx-auto h-[380px] rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-b from-[#1a1520] via-[#1e1828] to-[#12101a]"
          style={{ perspective: "800px" }}
        >
          {/* Floor reflection */}
          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-primary/5 to-transparent" />

          {/* Mirror frame */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[140px] h-[200px] rounded-lg border-4 border-amber-700/60 bg-gradient-to-b from-white/5 to-white/[0.02] shadow-[inset_0_0_30px_rgba(212,168,67,0.08)]"
            style={{ transform: "translateX(-50%) rotateY(-2deg)", transformStyle: "preserve-3d" }}
          >
            {/* User's image in the mirror */}
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Mirror"
                className="w-full h-full object-cover rounded opacity-40"
                style={{ filter: "brightness(0.5) blur(1px)" }}
              />
            )}
            {/* Mirror shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded" />
            {/* Mirror label */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-primary/50 whitespace-nowrap">
              {lang === "he" ? "🪞 מראה" : "🪞 Mirror"}
            </div>
          </div>

          {/* Clothing rack — scrolling horizontally */}
          <div className="absolute top-6 right-4 w-[80px]">
            {/* Rack bar */}
            <div className="w-full h-1 rounded-full bg-amber-800/50 mb-1" />
            {/* Hangers */}
            <div className="overflow-hidden h-[100px]">
              <div
                className="flex flex-col gap-2 transition-transform duration-100"
                style={{ transform: `translateY(-${rackOffset % (RACK_ITEMS.length * 36)}px)` }}
              >
                {[...RACK_ITEMS, ...RACK_ITEMS].map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-amber-700/40 rounded" />
                    <span className="text-2xl drop-shadow-lg" style={{
                      filter: i === Math.floor(rackOffset / 36) % RACK_ITEMS.length ? "brightness(1.5)" : "brightness(0.6)",
                      transform: i === Math.floor(rackOffset / 36) % RACK_ITEMS.length ? "scale(1.3)" : "scale(1)",
                      transition: "all 0.3s ease",
                    }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stylist figure */}
          <div className="absolute bottom-12 left-8">
            <svg width="60" height="120" viewBox="0 0 60 120" className="drop-shadow-lg">
              {/* Head */}
              <circle cx="30" cy="16" r="12" fill="#d4a843" opacity="0.8" />
              {/* Hair */}
              <path d="M18 14 Q22 2 38 6 Q44 8 42 16" fill="#2a1f14" opacity="0.9" />
              {/* Body */}
              <path d="M22 28 L20 70 L40 70 L38 28 Z" fill="#1a1a2e" stroke="#d4a843" strokeWidth="0.5" opacity="0.8" />
              {/* Measuring tape arm */}
              <g className="origin-[38px_40px]" style={{ animation: "stylist-measure 2s ease-in-out infinite" }}>
                <line x1="38" y1="35" x2="58" y2="50" stroke="#d4a843" strokeWidth="1.5" />
                <rect x="52" y="46" width="8" height="12" rx="1" fill="#f0c040" opacity="0.8" />
                {/* Tape marks */}
                <line x1="53" y1="49" x2="59" y2="49" stroke="#333" strokeWidth="0.3" />
                <line x1="53" y1="52" x2="59" y2="52" stroke="#333" strokeWidth="0.3" />
                <line x1="53" y1="55" x2="59" y2="55" stroke="#333" strokeWidth="0.3" />
              </g>
              {/* Left arm holding fabric */}
              <g style={{ animation: "stylist-hold 3s ease-in-out infinite" }}>
                <line x1="22" y1="35" x2="6" y2="55" stroke="#d4a843" strokeWidth="1.5" />
                <rect x="0" y="50" width="14" height="18" rx="2" fill="#8b4513" opacity="0.6">
                  <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
                </rect>
              </g>
              {/* Legs */}
              <line x1="26" y1="70" x2="22" y2="105" stroke="#1a1a2e" strokeWidth="4" />
              <line x1="34" y1="70" x2="38" y2="105" stroke="#1a1a2e" strokeWidth="4" />
              {/* Shoes */}
              <ellipse cx="20" cy="108" rx="6" ry="3" fill="#333" />
              <ellipse cx="40" cy="108" rx="6" ry="3" fill="#333" />
            </svg>
          </div>

          {/* Floating fabric swatches */}
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="absolute w-8 h-8 rounded-sm border border-primary/20"
              style={{
                top: `${55 + i * 12}%`,
                right: `${15 + i * 8}%`,
                background: SWATCH_COLORS[i],
                transform: `rotate(${-10 + i * 15}deg)`,
                animation: `float-swatch ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STAGE 2 — MOOD BOARD
          ═══════════════════════════════════════════════ */}
      {stageIdx === 2 && (
        <div className="relative max-w-sm mx-auto h-[380px] rounded-2xl overflow-hidden border border-primary/20 bg-[#1c1915]">
          {/* Cork board texture */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle, #d4a843 0.5px, transparent 0.5px)",
              backgroundSize: "12px 12px",
            }}
          />

          {/* Board title */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary/10 rounded-full border border-primary/20">
            <span className="text-xs text-primary font-medium">
              {lang === "he" ? "✨ לוח ההשראה שלך" : "✨ Your Inspiration Board"}
            </span>
          </div>

          {/* Color swatches dropping in */}
          {moodItems.map((item, i) => {
            const itemElapsed = elapsed - stages[2].at;
            const visible = itemElapsed >= item.delay;
            return (
              <div
                key={i}
                className="absolute w-[18%] h-[28%] rounded-md shadow-lg transition-all duration-700 ease-out"
                style={{
                  left: `${item.x}%`,
                  top: visible ? `${item.y}%` : "-20%",
                  background: item.color,
                  transform: `rotate(${item.rotation}deg)`,
                  opacity: visible ? 0.85 : 0,
                  transitionDelay: `${item.delay * 200}ms`,
                }}
              >
                {/* Pin */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500/80 shadow-sm" />
                {/* Texture overlay */}
                <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent" />
              </div>
            );
          })}

          {/* User's photo as a polaroid */}
          {imagePreview && (
            <div
              className="absolute w-[35%] bottom-[10%] left-1/2 -translate-x-1/2 bg-white p-1.5 pb-6 rounded-sm shadow-xl transition-all duration-1000 ease-out"
              style={{
                transform: `translateX(-50%) rotate(-3deg)`,
                opacity: elapsed - stages[2].at >= 2 ? 1 : 0,
                transitionDelay: "600ms",
              }}
            >
              <img src={imagePreview} alt="Your look" className="w-full aspect-[3/4] object-cover rounded-[1px]" />
              <p className="text-[8px] text-gray-500 text-center mt-1 font-mono">
                {lang === "he" ? "הלוק שלך" : "Your Look"}
              </p>
            </div>
          )}

          {/* Connecting lines between elements */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <line x1="30%" y1="35%" x2="50%" y2="65%" stroke="#d4a843" strokeWidth="0.5" strokeDasharray="4 4">
              <animate attributeName="stroke-dashoffset" from="0" to="8" dur="2s" repeatCount="indefinite" />
            </line>
            <line x1="70%" y1="30%" x2="50%" y2="65%" stroke="#d4a843" strokeWidth="0.5" strokeDasharray="4 4">
              <animate attributeName="stroke-dashoffset" from="0" to="8" dur="2s" repeatCount="indefinite" />
            </line>
          </svg>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STAGE 3 — REVEAL
          ═══════════════════════════════════════════════ */}
      {stageIdx === 3 && (
        <div className="relative max-w-sm mx-auto h-[380px] rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-b from-[#1a1520] to-[#0d0b12]">
          {/* Spotlight cone */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-full pointer-events-none"
            style={{
              background: "conic-gradient(from 0deg at 50% 0%, transparent 35%, rgba(212,168,67,0.06) 45%, rgba(212,168,67,0.12) 50%, rgba(212,168,67,0.06) 55%, transparent 65%)",
              animation: "spotlight-sway 4s ease-in-out infinite",
            }}
          />

          {/* Curtain left */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#3a0a0a] via-[#5a1515] to-transparent z-10 transition-all duration-[2000ms] ease-in-out"
            style={{
              width: elapsed - stages[3].at >= 2 ? "5%" : "50%",
            }}
          >
            {/* Curtain folds */}
            <div className="h-full w-full opacity-30"
              style={{
                backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.3) 8px, rgba(0,0,0,0.3) 10px)",
              }}
            />
          </div>

          {/* Curtain right */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-[#3a0a0a] via-[#5a1515] to-transparent z-10 transition-all duration-[2000ms] ease-in-out"
            style={{
              width: elapsed - stages[3].at >= 2 ? "5%" : "50%",
            }}
          >
            <div className="h-full w-full opacity-30"
              style={{
                backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.3) 8px, rgba(0,0,0,0.3) 10px)",
              }}
            />
          </div>

          {/* Curtain rod */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-amber-800/60 to-amber-900/30 z-20" />

          {/* User's image revealed behind curtains */}
          {imagePreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={imagePreview}
                alt="Your styled look"
                className="max-h-[360px] max-w-[90%] object-contain rounded-lg transition-all duration-1000"
                style={{
                  filter: elapsed - stages[3].at >= 3 ? "brightness(1) saturate(1.1)" : "brightness(0.3) saturate(0.5)",
                  transform: elapsed - stages[3].at >= 3 ? "scale(1)" : "scale(0.95)",
                }}
              />
            </div>
          )}

          {/* Sparkle particles */}
          {sparkles.map(s => (
            <div
              key={s.id}
              className="absolute pointer-events-none z-30"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                animation: `sparkle-pop 1.5s ease-out forwards`,
                animationDelay: `${s.delay}s`,
              }}
            >
              <svg viewBox="0 0 20 20" className="w-full h-full">
                <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#d4a843" opacity="0.8" />
              </svg>
            </div>
          ))}

          {/* "Ready" badge */}
          {elapsed - stages[3].at >= 4 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-full bg-primary/20 border border-primary/40 backdrop-blur-sm animate-in fade-in zoom-in duration-700">
              <span className="text-sm font-semibold text-primary">
                {lang === "he" ? "✨ הלוק שלך מוכן!" : "✨ Your look is ready!"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Fallback if no image preview */}
      {stageIdx === 0 && !imagePreview && (
        <div className="relative flex flex-col items-center">
          <div className="relative w-28 h-28 mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute inset-2 rounded-full border-2 border-primary/30 animate-spin" style={{ animationDuration: "8s" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">👁️</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage title + elapsed ── */}
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground mb-0.5 transition-all duration-500">
          {stage.title}
        </p>
        <p className="text-sm text-muted-foreground/70 mb-1">
          {stage.sub}
        </p>
        <p className="text-xs text-muted-foreground/50 tabular-nums font-mono">
          {formatTime(elapsed)}
        </p>

        {/* Context info */}
        <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
          {selectedOccasion && (
            <p className="flex items-center justify-center gap-1.5">
              <span>{OCCASIONS.find(o => o.id === selectedOccasion)?.icon}</span>
              {t("loading", "occasionPrefix")} {getOccasionLabel(selectedOccasion)}
            </p>
          )}
          {selectedInfluencers.length > 0 && (
            <p>
              {t("loading", "inspiredBy")}{" "}
              {selectedInfluencers.slice(0, 2).join(lang === "he" ? " ו" : " & ")}
              {selectedInfluencers.length > 2 ? ` ${lang === "he" ? "ועוד" : "+"} ${selectedInfluencers.length - 2}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="max-w-sm mx-auto space-y-3">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #d4a843, #e8556d, #d4a843)",
              backgroundSize: "200% 100%",
              animation: "shimmer-bar 2s linear infinite",
            }}
          />
        </div>

        {/* Stage dots */}
        <div className="flex justify-between px-2">
          {stages.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                i < stageIdx ? "bg-primary scale-100" :
                i === stageIdx ? "bg-primary scale-125 ring-2 ring-primary/30" :
                "bg-white/10"
              }`}>
                {i < stageIdx && (
                  <svg className="w-3 h-3 text-black" viewBox="0 0 12 12">
                    <path d="M2 6 L5 9 L10 3" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fashion tip card ── */}
      <div className={`max-w-sm mx-auto p-4 rounded-xl border border-primary/10 bg-primary/5 text-center transition-all duration-400 ${
        tipVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}>
        <p className="text-sm text-primary/80 leading-relaxed">
          {tips[tipIdx] || ""}
        </p>
      </div>

      {/* Time estimate */}
      <p className="text-center text-xs text-muted-foreground">
        {lang === "he" ? "זמן משוער: 30-60 שניות" : "Estimated time: 30-60 seconds"}
      </p>
    </div>
  );
}
