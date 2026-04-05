import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Wand2, X, Download, ImageIcon } from "lucide-react";
import FashionSpinner from "@/components/FashionSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FashionAnalysis } from "../../../shared/fashionTypes";
import { useLanguage } from "@/i18n";

interface TotalLookModalProps {
  reviewId: number;
  analysis: FashionAnalysis;
}

export default function TotalLookModal({ reviewId, analysis }: TotalLookModalProps) {
  const { t, lang, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const generateMutation = trpc.review.generateTotalLook.useMutation({
    onSuccess: (data) => {
      setImageUrl(data.imageUrl);
    },
  });

  const handleGenerate = () => {
    setImageUrl(null);
    generateMutation.mutate({ reviewId });
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `total-look-${reviewId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="gap-2 bg-gradient-to-r from-rose-600 to-primary hover:from-rose-500 hover:to-primary/90"
        >
          <Wand2 className="w-5 h-5" />
          {lang === "he" ? "צפה בלוק המלא" : "View Total Look"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {lang === "he" ? "הלוק המלא — Total Look" : "Total Look"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {lang === "he"
              ? "לוח השראה ויזואלי של הלוק המומלץ — כולל כל הפריטים, הצבעים והאקססוריז שהוצעו בניתוח"
              : "Visual mood board of the recommended look — including all items, colors and accessories suggested in the analysis"}
          </p>

          <div className="relative rounded-2xl border border-white/10 bg-card overflow-hidden min-h-[300px]">
            {!imageUrl && !generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-16 px-8 gap-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-primary/40" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {lang === "he"
                      ? "לחץ על הכפתור למטה כדי ליצור תמונת לוק מלא"
                      : "Click the button below to generate a total look image"}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {lang === "he"
                      ? "מבוסס על הפריטים והצבעים שהומלצו בניתוח"
                      : "Based on the items and colors recommended in the analysis"}
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-rose-600 to-primary"
                >
                  <Wand2 className="w-5 h-5" />
                  {lang === "he" ? "צור לוח השראה" : "Generate Mood Board"}
                </Button>
              </div>
            )}

            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-16 gap-6">
                <div className="relative">
                  <FashionSpinner size="lg" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">
                    {lang === "he" ? "מייצר לוח השראה..." : "Generating mood board..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lang === "he"
                      ? "יוצר ויזואליזציה של הלוק המומלץ עם כל הפריטים"
                      : "Creating a visualization of the recommended look with all items"}
                  </p>
                </div>
              </div>
            )}

            {imageUrl && (
              <div className="relative group">
                <img
                  src={imageUrl}
                  alt="Total Look Visualization"
                  className="w-full object-contain max-h-[500px]"
                />
                <div className={`absolute top-3 ${dir === "rtl" ? "left-3" : "right-3"} flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <button
                    onClick={handleDownload}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                    title={lang === "he" ? "הורד תמונה" : "Download Image"}
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}

            {generateMutation.isError && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <p className="text-sm text-destructive">
                  {lang === "he" ? "שגיאה ביצירת התמונה" : "Error generating image"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {generateMutation.error?.message || (lang === "he" ? "נסה שוב" : "Try again")}
                </p>
                <Button onClick={handleGenerate} variant="outline" size="sm" className="gap-2">
                  <Wand2 className="w-4 h-4" />
                  {t("common", "tryAgain")}
                </Button>
              </div>
            )}
          </div>

          {imageUrl && (
            <div className="p-4 rounded-xl border border-white/5 bg-card/50">
              <h4 className="text-sm font-bold mb-3 text-muted-foreground">
                {lang === "he" ? "פריטים בלוק:" : "Items in the look:"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.improvements.map((imp, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {imp.title}
                  </span>
                ))}
                {analysis.outfitSuggestions.slice(0, 1).flatMap(s => s.items).map((item, i) => (
                  <span
                    key={`outfit-${i}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  >
                    {item.length > 40 ? item.slice(0, 40) + "..." : item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {imageUrl && (
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={generateMutation.isPending}
              >
                <Wand2 className="w-4 h-4" />
                {lang === "he" ? "צור גרסה חדשה" : "Generate New Version"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
