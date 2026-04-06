import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Link, useLocation } from "wouter";
import {
  Star,
  Zap,
  ShoppingBag,
  Sparkles,
  SplitSquareHorizontal,
  Shirt,
  Users,
  Lock,
  Camera,
  MessageCircle,
  Eye,
} from "lucide-react";
import FashionSpinner from "@/components/FashionSpinner";
import AnimatedSection from "@/components/AnimatedSection";
import FeedPromoSection from "@/components/FeedPromoSection";
import ShowcaseSection from "@/components/ShowcaseSection";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n";
import { useFingerprint } from "@/hooks/useFingerprint";
import WhatsAppLogo from "@/components/WhatsAppLogo";

export default function Home() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  const { t, dir, lang } = useLanguage();
  const fingerprint = useFingerprint();
  const trackingRef = useRef(false);
  const trackPageView = trpc.tracking.trackPageView.useMutation();

  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";

  useEffect(() => {
    if (!fingerprint || trackingRef.current) return;
    trackingRef.current = true;
    trackPageView.mutateAsync({
      fingerprint,
      page: "/",
      referrer: document.referrer || undefined,
      screenWidth: window.innerWidth,
    }).catch(() => {});
  }, [fingerprint]);

  const { data: profile, isFetched: profileFetched } = trpc.profile.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    if (isPreview) return;
    if (authLoading) return;
    if (!isAuthenticated && lang === "en") {
      navigate("/en");
      return;
    }
  }, [authLoading, isAuthenticated, lang, navigate, isPreview]);

  useEffect(() => {
    if (isPreview) return;
    if (authLoading || !isAuthenticated) return;
    if (!profileFetched) return;

    const onboarded = !!profile?.onboardingCompleted;
    if (!profile || !onboarded) {
      setRedirecting(true);
      window.location.href = "/onboarding";
    } else {
      setRedirecting(true);
      window.location.href = "/upload";
    }
  }, [authLoading, isAuthenticated, profileFetched, profile, navigate, isPreview]);

  if (!isPreview && (authLoading || (isAuthenticated && !profileFetched) || redirecting)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FashionSpinner size="lg" />
          {isAuthenticated && (
            <p className="text-muted-foreground text-sm">
              {profile?.onboardingCompleted ? `${t("home", "hello")} ${user?.name || ""}! ${t("home", "redirecting")}` : t("common", "loading")}
            </p>
          )}
        </div>
      </div>
    );
  }

  const steps = [
    { num: "01", title: t("home", "step1Title"), desc: t("home", "step1Desc"), icon: MessageCircle },
    { num: "02", title: t("home", "step2Title"), desc: t("home", "step2Desc"), icon: Camera },
    { num: "03", title: t("home", "step3Title"), desc: t("home", "step3Desc"), icon: Zap },
    { num: "04", title: t("home", "step4Title"), desc: t("home", "step4Desc"), icon: Sparkles },
    { num: "05", title: t("home", "step5Title"), desc: t("home", "step5Desc"), icon: Shirt },
    { num: "06", title: t("home", "step6Title"), desc: t("home", "step6Desc"), icon: Users },
  ];

  const features = [
    { icon: Star, title: t("home", "overallScore"), desc: t("home", "scoreCategories") },
    { icon: Zap, title: t("home", "upgradeSuggestions"), desc: t("home", "improvementsCount") },
    { icon: ShoppingBag, title: t("home", "shoppingLinks"), desc: t("home", "fromTopStores") },
    { icon: Sparkles, title: t("home", "outfitSuggestions"), desc: t("home", "completeStylings") },
    { icon: SplitSquareHorizontal, title: t("home", "beforeAfter"), desc: t("home", "beforeAfterDesc") },
    { icon: Shirt, title: t("home", "wardrobeTracking"), desc: t("home", "autoSavedItems") },
    { icon: Users, title: t("home", "communityFeed"), desc: t("home", "shareAndInspire") },
    { icon: Lock, title: t("home", "privacyFirst"), desc: t("home", "privateByDefault") },
  ];

  const testimonials = [
    { name: t("home", "testimonial1Name"), text: t("home", "testimonial1Text"), score: t("home", "testimonial1Score") },
    { name: t("home", "testimonial2Name"), text: t("home", "testimonial2Text"), score: t("home", "testimonial2Score") },
    { name: t("home", "testimonial3Name"), text: t("home", "testimonial3Text"), score: t("home", "testimonial3Score") },
  ];

  const faqs = [
    { q: t("home", "faqWhatsAppQ"), a: t("home", "faqWhatsAppA") },
    { q: t("home", "faq1Q"), a: t("home", "faq1A") },
    { q: t("home", "faq2Q"), a: t("home", "faq2A") },
    { q: t("home", "faq3Q"), a: t("home", "faq3A") },
    { q: t("home", "faq4Q"), a: t("home", "faq4A") },
    { q: t("home", "faq5Q"), a: t("home", "faq5A") },
  ];

  const whatsappMessage = lang === "he" ? "היי! אני רוצה ניתוח אופנתי 👋" : "Hi! I want a fashion analysis 👋";
  const whatsappUrl = `https://wa.me/972526211811?text=${encodeURIComponent(whatsappMessage)}`;

  const trackCtaClick = (target: "whatsapp" | "website", source: "hero" | "final") => {
    if (!fingerprint) return;
    trackPageView.mutateAsync({
      fingerprint,
      page: `/cta/${target}/${lang}/${source}`,
      referrer: window.location.pathname,
      screenWidth: window.innerWidth,
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      {/* Admin Preview Banner */}
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 backdrop-blur-sm text-black text-center py-2 text-sm font-bold flex items-center justify-center gap-3 shadow-lg">
          <Eye className="w-4 h-4" />
          <span>{lang === "he" ? "תצוגה מקדימה — דף נחיתה" : "Preview Mode — Landing Page"}</span>
          <div className="flex items-center gap-1.5">
            <a href="/?preview=1" className={`px-3 py-1 rounded text-xs font-bold ${lang === "he" ? "bg-black text-white" : "bg-black/10 text-black"}`}>עב</a>
            <a href="/en?preview=1" className={`px-3 py-1 rounded text-xs font-bold ${lang === "en" ? "bg-black text-white" : "bg-black/10 text-black"}`}>EN</a>
          </div>
          <a href="/admin" className="px-3 py-1 rounded text-xs font-bold bg-black/10 text-black hover:bg-black/20">
            {lang === "he" ? "← חזרה לניהול" : "← Back to Admin"}
          </a>
        </div>
      )}
      <Navbar />

      {/* ═══════ HERO — Editorial Magazine ═══════ */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-4 relative overflow-hidden">
        {/* Subtle ambient light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px]" />

        <div className="container relative z-10 text-center max-w-4xl mx-auto animate-fade-in-up">
          {/* Editorial label */}
          <p className="editorial-label text-primary mb-8 tracking-[0.25em]">
            {t("home", "aiBadge")}
          </p>

          {/* Massive serif headline */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl mb-8">
            <span className="text-primary italic">
              {t("home", "heroTitle1")}
            </span>
            <br />
            <span className="text-foreground">
              {t("home", "heroTitle2")}
            </span>
          </h1>

          {/* Decorative flourish — Vogue-style ornamental line */}
          <div className="editorial-flourish mb-10">
            <div className="editorial-flourish-line" />
            <div className="editorial-flourish-dot" />
            <div className="editorial-flourish-line" />
          </div>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light tracking-wide leading-relaxed mb-14">
            {t("home", "heroDesc")}
          </p>

          {/* CTA — editorial buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("whatsapp", "hero")}
              className={`btn-whatsapp-primary inline-flex items-center gap-3 w-full sm:w-auto ${dir === "rtl" ? "flex-row-reverse" : ""}`}
            >
              <WhatsAppLogo className="w-5 h-5" />
              {t("home", "whatsappCta")}
            </a>
            <Link
              href="/try"
              onClick={() => trackCtaClick("website", "hero")}
              className={`btn-website-secondary inline-flex items-center gap-2 w-full sm:w-auto ${dir === "rtl" ? "flex-row-reverse" : ""}`}
            >
              <Camera className="w-4 h-4" />
              {t("home", "websiteCta")}
            </Link>
          </div>

          <p className="editorial-label mt-8 text-muted-foreground/40">
            {t("home", "noCreditCard")}
          </p>
        </div>
      </section>

      {/* ═══════ SHOWCASE ═══════ */}
      <ShowcaseSection />

      {/* ═══════ SOCIAL PROOF — Understated editorial stats ═══════ */}
      <AnimatedSection>
        <section className="py-10 md:py-14">
          <div className="container max-w-4xl mx-auto">
            {/* Diamond separator */}
            <div className="editorial-diamond-sep mb-10">
              <div className="editorial-diamond" />
            </div>

            <AnimatedSection stagger staggerDelay={150} className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "10,000+", label: t("home", "statsOutfits") },
                { value: "8.2", label: t("home", "statsAvgScore") },
                { value: "50+", label: t("home", "statsBrands") },
                { value: "4.9★", label: t("home", "statsRating") },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-3xl md:text-4xl text-primary font-light tracking-tight">
                    {stat.value}
                  </p>
                  <p className="editorial-label mt-3">{stat.label}</p>
                </div>
              ))}
            </AnimatedSection>

            <div className="editorial-diamond-sep mt-10">
              <div className="editorial-diamond" />
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ HOW IT WORKS — Editorial numbered steps ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-4xl mx-auto">
            {/* Section header with counter */}
            <div className="text-center mb-12 md:mb-16">
              <p className="editorial-section-num mb-4">I</p>
              <p className="editorial-label text-primary mb-6">{lang === "he" ? "התהליך" : "The Process"}</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl">
                {t("home", "howItWorks")}
              </h2>
            </div>

            {/* Steps — editorial layout with oversized numbers + icons */}
            <AnimatedSection stagger staggerDelay={120} className="space-y-0">
              {steps.map((step) => (
                <div key={step.num} className="editorial-step grid md:grid-cols-[120px_1fr] gap-6 md:gap-10 items-start pt-8 md:pt-12">
                  {/* Oversized number */}
                  <div className="editorial-number flex items-center gap-4">
                    {step.num}
                    <step.icon className="w-5 h-5 text-primary/40" strokeWidth={1.5} />
                  </div>
                  {/* Content */}
                  <div className="pt-2 md:pt-4">
                    <h3 className="text-2xl md:text-3xl mb-4">{step.title}</h3>
                    <p className="text-muted-foreground text-base leading-relaxed max-w-xl">{step.desc}</p>
                  </div>
                </div>
              ))}
            </AnimatedSection>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ WHAT YOU GET — Feature grid with icons ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-5xl mx-auto">
            <div className="editorial-diamond-sep mb-12">
              <div className="editorial-diamond" />
            </div>

            <div className="text-center mb-12 md:mb-16">
              <p className="editorial-section-num mb-4">II</p>
              <p className="editorial-label text-primary mb-6">{lang === "he" ? "מה מקבלים" : "What You Get"}</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl">
                {t("home", "whatYouGet")}
              </h2>
              <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto font-light">
                {lang === "he" ? "פלטפורמת אופנה חכמה — לא רק ציון" : "A complete fashion intelligence platform — not just a score"}
              </p>
            </div>

            <AnimatedSection stagger staggerDelay={100} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/50">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="editorial-feature-card group"
                >
                  <div className="editorial-icon">
                    <item.icon className="w-6 h-6" strokeWidth={1.25} />
                  </div>
                  <h4 className="font-display text-lg mb-3 group-hover:text-primary transition-colors duration-300">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">{item.desc}</p>
                </div>
              ))}
            </AnimatedSection>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ EDITORIAL PULL-QUOTE ═══════ */}
      <AnimatedSection>
        <section className="py-10 md:py-14 px-4">
          <div className="container max-w-3xl mx-auto text-center">
            <div className="editorial-pullquote">
              {lang === "he"
                ? "אופנה היא לא רק מה שאתה לובש — זה איך שאתה מרגיש. ה-AI שלנו עוזר לך למצוא את הסגנון שמבטא אותך."
                : "Fashion is not just what you wear — it's how you feel. Our AI helps you find the style that expresses who you are."}
            </div>
            <div className="editorial-flourish mt-6">
              <div className="editorial-flourish-line" />
              <div className="editorial-flourish-dot" />
              <div className="editorial-flourish-line" />
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ TESTIMONIALS — Editorial quotes with avatars ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-5xl mx-auto">
            <div className="editorial-rule mb-12" />

            <div className="text-center mb-12 md:mb-16">
              <p className="editorial-section-num mb-4">III</p>
              <p className="editorial-label text-primary mb-6">{lang === "he" ? "מה אומרים" : "Voices"}</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl">
                {t("home", "testimonialsTitle")}
              </h2>
            </div>

            <AnimatedSection stagger staggerDelay={200} className="grid md:grid-cols-3 gap-px bg-border/50">
              {testimonials.map((item) => (
                <div key={item.name} className="bg-background p-8 md:p-10 relative editorial-quote">
                  <p className="text-base text-muted-foreground leading-relaxed font-light italic mt-8 mb-8">
                    {item.text}
                  </p>
                  <div className="editorial-rule-accent mb-6" style={{ margin: '0' }} />
                  <div className="flex items-center gap-3 mt-4">
                    <div className="editorial-avatar">
                      {item.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="editorial-label mt-0.5">{lang === "he" ? "ציון" : "Score"}: {item.score}/10</p>
                    </div>
                  </div>
                </div>
              ))}
            </AnimatedSection>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ STYLE FEED PROMO ═══════ */}
      <FeedPromoSection />

      {/* ═══════ FAQ — Editorial accordion ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-3xl mx-auto">
            <div className="editorial-diamond-sep mb-12">
              <div className="editorial-diamond" />
            </div>

            <div className="text-center mb-12">
              <p className="editorial-section-num mb-4">IV</p>
              <h2 className="text-4xl md:text-5xl">
                {t("home", "faqTitle")}
              </h2>
            </div>

            <div className="divide-y divide-border/50">
              {faqs.map((faq, i) => (
                <details key={faq.q} className="group py-6 md:py-8">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-lg font-light tracking-wide">
                    <span className="flex items-center gap-4">
                      <span className="editorial-section-num text-xs">{String(i + 1).padStart(2, '0')}</span>
                      {faq.q}
                    </span>
                    <span className="text-muted-foreground text-2xl font-light transition-transform duration-300 group-open:rotate-45 shrink-0 ml-4">+</span>
                  </summary>
                  <p className="mt-4 text-muted-foreground text-base leading-relaxed font-light max-w-2xl ps-10">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ FINAL CTA — Dramatic editorial closing ═══════ */}
      <section className="section-editorial px-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
        <div className="container max-w-3xl mx-auto text-center relative z-10">
          <div className="editorial-diamond-sep mb-12">
            <div className="editorial-diamond" />
          </div>

          <p className="editorial-label text-primary mb-6">{lang === "he" ? "מוכנים?" : "Ready?"}</p>

          <h2 className="text-4xl md:text-6xl lg:text-7xl mb-8">
            {t("home", "finalCtaTitle")}
          </h2>

          {/* Flourish */}
          <div className="editorial-flourish mb-10">
            <div className="editorial-flourish-line" />
            <div className="editorial-flourish-dot" />
            <div className="editorial-flourish-line" />
          </div>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto font-light leading-relaxed">
            {t("home", "finalCtaDesc")}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 items-center justify-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("whatsapp", "final")}
              className={`btn-whatsapp-primary inline-flex items-center gap-3 w-full sm:w-auto ${dir === "rtl" ? "flex-row-reverse" : ""}`}
            >
              <WhatsAppLogo className="w-5 h-5" />
              {t("home", "finalCtaButton")}
            </a>
            <Link
              href="/try"
              onClick={() => trackCtaClick("website", "final")}
              className={`btn-website-secondary inline-flex items-center gap-2 w-full sm:w-auto ${dir === "rtl" ? "flex-row-reverse" : ""}`}
            >
              <Camera className="w-4 h-4" />
              {t("home", "finalCtaSecondary")}
            </Link>
          </div>

          <p className="editorial-label mt-8 text-muted-foreground/40">{t("home", "finalCtaNote")}</p>
        </div>
      </section>

      {/* ═══════ FOOTER — Minimal editorial ═══════ */}
      <footer className="py-10 md:py-14">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="editorial-diamond-sep mb-12">
            <div className="editorial-diamond" />
          </div>
          <p className="font-display text-lg text-muted-foreground/60 italic mb-6">
            TotalLook.ai
          </p>
          <p className="text-sm text-muted-foreground font-light mb-6">
            {t("home", "footer")}
          </p>
          <div className="flex items-center justify-center gap-6 editorial-label">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {lang === "he" ? "תנאי שימוש" : "Terms"}
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {lang === "he" ? "מדיניות פרטיות" : "Privacy"}
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              {lang === "he" ? "מי אנחנו" : "About"}
            </Link>
            <a href="mailto:eranmalovani@gmail.com" className="hover:text-foreground transition-colors">
              {lang === "he" ? "צור קשר" : "Contact"}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
