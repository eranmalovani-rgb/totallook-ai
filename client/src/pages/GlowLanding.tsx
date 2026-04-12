import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, Camera, Sparkles, Check, TrendingUp, Zap } from "lucide-react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/i18n";

/* ─── Design tokens — TikTok + Zara + Apple ─── */
const PINK = "#FF2E9F";
const PURPLE = "#7B2EFF";
const NEON_GREEN = "#00FF88";
const SCORE_LOW = "#FF4D6A";
const BG = "#0A0A0F";
const BG_CARD = "#12121A";
const BORDER = "rgba(255,255,255,0.06)";

/* ─── CDN Images ─── */
const IMG_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/glow-before-after-1-4xH8Y9JhG57dpaYNXKiwuW.webp";

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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative z-10 w-[90vw] max-w-sm rounded-3xl p-8"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-center mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Upload your look
        </h3>
        <p className="text-white/40 text-sm text-center mb-8">Take a photo or choose from gallery</p>
        <div className="flex gap-4">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${PINK}12, ${PURPLE}12)`, border: `1px solid ${PINK}25` }}
          >
            <Camera className="w-8 h-8" style={{ color: PINK }} />
            <span className="text-sm font-medium text-white/70">Take photo</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${PURPLE}12, ${PINK}12)`, border: `1px solid ${PURPLE}25` }}
          >
            <Upload className="w-8 h-8" style={{ color: PURPLE }} />
            <span className="text-sm font-medium text-white/70">Gallery</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }} />
        <p className="text-center text-[11px] text-white/25 mt-6">Full body photo works best</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main GlowLanding Component
   ═══════════════════════════════════════════════════════ */
