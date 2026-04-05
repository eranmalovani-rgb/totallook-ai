import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import {
  Camera, ScanLine, X, Sparkles, RefreshCw, Lock, ArrowLeft, ArrowRight,
  MapPin, RotateCcw, UserCheck, Settings, Mail, ChevronRight, ChevronLeft,
  ImagePlus, Store, Globe, Image as ImageIcon, Play,
} from "lucide-react";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
import FashionLoadingAnimation from "@/components/FashionLoadingAnimation";
import { useLanguage } from "@/i18n";
import { translations } from "@/i18n/translations";
import { useFingerprint } from "@/hooks/useFingerprint";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { OCCASIONS, GENDER_OPTIONS, AGE_RANGES, BUDGET_OPTIONS, STYLE_OPTIONS, OCCUPATION_OPTIONS, STORE_OPTIONS, COUNTRY_STORE_MAP, filterStoresForUser } from "../../../shared/fashionTypes";
import { useCountry } from "@/hooks/useCountry";
import { getCountryFlag, getCountryName } from "../../../shared/countries";
import InfluencerPicker from "@/components/InfluencerPicker";
import { toast } from "sonner";

/* ─── Quick Onboarding Steps (inline, before upload) ─── */
const ONBOARDING_STEPS = 4; // 1: gender+age, 2: occupation+budget, 3: style+stores, 4: influencers
const GUEST_ONBOARDING_SKIPPED_KEY = "guest_upload_onboarding_skipped";

