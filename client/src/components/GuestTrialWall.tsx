import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/i18n";
import { SignupFeaturePromise } from "@/components/SignupFeaturePromise";
import {
  Sparkles, Crown, ArrowRight, Lock,
} from "lucide-react";

/**
 * GuestTrialWall — Full-screen signup wall shown when guest reaches 3-trial limit.
 * Shows feature promises and strong CTA to register.
 */
export function GuestTrialWall({ count }: { count: number }) {
  const { lang, dir } = useLanguage();
  const isHe = lang === "he";
  const displayCount = Math.min(count, 3); // Never show more than the limit

  return (
    <div
      className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-4 py-12"
      dir={dir}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[200px] pointer-events-none" />

      {/* Lock icon */}
      <div className="relative z-10 w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-amber-400" />
      </div>

      {/* Counter badge */}
      <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 mb-6">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs text-amber-300/80 font-medium">
          {isHe
            ? `${displayCount} מתוך 3 ניתוחים חינמיים נוצלו`
            : `${displayCount} of 3 free analyses used`}
        </span>
      </div>

      {/* Headline */}
      <h1 className="relative z-10 text-3xl sm:text-4xl font-bold text-center mb-3">
        {isHe
          ? "נהנית? יש עוד הרבה!"
          : "Enjoyed it? There's so much more!"}
      </h1>

      <p className="relative z-10 text-muted-foreground text-center max-w-md mb-8">
        {isHe
          ? "הירשמי בחינם כדי לקבל גישה בלתי מוגבלת לכל הפיצ'רים"
          : "Sign up for free to unlock unlimited access to all features"}
      </p>

      {/* Feature promises */}
      <div className="relative z-10 w-full max-w-md mb-8">
        <SignupFeaturePromise variant="full" />
      </div>

      {/* CTA buttons */}
      <div className="relative z-10 flex flex-col gap-3 w-full max-w-sm">
        <Button
          size="lg"
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold hover:from-amber-400 hover:to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          asChild
        >
          <a href={getLoginUrl()}>
            <Crown className="w-5 h-5" />
            {isHe ? "הירשמי עכשיו — חינם!" : "Sign up now — free!"}
            <ArrowRight className="w-4 h-4" />
          </a>
        </Button>

        <p className="text-center text-[11px] text-muted-foreground/50">
          {isHe
            ? "ההרשמה לוקחת 10 שניות עם Google"
            : "Sign up takes 10 seconds with Google"}
        </p>
      </div>
    </div>
  );
}
