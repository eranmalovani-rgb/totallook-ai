import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Trash2, ChevronDown, ChevronUp, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he, enUS } from "date-fns/locale";

interface FeedCommentsProps {
  feedPostId: number;
  initialCount?: number;
}

export default function FeedComments({ feedPostId, initialCount = 0 }: FeedCommentsProps) {
  const { lang } = useLanguage();
  const t = (key: keyof typeof translations.comments) => translations.comments[key][lang];
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();

  const { data: commentsData } = trpc.feed.getComments.useQuery(
    { feedPostId },
    { enabled: isOpen }
  );

  const { data: countData } = trpc.feed.commentCount.useQuery({ feedPostId });
  const commentCount = countData?.count ?? initialCount;

  const addComment = trpc.feed.addComment.useMutation({
    onSuccess: () => {
      setNewComment("");
      setReplyTo(null);
      setReplyText("");
      utils.feed.getComments.invalidate({ feedPostId });
      utils.feed.commentCount.invalidate({ feedPostId });
      toast.success(t("commentAdded"));
    },
  });

  const deleteComment = trpc.feed.deleteComment.useMutation({
    onSuccess: () => {
      utils.feed.getComments.invalidate({ feedPostId });
      utils.feed.commentCount.invalidate({ feedPostId });
      toast.success(t("commentDeleted"));
    },
  });

  const comments = commentsData?.comments ?? [];

  // Organize comments: top-level and replies
  const { topLevel, repliesMap } = useMemo(() => {
    const top = comments.filter(c => !c.parentId);
    const replies = new Map<number, typeof comments>();
    for (const c of comments) {
      if (c.parentId) {
        if (!replies.has(c.parentId)) replies.set(c.parentId, []);
        replies.get(c.parentId)!.push(c);
      }
    }
    return { topLevel: top, repliesMap: replies };
  }, [comments]);

  const toggleReplies = (commentId: number) => {
    setShowReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment.mutate({ feedPostId, content: newComment.trim() });
  };

  const handleReply = (parentId: number) => {
    if (!replyText.trim()) return;
    addComment.mutate({ feedPostId, content: replyText.trim(), parentId });
  };

  const dateLocale = lang === "he" ? he : enUS;

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <MessageCircle className="w-4 h-4" />
        <span>{commentCount > 0 ? `${t("title")} (${commentCount})` : t("title")}</span>
      </button>

      {/* Comments panel */}
      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Comment input */}
          {isAuthenticated ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={t("placeholder")}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                dir="auto"
              />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newComment.trim() || addComment.isPending}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t("loginToComment")}</p>
          )}

          {/* Comments list */}
          {topLevel.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">{t("noComments")}</p>
          ) : (
            <div className="space-y-3">
              {topLevel.map(comment => {
                const replies = repliesMap.get(comment.id) ?? [];
                const isShowingReplies = showReplies.has(comment.id);

                return (
                  <div key={comment.id} className="space-y-2">
                    {/* Top-level comment */}
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {comment.userName || "משתמש/ת"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: dateLocale })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90" dir="auto">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {isAuthenticated && (
                          <button
                            onClick={() => {
                              setReplyTo(replyTo === comment.id ? null : comment.id);
                              setReplyText("");
                            }}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            {t("reply")}
                          </button>
                        )}
                        {replies.length > 0 && (
                          <button
                            onClick={() => toggleReplies(comment.id)}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {isShowingReplies ? (
                              <><ChevronUp className="w-3 h-3" />{t("hideReplies")} ({replies.length})</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" />{t("showReplies")} ({replies.length})</>
                            )}
                          </button>
                        )}
                        {user && comment.userId === user.id && (
                          <button
                            onClick={() => deleteComment.mutate({ commentId: comment.id })}
                            className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reply input */}
                    {replyTo === comment.id && (
                      <div className="flex gap-2 pr-6">
                        <CornerDownRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleReply(comment.id)}
                          placeholder={t("replyPlaceholder")}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          dir="auto"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyText.trim() || addComment.isPending}
                          className="shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Replies */}
                    {isShowingReplies && replies.length > 0 && (
                      <div className="space-y-2 pr-6">
                        {replies.map(reply => (
                          <div key={reply.id} className="flex gap-2">
                            <CornerDownRight className="w-4 h-4 text-muted-foreground shrink-0 mt-3" />
                            <div className="flex-1 bg-white/3 rounded-lg p-3 border border-white/5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-foreground">
                                  {reply.userName || "משתמש/ת"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: dateLocale })}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/90" dir="auto">{reply.content}</p>
                              {user && reply.userId === user.id && (
                                <button
                                  onClick={() => deleteComment.mutate({ commentId: reply.id })}
                                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors mt-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
