/**
 * FashionSpinner — A stylish, fashion-themed loading indicator
 * Replaces the generic Loader2 spinner with an animated clothing hanger + shimmer effect
 * Supports multiple sizes: sm (inline buttons), md (sections), lg (full page)
 */

import { useLanguage } from "@/i18n";

type SpinnerSize = "sm" | "md" | "lg";

interface FashionSpinnerProps {
  size?: SpinnerSize;
  text?: string;
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { container: "w-5 h-5", hanger: 18, stroke: 1.5, textClass: "text-xs" },
  md: { container: "w-8 h-8", hanger: 30, stroke: 2, textClass: "text-sm" },
  lg: { container: "w-16 h-16", hanger: 60, stroke: 2.5, textClass: "text-base" },
};

export default function FashionSpinner({
  size = "md",
  text,
  showText = false,
  className = "",
}: FashionSpinnerProps) {
  const { t } = useLanguage();
  const config = sizeConfig[size];
  const displayText = text || t("common", "loading");

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className={`${config.container} relative`}>
        {/* Animated SVG Hanger */}
        <svg
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full animate-fashion-swing"
        >
          {/* Hook at top */}
          <path
            d="M30 4 C30 4, 34 4, 34 8 C34 12, 30 12, 30 12"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className="text-primary"
          />
          {/* Hanger triangle body */}
          <path
            d="M30 12 L8 40 L52 40 Z"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
            className="text-primary"
            strokeDasharray="140"
            strokeDashoffset="0"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="140;0;0;140"
              dur="2.4s"
              repeatCount="indefinite"
              keyTimes="0;0.4;0.6;1"
            />
          </path>
          {/* Bottom bar */}
          <line
            x1="8"
            y1="40"
            x2="52"
            y2="40"
            stroke="currentColor"
            strokeWidth={config.stroke + 0.5}
            strokeLinecap="round"
            className="text-primary/80"
          />
          {/* Shimmer effect */}
          <rect x="0" y="0" width="60" height="60" fill="url(#shimmer)" />
          <defs>
            <linearGradient id="shimmer" x1="-1" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="100%" stopColor="transparent" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="-2 0;2 0"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>
        </svg>

        {/* Pulsing glow behind */}
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-fashion-pulse -z-10" />
      </div>

      {showText && (
        <span className={`${config.textClass} text-muted-foreground font-medium animate-pulse`}>
          {displayText}
        </span>
      )}
    </div>
  );
}

/**
 * FashionPageLoader — Full-page centered loader with fashion branding
 * Use this for page-level loading states (replacing the big centered Loader2)
 */
export function FashionPageLoader({ text }: { text?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <FashionSpinner size="lg" showText text={text} />
    </div>
  );
}

/**
 * FashionButtonSpinner — Inline spinner for buttons
 * Use this inside buttons during mutation/loading states
 */
export function FashionButtonSpinner({ className = "" }: { className?: string }) {
  return <FashionSpinner size="sm" className={className} />;
}
