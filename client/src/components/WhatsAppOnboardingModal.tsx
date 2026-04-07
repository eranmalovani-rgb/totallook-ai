/**
 * WhatsApp Onboarding Modal
 * Shows after user saves their phone number for the first time.
 * Explains that a WhatsApp message was sent and guides them through 3 steps.
 */

import { useLanguage } from "@/i18n";
import { translations } from "@/i18n/translations";
import { MessageCircle, Camera, Star, ShoppingBag, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  phoneNumber: string;
}

// TotalLook WhatsApp number (Israeli number via Meta Cloud API)
const WHATSAPP_NUMBER = "972526211811";

export default function WhatsAppOnboardingModal({ open, onClose, phoneNumber }: WhatsAppOnboardingModalProps) {
  const { lang } = useLanguage();
  const isRtl = lang === "he";
  const waTranslations = (translations as any).whatsappOnboarding as Record<string, Record<string, string>>;
  const t = (key: string) => waTranslations[key]?.[lang] || key;

  if (!open) return null;

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("היי! 👋")}`;

  const steps = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: t("step1Title"),
      desc: t("step1Desc"),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: t("step2Title"),
      desc: t("step2Desc"),
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: <ShoppingBag className="w-6 h-6" />,
      title: t("step3Title"),
      desc: t("step3Desc"),
      color: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-md bg-background border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 px-6 pt-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <MessageCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg`}>
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message sent confirmation */}
        <div className="mx-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
          <p className="text-sm text-green-400 font-medium">{t("messageSent")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("messageNote")}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pt-4 pb-6 space-y-3">
          <Button
            onClick={() => window.open(waLink, "_blank")}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            {t("openWhatsApp")}
            <ExternalLink className="w-4 h-4 opacity-60" />
          </Button>
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {t("continueToUpload")}
          </button>
        </div>
      </div>
    </div>
  );
}
