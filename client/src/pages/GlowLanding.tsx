import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, Camera, Sparkles, Star, TrendingUp, Zap, Heart, Eye } from "lucide-react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/i18n";

/* ─── Design tokens ─── */
const PINK = "#FF2E9F";
const PURPLE = "#7B2EFF";
const BG = "#0B0B0F";
const BG_CARD = "#111118";

/* ─── CDN Images ─── */
const IMG_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/glow-before-after-1-4xH8Y9JhG57dpaYNXKiwuW.webp";
const IMG_BA2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/glow-before-after-2-RHsUihVfH8XH8RJpJkrM8y.webp";
const IMG_BA3 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/glow-before-after-3-XVjNG6azV8XfhaP8yMXmsX.webp";
const IMG_GRID = "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/glow-style-card-grid-NFN8by5vn5dWWHcQn4eAyD.webp";

/* ─── Mock data ─── */
const LIVE_FEED_ITEMS = [
  { name: "נועה", from: 58, to: 88 },
  { name: "מאיה", from: 62, to: 91 },
  { name: "שירה", from: 55, to: 85 },
  { name: "דנה", from: 67, to: 94 },
  { name: "יעל", from: 60, to: 89 },
  { name: "רותם", from: 53, to: 82 },
  { name: "ליאור", from: 64, to: 93 },
  { name: "תמר", from: 59, to: 87 },
  { name: "אגם", from: 61, to: 90 },
  { name: "הילה", from: 56, to: 86 },
];

const SOCIAL_PROOF = [
  { text: "אני מכורה. זה שינה לי את הארון.", name: "נועה, 22" },
  { text: "זה תיקן לי את הלוק בשניות.", name: "מאיה, 19" },
  { text: "חברות שלי לא מפסיקות לשאול מאיפה הסטייל.", name: "שירה, 24" },
  { text: "קיבלתי 92 בלוק הראשון שלי!", name: "דנה, 20" },
  { text: "הכי טוב שקרה לארון שלי.", name: "יעל, 17" },
  { text: "כאילו יש לי סטייליסטית אישית.", name: "רותם, 21" },
];

const BEFORE_AFTER_EXAMPLES = [
  { img: IMG_BA2, label: "הודי → קז'ואל שיק", before: 58, after: 88 },
  { img: IMG_BA3, label: "בסיסי → אלגנטי", before: 55, after: 91 },
];

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

/* ─── LTR Number wrapper ─── */
function LtrNum({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block", ...style }} className={className}>{children}</span>;
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

/* ─── Upload Modal ─── */
function UploadModal({ open, onClose, onFileSelect }: {
  open: boolean; onClose: () => void; onFileSelect: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[90vw] max-w-sm rounded-2xl p-6"
        style={{ background: BG_CARD, border: `1px solid rgba(255,255,255,0.08)` }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-center mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }}>
          העלי את הלוק שלך
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-3 p-5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${PINK}15, ${PURPLE}15)`, border: `1px solid ${PINK}30` }}
          >
            <Upload className="w-8 h-8" style={{ color: PINK }} />
            <span className="text-sm font-medium text-white/80">מהגלריה</span>
          </button>
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-3 p-5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${PURPLE}15, ${PINK}15)`, border: `1px solid ${PURPLE}30` }}
          >
            <Camera className="w-8 h-8" style={{ color: PURPLE }} />
            <span className="text-sm font-medium text-white/80">צלמי עכשיו</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }} />
        <p className="text-center text-xs text-white/40 mt-4">תמונה של הפנים + גוף מלא = הכי טוב</p>
      </div>
    </div>
  );
}

