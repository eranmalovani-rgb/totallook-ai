import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Shirt, Trash2, ShoppingBag, X,
  ChevronRight, ChevronLeft, Footprints, Watch,
  Crown, ArrowLeft, ArrowRight, Search,
  DoorClosed, Sparkles, Mail, Gem, Wand2,
  Check, Plus, Share2, Star, Eye,
  RotateCw, Download,
} from "lucide-react";
import FashionSpinner from "@/components/FashionSpinner";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/i18n";
import { useFingerprint } from "@/hooks/useFingerprint";

// ─── Category definitions (same as Wardrobe.tsx) ───
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

function getCategoryLabel(catId: string, isHe: boolean): string {
  const labels: Record<string, { he: string; en: string }> = {
    tops: { he: "חולצות", en: "Tops" },
    bottoms: { he: "מכנסיים", en: "Bottoms" },
    outerwear: { he: "הלבשה עליונה", en: "Outerwear" },
    shoes: { he: "נעליים", en: "Shoes" },
    accessories: { he: "אקססוריז", en: "Accessories" },
    bags: { he: "תיקים", en: "Bags" },
    other: { he: "אחר", en: "Other" },
  };
  return labels[catId]?.[isHe ? "he" : "en"] || catId;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
}

type WardrobeItem = {
  id: number;
  itemType: string;
  name: string | null;
  color: string | null;
  brand: string | null;
  score: number | null;
  sourceImageUrl: string | null;
  itemImageUrl: string | null;
  createdAt: Date;
};

type GroupedCategory = {
  def: CategoryDef;
  items: WardrobeItem[];
};

