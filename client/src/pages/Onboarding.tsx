import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import WhatsAppOnboardingModal from "@/components/WhatsAppOnboardingModal";
import { useLocation } from "wouter";
import { Sparkles, ChevronLeft, ChevronRight, Store, MapPin, Globe, MessageCircle } from "lucide-react";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
import { toast } from "sonner";
import {
  AGE_RANGES, GENDER_OPTIONS, OCCUPATION_OPTIONS,
  BUDGET_OPTIONS, STYLE_OPTIONS, STORE_OPTIONS, COUNTRY_STORE_MAP,
} from "../../../shared/fashionTypes";
import InfluencerPicker from "@/components/InfluencerPicker";
import PhoneInput from "@/components/PhoneInput";
import { useLanguage } from "@/i18n";
import { translations } from "@/i18n/translations";
import { useCountry } from "@/hooks/useCountry";
import { getCountryFlag, getCountryName } from "../../../shared/countries";

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { t, dir, lang } = useLanguage();

  // Form state
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
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

  const handleFinish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveProfileMutation.mutateAsync({
        ageRange: ageRange || undefined,
        gender: gender || undefined,
        occupation: occupation || undefined,
        budgetLevel: budgetLevel || undefined,
        stylePreference: stylePreferences.length > 0 ? stylePreferences.join(", ") : undefined,
        favoriteInfluencers: selectedInfluencers.length > 0 ? selectedInfluencers.join(", ") : undefined,
        preferredStores: selectedStores.length > 0 ? selectedStores.join(", ") : undefined,
        saveToWardrobe: true,
        onboardingCompleted: true,
        country: detectedCountry || undefined,
        phoneNumber: phoneNumber || undefined,
      });
      // If phone was saved, show WhatsApp onboarding modal before redirecting
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

  const canGoNext = () => {
    switch (step) {
      case 1: return !!gender && !!ageRange;
      case 2: return !!occupation && !!budgetLevel;
      case 3: return stylePreferences.length > 0; // stores optional
      case 4: return true; // influencers optional
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir={dir}>
      {/* WhatsApp Onboarding Modal */}
      <WhatsAppOnboardingModal
        open={showWhatsAppModal}
        onClose={() => { window.location.href = "/upload"; }}
        phoneNumber={phoneNumber}
      />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-primary to-rose-500 transition-all duration-500"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">
                {t("onboarding", "stepOf")} {step} {t("onboarding", "outOf")} {TOTAL_STEPS}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {lang === "he" ? "15 שניות — כדי שהניתוח יתאים בדיוק אליך" : "15 seconds — so the analysis fits you perfectly"}
            </p>
          </div>

          {/* ═══ Step 1: Gender + Age ═══ */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">
                {firstName
                  ? `${lang === "he" ? "היי" : "Hey"} ${firstName}! ${t("onboarding", "genderTitleWithName")}`
                  : t("onboarding", "genderTitle")}
              </h2>
              <p className="text-muted-foreground text-center text-sm">{t("onboarding", "genderSubtitle")}</p>

              <div className="grid grid-cols-3 gap-3">
                {GENDER_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setGender(opt.id)}
                    className={`p-4 rounded-2xl border text-center transition-all duration-200 ${
                      gender === opt.id
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{opt.id === "male" ? "👨" : opt.id === "female" ? "👩" : "🧑"}</span>
                    <span className="text-sm font-medium">{getGenderLabel(opt.id)}</span>
                  </button>
                ))}
              </div>

              {/* Age — appears after gender is selected */}
              {gender && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-muted-foreground text-center text-sm mb-3">{t("onboarding", "ageTitle")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {AGE_RANGES.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setAgeRange(opt.id)}
                        className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                          ageRange === opt.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                        }`}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Phone — appears after age is selected */}
                  {ageRange && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-4">
                      <PhoneInput
                        value={phoneNumber}
                        onChange={setPhoneNumber}
                        defaultCountry={detectedCountry || "IL"}
                        label={lang === "he" ? "מספר WhatsApp (אופציונלי)" : "WhatsApp number (optional)"}
                        hint={lang === "he"
                          ? "קבלו ניתוח אופנתי ישירות בוואטסאפ — שלחו תמונה וקבלו תוצאות"
                          : "Get fashion analysis directly on WhatsApp — send a photo and get results"
                        }
                        placeholder={detectedCountry === "IL" || !detectedCountry ? "52 123 4567" : undefined}
                        dir={dir}
                      />
                      {/* WhatsApp Feature Explanation */}
                      <div className={`mt-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20 ${dir === "rtl" ? "text-right" : "text-left"}`} dir={dir}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <h4 className="text-sm font-bold text-green-400">
                            {lang === "he" ? "למה כדאי?" : "Why add your number?"}
                          </h4>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {lang === "he"
                              ? "📸 שלחו תמונה ב-WhatsApp וקבלו ניתוח אופנתי מלא תוך שניות — בלי לפתוח אפליקציה"
                              : "📸 Send a photo on WhatsApp and get a full fashion analysis in seconds — no app needed"}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {lang === "he"
                              ? "👗 קבלו המלצות לוק מותאמות אישית, ציונים, וטיפים לשדרוג — הכל ישירות בצ'אט"
                              : "👗 Get personalized look recommendations, scores, and upgrade tips — all in chat"}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {lang === "he"
                              ? "🔒 המספר שלכם נשמר בצורה מאובטחת ומשמש רק לשירות הניתוח"
                              : "🔒 Your number is stored securely and used only for the analysis service"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ Step 2: Occupation + Budget ═══ */}
          {step === 2 && (
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

              {/* Budget — appears after occupation is selected */}
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

          {/* ═══ Step 3: Style + Stores ═══ */}
          {step === 3 && (
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
              {stylePreferences.length > 0 && (
                <p className="text-xs text-primary/70 text-center">
                  {t("common", "selected")} {stylePreferences.length} {t("onboarding", "stylesSelected")}
                </p>
              )}

              {/* Stores — collapsible section below styles */}
              {stylePreferences.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4 pt-2 border-t border-white/5">
                  <p className="text-muted-foreground text-center text-sm">
                    {t("onboarding", "storesTitle")} <span className="text-muted-foreground/50">({lang === "he" ? "אופציונלי" : "optional"})</span>
                  </p>

                  {/* Local stores */}
                  {countryData && detectedCountry && filteredLocalStores.length > 0 && (
                    <div>
                      <p className="text-xs text-primary/80 mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {getCountryFlag(detectedCountry)} {t("onboarding", "storesPopularInCountry")}{getCountryName(detectedCountry, lang as "he" | "en")}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {filteredLocalStores.slice(0, 9).map(store => {
                          const isSelected = selectedStores.includes(store.name);
                          return (
                            <button
                              key={store.name}
                              onClick={() => toggleStore(store.name)}
                              className={`p-2 rounded-lg border text-center transition-all duration-200 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
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

                  {/* Recommended stores */}
                  {budgetLevel && recommendedStores.length > 0 && (
                    <div>
                      <p className="text-xs text-primary/80 mb-2 flex items-center gap-1.5">
                        <Store className="w-3 h-3" />
                        {t("onboarding", "storesRecommended")}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {recommendedStores.filter(s => !localStoreNames.has(s.label)).slice(0, 6).map(store => {
                          const isSelected = selectedStores.includes(store.label);
                          return (
                            <button
                              key={store.id}
                              onClick={() => toggleStore(store.label)}
                              className={`p-2 rounded-lg border text-center transition-all duration-200 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
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

                  {/* Global stores */}
                  {otherStores.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Globe className="w-3 h-3" />
                        {countryData ? t("onboarding", "storesGlobal") : t("onboarding", "storesOther")}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {otherStores.filter(s => !localStoreNames.has(s.label)).slice(0, 6).map(store => {
                          const isSelected = selectedStores.includes(store.label);
                          return (
                            <button
                              key={store.id}
                              onClick={() => toggleStore(store.label)}
                              className={`p-2 rounded-lg border text-center transition-all duration-200 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
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
            </div>
          )}

          {/* ═══ Step 4: Influencers (optional) ═══ */}
          {step === 4 && (
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

          {/* Terms & Privacy consent on last step */}
          {step === TOTAL_STEPS && (
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

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                className="gap-2 rounded-xl"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {t("common", "back")}
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
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

          {/* Skip button for optional steps (3 stores part, 4 influencers) */}
          {step === 4 && (
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