export default function GlowLanding() {
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const fingerprint = useFingerprint();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [heroReady, setHeroReady] = useState(false);

  const heroRef = useInView(0.1);
  const valueRef = useInView(0.2);
  const resultRef = useInView(0.2);
  const socialRef = useInView(0.2);
  const fomoRef = useInView(0.3);
  const finalRef = useInView(0.3);

  // Hero entrance
  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 200);
    return () => clearTimeout(t);
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
        <div className="relative w-20 h-20 mb-8">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: `conic-gradient(${PINK}, ${PURPLE}, ${PINK})`,
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            }}
          />
          <div className="absolute inset-3 rounded-full flex items-center justify-center" style={{ background: BG }}>
            <Sparkles className="w-6 h-6" style={{ color: PINK }} />
          </div>
        </div>
        <p className="text-white/90 text-lg font-medium mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Analyzing your outfit...
        </p>
        <div className="w-56 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${uploadProgress}%`, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div dir="ltr" className="min-h-screen overflow-x-hidden" style={{ background: BG, fontFamily: "'Inter', 'Heebo', sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO (Full Screen)
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={heroRef.ref}
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{ minHeight: "100vh" }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full opacity-20 blur-[140px]"
            style={{ background: `radial-gradient(circle, ${PINK}, transparent 70%)`, animation: "ambient 6s ease-in-out infinite" }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]"
            style={{ background: `radial-gradient(circle, ${PURPLE}, transparent 70%)`, animation: "ambient 6s ease-in-out infinite 3s" }}
          />
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Hero content */}
        <div className={`relative z-10 text-center w-full max-w-2xl mx-auto px-5 transition-all duration-1000 ease-out ${heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-6xl font-extrabold mb-3 leading-[1.1] tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }}
          >
            What's your{" "}
            <span style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              outfit score?
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-white/45 text-base sm:text-lg mb-6 max-w-md mx-auto leading-relaxed">
            Upload your look. Get your score. Fix it in seconds.
          </p>

          {/* ── Before/After Visual — DOMINANT ── */}
          <div
            className="relative rounded-2xl overflow-hidden mb-5 mx-auto"
            style={{ boxShadow: `0 0 80px ${PINK}15, 0 20px 60px rgba(0,0,0,0.5)` }}
          >
            <img
              src={IMG_HERO}
              alt="Before and After — AI outfit upgrade"
              className="w-full h-auto"
              loading="eager"
            />
            {/* Score overlay on the visual */}
            <div className="absolute inset-0 flex items-end justify-center pb-4 sm:pb-6 pointer-events-none">
              <div
                className="flex items-center gap-3 sm:gap-5 px-6 py-3 rounded-2xl backdrop-blur-md"
                style={{ background: "rgba(0,0,0,0.6)", border: `1px solid rgba(255,255,255,0.1)` }}
              >
                <span
                  className="text-4xl sm:text-6xl font-extrabold score-pop"
                  style={{ color: SCORE_LOW, fontFamily: "'Space Grotesk', sans-serif", textShadow: `0 0 20px ${SCORE_LOW}40` }}
                >
                  <ScoreCounter from={0} to={62} duration={1500} trigger={heroRef.inView} />
                </span>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 score-pop" style={{ color: "rgba(255,255,255,0.4)", animationDelay: "0.3s" }} />
                <span
                  className="text-4xl sm:text-6xl font-extrabold score-pop"
                  style={{ color: NEON_GREEN, fontFamily: "'Space Grotesk', sans-serif", textShadow: `0 0 20px ${NEON_GREEN}40`, animationDelay: "0.5s" }}
                >
                  <ScoreCounter from={62} to={92} duration={2000} trigger={heroRef.inView} />
                </span>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={openUpload}
            className="cta-main relative font-bold rounded-2xl text-lg px-12 py-4 text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
            }}
          >
            See your score
          </button>

          {/* Secondary proof line */}
          <p className="text-white/30 text-xs sm:text-sm mt-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Most looks score 60–75. Top 10% get 90+.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — INSTANT VALUE
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={valueRef.ref}
        className="py-20 px-5"
      >
        <div className={`max-w-lg mx-auto transition-all duration-700 ${valueRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="text-2xl sm:text-4xl font-extrabold text-center mb-10 text-white leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Your outfit.{" "}
            <span style={{ color: NEON_GREEN }}>Analyzed in seconds.</span>
          </h2>

          {/* 3 bullets only */}
          <div className="flex flex-col gap-4">
            {[
              "Get your outfit score",
              "See what's not working",
              "Get exact fixes and better looks",
            ].map((text, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-5 rounded-2xl"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${PINK}15, ${PURPLE}15)` }}
                >
                  <Check className="w-5 h-5" style={{ color: NEON_GREEN }} />
                </div>
                <span className="text-white/90 text-base font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — RESULT PREVIEW
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={resultRef.ref}
        className="py-20 px-5"
        style={{ background: `linear-gradient(180deg, transparent, ${BG_CARD}40, transparent)` }}
      >
        <div className={`max-w-lg mx-auto transition-all duration-700 ${resultRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="text-2xl sm:text-4xl font-extrabold text-center mb-10 text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            This is what you get
          </h2>

          {/* Example result card */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}`, boxShadow: `0 0 60px ${PINK}08` }}
          >
            {/* Score header */}
            <div className="p-6 pb-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your Score</p>
                <div className="flex items-center gap-3" dir="ltr">
                  <span className="text-3xl font-extrabold" style={{ color: SCORE_LOW, fontFamily: "'Space Grotesk', sans-serif" }}>62</span>
                  <TrendingUp className="w-5 h-5" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <span className="text-3xl font-extrabold" style={{ color: NEON_GREEN, fontFamily: "'Space Grotesk', sans-serif" }}>92</span>
                </div>
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${NEON_GREEN}15, ${NEON_GREEN}05)`, border: `1px solid ${NEON_GREEN}20` }}
              >
                <span className="text-xl font-bold" style={{ color: NEON_GREEN, fontFamily: "'Space Grotesk', sans-serif" }}>A+</span>
              </div>
            </div>

            {/* Analysis details */}
            <div className="p-6 flex flex-col gap-5">
              {/* What's off */}
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What's off</p>
                <div className="flex flex-wrap gap-2">
                  {["Color match", "Fit", "Styling"].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: `${SCORE_LOW}12`, color: SCORE_LOW, border: `1px solid ${SCORE_LOW}20` }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* How to improve */}
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>How to improve</p>
                <div className="flex flex-wrap gap-2">
                  {["Black pants", "Cleaner shoes", "Add jacket"].map((fix) => (
                    <span
                      key={fix}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: `${NEON_GREEN}10`, color: NEON_GREEN, border: `1px solid ${NEON_GREEN}18` }}
                    >
                      {fix}
                    </span>
                  ))}
                </div>
              </div>

              {/* New score */}
              <div className="pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between">
                  <p className="text-white/40 text-xs uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>New score</p>
                  <span className="text-2xl font-extrabold" style={{ color: NEON_GREEN, fontFamily: "'Space Grotesk', sans-serif" }}>92</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <button
              onClick={openUpload}
              className="font-bold rounded-2xl text-base px-10 py-3.5 text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                boxShadow: `0 0 25px ${PINK}25`,
              }}
            >
              Try it on your outfit
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — SOCIAL PROOF
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={socialRef.ref}
        className="py-20 px-5"
      >
        <div className={`max-w-lg mx-auto transition-all duration-700 ${socialRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-center mb-10 text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Why girls keep using it
          </h2>

          <div className="flex flex-col gap-4">
            {[
              { quote: "I didn't know what was wrong until this showed me.", name: "Noa" },
              { quote: "It literally fixed my outfit in seconds.", name: "Maya" },
              { quote: "I'm obsessed with checking my score.", name: "Dana" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
              >
                <p className="text-white/80 text-base leading-relaxed mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                  "{item.quote}"
                </p>
                <p className="text-white/25 text-sm">— {item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — FOMO
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={fomoRef.ref}
        className="py-24 px-5"
        style={{ background: BG_CARD }}
      >
        <div className={`max-w-lg mx-auto text-center transition-all duration-700 ${fomoRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Everyone is upgrading their look.
          </h2>
          <p
            className="text-xl sm:text-2xl font-medium"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            You're still guessing.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — FINAL CTA
          ═══════════════════════════════════════════════════════ */}
      <section
        ref={finalRef.ref}
        className="py-24 px-5 relative"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: `radial-gradient(circle, ${PINK}, transparent 70%)` }}
          />
        </div>

        <div className={`relative z-10 max-w-lg mx-auto text-center transition-all duration-700 ${finalRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2
            className="text-3xl sm:text-5xl font-extrabold mb-3 text-white leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Try it on your outfit now
          </h2>
          <p className="text-white/35 text-lg mb-10">
            Takes 5 seconds.
          </p>
          <button
            onClick={openUpload}
            className="cta-main font-bold rounded-2xl text-lg px-14 py-4 text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
            }}
          >
            See your score
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          STICKY CTA — Mobile
          ═══════════════════════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:hidden"
        style={{
          background: `linear-gradient(to top, ${BG}, ${BG}ee, transparent)`,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={openUpload}
          className="sticky-cta w-full py-4 rounded-2xl font-bold text-base text-white"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`,
          }}
        >
          See your score
        </button>
      </div>

      {/* Bottom padding for sticky CTA on mobile */}
      <div className="h-20 sm:hidden" />

      {/* ─── Upload Modal ─── */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onFileSelect={handleFileSelect}
      />

      {/* ─── CSS Animations ─── */}
      <style>{`
        @keyframes ambient {
          0%, 100% { opacity: 0.15; transform: translate(-50%, 0) scale(1); }
          50% { opacity: 0.25; transform: translate(-50%, 0) scale(1.08); }
        }

        .score-pop {
          animation: pop 0.6s ease-out both;
        }
        @keyframes pop {
          0% { transform: scale(0.7); opacity: 0; }
          50% { transform: scale(1.08); }
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
          0% { box-shadow: 0 0 0 0 rgba(255,46,159,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(255,46,159,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,46,159,0); }
        }
      `}</style>
    </div>
  );
}
