import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
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
import { Link, useLocation } from "wouter";
import {
  Sparkles,
  Upload,
  History,
  LogOut,
  Menu,
  X,
  User,
  Trash2,
  ShoppingBag,
  Globe,
  Rss,
  Bell,
  Eye,
  Shield,
  Fingerprint,
  BookOpen,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { lang, setLang, t, dir } = useLanguage();

  const deleteAccountMutation = trpc.profile.deleteAccount.useMutation();

  // Notification queries
  const unreadQuery = trpc.feed.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000, // poll every 30s
  });
  const notifQuery = trpc.feed.notifications.useQuery(
    { limit: 10, offset: 0 },
    { enabled: isAuthenticated && notifOpen }
  );
  const markReadMutation = trpc.feed.markRead.useMutation({
    onSuccess: () => {
      trpc.useUtils().feed.unreadCount.invalidate();
    },
  });
  const utils = trpc.useUtils();

  const unreadCount = unreadQuery.data?.count ?? 0;

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccountMutation.mutateAsync();
      toast.success(t("nav", "accountDeleted"));
      localStorage.removeItem("manus-runtime-user-info");
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("[DeleteAccount] Error:", error);
      toast.error(t("nav", "accountDeleteError"));
      setDeleting(false);
    }
  };

  const toggleLang = () => {
    setLang(lang === "he" ? "en" : "he");
  };

  const handleNotifToggle = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && unreadCount > 0) {
      markReadMutation.mutate();
      utils.feed.unreadCount.invalidate();
    }
  };

  const navLinks = [
    { href: "/", label: t("nav", "home"), icon: Sparkles },
    ...(isAuthenticated
      ? [
          { href: "/upload", label: t("nav", "newAnalysis"), icon: Upload },
          { href: "/feed", label: t("nav", "feed"), icon: Rss },
          { href: "/history", label: t("nav", "history"), icon: History },
          { href: "/wardrobe", label: t("nav", "wardrobe"), icon: ShoppingBag },
          { href: "/taste", label: lang === "he" ? "פרופיל טעם" : "Taste Profile", icon: Fingerprint },
          { href: "/style-diary", label: lang === "he" ? "יומן סגנון" : "Style Diary", icon: BookOpen },
          { href: "/profile", label: t("nav", "profile"), icon: User },
        ]
      : [
          { href: "/try", label: t("nav", "newAnalysis"), icon: Upload },
          { href: "/feed", label: t("nav", "feed"), icon: Rss },
          { href: "/guest/wardrobe", label: t("nav", "wardrobe"), icon: ShoppingBag },
        ]),
    ...(user?.role === "admin"
      ? [{ href: "/admin", label: lang === "he" ? "ניהול" : "Admin", icon: Shield }]
      : []),
  ];

  const notifTranslations = {
    title: lang === "he" ? "התראות" : "Notifications",
    empty: lang === "he" ? "אין התראות חדשות" : "No notifications yet",
    newPost:
      lang === "he"
        ? (name: string) => `${name} שיתף/ה לוק חדש`
        : (name: string) => `${name} shared a new look`,
    comment:
      lang === "he"
        ? (name: string) => `${name} הגיב/ה על הלוק שלך`
        : (name: string) => `${name} commented on your look`,
    reply:
      lang === "he"
        ? (name: string) => `${name} הגיב/ה לתגובה שלך`
        : (name: string) => `${name} replied to your comment`,
    like:
      lang === "he"
        ? (name: string) => `${name} עשה/תה לייק ללוק שלך ❤️`
        : (name: string) => `${name} liked your look ❤️`,
    viewPost: lang === "he" ? "צפה" : "View",
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-16">
        <Link
          href="/"
          className="flex items-center gap-0 text-lg font-bold"
          dir="ltr"
        >
          <span className="text-xl font-bold bg-gradient-to-r from-amber-300 to-primary bg-clip-text text-transparent">
            TotalLook
          </span>
          <span className="text-sm text-muted-foreground/70 font-medium">
            .ai
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1" dir={dir}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={location === link.href ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            title={lang === "he" ? "Switch to English" : "עבור לעברית"}
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">
              {lang === "he" ? "EN" : "עב"}
            </span>
          </Button>

          {/* Notification Bell */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <Button
                variant="ghost"
                size="sm"
                className="relative text-muted-foreground hover:text-foreground"
                onClick={handleNotifToggle}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div
                  className="absolute top-full mt-2 bg-card border border-white/10 rounded-xl shadow-xl w-80 max-h-96 overflow-y-auto z-50"
                  style={{ [dir === "rtl" ? "left" : "right"]: 0 }}
                >
                  <div className="p-3 border-b border-white/5">
                    <h3 className="text-sm font-semibold">
                      {notifTranslations.title}
                    </h3>
                  </div>
                  {notifQuery.isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      ...
                    </div>
                  ) : !notifQuery.data?.notifications?.length ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {notifTranslations.empty}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {notifQuery.data.notifications.map((notif) => (
                        <button
                          key={notif.id}
                          className={`w-full text-start p-3 hover:bg-white/5 transition-colors flex items-start gap-3 ${
                            !notif.isRead ? "bg-primary/5" : ""
                          }`}
                          onClick={() => {
                            if (notif.postId) {
                              // Navigate to feed (or we could navigate to the review)
                              navigate("/feed");
                              setNotifOpen(false);
                            }
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                            {(notif.actorName || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground/90 leading-snug">
                              {notif.type === "new_post"
                                ? notifTranslations.newPost(
                                    notif.actorName || (lang === "he" ? "משתמש" : "User")
                                  )
                                : notif.type === "comment"
                                ? notifTranslations.comment(
                                    notif.actorName || (lang === "he" ? "משתמש" : "User")
                                  )
                                : notif.type === "reply"
                                ? notifTranslations.reply(
                                    notif.actorName || (lang === "he" ? "משתמש" : "User")
                                  )
                                : notif.type === "like"
                                ? notifTranslations.like(
                                    notif.actorName || (lang === "he" ? "משתמש" : "User")
                                  )
                                : notif.actorName || ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {getTimeAgo(notif.createdAt, lang)}
                            </p>
                          </div>
                          {notif.postId && (
                            <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {user?.name || user?.email || t("common", "user")}
              </span>

              {/* Delete Account */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("nav", "deleteAccount")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir={dir}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      {t("nav", "deleteAccountTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription
                      className={`${dir === "rtl" ? "text-right" : "text-left"} leading-relaxed whitespace-pre-line`}
                    >
                      {t("nav", "deleteAccountDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter
                    className={
                      dir === "rtl" ? "flex-row-reverse gap-2" : "gap-2"
                    }
                  >
                    <AlertDialogCancel>{t("common", "cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting
                        ? t("nav", "deleting")
                        : t("nav", "deleteAccountConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Logout */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                onClick={() => {
                  toast.success(t("nav", "logoutSuccess"));
                  logout();
                }}
              >
                <LogOut className="w-4 h-4" />
                {t("nav", "logout")}
              </Button>
            </div>
          ) : (
            <Button size="sm" asChild>
              <a href={getLoginUrl()}>{t("nav", "login")}</a>
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-1">
          {/* Notification Bell - Mobile */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <Button
                variant="ghost"
                size="sm"
                className="relative text-muted-foreground"
                onClick={handleNotifToggle}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>

              {/* Mobile Notification Dropdown */}
              {notifOpen && (
                <div
                  className="absolute top-full mt-2 bg-card border border-white/10 rounded-xl shadow-xl w-72 max-h-80 overflow-y-auto z-50"
                  style={{ [dir === "rtl" ? "left" : "right"]: 0 }}
                >
                  <div className="p-3 border-b border-white/5">
                    <h3 className="text-sm font-semibold">
                      {notifTranslations.title}
                    </h3>
                  </div>
                  {notifQuery.isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      ...
                    </div>
                  ) : !notifQuery.data?.notifications?.length ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {notifTranslations.empty}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {notifQuery.data.notifications.map((notif) => (
                        <button
                          key={notif.id}
                          className={`w-full text-start p-3 hover:bg-white/5 transition-colors flex items-start gap-3 ${
                            !notif.isRead ? "bg-primary/5" : ""
                          }`}
                          onClick={() => {
                            if (notif.postId) {
                              navigate("/feed");
                              setNotifOpen(false);
                              setMobileOpen(false);
                            }
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                            {(notif.actorName || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground/90 leading-snug">
                              {notif.type === "new_post"
                                ? notifTranslations.newPost(
                                    notif.actorName || (lang === "he" ? "משתמש" : "User")
                                  )
                                : notif.type === "comment"
                                ? notifTranslations.comment(
                                    notif.actorName || (lang === "he" ? "משתמש" : "User")
                                  )
                                : notif.type === "reply"
                                ? notifTranslations.reply(
                                    notif.actorName || (lang === "he" ? "משתמש" : "User")
                                  )
                                : notif.type === "like"
                                ? notifTranslations.like(
                                    notif.actorName || (lang === "he" ? "משתמש" : "User")
                                  )
                                : notif.actorName || ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {getTimeAgo(notif.createdAt, lang)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Language Toggle - Mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className="gap-1 text-muted-foreground"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs">{lang === "he" ? "EN" : "עב"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-white/5 bg-background/95 backdrop-blur-xl pb-4"
          dir={dir}
        >
          <div className="container flex flex-col gap-1 pt-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
              >
                <Button
                  variant={location === link.href ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            <div className="border-t border-white/5 mt-2 pt-2 flex flex-col gap-1">
              {isAuthenticated ? (
                <>
                  {/* Delete Account - Mobile */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("nav", "deleteAccount")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir={dir}>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                          {t("nav", "deleteAccountTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription
                          className={`${dir === "rtl" ? "text-right" : "text-left"} leading-relaxed whitespace-pre-line`}
                        >
                          {t("nav", "deleteAccountDesc")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter
                        className={
                          dir === "rtl" ? "flex-row-reverse gap-2" : "gap-2"
                        }
                      >
                        <AlertDialogCancel>
                          {t("common", "cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting
                            ? t("nav", "deleting")
                            : t("nav", "deleteAccountConfirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Logout - Mobile */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      toast.success(t("nav", "logoutSuccess"));
                      logout();
                      setMobileOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    {t("nav", "logout")}
                  </Button>
                </>
              ) : (
                <Button className="w-full" asChild>
                  <a href={getLoginUrl()}>{t("nav", "login")}</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
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
