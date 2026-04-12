import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useParams, useLocation } from "wouter";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, Sparkles, TrendingUp, ShoppingBag,
  ExternalLink, Upload, Users, BookOpen, Eye, RefreshCw, Recycle, Wand2, Trash2, Instagram, Pencil, Send, Loader2, Check, UserPlus, ArrowUpCircle
} from "lucide-react";
import { toast } from "sonner";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
import StylingStudioAnimation from "@/components/StylingStudioAnimation";
import StoreLogo, { extractStoreFromUrl, extractStoreFromLabel } from "@/components/StoreLogo";
import type { FashionAnalysis, ShoppingLink, LinkedMention, OutfitSuggestion, ImprovementAlternative } from "../../../shared/fashionTypes";
import { BRAND_URLS, POPULAR_INFLUENCERS, getNextBudgetTier, getBudgetTierLabel, BUDGET_TIER_ORDER } from "../../../shared/fashionTypes";
import { autoMatchInfluencers } from "../../../shared/influencerMatcher";
import { useLanguage } from "@/i18n";
import { getLoginUrl } from "@/const";
import { SignupFeaturePromise } from "@/components/SignupFeaturePromise";
import { useCountry } from "@/hooks/useCountry";
import { getCurrencyLabel } from "../../../shared/currency";
import { getCountryFlag } from "../../../shared/countries";
import { useFingerprint } from "@/hooks/useFingerprint";
import WhatsAppPhoneReminder, { HIDE_WHATSAPP_PHONE_MODAL_KEY } from "@/components/WhatsAppPhoneReminder";
import GuestFixMyLookModal from "@/components/GuestFixMyLookModal";
import InfluencerPostModal from "@/components/InfluencerPostModal";
import InfluencerAvatar from "@/components/InfluencerAvatar";
import InfluencerPicker from "@/components/InfluencerPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

/* ═══════════════════════════════════════════════════════════════
   SOCIAL PLATFORM ICONS (inline SVGs)
   ═══════════════════════════════════════════════════════════════ */
function InspirationInstagramIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs><radialGradient id="ig-gr" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="5%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs>
      <rect width="48" height="48" rx="12" fill="url(#ig-gr)"/><rect x="10" y="10" width="28" height="28" rx="8" stroke="white" strokeWidth="2.5" fill="none"/><circle cx="24" cy="24" r="7" stroke="white" strokeWidth="2.5" fill="none"/><circle cx="33" cy="15" r="2" fill="white"/>
    </svg>
  );
}
function InspirationTikTokIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#000"/><path d="M33.5 16.5C32.1 15.3 31.2 13.5 31 11.5H27V29.5C27 31.7 25.2 33.5 23 33.5C20.8 33.5 19 31.7 19 29.5C19 27.3 20.8 25.5 23 25.5C23.5 25.5 24 25.6 24.4 25.8V22C24 21.9 23.5 21.9 23 21.9C18.6 21.9 15 25.3 15 29.5C15 33.7 18.6 37 23 37C27.4 37 31 33.7 31 29.5V20.5C32.6 21.7 34.5 22.4 36.5 22.5V18.5C35.3 18.4 34.2 17.6 33.5 16.5Z" fill="white"/>
    </svg>
  );
}
function InspirationPinterestIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#E60023"/><path d="M24 12C17.4 12 12 17.4 12 24C12 29 15 33.3 19.2 35.1C19.1 34.1 19 32.5 19.2 31.4C19.4 30.4 20.5 25.5 20.5 25.5C20.5 25.5 20.2 24.7 20.2 23.6C20.2 21.8 21.2 20.5 22.5 20.5C23.6 20.5 24.1 21.3 24.1 22.3C24.1 23.4 23.4 25 23 26.5C22.7 27.8 23.7 28.8 25 28.8C27.3 28.8 29 26.5 29 23.2C29 20.3 27 18.1 24 18.1C20.5 18.1 18.4 20.7 18.4 23.5C18.4 24.5 18.8 25.6 19.3 26.2C19.4 26.3 19.4 26.5 19.3 26.6C19.2 27 19 27.8 19 28C18.9 28.2 18.8 28.3 18.6 28.2C17 27.5 16 25.3 16 23.4C16 19.5 18.9 15.9 24.3 15.9C28.6 15.9 32 19 32 23.1C32 27.3 29.4 30.7 25.8 30.7C24.5 30.7 23.2 30 22.8 29.2C22.8 29.2 22.2 31.5 22 32.3C21.7 33.4 20.9 34.8 20.4 35.6C21.5 35.9 22.7 36 24 36C30.6 36 36 30.6 36 24C36 17.4 30.6 12 24 12Z" fill="white"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTSS
   ═══════════════════════════════════════════════════════════════ */

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
            <a key={i} href={mention.url} target="_blank" rel="noopener noreferrer"
              className={`${colorClass} underline decoration-dotted underline-offset-2 transition-colors inline-flex items-center gap-0.5`}>
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

function ScoreCircle({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const safeScore = score ?? 0;
  const radius = size === "lg" ? 54 : 30;
  const stroke = size === "lg" ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeScore / 10) * circumference;
  const color = safeScore >= 9 ? "text-[#FF2E9F]" : safeScore >= 7 ? "text-primary" : safeScore >= 5 ? "text-yellow-400" : "text-orange-400";

  const gradientId = `guest-score-grad-${size}-${Math.round(safeScore * 10)}`;
  const glowColor = safeScore >= 9 ? "rgba(251,191,36,0.2)" : safeScore >= 7 ? "rgba(255,46,159,0.15)" : safeScore >= 5 ? "rgba(234,179,8,0.12)" : "rgba(249,115,22,0.12)";
  const gradColors = safeScore >= 9 ? ["#fbbf24", "#f59e0b"] : safeScore >= 7 ? ["#FF2E9F", "#e8c86e"] : safeScore >= 5 ? ["#eab308", "#ca8a04"] : ["#f97316", "#ea580c"];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ filter: size !== "sm" ? `drop-shadow(0 0 8px ${glowColor})` : undefined }}>
      <svg className={size === "lg" ? "w-32 h-32" : "w-16 h-16"} viewBox={`0 0 ${(radius + stroke) * 2} ${(radius + stroke) * 2}`}>
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
      <span className={`absolute font-bold tracking-tight ${size === "lg" ? "text-3xl" : "text-base"} ${safeScore >= 9 ? "text-[#FF2E9F]" : safeScore >= 7 ? "text-[#FF6BB5]/90" : safeScore >= 5 ? "text-yellow-300/90" : "text-orange-300/90"}`}>{safeScore}</span>
    </div>
  );
}

