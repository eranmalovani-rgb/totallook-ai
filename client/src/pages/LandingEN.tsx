import { Link } from "wouter";
import {
  Camera,
  Upload,
  Star,
  Sparkles,
  Zap,
  ArrowRight,
  ChevronDown,
  Eye,
  Lock,
  TrendingUp,
  MessageCircle,
  Smartphone,
  Send,
} from "lucide-react";
import LandingBeforeAfterSlider from "@/components/LandingBeforeAfterSlider";
import AnimatedSection from "@/components/AnimatedSection";
import { useEffect, useRef } from "react";
import { useLanguage } from "@/i18n";
import { useFingerprint } from "@/hooks/useFingerprint";
import { trpc } from "@/lib/trpc";

/* ── Before/After showcase data ── */
const HERO_SHOWCASE = {
  beforeImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/landing-before-casual-Dd22cGqT4oLpLDBsvBPXEF.webp",
  afterImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/landing-after-casual-dwXNkJDRs4Cf63hVniD2zC.webp",
  scoreBefore: 6.2,
  scoreAfter: 9.2,
};

const MORE_SHOWCASES = [
  {
    beforeImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/landing-before-smart-Jk58pvD5re72XkY6Xx5Bbt.webp",
    afterImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/landing-after-smart-c6jhFBAQnG5THWTM9Sczsm.webp",
    scoreBefore: 6.8,
    scoreAfter: 9.1,
  },
  {
    beforeImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/landing-before-evening-Qiek7Mvh5Vj9ZxT7Dpd4qL.webp",
    afterImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/landing-after-evening-iknj26ZVXw9MWgyquk6T74.webp",
    scoreBefore: 7.0,
    scoreAfter: 9.4,
  },
];

