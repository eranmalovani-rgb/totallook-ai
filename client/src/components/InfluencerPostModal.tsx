import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Instagram, ExternalLink, X } from "lucide-react";
import FashionSpinner from "@/components/FashionSpinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n";

interface InfluencerPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencerName: string;
  influencerHandle?: string;
  igUrl?: string;
  context?: string;
}

export default function InfluencerPostModal({
  open,
  onOpenChange,
  influencerName,
  influencerHandle,
  igUrl,
  context,
}: InfluencerPostModalProps) {
  const { t, lang, dir } = useLanguage();
  const { data, isLoading, error } = trpc.review.getInfluencerPost.useQuery(
    {
      influencerName,
      influencerHandle: influencerHandle || "",
      context: context || "",
    },
    { enabled: open && !!influencerName }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Instagram className="w-5 h-5 text-pink-400" />
            {influencerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <FashionSpinner size="lg" />
                <Instagram className="w-5 h-5 text-pink-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">
                {lang === "he" ? "מחפש דוגמת סטיילינג..." : "Searching for styling example..."}
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive mb-2">
                {lang === "he" ? "לא הצלחנו למצוא דוגמה" : "Could not find an example"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
              {igUrl && (
                <a href={igUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Instagram className="w-4 h-4" />
                    {lang === "he" ? "צפה בפרופיל האינסטגרם" : "View Instagram Profile"}
                  </Button>
                </a>
              )}
            </div>
          )}

          {data && (
            <>
              {data.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={data.imageUrl}
                    alt={`${influencerName} styling example`}
                    className="w-full object-contain max-h-[400px]"
                  />
                </div>
              )}

              <div className="p-4 rounded-xl border border-white/5 bg-card">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF2E9F] via-primary to-rose-400 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {influencerName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{influencerName}</p>
                    {influencerHandle && (
                      <p className="text-xs text-muted-foreground">{influencerHandle}</p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {data.caption}
                </p>

                {data.styleTags && data.styleTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {data.styleTags.map((tag: string, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {data.stylingTip && (
                <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
                  <p className="text-xs font-bold text-primary mb-1">
                    {lang === "he" ? "💡 טיפ סטיילינג:" : "💡 Styling Tip:"}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {data.stylingTip}
                  </p>
                </div>
              )}

              {igUrl && (
                <div className="flex justify-center">
                  <a href={igUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-500/5">
                      <Instagram className="w-4 h-4 text-pink-400" />
                      {lang === "he" ? "צפה בפרופיל המלא" : "View Full Profile"}
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
