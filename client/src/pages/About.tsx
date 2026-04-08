import Navbar from "@/components/Navbar";
import { useLanguage } from "@/i18n";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Camera,
  Zap,
  Shirt,
  Palette,
  GraduationCap,
  Briefcase,
  Heart,
  Target,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import AnimatedSection from "@/components/AnimatedSection";
import { useEffect } from "react";

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { lang, dir, t } = useLanguage();
  const ArrowIcon = lang === "he" ? ArrowLeft : ArrowRight;

  const features = [
    {
      icon: Zap,
      title: t("about", "feature1Title"),
      desc: t("about", "feature1Desc"),
    },
    {
      icon: Target,
      title: t("about", "feature2Title"),
      desc: t("about", "feature2Desc"),
    },
    {
      icon: Shirt,
      title: t("about", "feature3Title"),
      desc: t("about", "feature3Desc"),
    },
    {
      icon: Palette,
      title: t("about", "feature4Title"),
      desc: t("about", "feature4Desc"),
    },
  ];

  const founderHighlights = [
    {
      icon: GraduationCap,
      text:
        lang === "he"
          ? "אוניברסיטת תל אביב — ניהול + משפטים | הרוורד"
          : "Tel Aviv University — Management + Law | Harvard",
    },
    {
      icon: Briefcase,
      text:
        lang === "he"
          ? 'יו"ר עדיקה סטייל | דירקטורית בגולף וכלל תעשיות'
          : "Chair of Adika Style | Director at Golf & Co, Clal Industries",
    },
    {
      icon: Heart,
      text:
        lang === "he"
          ? "משלבת אופנה, טכנולוגיה ועסקים ליצירת חוויה חדשה"
          : "Combining fashion, tech & business to create a new experience",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      {/* ═══════ HEADER ═══════ */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16 px-4 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[100px]" />

        <div className="container relative z-10 max-w-3xl mx-auto">
          {/* Back link */}
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 mb-8 text-muted-foreground hover:text-foreground"
            >
              <ArrowIcon className="w-4 h-4 rotate-180" />
              {t("about", "backHome")}
            </Button>
          </Link>

          {/* Title */}
          <div className="text-center">
            <p className="editorial-label text-primary mb-6 tracking-[0.25em]">
              TOTALLOOK.AI
            </p>
            <h1 className="text-5xl md:text-7xl mb-6">
              <span className="text-primary italic">
                {t("about", "pageTitle")}
              </span>
            </h1>
            <div className="editorial-flourish mb-8">
              <div className="editorial-flourish-line" />
              <div className="editorial-flourish-dot" />
              <div className="editorial-flourish-line" />
            </div>
            <p className="text-lg md:text-xl text-muted-foreground font-light tracking-wide max-w-xl mx-auto">
              {t("about", "tagline")}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ OUR STORY ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-3xl mx-auto">
            <div className="editorial-diamond-sep mb-10">
              <div className="editorial-diamond" />
            </div>

            <div className="text-center mb-10">
              <p className="editorial-section-num mb-4">I</p>
              <p className="editorial-label text-primary mb-4">
                {t("about", "storyTitle")}
              </p>
            </div>

            <div className="space-y-6 text-center max-w-2xl mx-auto">
              <p className="text-lg text-foreground/90 leading-relaxed">
                {t("about", "storyP1")}
              </p>
              <p className="text-lg text-foreground/90 leading-relaxed">
                {t("about", "storyP2")}
              </p>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ WHAT WE DO ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="editorial-section-num mb-4">II</p>
              <p className="editorial-label text-primary mb-4">
                {t("about", "whatWeDoTitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="group relative p-6 border border-border/50 rounded-sm hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start gap-4" dir={dir}>
                    <div className="w-10 h-10 rounded-sm bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium mb-2 text-foreground">
                        {f.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ FOUNDER ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-3xl mx-auto">
            <div className="editorial-diamond-sep mb-10">
              <div className="editorial-diamond" />
            </div>

            <div className="text-center mb-10">
              <p className="editorial-section-num mb-4">III</p>
              <p className="editorial-label text-primary mb-4">
                {t("about", "founderTitle")}
              </p>
            </div>

            {/* Founder card */}
            <div className="border border-border/50 rounded-sm p-8 md:p-10 text-center">
              {/* Name with star accent */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <Star className="w-4 h-4 text-primary/40" />
                <h2 className="text-3xl md:text-4xl text-primary italic">
                  {t("about", "founderName")}
                </h2>
                <Star className="w-4 h-4 text-primary/40" />
              </div>

              {/* Bio */}
              <p className="text-foreground/85 leading-relaxed mb-8 max-w-2xl mx-auto">
                {t("about", "founderBio")}
              </p>

              {/* Highlights */}
              <div className="space-y-4">
                {founderHighlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
                  >
                    <h.icon className="w-4 h-4 text-primary/60 shrink-0" />
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ VISION ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-3xl mx-auto text-center">
            <div className="editorial-diamond-sep mb-10">
              <div className="editorial-diamond" />
            </div>

            <p className="editorial-label text-primary mb-6">
              {t("about", "visionTitle")}
            </p>

            <blockquote className="relative">
              <p className="text-2xl md:text-3xl font-display italic text-foreground/90 leading-snug max-w-xl mx-auto">
                &ldquo;{t("about", "visionText")}&rdquo;
              </p>
            </blockquote>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ CTA ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4 pb-20">
          <div className="container max-w-3xl mx-auto text-center">
            <div className="editorial-diamond-sep mb-10">
              <div className="editorial-diamond" />
            </div>

            <h2 className="text-3xl md:text-4xl mb-4">
              {t("about", "ctaTitle")}
            </h2>
            <p className="text-muted-foreground mb-10 text-lg font-light">
              {t("about", "ctaDesc")}
            </p>

            <div className="flex flex-col sm:flex-row gap-5 items-center justify-center">
              <a
                href={getLoginUrl()}
                className="btn-editorial-filled inline-flex items-center gap-3"
              >
                <Sparkles className="w-4 h-4" />
                {t("about", "ctaButton")}
              </a>
              <Link
                href="/try"
                className="btn-editorial inline-flex items-center gap-3"
              >
                <Camera className="w-4 h-4" />
                {t("about", "ctaTry")}
              </Link>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="text-center py-10 border-t border-white/5">
        <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground mb-4">
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors underline underline-offset-4"
          >
            {lang === "he" ? "תנאי שימוש" : "Terms of Service"}
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors underline underline-offset-4"
          >
            {lang === "he" ? "מדיניות פרטיות" : "Privacy Policy"}
          </Link>
        </div>
        <p className="text-muted-foreground/40 text-xs">
          &copy; {new Date().getFullYear()} TotalLook.ai
        </p>
      </footer>
    </div>
  );
}
