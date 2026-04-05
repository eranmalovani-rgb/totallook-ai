import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import {
  Shirt, Trash2, Sparkles, ShoppingBag, Share2, Copy, LinkIcon, X,
  ChevronRight, ChevronLeft, Eye, Star, Footprints, Watch, Glasses,
  Gem, Crown, ArrowLeft, ArrowRight, Search, DoorClosed, Wand2,
  Check, Plus, ChevronDown, Download, ImageIcon, Camera, RotateCw,
} from "lucide-react";
import FashionSpinner from "@/components/FashionSpinner";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/i18n";

// ─── Category definitions ───
interface CategoryDef {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  match: (type: string) => boolean;
  order: number;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "tops",
    icon: <Shirt className="w-6 h-6" />,
    emoji: "👕",
    match: (t) => /👕|👔|shirt|חולצ|טי.?שירט|סווטשירט|סוודר|קרדיגן|בלייזר|top|blouse|sweater|hoodie|polo/i.test(t),
    order: 1,
  },
  {
    id: "bottoms",
    icon: <span className="text-xl">👖</span>,
    emoji: "👖",
    match: (t) => /👖|pants|מכנס|ג'ינס|שורטס|חצאית|jeans|shorts|skirt|trousers/i.test(t),
    order: 2,
  },
  {
    id: "outerwear",
    icon: <Crown className="w-6 h-6" />,
    emoji: "🧥",
    match: (t) => /🧥|jacket|ז'קט|מעיל|coat|bomber|parka|vest|אפוד/i.test(t),
    order: 3,
  },
  {
    id: "shoes",
    icon: <Footprints className="w-6 h-6" />,
    emoji: "👟",
    match: (t) => /👟|shoe|נעל|סניקרס|sneaker|boot|sandal|loafer|מגף|סנדל/i.test(t),
    order: 4,
  },
  {
    id: "accessories",
    icon: <Watch className="w-6 h-6" />,
    emoji: "⌚",
    match: (t) => /⌚|💍|🕶|📿|watch|שעון|ring|טבעת|glasses|משקפ|necklace|שרשר|bracelet|צמיד|earring|עגיל|belt|חגור|hat|כובע|🧢|scarf|צעיף|tie|עניבה/i.test(t),
    order: 5,
  },
  {
    id: "bags",
    icon: <ShoppingBag className="w-6 h-6" />,
    emoji: "👜",
    match: (t) => /👜|bag|תיק|backpack|clutch|tote/i.test(t),
    order: 6,
  },
];

function getCategoryForItem(itemType: string): CategoryDef | null {
  return CATEGORIES.find((c) => c.match(itemType)) || null;
}

function getScoreColor(score: number | null): string {
  if (!score) return "text-muted-foreground";
  if (score >= 9) return "text-amber-400";
  if (score >= 7) return "text-primary";
  return "text-amber-400";
}

// ─── Types ───
type WardrobeItem = {
  id: number;
  itemType: string;
  name: string;
  color: string | null;
  brand: string | null;
  score: number | null;
  sourceImageUrl: string | null;
  sourceReviewId: number | null;
  verdict: string | null;
  itemImageUrl: string | null;
  createdAt: Date;
};

type GroupedCategory = {
  def: CategoryDef;
  items: WardrobeItem[];
  sourceImages: string[];
};