export default function GuestWardrobe() {
  const fingerprint = useFingerprint();
  const { t, dir, lang } = useLanguage();
  const isHe = lang === "he";
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NavArrow = dir === "rtl" ? ChevronLeft : ChevronRight;

  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [doorsAnimating, setDoorsAnimating] = useState(false);
  const [doorsFullyOpen, setDoorsFullyOpen] = useState(false);
  const [showClosingDoors, setShowClosingDoors] = useState(false);
  const [doorsClosing, setDoorsClosing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dress a Look state
  const [dressLookMode, setDressLookMode] = useState(false);
  const [lookItems, setLookItems] = useState<Record<string, WardrobeItem>>({});
  const [pickingCategory, setPickingCategory] = useState<string | null>(null);

  // Visualize Look state
  const [visualizedImageUrl, setVisualizedImageUrl] = useState<string | null>(null);
  const [showVisualization, setShowVisualization] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageRevealed, setImageRevealed] = useState(false);

  const { data: items, isLoading } = trpc.guest.getWardrobe.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  const utils = trpc.useUtils();
  const deleteItemMutation = trpc.guest.deleteWardrobeItem.useMutation({
    onSuccess: () => {
      utils.guest.getWardrobe.invalidate();
      toast.success(isHe ? "הפריט הוסר" : "Item removed");
    },
    onError: () => toast.error(isHe ? "שגיאה בהסרת הפריט" : "Error removing item"),
  });

  const visualizeMutation = trpc.guest.visualizeLook.useMutation({
    onSuccess: (data) => {
      setVisualizedImageUrl(data.imageUrl);
      setShowVisualization(true);
      setImageRotation(0);
      setImageRevealed(false);
      setTimeout(() => setImageRevealed(true), 100);
    },
    onError: () => {
      toast.error(t("wardrobe", "visualizeError"));
    },
  });

  const grouped = useMemo<GroupedCategory[]>(() => {
    if (!items || items.length === 0) return [];
    const map = new Map<string, GroupedCategory>();
    for (const item of items) {
      const cat = getCategoryForItem(item.itemType || "");
      const catId = cat?.id || "other";
      if (!map.has(catId)) {
        map.set(catId, {
          def: cat || { id: "other", icon: <Sparkles className="w-6 h-6" />, emoji: "✨", match: () => true, order: 99 },
          items: [],
        });
      }
      map.get(catId)!.items.push(item as WardrobeItem);
    }
    return Array.from(map.values()).sort((a, b) => a.def.order - b.def.order);
  }, [items]);

  const selectedGroup = useMemo(
    () => grouped.find((g) => g.def.id === selectedCategory) || null,
    [grouped, selectedCategory],
  );

  const filteredItems = useMemo(() => {
    if (!selectedGroup) return [];
    if (!searchQuery.trim()) return selectedGroup.items;
    const q = searchQuery.toLowerCase();
    return selectedGroup.items.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.color && item.color.toLowerCase().includes(q))
    );
  }, [selectedGroup, searchQuery]);

  const totalItems = items?.length || 0;

  const handleOpenWardrobe = useCallback(() => {
    setDoorsAnimating(true);
    setTimeout(() => setDoorsFullyOpen(true), 900);
    setTimeout(() => {
      setWardrobeOpen(true);
      setDoorsAnimating(false);
      setDoorsFullyOpen(false);
    }, 1600);
  }, []);

  const handleCloseWardrobe = useCallback(() => {
    setSelectedCategory(null);
    setViewingImage(null);
    setDressLookMode(false);
    setLookItems({});
    setPickingCategory(null);
    setShowVisualization(false);
    setVisualizedImageUrl(null);
    setShowClosingDoors(true);
    setDoorsClosing(false);
    setWardrobeOpen(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDoorsClosing(true));
    });
    setTimeout(() => {
      setShowClosingDoors(false);
      setDoorsClosing(false);
    }, 900);
  }, []);

  const handleBack = useCallback(() => {
    if (viewingImage) {
      setViewingImage(null);
    } else if (pickingCategory) {
      setPickingCategory(null);
    } else if (dressLookMode) {
      setDressLookMode(false);
      setLookItems({});
      setShowVisualization(false);
      setVisualizedImageUrl(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setSearchQuery("");
    } else {
      setWardrobeOpen(false);
    }
  }, [viewingImage, selectedCategory, pickingCategory, dressLookMode]);

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
      return `${catLabel}: ${item.name || item.itemType}${item.brand ? ` (${item.brand})` : ""}`;
    }).join("\n");
    const title = isHe ? "הלוק שלי מ-TotalLook.ai" : "My Look from TotalLook.ai";
    navigator.clipboard.writeText(`${title}\n\n${text}`);
    toast.success(t("wardrobe", "lookCopied"));
  }, [lookItems, isHe, t]);

  const handleVisualizeLook = useCallback(() => {
    const itemIds = Object.values(lookItems).map(item => item.id);
    if (itemIds.length === 0 || !fingerprint) return;
    setVisualizedImageUrl(null);
    setShowVisualization(true);
    setImageRotation(0);
    setImageRevealed(false);
    visualizeMutation.mutate({ fingerprint, itemIds, lang });
  }, [lookItems, lang, fingerprint, visualizeMutation]);

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

  if (!fingerprint) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />
      <div className="pt-20 pb-8 container max-w-2xl mx-auto">

        {/* ─── Empty state ─── */}
        {!isLoading && totalItems === 0 && !wardrobeOpen && (
          <div className="text-center space-y-6 py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {isHe ? "הארון שלך ריק" : "Your Closet is Empty"}
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {isHe
                  ? "עשה ניתוח אופנתי ופריטים יתווספו אוטומטית לארון הווירטואלי שלך"
                  : "Run a fashion analysis and items will automatically be added to your virtual closet"}
              </p>
            </div>
            <Button size="lg" className="gap-2" asChild>
              <a href="/try">
                <Sparkles className="w-5 h-5" />
                {isHe ? "התחל ניתוח" : "Start Analysis"}
              </a>
            </Button>

            {/* Email CTA */}
            <div className="mt-8 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-sm text-muted-foreground mb-2">
                {isHe
                  ? "הירשם כדי לשמור את הארון שלך לצמיתות"
                  : "Sign up to save your closet permanently"}
              </p>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={getLoginUrl()}>
                  <Mail className="w-4 h-4" />
                  {isHe ? "הירשם" : "Sign Up"}
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* ─── Loading ─── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <FashionSpinner size="lg" />
          </div>
        )}

        {/* ─── Wardrobe Doors (closed state) ─── */}
        {!isLoading && totalItems > 0 && !wardrobeOpen && !doorsAnimating && !doorsFullyOpen && !showClosingDoors && (
          <div className="text-center space-y-6 py-8">
            <h1 className="text-2xl font-bold">
              {isHe ? "הארון הווירטואלי שלך" : "Your Virtual Closet"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isHe ? `${totalItems} פריטים` : `${totalItems} items`}
            </p>

            {/* Wardrobe doors visual */}
            <button
              onClick={handleOpenWardrobe}
              className="relative mx-auto w-64 h-80 cursor-pointer group"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-900/40 to-amber-950/60 border-2 border-amber-700/30 overflow-hidden">
                {/* Left door */}
                <div className="absolute top-0 left-0 w-1/2 h-full border-r border-amber-700/20 bg-gradient-to-r from-amber-900/20 to-amber-800/30 transition-transform duration-300 group-hover:-translate-x-2">
                  <div className="absolute top-1/2 right-2 w-2 h-8 rounded-full bg-amber-600/60 -translate-y-1/2" />
                </div>
                {/* Right door */}
                <div className="absolute top-0 right-0 w-1/2 h-full border-l border-amber-700/20 bg-gradient-to-l from-amber-900/20 to-amber-800/30 transition-transform duration-300 group-hover:translate-x-2">
                  <div className="absolute top-1/2 left-2 w-2 h-8 rounded-full bg-amber-600/60 -translate-y-1/2" />
                </div>
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <DoorClosed className="w-12 h-12 text-amber-500/60 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </button>

            <p className="text-xs text-muted-foreground/60">
              {isHe ? "לחץ לפתיחה" : "Click to open"}
            </p>
          </div>
        )}

        {/* ─── Door opening animation ─── */}
        {(doorsAnimating || doorsFullyOpen) && (
          <div className="text-center py-8">
            <div className="relative mx-auto w-64 h-80 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-900/40 to-amber-950/60 border-2 border-amber-700/30 overflow-hidden">
                <div className={`absolute top-0 left-0 w-1/2 h-full border-r border-amber-700/20 bg-gradient-to-r from-amber-900/20 to-amber-800/30 transition-transform duration-[900ms] ease-in-out ${doorsAnimating ? "-translate-x-full" : ""}`}>
                  <div className="absolute top-1/2 right-2 w-2 h-8 rounded-full bg-amber-600/60 -translate-y-1/2" />
                </div>
                <div className={`absolute top-0 right-0 w-1/2 h-full border-l border-amber-700/20 bg-gradient-to-l from-amber-900/20 to-amber-800/30 transition-transform duration-[900ms] ease-in-out ${doorsAnimating ? "translate-x-full" : ""}`}>
                  <div className="absolute top-1/2 left-2 w-2 h-8 rounded-full bg-amber-600/60 -translate-y-1/2" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Closing doors animation ─── */}
        {showClosingDoors && (
          <div className="text-center py-8">
            <div className="relative mx-auto w-64 h-80 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-900/40 to-amber-950/60 border-2 border-amber-700/30 overflow-hidden">
                <div className={`absolute top-0 left-0 w-1/2 h-full border-r border-amber-700/20 bg-gradient-to-r from-amber-900/20 to-amber-800/30 transition-transform duration-[900ms] ease-in-out ${doorsClosing ? "translate-x-0" : "-translate-x-full"}`}>
                  <div className="absolute top-1/2 right-2 w-2 h-8 rounded-full bg-amber-600/60 -translate-y-1/2" />
                </div>
                <div className={`absolute top-0 right-0 w-1/2 h-full border-l border-amber-700/20 bg-gradient-to-l from-amber-900/20 to-amber-800/30 transition-transform duration-[900ms] ease-in-out ${doorsClosing ? "translate-x-0" : "translate-x-full"}`}>
                  <div className="absolute top-1/2 left-2 w-2 h-8 rounded-full bg-amber-600/60 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ WARDROBE OPEN: CATEGORIES (normal mode) ═══ */}
        {wardrobeOpen && !selectedCategory && !dressLookMode && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {isHe ? "הארון שלך" : "Your Closet"}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDressLookMode(true)}
                  className="gap-1.5 border-primary/30 hover:bg-primary/10 text-primary"
                >
                  <Wand2 className="w-4 h-4" />
                  {t("wardrobe", "dressLook")}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCloseWardrobe} className="gap-1">
                  <DoorClosed className="w-4 h-4" />
                  {isHe ? "סגור" : "Close"}
                </Button>
              </div>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-2 gap-3">
              {grouped.map((group) => (
                <button
                  key={group.def.id}
                  onClick={() => {
                    setSelectedCategory(group.def.id);
                    setSearchQuery("");
                  }}
                  className="p-4 rounded-xl bg-card/50 border border-white/5 hover:border-primary/30 transition-all text-center space-y-2 group"
                >
                  <span className="text-3xl">{group.def.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{getCategoryLabel(group.def.id, isHe)}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.items.length} {isHe ? "פריטים" : "items"}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Sign up CTA */}
            <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {isHe
                  ? "הירשם כדי לשמור את הארון לצמיתות ולשתף לוקים"
                  : "Sign up to save your closet permanently and share looks"}
              </p>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={getLoginUrl()}>
                  <Mail className="w-4 h-4" />
                  {isHe ? "הירשם" : "Sign Up"}
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* ═══ CATEGORY DETAIL (normal browse mode) ═══ */}
        {wardrobeOpen && selectedCategory && selectedGroup && !dressLookMode && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <BackArrow className="w-5 h-5" />
              </Button>
              <span className="text-2xl">{selectedGroup.def.emoji}</span>
              <h2 className="text-xl font-bold flex-1">
                {getCategoryLabel(selectedGroup.def.id, isHe)}
              </h2>
              <span className="text-sm text-muted-foreground">
                {selectedGroup.items.length} {isHe ? "פריטים" : "items"}
              </span>
            </div>

            {/* Search */}
            {selectedGroup.items.length > 3 && (
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ [dir === "rtl" ? "right" : "left"]: "12px" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isHe ? "חפש פריט..." : "Search items..."}
                  className="w-full px-10 py-2.5 rounded-xl bg-card/50 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                />
              </div>
            )}

            {/* Items list */}
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-white/5 hover:border-white/10 transition-all"
                >
                  {/* Item image or emoji */}
                  {item.itemImageUrl || item.sourceImageUrl ? (
                    <button
                      onClick={() => setViewingImage(item.itemImageUrl || item.sourceImageUrl)}
                      className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-border/30 hover:border-primary/50 transition-colors"
                    >
                      <img
                        src={item.itemImageUrl || item.sourceImageUrl || ""}
                        alt={item.name || ""}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-70 transition-opacity" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{selectedGroup.def.emoji}</span>
                    </div>
                  )}

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name || item.itemType}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-muted-foreground">
                      {item.brand && <span className="text-primary/80">{item.brand}</span>}
                      {item.color && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full border border-border/50 inline-block" style={{ backgroundColor: item.color.toLowerCase() }} />
                          {item.color}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  {item.score && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className={`w-3.5 h-3.5 ${getScoreColor(item.score)}`} />
                      <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}/10</span>
                    </div>
                  )}

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 text-muted-foreground/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (fingerprint) {
                        deleteItemMutation.mutate({ fingerprint, itemId: item.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery
                    ? (isHe ? "לא נמצאו פריטים" : "No items found")
                    : (isHe ? "אין פריטים בקטגוריה זו" : "No items in this category")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ DRESS A LOOK MODE — Category Selection ═══ */}
        {wardrobeOpen && dressLookMode && !pickingCategory && (
          <div className="animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <button
                  onClick={() => { setDressLookMode(false); setLookItems({}); setShowVisualization(false); setVisualizedImageUrl(null); }}
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
                        <p className="text-sm font-medium truncate max-w-[120px]">{item.name || item.itemType}</p>
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
              <div className="mb-6 rounded-2xl border border-primary/30 bg-card overflow-hidden animate-in fade-in duration-300">
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

                {/* Generated image with reveal animation */}
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
                    {/* Persistent rotate button */}
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
                          {getCategoryLabel(catId, isHe)}: {item.name || item.itemType}
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
                        <span className="text-xs text-primary truncate">{selectedItem.name || selectedItem.itemType}</span>
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
        {wardrobeOpen && dressLookMode && pickingCategory && (() => {
          const pickGroup = grouped.find(g => g.def.id === pickingCategory);
          if (!pickGroup) return null;
          return (
            <div className="animate-in fade-in duration-300">
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
                          <img src={item.sourceImageUrl} alt={item.name || ""} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">{pickGroup.def.emoji}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate">{item.name || item.itemType}</h3>
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

        {/* ─── Image Viewer ─── */}
        {viewingImage && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" onClick={() => setViewingImage(null)}>
              <X className="w-6 h-6" />
            </button>
            <img
              src={viewingImage}
              alt=""
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
