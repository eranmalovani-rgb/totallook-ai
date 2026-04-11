import { Link, useLocation } from "wouter";
import { Zap, Target, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n";
import { useFingerprint } from "@/hooks/useFingerprint";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState, useCallback } from "react";
import { compressImageToBase64 } from "@/lib/imageCompress";
import StylingStudioAnimation from "@/components/StylingStudioAnimation";
import { GuestTrialWall } from "@/components/GuestTrialWall";
import FashionSpinner from "@/components/FashionSpinner";
import { toast } from "sonner";

export default function PathChooser() {
  const { dir, lang } = useLanguage();
  const [, navigate] = useLocation();
  const isHe = lang === "he";
  const fingerprint = useFingerprint();
  const trackPageView = trpc.tracking.trackPageView.useMutation();
  const trackingRef = useRef(false);

  /* ─── Check guest limit ─── */
  const { data: limitData, isLoading: limitLoading } = trpc.guest.checkLimit.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  /* ─── Quick-check inline upload state ─── */
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [quickFile, setQuickFile] = useState<File | null>(null);
  const [quickPreview, setQuickPreview] = useState<string | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);

  /* ─── tRPC mutations for inline quick check ─── */
  const uploadMutation = trpc.guest.upload.useMutation();
  const analyzeMutation = trpc.guest.analyze.useMutation();

  /* ─── Tracking ─── */
  useEffect(() => {
    if (!fingerprint || trackingRef.current) return;
    trackingRef.current = true;
    trackPageView.mutateAsync({
      fingerprint,
      page: "/try",
      referrer: document.referrer || undefined,
      screenWidth: window.innerWidth,
    }).catch(() => {});
  }, [fingerprint]);

  const trackClick = (path: string) => {
    if (!fingerprint) return;
    trackPageView.mutateAsync({
      fingerprint,
      page: `/cta/path-chooser/${path}`,
      referrer: "/try",
      screenWidth: window.innerWidth,
    }).catch(() => {});
  };

  /* ─── Handle file selection → auto upload + analyze ─── */
  const handleQuickFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error(isHe ? "קובץ לא תקין — העלה תמונה" : "Invalid file — please upload an image");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error(isHe ? "הקובץ גדול מדי (מקסימום 10MB)" : "File too large (max 10MB)");
      return;
    }

    // Show preview immediately
    setQuickFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setQuickPreview(e.target?.result as string);
    reader.readAsDataURL(f);

    // Start upload + analyze flow
    setQuickLoading(true);
    trackClick("quick");

    try {
      if (!fingerprint) {
        toast.error(isHe ? "שגיאה — נסה שוב" : "Error — please try again");
        setQuickLoading(false);
        return;
      }

      // 1. Compress and upload
      const { base64, mimeType } = await compressImageToBase64(f);
      const { sessionId } = await uploadMutation.mutateAsync({
        imageBase64: base64,
        mimeType,
        fingerprint,
      });

      // 2. Analyze (with one auto-retry)
      try {
        await analyzeMutation.mutateAsync({ sessionId, lang });
      } catch (retryErr: any) {
        const msg = retryErr?.message || "";
        const isRetryable = msg.includes("timeout") || msg.includes("ECONNRESET") ||
          msg.includes("fetch failed") || msg.includes("500") || msg.includes("502") || msg.includes("503");
        if (isRetryable) {
          await new Promise(r => setTimeout(r, 3000));
          await analyzeMutation.mutateAsync({ sessionId, lang });
        } else {
          throw retryErr;
        }
      }

      // 3. Navigate to results
      navigate(`/guest/review/${sessionId}`);
    } catch (err: any) {
      setQuickLoading(false);
      setQuickFile(null);
      setQuickPreview(null);
      const msg = err?.message || "";
      if (msg.includes("GUEST_LIMIT_REACHED")) {
        // Limit reached during upload — show wall
        toast.error(isHe ? "ניצלת את 3 הניסיונות החינמיים. הירשמי לגישה מלאה!" : "You've used all 3 free trials. Sign up for full access!");
        return;
      }
      if (msg.includes("quota") || msg.includes("rate") || msg.includes("429")) {
        toast.error(isHe ? "השירות עמוס. נסה שוב בעוד חצי דקה." : "Service busy. Try again in 30 seconds.");
      } else {
        toast.error(isHe ? "אירעה שגיאה. נסה שוב." : "An error occurred. Please try again.");
      }
    }
  }, [fingerprint, lang, isHe, uploadMutation, analyzeMutation, navigate]);

  /* ─── Loading state ─── */
  if (!fingerprint || limitLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  /* ─── Guest limit reached → show trial wall ─── */
  if (limitData?.used) {
    return <GuestTrialWall count={limitData.count} />;
  }

  /* ─── Quick check: show full-screen loading animation ─── */
  if (quickLoading) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-4" dir={dir}>
        <StylingStudioAnimation
          uploading={!quickPreview}
          analyzing={!!quickPreview}
          selectedOccasion=""
          selectedInfluencers={[]}
          imagePreview={quickPreview}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col" dir={dir}>
      {/* Hidden file inputs for quick check */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQuickFile(f); e.target.value = ""; }}
      />


      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-amber-400">TotalLook</span>
          <span className="text-foreground/60">.ai</span>
        </span>
        <Link
          href="/"
          className="text-xs text-muted-foreground/60 hover:text-foreground/80 transition-colors"
        >
          {isHe ? "← חזרה" : "← Back"}
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 mb-8 relative z-10">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-amber-300/80 font-medium tracking-wide">
            {isHe ? "הסטייליסטית שלך מחכה" : "Your stylist is waiting"}
          </span>
        </div>

        {/* Remaining trials badge */}
        {limitData && limitData.count > 0 && !limitData.used && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10 mb-4 relative z-10">
            <span className="text-xs text-muted-foreground">
              {isHe
                ? `${limitData.limit - limitData.count} ניסיונות חינמיים נותרו`
                : `${limitData.limit - limitData.count} free trials remaining`}
            </span>
          </div>
        )}

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 relative z-10">
          {isHe ? "איך בא לך להתחיל?" : "How do you want to start?"}
        </h1>
        <p className="text-sm text-muted-foreground/60 text-center mb-10 relative z-10">
          {isHe ? "שתי הדרכים מובילות לתוצאה מדהימה" : "Both paths lead to amazing results"}
        </p>

        {/* Two cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl relative z-10">
          {/* Option 1 — Quick (Primary) — opens file picker directly */}
          <div
            className="group relative rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-amber-500/[0.02] hover:border-amber-500/50 hover:from-amber-500/[0.12] transition-all duration-300 p-6 sm:p-8 text-center cursor-pointer overflow-hidden"
          >
            {/* Recommended badge */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
              <span className="text-[10px] text-amber-300 font-bold tracking-wider uppercase">
                {isHe ? "פופולרי" : "Popular"}
              </span>
            </div>

            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-5 mt-4 rounded-2xl bg-amber-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-8 h-8 text-amber-400" />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              {isHe ? "בדיקה מהירה" : "Quick Check"} ⚡
            </h2>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground mb-5">
              {isHe ? "ציון תוך 10 שניות" : "Score in 10 seconds"}
            </p>

            {/* CTA — opens native file picker (camera + gallery combined) */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm group-hover:from-amber-400 group-hover:to-amber-500 transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
            >
              {isHe ? "יאללה!" : "Let's go!"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Option 2 — Precise */}
          <Link
            href="/try/precise"
            onClick={() => trackClick("precise")}
            className="group relative rounded-2xl border border-foreground/10 bg-gradient-to-b from-foreground/[0.03] to-transparent hover:border-amber-500/30 hover:from-amber-500/[0.05] transition-all duration-300 p-6 sm:p-8 text-center cursor-pointer"
          >
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-5 mt-4 rounded-2xl bg-foreground/5 group-hover:bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
              <Target className="w-8 h-8 text-foreground/40 group-hover:text-amber-400 transition-colors" />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              {isHe ? "בדיקה מדויקת יותר" : "Precise Check"} 🎯
            </h2>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground mb-6">
              {isHe ? "עוד כמה בחירות → תוצאה מדויקת יותר" : "A few more choices → more accurate results"}
            </p>

            {/* CTA */}
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-foreground/10 group-hover:border-amber-500/30 text-foreground/70 group-hover:text-amber-400 font-bold text-sm transition-all duration-300">
              {isHe ? "בואי נכיר" : "Let's get to know you"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Bottom hint */}
        <p className="text-xs text-muted-foreground/30 mt-8 text-center relative z-10">
          {isHe
            ? "💡 גם אחרי בדיקה מהירה אפשר לעבור לבדיקה מדויקת"
            : "💡 You can always switch to precise check after a quick one"}
        </p>
      </div>
    </div>
  );
}
