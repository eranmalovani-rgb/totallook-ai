import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, Camera, Sparkles, ChevronDown, ArrowRight, Eye, Shirt, Footprints, Watch, Brain, Heart, Zap, Star, TrendingUp } from "lucide-react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { useOwnerBypass } from "@/hooks/useOwnerBypass";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/i18n";
import { useAuth } from "@/_core/hooks/useAuth";

/* ─── Design Tokens ─── */
const PINK = "#FF2E9F";
const PURPLE = "#7B2EFF";
const NEON = "#00FF88";
const SCORE_LOW = "#FF4D4D";
const BG = "#0B0B0F";
const BG_CARD = "#12121A";
const BORDER = "rgba(255,255,255,0.06)";
const FONT = "'Space Grotesk', 'Heebo', sans-serif";

/* ─── CDN Images ─── */
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM";
const CDN2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB";

const BEFORE_IMG = `${CDN}/landing-before-casual-Dd22cGqT4oLpLDBsvBPXEF.webp`;
const AFTER_IMGS: Record<string, string> = {
  top: `${CDN}/landing-after-casual-dwXNkJDRs4Cf63hVniD2zC.webp`,
  shoes: `${CDN}/landing-after-smart-c6jhFBAQnG5THWTM9Sczsm.webp`,
  accessories: `${CDN2}/showcase_after_elegant-ncCCyuqrtVQQAM5EMy59Hp.webp`,
};

const HERO_BEFORE = `${CDN}/landing-before-casual-Dd22cGqT4oLpLDBsvBPXEF.webp`;
const HERO_AFTER = `${CDN}/landing-after-casual-dwXNkJDRs4Cf63hVniD2zC.webp`;

/* ─── Tracking ─── */
function track(event: string) {
  try { (window as any).gtag?.("event", event); } catch {}
}

/* ─── Intersection Observer Hook ─── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Animated Score Counter ─── */
function ScoreCounter({ from, to, duration = 2000, className = "", trigger = true }: {
  from: number; to: number; duration?: number; className?: string; trigger?: boolean;
}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!trigger) { setValue(from); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [from, to, duration, trigger]);
  return <span className={className}>{value}</span>;
}

