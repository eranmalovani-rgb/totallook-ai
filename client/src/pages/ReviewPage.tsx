import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useParams, useLocation } from "wouter";
import { Link } from "wouter";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Upload, ExternalLink, Sparkles, TrendingUp, Users, BookOpen, ShoppingBag, Instagram, RefreshCw, Eye, Share2, Check, Pencil, Loader2, Send, MessageCircle, Wand2, Trash2, ChevronDown, ChevronLeft, ChevronRight, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { translations } from "@/i18n/translations";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
import type { FashionAnalysis, ShoppingLink, LinkedMention, OutfitSuggestion, ClosetMatch, ImprovementAlternative } from "../../../shared/fashionTypes";
import { BRAND_URLS, POPULAR_INFLUENCERS, getNextBudgetTier, getBudgetTierLabel } from "../../../shared/fashionTypes";
import ShareButtons from "@/components/ShareButtons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import FixMyLookModal from "@/components/FixMyLookModal";
import StoreLogo, { extractStoreFromUrl, extractStoreFromLabel } from "@/components/StoreLogo";
import InfluencerPostModal from "@/components/InfluencerPostModal";
import InfluencerAvatar from "@/components/InfluencerAvatar";
import InfluencerPicker from "@/components/InfluencerPicker";
import WhatsAppPhoneReminder, { HIDE_WHATSAPP_PHONE_MODAL_KEY } from "@/components/WhatsAppPhoneReminder";
import { useLanguage } from "@/i18n";
import confetti from "canvas-confetti";
import { useCountry } from "@/hooks/useCountry";
import { getCurrencyLabel } from "../../../shared/currency";
import { getCountryFlag } from "../../../shared/countries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ══════════════════════════════════════════════════════════════════
   Shared sub-components (kept from original)
   ══════════════════════════════════════════════════════════════════ */

function LinkedText({
  text,
  mentions,
  onInfluencerClick,
}: {
  text: string;
  mentions?: LinkedMention[];
  onInfluencerClick?: (name: string, handle?: string, igUrl?: string) => void;
}) {
  const safeText = text ?? "";
  const allMentions = useMemo(() => {
    if (!safeText) return [];
    const combined: LinkedMention[] = [...(mentions || [])];
    for (const [brand, url] of Object.entries(BRAND_URLS)) {
      if (safeText.includes(brand) && !combined.find(m => m.text === brand)) {
        combined.push({ text: brand, type: "brand", url });
      }
    }
    return combined.sort((a, b) => b.text.length - a.text.length);
  }, [safeText, mentions]);

  if (!safeText || !allMentions.length) return <>{safeText}</>;

  const escapedTexts = allMentions.map(m => m.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTexts.join('|')})`, 'g');
  const parts = safeText.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const mention = allMentions.find(m => m.text === part);
        if (mention) {
          const colorClass = mention.type === "brand" ? "text-primary hover:text-[#FF2E9F]" :
            mention.type === "influencer" ? "text-rose-400 hover:text-rose-300" :
            mention.type === "store" ? "text-teal-400 hover:text-teal-300" :
            "text-primary hover:text-primary/80";

          if (mention.type === "influencer" && onInfluencerClick) {
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const inf = POPULAR_INFLUENCERS.find(inf => inf.name === mention.text);
                  onInfluencerClick(mention.text, inf?.handle, mention.url);
                }}
                className={`${colorClass} font-bold underline decoration-solid underline-offset-2 transition-colors inline-flex items-center gap-1 cursor-pointer text-base`}
              >
                {part}
                <Instagram className="w-3.5 h-3.5 inline opacity-70" />
              </button>
            );
          }

          return (
            <a
              key={i}
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${colorClass} underline decoration-dotted underline-offset-2 transition-colors inline-flex items-center gap-0.5`}
            >
              {part}
              <ExternalLink className="w-2.5 h-2.5 inline opacity-50" />
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function ScoreCircle({ score, size = "lg" }: { score: number; size?: "sm" | "lg" | "xl" }) {
  const safeScore = score ?? 0;
  const radius = size === "xl" ? 62 : size === "lg" ? 54 : 30;
  const stroke = size === "xl" ? 7 : size === "lg" ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeScore / 10) * circumference;
  const color = safeScore >= 9 ? "text-[#FF2E9F]" : safeScore >= 7 ? "text-primary" : safeScore >= 5 ? "text-yellow-400" : "text-orange-400";

  const gradientId = `score-grad-${size}-${Math.round(safeScore * 10)}`;
  const glowColor = safeScore >= 9 ? "rgba(251,191,36,0.2)" : safeScore >= 7 ? "rgba(255,46,159,0.15)" : safeScore >= 5 ? "rgba(234,179,8,0.12)" : "rgba(249,115,22,0.12)";
  const gradColors = safeScore >= 9 ? ["#fbbf24", "#f59e0b"] : safeScore >= 7 ? ["#FF2E9F", "#e8c86e"] : safeScore >= 5 ? ["#eab308", "#ca8a04"] : ["#f97316", "#ea580c"];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ filter: size !== "sm" ? `drop-shadow(0 0 8px ${glowColor})` : undefined }}>
      <svg className={size === "xl" ? "w-36 h-36" : size === "lg" ? "w-32 h-32" : "w-16 h-16"} viewBox={`0 0 ${(radius + stroke) * 2} ${(radius + stroke) * 2}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradColors[0]} />
            <stop offset="100%" stopColor={gradColors[1]} />
          </linearGradient>
        </defs>
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/[0.04]" />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round"
          className="transition-all duration-1000" transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`} />
      </svg>
      <span className={`absolute font-bold tracking-tight ${size === "xl" ? "text-4xl" : size === "lg" ? "text-3xl" : "text-base"} ${safeScore >= 9 ? "text-[#FF2E9F]" : safeScore >= 7 ? "text-[#FF6BB5]/90" : safeScore >= 5 ? "text-yellow-300/90" : "text-orange-300/90"}`}>
        {safeScore}
      </span>
    </div>
  );
}

function ScoreBar({ label, score, explanation, recommendation, lang }: { label: string; score: number | null; explanation?: string; recommendation?: string; lang: "he" | "en" }) {
  if (score === null) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className={`text-xs text-muted-foreground w-28 shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>{label}</span>
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-white/10 transition-all duration-1000" style={{ width: '100%' }} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground/70 w-12 text-center">
            {lang === "he" ? "לא נראה" : "N/A"}
          </span>
        </div>
        {recommendation && (
          <p className={`text-[10px] text-primary/70 mt-1 ${lang === "he" ? "mr-32" : "ml-32"} flex items-center gap-1`}>
            <span>✨</span> {recommendation}
          </p>
        )}
      </div>
    );
  }

  const barGradient = score >= 9 ? "from-[#FF2E9F] to-[#7B2EFF]" : score >= 7 ? "from-[#FF2E9F]/80 to-[#7B2EFF]/80" : score >= 5 ? "from-yellow-500/70 to-yellow-400/70" : "from-orange-500/70 to-orange-400/70";
  const scoreColor = score >= 9 ? "text-[#FF2E9F]" : score >= 7 ? "text-[#FF6BB5]/90" : score >= 5 ? "text-yellow-300/90" : "text-orange-300/90";
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`text-[11px] text-muted-foreground/80 w-28 shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>{label}</span>
        <div className="flex-1 h-[6px] rounded-full bg-white/[0.04] overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-1000`} style={{ width: `${score * 10}%` }} />
        </div>
        <span className={`text-xs font-bold w-10 ${scoreColor}`}>{score}/10</span>
      </div>
      {explanation && (
        <p className={`text-[10px] text-muted-foreground/70 mt-1 ${lang === "he" ? "mr-32" : "ml-32"} leading-relaxed`}>
          {explanation}
        </p>
      )}
    </div>
  );
}

function ProductCard({ link, lang, isGeneratingImages }: { link: ShoppingLink; lang: "he" | "en"; isGeneratingImages?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const hasImage = link.imageUrl && link.imageUrl.length > 5;
  const showShimmer = !hasImage && isGeneratingImages;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/5 bg-card/50 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="aspect-square bg-white/5 overflow-hidden relative">
        {hasImage && !imgError ? (
          <>
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                <FashionButtonSpinner />
              </div>
            )}
            <img loading="lazy" src={link.imageUrl}
              alt={link.label}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
              onError={() => { setImgError(true); setImgLoading(false); }}
              onLoad={() => setImgLoading(false)}
            />
          </>
        ) : showShimmer ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-5 h-5 text-primary/50 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <span className="text-[10px] text-primary/60 font-medium">
                {lang === "he" ? "מחפש תמונת מוצר..." : "Finding product image..."}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 to-transparent">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/40">
              {lang === "he" ? "צפה בחנות" : "View Store"}
            </span>
          </div>
        )}
      </div>
      <div className="p-2">
        {(() => {
          const storeName = extractStoreFromUrl(link.url) || extractStoreFromLabel(link.label);
          if (storeName) {
            return (
              <div className="flex items-center justify-center py-1 rounded-lg bg-white/90 dark:bg-white/90 hover:bg-white dark:hover:bg-white transition-colors">
                <StoreLogo name={storeName} size="md" />
              </div>
            );
          }
          return (
            <>
              <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                {link.label}
              </p>
              <span className="text-[10px] text-primary/70 flex items-center gap-1 mt-1 group-hover:text-primary transition-colors">
                {lang === "he" ? "לרכישה" : "Buy Now"} <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </>
          );
        })()}
      </div>
    </a>
  );
}

