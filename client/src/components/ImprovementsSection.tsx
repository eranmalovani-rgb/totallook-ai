/*
 * ImprovementsSection — 5 improvement suggestions with shopping links.
 */

import AnimatedSection from "./AnimatedSection";
import StoreLogo, { extractStoreFromUrl, extractStoreFromLabel } from "./StoreLogo";
import { ExternalLink } from "lucide-react";

interface ShopLink {
  label: string;
  url: string;
}

interface Improvement {
  number: number;
  title: string;
  description: string;
  before: string;
  after: string;
  links: ShopLink[];
}

const improvements: Improvement[] = [
  {
    number: 1,
    title: "שבירת הבלוק הכהה — הוספת ניגודיות בתחתון",
    description: "הבעיה המרכזית בלוק: סווטשירט כהה + ג'ינס כהה יוצרים מסה אחידה שמחסירה עומק ועניין ויזואלי. הפתרון הפשוט ביותר הוא להחליף את הג'ינס הכהה בצ'ינוס בגוון חאקי, בז' או אפור בהיר. זה מייד ייצור הפרדה ויזואלית, יבליט את הסווטשירט ויעניק מראה מתוחכם יותר.",
    before: "נייבי + אינדיגו כהה = מונוטוני",
    after: "נייבי + חאקי/בז' = ניגודיות מושלמת",
    links: [
      { label: "צ'ינוס Nordstrom", url: "https://www.nordstrom.com/browse/men/clothing/pants/chino-pants" },
      { label: "ג'ינס טייפרד ASOS", url: "https://www.asos.com/us/men/jeans/tapered-jeans/cat/?cid=16982" },
      { label: "Levi's Slim Tapered", url: "https://www.levi.com/US/en_US/clothing/men/jeans/taper/" },
    ],
  },
  {
    number: 2,
    title: "הוספת שכבה עליונה — Layering שמשנה הכל",
    description: "סווטשירט לבד נראה \"שטוח\". הוספת שכבה עליונה — ז'קט בומבר, אוברשירט (Overshirt), או מעיל קל — תיצור עומק, טקסטורה ומראה מורכב יותר. מכיוון שיש לך כבר Stone Island, אוברשירט של אותו מותג ייצור לוק מגובש. חלופה מצוינת: ז'קט דנים בשטיפה בהירה שייצור ניגודיות.",
    before: "שכבה אחת בלבד",
    after: "2-3 שכבות = עומק ועניין",
    links: [
      { label: "Stone Island Overshirts", url: "https://www.stoneisland.com/en-us/collection/shirts" },
      { label: "Stone Island @ END", url: "https://www.endclothing.com/us/brands/stone-island/jackets/shirt-jackets" },
      { label: "Suitsupply Bombers", url: "https://suitsupply.com/en-us/men/coats/bomber-jackets" },
      { label: "Stone Island @ SSENSE", url: "https://www.ssense.com/en-us/men/product/stone-island/navy-1200004-canvas-weave-cotton-overshirt/17914941" },
    ],
  },
  {
    number: 3,
    title: "אקססוריז — הפרט שמפריד בין טוב למושלם",
    description: "שעון איכותי הוא ה-Game Changer הגדול ביותר. Tissot PRX (כ-$350-500) הוא בחירה מושלמת — עיצוב רטרו-מודרני שמתאים גם לקז'ואל וגם לאלגנט. בנוסף, צמיד עור מינימליסטי ביד השנייה יוסיף אופי. משקפי שמש איכותיים (כמו Ray-Ban Clubmaster) ישלימו את הלוק.",
    before: "טבעת נישואין בלבד",
    after: "שעון + צמיד + משקפי שמש",
    links: [
      { label: "שעוני Tissot", url: "https://www.tissotwatches.com/en-us/men.html" },
      { label: "Tissot @ Jomashop", url: "https://www.jomashop.com/tissot.html" },
      { label: "צמידים Nordstrom", url: "https://www.nordstrom.com/browse/men/jewelry/bracelets" },
      { label: "צמידי עור Trendhim", url: "https://www.trendhim.com/bracelets/leather-bracelets/c16" },
      { label: "צמיד עור Etsy", url: "https://www.etsy.com/listing/1397152333/simple-men-leather-bracelet-3mm-thin" },
    ],
  },
  {
    number: 4,
    title: "שדרוג הנעליים — מטוב למצוין",
    description: "הנעליים הנוכחיות טובות, אבל אפשר לקחת את זה צעד קדימה. Common Projects Original Achilles הן הסטנדרט הזהב של סניקרס לבנות מינימליסטיות — עור איטלקי, עיצוב נקי, ומספרים מוזהבים שמוסיפים נגיעה של יוקרה. חלופה: Veja Campo — אקולוגיות, מעוצבות ובמחיר נגיש יותר.",
    before: "סניקרס לבנות בסיסיות",
    after: "Common Projects / Veja Campo",
    links: [
      { label: "Common Projects @ Nordstrom", url: "https://www.nordstrom.com/s/common-projects-original-achilles-sneaker-men/4976450" },
      { label: "Common Projects @ MR PORTER", url: "https://www.mrporter.com/en-sg/mens/product/common-projects/shoes/low-top-sneakers/original-achilles-leather-sneakers/3024088872901549" },
      { label: "Veja Campo", url: "https://www.veja-store.com/en_us/men-campo" },
      { label: "Veja @ Amazon", url: "https://www.amazon.com/Veja-Campo-Sneakers-Natural-Medium/dp/B0B92BHM68" },
    ],
  },
  {
    number: 5,
    title: "פרטים קטנים שעושים הבדל גדול",
    description: "כמה טיפים נוספים שישדרגו את הלוק: (א) קיפול קטן בתחתית הג'ינס (pin roll) שיחשוף את הקרסול ויבליט את הנעליים. (ב) חגורה איכותית — גם אם לא רואים אותה, היא מוסיפה מבנה. (ג) גרביים — גרביים לבנות נקיות או גרבי no-show לאפקט ללא גרביים. (ד) ניחוח — בושם איכותי הוא האקססורי הבלתי נראה שמשלים כל לוק.",
    before: "חסרים פרטים משלימים",
    after: "חגורה + קיפול + גרביים + ניחוח",
    links: [
      { label: "חגורות Nordstrom", url: "https://www.nordstrom.com/browse/men/accessories/belts" },
      { label: "מדריך אקססוריז GQ", url: "https://www.gq.com.au/shopping/best-buys/best-mens-accessories/image-gallery/9ece82b60bfb3922f478c0cb20ed5e74" },
    ],
  },
];

