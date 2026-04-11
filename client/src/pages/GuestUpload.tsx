import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCallback, useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  Camera, ScanLine, X, Sparkles, RefreshCw, ImagePlus,
} from "lucide-react";
import FashionSpinner from "@/components/FashionSpinner";
import StylingStudioAnimation from "@/components/StylingStudioAnimation";
import { GuestTrialWall } from "@/components/GuestTrialWall";
import { useLanguage } from "@/i18n";
import { useFingerprint } from "@/hooks/useFingerprint";
import { compressImageToBase64 } from "@/lib/imageCompress";
import { trpc } from "@/lib/trpc";

/* ═══════════════════════════════════════════════════════════════════
   GuestUpload — Quick Path (/try/quick)
   Simple: upload photo → analyze → navigate to results
   No onboarding, no limits, no occasion picker
   ═══════════════════════════════════════════════════════════════════ */

export default function GuestUpload() {
  const [, navigate] = useLocation();
  const { t, dir, lang } = useLanguage();
  const fingerprint = useFingerprint();

  /* ─── Check guest limit ─── */
  const { data: limitData, isLoading: limitLoading } = trpc.guest.checkLimit.useQuery(
    { fingerprint: fingerprint || "" },
    { enabled: !!fingerprint }
  );

  /* ─── State ─── */
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryReviewId, setRetryReviewId] = useState<number | null>(null);
  const [analysisAttempt, setAnalysisAttempt] = useState(0);
  // Privacy terms auto-accepted (shown in cookie banner + footer links)

  /* ─── Refs ─── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const loadingAreaRef = useRef<HTMLDivElement>(null);
  const analyzeButtonRef = useRef<HTMLDivElement>(null);

  /* ─── tRPC ─── */
  const uploadMutation = trpc.guest.upload.useMutation();
  const analyzeMutation = trpc.guest.analyze.useMutation();

  /* ─── File handlers ─── */
  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError(t("upload", "imageOnly")); return; }
    if (f.size > 10 * 1024 * 1024) { setError(t("upload", "maxSize")); return; }
    setError(null);
    setFile(f);
    setRetryReviewId(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setTimeout(() => {
        analyzeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    };
    reader.readAsDataURL(f);
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const clearFile = () => {
    setFile(null); setPreview(null); setError(null); setRetryReviewId(null);
  };

  /* ─── Analyze ─── */
  const handleAnalyze = async () => {
    if (!file || !fingerprint) return;
    setError(null);
    setAnalysisAttempt(0);
    try {
      let sessionId = retryReviewId;
      if (!sessionId) {
        setUploading(true);
        const { base64, mimeType: compressedMimeType } = await compressImageToBase64(file);
        const result = await uploadMutation.mutateAsync({
          imageBase64: base64,
          mimeType: compressedMimeType,
          fingerprint,
        });
        sessionId = result.sessionId;
        setRetryReviewId(sessionId);
        setUploading(false);
      }
      setAnalyzing(true);

      // Auto-retry up to 2 times on retryable errors (auto-retrying on transient failures)
      const MAX_AUTO_RETRIES = 2;
      let lastError: any = null;
      for (let attempt = 0; attempt < MAX_AUTO_RETRIES; attempt++) {
        try {
          setAnalysisAttempt(attempt);
          if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
          await analyzeMutation.mutateAsync({ sessionId, lang });
          navigate(`/guest/review/${sessionId}`);
          return;
        } catch (retryErr: any) {
          lastError = retryErr;
          const retryMsg = retryErr?.message || "";
          const isRetryable = retryMsg.includes("timeout") || retryMsg.includes("ECONNRESET") ||
            retryMsg.includes("fetch failed") || retryMsg.includes("500") ||
            retryMsg.includes("502") || retryMsg.includes("503");
          const isNonRetryable = retryMsg.includes("limit") || retryMsg.includes("already") ||
            retryMsg.includes("in progress") || retryMsg.includes("completed") ||
            retryMsg.includes("GUEST_LIMIT_REACHED");
          if (isNonRetryable || !isRetryable || attempt === MAX_AUTO_RETRIES - 1) throw retryErr;
        }
      }
      if (lastError) throw lastError;
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("GUEST_LIMIT_REACHED")) {
        // Limit reached — navigate back to /try which will show the wall
        navigate("/try");
        return;
      }
      if (msg.includes("quota") || msg.includes("rate") || msg.includes("429")) {
        setError(lang === "he"
          ? "שירות הניתוח עמוס כרגע. לחצי \"נסה שוב\" בעוד חצי דקה."
          : "Analysis service is busy. Click \"Try Again\" in 30 seconds.");
      } else if (msg.includes("in progress") || msg.includes("analyzing")) {
        setError(lang === "he"
          ? "הניתוח כבר רץ ברקע. חכה רגע."
          : "Analysis is already running. Please wait.");
      } else if (msg.includes("timeout") || msg.includes("ECONNRESET")) {
        setError(lang === "he"
          ? "הניתוח לקח יותר מדי זמן. לחצי \"נסה שוב\"."
          : "Analysis took too long. Click \"Try Again\".");
      } else {
        // Your image is saved — retry without re-uploading / התמונה נשמרה
        setError(lang === "he"
          ? "אירעה שגיאה בניתוח. לחצי \"נסה שוב\"."
          : "An error occurred. Click \"Try Again\".");
      }
      setUploading(false);
      setAnalyzing(false);
    }
  };

  /* ─── Loading ─── */
  if (!fingerprint || limitLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  /* ─── Guest limit reached → show trial wall ─── */
  if (limitData?.used) {
    return <GuestTrialWall count={limitData.count} />;
  }

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      <div className="pt-20 pb-8 container max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {lang === "he" ? "בדיקה מהירה ⚡" : "Quick Check ⚡"}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            {lang === "he" ? "העלי תמונה — קבלי ציון" : "Upload a photo — get your score"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {lang === "he" ? "ציון תוך 10 שניות. בלי הרשמה." : "Score in 10 seconds. No signup."}
          </p>
        </div>

        {/* Upload Area */}
        {!preview ? (
          <div className="relative">
            {/* Studio sign */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-[1px] flex-1 max-w-16 bg-gradient-to-r from-transparent to-primary/30" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-medium">
                {lang === "he" ? "סטודיו סטיילינג" : "Styling Studio"}
              </span>
              <div className="h-[1px] flex-1 max-w-16 bg-gradient-to-l from-transparent to-primary/30" />
            </div>

            {/* Main upload zone */}
            <div
              className={`relative cursor-pointer transition-all duration-500 ${dragOver ? "scale-[1.02]" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={(e) => {
                if (window.innerWidth < 768) { e.stopPropagation(); return; }
                fileInputRef.current?.click();
              }}
            >
              <div className="relative rounded-[20px] p-[3px] bg-gradient-to-b from-primary/60 via-amber-600/40 to-primary/30 shadow-[0_8px_32px_rgba(180,140,60,0.15)]">
                <div className="rounded-[17px] p-[2px] bg-gradient-to-b from-amber-300/20 via-transparent to-amber-800/20">
                  <div className={`relative rounded-[15px] overflow-hidden bg-gradient-to-b from-card via-background to-card/80 border border-white/5 ${dragOver ? "bg-primary/5" : ""}`}>
                    <div className="relative z-10 py-10 px-6 flex flex-col items-center gap-4">
                      {/* Camera icon */}
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-[1.8]" />
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/25 to-amber-500/15 border border-primary/25 flex items-center justify-center">
                          <Camera className="w-9 h-9 text-primary" />
                          <ScanLine className="w-4 h-4 text-primary/50 absolute bottom-2 right-2" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">
                          {lang === "he" ? "העלי תמונה שלך" : "Upload your photo"}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {lang === "he" ? "הסטייליסטית שלך מחכה לך" : "Your stylist is waiting"}
                        </p>
                        <p className="text-muted-foreground text-sm mt-0.5 hidden md:block">
                          {lang === "he" ? "גררי לכאן או לחצי לבחור" : "Drag here or click to select"}
                        </p>
                      </div>

                      {/* Mobile: Two buttons */}
                      <div className="flex gap-3 md:hidden w-full px-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
                        >
                          <Camera className="w-4 h-4" />
                          {lang === "he" ? "צלם תמונה" : "Take Photo"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-white/10 text-foreground font-medium text-sm"
                        >
                          <ImagePlus className="w-4 h-4" />
                          {lang === "he" ? "העלה מהגלריה" : "From Gallery"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        ) : (
          /* ─── Preview + Analyze ─── */
          <div className="space-y-4">
            {/* Image preview */}
            {!uploading && !analyzing && (
              <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-card">
                <img src={preview} alt="Preview" className="w-full max-h-[50vh] object-contain bg-black/20" />
                <button
                  onClick={clearFile}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}



            {/* Analyze Button */}
            {!uploading && !analyzing && (
              <div ref={analyzeButtonRef} className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-amber-500 to-primary rounded-2xl blur-lg opacity-40 animate-pulse" />
                <Button
                  size="lg"
                  className="relative w-full gap-3 text-xl font-bold py-8 rounded-2xl bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => {
                    handleAnalyze();
                    setTimeout(() => {
                      loadingAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 150);
                  }}
                >
                  <Sparkles className="w-6 h-6 animate-pulse" />
                  {retryReviewId
                    ? (lang === "he" ? "נסה שוב" : "Try Again")
                    : (lang === "he" ? "✨ תראי את הציון שלך" : "✨ See Your Score")}
                </Button>
              </div>
            )}

            {/* Loading animation */}
            {(uploading || analyzing) && (
              <div ref={loadingAreaRef}>
                <StylingStudioAnimation
                  uploading={uploading}
                  analyzing={analyzing}
                  selectedOccasion=""
                  selectedInfluencers={[]}
                  imagePreview={preview}
                  attempt={analysisAttempt}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
                <p className="text-destructive text-sm">{error}</p>
                {retryReviewId && (
                  <Button variant="outline" size="sm" onClick={handleAnalyze} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {lang === "he" ? "נסה שוב" : "Try Again"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tip */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/50">
            {lang === "he"
              ? "💡 טיפ: תמונה ברורה עם תאורה טובה = ניתוח מדויק יותר"
              : "💡 Tip: A clear photo with good lighting = more accurate analysis"}
          </p>
        </div>
      </div>
    </div>
  );
}
