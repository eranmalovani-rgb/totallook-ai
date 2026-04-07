import Navbar from "@/components/Navbar";
import { Link } from "wouter";
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
  Eye,
  MessageCircle,
} from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import FeedPromoSection from "@/components/FeedPromoSection";
import ShowcaseSection from "@/components/ShowcaseSection";
import { useEffect, useRef } from "react";
import { useLanguage } from "@/i18n";
import { useFingerprint } from "@/hooks/useFingerprint";
import { trpc } from "@/lib/trpc";
import WhatsAppLogo from "@/components/WhatsAppLogo";

export default function LandingEN() {
  const { setLang } = useLanguage();
  const fingerprint = useFingerprint();
  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
  const trackingRef = useRef(false);
  const trackPageView = trpc.tracking.trackPageView.useMutation();
  const whatsappMessage = "Hi! I want a fashion analysis 👋";
  const whatsappUrl = `https://wa.me/972526211811?text=${encodeURIComponent(whatsappMessage)}`;

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

  const steps = [
    { num: "01", title: "Send a photo on WhatsApp", desc: "Tap the button and send a photo of your look. That's it.", icon: MessageCircle },
    { num: "02", title: "Get a full analysis", desc: "Within minutes, get a score, item detection, and upgrade recommendations.", icon: Zap },
    { num: "03", title: "Shop the recommendations", desc: "Get direct links to stores with the suggested products.", icon: ShoppingBag },
    { num: "04", title: "Register once (optional)", desc: "Want deeper personalization? Register once and unlock the full personalized experience.", icon: Sparkles },
    { num: "05", title: "Fix My Look", desc: "AI generates an upgraded preview of your outfit with the selected recommendations.", icon: Shirt },
    { num: "06", title: "Build a smart wardrobe", desc: "Your detected items are saved automatically for smarter recommendations over time.", icon: Users },
  ];

  const features = [
    { icon: Star, title: "Style Score", desc: "Get rated 1-10 across fit, color, style, and occasion" },
    { icon: Zap, title: "Smart Upgrades", desc: "AI suggests specific improvements with reasoning" },
    { icon: ShoppingBag, title: "Shop the Look", desc: "Direct links to buy recommended items from top stores" },
    { icon: Sparkles, title: "Outfit Ideas", desc: "Complete outfit suggestions based on your style and wardrobe" },
    { icon: SplitSquareHorizontal, title: "Before & After", desc: "See AI-generated visualization of your upgraded look" },
    { icon: Shirt, title: "Virtual Wardrobe", desc: "3D animated closet with categories, search, and outfit builder" },
    { icon: Users, title: "Style Community", desc: "Share looks, browse trends, like and comment on outfits" },
    { icon: Lock, title: "Privacy First", desc: "Your analysis is private by default — share only if you choose" },
  ];

  const testimonials = [
    { name: "Alex M.", text: "I used to spend 30 minutes deciding what to wear. Now I just snap a photo and TotalLook tells me exactly what works and what doesn't.", score: "8.7" },
    { name: "Sarah K.", text: "The virtual wardrobe is a game changer. I can see all my clothes organized by category and build outfits without opening my closet.", score: "9.1" },
    { name: "David R.", text: "The shopping suggestions are spot on. It recommended a jacket that perfectly matched my existing wardrobe. Saved me from buying random stuff.", score: "8.4" },
  ];

  const faqs = [
    { q: "How does the WhatsApp analysis work?", a: "Just send a photo of your outfit to our WhatsApp number. Within minutes you'll receive a full analysis with score, item identification, improvement tips, and shopping links. No app download or signup needed." },
    { q: "Is TotalLook really free?", a: "Yes! TotalLook is free for personal use. Upload unlimited outfits, get AI analysis, build your wardrobe, and join the community — all at no cost." },
    { q: "How accurate is the AI analysis?", a: "Our AI detects brands, colors, fit, and style with high accuracy. It recognizes 50+ fashion brands and provides detailed category scores. The more you use it, the more personalized it gets." },
    { q: "Is my data private?", a: "Absolutely. Your photos and analysis are private by default. Nothing is shared unless you explicitly choose to post to the Style Feed. You can delete your data at any time." },
    { q: "What kind of outfits work best?", a: "Full-body photos in good lighting work best. Casual, streetwear, smart casual, formal — any style works. The AI adapts to your context and occasion." },
    { q: "Can I use it on mobile?", a: "Yes! TotalLook is fully mobile-optimized. Snap a photo directly from your camera or upload from your gallery." },
  ];

  const trackCtaClick = (target: "whatsapp" | "website", source: "hero" | "final") => {
    if (!fingerprint) return;
    trackPageView.mutateAsync({
      fingerprint,
      page: `/cta/${target}/en/${source}`,
      referrer: window.location.pathname,
      screenWidth: window.innerWidth,
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="ltr">
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
      <Navbar />

      {/* ═══════ HERO — Editorial Magazine ═══════ */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px]" />

        <div className="container relative z-10 text-center max-w-4xl mx-auto animate-fade-in-up">
          <p className="editorial-label text-primary mb-8 tracking-[0.25em]">
            AI-Powered Fashion Analysis
          </p>

          <h1 className="text-6xl md:text-8xl lg:text-9xl mb-8">
            <span className="text-primary italic">Your Personal Stylist</span>
            <br />
            <span className="text-foreground">Awaits You on WhatsApp</span>
          </h1>

          {/* Decorative flourish */}
          <div className="editorial-flourish mb-10">
            <div className="editorial-flourish-line" />
            <div className="editorial-flourish-dot" />
            <div className="editorial-flourish-line" />
          </div>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light tracking-wide leading-relaxed mb-14">
            Send a photo on WhatsApp and get a complete fashion analysis with score,
            improvement tips, and shopping links. In minutes. For free.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("whatsapp", "hero")}
              className="btn-whatsapp-primary inline-flex items-center gap-3 w-full sm:w-auto"
            >
              <WhatsAppLogo className="w-5 h-5" />
              Send a photo on WhatsApp — Start now
            </a>
            <Link
              href="/try"
              onClick={() => trackCtaClick("website", "hero")}
              className="btn-website-secondary inline-flex items-center gap-2 w-full sm:w-auto"
            >
              <Camera className="w-4 h-4" />
              Or upload a photo on the website
            </Link>
          </div>

          <p className="editorial-label mt-8 text-muted-foreground/40">
            No signup · No payment · Instant results
          </p>
        </div>
      </section>

      {/* ═══════ SHOWCASE ═══════ */}
      <ShowcaseSection />

      {/* ═══════ SOCIAL PROOF ═══════ */}
      <AnimatedSection>
        <section className="py-10 md:py-14">
          <div className="container max-w-4xl mx-auto">
            <div className="editorial-diamond-sep mb-10">
              <div className="editorial-diamond" />
            </div>

            <AnimatedSection stagger staggerDelay={150} className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "10,000+", label: "Outfits Analyzed" },
                { value: "8.2", label: "Average Score" },
                { value: "50+", label: "Brands Detected" },
                { value: "4.9★", label: "User Rating" },
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

      {/* ═══════ HOW IT WORKS ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-4xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <p className="editorial-section-num mb-4">I</p>
              <p className="editorial-label text-primary mb-6">The Process</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl">How It Works</h2>
            </div>

            <AnimatedSection stagger staggerDelay={120} className="space-y-0">
              {steps.map((step) => (
                <div key={step.num} className="editorial-step grid md:grid-cols-[120px_1fr] gap-6 md:gap-10 items-start pt-8 md:pt-12">
                  <div className="editorial-number flex items-center gap-4">
                    {step.num}
                    <step.icon className="w-5 h-5 text-primary/40" strokeWidth={1.5} />
                  </div>
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

      {/* ═══════ WHAT YOU GET ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-5xl mx-auto">
            <div className="editorial-diamond-sep mb-12">
              <div className="editorial-diamond" />
            </div>

            <div className="text-center mb-12 md:mb-16">
              <p className="editorial-section-num mb-4">II</p>
              <p className="editorial-label text-primary mb-6">Everything You Get</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl">
                A Complete Fashion Platform
              </h2>
              <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto font-light">
                Not just a score — a full intelligence suite for your style
              </p>
            </div>

            <AnimatedSection stagger staggerDelay={100} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/50">
              {features.map((item) => (
                <div key={item.title} className="editorial-feature-card group">
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
              Fashion is not just what you wear — it's how you feel. Our AI helps you find the style that expresses who you are.
            </div>
            <div className="editorial-flourish mt-6">
              <div className="editorial-flourish-line" />
              <div className="editorial-flourish-dot" />
              <div className="editorial-flourish-line" />
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-5xl mx-auto">
            <div className="editorial-rule mb-12" />

            <div className="text-center mb-12 md:mb-16">
              <p className="editorial-section-num mb-4">III</p>
              <p className="editorial-label text-primary mb-6">Voices</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl">
                What People Are Saying
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
                      <p className="editorial-label mt-0.5">Score: {item.score}/10</p>
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

      {/* ═══════ FAQ ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-3xl mx-auto">
            <div className="editorial-diamond-sep mb-12">
              <div className="editorial-diamond" />
            </div>

            <div className="text-center mb-12">
              <p className="editorial-section-num mb-4">IV</p>
              <h2 className="text-4xl md:text-5xl">Frequently Asked Questions</h2>
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

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="section-editorial px-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
        <div className="container max-w-3xl mx-auto text-center relative z-10">
          <div className="editorial-diamond-sep mb-12">
            <div className="editorial-diamond" />
          </div>

          <p className="editorial-label text-primary mb-6">Ready?</p>

          <h2 className="text-4xl md:text-6xl lg:text-7xl mb-8">Ready to upgrade your style?</h2>

          <div className="editorial-flourish mb-10">
            <div className="editorial-flourish-line" />
            <div className="editorial-flourish-dot" />
            <div className="editorial-flourish-line" />
          </div>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto font-light leading-relaxed">
            Join thousands of people who use AI to dress better every day. It takes 30 seconds to get your first analysis.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 items-center justify-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("whatsapp", "final")}
              className="btn-whatsapp-primary inline-flex items-center gap-3 w-full sm:w-auto"
            >
              <WhatsAppLogo className="w-5 h-5" />
              Send a photo on WhatsApp
            </a>
            <Link
              href="/try"
              onClick={() => trackCtaClick("website", "final")}
              className="btn-website-secondary inline-flex items-center gap-2 w-full sm:w-auto"
            >
              <Camera className="w-4 h-4" />
              Or upload on the website
            </Link>
          </div>

          <p className="editorial-label mt-8 text-muted-foreground/40">No credit card. No spam. Just better style.</p>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="py-10 md:py-14">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="editorial-diamond-sep mb-12">
            <div className="editorial-diamond" />
          </div>
          <p className="font-display text-lg text-muted-foreground/60 italic mb-6">
            TotalLook.ai
          </p>
          <p className="text-sm text-muted-foreground font-light mb-6">
            AI-Powered Fashion Analysis
          </p>
          <div className="flex items-center justify-center gap-6 editorial-label">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <a href="mailto:eranmalovani@gmail.com" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
