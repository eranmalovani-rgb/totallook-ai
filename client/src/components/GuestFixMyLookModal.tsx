import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Wand2, Download, ShoppingBag, ExternalLink, RotateCcw, Sparkles, Check, RefreshCw, ImageIcon, Plus, CheckCheck, X, Eye } from "lucide-react";
import StoreLogo, { extractStoreFromUrl, extractStoreFromLabel } from "@/components/StoreLogo";
import FashionSpinner from "@/components/FashionSpinner";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FashionAnalysis, FashionItem, ShoppingLink, Improvement, ClosetMatch } from "../../../shared/fashionTypes";
import { useLanguage } from "@/i18n";

interface GuestFixMyLookModalProps {
  sessionId: number;
  analysis: FashionAnalysis;
  trigger?: React.ReactNode;
  closetItems?: Array<{ name: string; itemType?: string; brand?: string; color?: string; itemImageUrl?: string; sourceImageUrl?: string }>;
}

type FixResult = {
  originalImageUrl: string;
  fixedImageUrl: string;
  originalScore: number;
  estimatedScore: number;
  itemsFixed: { name: string; icon: string; scoreBefore: number; verdict: string }[];
  shoppingLinks: ShoppingLink[];
};

/* ──────────────────────── Category detection ──────────────────────── */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shirt: ["חולצ", "shirt", "top", "טי-שירט", "t-shirt", "tee", "polo", "blouse", "בלוז", "סווטשירט", "sweatshirt", "קפוצ'ון"],
  pants: ["מכנס", "pants", "jeans", "ג'ינס", "trousers", "chino", "צ'ינו", "shorts", "שורט"],
  shoes: ["נעל", "shoe", "sneaker", "סניקרס", "boot", "מגף", "sandal", "סנדל", "heel", "עקב", "loafer"],
  jacket: ["ז'קט", "jacket", "coat", "מעיל", "blazer", "בלייזר", "vest", "וסט", "hoodie", "הודי"],
  dress: ["שמל", "dress", "gown", "skirt", "חצאית"],
  bag: ["תיק", "bag", "purse", "clutch", "backpack"],
  accessory: ["אקסס", "accessor", "שעון", "watch", "טבעת", "ring", "שרשר", "necklace", "צמיד", "bracelet", "עגיל", "earring", "כובע", "hat", "חגור", "belt", "משקפ", "glasses", "sunglasses"],
};

const CATEGORY_ICONS: Record<string, string> = {
  shirt: "👕", pants: "👖", shoes: "👟", jacket: "🧥", dress: "👗", bag: "👜", accessory: "💍",
};

function detectCategory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return null;
}

function findMatchingItem(imp: Improvement, items: FashionItem[]): { item: FashionItem; index: number } | null {
  const impTitle = imp.title.toLowerCase();
  const impBefore = imp.beforeLabel.toLowerCase();
  const impDesc = imp.description.toLowerCase();
  const impQuery = (imp.productSearchQuery || "").toLowerCase();
  const impCategory = detectCategory(impTitle) || detectCategory(impBefore) || detectCategory(impQuery) || detectCategory(impDesc);

  let bestItem: { item: FashionItem; index: number } | null = null;
  let bestScore = 0;

  items.forEach((item, idx) => {
    const itemName = item.name.toLowerCase();
    const itemDesc = (item.description || "").toLowerCase();
    const itemCategory = detectCategory(itemName) || detectCategory(itemDesc);
    let score = 0;
    if (impCategory && itemCategory && impCategory !== itemCategory) return;
    if (impCategory && itemCategory && impCategory === itemCategory) score += 8;
    if (impTitle.includes(itemName) || impDesc.includes(itemName)) score += 10;
    if (impBefore.includes(itemName) || itemName.includes(impBefore)) score += 10;
    const words = itemName.split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      if (impTitle.includes(w)) score += 4;
      if (impDesc.includes(w)) score += 3;
      if (impBefore.includes(w)) score += 4;
    }
    if (score > bestScore) {
      bestScore = score;
      bestItem = { item, index: idx };
    }
  });

  return bestItem;
}