export default function GuestUpload() {
  const [, navigate] = useLocation();
  const { t, dir, lang } = useLanguage();
  const fingerprint = useFingerprint();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  // Admin token from URL
  const [adminToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("admin_token") || undefined;
  });
  const hasAdminToken = !!adminToken;

  /* ─── Onboarding state ─── */
  // Keep onboarding data optional for guests so upload can happen immediately.
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [occupation, setOccupation] = useState("");
  const [budgetLevel, setBudgetLevel] = useState("");
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [customStore, setCustomStore] = useState("");
  const [saveToWardrobe, setSaveToWardrobe] = useState(true);
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);

  const { country: detectedCountry } = useCountry();

  // Country-specific local stores
  const countryData = useMemo(() => {
    if (!detectedCountry) return null;
    return COUNTRY_STORE_MAP[detectedCountry] || null;
  }, [detectedCountry]);

  // Filter local stores by user's gender and budget
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

  /* ─── Upload state ─── */
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [secondPreview, setSecondPreview] = useState<string | null>(null);
  const [usedCamera, setUsedCamera] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [retryReviewId, setRetryReviewId] = useState<number | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [showEmailCta, setShowEmailCta] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [guestAgreedToTerms, setGuestAgreedToTerms] = useState(false);

  /* ─── Refs ─── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const secondCameraRef = useRef<HTMLInputElement>(null);
  const secondAngleBannerRef = useRef<HTMLDivElement>(null);
  const loadingAreaRef = useRef<HTMLDivElement>(null);
  const occasionRef = useRef<HTMLDivElement>(null);
  const analyzeButtonRef = useRef<HTMLDivElement>(null);

  /* ─── tRPC ─── */
  const uploadMutation = trpc.guest.upload.useMutation();
  const analyzeMutation = trpc.guest.analyze.useMutation();
  const saveProfileMutation = trpc.guest.saveProfile.useMutation();
  const saveEmailMutation = trpc.guest.saveEmail.useMutation();

  // Check limit
  const { data: limitCheck, isLoading: checkingLimit } = trpc.guest.checkLimit.useQuery(
    { fingerprint: fingerprint || "", adminToken },
    { enabled: !!fingerprint && !authLoading && !isAdmin && !hasAdminToken }
  );

  // Load existing guest profile
  const { data: existingProfile } = trpc.guest.getProfile.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  // Pre-fill from existing profile
  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.gender) setGender(existingProfile.gender);
      if (existingProfile.ageRange) setAgeRange(existingProfile.ageRange);
      if (existingProfile.occupation) setOccupation(existingProfile.occupation);
      if (existingProfile.budgetLevel) setBudgetLevel(existingProfile.budgetLevel);
      if (existingProfile.stylePreference) {
        setStylePreferences(existingProfile.stylePreference.split(", ").filter(Boolean));
      }
      if (existingProfile.preferredStores) {
        setSelectedStores(existingProfile.preferredStores.split(", ").filter(Boolean));
      }
      if (existingProfile.favoriteInfluencers) {
        setSelectedInfluencers(existingProfile.favoriteInfluencers.split(", ").filter(Boolean));
      }
    }
  }, [existingProfile]);

  useEffect(() => {
    if (isAdmin || hasAdminToken) {
      setLimitReached(false);
      return;
    }
    if (limitCheck) {
      if (limitCheck.used) setLimitReached(true);
      // Show email CTA after 2 analyses
      if (limitCheck.count >= 2 && !limitCheck.hasEmail) setShowEmailCta(true);
    }
  }, [limitCheck, isAdmin, hasAdminToken]);

  /* ─── Onboarding helpers ─── */
  const getOccupationLabel = (id: string) => {
    const val = t("occupationOptions", id);
    return val !== id ? val : (OCCUPATION_OPTIONS.find(o => o.id === id)?.label || id);
  };

  const canGoNextOnboarding = () => {
    switch (onboardingStep) {
      case 1: return !!gender && !!ageRange;
      case 2: return !!occupation && !!budgetLevel;
      case 3: return stylePreferences.length > 0; // stores optional
      case 4: return true; // influencers optional
      default: return false;
    }
  };

  const handleFinishOnboarding = async () => {
    if (!fingerprint) return;
    try {
      await saveProfileMutation.mutateAsync({
        fingerprint,
        gender: gender || undefined,
        ageRange: ageRange || undefined,
        occupation: occupation || undefined,
        budgetLevel: budgetLevel || undefined,
        stylePreference: stylePreferences.length > 0 ? stylePreferences.join(", ") : undefined,
        preferredStores: selectedStores.length > 0 ? selectedStores.join(", ") : undefined,
        favoriteInfluencers: selectedInfluencers.length > 0 ? selectedInfluencers.join(", ") : undefined,
        country: detectedCountry || undefined,
      });
      setOnboardingDone(true);
      toast.success(lang === "he" ? "הפרופיל נשמר! עכשיו העלה תמונה" : "Profile saved! Now upload a photo");
    } catch {
      toast.error(lang === "he" ? "שגיאה בשמירת הפרופיל" : "Error saving profile");
    }
  };

  /* ─── File handlers ─── */
  const handleFile = useCallback((f: File, fromCamera = false) => {
    if (!f.type.startsWith("image/")) { setError(t("upload", "imageOnly")); return; }
    if (f.size > 10 * 1024 * 1024) { setError(t("upload", "maxSize")); return; }
    setError(null);
    setFile(f);
    setUsedCamera(fromCamera);
    setRetryReviewId(null);
    setSecondFile(null);
    setSecondPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      if (!fromCamera) {
        setTimeout(() => {
          occasionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      } else {
        setTimeout(() => {
          secondAngleBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 400);
      }
    };
    reader.readAsDataURL(f);
  }, [t]);

  const handleSecondFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/") || f.size > 10 * 1024 * 1024) return;
    setSecondFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSecondPreview(e.target?.result as string);
      setTimeout(() => {
        occasionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    };
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const clearFile = () => {
    setFile(null); setPreview(null); setSecondFile(null); setSecondPreview(null);
    setUsedCamera(false); setError(null); setSelectedOccasion(""); setRetryReviewId(null);
  };

  const clearSecondFile = () => { setSecondFile(null); setSecondPreview(null); };

  /* ─── Analyze ─── */
  const handleAnalyze = async () => {
    if (!file || !fingerprint) return;
    setError(null);
    try {
      let sessionId = retryReviewId;
      if (!sessionId) {
        setUploading(true);
        const base64 = await fileToBase64(file);
        let secondBase64: string | undefined;
        let secondMimeType: string | undefined;
        if (secondFile) {
          secondBase64 = await fileToBase64(secondFile);
          secondMimeType = secondFile.type;
        }
        const result = await uploadMutation.mutateAsync({
          imageBase64: base64,
          mimeType: file.type,
          fingerprint,
          ...(adminToken ? { adminToken } : {}),
        });
        sessionId = result.sessionId;
        setRetryReviewId(sessionId);
        setUploading(false);
      }
      setAnalyzing(true);
      await analyzeMutation.mutateAsync({
        sessionId,
        lang,
        occasion: selectedOccasion || undefined,
      });
      navigate(`/guest/review/${sessionId}`);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("limit") || msg.includes("already") || msg.includes("כבר") || msg.includes("מגבלת")) {
        setLimitReached(true);
        setError(lang === "he" ? "הגעת למגבלת 5 ניתוחים. הכנס מייל לניתוחים ללא הגבלה!" : "You've reached the 5 analysis limit. Enter your email for unlimited analyses!");
      } else if (msg.includes("quota") || msg.includes("412") || msg.includes("rate")) {
        setError(t("upload", "rateLimitError"));
        startRetryCountdown(30);
      } else if (msg.includes("timeout")) {
        setError(t("upload", "timeoutError"));
      } else {
        setError(t("upload", "genericError"));
      }
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const startRetryCountdown = (seconds: number) => {
    setRetryCountdown(seconds);
    const interval = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  /* ─── Email CTA ─── */
  const handleSaveEmail = async () => {
    if (!fingerprint || !emailInput.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      toast.error(lang === "he" ? "כתובת מייל לא תקינה" : "Invalid email address");
      return;
    }
    setEmailSaving(true);
    try {
      await saveEmailMutation.mutateAsync({ fingerprint, email: emailInput.trim() });
      toast.success(lang === "he" ? "🎉 מעולה! עכשיו יש לך ניתוחים ללא הגבלה" : "🎉 Great! You now have unlimited analyses");
      setShowEmailCta(false);
      setLimitReached(false);
    } catch {
      toast.error(lang === "he" ? "שגיאה בשמירת המייל" : "Error saving email");
    }
    setEmailSaving(false);
  };

  /* ─── Helpers ─── */
  const getOccasionLabel = (occId: string) => t("occasions", occId) || occId;
  const getGenderLabel = (id: string) => {
    const val = t("genderOptions", id);
    return val !== id ? val : (GENDER_OPTIONS.find(g => g.id === id)?.label || id);
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

  const ArrowIcon = lang === "he" ? ArrowLeft : ArrowRight;
  const BackIcon = lang === "he" ? ChevronRight : ChevronLeft;
  const NextIcon = lang === "he" ? ChevronLeft : ChevronRight;
  const isRtl = dir === "rtl";

  /* ─── Loading state ─── */
  if ((authLoading || (checkingLimit && !isAdmin && !hasAdminToken)) && !limitReached) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  const analysisCount = limitCheck?.count ?? 0;

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      <div className="pt-20 pb-8 container max-w-2xl mx-auto">

        {/* ─── LIMIT REACHED: Email CTA or Signup ─── */}
        {limitReached ? (
          <div className="text-center space-y-8 py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-in zoom-in duration-500">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">
                {lang === "he" ? "ניצלת את כל 5 הניתוחים החינמיים" : "You've used all 5 free analyses"}
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {lang === "he"
                  ? "נהנית מהחוויה? הירשם עכשיו כדי לקבל ניתוחים ללא הגבלה, ארון וירטואלי מלא, פיד סטייל, ועוד!"
                  : "Enjoyed the experience? Sign up now for unlimited analyses, full virtual wardrobe, style feed, and more!"}
              </p>
            </div>

            <Button size="lg" className="gap-2 px-8 py-4 text-base" asChild>
              <a href={getLoginUrl()}>
                <Sparkles className="w-5 h-5" />
                {lang === "he" ? "הירשם עכשיו — בחינם" : "Sign up now — it's free"}
              </a>
            </Button>

            <p className="text-xs text-muted-foreground/50">
              {lang === "he" ? "כל הניתוחים והארון הווירטואלי שלך יישמרו בחשבון החדש" : "All your analyses and virtual wardrobe will be saved to your new account"}
            </p>
          </div>
        ) : false ? (
          /* ─── QUICK ONBOARDING ─── */
          <div className="max-w-lg mx-auto">
            {/* Progress */}
            <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-white/5">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                style={{ width: `${(onboardingStep / ONBOARDING_STEPS) * 100}%` }}
              />
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                {lang === "he" ? "התאמה אישית מהירה" : "Quick Personalization"}
              </div>
              <p className="text-muted-foreground text-sm">
                {lang === "he"
                  ? "30 שניות — כדי שהניתוח יתאים בדיוק אליך"
                  : "30 seconds — so the analysis fits you perfectly"}
              </p>
            </div>

            {/* Step 1: Gender + Age */}
            {onboardingStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-center">
                  {lang === "he" ? "ספר/י לנו על עצמך" : "Tell us about yourself"}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGender(g.id)}
                      className={`p-4 rounded-xl text-center transition-all border ${
                        gender === g.id
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                          : "bg-card border-white/10 hover:border-primary/30"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{g.id === "male" ? "👨" : g.id === "female" ? "👩" : "🧑"}</span>
                      <span className="text-sm font-medium">{getGenderLabel(g.id)}</span>
                    </button>
                  ))}
                </div>
                {gender && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-sm text-muted-foreground text-center mb-3">{t("onboarding", "ageTitle")}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {AGE_RANGES.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setAgeRange(a.id)}
                          className={`p-3 rounded-xl text-center transition-all border text-sm ${
                            ageRange === a.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-white/10 hover:border-primary/30"
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Occupation + Budget */}
            {onboardingStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-center">{t("onboarding", "occupationTitle")}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {OCCUPATION_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setOccupation(opt.id)}
                      className={`p-4 rounded-xl border text-center transition-all duration-200 ${
                        occupation === opt.id
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                          : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{opt.icon}</span>
                      <span className="font-medium">{getOccupationLabel(opt.id)}</span>
                    </button>
                  ))}
                </div>
                {occupation && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-sm text-muted-foreground text-center mb-3">{t("onboarding", "budgetSubtitle")}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {BUDGET_OPTIONS.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setBudgetLevel(b.id)}
                          className={`p-4 rounded-xl text-center transition-all border ${
                            budgetLevel === b.id
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                              : "bg-card border-white/10 hover:border-primary/30"
                          }`}
                        >
                          <span className="text-xl block mb-1">{b.icon}</span>
                          <span className="font-medium block">{getBudgetLabel(b.id)}</span>
                          <span className={`text-xs ${budgetLevel === b.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {getBudgetRange(b.id)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Style + Stores */}
            {onboardingStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-center">
                  {lang === "he" ? "מה הסגנון שלך?" : "What's your style?"}
                </h2>
                <p className="text-muted-foreground text-center">
                  {t("onboarding", "styleSubtitle")} <span className="text-primary/70">{t("onboarding", "multiSelect")}</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {STYLE_OPTIONS.map((s) => {
                    const isSelected = stylePreferences.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setStylePreferences(prev =>
                            prev.includes(s.id)
                              ? prev.filter(x => x !== s.id)
                              : [...prev, s.id]
                          );
                        }}
                        className={`p-3 rounded-xl text-center transition-all border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-white/10 hover:border-primary/30"
                        }`}
                      >
                        <span className="text-xs font-medium block">{getStyleLabel(s.id)}</span>
                        <span className={`text-[10px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {getStyleDesc(s.id)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {stylePreferences.length > 0 && (
                  <p className="text-xs text-primary/70 text-center mt-2">
                    {t("common", "selected")} {stylePreferences.length} {t("onboarding", "stylesSelected")}
                  </p>
                )}

                {/* Stores — appears after selecting at least one style */}
                {stylePreferences.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4 pt-4 border-t border-white/5">
                    <p className="text-sm text-muted-foreground text-center">
                      {t("onboarding", "storesSubtitle")} <span className="text-primary/70">({lang === "he" ? "אופציונלי" : "optional"})</span>
                    </p>

                {/* Local stores section — country-specific */}
                {countryData && detectedCountry && (
                  <div>
                    <p className="text-sm text-primary/80 mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {getCountryFlag(detectedCountry || "")} {t("onboarding", "storesPopularInCountry")}{getCountryName(detectedCountry || "", lang as "he" | "en")}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredLocalStores.map(store => {
                        const isSelected = selectedStores.includes(store.name);
                        return (
                          <button
                            key={store.name}
                            onClick={() => toggleStore(store.name)}
                            className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                            }`}
                          >
                            <span className="text-xs font-medium block truncate">{store.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recommended stores based on budget */}
                {budgetLevel && recommendedStores.length > 0 && (
                  <div>
                    <p className="text-sm text-primary/80 mb-2 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      {t("onboarding", "storesRecommended")}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {recommendedStores.filter(s => !localStoreNames.has(s.label)).map(store => {
                        const isSelected = selectedStores.includes(store.label);
                        return (
                          <button
                            key={store.id}
                            onClick={() => toggleStore(store.label)}
                            className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                            }`}
                          >
                            <span className="text-lg block mb-0.5">{store.icon}</span>
                            <span className="text-xs font-medium block truncate">{store.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* International / Other stores */}
                {otherStores.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      {countryData ? t("onboarding", "storesGlobal") : t("onboarding", "storesOther")}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {otherStores.filter(s => !localStoreNames.has(s.label)).map(store => {
                        const isSelected = selectedStores.includes(store.label);
                        return (
                          <button
                            key={store.id}
                            onClick={() => toggleStore(store.label)}
                            className={`p-2.5 rounded-xl border text-center transition-all duration-200 ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                            }`}
                          >
                            <span className="text-xs font-medium block truncate">{store.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom store input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customStore}
                    onChange={(e) => setCustomStore(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomStore()}
                    placeholder={t("onboarding", "addStore")}
                    className="flex-1 px-4 py-2 rounded-xl bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                  />
                  <Button variant="outline" size="sm" onClick={addCustomStore} disabled={!customStore.trim()} className="rounded-xl">
                    {t("common", "add")}
                  </Button>
                </div>

                {selectedStores.length > 0 && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-2">{t("common", "selected")} ({selectedStores.length}):</p>
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
                  </div>
                )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Influencers */}
            {onboardingStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-center">
                  {lang === "he" ? "משפיענים שמשפיעים עליך" : "Influencers you follow"}
                </h2>
                <p className="text-sm text-muted-foreground text-center">
                  {lang === "he" ? "אופציונלי — עוזר לנו להתאים את ההמלצות" : "Optional — helps us tailor recommendations"}
                </p>
                <InfluencerPicker
                  gender={gender || undefined}
                  selectedInfluencers={selectedInfluencers}
                  onToggle={(name) => {
                    setSelectedInfluencers(prev =>
                      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
                    );
                  }}
                  userProfile={gender || ageRange || budgetLevel || stylePreferences.length > 0 ? {
                    ageRange: ageRange || undefined,
                    budgetLevel: budgetLevel || undefined,
                    stylePreference: stylePreferences.join(", ") || undefined,
                  } : undefined}
                />
              </div>
            )}


            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8">
              {onboardingStep > 1 ? (
                <Button variant="ghost" size="sm" onClick={() => setOnboardingStep(s => s - 1)} className="gap-1">
                  <BackIcon className="w-4 h-4" />
                  {lang === "he" ? "חזרה" : "Back"}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => { setOnboardingDone(true); }} className="text-muted-foreground">
                  {lang === "he" ? "דלג" : "Skip"}
                </Button>
              )}

              {onboardingStep < ONBOARDING_STEPS ? (
                <Button
                  onClick={() => setOnboardingStep(s => s + 1)}
                  disabled={!canGoNextOnboarding()}
                  className="gap-1"
                >
                  {lang === "he" ? "הבא" : "Next"}
                  <NextIcon className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinishOnboarding}
                  disabled={saveProfileMutation.isPending}
                  className="gap-1 bg-gradient-to-r from-primary to-emerald-500"
                >
                  {saveProfileMutation.isPending ? <FashionButtonSpinner /> : (
                    <>
                      {lang === "he" ? "בוא נתחיל!" : "Let's go!"}
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* ─── UPLOAD SECTION (after onboarding) ─── */
          <>
            {/* Header */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                {lang === "he"
                  ? `ניתוח ${analysisCount + 1} מתוך ${limitCheck?.hasEmail ? "∞" : "5"}`
                  : `Analysis ${analysisCount + 1} of ${limitCheck?.hasEmail ? "∞" : "5"}`}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                <Sparkles className="w-6 h-6 text-primary inline-block ml-1.5" />
                {t("guest", "uploadTitle")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t("guest", "uploadSubtitle")}
              </p>
            </div>

            {/* Privacy banner */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400 font-medium">{t("upload", "privacyBanner")}</p>
            </div>

            {/* Email CTA Banner (after 2 analyses) */}
            {showEmailCta && !limitReached && (
              <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      {lang === "he"
                        ? `נשארו לך ${5 - analysisCount} ניתוחים חינם`
                        : `You have ${5 - analysisCount} free analyses left`}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {lang === "he"
                        ? "הכנס מייל וקבל ניתוחים ללא הגבלה — בחינם!"
                        : "Enter your email for unlimited analyses — free!"}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                        dir="ltr"
                      />
                      <Button size="sm" onClick={handleSaveEmail} disabled={emailSaving || !emailInput.trim()}>
                        {emailSaving ? <FashionButtonSpinner /> : (lang === "he" ? "שמור" : "Save")}
                      </Button>
                    </div>
                  </div>
                  <button onClick={() => setShowEmailCta(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Area */}
            {!preview ? (
              <div className="mirror-scene">
                <div
                  className={`mirror-frame relative cursor-pointer transition-all duration-500 ${dragOver ? "scale-[1.02]" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    if (window.innerWidth < 768) {
                      e.stopPropagation();
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                >
                  <div className="relative rounded-[20px] p-[3px] bg-gradient-to-b from-primary/60 via-amber-600/40 to-primary/30 shadow-[0_8px_32px_rgba(180,140,60,0.15),0_2px_8px_rgba(0,0,0,0.3)]">
                    <div className="rounded-[17px] p-[2px] bg-gradient-to-b from-amber-300/20 via-transparent to-amber-800/20">
                      <div className={`relative rounded-[15px] overflow-hidden bg-gradient-to-b from-card via-background to-card/80 border border-white/5 ${dragOver ? "bg-primary/5" : ""}`}>
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <div className="mirror-reflection-sweep absolute inset-0 w-[60%] h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                        </div>
                        <div className="mirror-shimmer absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 pointer-events-none" />
                        <div className="relative z-10 py-10 px-6 flex flex-col items-center gap-4">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                          <div className="mirror-float relative">
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-[1.8]" />
                            <div className="relative w-18 h-18 rounded-full bg-gradient-to-br from-primary/25 to-amber-500/15 border border-primary/25 flex items-center justify-center backdrop-blur-sm">
                              <Camera className="w-8 h-8 text-primary" />
                              <ScanLine className="w-4 h-4 text-primary/50 absolute bottom-2 right-2" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{t("upload", "dragHere")}</p>
                            <p className="text-muted-foreground text-sm mt-0.5 hidden md:block">{t("upload", "orClickToSelect")}</p>
                          </div>

                          {/* Mobile: Two separate buttons for Camera and Gallery */}
                          <div className="flex gap-3 md:hidden w-full px-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cameraInputRef.current?.click();
                              }}
                              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/25 transition-colors"
                            >
                              <Camera className="w-5 h-5" />
                              {t("upload", "takePhoto")}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground font-bold text-sm hover:bg-white/10 transition-colors"
                            >
                              <ImageIcon className="w-5 h-5" />
                              {t("upload", "chooseFromGallery")}
                            </button>
                          </div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                        </div>
                        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-primary/20 rounded-tl-sm pointer-events-none" />
                        <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-primary/20 rounded-tr-sm pointer-events-none" />
                        <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-primary/20 rounded-bl-sm pointer-events-none" />
                        <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-primary/20 rounded-br-sm pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="mx-auto w-20 h-3 mirror-stand mt-0" />
                </div>
                {/* Hidden file input — gallery */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const isCamera = f.lastModified > Date.now() - 30000;
                      handleFile(f, isCamera);
                    }
                  }}
                />
                {/* Hidden file input — camera (with capture for Android) */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f, true);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Preview */}
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-card">
                  <img src={preview} alt="Preview" className="w-full max-h-[400px] object-contain mx-auto" />
                  {!uploading && !analyzing && (
                    <button
                      onClick={clearFile}
                      className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Second Angle — camera only */}
                {usedCamera && !secondPreview && !uploading && !analyzing && (
                  <div ref={secondAngleBannerRef} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                      <RotateCcw className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground flex-1">
                      {t("upload", "secondAngleSuggest")}
                    </p>
                    <button
                      onClick={() => secondCameraRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    >
                      {t("upload", "secondAngleAdd")}
                    </button>
                    <input
                      ref={secondCameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleSecondFile(f);
                      }}
                    />
                  </div>
                )}

                {/* Second Angle Preview */}
                {secondPreview && !uploading && !analyzing && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">{t("upload", "secondAngleBadge")}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-card">
                        <img src={preview!} alt="Primary" className="w-full h-48 object-cover" />
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-medium">
                          {lang === "he" ? "ראשית" : "Primary"}
                        </span>
                      </div>
                      <div className="relative rounded-xl overflow-hidden border border-primary/20 bg-card">
                        <img src={secondPreview} alt="Second angle" className="w-full h-48 object-cover" />
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-medium">
                          {lang === "he" ? "זווית נוספת" : "2nd angle"}
                        </span>
                        <button
                          onClick={clearSecondFile}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Occasion + Analyze */}
                {!uploading && !analyzing && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Occasion */}
                    <div ref={occasionRef} className="p-6 rounded-2xl border border-white/5 bg-card/50 scroll-mt-24">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">{t("upload", "occasionTitle")}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{t("upload", "occasionDesc")}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {OCCASIONS.map((occ) => {
                          const isSelected = selectedOccasion === occ.id;
                          return (
                            <button
                              key={occ.id}
                              onClick={() => {
                                setSelectedOccasion(isSelected ? "" : occ.id);
                                if (!isSelected) {
                                  setTimeout(() => {
                                    analyzeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                                  }, 200);
                                }
                              }}
                              className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                  : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                              }`}
                            >
                              <span className="text-xl block mb-1">{occ.icon}</span>
                              <span className="block text-xs font-medium">{getOccasionLabel(occ.id)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Influencer info */}
                    {selectedInfluencers.length > 0 && (
                      <div className="p-4 rounded-2xl border border-white/5 bg-card/50">
                        <div className="flex items-center gap-2 mb-2">
                          <UserCheck className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{lang === "he" ? "משפיענים שנבחרו" : "Selected influencers"}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedInfluencers.map(name => (
                            <span key={name} className="px-2.5 py-1 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Terms & Privacy consent */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={guestAgreedToTerms}
                        onChange={(e) => setGuestAgreedToTerms(e.target.checked)}
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

                    {/* Analyze Button */}
                    <div ref={analyzeButtonRef} className="relative mt-2">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-amber-500 to-primary rounded-2xl blur-lg opacity-40 animate-pulse" />
                      <Button
                        size="lg"
                        disabled={!guestAgreedToTerms}
                        className={`relative w-full gap-3 text-xl font-bold py-8 rounded-2xl bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${!guestAgreedToTerms ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          handleAnalyze();
                          setTimeout(() => {
                            if (loadingAreaRef.current) {
                              const rect = loadingAreaRef.current.getBoundingClientRect();
                              const scrollTarget = window.scrollY + rect.top - 80;
                              window.scrollTo({ top: scrollTarget, behavior: "smooth" });
                            }
                          }, 150);
                        }}
                      >
                        <Sparkles className="w-6 h-6 animate-pulse" />
                        {retryReviewId ? t("upload", "retryButton") : t("guest", "analyzeButton")}
                        {selectedOccasion && (
                          <span className="text-base opacity-90">
                            ({OCCASIONS.find(o => o.id === selectedOccasion)?.icon} {getOccasionLabel(selectedOccasion)})
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Loading */}
                {(uploading || analyzing) && (
                  <div ref={loadingAreaRef}>
                    <FashionLoadingAnimation
                      uploading={uploading}
                      analyzing={analyzing}
                      selectedOccasion={selectedOccasion}
                      selectedInfluencers={selectedInfluencers}
                      imagePreview={preview}
                    />
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
                    <p className="text-destructive">{error}</p>
                    {retryReviewId && (
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setRetryCountdown(0); handleAnalyze(); }}
                          className="gap-2"
                          disabled={analyzing}
                        >
                          <RefreshCw className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
                          {retryCountdown > 0 ? `${t("upload", "retryCountdown")} (${retryCountdown}s)` : t("upload", "retryButton")}
                        </Button>
                        <p className="text-xs text-muted-foreground">{t("upload", "imageSaved")}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tips */}
            <details className="mt-6 rounded-2xl border border-white/5 bg-card/50 group">
              <summary className="p-4 font-bold text-sm cursor-pointer list-none flex items-center justify-between">
                {t("upload", "tipsTitle")}
                <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <ul className="px-4 pb-4 space-y-1.5 text-xs text-muted-foreground">
                {["tip1", "tip2", "tip3"].map((tipKey) => (
                  <li key={tipKey} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {t("upload", tipKey)}
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>

      {/* Try Demo CTA */}
      <div className="container max-w-2xl mx-auto mt-6 mb-2">
        <div className="relative p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 shrink-0">
              <Play className="w-5 h-5 text-primary" />
            </div>
            <div className={`flex-1 text-center sm:${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              <p className="font-bold text-sm text-foreground">{t("upload", "tryDemoTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("upload", "tryDemoDesc")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/demo")}
              className="shrink-0 gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary font-bold"
            >
              <Play className="w-4 h-4" />
              {t("upload", "tryDemoButton")}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-border">
        <div className="container max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/70">
            <Link href="/terms" className="hover:text-foreground transition-colors underline underline-offset-4">
              {lang === "he" ? "תנאי שימוש" : "Terms of Service"}
            </Link>
            <span className="text-border">|</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors underline underline-offset-4">
              {lang === "he" ? "מדיניות פרטיות" : "Privacy Policy"}
            </Link>
            <span className="text-border">|</span>
            <Link href="/about" className="hover:text-foreground transition-colors underline underline-offset-4">
              {lang === "he" ? "מי אנחנו" : "About"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Util ─── */
function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });
}
