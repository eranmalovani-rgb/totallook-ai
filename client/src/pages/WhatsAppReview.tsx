/**
 * WhatsApp Deep-Link Review Page — /r/:token
 *
 * Shows the full analysis using the Story Cards slider (same as GuestReview).
 * Navigation is blocked — the guest can only view this analysis
 * and is prompted to register to continue using the platform.
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import FashionSpinner from "@/components/FashionSpinner";
import { useLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, Sparkles, ExternalLink, TrendingUp, Users,
  Star, ShoppingBag, BookOpen,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import type { FashionAnalysis, LinkedMention, ShoppingLink, Improvement, OutfitSuggestion } from "../../../shared/fashionTypes";
import { BRAND_URLS, POPULAR_INFLUENCERS } from "../../../shared/fashionTypes";
import InfluencerAvatar from "@/components/InfluencerAvatar";

/* ═══════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ── Linked Text ── */
function LinkedText({
  text,
  mentions,
}: {
  text: string;
  mentions?: LinkedMention[];
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
            "text-primary hover:text-amber-300";
          return (
            <a key={i} href={mention.url} target="_blank" rel="noopener noreferrer"
              className={`${colorClass} font-medium transition-colors inline-flex items-center gap-0.5`}>
              {mention.type === "influencer" && <span className="text-[10px]">📷</span>}
              {mention.text}
              {mention.type === "brand" && <ExternalLink className="w-3 h-3 inline opacity-50" />}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ── Score Circle ── */
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

/* ── Score Bar ── */
function ScoreBar({ label, score, explanation, lang }: { label: string; score: number | null; explanation?: string; lang: "he" | "en" }) {
  if (score === null) return null;
  const color = score >= 9 ? "bg-amber-400" : score >= 7 ? "bg-primary" : score >= 5 ? "bg-yellow-400" : "bg-orange-400";
  return (
    <div>
      <div className="flex items-center gap-4">
        <span className={`text-sm text-muted-foreground w-32 shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>{label}</span>
        <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${score * 10}%` }} />
        </div>
        <span className="text-sm font-bold w-12 text-center">{score}/10</span>
      </div>
      {explanation && (
        <p className={`text-xs text-muted-foreground mt-1 ${lang === "he" ? "mr-36" : "ml-36"}`}>{explanation}</p>
      )}
    </div>
  );
}

/* ── Minimal header ── */
function WhatsAppHeader({ isHe }: { isHe: boolean }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="container max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-transparent">
            TotalLook.ai
          </span>
          <span className="text-xs text-muted-foreground">✨</span>
        </div>
        <Button size="sm" asChild>
          <a href={getLoginUrl()}>
            {isHe ? "הירשם/י לחוויה המלאה" : "Sign up for full experience"}
          </a>
        </Button>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STORY CARDS CONTAINER — Instagram-style slider
   ═══════════════════════════════════════════════════════════════ */

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

  // Auto-hide swipe hint after 4 seconds
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

  // Tab click animation
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

  // Touch swipe: finger follows card all the way
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

    // Continue sliding in the same direction
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

      {/* Tab bar */}
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

        {/* Swipe hint arrow */}
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
                {isRTL ? "גלול" : "Swipe"}
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
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function WhatsAppReview() {
  const { token } = useParams<{ token: string }>();
  const { lang } = useLanguage();
  const isHe = lang === "he";
  const dir = isHe ? "rtl" : "ltr";
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Try guest session first, then registered review share token
  const guestQuery = trpc.guest.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );
  const reviewQuery = trpc.review.getByShareToken.useQuery(
    { token: token || "" },
    { enabled: !!token && !guestQuery.isLoading && !guestQuery.data }
  );

  // Use whichever query returned data
  const data = guestQuery.data || reviewQuery.data || null;
  const isLoading = guestQuery.isLoading || (guestQuery.data === null && reviewQuery.isLoading);
  const error = (!guestQuery.data && !reviewQuery.data) ? (guestQuery.error || reviewQuery.error) : null;

  // If user is logged in and this is their review, redirect to full review page
  useEffect(() => {
    if (authLoading || isLoading) return;
    if (!isAuthenticated || !user) return;
    // If it's a registered review (not guest) and belongs to this user, redirect
    const reviewData = reviewQuery.data;
    if (reviewData && 'userId' in reviewData && reviewData.userId === user.id) {
      navigate(`/review/${reviewData.id}`, { replace: true });
      return;
    }
    // If user is logged in but it's a guest session or someone else's review,
    // still redirect to their history page so they see their own reviews
    if (isAuthenticated && user && !guestQuery.data) {
      // It's a registered review but not theirs — show the WhatsApp view
      return;
    }
  }, [authLoading, isAuthenticated, user, isLoading, reviewQuery.data, guestQuery.data, navigate]);

  const analysis = useMemo(() => {
    if (!data?.analysisJson) return null;
    try {
      const raw = (typeof data.analysisJson === "string"
        ? JSON.parse(data.analysisJson)
        : data.analysisJson) as FashionAnalysis;
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
        matchedInfluencer: (raw as any).matchedInfluencer ?? null,
      };
    } catch {
      return null;
    }
  }, [data?.analysisJson]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <WhatsAppHeader isHe={isHe} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 pt-14">
          <FashionSpinner />
          <p className="text-muted-foreground text-sm">
            {isHe ? "טוען את הניתוח שלך..." : "Loading your analysis..."}
          </p>
        </div>
      </div>
    );
  }

  // Still analyzing
  if (data && data.status === "analyzing") {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <WhatsAppHeader isHe={isHe} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 pt-14">
          <FashionSpinner />
          <p className="text-muted-foreground text-sm">
            {isHe ? "הניתוח עדיין בתהליך... נסה שוב בעוד כמה שניות" : "Analysis still in progress..."}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
            {isHe ? "רענן" : "Refresh"}
          </Button>
        </div>
      </div>
    );
  }

  // Not found or error
  if (!data || error || !analysis) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <WhatsAppHeader isHe={isHe} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center pt-14">
          <MessageCircle className="w-16 h-16 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">
            {isHe ? "הניתוח לא נמצא" : "Analysis not found"}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {isHe
              ? "הלינק הזה לא תקף או שפג תוקפו. שלח/י תמונה חדשה בוואטסאפ לקבלת ניתוח חדש!"
              : "This link is invalid or has expired. Send a new photo on WhatsApp to get a new analysis!"}
          </p>
          <Button asChild>
            <a href={getLoginUrl()}>
              {isHe ? "הירשם/י לחוויה המלאה" : "Sign up for full experience"}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Failed
  if (data.status === "failed") {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <WhatsAppHeader isHe={isHe} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 pt-14">
          <p className="text-muted-foreground">
            {isHe ? "הניתוח נכשל. שלח/י תמונה חדשה בוואטסאפ." : "Analysis failed. Send a new photo on WhatsApp."}
          </p>
        </div>
      </div>
    );
  }

  const mentions = analysis.linkedMentions || [];

  // ── Build Story Cards ──
  const cardLabels: string[] = [];
  const cardIcons: string[] = [];
  const cards: React.ReactNode[] = [];

  // 1. Hero Card (image + score)
  cardLabels.push(isHe ? "סקירה" : "Overview");
  cardIcons.push("⭐");
  const scoreComment = analysis.overallScore >= 9
    ? (isHe ? "לוק מצוין! כמעט מושלם" : "Excellent look!")
    : analysis.overallScore >= 7
    ? (isHe ? "בסיס מעולה עם פוטנציאל" : "Great base with potential")
    : (isHe ? "יש בסיס טוב — ניתן לשדרג" : "Good base — can be upgraded");
  cards.push(
    <div key="hero" className="rounded-2xl border border-white/5 bg-card overflow-hidden">
      {data.imageUrl && (
        <div className="relative">
          <img loading="lazy" src={data.imageUrl} alt="Look" className="w-full max-h-[350px] object-contain bg-black/20" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card via-card/80 to-transparent h-24" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <ScoreCircle score={analysis.overallScore} />
          </div>
        </div>
      )}
      <div className="p-5 text-center">
        <h2 className="text-xl font-bold mb-1">
          {isHe ? "חוות דעת אופנתית" : "Fashion Review"}
        </h2>
        <p className="text-sm text-primary mb-3">{scoreComment}</p>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
          <LinkedText text={analysis.summary} mentions={mentions} />
        </p>
      </div>
      {/* WhatsApp badge */}
      <div className="mx-4 mb-4 flex items-center justify-between px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/20">
        <span className="text-[10px] text-green-400 font-medium flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          {isHe ? "ניתוח WhatsApp" : "WhatsApp Analysis"}
        </span>
        <Button size="sm" variant="ghost" className="text-[10px] text-primary h-6 px-2" asChild>
          <a href={getLoginUrl()}>
            {isHe ? "הירשם/י לעוד →" : "Sign up →"}
          </a>
        </Button>
      </div>
    </div>
  );

  // 2. Items Card
  if (analysis.items.length > 0) {
    cardLabels.push(isHe ? "פריטים" : "Items");
    cardIcons.push("👔");
    cards.push(
      <div key="items" className="rounded-2xl border border-white/5 bg-card p-5 space-y-4">
        <h3 className="text-lg font-bold text-center mb-2">
          {isHe ? "פריטים שזוהו" : "Items Detected"}
        </h3>
        {analysis.items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-2xl mt-0.5">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">
                  <LinkedText text={item.name} mentions={mentions} />
                </h4>
                <ScoreCircle score={item.score} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                <LinkedText text={item.description} mentions={mentions} />
              </p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${
                item.verdict === "בחירה מצוינת" || item.verdict === "Excellent choice" ? "bg-amber-500/10 text-amber-400" :
                item.verdict === "יש פוטנציאל" || item.verdict === "Has potential" ? "bg-primary/10 text-primary" :
                "bg-yellow-500/10 text-yellow-400"
              }`}>
                {item.verdict}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 3. Scores Card
  if (analysis.scores.length > 0) {
    cardLabels.push(isHe ? "ציונים" : "Scores");
    cardIcons.push("📊");
    cards.push(
      <div key="scores" className="rounded-2xl border border-white/5 bg-card p-5">
        <h3 className="text-lg font-bold text-center mb-5">
          {isHe ? "ציונים מפורטים" : "Detailed Scores"}
        </h3>
        <div className="space-y-4">
          {analysis.scores.map((s, i) => (
            <ScoreBar key={i} label={s.category} score={s.score} explanation={s.explanation} lang={lang} />
          ))}
        </div>
      </div>
    );
  }

  // 4. Improvements Card (limited — first 2 + CTA)
  if (analysis.improvements.length > 0) {
    cardLabels.push(isHe ? "שדרוגים" : "Upgrades");
    cardIcons.push("💡");
    cards.push(
      <div key="improvements" className="rounded-2xl border border-white/5 bg-card p-5 space-y-4">
        <h3 className="text-lg font-bold text-center mb-2">
          <Sparkles className={`w-5 h-5 text-primary inline-block ${dir === "rtl" ? "ml-1.5" : "mr-1.5"}`} />
          {isHe ? "טיפים לשדרוג" : "Upgrade Tips"}
        </h3>
        {analysis.improvements.slice(0, 2).map((imp, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">{imp.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{imp.description}</p>
              </div>
            </div>
            {/* Show first shopping link if available */}
            {imp.shoppingLinks?.slice(0, 1).map((link, j) => (
              <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-xs text-primary hover:text-amber-300 transition-colors">
                <ShoppingBag className="w-3.5 h-3.5" />
<span>{link.label || getStoreName(link.url)}</span>
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            ))}
          </div>
        ))}
        {analysis.improvements.length > 2 && (
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground mb-2">
              {isHe
                ? `עוד ${analysis.improvements.length - 2} טיפים + המלצות קניות`
                : `${analysis.improvements.length - 2} more tips + shopping recommendations`}
            </p>
            <Button size="sm" variant="outline" asChild>
              <a href={getLoginUrl()}>
                {isHe ? "הירשם/י לצפייה" : "Sign up to view"}
              </a>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 5. Influencer Card (if influencer insight exists)
  if (analysis.influencerInsight) {
    // Try to find matching influencer
    const influencer = analysis.matchedInfluencer
      ? POPULAR_INFLUENCERS.find(inf =>
          inf.name === analysis.matchedInfluencer?.name ||
          inf.handle === analysis.matchedInfluencer?.handle
        ) || analysis.matchedInfluencer
      : null;

    cardLabels.push(isHe ? "משפיען" : "Influencer");
    cardIcons.push("📷");
    cards.push(
      <div key="influencer" className="rounded-2xl border border-white/5 bg-card p-5">
        <h3 className="text-lg font-bold text-center mb-4">
          <Users className={`w-5 h-5 text-rose-400 inline-block ${dir === "rtl" ? "ml-1.5" : "mr-1.5"}`} />
          {isHe ? "השראה מסלבריטי" : "Celebrity Inspiration"}
        </h3>
        {influencer && (
          <div className="flex flex-col items-center mb-4">
            <InfluencerAvatar name={influencer.name} imageUrl={(influencer as any).imageUrl} size="lg" />
            <p className="font-bold mt-2">{influencer.name}</p>
            {(influencer as any).style && (
              <p className="text-xs text-muted-foreground">{(influencer as any).style}</p>
            )}
            {influencer.handle && (
              <a
                href={`https://instagram.com/${influencer.handle.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-rose-400 hover:text-rose-300 mt-1 flex items-center gap-1"
              >
                📷 {isHe ? "ראה דוגמת סטיילינג" : "See styling example"}
              </a>
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed text-center">
          <LinkedText text={analysis.influencerInsight} mentions={mentions} />
        </p>
      </div>
    );
  }

  // 6. Registration CTA Card (always last)
  cardLabels.push(isHe ? "הרשמה" : "Sign up");
  cardIcons.push("💎");
  cards.push(
    <div key="cta" className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-rose-500/5 to-transparent p-6 text-center">
      <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">
        {isHe ? "נהנית מהניתוח? יש עוד הרבה!" : "Enjoyed the analysis? There's much more!"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
        {isHe
          ? "הירשם/י כדי לקבל ניתוחים ללא הגבלה, התאמה אישית לסגנון שלך, ארון בגדים וירטואלי, והמלצות מותאמות לתקציב."
          : "Sign up to get unlimited analyses, personalized style matching, a virtual wardrobe, and budget-tailored recommendations."}
      </p>
      <Button size="lg" className="gap-2 mb-4" asChild>
        <a href={getLoginUrl()}>
          <Sparkles className="w-5 h-5" />
          {isHe ? "הירשם/י עכשיו — חינם!" : "Sign up now — free!"}
        </a>
      </Button>
      <p className="text-[10px] text-muted-foreground">
        {isHe
          ? "✨ ניתוחים ללא הגבלה • 👗 ארון בגדים וירטואלי • 🎯 התאמה אישית • 🛍️ המלצות קניות"
          : "✨ Unlimited • 👗 Virtual wardrobe • 🎯 Personalization • 🛍️ Shopping"}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <WhatsAppHeader isHe={isHe} />

      <div className="pt-16 pb-8 max-w-lg mx-auto px-2">
        <StoryCardsContainer
          lang={lang}
          cardLabels={cardLabels}
          cardIcons={cardIcons}
        >
          {cards}
        </StoryCardsContainer>
      </div>

      {/* Privacy footer */}
      <footer className="text-center py-6 border-t border-white/5">
        <p className="text-muted-foreground text-[10px]">
          {isHe
            ? "חוות דעת אופנתית מקיפה — נוצר במיוחד עבורך"
            : "Comprehensive fashion review — created especially for you"}
        </p>
      </footer>
    </div>
  );
}
