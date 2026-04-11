import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import WhatsAppOnboardingModal from "@/components/WhatsAppOnboardingModal";
import { useLocation } from "wouter";
import { Sparkles, ChevronLeft, ChevronRight, Store, MapPin, Globe, MessageCircle, Check, Heart, X, ThumbsUp, ThumbsDown } from "lucide-react";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
import StoreLogo from "@/components/StoreLogo";
import { toast } from "sonner";
import {
  AGE_RANGES, GENDER_OPTIONS, OCCUPATION_OPTIONS,
  BUDGET_OPTIONS, STYLE_OPTIONS, STORE_OPTIONS, COUNTRY_STORE_MAP,
} from "../../../shared/fashionTypes";
import InfluencerPicker from "@/components/InfluencerPicker";
import SocialConnectionsStep from "@/components/SocialConnectionsStep";
import PhoneInput from "@/components/PhoneInput";
import { useLanguage } from "@/i18n";
import { translations } from "@/i18n/translations";
import { useCountry } from "@/hooks/useCountry";
import { getCountryFlag, getCountryName } from "../../../shared/countries";

/* ═══════════════════════════════════════════════════════
   CDN image assets for the visual onboarding screens
   ═══════════════════════════════════════════════════════ */
const SILHOUETTES = {
  female: {
    casual: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-casual-SbXDcZnbTuHW9LE7TdRmE7.webp",
    elegant: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-elegant-XVhqPXRgZtKKgT3GSttbjX.webp",
    sporty: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-sporty-WqjYxKtVae2t2ZVtHAPJ4L.webp",
  },
  male: {
    casual: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-casual-m-g5u7b8SkTUYSzU7S7pURr2.webp",
    elegant: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-elegant-m-fYF8PV5Ew3pNBNHuGVraJ6.webp",
    sporty: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-sporty-m-T2JkTgPdGmAvcCdjLwJ3nj.webp",
  },
} as const;

const ATMOSPHERE_IMAGES = {
  office: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-office-fqPQ4oAa8X3iShHuET3Cdy.webp",
  bar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-bar-5MJwjLCQJrfxjQ6ti2qjmf.webp",
  beach: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-beach-Z3UMQAPUAZtzhUft3aybqi.webp",
  event: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-event-eRxEaMR4kREV4TDeADMLU7.webp",
} as const;

/* ═══════════════════════════════════════════════════════
   Tinder outfit cards data — gender-neutral
   ═══════════════════════════════════════════════════════ */
const TINDER_OUTFITS = [
  {
    id: "streetwear",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-1-streetwear-Q3kCijXmT6HPiBdFJSCiPZ.webp",
    label: { he: "סטריטוור", en: "Streetwear" },
    styleTags: ["streetwear", "smart-casual"],
  },
  {
    id: "smart-casual",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-2-smartcasual-bDfRm8HYjtbdg8vsdRyp3Y.webp",
    label: { he: "סמארט קז'ואל", en: "Smart Casual" },
    styleTags: ["smart-casual", "classic"],
  },
  {
    id: "classic",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-3-classic-PyACqETcKvWTww3AWVcCwu.webp",
    label: { he: "קלאסי", en: "Classic" },
    styleTags: ["classic", "minimalist"],
  },
  {
    id: "boho",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-4-boho-CjMBTzNDhhetykDxjTKgQf.webp",
    label: { he: "בוהו", en: "Boho" },
    styleTags: ["boho", "vintage"],
  },
  {
    id: "minimalist",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-5-minimalist-U6WZ4ZpJyJ7P2RmCABRMzQ.webp",
    label: { he: "מינימליסטי", en: "Minimalist" },
    styleTags: ["minimalist", "classic"],
  },
  {
    id: "athleisure",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-6-athleisure-kMkx3BjdFratffLMVocVnd.webp",
    label: { he: "אתלי'זר", en: "Athleisure" },
    styleTags: ["sporty", "streetwear"],
  },
] as const;

/* ═══════════════════════════════════════════════════════
   Phase A = visual intro (3 screens: style → venue → tinder)
   Phase B = existing detailed steps (occupation, budget, style, stores, influencers)
   ═══════════════════════════════════════════════════════ */
