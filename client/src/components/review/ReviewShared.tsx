import { useMemo, useState } from "react";
import { ExternalLink, Instagram, RefreshCw, ShoppingBag } from "lucide-react";
import { FashionButtonSpinner } from "@/components/FashionSpinner";
import type { LinkedMention, ShoppingLink } from "../../../../shared/fashionTypes";
import { BRAND_URLS, POPULAR_INFLUENCERS } from "../../../../shared/fashionTypes";

export type LinkedMentionLike = LinkedMention;

export function LinkedText({
  text,
  mentions,
  onInfluencerClick,
}: {
  text: string;
  mentions?: LinkedMention[];
  onInfluencerClick?: (name: string, handle?: string, igUrl?: string) => void;
}) {
  const safeText = text ?? "";
  const allMentions = useMemo(() => {
    if (!safeText) return [];
    const combined: LinkedMention[] = [...(mentions || [])];
    for (const [brand, url] of Object.entries(BRAND_URLS)) {
      if (safeText.includes(brand) && !combined.find((m) => m.text === brand)) {
        combined.push({ text: brand, type: "brand", url });
      }
    }
    return combined.sort((a, b) => b.text.length - a.text.length);
  }, [safeText, mentions]);

  if (!safeText || !allMentions.length) return <>{safeText}</>;

  const escapedTexts = allMentions.map((m) =>
    m.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const regex = new RegExp(`(${escapedTexts.join("|")})`, "g");
  const parts = safeText.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const mention = allMentions.find((m) => m.text === part);
        if (!mention) return <span key={i}>{part}</span>;

        const colorClass =
          mention.type === "brand"
            ? "text-primary hover:text-amber-300"
            : mention.type === "influencer"
              ? "text-rose-400 hover:text-rose-300"
              : mention.type === "store"
                ? "text-teal-400 hover:text-teal-300"
                : "text-primary hover:text-primary/80";

        if (mention.type === "influencer" && onInfluencerClick) {
          return (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const inf = POPULAR_INFLUENCERS.find((it) => it.name === mention.text);
                onInfluencerClick(mention.text, inf?.handle, mention.url);
              }}
              className={`${colorClass} font-bold underline decoration-solid underline-offset-2 transition-colors inline-flex items-center gap-1 cursor-pointer text-base`}
            >
              {part}
              <Instagram className="w-3.5 h-3.5 inline opacity-70" />
            </button>
          );
        }

        return (
          <a
            key={i}
            href={mention.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${colorClass} underline decoration-dotted underline-offset-2 transition-colors inline-flex items-center gap-0.5`}
          >
            {part}
            <ExternalLink className="w-2.5 h-2.5 inline opacity-50" />
          </a>
        );
      })}
    </>
  );
}

export function ScoreCircle({
  score,
  size = "lg",
}: {
  score: number;
  size?: "sm" | "lg" | "xl";
}) {
  const safeScore = score ?? 0;
  const radius = size === "xl" ? 62 : size === "lg" ? 54 : 30;
  const stroke = size === "xl" ? 7 : size === "lg" ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeScore / 10) * circumference;
  const color =
    safeScore >= 9
      ? "text-amber-400"
      : safeScore >= 7
        ? "text-primary"
        : safeScore >= 5
          ? "text-yellow-400"
          : "text-orange-400";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className={size === "xl" ? "w-36 h-36" : size === "lg" ? "w-32 h-32" : "w-16 h-16"}
        viewBox={`0 0 ${(radius + stroke) * 2} ${(radius + stroke) * 2}`}
      >
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/5"
        />
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000`}
          transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`}
        />
      </svg>
      <span
        className={`absolute font-bold ${size === "xl" ? "text-4xl" : size === "lg" ? "text-3xl" : "text-lg"}`}
      >
        {safeScore}
      </span>
    </div>
  );
}

export function ScoreBar({
  label,
  score,
  explanation,
  recommendation,
  lang,
  density = "regular",
}: {
  label: string;
  score: number | null;
  explanation?: string;
  recommendation?: string;
  lang: "he" | "en";
  density?: "compact" | "regular";
}) {
  const isCompact = density === "compact";
  const gapClass = isCompact ? "gap-3" : "gap-4";
  const labelClass = isCompact ? "text-xs w-28" : "text-sm w-40";
  const barClass = isCompact ? "h-2" : "h-2.5";
  const scoreClass = isCompact ? "text-xs w-10" : "text-sm w-10";
  const naClass = isCompact ? "text-[10px] w-12" : "text-xs w-16";
  const explClass = isCompact ? "text-[10px] mt-1" : "text-xs mt-1.5";
  const offsetClass = lang === "he" ? (isCompact ? "mr-32" : "mr-44") : isCompact ? "ml-32" : "ml-44";

  if (score === null) {
    return (
      <div>
        <div className={`flex items-center ${gapClass}`}>
          <span className={`${labelClass} text-muted-foreground shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>
            {label}
          </span>
          <div className={`flex-1 ${barClass} rounded-full bg-white/5 overflow-hidden`}>
            <div className="h-full rounded-full bg-white/10 transition-all duration-1000" style={{ width: "100%" }} />
          </div>
          <span className={`${naClass} font-medium text-muted-foreground/70 text-center`}>
            {lang === "he" ? "לא נראה" : "N/A"}
          </span>
        </div>
        {recommendation && (
          <p className={`${explClass} text-primary/70 ${offsetClass} flex items-center gap-1`}>
            <span>✨</span> {recommendation}
          </p>
        )}
      </div>
    );
  }

  const color =
    score >= 9
      ? "bg-amber-400"
      : score >= 7
        ? "bg-primary"
        : score >= 5
          ? "bg-yellow-400"
          : "bg-orange-400";

  return (
    <div>
      <div className={`flex items-center ${gapClass}`}>
        <span className={`${labelClass} text-muted-foreground shrink-0 ${lang === "he" ? "text-right" : "text-left"}`}>
          {label}
        </span>
        <div className={`flex-1 ${barClass} rounded-full bg-white/5 overflow-hidden`}>
          <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${score * 10}%` }} />
        </div>
        <span className={`${scoreClass} font-bold`}>{score}/10</span>
      </div>
      {explanation && <p className={`${explClass} text-muted-foreground/70 ${offsetClass} leading-relaxed`}>{explanation}</p>}
    </div>
  );
}

export function ProductCard({
  link,
  lang,
  isGeneratingImages,
}: {
  link: ShoppingLink;
  lang: "he" | "en";
  isGeneratingImages?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const hasImage = link.imageUrl && link.imageUrl.length > 5;
  const showShimmer = !hasImage && isGeneratingImages;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/5 bg-card/50 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="aspect-square bg-white/5 overflow-hidden relative">
        {hasImage && !imgError ? (
          <>
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                <FashionButtonSpinner />
              </div>
            )}
            <img
              src={link.imageUrl}
              alt={link.label}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoading ? "opacity-0" : "opacity-100"}`}
              onError={() => {
                setImgError(true);
                setImgLoading(false);
              }}
              onLoad={() => setImgLoading(false)}
            />
          </>
        ) : showShimmer ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-5 h-5 text-primary/50 animate-spin" style={{ animationDuration: "3s" }} />
              </div>
              <span className="text-[10px] text-primary/60 font-medium">
                {lang === "he" ? "מחפש תמונת מוצר..." : "Finding product image..."}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 to-transparent">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/40">{lang === "he" ? "צפה בחנות" : "View Store"}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{link.label}</p>
        <span className="text-[10px] text-primary/70 flex items-center gap-1 mt-1 group-hover:text-primary transition-colors">
          {lang === "he" ? "לרכישה" : "Buy Now"} <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
    </a>
  );
}