// ─── Main Component ───
export default function Wardrobe() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: items, isLoading } = trpc.wardrobe.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const utils = trpc.useUtils();
  const { t, dir, lang } = useLanguage();
  const isHe = lang === "he";
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NavArrow = dir === "rtl" ? ChevronLeft : ChevronRight;

  // ─── State ───
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [doorsAnimating, setDoorsAnimating] = useState(false);
  const [doorsFullyOpen, setDoorsFullyOpen] = useState(false);
  const [doorsClosing, setDoorsClosing] = useState(false);
  const [showClosingDoors, setShowClosingDoors] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  // Dress a Look state
  const [dressLookMode, setDressLookMode] = useState(false);
  const [lookItems, setLookItems] = useState<Record<string, WardrobeItem>>({});
  const [pickingCategory, setPickingCategory] = useState<string | null>(null);

  // Visualize Look state
  const [visualizedImageUrl, setVisualizedImageUrl] = useState<string | null>(null);
  const [showVisualization, setShowVisualization] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageRevealed, setImageRevealed] = useState(false);
  const visualizeMutation = trpc.wardrobe.visualizeLook.useMutation({
    onSuccess: (data) => {
      setVisualizedImageUrl(data.imageUrl);
      setShowVisualization(true);
      setImageRotation(0);
      setImageRevealed(false);
      // Trigger reveal animation after a brief delay
      setTimeout(() => setImageRevealed(true), 100);
    },
    onError: () => {
      toast.error(t("wardrobe", "visualizeError"));
    },
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target as Node)) {
        setShowColorDropdown(false);
      }
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ─── Mutations ───
  const deleteItemMutation = trpc.wardrobe.deleteItem.useMutation({
    onSuccess: () => {
      utils.wardrobe.list.invalidate();
      toast.success(t("wardrobe", "deleteSuccess"));
    },
    onError: () => toast.error(t("wardrobe", "deleteError")),
  });

  const clearMutation = trpc.wardrobe.clear.useMutation({
    onSuccess: () => {
      utils.wardrobe.list.invalidate();
      setSelectedCategory(null);
      setWardrobeOpen(false);
      setDressLookMode(false);
      setLookItems({});
      toast.success(t("wardrobe", "clearSuccess"));
    },
    onError: () => toast.error(t("wardrobe", "clearError")),
  });

  // ─── Share ───
  const { data: shareTokenData } = trpc.wardrobeShare.getToken.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const generateLink = trpc.wardrobeShare.generateLink.useMutation({
    onSuccess: () => utils.wardrobeShare.getToken.invalidate(),
  });
  const revokeLink = trpc.wardrobeShare.revokeLink.useMutation({
    onSuccess: () => {
      utils.wardrobeShare.getToken.invalidate();
      toast.success(t("wardrobeShare", "linkRevoked"));
      setShowShareDialog(false);
    },
  });
  const shareToken = shareTokenData?.token;
  const shareUrl = shareToken ? `${window.location.origin}/wardrobe/shared/${shareToken}` : null;
  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success(t("wardrobeShare", "linkCopied"));
    }
  };

  // ─── Grouped data ───
  const grouped = useMemo<GroupedCategory[]>(() => {
    if (!items || items.length === 0) return [];
    const map = new Map<string, GroupedCategory>();

    for (const item of items) {
      const cat = getCategoryForItem(item.itemType);
      const catId = cat?.id || "other";
      if (!map.has(catId)) {
        map.set(catId, {
          def: cat || { id: "other", icon: <Sparkles className="w-6 h-6" />, emoji: "✨", match: () => true, order: 99 },
          items: [],
          sourceImages: [],
        });
      }
      const group = map.get(catId)!;
      group.items.push(item as WardrobeItem);
      if (item.sourceImageUrl && !group.sourceImages.includes(item.sourceImageUrl)) {
        group.sourceImages.push(item.sourceImageUrl);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.def.order - b.def.order);
  }, [items]);

  // ─── Available colors & brands for filters ───
  const availableColors = useMemo(() => {
    if (!items) return [];
    const colors = new Set<string>();
    for (const item of items) {
      if (item.color) colors.add(item.color);
    }
    return Array.from(colors).sort();
  }, [items]);

  const availableBrands = useMemo(() => {
    if (!items) return [];
    const brands = new Set<string>();
    for (const item of items) {
      if (item.brand) brands.add(item.brand);
    }
    return Array.from(brands).sort();
  }, [items]);

  // ─── Filtered items for category detail ───
  const getFilteredItems = useCallback((categoryItems: WardrobeItem[]) => {
    let filtered = categoryItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.color && item.color.toLowerCase().includes(q))
      );
    }
    if (selectedColor) {
      filtered = filtered.filter((item) => item.color === selectedColor);
    }
    if (selectedBrand) {
      filtered = filtered.filter((item) => item.brand === selectedBrand);
    }
    return filtered;
  }, [searchQuery, selectedColor, selectedBrand]);

  const selectedGroup = useMemo(
    () => grouped.find((g) => g.def.id === selectedCategory) || null,
    [grouped, selectedCategory],
  );

  const totalItems = items?.length || 0;

  // ─── Handlers ───
  const handleOpenWardrobe = useCallback(() => {
    setDoorsAnimating(true);
    setTimeout(() => {
      setDoorsFullyOpen(true);
    }, 900);
    setTimeout(() => {
      setWardrobeOpen(true);
      setDoorsAnimating(false);
      setDoorsFullyOpen(false);
    }, 1600);
  }, []);

  const handleCloseWardrobe = useCallback(() => {
    // Reset sub-views first
    setSelectedCategory(null);
    setViewingImage(null);
    setDressLookMode(false);
    setPickingCategory(null);
    // Show the closing doors animation
    setShowClosingDoors(true);
    setDoorsClosing(false);
    setWardrobeOpen(false);
    // Wait a tick for the doors to render open, then trigger close
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDoorsClosing(true);
      });
    });
    // After the close animation finishes, hide the doors
    setTimeout(() => {
      setShowClosingDoors(false);
      setDoorsClosing(false);
    }, 900);
  }, []);

  const handleCategoryClick = useCallback((catId: string) => {
    setSelectedCategory(catId);
    setSearchQuery("");
    setSelectedColor(null);
    setSelectedBrand(null);
  }, []);

  const handleBack = useCallback(() => {
    if (viewingImage) {
      setViewingImage(null);
    } else if (pickingCategory) {
      setPickingCategory(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setSearchQuery("");
      setSelectedColor(null);
      setSelectedBrand(null);
    } else {
      setWardrobeOpen(false);
    }
  }, [viewingImage, selectedCategory, pickingCategory]);

  // ─── Dress a Look handlers ───
  const toggleLookItem = useCallback((catId: string, item: WardrobeItem) => {
    setLookItems((prev) => {
      const next = { ...prev };
      if (next[catId]?.id === item.id) {
        delete next[catId];
      } else {
        next[catId] = item;
      }
      return next;
    });
  }, []);

  const clearLook = useCallback(() => {
    setLookItems({});
    setVisualizedImageUrl(null);
    setShowVisualization(false);
  }, []);

  const shareLook = useCallback(() => {
    const lookEntries = Object.entries(lookItems);
    if (lookEntries.length === 0) return;
    const text = lookEntries.map(([catId, item]) => {
      const catLabel = getCategoryLabel(catId, isHe);
      return `${catLabel}: ${item.name}${item.brand ? ` (${item.brand})` : ""}`;
    }).join("\n");
    const title = isHe ? "הלוק שלי מ-TotalLook.ai" : "My Look from TotalLook.ai";
    navigator.clipboard.writeText(`${title}\n\n${text}`);
    toast.success(t("wardrobe", "lookCopied"));
  }, [lookItems, isHe, t]);

  const handleVisualizeLook = useCallback(() => {
    const itemIds = Object.values(lookItems).map(item => item.id);
    if (itemIds.length === 0) return;
    setVisualizedImageUrl(null);
    setShowVisualization(true);
    setImageRotation(0);
    setImageRevealed(false);
    visualizeMutation.mutate({ itemIds, lang });
  }, [lookItems, lang, visualizeMutation]);

  const handleDownloadVisualization = useCallback(async () => {
    if (!visualizedImageUrl) return;
    try {
      const response = await fetch(visualizedImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-look-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(visualizedImageUrl, "_blank");
    }
  }, [visualizedImageUrl]);

  const lookItemCount = Object.keys(lookItems).length;

  // ─── Auth states ───
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center" dir={dir}>
        <ShoppingBag className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t("wardrobe", "title")}</h1>
        <p className="text-muted-foreground">{t("wardrobe", "loginRequired")}</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>
          {t("nav", "login")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-8">

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <FashionSpinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && totalItems === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="w-20 h-20 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("wardrobe", "empty")}</h2>
            <p className="text-muted-foreground max-w-md">{t("wardrobe", "emptyDesc")}</p>
            <Button className="mt-6" onClick={() => (window.location.href = "/upload")}>
              {t("wardrobe", "goToUpload")}
            </Button>
          </div>
        )}

        {/* ═══ WARDROBE CLOSED — Luxurious Gold 3D Doors ═══ */}
        {!isLoading && totalItems > 0 && !wardrobeOpen && !showClosingDoors && (
          <div className="flex flex-col items-center justify-center py-8 animate-fade-in-up">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 font-display text-center wardrobe-neon-text">
              {t("wardrobe", "title")}
            </h1>
            <p className="text-muted-foreground mb-10 text-center">
              {totalItems} {t("wardrobe", "items")} {isHe ? "ממתינים לך" : "waiting for you"}
            </p>

            {/* 3D Wardrobe with gold frame */}
            <button
              onClick={!doorsAnimating ? handleOpenWardrobe : undefined}
              className={`group relative w-72 h-[26rem] sm:w-80 sm:h-[30rem] focus:outline-none ${doorsAnimating ? 'cursor-default' : 'cursor-pointer'}`}
              aria-label={isHe ? "פתח ארון" : "Open wardrobe"}
              disabled={doorsAnimating}
            >
              {/* Gold ornate crown at top */}
              <div className="wardrobe-crown absolute -top-5 left-1/2 -translate-x-1/2 w-40 h-5 z-10" />

              {/* Luxurious gold frame */}
              <div className="absolute inset-0 rounded-2xl wardrobe-gold-frame bg-gradient-to-b from-[oklch(0.12_0.008_75)] via-[oklch(0.10_0.005_75)] to-[oklch(0.08_0.004_75)]">
                {/* Diamond dots along top edge */}
                <div className="absolute -top-[2px] left-0 right-0 flex justify-around px-8">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="wardrobe-diamond" style={{ animationDelay: `${i * 0.3}s` }} />
                  ))}
                </div>
                {/* Diamond dots along bottom edge */}
                <div className="absolute -bottom-[2px] left-0 right-0 flex justify-around px-8">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="wardrobe-diamond" style={{ animationDelay: `${i * 0.3 + 0.15}s` }} />
                  ))}
                </div>
                {/* Diamond dots along left edge */}
                <div className="absolute top-0 bottom-0 -left-[2px] flex flex-col justify-around py-8">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="wardrobe-diamond" style={{ animationDelay: `${i * 0.4}s` }} />
                  ))}
                </div>
                {/* Diamond dots along right edge */}
                <div className="absolute top-0 bottom-0 -right-[2px] flex flex-col justify-around py-8">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="wardrobe-diamond" style={{ animationDelay: `${i * 0.4 + 0.2}s` }} />
                  ))}
                </div>
              </div>

              {/* Floating sparkle particles */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="wardrobe-sparkle-particle"
                  style={{
                    left: `${15 + i * 14}%`,
                    bottom: '10%',
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${2.5 + i * 0.3}s`,
                  }}
                />
              ))}

              {/* Interior (visible when doors open) */}
              <div className={`absolute inset-[6px] rounded-xl overflow-hidden ${doorsFullyOpen ? 'wardrobe-interior' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.01_75)] via-[oklch(0.08_0.005_75)] to-[oklch(0.12_0.01_75)]">
                  {/* Glass shelves */}
                  {[20, 40, 60, 80].map((pos, i) => (
                    <div
                      key={i}
                      className="wardrobe-glass-shelf wardrobe-glass-shelf-glow absolute inset-x-3 h-[2px]"
                      style={{ top: `${pos}%`, animationDelay: `${i * 0.5}s` }}
                    />
                  ))}
                  {/* Category emojis on shelves */}
                  {grouped.slice(0, 5).map((g, i) => (
                    <div
                      key={g.def.id}
                      className="wardrobe-shelf-item absolute flex flex-col items-center justify-center"
                      style={{
                        top: `${6 + i * 20}%`,
                        left: i % 2 === 0 ? '20%' : '55%',
                        animationDelay: `${0.4 + i * 0.1}s`,
                      }}
                    >
                      <span className="text-2xl sm:text-3xl drop-shadow-[0_0_8px_oklch(0.75_0.14_75_/_0.4)]">{g.def.emoji}</span>
                    </div>
                  ))}
                  {/* Warm ambient glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.75_0.14_75_/_0.08)_0%,_transparent_70%)]" />
                </div>
              </div>

              {/* 3D Door scene */}
              <div className="wardrobe-scene absolute inset-[6px] rounded-xl overflow-visible">
                {/* Left door */}
                <div className={`wardrobe-door wardrobe-door-left absolute top-0 left-0 w-1/2 h-full rounded-l-xl ${doorsAnimating ? 'door-open' : ''}`}>
                  <div className="absolute inset-0 rounded-l-xl bg-gradient-to-br from-[oklch(0.16_0.01_75)] via-[oklch(0.14_0.008_75)] to-[oklch(0.12_0.006_75)] border border-primary/30 group-hover:border-primary/50 transition-colors duration-300 shadow-lg">
                    {/* Ornate panel lines */}
                    <div className="absolute inset-3 rounded-lg border border-primary/15 group-hover:border-primary/25 transition-colors" />
                    <div className="absolute inset-6 rounded-md border border-primary/8" />
                    {/* Gold handle */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-3 w-2.5 h-12 rounded-full bg-gradient-to-b from-primary/60 via-primary/80 to-primary/60 group-hover:from-primary/80 group-hover:via-primary group-hover:to-primary/80 wardrobe-handle transition-colors shadow-[0_0_8px_oklch(0.75_0.14_75_/_0.3)]" />
                    <div className="absolute top-6 left-4 animate-wardrobe-sparkle">
                      <Sparkles className="w-4 h-4 text-primary/40 group-hover:text-primary/70 transition-colors" />
                    </div>
                    <div className="absolute bottom-12 left-6 animate-wardrobe-sparkle" style={{ animationDelay: '2s' }}>
                      <Sparkles className="w-3 h-3 text-primary/20 group-hover:text-primary/50 transition-colors" />
                    </div>
                  </div>
                </div>
                {/* Right door */}
                <div className={`wardrobe-door wardrobe-door-right absolute top-0 right-0 w-1/2 h-full rounded-r-xl ${doorsAnimating ? 'door-open' : ''}`}>
                  <div className="absolute inset-0 rounded-r-xl bg-gradient-to-bl from-[oklch(0.16_0.01_75)] via-[oklch(0.14_0.008_75)] to-[oklch(0.12_0.006_75)] border border-primary/30 group-hover:border-primary/50 transition-colors duration-300 shadow-lg">
                    <div className="absolute inset-3 rounded-lg border border-primary/15 group-hover:border-primary/25 transition-colors" />
                    <div className="absolute inset-6 rounded-md border border-primary/8" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-3 w-2.5 h-12 rounded-full bg-gradient-to-b from-primary/60 via-primary/80 to-primary/60 group-hover:from-primary/80 group-hover:via-primary group-hover:to-primary/80 wardrobe-handle transition-colors shadow-[0_0_8px_oklch(0.75_0.14_75_/_0.3)]" />
                    <div className="absolute bottom-8 right-4 animate-wardrobe-sparkle" style={{ animationDelay: '1.5s' }}>
                      <Sparkles className="w-4 h-4 text-primary/40 group-hover:text-primary/70 transition-colors" />
                    </div>
                    <div className="absolute top-10 right-6 animate-wardrobe-sparkle" style={{ animationDelay: '0.8s' }}>
                      <Sparkles className="w-3 h-3 text-primary/20 group-hover:text-primary/50 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="absolute -bottom-16 inset-x-0 text-center">
                <span className={`text-primary font-medium text-sm transition-all duration-300 wardrobe-neon-text ${doorsAnimating ? 'opacity-0' : 'group-hover:text-primary/90'}`}>
                  {isHe ? "לחץ לפתיחה ✨" : "Tap to open ✨"}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* ═══ CLOSING ANIMATION — Luxurious Gold Doors closing back ═══ */}
        {showClosingDoors && (
          <div className="flex flex-col items-center justify-center py-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 font-display text-center wardrobe-neon-text">
              {t("wardrobe", "title")}
            </h1>
            <p className="text-muted-foreground mb-10 text-center">
              {totalItems} {t("wardrobe", "items")} {isHe ? "ממתינים לך" : "waiting for you"}
            </p>
            <div className="relative w-72 h-[26rem] sm:w-80 sm:h-[30rem]">
              {/* Gold crown */}
              <div className="wardrobe-crown absolute -top-5 left-1/2 -translate-x-1/2 w-40 h-5 z-10" />
              {/* Gold frame */}
              <div className="absolute inset-0 rounded-2xl wardrobe-gold-frame bg-gradient-to-b from-[oklch(0.12_0.008_75)] via-[oklch(0.10_0.005_75)] to-[oklch(0.08_0.004_75)]" />
              {/* Interior visible */}
              <div className="absolute inset-[6px] rounded-xl overflow-hidden wardrobe-interior">
                <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.01_75)] via-[oklch(0.08_0.005_75)] to-[oklch(0.12_0.01_75)]">
                  {[20, 40, 60, 80].map((pos, i) => (
                    <div key={i} className="wardrobe-glass-shelf absolute inset-x-3 h-[2px]" style={{ top: `${pos}%` }} />
                  ))}
                </div>
              </div>
              {/* 3D Door scene — start open, animate to closed */}
              <div className="wardrobe-scene absolute inset-[6px] rounded-xl overflow-visible">
                <div className={`wardrobe-door wardrobe-door-left absolute top-0 left-0 w-1/2 h-full rounded-l-xl ${doorsClosing ? 'door-close' : 'door-open'}`}>
                  <div className="absolute inset-0 rounded-l-xl bg-gradient-to-br from-[oklch(0.16_0.01_75)] via-[oklch(0.14_0.008_75)] to-[oklch(0.12_0.006_75)] border border-primary/30 shadow-lg">
                    <div className="absolute inset-3 rounded-lg border border-primary/15" />
                    <div className="absolute inset-6 rounded-md border border-primary/8" />
                    <div className="absolute top-1/2 -translate-y-1/2 right-3 w-2.5 h-12 rounded-full bg-gradient-to-b from-primary/60 via-primary/80 to-primary/60 shadow-[0_0_8px_oklch(0.75_0.14_75_/_0.3)]" />
                  </div>
                </div>
                <div className={`wardrobe-door wardrobe-door-right absolute top-0 right-0 w-1/2 h-full rounded-r-xl ${doorsClosing ? 'door-close' : 'door-open'}`}>
                  <div className="absolute inset-0 rounded-r-xl bg-gradient-to-bl from-[oklch(0.16_0.01_75)] via-[oklch(0.14_0.008_75)] to-[oklch(0.12_0.006_75)] border border-primary/30 shadow-lg">
                    <div className="absolute inset-3 rounded-lg border border-primary/15" />
                    <div className="absolute inset-6 rounded-md border border-primary/8" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-3 w-2.5 h-12 rounded-full bg-gradient-to-b from-primary/60 via-primary/80 to-primary/60 shadow-[0_0_8px_oklch(0.75_0.14_75_/_0.3)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ WARDROBE OPEN — Categories View ═══ */}
        {!isLoading && totalItems > 0 && wardrobeOpen && !selectedCategory && !dressLookMode && (
          <div className="animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display flex items-center gap-3 wardrobe-neon-text">
                  <ShoppingBag className="w-7 h-7 text-primary" />
                  {t("wardrobe", "title")}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {totalItems} {t("wardrobe", "items")} — {grouped.length} {isHe ? "קטגוריות" : "categories"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Share */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!shareToken) generateLink.mutate();
                    setShowShareDialog(true);
                  }}
                  className="border-primary/30 hover:bg-primary/10 text-primary"
                >
                  <Share2 className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                  <span className="hidden sm:inline">{t("wardrobeShare", "shareButton")}</span>
                </Button>
                {/* Close Wardrobe */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseWardrobe}
                  className="border-primary/30 hover:bg-primary/10 text-primary"
                >
                  <DoorClosed className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                  <span className="hidden sm:inline">{t("wardrobe", "closeWardrobe")}</span>
                </Button>
                {/* Clear */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                      <span className="hidden sm:inline">{t("wardrobe", "clearAll")}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir={dir}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("wardrobe", "clearAllTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("wardrobe", "clearAllDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={dir === "rtl" ? "flex-row-reverse gap-2" : "gap-2"}>
                      <AlertDialogAction
                        onClick={() => clearMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("wardrobe", "clearAllConfirm")}
                      </AlertDialogAction>
                      <AlertDialogCancel>{t("common", "cancel")}</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* ═══ DRESS A LOOK — Front & Center CTA ═══ */}
            <button
              onClick={() => setDressLookMode(true)}
              className="wardrobe-dress-look-cta group w-full mb-8 relative overflow-hidden rounded-2xl p-5 sm:p-6 text-start transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 group-hover:border-primary/70 transition-colors duration-300" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 group-hover:from-primary/20 group-hover:via-primary/10 group-hover:to-primary/20 transition-all duration-300" />
              
              <div className="relative flex items-center gap-4">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_oklch(0.75_0.14_75_/_0.2)]">
                  <Wand2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary drop-shadow-[0_0_8px_oklch(0.75_0.14_75_/_0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                    {t("wardrobe", "dressLook")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("wardrobe", "dressLookDesc")}
                  </p>
                </div>
                <div className={`flex-shrink-0 text-primary/40 group-hover:text-primary transition-colors duration-300 ${dir === "rtl" ? "rotate-180" : ""}`}>
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>

              <div className="absolute top-2 right-4 text-primary/20 group-hover:text-primary/40 transition-colors">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="absolute bottom-2 left-4 text-primary/15 group-hover:text-primary/30 transition-colors">
                <Sparkles className="w-3 h-3" />
              </div>
            </button>

            {/* ═══ CLOSET SHELVES — Real wardrobe layout ═══ */}
            <div className="wardrobe-shelves-container relative">
              {/* Left side panel */}
              <div className="wardrobe-side-panel wardrobe-side-panel-left" />
              {/* Right side panel */}
              <div className="wardrobe-side-panel wardrobe-side-panel-right" />

              <div className="space-y-0">
                {grouped.map((group, idx) => {
                  const catLabel = getCategoryLabel(group.def.id, isHe);
                  return (
                    <button
                      key={group.def.id}
                      onClick={() => handleCategoryClick(group.def.id)}
                      className="wardrobe-shelf group w-full text-start relative"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      {/* Shelf content */}
                      <div className="wardrobe-shelf-content flex items-center gap-4 px-5 sm:px-8 py-4 sm:py-5">
                        {/* Category emoji + items preview */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_oklch(0.75_0.14_75_/_0.3)]">
                            {group.def.emoji}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base wardrobe-shelf-label">{catLabel}</h3>
                            <p className="text-xs text-muted-foreground/70">
                              {group.items.length} {isHe ? "פריטים" : "items"}
                            </p>
                          </div>
                        </div>

                        {/* Item thumbnails on the shelf */}
                        {group.sourceImages.length > 0 && (
                          <div className="flex gap-2 items-center">
                            {group.sourceImages.slice(0, 4).map((url, i) => (
                              <div
                                key={i}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-primary/20 flex-shrink-0 shadow-[0_2px_8px_oklch(0_0_0_/_0.3)] group-hover:border-primary/40 transition-all duration-300 group-hover:shadow-[0_2px_12px_oklch(0.75_0.14_75_/_0.15)]"
                                style={{ transform: `translateY(${i % 2 === 0 ? '-2px' : '2px'})` }}
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ))}
                            {group.sourceImages.length > 4 && (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-center text-xs text-primary/60 flex-shrink-0">
                                +{group.sourceImages.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Arrow */}
                        <div className={`flex-shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors ${dir === "rtl" ? "rotate-180" : ""}`}>
                          <NavArrow className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Physical shelf bottom edge */}
                      <div className="wardrobe-shelf-edge" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CATEGORY DETAIL — Items List with Search/Filter ═══ */}
        {!isLoading && wardrobeOpen && selectedCategory && selectedGroup && !viewingImage && !dressLookMode && (
          <div className="animate-fade-in-up">
            {/* Back + header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <BackArrow className="w-4 h-4" />
                <span className="text-sm">{isHe ? "חזרה לקטגוריות" : "Back to categories"}</span>
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseWardrobe}
                className="border-primary/30 hover:bg-primary/10 text-primary"
              >
                <DoorClosed className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                <span className="hidden sm:inline">{t("wardrobe", "closeWardrobe")}</span>
              </Button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{selectedGroup.def.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold font-display">
                  {getCategoryLabel(selectedGroup.def.id, isHe)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedGroup.items.length} {isHe ? "פריטים" : "items"}
                </p>
              </div>
            </div>

            {/* Search & Filter bar */}
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "right-3" : "left-3"} w-4 h-4 text-muted-foreground`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("wardrobe", "searchPlaceholder")}
                  className={`w-full h-9 rounded-lg border border-border/50 bg-card/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 ${dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "left-3" : "right-3"} text-muted-foreground hover:text-foreground`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Color filter */}
              {availableColors.length > 0 && (
                <div className="relative" ref={colorDropdownRef}>
                  <button
                    onClick={() => { setShowColorDropdown(!showColorDropdown); setShowBrandDropdown(false); }}
                    className={`h-9 px-3 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${selectedColor ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/50 bg-card/50 text-muted-foreground hover:border-primary/30'}`}
                  >
                    {selectedColor ? (
                      <>
                        <span className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: selectedColor.toLowerCase() }} />
                        {selectedColor}
                      </>
                    ) : (
                      <>
                        {t("wardrobe", "filterByColor")}
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                  {showColorDropdown && (
                    <div className={`absolute top-full mt-1 ${dir === "rtl" ? "right-0" : "left-0"} z-50 bg-card border border-border/50 rounded-lg shadow-xl py-1 min-w-[140px] max-h-48 overflow-y-auto`}>
                      <button
                        onClick={() => { setSelectedColor(null); setShowColorDropdown(false); }}
                        className="w-full px-3 py-1.5 text-sm text-start hover:bg-primary/10 transition-colors"
                      >
                        {t("wardrobe", "allColors")}
                      </button>
                      {availableColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => { setSelectedColor(color); setShowColorDropdown(false); }}
                          className="w-full px-3 py-1.5 text-sm text-start hover:bg-primary/10 transition-colors flex items-center gap-2"
                        >
                          <span className="w-3 h-3 rounded-full border border-border/50 flex-shrink-0" style={{ backgroundColor: color.toLowerCase() }} />
                          {color}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Brand filter */}
              {availableBrands.length > 0 && (
                <div className="relative" ref={brandDropdownRef}>
                  <button
                    onClick={() => { setShowBrandDropdown(!showBrandDropdown); setShowColorDropdown(false); }}
                    className={`h-9 px-3 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${selectedBrand ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/50 bg-card/50 text-muted-foreground hover:border-primary/30'}`}
                  >
                    {selectedBrand || t("wardrobe", "filterByBrand")}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {showBrandDropdown && (
                    <div className={`absolute top-full mt-1 ${dir === "rtl" ? "right-0" : "left-0"} z-50 bg-card border border-border/50 rounded-lg shadow-xl py-1 min-w-[140px] max-h-48 overflow-y-auto`}>
                      <button
                        onClick={() => { setSelectedBrand(null); setShowBrandDropdown(false); }}
                        className="w-full px-3 py-1.5 text-sm text-start hover:bg-primary/10 transition-colors"
                      >
                        {t("wardrobe", "allBrands")}
                      </button>
                      {availableBrands.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => { setSelectedBrand(brand); setShowBrandDropdown(false); }}
                          className="w-full px-3 py-1.5 text-sm text-start hover:bg-primary/10 transition-colors"
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items list */}
            {(() => {
              const filteredItems = getFilteredItems(selectedGroup.items);
              if (filteredItems.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>{t("wardrobe", "noResults")}</p>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="wardrobe-item-card group flex items-center gap-4 p-3 sm:p-4 rounded-xl"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {item.sourceImageUrl ? (
                        <button
                          onClick={() => setViewingImage(item.sourceImageUrl)}
                          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border/30 hover:border-primary/50 transition-colors"
                        >
                          <img src={item.sourceImageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-70 transition-opacity" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">{selectedGroup.def.emoji}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {item.brand && <span className="text-primary/80">{item.brand}</span>}
                          {item.color && (
                            <span className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full border border-border/50 inline-block" style={{ backgroundColor: item.color.toLowerCase() }} />
                              {item.color}
                            </span>
                          )}
                          {item.verdict && <span className="hidden sm:inline">{item.verdict}</span>}
                        </div>
                      </div>
                      {item.score && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className={`w-3.5 h-3.5 ${getScoreColor(item.score)}`} />
                          <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}/10</span>
                        </div>
                      )}
                      <button
                        onClick={() => deleteItemMutation.mutate({ itemId: item.id })}
                        className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title={t("common", "delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══ DRESS A LOOK MODE ═══ */}
        {!isLoading && wardrobeOpen && dressLookMode && !pickingCategory && (
          <div className="animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <button
                  onClick={() => { setDressLookMode(false); setLookItems({}); }}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <BackArrow className="w-4 h-4" />
                  <span className="text-sm">{isHe ? "חזרה לארון" : "Back to wardrobe"}</span>
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold font-display flex items-center gap-3">
                  <Wand2 className="w-7 h-7 text-primary" />
                  {t("wardrobe", "dressLook")}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {t("wardrobe", "dressLookDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {lookItemCount > 0 && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleVisualizeLook}
                      disabled={visualizeMutation.isPending}
                      className="gap-1.5 bg-gradient-to-r from-primary to-yellow-600 hover:from-primary/90 hover:to-yellow-500 text-black font-semibold shadow-[0_0_12px_oklch(0.75_0.14_75_/_0.3)] animate-pulse-subtle"
                    >
                      <Sparkles className="w-4 h-4" />
                      {t("wardrobe", "visualizeLook")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareLook} className="border-primary/30 hover:bg-primary/10 text-primary">
                      <Share2 className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                      <span className="hidden sm:inline">{t("wardrobe", "shareLook")}</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearLook} className="text-muted-foreground">
                      <X className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                      <span className="hidden sm:inline">{t("wardrobe", "clearLook")}</span>
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseWardrobe}
                  className="border-primary/30 hover:bg-primary/10 text-primary"
                >
                  <DoorClosed className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                </Button>
              </div>
            </div>

            {/* Your Look summary */}
            {lookItemCount > 0 && (
              <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/5">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t("wardrobe", "yourLook")} ({lookItemCount})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(lookItems).map(([catId, item]) => (
                    <div key={catId} className="flex items-center gap-2 bg-card/80 rounded-lg px-3 py-2 border border-border/30">
                      {item.sourceImageUrl ? (
                        <img src={item.sourceImageUrl} alt="" className="w-10 h-10 rounded-md object-cover" />
                      ) : (
                        <span className="text-lg">{grouped.find(g => g.def.id === catId)?.def.emoji}</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{getCategoryLabel(catId, isHe)}</p>
                        <p className="text-sm font-medium truncate max-w-[120px]">{item.name}</p>
                      </div>
                      <button
                        onClick={() => toggleLookItem(catId, item)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ VISUALIZATION RESULT ═══ */}
            {showVisualization && (
              <div className="mb-6 rounded-2xl border border-primary/30 bg-card overflow-hidden animate-fade-in-up">
                {/* Loading state */}
                {visualizeMutation.isPending && !visualizedImageUrl && (
                  <div className="flex flex-col items-center justify-center py-16 gap-6">
                    <div className="relative">
                      <FashionSpinner size="lg" />
                    </div>
                    <div className="text-center space-y-2 px-4">
                      <p className="text-sm font-medium">{t("wardrobe", "visualizing")}</p>
                      <p className="text-xs text-muted-foreground">{t("wardrobe", "visualizingDesc")}</p>
                    </div>
                  </div>
                )}

                {/* Generated image with reveal animation and rotation */}
                {visualizedImageUrl && (
                  <div className="relative group overflow-hidden">
                    <div
                      className={`transition-all duration-700 ease-out ${
                        imageRevealed
                          ? "opacity-100 scale-100 blur-0"
                          : "opacity-0 scale-90 blur-md"
                      }`}
                    >
                      <img
                        src={visualizedImageUrl}
                        alt="Look Visualization"
                        className="w-full object-contain max-h-[500px] transition-transform duration-500 ease-in-out"
                        style={{ transform: `rotate(${imageRotation}deg)` }}
                      />
                    </div>
                    {/* Sparkle overlay during reveal */}
                    {imageRevealed && (
                      <div className="absolute inset-0 pointer-events-none visualization-sparkle-overlay" />
                    )}
                    {/* Controls overlay */}
                    <div className={`absolute top-3 ${dir === "rtl" ? "left-3" : "right-3"} flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button
                        onClick={() => setImageRotation(prev => prev + 90)}
                        className="p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                        title={isHe ? "סובב תמונה" : "Rotate image"}
                      >
                        <RotateCw className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={handleDownloadVisualization}
                        className="p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                        title={t("wardrobe", "downloadLook")}
                      >
                        <Download className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => setShowVisualization(false)}
                        className="p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    {/* Persistent rotate button (always visible, bottom corner) */}
                    <button
                      onClick={() => setImageRotation(prev => prev + 90)}
                      className={`absolute bottom-3 ${dir === "rtl" ? "right-3" : "left-3"} p-3 rounded-full bg-primary/80 hover:bg-primary text-black shadow-lg transition-all hover:scale-110`}
                      title={isHe ? "סובב תמונה" : "Rotate image"}
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Error state */}
                {visualizeMutation.isError && !visualizedImageUrl && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <p className="text-sm text-destructive">{t("wardrobe", "visualizeError")}</p>
                    <p className="text-xs text-muted-foreground">
                      {visualizeMutation.error?.message}
                    </p>
                    <Button onClick={handleVisualizeLook} variant="outline" size="sm" className="gap-2">
                      <Wand2 className="w-4 h-4" />
                      {t("wardrobe", "visualizeRetry")}
                    </Button>
                  </div>
                )}

                {/* Items summary + actions */}
                {visualizedImageUrl && (
                  <div className="p-4 border-t border-border/20">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">{t("wardrobe", "lookItemsLabel")}</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.entries(lookItems).map(([catId, item]) => (
                        <span key={catId} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {getCategoryLabel(catId, isHe)}: {item.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={handleVisualizeLook}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={visualizeMutation.isPending}
                      >
                        <Wand2 className="w-4 h-4" />
                        {t("wardrobe", "visualizeNew")}
                      </Button>
                      <Button
                        onClick={handleDownloadVisualization}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        {t("wardrobe", "downloadLook")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Category slots */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {grouped.map((group, idx) => {
                const catLabel = getCategoryLabel(group.def.id, isHe);
                const selectedItem = lookItems[group.def.id];
                return (
                  <button
                    key={group.def.id}
                    onClick={() => setPickingCategory(group.def.id)}
                    className={`group relative overflow-hidden rounded-xl border transition-all duration-300 text-start p-5 sm:p-6 ${
                      selectedItem
                        ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/5'
                        : 'border-border/40 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'
                    }`}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {group.def.emoji}
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base mb-1">{catLabel}</h3>
                    {selectedItem ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Check className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs text-primary truncate">{selectedItem.name}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" />
                        {t("wardrobe", "selectItem")}
                      </p>
                    )}
                    <div className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "left-3" : "right-3"} text-muted-foreground/30 group-hover:text-primary/60 transition-colors`}>
                      <NavArrow className="w-5 h-5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ DRESS A LOOK — Pick item from category ═══ */}
        {!isLoading && wardrobeOpen && dressLookMode && pickingCategory && (() => {
          const pickGroup = grouped.find(g => g.def.id === pickingCategory);
          if (!pickGroup) return null;
          return (
            <div className="animate-fade-in-up">
              <button
                onClick={() => setPickingCategory(null)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <BackArrow className="w-4 h-4" />
                <span className="text-sm">{isHe ? "חזרה לבחירת קטגוריה" : "Back to categories"}</span>
              </button>

              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{pickGroup.def.emoji}</span>
                <div>
                  <h2 className="text-2xl font-bold font-display">
                    {getCategoryLabel(pickGroup.def.id, isHe)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isHe ? "בחר פריט ללוק" : "Pick an item for your look"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {pickGroup.items.map((item, idx) => {
                  const isSelected = lookItems[pickingCategory]?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        toggleLookItem(pickingCategory, item);
                        setPickingCategory(null);
                      }}
                      className={`w-full group flex items-center gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-200 text-start ${
                        isSelected
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border/30 bg-card/50 hover:border-primary/30 hover:bg-card'
                      }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {item.sourceImageUrl ? (
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border/30">
                          <img src={item.sourceImageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">{pickGroup.def.emoji}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {item.brand && <span className="text-primary/80">{item.brand}</span>}
                          {item.color && (
                            <span className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full border border-border/50 inline-block" style={{ backgroundColor: item.color.toLowerCase() }} />
                              {item.color}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.score && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className={`w-3.5 h-3.5 ${getScoreColor(item.score)}`} />
                          <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}/10</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ═══ IMAGE VIEWER — Full source image ═══ */}
        {viewingImage && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
            <div className="relative max-w-2xl w-full max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setViewingImage(null)}
                className="absolute -top-10 right-0 sm:top-2 sm:right-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={viewingImage}
                alt=""
                className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
              />
            </div>
          </div>
        )}

        {/* ═══ Share Dialog ═══ */}
        {showShareDialog && (
          <div className="fixed inset-0 z-[100] bg-black/60" onClick={() => setShowShareDialog(false)}>
            <div
              className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-card border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:w-[90vw] shadow-2xl"
              dir={dir}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 pb-8 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base sm:text-lg font-bold">{t("wardrobeShare", "shareTitle")}</h3>
                  <button onClick={() => setShowShareDialog(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t("wardrobeShare", "shareDesc")}</p>
                {shareUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-3 overflow-hidden">
                      <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm truncate flex-1" dir="ltr">{shareUrl}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={copyShareLink} className="flex-1">
                        <Copy className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                        {t("wardrobeShare", "copyLink")}
                      </Button>
                      <Button variant="outline" onClick={() => revokeLink.mutate()} className="text-destructive border-destructive/30">
                        {t("wardrobeShare", "revokeLink")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => generateLink.mutate()} disabled={generateLink.isPending} className="w-full">
                    <Share2 className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                    {t("wardrobeShare", "generateLink")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───
function getCategoryLabel(id: string, isHe: boolean): string {
  const labels: Record<string, { he: string; en: string }> = {
    tops: { he: "חולצות ועליוניות", en: "Tops & Shirts" },
    bottoms: { he: "מכנסיים ותחתוניות", en: "Pants & Bottoms" },
    outerwear: { he: "ז'קטים ומעילים", en: "Jackets & Coats" },
    shoes: { he: "נעליים", en: "Shoes" },
    accessories: { he: "אקססוריז ותכשיטים", en: "Accessories & Jewelry" },
    bags: { he: "תיקים", en: "Bags" },
    other: { he: "אחר", en: "Other" },
  };
  return isHe ? (labels[id]?.he || "אחר") : (labels[id]?.en || "Other");
}
