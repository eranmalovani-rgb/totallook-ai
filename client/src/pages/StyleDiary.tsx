/**
 * Style Diary — יומן סגנון
 * 
 * Shows:
 * 1. Instagram connection status + connect CTA
 * 2. Story mentions timeline (analyzed looks from IG stories)
 * 3. Weekly/monthly style summaries
 * 4. Style evolution stats
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n";
import { getLoginUrl } from "@/const";
import {
  BookOpen,
  Instagram,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Camera,
  Sparkles,
  ArrowLeft,
  Link2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";

export default function StyleDiary() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const isHe = lang === "he";

  const { data: igConnection, isLoading: igLoading } = trpc.instagram.getConnection.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: stories, isLoading: storiesLoading } = trpc.instagram.getStories.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: stats, isLoading: statsLoading } = trpc.instagram.getStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: diary, isLoading: diaryLoading } = trpc.instagram.getStyleDiary.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const [expandedStory, setExpandedStory] = useState<number | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={isHe ? "rtl" : "ltr"}>
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-32 text-center">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            {isHe ? "יומן הסגנון שלך" : "Your Style Diary"}
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            {isHe
              ? "התחברי כדי לראות את יומן הסגנון שלך ולחבר את האינסטגרם"
              : "Sign in to view your style diary and connect Instagram"}
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="bg-primary text-primary-foreground">
              {isHe ? "התחברות" : "Sign In"}
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const completedStories = stories?.filter(s => s.status === "completed") || [];
  const hasStories = completedStories.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isHe ? "rtl" : "ltr"}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {isHe ? "יומן הסגנון שלך" : "Your Style Diary"}
            </h1>
            <p className="text-muted-foreground">
              {isHe ? "כל הלוקים שלך — מנותחים ומסוכמים" : "All your looks — analyzed and summarized"}
            </p>
          </div>
        </div>

        {/* Instagram Connection Card */}
        <div className="mb-8 p-6 rounded-2xl border border-white/10 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isHe ? "חיבור אינסטגרם" : "Instagram Connection"}
                </h3>
                {igLoading ? (
                  <p className="text-muted-foreground text-sm">
                    <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                    {isHe ? "בודק..." : "Checking..."}
                  </p>
                ) : igConnection ? (
                  <p className="text-green-400 text-sm flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {isHe ? `מחובר כ-@${igConnection.igUsername}` : `Connected as @${igConnection.igUsername}`}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {isHe ? "לא מחובר — תייגי @totallook.ai בסטורי!" : "Not connected — tag @totallook.ai in your story!"}
                  </p>
                )}
              </div>
            </div>
            {!igConnection && !igLoading && (
              <Link href="/connect-instagram">
                <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                  <Link2 className="w-4 h-4 mr-2" />
                  {isHe ? "חברי אינסטגרם" : "Connect Instagram"}
                </Button>
              </Link>
            )}
          </div>

          {/* How it works — mini explainer */}
          {!igConnection && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <h4 className="text-sm font-semibold text-primary mb-3">
                {isHe ? "איך זה עובד?" : "How does it work?"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Camera,
                    title: isHe ? "תייגי בסטורי" : "Tag in Story",
                    desc: isHe ? "העלי סטורי ותייגי @totallook.ai" : "Post a story and tag @totallook.ai",
                  },
                  {
                    icon: Sparkles,
                    title: isHe ? "ניתוח אוטומטי" : "Auto Analysis",
                    desc: isHe ? "AI מנתח את הלוק תוך שניות" : "AI analyzes your look in seconds",
                  },
                  {
                    icon: Star,
                    title: isHe ? "קבלי DM" : "Get a DM",
                    desc: isHe ? "ציון + טיפ ישירות ל-DM שלך" : "Score + tip sent to your DM",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <step.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        {!statsLoading && stats && stats.total > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-white/10 bg-card text-center">
              <p className="text-3xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHe ? "לוקים מנותחים" : "Looks Analyzed"}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-card text-center">
              <p className="text-3xl font-bold text-foreground">{Math.round(Number(stats.avgScore) * 10) / 10}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHe ? "ציון ממוצע" : "Avg Score"}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-card text-center">
              <p className="text-3xl font-bold text-green-400">{stats.bestScore}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHe ? "ציון שיא" : "Best Score"}
              </p>
            </div>
          </div>
        )}

        {/* Style Diary Weekly Summaries */}
        {diary && diary.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {isHe ? "סיכומים שבועיים" : "Weekly Summaries"}
            </h2>
            <div className="space-y-3">
              {diary.map((entry: any) => (
                <div key={entry.id} className="p-4 rounded-xl border border-white/10 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {new Date(entry.periodStart).toLocaleDateString(isHe ? "he-IL" : "en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {" — "}
                        {new Date(entry.periodEnd).toLocaleDateString(isHe ? "he-IL" : "en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {entry.scoreTrend === "improving" && (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      )}
                      {entry.scoreTrend === "declining" && (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      {entry.scoreTrend === "stable" && (
                        <Minus className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {entry.lookCount} {isHe ? "לוקים" : "looks"}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span>
                      {isHe ? "ממוצע:" : "Avg:"}{" "}
                      <span className="font-bold text-primary">{entry.avgScore}/10</span>
                    </span>
                    <span>
                      {isHe ? "שיא:" : "Best:"}{" "}
                      <span className="font-bold text-green-400">{entry.bestScore}/10</span>
                    </span>
                  </div>
                  {entry.evolutionInsight && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{entry.evolutionInsight}"
                    </p>
                  )}
                  {entry.styleTrend && (
                    <p className="text-xs text-primary/70 mt-1">
                      {isHe ? "טרנד:" : "Trend:"} {entry.styleTrend}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Story Mentions Timeline */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            {isHe ? "ציר זמן — הלוקים שלך" : "Timeline — Your Looks"}
          </h2>

          {storiesLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">{isHe ? "טוען..." : "Loading..."}</p>
            </div>
          ) : !hasStories ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isHe ? "עדיין אין לוקים מסטוריז" : "No story looks yet"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                {isHe
                  ? "תייגי @totallook.ai בסטורי הבא שלך ותקבלי ניתוח אופנתי מיידי ב-DM! כל לוק יופיע כאן ביומן."
                  : "Tag @totallook.ai in your next story to get an instant fashion analysis via DM! Every look will appear here."}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-400/20 border border-purple-500/20">
                <Instagram className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-medium">@totallook.ai</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {completedStories.map((story) => {
                const analysis = story.analysisJson as any;
                const isExpanded = expandedStory === story.id;

                return (
                  <div
                    key={story.id}
                    className="rounded-xl border border-white/10 bg-card overflow-hidden transition-all"
                  >
                    {/* Story Header */}
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/3 transition-colors"
                      onClick={() => setExpandedStory(isExpanded ? null : story.id)}
                    >
                      {/* Thumbnail */}
                      {story.savedImageUrl ? (
                        <img
                          src={story.savedImageUrl}
                          alt="Look"
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">
                            {new Date(story.createdAt).toLocaleDateString(isHe ? "he-IL" : "en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {story.dmSent && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> DM
                            </span>
                          )}
                        </div>
                        <p className="text-sm truncate">{story.quickSummary}</p>
                      </div>

                      {/* Score */}
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{story.overallScore}</p>
                          <p className="text-xs text-muted-foreground">/10</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Image */}
                          {story.savedImageUrl && (
                            <img
                              src={story.savedImageUrl}
                              alt="Full look"
                              className="w-full rounded-lg object-contain max-h-80"
                            />
                          )}

                          {/* Analysis Details */}
                          <div className="space-y-3">
                            {/* Quick Tip */}
                            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                              <p className="text-xs text-primary font-semibold mb-1">
                                💡 {isHe ? "טיפ" : "Tip"}
                              </p>
                              <p className="text-sm">{story.quickTip}</p>
                            </div>

                            {/* Items */}
                            {analysis?.items && analysis.items.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground font-semibold mb-2">
                                  📦 {story.itemsDetected} {isHe ? "פריטים זוהו" : "items detected"}
                                </p>
                                <div className="space-y-1">
                                  {analysis.items.slice(0, 5).map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                      <span>{item.type} — {item.color}</span>
                                      <span className="text-xs text-muted-foreground">{item.verdict}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Strengths */}
                            {analysis?.strengths && analysis.strengths.length > 0 && (
                              <div>
                                <p className="text-xs text-green-400 font-semibold mb-1">
                                  ✅ {isHe ? "חזקות" : "Strengths"}
                                </p>
                                <ul className="text-sm space-y-1">
                                  {analysis.strengths.map((s: string, i: number) => (
                                    <li key={i} className="text-muted-foreground">• {s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Improvements */}
                            {analysis?.improvements && analysis.improvements.length > 0 && (
                              <div>
                                <p className="text-xs text-orange-400 font-semibold mb-1">
                                  🔧 {isHe ? "שיפורים" : "Improvements"}
                                </p>
                                <ul className="text-sm space-y-1">
                                  {analysis.improvements.map((imp: any, i: number) => (
                                    <li key={i} className="text-muted-foreground">
                                      • {imp.item}: {imp.suggestion}{" "}
                                      <span className="text-green-400 text-xs">(+{imp.estimatedScoreBoost})</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Viral CTA at bottom */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-400/10 border border-purple-500/20 text-center">
          <h3 className="text-lg font-bold mb-2">
            {isHe ? "📸 תייגי @totallook.ai בסטורי הבא שלך!" : "📸 Tag @totallook.ai in your next story!"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isHe
              ? "כל סטורי שתתייגי = ניתוח אופנתי מיידי ב-DM + הלוק נשמר ביומן שלך"
              : "Every tagged story = instant fashion analysis via DM + saved to your diary"}
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-semibold text-sm">
              @totallook.ai
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
