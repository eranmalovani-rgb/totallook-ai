import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Mail, Sparkles, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";

interface EmailCaptureCardProps {
  fingerprint: string;
  title: string;
  description: string;
  variant?: "primary" | "pink" | "subtle";
  onSuccess?: () => void;
}

export default function EmailCaptureCard({
  fingerprint,
  title,
  description,
  variant = "primary",
  onSuccess,
}: EmailCaptureCardProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { t, lang, dir } = useLanguage();
  const saveEmail = trpc.guest.saveEmail.useMutation();
  const ArrowIcon = lang === "he" ? ArrowLeft : ArrowRight;

  const borderClass =
    variant === "pink"
      ? "border-[#FF2E9F]/20 bg-gradient-to-br from-[#FF2E9F]/5 via-transparent to-primary/5"
      : variant === "subtle"
      ? "border-white/10 bg-card/50"
      : "border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-rose-500/5";

  const iconClass =
    variant === "pink" ? "text-[#FF2E9F]" : "text-primary";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(lang === "he" ? "הכנס מייל תקין" : "Enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      await saveEmail.mutateAsync({ fingerprint, email });
      setSubmitted(true);
      toast.success(t("guest", "emailSuccess"));
      onSuccess?.();
    } catch (err) {
      toast.error(lang === "he" ? "שגיאה — נסה שוב" : "Error — try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`p-6 rounded-2xl border ${borderClass} text-center`}>
        <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold mb-2">{t("guest", "emailSuccess")}</h3>
        <p className="text-muted-foreground text-sm">{t("guest", "analysisCountUnlimited")}</p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl border ${borderClass} text-center`}>
      <Mail className={`w-8 h-8 ${iconClass} mx-auto mb-3`} />
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">{description}</p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto" dir="ltr">
        <Input
          type="email"
          placeholder={t("guest", "emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-white/5 border-white/10"
          disabled={submitting}
        />
        <Button type="submit" size="default" className="gap-2 shrink-0" disabled={submitting}>
          {submitting ? (
            <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <ArrowIcon className="w-4 h-4" />
          )}
          {t("guest", "emailSubmit")}
        </Button>
      </form>
    </div>
  );
}
