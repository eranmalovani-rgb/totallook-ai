import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Sparkles, Star, TrendingUp, ShoppingBag, ExternalLink,
  ArrowLeft, ArrowRight, Upload, Users, BookOpen, ChevronDown
} from "lucide-react";
import { useLanguage } from "@/i18n";
import { getLoginUrl } from "@/const";
import { useFingerprint } from "@/hooks/useFingerprint";
import AnimatedSection from "@/components/AnimatedSection";
import StoreLogo, { extractStoreFromUrl, extractStoreFromLabel } from "@/components/StoreLogo";

const DEMO_IMAGE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/demo-outfit_b659ecdd.jpg";

const DEMO_OUTFIT_IMAGES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/demo-outfit-casual_a1dbf81c.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/demo-outfit-elegant_6fd450d3.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/demo-outfit-office_b8020931.jpg",
];

/* ── Full demo analysis data ── */
const DEMO_ANALYSIS = {
  he: {
    overallScore: 8,
    overallVerdict: "סטייל קז'ואל-אלגנטי מרשים",
    summary: "הלוק הזה משלב פריטי בייסיק איכותיים עם אקססוריז שמוסיפים עניין. הצבעוניות ניטרלית ומאוזנת, עם נגיעות שמשדרגות את המראה הכללי. יש כאן בסיס מצוין לסטייל אישי מגובש.",
    influencerInsight: "הלוק הזה מזכיר את הסטייל של David Beckham — שילוב של קז'ואל מתוחכם עם פריטי יוקרה שנראים טבעיים. גם Pharrell Williams ידוע בגישה דומה של שילוב בייסיקים איכותיים עם אקססוריז ייחודיים.",
    items: [
      { name: "חולצת פולו", score: 9, brand: "Ralph Lauren", description: "חולצת פולו קלאסית בגזרה מושלמת. הבד איכותי והצבע נקי — פריט בייסיק שעובד תמיד.", icon: "👕", verdict: "בחירה מצוינת", analysis: "חולצת הפולו היא בחירה קלאסית שמתאימה לכל אירוע. הגזרה מושלמת — לא צמודה מדי ולא רפויה. הצבע הנקי מאפשר שילוב עם כל פריט אחר בארון." },
      { name: "ג'ינס סלים", score: 8, brand: "Levi's 511", description: "ג'ינס בגזרת סלים-פיט בשטיפה כהה. הגזרה מחמיאה ונראית מטופחת.", icon: "👖", verdict: "יש פוטנציאל", analysis: "ג'ינס כהה הוא בסיס מצוין. הגזרה מחמיאה ונראית מטופחת. עם זאת, ג'ינס בגזרת סטרייט-לג רפויה יותר היה מוסיף מראה מודרני ואלגנטי יותר." },
      { name: "נעלי סניקרס", score: 7, brand: "Common Projects", description: "סניקרס לבנות מינימליסטיות. נקיות ואלגנטיות, משדרגות כל לוק קז'ואלי.", icon: "👟", verdict: "ניתן לשדרג", analysis: "סניקרס לבנות הן בחירה בטוחה ונקייה. עם זאת, לאירועים מזדמנים, נעלי לואפרס מעור או צ'לסי בוטס היו משדרגים את הלוק משמעותית." },
      { name: "שעון יד", score: 9, brand: "Daniel Wellington", description: "שעון קלאסי עם רצועת עור — אקססורי שמוסיף נקודת עניין ותחכום.", icon: "⌚", verdict: "בחירה מצוינת", analysis: "שעון יד קלאסי הוא האקססורי המושלם. רצועת העור מוסיפה חום ותחכום, והגודל מתאים ליד. זה הפריט שמשדרג את הלוק מקז'ואל לקז'ואל-אלגנטי." },
    ],
    scores: [
      { category: "התאמת צבעים", score: 9, recommendation: null },
      { category: "גזרה וסילואט", score: 8, recommendation: "גזרה רפויה יותר במכנסיים תוסיף מודרניות" },
      { category: "איכות הפריטים", score: 9, recommendation: null },
      { category: "אקססוריז", score: 7, recommendation: "הוסף צמיד או טבעת לנקודת עניין נוספת" },
      { category: "התאמה לאירוע", score: 8, recommendation: null },
      { category: "טרנדיות", score: 7, recommendation: "שכבה עליונה תוסיף עומק ותעדכן את הלוק" },
    ],
    improvements: [
      {
        title: "הוסף שכבה עליונה",
        description: "ז'קט בומבר או בלייזר קל ישדרגו את הלוק משמעותית. בחר בגוון ניטרלי כמו נייבי או חאקי.",
        beforeLabel: "ללא שכבה עליונה",
        afterLabel: "עם בלייזר או בומבר",
        shoppingLinks: [
          { label: "Bomber Jacket — Zara", url: "https://www.zara.com/search?searchTerm=bomber+jacket+men", imageUrl: "" },
          { label: "Cotton Blazer — ASOS", url: "https://www.asos.com/search/?q=cotton+blazer+men", imageUrl: "" },
        ],
      },
      {
        title: "שדרג את הנעליים",
        description: "לאירועים מזדמנים, נעלי לואפרס מעור ישדרגו את הלוק לרמה הבאה.",
        beforeLabel: "סניקרס לבנות",
        afterLabel: "לואפרס מעור",
        shoppingLinks: [
          { label: "Leather Loafers — Mr Porter", url: "https://www.mrporter.com/en-il/mens/shoes/loafers", imageUrl: "" },
        ],
      },
      {
        title: "הוסף צמיד או טבעת",
        description: "אקססורי קטן נוסף כמו צמיד עור או טבעת סיגנט יוסיף אופי אישי.",
        beforeLabel: "שעון בלבד",
        afterLabel: "שעון + צמיד עור",
        shoppingLinks: [
          { label: "Leather Bracelet — Miansai", url: "https://www.miansai.com/collections/mens-bracelets", imageUrl: "" },
        ],
      },
    ],
    outfitSuggestions: [
      {
        name: "קז'ואל שישי",
        occasion: "יציאה עם חברים",
        colors: ["#1a1a2e", "#e2d1c3", "#ffffff"],
        items: ["חולצת פולו Ralph Lauren בלבן", "ג'ינס Levi's 511 כהה", "סניקרס Common Projects", "שעון Daniel Wellington"],
        inspirationNote: "השילוב הזה מושלם ליציאה רגועה — נקי, מטופח, ולא מאולץ.",
      },
      {
        name: "דייט אלגנטי",
        occasion: "ארוחת ערב",
        colors: ["#0d1b2a", "#c9a96e", "#f5f5dc"],
        items: ["חולצה מכופתרת בצבע שמנת", "מכנסי צ'ינו נייבי", "לואפרס מעור חום", "שעון + צמיד עור"],
        inspirationNote: "שדרוג קל של הלוק הנוכחי — מחליפים את הפולו בחולצה מכופתרת ואת הסניקרס בלואפרס.",
      },
      {
        name: "סמארט קז'ואל למשרד",
        occasion: "עבודה / משרד",
        colors: ["#2c3e50", "#ecf0f1", "#c9a96e"],
        items: ["בלייזר נייבי", "חולצת פולו לבנה", "מכנסי צ'ינו בז'", "נעלי דרבי חומות"],
        inspirationNote: "הוספת בלייזר הופכת את הלוק למתאים למשרד בלי להרגיש פורמלי מדי.",
      },
    ],
    trendSources: [
      { source: "GQ", title: "The Best Smart-Casual Outfits for 2025", url: "https://www.gq.com/gallery/best-smart-casual-outfits", season: "SS25", relevance: "מדריך מקיף לסטייל קז'ואל-אלגנטי עם דגש על שכבות ואקססוריז" },
      { source: "Vogue", title: "Men's Fashion Trends Spring 2025", url: "https://www.vogue.com/fashion-shows/spring-2025-menswear", season: "SS25", relevance: "טרנדים עדכניים בגזרות, צבעים ושילובי פריטים" },
      { source: "Hypebeast", title: "Minimalist Sneaker Guide", url: "https://hypebeast.com/tags/minimalist-sneakers", season: "2025", relevance: "מדריך לסניקרס מינימליסטיות — הפריט שמשלים כל לוק" },
      { source: "Highsnobiety", title: "Quiet Luxury: The New Menswear", url: "https://www.highsnobiety.com/tag/quiet-luxury/", season: "2025", relevance: "הטרנד של יוקרה שקטה — פריטים איכותיים בלי לוגואים בולטים" },
    ],
    linkedMentions: [
      { text: "Ralph Lauren", type: "brand" as const, url: "https://www.ralphlauren.com" },
      { text: "Levi's", type: "brand" as const, url: "https://www.levi.com" },
      { text: "Common Projects", type: "brand" as const, url: "https://www.commonprojects.com" },
      { text: "Daniel Wellington", type: "brand" as const, url: "https://www.danielwellington.com" },
      { text: "David Beckham", type: "influencer" as const, url: "https://www.instagram.com/davidbeckham/" },
      { text: "Pharrell Williams", type: "influencer" as const, url: "https://www.instagram.com/pharrell/" },
    ],
  },
  en: {
    overallScore: 8,
    overallVerdict: "Impressive Smart-Casual Style",
    summary: "This look combines quality basics with accessories that add interest. The neutral color palette is balanced, with touches that elevate the overall appearance. There's an excellent foundation for a cohesive personal style.",
    influencerInsight: "This look is reminiscent of David Beckham's style — a blend of sophisticated casual with luxury pieces that look natural. Pharrell Williams is also known for a similar approach of combining quality basics with unique accessories.",
    items: [
      { name: "Polo Shirt", score: 9, brand: "Ralph Lauren", description: "Classic polo with perfect fit. Quality fabric and clean color — a basic that always works.", icon: "👕", verdict: "Excellent choice", analysis: "The polo shirt is a classic choice suitable for any occasion. The fit is perfect — not too tight and not too loose. The clean color allows pairing with any other wardrobe piece." },
      { name: "Slim Jeans", score: 8, brand: "Levi's 511", description: "Slim-fit jeans in dark wash. The cut is flattering and looks polished.", icon: "👖", verdict: "Has potential", analysis: "Dark jeans are an excellent base. The cut is flattering and polished. However, a more relaxed straight-leg cut would add a more modern and elegant look." },
      { name: "Sneakers", score: 7, brand: "Common Projects", description: "Minimalist white sneakers. Clean and elegant, they elevate any casual look.", icon: "👟", verdict: "Can be upgraded", analysis: "White sneakers are a safe and clean choice. However, for casual events, leather loafers or Chelsea boots would significantly upgrade the look." },
      { name: "Watch", score: 9, brand: "Daniel Wellington", description: "Classic watch with leather strap — an accessory that adds interest and sophistication.", icon: "⌚", verdict: "Excellent choice", analysis: "A classic wristwatch is the perfect accessory. The leather strap adds warmth and sophistication, and the size fits the wrist well. This is the piece that upgrades the look from casual to smart-casual." },
    ],
    scores: [
      { category: "Color Matching", score: 9, recommendation: null },
      { category: "Fit & Silhouette", score: 8, recommendation: "A more relaxed fit in pants would add modernity" },
      { category: "Item Quality", score: 9, recommendation: null },
      { category: "Accessories", score: 7, recommendation: "Add a bracelet or ring for an extra point of interest" },
      { category: "Occasion Fit", score: 8, recommendation: null },
      { category: "Trendiness", score: 7, recommendation: "An outer layer would add depth and update the look" },
    ],
    improvements: [
      {
        title: "Add an Outer Layer",
        description: "A bomber jacket or light blazer would significantly upgrade the look. Choose a neutral shade like navy or khaki.",
        beforeLabel: "No outer layer",
        afterLabel: "With blazer or bomber",
        shoppingLinks: [
          { label: "Bomber Jacket — Zara", url: "https://www.zara.com/search?searchTerm=bomber+jacket+men", imageUrl: "" },
          { label: "Cotton Blazer — ASOS", url: "https://www.asos.com/search/?q=cotton+blazer+men", imageUrl: "" },
        ],
      },
      {
        title: "Upgrade the Footwear",
        description: "For casual events, leather loafers would take the look to the next level.",
        beforeLabel: "White sneakers",
        afterLabel: "Leather loafers",
        shoppingLinks: [
          { label: "Leather Loafers — Mr Porter", url: "https://www.mrporter.com/en-il/mens/shoes/loafers", imageUrl: "" },
        ],
      },
      {
        title: "Add a Bracelet or Ring",
        description: "A small additional accessory like a leather bracelet or signet ring adds personal character.",
        beforeLabel: "Watch only",
        afterLabel: "Watch + leather bracelet",
        shoppingLinks: [
          { label: "Leather Bracelet — Miansai", url: "https://www.miansai.com/collections/mens-bracelets", imageUrl: "" },
        ],
      },
    ],
    outfitSuggestions: [
      {
        name: "Friday Casual",
        occasion: "Going out with friends",
        colors: ["#1a1a2e", "#e2d1c3", "#ffffff"],
        items: ["White Ralph Lauren polo", "Dark Levi's 511 jeans", "Common Projects sneakers", "Daniel Wellington watch"],
        inspirationNote: "This combination is perfect for a relaxed outing — clean, polished, and effortless.",
      },
      {
        name: "Elegant Date Night",
        occasion: "Dinner date",
        colors: ["#0d1b2a", "#c9a96e", "#f5f5dc"],
        items: ["Cream button-down shirt", "Navy chinos", "Brown leather loafers", "Watch + leather bracelet"],
        inspirationNote: "A subtle upgrade of the current look — swap the polo for a button-down and sneakers for loafers.",
      },
      {
        name: "Smart Casual Office",
        occasion: "Work / Office",
        colors: ["#2c3e50", "#ecf0f1", "#c9a96e"],
        items: ["Navy blazer", "White polo shirt", "Beige chinos", "Brown derby shoes"],
        inspirationNote: "Adding a blazer makes the look office-appropriate without feeling overly formal.",
      },
    ],
    trendSources: [
      { source: "GQ", title: "The Best Smart-Casual Outfits for 2025", url: "https://www.gq.com/gallery/best-smart-casual-outfits", season: "SS25", relevance: "Comprehensive guide to smart-casual style with emphasis on layering and accessories" },
      { source: "Vogue", title: "Men's Fashion Trends Spring 2025", url: "https://www.vogue.com/fashion-shows/spring-2025-menswear", season: "SS25", relevance: "Current trends in cuts, colors, and item combinations" },
      { source: "Hypebeast", title: "Minimalist Sneaker Guide", url: "https://hypebeast.com/tags/minimalist-sneakers", season: "2025", relevance: "Guide to minimalist sneakers — the piece that completes any look" },
      { source: "Highsnobiety", title: "Quiet Luxury: The New Menswear", url: "https://www.highsnobiety.com/tag/quiet-luxury/", season: "2025", relevance: "The quiet luxury trend — quality pieces without prominent logos" },
    ],
    linkedMentions: [
      { text: "Ralph Lauren", type: "brand" as const, url: "https://www.ralphlauren.com" },
      { text: "Levi's", type: "brand" as const, url: "https://www.levi.com" },
      { text: "Common Projects", type: "brand" as const, url: "https://www.commonprojects.com" },
      { text: "Daniel Wellington", type: "brand" as const, url: "https://www.danielwellington.com" },
      { text: "David Beckham", type: "influencer" as const, url: "https://www.instagram.com/davidbeckham/" },
      { text: "Pharrell Williams", type: "influencer" as const, url: "https://www.instagram.com/pharrell/" },
    ],
  },
};

