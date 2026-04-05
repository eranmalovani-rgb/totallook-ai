/*
 * AnalysisSection — 4 analysis cards for each outfit item.
 * Glass-morphism cards with rating bars and tags.
 */

import AnimatedSection from "./AnimatedSection";

const items = [
  {
    icon: "👕",
    iconBg: "bg-primary/15",
    title: "סווטשירט Stone Island",
    subtitle: "קרונק כהה / נייבי — לוגו מצפן על השרוול",
    description: "בחירה מצוינת של מותג פרימיום. Stone Island הוא סמל של סטריטוור איכותי. הצבע הכהה מחמיא ומעניק מראה נקי. הגזרה מעט רפויה (oversized) — מתאימה לטרנד הנוכחי אך יכולה להיראות מעט \"בלתי מוגדרת\" ללא שכבת-על.",
    tag: "בחירה מצוינת",
    tagColor: "bg-primary/15 text-primary",
    rating: 85,
    ratingColor: "from-emerald-500 to-emerald-400",
  },
  {
    icon: "👖",
    iconBg: "bg-rose-500/15",
    title: "ג'ינס כהה",
    subtitle: "אינדיגו כהה / Raw Denim — גזרה ישרה-סלים",
    description: "ג'ינס כהה הוא תמיד בחירה בטוחה ואלגנטית. הגזרה טובה ומחמיאה. הבעיה: בשילוב עם סווטשירט כהה נוצר אפקט \"בלוק כהה\" שמחסיר ניגודיות ועומק מהלוק. חסר קיפול בתחתית או טייפרינג מודגש יותר.",
    tag: "דורש ניגודיות",
    tagColor: "bg-amber-500/15 text-amber-400",
    rating: 65,
    ratingColor: "from-amber-500 to-amber-400",
  },
  {
    icon: "👟",
    iconBg: "bg-emerald-500/15",
    title: "סניקרס לבנות",
    subtitle: "נעלי עור לבנות Low-Top — סגנון מינימליסטי",
    description: "הנעליים הלבנות מספקות את הניגודיות היחידה בלוק — וזה חיובי מאוד. עיצוב נקי ומינימליסטי שמתאים לגיל ולסגנון. נראות כמו Veja או דומה — בחירה טובה. אפשר לשדרג ל-Common Projects לרמה גבוהה יותר.",
    tag: "ניגודיות טובה",
    tagColor: "bg-emerald-500/15 text-emerald-400",
    rating: 80,
    ratingColor: "from-emerald-500 to-emerald-400",
  },
  {
    icon: "💍",
    iconBg: "bg-orange-500/15",
    title: "אקססוריז",
    subtitle: "טבעת נישואין בלבד — חסרים אביזרים",
    description: "כאן נמצא הפוטנציאל הגדול ביותר לשדרוג. אין שעון, אין צמיד, אין שרשרת, אין משקפי שמש. אקססוריז הם מה שמפריד בין לוק \"בסדר\" ללוק \"מושלם\". הוספת שעון איכותי ואולי צמיד עור תשנה את כל התמונה.",
    tag: "חסר משמעותית",
    tagColor: "bg-red-500/15 text-red-400",
    rating: 30,
    ratingColor: "from-red-500 to-red-400",
  },
];

export default function AnalysisSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <AnimatedSection>
        <div className="text-center mb-14">
          <p className="text-sm text-primary tracking-[0.25em] uppercase font-semibold mb-3">01 — ניתוח</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">ניתוח הלוק הנוכחי</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">פירוט כל פריט בלוק, התאמה, צבעוניות ואיכות הבחירה</p>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((item, i) => (
          <AnimatedSection key={i}>
            <div className="h-full bg-gradient-to-br from-card to-background border border-white/[0.06] rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-black/20">
              <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center text-2xl mb-5`}>
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
              <p className="text-sm text-primary font-medium mb-3">{item.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.description}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${item.tagColor}`}>
                {item.tag}
              </span>
              <div className="h-1 bg-secondary rounded-full mt-4 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-l ${item.ratingColor} transition-all duration-1000`}
                  style={{ width: `${item.rating}%` }}
                />
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
