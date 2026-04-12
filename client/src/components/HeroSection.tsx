/*
 * HeroSection — Full viewport hero with outfit image, title, and score circle.
 * Editorial Noir: Dark gradient bg, gradient text, conic score circle.
 */

const ORIGINAL_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB/original_6111008f.jpeg";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-[oklch(0.15_0.02_260)] to-[oklch(0.14_0.025_240)]" />

      {/* Floating radial accents */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-rose-500/5 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-6xl mx-auto px-6 py-20">
        {/* Image */}
        <div className="flex-shrink-0 relative group">
          <img
            src={ORIGINAL_IMG}
            alt="Current Outfit"
            className="w-72 sm:w-80 lg:w-[360px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-rose-500/20 blur-xl -z-10 opacity-60" />
        </div>

        {/* Text */}
        <div className="text-center lg:text-right">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-4">
            <span className="bg-gradient-to-l from-white to-[#FF6BB5] bg-clip-text text-transparent">
              חוות דעת אופנתית
            </span>
            <br />
            <span className="bg-gradient-to-l from-white to-primary bg-clip-text text-transparent">
              מקיפה
            </span>
          </h1>
          <p className="text-lg text-muted-foreground font-light max-w-lg mx-auto lg:mx-0 mb-8">
            ניתוח מקצועי של הלוק הנוכחי, הצעות שדרוג מפורטות, לינקים לרכישה ורפרנסים ויזואליים
          </p>

          {/* Score */}
          <div className="flex items-center gap-5 justify-center lg:justify-start">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.2 0.015 260)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${70 * 2.64} ${100 * 2.64}`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-primary">7</span>
                <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest">מתוך 10</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-lg">ציון כללי: 7/10</p>
              <p className="text-muted-foreground text-sm">בסיס מצוין עם פוטנציאל גבוה לשדרוג</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
          <div className="w-1 h-2 rounded-full bg-white/40" />
        </div>
      </div>
    </section>
  );
}
