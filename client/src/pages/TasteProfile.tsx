import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/i18n";
import FashionSpinner from "@/components/FashionSpinner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Palette,
  Crown,
  Target,
  AlertTriangle,
  ShoppingBag,
  BarChart3,
  Shirt,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Star,
  Heart,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useMemo } from "react";

// ---- Color mapping for common fashion colors ----
const COLOR_HEX_MAP: Record<string, string> = {
  // Hebrew
  "שחור": "#1a1a1a", "לבן": "#f5f5f5", "אפור": "#888888", "כחול": "#3b82f6",
  "כחול כהה": "#1e3a5f", "כחול בהיר": "#60a5fa", "נייבי": "#1e3a5f",
  "אדום": "#ef4444", "ירוק": "#22c55e", "ירוק זית": "#6b7c3f",
  "צהוב": "#eab308", "כתום": "#f97316", "ורוד": "#ec4899",
  "סגול": "#a855f7", "חום": "#92400e", "בז'": "#d4b896", "בז׳": "#d4b896",
  "קרם": "#f5f0e1", "חאקי": "#8b7d5b", "בורדו": "#800020",
  "טורקיז": "#06b6d4", "זהב": "#d4a017", "כסף": "#c0c0c0",
  // English
  "black": "#1a1a1a", "white": "#f5f5f5", "gray": "#888888", "grey": "#888888",
  "blue": "#3b82f6", "navy": "#1e3a5f", "dark blue": "#1e3a5f",
  "light blue": "#60a5fa", "red": "#ef4444", "green": "#22c55e",
  "olive": "#6b7c3f", "yellow": "#eab308", "orange": "#f97316",
  "pink": "#ec4899", "purple": "#a855f7", "brown": "#92400e",
  "beige": "#d4b896", "cream": "#f5f0e1", "khaki": "#8b7d5b",
  "burgundy": "#800020", "maroon": "#800020", "turquoise": "#06b6d4",
  "gold": "#d4a017", "silver": "#c0c0c0", "tan": "#d2b48c",
  "coral": "#ff7f7f", "teal": "#0d9488", "ivory": "#fffff0",
};

const STYLE_LABELS: Record<string, { he: string; en: string; emoji: string }> = {
  minimalist: { he: "מינימליסטי", en: "Minimalist", emoji: "◻️" },
  classic: { he: "קלאסי", en: "Classic", emoji: "👔" },
  streetwear: { he: "סטריטוור", en: "Streetwear", emoji: "🧢" },
  "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual", emoji: "✨" },
  bohemian: { he: "בוהו", en: "Bohemian", emoji: "🌿" },
  sporty: { he: "ספורטיבי", en: "Sporty", emoji: "⚡" },
  "avant-garde": { he: "אוונגרד", en: "Avant-Garde", emoji: "🎭" },
  preppy: { he: "פרפי", en: "Preppy", emoji: "🎓" },
};

const CHART_COLORS = [
  "#d4a017", "#3b82f6", "#ec4899", "#22c55e", "#a855f7",
  "#f97316", "#06b6d4", "#ef4444",
];

