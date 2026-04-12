import { useRef, useState, useCallback, useEffect } from "react";

interface LandingBeforeAfterSliderProps {
  beforeImg: string;
  afterImg: string;
  beforeLabel?: string;
  afterLabel?: string;
  scoreBefore?: number;
  scoreAfter?: number;
}

/**
 * Landing-page Before/After slider — editorial Vogue aesthetic.
 * Auto-slides once when entering viewport, then hands control to user.
 */
export default function LandingBeforeAfterSlider({
  beforeImg,
  afterImg,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  scoreBefore,
  scoreAfter,
}: LandingBeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isAutoSliding, setIsAutoSliding] = useState(false);
  const autoSlideRanRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  /* ── Auto-slide animation when entering viewport ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !autoSlideRanRef.current && !hasInteracted) {
          autoSlideRanRef.current = true;
          runAutoSlide();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasInteracted]);

  function runAutoSlide() {
    setIsAutoSliding(true);

    // Keyframes: 50 → 25 → 75 → 50 over ~2.4 seconds
    const keyframes = [
      { target: 25, duration: 700 },
      { target: 75, duration: 900 },
      { target: 50, duration: 700 },
    ];

    let currentKeyframe = 0;
    let startTime: number | null = null;
    let startPos = 50;

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const kf = keyframes[currentKeyframe];
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / kf.duration, 1);
      const eased = easeInOutCubic(progress);
      const newPos = startPos + (kf.target - startPos) * eased;

      setSliderPos(newPos);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentKeyframe++;
        if (currentKeyframe < keyframes.length) {
          startPos = kf.target;
          startTime = null;
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsAutoSliding(false);
        }
      }
    }

    // Small delay before starting
    setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animate);
    }, 400);
  }

  // Cancel auto-slide if user interacts
  useEffect(() => {
    if (hasInteracted && isAutoSliding) {
      cancelAnimationFrame(animFrameRef.current);
      setIsAutoSliding(false);
    }
  }, [hasInteracted, isAutoSliding]);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setHasInteracted(true);
      updatePosition(e.clientX);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [updatePosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      updatePosition(e.clientX);
    },
    [isDragging, updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      setHasInteracted(true);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const gold = "#FF2E9F";
  const goldDim = "rgba(255, 46, 159, 0.6)";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-72 md:h-80 lg:h-96 overflow-hidden cursor-col-resize select-none group"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      {/* ── BEFORE image — full, underneath ── */}
      <div className="absolute inset-0">
        <img
          src={beforeImg}
          alt="Before"
          className="w-full h-full object-cover object-top"
          draggable={false}
        />
        {/* Desaturation + darken overlay on before side */}
        <div className="absolute inset-0 bg-black/30" style={{ filter: "saturate(0.6)" }} />
      </div>

      {/* ── AFTER image — clipped from left to slider ── */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img
          src={afterImg}
          alt="After"
          className="w-full h-full object-cover object-top"
          draggable={false}
        />
      </div>

      {/* ── BEFORE label — always visible, left side of image ── */}
      <div
        className="absolute top-3 z-10 pointer-events-none"
        style={{ left: "8px" }}
      >
        <div
          className="flex items-center gap-1.5 px-2.5 py-1"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="w-2 h-2 rounded-full bg-white/40" />
          <span className="text-[10px] tracking-[0.15em] uppercase font-medium text-white/80">
            {beforeLabel}
          </span>
          {scoreBefore !== undefined && (
            <span className="text-[11px] font-display text-white/50 ml-1">
              {scoreBefore.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* ── AFTER label — always visible, right side of image ── */}
      <div
        className="absolute top-3 z-10 pointer-events-none"
        style={{ right: "8px" }}
      >
        <div
          className="flex items-center gap-1.5 px-2.5 py-1"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: gold }} />
          <span
            className="text-[10px] tracking-[0.15em] uppercase font-medium"
            style={{ color: gold }}
          >
            {afterLabel}
          </span>
          {scoreAfter !== undefined && (
            <span className="text-[11px] font-display ml-1" style={{ color: gold }}>
              {scoreAfter.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* ── Divider line ── */}
      <div
        className="absolute top-0 bottom-0 w-[2px] z-20 pointer-events-none"
        style={{
          left: `${sliderPos}%`,
          transform: "translateX(-50%)",
          background: `linear-gradient(to bottom, transparent 0%, ${goldDim} 8%, ${gold} 50%, ${goldDim} 92%, transparent 100%)`,
          transition: isDragging ? "none" : undefined,
        }}
      />

      {/* ── Labels attached to divider — BEFORE on left, AFTER on right ── */}
      <div
        className="absolute z-30 pointer-events-none"
        style={{
          left: `${sliderPos}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          transition: isDragging ? "none" : undefined,
        }}
      >
        {/* BEFORE label — left of handle */}
        <div
          className="absolute"
          style={{
            right: "calc(100% + 8px)",
            top: "50%",
            transform: "translateY(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            className="text-[10px] md:text-[11px] tracking-[0.12em] uppercase font-semibold px-2 py-1"
            style={{
              color: "rgba(255,255,255,0.85)",
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              borderRight: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            {beforeLabel}
          </span>
        </div>

        {/* Drag handle */}
        <div
          className={`
            w-10 h-10 md:w-11 md:h-11 rounded-full border-2 flex items-center justify-center
            backdrop-blur-sm transition-all duration-150
            ${isDragging ? "scale-110" : "scale-100 group-hover:scale-105"}
          `}
          style={{
            borderColor: gold,
            background: "oklch(0.1 0.02 75 / 0.8)",
            boxShadow: `0 0 20px oklch(0.75 0.14 75 / 0.3)`,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M7 4L3 10L7 16"
              stroke={gold}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 4L17 10L13 16"
              stroke={gold}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* AFTER label — right of handle */}
        <div
          className="absolute"
          style={{
            left: "calc(100% + 8px)",
            top: "50%",
            transform: "translateY(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            className="text-[10px] md:text-[11px] tracking-[0.12em] uppercase font-semibold px-2 py-1"
            style={{
              color: gold,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              borderLeft: `2px solid ${goldDim}`,
            }}
          >
            {afterLabel}
          </span>
        </div>
      </div>

      {/* ── "Drag to compare" hint — only before first interaction ── */}
      {!hasInteracted && !isAutoSliding && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse">
          <span
            className="text-[10px] tracking-[0.12em] uppercase font-light px-3 py-1.5"
            style={{
              color: gold,
              background: "oklch(0.1 0.02 75 / 0.7)",
              backdropFilter: "blur(4px)",
              border: `1px solid oklch(0.75 0.14 75 / 0.25)`,
            }}
          >
            ← drag to compare →
          </span>
        </div>
      )}

      {/* ── Score improvement badge — visible after auto-slide or interaction ── */}
      {(hasInteracted || isAutoSliding) && scoreBefore !== undefined && scoreAfter !== undefined && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span
            className="text-[10px] tracking-[0.12em] uppercase font-light px-3 py-1.5"
            style={{
              color: gold,
              background: "oklch(0.1 0.02 75 / 0.7)",
              backdropFilter: "blur(4px)",
              border: `1px solid oklch(0.75 0.14 75 / 0.25)`,
            }}
          >
            +{(scoreAfter - scoreBefore).toFixed(1)} points
          </span>
        </div>
      )}
    </div>
  );
}
