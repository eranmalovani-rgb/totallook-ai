import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Pencil, Check, X, RefreshCw, User, Calendar, Briefcase, Wallet, Palette, Users, ShoppingBag, Store, Phone, Shield, Download, Trash2, FileText } from "lucide-react";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import {
  AGE_RANGES, GENDER_OPTIONS, OCCUPATION_OPTIONS,
  BUDGET_OPTIONS, STYLE_OPTIONS, STORE_OPTIONS,
} from "../../../shared/fashionTypes";
import InfluencerPicker from "@/components/InfluencerPicker";
import PhoneInput from "@/components/PhoneInput";
import WhatsAppOnboardingModal from "@/components/WhatsAppOnboardingModal";
import { useLanguage } from "@/i18n";
import { translations } from "@/i18n/translations";

type EditingField = "gender" | "ageRange" | "occupation" | "budgetLevel" | "stylePreference" | "favoriteInfluencers" | "preferredStores" | "saveToWardrobe" | "phoneNumber" | null;

export default function Profile() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const utils = trpc.useUtils();
  const saveProfileMutation = trpc.profile.save.useMutation();
  const { t, dir, lang } = useLanguage();

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [savedPhoneNumber, setSavedPhoneNumber] = useState("");
  const [editMultiValue, setEditMultiValue] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isRtl = dir === "rtl";

  // Translation helpers
  const getGenderLabel = (id: string | null | undefined): string => {
    if (!id) return t("common", "notSet");
    const val = t("genderOptions", id);
    return val !== id ? val : (GENDER_OPTIONS.find(g => g.id === id)?.label || id);
  };
  const getOccupationLabel = (id: string | null | undefined): string => {
    if (!id) return t("common", "notSet");
    const val = t("occupationOptions", id);
    return val !== id ? val : (OCCUPATION_OPTIONS.find(o => o.id === id)?.label || id);
  };
  const getOccupationIcon = (id: string | null | undefined): string => {
    if (!id) return "✨";
    return OCCUPATION_OPTIONS.find(o => o.id === id)?.icon || "✨";
  };
  const getBudgetLabel = (id: string | null | undefined): string => {
    if (!id) return t("common", "notSet");
    const sec = (translations as any).budgetOptions?.[id];
    if (sec?.label?.[lang]) return sec.label[lang];
    return BUDGET_OPTIONS.find(b => b.id === id)?.label || id;
  };
  const getBudgetRange = (id: string | null | undefined): string => {
    if (!id) return "";
    const sec = (translations as any).budgetOptions?.[id];
    if (sec?.range?.[lang]) return sec.range[lang];
    return BUDGET_OPTIONS.find(b => b.id === id)?.range || "";
  };
  const getStyleLabel = (id: string): string => {
    const sec = (translations as any).styleOptions?.[id];
    if (sec?.label?.[lang]) return sec.label[lang];
    return STYLE_OPTIONS.find(s => s.id === id)?.label || id;
  };
  const getStyleDesc = (id: string): string => {
    const sec = (translations as any).styleOptions?.[id];
    if (sec?.desc?.[lang]) return sec.desc[lang];
    return STYLE_OPTIONS.find(s => s.id === id)?.description || "";
  };

  const getStyleLabels = (styleStr: string | null | undefined): string[] => {
    if (!styleStr) return [];
    return styleStr.split(",").map(s => getStyleLabel(s.trim()));
  };


  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <FashionSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!profile || !profile.onboardingCompleted) {
    navigate("/onboarding");
    return null;
  }

  const startEdit = (field: EditingField) => {
    if (!field) return;
    setEditingField(field);
    switch (field) {
      case "gender":
        setEditValue(profile.gender || "");
        break;
      case "ageRange":
        setEditValue(profile.ageRange || "");
        break;
      case "occupation":
        setEditValue(profile.occupation || "");
        break;
      case "budgetLevel":
        setEditValue(profile.budgetLevel || "");
        break;
      case "stylePreference":
        setEditMultiValue(profile.stylePreference ? profile.stylePreference.split(",").map(s => s.trim()) : []);
        break;
      case "favoriteInfluencers":
        setEditMultiValue(profile.favoriteInfluencers ? profile.favoriteInfluencers.split(",").map(s => s.trim()) : []);
        break;
      case "preferredStores":
        setEditMultiValue(profile.preferredStores ? profile.preferredStores.split(",").map(s => s.trim()) : []);
        break;
      case "saveToWardrobe":
        setEditValue(profile.saveToWardrobe ? "true" : "false");
        break;
      case "phoneNumber":
        setEditValue(profile.phoneNumber || "");
        break;
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
    setEditMultiValue([]);
  };

  const saveField = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, any> = { onboardingCompleted: true };
      switch (editingField) {
        case "gender": updateData.gender = editValue; break;
        case "ageRange": updateData.ageRange = editValue; break;
        case "occupation": updateData.occupation = editValue; break;
        case "budgetLevel": updateData.budgetLevel = editValue; break;
        case "stylePreference": updateData.stylePreference = editMultiValue.join(", "); break;
        case "favoriteInfluencers": updateData.favoriteInfluencers = editMultiValue.join(", "); break;
        case "preferredStores": updateData.preferredStores = editMultiValue.join(", "); break;
        case "saveToWardrobe": updateData.saveToWardrobe = editValue === "true"; break;
        case "phoneNumber": updateData.phoneNumber = editValue || null; break;
      }
      const result = await saveProfileMutation.mutateAsync(updateData);
      await utils.profile.get.invalidate();
      toast.success(t("profile", "updated"));
      // Show WhatsApp onboarding modal if phone was just saved and welcome was sent
      if (editingField === "phoneNumber" && editValue && result.whatsAppWelcomeSent) {
        setSavedPhoneNumber(editValue);
        setShowWhatsAppModal(true);
      }
      setEditingField(null);
    } catch (err: any) {
      toast.error(t("profile", "updateError") + ": " + (err?.message || t("common", "tryAgain")));
    } finally {
      setSaving(false);
    }
  };

  const toggleMultiValue = (val: string) => {
    setEditMultiValue(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const budgetDisplay = getBudgetRange(profile.budgetLevel)
    ? `${getBudgetLabel(profile.budgetLevel)} (${getBudgetRange(profile.budgetLevel)})`
    : getBudgetLabel(profile.budgetLevel);
  const styleLabels = getStyleLabels(profile.stylePreference);
  const influencerNames = profile.favoriteInfluencers
    ? profile.favoriteInfluencers.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const storeNames = profile.preferredStores
    ? profile.preferredStores.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      {/* WhatsApp Onboarding Modal */}
      <WhatsAppOnboardingModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        phoneNumber={savedPhoneNumber}
      />

      <Navbar />
      <div className="container max-w-2xl pt-24 pb-16 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {firstName
              ? (lang === "he" ? `${t("profile", "title")} ${firstName}` : `${firstName}${t("profile", "title")}`)
              : t("profile", "myProfile")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("profile", "subtitle")}</p>
        </div>

        {/* Profile fields */}
        <div className="space-y-3">
          {/* Gender */}
          <ProfileField
            icon={<User className="w-5 h-5" />}
            label={t("profile", "gender")}
            value={getGenderLabel(profile.gender)}
            isEditing={editingField === "gender"}
            onEdit={() => startEdit("gender")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="grid grid-cols-3 gap-2 mt-2">
              {GENDER_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEditValue(opt.id)}
                  className={`p-2 rounded-xl border text-sm font-medium transition-all ${
                    editValue === opt.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-white/10 hover:border-primary/30"
                  }`}
                >
                  {getGenderLabel(opt.id)}
                </button>
              ))}
            </div>
          </ProfileField>

          {/* Age */}
          <ProfileField
            icon={<Calendar className="w-5 h-5" />}
            label={t("profile", "ageRange")}
            value={profile.ageRange ? (AGE_RANGES.find(a => a.id === profile.ageRange)?.label || profile.ageRange) : t("common", "notSet")}
            isEditing={editingField === "ageRange"}
            onEdit={() => startEdit("ageRange")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="grid grid-cols-3 gap-2 mt-2">
              {AGE_RANGES.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEditValue(opt.id)}
                  className={`p-2 rounded-xl border text-sm font-medium transition-all ${
                    editValue === opt.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-white/10 hover:border-primary/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </ProfileField>

          {/* Occupation */}
          <ProfileField
            icon={<Briefcase className="w-5 h-5" />}
            label={t("profile", "occupation")}
            value={`${getOccupationIcon(profile.occupation)} ${getOccupationLabel(profile.occupation)}`}
            isEditing={editingField === "occupation"}
            onEdit={() => startEdit("occupation")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="grid grid-cols-2 gap-2 mt-2">
              {OCCUPATION_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEditValue(opt.id)}
                  className={`p-2 rounded-xl border text-sm font-medium transition-all ${isRtl ? "text-right" : "text-left"} ${
                    editValue === opt.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-white/10 hover:border-primary/30"
                  }`}
                >
                  <span className={isRtl ? "ml-1" : "mr-1"}>{opt.icon}</span> {getOccupationLabel(opt.id)}
                </button>
              ))}
            </div>
          </ProfileField>

          {/* Budget */}
          <ProfileField
            icon={<Wallet className="w-5 h-5" />}
            label={t("profile", "budget")}
            value={budgetDisplay}
            isEditing={editingField === "budgetLevel"}
            onEdit={() => startEdit("budgetLevel")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="grid grid-cols-2 gap-2 mt-2">
              {BUDGET_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEditValue(opt.id)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${isRtl ? "text-right" : "text-left"} ${
                    editValue === opt.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-white/10 hover:border-primary/30"
                  }`}
                >
                  <span className="text-lg block">{opt.icon}</span>
                  <span className="block">{getBudgetLabel(opt.id)}</span>
                  <span className={`text-xs ${editValue === opt.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{getBudgetRange(opt.id)}</span>
                </button>
              ))}
            </div>
          </ProfileField>

          {/* Style Preferences */}
          <ProfileField
            icon={<Palette className="w-5 h-5" />}
            label={t("profile", "styles")}
            value={styleLabels.length > 0 ? styleLabels.join(", ") : t("common", "notSet")}
            isEditing={editingField === "stylePreference"}
            onEdit={() => startEdit("stylePreference")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="grid grid-cols-2 gap-2 mt-2">
              {STYLE_OPTIONS.map(opt => {
                const isSelected = editMultiValue.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleMultiValue(opt.id)}
                    className={`p-2 rounded-xl border text-sm font-medium transition-all ${isRtl ? "text-right" : "text-left"} ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-white/10 hover:border-primary/30"
                    }`}
                  >
                    <span className="block">{getStyleLabel(opt.id)}</span>
                    <span className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {getStyleDesc(opt.id)}
                    </span>
                  </button>
                );
              })}
            </div>
            {editMultiValue.length > 0 && (
              <p className="text-xs text-primary/70 text-center mt-2">
                {t("common", "selected")} {editMultiValue.length} {t("profile", "selectedStyles")}
              </p>
            )}
          </ProfileField>

          {/* Influencers */}
          <ProfileField
            icon={<Users className="w-5 h-5" />}
            label={t("profile", "influencers")}
            value={influencerNames.length > 0 ? influencerNames.join(", ") : t("common", "notSelected")}
            isEditing={editingField === "favoriteInfluencers"}
            onEdit={() => startEdit("favoriteInfluencers")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="mt-2">
              <InfluencerPicker
                gender={profile?.gender || undefined}
                selectedInfluencers={editMultiValue}
                onToggle={toggleMultiValue}
                userProfile={{
                  ageRange: profile?.ageRange || null,
                  budgetLevel: profile?.budgetLevel || null,
                  stylePreference: profile?.stylePreference || null,
                }}
              />
            </div>
            {editMultiValue.length > 0 && (
              <p className="text-xs text-primary/70 text-center mt-2">
                {t("common", "selected")} {editMultiValue.length} {t("profile", "selectedInfluencers")}
              </p>
            )}
          </ProfileField>

          {/* Preferred Stores */}
          <ProfileField
            icon={<Store className="w-5 h-5" />}
            label={t("profile", "preferredStores")}
            value={storeNames.length > 0 ? storeNames.join(", ") : t("profile", "noStores")}
            isEditing={editingField === "preferredStores"}
            onEdit={() => startEdit("preferredStores")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="grid grid-cols-3 gap-2 mt-2">
              {STORE_OPTIONS.map(store => {
                const isSelected = editMultiValue.includes(store.label);
                return (
                  <button
                    key={store.id}
                    onClick={() => toggleMultiValue(store.label)}
                    className={`p-2 rounded-xl border text-center text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-white/10 hover:border-primary/30"
                    }`}
                  >
                    {store.label}
                  </button>
                );
              })}
            </div>
            {editMultiValue.length > 0 && (
              <p className="text-xs text-primary/70 text-center mt-2">
                {t("common", "selected")} {editMultiValue.length} {t("onboarding", "storesSelected")}
              </p>
            )}
          </ProfileField>

          {/* Phone Number (WhatsApp) */}
          <ProfileField
            icon={<Phone className="w-5 h-5" />}
            label={lang === "he" ? "מספר טלפון (WhatsApp)" : "Phone Number (WhatsApp)"}
            value={profile.phoneNumber || (lang === "he" ? "לא הוגדר" : "Not set")}
            isEditing={editingField === "phoneNumber"}
            onEdit={() => startEdit("phoneNumber")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="mt-2">
              <PhoneInput
                value={editValue}
                onChange={setEditValue}
                defaultCountry="IL"
                label={lang === "he" ? "מספר WhatsApp" : "WhatsApp Number"}
                hint={lang === "he"
                  ? "קשר/י את מספר הטלפון כדי לקבל ניתוח מותאם אישית בוואטסאפ"
                  : "Link your phone to get personalized analysis via WhatsApp"
                }
                dir={dir}
              />
            </div>
          </ProfileField>

          {/* Wardrobe */}
          <ProfileField
            icon={<ShoppingBag className="w-5 h-5" />}
            label={t("profile", "wardrobe")}
            value={profile.saveToWardrobe ? t("profile", "wardrobeActive") : t("common", "inactive")}
            isEditing={editingField === "saveToWardrobe"}
            onEdit={() => startEdit("saveToWardrobe")}
            onCancel={cancelEdit}
            onSave={saveField}
            saving={saving}
          >
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setEditValue("true")}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  editValue === "true"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-white/10 hover:border-primary/30"
                }`}
              >
                <span className="text-xl block mb-1">👗</span>
                {t("common", "active")}
              </button>
              <button
                onClick={() => setEditValue("false")}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  editValue === "false"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-white/10 hover:border-primary/30"
                }`}
              >
                <span className="text-xl block mb-1">🚫</span>
                {t("common", "inactive")}
              </button>
            </div>
          </ProfileField>
        </div>

        {/* Reset onboarding button */}
        <div className="mt-10 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("/onboarding")}
            className="gap-2 rounded-xl border-white/10 hover:border-primary/30"
          >
            <RefreshCw className="w-4 h-4" />
            {t("profile", "resetProfile")}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {t("profile", "resetDesc")}
          </p>
        </div>

        {/* Privacy & Data Section */}
        <PrivacyDataSection lang={lang} dir={dir} />
      </div>
    </div>
  );
}

/** Privacy & Data management section */
function PrivacyDataSection({ lang, dir }: { lang: string; dir: string }) {
  const [, navigate] = useLocation();
  const exportData = trpc.profile.exportMyData.useQuery(undefined, { enabled: false });
  const deleteAccountMutation = trpc.profile.deleteAccount.useMutation();
  const logConsentMutation = trpc.privacy.logConsent.useMutation();
  const { data: myConsents, refetch: refetchConsents } = trpc.privacy.getMyConsents.useQuery();
  const { logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Derive current consent states from latest consent records
  const marketingConsent = Boolean(myConsents?.find((c: any) => c.consentType === "marketing")?.granted);
  const whatsappConsent = Boolean(myConsents?.find((c: any) => c.consentType === "whatsapp")?.granted);

  const toggleConsent = async (type: "marketing" | "whatsapp", current: boolean) => {
    try {
      await logConsentMutation.mutateAsync({ consentType: type, granted: !current, documentVersion: "1.0" });
      await refetchConsents();
      toast.success(lang === "he" ? "ההגדרה עודכנה" : "Setting updated");
    } catch {
      toast.error(lang === "he" ? "שגיאה בעדכון" : "Failed to update");
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const result = await exportData.refetch();
      if (result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `totallook-my-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(lang === "he" ? "הנתונים הורדו בהצלחה" : "Data exported successfully");
      }
    } catch {
      toast.error(lang === "he" ? "שגיאה בייצוא הנתונים" : "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccountMutation.mutateAsync();
      toast.success(lang === "he" ? "החשבון נמחק בהצלחה" : "Account deleted successfully");
      // Clear ALL local data so user appears as completely new guest
      localStorage.removeItem("manus-runtime-user-info");
      localStorage.removeItem("tl_guest_fp"); // fingerprint — forces new identity
      localStorage.removeItem("totallook-user-country");
      localStorage.removeItem("totallook_cookie_consent");
      localStorage.removeItem("hideWhatsAppPhoneModal");
      localStorage.removeItem("theme");
      localStorage.removeItem("totallook-lang");
      localStorage.removeItem("sidebar-width");
      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch {
      toast.error(lang === "he" ? "שגיאה במחיקת החשבון" : "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="mt-12 border-t border-white/5 pt-8">
      <div className="flex items-center gap-2 mb-5">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">
          {lang === "he" ? "פרטיות ונתונים" : "Privacy & Data"}
        </h2>
      </div>

      <div className="space-y-3">
        {/* Legal documents links */}
        <Link href="/privacy">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-card/50 hover:border-white/10 cursor-pointer transition-colors">
            <FileText className="w-5 h-5 text-primary/70" />
            <div className="flex-1">
              <p className="text-sm font-medium">{lang === "he" ? "מדיניות פרטיות" : "Privacy Policy"}</p>
              <p className="text-xs text-muted-foreground">{lang === "he" ? "איך אנחנו מגנים על המידע שלך" : "How we protect your information"}</p>
            </div>
          </div>
        </Link>

        <Link href="/terms">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-card/50 hover:border-white/10 cursor-pointer transition-colors">
            <FileText className="w-5 h-5 text-primary/70" />
            <div className="flex-1">
              <p className="text-sm font-medium">{lang === "he" ? "תנאי שימוש" : "Terms of Service"}</p>
              <p className="text-xs text-muted-foreground">{lang === "he" ? "התנאים לשימוש בשירות" : "Terms and conditions for using the service"}</p>
            </div>
          </div>
        </Link>

        {/* Consent Toggles */}
        <div className="p-4 rounded-xl border border-white/5 bg-card/50 space-y-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary/70" />
            {lang === "he" ? "הגדרות הסכמה" : "Consent Settings"}
          </p>

          {/* Marketing consent */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{lang === "he" ? "תקשורת שיווקית" : "Marketing Communications"}</p>
              <p className="text-xs text-muted-foreground">
                {lang === "he" ? "קבלת עדכונים, טיפים ומבצעים" : "Receive updates, tips and promotions"}
              </p>
            </div>
            <button
              onClick={() => toggleConsent("marketing", marketingConsent)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                marketingConsent ? "bg-primary" : "bg-white/10"
              }`}
              disabled={logConsentMutation.isPending}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                marketingConsent ? "translate-x-5.5" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {/* WhatsApp consent */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{lang === "he" ? "הודעות WhatsApp" : "WhatsApp Messages"}</p>
              <p className="text-xs text-muted-foreground">
                {lang === "he" ? "קבלת ניתוחים ותזכורות ב-WhatsApp" : "Receive analyses and reminders via WhatsApp"}
              </p>
            </div>
            <button
              onClick={() => toggleConsent("whatsapp", whatsappConsent)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                whatsappConsent ? "bg-primary" : "bg-white/10"
              }`}
              disabled={logConsentMutation.isPending}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                whatsappConsent ? "translate-x-5.5" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        </div>

        {/* Export data */}
        <button
          onClick={handleExportData}
          disabled={exporting}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-card/50 hover:border-white/10 cursor-pointer transition-colors text-start"
        >
          <Download className="w-5 h-5 text-primary/70 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{lang === "he" ? "ייצוא הנתונים שלי" : "Export My Data"}</p>
            <p className="text-xs text-muted-foreground">
              {lang === "he"
                ? "הורד עותק של כל המידע שלך (GDPR/CCPA)"
                : "Download a copy of all your data (GDPR/CCPA)"}
            </p>
          </div>
          {exporting && <FashionButtonSpinner />}
        </button>

        {/* Delete account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:border-red-500/40 cursor-pointer transition-colors text-start">
              <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">{lang === "he" ? "מחיקת חשבון" : "Delete Account"}</p>
                <p className="text-xs text-muted-foreground">
                  {lang === "he"
                    ? "מחיקת כל הנתונים שלך לצמיתות — פעולה זו בלתי הפיכה"
                    : "Permanently delete all your data — this action cannot be undone"}
                </p>
              </div>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border" dir={dir}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400">
                {lang === "he" ? "מחיקת חשבון" : "Delete Account"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                {lang === "he"
                  ? "האם אתה בטוח? פעולה זו תמחק לצמיתות את כל הנתונים שלך כולל: פרופיל, ניתוחים, ארון בגדים, פוסטים, יומן סטייל, וכל מידע אחר. לא ניתן לשחזר את הנתונים לאחר המחיקה."
                  : "Are you sure? This will permanently delete all your data including: profile, analyses, wardrobe, posts, style diary, and all other information. Data cannot be recovered after deletion."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">
                {lang === "he" ? "ביטול" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                {deleting
                  ? (lang === "he" ? "מוחק..." : "Deleting...")
                  : (lang === "he" ? "כן, מחק את החשבון" : "Yes, Delete My Account")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/** Reusable profile field row with inline editing */
function ProfileField({
  icon,
  label,
  value,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${
      isEditing
        ? "border-primary/30 bg-primary/5 p-4"
        : "border-white/5 bg-card/50 p-4 hover:border-white/10"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-primary/70 shrink-0">{icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            {!isEditing && (
              <p className="text-sm font-medium truncate">{value}</p>
            )}
          </div>
        </div>
        {!isEditing ? (
          <button
            onClick={onEdit}
            className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Pencil className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onCancel}
              disabled={saving}
              className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="p-2 rounded-xl hover:bg-primary/20 text-primary transition-colors"
            >
              {saving ? <FashionButtonSpinner /> : <Check className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
      {isEditing && children}
    </div>
  );
}
