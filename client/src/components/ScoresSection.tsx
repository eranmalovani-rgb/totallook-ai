/*
 * ScoresSection — Detailed scoring bars for each category.
 */

import AnimatedSection from "./AnimatedSection";

const scores = [
  { label: "איכות הפריטים", score: 8.5, pct: 85, color: "from-primary to-amber-400" },
  { label: "התאמת גזרה", score: 7, pct: 70, color: "from-primary to-amber-400" },
  { label: "צבעוניות וניגודיות", score: 5.5, pct: 55, color: "from-amber-500 to-amber-400" },
  { label: "שכבתיות (Layering)", score: 4, pct: 40, color: "from-red-500 to-red-400" },
  { label: "אקססוריז", score: 3, pct: 30, color: "from-red-500 to-red-400" },
  { label: "התאמה לגיל ולסגנון", score: 8, pct: 80, color: "from-primary to-amber-400" },
  { label: "נעליים", score: 8, pct: 80, color: "from-primary to-amber-400" },
];

export default function ScoresSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <AnimatedSection>
        <div className="text-center mb-14">
          <p className="text-sm text-primary tracking-[0.25em] uppercase font-semibold mb-3">02 — ציונים</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">ציון מפורט לפי קטגוריות</h2>
        </div>
      </AnimatedSection>

      <div className="max-w-2xl mx-auto space-y-5">
        {scores.map((item, i) => (
          <AnimatedSection key={i}>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-200">{item.label}</span>
                <span className="text-sm font-bold text-primary">{item.score}/10</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-l ${item.color} transition-all duration-1000 ease-out`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
