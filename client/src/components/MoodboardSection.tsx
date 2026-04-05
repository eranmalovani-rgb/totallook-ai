/*
 * MoodboardSection — Grid of reference images with overlay text.
 */

import AnimatedSection from "./AnimatedSection";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364230752/SGdPHKr3xPrRPbHA9C9esB";

const references = [
  {
    src: `${CDN}/ref_navy_sweatshirt_chinos_748ec726.jpg`,
    title: "סווטשירט נייבי + צ'ינוס בהיר",
    desc: "ניגודיות מושלמת בין עליון כהה לתחתון בהיר",
  },
  {
    src: `${CDN}/ref_khaki_navy_layered_2d16162d.jpg`,
    title: "שכבתיות עם חאקי ונייבי",
    desc: "שילוב ז'קט מעל סווטשירט עם מכנסיים בהירים",
  },
  {
    src: `${CDN}/ref_stone_island_style_9668f8f1.jpg`,
    title: "סטיילינג Stone Island",
    desc: "איך ללבוש Stone Island בצורה מתוחכמת",
  },
  {
    src: `${CDN}/ref_layering_jacket_fbd89812.jpg`,
    title: "שכבתיות עם ז'קט",
    desc: "הוספת ז'קט מעל סווטשירט לעומק ועניין",
  },
  {
    src: `${CDN}/ref_watch_bracelet_67d8260a.jpg`,
    title: "שעון + צמיד",
    desc: "אקססוריז שמשדרגים כל לוק קז'ואל",
  },
  {
    src: `${CDN}/ref_40s_style_fd178f91.jpg`,
    title: "סגנון בוגר ומתוחכם",
    desc: "לוק קז'ואל מתוחכם עם שעון ואקססוריז",
  },
  {
    src: `${CDN}/ref_denim_jacket_42d3d5ed.jpg`,
    title: "ז'קט דנים כשכבה עליונה",
    desc: "ז'קט דנים מעל סווטשירט — קלאסיקה מודרנית",
  },
  {
    src: `${CDN}/ref_fall_layering_6ed4183a.jpg`,
    title: "שכבתיות סתווית",
    desc: "שילוב שכבות עם טקסטורות שונות",
  },
];

export default function MoodboardSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <AnimatedSection>
        <div className="text-center mb-14">
          <p className="text-sm text-primary tracking-[0.25em] uppercase font-semibold mb-3">04 — השראה</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">מודבורד השראה</h2>
          <p className="text-muted-foreground">רפרנסים ויזואליים שמדגימים את השדרוגים המוצעים</p>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {references.map((ref, i) => (
          <AnimatedSection key={i}>
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] group cursor-pointer">
              <img
                src={ref.src}
                alt={ref.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <h4 className="text-sm font-semibold text-white mb-1">{ref.title}</h4>
                <p className="text-xs text-slate-300">{ref.desc}</p>
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
