import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import Navbar from "@/components/Navbar";
import { Loader2, Shirt, ShoppingBag, Footprints, Watch, Gem, Package } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  shirt: <Shirt className="w-5 h-5" />,
  pants: <Shirt className="w-5 h-5" />,
  shoes: <Footprints className="w-5 h-5" />,
  bag: <ShoppingBag className="w-5 h-5" />,
  accessory: <Watch className="w-5 h-5" />,
  jewelry: <Gem className="w-5 h-5" />,
  jacket: <Shirt className="w-5 h-5" />,
  default: <Package className="w-5 h-5" />,
};

function getCategoryIcon(type: string) {
  const lower = type.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return CATEGORY_ICONS.default;
}

export default function SharedWardrobe({ token }: { token: string }) {
  const { lang } = useLanguage();
  const t = (key: keyof typeof translations.wardrobeShare) => translations.wardrobeShare[key][lang];
  const isRtl = lang === "he";

  const { data, isLoading, error } = trpc.wardrobeShare.view.useQuery({ token });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={isRtl ? "rtl" : "ltr"}>
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={isRtl ? "rtl" : "ltr"}>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Package className="w-16 h-16 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">{t("notFound")}</p>
        </div>
      </div>
    );
  }

  // Group items by category
  const grouped = new Map<string, typeof data.items>();
  for (const item of data.items) {
    const category = item.itemType || "other";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(item);
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isRtl ? "rtl" : "ltr"}>
      <Navbar />
      <div className="pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-primary bg-clip-text text-transparent">
              {t("sharedWardrobe")} {data.userName}
            </h1>
            {data.stylePreference && (
              <p className="text-muted-foreground mt-2">
                {data.stylePreference}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {data.items.length} {t("items")}
            </p>
          </div>

          {/* Empty state */}
          {data.items.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">{t("emptyWardrobe")}</p>
            </div>
          ) : (
            /* Items grouped by category */
            <div className="space-y-8">
              {Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-white/5">
                      {getCategoryIcon(category)}
                    </div>
                    <h2 className="text-lg font-semibold capitalize">{category}</h2>
                    <span className="text-sm text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors"
                      >
                        {item.itemImageUrl ? (
                          <img
                            src={item.itemImageUrl}
                            alt={typeof item.name === 'string' ? item.name : ''}
                            className="w-full h-32 object-cover rounded-lg mb-3"
                          />
                        ) : (
                          <div className="w-full h-32 bg-white/5 rounded-lg mb-3 flex items-center justify-center">
                            {getCategoryIcon(item.itemType)}
                          </div>
                        )}
                        <h3 className="text-sm font-medium truncate" dir="auto">
                          {typeof item.name === 'string' ? item.name : ''}
                        </h3>
                        {item.brand && (
                          <p className="text-xs text-muted-foreground mt-1">{item.brand}</p>
                        )}
                        {item.color && (
                          <p className="text-xs text-muted-foreground">{item.color}</p>
                        )}
                        {item.score && (
                          <div className="mt-2 flex items-center gap-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              item.score >= 8 ? "bg-amber-500/20 text-amber-400" :
                              item.score >= 6 ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>
                              {item.score}/10
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