export default function TasteProfile() {
  useAuth({ redirectOnUnauthenticated: true });
  const { data, isLoading } = trpc.tasteProfile.get.useQuery();
  const { t, dir, lang } = useLanguage();
  const isHe = lang === "he";

  const tr = {
    title: isHe ? "פרופיל הטעם שלי" : "My Taste Profile",
    subtitle: isHe ? "הפרופיל מתעשר עם כל ניתוח, קליק ושמירה" : "Your profile evolves with every analysis, click and save",
    noData: isHe ? "עדיין אין מספיק נתונים" : "Not enough data yet",
    noDataDesc: isHe ? "העלה לפחות ניתוח אחד כדי להתחיל לבנות את פרופיל הטעם שלך" : "Upload at least one analysis to start building your taste profile",
    uploadFirst: isHe ? "העלה ניתוח ראשון" : "Upload First Analysis",
    overallScore: isHe ? "ציון טעם כללי" : "Overall Taste Score",
    analyses: isHe ? "ניתוחים" : "Analyses",
    styleMap: isHe ? "מפת הסגנון שלי" : "My Style Map",
    colorPalette: isHe ? "פלטת הצבעים שלי" : "My Color Palette",
    brandAffinity: isHe ? "מותגים מועדפים" : "Favorite Brands",
    scoreEvolution: isHe ? "התפתחות הציון" : "Score Evolution",
    categoryBreakdown: isHe ? "ציונים לפי קטגוריה" : "Category Breakdown",
    strengths: isHe ? "החוזקות שלי" : "My Strengths",
    improvements: isHe ? "תחומים לשיפור" : "Areas to Improve",
    wardrobeInsight: isHe ? "תובנות מהארון" : "Wardrobe Insights",
    items: isHe ? "פריטים" : "Items",
    avgScore: isHe ? "ממוצע" : "Avg",
    trend: isHe ? "מגמה" : "Trend",
    improving: isHe ? "משתפר" : "Improving",
    declining: isHe ? "יורד" : "Declining",
    stable: isHe ? "יציב" : "Stable",
    times: isHe ? "פעמים" : "times",
    topBrands: isHe ? "מותגים מובילים" : "Top Brands",
    topColors: isHe ? "צבעים מובילים" : "Top Colors",
    categories: isHe ? "קטגוריות" : "Categories",
  };

  // Prepare chart data
  const styleMapData = useMemo(() => {
    if (!data?.styleMap) return [];
    return Object.entries(data.styleMap)
      .sort((a, b) => b[1] - a[1])
      .map(([style, pct]) => ({
        name: STYLE_LABELS[style]?.[lang] || style,
        value: pct,
        emoji: STYLE_LABELS[style]?.emoji || "🔹",
      }));
  }, [data?.styleMap, lang]);

  const categoryData = useMemo(() => {
    if (!data?.categoryScores) return [];
    return Object.entries(data.categoryScores)
      .sort((a, b) => b[1].avg - a[1].avg)
      .map(([cat, info]) => ({
        name: cat,
        avg: info.avg,
        count: info.count,
        trend: info.trend,
      }));
  }, [data?.categoryScores]);

  const scoreChartData = useMemo(() => {
    if (!data?.scoreHistory) return [];
    return data.scoreHistory.map((s, i) => ({
      label: `#${i + 1}`,
      score: s.score,
      date: s.date,
    }));
  }, [data?.scoreHistory]);

  const radialData = useMemo(() => {
    if (!data?.overallTasteScore) return [];
    return [{ name: "score", value: data.overallTasteScore, fill: "#d4a017" }];
  }, [data?.overallTasteScore]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <FashionSpinner />
        </div>
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="container pt-24 pb-16 flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{tr.noData}</h1>
          <p className="text-muted-foreground max-w-md">{tr.noDataDesc}</p>
          <Link href="/upload">
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              {tr.uploadFirst}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === "declining") return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const trendLabel = (trend: string) => {
    if (trend === "improving") return tr.improving;
    if (trend === "declining") return tr.declining;
    return tr.stable;
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />
      <div className="container pt-24 pb-16 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            {isHe ? "מתעדכן בזמן אמת" : "Updates in real-time"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-display">{tr.title}</h1>
          <p className="text-muted-foreground">{tr.subtitle}</p>
        </div>

        {/* Score Hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Radial Score */}
          <div className="md:col-span-1 flex flex-col items-center justify-center p-6 rounded-xl bg-card border border-white/5">
            <div className="w-40 h-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius="70%" outerRadius="100%"
                  barSize={12}
                  data={radialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={6}
                    background={{ fill: "rgba(255,255,255,0.05)" }}
                    max={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-primary">{data.overallTasteScore}</span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{tr.overallScore}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {data.analysisCount} {tr.analyses}
            </p>
          </div>

          {/* Score Evolution Chart */}
          <div className="md:col-span-2 p-6 rounded-xl bg-card border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{tr.scoreEvolution}</h2>
            </div>
            {scoreChartData.length > 1 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreChartData}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4a017" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#d4a017" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 10]} stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      labelStyle={{ color: "#888" }}
                      itemStyle={{ color: "#d4a017" }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#d4a017" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: "#d4a017", r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                {isHe ? "צריך לפחות 2 ניתוחים כדי לראות גרף" : "Need at least 2 analyses to show chart"}
              </div>
            )}
          </div>
        </div>

        {/* Style Map + Color Palette */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Style Map */}
          <div className="p-6 rounded-xl bg-card border border-white/5">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{tr.styleMap}</h2>
            </div>
            {styleMapData.length > 0 ? (
              <div className="space-y-3">
                {styleMapData.map((style, i) => (
                  <div key={style.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm flex items-center gap-2">
                        <span>{style.emoji}</span>
                        <span>{style.name}</span>
                      </span>
                      <span className="text-sm text-primary font-medium">{style.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${style.value}%`,
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                {isHe ? "עדיין לא זוהו סגנונות ברורים" : "No clear styles detected yet"}
              </p>
            )}
          </div>

          {/* Color Palette */}
          <div className="p-6 rounded-xl bg-card border border-white/5">
            <div className="flex items-center gap-2 mb-5">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{tr.colorPalette}</h2>
            </div>
            {data.colorPalette.length > 0 ? (
              <div className="space-y-3">
                {data.colorPalette.slice(0, 8).map((c) => {
                  const hex = COLOR_HEX_MAP[c.color] || "#888";
                  return (
                    <div key={c.color} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg border border-white/10 shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm capitalize truncate">{c.color}</span>
                          <span className="text-xs text-muted-foreground">{c.percentage}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${c.percentage}%`, backgroundColor: hex }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                {isHe ? "עדיין לא זוהו צבעים" : "No colors detected yet"}
              </p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 rounded-xl bg-card border border-white/5 mb-10">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{tr.categoryBreakdown}</h2>
          </div>
          {categoryData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                    <TrendIcon trend={cat.trend} />
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                      {cat.avg}
                    </span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(cat.avg / 10) * 100}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{cat.count} {tr.analyses}</span>
                    <span className={cat.trend === "improving" ? "text-green-400" : cat.trend === "declining" ? "text-red-400" : ""}>
                      {trendLabel(cat.trend)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">
              {isHe ? "עדיין אין נתוני קטגוריות" : "No category data yet"}
            </p>
          )}
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Strengths */}
          <div className="p-6 rounded-xl bg-card border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold">{tr.strengths}</h2>
            </div>
            {data.strengths.length > 0 ? (
              <div className="space-y-3">
                {data.strengths.map((s, i) => (
                  <div key={s} className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <span className="text-green-400 text-sm font-bold">#{i + 1}</span>
                    </div>
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">
                {isHe ? "עדיין לא זוהו חוזקות" : "No strengths identified yet"}
              </p>
            )}
          </div>

          {/* Improvements */}
          <div className="p-6 rounded-xl bg-card border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">{tr.improvements}</h2>
            </div>
            {data.improvements.length > 0 ? (
              <div className="space-y-3">
                {data.improvements.map((s, i) => (
                  <div key={s} className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <span className="text-amber-400 text-sm font-bold">#{i + 1}</span>
                    </div>
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">
                {isHe ? "הכל נראה מצוין!" : "Everything looks great!"}
              </p>
            )}
          </div>
        </div>

        {/* Brand Affinities */}
        {data.brandAffinities.length > 0 && (
          <div className="p-6 rounded-xl bg-card border border-white/5 mb-10">
            <div className="flex items-center gap-2 mb-5">
              <Crown className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{tr.brandAffinity}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {data.brandAffinities.map((b, i) => (
                <div key={b.brand} className="p-4 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                  <div className="text-lg font-bold mb-1" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                    {b.brand}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.count} {tr.times} · {tr.avgScore} {b.avgScore}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wardrobe Insights */}
        {data.wardrobeStats.totalItems > 0 && (
          <div className="p-6 rounded-xl bg-card border border-white/5 mb-10">
            <div className="flex items-center gap-2 mb-5">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{tr.wardrobeInsight}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Items */}
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-primary mb-1">{data.wardrobeStats.totalItems}</div>
                <div className="text-sm text-muted-foreground">{tr.items}</div>
              </div>

              {/* Top Wardrobe Brands */}
              {data.wardrobeStats.topBrands.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">{tr.topBrands}</h3>
                  <div className="space-y-2">
                    {data.wardrobeStats.topBrands.slice(0, 5).map((b) => (
                      <div key={b.brand} className="flex items-center justify-between text-sm">
                        <span>{b.brand}</span>
                        <span className="text-muted-foreground">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Wardrobe Colors */}
              {data.wardrobeStats.topColors.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">{tr.topColors}</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.wardrobeStats.topColors.slice(0, 8).map((c) => {
                      const hex = COLOR_HEX_MAP[c.color] || "#888";
                      return (
                        <div key={c.color} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 text-xs">
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: hex }} />
                          <span className="capitalize">{c.color}</span>
                          <span className="text-muted-foreground">({c.count})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Wardrobe Categories */}
            {Object.keys(data.wardrobeStats.categories).length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{tr.categories}</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.wardrobeStats.categories)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <span key={cat} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {cat} ({count})
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Brand Matching Section */}
        <BrandMatchingSection lang={lang} isHe={isHe} />

        {/* CTA */}
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm mb-4">
            {isHe ? "ככל שתנתח יותר — הפרופיל שלך יהיה מדויק יותר" : "The more you analyze — the more accurate your profile becomes"}
          </p>
          <Link href="/upload">
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              {isHe ? "ניתוח חדש" : "New Analysis"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}


// ---- Brand Matching Section ----

function BrandMatchingSection({ lang, isHe }: { lang: "he" | "en"; isHe: boolean }) {
  const { data, isLoading } = trpc.tasteProfile.brandMatching.useQuery();

  const reasonLabels: Record<string, { he: string; en: string }> = {
    minimalist: { he: "מינימליסטי", en: "Minimalist" },
    classic: { he: "קלאסי", en: "Classic" },
    streetwear: { he: "סטריטוור", en: "Streetwear" },
    "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual" },
    bohemian: { he: "בוהמי", en: "Bohemian" },
    sporty: { he: "ספורטיבי", en: "Sporty" },
    "avant-garde": { he: "אוונגרד", en: "Avant-Garde" },
    preppy: { he: "פרפי", en: "Preppy" },
    colors: { he: "צבעים תואמים", en: "Matching colors" },
    detected: { he: "זוהה בארון", en: "In your wardrobe" },
    budget: { he: "תקציב מתאים", en: "Budget match" },
  };

  const getMatchGradient = (pct: number) => {
    if (pct >= 70) return "from-emerald-500/20 to-emerald-500/5";
    if (pct >= 50) return "from-amber-500/20 to-amber-500/5";
    if (pct >= 30) return "from-orange-500/20 to-orange-500/5";
    return "from-red-500/20 to-red-500/5";
  };

  const getMatchTextColor = (pct: number) => {
    if (pct >= 70) return "text-emerald-400";
    if (pct >= 50) return "text-amber-400";
    if (pct >= 30) return "text-orange-400";
    return "text-red-400";
  };

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <FashionSpinner />
      </div>
    );
  }

  if (!data?.hasData || data.matches.length === 0) return null;

  const topMatches = data.matches.slice(0, 8);

  return (
    <div className="mt-10 mb-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
          <Heart className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {isHe ? "המותגים שהכי מתאימים לך" : "Your Best Brand Matches"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isHe
              ? "מבוסס על הסגנון, הצבעים, והתקציב שלך"
              : "Based on your style, colors, and budget"}
          </p>
        </div>
      </div>

      {/* Brand Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {topMatches.map((m, i) => (
          <div
            key={m.brand}
            className={`relative rounded-xl border border-white/5 bg-gradient-to-b ${getMatchGradient(m.matchPct)} p-4 transition-all hover:scale-[1.02] hover:border-white/10`}
          >
            {i === 0 && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {isHe ? "ההתאמה הטובה ביותר" : "BEST MATCH"}
              </div>
            )}
            <div className="text-center">
              <div className={`text-2xl font-black ${getMatchTextColor(m.matchPct)} mb-1`}>
                {m.matchPct}%
              </div>
              <div className="font-semibold text-sm mb-2">{m.brand}</div>
              <div className="flex flex-wrap gap-1 justify-center mb-2">
                {m.reasons.slice(0, 2).map((r) => (
                  <span
                    key={r}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground"
                  >
                    {reasonLabels[r]?.[lang] || r}
                  </span>
                ))}
              </div>
              {m.url && (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
                >
                  {isHe ? "לאתר" : "Visit"} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show more hint */}
      {data.matches.length > 8 && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          {isHe
            ? `+ עוד ${data.matches.length - 8} מותגים — צפה בכולם בניהול`
            : `+ ${data.matches.length - 8} more brands — view all in Admin`}
        </p>
      )}
    </div>
  );
}
