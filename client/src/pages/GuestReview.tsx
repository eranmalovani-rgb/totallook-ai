import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useParams, useLocation } from "wouter";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, Sparkles, TrendingUp, ShoppingBag,
  ExternalLink, Upload, Users, BookOpen, Eye, RefreshCw, Recycle, Wand2, Trash2, Instagram, Pencil, Send, Loader2
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
import StoreLogo, { extractStoreFromUrl, extractStoreFromLabel } from "@/components/StoreLogo";
import type { FashionAnalysis, ShoppingLink, LinkedMention, OutfitSuggestion } from "../../../shared/fashionTypes";
import { BRAND_URLS, POPULAR_INFLUENCERS } from "../../../shared/fashionTypes";
import { useLanguage } from "@/i18n";
import { getLoginUrl } from "@/const";
import { useCountry } from "@/hooks/useCountry";
import { getCurrencyLabel } from "../../../shared/currency";
import { getCountryFlag } from "../../../shared/countries";
import { useFingerprint } from "@/hooks/useFingerprint";
import WhatsAppPhoneReminder, { HIDE_WHATSAPP_PHONE_MODAL_KEY } from "@/components/WhatsAppPhoneReminder";
import GuestFixMyLookModal from "@/components/GuestFixMyLookModal";
import InfluencerPostModal from "@/components/InfluencerPostModal";
import InfluencerAvatar from "@/components/InfluencerAvatar";
import { trpc } from "@/lib/trpc";

/* ═══════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
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
          const colorClass = mention.type === "brand" ? "text-primary hover:text-amber-300" :
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
  const color = safeScore >= 9 ? "text-amber-400" : safeScore >= 7 ? "text-primary" : safeScore >= 5 ? "text-yellow-400" : "text-orange-400";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className={size === "lg" ? "w-32 h-32" : "w-16 h-16"} viewBox={`0 0 ${(radius + stroke) * 2} ${(radius + stroke) * 2}`}>
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/5" />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round"
          className={`${color} transition-all duration-1000`} transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`} />
      </svg>
      <span className={`absolute font-bold ${size === "lg" ? "text-3xl" : "text-lg"}`}>{safeScore}</span>
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
  const color = score >= 9 ? "bg-amber-400" : score >= 7 ? "bg-primary" : score >= 5 ? "bg-yellow-400" : "bg-orange-400";
  return (
    <div>
      <div className="flex items-center gap-4">
        <span className={`text-sm text-muted-foreground w-40 shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>{label}</span>
        <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${score * 10}%` }} />
        </div>
        <span className="text-sm font-bold w-10">{score}/10</span>
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
   GUEST IMPROVEMENT ACCORDION CARD
   ═══════════════════════════════════════════════════════════════ */