function ScoreBar({ label, score, explanation, recommendation, lang }: { label: string; score: number | null; explanation?: string; recommendation?: string; lang: "he" | "en" }) {
  if (score === null) {
    return (
      <div>
        <div className="flex items-center gap-4">
          <span className={`text-sm text-muted-foreground w-40 shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>{label}</span>
          <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-white/10 transition-all duration-1000" style={{ width: '100%' }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground/70 w-16 text-center">{lang === "he" ? "לא נראה" : "N/A"}</span>
        </div>
        {recommendation && (
          <p className={`text-xs text-primary/70 mt-1.5 ${lang === "he" ? "mr-44" : "ml-44"} flex items-center gap-1`}>
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
      <div className="flex items-center gap-4">
        <span className={`text-[11px] text-muted-foreground/80 w-40 shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>{label}</span>
        <div className="flex-1 h-[6px] rounded-full bg-white/[0.04] overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-1000`} style={{ width: `${score * 10}%` }} />
        </div>
        <span className={`text-xs font-bold w-10 ${scoreColor}`}>{score}/10</span>
      </div>
      {explanation && (
        <p className={`text-xs text-muted-foreground/70 mt-1.5 ${lang === "he" ? "mr-44" : "ml-44"} leading-relaxed`}>{explanation}</p>
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
    <a href={link.url} target="_blank" rel="noopener noreferrer"
      className="group block rounded-xl border border-white/5 bg-card/50 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <div className="aspect-square bg-white/5 overflow-hidden relative">
        {hasImage && !imgError ? (
          <>
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/5"><FashionButtonSpinner /></div>
            )}
            <img loading="lazy" src={link.imageUrl} alt={link.label}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
              onError={() => { setImgError(true); setImgLoading(false); }}
              onLoad={() => setImgLoading(false)} />
          </>
        ) : showShimmer ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-5 h-5 text-primary/50 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <span className="text-[10px] text-primary/60 font-medium">{lang === "he" ? "מחפש תמונת מוצר..." : "Finding product image..."}</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 to-transparent">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/40">{lang === "he" ? "צפה בחנות" : "View Store"}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        {(() => {
          const storeName = extractStoreFromUrl(link.url) || extractStoreFromLabel(link.label);
          if (storeName) {
            return (
              <div className="flex items-center justify-between">
                <StoreLogo name={storeName} size="sm" />
                <ExternalLink className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors" />
              </div>
            );
          }
          return (
            <>
              <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{link.label}</p>
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

/* ═══════════════════════════════════════════════════════════════
   GUEST IMPROVEMENT ACCORDION CARD — Stage 45 Option C
   ═══════════════════════════════════════════════════════════════ */

function GuestImprovementAccordionCard({
  imp,
  index,
  lang,
  mentions,
  onInfluencerClick,
  t,
  closetMatch,
}: {
  imp: any;
  index: number;
  lang: "he" | "en";
  mentions?: LinkedMention[];
  onInfluencerClick?: (name: string, handle?: string, igUrl?: string) => void;
  t: (ns: string, key: string) => string;
  closetMatch?: any;
}) {
  const [selectedOption, setSelectedOption] = useState(0);
  const alternatives: ImprovementAlternative[] = imp.alternatives || [];
  const hasAlternatives = alternatives.length > 0;

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
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <AccordionItem value={`imp-${index}`} className="border border-[#FF2E9F]/10 rounded-xl bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden shadow-lg shadow-black/20">
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
                  <div className={`absolute bottom-0 inset-x-0 px-1.5 py-1 text-[9px] font-medium text-center truncate ${
                    isActive ? 'bg-gradient-to-r from-[#FF2E9F]/90 to-[#7B2EFF]/90 text-white' : 'bg-black/60 text-white/80'
                  }`}>
                    {idx === 0
                      ? (lang === "he" ? "⭐ מומלץ" : "⭐ Top Pick")
                      : opt.afterLabel?.split(' ').slice(0, 3).join(' ') || (lang === "he" ? `אפשרות ${idx + 1}` : `Option ${idx + 1}`)}
                  </div>
                  {isActive && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#FF2E9F] flex items-center justify-center shadow-lg shadow-[#FF2E9F]/30">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
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

      <div className="px-4">
        <AccordionTrigger className="hover:no-underline py-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2E9F]/20 to-[#7B2EFF]/10 flex items-center justify-center shrink-0 text-[#FF2E9F] font-bold text-sm border border-[#FF2E9F]/20">{index + 1}</div>
            <div className="flex-1 min-w-0 text-start">
              <span className="font-bold text-sm line-clamp-1 text-foreground/90">{imp.title}</span>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{imp.beforeLabel}</span>
                <span className="text-[10px] self-center">→</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{imp.afterLabel}</span>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pb-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <LinkedText text={imp.description} mentions={mentions} onInfluencerClick={onInfluencerClick} />
            </p>

            {closetMatch && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Recycle className="w-4 h-4 text-emerald-400 shrink-0" />
                {closetMatch.itemImageUrl && (
                  <img loading="lazy" src={closetMatch.itemImageUrl} alt={closetMatch.name} className="w-7 h-7 rounded-md object-cover border border-emerald-500/30" />
                )}
                <span className="text-xs text-emerald-400 font-medium truncate">
                  {lang === "he" ? "יש לך בארון: " : "In your closet: "}
                  <span className="font-bold">{closetMatch.name}</span>
                </span>
              </div>
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
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GUEST OUTFIT CARD — Stage 45 Option C
   ═══════════════════════════════════════════════════════════════ */

function GuestOutfitCard({
  outfit,
  index,
  mentions,
  onInfluencerClick,
  lang,
}: {
  outfit: OutfitSuggestion;
  index: number;
  mentions: LinkedMention[];
  onInfluencerClick?: (name: string, handle?: string, igUrl?: string) => void;
  lang: "he" | "en";
}) {
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
    <div className="rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden flex flex-col shadow-lg shadow-black/20">
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
                    <p className="text-sm font-medium leading-snug"><LinkedText text={safeItem} mentions={mentions} onInfluencerClick={onInfluencerClick} /></p>
                    {itemMention && (
                      <a href={itemMention.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1.5 transition-colors">
                        <ShoppingBag className="w-3 h-3" />{lang === "he" ? "לרכישה" : "Buy Now"}<ExternalLink className="w-2.5 h-2.5" />
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

/* ═══════════════════════════════════════════════════════════════
   STORY CARDS SWIPEABLE CONTAINER
   ═══════════════════════════════════════════════════════════════ */

// Labels/icons are now dynamic based on whether influencer insight exists
const BASE_CARD_ICONS = ["🎯", "✨", "📖"];
const BASE_CARD_LABELS_HE = ["פריטים", "שדרוגים", "טרנדים"];
const BASE_CARD_LABELS_EN = ["Items", "Upgrades", "Trends"];

function StoryCardsContainer({
  children,
  lang,
  cardLabels,
  cardIcons,
}: {
  children: React.ReactNode[];
  lang: "he" | "en";
  cardLabels: string[];
  cardIcons: string[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const directionLockedRef = useRef<"h" | "v" | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const validChildren = children.filter(Boolean);
  const dir = lang === "he" ? "rtl" : "ltr";
  const isRTL = dir === "rtl";

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
  const visibleLabels = cardLabels.slice(0, VISIBLE_TABS);
  const overflowLabels = cardLabels.slice(VISIBLE_TABS);
  const hasOverflow = overflowLabels.length > 0;

  // Tab click animation (no finger drag — just animate exit + enter)
  const goToIndex = useCallback((newIndex: number, direction?: "next" | "prev") => {
    if (isAnimating || newIndex === activeIndex || !cardContainerRef.current) return;
    const d = direction || (newIndex > activeIndex ? "next" : "prev");
    setIsAnimating(true);

    const el = cardContainerRef.current;
    const w = wrapperRef.current?.offsetWidth || 350;
    const exitX = d === "next" ? (isRTL ? w : -w) : (isRTL ? -w : w);

    el.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out";
    el.style.transform = `translateX(${exitX}px)`;
    el.style.opacity = "0";
    triggerHaptic();

    setTimeout(() => {
      setActiveIndex(newIndex);
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

  // ── Refs to avoid stale closures in window listeners ──
  const isAnimatingRef = useRef(false);
  isAnimatingRef.current = isAnimating;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const validChildrenLenRef = useRef(validChildren.length);
  validChildrenLenRef.current = validChildren.length;
  const isDraggingRef = useRef(false);
  isDraggingRef.current = isDragging;

  // ── Touch start: on the wrapper ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimatingRef.current) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    directionLockedRef.current = null;
    setShowSwipeHint(false);
    if (cardContainerRef.current) {
      cardContainerRef.current.style.transition = "none";
    }
  }, []);

  // ── Touch move + end: on WINDOW so we never lose the gesture ──
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || isAnimatingRef.current) return;
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;

      // Lock direction on first significant movement
      if (!directionLockedRef.current) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // dead zone
        directionLockedRef.current = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      }

      // If locked to vertical, let browser handle scroll
      if (directionLockedRef.current === "v") return;

      // Horizontal drag — prevent scroll, start dragging
      e.preventDefault();
      if (!isDraggingRef.current) {
        setIsDragging(true);
      }

      // Move the card
      if (cardContainerRef.current) {
        const w = wrapperRef.current?.offsetWidth || 350;
        const rotation = (dx / w) * 12;
        const opacity = Math.max(0.15, 1 - Math.abs(dx) / (w * 1.2));
        cardContainerRef.current.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;
        cardContainerRef.current.style.opacity = `${opacity}`;
        setDragX(dx);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) {
        // Clean up if somehow still dragging
        if (isDraggingRef.current) {
          setIsDragging(false);
          setDragX(0);
        }
        return;
      }
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const elapsed = Date.now() - touchStartRef.current.time;
      const wasHorizontal = directionLockedRef.current === "h";
      touchStartRef.current = null;
      directionLockedRef.current = null;

      if (!wasHorizontal || !isDraggingRef.current) {
        setIsDragging(false);
        setDragX(0);
        return;
      }

      const velocity = Math.abs(dx) / Math.max(elapsed, 1);
      const w = wrapperRef.current?.offsetWidth || 350;
      const shouldCommit = Math.abs(dx) >= w * 0.2 || (velocity >= 0.5 && Math.abs(dx) > 25);

      setIsDragging(false);
      setDragX(0);

      const el = cardContainerRef.current;
      if (!el) return;

      const total = validChildrenLenRef.current;
      const curIdx = activeIndexRef.current;
      let canGo = false;
      let newIdx = curIdx;
      if (isRTL) {
        if (dx > 0 && curIdx < total - 1) { canGo = true; newIdx = curIdx + 1; }
        else if (dx < 0 && curIdx > 0) { canGo = true; newIdx = curIdx - 1; }
      } else {
        if (dx < 0 && curIdx < total - 1) { canGo = true; newIdx = curIdx + 1; }
        else if (dx > 0 && curIdx > 0) { canGo = true; newIdx = curIdx - 1; }
      }

      if (!shouldCommit || !canGo) {
        // Snap back
        el.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out";
        el.style.transform = "translateX(0) rotate(0deg)";
        el.style.opacity = "1";
        return;
      }

      // Fly out
      setIsAnimating(true);
      triggerHaptic();
      const exitX = dx > 0 ? w : -w;
      const remaining = Math.abs(exitX) - Math.abs(dx);
      const exitDuration = Math.max(0.15, Math.min(0.3, remaining / (w * 2.5)));
      const exitRotation = dx > 0 ? 15 : -15;

      el.style.transition = `transform ${exitDuration}s cubic-bezier(0.4, 0, 1, 1), opacity ${exitDuration}s ease-out`;
      el.style.transform = `translateX(${exitX}px) rotate(${exitRotation}deg)`;
      el.style.opacity = "0";

      setTimeout(() => {
        setActiveIndex(newIdx);
        const enterX = dx > 0 ? -w * 0.3 : w * 0.3;
        el.style.transition = "none";
        el.style.transform = `translateX(${enterX}px)`;
        el.style.opacity = "0";
        void el.offsetHeight;

        el.style.transition = "transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.22s ease-in";
        el.style.transform = "translateX(0) rotate(0deg)";
        el.style.opacity = "1";

        setTimeout(() => setIsAnimating(false), 300);
      }, exitDuration * 1000 + 10);
    };

    // CRITICAL: listeners on window with {passive: false} so preventDefault works
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isRTL, triggerHaptic]);

  // Derived drag progress for UI indicators
  const wrapperWidth = wrapperRef.current?.offsetWidth || 350;
  const dragProgress = isDragging ? Math.max(-1, Math.min(1, dragX / wrapperWidth)) : 0;

  // Peek: determine which neighbor to show
  const peekIndex = useMemo(() => {
    if (dragProgress === 0) return null;
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
    <div className="space-y-4">
      {/* Studio-style progress segments — elegant gold thread */}
      <div className="flex gap-1.5 px-4">
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
      <div className="flex gap-2 px-2 pb-1 items-center justify-center flex-wrap">
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
            {activeIndex === i && (
              <span className="absolute -top-px inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-[#FF2E9F]/70 to-transparent rounded-full" />
            )}
            <span className={`transition-transform duration-200 text-base ${activeIndex === i ? 'scale-110' : 'group-hover:scale-105'}`}>{cardIcons[i]}</span>
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
                      <span>{cardIcons[realIndex]}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active card — Tinder-style drag + swipe */}
      <div
        ref={wrapperRef}
        className="px-2 relative"
        style={{ touchAction: isDragging ? "none" : "pan-y" }}
        onTouchStart={handleTouchStart}
      >
        {/* Swipe direction indicator */}
        {isDragging && Math.abs(dragProgress) > 0.08 && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-start justify-between px-6 pt-6">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 font-bold text-sm"
              style={{
                borderColor: dragProgress > 0 ? (isRTL ? "#FF2E9F" : "#22c55e") : "transparent",
                color: dragProgress > 0 ? (isRTL ? "#FF2E9F" : "#22c55e") : "transparent",
                opacity: dragProgress > 0 ? Math.min(1, Math.abs(dragProgress) * 3) : 0,
                transform: `scale(${dragProgress > 0 ? Math.min(1.1, 0.8 + Math.abs(dragProgress)) : 0.8})`,
                transition: "opacity 0.1s, transform 0.1s",
              }}
            >
              {isRTL ? "←" : "→"}
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 font-bold text-sm"
              style={{
                borderColor: dragProgress < 0 ? (isRTL ? "#22c55e" : "#FF2E9F") : "transparent",
                color: dragProgress < 0 ? (isRTL ? "#22c55e" : "#FF2E9F") : "transparent",
                opacity: dragProgress < 0 ? Math.min(1, Math.abs(dragProgress) * 3) : 0,
                transform: `scale(${dragProgress < 0 ? Math.min(1.1, 0.8 + Math.abs(dragProgress)) : 0.8})`,
                transition: "opacity 0.1s, transform 0.1s",
              }}
            >
              {isRTL ? "→" : "←"}
            </div>
          </div>
        )}

        {/* Peek: show edge of next/prev card during drag */}
        {peekIndex !== null && Math.abs(dragProgress) > 0.05 && (
          <div
            className="absolute top-0 bottom-0 w-[60%] pointer-events-none z-0"
            style={{
              [dragProgress > 0 ? (isRTL ? "left" : "right") : (isRTL ? "right" : "left")]: "-50%",
              opacity: peekOpacity * 0.4,
              transform: `translateX(${dragProgress > 0 ? (isRTL ? "-" : "") : (isRTL ? "" : "-")}${Math.max(0, 50 - Math.abs(dragProgress) * 50)}%) scale(0.95)`,
              transition: "opacity 0.1s ease-out, transform 0.15s ease-out",
              filter: "blur(1px)",
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
          style={{ pointerEvents: isDragging ? "none" : "auto" }}
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

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5">
        {cardLabels.map((_, i) => (
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

/* ═══════════════════════════════════════════════════════════════
   HELPER
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function GuestReview() {
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);
  const [, navigate] = useLocation();
  const { t, dir, lang } = useLanguage();
  const { country: detectedCountry } = useCountry();
  const guestCurrencyLabel = getCurrencyLabel(detectedCountry);
  const guestCountryFlag = getCountryFlag(detectedCountry ?? "");
  const fingerprint = useFingerprint();

  // Detect if user came from personalized onboarding path (URL param)
  const fromOnboardingParam = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("from") === "onboarding";
  }, []);

  const [influencerModal, setInfluencerModal] = useState<{
    open: boolean; name: string; handle?: string; igUrl?: string;
  }>({ open: false, name: "" });

  const handleInfluencerClick = useCallback((name: string, handle?: string, igUrl?: string) => {
    // Guests can't use InfluencerPostModal (requires auth) — open Instagram directly
    if (igUrl) {
      window.open(igUrl, "_blank", "noopener,noreferrer");
    } else if (handle) {
      window.open(`https://www.instagram.com/${handle.replace(/^@/, "")}/`, "_blank", "noopener,noreferrer");
    } else {
      // Fallback: search Instagram for the influencer name
      window.open(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(name)}`, "_blank", "noopener,noreferrer");
    }
  }, []);

  const deleteGuestMutation = trpc.guest.deleteAnalysis.useMutation({
    onSuccess: () => {
      toast.success(lang === "he" ? "הניתוח נמחק בהצלחה" : "Analysis deleted successfully");
      navigate(fromOnboarding ? "/try/quick" : "/try");
    },
    onError: (err: any) => {
      toast.error((lang === "he" ? "שגיאה במחיקה: " : "Delete error: ") + err.message);
    },
  });

  // Stage 113b: Upgrade stores mutation
  const utils = trpc.useUtils();
  const upgradeStoresMutation = trpc.guest.upgradeStores.useMutation({
    onSuccess: (data) => {
      const tierLabel = getBudgetTierLabel(data.newTier, lang);
      toast.success(lang === "he" ? `החנויות עודכנו לרמת ${tierLabel}` : `Stores upgraded to ${tierLabel} tier`);
      // Invalidate the result query to re-fetch with new stores
      utils.guest.getResult.invalidate({ sessionId });
      utils.guest.getProfile.invalidate({ fingerprint: fingerprint || "" });
    },
    onError: (err: any) => {
      toast.error((lang === "he" ? "שגיאה בעדכון חנויות: " : "Store upgrade error: ") + err.message);
    },
  });

  // Stage 113d: Retry Stage 2 mutation
  const retryStage2Mutation = trpc.guest.retryStage2.useMutation({
    onSuccess: (data) => {
      if (data.alreadyComplete) {
        toast.info(lang === "he" ? "ההמלצות כבר נטענו" : "Recommendations already loaded");
      } else {
        toast.success(lang === "he" ? "ההמלצות נטענו בהצלחה!" : "Recommendations loaded successfully!");
      }
      utils.guest.getResult.invalidate({ sessionId });
      setStage2TimedOut(false);
    },
    onError: (err: any) => {
      toast.error((lang === "he" ? "שגיאה בטעינת המלצות: " : "Error loading recommendations: ") + err.message);
    },
  });

  // Stage 113d: Track when Stage 2 times out
  const [stage2TimedOut, setStage2TimedOut] = useState(false);
  const [pollingStartTime] = useState(() => Date.now());
  const STAGE2_TIMEOUT_MS = 45_000; // 45 seconds

  const { data: result, isLoading } = trpc.guest.getResult.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
      refetchInterval: (query) => {
        const d = query.state.data;
        if (!d) return 2000;
        if (d.status === "analyzing" || d.status === "pending") return 2000;
        if (d.status === "completed" && d.analysisJson) {
          const a = d.analysisJson as any;
          // Stage 43: Keep polling if Stage 2 hasn't delivered recommendations yet
          const improvementsEmpty = !a?.improvements || a.improvements.length === 0;
          if (improvementsEmpty) {
            // Stage 113d: Stop polling after timeout
            if (Date.now() - pollingStartTime > STAGE2_TIMEOUT_MS) {
              return false; // Stop polling — will show retry button
            }
            return 3000;
          }
          const hasEmptyImages = a?.improvements?.some((imp: any) =>
            imp.shoppingLinks?.some((link: any) => !link.imageUrl || link.imageUrl.length < 5)
          );
          if (hasEmptyImages) return 3000;
        }
        return false;
      },
    }
  );

  // Stage 113d: Detect Stage 2 timeout and set flag
  useEffect(() => {
    if (!result || result.status !== "completed") return;
    const a = result.analysisJson as any;
    const improvementsEmpty = !a?.improvements || a.improvements.length === 0;
    if (improvementsEmpty && Date.now() - pollingStartTime > STAGE2_TIMEOUT_MS) {
      setStage2TimedOut(true);
    }
  }, [result, pollingStartTime]);

  // Stage 115e: Refetch when tab becomes visible again (fixes background tab throttling)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Tab is visible again — refetch result immediately
        utils.guest.getResult.invalidate({ sessionId });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [sessionId, utils]);

  // Limit check removed — no more 5-tries limit

  const { data: wardrobeData } = trpc.guest.getWardrobe.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  // Fetch guest profile for gender/age/style data (used for influencer matching)
  const { data: guestProfile } = trpc.guest.getProfile.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  // Combine URL param + profile data to determine if this is a personalized (Path B) session
  const fromOnboarding = fromOnboardingParam || !!(guestProfile?.onboardingCompleted);

  const closetItems = wardrobeData ?? [];

  const analysis = useMemo(() => {
    if (!result?.analysisJson) return null;
    try {
      const raw = (typeof result.analysisJson === "string"
        ? JSON.parse(result.analysisJson)
        : result.analysisJson) as FashionAnalysis;
      return {
        ...raw,
        summary: raw.summary ?? "",
        overallScore: raw.overallScore ?? 0,
        items: raw.items ?? [],
        scores: raw.scores ?? [],
        improvements: raw.improvements ?? [],
        outfitSuggestions: raw.outfitSuggestions ?? [],
        trendSources: raw.trendSources ?? [],
        linkedMentions: raw.linkedMentions ?? [],
        influencerInsight: raw.influencerInsight ?? "",
      };
    } catch {
      return null;
    }
  }, [result?.analysisJson]);

  const ArrowIcon = lang === "he" ? ArrowLeft : ArrowRight;

  // WhatsApp phone reminder for guests
  const [showPhoneReminder, setShowPhoneReminder] = useState(false);
  const [showInfluencerSwap, setShowInfluencerSwap] = useState(false);
  const [customInfluencers, setCustomInfluencers] = useState<string[]>([]);
  const [swapSelection, setSwapSelection] = useState<string[]>([]);
  const phoneReminderShownRef = useRef(false);

  // Stage 114c: Floating CTA bubbles
  const [showPreciseBubble, setShowPreciseBubble] = useState(false);
  const [showUnlimitedBubble, setShowUnlimitedBubble] = useState(false);
  const [dismissedPrecise, setDismissedPrecise] = useState(false);
  const [dismissedUnlimited, setDismissedUnlimited] = useState(false);

  useEffect(() => {
    if (!result || result.status !== "completed" || !analysis) return;
    // Path A: show "precise" bubble after 5s, "unlimited" after 15s
    // Path B: show only "unlimited" bubble after 8s
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!fromOnboarding) {
      timers.push(setTimeout(() => setShowPreciseBubble(true), 5000));
      timers.push(setTimeout(() => setShowUnlimitedBubble(true), 15000));
    } else {
      timers.push(setTimeout(() => setShowUnlimitedBubble(true), 8000));
    }
    return () => timers.forEach(clearTimeout);
  }, [result?.status, analysis, fromOnboarding]);

  useEffect(() => {
    if (
      result?.status === "completed" &&
      analysis &&
      !phoneReminderShownRef.current
    ) {
      try {
        if (localStorage.getItem(HIDE_WHATSAPP_PHONE_MODAL_KEY) === "true") return;
      } catch { /* localStorage unavailable */ }

      const timer = setTimeout(() => {
        setShowPhoneReminder(true);
        phoneReminderShownRef.current = true;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result?.status, analysis]);

  // ── Progressive product image loading ──
  // Each GuestImprovementCard loads its own images independently via generateProductImages.
  // All cards trigger simultaneously (fallback 0ms), so images appear progressively
  // as each improvement's search results come back — no waiting for all to finish.

  // ── Early returns ──

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="pt-32 text-center">
          <p className="text-muted-foreground">{t("common", "error")}</p>
          <Button className="mt-4" onClick={() => navigate(fromOnboarding ? "/try/quick" : "/try")}>{t("common", "tryAgain")}</Button>
        </div>
      </div>
    );
  }

  if (result.status === "analyzing" || result.status === "pending") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4" dir={dir}>
        <StylingStudioAnimation
          uploading={false}
          analyzing={true}
          selectedOccasion=""
          selectedInfluencers={[]}
          imagePreview={result.imageUrl || null}
        />
      </div>
    );
  }

  if (result.status === "failed" || !analysis) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="pt-32 text-center space-y-4">
          <p className="text-destructive">{t("upload", "genericError")}</p>
          <Button onClick={() => navigate(fromOnboarding ? "/try/quick" : "/try")}>{t("common", "tryAgain")}</Button>
        </div>
      </div>
    );
  }

  const mentions = analysis.linkedMentions || [];
  const scoreComment = analysis.overallScore >= 9
    ? (lang === "he" ? "לוק מצוין! כמעט מושלם" : "Excellent look! Almost perfect")
    : analysis.overallScore >= 7
    ? (lang === "he" ? "בסיס מעולה עם פוטנציאל להיות מדהים" : "Great base with potential to be amazing")
    : (lang === "he" ? "יש בסיס טוב — עם כמה שינויים קטנים אפשר לשדרג משמעותית" : "Good base — a few small changes can make a big upgrade");

  // ── Build story card children ──

  const storyCards: React.ReactNode[] = [];

  // Card 1: Items
  if (analysis.items.length > 0) {
    storyCards.push(
      <div key="items" className="space-y-2">
        <Accordion type="multiple" className="space-y-2">
          {analysis.items.map((item, i) => {
            const scoreColor = item.score >= 9 ? "text-[#FF2E9F]" : item.score >= 7 ? "text-primary" : item.score >= 5 ? "text-yellow-400" : "text-orange-400";
            const verdictColor = item.verdict === "בחירה מצוינת" || item.verdict === "Excellent choice" ? "bg-[#FF2E9F]/10 text-[#FF2E9F]" :
              item.verdict === "ניגודיות טובה" || item.verdict === "Good contrast" || item.verdict === "יש פוטנציאל" || item.verdict === "Has potential" ? "bg-primary/10 text-primary" :
              item.verdict === "ניתן לשדרג" || item.verdict === "Can be upgraded" || item.verdict === "דורש שיפור" || item.verdict === "Needs improvement" ? "bg-yellow-500/10 text-yellow-400" :
              "bg-orange-500/10 text-orange-400";

            return (
              <AccordionItem key={i} value={`item-${i}`} className="border border-[#FF2E9F]/8 rounded-xl bg-white/[0.02] px-4 overflow-hidden hover:bg-white/[0.03] transition-colors">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 min-w-0 text-start">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm truncate">{item.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${verdictColor}`}>{item.verdict}</span>
                      </div>
                      {item.brand && item.brand !== "לא זוהה" && (
                        <span className="text-[10px] text-muted-foreground/60">{item.brand}</span>
                      )}
                    </div>
                    <span className={`text-base font-bold tracking-tight shrink-0 ${item.score >= 9 ? 'text-[#FF2E9F]' : item.score >= 7 ? 'text-[#FF6BB5]/90' : item.score >= 5 ? 'text-yellow-300/90' : 'text-orange-300/90'}`}>{item.score}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pb-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <LinkedText text={item.description} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <LinkedText text={item.analysis} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
                    </p>
                    {item.brand && item.brand !== "לא זוהה" && (
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
                        item.brandConfidence === "HIGH" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        item.brandConfidence === "MEDIUM" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        item.brandConfidence === "LOW" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                        "bg-white/5 text-muted-foreground border-white/10"
                      }`}>
                        {(() => {
                          const prefix = item.brandConfidence === "MEDIUM" ? "בסגנון " : item.brandConfidence === "LOW" ? "מזכיר " : item.brandConfidence === "NONE" ? "ייתכן " : "";
                          const brandText = prefix + item.brand;
                          return item.brandUrl ? (
                            <a href={item.brandUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{brandText}</a>
                          ) : brandText;
                        })()}
                        {item.brandConfidence && item.brandConfidence !== "NONE" && (
                          <span className="opacity-60 text-[10px]">({item.brandConfidence === "HIGH" ? "✓" : item.brandConfidence === "MEDIUM" ? "~" : "?"})</span>
                        )}
                      </span>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  }

  // Card 2: Style Inspiration
  const hasInfluencerInsight = !!analysis.influencerInsight;
  if (fromOnboarding) {
    // Personalized guest (onboarding) — full influencer section with avatars, swap
    const influencerMentions = mentions.filter(m => m.type === "influencer");
    const mentionedNames = influencerMentions.map(m => m.text);
    const matchProfile: import("../../../shared/influencerMatcher").MatchProfile = {
      mentionedInfluencers: mentionedNames,
    };
    if (guestProfile?.gender) {
      matchProfile.gender = guestProfile.gender;
    } else {
      const summaryLower = (analysis.summary || "").toLowerCase();
      if (summaryLower.includes("male") || summaryLower.includes("גבר")) matchProfile.gender = "male";
      else if (summaryLower.includes("female") || summaryLower.includes("אישה") || summaryLower.includes("נשית")) matchProfile.gender = "female";
    }
    if (guestProfile?.ageRange) matchProfile.ageRange = guestProfile.ageRange;
    if (guestProfile?.budgetLevel) matchProfile.budgetLevel = guestProfile.budgetLevel;
    if (guestProfile?.stylePreference) {
      matchProfile.stylePreference = guestProfile.stylePreference;
    } else {
      const styleHints = analysis.items.map(item => item.analysis || "").join(" ").toLowerCase();
      const styleKeywords = ["streetwear", "smart-casual", "classic", "boho", "minimalist", "athleisure"];
      const detectedStyles = styleKeywords.filter(s => styleHints.includes(s));
      if (detectedStyles.length > 0) matchProfile.stylePreference = detectedStyles.join(", ");
    }
    const autoInfluencers = autoMatchInfluencers(matchProfile, 3, detectedCountry);

    // Use custom influencers if user has swapped, otherwise use auto-matched
    const displayInfluencers = customInfluencers.length > 0
      ? customInfluencers.map(name => POPULAR_INFLUENCERS.find(i => i.name === name)).filter(Boolean) as typeof autoInfluencers
      : autoInfluencers;

    storyCards.push(
      <div key="inspiration" className="space-y-4">
        <div className="p-5 rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF2E9F]" />
              <h3 className="text-base font-bold text-foreground/90">
                {lang === "he" ? "ההשראה שלך" : "Your Inspiration"}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <InspirationInstagramIcon size={22} />
              <InspirationTikTokIcon size={22} />
              <InspirationPinterestIcon size={22} />
            </div>
          </div>
          {hasInfluencerInsight && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              <LinkedText text={analysis.influencerInsight!} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
            </p>
          )}
          <div className="space-y-3">
            {displayInfluencers.map((inf, i) => (
              <div key={inf.name} className="flex items-center gap-2">
                <button
                  onClick={() => handleInfluencerClick(inf.name, inf.handle, inf.igUrl)}
                  className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-200 group text-start"
                >
                  <div className="relative flex-shrink-0">
                    <InfluencerAvatar name={inf.name} imageUrl={inf.imageUrl} size="md" className="ring-1 ring-white/10 group-hover:ring-primary/30 transition-all" />
                    {i === 0 && (
                      <span className="absolute -top-1 -end-1 text-[8px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-[#7B2EFF] text-white font-bold shadow-lg">
                        #1
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{inf.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{inf.style}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Instagram className="w-3.5 h-3.5 text-rose-400/60 group-hover:text-rose-400 transition-colors" />
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setSwapSelection(displayInfluencers.map(inf => inf.name));
                setShowInfluencerSwap(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors border border-dashed border-white/10 hover:border-primary/30 rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {lang === "he" ? "החלף משפיענים" : "Swap influencers"}
            </button>
            <button
              onClick={() => {
                setSwapSelection(displayInfluencers.map(inf => inf.name));
                setShowInfluencerSwap(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-[#FF2E9F] transition-colors border border-dashed border-white/10 hover:border-[#FF2E9F]/30 rounded-xl"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {lang === "he" ? "הוסף משפיענים" : "Add influencers"}
            </button>
          </div>
        </div>
      </div>
    );
  } else if (hasInfluencerInsight) {
    // Non-personalized guest (Path A) — text-only inspiration, NO swap/add buttons
    // Path A shows context-aware inspiration based on image analysis only
    storyCards.push(
      <div key="inspiration" className="space-y-4">
        <div className="p-5 rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF2E9F]" />
              <h3 className="text-base font-bold text-foreground/90">
                {lang === "he" ? "השראה מותאמת" : "Matched Inspiration"}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <InspirationInstagramIcon size={22} />
              <InspirationTikTokIcon size={22} />
              <InspirationPinterestIcon size={22} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <LinkedText text={analysis.influencerInsight!} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
          </p>
          {/* Upsell to personalized path */}
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-[#FF2E9F]/10 to-[#7B2EFF]/10 border border-[#FF2E9F]/20">
            <p className="text-xs text-muted-foreground/80 mb-2">
              {lang === "he"
                ? "✨ רוצה השראה מדויקת יותר? עברי למסלול הפרסונלי — המכונה תלמד את הסגנון שלך"
                : "✨ Want more accurate inspiration? Try the personalized path — the AI will learn your style"}
            </p>
            <button
              onClick={() => navigate("/try/quick")}
              className="text-xs font-medium text-[#FF2E9F] hover:text-[#FF2E9F]/80 transition-colors flex items-center gap-1"
            >
              {lang === "he" ? "נסי את המסלול המדויק →" : "Try the precise path →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Card 3: Upgrades (or loading skeleton while Stage 2 runs)
  if (analysis.improvements.length === 0 && result?.status === "completed") {
    // Stage 2 still running in background — show loading skeleton or retry button
    storyCards.push(
      <div key="upgrades-loading" className="space-y-3">
        {stage2TimedOut ? (
          // Stage 113d: Stage 2 timed out — show retry button
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center space-y-3">
            <div className="text-amber-600 dark:text-amber-400 text-sm font-medium">
              {lang === "he" ? "ההמלצות לא הספיקו להיטען. נסה שוב?" : "Recommendations didn't load in time. Try again?"}
            </div>
            <Button
              onClick={() => {
                if (fingerprint) {
                  retryStage2Mutation.mutate({ sessionId, fingerprint });
                }
              }}
              disabled={retryStage2Mutation.isPending || !fingerprint}
              className="gap-2"
            >
              {retryStage2Mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{lang === "he" ? "טוען המלצות..." : "Loading recommendations..."}</>
              ) : (
                <><RefreshCw className="h-4 w-4" />{lang === "he" ? "נסה לטעון המלצות" : "Retry loading recommendations"}</>
              )}
            </Button>
          </div>
        ) : (
          // Still loading — show skeleton
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span>{lang === "he" ? "מכין המלצות שידרוג מותאמות אישית..." : "Preparing personalized upgrade recommendations..."}</span>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  } else if (analysis.improvements.length > 0) {
    storyCards.push(
      <div key="upgrades" className="space-y-2">
        {detectedCountry && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
              {guestCountryFlag} {guestCurrencyLabel}
            </span>
          </div>
        )}
        {/* Stage 114b: All accordions open by default */}
        <Accordion type="multiple" defaultValue={analysis.improvements.map((_, i) => `imp-${i}`)} className="space-y-2">
          {analysis.improvements.map((imp, i) => (
            <GuestImprovementAccordionCard
              key={i}
              imp={imp}
              index={i}
              lang={lang}
              mentions={mentions}
              onInfluencerClick={handleInfluencerClick}
              t={t}
              closetMatch={imp.closetMatch}
            />
          ))}
        </Accordion>

        {/* Stage 114d: Upgrade stores button moved to onboarding */}

        {/* Fix My Look CTA — attractive card inside Upgrades */}
        <div className="mt-5">
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
                      : (lang === "he" ? "🔥 ראה איך תיראה עם השדרוגים" : "🔥 See how you'd look upgraded")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "he" ? "ה-AI ייצר הדמיה עם הפריטים המומלצים" : "AI will generate a preview with recommended items"}
                  </p>
                </div>
              </div>
              <GuestFixMyLookModal
                sessionId={sessionId}
                analysis={analysis}
                closetItems={closetItems.map((item: any) => ({
                  name: item.name,
                  itemType: item.itemType ?? undefined,
                  brand: item.brand ?? undefined,
                  color: item.color ?? undefined,
                  itemImageUrl: item.itemImageUrl ?? undefined,
                  sourceImageUrl: item.sourceImageUrl ?? undefined,
                }))}
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
      </div>
    );
  }

  // Card 3: Outfit Suggestions — REMOVED (Stage 98: mood looks disabled)

  // Card 4: Trends & Sources
  if (analysis.trendSources && analysis.trendSources.length > 0) {
    storyCards.push(
      <div key="trends" className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {analysis.trendSources.map((src, i) => (
            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
              className="group p-5 rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent shadow-lg shadow-black/20 hover:border-[#FF2E9F]/20 hover:shadow-xl hover:shadow-[#FF2E9F]/5 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold group-hover:text-primary transition-colors">{src.source}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{src.season}</span>
              </div>
              <h4 className="text-sm font-medium mb-2 line-clamp-2">{src.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{src.relevance}</p>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-primary/70 group-hover:text-primary transition-colors">
                <span>{getStoreName(src.url)}</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </a>
          ))}
        </div>

        {mentions.length > 0 && (
          <div className="p-5 rounded-2xl border border-[#FF2E9F]/10 bg-gradient-to-b from-white/[0.03] to-transparent shadow-lg shadow-black/20">
            <h3 className="text-sm font-bold mb-3 text-muted-foreground">{t("review", "mentionsLegend")}</h3>
            <div className="flex flex-wrap gap-2">
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
                    <button key={i} onClick={() => handleInfluencerClick(m.text, inf?.handle, m.url)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}>
                      <Instagram className="w-2.5 h-2.5 opacity-50" />
                      <span className="font-medium">{m.text}</span>
                      <span className="opacity-60">({typeLabel})</span>
                    </button>
                  );
                }

                return (
                  <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${colorClass} hover:opacity-80 transition-opacity`}>
                    <span className="font-medium">{m.text}</span>
                    <span className="opacity-60">({typeLabel})</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Add influencer insights as 5th card if available
  // (influencer card already pushed at position 2 above)

  // Build dynamic labels/icons
  // Tab order: Items, Inspiration, Upgrades, Trends (Looks removed — Stage 98)
  const guestCardLabels = lang === "he"
    ? ["פריטים", "השראה", "שדרוגים", "טרנדים"]
    : ["Items", "Inspiration", "Upgrades", "Trends"];
  const guestCardIcons = ["🎯", "✨", "✨", "📚"];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      <WhatsAppPhoneReminder
        open={showPhoneReminder}
        onClose={() => setShowPhoneReminder(false)}
        isGuest={true}
        guestSessionId={String(sessionId)}
        defaultCountry={detectedCountry || "IL"}
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
            gender={guestProfile?.gender || undefined}
            selectedInfluencers={swapSelection}
            onToggle={(name) => {
              setSwapSelection(prev =>
                prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
              );
            }}
            userProfile={guestProfile ? {
              ageRange: guestProfile.ageRange,
              budgetLevel: guestProfile.budgetLevel,
              stylePreference: guestProfile.stylePreference,
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
                setCustomInfluencers(swapSelection);
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

      <InfluencerPostModal
        open={influencerModal.open}
        onOpenChange={(open) => setInfluencerModal(prev => ({ ...prev, open }))}
        influencerName={influencerModal.name}
        influencerHandle={influencerModal.handle}
        igUrl={influencerModal.igUrl}
        context={analysis.influencerInsight}
      />

      <div className="pt-16 pb-12">


        {/* ═══════════════════════════════════════════
            HERO CARD — Always visible
            ═══════════════════════════════════════════ */}
        <section className="container max-w-2xl mx-auto mb-8">
          <div className="rounded-2xl border border-[#FF2E9F]/10 bg-card overflow-hidden shadow-xl shadow-black/30">
            {/* Image + Score overlay */}
            <div className="relative">
              {result.imageUrl && (
                <img loading="lazy" src={result.imageUrl} alt="Look" className="w-full max-h-[420px] object-contain bg-black/20" />
              )}
              <div className="absolute top-4 end-4">
                <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-2 border border-[#FF2E9F]/10">
                  <ScoreCircle score={analysis.overallScore} size="sm" />
                </div>
              </div>
            </div>

            {/* Info section */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <ScoreCircle score={analysis.overallScore} size="lg" />
                <div className="flex-1">
                  <p className="text-xl font-black text-foreground tracking-wide">{analysis.overallScore}/10</p>
                  <p className="text-sm text-[#FF2E9F]/70 font-medium">{scoreComment}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground/90 leading-relaxed tracking-wide">
                <LinkedText text={analysis.summary} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
              </p>

              {/* Detailed Scores — compact accordion */}
              {analysis.scores.length > 0 && (
                <Accordion type="single" collapsible className="border border-[#FF2E9F]/8 rounded-xl overflow-hidden bg-white/[0.01]">
                  <AccordionItem value="scores" className="border-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <span className="text-sm font-bold">{t("review", "detailedScores")}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="space-y-4 pb-2">
                        {analysis.scores.map((s, i) => (
                          <ScoreBar key={i} label={s.category} score={s.score} explanation={s.explanation} recommendation={s.recommendation} lang={lang} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Delete action */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />{lang === "he" ? "מחק" : "Delete"}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir={dir}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{lang === "he" ? "מחיקת ניתוח" : "Delete Analysis"}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {lang === "he" ? "האם למחוק את הניתוח הזה? התמונה והתוצאות יימחקו לצמיתות." : "Delete this analysis? The image and results will be permanently removed."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={dir === "rtl" ? "flex-row-reverse gap-2" : "gap-2"}>
                      <AlertDialogCancel>{lang === "he" ? "ביטול" : "Cancel"}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteGuestMutation.mutate({ sessionId, fingerprint: fingerprint || "" })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <Trash2 className={`w-4 h-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />{lang === "he" ? "מחק" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            STORY CARDS — Swipeable
            ═══════════════════════════════════════════ */}
        {storyCards.length > 0 && (
          <section className="container max-w-2xl mx-auto mb-4">
            <StoryCardsContainer lang={lang} cardLabels={guestCardLabels} cardIcons={guestCardIcons}>
              {storyCards}
            </StoryCardsContainer>
          </section>
        )}

        {/* ═══════════════════════════════════════════
            BOTTOM CTA — Conversion Upsells (Path A)
            ═══════════════════════════════════════════ */}
        <section className="container max-w-2xl mx-auto py-8 border-t border-border space-y-4">
          {/* Upsell 1: Try personalized analysis — only show if NOT from onboarding (Path A quick) */}
          {!fromOnboarding && (
            <div className="p-6 rounded-2xl border border-[#FF2E9F]/20 bg-gradient-to-br from-[#FF2E9F]/[0.06] via-[#D0258A]/[0.03] to-transparent">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF2E9F]/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-[#FF2E9F]" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {lang === "he" ? "רוצה תוצאה מדויקת יותר?" : "Want more accurate results?"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {lang === "he" ? "עוד כמה בחירות קצרות → ניתוח מותאם אישית" : "A few quick choices → personalized analysis"}
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-[#FF2E9F] to-[#7B2EFF] hover:from-[#FF2E9F] hover:to-[#7B2EFF] text-black font-bold"
                onClick={() => {
                  const imageUrl = result?.imageUrl || "";
                  const params = imageUrl ? `?photo=${encodeURIComponent(imageUrl)}` : "";
                  navigate(`/try/precise${params}`);
                }}
              >
                🎯 {lang === "he" ? "בואי נכיר — ניתוח מותאם אישית" : "Let's get personal — precise analysis"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Upsell: Signup + Another Analysis */}
          <div className="p-6 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-rose-500/5 to-transparent">
            <Sparkles className="w-7 h-7 text-primary mx-auto mb-2" />
            <h3 className="text-lg font-bold text-center mb-1">
              {fromOnboarding
                ? (lang === "he" ? "אהבת? שמור את הפרופיל שלך" : "Loved it? Save your profile")
                : t("guest", "signupCta")}
            </h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mx-auto mb-2">
              {fromOnboarding
                ? (lang === "he" ? "הירשם חינם כדי לשמור את כל מה שלמדנו עליך — הניתוחים הבאים יהיו עוד יותר מדויקים" : "Sign up free to save everything we learned — future analyses will be even more precise")
                : t("guest", "signupCtaDesc")}
            </p>
            <SignupFeaturePromise variant="compact" />
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="default" size="lg" className="gap-2" asChild>
                <a href={getLoginUrl(fromOnboarding ? "/upload" : undefined)}>
                  <UserPlus className="w-4 h-4" />{fromOnboarding ? (lang === "he" ? "שמור את הפרופיל שלי" : "Save my profile") : t("guest", "signupButton")}
                </a>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate(fromOnboarding ? "/try/quick" : "/try")}>
                <Upload className="w-5 h-5" />{lang === "he" ? "ניתוח נוסף" : "Another Analysis"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════
          Stage 114c: Floating CTA Bubbles
          ═══════════════════════════════════════════ */}

      {/* Bubble 1: "רוצה תוצאה מדויקת?" — Path A only */}
      {showPreciseBubble && !dismissedPrecise && !fromOnboarding && (
        <div className="fixed bottom-24 start-4 end-4 sm:start-auto sm:end-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="relative rounded-2xl border border-[#FF2E9F]/30 bg-gradient-to-br from-[#FF2E9F]/95 via-[#D0258A]/90 to-rose-600/90 p-4 shadow-2xl shadow-[#FF2E9F]/20 backdrop-blur-sm">
            <button
              onClick={() => setDismissedPrecise(true)}
              className="absolute top-2 end-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors text-xs"
            >✕</button>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">🎯</div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">
                  {lang === "he" ? "רוצה תוצאה מדויקת יותר?" : "Want more accurate results?"}
                </h4>
                <p className="text-white/80 text-xs mt-1">
                  {lang === "he"
                    ? "ניתוח מותאם אישית • המלצות לפי הסגנון שלך • חנויות שמתאימות לך"
                    : "Personalized analysis • Recommendations for your style • Stores that fit you"}
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-white text-[#FF2E9F] hover:bg-white/90 font-bold gap-1.5 text-xs"
                  onClick={() => {
                    setDismissedPrecise(true);
                    const params = result?.imageUrl ? `?photo=${encodeURIComponent(result.imageUrl)}` : "";
                    navigate(`/try/precise${params}`);
                  }}
                >
                  {lang === "he" ? "בואי נכיר →" : "Let's get personal →"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bubble 2: "רוצה ניתוחים ללא הגבלה?" — Both paths */}
      {showUnlimitedBubble && !dismissedUnlimited && (
        <div className={`fixed ${showPreciseBubble && !dismissedPrecise && !fromOnboarding ? "bottom-52 sm:bottom-48" : "bottom-24"} start-4 end-4 sm:start-auto sm:end-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-500`}>
          <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/95 via-indigo-600/90 to-violet-600/90 p-4 shadow-2xl shadow-primary/20 backdrop-blur-sm">
            <button
              onClick={() => setDismissedUnlimited(true)}
              className="absolute top-2 end-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors text-xs"
            >✕</button>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">✨</div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">
                  {lang === "he" ? "רוצה ניתוחים ללא הגבלה?" : "Want unlimited analyses?"}
                </h4>
                <p className="text-white/80 text-xs mt-1">
                  {lang === "he"
                    ? "ניתוחים ללא הגבלה • מלתחה וירטואלית • Fix My Look • יומן סגנון • שיתוף בפיד"
                    : "Unlimited analyses • Virtual wardrobe • Fix My Look • Style diary • Feed sharing"}
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-white text-primary hover:bg-white/90 font-bold gap-1.5 text-xs"
                  asChild
                >
                  <a href={getLoginUrl(fromOnboarding ? "/upload" : undefined)}>
                    <UserPlus className="w-3.5 h-3.5" />
                    {lang === "he" ? "הירשם חינם" : "Sign up free"}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
