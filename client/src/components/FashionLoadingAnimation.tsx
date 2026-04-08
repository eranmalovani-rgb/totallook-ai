import { useState, useEffect } from "react";
import { OCCASIONS } from "../../../shared/fashionTypes";
import { useLanguage } from "@/i18n";

interface Props {
  uploading: boolean;
  analyzing: boolean;
  selectedOccasion: string;
  selectedInfluencers: string[];
  imagePreview?: string | null;
  /** Current auto-retry attempt (0 = first try, 1 = auto-retry) */
  attempt?: number;
}

const STEP_ICONS = ["👁️", "🎨", "✂️", "🔥", "💎", "🛍️", "✨"];

/** Time-based stage definitions: each stage starts at a specific elapsed second */
const STAGES_HE = [
  { at: 0,  label: "סורק את התמונה", icon: "👁️" },
  { at: 5,  label: "מזהה פריטי לבוש", icon: "🎨" },
  { at: 12, label: "מנתח צבעים וסגנון", icon: "✂️" },
  { at: 22, label: "בודק מותגים וטרנדים", icon: "🔥" },
  { at: 35, label: "מחשב ציונים", icon: "💎" },
  { at: 50, label: "מכין הצעות שדרוג", icon: "🛍️" },
  { at: 65, label: "יוצר מודבורד השראה", icon: "✨" },
];

const STAGES_EN = [
  { at: 0,  label: "Scanning the image", icon: "👁️" },
  { at: 5,  label: "Identifying clothing items", icon: "🎨" },
  { at: 12, label: "Analyzing colors & style", icon: "✂️" },
  { at: 22, label: "Checking brands & trends", icon: "🔥" },
  { at: 35, label: "Calculating scores", icon: "💎" },
  { at: 50, label: "Preparing upgrade suggestions", icon: "🛍️" },
  { at: 65, label: "Creating inspiration moodboard", icon: "✨" },
];

const FASHION_FACTS_HE = [
  "הצבע הכי פופולרי באופנת 2025 הוא בורגנדי 🍷",
  "ג'ינס הומצא ב-1873 על ידי Levi Strauss בסן פרנסיסקו 👖",
  "הנעליים הכי נמכרות בעולם הן Nike Air Force 1 👟",
  "השמלה השחורה הקטנה עוצבה לראשונה ע\"י Coco Chanel ב-1926 🖤",
  "בממוצע, אדם לובש רק 20% מהבגדים שבארון שלו 🤯",
  "הטרנד של Quiet Luxury צמח ב-60% ב-2024 💎",
  "צבע כחול נייבי נחשב ל\"שחור החדש\" באופנה עסקית 💼",
  "חולצה לבנה איכותית היא הפריט הכי רב-שימושי בארון 🤍",
  "מותג Hermès מייצר תיק Birkin אחד תוך 18 שעות עבודה ✋",
  "הטרנצ'קוט הומצא ב-1914 עבור חיילים בריטיים במלחמת העולם הראשונה 🧥",
  "אופנת Streetwear הפכה לתעשייה של 185 מיליארד דולר 🔥",
  "הצבע האדום מעלה את תחושת הביטחון העצמי בלבישה ❤️",
];

const FASHION_FACTS_EN = [
  "The most popular color in 2025 fashion is burgundy 🍷",
  "Jeans were invented in 1873 by Levi Strauss in San Francisco 👖",
  "The best-selling shoes in the world are Nike Air Force 1 👟",
  "The little black dress was first designed by Coco Chanel in 1926 🖤",
  "On average, people only wear 20% of the clothes in their closet 🤯",
  "The Quiet Luxury trend grew by 60% in 2024 💎",
  "Navy blue is considered the 'new black' in business fashion 💼",
  "A quality white shirt is the most versatile wardrobe staple 🤍",
  "Hermès crafts a single Birkin bag in 18 hours of handwork ✋",
  "The trench coat was invented in 1914 for British soldiers in WWI 🧥",
  "Streetwear has become a $185 billion industry 🔥",
  "Wearing red boosts self-confidence and perceived attractiveness ❤️",
];

