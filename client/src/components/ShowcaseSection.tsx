import { useLanguage } from "@/i18n";
import { Link } from "wouter";
import AnimatedSection from "@/components/AnimatedSection";
import LandingBeforeAfterSlider from "@/components/LandingBeforeAfterSlider";
import { Camera, Sparkles } from "lucide-react";

const SHOWCASE_ITEMS = [
  {
    titleKey: "showcaseItem1Title" as const,
    beforeKey: "showcaseItem1Before" as const,
    afterKey: "showcaseItem1After" as const,
    scoreBefore: 6.2,
    scoreAfter: 8.7,
    beforeImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/showcase_before_casual-4c23nyv3Jk3w7AA6Yy2cd4.webp",
    afterImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/showcase_after_casual-ck2BM8fQrAsF4fmfLLQERp.webp",
  },
  {
    titleKey: "showcaseItem2Title" as const,
    beforeKey: "showcaseItem2Before" as const,
    afterKey: "showcaseItem2After" as const,
    scoreBefore: 6.8,
    scoreAfter: 9.1,
    beforeImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/showcase_before_smart-UmcQ6yp6Fqw6nTfdNyKWCK.webp",
    afterImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/showcase_after_smart-faqtWN7goEYvS7QXbVLrio.webp",
  },
  {
    titleKey: "showcaseItem3Title" as const,
    beforeKey: "showcaseItem3Before" as const,
    afterKey: "showcaseItem3After" as const,
    scoreBefore: 7.0,
    scoreAfter: 9.4,
    beforeImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/showcase_before_elegant-AwCzvydkVRMvJNA85j8gHz.webp",
    afterImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/showcase_after_elegant-ncCCyuqrtVQQAM5EMy59Hp.webp",
  },
];

/* ── Single showcase card with interactive Before/After slider ── */
function ShowcaseCard({
  item,
  index,
  lang,
  t,
}: {
  item: (typeof SHOWCASE_ITEMS)[number];
  index: number;
  lang: string;
  t: (ns: string, key: string) => string;
}) {
  return (
    <div className="bg-background group">
      {/* Title bar — minimal with index */}
      <div className="px-6 py-4 flex items-center justify-between">
        <p className="editorial-label text-primary">
          {t("home", item.titleKey)}
        </p>
        <span className="editorial-section-num text-xs">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Interactive Before/After Slider */}
      <LandingBeforeAfterSlider
        beforeImg={item.beforeImg}
        afterImg={item.afterImg}
        beforeLabel={lang === "he" ? "לפני" : "BEFORE"}
        afterLabel={lang === "he" ? "אחרי" : "AFTER"}
        scoreBefore={item.scoreBefore}
        scoreAfter={item.scoreAfter}
      />

      {/* Improvement summary */}
      <div className="px-6 py-5">
        <p className="text-sm text-muted-foreground font-light leading-relaxed line-clamp-2 mb-2">
          {t("home", item.afterKey)}
        </p>
        <div className="flex items-center gap-2">
          <div
            className="editorial-rule-accent"
            style={{ margin: 0, width: "20px" }}
          />
          <p className="editorial-label text-primary/60">
            +{(item.scoreAfter - item.scoreBefore).toFixed(1)}{" "}
            {lang === "he" ? "נקודות" : "points"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ShowcaseSection() {
  const { t, dir, lang } = useLanguage();

  return (
    <>
      {/* ═══════ SHOWCASE — Editorial Before/After with Interactive Slider ═══════ */}
      <AnimatedSection>
        <section className="section-editorial px-4">
          <div className="container max-w-6xl mx-auto">
            {/* Diamond separator */}
            <div className="editorial-diamond-sep mb-12">
              <div className="editorial-diamond" />
            </div>

            {/* Section header */}
            <div className="text-center mb-12 md:mb-16">
              <p className="editorial-label text-primary mb-6">
                {lang === "he" ? "לפני ואחרי" : "Before & After"}
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl">
                {t("home", "showcaseTitle")}
              </h2>
              <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto font-light">
                {t("home", "showcaseSubtitle")}
              </p>
              {/* Flourish under subtitle */}
              <div className="editorial-flourish mt-8">
                <div className="editorial-flourish-line" />
                <div className="editorial-flourish-dot" />
                <div className="editorial-flourish-line" />
              </div>
            </div>

            {/* Showcase grid — editorial layout with interactive sliders */}
            <div className="grid md:grid-cols-3 gap-px bg-border/50 mb-12 editorial-stagger">
              {SHOWCASE_ITEMS.map((item, i) => (
                <ShowcaseCard
                  key={i}
                  item={item}
                  index={i}
                  lang={lang}
                  t={t}
                />
              ))}
            </div>

            {/* CTA — editorial buttons with icons */}
            <div className="flex flex-col sm:flex-row gap-5 items-center justify-center">
              <Link
                href="/demo"
                className="btn-editorial-filled inline-flex items-center gap-3"
              >
                <Sparkles className="w-4 h-4" />
                {t("home", "showcaseSeeDemo")}
              </Link>
              <Link
                href="/try"
                className="btn-editorial inline-flex items-center gap-3"
              >
                <Camera className="w-4 h-4" />
                {t("home", "showcaseTryYours")}
              </Link>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════ TRUST BAR — Understated editorial ═══════ */}
      <AnimatedSection>
        <section className="py-10">
          <div className="container max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-center">
              <span className="editorial-label">
                {t("home", "trustPrivacy")}
              </span>
              <span className="text-primary/30">◆</span>
              <span className="editorial-label">
                {t("home", "trustAiPowered")}
              </span>
              <span className="text-primary/30">◆</span>
              <span className="editorial-label">
                {t("home", "trustFree")}
              </span>
            </div>
          </div>
        </section>
      </AnimatedSection>
    </>
  );
}
