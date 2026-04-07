/*
 * SummarySection — Final summary with before/after score visualization.
 */

import AnimatedSection from "./AnimatedSection";

function ScoreCircle({ score, label, color }: { score: number; label: string; color: string }) {
  const pct = score * 10;
  const dashArray = `${pct * 2.64} ${100 * 2.64}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32 sm:w-40 sm:h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.2 0.015 260)" strokeWidth="5" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={dashArray}
            className="transition-all duration-1500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl sm:text-5xl font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground mt-3 font-medium">{label}</span>
    </div>
  );
}

export default function SummarySection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <AnimatedSection>
        <div className="bg-gradient-to-br from-card to-[oklch(0.14_0.02_260)] border border-white/[0.06] rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-10">סיכום: מ-7 ל-9.5</h2>

          <div className="flex items-center justify-center gap-6 sm:gap-12 mb-10">
            <ScoreCircle score={7} label="עכשיו" color="#3b82f6" />
            <div className="text-2xl text-muted-foreground">→</div>
            <ScoreCircle score={9.5} label="פוטנציאל" color="#22c55e" />
          </div>

          <div className="max-w-2xl mx-auto text-right">
            <p className="text-muted-foreground leading-relaxed text-base">
              הבסיס שלך מצוין — יש לך טעם טוב, מודעות למותגים איכותיים, ובחירות בטוחות. מה שחסר הוא{" "}
              <strong className="text-white">ניגודיות, שכבתיות ואקססוריז</strong>. עם שלושת השדרוגים הראשונים בלבד
              (צ'ינוס בהיר, שכבה עליונה, ושעון) — תקפוץ מ-7 ל-9 בקלות. הסגנון שלך הוא "Elevated Casual" — קז'ואל
              מתוחכם שמתאים מצוין לגיל ולמראה שלך. תמשיך עם Stone Island ומותגים פרימיום, רק תוסיף עומק ופרטים.
            </p>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