export default function FashionLoadingAnimation({
  uploading,
  analyzing,
  selectedOccasion,
  selectedInfluencers,
  imagePreview,
  attempt = 0,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [scanPosition, setScanPosition] = useState(0);
  const { t, lang } = useLanguage();

  const stages = lang === "he" ? STAGES_HE : STAGES_EN;
  const facts = lang === "he" ? FASHION_FACTS_HE : FASHION_FACTS_EN;

  // Elapsed time counter
  useEffect(() => {
    if (!analyzing) { setElapsed(0); return; }
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [analyzing]);

  // Current stage based on elapsed time
  const currentStageIdx = stages.reduce((acc, stage, idx) => (elapsed >= stage.at ? idx : acc), 0);
  const currentStage = stages[currentStageIdx];

  // Progress: map elapsed to 0-95% based on stage progression
  const nextStageAt = currentStageIdx < stages.length - 1 ? stages[currentStageIdx + 1].at : 90;
  const stageProgress = currentStageIdx / (stages.length - 1);
  const withinStageProgress = Math.min(1, (elapsed - currentStage.at) / Math.max(1, nextStageAt - currentStage.at));
  const progress = Math.min(95, (stageProgress + withinStageProgress / (stages.length - 1)) * 95);

  // Scan line animation
  useEffect(() => {
    if (!analyzing || !imagePreview) return;
    const scanInterval = setInterval(() => {
      setScanPosition((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 30);
    return () => clearInterval(scanInterval);
  }, [analyzing, imagePreview]);

  // Rotate fashion facts
  useEffect(() => {
    if (!analyzing) return;
    const factInterval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setCurrentFact((prev) => (prev + 1) % facts.length);
        setFactVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(factInterval);
  }, [analyzing, facts.length]);

  const getOccasionLabel = (occId: string) => t("occasions", occId) || occId;

  // Format elapsed time
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  };

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

  return (
    <div className="py-6 space-y-6">
      {/* Auto-retry indicator */}
      {attempt > 0 && (
        <div className="max-w-sm mx-auto px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-xs text-amber-400">
            {lang === "he" ? "🔄 מנסה שוב אוטומטית..." : "🔄 Auto-retrying..."}
          </p>
        </div>
      )}

      {/* Image scan area */}
      {imagePreview ? (
        <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border border-primary/20 shadow-lg shadow-primary/5">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Scanning"
              className="w-full max-h-[350px] object-cover"
              style={{ filter: "brightness(0.7) contrast(1.1)" }}
            />

            {/* Scan line */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${scanPosition}%`,
                height: "3px",
                background: "linear-gradient(90deg, transparent 0%, #d4a843 20%, #fff 50%, #d4a843 80%, transparent 100%)",
                boxShadow: "0 0 20px 6px rgba(212, 168, 67, 0.5), 0 0 60px 10px rgba(212, 168, 67, 0.2)",
                transition: scanPosition === 0 ? "none" : "top 30ms linear",
              }}
            />

            {/* Scan glow */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${Math.max(0, scanPosition - 15)}%`,
                height: "15%",
                background: `linear-gradient(to bottom, transparent, rgba(212, 168, 67, 0.08))`,
                transition: scanPosition === 0 ? "none" : "top 30ms linear",
              }}
            />

            {/* Corner brackets */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary/60" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/60" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/60" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary/60" />

            {/* Detection labels */}
            {currentStageIdx >= 1 && (
              <div className="absolute top-4 right-10 px-2 py-0.5 rounded bg-primary/80 text-black text-[10px] font-bold animate-in fade-in zoom-in duration-500">
                {lang === "he" ? "מזהה פריטים" : "Detecting items"} 👁️
              </div>
            )}
            {currentStageIdx >= 3 && (
              <div className="absolute bottom-12 left-4 px-2 py-0.5 rounded bg-rose-500/80 text-white text-[10px] font-bold animate-in fade-in zoom-in duration-500">
                {lang === "he" ? "מנתח סגנון" : "Analyzing style"} 🔥
              </div>
            )}
            {currentStageIdx >= 5 && (
              <div className="absolute top-1/2 left-4 px-2 py-0.5 rounded bg-emerald-500/80 text-white text-[10px] font-bold animate-in fade-in zoom-in duration-500">
                {lang === "he" ? "מתאים המלצות" : "Matching recs"} 💎
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-center">
          <div className="relative w-28 h-28 mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute inset-2 rounded-full border-2 border-primary/30 animate-spin" style={{ animationDuration: "8s" }} />
            <div className="absolute inset-4 rounded-full border-2 border-dashed border-rose-400/30 animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl transition-all duration-500" style={{ transform: `scale(${currentStageIdx % 2 === 0 ? 1 : 1.1})` }}>
                {currentStage.icon}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Current stage text + elapsed time */}
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground mb-1 transition-all duration-500">
          {currentStage.label}
        </p>
        <p className="text-xs text-muted-foreground/60 tabular-nums">
          {formatTime(elapsed)}
        </p>

        {/* Context info */}
        <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
          {selectedOccasion && (
            <p className="flex items-center justify-center gap-1.5">
              <span>{OCCASIONS.find((o) => o.id === selectedOccasion)?.icon}</span>
              {t("loading", "occasionPrefix")} {getOccasionLabel(selectedOccasion)}
            </p>
          )}
          {selectedInfluencers.length > 0 && (
            <p>
              {t("loading", "inspiredBy")}{" "}
              {selectedInfluencers.slice(0, 2).join(lang === "he" ? " ו" : " & ")}
              {selectedInfluencers.length > 2
                ? ` ${lang === "he" ? "ועוד" : "+"} ${selectedInfluencers.length - 2}`
                : ""}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-sm mx-auto space-y-2">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-l from-primary via-rose-500 to-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Stage indicators */}
        <div className="flex justify-between px-1">
          {stages.map((stage, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                i <= currentStageIdx
                  ? "bg-primary/20 text-primary scale-110"
                  : "bg-white/5 text-muted-foreground"
              }`}
            >
              {i < currentStageIdx ? "✓" : stage.icon}
            </div>
          ))}
        </div>
      </div>

      {/* Fashion fact card */}
      <div
        className={`max-w-sm mx-auto p-4 rounded-xl border border-primary/10 bg-primary/5 text-center transition-all duration-400 ${
          factVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <p className="text-sm text-primary/80 leading-relaxed">
          {facts[currentFact] || ""}
        </p>
      </div>

      {/* Time estimate */}
      <p className="text-center text-xs text-muted-foreground">
        {lang === "he" ? "זמן משוער: 30-60 שניות" : "Estimated time: 30-60 seconds"}
      </p>

      {/* Tips accordion */}
      <details className="max-w-sm mx-auto">
        <summary className="text-sm text-muted-foreground cursor-pointer text-center hover:text-foreground transition-colors">
          {lang === "he" ? "טיפים לתמונה טובה:" : "Tips for a great photo:"} ▼
        </summary>
        <div className="mt-2 p-3 rounded-lg bg-white/5 text-xs text-muted-foreground space-y-1">
          <p>{lang === "he" ? "📸 צלם באור טבעי — זה עושה הבדל עצום" : "📸 Shoot in natural light — it makes a huge difference"}</p>
          <p>{lang === "he" ? "👤 צלם מלמעלה עד למטה — כולל נעליים" : "👤 Capture head to toe — including shoes"}</p>
          <p>{lang === "he" ? "🪞 רקע נקי עוזר לזיהוי מדויק יותר" : "🪞 A clean background helps with accurate detection"}</p>
        </div>
      </details>
    </div>
  );
}