export default function ImprovementsSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <AnimatedSection>
        <div className="text-center mb-14">
          <p className="text-sm text-primary tracking-[0.25em] uppercase font-semibold mb-3">03 — שדרוגים</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">5 שדרוגים שישנו את הלוק</h2>
          <p className="text-muted-foreground">מהקל ליישום ועד השינוי הדרמטי ביותר</p>
        </div>
      </AnimatedSection>

      <div className="space-y-6">
        {improvements.map((item) => (
          <AnimatedSection key={item.number}>
            <div className="flex gap-6 sm:gap-8 items-start bg-gradient-to-br from-card to-background border border-white/[0.06] rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-black/20">
              {/* Number badge */}
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center text-white text-xl sm:text-2xl font-black">
                {item.number}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">{item.description}</p>

                {/* Before / After tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400">
                    לפני: {item.before}
                  </span>
                  <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-primary/15 text-primary">
                    אחרי: {item.after}
                  </span>
                </div>

                {/* Shop links with store logos */}
                <div className="flex flex-wrap gap-2">
                  {item.links.map((link, j) => {
                    const storeName = extractStoreFromUrl(link.url) || extractStoreFromLabel(link.label);
                    return (
                      <a
                        key={j}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl transition-all duration-300 hover:bg-white/10 hover:border-primary/30 hover:-translate-y-0.5 group"
                      >
                        {storeName ? (
                          <StoreLogo name={storeName} size="sm" />
                        ) : (
                          <span className="text-primary text-sm font-medium">{link.label}</span>
                        )}
                        <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary/70 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