/* ──────────────────────── Selectable Product Image ──────────────────────── */

function SelectableProductImage({
  imageUrl, label, isGenerating, lang, isSelected, onSelect,
}: {
  imageUrl?: string; label: string; isGenerating: boolean; lang: "he" | "en";
  isSelected: boolean; onSelect: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const hasImage = imageUrl && imageUrl.length > 5;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onSelect(); } }}
      className={`aspect-square rounded-lg overflow-hidden relative cursor-pointer transition-all duration-200 ${
        isSelected
          ? "ring-2 ring-primary shadow-lg shadow-primary/20 scale-105"
          : "ring-1 ring-white/10 hover:ring-white/30 opacity-70 hover:opacity-100 hover:scale-[1.02]"
      }`}
    >
      {hasImage && !imgError ? (
        <>
          {imgLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/5 z-10">
              <RefreshCw className="w-5 h-5 text-primary/40 animate-spin" style={{ animationDuration: "3s" }} />
            </div>
          )}
          <img
            src={imageUrl}
            alt={label}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoading ? "opacity-0" : "opacity-100"}`}
            onError={() => { setImgError(true); setImgLoading(false); }}
            onLoad={() => setImgLoading(false)}
          />
        </>
      ) : isGenerating ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 relative overflow-hidden bg-white/5">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <RefreshCw className="w-5 h-5 text-primary/40 animate-spin relative z-10" style={{ animationDuration: "3s" }} />
          <span className="text-[9px] text-primary/50 relative z-10">{lang === "he" ? "טוען..." : "Loading..."}</span>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/5">
          <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
        </div>
      )}

      {isSelected && (
        <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-20 shadow-md">
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      )}

      {hasImage && !imgError && !imgLoading && label && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-1 py-0.5 z-10 flex items-center justify-center">
          {(() => {
            const storeName = extractStoreFromLabel(label) || extractStoreFromUrl(label);
            if (storeName) {
              return <StoreLogo name={storeName} size="sm" />;
            }
            return <p className="text-[9px] text-white/90 truncate text-center">{label}</p>;
          })()}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Main component ──────────────────────── */

export default function GuestFixMyLookModal({ sessionId, analysis, trigger, closetItems }: GuestFixMyLookModalProps) {
  const { t, lang, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [step, setStep] = useState<"select" | "loading" | "result">("select");
  const [loadedImpImages, setLoadedImpImages] = useState<Record<number, ShoppingLink[]>>({});
  const [loadingImpImages, setLoadingImpImages] = useState<Set<number>>(new Set());
  const [selectedProductPerImp, setSelectedProductPerImp] = useState<Record<number, number>>({});
  const [closetSwitchConfirm, setClosetSwitchConfirm] = useState<{ impIdx: number; productIdx: number; closetName: string } | null>(null);
  const [closetPreviewItem, setClosetPreviewItem] = useState<{ closetMatch: ClosetMatch; impIdx: number } | null>(null);

  const generateProductImagesMutation = trpc.guest.generateProductImages.useMutation();

  const isHighScore = analysis.overallScore >= 9;
  const isHe = lang === "he";
  const allImprovements = analysis.improvements || [];
  const allItems = analysis.items || [];

  // Build improvement cards with closet match validation
  const improvementCards = useMemo(() => {
    return allImprovements.map((imp, impIdx) => {
      const match = findMatchingItem(imp, allItems);
      const impCategory = detectCategory(imp.title) || detectCategory(imp.beforeLabel) || detectCategory(imp.productSearchQuery || "") || detectCategory(imp.description);
      const icon = match?.item.icon || (impCategory ? CATEGORY_ICONS[impCategory] : "✨");

      // Check closet match from analysis data
      let validClosetMatch: ClosetMatch | null = null;
      if (imp.closetMatch) {
        const cm = imp.closetMatch;
        const closetText = [cm.name, cm.itemType, cm.brand, cm.color].filter(Boolean).join(" ");
        const closetCategory = detectCategory(closetText);
        if (!impCategory || !closetCategory || impCategory === closetCategory) {
          validClosetMatch = cm;
        }
      }

      return {
        imp,
        impIdx,
        matchedItem: match?.item || null,
        matchedItemIdx: match?.index ?? -1,
        icon,
        category: impCategory,
        closetMatch: validClosetMatch,
      };
    });
  }, [allImprovements, allItems]);

  // Auto-select first product for each improvement when images load
  useEffect(() => {
    const newSelections: Record<number, number> = { ...selectedProductPerImp };
    let changed = false;
    for (const [impIdxStr, images] of Object.entries(loadedImpImages)) {
      const impIdx = Number(impIdxStr);
      if (newSelections[impIdx] === undefined && images.length > 0) {
        const firstValidIdx = images.findIndex(l => l.imageUrl && l.imageUrl.length > 5);
        if (firstValidIdx >= 0) {
          newSelections[impIdx] = firstValidIdx;
          changed = true;
        }
      }
    }
    if (changed) setSelectedProductPerImp(newSelections);
  }, [loadedImpImages]);

  // Lazy load product images
  const loadImprovementImages = (improvementIndex: number) => {
    if (loadedImpImages[improvementIndex] || loadingImpImages.has(improvementIndex)) return;

    const imp = allImprovements[improvementIndex];
    if (!imp) return;
    if (imp.shoppingLinks.every(l => l.imageUrl && l.imageUrl.length > 5)) {
      setLoadedImpImages(prev => ({ ...prev, [improvementIndex]: imp.shoppingLinks }));
      return;
    }

    setLoadingImpImages(prev => { const next = new Set(prev); next.add(improvementIndex); return next; });
    generateProductImagesMutation.mutateAsync({ sessionId, improvementIndex })
      .then((res) => {
        if (res?.links) setLoadedImpImages(prev => ({ ...prev, [improvementIndex]: res.links as ShoppingLink[] }));
      })
      .catch((err) => console.warn(`[GuestFixMyLook] Image generation failed for improvement ${improvementIndex}:`, err))
      .finally(() => {
        setLoadingImpImages(prev => { const next = new Set(prev); next.delete(improvementIndex); return next; });
      });
  };

  // Auto-load images when modal opens
  useEffect(() => {
    if (open && step === "select") {
      improvementCards.forEach(card => loadImprovementImages(card.impIdx));
    }
  }, [open, step]);

  const getImpImages = (impIndex: number): ShoppingLink[] => {
    if (loadedImpImages[impIndex]) return loadedImpImages[impIndex];
    return allImprovements[impIndex]?.shoppingLinks || [];
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setLoadedImpImages({});
      setLoadingImpImages(new Set());
      setSelectedProductPerImp({});
      setResult(null);
      setStep("select");
    } else {
      setResult(null);
      setStep("select");
      setSelectedProductPerImp({});
    }
  };

  const selectProductForImp = (impIdx: number, productIdx: number) => {
    const currentSelection = selectedProductPerImp[impIdx];
    const card = improvementCards.find(c => c.impIdx === impIdx);
    if (currentSelection === -1 && productIdx !== -1 && card?.closetMatch) {
      setClosetSwitchConfirm({ impIdx, productIdx, closetName: card.closetMatch.name });
      return;
    }

    setSelectedProductPerImp(prev => {
      if (prev[impIdx] === productIdx) {
        const next = { ...prev };
        delete next[impIdx];
        return next;
      }
      return { ...prev, [impIdx]: productIdx };
    });
  };

  const confirmClosetSwitch = () => {
    if (!closetSwitchConfirm) return;
    setSelectedProductPerImp(prev => ({ ...prev, [closetSwitchConfirm.impIdx]: closetSwitchConfirm.productIdx }));
    setClosetSwitchConfirm(null);
  };

  const cancelClosetSwitch = () => {
    setClosetSwitchConfirm(null);
  };

  const selectedCount = Object.keys(selectedProductPerImp).length;

  const fixMutation = trpc.guest.fixMyLook.useMutation({
    onSuccess: (data) => {
      setResult(data as FixResult);
      setStep("result");
    },
    onError: () => setStep("select"),
  });

  const handleFix = () => {
    if (selectedCount === 0) return;
    setStep("loading");

    const itemIndicesSet = new Set<number>();
    const directImpIndices: number[] = [];

    for (const impIdxStr of Object.keys(selectedProductPerImp)) {
      const impIdx = Number(impIdxStr);
      directImpIndices.push(impIdx);
      const card = improvementCards.find(c => c.impIdx === impIdx);
      if (card && card.matchedItemIdx >= 0) {
        itemIndicesSet.add(card.matchedItemIdx);
      }
    }

    const itemIndices = itemIndicesSet.size > 0 ? Array.from(itemIndicesSet) : allItems.map((_, i) => i);

    const selectedProductDetails: { improvementIndex: number; productLabel: string; productImageUrl: string }[] = [];
    for (const [impIdxStr, productIdx] of Object.entries(selectedProductPerImp)) {
      const impIdx = Number(impIdxStr);
      const card = improvementCards.find(c => c.impIdx === impIdx);
      if (productIdx === -1 && card?.closetMatch) {
        const cm = card.closetMatch;
        selectedProductDetails.push({
          improvementIndex: impIdx,
          productLabel: `${cm.name}${cm.brand ? ` (${cm.brand})` : ''}${cm.color ? ` - ${cm.color}` : ''} [FROM CLOSET]`,
          productImageUrl: cm.itemImageUrl || cm.sourceImageUrl || "",
        });
      } else {
        const images = getImpImages(impIdx);
        const selectedProduct = images[productIdx];
        if (selectedProduct) {
          selectedProductDetails.push({
            improvementIndex: impIdx,
            productLabel: selectedProduct.label || "",
            productImageUrl: selectedProduct.imageUrl || "",
          });
        }
      }
    }

    fixMutation.mutate({
      sessionId,
      itemIndices,
      selectedImprovementIndices: directImpIndices,
      selectedProductDetails,
    });
  };

  const handleGenerateNew = () => {
    setResult(null);
    setStep("select");
    setSelectedProductPerImp({});
  };

  const handleDownload = async () => {
    if (!result?.fixedImageUrl) return;
    try {
      const response = await fetch(result.fixedImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fix-my-look-guest-${sessionId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(result.fixedImageUrl, "_blank");
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="lg" className="gap-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold shadow-lg">
            <Wand2 className="w-5 h-5" />
            {isHighScore ? (isHe ? "לפני ואחרי" : "Before & After") : (isHe ? "תקן את הלוק שלי" : "Fix My Look")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-white/10" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {isHighScore ? (isHe ? "לפני ואחרי — וריאציות" : "Before & After — Variations") : (isHe ? "תקן את הלוק שלי" : "Fix My Look")}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select products per improvement */}
        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isHe
                ? "בחר מוצר מכל קטגוריה על ידי לחיצה על התמונה. ה-AI ייצר הדמיה לפי הבחירות שלך."
                : "Select a product from each category by clicking on its image. AI will generate a visualization based on your choices."}
            </p>

            {/* Select All / Clear All */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const allSelections: Record<number, number> = {};
                  for (const card of improvementCards) {
                    const images = getImpImages(card.impIdx);
                    const firstValid = images.findIndex(l => l.imageUrl && l.imageUrl.length > 5);
                    if (firstValid >= 0) allSelections[card.impIdx] = firstValid;
                    else if (images.length > 0) allSelections[card.impIdx] = 0;
                  }
                  setSelectedProductPerImp(allSelections);
                }}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                {isHe ? "בחר הכל" : "Select all"}
              </button>
              <button
                onClick={() => setSelectedProductPerImp({})}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors"
              >
                <X className="w-3 h-3" />
                {isHe ? "נקה הכל" : "Clear all"}
              </button>
            </div>

            <div className="space-y-4">
              {improvementCards.map(({ imp, impIdx, matchedItem, icon, closetMatch }) => {
                const impImages = getImpImages(impIdx);
                const isLoadingImages = loadingImpImages.has(impIdx);
                const visibleImages = impImages.slice(0, 4);
                const isNewItem = !matchedItem;
                const hasSelection = selectedProductPerImp[impIdx] !== undefined;
                const hasClosetItem = !!closetMatch;

                return (
                  <div
                    key={impIdx}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      hasSelection
                        ? "border-primary/40 bg-primary/5"
                        : "border-white/5 bg-background/50"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 p-3 pb-1">
                      <span className="text-xl">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{imp.title}</span>
                          {isNewItem && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 shrink-0">
                              <Plus className="w-2.5 h-2.5" />
                              {isHe ? "פריט חדש" : "New item"}
                            </span>
                          )}
                          {hasSelection && selectedProductPerImp[impIdx] === -1 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 shrink-0">
                              <span style={{ fontSize: '10px' }}>♻️</span>
                              {isHe ? "מהארון" : "From closet"}
                            </span>
                          ) : hasSelection ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                              <Check className="w-2.5 h-2.5" />
                              {isHe ? "נבחר" : "Selected"}
                            </span>
                          ) : null}
                        </div>
                        {matchedItem && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground truncate">{matchedItem.name}</span>
                            <span className={`text-xs font-bold ${matchedItem.score >= 8 ? "text-amber-400" : matchedItem.score >= 6 ? "text-primary" : "text-rose-400"}`}>
                              {matchedItem.score}/10
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Before → After labels */}
                    <div className="px-3 pb-2">
                      <div className="flex items-center gap-2 text-[11px] flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 line-through">{imp.beforeLabel}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">{imp.afterLabel}</span>
                      </div>
                    </div>

                    {/* Closet match badge */}
                    {hasClosetItem && (
                      <div className="px-3 pb-2">
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                            selectedProductPerImp[impIdx] === -1
                              ? "bg-emerald-500/20 border-2 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                              : "bg-emerald-500/5 border border-emerald-500/20"
                          }`}
                        >
                          <span style={{ fontSize: '16px' }}>♻️</span>
                          {(closetMatch!.itemImageUrl || closetMatch!.sourceImageUrl) && (
                            <img
                              src={closetMatch!.itemImageUrl || closetMatch!.sourceImageUrl}
                              alt={closetMatch!.name}
                              className="w-8 h-8 rounded-md object-cover border border-emerald-500/30"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-emerald-400 font-bold">
                              {isHe ? "יש לך פריט מתאים בארון!" : "You have a matching item!"}
                            </span>
                            <span className="text-[10px] text-emerald-400/70 block truncate">
                              {closetMatch!.name}
                              {closetMatch!.brand && ` (${closetMatch!.brand})`}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setClosetPreviewItem({ closetMatch: closetMatch!, impIdx }); }}
                            className="p-1.5 rounded-full hover:bg-emerald-500/20 transition-colors shrink-0"
                            title={isHe ? "צפה בפריט" : "View item"}
                          >
                            <Eye className="w-4 h-4 text-emerald-400" />
                          </button>
                          {selectedProductPerImp[impIdx] === -1 ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); selectProductForImp(impIdx, -1); }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0"
                            >
                              <Check className="w-3 h-3" strokeWidth={3} />
                              {isHe ? "נבחר" : "Selected"}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); selectProductForImp(impIdx, -1); }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/10 transition-colors shrink-0"
                            >
                              {isHe ? "בחר" : "Select"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Instruction text */}
                    <div className="px-3 pb-1.5">
                      <p className="text-[10px] text-muted-foreground/70">
                        {isHe ? "לחץ על תמונה כדי לבחור:" : "Click an image to select:"}
                      </p>
                    </div>

                    {/* Product images grid */}
                    {(() => {
                      const totalSlots = visibleImages.length;
                      const cols = totalSlots <= 2 ? "grid-cols-2" : totalSlots === 3 ? "grid-cols-3" : "grid-cols-4";
                      return (
                        <div className={`grid gap-2 px-3 pb-3 ${cols}`}>
                          {visibleImages.length > 0 ? (
                            visibleImages.map((link, li) => (
                              <SelectableProductImage
                                key={li}
                                imageUrl={link.imageUrl}
                                label={link.label}
                                isGenerating={isLoadingImages}
                                lang={lang}
                                isSelected={selectedProductPerImp[impIdx] === li}
                                onSelect={() => selectProductForImp(impIdx, li)}
                              />
                            ))
                          ) : isLoadingImages ? (
                            Array.from({ length: 3 }).map((_, li) => (
                              <SelectableProductImage
                                key={`loading-${li}`}
                                imageUrl=""
                                label=""
                                isGenerating={true}
                                lang={lang}
                                isSelected={false}
                                onSelect={() => {}}
                              />
                            ))
                          ) : (
                            <div className="col-span-full text-center py-3">
                              <p className="text-xs text-muted-foreground/50">{isHe ? "אין תמונות זמינות" : "No images available"}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* Bottom action bar */}
            <div className="flex items-center justify-between pt-2 sticky bottom-0 bg-card/95 backdrop-blur-sm pb-1 -mx-1 px-1">
              <span className="text-xs text-muted-foreground">
                {isHe
                  ? `${selectedCount} מתוך ${improvementCards.length} קטגוריות נבחרו`
                  : `${selectedCount} of ${improvementCards.length} categories selected`}
              </span>
              <Button
                onClick={handleFix}
                disabled={selectedCount === 0}
                className="gap-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold"
              >
                <Sparkles className="w-4 h-4" />
                {isHe ? "תראה לי את התוצאה" : "Show me the result"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Loading */}
        {step === "loading" && (
          <div className="py-12 flex flex-col items-center gap-6">
            <FashionSpinner />
            <div className="text-center space-y-2">
              <p className="font-bold text-lg">{isHe ? "משפר את הלוק שלך..." : "Improving your look..."}</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isHe ? "ה-AI מנתח את השיפורים שבחרת ומייצר הדמיה. זה יכול לקחת 15-20 שניות." : "AI is analyzing your selected improvements and generating a visualization. This may take 15-20 seconds."}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && result && (
          <div className="space-y-6">
            <BeforeAfterSlider
              beforeImage={result.originalImageUrl}
              afterImage={result.fixedImageUrl}
              beforeLabel={isHe ? "לפני" : "Before"}
              afterLabel={isHe ? "אחרי" : "After"}
              beforeScore={result.originalScore}
              afterScore={result.estimatedScore}
            />

            <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-amber-500/20">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{isHe ? "לפני" : "Before"}</p>
                <p className="text-2xl font-bold text-rose-400">{result.originalScore}</p>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{isHe ? "אחרי (משוער)" : "After (est.)"}</p>
                <p className="text-2xl font-bold text-amber-400">{result.estimatedScore}</p>
              </div>
              <div className="text-center px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-bold text-amber-400">+{(result.estimatedScore - result.originalScore).toFixed(1)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold mb-2">{isHe ? "פריטים ששופרו:" : "Items improved:"}</p>
              <div className="flex flex-wrap gap-2">
                {result.itemsFixed.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                    <span className="text-rose-400 line-through">{item.scoreBefore}</span>
                  </span>
                ))}
              </div>
            </div>

            {result.shoppingLinks && result.shoppingLinks.length > 0 && (
              <div>
                <p className="text-sm font-bold mb-3 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  {isHe ? "קנה את הפריטים המומלצים:" : "Shop the recommended items:"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {result.shoppingLinks.map((link, i) => {
                    const storeName = extractStoreFromUrl(link.url) || extractStoreFromLabel(link.label);
                    return (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl border border-white/5 bg-card hover:border-primary/20 transition-colors group">
                        {link.imageUrl && <img src={link.imageUrl} alt={link.label} className="w-10 h-10 rounded-lg object-cover" />}
                        <div className="flex-1 min-w-0">
                          {storeName ? (
                            <StoreLogo name={storeName} size="sm" />
                          ) : (
                            <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{link.label}</p>
                          )}
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" />
                {isHe ? "הורד" : "Download"}
              </Button>
              <Button onClick={handleGenerateNew} variant="outline" size="sm" className="gap-1.5">
                <RotateCcw className="w-4 h-4" />
                {isHe ? "נסה שוב" : "Try again"}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/50 text-center">
              {isHe ? "* התמונה המשופרת היא הדמיה מבוססת AI ולא תמונה אמיתית. הציון המשוער הוא הערכה בלבד." : "* The improved image is an AI-based visualization, not a real photo. The estimated score is approximate."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Confirmation dialog when switching away from closet item */}
    <Dialog open={!!closetSwitchConfirm} onOpenChange={(o) => { if (!o) cancelClosetSwitch(); }}>
      <DialogContent className="max-w-sm bg-background border-border">
        <div className="text-center space-y-4 py-2">
          <div className="text-3xl">♻️</div>
          <h3 className="font-bold text-base">
            {isHe ? "בחרת פריט מהארון שלך" : "You selected a closet item"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isHe
              ? `בחרת את "${closetSwitchConfirm?.closetName}" מהארון שלך. רוצה לשדרג למוצר חדש במקום?`
              : `You selected "${closetSwitchConfirm?.closetName}" from your closet. Want to upgrade to a new product instead?`}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" size="sm" onClick={cancelClosetSwitch} className="gap-1.5">
              <span style={{ fontSize: '12px' }}>♻️</span>
              {isHe ? "השאר מהארון" : "Keep closet item"}
            </Button>
            <Button variant="default" size="sm" onClick={confirmClosetSwitch} className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {isHe ? "שדרג למוצר חדש" : "Upgrade to new"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Closet item preview popup */}
    <Dialog open={!!closetPreviewItem} onOpenChange={(o) => { if (!o) setClosetPreviewItem(null); }}>
      <DialogContent className="max-w-sm bg-background border-border" dir={dir}>
        {closetPreviewItem && (() => {
          const cm = closetPreviewItem.closetMatch;
          const imgSrc = cm.itemImageUrl || cm.sourceImageUrl;
          const isSelected = selectedProductPerImp[closetPreviewItem.impIdx] === -1;
          return (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <span className="text-3xl">♻️</span>
                <h3 className="font-bold text-lg mt-2">
                  {isHe ? "פריט מהארון שלך" : "Item from your closet"}
                </h3>
              </div>

              {imgSrc && (
                <div className="flex justify-center">
                  <img
                    src={imgSrc}
                    alt={cm.name}
                    className="w-48 h-48 rounded-xl object-cover border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                  />
                </div>
              )}

              <div className="space-y-2 text-center">
                <p className="text-base font-bold text-foreground">{cm.name}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {cm.brand && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {cm.brand}
                    </span>
                  )}
                  {cm.color && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {cm.color}
                    </span>
                  )}
                  {cm.itemType && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {cm.itemType}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClosetPreviewItem(null)}
                  className="gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  {isHe ? "סגור" : "Close"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    selectProductForImp(closetPreviewItem.impIdx, -1);
                    setClosetPreviewItem(null);
                  }}
                  className={`gap-1.5 ${
                    isSelected
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }`}
                >
                  {isSelected ? (
                    <><Check className="w-3.5 h-3.5" /> {isHe ? "כבר נבחר" : "Already selected"}</>
                  ) : (
                    <><span style={{ fontSize: '12px' }}>♻️</span> {isHe ? "השתמש בפריט הזה" : "Use this item"}</>
                  )}
                </Button>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
    </>
  );
}