const PHASE_A_STEPS = 3;
const PHASE_B_STEPS = 5;

export default function Onboarding() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1); // 1-3 = Phase A, 4-8 = Phase B
  const [saving, setSaving] = useState(false);
  const { t, dir, lang } = useLanguage();

  /* ── Phase A state ── */
  const [selectedStyle, setSelectedStyle] = useState(""); // casual | elegant | sporty
  const [selectedVenue, setSelectedVenue] = useState(""); // office | bar | beach | event
  const [tinderLikes, setTinderLikes] = useState<string[]>([]);
  const [tinderIndex, setTinderIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [tinderDone, setTinderDone] = useState(false);

  /* ── Phase B state ── */
  const [gender, setGender] = useState(""); // kept for Phase B but not asked in Phase A
  const [ageRange, setAgeRange] = useState("");
  const [occupation, setOccupation] = useState("");
  const [budgetLevel, setBudgetLevel] = useState("");
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);
  const [customInfluencer, setCustomInfluencer] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [customStore, setCustomStore] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const { country: detectedCountry } = useCountry();
  const utils = trpc.useUtils();
  const saveProfileMutation = trpc.profile.save.useMutation();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Country-specific local stores
  const countryData = useMemo(() => {
    if (!detectedCountry) return null;
    return COUNTRY_STORE_MAP[detectedCountry] || null;
  }, [detectedCountry]);

  const filteredLocalStores = useMemo(() => {
    if (!countryData) return [];
    return countryData.stores.filter(s => {
      const genderMatch = !gender || s.gender === "unisex" || s.gender === gender;
      const budgetMatch = !budgetLevel || s.budget.some(b => {
        const adjacent: Record<string, string[]> = {
          "budget": ["budget", "mid-range"],
          "mid-range": ["budget", "mid-range", "premium"],
          "premium": ["mid-range", "premium", "luxury"],
          "luxury": ["premium", "luxury"],
        };
        const allowed = adjacent[budgetLevel] || [budgetLevel];
        return allowed.includes(b);
      });
      return genderMatch && budgetMatch;
    });
  }, [countryData, gender, budgetLevel]);

  const localStoreNames = useMemo(() => {
    return new Set(filteredLocalStores.map(s => s.name));
  }, [filteredLocalStores]);

  const recommendedStores = useMemo(() =>
    STORE_OPTIONS.filter(s => s.budget === budgetLevel),
    [budgetLevel]
  );
  const otherStores = useMemo(() =>
    STORE_OPTIONS.filter(s => s.budget !== budgetLevel),
    [budgetLevel]
  );

  const toggleInfluencer = (name: string) => {
    setSelectedInfluencers(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const addCustomInfluencer = () => {
    const trimmed = customInfluencer.trim();
    if (trimmed && !selectedInfluencers.includes(trimmed)) {
      setSelectedInfluencers(prev => [...prev, trimmed]);
      setCustomInfluencer("");
    }
  };

  const toggleStore = (label: string) => {
    setSelectedStores(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  const addCustomStore = () => {
    const trimmed = customStore.trim();
    if (trimmed && !selectedStores.includes(trimmed)) {
      setSelectedStores(prev => [...prev, trimmed]);
      setCustomStore("");
    }
  };

  /* ── Map visual style → style preferences ── */
  const mapStyleToPreferences = useCallback((style: string): string[] => {
    switch (style) {
      case "casual": return ["streetwear", "smart-casual"];
      case "elegant": return ["classic", "minimalist"];
      case "sporty": return ["sporty", "streetwear"];
      default: return [];
    }
  }, []);

  /* ── Map venue → occupation hint ── */
  const mapVenueToOccupation = useCallback((venue: string): string => {
    switch (venue) {
      case "office": return "corporate";
      case "bar": return "creative";
      case "beach": return "freelance";
      case "event": return "entrepreneur";
      default: return "";
    }
  }, []);

  /* ── Tinder: derive style tags from likes ── */
  const derivedStyleFromTinder = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    tinderLikes.forEach(likedId => {
      const outfit = TINDER_OUTFITS.find(o => o.id === likedId);
      outfit?.styleTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    // Return top tags sorted by count
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [tinderLikes]);

  /* ── Tinder swipe handler ── */
  const handleSwipe = useCallback((direction: "left" | "right") => {
    const currentOutfit = TINDER_OUTFITS[tinderIndex];
    if (!currentOutfit) return;

    setSwipeDirection(direction);

    if (direction === "right") {
      setTinderLikes(prev => [...prev, currentOutfit.id]);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      if (tinderIndex < TINDER_OUTFITS.length - 1) {
        setTinderIndex(prev => prev + 1);
      } else {
        setTinderDone(true);
      }
    }, 350);
  }, [tinderIndex]);

  /* ── Touch swipe support for mobile ── */
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
      handleSwipe(deltaX > 0 ? "right" : "left");
    }
  }, [handleSwipe]);

  const handleFinish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Merge Phase A visual choices + Tinder likes into profile fields
      const mergedStylePrefs = stylePreferences.length > 0
        ? stylePreferences
        : derivedStyleFromTinder.length > 0
        ? derivedStyleFromTinder
        : mapStyleToPreferences(selectedStyle);
      const mergedOccupation = occupation || mapVenueToOccupation(selectedVenue);

      const result = await saveProfileMutation.mutateAsync({
        ageRange: ageRange || undefined,
        gender: gender || undefined,
        occupation: mergedOccupation || undefined,
        budgetLevel: budgetLevel || undefined,
        stylePreference: mergedStylePrefs.length > 0 ? mergedStylePrefs.join(", ") : undefined,
        favoriteInfluencers: selectedInfluencers.length > 0 ? selectedInfluencers.join(", ") : undefined,
        preferredStores: selectedStores.length > 0 ? selectedStores.join(", ") : undefined,
        saveToWardrobe: true,
        onboardingCompleted: true,
        country: detectedCountry || undefined,
        phoneNumber: phoneNumber || undefined,
      });
      if (phoneNumber && result.whatsAppWelcomeSent) {
        setSaving(false);
        setShowWhatsAppModal(true);
        return;
      }
      window.location.href = "/upload";
    } catch (err: any) {
      const errorMsg = err?.message || t("onboarding", "saveError");
      setSaveError(errorMsg);
      toast.error(t("onboarding", "saveError") + ": " + errorMsg);
      setSaving(false);
    }
  };

  /* ── Quick finish after Phase A (skip Phase B) ── */
  const handleQuickFinish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const mergedStylePrefs = derivedStyleFromTinder.length > 0
        ? derivedStyleFromTinder
        : mapStyleToPreferences(selectedStyle);
      const mergedOccupation = mapVenueToOccupation(selectedVenue);

      await saveProfileMutation.mutateAsync({
        occupation: mergedOccupation || undefined,
        stylePreference: mergedStylePrefs.length > 0 ? mergedStylePrefs.join(", ") : undefined,
        saveToWardrobe: true,
        onboardingCompleted: true,
        country: detectedCountry || undefined,
      });
      window.location.href = "/upload";
    } catch (err: any) {
      toast.error(lang === "he" ? "שגיאה בשמירה" : "Save error");
      setSaving(false);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 1: return !!selectedStyle;                 // Phase A: style silhouette
      case 2: return !!selectedVenue;                 // Phase A: venue
      case 3: return tinderDone;                      // Phase A: tinder done
      case 4: return !!occupation && !!budgetLevel;   // Phase B: occupation + budget
      case 5: return stylePreferences.length > 0;     // Phase B: style
      case 6: return true;                            // Phase B: stores (optional)
      case 7: return true;                            // Phase B: social (optional)
      case 8: return true;                            // Phase B: influencers (optional)
      default: return false;
    }
  };

  // Translation helpers
  const getGenderLabel = (id: string) => {
    const val = t("genderOptions", id);
    return val !== id ? val : (GENDER_OPTIONS.find(g => g.id === id)?.label || id);
  };
  const getOccupationLabel = (id: string) => {
    const val = t("occupationOptions", id);
    return val !== id ? val : (OCCUPATION_OPTIONS.find(o => o.id === id)?.label || id);
  };
  const getBudgetLabel = (id: string) => {
    const sec = (translations as any).budgetOptions?.[id];
    if (sec?.label?.[lang]) return sec.label[lang];
    return BUDGET_OPTIONS.find(b => b.id === id)?.label || id;
  };
  const getBudgetRange = (id: string) => {
    const sec = (translations as any).budgetOptions?.[id];
    if (sec?.range?.[lang]) return sec.range[lang];
    return BUDGET_OPTIONS.find(b => b.id === id)?.range || "";
  };
  const getStyleLabel = (id: string) => {
    const sec = (translations as any).styleOptions?.[id];
    if (sec?.label?.[lang]) return sec.label[lang];
    return STYLE_OPTIONS.find(s => s.id === id)?.label || id;
  };
  const getStyleDesc = (id: string) => {
    const sec = (translations as any).styleOptions?.[id];
    if (sec?.desc?.[lang]) return sec.desc[lang];
    return STYLE_OPTIONS.find(s => s.id === id)?.description || "";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "";
  const isRtl = dir === "rtl";
  const textAlign = isRtl ? "text-right" : "text-left";
  const isPhaseA = step <= PHASE_A_STEPS;
  const isPhaseB = step > PHASE_A_STEPS;
  const phaseBStep = step - PHASE_A_STEPS; // 1-5 within Phase B

  /* ═══════════════════════════════════════════════════════
     Stylist reaction messages
     ═══════════════════════════════════════════════════════ */
  const getStylistReaction = () => {
    if (step === 2 && selectedStyle) {
      const styleReactions: Record<string, { he: string; en: string }> = {
        casual: { he: "אוהב/ת נוחות? אני כבר רואה את הכיוון", en: "Love comfort? I see the direction" },
        elegant: { he: "קלאסי. יש לי רעיונות בשבילך", en: "Classic. I have ideas for you" },
        sporty: { he: "אנרגטי! בואו נמצא את הלוק המושלם", en: "Energetic! Let's find the perfect look" },
      };
      const r = styleReactions[selectedStyle];
      return r ? r[lang] || r.en : "";
    }
    if (step === 3) {
      if (!tinderDone) {
        const venueReactions: Record<string, { he: string; en: string }> = {
          office: { he: "אופיס שיק — עכשיו בואו נראה מה מדבר אליך", en: "Office chic — now let's see what speaks to you" },
          bar: { he: "ערב בחוץ? בואו נראה מה הסגנון שלך", en: "Night out? Let's see your style" },
          beach: { he: "וייב חופשי — עכשיו סוויפ!", en: "Free vibes — now swipe!" },
          event: { he: "אירוע? הולכים על WOW — סוויפ!", en: "Event? Going for WOW — swipe!" },
        };
        const r = venueReactions[selectedVenue];
        return r ? r[lang] || r.en : "";
      }
      const likeCount = tinderLikes.length;
      if (likeCount === 0) return lang === "he" ? "מעניין... סגנון ייחודי!" : "Interesting... unique style!";
      if (likeCount <= 2) return lang === "he" ? "סלקטיבי! אני אוהבת את זה" : "Selective! I love it";
      return lang === "he" ? "יש לך טעם מעולה!" : "You have great taste!";
    }
    return "";
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir={dir}>
      {/* WhatsApp Onboarding Modal */}
      <WhatsAppOnboardingModal
        open={showWhatsAppModal}
        onClose={() => { window.location.href = "/upload"; }}
        phoneNumber={phoneNumber}
      />

      {/* Progress bar — dots for Phase A, linear for Phase B */}
      <div className="fixed top-0 left-0 right-0 z-50">
        {isPhaseA ? (
          <div className="flex items-center justify-center gap-2 pt-6 pb-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`rounded-full transition-all duration-500 ${
                  i === step
                    ? "w-8 h-2 bg-primary"
                    : i < step
                    ? "w-2 h-2 bg-primary/60"
                    : "w-2 h-2 bg-white/20"
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="h-1 bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-primary to-rose-500 transition-all duration-500"
              style={{ width: `${(phaseBStep / PHASE_B_STEPS) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className={`w-full ${isPhaseA ? "max-w-md" : "max-w-lg"}`}>

          {/* ═══════════════════════════════════════════
              PHASE A — Visual Intro (3 screens)
              ═══════════════════════════════════════════ */}

          {/* ── Screen 1: Style Silhouette (was Screen 2, now first) ── */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="mb-2">
                <Sparkles className="w-6 h-6 text-primary mx-auto mb-3" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {firstName
                  ? (lang === "he" ? `היי ${firstName}!` : `Hey ${firstName}!`)
                  : (lang === "he" ? "היי!" : "Hey!")}
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-primary mb-1">
                {lang === "he" ? "הסטייליסטית שלך רוצה להכיר אותך" : "Your stylist wants to get to know you"}
              </p>
              <p className="text-muted-foreground text-sm mb-8">
                {lang === "he" ? "3 שאלות קצרות — בלי טקסט, רק טאפ" : "3 quick questions — no typing, just tap"}
              </p>

              <h2 className="text-lg font-semibold mb-4">
                {lang === "he" ? "מה הסגנון שלך?" : "What's your style?"}
              </h2>

              <div className="grid grid-cols-3 gap-3">
                {(["casual", "elegant", "sporty"] as const).map(style => {
                  const isSelected = selectedStyle === style;
                  // Use female silhouettes as default (gender-neutral look)
                  const imgUrl = SILHOUETTES.female[style];
                  const labels: Record<string, { he: string; en: string }> = {
                    casual: { he: "קז'ואל", en: "Casual" },
                    elegant: { he: "אלגנטי", en: "Elegant" },
                    sporty: { he: "ספורטיבי", en: "Sporty" },
                  };
                  return (
                    <button
                      key={style}
                      onClick={() => {
                        setSelectedStyle(style);
                        setTimeout(() => setStep(2), 500);
                      }}
                      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? "border-primary scale-105 shadow-lg shadow-primary/20"
                          : "border-white/10 hover:border-primary/30 hover:scale-102"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="aspect-[3/4] relative">
                        <img
                          src={imgUrl}
                          alt={labels[style]?.en || style}
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                        <span className="absolute bottom-2 inset-x-0 text-center text-sm font-bold text-white">
                          {labels[style]?.[lang] || labels[style]?.en}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Screen 2: Venue / Atmosphere ── */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              {/* Stylist reaction */}
              {getStylistReaction() && (
                <div className="mb-4 animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-primary">{getStylistReaction()}</span>
                  </div>
                </div>
              )}

              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {lang === "he" ? "לאן הולכים הכי הרבה?" : "Where do you go most?"}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {lang === "he" ? "בחר/י את הסביבה שהכי מתאימה לך" : "Pick the environment that fits you best"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {(["office", "bar", "beach", "event"] as const).map(venue => {
                  const isSelected = selectedVenue === venue;
                  const imgUrl = ATMOSPHERE_IMAGES[venue];
                  const labels: Record<string, { he: string; en: string }> = {
                    office: { he: "משרד", en: "Office" },
                    bar: { he: "בר / ערב", en: "Bar / Night" },
                    beach: { he: "חוף / חופש", en: "Beach / Chill" },
                    event: { he: "אירוע", en: "Event" },
                  };
                  const emojis: Record<string, string> = {
                    office: "💼",
                    bar: "🍸",
                    beach: "🏖️",
                    event: "✨",
                  };
                  return (
                    <button
                      key={venue}
                      onClick={() => {
                        setSelectedVenue(venue);
                        setTimeout(() => setStep(3), 500);
                      }}
                      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? "border-primary scale-105 shadow-lg shadow-primary/20"
                          : "border-white/10 hover:border-primary/30 hover:scale-102"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="aspect-square relative">
                        <img
                          src={imgUrl}
                          alt={labels[venue]?.en || venue}
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl mb-1">{emojis[venue]}</span>
                          <span className="text-sm font-bold text-white drop-shadow-lg">
                            {labels[venue]?.[lang] || labels[venue]?.en}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Screen 3: Tinder Swipe ── */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              {/* Stylist reaction */}
              {getStylistReaction() && (
                <div className="mb-4 animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-primary">{getStylistReaction()}</span>
                  </div>
                </div>
              )}

              {!tinderDone ? (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1">
                    {lang === "he" ? "מה מדבר אליך?" : "What speaks to you?"}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    {lang === "he"
                      ? `סוויפ ימינה = אוהב/ת ❤️ | שמאלה = לא בשבילי ✕  (${tinderIndex + 1}/${TINDER_OUTFITS.length})`
                      : `Swipe right = love ❤️ | left = nope ✕  (${tinderIndex + 1}/${TINDER_OUTFITS.length})`}
                  </p>

                  {/* Tinder Card */}
                  <div className="relative mx-auto" style={{ maxWidth: 320 }}>
                    <div
                      ref={cardRef}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      className={`relative rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl transition-all duration-300 ${
                        swipeDirection === "right"
                          ? "translate-x-[120%] rotate-12 opacity-0"
                          : swipeDirection === "left"
                          ? "-translate-x-[120%] -rotate-12 opacity-0"
                          : ""
                      }`}
                    >
                      {/* Like/Nope overlays */}
                      {swipeDirection === "right" && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-green-500/20">
                          <div className="border-4 border-green-400 text-green-400 px-6 py-2 rounded-xl text-3xl font-black rotate-[-20deg]">
                            LIKE
                          </div>
                        </div>
                      )}
                      {swipeDirection === "left" && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/20">
                          <div className="border-4 border-red-400 text-red-400 px-6 py-2 rounded-xl text-3xl font-black rotate-[20deg]">
                            NOPE
                          </div>
                        </div>
                      )}

                      <div className="aspect-[3/4] relative">
                        <img
                          src={TINDER_OUTFITS[tinderIndex].image}
                          alt={TINDER_OUTFITS[tinderIndex].label.en}
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                        <div className="absolute bottom-4 inset-x-0 text-center">
                          <span className="text-xl font-bold text-white drop-shadow-lg">
                            {TINDER_OUTFITS[tinderIndex].label[lang] || TINDER_OUTFITS[tinderIndex].label.en}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Swipe buttons */}
                    <div className="flex items-center justify-center gap-8 mt-5">
                      <button
                        onClick={() => handleSwipe("left")}
                        className="w-14 h-14 rounded-full border-2 border-red-400/50 bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-90"
                      >
                        <X className="w-7 h-7 text-red-400" />
                      </button>
                      <button
                        onClick={() => handleSwipe("right")}
                        className="w-16 h-16 rounded-full border-2 border-green-400/50 bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 hover:border-green-400 transition-all active:scale-90"
                      >
                        <Heart className="w-8 h-8 text-green-400" />
                      </button>
                    </div>

                    {/* Progress dots */}
                    <div className="flex items-center justify-center gap-1.5 mt-4">
                      {TINDER_OUTFITS.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            i < tinderIndex
                              ? "w-4 bg-primary/60"
                              : i === tinderIndex
                              ? "w-6 bg-primary"
                              : "w-3 bg-white/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* ── Tinder Done → Quick Finish CTA ── */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-6">
                    <div className="text-5xl mb-3">✨</div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">
                      {lang === "he" ? "מושלם!" : "Perfect!"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {lang === "he"
                        ? `אהבת ${tinderLikes.length} לוקים — הסטייליסטית שלך מוכנה`
                        : `You liked ${tinderLikes.length} looks — your stylist is ready`}
                    </p>
                  </div>

                  {/* Liked outfits mini preview */}
                  {tinderLikes.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                      {tinderLikes.map(likedId => {
                        const outfit = TINDER_OUTFITS.find(o => o.id === likedId);
                        if (!outfit) return null;
                        return (
                          <div key={likedId} className="w-12 h-16 rounded-lg overflow-hidden border border-primary/30">
                            <img src={outfit.image} alt={outfit.label.en} className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Terms consent */}
                  <label className="flex items-start gap-3 mb-6 cursor-pointer group justify-center text-center">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 accent-primary flex-shrink-0"
                    />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                      {lang === "he" ? (
                        <>אני מאשר/ת את{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">תנאי השימוש</a>{" "}ואת{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">מדיניות הפרטיות</a></>
                      ) : (
                        <>I agree to the{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">Terms</a>{" "}and{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a></>
                      )}
                    </span>
                  </label>

                  {/* Two CTA buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleQuickFinish}
                      disabled={saving || !agreedToTerms}
                      className="w-full gap-2 rounded-xl h-12 text-base font-bold"
                      size="lg"
                    >
                      {saving ? (
                        <><FashionButtonSpinner /> {lang === "he" ? "שנייה..." : "One sec..."}</>
                      ) : (
                        <><Sparkles className="w-5 h-5" /> {lang === "he" ? "יאללה, תראו לי ציון!" : "Show me my score!"}</>
                      )}
                    </Button>
                    <button
                      onClick={() => setStep(4)}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {lang === "he" ? "רוצה לדייק עוד? →" : "Want to fine-tune? →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              PHASE B — Detailed Steps (existing flow)
              ═══════════════════════════════════════════ */}

          {isPhaseB && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">
                  {t("onboarding", "stepOf")} {phaseBStep} {t("onboarding", "outOf")} {PHASE_B_STEPS}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {lang === "he" ? "ככל שנדייק יותר — הניתוח יהיה טוב יותר" : "The more we fine-tune — the better the analysis"}
              </p>
            </div>
          )}

          {/* ── Step 4 (Phase B-1): Occupation + Budget ── */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">{t("onboarding", "occupationTitle")}</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {OCCUPATION_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setOccupation(opt.id)}
                    className={`p-3 rounded-xl border ${textAlign} transition-all duration-200 ${
                      occupation === opt.id
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                    }`}
                  >
                    <span className="text-xl block mb-0.5">{opt.icon}</span>
                    <span className="text-sm font-medium">{getOccupationLabel(opt.id)}</span>
                  </button>
                ))}
              </div>

              {occupation && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-muted-foreground text-center text-sm mb-3">{t("onboarding", "budgetSubtitle")}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {BUDGET_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setBudgetLevel(opt.id)}
                        className={`p-3 rounded-xl border ${textAlign} transition-all duration-200 ${
                          budgetLevel === opt.id
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                            : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                        }`}
                      >
                        <span className="text-lg block mb-0.5">{opt.icon}</span>
                        <span className="font-medium block text-sm">{getBudgetLabel(opt.id)}</span>
                        <span className={`text-xs ${budgetLevel === opt.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {getBudgetRange(opt.id)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5 (Phase B-2): Style Preferences ── */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">{t("onboarding", "budgetStyleTitle")}</h2>
              <p className="text-muted-foreground text-center text-sm">
                {t("onboarding", "styleSubtitle")} <span className="text-primary/70">{t("onboarding", "multiSelect")}</span>
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {STYLE_OPTIONS.map(opt => {
                  const isSelected = stylePreferences.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setStylePreferences(prev =>
                          prev.includes(opt.id)
                            ? prev.filter(s => s !== opt.id)
                            : [...prev, opt.id]
                        );
                      }}
                      className={`p-3 rounded-xl border ${textAlign} transition-all duration-200 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                          : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                      }`}
                    >
                      <span className="font-medium block text-sm">{getStyleLabel(opt.id)}</span>
                      <span className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {getStyleDesc(opt.id)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 6 (Phase B-3): Stores ── */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">{t("onboarding", "storesTitle")}</h2>
              <p className="text-muted-foreground text-center text-sm">{t("onboarding", "storesSubtitle")}</p>

              {/* Country-specific stores */}
              {detectedCountry && filteredLocalStores.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {getCountryFlag(detectedCountry)} {lang === "he" ? "חנויות מקומיות" : "Local stores"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {filteredLocalStores.slice(0, 8).map(store => {
                      const isSelected = selectedStores.includes(store.name);
                      return (
                        <button
                          key={store.name}
                          onClick={() => toggleStore(store.name)}
                          className={`p-2 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1 ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-white/10 hover:border-primary/30"
                          }`}
                        >
                          <StoreLogo name={store.name} size="sm" selected={isSelected} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Global stores */}
              {budgetLevel && recommendedStores.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {lang === "he" ? "מותגים מומלצים" : "Recommended brands"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {recommendedStores.filter(s => !localStoreNames.has(s.label)).slice(0, 8).map(store => {
                      const isSelected = selectedStores.includes(store.label);
                      return (
                        <button
                          key={store.id}
                          onClick={() => toggleStore(store.label)}
                          className={`p-2 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1 ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-white/10 hover:border-primary/30"
                          }`}
                        >
                          <StoreLogo name={store.label} size="sm" selected={isSelected} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom store */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customStore}
                  onChange={(e) => setCustomStore(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomStore()}
                  placeholder={t("onboarding", "addStore")}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                />
                <Button variant="outline" size="sm" onClick={addCustomStore} disabled={!customStore.trim()} className="rounded-lg">
                  {t("common", "add")}
                </Button>
              </div>

              {selectedStores.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedStores.map(name => (
                    <span
                      key={name}
                      onClick={() => toggleStore(name)}
                      className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs cursor-pointer hover:bg-primary/30 transition-colors"
                    >
                      {name} ✕
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 7 (Phase B-4): Social Connections ── */}
          {step === 7 && (
            <SocialConnectionsStep
              onInstagramClick={() => setStep(8)}
            />
          )}

          {/* ── Step 8 (Phase B-5): Influencers ── */}
          {step === 8 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">{t("onboarding", "influencerTitle")}</h2>
              <p className="text-muted-foreground text-center text-sm">
                {t("onboarding", "influencerSubtitle")}
              </p>

              <InfluencerPicker
                gender={gender || undefined}
                selectedInfluencers={selectedInfluencers}
                onToggle={toggleInfluencer}
                userProfile={{
                  ageRange: ageRange || null,
                  budgetLevel: budgetLevel || null,
                  stylePreference: stylePreferences.join(", ") || null,
                }}
              />

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInfluencer}
                  onChange={(e) => setCustomInfluencer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomInfluencer()}
                  placeholder={t("onboarding", "addInfluencer")}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                />
                <Button variant="outline" size="sm" onClick={addCustomInfluencer} disabled={!customInfluencer.trim()} className="rounded-lg">
                  {t("common", "add")}
                </Button>
              </div>

              {selectedInfluencers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedInfluencers.map(name => (
                    <span
                      key={name}
                      onClick={() => toggleInfluencer(name)}
                      className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs cursor-pointer hover:bg-primary/30 transition-colors"
                    >
                      {name} ✕
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Terms & Privacy consent on last Phase B step */}
          {step === PHASE_A_STEPS + PHASE_B_STEPS && !agreedToTerms && (
            <label className="flex items-start gap-3 mt-6 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 accent-primary"
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                {lang === "he" ? (
                  <>אני מאשר/ת את{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">תנאי השימוש</a>{" "}ואת{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">מדיניות הפרטיות</a>, כולל עיבוד תמונות באמצעות AI.</>
                ) : (
                  <>I agree to the{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>{" "}and{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>, including AI image processing.</>
                )}
              </span>
            </label>
          )}

          {/* Navigation buttons — Phase B only */}
          {isPhaseB && (
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                className="gap-2 rounded-xl"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {t("common", "back")}
              </Button>

              {step < PHASE_A_STEPS + PHASE_B_STEPS ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canGoNext()}
                  className="gap-2 rounded-xl"
                >
                  {t("common", "next")}
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={saving || !agreedToTerms}
                  className="gap-2 rounded-xl px-6"
                >
                  {saving ? (
                    <>
                      <FashionButtonSpinner />
                      {t("onboarding", "saving")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t("onboarding", "letsStart")}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Phase A back button (screens 2-3, but not during tinder swipe) */}
          {isPhaseA && step > 1 && !(!tinderDone && step === 3) && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  if (step === 3 && tinderDone) {
                    // Reset tinder state and go back to venue
                    setTinderDone(false);
                    setTinderIndex(0);
                    setTinderLikes([]);
                    setStep(2);
                  } else {
                    setStep(s => s - 1);
                  }
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isRtl ? "→" : "←"} {t("common", "back")}
              </button>
            </div>
          )}

          {/* Skip button for optional Phase B steps */}
          {step === PHASE_A_STEPS + PHASE_B_STEPS && (
            <div className="text-center mt-4">
              <button
                onClick={handleFinish}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("onboarding", "skip")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
