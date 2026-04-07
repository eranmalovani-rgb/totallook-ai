import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Share2, Copy, Check, MessageCircle, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n";

interface ShareButtonsProps {
  reviewId: number;
  score: number;
  summary: string;
  imageUrl?: string;
}

export default function ShareButtons({ reviewId, score, summary, imageUrl }: ShareButtonsProps) {
  const { t, lang, dir } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = `${window.location.origin}/review/${reviewId}`;
  const shareText = lang === "he"
    ? `✨ קיבלתי ציון ${score}/10 ב-TotalLook.ai!\n\n${summary.slice(0, 120)}${summary.length > 120 ? "..." : ""}\n\nקבלו גם אתם חוות דעת אופנתית:`
    : `✨ I scored ${score}/10 on TotalLook.ai!\n\n${summary.slice(0, 120)}${summary.length > 120 ? "..." : ""}\n\nGet your fashion review too:`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("share", "linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success(t("share", "linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl, t]);

  const handleWhatsApp = useCallback(() => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`;
    window.open(whatsappUrl, "_blank");
  }, [shareText, shareUrl]);

  const handleTelegram = useCallback(() => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, "_blank");
  }, [shareText, shareUrl]);

  const textAlign = dir === "rtl" ? "text-right" : "text-left";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
        >
          <Share2 className="w-5 h-5" />
          {t("share", "shareAnalysis")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{t("share", "shareReview")}</DialogTitle>
        </DialogHeader>

        {/* Preview Card */}
        <div className="rounded-xl border border-white/10 bg-card overflow-hidden mb-6">
          <div className="flex gap-4 p-4">
            {imageUrl && (
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-white/5">
                <img loading="lazy" src={imageUrl} alt="Outfit" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-black text-primary">{score}/10</span>
                <span className="text-xs text-muted-foreground">{t("share", "overallScore")}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {summary.slice(0, 100)}{summary.length > 100 ? "..." : ""}
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-primary/5 border-t border-white/5">
            <p className="text-[10px] text-primary/60 font-medium">{t("share", "tagline")}</p>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-card hover:border-teal-500/30 hover:bg-teal-500/5 transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition-colors">
              <MessageCircle className="w-6 h-6 text-teal-400" />
            </div>
            <div className={textAlign}>
              <p className="font-bold text-sm">WhatsApp</p>
              <p className="text-xs text-muted-foreground">{t("share", "whatsappDesc")}</p>
            </div>
          </button>

          <button
            onClick={handleTelegram}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div className={textAlign}>
              <p className="font-bold text-sm">Telegram</p>
              <p className="text-xs text-muted-foreground">{t("share", "telegramDesc")}</p>
            </div>
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              {copied ? (
                <Check className="w-6 h-6 text-teal-400" />
              ) : (
                <Copy className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className={textAlign}>
              <p className="font-bold text-sm">{copied ? t("share", "copied") : t("share", "copyLink")}</p>
              <p className="text-xs text-muted-foreground">{t("share", "copyDesc")}</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
