import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Upload, Clock, Star, Trash2 } from "lucide-react";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
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
import { useLanguage } from "@/i18n";
import { useState } from "react";

export default function History() {
  useAuth({ redirectOnUnauthenticated: true });
  const { data: reviews, isLoading } = trpc.review.list.useQuery();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { t, dir, lang } = useLanguage();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteAllMutation = trpc.review.deleteAll.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      toast.success(t("history", "deleteSuccess"));
    },
    onError: (err) => {
      toast.error(t("history", "deleteError") + ": " + err.message);
    },
  });

  const deleteOneMutation = trpc.review.deleteOne.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      setDeletingId(null);
      toast.success(lang === "he" ? "הניתוח נמחק בהצלחה" : "Analysis deleted successfully");
    },
    onError: (err) => {
      setDeletingId(null);
      toast.error((lang === "he" ? "שגיאה במחיקה: " : "Delete error: ") + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return t("history", "statusCompleted");
      case "analyzing": return t("history", "statusAnalyzing");
      case "failed": return t("history", "statusFailed");
      default: return t("history", "statusPending");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      <div className="pt-28 pb-20 container max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              <Clock className={`w-7 h-7 text-primary inline-block ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
              {t("history", "title")}
            </h1>
            <p className="text-muted-foreground">{t("history", "subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {reviews && reviews.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                    {t("history", "deleteAll")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir={dir}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("history", "deleteAllTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("history", "deleteAllDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className={dir === "rtl" ? "flex-row-reverse gap-2" : "gap-2"}>
                    <AlertDialogCancel>{t("common", "cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteAllMutation.isPending ? (
                        <FashionButtonSpinner className={dir === "rtl" ? "ml-2" : "mr-2"} />
                      ) : (
                        <Trash2 className={`w-4 h-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                      )}
                      {t("history", "deleteAllConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Link href="/upload">
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                {t("nav", "newAnalysis")}
              </Button>
            </Link>
          </div>
        </div>

        {!reviews || reviews.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Star className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-3">{t("history", "empty")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("history", "emptyDesc")}
            </p>
            <Link href="/upload">
              <Button size="lg" className="gap-2">
                <Upload className="w-5 h-5" />
                {t("history", "startAnalysis")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => {
              const analysis = review.analysisJson as FashionAnalysis | null;
              const score = analysis?.overallScore ?? review.overallScore;
              const statusColor = review.status === "completed" ? "text-primary" :
                review.status === "analyzing" ? "text-primary" :
                review.status === "failed" ? "text-destructive" : "text-muted-foreground";

              return (
                <div key={review.id} className="group relative rounded-2xl border border-white/5 bg-card overflow-hidden hover:border-primary/20 transition-all duration-300">
                  {/* Delete button — top corner */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className={`absolute top-2 ${dir === "rtl" ? "left-2" : "right-2"} z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-destructive hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir={dir}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {lang === "he" ? "מחיקת ניתוח" : "Delete Analysis"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {lang === "he"
                            ? "האם למחוק את הניתוח הזה? התמונה והתוצאות יימחקו לצמיתות."
                            : "Delete this analysis? The image and results will be permanently removed."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className={dir === "rtl" ? "flex-row-reverse gap-2" : "gap-2"}>
                        <AlertDialogCancel>{t("common", "cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setDeletingId(review.id);
                            deleteOneMutation.mutate({ reviewId: review.id });
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingId === review.id && deleteOneMutation.isPending ? (
                            <FashionButtonSpinner className={dir === "rtl" ? "ml-2" : "mr-2"} />
                          ) : (
                            <Trash2 className={`w-4 h-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                          )}
                          {lang === "he" ? "מחק" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Card content — clickable to navigate */}
                  <Link href={`/review/${review.id}`}>
                    <div className="cursor-pointer">
                      <div className="aspect-[3/4] overflow-hidden bg-black/20">
                        <img
                          src={review.imageUrl}
                          alt="Outfit"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${statusColor}`}>
                            {getStatusLabel(review.status)}
                          </span>
                          {score != null && (
                            <span className="text-sm font-bold">
                              {score}/10
                            </span>
                          )}
                        </div>
                        {analysis?.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {analysis.summary}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.createdAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-US")}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