export default function LandingEN() {
  const { setLang } = useLanguage();
  const fingerprint = useFingerprint();
  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
  const trackingRef = useRef(false);
  const trackPageView = trpc.tracking.trackPageView.useMutation();

  useEffect(() => {
    setLang("en");
  }, [setLang]);

  useEffect(() => {
    if (!fingerprint || trackingRef.current) return;
    trackingRef.current = true;
    trackPageView.mutateAsync({
      fingerprint,
      page: "/en",
      referrer: document.referrer || undefined,
      screenWidth: window.innerWidth,
    }).catch(() => {});
  }, [fingerprint]);

  const trackCtaClick = (source: string) => {
    if (!fingerprint) return;
    trackPageView.mutateAsync({
      fingerprint,
      page: `/cta/upload/en/${source}`,
      referrer: window.location.pathname,
      screenWidth: window.innerWidth,
    }).catch(() => {});
  };

  const uploadHref = "/try";

  const testimonials = [
    { text: "I'm obsessed. This changed how I approach getting dressed.", name: "Noa, 22", emoji: "🔥" },
    { text: "I didn't know what was off until this showed me.", name: "Shira, 19", emoji: "💡" },
    { text: "This actually fixed my outfit. Insane.", name: "Maya, 24", emoji: "✨" },
    { text: "Like having a personal stylist on my phone.", name: "Dana, 20", emoji: "👗" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" dir="ltr">
      {/* Admin Preview Banner */}
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 backdrop-blur-sm text-black text-center py-2 text-sm font-bold flex items-center justify-center gap-3 shadow-lg">
          <Eye className="w-4 h-4" />
          <span>Preview Mode — Landing Page</span>
          <div className="flex items-center gap-1.5">
            <a href="/?preview=1" className="px-3 py-1 rounded text-xs font-bold bg-black/10 text-black">עב</a>
            <a href="/en?preview=1" className="px-3 py-1 rounded text-xs font-bold bg-black text-white">EN</a>
          </div>
          <a href="/admin" className="px-3 py-1 rounded text-xs font-bold bg-black/10 text-black hover:bg-black/20">
            ← Back to Admin
          </a>
        </div>
      )}

      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center px-4 pt-8 pb-24 md:pb-16">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-amber-600/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="container relative z-10 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <span className="text-xl md:text-2xl font-bold tracking-tight">
              <span className="text-amber-400">TotalLook</span><span className="text-foreground/60">.ai</span>
            </span>
            <Link
              href={uploadHref}
              onClick={() => trackCtaClick("hero-nav")}
              className="text-xs md:text-sm text-amber-400/80 hover:text-amber-300 transition-colors flex items-center gap-1.5"
            >
              Start now
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-center md:text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-300/80 font-medium tracking-wide">AI Personal Stylist</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
                <span className="text-foreground">This outfit is a </span>
                <span className="text-amber-500/60 line-through decoration-amber-500/30">62</span>
                <br />
                <span className="text-foreground">Let's make it a </span>
                <span className="text-amber-400 font-extrabold">92</span>
              </h1>

              <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto md:mx-0 leading-relaxed mb-8">
                Upload your look. Get a score. Upgrade your style in seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <Link
                  href={uploadHref}
                  onClick={() => trackCtaClick("hero")}
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-base md:text-lg transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Upload className="w-5 h-5" />
                  Upload your outfit
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <span className="text-muted-foreground/30 text-xs">or</span>

                <a
                  href="https://wa.me/972526211811?text=Hi!%20%F0%9F%91%8B"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackCtaClick("hero-whatsapp")}
                  className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send via WhatsApp
                </a>
              </div>

              <p className="text-xs text-muted-foreground/40 mt-4 flex items-center justify-center md:justify-start gap-1.5">
                <Lock className="w-3 h-3" />
                No signup · Free · 100% private
              </p>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                {/* BEFORE */}
                <div className="relative rounded-2xl overflow-hidden border border-red-500/15 shadow-xl">
                  <img src={HERO_SHOWCASE.beforeImg} alt="Before" className="w-full aspect-[3/4] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
                    <span className="text-xs font-bold text-red-400">BEFORE</span>
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-3xl font-bold text-red-400">{HERO_SHOWCASE.scoreBefore}</span>
                    <span className="text-[10px] text-red-300/60 font-medium">score</span>
                  </div>
                </div>
                {/* AFTER */}
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/15 shadow-xl">
                  <img src={HERO_SHOWCASE.afterImg} alt="After" className="w-full aspect-[3/4] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
                    <span className="text-xs font-bold text-emerald-400">AFTER</span>
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-3xl font-bold text-emerald-400">{HERO_SHOWCASE.scoreAfter}</span>
                    <span className="text-[10px] text-emerald-300/60 font-medium">score</span>
                  </div>
                </div>
              </div>
              {/* Arrow between */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm border border-amber-500/20 shadow-lg flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-amber-400" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm border border-amber-500/20 shadow-lg">
                <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  +{(HERO_SHOWCASE.scoreAfter - HERO_SHOWCASE.scoreBefore).toFixed(1)} points
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-12 md:mt-16 animate-bounce">
            <ChevronDown className="w-5 h-5 text-muted-foreground/30" />
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <AnimatedSection>
        <section className="py-16 md:py-24 px-4">
          <div className="container max-w-4xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <p className="text-xs text-amber-400/60 tracking-[0.2em] uppercase font-medium mb-4">How it works</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">Three steps. That's it.</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {[
                { num: "01", icon: Camera, title: "Upload your outfit", desc: "Take a photo or pick from gallery" },
                { num: "02", icon: Star, title: "Get your score", desc: "AI analyzes every item and gives a detailed score" },
                { num: "03", icon: Zap, title: "Fix it instantly", desc: "Get specific recommendations + shopping links" },
              ].map((step) => (
                <div
                  key={step.num}
                  className="relative group text-center p-6 md:p-8 rounded-2xl border border-amber-500/10 bg-gradient-to-b from-amber-500/[0.03] to-transparent hover:border-amber-500/20 transition-all duration-300"
                >
                  <div className="text-5xl md:text-6xl font-bold text-amber-500/10 absolute top-4 left-4 pointer-events-none">{step.num}</div>
                  <div className="relative z-10 w-14 h-14 mx-auto mb-5 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/15 transition-colors">
                    <step.icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 relative z-10">{step.title}</h3>
                  <p className="text-sm text-muted-foreground relative z-10">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ RESULTS PREVIEW ═══════ */}
      <AnimatedSection>
        <section className="py-16 md:py-24 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="container max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-12 md:mb-16">
              <p className="text-xs text-amber-400/60 tracking-[0.2em] uppercase font-medium mb-4">What you get</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Not just a score — a full upgrade plan</h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto">Here's what your result looks like after uploading a photo</p>
            </div>

            <div className="max-w-lg mx-auto rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.04] to-background/80 backdrop-blur-sm overflow-hidden shadow-xl shadow-amber-500/5">
              <div className="p-6 text-center border-b border-amber-500/10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-amber-500/30 mb-3">
                  <span className="text-3xl font-bold text-amber-400">8.7</span>
                </div>
                <p className="text-sm text-amber-300/60 font-medium">Your look score</p>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { icon: "🎯", label: "Detailed analysis per item" },
                  { icon: "⚡", label: "Specific upgrade suggestions" },
                  { icon: "👗", label: "Full alternative looks" },
                  { icon: "🛍️", label: "Direct shopping links" },
                  { icon: "🤳", label: "Visual before / after" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-foreground/80">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="p-6 pt-2">
                <Link
                  href={uploadHref}
                  onClick={() => trackCtaClick("results-preview")}
                  className="block w-full text-center py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-sm hover:bg-amber-500/15 transition-colors"
                >
                  I want to see mine →
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-12">
              {MORE_SHOWCASES.map((item, i) => (
                <div key={i} className="relative">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                    <div className="relative">
                      <img src={item.beforeImg} alt="Before" className="w-full aspect-[3/4] object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl" />
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
                        <span className="text-[10px] font-bold text-red-400">BEFORE</span>
                      </div>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                        <span className="text-2xl font-bold text-red-400">{item.scoreBefore}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <img src={item.afterImg} alt="After" className="w-full aspect-[3/4] object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl" />
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
                        <span className="text-[10px] font-bold text-emerald-400">AFTER</span>
                      </div>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                        <span className="text-2xl font-bold text-emerald-400">{item.scoreAfter}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm border border-amber-500/20 shadow-lg flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-center mt-3">
                    <span className="text-xs font-bold text-amber-400">
                      +{(item.scoreAfter - item.scoreBefore).toFixed(1)} points
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ SOCIAL PROOF ═══════ */}
      <AnimatedSection>
        <section className="py-16 md:py-24 px-4">
          <div className="container max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs text-amber-400/60 tracking-[0.2em] uppercase font-medium mb-4">What people say</p>
              <h2 className="text-3xl md:text-4xl font-bold">They're already upgrading</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {testimonials.map((item, i) => (
                <div key={i} className="p-5 rounded-2xl border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.03] to-transparent hover:border-amber-500/20 transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="text-sm text-foreground/90 leading-relaxed mb-3">"{item.text}"</p>
                      <p className="text-xs text-amber-400/60 font-medium">— {item.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-12 text-center">
              {[
                { value: "10,000+", label: "Looks analyzed" },
                { value: "8.2", label: "Avg score" },
                { value: "4.9★", label: "Rating" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl md:text-3xl font-bold text-amber-400">{stat.value}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ FOMO ═══════ */}
      <section className="py-16 md:py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.06] via-amber-600/[0.04] to-amber-500/[0.06]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

        <div className="container max-w-3xl mx-auto text-center relative z-10">
          <p className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Everyone is upgrading their look.<br />
            <span className="text-amber-400/60">You're still guessing.</span>
          </p>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-8">
            Takes 5 seconds to find out your score
          </p>
          <Link
            href={uploadHref}
            onClick={() => trackCtaClick("fomo")}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-base transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="w-5 h-5" />
            Let's check
          </Link>
        </div>
      </section>

      {/* ═══════ WHATSAPP — Alternative Analysis Method ═══════ */}
      <AnimatedSection>
        <section className="py-16 md:py-24 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="container max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-10">
              <p className="text-xs text-emerald-400/60 tracking-[0.2em] uppercase font-medium mb-4">
                Another way
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Prefer <span className="text-emerald-400">WhatsApp</span>?
              </h2>
              <p className="text-base text-muted-foreground max-w-lg mx-auto">
                Send a photo of your outfit on WhatsApp and get a full analysis in minutes
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <a
                href="https://wa.me/972526211811?text=Hi!%20%F0%9F%91%8B"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCtaClick("whatsapp")}
                className="group block rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-emerald-500/[0.02] hover:border-emerald-500/30 hover:from-emerald-500/[0.1] transition-all duration-300 overflow-hidden"
              >
                <div className="p-6 pb-4 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <MessageCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Fashion Analysis via WhatsApp
                  </h3>
                </div>

                <div className="px-6 pb-2 space-y-3">
                  {[
                    { icon: Send, text: "Send a message with Hi 👋" },
                    { icon: Camera, text: "Attach a photo of your outfit" },
                    { icon: Sparkles, text: "Get full analysis + recommendations" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <step.icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-foreground/80">{step.text}</span>
                    </div>
                  ))}
                </div>

                <div className="p-6 pt-5">
                  <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-emerald-500 group-hover:bg-emerald-400 text-white font-bold text-sm transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    Open WhatsApp Chat
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </a>

              <p className="text-center text-xs text-muted-foreground/40 mt-4 flex items-center justify-center gap-1.5">
                <Smartphone className="w-3 h-3" />
                Number: 052-621-1811
              </p>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="py-20 md:py-28 px-4 relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="container max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            Try it on your outfit.<br />
            <span className="text-amber-400">Takes 5 seconds.</span>
          </h2>

          <Link
            href={uploadHref}
            onClick={() => trackCtaClick("final")}
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="w-5 h-5" />
            Upload your outfit
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="text-xs text-muted-foreground/40 mt-6 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" />
            No signup · Free · 100% private
          </p>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="py-10 border-t border-amber-500/5">
        <div className="container max-w-5xl mx-auto text-center">
          <p className="text-lg font-bold text-muted-foreground/40 mb-4">
            <span className="text-amber-400/40">TotalLook</span>.ai
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground/40">
            <Link href="/terms" className="hover:text-foreground/60 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground/60 transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-foreground/60 transition-colors">About</Link>
            <a href="mailto:eranmalovani@gmail.com" className="hover:text-foreground/60 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* ═══════ STICKY MOBILE CTA ═══════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-3 bg-background/95 backdrop-blur-md border-t border-amber-500/10 safe-area-bottom">
        <Link
          href={uploadHref}
          onClick={() => trackCtaClick("sticky")}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm shadow-[0_-4px_20px_rgba(245,158,11,0.2)]"
        >
          <Upload className="w-4 h-4" />
          Upload your outfit
        </Link>
      </div>
    </div>
  );
}
