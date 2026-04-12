import { useState, useRef, useCallback, useEffect } from "react";
import { RotateCw } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeScore?: number;
  afterScore?: number;
}

/**
 * Rotate an image by 90° using Canvas and return a new blob URL.
 * This creates an actual rotated image, not just a CSS transform.
 */
function rotateImageViaCanvas(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Swap width/height for 90° rotation
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      // Rotate 90° clockwise
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        },
        "image/png",
        0.95
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageUrl;
  });
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "לפני",
  afterLabel = "אחרי",
  beforeScore,
  afterScore,
}: BeforeAfterSliderProps) {
  const [mode, setMode] = useState<"side" | "slider">("side");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [displayAfterImage, setDisplayAfterImage] = useState(afterImage);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationCount, setRotationCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep track of blob URLs to revoke them
  const blobUrlsRef = useRef<string[]>([]);

  // Reset displayed image when afterImage prop changes
  useEffect(() => {
    setDisplayAfterImage(afterImage);
    setRotationCount(0);
    // Revoke old blob URLs
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
  }, [afterImage]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      updatePosition(e.touches[0].clientX);
    },
    [updatePosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      updatePosition(e.touches[0].clientX);
    };
    const handleEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, updatePosition]);

  const handleRotate = async () => {
    if (isRotating) return;
    setIsRotating(true);
    try {
      const rotatedUrl = await rotateImageViaCanvas(displayAfterImage);
      blobUrlsRef.current.push(rotatedUrl);
      setDisplayAfterImage(rotatedUrl);
      setRotationCount((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to rotate image:", err);
    } finally {
      setIsRotating(false);
    }
  };

  // Common image style for overlay mode
  const imgStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center",
    userSelect: "none",
    pointerEvents: "none",
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-3">
      {/* Mode toggle + rotate */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => setMode("side")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "side"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            זה לצד זה
          </button>
          <button
            type="button"
            onClick={() => setMode("slider")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "slider"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            סלייידר
          </button>
        </div>
        {/* Rotate button — large, visible, with text */}
        <button
          type="button"
          onClick={handleRotate}
          disabled={isRotating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            isRotating
              ? "bg-primary/10 border-primary/30 text-primary/50 cursor-wait"
              : "bg-white/5 border-white/10 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/10 active:scale-95"
          }`}
          title="סובב תמונה 90°"
        >
          <RotateCw className={`w-4 h-4 ${isRotating ? "animate-spin" : ""}`} />
          <span>סובב</span>
        </button>
      </div>

      {/* Side by Side mode */}
      {mode === "side" && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
          {/* After (AI) — on the right in RTL */}
          <div className="relative">
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-primary/20 bg-black/50">
              <img
                src={displayAfterImage}
                alt={afterLabel}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
            <div className="absolute top-2 right-2 z-10">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 backdrop-blur-sm text-white border border-primary/30 shadow-md">
                {afterScore !== undefined && (
                  <span className="text-[#FF2E9F] font-black ml-1">{afterScore}</span>
                )}
                {afterLabel}
              </span>
            </div>
            {/* Sparkle indicator */}
            <div className="absolute bottom-2 right-2 z-10">
              <span className="px-2 py-1 rounded-full text-[10px] bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm">
                ✨ AI
              </span>
            </div>
          </div>

          {/* Before (Original) — on the left in RTL */}
          <div className="relative">
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-black/50">
              <img
                src={beforeImage}
                alt={beforeLabel}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 backdrop-blur-sm text-white border border-white/20 shadow-md">
                {beforeScore !== undefined && (
                  <span className="text-rose-400 font-black ml-1">{beforeScore}</span>
                )}
                {beforeLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Slider overlay mode */}
      {mode === "slider" && (
        <div
          ref={containerRef}
          className="relative w-full rounded-2xl overflow-hidden cursor-col-resize select-none border border-white/10 shadow-xl aspect-[3/4]"
          style={{ touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* AFTER image — full width background layer */}
          <img
            src={displayAfterImage}
            alt={afterLabel}
            style={imgStyle}
            draggable={false}
          />

          {/* BEFORE image — clipped by clip-path to only show left portion */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            }}
          >
            <img
              src={beforeImage}
              alt={beforeLabel}
              style={imgStyle}
              draggable={false}
            />
          </div>

          {/* Slider line */}
          <div
            className="absolute top-0 bottom-0 z-10"
            style={{
              left: `${sliderPosition}%`,
              transform: "translateX(-50%)",
              width: "3px",
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 0 8px rgba(0,0,0,0.5)",
            }}
          >
            {/* Slider handle */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white/80"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                className="text-gray-700"
              >
                <path
                  d="M8 4L3 11L8 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 4L19 11L14 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 z-20">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-black/70 backdrop-blur-sm text-white border border-white/20 shadow-md">
              {beforeLabel}
              {beforeScore !== undefined && (
                <span className="mr-1.5 text-rose-400 font-black">{beforeScore}</span>
              )}
            </span>
          </div>
          <div className="absolute top-3 right-3 z-20">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-black/70 backdrop-blur-sm text-white border border-white/20 shadow-md">
              {afterLabel}
              {afterScore !== undefined && (
                <span className="mr-1.5 text-[#FF2E9F] font-black">{afterScore}</span>
              )}
            </span>
          </div>

          {/* Drag hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse">
            <span className="px-3 py-1.5 rounded-full text-[10px] bg-black/60 backdrop-blur-sm text-white/80 shadow-md">
              ← גרור להשוואה →
            </span>
          </div>
        </div>
      )}

      {/* Rotation hint */}
      {rotationCount > 0 && (
        <p className="text-center text-[10px] text-muted-foreground/50">
          סובב {rotationCount} {rotationCount === 1 ? "פעם" : "פעמים"}
        </p>
      )}
    </div>
  );
}
