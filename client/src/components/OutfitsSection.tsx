/*
 * OutfitsSection — 3 suggested outfit combinations.
 */

import AnimatedSection from "./AnimatedSection";

interface OutfitItem {
  color: string;
  text: string;
}

interface Outfit {
  emoji: string;
  title: string;
  occasion: string;
  items: OutfitItem[];
  swatches: string[];
}

const outfits: Outfit[] = [
  {
    emoji: "🏙️",
    title: "Smart Casual יומיומי",
    occasion: "למשרד קז'ואל / יציאה ביום / קפה עם חברים",
    items: [
      { color: "#1e3a5f", text: "סווטשירט Stone Island (מה שיש לך)" },
      { color: "#c4a882", text: "צ'ינוס Slim Fit בגוון חאקי/בז'" },
      { color: "#f5f5f5", text: "סניקרס לבנות (Veja / Common Projects)" },
      { color: "#8b7355", text: "חגורה עור חומה" },
      { color: "#c0c0c0", text: "שעון Tissot PRX כסוף" },
    ],
    swatches: ["#1e3a5f", "#c4a882", "#f5f5f5", "#8b7355"],
  },
  {
    emoji: "🌆",
    title: "ערב מתוחכם",
    occasion: "מסעדה / בר / אירוע ערב לא פורמלי",
    items: [
      { color: "#1e3a5f", text: "סווטשירט Stone Island (מה שיש לך)" },
      { color: "#2c2c2c", text: "מכנסי צ'ינו שחורים Slim" },
      { color: "#3a3a3a", text: "ז'קט בומבר נייבי/שחור" },
      { color: "#f5f5f5", text: "סניקרס לבנות נקיות" },
      { color: "#c0c0c0", text: "שעון + צמיד עור" },
      { color: "#4a4a4a", text: "משקפי שמש (לשעות שקיעה)" },
    ],
    swatches: ["#1e3a5f", "#2c2c2c", "#f5f5f5", "#c0c0c0"],
  },
  {
    emoji: "🍂",
    title: "שכבתיות סתווית",
    occasion: "סוף שבוע / טיול עירוני / ימים קרירים",
    items: [
      { color: "#1e3a5f", text: "סווטשירט Stone Island (מה שיש לך)" },
      { color: "#4a6741", text: "אוברשירט ירוק זית / Stone Island" },
      { color: "#4a6fa5", text: "ג'ינס בשטיפה בינונית (Medium Wash)" },
      { color: "#f5f5f5", text: "סניקרס לבנות או מגפוני צ'לסי" },
      { color: "#c0c0c0", text: "שעון + כובע בייסבול" },
    ],
    swatches: ["#1e3a5f", "#4a6741", "#4a6fa5", "#f5f5f5"],
  },
];

export default function OutfitsSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <AnimatedSection>
        <div className="text-center mb-14">
          <p className="text-sm text-blue-400 tracking-[0.25em] uppercase font-semibold mb-3">05 — הצעות לוקים</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">3 לוקים מומלצים עם הסווטשירט</h2>
          <p className="text-muted-foreground">שילובים שונים לאירועים שונים — כולם מבוססים על הסווטשירט שכבר יש לך</p>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {outfits.map((outfit, i) => (
          <AnimatedSection key={i}>
            <div className="h-full bg-gradient-to-br from-card to-background border border-white/[0.06] rounded-2xl p-7 transition-all duration-300 hover:border-blue-500/30 hover:-translate-y-1">
              <div className="text-xl font-bold text-white mb-1">
                {outfit.emoji} {outfit.title}
              </div>
              <p className="text-sm text-purple-400 font-medium mb-5">{outfit.occasion}</p>

              <ul className="space-y-3">
                {outfit.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-slate-300 pb-3 border-b border-white/5 last:border-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/10"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.text}
                  </li>
                ))}
              </ul>

              <div className="flex gap-1.5 mt-5">
                {outfit.swatches.map((color, j) => (
                  <div
                    key={j}
                    className="w-7 h-7 rounded-lg border-2 border-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
