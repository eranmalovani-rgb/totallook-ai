import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import type { Language } from "@/i18n/translations";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import {
  Heart,
  Bookmark,
  Trash2,
  Loader2,
  Flame,
  Clock,
  BookmarkCheck,
  Sparkles,
  Share2,
  ImageOff,
  Eye,
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react";
import FeedComments from "@/components/FeedComments";
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

type TabType = "all" | "popular" | "new" | "saved" | "following";

const occasionKeys = ["work", "casual", "evening", "date", "friends", "formal", "sport", "travel", "weekend"] as const;
type OccasionKey = (typeof occasionKeys)[number];

const occasionEmojis: Record<OccasionKey, string> = {
  work: "💼",
  casual: "👕",
  evening: "🌙",
  date: "❤️",
  friends: "🍻",
  formal: "👔",
  sport: "🏃",
  travel: "✈️",
  weekend: "☀️",
};

export default function Feed() {
  const { lang } = useLanguage();
  const t = (key: keyof typeof translations.feed) => translations.feed[key][lang];
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const isRtl = lang === "he";

  // Read target post from URL query param (e.g., /feed?post=123)
  const searchString = useSearch();
  const targetPostId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const postParam = params.get("post");
    return postParam ? parseInt(postParam, 10) : null;
  }, [searchString]);
  const [highlightedPostId, setHighlightedPostId] = useState<number | null>(null);
  const scrolledRef = useRef(false);

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [occasionFilter, setOccasionFilter] = useState<string | null>(null);
  const LIMIT = 12;

  // Determine sort based on tab
  const sort = activeTab === "popular" ? ("popular" as const) : ("new" as const);
  const isSavedTab = activeTab === "saved";
  const isFollowingTab = activeTab === "following";

  // Occasion counts for filter chips
  const occasionCountsQuery = trpc.feed.occasionCounts.useQuery();
  const occasionCounts = occasionCountsQuery.data as Record<string, number> | undefined;

  // Feed query
  const feedQuery = trpc.feed.list.useQuery(
    { limit: LIMIT, offset: 0, sort, occasion: occasionFilter || undefined },
    { enabled: !isSavedTab && !isFollowingTab }
  );

  // Saved posts query
  const savedQuery = trpc.feed.saved.useQuery(
    { limit: LIMIT, offset: 0 },
    { enabled: isSavedTab && isAuthenticated }
  );

  // Following feed query
  const followingQuery = trpc.feed.following.useQuery(
    { limit: LIMIT, offset: 0 },
    { enabled: isFollowingTab && isAuthenticated }
  );

  const utils = trpc.useUtils();

  const invalidateAll = () => {
    utils.feed.list.invalidate();
    utils.feed.saved.invalidate();
    utils.feed.following.invalidate();
  };

  // Mutations
  const likeMutation = trpc.feed.like.useMutation({ onSuccess: invalidateAll });
  const unlikeMutation = trpc.feed.unlike.useMutation({ onSuccess: invalidateAll });
  const saveMutation = trpc.feed.save.useMutation({ onSuccess: invalidateAll });
  const unsaveMutation = trpc.feed.unsave.useMutation({ onSuccess: invalidateAll });
  const deleteMutation = trpc.feed.delete.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success(t("deleted"));
    },
  });
  const followMutation = trpc.feed.follow.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success(t("followed"));
    },
  });
  const unfollowMutation = trpc.feed.unfollow.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success(t("unfollowed"));
    },
  });

  const handleLike = useCallback(
    (postId: number, isLiked: boolean) => {
      if (!isAuthenticated) {
        window.location.href = getLoginUrl();
        return;
      }
      if (isLiked) {
        unlikeMutation.mutate({ postId });
      } else {
        likeMutation.mutate({ postId });
      }
    },
    [isAuthenticated, likeMutation, unlikeMutation]
  );

  const handleSave = useCallback(
    (postId: number, isSaved: boolean) => {
      if (!isAuthenticated) {
        window.location.href = getLoginUrl();
        return;
      }
      if (isSaved) {
        unsaveMutation.mutate({ postId });
      } else {
        saveMutation.mutate({ postId });
      }
    },
    [isAuthenticated, saveMutation, unsaveMutation]
  );

  const handleFollow = useCallback(
    (userId: number, isFollowing: boolean) => {
      if (!isAuthenticated) {
        window.location.href = getLoginUrl();
        return;
      }
      if (isFollowing) {
        unfollowMutation.mutate({ userId });
      } else {
        followMutation.mutate({ userId });
      }
    },
    [isAuthenticated, followMutation, unfollowMutation]
  );

  const currentData = isFollowingTab
    ? followingQuery.data
    : isSavedTab
      ? savedQuery.data
      : feedQuery.data;
  const isLoading = isFollowingTab
    ? followingQuery.isLoading
    : isSavedTab
      ? savedQuery.isLoading
      : feedQuery.isLoading;
  const posts = currentData?.posts || [];

  // Scroll to top on mount (unless targeting a specific post)
  useEffect(() => {
    if (!targetPostId) {
      window.scrollTo(0, 0);
    }
  }, []);

  // Scroll to target post when data loads
  useEffect(() => {
    if (targetPostId && posts.length > 0 && !scrolledRef.current) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const el = document.getElementById(`feed-post-${targetPostId}`);
        if (el) {
          // Offset for Navbar (64px) + sticky filter bar (~100px)
          const offset = 180;
          const top = el.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
          setHighlightedPostId(targetPostId);
          scrolledRef.current = true;
          // Remove highlight after animation
          setTimeout(() => setHighlightedPostId(null), 2500);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [targetPostId, posts]);

  const tabs: {
    key: TabType;
    label: string;
    icon: React.ReactNode;
    requiresAuth?: boolean;
  }[] = [
    { key: "all", label: t("filterAll"), icon: <Sparkles className="w-4 h-4" /> },
    { key: "popular", label: t("filterPopular"), icon: <Flame className="w-4 h-4" /> },
    { key: "new", label: t("filterNew"), icon: <Clock className="w-4 h-4" /> },
    {
      key: "following",
      label: t("filterFollowing"),
      icon: <Users className="w-4 h-4" />,
      requiresAuth: true,
    },
    {
      key: "saved",
      label: t("filterSaved"),
      icon: <BookmarkCheck className="w-4 h-4" />,
      requiresAuth: true,
    },
  ];

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={isRtl ? "rtl" : "ltr"}>
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Navbar />
      {/* Header */}
      <div className="pt-24 pb-4 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-amber-400 to-primary bg-clip-text text-transparent">
              {t("title")}
            </span>
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="sticky top-16 z-10 bg-background/80 backdrop-blur-md border-b border-white/10 px-4 py-2">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          {/* Sort tabs row */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              if (tab.requiresAuth && !isAuthenticated) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
          {/* Occasion filter row — only show for non-saved/following tabs */}
          {!isSavedTab && !isFollowingTab && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setOccasionFilter(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  occasionFilter === null
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent"
                }`}
              >
                {t("allOccasions")}
              </button>
              {occasionKeys.map((key) => {
                const cnt = occasionCounts?.[key] || 0;
                return (
                  <button
                    key={key}
                    onClick={() => setOccasionFilter(key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      occasionFilter === key
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    {occasionEmojis[key]} {translations.occasions[key][lang]}
                    {cnt > 0 && (
                      <span className="ml-1 text-[10px] opacity-60">({cnt})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {translations.common.loading[lang]}
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              {isFollowingTab ? (
                <Users className="w-8 h-8 text-muted-foreground" />
              ) : isSavedTab ? (
                <BookmarkCheck className="w-8 h-8 text-muted-foreground" />
              ) : (
                <Share2 className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {isFollowingTab
                ? t("noFollowing")
                : isSavedTab
                  ? t("noSaved")
                  : t("empty")}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {isFollowingTab
                ? t("noFollowingDesc")
                : isSavedTab
                  ? t("noSavedDesc")
                  : t("emptyDesc")}
            </p>
          </div>
        ) : (
          <>
            {/* Feed grid — single column on mobile for Instagram-like feel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  id={`feed-post-${post.id}`}
                  className={`transition-all duration-700 rounded-2xl ${
                    highlightedPostId === post.id
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20 scale-[1.02]"
                      : ""
                  }`}
                >
                  <FeedCard
                    post={post}
                    lang={lang}
                    currentUserId={user?.id}
                    onLike={handleLike}
                    onSave={handleSave}
                    onFollow={handleFollow}
                    onDelete={(postId) => deleteMutation.mutate({ postId })}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              ))}
            </div>

            {/* Load More */}
            {currentData?.hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => {}}
                  className="border-white/10 hover:bg-white/5"
                >
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Feed Card Component ----

interface FeedPost {
  id: number;
  userId: number;
  reviewId: number;
  userName: string | null;
  caption: string | null;
  imageUrl: string;
  overallScore: number | null;
  summary: string | null;
  styleTags: string | null;
  likesCount: number;
  savesCount: number;
  createdAt: Date | string;
  isLiked: boolean;
  isSaved: boolean;
  isOwner: boolean;
  isFollowing: boolean;
  wardrobeShareToken?: string | null;
  occasion?: string | null;
}

function FeedCard({
  post,
  lang,
  currentUserId,
  onLike,
  onSave,
  onFollow,
  onDelete,
  isAuthenticated,
}: {
  post: FeedPost;
  lang: "he" | "en";
  currentUserId?: number;
  onLike: (postId: number, isLiked: boolean) => void;
  onSave: (postId: number, isSaved: boolean) => void;
  onFollow: (userId: number, isFollowing: boolean) => void;
  onDelete: (postId: number) => void;
  isAuthenticated: boolean;
}) {
  const t = (key: keyof typeof translations.feed) =>
    translations.feed[key][lang];
  const [imgError, setImgError] = useState(false);
  const [, navigate] = useLocation();

  const score = post.overallScore;
  const scoreColor =
    score != null && score >= 8
      ? "from-amber-400 to-primary"
      : score != null && score >= 6
        ? "from-amber-400 to-primary"
        : score != null && score >= 4
          ? "from-yellow-400 to-orange-500"
          : "from-red-400 to-red-500";

  const scoreGlow =
    score != null && score >= 8
      ? "shadow-[0_0_30px_rgba(34,197,94,0.4)]"
      : score != null && score >= 6
        ? "shadow-[0_0_30px_rgba(59,130,246,0.4)]"
        : score != null && score >= 4
          ? "shadow-[0_0_30px_rgba(234,179,8,0.3)]"
          : "shadow-[0_0_30px_rgba(239,68,68,0.3)]";

  const scoreBorder =
    score != null && score >= 8
      ? "border-primary/50"
      : score != null && score >= 6
        ? "border-primary/50"
        : score != null && score >= 4
          ? "border-yellow-400/50"
          : "border-red-400/50";

  // Extract a short key phrase from the summary (first sentence, max ~60 chars)
  const keyPhrase = useMemo(() => {
    if (!post.summary) return null;
    // Take first sentence
    const firstSentence = post.summary.split(/[.!?،。]/)[0].trim();
    if (firstSentence.length <= 70) return firstSentence;
    // Truncate at word boundary
    return firstSentence.substring(0, 67).replace(/\s+\S*$/, '') + '...';
  }, [post.summary]);

  const timeAgo = getTimeAgo(post.createdAt, lang);
  const isOwnPost = currentUserId === post.userId;

  return (
    <div className="group relative bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5">
      {/* Image with dramatic score & key phrase overlay */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-white/5 cursor-pointer"
        onClick={() => navigate(`/review/${post.reviewId}`)}
      >
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-12 h-12 text-muted-foreground/30" />
          </div>
        ) : (
          <img
            src={post.imageUrl}
            alt="Look"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}

        {/* Dramatic score badge — top left with glow */}
        {score != null && (
          <div className="absolute top-3 left-3 z-10">
            <div
              className={`relative bg-black/60 backdrop-blur-xl border-2 ${scoreBorder} ${scoreGlow} rounded-2xl px-4 py-2.5 flex flex-col items-center min-w-[60px]`}
            >
              <span
                className={`text-4xl font-black bg-gradient-to-br ${scoreColor} bg-clip-text text-transparent leading-none`}
              >
                {score}
              </span>
              <span className="text-[9px] text-white/50 font-bold tracking-[0.2em] uppercase mt-0.5">
                / 10
              </span>
            </div>
          </div>
        )}

        {/* Key phrase from AI analysis — bottom overlay */}
        {keyPhrase && (
          <div className="absolute bottom-0 inset-x-0 z-10">
            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-10 pb-4">
              <p className="text-white text-sm font-medium leading-snug line-clamp-2 drop-shadow-lg" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                “{keyPhrase}”
              </p>
            </div>
          </div>
        )}

        {/* View analysis overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 text-white text-sm font-medium">
            <Eye className="w-4 h-4" />
            {t("viewAnalysis")}
          </div>
        </div>

        {/* Owner delete button */}
        {post.isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white/70 hover:text-red-400 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-all z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deletePost")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/10">
                  {translations.common.cancel[lang]}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(post.id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {translations.common.delete[lang]}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Gradient overlay at bottom — only when no key phrase */}
        {!keyPhrase && (
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* User info row with follow button */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-primary flex items-center justify-center text-white text-xs font-bold shadow-md">
              {(post.userName || "?")[0].toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span
                className="text-sm font-semibold text-foreground/90 truncate max-w-[120px] cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  // Navigate to the user's shared wardrobe if available
                  if (post.wardrobeShareToken) {
                    window.location.href = `/wardrobe/shared/${post.wardrobeShareToken}`;
                  }
                }}
                title={post.wardrobeShareToken ? (lang === "he" ? "צפה בארון" : "View wardrobe") : ""}
              >
                {post.userName || translations.common.user[lang]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Follow button — don't show on own posts */}
          {!isOwnPost && (
            <button
              onClick={() => onFollow(post.userId, post.isFollowing)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                post.isFollowing
                  ? "bg-white/10 text-primary border border-primary/30"
                  : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
              }`}
            >
              {post.isFollowing ? (
                <>
                  <UserCheck className="w-3 h-3" />
                  {t("following")}
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3" />
                  {t("follow")}
                </>
              )}
            </button>
          )}
        </div>

        {/* Occasion badge */}
        {post.occasion && occasionEmojis[post.occasion as OccasionKey] && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {occasionEmojis[post.occasion as OccasionKey]}
              {translations.occasions[post.occasion as OccasionKey]?.[lang]}
            </span>
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-foreground/80 mb-2 line-clamp-2">
            {post.caption}
          </p>
        )}

        {/* Style tags */}
        {post.styleTags && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.styleTags
              .split(",")
              .slice(0, 3)
              .map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/5"
                >
                  {tag.trim()}
                </span>
              ))}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={() => onLike(post.id, post.isLiked)}
              className={`flex items-center gap-1.5 text-sm transition-all ${
                post.isLiked
                  ? "text-red-400 scale-105"
                  : "text-muted-foreground hover:text-red-400"
              }`}
            >
              <Heart
                className={`w-5 h-5 transition-transform ${post.isLiked ? "fill-current scale-110" : "hover:scale-110"}`}
              />
              <span className="font-medium">{post.likesCount || ""}</span>
            </button>

            {/* Save */}
            <button
              onClick={() => onSave(post.id, post.isSaved)}
              className={`flex items-center gap-1.5 text-sm transition-all ${
                post.isSaved
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Bookmark
                className={`w-5 h-5 transition-transform ${post.isSaved ? "fill-current scale-110" : "hover:scale-110"}`}
              />
              <span className="font-medium">{post.savesCount || ""}</span>
            </button>
          </div>

          {/* View analysis link */}
          <button
            onClick={() => navigate(`/review/${post.reviewId}`)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {t("viewAnalysis")}
          </button>
        </div>

        {/* Comments */}
        <div className="pt-2">
          <FeedComments feedPostId={post.id} />
        </div>
      </div>
    </div>
  );
}

// ---- Time Ago Helper ----

function getTimeAgo(date: Date | string, lang: "he" | "en"): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (lang === "he") {
    if (diffMins < 1) return "עכשיו";
    if (diffMins < 60) return `לפני ${diffMins} דק'`;
    if (diffHours < 24) return `לפני ${diffHours} שע'`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return then.toLocaleDateString("he-IL");
  } else {
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString("en-US");
  }
}
