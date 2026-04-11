import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Wand2, Download, ShoppingBag, ExternalLink, RotateCcw, Sparkles, Check, X, Eye } from "lucide-react";
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

/* ──────────────────────── Main component ──────────────────────── */

export default function GuestFixMyLookModal({ sessionId, analysis, trigger, closetItems }: GuestFixMyLookModalProps) {
  const { t, lang, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [step, setStep] = useState<"select" | "loading" | "result">("select");

  // Per-improvement: -1 = closet item, 0 = buy new
  const [selectedPerImp, setSelectedPerImp] = useState<Record<number, number>>({});

  // Closet switch confirmation and preview
  const [closetSwitchConfirm, setClosetSwitchConfirm] = useState<{ impIdx: number; closetName: string } | null>(null);
  const [closetPreviewItem, setClosetPreviewItem] = useState<{ closetMatch: ClosetMatch; impIdx: number } | null>(null);

  const isHighScore = analysis.overallScore >= 9;
  const isHe = lang === "he";
  const allImprovements = analysis.improvements || [];
  const allItems = analysis.items || [];

  // Build improvement cards
  const improvementCards = useMemo(() => {
    return allImprovements.map((imp, impIdx) => {
      const match = findMatchingItem(imp, allItems);
      const impCategory = detectCategory(imp.title) || detectCategory(imp.beforeLabel) || detectCategory(imp.productSearchQuery || "") || detectCategory(imp.description);
      const icon = match?.item.icon || (impCategory ? CATEGORY_ICONS[impCategory] : "✨");

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

  // Default: all improvements OFF — user selects what to fix

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setSelectedPerImp({});
      setResult(null);
      setStep("select");
    } else {
      setResult(null);
      setStep("select");
      setSelectedPerImp({});
    }
  };

  const toggleImp = (impIdx: number) => {
    setSelectedPerImp(prev => {
      const next = { ...prev };
      if (next[impIdx] !== undefined) {
        delete next[impIdx];
      } else {
        const card = improvementCards.find(c => c.impIdx === impIdx);
        next[impIdx] = card?.closetMatch ? -1 : 0;
      }
      return next;
    });
  };

  const switchToCloset = (impIdx: number) => {
    setSelectedPerImp(prev => ({ ...prev, [impIdx]: -1 }));
  };

  const switchToBuyNew = (impIdx: number) => {
    const card = improvementCards.find(c => c.impIdx === impIdx);
    if (selectedPerImp[impIdx] === -1 && card?.closetMatch) {
      setClosetSwitchConfirm({ impIdx, closetName: card.closetMatch.name });
      return;
    }
    setSelectedPerImp(prev => ({ ...prev, [impIdx]: 0 }));
  };

  const confirmClosetSwitch = () => {
    if (!closetSwitchConfirm) return;
    setSelectedPerImp(prev => ({ ...prev, [closetSwitchConfirm.impIdx]: 0 }));
    setClosetSwitchConfirm(null);
  };

  const cancelClosetSwitch = () => setClosetSwitchConfirm(null);

  const selectedCount = Object.keys(selectedPerImp).length;

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

    for (const impIdxStr of Object.keys(selectedPerImp)) {
      const impIdx = Number(impIdxStr);
      directImpIndices.push(impIdx);
      const card = improvementCards.find(c => c.impIdx === impIdx);
      if (card && card.matchedItemIdx >= 0) {
        itemIndicesSet.add(card.matchedItemIdx);
      }
    }

    const itemIndices = itemIndicesSet.size > 0 ? Array.from(itemIndicesSet) : allItems.map((_, i) => i);

    // Build selectedProductDetails
    const selectedProductDetails: { improvementIndex: number; productLabel: string; productImageUrl: string }[] = [];
    for (const [impIdxStr, mode] of Object.entries(selectedPerImp)) {
      const impIdx = Number(impIdxStr);
      const card = improvementCards.find(c => c.impIdx === impIdx);
      if (mode === -1 && card?.closetMatch) {
        const cm = card.closetMatch;
        selectedProductDetails.push({
          improvementIndex: impIdx,
          productLabel: `${cm.name}${cm.brand ? ` (${cm.brand})` : ''}${cm.color ? ` - ${cm.color}` : ''} [FROM CLOSET]`,
          productImageUrl: cm.itemImageUrl || cm.sourceImageUrl || "",
        });
      } else {
        const imp = allImprovements[impIdx];
        selectedProductDetails.push({
          improvementIndex: impIdx,
          productLabel: imp?.afterLabel || imp?.title || "",
          productImageUrl: imp?.upgradeImageUrl || "",
        });
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
    setSelectedPerImp({});
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

        {/* Step 1: Select improvements */}
        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isHe
                ? "בחר את השידרוגים שתרצה ליישם. לכל שידרוג תוכל לבחור בין פריט מהארון או קנייה חדשה."
                : "Select the upgrades you want to apply. For each upgrade you can choose between a closet item or buying new."}
            </p>

            <div className="space-y-3">
              {improvementCards.map(({ imp, impIdx, matchedItem, icon, closetMatch }) => {
                const isSelected = selectedPerImp[impIdx] !== undefined;
                const isCloset = selectedPerImp[impIdx] === -1;
                const hasClosetItem = !!closetMatch;

                return (
                  <div
                    key={impIdx}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isSelected
                        ? isCloset ? "border-emerald-500/40 bg-emerald-500/5" : "border-primary/40 bg-primary/5"
                        : "border-white/5 bg-background/50 opacity-60"
                    }`}
                  >
                    {/* Header with toggle */}
                    <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleImp(impIdx)}>
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected ? "border-primary bg-primary" : "border-white/20"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-xl">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm">{imp.title}</span>
                        {matchedItem && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground truncate">{matchedItem.name}</span>
                            <span className={`text-xs font-bold ${matchedItem.score >= 8 ? "text-amber-400" : matchedItem.score >= 6 ? "text-primary" : "text-rose-400"}`}>
                              {matchedItem.score}/10
                            </span>
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isCloset ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
                        }`}>
                          {isCloset ? (isHe ? "מהארון" : "Closet") : (isHe ? "קנייה חדשה" : "Buy new")}
                        </span>
                      )}
                    </div>

                    {/* Before → After with inline product thumbnail */}
                    <div className="px-3 pb-2">
                      <div className="flex items-center gap-3">
                        {/* Product thumbnail — always visible */}
                        {imp.upgradeImageUrl && (
                          <img
                            loading="lazy"
                            src={imp.upgradeImageUrl}
                            alt={imp.afterLabel}
                            className={`w-16 h-16 rounded-lg object-cover border-2 shrink-0 transition-all ${
                              isSelected ? "border-primary/50 shadow-md shadow-primary/10" : "border-white/10 opacity-60"
                            }`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[11px] flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 line-through">{imp.beforeLabel}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">{imp.afterLabel}</span>
                          </div>
                          {imp.afterColor && (
                            <span className="text-[10px] text-muted-foreground mt-1 block">
                              {imp.afterMaterial ? `${imp.afterColor} ${imp.afterMaterial}` : imp.afterColor}
                              {imp.afterPattern && imp.afterPattern !== "solid" ? ` • ${imp.afterPattern}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Closet match option */}
                    {isSelected && hasClosetItem && (
                      <div className="px-3 pb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); switchToCloset(impIdx); }}
                            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                              isCloset
                                ? "bg-emerald-500/20 border-2 border-emerald-500/50"
                                : "bg-white/[0.02] border border-white/10 hover:border-emerald-500/30"
                            }`}
                          >
                            <span style={{ fontSize: '14px' }}>♻️</span>
                            {(closetMatch!.itemImageUrl || closetMatch!.sourceImageUrl) && (
                              <img loading="lazy" src={closetMatch!.itemImageUrl || closetMatch!.sourceImageUrl}
                                alt={closetMatch!.name}
                                className="w-7 h-7 rounded-md object-cover border border-emerald-500/30"
                              />
                            )}
                            <div className="flex-1 min-w-0 text-start">
                              <span className="text-xs font-medium truncate block">{closetMatch!.name}</span>
                              <span className="text-[10px] text-muted-foreground">{isHe ? "מהארון שלך" : "From your closet"}</span>
                            </div>
                            {isCloset && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); switchToBuyNew(impIdx); }}
                            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                              !isCloset
                                ? "bg-primary/20 border-2 border-primary/50"
                                : "bg-white/[0.02] border border-white/10 hover:border-primary/30"
                            }`}
                          >
                            <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0 text-start">
                              <span className="text-xs font-medium">{isHe ? "קנה חדש" : "Buy new"}</span>
                              <span className="text-[10px] text-muted-foreground block">{imp.afterLabel}</span>
                            </div>
                            {!isCloset && <Check className="w-4 h-4 text-primary shrink-0" />}
                          </button>
                        </div>

                        {/* Preview closet item */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setClosetPreviewItem({ closetMatch: closetMatch!, impIdx }); }}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <Eye className="w-3 h-3" />{isHe ? "צפה בפריט מהארון" : "View closet item"}
                        </button>
                      </div>
                    )}

                    {/* Shopping links as store buttons (when buy new is selected) */}
                    {isSelected && !isCloset && imp.shoppingLinks && imp.shoppingLinks.length > 0 && (
                      <div className="px-3 pb-3">
                        <p className="text-[10px] text-muted-foreground mb-1.5">{isHe ? "חפש בחנויות:" : "Search in stores:"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {imp.shoppingLinks.map((link, j) => {
                            const storeName = extractStoreFromUrl(link.url) || extractStoreFromLabel(link.label);
                            return (
                              <a
                                key={j}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-primary/30 transition-all text-xs"
                              >
                                {storeName ? (
                                  <>
                                    <div className="bg-white/90 rounded px-1 py-0.5"><StoreLogo name={storeName} size="sm" /></div>
                                    <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                                  </>
                                ) : (
                                  <>{link.label}<ExternalLink className="w-2.5 h-2.5" /></>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom action bar */}
            <div className="flex items-center justify-between pt-2 sticky bottom-0 bg-card/95 backdrop-blur-sm pb-1 -mx-1 px-1">
              <span className="text-xs text-muted-foreground">
                {isHe
                  ? `${selectedCount} מתוך ${improvementCards.length} שידרוגים נבחרו`
                  : `${selectedCount} of ${improvementCards.length} upgrades selected`}
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
                <div className="flex flex-wrap gap-2">
                  {result.shoppingLinks.map((link, i) => {
                    const storeName = extractStoreFromUrl(link.url) || extractStoreFromLabel(link.label);
                    return (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-primary/30 transition-all group">
                        {storeName ? (
                          <div className="flex items-center gap-2">
                            <div className="bg-white/90 rounded-lg px-1.5 py-0.5"><StoreLogo name={storeName} size="sm" /></div>
                            <span className="text-xs text-muted-foreground group-hover:text-primary flex items-center gap-1">
                              {isHe ? "חפש" : "Search"}<ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium group-hover:text-primary flex items-center gap-1">
                            {link.label}<ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
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
          const isSelected = selectedPerImp[closetPreviewItem.impIdx] === -1;
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
                  <img loading="lazy" src={imgSrc}
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
                    switchToCloset(closetPreviewItem.impIdx);
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