/* ─── Before/After Slider ─── */
function BeforeAfterSlider({ beforeImage, afterImage, sliderKey }: { beforeImage: string; afterImage: string; sliderKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef(0);

  const updatePos = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  // Pointer events — attach to window for smooth dragging
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      el.setPointerCapture(e.pointerId);
      updatePos(e.clientX);
      track("drag_slider");
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      updatePos(e.clientX);
    };
    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: false });
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [updatePos]);

  // Auto-slide demo on mount / upgrade switch
  useEffect(() => {
    setPosition(50);
    cancelAnimationFrame(animFrameRef.current);
    const timer = setTimeout(() => {
      let start: number | null = null;
      const animate = (ts: number) => {
        if (!start) start = ts;
        if (isDraggingRef.current) return; // user took over
        const elapsed = ts - start;
        if (elapsed < 800) {
          setPosition(50 - 25 * (elapsed / 800));
          animFrameRef.current = requestAnimationFrame(animate);
        } else if (elapsed < 1800) {
          setPosition(25 + 50 * ((elapsed - 800) / 1000));
          animFrameRef.current = requestAnimationFrame(animate);
        } else if (elapsed < 2500) {
          setPosition(75 - 25 * ((elapsed - 1800) / 700));
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setPosition(50);
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }, 300);
    return () => { clearTimeout(timer); cancelAnimationFrame(animFrameRef.current); };
  }, [sliderKey]);

  /*
   * KEY TECHNIQUE: Both images are position:absolute, inset:0, object-fit:cover
   * so they are IDENTICAL in size and alignment.
   * The "Before" overlay uses clip-path: inset(0 <right-clip> 0 0) to reveal
   * only the left portion — no width manipulation, no squeezing.
   */
  const clipRight = `${100 - position}%`;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl select-none"
      style={{ aspectRatio: "3/4", touchAction: "none", cursor: "ew-resize", background: "#111" }}
    >
      {/* AFTER — full background layer */}
      <img
        key={`after-${sliderKey}`}
        src={afterImage}
        className="absolute inset-0 w-full h-full object-cover"
        alt="After"
        loading="eager"
        draggable={false}
        style={{ pointerEvents: "none" }}
      />

      {/* BEFORE — clipped overlay (same size, just clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${clipRight} 0 0)`, zIndex: 2 }}
      >
        <img
          src={beforeImage}
          className="absolute inset-0 w-full h-full object-cover"
          alt="Before"
          loading="eager"
          draggable={false}
          style={{ pointerEvents: "none" }}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0"
        style={{ left: `${position}%`, width: 2, background: "rgba(255,255,255,0.85)", transform: "translateX(-50%)", zIndex: 3 }}
      />

      {/* Drag handle */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: `${position}%`,
          top: "50%",
          width: 44,
          height: 44,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 4,
          background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          cursor: "ew-resize",
        }}
      >
        <span className="text-white text-base font-bold select-none" style={{ pointerEvents: "none" }}>↔</span>
      </div>

      {/* Labels */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold" style={{ background: "rgba(0,0,0,0.45)", color: "#fff", zIndex: 5 }}>
        לפני
      </div>
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold" style={{ background: "rgba(0,0,0,0.45)", color: "#fff", zIndex: 5 }}>
        אחרי
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function NewLanding() {
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const fingerprint = useFingerprint();
  const ownerSecret = useOwnerBypass();
  const { user } = useAuth();
  const isHe = lang === "he" || !lang;

  const heroRef = useInView(0.1);
  const killerRef = useInView(0.15);
  const howRef = useInView(0.15);
  const personRef = useInView(0.2);
  const emotionRef = useInView(0.2);
  const finalRef = useInView(0.2);

  /* ─── Killer Feature State ─── */
  const [selectedUpgrade, setSelectedUpgrade] = useState<"top" | "shoes" | "accessories">("top");

  /* ─── Track page view ─── */
  useEffect(() => { track("page_view"); }, []);

  /* ─── Hero entrance ─── */
  const [heroReady, setHeroReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  /* ─── Redirect logged-in users straight to upload ─── */
  useEffect(() => {
    if (user) {
      navigate("/upload", { replace: true });
    }
  }, [user, navigate]);

  const openUpload = (source: string) => {
    track(`cta_click_${source}`);
    if (user) {
      navigate("/upload");
    } else {
      navigate("/try/precise");
    }
  };

  const openQuickUpload = (source: string) => {
    track(`cta_click_quick_${source}`);
    if (user) {
      navigate("/upload");
    } else {
      navigate("/try/quick");
    }
  };

  const dir = isHe ? "rtl" : "ltr";

  return (
    <div dir={dir} className="min-h-screen overflow-x-hidden" style={{ background: BG, fontFamily: "'Inter', 'Heebo', sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          "תעלה לוק. תראה אותו משתדרג מול העיניים."
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={heroRef.ref}
        className="relative flex flex-col items-center justify-center px-4 sm:px-6"
        style={{ minHeight: "100svh" }}
      >
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: `${PINK}08` }} />

        {/* Logo */}
        <div className="absolute top-4 sm:top-6 left-0 right-0 px-4 sm:px-6 flex items-center justify-between z-20">
          <span className="text-lg sm:text-xl font-bold tracking-tight" style={{ fontFamily: FONT }}>
            <span style={{ color: PINK }}>TotalLook</span><span className="text-white/40">.ai</span>
          </span>
          <button
            onClick={() => openUpload("hero-nav")}
            className="text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors"
            style={{ color: `${PINK}cc` }}
          >
            {isHe ? "התחל עכשיו" : "Start now"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hero content */}
        <div className={`w-full max-w-2xl mx-auto text-center pt-16 sm:pt-20 transition-all duration-1000 ease-out ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 sm:mb-6" style={{ background: `${PINK}0a`, border: `1px solid ${PINK}20` }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: PINK }} />
            <span className="text-[11px] sm:text-xs font-medium tracking-wide" style={{ color: `${PINK}cc` }}>
              {isHe ? "סטייליסט AI אישי" : "AI Personal Stylist"}
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-extrabold leading-[1.1] mb-3 sm:mb-4"
            style={{ fontFamily: FONT, color: "#fff", fontSize: "clamp(28px, 7vw, 56px)" }}
          >
            {isHe ? (
              <>
                תעלה לוק.{" "}
                <span style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  תראה אותו משתדרג
                </span>
                {" "}מול העיניים.
              </>
            ) : (
              <>
                Upload a look.{" "}
                <span style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Watch it upgrade
                </span>
                {" "}before your eyes.
              </>
            )}
          </h1>

          {/* Sub-headline */}
          <p className="text-white/50 mb-5 sm:mb-6 max-w-md mx-auto leading-relaxed" style={{ fontSize: "clamp(14px, 3.5vw, 18px)" }}>
            {isHe
              ? "לא רק ציון — תראה איך שינוי קטן מקפיץ אותך מ־62 ל־92"
              : "Not just a score — see how a small change takes you from 62 to 92"}
          </p>

          {/* ── SCORE ANIMATION ── */}
          <div dir="ltr" className="flex items-center justify-center gap-3 sm:gap-5 mb-5 sm:mb-7 score-pop">
            <span
              className="font-black"
              style={{ fontSize: "clamp(52px, 14vw, 120px)", color: SCORE_LOW, fontFamily: FONT, textShadow: `0 0 40px ${SCORE_LOW}50`, lineHeight: 1 }}
            >
              <ScoreCounter from={0} to={62} duration={1500} trigger={heroRef.inView} />
            </span>
            <span className="text-white/25 font-light" style={{ fontSize: "clamp(20px, 5vw, 50px)" }}>→</span>
            <span
              className="font-black"
              style={{ fontSize: "clamp(52px, 14vw, 120px)", color: NEON, fontFamily: FONT, textShadow: `0 0 40px ${NEON}50`, lineHeight: 1 }}
            >
              <ScoreCounter from={62} to={92} duration={2000} trigger={heroRef.inView} />
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4">
            <button
              onClick={() => openUpload("hero")}
              className="cta-main relative font-bold rounded-2xl text-sm sm:text-base px-7 sm:px-10 py-3.5 sm:py-4 text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto"
              style={{ fontFamily: FONT, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})` }}
            >
              {isHe ? "נסה על הלוק שלך עכשיו" : "Try it on your look now"}
            </button>
            <button
              onClick={() => openQuickUpload("hero-secondary")}
              className="font-medium rounded-2xl text-sm px-6 py-3 transition-all hover:bg-white/5 w-full sm:w-auto"
              style={{ fontFamily: FONT, border: `1px solid rgba(255,255,255,0.12)`, color: "rgba(255,255,255,0.45)", background: "transparent" }}
            >
              {isHe ? "העלה לוק בלי פרסונליזציה" : "Upload without personalization"}
            </button>
          </div>

          <p className="text-white/25 text-[11px] sm:text-xs" style={{ fontFamily: FONT }}>
            {isHe ? "בלי הרשמה · בלי תשלום · 100% פרטי" : "No signup · Free · 100% private"}
          </p>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-5 h-5 text-white/20" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — KILLER FEATURE (Before/After Slider + Upgrade Buttons)
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={killerRef.ref}
        className="py-12 sm:py-20 px-4 sm:px-6 relative"
        style={{ background: `linear-gradient(180deg, ${BG}, ${BG_CARD}40, ${BG})` }}
      >
        <div className={`max-w-lg mx-auto transition-all duration-700 ${killerRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Section header */}
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-medium mb-2 sm:mb-3" style={{ color: `${PINK}80` }}>
              {isHe ? "הפיצ׳ר המרכזי" : "The killer feature"}
            </p>
            <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-tight" style={{ fontFamily: FONT }}>
              {isHe ? "תבחר שדרוג — תראה את השינוי" : "Choose an upgrade — see the change"}
            </h2>
          </div>

          {/* Upgrade Buttons */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-5 sm:mb-6">
            {([
              { key: "top" as const, icon: Shirt, label: isHe ? "חולצה" : "Top" },
              { key: "shoes" as const, icon: Footprints, label: isHe ? "נעליים" : "Shoes" },
              { key: "accessories" as const, icon: Watch, label: isHe ? "אקססוריז" : "Accessories" },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => { setSelectedUpgrade(key); track(`click_upgrade_${key}`); }}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300"
                style={{
                  fontFamily: FONT,
                  background: selectedUpgrade === key ? `linear-gradient(135deg, ${PINK}, ${PURPLE})` : BG_CARD,
                  color: selectedUpgrade === key ? "#fff" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${selectedUpgrade === key ? "transparent" : BORDER}`,
                  boxShadow: selectedUpgrade === key ? `0 0 20px ${PINK}30` : "none",
                }}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Slider */}
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, boxShadow: `0 0 60px ${PINK}08` }}>
            <BeforeAfterSlider
              key={selectedUpgrade}
              sliderKey={selectedUpgrade}
              beforeImage={BEFORE_IMG}
              afterImage={AFTER_IMGS[selectedUpgrade]}
            />
          </div>

          {/* Score badge */}
          <div className="flex items-center justify-center gap-2 mt-4 sm:mt-5">
            <TrendingUp className="w-4 h-4" style={{ color: NEON }} />
            <span className="text-sm sm:text-base font-bold" style={{ color: NEON, fontFamily: FONT }}>
              {isHe ? "+30 נקודות שדרוג" : "+30 upgrade points"}
            </span>
          </div>

          {/* CTA */}
          <div className="text-center mt-5 sm:mt-6">
            <button
              onClick={() => openUpload("killer")}
              className="font-bold rounded-2xl text-sm sm:text-base px-8 sm:px-10 py-3 sm:py-3.5 text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{ fontFamily: FONT, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, boxShadow: `0 0 25px ${PINK}25` }}
            >
              {isHe ? "נסה על הלוק שלך" : "Try it on your look"}
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — HOW IT WORKS (4 Steps)
          ═══════════════════════════════════════════════════════ */}
      <section ref={howRef.ref} className="py-12 sm:py-20 px-4 sm:px-6">
        <div className={`max-w-lg mx-auto transition-all duration-700 ${howRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-medium mb-2 sm:mb-3" style={{ color: `${PINK}80` }}>
              {isHe ? "איך זה עובד" : "How it works"}
            </p>
            <h2 className="text-xl sm:text-3xl font-extrabold text-white" style={{ fontFamily: FONT }}>
              {isHe ? "ארבעה צעדים. זה הכל." : "Four steps. That's it."}
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            {([
              { num: "01", icon: Camera, title: isHe ? "מעלים תמונה" : "Upload a photo", desc: isHe ? "צלם או בחר מהגלריה" : "Take a photo or pick from gallery" },
              { num: "02", icon: Star, title: isHe ? "מקבלים ציון" : "Get your score", desc: isHe ? "ה-AI מנתח כל פריט" : "AI analyzes every item" },
              { num: "03", icon: Zap, title: isHe ? "בוחרים שדרוג" : "Choose an upgrade", desc: isHe ? "המלצות ספציפיות + קישורי קנייה" : "Specific recommendations + shopping links" },
              { num: "04", icon: Eye, title: isHe ? "רואים שינוי מיידי" : "See instant change", desc: isHe ? "לפני/אחרי ויזואלי" : "Visual before/after" },
            ]).map((step) => (
              <div
                key={step.num}
                className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl transition-all duration-300"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
              >
                {/* Number */}
                <div
                  className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-sm sm:text-base font-extrabold"
                  style={{ background: `linear-gradient(135deg, ${PINK}15, ${PURPLE}15)`, color: PINK, fontFamily: FONT }}
                >
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white mb-0.5" style={{ fontFamily: FONT }}>{step.title}</h3>
                  <p className="text-xs sm:text-sm text-white/40">{step.desc}</p>
                </div>
                <step.icon className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 text-white/15" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — PERSONALIZATION
          "המערכת לומדת אותך עם כל לוק"
          ═══════════════════════════════════════════════════════ */}
      <section ref={personRef.ref} className="py-12 sm:py-20 px-4 sm:px-6" style={{ background: BG_CARD }}>
        <div className={`max-w-lg mx-auto text-center transition-all duration-700 ${personRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-5 sm:mb-6" style={{ background: `linear-gradient(135deg, ${PURPLE}15, ${PINK}15)`, border: `1px solid ${PURPLE}20` }}>
            <Brain className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: PURPLE }} />
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold text-white mb-3 sm:mb-4 leading-tight" style={{ fontFamily: FONT }}>
            {isHe ? "המערכת לומדת אותך עם כל לוק" : "The system learns you with every look"}
          </h2>

          <p className="text-sm sm:text-base text-white/40 max-w-sm mx-auto mb-6 sm:mb-8 leading-relaxed">
            {isHe
              ? "ככל שתעלה יותר — ההמלצות נהיות יותר מדויקות ואישיות"
              : "The more you upload — the more accurate and personal the recommendations become"}
          </p>

          {/* Progress bars */}
          <div className="flex flex-col gap-3 sm:gap-4 max-w-xs mx-auto">
            {([
              { label: isHe ? "סגנון אישי" : "Personal style", pct: 78, color: PINK },
              { label: isHe ? "התאמת צבעים" : "Color matching", pct: 85, color: PURPLE },
              { label: isHe ? "פרופורציות" : "Proportions", pct: 92, color: NEON },
            ]).map((bar) => (
              <div key={bar.label} className="text-start">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm text-white/60 font-medium" style={{ fontFamily: FONT }}>{bar.label}</span>
                  <span className="text-xs font-bold" style={{ color: bar.color, fontFamily: FONT }}>{bar.pct}%</span>
                </div>
                <div className="h-1.5 sm:h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: personRef.inView ? `${bar.pct}%` : "0%",
                      background: bar.color,
                      boxShadow: `0 0 10px ${bar.color}40`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — EMOTIONAL
          "כמה פעמים חשבת שזה נראה טוב… וזה לא?"
          ═══════════════════════════════════════════════════════ */}
      <section ref={emotionRef.ref} className="py-14 sm:py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none opacity-15">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: `radial-gradient(circle, ${PINK}, transparent 70%)` }} />
        </div>
        <div className={`relative z-10 max-w-lg mx-auto text-center transition-all duration-700 ${emotionRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <Heart className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-5 sm:mb-6" style={{ color: `${PINK}60` }} />
          <h2
            className="font-extrabold text-white leading-tight mb-4 sm:mb-5"
            style={{ fontFamily: FONT, fontSize: "clamp(22px, 6vw, 44px)" }}
          >
            {isHe ? (
              <>
                כמה פעמים חשבת שזה נראה טוב…
                <br />
                <span style={{ color: `${PINK}80` }}>וזה לא?</span>
              </>
            ) : (
              <>
                How many times did you think it looked good…
                <br />
                <span style={{ color: `${PINK}80` }}>and it didn't?</span>
              </>
            )}
          </h2>
          <p className="text-sm sm:text-base text-white/35 max-w-sm mx-auto">
            {isHe
              ? "עכשיו יש לך דרך לדעת בוודאות."
              : "Now you have a way to know for sure."}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — BOTTOM CTA
          "תראה איך אתה נראה טוב יותר — עכשיו"
          ═══════════════════════════════════════════════════════ */}
      <section ref={finalRef.ref} className="py-14 sm:py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: `radial-gradient(circle, ${PURPLE}, transparent 70%)` }} />
        </div>
        <div className={`relative z-10 max-w-lg mx-auto text-center transition-all duration-700 ${finalRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="font-extrabold text-white leading-tight mb-3 sm:mb-4"
            style={{ fontFamily: FONT, fontSize: "clamp(24px, 6.5vw, 48px)" }}
          >
            {isHe
              ? "תראה איך אתה נראה טוב יותר — עכשיו"
              : "See how you look better — now"}
          </h2>
          <p className="text-white/35 text-sm sm:text-base mb-6 sm:mb-8" style={{ fontFamily: FONT }}>
            {isHe ? "לוקח 5 שניות." : "Takes 5 seconds."}
          </p>
          <button
            onClick={() => openUpload("final")}
            className="cta-main font-bold rounded-2xl text-base sm:text-lg px-10 sm:px-14 py-3.5 sm:py-4 text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{ fontFamily: FONT, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})` }}
          >
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {isHe ? "העלה את הלוק שלך" : "Upload your outfit"}
            </span>
          </button>
          <p className="text-white/20 text-[11px] sm:text-xs mt-4" style={{ fontFamily: FONT }}>
            {isHe ? "בלי הרשמה · בלי תשלום · 100% פרטי" : "No signup · Free · 100% private"}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER — Minimal
          ═══════════════════════════════════════════════════════ */}
      <footer className="py-8 sm:py-10" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-lg mx-auto text-center px-4">
          <p className="text-base font-bold mb-3" style={{ fontFamily: FONT }}>
            <span style={{ color: `${PINK}50` }}>TotalLook</span><span className="text-white/20">.ai</span>
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-[11px] sm:text-xs text-white/25">
            <a href="/terms" className="hover:text-white/50 transition-colors">{isHe ? "תנאי שימוש" : "Terms"}</a>
            <a href="/privacy" className="hover:text-white/50 transition-colors">{isHe ? "מדיניות פרטיות" : "Privacy"}</a>
            <a href="/about" className="hover:text-white/50 transition-colors">{isHe ? "מי אנחנו" : "About"}</a>
            <a href="mailto:eranmalovani@gmail.com" className="hover:text-white/50 transition-colors">{isHe ? "צור קשר" : "Contact"}</a>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════
          STICKY CTA — Always visible
          ═══════════════════════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-3"
        style={{
          background: `linear-gradient(to top, ${BG}, ${BG}ee, transparent)`,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={() => openUpload("sticky")}
          className="sticky-cta w-full max-w-md mx-auto block py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base text-white"
          style={{ fontFamily: FONT, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, minHeight: 48 }}
        >
          {isHe ? "נסה על הלוק שלך עכשיו" : "Try it on your look now"}
        </button>
      </div>

      {/* Bottom padding for sticky CTA */}
      <div className="h-24" />

      {/* ─── CSS Animations ─── */}
      <style>{`
        .score-pop {
          animation: pop 0.6s ease-out both;
        }
        @keyframes pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .cta-main {
          box-shadow: 0 0 30px ${PINK}35, 0 0 60px ${PURPLE}15;
          animation: cta-glow 3s ease-in-out infinite;
        }
        @keyframes cta-glow {
          0%, 100% { box-shadow: 0 0 30px ${PINK}35, 0 0 60px ${PURPLE}15; }
          50% { box-shadow: 0 0 50px ${PINK}50, 0 0 90px ${PURPLE}25; }
        }
        .sticky-cta {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,46,159,0.6); }
          70% { box-shadow: 0 0 0 12px rgba(255,46,159,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,46,159,0); }
        }
      `}</style>
    </div>
  );
}
