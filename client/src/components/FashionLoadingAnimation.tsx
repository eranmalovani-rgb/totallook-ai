import { useState, useEffect } from "react";
import { OCCASIONS } from "../../../shared/fashionTypes";
import { useLanguage } from "@/i18n";

interface Props {
  uploading: boolean;
  analyzing: boolean;
  selectedOccasion: string;
  selectedInfluencers: string[];
  imagePreview?: string | null;
}

const STEP_ICONS = ["👁️", "🎨", "✂️", "🔥", "💎", "🛍️", "✨"];

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
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [scanPosition, setScanPosition] = useState(0);
  const { t, lang } = useLanguage();

  const steps = (t("loading", "steps") as unknown as Array<string>);
  const facts = lang === "he" ? FASHION_FACTS_HE : FASHION_FACTS_EN;

  // Progress through analysis steps
  useEffect(() => {
    if (!analyzing) return;

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEP_ICONS.length - 1) return prev + 1;
        return prev;
      });
    }, 5000);

    return () => clearInterval(stepInterval);
  }, [analyzing]);

  // Smooth progress bar
  useEffect(() => {
    if (!analyzing) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        if (prev >= 80) return prev + 0.2;
        if (prev >= 60) return prev + 0.5;
        return prev + 1;
      });
    }, 300);

    return () => clearInterval(progressInterval);
  }, [analyzing]);

  // Scan line animation
  useEffect(() => {
    if (!analyzing || !imagePreview) return;

    const scanInterval = setInterval(() => {
      setScanPosition((prev) => {
        if (prev >= 100) return 0;
        return prev + 0.5;
      });
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

  const getOccasionLabel = (occId: string) => {
    return t("occasions", occId) || occId;
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
      {/* Image scan area */}
      {imagePreview ? (
        <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border border-primary/20 shadow-lg shadow-primary/5">
          {/* The uploaded image with slight dark overlay */}
          <div className="relative">
            <img
              src={imagePreview}
              alt="Scanning"
              className="w-full max-h-[350px] object-cover"
              style={{ filter: "brightness(0.7) contrast(1.1)" }}
            />

            {/* Scan line — glowing horizontal line moving down */}
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

            {/* Scan glow area above the line */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${Math.max(0, scanPosition - 15)}%`,
                height: "15%",
                background: `linear-gradient(to bottom, transparent, rgba(212, 168, 67, 0.08))`,
                transition: scanPosition === 0 ? "none" : "top 30ms linear",
              }}
            />

            {/* Corner brackets — scanning frame */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary/60" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/60" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/60" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary/60" />

            {/* Detection labels that appear as scan progresses */}
            {currentStep >= 1 && (
              <div className="absolute top-4 right-10 px-2 py-0.5 rounded bg-primary/80 text-black text-[10px] font-bold animate-in fade-in zoom-in duration-500">
                {lang === "he" ? "מזהה פריטים" : "Detecting items"} 👁️
              </div>
            )}
            {currentStep >= 3 && (
              <div className="absolute bottom-12 left-4 px-2 py-0.5 rounded bg-rose-500/80 text-white text-[10px] font-bold animate-in fade-in zoom-in duration-500">
                {lang === "he" ? "מנתח סגנון" : "Analyzing style"} 🔥
              </div>
            )}
            {currentStep >= 5 && (
              <div className="absolute top-1/2 left-4 px-2 py-0.5 rounded bg-emerald-500/80 text-white text-[10px] font-bold animate-in fade-in zoom-in duration-500">
                {lang === "he" ? "מתאים המלצות" : "Matching recs"} 💎
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fallback: animated icon if no image */
        <div className="relative flex flex-col items-center">
          <div className="relative w-28 h-28 mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute inset-2 rounded-full border-2 border-primary/30 animate-spin" style={{ animationDuration: "8s" }} />
            <div className="absolute inset-4 rounded-full border-2 border-dashed border-rose-400/30 animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl transition-all duration-500" style={{ transform: `scale(${currentStep % 2 === 0 ? 1 : 1.1})` }}>
                {STEP_ICONS[currentStep] || "✨"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Current step text */}
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground mb-1 transition-all duration-500">
          {(Array.isArray(steps) ? steps[currentStep] : null) || t("loading", "analyzing")}
        </p>

        {/* Context info */}
        <div className="text-sm text-muted-foreground space-y-0.5">
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
        {/* Step indicators */}
        <div className="flex justify-between px-1">
          {STEP_ICONS.map((icon, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                i <= currentStep
                  ? "bg-primary/20 text-primary scale-110"
                  : "bg-white/5 text-muted-foreground"
              }`}
            >
              {i < currentStep ? "✓" : icon}
            </div>
          ))}
        </div>
      </div>

      {/* Fashion fact card — rotating */}
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
        {t("loading", "estimatedTime")}
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
