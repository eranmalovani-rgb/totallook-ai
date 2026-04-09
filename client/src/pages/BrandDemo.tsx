import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/i18n";
import FashionSpinner from "@/components/FashionSpinner";
import {
  X,
  ShoppingBag,
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  ExternalLink,
  ArrowLeft,
  Shirt,
  Info,
  Recycle,
  Eye,
  TrendingUp,
  Calendar,
  Palette,
  Layers,
  ArrowRight,
  Zap,
  Wand2,
  Download,
  Bell,
  ImageIcon,
  ArrowUpDown,
  MoveHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// Demo products for the mock store
// Single product — the green blazer with multi-angle gallery images
const DEMO_PRODUCT = {
  id: 1,
  name: { he: "בלייזר ירוק אמרלד", en: "Emerald Green Blazer" },
  price: 449,
  currency: "₪",
  brand: "DEMO FASHION",
  image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/green-blazer_35f2913c.jpg",
  category: { he: "ז'קטים", en: "Jackets" },
  categoryKey: "jacket" as const,
  colors: ["#0a5c36", "#1a1a1a", "#f5f5f5"],
  sizes: ["S", "M", "L", "XL", "XXL"],
  rating: 4.7,
  reviews: 128,
  description: {
    he: "בלייזר ירוק אמרלד בגזרת סלים-פיט, בד איכותי עם גימור מושלם. פריט סטייטמנט שמשדרג כל לוק.",
    en: "Emerald green slim-fit blazer, premium fabric with perfect finishing. A statement piece that elevates any look.",
  },
  // Multi-angle gallery images like a real store
  gallery: [
    {
      id: "front",
      url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/green-blazer_35f2913c.jpg",
      label: { he: "חזית", en: "Front" },
    },
    {
      id: "back",
      url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/blazer-back-gwsqi5wVWff6pDLRX8vymu.webp",
      label: { he: "גב", en: "Back" },
    },
    {
      id: "side",
      url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/blazer-side-3g8pF5S4tyrBK93Zyh9qH4.webp",
      label: { he: "צד", en: "Side" },
    },
    {
      id: "detail",
      url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/blazer-detail-J6nqn8vZUikRiCYvAVwiQ2.webp",
      label: { he: "פרט", en: "Detail" },
    },
    {
      id: "model",
      url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/blazer-model-dvMKkvgBKy2bAPv2YR8taN.webp",
      label: { he: "על דוגמן", en: "On Model" },
    },
  ],
};

// Separate product for the popup notification — always shoes
const DEMO_POPUP_PRODUCT = {
  id: 2,
  name: { he: "נעלי אוקספורד שחורות", en: "Black Oxford Shoes" },
  price: 599,
  currency: "₪",
  brand: "DEMO FASHION",
  image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/black-oxford-shoes_a82eaf92.jpg",
  category: { he: "נעליים", en: "Shoes" },
  categoryKey: "shoes" as const,
};

// Keep DEMO_PRODUCTS array for backward compatibility with widget/notification
const DEMO_PRODUCTS = [DEMO_PRODUCT];

type WidgetTab = "match" | "wardrobe" | "looks" | "upgrade" | "complete";

// ---- Widget Component ----
function TotalLookWidget({
  product,
  isOpen,
  onClose,
  lang,
}: {
  product: (typeof DEMO_PRODUCTS)[0];
  isOpen: boolean;
  onClose: () => void;
  lang: "he" | "en";
}) {
  const { user } = useAuth({});
  const isHe = lang === "he";

  const personalizationInput = useMemo(() => ({
    productCategory: product.categoryKey,
    productColors: product.colors,
    productName: product.name.en,
    productPrice: product.price,
  }), [product.categoryKey, product.name.en, product.price]);

  const { data: tasteData, isLoading: tasteLoading } = trpc.tasteProfile.get.useQuery(undefined, {
    enabled: isOpen && !!user,
  });

  const { data: widgetData, isLoading: widgetLoading } = trpc.tasteProfile.widgetPersonalization.useQuery(
    personalizationInput,
    { enabled: isOpen && !!user }
  );

  // AI Look Generation mutation
  const generateLookMutation = trpc.tasteProfile.generateWidgetLook.useMutation();
  const [generatedLookUrl, setGeneratedLookUrl] = useState<string | null>(null);

  // Before/After Upgrade Look
  const upgradeLookMutation = trpc.tasteProfile.generateUpgradeLook.useMutation();
  const [selectedLookForUpgrade, setSelectedLookForUpgrade] = useState<number | null>(null);
  const [upgradeLookUrl, setUpgradeLookUrl] = useState<string | null>(null);
  const [beforeAfterSliderPos, setBeforeAfterSliderPos] = useState(50);
  const [isAutoSliding, setIsAutoSliding] = useState(false);
  const autoSlideRanRef = useRef<boolean>(false);
  const animFrameRef = useRef<number>(0);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const [animState, setAnimState] = useState<"scanning" | "result">("scanning");
  const [activeTab, setActiveTab] = useState<WidgetTab>("match");

  useEffect(() => {
    if (isOpen) {
      setAnimState("scanning");
      setActiveTab("match");
      setGeneratedLookUrl(null);
      setSelectedLookForUpgrade(null);
      setUpgradeLookUrl(null);
      setBeforeAfterSliderPos(50);
      autoSlideRanRef.current = false;
      const timer = setTimeout(() => setAnimState("result"), 2500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Before/After auto-slide animation
  const runAutoSlide = useCallback(() => {
    setIsAutoSliding(true);
    const keyframes = [
      { target: 20, duration: 700 },
      { target: 80, duration: 900 },
      { target: 50, duration: 700 },
    ];
    let currentKeyframe = 0;
    let startTime: number | null = null;
    let startPos = 50;

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const kf = keyframes[currentKeyframe];
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / kf.duration, 1);
      const eased = easeInOutCubic(progress);
      const newPos = startPos + (kf.target - startPos) * eased;
      setBeforeAfterSliderPos(newPos);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentKeyframe++;
        if (currentKeyframe < keyframes.length) {
          startPos = kf.target;
          startTime = null;
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsAutoSliding(false);
        }
      }
    }

    setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animate);
    }, 400);
  }, []);

  // Slider drag handlers
  const updateSliderPosition = useCallback((clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setBeforeAfterSliderPos(pct);
  }, []);

  useEffect(() => {
    if (!isDraggingSlider) return;
    const handleMove = (e: MouseEvent) => updateSliderPosition(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      updateSliderPosition(e.touches[0].clientX);
    };
    const handleEnd = () => setIsDraggingSlider(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDraggingSlider, updateSliderPosition]);

  const handleUpgradeLook = useCallback((look: { reviewId: number; imageUrl: string; existingItems: { name: string }[]; overallScore: number }) => {
    setSelectedLookForUpgrade(look.reviewId);
    setUpgradeLookUrl(null);
    setBeforeAfterSliderPos(50);
    autoSlideRanRef.current = false;
    setActiveTab("upgrade");

    upgradeLookMutation.mutate(
      {
        productName: product.name.en,
        productCategory: product.categoryKey,
        productColors: product.colors,
        originalImageUrl: look.imageUrl,
        existingItemNames: look.existingItems.map((i) => i.name),
        gender: widgetData?.profilePreferences?.gender || undefined,
      },
      {
        onSuccess: (data) => {
          if (data.success && data.imageUrl) {
            setUpgradeLookUrl(data.imageUrl);
            // Trigger auto-slide after image loads
            setTimeout(() => {
              if (!autoSlideRanRef.current) {
                autoSlideRanRef.current = true;
                runAutoSlide();
              }
            }, 500);
          }
        },
      }
    );
  }, [product, widgetData, upgradeLookMutation, runAutoSlide]);

  const handleGenerateLook = useCallback(() => {
    if (!widgetData?.completeLookSuggestion) return;
    setGeneratedLookUrl(null);
    generateLookMutation.mutate(
      {
        productName: product.name.en,
        productCategory: product.categoryKey,
        productColors: product.colors,
        productImageUrl: product.image,
        wardrobeItemNames: widgetData.completeLookSuggestion.map((item) => item.name),
        wardrobeItemColors: widgetData.completeLookSuggestion.map((item) => item.color || "neutral"),
        gender: widgetData.profilePreferences?.gender || undefined,
      },
      {
        onSuccess: (data) => {
          if (data.success && data.imageUrl) {
            setGeneratedLookUrl(data.imageUrl);
          }
        },
      }
    );
  }, [widgetData, product, generateLookMutation]);

  const handleDownloadLook = useCallback(async () => {
    if (!generatedLookUrl) return;
    try {
      const response = await fetch(generatedLookUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `totallook-${product.name.en.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(generatedLookUrl, "_blank");
    }
  }, [generatedLookUrl, product.name.en]);

  if (!isOpen) return null;

  // Calculate match score based on taste data
  const matchScore = tasteData?.hasData
    ? Math.min(95, Math.max(45, Math.round(
        (tasteData.overallTasteScore || 5) * 8 +
        Math.random() * 15 +
        (tasteData.analysisCount || 0) * 2
      )))
    : Math.round(65 + Math.random() * 20);

  const matchLevel =
    matchScore >= 80 ? { he: "התאמה מצוינת!", en: "Excellent Match!", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" } :
    matchScore >= 60 ? { he: "התאמה טובה", en: "Good Match", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" } :
    { he: "התאמה חלקית", en: "Partial Match", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" };

  const hasWardrobeItems = (widgetData?.matchingWardrobeItems?.length ?? 0) > 0;
  const hasRecentLooks = (widgetData?.recentLooks?.length ?? 0) > 0;
  const hasCompleteLook = (widgetData?.completeLookSuggestion?.length ?? 0) > 0;

  const tabs: { key: WidgetTab; label: { he: string; en: string }; icon: React.ReactNode; available: boolean }[] = [
    { key: "match", label: { he: "התאמה", en: "Match" }, icon: <Sparkles className="w-3 h-3" />, available: true },
    { key: "wardrobe", label: { he: "מהארון שלך", en: "Your Closet" }, icon: <Recycle className="w-3 h-3" />, available: hasWardrobeItems },
    { key: "looks", label: { he: "שדרג לוק", en: "Upgrade Look" }, icon: <TrendingUp className="w-3 h-3" />, available: hasRecentLooks },
    { key: "upgrade", label: { he: "לפני/אחרי", en: "Before/After" }, icon: <MoveHorizontal className="w-3 h-3" />, available: !!selectedLookForUpgrade },
    { key: "complete", label: { he: "לוק מלא", en: "Full Look" }, icon: <Layers className="w-3 h-3" />, available: hasCompleteLook },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)",
          border: "1px solid rgba(212, 160, 23, 0.3)",
        }}
      >
        {/* Widget Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              TotalLook.ai
            </span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Widget Content */}
        <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          <div className="p-5">
            {animState === "scanning" ? (
              <div className="flex flex-col items-center py-10 gap-4">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-amber-500/50 animate-pulse" />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
                  </div>
                </div>
                <p className="text-sm text-white/60 animate-pulse">
                  {isHe ? "מנתח התאמה לפרופיל שלך..." : "Analyzing match to your profile..."}
                </p>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-amber-500"
                      style={{ animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Product + Score Header */}
                <div className="flex gap-4">
                  <div className="w-20 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                    <img loading="lazy" src={product.image}
                      alt={product.name[lang]}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{product.name[lang]}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{product.brand}</p>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${matchLevel.bg}`}>
                      <span className={`text-lg font-black ${matchLevel.color}`}>{matchScore}%</span>
                      <span className={`text-xs ${matchLevel.color}`}>{matchLevel[isHe ? "he" : "en"]}</span>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 pt-2 border-t border-white/5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {tabs.filter(t => t.available).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                        activeTab === tab.key
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "text-white/40 hover:text-white/70 border border-transparent"
                      }`}
                    >
                      {tab.icon}
                      {tab.label[lang]}
                    </button>
                  ))}
                </div>

                {/* ===== TAB: Match ===== */}
                {activeTab === "match" && (
                  <div className="space-y-3">
                    {/* Style Insights */}
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        {isHe ? "הפרופיל שלך" : "Your Profile"}
                      </p>
                      {[
                        {
                          label: isHe ? "סגנון דומיננטי" : "Dominant Style",
                          value: widgetData?.personalInsights?.dominantStyle || 
                            (tasteData?.styleMap ? Object.entries(tasteData.styleMap).sort((a, b) => b[1] - a[1])[0]?.[0] : "Classic"),
                        },
                        {
                          label: isHe ? "צבעים מועדפים" : "Preferred Colors",
                          value: widgetData?.personalInsights?.topColors?.slice(0, 3).join(", ") ||
                            tasteData?.colorPalette?.slice(0, 3).map((c: { color: string }) => c.color).join(", ") || "Black, White",
                        },
                        {
                          label: isHe ? "ציון טעם" : "Taste Score",
                          value: `${tasteData?.overallTasteScore || 7}/10`,
                        },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center justify-between text-sm">
                          <span className="text-white/50">{s.label}</span>
                          <span className="font-medium capitalize">{s.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Match Reasons */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        {isHe ? "למה מתאים לך" : "Why It Matches"}
                      </p>
                      <div className="space-y-1">
                        {[
                          isHe ? "הצבע תואם לפלטה שלך" : "Color matches your palette",
                          isHe ? "מתאים לסגנון הדומיננטי שלך" : "Fits your dominant style",
                          isHe ? "בטווח התקציב שלך" : "Within your budget range",
                        ].map((reason) => (
                          <div key={reason} className="flex items-center gap-2 text-xs">
                            <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span className="text-white/70">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Score Improvement Insight */}
                    {widgetData?.personalInsights?.scoreImprovement !== undefined && widgetData.personalInsights.scoreImprovement > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <p className="text-xs text-emerald-300">
                          {isHe
                            ? `הסגנון שלך השתפר ב-${widgetData.personalInsights.scoreImprovement} נקודות לאחרונה!`
                            : `Your style improved by ${widgetData.personalInsights.scoreImprovement} points recently!`}
                        </p>
                      </div>
                    )}

                    {/* Wardrobe teaser */}
                    {hasWardrobeItems && (
                      <button
                        onClick={() => setActiveTab("wardrobe")}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/8 transition-colors border border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <Recycle className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-white/70">
                            {isHe
                              ? `יש לך ${widgetData?.matchingWardrobeItems?.length} פריטים שמשתלבים`
                              : `You have ${widgetData?.matchingWardrobeItems?.length} matching items`}
                          </span>
                        </div>
                        {isHe ? <ChevronLeft className="w-3 h-3 text-white/30" /> : <ChevronRight className="w-3 h-3 text-white/30" />}
                      </button>
                    )}
                  </div>
                )}

                {/* ===== TAB: Wardrobe Matching ===== */}
                {activeTab === "wardrobe" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Recycle className="w-4 h-4 text-amber-400" />
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        {isHe ? "פריטים מהארון שלך שמשתלבים" : "Items from your closet that pair well"}
                      </p>
                    </div>

                    {widgetData?.matchingWardrobeItems && widgetData.matchingWardrobeItems.length > 0 ? (
                      <div className="space-y-2">
                        {widgetData.matchingWardrobeItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-amber-500/20 transition-colors"
                          >
                            {/* Item image */}
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-white/10 flex-shrink-0">
                              {item.itemImageUrl ? (
                                <img loading="lazy" src={item.itemImageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : item.sourceImageUrl ? (
                                <img loading="lazy" src={item.sourceImageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Shirt className="w-5 h-5 text-white/20" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <span className="capitalize">{item.itemType}</span>
                                {item.color && (
                                  <>
                                    <span>·</span>
                                    <span>{item.color}</span>
                                  </>
                                )}
                                {item.brand && (
                                  <>
                                    <span>·</span>
                                    <span>{item.brand}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <Recycle className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-white/30 text-sm">
                        {isHe ? "אין פריטים תואמים בארון שלך" : "No matching items in your closet"}
                      </div>
                    )}

                    {/* Styling tip */}
                    {widgetData?.matchingWardrobeItems && widgetData.matchingWardrobeItems.length > 0 && (
                      <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-300/80">
                          <Sparkles className="w-3 h-3 inline mr-1 rtl:ml-1 rtl:mr-0" />
                          {isHe
                            ? `שלב את ה${product.name.he} עם הפריטים שלך ליצירת לוק מושלם — כבר יש לך את הבסיס!`
                            : `Pair the ${product.name.en} with your items for a perfect look — you already have the foundation!`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== TAB: Recent Looks ===== */}
                {activeTab === "looks" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        {isHe ? "שדרג לוקים אחרונים" : "Upgrade Your Recent Looks"}
                      </p>
                    </div>

                    {widgetData?.recentLooks && widgetData.recentLooks.length > 0 ? (
                      <div className="space-y-2.5">
                        {widgetData.recentLooks.slice(0, 3).map((look) => (
                          <div
                            key={look.reviewId}
                            className="p-3 rounded-lg bg-white/5 border border-white/5"
                          >
                            <div className="flex items-start gap-3">
                              {/* Look thumbnail */}
                              <div className="w-14 h-14 rounded-md overflow-hidden bg-white/10 flex-shrink-0">
                                <img loading="lazy" src={look.imageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="w-3 h-3 text-white/30" />
                                  <span className="text-xs text-white/50">
                                    {isHe
                                      ? `יום ${look.dayNameHe} — ${look.date}`
                                      : `${look.dayNameEn} — ${look.date}`}
                                  </span>
                                  <span className={`text-xs font-bold ${look.overallScore >= 7 ? "text-emerald-400" : look.overallScore >= 5 ? "text-amber-400" : "text-orange-400"}`}>
                                    {look.overallScore}/10
                                  </span>
                                </div>

                                {/* How this product would improve this look */}
                                <p className="text-xs text-amber-300/80">
                                  <Zap className="w-3 h-3 inline mr-1 rtl:ml-1 rtl:mr-0" />
                                  {isHe
                                    ? `ה${product.name.he} היה משדרג את הלוק הזה`
                                    : `The ${product.name.en} would upgrade this look`}
                                </p>

                                {/* Existing items from this look */}
                                {look.existingItems.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {look.existingItems.slice(0, 3).map((item, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40"
                                      >
                                        {item.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Relevant improvements */}
                            {look.relevantImprovements.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-white/5">
                                {look.relevantImprovements.map((imp, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-xs text-white/50">
                                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <span>{imp.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Before/After CTA */}
                            <button
                              onClick={() => handleUpgradeLook(look)}
                              disabled={upgradeLookMutation.isPending && selectedLookForUpgrade === look.reviewId}
                              className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 text-violet-300 hover:from-violet-600/30 hover:to-purple-600/30 hover:text-violet-200 disabled:opacity-50"
                            >
                              {upgradeLookMutation.isPending && selectedLookForUpgrade === look.reviewId ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                                  {isHe ? "מייצר השוואה..." : "Generating comparison..."}
                                </>
                              ) : (
                                <>
                                  <MoveHorizontal className="w-3.5 h-3.5" />
                                  {isHe ? "ראה לפני/אחרי ✨" : "See Before/After ✨"}
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-white/30 text-sm">
                        {isHe ? "אין לוקים אחרונים" : "No recent looks to reference"}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== TAB: Before/After Upgrade ===== */}
                {activeTab === "upgrade" && selectedLookForUpgrade && (() => {
                  const selectedLook = widgetData?.recentLooks?.find((l) => l.reviewId === selectedLookForUpgrade);
                  if (!selectedLook) return null;
                  const estimatedScore = Math.min(10, Math.round((selectedLook.overallScore + 1.5) * 10) / 10);

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MoveHorizontal className="w-4 h-4 text-violet-400" />
                          <p className="text-xs text-white/40 uppercase tracking-wider">
                            {isHe ? "לפני / אחרי" : "Before / After"}
                          </p>
                        </div>
                        <button
                          onClick={() => { setSelectedLookForUpgrade(null); setActiveTab("looks"); }}
                          className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                        >
                          {isHe ? "← חזרה" : "← Back"}
                        </button>
                      </div>

                      {/* Score comparison bar */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                        <div className="text-center">
                          <p className="text-[10px] text-white/30 uppercase">{isHe ? "לפני" : "Before"}</p>
                          <p className={`text-lg font-black ${selectedLook.overallScore >= 7 ? "text-emerald-400" : selectedLook.overallScore >= 5 ? "text-amber-400" : "text-orange-400"}`}>
                            {selectedLook.overallScore}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-white/20" />
                          <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                            <span className="text-[10px] text-emerald-400 font-bold">
                              +{Math.round((estimatedScore - selectedLook.overallScore) * 10) / 10}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-white/20" />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-white/30 uppercase">{isHe ? "אחרי" : "After"}</p>
                          <p className="text-lg font-black text-emerald-400">{estimatedScore}</p>
                        </div>
                      </div>

                      {/* What changed */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                        <Zap className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                        <p className="text-xs text-violet-300">
                          {isHe
                            ? `הוספנו ${product.name.he} ללוק מיום ${selectedLook.dayNameHe}`
                            : `Added ${product.name.en} to ${selectedLook.dayNameEn}'s look`}
                        </p>
                      </div>

                      {/* Before/After Slider */}
                      {upgradeLookMutation.isPending ? (
                        <div className="flex flex-col items-center py-8 gap-3">
                          <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                            <div className="absolute inset-2 rounded-full border-2 border-violet-500/50 animate-pulse" />
                            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                              <Wand2 className="w-5 h-5 text-violet-400 animate-pulse" />
                            </div>
                          </div>
                          <p className="text-xs text-white/50 animate-pulse">
                            {isHe ? "מייצר את הלוק המשודרג..." : "Generating upgraded look..."}
                          </p>
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-violet-500"
                                style={{ animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : upgradeLookUrl ? (
                        <div className="space-y-2">
                          {/* Interactive Before/After Slider */}
                          <div
                            ref={sliderContainerRef}
                            className="relative w-full rounded-xl overflow-hidden cursor-col-resize select-none border border-white/10 shadow-xl"
                            style={{ touchAction: "none", aspectRatio: "3/4" }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIsDraggingSlider(true);
                              if (isAutoSliding) {
                                cancelAnimationFrame(animFrameRef.current);
                                setIsAutoSliding(false);
                              }
                              updateSliderPosition(e.clientX);
                            }}
                            onTouchStart={(e) => {
                              setIsDraggingSlider(true);
                              if (isAutoSliding) {
                                cancelAnimationFrame(animFrameRef.current);
                                setIsAutoSliding(false);
                              }
                              updateSliderPosition(e.touches[0].clientX);
                            }}
                          >
                            {/* AFTER image — full background */}
                            <img loading="lazy" src={upgradeLookUrl}
                              alt="After"
                              className="absolute inset-0 w-full h-full object-contain"
                              style={{ userSelect: "none", pointerEvents: "none" }}
                              draggable={false}
                            />

                            {/* BEFORE image — clipped */}
                            <div
                              className="absolute inset-0"
                              style={{ clipPath: `inset(0 ${100 - beforeAfterSliderPos}% 0 0)` }}
                            >
                              <img loading="lazy" src={selectedLook.imageUrl}
                                alt="Before"
                                className="absolute inset-0 w-full h-full object-contain"
                                style={{ userSelect: "none", pointerEvents: "none" }}
                                draggable={false}
                              />
                            </div>

                            {/* Slider line */}
                            <div
                              className="absolute top-0 bottom-0 z-10"
                              style={{
                                left: `${beforeAfterSliderPos}%`,
                                transform: "translateX(-50%)",
                                width: "3px",
                                background: "rgba(255,255,255,0.9)",
                                boxShadow: "0 0 8px rgba(0,0,0,0.5)",
                              }}
                            >
                              {/* Slider handle */}
                              <div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white/80"
                                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                              >
                                <svg width="20" height="20" viewBox="0 0 22 22" fill="none" className="text-gray-700">
                                  <path d="M8 4L3 11L8 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M14 4L19 11L14 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </div>

                            {/* Labels */}
                            <div className="absolute top-3 left-3 z-20">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 backdrop-blur-sm text-white border border-white/20 shadow-md">
                                {isHe ? "לפני" : "Before"}
                                <span className="text-rose-400 font-black mr-1 rtl:ml-1 rtl:mr-0">{selectedLook.overallScore}</span>
                              </span>
                            </div>
                            <div className="absolute top-3 right-3 z-20">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 backdrop-blur-sm text-white border border-violet-500/30 shadow-md">
                                {isHe ? "אחרי" : "After"}
                                <span className="text-emerald-400 font-black mr-1 rtl:ml-1 rtl:mr-0">{estimatedScore}</span>
                              </span>
                            </div>

                            {/* Drag hint */}
                            {!isDraggingSlider && !isAutoSliding && (
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse">
                                <span className="px-3 py-1.5 rounded-full text-[10px] bg-black/60 backdrop-blur-sm text-white/80 shadow-md">
                                  {isHe ? "← גרור להשוואה →" : "← Drag to compare →"}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Upgrade details */}
                          <div className="flex items-center gap-2 justify-center">
                            <span className="text-[10px] text-white/30">
                              {isHe ? `לוק מיום ${selectedLook.dayNameHe} — ${selectedLook.date}` : `${selectedLook.dayNameEn} look — ${selectedLook.date}`}
                            </span>
                          </div>

                          {/* Regenerate button */}
                          <button
                            onClick={() => handleUpgradeLook(selectedLook)}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
                          >
                            <Wand2 className="w-3 h-3" />
                            {isHe ? "ייצר מחדש" : "Regenerate"}
                          </button>
                        </div>
                      ) : upgradeLookMutation.isError ? (
                        <div className="text-center py-6">
                          <p className="text-xs text-red-400">
                            {isHe ? "שגיאה ביצירת התמונה" : "Failed to generate image"}
                          </p>
                          <button
                            onClick={() => handleUpgradeLook(selectedLook)}
                            className="mt-2 text-xs text-violet-400 hover:text-violet-300"
                          >
                            {isHe ? "נסה שוב" : "Try again"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* ===== TAB: Complete Look ===== */}
                {activeTab === "complete" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        {isHe ? "איך תיראה עם זה" : "How You'll Look"}
                      </p>
                    </div>

                    {/* AI Generated Look Image */}
                    {generatedLookUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-amber-500/30 bg-black/30">
                        <img loading="lazy" src={generatedLookUrl}
                          alt="AI Generated Look"
                          className="w-full object-contain max-h-[300px]"
                        />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button
                            onClick={handleDownloadLook}
                            className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                            title={isHe ? "הורדה" : "Download"}
                          >
                            <Download className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={handleGenerateLook}
                            disabled={generateLookMutation.isPending}
                            className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors disabled:opacity-50"
                            title={isHe ? "גרסה חדשה" : "New version"}
                          >
                            <Wand2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent py-2 px-3">
                          <p className="text-[10px] text-white/60 text-center">
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            {isHe ? "נוצר ע\"י AI — לוח השראה מותאם אישית" : "AI Generated — Personalized mood board"}
                          </p>
                        </div>
                      </div>
                    ) : generateLookMutation.isPending ? (
                      <div className="flex flex-col items-center py-10 gap-4 rounded-xl border border-white/10 bg-white/5">
                        <div className="relative">
                          <FashionSpinner size="lg" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium text-white/80">
                            {isHe ? "מייצר לוח השראה..." : "Generating mood board..."}
                          </p>
                          <p className="text-xs text-white/40">
                            {isHe
                              ? "משלב את המוצר עם הפריטים מהארון שלך"
                              : "Combining the product with your wardrobe items"}
                          </p>
                        </div>
                      </div>
                    ) : generateLookMutation.isError ? (
                      <div className="flex flex-col items-center py-8 gap-3 rounded-xl border border-red-500/20 bg-red-500/5">
                        <p className="text-sm text-red-400">
                          {isHe ? "שגיאה ביצירת התמונה" : "Error generating image"}
                        </p>
                        <button
                          onClick={handleGenerateLook}
                          className="px-4 py-1.5 rounded-lg bg-white/10 text-xs text-white/70 hover:bg-white/15 transition-colors"
                        >
                          {isHe ? "נסה שוב" : "Try again"}
                        </button>
                      </div>
                    ) : null}

                    {/* Visual combination - items grid */}
                    <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-white/5 to-white/0 border border-white/10 p-4">
                      <p className="text-xs text-white/50 text-center mb-3">
                        {isHe ? "הלוק המלא שלך" : "Your Complete Look"}
                      </p>

                      {/* Product + Wardrobe Items Visual Grid */}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* The product being viewed */}
                        <div className="relative">
                          <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-amber-500/50 shadow-lg shadow-amber-500/10">
                            <img loading="lazy" src={product.image} alt={product.name[lang]} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                            <ShoppingBag className="w-2.5 h-2.5 text-black" />
                          </div>
                          <p className="text-[9px] text-center text-amber-400 mt-1 truncate w-20">
                            {isHe ? "מוצר חדש" : "New Item"}
                          </p>
                        </div>

                        {/* Plus sign */}
                        <div className="text-white/20 text-lg font-light">+</div>

                        {/* Wardrobe items */}
                        {widgetData?.completeLookSuggestion?.map((item) => (
                          <div key={item.id} className="relative">
                            <div className="w-20 h-24 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                              {item.itemImageUrl ? (
                                <img loading="lazy" src={item.itemImageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Shirt className="w-6 h-6 text-white/15" />
                                </div>
                              )}
                            </div>
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500/80 flex items-center justify-center">
                              <Recycle className="w-2.5 h-2.5 text-white" />
                            </div>
                            <p className="text-[9px] text-center text-white/40 mt-1 truncate w-20">
                              {item.name}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Styling insight */}
                      <div className="mt-4 pt-3 border-t border-white/5 text-center">
                        <p className="text-xs text-white/60">
                          {isHe
                            ? `שלב את ה${product.name.he} עם ${widgetData?.completeLookSuggestion?.length || 0} פריטים שכבר יש לך`
                            : `Combine the ${product.name.en} with ${widgetData?.completeLookSuggestion?.length || 0} items you already own`}
                        </p>
                        {widgetData?.personalInsights?.dominantStyle && (
                          <p className="text-[10px] text-amber-400/60 mt-1">
                            {isHe
                              ? `מותאם לסגנון ה-${widgetData.personalInsights.dominantStyle} שלך`
                              : `Tailored to your ${widgetData.personalInsights.dominantStyle} style`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* "Try the Look" AI Generation Button */}
                    {!generatedLookUrl && !generateLookMutation.isPending && hasCompleteLook && (
                      <button
                        onClick={handleGenerateLook}
                        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)",
                          boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
                        }}
                      >
                        <Wand2 className="w-4 h-4" />
                        {isHe ? "✨ נסה את הלוק — יצירת תמונת AI" : "✨ Try the Look — Generate AI Image"}
                      </button>
                    )}

                    {/* Color harmony */}
                    {widgetData?.personalInsights?.topColors && widgetData.personalInsights.topColors.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                        <Palette className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-xs text-white/40">
                          {isHe ? "הצבעים שלך:" : "Your colors:"}
                        </span>
                        <div className="flex gap-1">
                          {widgetData.personalInsights.topColors.slice(0, 5).map((color, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 capitalize">
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity">
                    {isHe ? "הוסף לסל" : "Add to Cart"}
                  </button>
                  <button className="px-3 py-2.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>

                {/* Powered by */}
                <div className="text-center pt-1">
                  <span className="text-[10px] text-white/20">
                    Powered by TotalLook.ai — {isHe ? "התאמה אישית חכמה" : "Smart Personal Matching"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Smart Match Notification Popup ----
// Complementary items that pair well with the green blazer
function SmartMatchNotification({
  lang,
  onOpenWidget,
  onDismiss,
}: {
  lang: "he" | "en";
  onOpenWidget: () => void;
  onDismiss: () => void;
}) {
  const isHe = lang === "he";
  const { user } = useAuth({});

  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss();
  };

  if (!isVisible) return null;

  // Match reasons based on whether user is logged in
  const matchReasons = user
    ? [
        { icon: "🎯", text: { he: "מתאים לפרופיל הטעם שלך", en: "Matches your taste profile" } },
        { icon: "👔", text: { he: "משתלב עם פריטים בארון שלך", en: "Pairs with items in your wardrobe" } },
        { icon: "💰", text: { he: "בטווח התקציב שלך", en: "Within your budget range" } },
      ]
    : [
        { icon: "🎯", text: { he: "פריט פרימיום בהתאמה גבוהה", en: "Premium item with high match" } },
        { icon: "✨", text: { he: "הירשם כדי לראות התאמה אישית", en: "Sign up for personalized matching" } },
      ];

  return (
    <div
      className={`fixed bottom-20 z-[90] transition-all duration-500 left-1/2 -translate-x-1/2 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ maxWidth: "340px", width: "calc(100% - 32px)" }}
    >
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(145deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)",
          border: "1px solid rgba(212, 160, 23, 0.4)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(212, 160, 23, 0.15)",
        }}
      >
        {/* Notification Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-4 h-4 text-amber-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <span className="text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              TotalLook.ai
            </span>
          </div>
          <button onClick={handleDismiss} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notification Content — Focus on THIS product matching the user */}
        <div className="p-4">
          <p className="text-sm font-semibold text-white mb-1">
            {isHe ? "🎯 יש לנו משהו בשבילך!" : "🎯 We have something for you!"}
          </p>
          <p className="text-xs text-white/60 mb-3">
            {isHe
              ? "הפריט הזה מתאים לך במיוחד:"
              : "This item is a great match for you:"}
          </p>

          <button
            onClick={() => {
              onOpenWidget();
              handleDismiss();
            }}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all group"
          >
            <div className="w-14 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
              <img loading="lazy" src={DEMO_POPUP_PRODUCT.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 text-start">
              <p className="text-sm font-medium text-white truncate">{DEMO_POPUP_PRODUCT.name[lang]}</p>
              <p className="text-xs text-white/40">{DEMO_POPUP_PRODUCT.brand}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-bold text-emerald-400">
                  {isHe ? "התאמה 92%" : "92% Match"}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
              {isHe ? <ChevronLeft className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
            </div>
          </button>

          {/* Match reasons */}
          <div className="mt-3 space-y-1.5">
            {matchReasons.map((reason, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs">{reason.icon}</span>
                <span className="text-[11px] text-white/50">{reason.text[lang]}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              onOpenWidget();
              handleDismiss();
            }}
            className="w-full mt-3 py-2 rounded-lg text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 transition-all"
          >
            {isHe ? "ראה למה זה מתאים לך →" : "See why it matches you →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Brand Demo Page ----
export default function BrandDemo() {
  const { lang } = useLanguage();
  const isHe = lang === "he";
  const dir = isHe ? "rtl" : "ltr";

  const selectedProduct = DEMO_PRODUCT;
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState(0);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [showBanner, setShowBanner] = useState(true);
  const [notificationDismissed, setNotificationDismissed] = useState(false);


  return (
    <div className="min-h-screen bg-white text-gray-900" dir={dir}>
      {/* Demo Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white py-2 px-4 text-center text-sm relative">
          <div className="flex items-center justify-center gap-2">
            <Info className="w-4 h-4" />
            <span>
              {isHe
                ? "זהו אתר דמו של מותג — הכפתור הזהוב מדמה את ה-Widget של TotalLook.ai"
                : "This is a brand demo site — the gold button simulates the TotalLook.ai Widget"}
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Store Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black tracking-tight">DEMO FASHION</h1>
            <nav className="hidden md:flex items-center gap-5 text-sm text-gray-500">
              <span className="hover:text-gray-900 cursor-pointer">{isHe ? "חדש" : "New"}</span>
              <span className="hover:text-gray-900 cursor-pointer">{isHe ? "נשים" : "Women"}</span>
              <span className="hover:text-gray-900 cursor-pointer">{isHe ? "גברים" : "Men"}</span>
              <span className="hover:text-gray-900 cursor-pointer">{isHe ? "אקססוריז" : "Accessories"}</span>
              <span className="text-red-500 font-medium cursor-pointer">{isHe ? "סייל" : "Sale"}</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Heart className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-900" />
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-900" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black text-white text-[10px] rounded-full flex items-center justify-center">
                0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-3 text-xs text-gray-400">
        <span className="hover:text-gray-600 cursor-pointer">{isHe ? "בית" : "Home"}</span>
        <span className="mx-2">/</span>
        <span className="hover:text-gray-600 cursor-pointer">{selectedProduct.category[lang]}</span>
        <span className="mx-2">/</span>
        <span className="text-gray-600">{selectedProduct.name[lang]}</span>
      </div>

      {/* Product Page */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
              <img loading="lazy" src={DEMO_PRODUCT.gallery[selectedGalleryIdx].url}
                alt={`${selectedProduct.name[lang]} - ${DEMO_PRODUCT.gallery[selectedGalleryIdx].label[lang]}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Multi-angle Thumbnails */}
            <div className="flex gap-2 mt-4">
              {DEMO_PRODUCT.gallery.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedGalleryIdx(idx)}
                  className={`w-16 h-20 rounded-md overflow-hidden border-2 transition-all ${
                    selectedGalleryIdx === idx
                      ? "border-black"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <img loading="lazy" src={img.url} alt={img.label[lang]} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="py-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
              {selectedProduct.brand}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{selectedProduct.name[lang]}</h2>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.floor(selectedProduct.rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                ({selectedProduct.reviews} {isHe ? "ביקורות" : "reviews"})
              </span>
            </div>

            {/* Price */}
            <p className="text-3xl font-bold mb-6">
              {selectedProduct.currency}{selectedProduct.price}
            </p>

            {/* Description */}
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              {selectedProduct.description[lang]}
            </p>

            {/* Color Selection */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">{isHe ? "צבע" : "Color"}</p>
              <div className="flex gap-2">
                {selectedProduct.colors.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColorIdx(i)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColorIdx === i ? "border-black scale-110" : "border-gray-200"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">{isHe ? "מידה" : "Size"}</p>
              <div className="flex gap-2">
                {selectedProduct.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`w-12 h-10 rounded-md border text-sm font-medium transition-all ${
                      selectedSize === s
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-gray-400 text-gray-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ===== TOTALLOOK WIDGET BUTTON ===== */}
            <button
              onClick={() => setWidgetOpen(true)}
              className="w-full mb-4 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, #d4a017 0%, #e8b82a 50%, #d4a017 100%)",
                color: "#000",
                boxShadow: "0 4px 15px rgba(212, 160, 23, 0.3)",
              }}
            >
              <Sparkles className="w-4 h-4" />
              {isHe ? "בדוק אם זה מתאים לך ✨" : "Check if it matches you ✨"}
              <span className="text-[10px] opacity-60 ml-1">by TotalLook.ai</span>
            </button>

            {/* Regular Add to Cart */}
            <button className="w-full py-3 rounded-lg bg-black text-white font-semibold text-sm hover:bg-gray-800 transition-colors mb-3">
              {isHe ? "הוסף לסל" : "Add to Cart"}
            </button>

            <button className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <Heart className="w-4 h-4" />
              {isHe ? "שמור למועדפים" : "Save to Wishlist"}
            </button>

            {/* Product Info */}
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4" />
                <span>{isHe ? "משלוח חינם מעל ₪200" : "Free shipping over ₪200"}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>{isHe ? "החזרה חינם תוך 30 יום" : "Free returns within 30 days"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back to TotalLook */}
      <div className="fixed bottom-4 left-4 z-50">
        <Link href="/">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 text-white text-xs backdrop-blur-sm hover:bg-black transition-colors">
            <ArrowLeft className="w-3 h-3" />
            {isHe ? "חזרה ל-TotalLook" : "Back to TotalLook"}
          </button>
        </Link>
      </div>

      {/* Smart Match Notification */}
      {!widgetOpen && !notificationDismissed && (
        <SmartMatchNotification
          lang={lang}
          onOpenWidget={() => setWidgetOpen(true)}
          onDismiss={() => setNotificationDismissed(true)}
        />
      )}

      {/* Widget Modal */}
      <TotalLookWidget
        product={selectedProduct}
        isOpen={widgetOpen}
        onClose={() => setWidgetOpen(false)}
        lang={lang}
      />
    </div>
  );
}
