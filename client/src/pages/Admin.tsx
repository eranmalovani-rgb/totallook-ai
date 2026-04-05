import { trpc } from "@/lib/trpc";
import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import { useState } from "react";
import { Link } from "wouter";
import {
  Users,
  Image,
  BarChart3,
  Heart,
  TrendingUp,
  Sparkles,
  Eye,
  Trash2,
  Shield,
  ShieldAlert,
  FlaskConical,
  ChevronDown,
  ImageOff,
  X,
  ExternalLink,
  Star,
  Shirt,
  Lightbulb,
  RotateCcw,
  Store,
  Phone,
  Pencil,
  Check,
  MessageCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FashionSpinner from "@/components/FashionSpinner";
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
import { toast } from "sonner";
import type { FashionAnalysis } from "../../../shared/fashionTypes";

type Tab = "overview" | "funnel" | "uploads" | "users" | "guests";

interface AdminReview {
  id: number;
  userId: number;
  imageUrl: string;
  status: string;
  overallScore: number | null;
  occasion: string | null;
  analysisJson: unknown;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
}

/** Button that resets admin's onboarding and redirects to the onboarding flow */
function AdminOnboardingTestButton({ lang }: { lang: "he" | "en" }) {
  const resetOnboarding = trpc.admin.resetOnboarding.useMutation({
    onSuccess: () => {
      window.location.href = "/onboarding";
    },
    onError: () => {
      toast.error(lang === "he" ? "שגיאה באיפוס אונבורדינג" : "Error resetting onboarding");
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => resetOnboarding.mutate()}
      disabled={resetOnboarding.isPending}
      className="gap-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
    >
      <RotateCcw className="w-4 h-4" />
      {resetOnboarding.isPending
        ? (lang === "he" ? "מאפס..." : "Resetting...")
        : (lang === "he" ? "בדוק אונבורדינג" : "Test Onboarding")}
    </Button>
  );
}

/** Button that generates a short-lived admin token and opens /try with it */
function AdminGuestTestButton({ lang }: { lang: "he" | "en" }) {
  const generateToken = trpc.admin.generateGuestTestToken.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/try?admin_token=${data.token}`;
      window.open(url, "_blank");
    },
    onError: () => {
      toast.error(lang === "he" ? "שגיאה ביצירת טוקן" : "Error generating token");
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => generateToken.mutate()}
      disabled={generateToken.isPending}
      className="gap-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
    >
      <FlaskConical className="w-4 h-4" />
      {generateToken.isPending
        ? (lang === "he" ? "יוצר לינק..." : "Generating...")
        : (lang === "he" ? "נסה כאורח" : "Test as Guest")}
    </Button>
  );
}

export default function AdminPage() {
  const { lang, dir } = useLanguage();
  const t = (key: keyof typeof translations.admin) => translations.admin[key][lang];
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="flex items-center justify-center pt-40">
          <FashionSpinner />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dir}>
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4">
          <ShieldAlert className="w-16 h-16 text-red-400" />
          <h1 className="text-2xl font-bold">{t("accessDenied")}</h1>
          <p className="text-muted-foreground">{t("accessDeniedMsg")}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("overview"), icon: <BarChart3 className="w-4 h-4" /> },
    { key: "funnel", label: lang === "he" ? "פאנל" : "Funnel", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "uploads", label: t("allUploads"), icon: <Image className="w-4 h-4" /> },
    { key: "users", label: t("allUsers"), icon: <Users className="w-4 h-4" /> },
    { key: "guests", label: lang === "he" ? "אורחים ודמו" : "Guests & Demo", icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />
      <div className="container max-w-6xl mx-auto pt-24 pb-12 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">
                {lang === "he" ? "ניהול כל התוכן והמשתמשים" : "Manage all content and users"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/brand-demo">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <Store className="w-4 h-4" />
                {lang === "he" ? "דמו Widget מותג" : "Brand Widget Demo"}
              </Button>
            </Link>
            <a href="/?preview=1">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Eye className="w-4 h-4" />
                {lang === "he" ? "צפה בדף נחיתה" : "View Landing Page"}
              </Button>
            </a>
            <AdminGuestTestButton lang={lang} />
            <AdminOnboardingTestButton lang={lang} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-8 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <OverviewTab lang={lang} t={t} />}
        {activeTab === "funnel" && <FunnelTab lang={lang} />}
        {activeTab === "uploads" && <UploadsTab lang={lang} t={t} dir={dir} />}
        {activeTab === "users" && <UsersTab lang={lang} t={t} dir={dir} />}
        {activeTab === "guests" && <GuestsTab lang={lang} dir={dir} />}
      </div>
    </div>
  );
}

// ---- Overview Tab ----

function OverviewTab({ lang, t }: { lang: "he" | "en"; t: (k: keyof typeof translations.admin) => string }) {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <FashionSpinner />
      </div>
    );
  }

  const statCards = [
    { label: t("totalUsers"), value: stats?.totalUsers ?? 0, icon: <Users className="w-5 h-5" />, color: "from-primary/20 to-amber-500/20 border-primary/20", iconColor: "text-primary" },
    { label: t("totalReviews"), value: stats?.totalReviews ?? 0, icon: <Image className="w-5 h-5" />, color: "from-rose-500/20 to-pink-500/20 border-rose-500/20", iconColor: "text-rose-400" },
    { label: t("completedReviews"), value: stats?.completedReviews ?? 0, icon: <Sparkles className="w-5 h-5" />, color: "from-amber-500/20 to-primary/20 border-amber-500/20", iconColor: "text-amber-400" },
    { label: t("totalFeedPosts"), value: stats?.totalFeedPosts ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: "from-orange-500/20 to-amber-500/20 border-orange-500/20", iconColor: "text-orange-400" },
    { label: t("totalLikes"), value: stats?.totalLikes ?? 0, icon: <Heart className="w-5 h-5" />, color: "from-pink-500/20 to-rose-500/20 border-pink-500/20", iconColor: "text-pink-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statCards.map((card, i) => (
        <div
          key={i}
          className={`p-5 rounded-2xl bg-gradient-to-br ${card.color} border backdrop-blur-sm`}
        >
          <div className={`${card.iconColor} mb-3`}>{card.icon}</div>
          <div className="text-3xl font-bold mb-1">{card.value}</div>
          <div className="text-sm text-muted-foreground">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---- Funnel Tab ----

function FunnelTab({ lang }: { lang: "he" | "en" }) {
  const { data: stats, isLoading: statsLoading } = trpc.tracking.getFunnelStats.useQuery();
  const { data: daily, isLoading: dailyLoading } = trpc.tracking.getDailyFunnel.useQuery({ days: 14 });

  const isHe = lang === "he";

  if (statsLoading || dailyLoading) {
    return (
      <div className="flex justify-center py-12">
        <FashionSpinner />
      </div>
    );
  }

  // Calculate conversion rates
  const uniqueVisitors = stats?.uniqueLandingVisitors ?? 0;
  const registered = stats?.registeredUsers ?? 0;
  const guests = stats?.guestSessions ?? 0;
  const usersWithAnalysis = stats?.usersWithAnalysis ?? 0;
  const totalAnalyses = stats?.totalAnalyses ?? 0;
  const totalActions = registered + guests;
  const conversionRate = uniqueVisitors > 0 ? Math.round((totalActions / uniqueVisitors) * 100) : 0;
  const analysisRate = registered > 0 ? Math.round((usersWithAnalysis / registered) * 100) : 0;

  // Funnel stages
  const funnelStages = [
    {
      label: isHe ? "צפיות בדף נחיתה" : "Landing Page Views",
      value: stats?.landingPageViews ?? 0,
      sub: isHe ? `${uniqueVisitors} מבקרים ייחודיים` : `${uniqueVisitors} unique visitors`,
      color: "from-blue-500/20 to-cyan-500/20 border-blue-500/20",
      iconColor: "text-blue-400",
      width: "100%",
    },
    {
      label: isHe ? "המשיכו (אורח + נרשם)" : "Continued (Guest + Registered)",
      value: totalActions,
      sub: isHe ? `${conversionRate}% מהמבקרים` : `${conversionRate}% of visitors`,
      color: "from-amber-500/20 to-yellow-500/20 border-amber-500/20",
      iconColor: "text-amber-400",
      width: uniqueVisitors > 0 ? `${Math.max(10, (totalActions / uniqueVisitors) * 100)}%` : "10%",
    },
    {
      label: isHe ? "נרשמו" : "Registered",
      value: registered,
      sub: isHe ? `${guests} אורחים` : `${guests} guests`,
      color: "from-green-500/20 to-emerald-500/20 border-green-500/20",
      iconColor: "text-green-400",
      width: uniqueVisitors > 0 ? `${Math.max(8, (registered / uniqueVisitors) * 100)}%` : "8%",
    },
    {
      label: isHe ? "עשו ניתוח" : "Did Analysis",
      value: usersWithAnalysis,
      sub: isHe ? `${analysisRate}% מהנרשמים | ${totalAnalyses} ניתוחים סה״כ` : `${analysisRate}% of registered | ${totalAnalyses} total`,
      color: "from-purple-500/20 to-violet-500/20 border-purple-500/20",
      iconColor: "text-purple-400",
      width: uniqueVisitors > 0 ? `${Math.max(5, (usersWithAnalysis / uniqueVisitors) * 100)}%` : "5%",
    },
  ];

  // Merge daily data into a unified table
  const dailyMap = new Map<string, { views: number; unique: number; registrations: number; guests: number; analyses: number }>();
  daily?.dailyViews?.forEach((d: any) => {
    const key = d.date;
    if (!dailyMap.has(key)) dailyMap.set(key, { views: 0, unique: 0, registrations: 0, guests: 0, analyses: 0 });
    const entry = dailyMap.get(key)!;
    entry.views = Number(d.views);
    entry.unique = Number(d.uniqueVisitors);
  });
  daily?.dailyRegistrations?.forEach((d: any) => {
    const key = d.date;
    if (!dailyMap.has(key)) dailyMap.set(key, { views: 0, unique: 0, registrations: 0, guests: 0, analyses: 0 });
    dailyMap.get(key)!.registrations = Number(d.registrations);
  });
  daily?.dailyGuests?.forEach((d: any) => {
    const key = d.date;
    if (!dailyMap.has(key)) dailyMap.set(key, { views: 0, unique: 0, registrations: 0, guests: 0, analyses: 0 });
    dailyMap.get(key)!.guests = Number(d.guests);
  });
  daily?.dailyAnalyses?.forEach((d: any) => {
    const key = d.date;
    if (!dailyMap.has(key)) dailyMap.set(key, { views: 0, unique: 0, registrations: 0, guests: 0, analyses: 0 });
    dailyMap.get(key)!.analyses = Number(d.analyses);
  });
  const dailyRows = Array.from(dailyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, d]) => ({ date, ...d }));

  return (
    <div className="space-y-8">
      {/* Funnel visualization */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="text-lg font-bold mb-6">
          {isHe ? "משפך המרה (פאנל)" : "Conversion Funnel"}
        </h2>
        <div className="space-y-3">
          {funnelStages.map((stage, i) => (
            <div key={i} className="flex items-center gap-4">
              <div
                className={`p-4 rounded-xl bg-gradient-to-r ${stage.color} border transition-all`}
                style={{ width: stage.width, minWidth: 120 }}
              >
                <div className="text-2xl font-bold">{stage.value}</div>
                <div className="text-sm font-medium">{stage.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stage.sub}</div>
              </div>
              {i < funnelStages.length - 1 && (
                <div className="text-muted-foreground text-lg">↓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Daily breakdown table */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="text-lg font-bold mb-4">
          {isHe ? "פירוט יומי (14 ימים אחרונים)" : "Daily Breakdown (Last 14 Days)"}
        </h2>
        {dailyRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {isHe ? "אין נתונים עדיין. המעקב יתחיל לאסוף נתונים מעכשיו." : "No data yet. Tracking will start collecting data now."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-start py-2 px-3 font-medium text-muted-foreground">
                    {isHe ? "תאריך" : "Date"}
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-blue-400">
                    {isHe ? "צפיות" : "Views"}
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-cyan-400">
                    {isHe ? "ייחודיים" : "Unique"}
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-green-400">
                    {isHe ? "נרשמו" : "Registered"}
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-amber-400">
                    {isHe ? "אורחים" : "Guests"}
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-purple-400">
                    {isHe ? "ניתוחים" : "Analyses"}
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-rose-400">
                    {isHe ? "המרה %" : "Conv %"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((row) => {
                  const conv = row.unique > 0 ? Math.round(((row.registrations + row.guests) / row.unique) * 100) : 0;
                  return (
                    <tr key={row.date} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 font-mono text-xs">{row.date}</td>
                      <td className="py-2 px-3 text-center">{row.views}</td>
                      <td className="py-2 px-3 text-center">{row.unique}</td>
                      <td className="py-2 px-3 text-center">{row.registrations}</td>
                      <td className="py-2 px-3 text-center">{row.guests}</td>
                      <td className="py-2 px-3 text-center">{row.analyses}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          conv >= 50 ? "bg-green-500/20 text-green-300" :
                          conv >= 20 ? "bg-amber-500/20 text-amber-300" :
                          "bg-red-500/20 text-red-300"
                        }`}>
                          {conv}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Uploads Tab ----

function UploadsTab({ lang, t, dir }: { lang: "he" | "en"; t: (k: keyof typeof translations.admin) => string; dir: string }) {
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const trpcUtils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.allReviews.useQuery({ limit, offset });
  const deleteMutation = trpc.admin.deleteReview.useMutation({
    onSuccess: () => {
      trpcUtils.admin.allReviews.invalidate();
      trpcUtils.admin.stats.invalidate();
      toast.success(lang === "he" ? "הניתוח נמחק" : "Review deleted");
      setSelectedReview(null);
    },
  });

  const reviews = (data?.reviews ?? []) as AdminReview[];
  const total = data?.total ?? 0;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    analyzing: "bg-primary/20 text-amber-300 border-primary/30",
    completed: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  const statusLabels: Record<string, string> = {
    pending: t("pending"),
    analyzing: t("analyzing"),
    completed: t("completed"),
    failed: t("failed"),
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <FashionSpinner />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{t("noReviews")}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {lang === "he" ? `${total} ניתוחים סה"כ` : `${total} total reviews`}
      </p>

      {/* Image grid view */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            lang={lang}
            t={t}
            statusColors={statusColors}
            statusLabels={statusLabels}
            onDelete={(id) => deleteMutation.mutate({ reviewId: id })}
            isDeleting={deleteMutation.isPending}
            onClick={() => setSelectedReview(review)}
          />
        ))}
      </div>

      {/* Load more */}
      {offset + limit < total && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => setOffset((prev) => prev + limit)}
            className="gap-2"
          >
            <ChevronDown className="w-4 h-4" />
            {t("loadMore")}
          </Button>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          lang={lang}
          dir={dir}
          t={t}
          statusColors={statusColors}
          statusLabels={statusLabels}
          onClose={() => setSelectedReview(null)}
          onDelete={(id) => deleteMutation.mutate({ reviewId: id })}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function ReviewCard({
  review,
  lang,
  t,
  statusColors,
  statusLabels,
  onDelete,
  isDeleting,
  onClick,
}: {
  review: AdminReview;
  lang: "he" | "en";
  t: (k: keyof typeof translations.admin) => string;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const score = review.overallScore;

  const scoreColor =
    score != null && score >= 8
      ? "text-amber-400"
      : score != null && score >= 6
        ? "text-primary"
        : score != null && score >= 4
          ? "text-yellow-400"
          : "text-red-400";

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-white/10 bg-card hover:border-white/20 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[3/4] overflow-hidden relative">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <ImageOff className="w-8 h-8 text-muted-foreground/30" />
          </div>
        ) : (
          <img
            src={review.imageUrl}
            alt={`Review ${review.id}`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
          <Button size="sm" className="gap-1.5 text-xs">
            <Eye className="w-3.5 h-3.5" />
            {t("viewAnalysis")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("deleteReview")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteReview")}</AlertDialogTitle>
                <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{lang === "he" ? "ביטול" : "Cancel"}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(review.id)}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {t("deleteReview")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Score badge */}
        {score != null && (
          <div className="absolute top-2 left-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10">
              <span className={`text-lg font-black ${scoreColor}`}>{score}</span>
              <span className="text-[9px] text-white/40">/10</span>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[review.status] || ""}`}>
            {statusLabels[review.status] || review.status}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div className="text-xs font-medium truncate">{review.userName || `User #${review.userId}`}</div>
        <div className="text-[10px] text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
        {review.occasion && (
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">{review.occasion}</div>
        )}
      </div>
    </div>
  );
}

// ---- Review Detail Modal ----

function ReviewDetailModal({
  review,
  lang,
  dir,
  t,
  statusColors,
  statusLabels,
  onClose,
  onDelete,
  isDeleting,
}: {
  review: AdminReview;
  lang: "he" | "en";
  dir: string;
  t: (k: keyof typeof translations.admin) => string;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  onClose: () => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const analysis = review.analysisJson as FashionAnalysis | null;
  const score = review.overallScore;
  const [imgError, setImgError] = useState(false);

  const scoreColor =
    score != null && score >= 8
      ? "text-amber-400"
      : score != null && score >= 6
        ? "text-primary"
        : score != null && score >= 4
          ? "text-yellow-400"
          : "text-red-400";

  const scoreBg =
    score != null && score >= 8
      ? "from-amber-500/20 to-primary/20 border-amber-500/20"
      : score != null && score >= 6
        ? "from-primary/20 to-amber-500/20 border-primary/20"
        : score != null && score >= 4
          ? "from-yellow-500/20 to-amber-500/20 border-yellow-500/20"
          : "from-red-500/20 to-orange-500/20 border-red-500/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-card border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{t("reviewDetail")}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[review.status] || ""}`}>
              {statusLabels[review.status] || review.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/review/${review.id}`}>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" />
                {t("openFullPage")}
              </Button>
            </Link>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Image */}
            <div>
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                {imgError ? (
                  <div className="aspect-[3/4] flex items-center justify-center">
                    <ImageOff className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                ) : (
                  <img
                    src={review.imageUrl}
                    alt={`Review ${review.id}`}
                    className="w-full object-contain max-h-[60vh]"
                    onError={() => setImgError(true)}
                  />
                )}
              </div>

              {/* Meta info under image */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("user")}:</span>
                  <span className="font-medium">{review.userName || `User #${review.userId}`}</span>
                </div>
                {review.userEmail && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("email")}:</span>
                    <span className="text-xs">{review.userEmail}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("date")}:</span>
                  <span>
                    {new Date(review.createdAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {review.occasion && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("occasion")}:</span>
                    <span>{review.occasion}</span>
                  </div>
                )}

                {/* Delete button */}
                <div className="pt-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("deleteReview")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteReview")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{lang === "he" ? "ביטול" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(review.id)}
                          disabled={isDeleting}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {t("deleteReview")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            {/* Right: Analysis */}
            <div className="space-y-5">
              {/* Score */}
              {score != null && (
                <div className={`p-5 rounded-xl bg-gradient-to-br ${scoreBg} border`}>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-black">
                      <span className={scoreColor}>{score}</span>
                      <span className="text-lg text-muted-foreground">/10</span>
                    </div>
                    <div>
                      <div className="font-semibold">{t("score")}</div>
                      <div className="text-xs text-muted-foreground">
                        {lang === "he" ? "ציון כללי של הלוק" : "Overall look score"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!analysis && review.status === "completed" && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t("noAnalysis")}</p>
                </div>
              )}

              {analysis && (
                <>
                  {/* Summary */}
                  {analysis.summary && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        {t("summary")}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                    </div>
                  )}

                  {/* Category Scores */}
                  {analysis.scores && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400" />
                        {t("scores")}
                      </h3>
                      <div className="space-y-2.5">
                        {Object.entries(analysis.scores).map(([key, val]) => {
                          const scoreVal = typeof val === "object" && val !== null ? (val as any).score : val;
                          if (scoreVal == null) return null;
                          const barColor = scoreVal >= 8 ? "bg-amber-400" : scoreVal >= 6 ? "bg-primary" : scoreVal >= 4 ? "bg-yellow-400" : "bg-red-400";
                          return (
                            <div key={key}>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-28 shrink-0 truncate capitalize">{key}</span>
                                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${scoreVal * 10}%` }} />
                                </div>
                                <span className="text-xs font-bold w-8">{scoreVal}/10</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Items Detected */}
                  {analysis.items && analysis.items.length > 0 && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Shirt className="w-4 h-4 text-rose-400" />
                        {t("items")} ({analysis.items.length})
                      </h3>
                      <div className="space-y-2">
                        {analysis.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                            <span className="text-lg">{item.icon || "👕"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{item.name}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                {item.brand && <span className="text-primary/80">{item.brand}</span>}
                                {item.color && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: item.color.toLowerCase() }} />
                                    {item.color}
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.score != null && (
                              <span className={`text-xs font-bold ${item.score >= 8 ? "text-amber-400" : item.score >= 6 ? "text-primary" : "text-yellow-400"}`}>
                                {item.score}/10
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvements */}
                  {analysis.improvements && analysis.improvements.length > 0 && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                        {t("improvements")} ({analysis.improvements.length})
                      </h3>
                      <div className="space-y-2">
                        {analysis.improvements.map((imp, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-white/5">
                            <div className="text-sm font-medium">{imp.title}</div>
                            <p className="text-xs text-muted-foreground mt-1">{imp.description}</p>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Pending/Analyzing/Failed states */}
              {review.status === "pending" && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{lang === "he" ? "הניתוח ממתין להפעלה" : "Analysis pending"}</p>
                </div>
              )}
              {review.status === "analyzing" && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <FashionSpinner />
                  <p className="text-sm text-muted-foreground">{lang === "he" ? "מנתח..." : "Analyzing..."}</p>
                </div>
              )}
              {review.status === "failed" && (
                <div className="text-center py-8 text-red-400">
                  <p>{lang === "he" ? "הניתוח נכשל" : "Analysis failed"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Users Tab ----

function UsersTab({ lang, t, dir }: { lang: "he" | "en"; t: (k: keyof typeof translations.admin) => string; dir: string }) {
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phoneNumber: "", gender: "", role: "user" as "user" | "admin" });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.allUsers.useQuery({ limit, offset });
  const [sendingWAUserId, setSendingWAUserId] = useState<number | null>(null);
  const sendWhatsAppMutation = trpc.admin.sendWhatsAppWelcome.useMutation({
    onSuccess: () => {
      toast.success(lang === "he" ? "הודעת WhatsApp Welcome נשלחה בהצלחה!" : "WhatsApp Welcome sent successfully!");
      setSendingWAUserId(null);
    },
    onError: (err) => {
      toast.error(lang === "he" ? `שגיאה בשליחת WhatsApp: ${err.message}` : `WhatsApp error: ${err.message}`);
      setSendingWAUserId(null);
    },
  });

  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      utils.admin.allUsers.invalidate();
      setEditingUserId(null);
      toast.success(lang === "he" ? "פרטי המשתמש עודכנו בהצלחה" : "User updated successfully");
    },
    onError: (err) => {
      toast.error(lang === "he" ? `שגיאה: ${err.message}` : `Error: ${err.message}`);
    },
  });

  const allUsers = data?.users ?? [];
  const total = data?.total ?? 0;

  const startEdit = (u: typeof allUsers[0]) => {
    setEditingUserId(u.id);
    setEditForm({
      name: u.name || "",
      phoneNumber: u.phoneNumber || "",
      gender: u.gender || "",
      role: (u.role as "user" | "admin") || "user",
    });
  };

  const saveEdit = () => {
    if (!editingUserId) return;
    updateUserMutation.mutate({
      userId: editingUserId,
      name: editForm.name || undefined,
      phoneNumber: editForm.phoneNumber.trim() || null,
      gender: editForm.gender || null,
      role: editForm.role,
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <FashionSpinner />
      </div>
    );
  }

  if (allUsers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{t("noUsers")}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {lang === "he" ? `${total} משתמשים סה"כ` : `${total} total users`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("name")}</th>
              <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("email")}</th>
              <th className="text-start px-4 py-3 font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {lang === "he" ? "טלפון" : "Phone"}
                </span>
              </th>
              <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("gender")}</th>
              <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("role")}</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("reviews")}</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("posts")}</th>
              <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("joined")}</th>
              <th className="text-end px-4 py-3 font-medium text-muted-foreground">
                {lang === "he" ? "פעולות" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u) => (
              <React.Fragment key={u.id}>
                <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${editingUserId === u.id ? "bg-white/5" : ""}`}>
                  <td className="px-4 py-3 font-medium">{u.name || `User #${u.id}`}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span dir="ltr" className="text-muted-foreground text-xs">
                      {u.phoneNumber || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{u.gender || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      u.role === "admin"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-white/5 text-muted-foreground border-white/10"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{(u as any).reviewCount ?? 0}</td>
                  <td className="px-4 py-3 text-center">{(u as any).feedPostCount ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(u.createdAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editingUserId === u.id ? cancelEdit() : startEdit(u)}
                      className="gap-1 text-xs h-7 px-2"
                    >
                      {editingUserId === u.id ? (
                        <><X className="w-3 h-3" /> {lang === "he" ? "ביטול" : "Cancel"}</>
                      ) : (
                        <><Pencil className="w-3 h-3" /> {lang === "he" ? "ערוך" : "Edit"}</>
                      )}
                    </Button>
                  </td>
                </tr>
                {/* Expandable edit row */}
                {editingUserId === u.id && (
                  <tr className="border-b border-white/5 bg-white/[0.03]">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
                        {/* Name */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {lang === "he" ? "שם" : "Name"}
                          </label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-white/15 bg-white/5 text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                        {/* Phone */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {lang === "he" ? "טלפון" : "Phone"}
                          </label>
                          <input
                            type="tel"
                            dir="ltr"
                            value={editForm.phoneNumber}
                            onChange={(e) => setEditForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                            placeholder="+972..."
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-white/15 bg-white/5 text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                        {/* Gender */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {lang === "he" ? "מגדר" : "Gender"}
                          </label>
                          <select
                            value={editForm.gender}
                            onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-white/15 bg-white/5 text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="">—</option>
                            <option value="male">{lang === "he" ? "גבר" : "Male"}</option>
                            <option value="female">{lang === "he" ? "אישה" : "Female"}</option>
                            <option value="non-binary">{lang === "he" ? "לא בינארי" : "Non-binary"}</option>
                          </select>
                        </div>
                        {/* Role */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {lang === "he" ? "תפקיד" : "Role"}
                          </label>
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as "user" | "admin" }))}
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-white/15 bg-white/5 text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="user">{lang === "he" ? "משתמש" : "User"}</option>
                            <option value="admin">{lang === "he" ? "מנהל" : "Admin"}</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={updateUserMutation.isPending}
                          className="gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {updateUserMutation.isPending
                            ? (lang === "he" ? "שומר..." : "Saving...")
                            : (lang === "he" ? "שמור שינויים" : "Save changes")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                          className="gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          {lang === "he" ? "ביטול" : "Cancel"}
                        </Button>
                        {editForm.phoneNumber && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSendingWAUserId(editingUserId);
                              sendWhatsAppMutation.mutate({ userId: editingUserId! });
                            }}
                            disabled={sendingWAUserId === editingUserId}
                            className="gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {sendingWAUserId === editingUserId
                              ? (lang === "he" ? "שולח..." : "Sending...")
                              : (lang === "he" ? "שלח WhatsApp Welcome" : "Send WhatsApp Welcome")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {offset + limit < total && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => setOffset((prev) => prev + limit)}
            className="gap-2"
          >
            <ChevronDown className="w-4 h-4" />
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Guests & Demo Tab ----

function GuestsTab({ lang, dir }: { lang: "he" | "en"; dir: string }) {
  const { data: analytics, isLoading: analyticsLoading } = trpc.admin.guestAnalytics.useQuery();
  const { data: guestSessions, isLoading: sessionsLoading } = trpc.admin.guestSessions.useQuery({ limit: 50, offset: 0 });
  const { data: demoViews, isLoading: demoLoading } = trpc.admin.demoViews.useQuery({ limit: 50, offset: 0 });
  const [selectedSession, setSelectedSession] = useState<any>(null);

  if (analyticsLoading) {
    return (
      <div className="flex justify-center py-20">
        <FashionSpinner />
      </div>
    );
  }

  const stats = analytics || { totalGuests: 0, completedAnalyses: 0, convertedToUsers: 0, conversionRate: 0, totalDemoViews: 0, demoSignupClicks: 0, demoConversionRate: 0 };

  const parseDevice = (ua: string | null) => {
    if (!ua) return lang === "he" ? "לא ידוע" : "Unknown";
    const isMobile = /iPhone|iPad|Android|Mobile/i.test(ua);
    const isIOS = /iPhone|iPad/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
    const isChrome = /Chrome/i.test(ua) && !/Edge/i.test(ua);
    const browser = isSafari ? "Safari" : isChrome ? "Chrome" : /Firefox/i.test(ua) ? "Firefox" : /Edge/i.test(ua) ? "Edge" : "Other";
    const device = isIOS ? "iOS" : isAndroid ? "Android" : "Desktop";
    return `${device} / ${browser}`;
  };

  return (
    <div className="space-y-8">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label={lang === "he" ? "אורחים" : "Guests"}
          value={stats.totalGuests}
          icon={<Users className="w-5 h-5 text-blue-400" />}
        />
        <StatCard
          label={lang === "he" ? "ניתוחים הושלמו" : "Completed"}
          value={stats.completedAnalyses}
          icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          label={lang === "he" ? "צפיות דמו" : "Demo Views"}
          value={stats.totalDemoViews}
          icon={<Eye className="w-5 h-5 text-purple-400" />}
        />
        <StatCard
          label={lang === "he" ? "לחצו הרשמה מדמו" : "Demo\u2192Signup"}
          value={stats.demoSignupClicks}
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          label={lang === "he" ? "המרה" : "Conversion"}
          value={`${stats.conversionRate}%`}
          icon={<BarChart3 className="w-5 h-5 text-rose-400" />}
        />
      </div>

      {/* Guest Sessions — Card Grid */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          {lang === "he" ? "ניתוחי אורחים" : "Guest Analyses"}
          {guestSessions?.total ? <span className="text-xs text-muted-foreground font-normal">({guestSessions.total})</span> : null}
        </h3>
        {sessionsLoading ? (
          <FashionSpinner />
        ) : !guestSessions?.sessions?.length ? (
          <p className="text-muted-foreground text-sm">{lang === "he" ? "אין עדיין ניתוחי אורחים" : "No guest analyses yet"}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {guestSessions.sessions.map((session: any) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="cursor-pointer group rounded-xl border border-white/10 bg-card/50 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                {/* Image */}
                <div className="aspect-square bg-white/5 overflow-hidden relative">
                  {session.imageUrl ? (
                    <img src={session.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Score badge */}
                  {session.overallScore != null && (
                    <div className={`absolute top-2 ${dir === "rtl" ? "left-2" : "right-2"} px-2 py-1 rounded-full text-xs font-bold backdrop-blur-md ${
                      session.overallScore >= 8 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                      session.overallScore >= 6 ? "bg-primary/20 text-amber-300 border border-primary/30" :
                      "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {session.overallScore}/10
                    </div>
                  )}
                  {/* Status badge */}
                  <div className={`absolute bottom-2 ${dir === "rtl" ? "right-2" : "left-2"} px-2 py-0.5 rounded-full text-[10px] backdrop-blur-md ${
                    session.status === "completed" ? "bg-emerald-500/20 text-emerald-300" :
                    session.status === "analyzing" ? "bg-blue-500/20 text-blue-300" :
                    session.status === "failed" ? "bg-red-500/20 text-red-300" :
                    "bg-white/20 text-white/70"
                  }`}>
                    {session.status}
                  </div>
                </div>
                {/* Info */}
                <div className="p-3 space-y-1">
                  <p className="text-[11px] text-muted-foreground font-mono">{session.ipAddress || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{parseDevice(session.userAgent)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Views Table */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" />
          {lang === "he" ? "צפיות דמו" : "Demo Views"}
          {demoViews?.total ? <span className="text-xs text-muted-foreground font-normal">({demoViews.total})</span> : null}
        </h3>
        {demoLoading ? (
          <FashionSpinner />
        ) : !demoViews?.views?.length ? (
          <p className="text-muted-foreground text-sm">{lang === "he" ? "אין עדיין צפיות דמו" : "No demo views yet"}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{lang === "he" ? "לחץ הרשמה" : "Clicked Signup"}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">IP</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{lang === "he" ? "תאריך" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {demoViews.views.map((view: any) => (
                  <tr key={view.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{view.id}</td>
                    <td className="px-4 py-3">
                      {view.clickedSignup ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400">\u2713</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-muted-foreground">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{view.ipAddress || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(view.viewedAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guest Session Detail Modal */}
      {selectedSession && (
        <GuestSessionDetailModal
          session={selectedSession}
          lang={lang}
          dir={dir}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

/* ---- Guest Session Detail Modal ---- */

function GuestSessionDetailModal({ session, lang, dir, onClose }: {
  session: any;
  lang: "he" | "en";
  dir: string;
  onClose: () => void;
}) {
  const analysis = (() => {
    if (!session.analysisJson) return null;
    try {
      const raw = (typeof session.analysisJson === "string"
        ? JSON.parse(session.analysisJson)
        : session.analysisJson) as FashionAnalysis;
      return raw;
    } catch {
      return null;
    }
  })();

  const parseDevice = (ua: string | null) => {
    if (!ua) return lang === "he" ? "לא ידוע" : "Unknown";
    const isMobile = /iPhone|iPad|Android|Mobile/i.test(ua);
    const isIOS = /iPhone|iPad/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
    const isChrome = /Chrome/i.test(ua) && !/Edge/i.test(ua);
    const browser = isSafari ? "Safari" : isChrome ? "Chrome" : /Firefox/i.test(ua) ? "Firefox" : /Edge/i.test(ua) ? "Edge" : "Other";
    const device = isIOS ? "iOS" : isAndroid ? "Android" : "Desktop";
    return `${device} / ${browser}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/10 bg-card/95 backdrop-blur-md rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {lang === "he" ? `ניתוח אורח #${session.id}` : `Guest Analysis #${session.id}`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {new Date(session.createdAt).toLocaleString(lang === "he" ? "he-IL" : "en-US")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Guest Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-muted-foreground mb-1">IP</p>
              <p className="text-sm font-mono">{session.ipAddress || "—"}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-muted-foreground mb-1">{lang === "he" ? "מכשיר" : "Device"}</p>
              <p className="text-sm">{parseDevice(session.userAgent)}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-muted-foreground mb-1">{lang === "he" ? "סטטוס" : "Status"}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                session.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                session.status === "failed" ? "bg-red-500/10 text-red-400" :
                "bg-blue-500/10 text-blue-400"
              }`}>
                {session.status}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-muted-foreground mb-1">{lang === "he" ? "הומר למשתמש" : "Converted"}</p>
              <p className="text-sm">{session.convertedUserId ? `ID: ${session.convertedUserId}` : (lang === "he" ? "לא" : "No")}</p>
            </div>
          </div>

          {/* Fingerprint */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-muted-foreground mb-1">Fingerprint</p>
            <p className="text-xs font-mono text-muted-foreground break-all">{session.fingerprint}</p>
          </div>

          {/* Image + Score */}
          <div className="grid md:grid-cols-2 gap-6">
            {session.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-white/10">
                <img src={session.imageUrl} alt="Guest upload" className="w-full max-h-[500px] object-contain bg-black" />
              </div>
            )}
            {analysis && (
              <div className="space-y-4">
                {/* Overall Score */}
                <div className="flex items-center gap-4">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-24 h-24" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
                      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 54} strokeDashoffset={(2 * Math.PI * 54) - ((analysis.overallScore ?? 0) / 10) * (2 * Math.PI * 54)}
                        strokeLinecap="round"
                        className={`${
                          (analysis.overallScore ?? 0) >= 9 ? "text-amber-400" : (analysis.overallScore ?? 0) >= 7 ? "text-primary" : "text-yellow-400"
                        } transition-all duration-1000`}
                        transform="rotate(-90 60 60)" />
                    </svg>
                    <span className="absolute text-2xl font-bold">{analysis.overallScore ?? 0}</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{lang === "he" ? "ציון כללי" : "Overall Score"}</p>
                    <p className="text-sm text-muted-foreground">{analysis.overallScore ?? 0}/10</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-muted-foreground mb-1">{lang === "he" ? "סיכום" : "Summary"}</p>
                  <p className="text-sm leading-relaxed">{analysis.summary}</p>
                </div>

                {/* Influencer Insight */}
                {analysis.influencerInsight && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs text-primary mb-1">{lang === "he" ? "תובנות משפיענים" : "Influencer Insight"}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{analysis.influencerInsight}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items Detected */}
          {analysis && analysis.items && analysis.items.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-primary" />
                {lang === "he" ? `${analysis.items.length} פריטים זוהו` : `${analysis.items.length} Items Detected`}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {analysis.items.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${
                        item.score >= 8 ? "text-emerald-400" : item.score >= 6 ? "text-primary" : "text-amber-400"
                      }`}>{item.score}/10</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-2 bg-primary/10 text-primary">{item.verdict}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Scores */}
          {analysis && analysis.scores && analysis.scores.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                {lang === "he" ? "ציונים מפורטים" : "Detailed Scores"}
              </h3>
              <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3">
                {analysis.scores.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-32 shrink-0">{s.category}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full ${
                        (s.score ?? 0) >= 8 ? "bg-emerald-400" : (s.score ?? 0) >= 6 ? "bg-primary" : "bg-amber-400"
                      }`} style={{ width: `${(s.score ?? 0) * 10}%` }} />
                    </div>
                    <span className="text-xs font-bold w-10">{s.score ?? "—"}/10</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {analysis && analysis.improvements && analysis.improvements.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-emerald-400" />
                {lang === "he" ? "המלצות שדרוג" : "Upgrade Suggestions"}
              </h3>
              <div className="space-y-3">
                {analysis.improvements.map((imp, i) => (
                  <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/5">
                    <div className="flex items-start gap-3">
                      <span className="text-primary font-bold text-sm shrink-0">{i + 1}.</span>
                      <div>
                        <p className="font-medium text-sm mb-1">{imp.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{imp.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                            {lang === "he" ? "לפני" : "Before"}: {imp.beforeLabel}
                          </span>
                          <span className="text-[10px]">\u2192</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            {lang === "he" ? "אחרי" : "After"}: {imp.afterLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View full analysis link */}
          {session.status === "completed" && (
            <div className="text-center pt-2">
              <a
                href={`/guest/review/${session.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {lang === "he" ? "צפה בניתוח המלא" : "View Full Analysis"}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-white/10 bg-card/50 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}


// ---- Brand Matching Tab ----

function BrandMatchingTab({ lang, dir }: { lang: "he" | "en"; dir: string }) {
  const isHe = lang === "he";
  const { data, isLoading } = trpc.tasteProfile.brandMatching.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <FashionSpinner />
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="text-center py-20">
        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h3 className="text-lg font-semibold mb-2">
          {isHe ? "אין עדיין נתונים" : "No data yet"}
        </h3>
        <p className="text-muted-foreground text-sm">
          {isHe
            ? "צריך לפחות ניתוח אחד כדי לחשב התאמת מותגים"
            : "Need at least one analysis to compute brand matching"}
        </p>
      </div>
    );
  }

  const matches = data.matches;
  const topMatches = matches.slice(0, 5);
  const restMatches = matches.slice(5);

  const reasonLabels: Record<string, { he: string; en: string }> = {
    "minimalist": { he: "מינימליסטי", en: "Minimalist" },
    "classic": { he: "קלאסי", en: "Classic" },
    "streetwear": { he: "סטריטוור", en: "Streetwear" },
    "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual" },
    "bohemian": { he: "בוהמי", en: "Bohemian" },
    "sporty": { he: "ספורטיבי", en: "Sporty" },
    "avant-garde": { he: "אוונגרד", en: "Avant-Garde" },
    "preppy": { he: "פרפי", en: "Preppy" },
    "colors": { he: "צבעים תואמים", en: "Matching colors" },
    "detected": { he: "זוהה בארון", en: "Detected in wardrobe" },
    "budget": { he: "תקציב מתאים", en: "Budget match" },
  };

  const getMatchColor = (pct: number) => {
    if (pct >= 70) return "from-emerald-500 to-emerald-400";
    if (pct >= 50) return "from-amber-500 to-amber-400";
    if (pct >= 30) return "from-orange-500 to-orange-400";
    return "from-red-500 to-red-400";
  };

  const getMatchBg = (pct: number) => {
    if (pct >= 70) return "bg-emerald-500/10 border-emerald-500/20";
    if (pct >= 50) return "bg-amber-500/10 border-amber-500/20";
    if (pct >= 30) return "bg-orange-500/10 border-orange-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
          <Sparkles className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {isHe ? "התאמת מותגים לפרופיל הטעם" : "Brand Affinity Matching"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isHe
              ? "מבוסס על כל הניתוחים, הארון, והעדפות הסגנון שלך"
              : "Based on all your analyses, wardrobe, and style preferences"}
          </p>
        </div>
      </div>

      {/* Top 5 Matches */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400" />
          {isHe ? "Top 5 — המותגים שהכי מתאימים לך" : "Top 5 — Your Best Brand Matches"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {topMatches.map((m, i) => (
            <div
              key={m.brand}
              className={`relative rounded-xl border p-5 text-center transition-all hover:scale-[1.02] ${getMatchBg(m.matchPct)}`}
            >
              {i === 0 && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                  {isHe ? "ההתאמה הטובה ביותר" : "BEST MATCH"}
                </div>
              )}
              <div className="text-3xl font-black bg-gradient-to-r bg-clip-text text-transparent mb-2" style={{
                backgroundImage: `linear-gradient(to right, ${m.matchPct >= 70 ? '#10b981, #34d399' : m.matchPct >= 50 ? '#f59e0b, #fbbf24' : '#f97316, #fb923c'})`
              }}>
                {m.matchPct}%
              </div>
              <div className="font-bold text-base mb-2">{m.brand}</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {m.reasons.map((r) => (
                  <span
                    key={r}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground"
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
                  className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
                >
                  {isHe ? "לאתר" : "Visit"} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rest of matches */}
      {restMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {isHe ? "כל המותגים" : "All Brands"}
          </h3>
          <div className="space-y-2">
            {restMatches.map((m) => (
              <div
                key={m.brand}
                className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:bg-white/5 transition-colors"
              >
                <div className="w-20 text-center">
                  <span className={`text-lg font-bold bg-gradient-to-r ${getMatchColor(m.matchPct)} bg-clip-text text-transparent`}>
                    {m.matchPct}%
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{m.brand}</div>
                  <div className="flex gap-1 mt-1">
                    {m.reasons.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground"
                      >
                        {reasonLabels[r]?.[lang] || r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-32 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getMatchColor(m.matchPct)}`}
                    style={{ width: `${m.matchPct}%` }}
                  />
                </div>
                {m.url && (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
