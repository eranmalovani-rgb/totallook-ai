import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useCallback } from "react";
import WhatsAppOnboardingModal from "@/components/WhatsAppOnboardingModal";
import { useLocation } from "wouter";
import { Sparkles, ChevronLeft, ChevronRight, Store, MapPin, Globe, MessageCircle, Check } from "lucide-react";
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
   Phase A = visual intro (4 screens)
   Phase B = existing detailed steps (occupation, budget, style, stores, influencers)
   ═══════════════════════════════════════════════════════ */
const PHASE_A_STEPS = 4;
const PHASE_B_STEPS = 5;
const TOTAL_STEPS = PHASE_A_STEPS + PHASE_B_STEPS;

export default function Onboarding() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1); // 1-4 = Phase A, 5-9 = Phase B
  const [saving, setSaving] = useState(false);
  const { t, dir, lang } = useLanguage();

  /* ── Phase A state ── */
  const [gender, setGender] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(""); // casual | elegant | sporty
  const [selectedVenue, setSelectedVenue] = useState(""); // office | bar | beach | event
  const [ageRange, setAgeRange] = useState("");

  /* ── Phase B state ── */
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

  const handleFinish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Merge Phase A visual choices into profile fields
      const mergedStylePrefs = stylePreferences.length > 0
        ? stylePreferences
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
      const mergedStylePrefs = mapStyleToPreferences(selectedStyle);
      const mergedOccupation = mapVenueToOccupation(selectedVenue);

      await saveProfileMutation.mutateAsync({
        ageRange: ageRange || undefined,
        gender: gender || undefined,
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
      case 1: return !!gender;                       // Phase A: gender
      case 2: return !!selectedStyle;                 // Phase A: style silhouette
      case 3: return !!selectedVenue;                 // Phase A: venue
      case 4: return !!ageRange;                      // Phase A: age
      case 5: return !!occupation && !!budgetLevel;   // Phase B: occupation + budget
      case 6: return stylePreferences.length > 0;     // Phase B: style
      case 7: return true;                            // Phase B: stores (optional)
      case 8: return true;                            // Phase B: social (optional)
      case 9: return true;                            // Phase B: influencers (optional)
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
    if (step === 2 && gender) {
      const genderLabel = gender === "female"
        ? (lang === "he" ? "מעולה!" : "Great!")
        : (lang === "he" ? "יופי!" : "Nice!");
      return genderLabel;
    }
    if (step === 3 && selectedStyle) {
      const styleReactions: Record<string, { he: string; en: string }> = {
        casual: { he: "אוהבת נוחות? אני כבר רואה את הכיוון", en: "Love comfort? I see the direction" },
        elegant: { he: "קלאסית. יש לי רעיונות בשבילך", en: "Classic. I have ideas for you" },
        sporty: { he: "אנרגטית! בואי נמצא את הלוק המושלם", en: "Energetic! Let's find the perfect look" },
      };
      const r = styleReactions[selectedStyle];
      return r ? r[lang] || r.en : "";
    }
    if (step === 4 && selectedVenue) {
      const venueReactions: Record<string, { he: string; en: string }> = {
        office: { he: "אופיס שיק — אני יודעת בדיוק מה צריך", en: "Office chic — I know exactly what you need" },
        bar: { he: "ערב בחוץ? בואי נדאג שתבלטי", en: "Night out? Let's make sure you stand out" },
        beach: { he: "וייב חופשי — יש לי כמה רעיונות", en: "Free vibes — I have some ideas" },
        event: { he: "אירוע? הולכים על WOW", en: "Event? Going for WOW" },
      };
      const r = venueReactions[selectedVenue];
      return r ? r[lang] || r.en : "";
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
            {[1, 2, 3, 4].map(i => (
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
              PHASE A — Visual Intro (4 screens)
              ═══════════════════════════════════════════ */}

          {/* ── Screen 1: Gender ── */}
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
                {lang === "he" ? "4 שאלות קצרות — בלי טקסט, רק טאפ" : "4 quick questions — no typing, just tap"}
              </p>

              <p className="text-sm text-muted-foreground mb-4">
                {lang === "he" ? "מי את/ה?" : "Who are you?"}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {GENDER_OPTIONS.map(opt => {
                  const isSelected = gender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setGender(opt.id);
                        // Auto-advance after 400ms
                        setTimeout(() => setStep(2), 400);
                      }}
                      className={`relative p-5 rounded-2xl border-2 text-center transition-all duration-300 ${
                        isSelected
                          ? "border-primary bg-primary/10 scale-105 shadow-lg shadow-primary/20"
                          : "border-white/10 bg-card hover:border-primary/30 hover:scale-102"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <span className="text-3xl block mb-2">
                        {opt.id === "male" ? "👨" : opt.id === "female" ? "👩" : "🧑"}
                      </span>
                      <span className="text-sm font-medium">{getGenderLabel(opt.id)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Screen 2: Style Silhouette ── */}
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
                {lang === "he" ? "מה הסגנון שלך?" : "What's your style?"}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {lang === "he" ? "בחר/י את מה שהכי מתאר אותך" : "Pick what describes you best"}
              </p>

              <div className="grid grid-cols-3 gap-3">
                {(["casual", "elegant", "sporty"] as const).map(style => {
                  const isSelected = selectedStyle === style;
                  const genderKey = gender === "male" ? "male" : "female";
                  const imgUrl = SILHOUETTES[genderKey][style];
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
                      <div className="aspect-[3/4] relative">
                        <img
                          src={imgUrl}
                          alt={labels[style]?.en || style}
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                        {/* Gradient overlay at bottom */}
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

          {/* ── Screen 3: Venue / Atmosphere ── */}
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
                        setTimeout(() => setStep(4), 500);
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

          {/* ── Screen 4: Age + Quick Finish ── */}
          {step === 4 && (
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
                {lang === "he" ? "ושאלה אחרונה..." : "One last thing..."}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {lang === "he" ? "כדי שהניתוח יתאים בדיוק לגיל שלך" : "So the analysis fits your age perfectly"}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {AGE_RANGES.map(opt => {
                  const isSelected = ageRange === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setAgeRange(opt.id)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                          : "border-white/10 bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Terms consent */}
              {ageRange && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        <><Sparkles className="w-5 h-5" /> {lang === "he" ? "יאללה, תראי לי ציון!" : "Show me my score!"}</>
                      )}
                    </Button>
                    <button
                      onClick={() => setStep(5)}
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

          {/* ── Step 5 (Phase B-1): Occupation + Budget ── */}
          {step === 5 && (
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

          {/* ── Step 6 (Phase B-2): Style Preferences ── */}
          {step === 6 && (
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

          {/* ── Step 7 (Phase B-3): Stores ── */}
          {step === 7 && (
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

          {/* ── Step 8 (Phase B-4): Social Connections ── */}
          {step === 8 && (
            <SocialConnectionsStep
              onInstagramClick={() => setStep(9)}
            />
          )}

          {/* ── Step 9 (Phase B-5): Influencers ── */}
          {step === 9 && (
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

          {/* Phase A back button (screens 2-4) */}
          {isPhaseA && step > 1 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setStep(s => s - 1)}
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
