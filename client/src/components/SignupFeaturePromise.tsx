import { useLanguage } from "@/i18n";
import { Shirt, Calendar, Star, Heart, Sparkles } from "lucide-react";

/**
 * Compact feature-promise list shown alongside signup CTAs.
 * Highlights real features that only registered users get.
 * variant="compact" → horizontal pills (for inline CTAs)
 * variant="full" → vertical list with icons (for dedicated signup sections)
 */
export function SignupFeaturePromise({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const { lang } = useLanguage();

  const features = [
    {
      icon: <Shirt className="w-4 h-4" />,
      he: "ארון דיגיטלי חכם",
      en: "Smart Digital Wardrobe",
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      he: "התאמת לוק לאירוע",
      en: "Outfit Match by Event",
    },
    {
      icon: <Star className="w-4 h-4" />,
      he: "פרופיל טעם אישי",
      en: "Personal Style Profile",
    },
    {
      icon: <Heart className="w-4 h-4" />,
      he: "ניתוחים מותאמים אישית",
      en: "Personalized Analyses",
    },
  ];

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {features.map((f, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium border border-primary/10"
          >
            {f.icon}
            {lang === "he" ? f.he : f.en}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 mt-3">
      {features.map((f, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            {f.icon}
          </div>
          <span className="text-foreground/80">{lang === "he" ? f.he : f.en}</span>
        </div>
      ))}
      <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
        <Sparkles className="w-3 h-3" />
        {lang === "he" ? "הכל חינם · ללא התחייבות" : "All free · No commitment"}
      </p>
    </div>
  );
}