/* ─── Main GlowLanding Component ─── */
export default function GlowLanding() {
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const fingerprint = useFingerprint();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [liveFeedIdx, setLiveFeedIdx] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const heroRef = useInView(0.1);
  const gameRef = useInView(0.3);
  const styleRef = useInView(0.2);
  const socialRef = useInView(0.2);
  const fomoRef = useInView(0.3);

  // Live feed ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveFeedIdx(prev => (prev + 1) % LIVE_FEED_ITEMS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Hero entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Check guest limit
  const checkLimit = trpc.guest.checkLimit.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  const uploadMutation = trpc.guest.upload.useMutation();
  const analyzeMutation = trpc.guest.analyze.useMutation();

  const handleFileSelect = useCallback(async (file: File) => {
    if (!fingerprint) return;
    setShowUpload(false);
    setUploading(true);
    setUploadProgress(10);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(30);

      const result = await uploadMutation.mutateAsync({
        fingerprint,
        imageBase64: base64,
      });

      setUploadProgress(60);

      if (result.sessionId) {
        analyzeMutation.mutate(
          { sessionId: result.sessionId, lang: (lang as "he" | "en") || "he" },
          {
            onSuccess: () => {
              setUploadProgress(100);
              setTimeout(() => navigate(`/guest/review/${result.sessionId}`), 500);
            },
            onError: () => {
              setUploadProgress(100);
              setTimeout(() => navigate(`/guest/review/${result.sessionId}`), 500);
            },
          }
        );
        setUploadProgress(80);
      }
    } catch {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [fingerprint, lang, uploadMutation, analyzeMutation, navigate]);

  const openUpload = () => {
    navigate("/try");
  };

  /* ─── Loading overlay ─── */
  if (uploading) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center" style={{ background: BG }}>
        <div className="relative w-24 h-24 mb-8">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: `conic-gradient(${PINK}, ${PURPLE}, ${PINK})`,
              mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            }}
          />
          <div className="absolute inset-3 rounded-full flex items-center justify-center" style={{ background: BG }}>
            <Sparkles className="w-8 h-8" style={{ color: PINK }} />
          </div>
        </div>
        <p className="text-white/90 text-lg font-medium mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          מנתחת את הלוק שלך...
        </p>
        <div className="w-64 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${uploadProgress}%`,
              background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`,
            }}
          />
        </div>
        <p className="text-white/40 text-sm mt-2">{uploadProgress}%</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" dir="rtl" style={{ background: BG, fontFamily: "'Inter', 'Heebo', sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════
          HERO — Full Screen, Visual Dominant
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={heroRef.ref}
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{ minHeight: "100vh" }}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-25 blur-[150px]"
            style={{
              background: `radial-gradient(circle, ${PINK}, transparent 70%)`,
              animation: "glow-pulse 4s ease-in-out infinite",
            }}
          />
          <div
            className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-15 blur-[120px]"
            style={{
              background: `radial-gradient(circle, ${PURPLE}, transparent 70%)`,
              animation: "glow-pulse 4s ease-in-out infinite 2s",
            }}
          />
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/35" />

        {/* Content */}
        <div className={`relative z-10 text-center w-full max-w-2xl mx-auto px-4 transition-all duration-1000 ${heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>

          {/* Minimal top label */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-3 text-white/40 text-xs tracking-widest uppercase">
              <span className="w-6 h-[1px]" style={{ background: `${PINK}60` }} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>GLOW-UP MACHINE</span>
              <span className="w-6 h-[1px]" style={{ background: `${PINK}60` }} />
            </div>
          </div>

          {/* Headline — short and punchy */}
          <h1
            className="text-3xl sm:text-5xl font-extrabold mb-2 leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }}
          >
            מה הציון של הלוק שלך?
          </h1>

          <p className="text-white/40 text-sm sm:text-base mb-5 max-w-sm mx-auto">
            AI שלומד את הסגנון שלך ומשפר אותו בשניות
          </p>

          {/* ── HERO Before/After — DOMINANT VISUAL ── */}
          <div
            className="rounded-2xl overflow-hidden mb-5 shadow-2xl mx-auto"
            style={{
              boxShadow: `0 0 80px ${PINK}20, 0 0 160px ${PURPLE}10`,
              maxWidth: "100%",
            }}
          >
            <img
              src={IMG_HERO}
              alt="לפני ואחרי — שדרוג לוק עם AI"
              className="w-full h-auto"
              loading="eager"
            />
          </div>

          {/* ── SCORE — HUGE + ANIMATED POP ── */}
          <div className="flex items-center justify-center gap-5 mb-5" dir="ltr">
            <div className="text-center score-pop" style={{ animationDelay: "0.3s" }}>
              <div
                className="text-5xl sm:text-7xl font-extrabold"
                style={{ color: "#ff4d4d", fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 0 30px rgba(255,77,77,0.3)" }}
              >
                <ScoreCounter from={0} to={62} duration={1500} trigger={heroRef.inView} />
              </div>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">לפני</span>
            </div>
            <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 score-pop" style={{ color: PINK, animationDelay: "0.5s" }} />
            <div className="text-center score-pop" style={{ animationDelay: "0.7s" }}>
              <div
                className="text-5xl sm:text-7xl font-extrabold"
                style={{ color: "#00ff88", fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 0 30px rgba(0,255,136,0.3)" }}
              >
                <ScoreCounter from={62} to={92} duration={2000} trigger={heroRef.inView} />
              </div>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "#00ff8880" }}>אחרי</span>
            </div>
          </div>

          {/* Hero CTA */}
          <button
            onClick={openUpload}
            className="hero-cta-btn relative font-bold rounded-2xl text-lg px-10 py-4 text-white transition-all duration-300 hover:scale-[1.03]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
            }}
          >
            <span className="relative z-10 flex items-center gap-2 justify-center">
              <Sparkles className="w-5 h-5" />
              נסי את הלוק שלך עכשיו
            </span>
          </button>

          <p className="text-white/25 text-xs mt-3">עד 30 שניות · בחינם · בלי הרשמה</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          LIVE FEED TICKER — FOMO
          ═══════════════════════════════════════════════════════ */}
      <div
        className="py-3 overflow-hidden"
        style={{ background: `linear-gradient(90deg, ${PINK}10, ${PURPLE}10)`, borderTop: `1px solid ${PINK}15`, borderBottom: `1px solid ${PINK}15` }}
      >
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00ff88" }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#00ff88" }} />
          </span>
          <span className="text-white/50 text-xs">LIVE</span>
          <span className="font-medium text-white/90 transition-all duration-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {LIVE_FEED_ITEMS[liveFeedIdx].name} שיפרה{" "}
            <LtrNum>
              <span style={{ color: "#ff4d4d" }}>{LIVE_FEED_ITEMS[liveFeedIdx].from}</span>
              {" → "}
              <span style={{ color: "#00ff88", fontWeight: 700 }}>{LIVE_FEED_ITEMS[liveFeedIdx].to}</span>
            </LtrNum>
            {" 🔥"}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          GAME HOOK — "What's your outfit score?"
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={gameRef.ref}
        className="py-16 px-4"
      >
        <div className={`max-w-lg mx-auto text-center transition-all duration-700 ${gameRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="text-2xl sm:text-4xl font-extrabold mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }}
          >
            איפה את בסקאלה?
          </h2>
          <p className="text-white/40 text-sm mb-8">רוב הבנות מקבלות 60-75. רק 10% מגיעות ל-90+</p>

          {/* Score distribution bars */}
          <div className="flex flex-col gap-3 mb-8">
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: BG_CARD, border: "1px solid rgba(255,255,255,0.05)" }}>
              <LtrNum className="text-2xl font-bold text-white/30 w-16 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>60-75</LtrNum>
              <div className="flex-1">
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full" style={{ width: "75%", background: `linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.25))` }} />
                </div>
              </div>
              <span className="text-sm text-white/40">🔥 רוב הבנות</span>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: BG_CARD, border: `1px solid ${PINK}20` }}>
              <LtrNum className="text-2xl font-bold w-16 text-center" style={{ color: "#00ff88", fontFamily: "'Space Grotesk', sans-serif" }}>90+</LtrNum>
              <div className="flex-1">
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full" style={{ width: "10%", background: `linear-gradient(90deg, #00ff88, ${PURPLE})` }} />
                </div>
              </div>
              <span className="text-sm" style={{ color: "#00ff8890" }}>💎 Top 10%</span>
            </div>
          </div>

          <button
            onClick={openUpload}
            className="font-bold rounded-2xl text-base px-8 py-3.5 text-white transition-all duration-300 hover:scale-[1.03]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              boxShadow: `0 0 20px ${PINK}30`,
            }}
          >
            <span className="flex items-center gap-2 justify-center">
              <Eye className="w-5 h-5" />
              ראי את הציון שלך
            </span>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          STYLE GRID — Before/After Examples
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={styleRef.ref}
        className="py-12 px-4"
        style={{ background: `linear-gradient(180deg, ${BG}, ${BG_CARD}30, ${BG})` }}
      >
        <div className={`max-w-4xl mx-auto transition-all duration-700 ${styleRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="text-xl sm:text-3xl font-bold text-center mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }}
          >
            שדרוגים אחרונים
          </h2>
          <p className="text-center text-white/40 text-xs mb-6">כל לוק עבר ניתוח AI ושודרג</p>

          {/* 2-column grid of before/after cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {BEFORE_AFTER_EXAMPLES.map((ex, i) => (
              <div key={i} className="rounded-xl overflow-hidden relative group" style={{ boxShadow: `0 0 30px ${PINK}10` }}>
                <img
                  src={ex.img}
                  alt={ex.label}
                  className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-center" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
                  <LtrNum className="text-base font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <span style={{ color: "#ff4d4d" }}>{ex.before}</span>
                    <span className="text-white/40 mx-1">→</span>
                    <span style={{ color: "#00ff88" }}>{ex.after}</span>
                  </LtrNum>
                  <p className="text-[10px] text-white/50 mt-0.5">{ex.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Full-width style card grid image */}
          <div className="rounded-2xl overflow-hidden mb-6" style={{ boxShadow: `0 0 40px ${PURPLE}10` }}>
            <img
              src={IMG_GRID}
              alt="דוגמאות לוקים שנותחו ושודרגו"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>

          <div className="text-center">
            <button
              onClick={openUpload}
              className="font-bold rounded-2xl text-base px-8 py-3.5 text-white transition-all duration-300 hover:scale-[1.03]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                boxShadow: `0 0 20px ${PINK}30`,
              }}
            >
              <span className="flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5" />
                תקני את הלוק שלך ב-30 שניות
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SOCIAL PROOF — Compact
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={socialRef.ref}
        className="py-12 px-4"
      >
        <div className={`max-w-4xl mx-auto transition-all duration-700 ${socialRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="text-xl sm:text-2xl font-bold text-center mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }}
          >
            מה אומרות עלינו
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SOCIAL_PROOF.map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl"
                style={{
                  background: BG_CARD,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-current" style={{ color: PINK }} />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-white/80 mb-2 leading-relaxed">"{item.text}"</p>
                <p className="text-[10px] text-white/30">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA — FOMO Close
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={fomoRef.ref}
        className="py-16 px-4 relative"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${PINK}15, transparent 70%)`,
          }}
        />
        <div className={`relative z-10 max-w-lg mx-auto text-center transition-all duration-700 ${fomoRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <Heart className="w-8 h-8 mx-auto mb-3" style={{ color: PINK }} />
          <h2
            className="text-2xl sm:text-4xl font-extrabold mb-3 leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }}
          >
            כולן כבר משדרגות.
          </h2>
          <p className="text-white/40 text-base mb-8">
            את עדיין מנחשת.
          </p>
          <button
            onClick={openUpload}
            className="font-bold rounded-2xl text-lg px-10 py-4 text-white transition-all duration-300 hover:scale-[1.03]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              boxShadow: `0 0 30px ${PINK}40, 0 0 60px ${PURPLE}20`,
            }}
          >
            <span className="flex items-center gap-2 justify-center">
              <Sparkles className="w-5 h-5" />
              בואי נתחיל
            </span>
          </button>
          <p className="text-white/20 text-xs mt-4">חינם לגמרי · בלי הרשמה · בלי כרטיס אשראי</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          STICKY CTA — Fixed bottom, Pulse animation
          ═══════════════════════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-3"
        style={{
          background: `linear-gradient(to top, ${BG}, ${BG}ee, transparent)`,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={openUpload}
          className="sticky-cta w-full max-w-lg mx-auto block py-4 rounded-2xl font-bold text-base text-white"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`,
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            נסי את הלוק שלך עכשיו
          </span>
        </button>
      </div>

      {/* Bottom padding for sticky CTA */}
      <div className="h-24" />

      {/* ─── Upload Modal ─── */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onFileSelect={handleFileSelect}
      />

      {/* ─── CSS Animations ─── */}
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.15; transform: translate(-50%, 0) scale(1); }
          50% { opacity: 0.3; transform: translate(-50%, 0) scale(1.1); }
        }

        /* Score pop animation */
        .score-pop {
          animation: score-pop-in 0.6s ease-out both;
        }
        @keyframes score-pop-in {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }

        /* Sticky CTA pulse */
        .sticky-cta {
          animation: cta-pulse 2s infinite;
        }
        @keyframes cta-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,46,159,0.5); }
          70% { box-shadow: 0 0 0 14px rgba(255,46,159,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,46,159,0); }
        }

        /* Hero CTA glow */
        .hero-cta-btn {
          box-shadow: 0 0 30px ${PINK}40, 0 0 60px ${PURPLE}20;
          animation: hero-cta-glow 3s ease-in-out infinite;
        }
        @keyframes hero-cta-glow {
          0%, 100% { box-shadow: 0 0 30px ${PINK}40, 0 0 60px ${PURPLE}20; }
          50% { box-shadow: 0 0 50px ${PINK}60, 0 0 100px ${PURPLE}30; }
        }
      `}</style>
    </div>
  );
}
