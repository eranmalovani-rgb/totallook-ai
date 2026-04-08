/**
 * WhatsAppPhoneReminder — Popup that reminds users/guests to add their phone number
 * for the WhatsApp fashion analysis feature. Shown on review pages when user
 * hasn't provided a phone number yet.
 *
 * Includes a "Don't show again" option that persists to localStorage.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Camera, Sparkles, Shield, X, EyeOff } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import { useLanguage } from "@/i18n";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import WhatsAppOnboardingModal from "./WhatsAppOnboardingModal";

/** localStorage key used to suppress this popup permanently */
export const HIDE_WHATSAPP_PHONE_MODAL_KEY = "hideWhatsAppPhoneModal";

interface WhatsAppPhoneReminderProps {
  open: boolean;
  onClose: () => void;
  /** If true, user is a guest (save via guest endpoint) */
  isGuest?: boolean;
  /** Guest session ID for saving phone on guest profile */
  guestSessionId?: string;
  /** Country code for phone input default */
  defaultCountry?: string;
}

const WHATSAPP_NUMBER = "972526211811";

export default function WhatsAppPhoneReminder({
  open,
  onClose,
  isGuest = false,
  guestSessionId,
  defaultCountry = "IL",
}: WhatsAppPhoneReminderProps) {
  const { lang, dir } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const saveProfileMutation = trpc.profile.save.useMutation();
  const utils = trpc.useUtils();

  const features = [
    {
      icon: Camera,
      color: "text-green-400",
      bg: "bg-green-500/20",
      title: lang === "he" ? "ניתוח ישיר בוואטסאפ" : "Direct WhatsApp Analysis",
      desc: lang === "he"
        ? "שלחו תמונה ב-WhatsApp וקבלו ניתוח אופנתי מלא תוך שניות — בלי לפתוח אפליקציה"
        : "Send a photo on WhatsApp and get a full fashion analysis in seconds — no app needed",
    },
    {
      icon: Sparkles,
      color: "text-purple-400",
      bg: "bg-purple-500/20",
      title: lang === "he" ? "המלצות מותאמות אישית" : "Personalized Recommendations",
      desc: lang === "he"
        ? "קבלו המלצות לוק, ציונים, וטיפים לשדרוג — הכל ישירות בצ'אט"
        : "Get look recommendations, scores, and upgrade tips — all in chat",
    },
    {
      icon: Shield,
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      title: lang === "he" ? "פרטיות מלאה" : "Full Privacy",
      desc: lang === "he"
        ? "המספר שלכם נשמר בצורה מאובטחת ומשמש רק לשירות הניתוח"
        : "Your number is stored securely and used only for the analysis service",
    },
  ];

  const handleSave = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error(lang === "he" ? "אנא הכניסו מספר טלפון תקין" : "Please enter a valid phone number");
      return;
    }

    try {
      if (!isGuest) {
        await saveProfileMutation.mutateAsync({ phoneNumber });
        utils.profile.get.invalidate();
      }
      // For guests, we just show the WhatsApp modal with the number
      setShowWhatsAppModal(true);
    } catch (err: any) {
      toast.error(err.message || (lang === "he" ? "שגיאה בשמירת המספר" : "Error saving number"));
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleDontShowAgain = () => {
    try {
      localStorage.setItem(HIDE_WHATSAPP_PHONE_MODAL_KEY, "true");
    } catch {
      // localStorage might be unavailable in some contexts
    }
    onClose();
  };

  if (showWhatsAppModal) {
    return (
      <WhatsAppOnboardingModal
        open={true}
        onClose={() => {
          setShowWhatsAppModal(false);
          onClose();
        }}
        phoneNumber={phoneNumber}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-white/10" dir={dir}>
        <DialogTitle className="sr-only">
          {lang === "he" ? "הוסיפו מספר WhatsApp" : "Add WhatsApp Number"}
        </DialogTitle>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-green-600/20 to-green-800/10 p-6 pb-4">
          <button
            onClick={handleSkip}
            className="absolute top-3 left-3 rtl:left-auto rtl:right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {lang === "he" ? "ניתוח אופנתי ב-WhatsApp" : "Fashion Analysis on WhatsApp"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {lang === "he"
                  ? "הוסיפו מספר וקבלו ניתוח ישירות בצ'אט"
                  : "Add your number and get analysis directly in chat"}
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 py-4 space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full ${f.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <f.icon className={`w-4 h-4 ${f.color}`} />
              </div>
              <div>
                <h4 className="text-sm font-semibold">{f.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Phone Input */}
        <div className="px-6 pb-2">
          <PhoneInput
            value={phoneNumber}
            onChange={setPhoneNumber}
            defaultCountry={defaultCountry}
            label={lang === "he" ? "מספר WhatsApp" : "WhatsApp Number"}
            placeholder={defaultCountry === "IL" ? "52 123 4567" : undefined}
            dir={dir}
          />
        </div>

        {/* Actions */}
        <div className="px-6 pb-4 flex gap-3">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={handleSave}
            disabled={saveProfileMutation.isPending}
          >
            <MessageCircle className="w-4 h-4" />
            {saveProfileMutation.isPending
              ? (lang === "he" ? "שומר..." : "Saving...")
              : (lang === "he" ? "הוסיפו מספר" : "Add Number")}
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
          >
            {lang === "he" ? "אח״כ" : "Later"}
          </Button>
        </div>

        {/* Don't show again */}
        <div className="px-6 pb-5 pt-0">
          <button
            onClick={handleDontShowAgain}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <EyeOff className="w-3 h-3" />
            {lang === "he" ? "אל תציג שוב" : "Don't show again"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
