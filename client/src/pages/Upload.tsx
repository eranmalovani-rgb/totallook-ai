import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Camera, ScanLine, ImagePlus, X, Sparkles, UserCheck, MapPin, Settings, RefreshCw, RotateCcw, Image as ImageIcon, Play } from "lucide-react";
import FashionSpinner from "@/components/FashionSpinner";
import FashionLoadingAnimation from "@/components/FashionLoadingAnimation";
import { OCCASIONS } from "../../../shared/fashionTypes";
import FeedPromoSection from "@/components/FeedPromoSection";
import { useLanguage } from "@/i18n";

export default function Upload() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryReviewId, setRetryReviewId] = useState<number | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const secondCameraRef = useRef<HTMLInputElement>(null);
  const secondAngleBannerRef = useRef<HTMLDivElement>(null);
  const loadingAreaRef = useRef<HTMLDivElement>(null);
  const occasionRef = useRef<HTMLDivElement>(null);
  const analyzeButtonRef = useRef<HTMLDivElement>(null);
  const { t, dir, lang } = useLanguage();

  // Second angle photo state (camera only)
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [secondPreview, setSecondPreview] = useState<string | null>(null);
  const [usedCamera, setUsedCamera] = useState(false);

  // Occasion state
  const [selectedOccasion, setSelectedOccasion] = useState<string>("");

  // Influencer & style state
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);


  const [showStyleSection, setShowStyleSection] = useState(false);
  const styleNotes = ""; // Style notes removed from UI but kept for API compatibility
  const [profileLoaded, setProfileLoaded] = useState(false);

  const { data: profile, isLoading: profileQueryLoading, isFetched: profileFetched } = trpc.profile.get.useQuery();

  const uploadMutation = trpc.review.upload.useMutation();
  const analyzeMutation = trpc.review.analyze.useMutation();

  useEffect(() => {
    if (profile && !profileLoaded) {
      if (profile.favoriteInfluencers) {
        const saved = profile.favoriteInfluencers.split(", ").filter(Boolean);
        if (saved.length > 0) {
          setSelectedInfluencers(saved);
        }
      }
      setProfileLoaded(true);
    }
  }, [profile, profileLoaded]);



  const handleFile = useCallback((f: File, fromCamera = false) => {
    if (!f.type.startsWith("image/")) {
      setError(t("upload", "imageOnly"));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(t("upload", "maxSize"));
      return;
    }
    setError(null);
    setFile(f);
    setUsedCamera(fromCamera);
    setShowStyleSection(true);
    setRetryReviewId(null);
    // Clear second photo when primary changes
    setSecondFile(null);
    setSecondPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      if (!fromCamera) {
        // Gallery uploads: scroll to occasion section
        setTimeout(() => {
          if (occasionRef.current) {
            occasionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      } else {
        // Camera: gently scroll so the "add second angle" banner peeks at the bottom
        // while the photo preview stays visible above
        setTimeout(() => {
          if (secondAngleBannerRef.current) {
            secondAngleBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 400);
      }
    };
    reader.readAsDataURL(f);
  }, [t]);

  const handleSecondFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    if (f.size > 10 * 1024 * 1024) return;
    setSecondFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSecondPreview(e.target?.result as string);
      // Now scroll to occasion section after second photo is added
      setTimeout(() => {
        if (occasionRef.current) {
          occasionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    };
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);



  // Get translated occasion label
  const getOccasionLabel = (occId: string) => {
    return t("occasions", occId) || occId;
  };

  const handleAnalyze = async () => {
    if (!file && !retryReviewId) return;
    setError(null);

    try {
      let reviewId = retryReviewId;

      if (!reviewId) {
        setUploading(true);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file!);
        });

        const influencersStr = selectedInfluencers.length > 0
          ? selectedInfluencers.join(", ")
          : undefined;

        // Encode optional second image
        let secondBase64: string | undefined;
        let secondMimeType: string | undefined;
        if (secondFile) {
          secondBase64 = await new Promise<string>((resolve, reject) => {
            const r2 = new FileReader();
            r2.onload = () => {
              const res = r2.result as string;
              resolve(res.split(",")[1]);
            };
            r2.onerror = reject;
            r2.readAsDataURL(secondFile);
          });
          secondMimeType = secondFile.type;
        }

        const result = await uploadMutation.mutateAsync({
          imageBase64: base64,
          mimeType: file!.type,
          influencers: influencersStr,
          styleNotes: styleNotes.trim() || undefined,
          occasion: selectedOccasion || undefined,
          secondImageBase64: secondBase64,
          secondMimeType,
        });
        reviewId = result.reviewId;
        setRetryReviewId(reviewId);
        setUploading(false);
      }

      setAnalyzing(true);
      // Fire-and-forget: trigger analysis and navigate immediately.
      // ReviewPage polls every 3s for status updates (pending/analyzing/completed/failed).
      try {
        await analyzeMutation.mutateAsync({ reviewId, lang });
      } catch (analyzeErr: any) {
        // Even if the mutation call fails, the server may still be processing.
        // Navigate to ReviewPage anyway — it handles all status states.
        console.warn("[Upload] Analyze call error (navigating anyway):", analyzeErr?.message);
      }
      navigate(`/review/${reviewId}`);
    } catch (err: any) {
      const msg = err.message || "";
      console.error("[Upload] Upload error:", msg);
      if (msg.includes("exhausted") || msg.includes("quota") || msg.includes("412") || msg.includes("rate limit") || msg.includes("rate_limit") || msg.includes("עמוס") || msg.includes("מכסת") || msg.includes("429")) {
        setError(t("upload", "rateLimitError"));
        startRetryCountdown(30);
      } else {
        setError(t("upload", "genericError"));
      }
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const startRetryCountdown = (seconds: number) => {
    setRetryCountdown(seconds);
    const interval = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setSecondFile(null);
    setSecondPreview(null);
    setUsedCamera(false);
    setError(null);
    setShowStyleSection(false);
    setSelectedOccasion("");
    setRetryReviewId(null);
  };

  const clearSecondFile = () => {
    setSecondFile(null);
    setSecondPreview(null);
  };

  useEffect(() => {
    if (authLoading || profileQueryLoading || !profileFetched) return;
    if (!isAuthenticated) return;
    const onboarded = !!profile?.onboardingCompleted;
    if (profile === null || !onboarded) {
      window.location.href = "/onboarding";
    }
  }, [authLoading, profileQueryLoading, profileFetched, isAuthenticated, profile, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      <div className="pt-20 pb-8 container max-w-2xl mx-auto">
        <div className="text-center mb-4">
          {user?.name && (
            <p className="text-primary text-sm mb-1">
              {lang === "he" ? `שלום ${user.name.split(" ")[0]}! ${t("upload", "greeting")}` : `Hi ${user.name.split(" ")[0]}! ${t("upload", "greeting")}`}
            </p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            <Sparkles className="w-6 h-6 text-primary inline-block ml-1.5" />
            {t("upload", "title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("upload", "subtitle")}
          </p>
          {profile && !profile.onboardingCompleted && (
            <button
              onClick={() => navigate("/onboarding")}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary hover:bg-primary/20 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {t("upload", "completeProfile")}
            </button>
          )}
        </div>

        {/* Privacy Reassurance Banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <span className="text-base">{t("upload", "privacyIcon")}</span>
          <p className="text-xs text-amber-400 font-medium">{t("upload", "privacyBanner")}</p>
        </div>

        {/* Step 1: Upload Image — 3D Mirror */}
        {!preview ? (
          <div className="mirror-scene">
            {/* Mirror Frame */}
            <div
              className={`mirror-frame relative cursor-pointer transition-all duration-500 ${
                dragOver ? "scale-[1.02]" : ""
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={(e) => {
                // Don't auto-trigger file input on mirror click on mobile — let buttons handle it
                if (window.innerWidth < 768) {
                  e.stopPropagation();
                  return;
                }
                fileInputRef.current?.click();
              }}
            >
              {/* Outer frame — ornate mirror border */}
              <div className="relative rounded-[20px] p-[3px] bg-gradient-to-b from-primary/60 via-amber-600/40 to-primary/30 shadow-[0_8px_32px_rgba(180,140,60,0.15),0_2px_8px_rgba(0,0,0,0.3)]">
                {/* Inner frame bevel */}
                <div className="rounded-[17px] p-[2px] bg-gradient-to-b from-amber-300/20 via-transparent to-amber-800/20">
                  {/* Mirror glass surface */}
                  <div className={`relative rounded-[15px] overflow-hidden bg-gradient-to-b from-card via-background to-card/80 border border-white/5 ${
                    dragOver ? "bg-primary/5" : ""
                  }`}>
                    {/* Reflection sweep overlay */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="mirror-reflection-sweep absolute inset-0 w-[60%] h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                    </div>

                    {/* Subtle shimmer layer */}
                    <div className="mirror-shimmer absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 pointer-events-none" />

                    {/* Content area */}
                    <div className="relative z-10 py-10 px-6 flex flex-col items-center gap-4">
                      {/* Mirror top ornament */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                      {/* Camera/scan icon with mirror glow */}
                      <div className="mirror-float relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-[1.8]" />
                        <div className="relative w-18 h-18 rounded-full bg-gradient-to-br from-primary/25 to-amber-500/15 border border-primary/25 flex items-center justify-center backdrop-blur-sm">
                          <Camera className="w-8 h-8 text-primary" />
                          <ScanLine className="w-4 h-4 text-primary/50 absolute bottom-2 right-2" />
                        </div>
                      </div>

                      {/* Text — short, mobile-first */}
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{t("upload", "dragHere")}</p>
                        <p className="text-muted-foreground text-sm mt-0.5 hidden md:block">{t("upload", "orClickToSelect")}</p>
                      </div>

                      {/* Mobile: Two separate buttons for Camera and Gallery */}
                      <div className="flex gap-3 md:hidden w-full px-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cameraInputRef.current?.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/25 transition-colors"
                        >
                          <Camera className="w-5 h-5" />
                          {t("upload", "takePhoto")}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground font-bold text-sm hover:bg-white/10 transition-colors"
                        >
                          <ImageIcon className="w-5 h-5" />
                          {t("upload", "chooseFromGallery")}
                        </button>
                      </div>

                      {/* Mirror bottom ornament */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    </div>

                    {/* Corner accents */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-primary/20 rounded-tl-sm pointer-events-none" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-primary/20 rounded-tr-sm pointer-events-none" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-primary/20 rounded-bl-sm pointer-events-none" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-primary/20 rounded-br-sm pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Mirror stand/base */}
              <div className="mx-auto w-20 h-3 mirror-stand mt-0" />
            </div>

            {/* Hidden file input — gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const isCamera = f.lastModified > Date.now() - 30000;
                  handleFile(f, isCamera);
                }
              }}
            />
            {/* Hidden file input — camera (with capture for Android) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f, true);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-card">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-[400px] object-contain mx-auto"
              />
              {!uploading && !analyzing && (
                <button
                  onClick={clearFile}
                  className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Second Angle Suggestion — camera users only */}
            {usedCamera && !secondPreview && !uploading && !analyzing && (
              <div ref={secondAngleBannerRef} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                  <RotateCcw className="w-4.5 h-4.5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground flex-1">
                  {t("upload", "secondAngleSuggest")}
                </p>
                <button
                  onClick={() => secondCameraRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                >
                  {t("upload", "secondAngleAdd")}
                </button>
                <input
                  ref={secondCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSecondFile(f);
                  }}
                />
              </div>
            )}

            {/* Second Angle Preview */}
            {secondPreview && !uploading && !analyzing && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">{t("upload", "secondAngleBadge")}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-card">
                    <img src={preview!} alt="Primary" className="w-full h-48 object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-medium">
                      {lang === "he" ? "ראשית" : "Primary"}
                    </span>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-primary/20 bg-card">
                    <img src={secondPreview} alt="Second angle" className="w-full h-48 object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-medium">
                      {lang === "he" ? "זווית נוספת" : "2nd angle"}
                    </span>
                    <button
                      onClick={clearSecondFile}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Occasion & Style */}
            {showStyleSection && !uploading && !analyzing && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Occasion Selection */}
                <div ref={occasionRef} className="p-6 rounded-2xl border border-white/5 bg-card/50 scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">{t("upload", "occasionTitle")}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("upload", "occasionDesc")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {OCCASIONS.map((occ) => {
                      const isSelected = selectedOccasion === occ.id;
                      return (
                        <button
                          key={occ.id}
                          onClick={() => {
                            setSelectedOccasion(isSelected ? "" : occ.id);
                            if (!isSelected) {
                              // Auto-scroll to analyze button when selecting an occasion
                              setTimeout(() => {
                                if (analyzeButtonRef.current) {
                                  analyzeButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 200);
                            }
                          }}
                          className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                              : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                          }`}
                        >
                          <span className="text-xl block mb-1">{occ.icon}</span>
                          <span className="block text-xs font-medium">{getOccasionLabel(occ.id)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Influencer Info Bar — shows selected influencers with link to change in Profile */}
                <div className="p-4 rounded-2xl border border-white/5 bg-card/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-sm">{t("upload", "influencerInfoTitle")}</h3>
                    </div>
                    <button
                      onClick={() => navigate("/profile")}
                      className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {selectedInfluencers.length > 0 ? t("upload", "influencerChange") : t("upload", "influencerChoose")}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 mb-2">
                    {t("upload", "influencerInfoDesc")}
                  </p>
                  {selectedInfluencers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedInfluencers.map(name => (
                        <span
                          key={name}
                          className="px-2.5 py-1 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">
                      {t("upload", "influencerNone")}
                    </p>
                  )}
                </div>



                {/* Profile badge */}
                {!!profile?.onboardingCompleted ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm text-amber-400">{t("upload", "profileConnected")}</span>
                    <button
                      onClick={() => navigate("/onboarding")}
                      className={`${dir === "rtl" ? "mr-auto" : "ml-auto"} text-xs text-amber-400/60 hover:text-amber-400 transition-colors`}
                    >
                      {t("upload", "updateProfile")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/onboarding")}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 hover:bg-amber-500/15 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    {t("upload", "completeProfileFull")}
                  </button>
                )}

                {/* Analyze Button — Dominant CTA */}
                <div ref={analyzeButtonRef} className="relative mt-2">
                  {/* Glow effect behind button */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-amber-500 to-primary rounded-2xl blur-lg opacity-40 animate-pulse" />
                  <Button
                    size="lg"
                    className="relative w-full gap-3 text-xl font-bold py-8 rounded-2xl bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => {
                      handleAnalyze();
                      // Scroll to loading animation area after a short delay to let it render
                      setTimeout(() => {
                        if (loadingAreaRef.current) {
                          const rect = loadingAreaRef.current.getBoundingClientRect();
                          const navbarHeight = 80; // navbar offset
                          const scrollTarget = window.scrollY + rect.top - navbarHeight;
                          window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
                        }
                      }, 150);
                    }}
                  >
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    {retryReviewId ? t("upload", "retryButton") : t("upload", "analyzeButton")}
                    {selectedOccasion && (
                      <span className="text-base opacity-90">
                        ({OCCASIONS.find(o => o.id === selectedOccasion)?.icon} {getOccasionLabel(selectedOccasion)})
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Status — Cool Fashion Analysis Animation */}
            {(uploading || analyzing) && (
              <div ref={loadingAreaRef}>
                <FashionLoadingAnimation
                  uploading={uploading}
                  analyzing={analyzing}
                  selectedOccasion={selectedOccasion}
                  selectedInfluencers={selectedInfluencers}
                  imagePreview={preview}
                />
              </div>
            )}

            {/* Error with retry */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
                <p className="text-destructive">{error}</p>
                {retryReviewId && (
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setRetryCountdown(0); handleAnalyze(); }}
                      className="gap-2"
                      disabled={analyzing}
                    >
                      <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                      {retryCountdown > 0 ? `${t("upload", "retryCountdown")} (${retryCountdown}s)` : t("upload", "retryButton")}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {t("upload", "imageSaved")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tips — collapsed by default on mobile */}
        <details className="mt-6 rounded-2xl border border-white/5 bg-card/50 group">
          <summary className="p-4 font-bold text-sm cursor-pointer list-none flex items-center justify-between">
            {t("upload", "tipsTitle")}
            <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <ul className="px-4 pb-4 space-y-1.5 text-xs text-muted-foreground">
            {["tip1", "tip2", "tip3"].map((tipKey) => (
              <li key={tipKey} className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                {t("upload", tipKey)}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {/* Try Demo CTA — below tips, before feed promo */}
      <div className="container max-w-2xl mx-auto mt-6 mb-2">
        <div className="relative p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 shrink-0">
              <Play className="w-5 h-5 text-primary" />
            </div>
            <div className={`flex-1 text-center sm:${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              <p className="font-bold text-sm text-foreground">{t("upload", "tryDemoTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("upload", "tryDemoDesc")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/demo")}
              className="shrink-0 gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary font-bold"
            >
              <Play className="w-4 h-4" />
              {t("upload", "tryDemoButton")}
            </Button>
          </div>
        </div>
      </div>

      {/* Style Feed Promo */}
      <FeedPromoSection />

      {/* Footer */}
      <footer className="py-6 border-t border-border">
        <div className="container max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/70">
            <Link href="/terms" className="hover:text-foreground transition-colors underline underline-offset-4">
              {lang === "he" ? "תנאי שימוש" : "Terms of Service"}
            </Link>
            <span className="text-border">|</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors underline underline-offset-4">
              {lang === "he" ? "מדיניות פרטיות" : "Privacy Policy"}
            </Link>
            <span className="text-border">|</span>
            <Link href="/about" className="hover:text-foreground transition-colors underline underline-offset-4">
              {lang === "he" ? "מי אנחנו" : "About"}
            </Link>
            <span className="text-border">|</span>
            <a href="mailto:eranmalovani@gmail.com" className="hover:text-foreground transition-colors underline underline-offset-4">
              {lang === "he" ? "צור קשר" : "Contact"}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
