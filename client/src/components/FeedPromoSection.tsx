import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import AnimatedSection from "@/components/AnimatedSection";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageOff,
  TrendingUp,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

export default function FeedPromoSection() {
  const { lang, dir } = useLanguage();
  const t = (key: keyof typeof translations.feedPromo) =>
    translations.feedPromo[key][lang];

  const { data: feedData } = trpc.feed.list.useQuery(
    { limit: 20, offset: 0, sort: "popular" },
    { staleTime: 60000 }
  );

  const posts = feedData?.posts || [];
  const totalPosts = feedData?.total || 0;

  return (
    <AnimatedSection>
      <section className="section-editorial px-4 relative">
        <div className="container max-w-5xl mx-auto relative z-10">
          {/* Diamond separator */}
          <div className="editorial-diamond-sep mb-10">
            <div className="editorial-diamond" />
          </div>

          {/* Section header — editorial */}
          <div className="text-center mb-10">
            <p className="editorial-label text-primary mb-6">{t("trending")}</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl">
              {t("title")}
            </h2>
            <p className="text-muted-foreground text-base mt-6 max-w-xl mx-auto font-light">
              {t("subtitle")}
            </p>
            {/* Flourish */}
            <div className="editorial-flourish mt-6">
              <div className="editorial-flourish-line" />
              <div className="editorial-flourish-dot" />
              <div className="editorial-flourish-line" />
            </div>
          </div>

          {/* Carousel */}
          {posts.length > 0 ? (
            <Carousel posts={posts} lang={lang} dir={dir} />
          ) : (
            <div className="flex justify-center gap-4 mb-10 max-w-2xl mx-auto">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[150px] aspect-[3/4] bg-muted/30 animate-pulse flex-shrink-0"
                />
              ))}
            </div>
          )}

          {/* Stats row — editorial with diamond separators */}
          <div className="flex justify-center items-center gap-8 md:gap-14 mb-12">
            <div className="text-center">
              <p className="font-display text-2xl text-primary font-light">{totalPosts > 0 ? totalPosts : "—"}</p>
              <p className="editorial-label mt-1">{t("looksShared")}</p>
            </div>
            <span className="text-primary/20">◆</span>
            <div className="text-center">
              <p className="font-display text-2xl text-primary font-light">100%</p>
              <p className="editorial-label mt-1">{t("aiScored")}</p>
            </div>
            <span className="text-primary/20">◆</span>
            <div className="text-center">
              <p className="font-display text-2xl text-primary font-light">
                {posts.reduce((sum, p) => sum + (p.likesCount || 0), 0) || "—"}
              </p>
              <p className="editorial-label mt-1">{lang === "he" ? "לייקים" : "Likes"}</p>
            </div>
          </div>

          {/* CTA — editorial with icon */}
          <div className="text-center">
            <Link href="/feed" className="btn-editorial-filled inline-flex items-center gap-3">
              <TrendingUp className="w-4 h-4" />
              {t("cta")}
            </Link>
            <p className="editorial-label mt-6 text-muted-foreground/40">
              {t("seeWhatsHot")}
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}

// ---- Carousel ----

interface CarouselPost {
  id: number;
  imageUrl: string;
  overallScore: number | null;
  userName: string | null;
  likesCount: number;
  reviewId: number;
}

function Carousel({
  posts,
  lang,
  dir,
}: {
  posts: CarouselPost[];
  lang: "he" | "en";
  dir: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardWidth = 160;
  const visibleCards = 3;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isRTL = dir === "rtl";
    if (isRTL) {
      setCanScrollLeft(Math.abs(el.scrollLeft) + el.clientWidth < el.scrollWidth - 5);
      setCanScrollRight(Math.abs(el.scrollLeft) > 5);
    } else {
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
    }
    const scrollPos = Math.abs(el.scrollLeft);
    const idx = Math.round(scrollPos / cardWidth);
    setActiveIndex(Math.min(idx, posts.length - 1));
  }, [dir, posts.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const currentScroll = Math.abs(el.scrollLeft);
      if (currentScroll >= maxScroll - 5) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const nextScroll = currentScroll + cardWidth;
        if (dir === "rtl") {
          el.scrollTo({ left: -(nextScroll), behavior: "smooth" });
        } else {
          el.scrollTo({ left: nextScroll, behavior: "smooth" });
        }
      }
    }, 3000);
  }, [dir]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (posts.length > visibleCards) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [posts.length, startAutoPlay, stopAutoPlay]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    stopAutoPlay();
    const amount = direction === "left" ? -cardWidth : cardWidth;
    if (dir === "rtl") {
      el.scrollBy({ left: -amount, behavior: "smooth" });
    } else {
      el.scrollBy({ left: amount, behavior: "smooth" });
    }
    setTimeout(startAutoPlay, 5000);
  };

  const totalDots = Math.max(1, posts.length - visibleCards + 1);
  const dotIndex = Math.min(activeIndex, totalDots - 1);

  return (
    <div className="relative mb-10 group/carousel">
      {/* Navigation arrows — editorial thin style */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/carousel:opacity-100 -translate-x-2 md:-translate-x-6"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/carousel:opacity-100 translate-x-2 md:translate-x-6"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-[calc(50%-240px)] md:px-[calc(50%-280px)]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        onMouseEnter={stopAutoPlay}
        onMouseLeave={() => posts.length > visibleCards && startAutoPlay()}
        onTouchStart={stopAutoPlay}
        onTouchEnd={() => setTimeout(() => posts.length > visibleCards && startAutoPlay(), 5000)}
      >
        {posts.map((post) => (
          <div key={post.id} className="flex-shrink-0 snap-center" style={{ width: "150px" }}>
            <CarouselCard post={post} lang={lang} />
          </div>
        ))}
      </div>

      {/* Dot indicators — editorial thin lines */}
      {posts.length > visibleCards && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.min(totalDots, 8) }).map((_, i) => (
            <button
              key={i}
              className={`transition-all duration-300 ${
                i === dotIndex % 8
                  ? "w-6 h-px bg-primary"
                  : "w-3 h-px bg-muted-foreground/20 hover:bg-muted-foreground/40"
              }`}
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                stopAutoPlay();
                const targetScroll = i * cardWidth;
                if (dir === "rtl") {
                  el.scrollTo({ left: -targetScroll, behavior: "smooth" });
                } else {
                  el.scrollTo({ left: targetScroll, behavior: "smooth" });
                }
                setTimeout(startAutoPlay, 5000);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Carousel Card — editorial styling ----

function CarouselCard({
  post,
  lang,
}: {
  post: CarouselPost;
  lang: "he" | "en";
}) {
  const [imgError, setImgError] = useState(false);
  const score = post.overallScore;

  return (
    <Link href={`/feed?post=${post.id}`}>
      <div className="group relative overflow-hidden cursor-pointer transition-all duration-500 hover:opacity-90">
        <div className="aspect-[3/4] overflow-hidden">
          {imgError ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/20">
              <ImageOff className="w-8 h-8 text-muted-foreground/30" />
            </div>
          ) : (
            <img
              src={post.imageUrl}
              alt="Look"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Score — editorial serif number */}
        {score != null && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <span className="font-display text-2xl text-white font-light">
              {score}
            </span>
          </div>
        )}

        {/* Username */}
        {post.userName && (
          <div className="absolute top-2 left-2 right-2">
            <span className="editorial-label text-white/70 truncate block">
              {post.userName}
            </span>
          </div>
        )}

        {/* Likes */}
        {post.likesCount > 0 && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 editorial-label text-white/60">
              <Heart className="w-2.5 h-2.5 fill-current" />
              {post.likesCount}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