/* ── Reusable sub-components ── */

function ScoreCircle({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const radius = size === "lg" ? 54 : 30;
  const stroke = size === "lg" ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const gradId = `demo-score-grad-${size}-${score}`;
  const glowColor = score >= 8 ? "rgba(200,164,78,0.25)" : score >= 6 ? "rgba(200,164,78,0.15)" : "rgba(200,164,78,0.08)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ filter: `drop-shadow(0 0 ${size === "lg" ? 10 : 6}px ${glowColor})` }}>
      <svg className={size === "lg" ? "w-32 h-32" : "w-16 h-16"} viewBox={`0 0 ${(radius + stroke) * 2} ${(radius + stroke) * 2}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c8a44e" />
            <stop offset="50%" stopColor="#e8c86e" />
            <stop offset="100%" stopColor="#c8a44e" />
          </linearGradient>
        </defs>
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/[0.06]" />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={`url(#${gradId})`} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round"
          className="transition-all duration-1000" transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`} />
      </svg>
      <span className={`absolute font-bold text-amber-100 ${size === "lg" ? "text-3xl" : "text-lg"}`}>{score}</span>
    </div>
  );
}

function ScoreBar({ label, score, recommendation, lang }: { label: string; score: number | null; recommendation?: string | null; lang: "he" | "en" }) {
  if (score === null) return null;
  return (
    <div>
      <div className="flex items-center gap-4">
        <span className={`text-sm text-amber-200/50 w-40 shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>{label}</span>
        <div className="flex-1 h-2.5 rounded-full bg-amber-500/[0.06] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score * 10}%`, background: "linear-gradient(90deg, #c8a44e, #e8c86e)" }} />
        </div>
        <span className="text-sm font-bold text-amber-100 w-10">{score}/10</span>
      </div>
      {recommendation && (
        <p className={`text-xs text-amber-400/60 mt-1.5 ${lang === "he" ? "mr-44" : "ml-44"} flex items-center gap-1`}>
          <span>✨</span> {recommendation}
        </p>
      )}
    </div>
  );
}

/** Demo outfit card: shows image first, click to expand item list */
function DemoOutfitCard({
  outfit,
  index,
  mentions,
  lang,
}: {
  outfit: { name: string; occasion: string; colors: string[]; items: string[]; inspirationNote?: string };
  index: number;
  mentions: any[];
  lang: "he" | "en";
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-white/5 bg-card overflow-hidden flex flex-col">
      {/* Visual hero — outfit image */}
      <div className="relative cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <img
          src={DEMO_OUTFIT_IMAGES[index] || DEMO_OUTFIT_IMAGES[0]}
          alt={outfit.name}
          className="w-full aspect-[3/4] object-cover"
        />
        {/* Overlay on image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-5 pointer-events-none">
          <h3 className="text-white text-lg font-bold drop-shadow-lg">{outfit.name}</h3>
          <p className="text-white/70 text-sm">{outfit.occasion}</p>
          <div className="flex gap-1.5 mt-2">
            {outfit.colors.map((color, j) => (
              <div
                key={j}
                className="w-5 h-5 rounded-full border-2 border-white/30 shadow-lg"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Product Details button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all border-t border-white/5 ${
          expanded
            ? 'bg-amber-500/10 text-amber-400'
            : 'bg-amber-500/[0.02] text-muted-foreground hover:bg-amber-500/[0.05] hover:text-foreground'
        }`}
      >
        <ShoppingBag className="w-4 h-4" />
        {expanded
          ? (lang === "he" ? "סגור" : "Close")
          : (lang === "he" ? "מידע לרכישה" : "Product Details")
        }
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expandable product details */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            {outfit.items.map((item, j) => (
              <div key={j} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/[0.02] hover:bg-amber-500/[0.05] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-400 text-xs font-bold">
                  {j + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    <LinkedText text={item} mentions={mentions} />
                  </p>
                </div>
              </div>
            ))}
          </div>
          {outfit.inspirationNote && (
            <div className="pt-3 border-t border-white/5">
              <p className="text-xs text-amber-400/80 italic leading-relaxed">
                <Sparkles className="w-3 h-3 inline-block mr-1 text-amber-400/60" />
                {outfit.inspirationNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkedText({ text, mentions }: { text: string; mentions?: any[] }) {
  const safeText = text ?? "";
  if (!safeText || !mentions?.length) return <>{safeText}</>;
  const sorted = [...mentions].sort((a, b) => b.text.length - a.text.length);
  const escapedTexts = sorted.map(m => m.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTexts.join('|')})`, 'g');
  const parts = safeText.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        const mention = sorted.find(m => m.text === part);
        if (mention) {
          const colorClass = mention.type === "brand" ? "text-amber-400 hover:text-amber-300" :
            mention.type === "influencer" ? "text-rose-400 hover:text-rose-300" : "text-amber-400 hover:text-amber-300";
          return (
            <a key={i} href={mention.url} target="_blank" rel="noopener noreferrer"
              className={`${colorClass} underline decoration-dotted underline-offset-2 transition-colors inline-flex items-center gap-0.5`}>
              {part} <ExternalLink className="w-2.5 h-2.5 inline opacity-50" />
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function getStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const map: Record<string, string> = {
      "gq.com": "GQ", "vogue.com": "Vogue", "hypebeast.com": "Hypebeast", "highsnobiety.com": "Highsnobiety",
    };
    return map[hostname] || hostname;
  } catch { return "Source"; }
}

/* ── Main Component ── */

export default function Demo() {
  const [, navigate] = useLocation();
  const { t, dir, lang } = useLanguage();
  const fingerprint = useFingerprint();
  const trackedRef = useRef(false);

  const trackViewMutation = trpc.demo.trackView.useMutation();
  const trackSignupMutation = trpc.demo.trackSignupClick.useMutation();
  const [demoViewId, setDemoViewId] = useState<number | null>(null);

  useEffect(() => {
    if (!fingerprint || trackedRef.current) return;
    trackedRef.current = true;
    trackViewMutation.mutateAsync({ fingerprint }).then((res) => {
      setDemoViewId(res.id);
    }).catch(() => {});
  }, [fingerprint]);

  const handleSignupClick = () => {
    if (demoViewId) trackSignupMutation.mutate({ demoViewId });
    window.location.href = getLoginUrl();
  };

  const demo = DEMO_ANALYSIS[lang] || DEMO_ANALYSIS.he;
  const mentions = demo.linkedMentions;
  const ArrowIcon = lang === "he" ? ArrowLeft : ArrowRight;

  const scoreComment = demo.overallScore >= 9
    ? (lang === "he" ? "לוק מצוין! כמעט מושלם" : "Excellent look! Almost perfect")
    : demo.overallScore >= 7
    ? (lang === "he" ? "בסיס מעולה עם פוטנציאל להיות מדהים" : "Great base with potential to be amazing")
    : (lang === "he" ? "יש בסיס טוב — עם כמה שינויים קטנים אפשר לשדרג משמעותית" : "Good base — a few small changes can make a big upgrade");

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      <div className="pt-24 pb-20">
        {/* Demo badge — editorial style */}
        <AnimatedSection>
          <div className="container max-w-5xl mx-auto mb-8">
            <div className="editorial-diamond-sep mb-6">
              <div className="editorial-diamond" />
            </div>
            <p className="editorial-label text-amber-400 text-center tracking-[0.2em]">
              {lang === "he" ? "דוגמת ניתוח" : "Sample Analysis"} — {lang === "he" ? "כך נראה ניתוח אמיתי" : "This is what a real analysis looks like"}
            </p>
          </div>
        </AnimatedSection>

        {/* ═══════ HERO — Image + Score (like real ReviewPage) ═══════ */}
        <AnimatedSection>
          <section className="container max-w-5xl mx-auto mb-20">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              {/* Outfit Image */}
              <div className="border border-border/50 overflow-hidden bg-card">
                <img
                  src={DEMO_IMAGE_URL}
                  alt="Demo outfit"
                  className="w-full max-h-[550px] object-contain"
                />
              </div>

              {/* Score + Summary */}
              <div className={`${dir === "rtl" ? "text-right" : "text-left"}`}>
                <p className="editorial-label text-amber-400 mb-4 tracking-[0.2em]">
                  {lang === "he" ? "חוות דעת אופנתית" : "Fashion Review"}
                </p>
                <h1 className="text-3xl md:text-4xl font-display mb-6">
                  {demo.overallVerdict}
                </h1>

                <div className="editorial-flourish mb-6" style={{ justifyContent: dir === "rtl" ? "flex-start" : "flex-start" }}>
                  <div className="editorial-flourish-line" style={{ maxWidth: '40px' }} />
                  <div className="editorial-flourish-dot" />
                  <div className="editorial-flourish-line" style={{ maxWidth: '40px' }} />
                </div>

                <p className="text-muted-foreground mb-8 leading-relaxed font-light">
                  <LinkedText text={demo.summary} mentions={mentions} />
                </p>

                {/* Score circle + label */}
                <div className={`flex items-center gap-6 ${dir === "rtl" ? "justify-start" : "justify-start"}`}>
                  <ScoreCircle score={demo.overallScore} />
                  <div>
                    <p className="text-lg font-display">{lang === "he" ? "ציון כללי" : "Overall Score"}: {demo.overallScore}/10</p>
                    <p className="text-sm text-muted-foreground font-light">{scoreComment}</p>
                  </div>
                </div>

                {/* Occasion badge */}
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-border/50">
                  <span className="editorial-label text-amber-400">{lang === "he" ? "אירוע:" : "Occasion:"}</span>
                  <span className="text-sm font-light">{lang === "he" ? "יומיומי / קז'ואל" : "Casual / Everyday"}</span>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ═══════ INFLUENCER INSIGHT ═══════ */}
        {demo.influencerInsight && (
          <AnimatedSection>
            <section className="container max-w-4xl mx-auto mb-20">
              <div className="p-8 border border-border/50">
                <div className="flex items-center gap-3 mb-5">
                  <Users className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                  <h3 className="font-display text-lg">{lang === "he" ? "תובנות משפיענים" : "Influencer Insights"}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed font-light">
                  <LinkedText text={demo.influencerInsight} mentions={mentions} />
                </p>
              </div>
            </section>
          </AnimatedSection>
        )}

        {/* ═══════ ITEMS ANALYSIS — Grid with icons + scores ═══════ */}
        <AnimatedSection>
          <section className="container max-w-5xl mx-auto mb-20">
            <div className="text-center mb-12">
              <p className="editorial-section-num mb-3">I</p>
              <p className="editorial-label text-amber-400 mb-4">{lang === "he" ? "פריטים שזוהו" : "Detected Items"}</p>
              <h2 className="text-3xl md:text-4xl font-display">{lang === "he" ? "ניתוח פריט-פריט" : "Item-by-Item Analysis"}</h2>
            </div>

            <AnimatedSection stagger staggerDelay={150} className="grid sm:grid-cols-2 gap-px bg-border/50">
              {demo.items.map((item, i) => (
                <div key={i} className="bg-background p-8 hover:bg-card/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-display text-lg">
                            <LinkedText text={item.name} mentions={mentions} />
                          </h3>
                          <p className="editorial-label mt-1">{item.brand}</p>
                        </div>
                        <ScoreCircle score={item.score} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 font-light leading-relaxed">
                        <LinkedText text={item.description} mentions={mentions} />
                      </p>
                      <span className={`inline-block text-xs px-3 py-1 border ${
                        item.verdict === "בחירה מצוינת" || item.verdict === "Excellent choice" ? "border-amber-400/30 text-amber-400" :
                        item.verdict === "יש פוטנציאל" || item.verdict === "Has potential" ? "border-amber-500/30 text-amber-400" :
                        item.verdict === "ניתן לשדרג" || item.verdict === "Can be upgraded" ? "border-yellow-400/30 text-yellow-400" :
                        "border-orange-400/30 text-orange-400"
                      }`}>
                        {item.verdict}
                      </span>
                      <p className="text-sm text-muted-foreground mt-4 leading-relaxed font-light">
                        <LinkedText text={item.analysis} mentions={mentions} />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </AnimatedSection>
          </section>
        </AnimatedSection>

        {/* ═══════ DETAILED SCORES ═══════ */}
        <AnimatedSection>
          <section className="container max-w-3xl mx-auto mb-20">
            <div className="text-center mb-12">
              <p className="editorial-section-num mb-3">II</p>
              <p className="editorial-label text-amber-400 mb-4">{lang === "he" ? "ציונים" : "Scores"}</p>
              <h2 className="text-3xl md:text-4xl font-display">{lang === "he" ? "ציונים מפורטים" : "Detailed Scores"}</h2>
            </div>

            <div className="p-8 border border-border/50 space-y-5">
              {demo.scores.map((s, i) => (
                <ScoreBar key={i} label={s.category} score={s.score} recommendation={s.recommendation} lang={lang} />
              ))}
            </div>
          </section>
        </AnimatedSection>

        {/* ═══════ IMPROVEMENTS WITH SHOPPING ═══════ */}
        <AnimatedSection>
          <section className="container max-w-4xl mx-auto mb-20">
            <div className="text-center mb-12">
              <p className="editorial-section-num mb-3">III</p>
              <p className="editorial-label text-amber-400 mb-4">{lang === "he" ? "שדרוגים" : "Upgrades"}</p>
              <h2 className="text-3xl md:text-4xl font-display">
                <Sparkles className={`w-6 h-6 text-amber-400 inline-block ${dir === "rtl" ? "ml-2" : "mr-2"}`} strokeWidth={1.5} />
                {lang === "he" ? "המלצות שדרוג" : "Upgrade Suggestions"}
              </h2>
            </div>

            <AnimatedSection stagger staggerDelay={200} className="space-y-6">
              {demo.improvements.map((imp, i) => (
                <div key={i} className="p-8 border border-border/50">
                  <div className="flex items-start gap-5 mb-5">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 border border-amber-500/30 text-amber-400 font-display text-lg">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg mb-3">{imp.title}</h3>
                      <p className="text-muted-foreground leading-relaxed font-light">{imp.description}</p>
                      <div className="flex flex-wrap gap-3 mt-5">
                        <span className="text-xs px-3 py-1.5 border border-red-400/20 text-red-400">
                          {lang === "he" ? "לפני" : "Before"}: {imp.beforeLabel}
                        </span>
                        <span className="text-xs self-center text-muted-foreground">→</span>
                        <span className="text-xs px-3 py-1.5 border border-amber-400/20 text-amber-400">
                          {lang === "he" ? "אחרי" : "After"}: {imp.afterLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  {imp.shoppingLinks && imp.shoppingLinks.length > 0 && (
                    <div className={`pt-5 border-t border-amber-500/10 ${dir === "rtl" ? "mr-15" : "ml-15"}`}>
                      <p className="text-xs text-amber-300/50 mb-3 font-medium flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {lang === "he" ? "מוצרים מומלצים" : "Recommended Products"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {imp.shoppingLinks.map((link, j) => {
                          const storeName = extractStoreFromUrl(link.url) || extractStoreFromLabel(link.label);
                          return (
                            <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-amber-500/20 text-xs text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all duration-200">
                              {storeName ? (
                                <>
                                  <StoreLogo name={storeName} size="sm" />
                                  <ExternalLink className="w-3 h-3 text-amber-400/50" />
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-3 h-3" />
                                  {link.label}
                                  <ExternalLink className="w-3 h-3 text-amber-400/50" />
                                </>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </AnimatedSection>
          </section>
        </AnimatedSection>

        {/* ═══════ OUTFIT SUGGESTIONS ═══════ REMOVED (Stage 98: mood looks disabled) */}

        {/* ═══════ TREND SOURCES ═══════ */}
        <AnimatedSection>
          <section className="container max-w-4xl mx-auto mb-20">
            <div className="text-center mb-12">
              <p className="editorial-section-num mb-3">V</p>
              <p className="editorial-label text-amber-400 mb-4">{lang === "he" ? "מקורות" : "Sources"}</p>
              <h2 className="text-3xl md:text-4xl font-display">
                <BookOpen className={`w-6 h-6 text-amber-400 inline-block ${dir === "rtl" ? "ml-2" : "mr-2"}`} strokeWidth={1.5} />
                {lang === "he" ? "מקורות טרנד" : "Trend Sources"}
              </h2>
            </div>

            <AnimatedSection stagger staggerDelay={120} className="grid sm:grid-cols-2 gap-px bg-border/50">
              {demo.trendSources.map((src, i) => (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="group bg-background p-6 hover:bg-card/50 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
                    <span className="text-sm font-display group-hover:text-amber-400 transition-colors">{src.source}</span>
                    <span className="eeditorial-label text-amber-400 px-2 py-0.5 border border-amber-500/200">{src.season}</span>
                  </div>
                  <h4 className="text-sm font-medium mb-2 line-clamp-2">{src.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 font-light">{src.relevance}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400/70 group-hover:text-amber-400 transition-colors editorial-label">
                    <span>{getStoreName(src.url)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
              ))}
            </AnimatedSection>
          </section>
        </AnimatedSection>

        {/* ═══════ MENTIONED BRANDS & INFLUENCERS ═══════ */}
        {mentions.length > 0 && (
          <AnimatedSection>
            <section className="container max-w-4xl mx-auto mb-20">
              <div className="p-6 border border-border/50">
                <h3 className="editorial-label text-amber-400 mb-4">{lang === "he" ? "מותגים ומשפיענים שהוזכרו" : "Mentioned Brands & Influencers"}</h3>
                <div className="flex flex-wrap gap-2">
                  {mentions.map((m, i) => {
                    const colorClass = m.type === "brand" ? "border-amber-500/30 text-amber-400" :
                      m.type === "influencer" ? "border-rose-400/30 text-rose-400" :
                      "border-amber-500/30 text-amber-400";
                    const typeLabel = m.type === "brand" ? (lang === "he" ? "מותג" : "Brand") :
                      m.type === "influencer" ? (lang === "he" ? "משפיען" : "Influencer") : "";
                    return (
                      <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border ${colorClass} hover:opacity-80 transition-opacity`}>
                        <span className="font-medium">{m.text}</span>
                        <span className="opacity-60">({typeLabel})</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </section>
          </AnimatedSection>
        )}

        {/* ═══════ CTA — Editorial closing ═══════ */}
        <section className="container max-w-3xl mx-auto text-center py-16">
          <div className="editorial-diamond-sep mb-12">
            <div className="editorial-diamond" />
          </div>

          <p className="editorial-label text-amber-400 mb-6 tracking-[0.2em]">
            {lang === "he" ? "מוכנים?" : "Ready?"}
          </p>

          <h2 className="text-3xl md:text-5xl font-display mb-6">
            {lang === "he" ? "רוצה לנסות עם התמונה שלך?" : "Want to try with your photo?"}
          </h2>

          <div className="editorial-flourish mb-8">
            <div className="editorial-flourish-line" />
            <div className="editorial-flourish-dot" />
            <div className="editorial-flourish-line" />
          </div>

          <p className="text-muted-foreground text-base max-w-md mx-auto mb-10 font-light leading-relaxed">
            {lang === "he"
              ? "העלה תמונה וקבל ניתוח מלא מותאם אישית — ללא רישום"
              : "Upload a photo and get a full personalized analysis — no signup required"}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="btn-editorial-filled gap-2 text-base px-8" onClick={() => navigate("/try")}>
              <Upload className="w-4 h-4" />
              {t("guest", "demoCtaButton")}
            </Button>
            <button className="btn-editorial inline-flex items-center gap-2" onClick={handleSignupClick}>
              <ArrowIcon className="w-4 h-4" />
              {t("guest", "demoSignupButton")}
            </button>
          </div>

          <p className="editorial-label mt-8 text-muted-foreground/40">
            {lang === "he" ? "ללא כרטיס אשראי. חינם לשימוש אישי." : "No credit card required. Free for personal use."}
          </p>
        </section>
      </div>
    </div>
  );
}