/* ──────────────────────── Closet Item Popup ──────────────────────── */

function ClosetItemPopup({
  open,
  onOpenChange,
  closetMatch,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closetMatch: ClosetMatch;
  lang: "he" | "en";
}) {
  const isHe = lang === "he";
  const imageUrl = closetMatch.itemImageUrl || closetMatch.sourceImageUrl;
  const dir = isHe ? "rtl" : "ltr";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>♻️</span>
            {isHe ? "פריט מהארון שלך" : "Item from your closet"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {imageUrl ? (
            <div className="rounded-xl overflow-hidden border border-emerald-500/20 bg-black/20">
              <img loading="lazy" src={imageUrl} alt={closetMatch.name} className="w-full max-h-[400px] object-contain" />
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-black/20 flex items-center justify-center h-48">
              <p className="text-muted-foreground text-sm">{isHe ? "אין תמונה זמינה" : "No image available"}</p>
            </div>
          )}
          <div className="space-y-2 px-1">
            <h3 className="font-bold text-base">{closetMatch.name}</h3>
            <div className="flex flex-wrap gap-2">
              {closetMatch.brand && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {closetMatch.brand}
                </span>
              )}
              {closetMatch.color && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-white/5 text-muted-foreground border border-white/10">
                  {closetMatch.color}
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-white/5 text-muted-foreground border border-white/10">
                {closetMatch.itemType}
              </span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
              {isHe ? "סגור" : "Close"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ImprovementCard — Stage 45 Option C: AI before/after image + store buttons
   ══════════════════════════════════════════════════════════════════ */

function ImprovementCard({
  imp,
  index,
  lang,
  mentions,
  onInfluencerClick,
  t,
}: {
  imp: any;
  index: number;
  lang: "he" | "en";
  mentions?: LinkedMention[];
  onInfluencerClick?: (name: string, handle?: string, igUrl?: string) => void;
  t: (ns: string, key: string) => string;
}) {
  const [closetPopupOpen, setClosetPopupOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  // Stage 52: Track which option is selected (0 = primary, 1/2 = alternatives)
  const [selectedOption, setSelectedOption] = useState(0);
  const alternatives: ImprovementAlternative[] = imp.alternatives || [];
  const hasAlternatives = alternatives.length > 0;

  // Build array of all options (primary + alternatives)
  const allOptions = useMemo(() => {
    const primary = {
      title: imp.title,
      description: imp.description,
      afterLabel: imp.afterLabel,
      afterColor: imp.afterColor,
      afterGarmentType: imp.afterGarmentType,
      afterStyle: imp.afterStyle,
      afterFit: imp.afterFit,
      afterMaterial: imp.afterMaterial,
      afterPattern: imp.afterPattern,
      productSearchQuery: imp.productSearchQuery,
      shoppingLinks: imp.shoppingLinks || [],
      upgradeImageUrl: imp.upgradeImageUrl,
    };
    return [primary, ...alternatives];
  }, [imp, alternatives]);

  const activeOption = allOptions[selectedOption] || allOptions[0];
  const links = activeOption.shoppingLinks || [];

  const typeKeywords: Record<string, string[]> = {
    shirt: ["חולצ", "טי שירט", "shirt", "top", "tee", "polo", "blouse", "t-shirt", "👕"],
    pants: ["מכנס", "ג'ינס", "pants", "jeans", "trousers", "shorts", "👖"],
    shoes: ["נעל", "shoes", "sneaker", "boot", "סניקרס", "👟"],
    jacket: ["ז'קט", "מעיל", "jacket", "coat", "bomber", "hoodie", "קפוצ'ון", "סווטשירט", "🧥"],
    watch: ["שעון", "watch", "⌚"],
    accessory: ["אקססורי", "תכשיט", "שרשר", "צמיד", "טבעת", "accessory", "jewelry", "necklace", "bracelet", "ring", "chain", "💍", "📿"],
    bag: ["תיק", "bag", "backpack", "👜"],
    hat: ["כובע", "hat", "cap", "🧢"],
    sunglasses: ["משקפ", "sunglasses", "glasses", "🕶️"],
    vest: ["ווסט", "vest", "gilet", "וסט"],
    belt: ["חגורה", "belt"],
    scarf: ["צעיף", "scarf"],
  };

  const validClosetMatch = useMemo(() => {
    if (!imp.closetMatch) return null;
    const cm = imp.closetMatch;
    const cmName = (cm.name || "").toLowerCase();
    const cmType = (cm.itemType || "").toLowerCase();
    const impText = `${imp.title} ${imp.description} ${imp.afterLabel} ${imp.productSearchQuery || ""}`.toLowerCase();
    let cmCategory = "";
    for (const [cat, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(kw => cmType.includes(kw) || cmName.includes(kw))) { cmCategory = cat; break; }
    }
    let impCategory = "";
    for (const [cat, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(kw => impText.includes(kw))) { impCategory = cat; break; }
    }
    if (cmCategory && impCategory && cmCategory !== impCategory) return null;
    return cm;
  }, [imp]);

  return (
    <div className="rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden shadow-lg shadow-black/20">
      {/* Stage 62: All options displayed as horizontal gallery with images */}
      {hasAlternatives ? (
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {allOptions.map((opt, idx) => {
              const isActive = selectedOption === idx;
              return (
                <button
                  key={idx}
                  onClick={() => { setSelectedOption(idx); setImgLoaded(false); setImgError(false); }}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    isActive
                      ? 'border-[#FF2E9F]/60 ring-1 ring-[#FF2E9F]/20 scale-[1.02]'
                      : 'border-white/5 hover:border-white/20 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Option image */}
                  {opt.upgradeImageUrl ? (
                    <img
                      loading="lazy"
                      src={opt.upgradeImageUrl}
                      alt={opt.afterLabel}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-primary/5 via-rose-500/5 to-transparent flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary/40 animate-pulse" />
                    </div>
                  )}
                  {/* Label overlay */}
                  <div className={`absolute bottom-0 inset-x-0 px-1.5 py-1 text-[9px] font-medium text-center truncate ${
                    isActive ? 'bg-gradient-to-r from-[#FF2E9F]/90 to-[#7B2EFF]/90 text-white' : 'bg-black/60 text-white/80'
                  }`}>
                    {idx === 0
                      ? (lang === "he" ? "⭐ מומלץ" : "⭐ Top Pick")
                      : opt.afterLabel?.split(' ').slice(0, 3).join(' ') || (lang === "he" ? `אפשרות ${idx + 1}` : `Option ${idx + 1}`)}
                  </div>
                  {/* Selected checkmark */}
                  {isActive && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#FF2E9F] flex items-center justify-center shadow-lg shadow-[#FF2E9F]/30">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {/* Color/material info for selected option */}
          <div className="flex flex-wrap gap-1.5 px-1">
            {activeOption.afterColor && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/80">
                {activeOption.afterColor}
              </span>
            )}
            {activeOption.afterMaterial && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FF2E9F]/10 text-[#FF2E9F]/80">
                {activeOption.afterMaterial}
              </span>
            )}
            {activeOption.afterPattern && activeOption.afterPattern !== 'solid' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500/80">
                {activeOption.afterPattern}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Single option — show full-width image like before */
        activeOption.upgradeImageUrl && !imgError ? (
          <div className="relative">
            {!imgLoaded && (
              <div className="w-full aspect-[2/1] bg-gradient-to-br from-primary/5 via-rose-500/5 to-transparent flex items-center justify-center">
                <FashionButtonSpinner />
              </div>
            )}
            <img
              loading="lazy"
              src={activeOption.upgradeImageUrl}
              alt={`${imp.beforeLabel} → ${activeOption.afterLabel}`}
              className={`w-full aspect-[2/1] object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </div>
        ) : !activeOption.upgradeImageUrl ? (
          <div className="w-full aspect-[2/1] bg-gradient-to-br from-primary/5 via-rose-500/5 to-transparent flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Sparkles className="w-5 h-5 text-primary/50" />
            </div>
            <span className="text-xs text-muted-foreground">
              {lang === "he" ? "מייצר תמונת שידרוג..." : "Generating upgrade image..."}
            </span>
          </div>
        ) : null
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2E9F]/20 to-[#7B2EFF]/10 flex items-center justify-center shrink-0 text-[#FF2E9F] font-bold text-sm border border-[#FF2E9F]/20">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm mb-1 text-foreground/90">
              <LinkedText text={activeOption.title} mentions={mentions} onInfluencerClick={onInfluencerClick} />
            </h4>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              <LinkedText text={activeOption.description} mentions={mentions} onInfluencerClick={onInfluencerClick} />
            </p>
          </div>
        </div>

        {/* Before → After badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            {t("review", "before")}: {imp.beforeLabel}
          </span>
          <span className="text-[10px] self-center">→</span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t("review", "after")}: {activeOption.afterLabel}
          </span>
        </div>

        {/* Closet Match */}
        {validClosetMatch && (
          <>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setClosetPopupOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setClosetPopupOpen(true); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15 transition-colors"
            >
              <span className="text-xs" style={{ fontSize: '12px' }}>♻️</span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {(validClosetMatch.itemImageUrl || validClosetMatch.sourceImageUrl) && (
                  <img loading="lazy" src={validClosetMatch.itemImageUrl || validClosetMatch.sourceImageUrl}
                    alt={validClosetMatch.name}
                    className="w-6 h-6 rounded-md object-cover border border-emerald-500/30"
                  />
                )}
                <span className="text-[10px] text-emerald-400 font-medium truncate">
                  {lang === "he" ? "יש לך בארון: " : "In your closet: "}
                  <span className="font-bold">{validClosetMatch.name}</span>
                </span>
              </div>
              <Eye className="w-3 h-3 text-emerald-400/60 shrink-0" />
            </div>
            <ClosetItemPopup open={closetPopupOpen} onOpenChange={setClosetPopupOpen} closetMatch={validClosetMatch} lang={lang} />
          </>
        )}

        {/* Store Buttons — compact conversion-focused row */}
        {links.length > 0 && (
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-2">
              <ShoppingBag className="w-3 h-3 text-[#FF2E9F]/60" />
              <span className="text-[10px] text-[#FF2E9F]/60 font-medium">
                {t("review", "recommendedProducts")}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {links.map((link: any, j: number) => {
                const storeName = extractStoreFromUrl(link.url) || extractStoreFromLabel(link.label);
                return (
                  <a
                    key={j}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#FF2E9F]/15 bg-[#FF2E9F]/[0.04] hover:bg-[#FF2E9F]/10 hover:border-[#FF2E9F]/30 hover:shadow-[0_0_10px_rgba(200,164,78,0.1)] transition-all duration-300 flex-shrink-0"
                  >
                    {storeName ? (
                      <>
                        <div className="bg-white/90 rounded px-1 py-px">
                          <StoreLogo name={storeName} size="sm" />
                        </div>
                        <ExternalLink className="w-2.5 h-2.5 text-[#FF2E9F]/50 group-hover:text-[#FF2E9F] transition-colors" />
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-semibold text-[#FF6BB5]/70 group-hover:text-[#FF6BB5] transition-colors">
                          {link.label}
                        </span>
                        <ExternalLink className="w-2.5 h-2.5 text-[#FF2E9F]/50 group-hover:text-[#FF2E9F] transition-colors" />
                      </>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const map: Record<string, string> = {
      "ssense.com": "SSENSE", "mrporter.com": "MR PORTER", "asos.com": "ASOS",
      "nordstrom.com": "Nordstrom", "zara.com": "Zara", "cos.com": "COS",
      "massimodutti.com": "Massimo Dutti", "endclothing.com": "END.",
      "farfetch.com": "Farfetch", "vogue.com": "Vogue", "gq.com": "GQ",
      "hypebeast.com": "Hypebeast", "highsnobiety.com": "Highsnobiety",
    };
    return map[hostname] || hostname;
  } catch {
    return "Store";
  }
}

function RetryAnalyzeButton({ reviewId }: { reviewId: number }) {
  const { t, lang } = useLanguage();
  const analyzeMutation = trpc.review.analyze.useMutation();
  const utils = trpc.useUtils();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);

    // Auto-retry: try up to 2 times on retryable errors
    const MAX_RETRIES = 2;
    let lastError: any = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
        await analyzeMutation.mutateAsync({ reviewId });
        utils.review.get.invalidate({ id: reviewId });
        return; // success
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || "";
        const isRetryable = msg.includes("timeout") || msg.includes("זמן") ||
          msg.includes("ECONNRESET") || msg.includes("fetch failed") ||
          msg.includes("נכשל") || msg.includes("500") || msg.includes("502") || msg.includes("503");
        const isNonRetryable = msg.includes("in progress") || msg.includes("completed") ||
          msg.includes("Unauthorized");
        if (isNonRetryable || !isRetryable || attempt === MAX_RETRIES - 1) break;
        console.warn(`[RetryAnalyze] Attempt ${attempt + 1} failed, auto-retrying: ${msg}`);
      }
    }

    // Show specific error message
    const msg = lastError?.message || "";
    if (msg.includes("exhausted") || msg.includes("quota") || msg.includes("עמוס") || msg.includes("429") || msg.includes("rate")) {
      setRetryError(lang === "he"
        ? "שירות הניתוח עמוס כרגע. נסה שוב בעוד חצי דקה."
        : "Analysis service is busy. Try again in 30 seconds.");
    } else if (msg.includes("timeout") || msg.includes("זמן") || msg.includes("ECONNRESET")) {
      setRetryError(lang === "he"
        ? "הניתוח לקח יותר מדי זמן. נסה שוב."
        : "Analysis took too long. Please try again.");
    } else if (msg.includes("in progress") || msg.includes("analyzing")) {
      setRetryError(lang === "he"
        ? "הניתוח כבר רץ. המתן דקה ונסה שוב."
        : "Analysis is already running. Wait a moment and try again.");
    } else {
      setRetryError(lang === "he"
        ? "אירעה שגיאה בניתוח. נסה שוב."
        : "An error occurred during analysis. Please try again.");
    }
    setRetrying(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleRetry} disabled={retrying} className="gap-2">
        {retrying ? <FashionButtonSpinner /> : <RefreshCw className="w-4 h-4" />}
        {retrying ? t("common", "loading") : t("common", "tryAgain")}
      </Button>
      {retryError && <p className="text-xs text-destructive">{retryError}</p>}
    </div>
  );
}

/** Visual-first outfit card — Stage 94: Color palette mood board with item breakdown */
function OutfitCard({
  outfit,
  index,
  mentions,
  onInfluencerClick,
  lang,
}: {
  outfit: OutfitSuggestion;
  index: number;
  mentions: LinkedMention[];
  onInfluencerClick: (name: string, handle?: string, igUrl?: string) => void;
  lang: "he" | "en";
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const colors = (outfit.colors ?? []).filter(Boolean);
  const items = (outfit.items ?? []).filter(Boolean);
  const itemImages = (outfit.itemImages || []).filter(Boolean);

  // Build gradient from outfit colors for the mood board background
  const bgGradient = colors.length >= 3
    ? `linear-gradient(135deg, ${colors[0]}22 0%, ${colors[1]}18 50%, ${colors[2]}15 100%)`
    : colors.length >= 2
    ? `linear-gradient(135deg, ${colors[0]}22 0%, ${colors[1]}18 100%)`
    : colors.length === 1
    ? `linear-gradient(135deg, ${colors[0]}22 0%, transparent 100%)`
    : undefined;

  return (
    <div className="rounded-2xl border border-white/5 bg-card overflow-hidden flex flex-col">
      <div className="relative">
        {/* Color palette mood board */}
        <div className="w-full aspect-[3/4] flex flex-col" style={{ background: bgGradient || 'linear-gradient(135deg, rgba(255,255,255,0.02), transparent)' }}>
          {/* Top: Large color swatches */}
          <div className="flex-1 flex items-center justify-center px-6 pt-6 pb-3">
            <div className="flex gap-3 items-end">
              {colors.slice(0, 5).map((color, j) => {
                const heights = [64, 80, 72, 56, 48];
                const h = heights[j % heights.length];
                return (
                  <div key={j} className="flex flex-col items-center gap-1.5">
                    <div
                      className="rounded-xl border border-white/10 shadow-lg transition-transform hover:scale-105"
                      style={{ backgroundColor: color, width: 40, height: h }}
                    />
                    <span className="text-[9px] text-muted-foreground/50 font-mono uppercase">{color}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Bottom: Item list with color dots */}
          <div className="px-5 pb-4 space-y-1.5">
            {items.slice(0, 4).map((item, j) => (
              <div key={j} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: colors[j % colors.length] || '#888' }} />
                <p className="text-xs text-foreground/70 truncate">{item}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Overlay with name and occasion */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5 pointer-events-none">
          <h3 className="text-white text-lg font-bold drop-shadow-lg">{outfit.name}</h3>
          <p className="text-white/70 text-sm">{outfit.occasion}</p>
          <div className="flex gap-1.5 mt-2">
            {colors.map((color, j) => (
              <div key={j} className="w-5 h-5 rounded-full border-2 border-white/30 shadow-lg" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all border-t border-white/5 ${
          expanded ? 'bg-primary/10 text-primary' : 'bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'
        }`}
      >
        <ShoppingBag className="w-4 h-4" />
        {expanded ? (lang === "he" ? "סגור" : "Close") : (lang === "he" ? "מידע לרכישה" : "Product Details")}
      </button>
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            {items.map((item, j) => {
              const safeItem = item ?? "";
              const itemMention = mentions.find(m => safeItem.includes(m.text) && (m.type === 'brand' || m.type === 'store'));
              const thumbUrl = itemImages[j];
              return (
                <div key={j} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                  {thumbUrl ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10" style={{ backgroundColor: (colors[j % colors.length] || '#888') + '33' }}>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors[j % colors.length] || '#888' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      <LinkedText text={safeItem} mentions={mentions} onInfluencerClick={onInfluencerClick} />
                    </p>
                    {itemMention && (
                      <a href={itemMention.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1.5 transition-colors">
                        <ShoppingBag className="w-3 h-3" />
                        {lang === "he" ? "לרכישה" : "Buy Now"}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {outfit.inspirationNote && (
            <div className="pt-3 border-t border-white/5">
              <p className="text-xs text-primary/80 italic leading-relaxed">
                <Sparkles className="w-3 h-3 inline-block mr-1 text-primary/60" />
                <LinkedText text={outfit.inspirationNote} mentions={mentions} onInfluencerClick={onInfluencerClick} />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Story Cards — Swipeable horizontal card container
   ══════════════════════════════════════════════════════════════════ */

function StoryCards({
  children,
  labels,
  icons,
  dir,
}: {
  children: React.ReactNode[];
  labels: string[];
  icons: React.ReactNode[];
  dir: "rtl" | "ltr";
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [dragProgress, setDragProgress] = useState(0); // -1 to 1, for peek & progress
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const validChildren = children.filter(Boolean);

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    try { navigator?.vibrate?.(10); } catch {}
  }, []);

  // Auto-hide swipe hint after 4 seconds or on first interaction
  useEffect(() => {
    if (!showSwipeHint) return;
    const timer = setTimeout(() => setShowSwipeHint(false), 4000);
    return () => clearTimeout(timer);
  }, [showSwipeHint]);

  // Show first 4 tabs, rest go into "..." overflow
  const VISIBLE_TABS = 4;
  const visibleLabels = labels.slice(0, VISIBLE_TABS);
  const overflowLabels = labels.slice(VISIBLE_TABS);
  const hasOverflow = overflowLabels.length > 0;

  const isRTL = dir === "rtl";

  // Tab click animation (no finger drag — just animate exit + enter)
  const goToIndex = useCallback((newIndex: number, direction?: "next" | "prev") => {
    if (isAnimating || newIndex === activeIndex || !cardContainerRef.current) return;
    const d = direction || (newIndex > activeIndex ? "next" : "prev");
    setIsAnimating(true);

    const el = cardContainerRef.current;
    const w = wrapperRef.current?.offsetWidth || 350;
    // Slide current card out
    const exitX = d === "next" ? (isRTL ? w : -w) : (isRTL ? -w : w);

    el.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out";
    el.style.transform = `translateX(${exitX}px)`;
    el.style.opacity = "0";
    triggerHaptic();

    setTimeout(() => {
      setActiveIndex(newIndex);
      // Position new card on opposite side
      const enterX = d === "next" ? (isRTL ? -w : w) : (isRTL ? w : -w);
      el.style.transition = "none";
      el.style.transform = `translateX(${enterX * 0.3}px)`;
      el.style.opacity = "0";
      void el.offsetHeight;

      el.style.transition = "transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.25s ease-in";
      el.style.transform = "translateX(0)";
      el.style.opacity = "1";

      setTimeout(() => setIsAnimating(false), 320);
    }, 300);
  }, [activeIndex, isAnimating, isRTL, triggerHaptic]);

  // ── Touch swipe: finger follows card all the way, then next card enters ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    isDraggingRef.current = false;
    setShowSwipeHint(false);
    if (cardContainerRef.current) {
      cardContainerRef.current.style.transition = "none";
    }
  }, [isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isAnimating) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (!isDraggingRef.current && Math.abs(dy) > Math.abs(dx)) return;
    isDraggingRef.current = true;
    // Follow finger with NO clamp — card goes as far as the finger goes
    if (cardContainerRef.current) {
      cardContainerRef.current.style.transform = `translateX(${dx}px)`;
      const w = wrapperRef.current?.offsetWidth || 350;
      cardContainerRef.current.style.opacity = `${Math.max(0, 1 - Math.abs(dx) / w)}`;
      // Update drag progress for peek & progress bar (-1 = full left, 1 = full right)
      setDragProgress(Math.max(-1, Math.min(1, dx / w)));
    }
  }, [isAnimating]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    const velocity = Math.abs(dx) / Math.max(elapsed, 1);
    const w = wrapperRef.current?.offsetWidth || 350;
    // Commit if dragged > 25% of width OR fast flick
    const shouldCommit = isDraggingRef.current && (Math.abs(dx) >= w * 0.25 || velocity >= 0.4);
    isDraggingRef.current = false;

    const el = cardContainerRef.current;
    if (!el) return;

    const total = validChildren.length;
    // Determine direction
    let canGo = false;
    let newIdx = activeIndex;
    let swDir: "next" | "prev" = "next";
    if (isRTL) {
      if (dx > 0 && activeIndex < total - 1) { canGo = true; newIdx = activeIndex + 1; swDir = "next"; }
      else if (dx < 0 && activeIndex > 0) { canGo = true; newIdx = activeIndex - 1; swDir = "prev"; }
    } else {
      if (dx < 0 && activeIndex < total - 1) { canGo = true; newIdx = activeIndex + 1; swDir = "next"; }
      else if (dx > 0 && activeIndex > 0) { canGo = true; newIdx = activeIndex - 1; swDir = "prev"; }
    }

    if (!shouldCommit || !canGo) {
      // Snap back
      el.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out";
      el.style.transform = "translateX(0)";
      el.style.opacity = "1";
      setDragProgress(0);
      return;
    }

    // Continue sliding in the same direction the finger was going
    setIsAnimating(true);
    triggerHaptic();
    setDragProgress(0);
    const exitX = dx > 0 ? w : -w;
    // Calculate remaining distance and time proportionally (faster if already far)
    const remaining = Math.abs(exitX) - Math.abs(dx);
    const exitDuration = Math.max(0.1, Math.min(0.25, remaining / (w * 3)));

    el.style.transition = `transform ${exitDuration}s cubic-bezier(0.4, 0, 1, 1), opacity ${exitDuration}s ease-out`;
    el.style.transform = `translateX(${exitX}px)`;
    el.style.opacity = "0";

    setTimeout(() => {
      setActiveIndex(newIdx);
      // New card enters from opposite side
      const enterX = dx > 0 ? -w * 0.3 : w * 0.3;
      el.style.transition = "none";
      el.style.transform = `translateX(${enterX}px)`;
      el.style.opacity = "0";
      void el.offsetHeight;

      el.style.transition = "transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.22s ease-in";
      el.style.transform = "translateX(0)";
      el.style.opacity = "1";

      setTimeout(() => setIsAnimating(false), 300);
    }, exitDuration * 1000 + 10);
  }, [isRTL, validChildren.length, activeIndex, triggerHaptic]);

  // Peek: determine which neighbor to show
  const peekIndex = useMemo(() => {
    if (dragProgress === 0) return null;
    // In RTL: dragging right (positive) = next, dragging left (negative) = prev
    // In LTR: dragging left (negative) = next, dragging right (positive) = prev
    if (isRTL) {
      if (dragProgress > 0 && activeIndex < validChildren.length - 1) return activeIndex + 1;
      if (dragProgress < 0 && activeIndex > 0) return activeIndex - 1;
    } else {
      if (dragProgress < 0 && activeIndex < validChildren.length - 1) return activeIndex + 1;
      if (dragProgress > 0 && activeIndex > 0) return activeIndex - 1;
    }
    return null;
  }, [dragProgress, activeIndex, validChildren.length, isRTL]);

  const peekOpacity = Math.min(1, Math.abs(dragProgress) * 1.5);

  return (
    <div className="relative">
      {/* Studio-style progress segments — elegant gold thread */}
      <div className="flex gap-1.5 px-4 mb-4">
        {validChildren.map((_, i) => (
          <div key={i} className="flex-1 h-[2px] rounded-full overflow-hidden bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: i < activeIndex ? "100%" : i === activeIndex ? "100%" : "0%",
                background: i <= activeIndex ? "linear-gradient(90deg, #FF2E9F, #e8c86e)" : "transparent",
                opacity: i === activeIndex ? 1 : 0.5,
              }}
            />
          </div>
        ))}
      </div>

      {/* Tab bar — studio-themed prominent tabs */}
      <div className="flex gap-2 mb-5 px-2 pb-1 items-center justify-center flex-wrap">
        {visibleLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => { goToIndex(i); setShowOverflow(false); }}
            className={`group relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all duration-300 flex-shrink-0 border rounded-xl ${
              activeIndex === i
                ? "bg-gradient-to-b from-[#3D1580]/30 to-[#2D0F60]/20 text-[#FF2E9F] border-[#FF2E9F]/40 shadow-[0_0_14px_rgba(255,46,159,0.2)]"
                : "bg-white/[0.02] text-muted-foreground border-white/[0.06] hover:border-white/15 hover:text-foreground hover:bg-white/[0.04]"
            }`}
          >
            {/* Active indicator — gold stitch line at top */}
            {activeIndex === i && (
              <span className="absolute -top-px inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-[#FF2E9F]/70 to-transparent rounded-full" />
            )}
            <span className={`transition-transform duration-200 text-base ${activeIndex === i ? 'scale-110' : 'group-hover:scale-105'}`}>{icons[i]}</span>
            <span className="truncate max-w-[80px]">{label}</span>
          </button>
        ))}
        {hasOverflow && (
          <div className="relative">
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              className={`flex items-center justify-center w-11 h-11 rounded-xl text-sm font-bold transition-all duration-300 border ${
                activeIndex >= VISIBLE_TABS
                  ? "bg-gradient-to-b from-[#3D1580]/30 to-[#2D0F60]/20 text-[#FF2E9F] border-[#FF2E9F]/40 shadow-[0_0_12px_rgba(255,46,159,0.15)]"
                  : "bg-white/[0.02] text-muted-foreground border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]"
              }`}
            >
              •••
            </button>
            {showOverflow && (
              <div className={`absolute top-full mt-2 ${dir === "rtl" ? "left-0" : "right-0"} z-50 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-[#FF2E9F]/10 rounded-xl shadow-2xl shadow-black/40 py-1.5 min-w-[160px] backdrop-blur-sm`}>
                {overflowLabels.map((label, i) => {
                  const realIndex = VISIBLE_TABS + i;
                  return (
                    <button
                      key={realIndex}
                      onClick={() => { goToIndex(realIndex); setShowOverflow(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-all duration-200 ${
                        activeIndex === realIndex
                          ? "text-[#FF2E9F] bg-[#FF2E9F]/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      {icons[realIndex]}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active card — Instagram-style slide animation + swipe */}
      <div
        ref={wrapperRef}
        className="overflow-hidden px-2 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Peek: show edge of next/prev card during drag */}
        {peekIndex !== null && Math.abs(dragProgress) > 0.05 && (
          <div
            className="absolute top-0 bottom-0 w-[60%] pointer-events-none z-0"
            style={{
              [dragProgress > 0 ? (isRTL ? "left" : "right") : (isRTL ? "right" : "left")]: "-50%",
              opacity: peekOpacity * 0.3,
              transform: `translateX(${dragProgress > 0 ? (isRTL ? "-" : "") : (isRTL ? "" : "-")}${Math.max(0, 50 - Math.abs(dragProgress) * 50)}%)`,
              transition: "opacity 0.1s ease-out",
              filter: "blur(2px)",
            }}
          >
            <div className="scale-95 origin-center">
              {validChildren[peekIndex]}
            </div>
          </div>
        )}
        <div
          ref={cardContainerRef}
          className="relative z-10"
        >
          {validChildren[activeIndex]}
        </div>

        {/* Swipe hint arrow — only on first card, fades out */}
        {showSwipeHint && activeIndex === 0 && validChildren.length > 1 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{
              [isRTL ? "left" : "right"]: "8px",
              animation: "swipeHintBounce 1.5s ease-in-out infinite",
            }}
          >
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1.5">
              <span className="text-[10px] text-white/70 font-medium">
                {isRTL ? "\u05d2\u05dc\u05d5\u05dc" : "Swipe"}
              </span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-primary"
                style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {labels.map((_, i) => (
          <button
            key={i}
            onClick={() => goToIndex(i)}
            className={`rounded-full transition-all duration-300 ${
              activeIndex === i
                ? "w-6 h-2 bg-primary"
                : "w-2 h-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Expandable Section — for accordion-like expand/collapse
   ══════════════════════════════════════════════════════════════════ */

function ExpandableSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`border-b border-white/[0.06] last:border-b-0 transition-colors duration-300 ${open ? 'bg-white/[0.02]' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3.5 px-1 text-sm font-medium text-foreground hover:text-[#FF2E9F] transition-all duration-200 group"
      >
        <span className="flex items-center gap-2.5">
          {icon}
          <span className="tracking-wide">{title}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground/60 group-hover:text-[#FF2E9F]/60 transition-all duration-300 ${open ? "rotate-180 text-[#FF2E9F]/60" : ""}`} />
      </button>
      <div className={`transition-all duration-400 overflow-hidden ${open ? "max-h-[2000px] opacity-100 pb-4 px-1" : "max-h-0 opacity-0"}`}>
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN REVIEW PAGE
   ══════════════════════════════════════════════════════════════════ */

export default function ReviewPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const { t, lang, dir } = useLanguage();
  const params = useParams<{ id: string }>();
  const reviewId = parseInt(params.id || "0", 10);

  const [influencerModal, setInfluencerModal] = useState<{
    open: boolean;
    name: string;
    handle?: string;
    igUrl?: string;
  }>({ open: false, name: "" });

  const handleInfluencerClick = useCallback((name: string, handle?: string, igUrl?: string) => {
    setInfluencerModal({ open: true, name, handle, igUrl });
  }, []);

  const { country: detectedCountry } = useCountry();
  const currencyLabel = getCurrencyLabel(detectedCountry);
  const countryFlag = getCountryFlag(detectedCountry ?? "");

  const { data: userProfile } = trpc.profile.get.useQuery();
  const [showPhoneReminder, setShowPhoneReminder] = useState(false);
  const [showInfluencerSwap, setShowInfluencerSwap] = useState(false);
  const [swapSelection, setSwapSelection] = useState<string[]>([]);
  const phoneReminderShownRef = useRef(false);

  const { data: review, isLoading, error } = trpc.review.get.useQuery(
    { id: reviewId },
    { enabled: reviewId > 0, refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      if (status === "pending" || status === "analyzing") return 3000;
      const analysisData = (query.state.data as any)?.analysisJson;
      // Stage 43: Poll while Stage 2 is still running (improvements empty)
      const hasNoImprovements = !analysisData?.improvements || analysisData.improvements.length === 0;
      if ((status === "done" || status === "completed") && hasNoImprovements) return 3000;
      const hasEmptyImages = analysisData?.improvements?.some((imp: any) =>
        imp.shoppingLinks?.some((link: any) => !link.imageUrl || link.imageUrl.length < 5)
      );
      if ((status === "done" || status === "completed") && hasEmptyImages) return 3000;
      return false;
    }}
  );

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  const fixMyLookSectionRef = useRef<HTMLDivElement>(null);

  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const deleteReviewMutation = trpc.review.deleteOne.useMutation({
    onSuccess: () => {
      toast.success(lang === "he" ? "הניתוח נמחק בהצלחה" : "Analysis deleted successfully");
      navigate("/history");
    },
    onError: (err) => {
      toast.error((lang === "he" ? "שגיאה במחיקה: " : "Delete error: ") + err.message);
    },
  });

  // Stage 113b: Upgrade stores mutation
  const upgradeStoresMutation = trpc.review.upgradeStores.useMutation({
    onSuccess: (data) => {
      const tierLabel = getBudgetTierLabel(data.newTier, lang);
      toast.success(lang === "he" ? `החנויות עודכנו לרמת ${tierLabel}` : `Stores upgraded to ${tierLabel} tier`);
      utils.review.get.invalidate({ id: reviewId });
      utils.profile.get.invalidate();
    },
    onError: (err) => {
      toast.error((lang === "he" ? "שגיאה בעדכון חנויות: " : "Store upgrade error: ") + err.message);
    },
  });

  const correctItemMutation = trpc.review.correctItem.useMutation({
    onSuccess: () => {
      toast.success(t("review", "correctItemSuccess"));
      setEditingItemIndex(null);
      setCorrectionText("");
      utils.review.get.invalidate({ id: reviewId });
    },
    onError: (err) => {
      toast.error(err.message || t("review", "correctItemError"));
    },
  });

  const handleCorrectItem = (index: number) => {
    if (!correctionText.trim()) return;
    correctItemMutation.mutate({ reviewId, itemIndex: index, correction: correctionText.trim(), lang });
  };

  useEffect(() => {
    if (
      review?.status === "completed" &&
      userProfile !== undefined &&
      !userProfile?.phoneNumber &&
      !phoneReminderShownRef.current
    ) {
      try {
        if (localStorage.getItem(HIDE_WHATSAPP_PHONE_MODAL_KEY) === "true") return;
      } catch { /* localStorage unavailable */ }
      const timer = setTimeout(() => {
        setShowPhoneReminder(true);
        phoneReminderShownRef.current = true;
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [review?.status, userProfile]);

  // ── Progressive product image loading ──
  // Each ImprovementCard loads its own images independently via generateProductImages.
  // All cards trigger simultaneously (fallback 0ms), so images appear progressively
  // as each improvement's search results come back — no waiting for all to finish.

  // ── Loading / Error / Pending states ──

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="pt-28 container max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{t("review", "notFound")}</h1>
          <p className="text-muted-foreground mb-6">{t("review", "notFoundDesc")}</p>
          <Link href="/upload"><Button>{t("common", "tryAgain")}</Button></Link>
        </div>
      </div>
    );
  }

  if (review.status === "pending" || review.status === "analyzing") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-6" dir={dir}>
        <Navbar />
        <div className="relative"><FashionSpinner size="lg" /></div>
        <h2 className="text-xl font-bold">{t("loading", "analyzing")}</h2>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            {lang === "he" ? "בודק טרנדים עדכניים, מזהה מותגים ואקססוריז" : "Checking current trends, identifying brands and accessories"}
          </p>
        </div>
      </div>
    );
  }

  if (review.status === "failed") {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="pt-28 container max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">
            {lang === "he" ? "הניתוח נכשל" : "Analysis Failed"}
          </h1>
          <p className="text-muted-foreground mb-6">{t("upload", "genericError")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <RetryAnalyzeButton reviewId={reviewId} />
            <Link href="/upload">
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                {lang === "he" ? "העלה תמונה חדשה" : "Upload New Photo"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === review.userId;

  const rawAnalysis = review.analysisJson as FashionAnalysis;
  const analysis = rawAnalysis ? {
    ...rawAnalysis,
    summary: rawAnalysis.summary ?? "",
    overallScore: rawAnalysis.overallScore ?? 0,
    items: rawAnalysis.items ?? [],
    scores: rawAnalysis.scores ?? [],
    improvements: rawAnalysis.improvements ?? [],
    outfitSuggestions: rawAnalysis.outfitSuggestions ?? [],
    trendSources: rawAnalysis.trendSources ?? [],
    linkedMentions: rawAnalysis.linkedMentions ?? [],
    influencerInsight: rawAnalysis.influencerInsight ?? "",
  } : null;

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="pt-28 container max-w-2xl mx-auto text-center">
          <FashionSpinner size="md" />
          <p>{t("review", "loadingReview")}</p>
        </div>
      </div>
    );
  }

  const mentions = analysis.linkedMentions || [];

  const occasionLabel = review.occasion ? (
    lang === "he"
      ? (review.occasion === "work" ? "עבודה / משרד" :
        review.occasion === "casual" ? "יומיומי / קז'ואל" :
        review.occasion === "evening" ? "אירוע ערב" :
        review.occasion === "date" ? "דייט" :
        review.occasion === "friends" ? "יציאה עם חברים" :
        review.occasion === "formal" ? "פורמלי / עסקי" :
        review.occasion === "sport" ? "ספורטיבי" :
        review.occasion === "travel" ? "טיול / נסיעה" :
        review.occasion === "weekend" ? "סופ\"ש" : review.occasion)
      : (review.occasion === "work" ? "Work / Office" :
        review.occasion === "casual" ? "Casual / Everyday" :
        review.occasion === "evening" ? "Evening Event" :
        review.occasion === "date" ? "Date" :
        review.occasion === "friends" ? "Going Out with Friends" :
        review.occasion === "formal" ? "Formal / Business" :
        review.occasion === "sport" ? "Sporty / Active" :
        review.occasion === "travel" ? "Travel / Trip" :
        review.occasion === "weekend" ? "Weekend" : review.occasion)
  ) : null;

  const scoreComment = analysis.overallScore >= 9
    ? (lang === "he" ? "לוק מצוין! כמעט מושלם 🔥" : "Excellent look! Almost perfect 🔥")
    : analysis.overallScore >= 7
    ? (lang === "he" ? "בסיס מעולה עם פוטנציאל להיות מדהים ✨" : "Great base with potential to be amazing ✨")
    : (lang === "he" ? "יש בסיס טוב — עם כמה שינויים קטנים אפשר לשדרג 💪" : "Good base — a few small changes can make a big upgrade 💪");

  // ── Story card labels ──
  const hasInfluencerInsight = !!analysis.influencerInsight;

  const storyLabels = lang === "he"
    ? ["🎯 פריטים", ...(hasInfluencerInsight ? ["👥 משפיענים"] : []), "✨ שדרוגים", "📚 טרנדים"]
    : ["🎯 Items", ...(hasInfluencerInsight ? ["👥 Influencers"] : []), "✨ Upgrades", "📚 Trends"];

  const storyIcons = [
    <Eye className="w-4 h-4" key="items" />,
    ...(hasInfluencerInsight ? [<Users className="w-4 h-4" key="influencers" />] : []),
    <Sparkles className="w-4 h-4" key="upgrades" />,
    <BookOpen className="w-4 h-4" key="trends" />,
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      <WhatsAppPhoneReminder
        open={showPhoneReminder}
        onClose={() => setShowPhoneReminder(false)}
        defaultCountry={detectedCountry || "IL"}
      />

      <InfluencerPostModal
        open={influencerModal.open}
        onOpenChange={(open) => setInfluencerModal(prev => ({ ...prev, open }))}
        influencerName={influencerModal.name}
        influencerHandle={influencerModal.handle}
        igUrl={influencerModal.igUrl}
        context={analysis.influencerInsight}
      />

      {/* Influencer Swap Dialog — multi-select with confirm */}
      <Dialog open={showInfluencerSwap} onOpenChange={setShowInfluencerSwap}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>{lang === "he" ? "בחר/י משפיעני סטייל" : "Choose Style Influencers"}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {lang === "he" ? `נבחרו: ${swapSelection.length} משפיענים` : `Selected: ${swapSelection.length} influencers`}
            </p>
          </DialogHeader>
          <InfluencerPicker
            gender={userProfile?.gender || undefined}
            selectedInfluencers={swapSelection}
            onToggle={(name) => {
              setSwapSelection(prev =>
                prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
              );
            }}
            userProfile={userProfile ? {
              ageRange: userProfile.ageRange,
              budgetLevel: userProfile.budgetLevel,
              stylePreference: userProfile.stylePreference,
            } : undefined}
          />
          <div className="flex gap-2 mt-3 sticky bottom-0 bg-background pt-2 border-t border-white/10">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowInfluencerSwap(false)}
            >
              {lang === "he" ? "ביטול" : "Cancel"}
            </Button>
            <Button
              className="flex-1 gap-2"
              disabled={swapSelection.length === 0}
              onClick={() => {
                setShowInfluencerSwap(false);
                toast.success(lang === "he" ? `${swapSelection.length} משפיענים נבחרו` : `${swapSelection.length} influencers selected`);
              }}
            >
              <Check className="w-4 h-4" />
              {lang === "he" ? "אישור" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="pt-16 pb-12">
        {/* ═══════════════════════════════════════════════
            HERO CARD — Always visible
            ═══════════════════════════════════════════════ */}
        <section className="container max-w-lg mx-auto mb-6 px-4">
          {/* Image + Score overlay */}
          <div className="relative rounded-2xl overflow-hidden border border-[#FF2E9F]/10 bg-card shadow-xl shadow-black/30">
            <img loading="lazy" src={review.imageUrl}
              alt="Outfit"
              className="w-full max-h-[420px] object-contain bg-black/20"
            />
            {/* Score badge overlay */}
            <div className="absolute top-4 left-4">
              <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 border border-[#FF2E9F]/10">
                <ScoreCircle score={analysis.overallScore} size="sm" />
                <div>
                  <p className="text-foreground text-sm font-bold tracking-wide">{analysis.overallScore}/10</p>
                  <p className="text-[#FF6BB5]/40 text-[10px]">{t("review", "overallScore")}</p>
                </div>
              </div>
            </div>
            {/* Occasion badge */}
            {occasionLabel && (
              <div className="absolute top-4 right-4">
                <span className="bg-black/60 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full font-medium">
                  {occasionLabel}
                </span>
              </div>
            )}
          </div>

          {/* Summary text */}
          <div className="mt-5 space-y-3">
            <p className="text-sm text-muted-foreground/90 leading-relaxed tracking-wide">
              <LinkedText text={analysis.summary} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
            </p>
            <p className="text-xs font-semibold text-[#FF2E9F]/80 flex items-center gap-1.5">{scoreComment}</p>




          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            STORY CARDS — Swipeable horizontal cards
            ═══════════════════════════════════════════════ */}
        <section className="container max-w-lg mx-auto px-4">
          <StoryCards labels={storyLabels} icons={storyIcons} dir={dir}>
            {/* ── CARD 1: Items ── */}
            <div className="rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5 shadow-lg shadow-black/20">
              <h3 className="text-base font-bold mb-4 flex items-center gap-2.5 text-foreground/90">
                <Eye className="w-4.5 h-4.5 text-[#FF2E9F]/70" />
                {t("review", "itemsDetected")}
              </h3>

              {/* Item chips */}
              <div className="space-y-1">
                {(analysis.items ?? []).map((item, i) => (
                  <ExpandableSection
                    key={i}
                    title={`${item.icon} ${item.name}`}
                    icon={<ScoreCircle score={item.score} size="sm" />}
                    defaultOpen={false}
                  >
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <LinkedText text={item.description} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${
                          item.verdict === "בחירה מצוינת" || item.verdict === "Excellent choice" ? "bg-[#FF2E9F]/10 text-[#FF2E9F]" :
                          item.verdict === "ניגודיות טובה" || item.verdict === "Good contrast" ? "bg-primary/10 text-primary" :
                          item.verdict === "יש פוטנציאל" || item.verdict === "Has potential" ? "bg-primary/10 text-primary" :
                          item.verdict === "ניתן לשדרג" || item.verdict === "Can be upgraded" ? "bg-yellow-500/10 text-yellow-400" :
                          item.verdict === "דורש שיפור" || item.verdict === "Needs improvement" ? "bg-yellow-500/10 text-yellow-400" :
                          "bg-orange-500/10 text-orange-400"
                        }`}>
                          {item.verdict}
                        </span>
                        {item.brand && item.brand !== "לא זוהה" && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full border ${
                            item.brandConfidence === "HIGH" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            item.brandConfidence === "MEDIUM" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            item.brandConfidence === "LOW" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                            "bg-white/5 text-muted-foreground border-white/10"
                          }`}>
                            {item.brandUrl ? (
                              <a href={item.brandUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {item.brand}
                              </a>
                            ) : item.brand}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <LinkedText text={item.analysis} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
                      </p>

                      {/* Correct item */}
                      {isOwner && (
                        <div className="pt-2 border-t border-white/5">
                          {editingItemIndex === i ? (
                            <div className="space-y-2">
                              <p className="text-[10px] text-muted-foreground">{t("review", "correctItemDesc")}</p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={correctionText}
                                  onChange={(e) => setCorrectionText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCorrectItem(i); } }}
                                  placeholder={t("review", "correctItemPlaceholder")}
                                  className="flex-1 text-xs bg-background/50 border border-white/10 rounded-lg px-2 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                  disabled={correctItemMutation.isPending}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleCorrectItem(i)}
                                  disabled={!correctionText.trim() || correctItemMutation.isPending}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1 text-xs h-8"
                                >
                                  {correctItemMutation.isPending ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" />{t("review", "correctItemAnalyzing")}</>
                                  ) : (
                                    <><Send className="w-3 h-3" />{t("review", "correctItemSubmit")}</>
                                  )}
                                </Button>
                              </div>
                              <button
                                onClick={() => { setEditingItemIndex(null); setCorrectionText(""); }}
                                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {t("common", "cancel")}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingItemIndex(i); setCorrectionText(""); }}
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              {t("review", "correctItem")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </ExpandableSection>
                ))}
              </div>

              {/* Detailed Scores — collapsed inside items card */}
              {analysis.scores.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <ExpandableSection
                    title={t("review", "detailedScores")}
                    icon={<TrendingUp className="w-4 h-4 text-primary" />}
                  >
                    <div className="space-y-3 pt-2">
                      {analysis.scores.map((s, i) => (
                        <ScoreBar key={i} label={s.category} score={s.score} explanation={s.explanation} recommendation={s.recommendation} lang={lang} />
                      ))}
                    </div>
                  </ExpandableSection>
                </div>
              )}
            </div>

            {/* ── CARD 2: Influencer Insights (conditional) ── */}
            {hasInfluencerInsight && (
              <div className="rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5 shadow-lg shadow-black/20">
                {/* Best matching influencer — hero style with large avatar */}
                {(() => {
                  const influencerMentions = mentions.filter(m => m.type === "influencer");
                  const bestMatch = influencerMentions.length > 0
                    ? POPULAR_INFLUENCERS.find(inf => inf.name === influencerMentions[0].text)
                    : null;
                  if (!bestMatch) return (
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      {lang === "he" ? "תובנות משפיענים" : "Influencer Insights"}
                    </h3>
                  );
                  return (
                    <div className="text-center mb-5">
                      {/* Large avatar */}
                      <div className="flex justify-center mb-3">
                        <div className="relative">
                          <InfluencerAvatar name={bestMatch.name} imageUrl={bestMatch.imageUrl} size="lg" className="!w-20 !h-20 !text-2xl ring-2 ring-primary/30" />
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-[#7B2EFF] text-white font-bold whitespace-nowrap shadow-lg">
                            {lang === "he" ? "✨ הכי מתאים" : "✨ Best Match"}
                          </span>
                        </div>
                      </div>
                      <p className="text-base font-bold">{bestMatch.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{bestMatch.style}</p>
                      <button
                        onClick={() => handleInfluencerClick(bestMatch.name, bestMatch.handle, bestMatch.igUrl)}
                        className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        {lang === "he" ? "ראה דוגמת סטיילינג" : "See styling example"}
                      </button>
                    </div>
                  );
                })()}

                {/* Insight text */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  <LinkedText text={analysis.influencerInsight!} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
                </p>

                {/* Swap / Add influencers buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      const currentNames = mentions.filter(m => m.type === "influencer").map(m => m.text);
                      setSwapSelection(currentNames);
                      setShowInfluencerSwap(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors border border-dashed border-white/10 hover:border-primary/30 rounded-xl"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {lang === "he" ? "החלף משפיענים" : "Swap influencers"}
                  </button>
                  <button
                    onClick={() => {
                      const currentNames = mentions.filter(m => m.type === "influencer").map(m => m.text);
                      setSwapSelection(currentNames);
                      setShowInfluencerSwap(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-[#FF2E9F] transition-colors border border-dashed border-white/10 hover:border-[#FF2E9F]/30 rounded-xl"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {lang === "he" ? "הוסף משפיענים" : "Add influencers"}
                  </button>
                </div>
              </div>
            )}

            {/* ── CARD 3: Upgrades ── */}
            {/* (was Card 2, now Card 3 after inserting Influencer) */}
            <div className="rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold flex items-center gap-2.5 text-foreground/90">
                  <Sparkles className="w-4.5 h-4.5 text-[#FF2E9F]/70" />
                  {t("review", "upgradeSuggestions")}
                </h3>
                {detectedCountry && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">
                    {countryFlag} {currencyLabel}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {(analysis.improvements ?? []).length === 0 ? (
                  /* Stage 43: Show loading skeleton while Stage 2 runs in background */
                  <div className="space-y-3 py-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        {lang === "he" ? "מכין המלצות מותאמות אישית..." : "Preparing personalized recommendations..."}
                      </p>
                    </div>
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 animate-pulse">
                        <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                        <div className="h-3 bg-white/5 rounded w-full mb-2" />
                        <div className="h-3 bg-white/5 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : (
                  (analysis.improvements ?? []).map((imp, i) => (
                    <ExpandableSection
                      key={i}
                      title={imp.title}
                      defaultOpen={true}
                    >
                      <ImprovementCard
                        imp={imp}
                        index={i}
                        lang={lang}
                        mentions={mentions}
                        onInfluencerClick={handleInfluencerClick}
                        t={t}
                      />
                    </ExpandableSection>
                  ))
                )}
              </div>

              {/* Stage 114d: Upgrade stores button moved to onboarding */}

              {/* Fix My Look CTA — attractive card inside Upgrades */}
              {isOwner && (
                <div ref={fixMyLookSectionRef} className="mt-5">
                  <div className="relative overflow-hidden rounded-2xl border border-[#FF2E9F]/30 bg-gradient-to-br from-rose-500/10 via-[#FF2E9F]/10 to-primary/5 p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF2E9F]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-[#7B2EFF] flex items-center justify-center shadow-lg shadow-[#FF2E9F]/20">
                          <Wand2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-base font-bold">
                            {analysis.overallScore >= 9
                              ? (lang === "he" ? "רוצה לראות וריאציות?" : "Want to see variations?")
                              : (lang === "he" ? "🔥 ראה איך תיראה עם השדרוגים" : "🔥 See how you’d look upgraded")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {lang === "he" ? "ה-AI ייצר הדמיה עם הפריטים המומלצים" : "AI will generate a preview with recommended items"}
                          </p>
                        </div>
                      </div>
                      <FixMyLookModal
                        reviewId={reviewId}
                        analysis={analysis}
                        trigger={
                          <Button size="lg" className="w-full gap-2 bg-gradient-to-r from-rose-600 to-[#7B2EFF] hover:from-rose-500 hover:to-[#7B2EFF] text-white font-bold shadow-lg shadow-[#FF2E9F]/25 text-base py-6">
                            <Wand2 className="w-5 h-5" />
                            {analysis.overallScore >= 9
                              ? (lang === "he" ? "לפני ואחרי" : "Before & After")
                              : (lang === "he" ? "תקן את הלוק שלי" : "Fix My Look")}
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── CARD 4: Outfit Suggestions ── REMOVED (Stage 98: mood looks disabled) */}

            {/* ── CARD 4 (was 5): Trends & Sources ── */}
            <div className="rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5 shadow-lg shadow-black/20">
              <h3 className="text-base font-bold mb-4 flex items-center gap-2.5 text-foreground/90">
                <BookOpen className="w-4.5 h-4.5 text-[#FF2E9F]/70" />
                {t("review", "trendSources")}
              </h3>
              {(!analysis.trendSources || analysis.trendSources.length === 0) && (analysis.improvements ?? []).length === 0 ? (
                /* Stage 43: Show loading skeleton while Stage 2 runs in background */
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      {lang === "he" ? "אוסף מקורות וטרנדים..." : "Gathering trends and sources..."}
                    </p>
                  </div>
                  {[1, 2].map((n) => (
                    <div key={n} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 animate-pulse">
                      <div className="h-3 bg-white/10 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-white/5 rounded w-full mb-1" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : analysis.trendSources && analysis.trendSources.length > 0 ? (
                <div className="space-y-3">
                  {analysis.trendSources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-primary/20 hover:bg-white/[0.05] transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold group-hover:text-primary transition-colors">{src.source}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{src.season}</span>
                      </div>
                      <h4 className="text-xs font-medium mb-1 line-clamp-2">{src.title}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{src.relevance}</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-primary/70 group-hover:text-primary transition-colors">
                        <span>{getStoreName(src.url)}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {lang === "he" ? "אין מקורות זמינים" : "No sources available"}
                </p>
              )}

              {/* Mentions legend */}
              {mentions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <ExpandableSection
                    title={t("review", "mentionsLegend")}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {mentions.map((m, i) => {
                        const colorClass = m.type === "brand" ? "bg-primary/10 text-primary border-primary/20" :
                          m.type === "influencer" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          m.type === "store" ? "bg-[#FF2E9F]/10 text-[#FF2E9F] border-[#FF2E9F]/20" :
                          "bg-primary/10 text-primary border-primary/20";
                        const typeLabel = m.type === "brand" ? t("review", "brand") :
                          m.type === "influencer" ? t("review", "influencer") :
                          m.type === "store" ? t("review", "store") : t("review", "item");

                        if (m.type === "influencer") {
                          const inf = POPULAR_INFLUENCERS.find(inf => inf.name === m.text);
                          return (
                            <button
                              key={i}
                              onClick={() => handleInfluencerClick(m.text, inf?.handle, m.url)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}
                            >
                              <Instagram className="w-2.5 h-2.5 opacity-50" />
                              <span className="font-medium">{m.text}</span>
                              <span className="opacity-60">({typeLabel})</span>
                            </button>
                          );
                        }

                        return (
                          <a
                            key={i}
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border ${colorClass} hover:opacity-80 transition-opacity`}
                          >
                            <span className="font-medium">{m.text}</span>
                            <span className="opacity-60">({typeLabel})</span>
                            <ExternalLink className="w-2 h-2 opacity-50" />
                          </a>
                        );
                      })}
                    </div>
                  </ExpandableSection>
                </div>
              )}
            </div>


          </StoryCards>
        </section>

        {/* ═══════════════════════════════════════════════
            SHARE & ACTIONS — Moved below tabs for cleaner flow
            ═══════════════════════════════════════════════ */}
        <section className="container max-w-lg mx-auto px-4 mt-4">
          <div className="flex items-center justify-center gap-2.5 py-3 border-t border-b border-white/[0.04]">
            {isOwner && (
              <>
                <ShareToFeedButton reviewId={reviewId} />
                <ShareButtons
                  reviewId={reviewId}
                  score={analysis.overallScore}
                  summary={analysis.summary}
                  imageUrl={review.imageUrl}
                />
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-destructive transition-colors px-2 py-1">
                  <Trash2 className="w-3 h-3" />
                  {lang === "he" ? "מחק" : "Delete"}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent dir={dir}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{lang === "he" ? "מחיקת ניתוח" : "Delete Analysis"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {lang === "he"
                      ? "האם למחוק את הניתוח הזה? התמונה והתוצאות יימחקו לצמיתות."
                      : "Delete this analysis? The image and results will be permanently removed."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={dir === "rtl" ? "flex-row-reverse gap-2" : "gap-2"}>
                  <AlertDialogCancel>{lang === "he" ? "ביטול" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteReviewMutation.mutate({ reviewId })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <Trash2 className={`w-4 h-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                    {lang === "he" ? "מחק" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            BOTTOM ACTIONS
            ═══════════════════════════════════════════════ */}
        {isOwner && (
          <div className="container max-w-lg mx-auto px-4 mt-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF2E9F]/10 border border-[#FF2E9F]/20">
              <span className="text-sm">🔒</span>
              <p className="text-[10px] text-[#FF2E9F]">
                {translations.feed.privateNote[lang]}
              </p>
            </div>
          </div>
        )}

        <section className="container max-w-lg mx-auto text-center px-4 mt-2">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isOwner ? (
              <>
                <Link href="/upload">
                  <Button size="lg" className="gap-2 w-full sm:w-auto">
                    <Upload className="w-5 h-5" />
                    {t("review", "newAnalysis")}
                  </Button>
                </Link>
                <Link href="/history">
                  <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                    <BackArrow className="w-5 h-5" />
                    {t("review", "myHistory")}
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/feed">
                <Button size="lg" variant="outline" className="gap-2">
                  <BackArrow className="w-5 h-5" />
                  {lang === "he" ? "חזרה לפיד" : "Back to Feed"}
                </Button>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---- Inline Share CTA Banner ----

function ShareCTABanner({ reviewId, message, score, summary }: { reviewId: number; message: string; score?: number; summary?: string }) {
  const { lang } = useLanguage();
  const tf = (key: keyof typeof translations.feed) => translations.feed[key][lang];
  const [showCaption, setShowCaption] = useState(false);
  const [caption, setCaption] = useState("");

  const isPublishedQuery = trpc.feed.isPublished.useQuery({ reviewId });
  const publishMutation = trpc.feed.publish.useMutation({
    onSuccess: () => {
      toast.success(tf("shared"));
      setShowCaption(false);
      isPublishedQuery.refetch();
      confetti({
        particleCount: 120, spread: 80, origin: { y: 0.7 },
        colors: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
      });
    },
    onError: (err) => { toast.error(err.message); },
  });

  const handleWhatsApp = useCallback(() => {
    const shareUrl = `${window.location.origin}/review/${reviewId}`;
    const text = lang === "he"
      ? `✨ קיבלתי ציון ${score ?? ""}/10 ב-TotalLook.ai!\n\n${(summary || "").slice(0, 100)}\n\nקבלו גם אתם חוות דעת אופנתית:`
      : `✨ I scored ${score ?? ""}/10 on TotalLook.ai!\n\n${(summary || "").slice(0, 100)}\n\nGet your fashion review too:`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + shareUrl)}`, "_blank");
  }, [reviewId, score, summary, lang]);

  if (isPublishedQuery.data?.published) {
    return (
      <div className="container max-w-lg mx-auto mb-6 px-4">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#FF2E9F]/5 border border-[#FF2E9F]/15">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#FF2E9F]" />
            <span className="text-xs text-[#FF2E9F]">{tf("shareCTAShared")}</span>
          </div>
          <button onClick={handleWhatsApp} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF2E9F]/10 hover:bg-[#FF2E9F]/20 text-[#FF2E9F] text-[10px] font-medium transition-colors">
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </button>
        </div>
      </div>
    );
  }

  if (showCaption) {
    return (
      <div className="container max-w-lg mx-auto mb-6 px-4">
        <div className="p-4 rounded-2xl border border-primary/15 bg-primary/5">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={tf("caption")}
            maxLength={500}
            className="w-full h-16 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 mb-2"
            dir={lang === "he" ? "rtl" : "ltr"}
            autoFocus
          />
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={() => publishMutation.mutate({ reviewId, caption: caption || undefined })} disabled={publishMutation.isPending} className="gap-1">
              {publishMutation.isPending ? <FashionButtonSpinner /> : <Share2 className="w-4 h-4" />}
              {publishMutation.isPending ? tf("publishing") : tf("publish")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCaption(false)} className="border-white/10">
              {translations.common.cancel[lang]}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto mb-6 px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCaption(true)}
          className="flex-1 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-rose-500/5 to-primary/5 hover:border-primary/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Share2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{message}</span>
          </div>
          <span className="text-[10px] font-medium text-primary whitespace-nowrap">{tf("shareCTAButton")}</span>
        </button>
        <button onClick={handleWhatsApp} className="flex items-center justify-center w-10 h-10 rounded-2xl border border-teal-500/15 bg-teal-500/5 hover:bg-teal-500/15 transition-all shrink-0" title="WhatsApp">
          <MessageCircle className="w-4 h-4 text-[#FF2E9F]" />
        </button>
      </div>
    </div>
  );
}

// ---- Share to Feed Button ----

function ShareToFeedButton({ reviewId }: { reviewId: number }) {
  const { lang } = useLanguage();
  const tf = (key: keyof typeof translations.feed) => translations.feed[key][lang];
  const [showCaption, setShowCaption] = useState(false);
  const [caption, setCaption] = useState("");

  const isPublishedQuery = trpc.feed.isPublished.useQuery({ reviewId });
  const publishMutation = trpc.feed.publish.useMutation({
    onSuccess: () => {
      toast.success(tf("shared"));
      setShowCaption(false);
      isPublishedQuery.refetch();
      confetti({
        particleCount: 120, spread: 80, origin: { y: 0.7 },
        colors: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
      });
    },
    onError: (err) => { toast.error(err.message); },
  });

  if (isPublishedQuery.data?.published) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5 border-[#FF2E9F]/30 text-[#FF2E9F] text-xs" disabled>
        <Check className="w-3.5 h-3.5" />
        {tf("alreadyShared")}
      </Button>
    );
  }

  if (showCaption) {
    return (
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={tf("caption")}
          maxLength={500}
          className="w-full sm:w-56 h-16 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50"
          dir={lang === "he" ? "rtl" : "ltr"}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => publishMutation.mutate({ reviewId, caption: caption || undefined })} disabled={publishMutation.isPending} className="gap-1 flex-1 text-xs">
            {publishMutation.isPending ? <FashionButtonSpinner /> : <Share2 className="w-3.5 h-3.5" />}
            {publishMutation.isPending ? tf("publishing") : tf("publish")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCaption(false)} className="border-white/10 text-xs">
            {translations.common.cancel[lang]}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs"
      onClick={() => setShowCaption(true)}
    >
      <Share2 className="w-3.5 h-3.5" />
      {tf("shareToFeed")}
    </Button>
  );
}