function GuestImprovementAccordionCard({
  imp,
  index,
  sessionId,
  lang,
  mentions,
  onInfluencerClick,
  t,
  closetMatch,
}: {
  imp: any;
  index: number;
  sessionId: number;
  lang: "he" | "en";
  mentions?: LinkedMention[];
  onInfluencerClick?: (name: string, handle?: string, igUrl?: string) => void;
  t: (ns: string, key: string) => string;
  closetMatch?: any;
}) {
  // Progressive image loading: server saves each image to DB as it resolves.
  // The parent guest session query polls and passes fresh imp.shoppingLinks.
  // We also use local state from mutation results for immediate updates.
  const serverLinks = imp.shoppingLinks || [];
  const [localLinks, setLocalLinks] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const generateMutation = trpc.guest.generateProductImages.useMutation();

  // Check if a URL is from our own storage (safe to display) vs external CDN (may be blocked)
  const isOwnStorageUrl = (url: string) => {
    if (!url) return false;
    try {
      const h = new URL(url).hostname;
      return h === 'd2xsxph8kpxj0f.cloudfront.net' || h.includes('r2.') || h.includes('manus') || h.includes('pub-') || h.includes('unsplash') || h.includes('openai');
    } catch { return false; }
  };

  // Merge: prefer local mutation results, but also accept server polling updates
  const links = useMemo(() => {
    if (!localLinks) return serverLinks;
    // Merge: for each link, pick the one with a valid imageUrl
    return serverLinks.map((sl: any, i: number) => {
      const ll = localLinks[i];
      if (!ll) return sl;
      // If local has image and server doesn't, use local
      if (ll.imageUrl && ll.imageUrl.length > 5 && (!sl.imageUrl || sl.imageUrl.length < 5)) return ll;
      // If server has image (from polling), prefer server
      if (sl.imageUrl && sl.imageUrl.length > 5) return sl;
      return ll;
    });
  }, [serverLinks, localLinks]);

  const hasEmptyImages = links.some((l: any) => !l.imageUrl || l.imageUrl.length < 5);
  const hasExternalImages = links.some((l: any) => l.imageUrl && l.imageUrl.length > 5 && !isOwnStorageUrl(l.imageUrl));
  const allImagesLoaded = links.length > 0 && links.every((l: any) => l.imageUrl && l.imageUrl.length > 5) && !hasExternalImages;

  // If server already has all images on safe domains, mark as triggered
  useEffect(() => {
    if (allImagesLoaded && !hasTriggered) setHasTriggered(true);
  }, [allImagesLoaded]);

  // Trigger generation and USE the result immediately
  const triggerGeneration = useCallback(() => {
    if (hasTriggered) return;
    setHasTriggered(true);
    setIsGenerating(true);
    generateMutation.mutateAsync({ sessionId, improvementIndex: index })
      .then((res) => {
        if (res?.links && Array.isArray(res.links)) {
          setLocalLinks(res.links);
        }
      })
      .catch((err) => console.warn(`[GuestImprovementCard] Image generation failed:`, err))
      .finally(() => setIsGenerating(false));
  }, [hasTriggered, sessionId, index]);

  // Auto-trigger generation immediately on mount if images are missing or from external CDNs
  useEffect(() => {
    if (hasTriggered || allImagesLoaded) return;
    triggerGeneration();
  }, [hasTriggered, allImagesLoaded, triggerGeneration]);

  return (
    <div ref={cardRef}>
      <AccordionItem value={`imp-${index}`} className="border border-white/5 rounded-xl bg-card/50 px-4 overflow-hidden">
        <AccordionTrigger className="hover:no-underline py-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">{index + 1}</div>
            <div className="flex-1 min-w-0 text-start">
              <span className="font-bold text-sm line-clamp-1">{imp.title}</span>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{imp.beforeLabel}</span>
                <span className="text-[10px] self-center">→</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">{imp.afterLabel}</span>
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

            {links && links.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-3 font-medium flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />{t("review", "recommendedProducts")}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {links.map((link: any, j: number) => (
                    <ProductCard key={j} link={link} lang={lang} isGeneratingImages={isGenerating || (!allImagesLoaded && hasTriggered)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GUEST OUTFIT CARD
   ═══════════════════════════════════════════════════════════════ */

function GuestOutfitCard({
  outfit,
  index,
  sessionId,
  mentions,
  onInfluencerClick,
  lang,
}: {
  outfit: OutfitSuggestion;
  index: number;
  sessionId: number;
  mentions: LinkedMention[];
  onInfluencerClick?: (name: string, handle?: string, igUrl?: string) => void;
  lang: "he" | "en";
}) {
  const [lookImage, setLookImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const generateLook = trpc.guest.generateOutfitLook.useMutation();
  const hasTriedRef = useRef(false);

  useEffect(() => {
    if (hasTriedRef.current || lookImage) return;
    hasTriedRef.current = true;
    setLoading(true);
    setError(false);
    generateLook.mutateAsync({ sessionId, outfitIndex: index })
      .then((result) => setLookImage(result.imageUrl))
      .catch((err) => { console.error("Failed to generate guest outfit look:", err); setError(true); })
      .finally(() => setLoading(false));
  }, [sessionId, index]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    setLoading(true);
    setError(false);
    generateLook.mutateAsync({ sessionId, outfitIndex: index })
      .then((result) => setLookImage(result.imageUrl))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-card overflow-hidden flex flex-col">
      <div className="relative">
        {lookImage ? (
          <img loading="lazy" src={lookImage} alt={outfit.name} className="w-full aspect-[3/4] object-cover" />
        ) : loading ? (
          <div className="w-full aspect-[3/4] bg-gradient-to-br from-primary/5 via-rose-500/5 to-transparent flex flex-col items-center justify-center gap-4">
            <FashionButtonSpinner />
            <p className="text-sm text-muted-foreground">{lang === "he" ? "יוצר הדמיית לוק..." : "Generating look..."}</p>
          </div>
        ) : error ? (
          <div className="w-full aspect-[3/4] bg-gradient-to-br from-primary/5 via-rose-500/5 to-transparent flex flex-col items-center justify-center gap-4 p-6">
            <p className="text-sm text-muted-foreground text-center">{lang === "he" ? "לא הצלחנו לייצר את התמונה" : "Couldn't generate the image"}</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4" />{lang === "he" ? "נסה שוב" : "Try Again"}
            </Button>
          </div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-5 pointer-events-none">
          <h3 className="text-white text-lg font-bold drop-shadow-lg">{outfit.name}</h3>
          <p className="text-white/70 text-sm">{outfit.occasion}</p>
          <div className="flex gap-1.5 mt-2">
            {(outfit.colors ?? []).map((color, j) => (
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
            {(outfit.items ?? []).map((item, j) => {
              const safeItem = item ?? "";
              const itemMention = mentions.find(m => safeItem.includes(m.text) && (m.type === 'brand' || m.type === 'store'));
              return (
                <div key={j} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary text-xs font-bold">{j + 1}</div>
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
const BASE_CARD_ICONS = ["🎯", "✨", "👗", "📖"];
const BASE_CARD_LABELS_HE = ["פריטים", "שדרוגים", "לוקים", "טרנדים"];
const BASE_CARD_LABELS_EN = ["Items", "Upgrades", "Looks", "Trends"];

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
  const [dragProgress, setDragProgress] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);
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
    const shouldCommit = isDraggingRef.current && (Math.abs(dx) >= w * 0.25 || velocity >= 0.4);
    isDraggingRef.current = false;

    const el = cardContainerRef.current;
    if (!el) return;

    const total = validChildren.length;
    let canGo = false;
    let newIdx = activeIndex;
    if (isRTL) {
      if (dx > 0 && activeIndex < total - 1) { canGo = true; newIdx = activeIndex + 1; }
      else if (dx < 0 && activeIndex > 0) { canGo = true; newIdx = activeIndex - 1; }
    } else {
      if (dx < 0 && activeIndex < total - 1) { canGo = true; newIdx = activeIndex + 1; }
      else if (dx > 0 && activeIndex > 0) { canGo = true; newIdx = activeIndex - 1; }
    }

    if (!shouldCommit || !canGo) {
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
    const remaining = Math.abs(exitX) - Math.abs(dx);
    const exitDuration = Math.max(0.1, Math.min(0.25, remaining / (w * 3)));

    el.style.transition = `transform ${exitDuration}s cubic-bezier(0.4, 0, 1, 1), opacity ${exitDuration}s ease-out`;
    el.style.transform = `translateX(${exitX}px)`;
    el.style.opacity = "0";

    setTimeout(() => {
      setActiveIndex(newIdx);
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
      {/* Instagram-style progress bar */}
      <div className="flex gap-1 px-3">
        {validChildren.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: i < activeIndex ? "100%" : i === activeIndex ? "100%" : "0%",
                backgroundColor: i <= activeIndex ? "var(--primary)" : "transparent",
                opacity: i === activeIndex ? 1 : 0.6,
              }}
            />
          </div>
        ))}
      </div>

      {/* Tab bar — compact with overflow menu */}
      <div className="flex gap-1.5 px-2 pb-1 items-center justify-center flex-wrap">
        {visibleLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => { goToIndex(i); setShowOverflow(false); }}
            className={`flex items-center gap-1 px-2.5 py-2 rounded-full text-[11px] font-semibold transition-all duration-200 flex-shrink-0 ${
              activeIndex === i
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
          >
            <span>{cardIcons[i]}</span>
            <span className="truncate max-w-[60px]">{label}</span>
          </button>
        ))}
        {hasOverflow && (
          <div className="relative">
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all duration-200 ${
                activeIndex >= VISIBLE_TABS
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              •••
            </button>
            {showOverflow && (
              <div className={`absolute top-full mt-1 ${dir === "rtl" ? "left-0" : "right-0"} z-50 bg-card border border-white/10 rounded-xl shadow-xl py-1 min-w-[140px]`}>
                {overflowLabels.map((label, i) => {
                  const realIndex = VISIBLE_TABS + i;
                  return (
                    <button
                      key={realIndex}
                      onClick={() => { goToIndex(realIndex); setShowOverflow(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                        activeIndex === realIndex
                          ? "text-primary bg-primary/10"
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

  const [influencerModal, setInfluencerModal] = useState<{
    open: boolean; name: string; handle?: string; igUrl?: string;
  }>({ open: false, name: "" });

  const handleInfluencerClick = useCallback((name: string, handle?: string, igUrl?: string) => {
    setInfluencerModal({ open: true, name, handle, igUrl });
  }, []);

  const deleteGuestMutation = trpc.guest.deleteAnalysis.useMutation({
    onSuccess: () => {
      toast.success(lang === "he" ? "הניתוח נמחק בהצלחה" : "Analysis deleted successfully");
      navigate("/try");
    },
    onError: (err: any) => {
      toast.error((lang === "he" ? "שגיאה במחיקה: " : "Delete error: ") + err.message);
    },
  });

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
          if (improvementsEmpty) return 3000;
          const hasEmptyImages = a?.improvements?.some((imp: any) =>
            imp.shoppingLinks?.some((link: any) => !link.imageUrl || link.imageUrl.length < 5)
          );
          if (hasEmptyImages) return 3000;
        }
        return false;
      },
    }
  );

  const { data: limitData } = trpc.guest.checkLimit.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  const { data: wardrobeData } = trpc.guest.getWardrobe.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  const analysisCount = limitData?.count ?? 0;
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
  const phoneReminderShownRef = useRef(false);

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
          <Button className="mt-4" onClick={() => navigate("/try")}>{t("common", "tryAgain")}</Button>
        </div>
      </div>
    );
  }

  if (result.status === "analyzing" || result.status === "pending") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center" dir={dir}>
        <div className="text-center space-y-4">
          <FashionSpinner size="lg" />
          <p className="text-muted-foreground">{t("guest", "analyzing")}</p>
        </div>
      </div>
    );
  }

  if (result.status === "failed" || !analysis) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="pt-32 text-center space-y-4">
          <p className="text-destructive">{t("upload", "genericError")}</p>
          <Button onClick={() => navigate("/try")}>{t("common", "tryAgain")}</Button>
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
            const scoreColor = item.score >= 9 ? "text-amber-400" : item.score >= 7 ? "text-primary" : item.score >= 5 ? "text-yellow-400" : "text-orange-400";
            const verdictColor = item.verdict === "בחירה מצוינת" || item.verdict === "Excellent choice" ? "bg-amber-500/10 text-amber-400" :
              item.verdict === "ניגודיות טובה" || item.verdict === "Good contrast" || item.verdict === "יש פוטנציאל" || item.verdict === "Has potential" ? "bg-primary/10 text-primary" :
              item.verdict === "ניתן לשדרג" || item.verdict === "Can be upgraded" || item.verdict === "דורש שיפור" || item.verdict === "Needs improvement" ? "bg-yellow-500/10 text-yellow-400" :
              "bg-orange-500/10 text-orange-400";

            return (
              <AccordionItem key={i} value={`item-${i}`} className="border border-white/5 rounded-xl bg-card/50 px-4 overflow-hidden">
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
                    <span className={`text-lg font-bold ${scoreColor} shrink-0`}>{item.score}</span>
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

  // Card 2: Influencer Insights (right after items)
  const hasInfluencerInsight = !!analysis.influencerInsight;
  if (hasInfluencerInsight) {
    const influencerMentions = mentions.filter(m => m.type === "influencer");
    const bestMatch = influencerMentions.length > 0
      ? POPULAR_INFLUENCERS.find(inf => inf.name === influencerMentions[0].text)
      : null;
    storyCards.push(
      <div key="influencers" className="space-y-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-background">
          {/* Best matching influencer — hero style with large avatar */}
          {bestMatch ? (
            <div className="text-center mb-5">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <InfluencerAvatar name={bestMatch.name} imageUrl={bestMatch.imageUrl} size="lg" className="!w-20 !h-20 !text-2xl ring-2 ring-primary/30" />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold whitespace-nowrap shadow-lg">
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
          ) : (
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">{lang === "he" ? "תובנות משפיענים" : "Influencer Insights"}</h3>
            </div>
          )}

          {/* Insight text */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            <LinkedText text={analysis.influencerInsight!} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
          </p>


        </div>
      </div>
    );
  }

  // Card 3: Upgrades (or loading skeleton while Stage 2 runs)
  if (analysis.improvements.length === 0 && result?.status === "completed") {
    // Stage 2 still running in background — show loading skeleton
    storyCards.push(
      <div key="upgrades-loading" className="space-y-3">
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
        <Accordion type="multiple" className="space-y-2">
          {analysis.improvements.map((imp, i) => (
            <GuestImprovementAccordionCard
              key={i}
              imp={imp}
              index={i}
              sessionId={sessionId}
              lang={lang}
              mentions={mentions}
              onInfluencerClick={handleInfluencerClick}
              t={t}
              closetMatch={imp.closetMatch}
            />
          ))}
        </Accordion>

        {/* Fix My Look CTA — attractive card inside Upgrades */}
        <div className="mt-5">
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-primary/5 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
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
                  <Button size="lg" className="w-full gap-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold shadow-lg shadow-amber-500/25 text-base py-6">
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

  // Card 3: Outfit Suggestions (or loading skeleton while Stage 2 runs)
  if (analysis.outfitSuggestions.length === 0 && analysis.improvements.length === 0 && result?.status === "completed") {
    // Stage 2 still running — show loading skeleton for outfits too
    storyCards.push(
      <div key="outfits-loading" className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          <span>{lang === "he" ? "מכין הצעות לוקים מלאים..." : "Preparing complete outfit suggestions..."}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3 animate-pulse">
              <div className="h-32 bg-muted rounded-lg" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  } else if (analysis.outfitSuggestions.length > 0) {
    storyCards.push(
      <div key="outfits" className="space-y-4">
        {detectedCountry && (
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
              {guestCountryFlag} {guestCurrencyLabel}
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysis.outfitSuggestions.map((outfit, i) => (
            <GuestOutfitCard
              key={i}
              outfit={outfit}
              index={i}
              sessionId={sessionId}
              mentions={mentions}
              onInfluencerClick={handleInfluencerClick}
              lang={lang}
            />
          ))}
        </div>
      </div>
    );
  }

  // Card 4: Trends & Sources
  if (analysis.trendSources && analysis.trendSources.length > 0) {
    storyCards.push(
      <div key="trends" className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {analysis.trendSources.map((src, i) => (
            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
              className="group p-5 rounded-2xl border border-white/10 bg-background hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
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
          <div className="p-5 rounded-2xl border border-white/10 bg-background">
            <h3 className="text-sm font-bold mb-3 text-muted-foreground">{t("review", "mentionsLegend")}</h3>
            <div className="flex flex-wrap gap-2">
              {mentions.map((m, i) => {
                const colorClass = m.type === "brand" ? "bg-primary/10 text-primary border-primary/20" :
                  m.type === "influencer" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                  m.type === "store" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
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
  // Tab order: Items, [Influencers], Upgrades, Looks, Trends
  const guestCardLabels = lang === "he"
    ? ["פריטים", ...(hasInfluencerInsight ? ["משפיענים"] : []), "שדרוגים", "לוקים", "טרנדים"]
    : ["Items", ...(hasInfluencerInsight ? ["Influencers"] : []), "Upgrades", "Looks", "Trends"];
  const guestCardIcons = ["🎯", ...(hasInfluencerInsight ? ["👥"] : []), "✨", "👗", "📚"];

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

      <InfluencerPostModal
        open={influencerModal.open}
        onOpenChange={(open) => setInfluencerModal(prev => ({ ...prev, open }))}
        influencerName={influencerModal.name}
        influencerHandle={influencerModal.handle}
        igUrl={influencerModal.igUrl}
        context={analysis.influencerInsight}
      />

      <div className="pt-16 pb-12">
        {/* Analysis count badge */}
        <div className="container max-w-2xl mx-auto mb-6">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
            <span className="text-xs text-primary font-medium">
              {t("guest", "analysisCount").replace("{current}", String(analysisCount)).replace("{max}", "5")}
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            HERO CARD — Always visible
            ═══════════════════════════════════════════ */}
        <section className="container max-w-2xl mx-auto mb-8">
          <div className="rounded-2xl border border-white/10 bg-card overflow-hidden">
            {/* Image + Score overlay */}
            <div className="relative">
              {result.imageUrl && (
                <img loading="lazy" src={result.imageUrl} alt="Look" className="w-full max-h-[420px] object-contain bg-black/20" />
              )}
              <div className="absolute top-4 end-4">
                <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-2">
                  <ScoreCircle score={analysis.overallScore} size="sm" />
                </div>
              </div>
            </div>

            {/* Info section */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <ScoreCircle score={analysis.overallScore} size="lg" />
                <div className="flex-1">
                  <p className="text-xl font-black">{analysis.overallScore}/10</p>
                  <p className="text-sm text-muted-foreground">{scoreComment}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                <LinkedText text={analysis.summary} mentions={mentions} onInfluencerClick={handleInfluencerClick} />
              </p>

              {/* Detailed Scores — compact accordion */}
              {analysis.scores.length > 0 && (
                <Accordion type="single" collapsible className="border border-white/5 rounded-xl overflow-hidden">
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
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
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
            BOTTOM CTA — Another Analysis + Signup
            ═══════════════════════════════════════════ */}
        <section className="container max-w-2xl mx-auto text-center py-8 border-t border-border">
          <div className="p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-rose-500/5 to-transparent">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">{t("guest", "signupCta")}</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">{t("guest", "signupCtaDesc")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="default" size="lg" className="gap-2" onClick={() => navigate("/try")}>
                <Upload className="w-5 h-5" />{lang === "he" ? "ניתוח נוסף" : "Another Analysis"}
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <a href={getLoginUrl()}>
                  <ArrowIcon className="w-4 h-4" />{t("guest", "signupButton")}
                </a>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
