/*
 * ShoppingSection — Consolidated shopping list with priority, price, and store logos.
 */

import AnimatedSection from "./AnimatedSection";
import StoreLogo from "./StoreLogo";
import { ExternalLink } from "lucide-react";

interface ShoppingItem {
  priority: string;
  priorityColor: string;
  dotColor: string;
  item: string;
  priceRange: string;
  store: string;
  url: string;
}

const shoppingList: ShoppingItem[] = [
  {
    priority: "גבוהה",
    priorityColor: "text-red-400",
    dotColor: "bg-red-400",
    item: "צ'ינוס חאקי Slim Fit",
    priceRange: "$60–$130",
    store: "Nordstrom",
    url: "https://www.nordstrom.com/browse/men/clothing/pants/chino-pants",
  },
  {
    priority: "גבוהה",
    priorityColor: "text-red-400",
    dotColor: "bg-red-400",
    item: "שעון Tissot PRX",
    priceRange: "$350–$650",
    store: "Jomashop",
    url: "https://www.jomashop.com/tissot.html",
  },
  {
    priority: "בינונית",
    priorityColor: "text-amber-400",
    dotColor: "bg-amber-400",
    item: "ז'קט בומבר / אוברשירט",
    priceRange: "$200–$600",
    store: "Stone Island",
    url: "https://www.stoneisland.com/en-us/collection/shirts",
  },
  {
    priority: "בינונית",
    priorityColor: "text-amber-400",
    dotColor: "bg-amber-400",
    item: "צמיד עור מינימליסטי",
    priceRange: "$20–$80",
    store: "Trendhim",
    url: "https://www.trendhim.com/bracelets/leather-bracelets/c16",
  },
  {
    priority: "נמוכה",
    priorityColor: "text-primary",
    dotColor: "bg-primary",
    item: "Common Projects Achilles",
    priceRange: "$400–$475",
    store: "Nordstrom",
    url: "https://www.nordstrom.com/s/common-projects-original-achilles-sneaker-men/4976450",
  },
  {
    priority: "נמוכה",
    priorityColor: "text-primary",
    dotColor: "bg-primary",
    item: "חגורה עור איכותית",
    priceRange: "$50–$200",
    store: "Nordstrom",
    url: "https://www.nordstrom.com/browse/men/accessories/belts",
  },
];

export default function ShoppingSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <AnimatedSection>
        <div className="text-center mb-14">
          <p className="text-sm text-primary tracking-[0.25em] uppercase font-semibold mb-3">06 — רשימת קניות</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">רשימת קניות מרוכזת</h2>
          <p className="text-muted-foreground">כל הפריטים המומלצים במקום אחד, מסודרים לפי עדיפות</p>
        </div>
      </AnimatedSection>

      <AnimatedSection>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-white/10">
                <th className="text-right py-4 px-4 font-semibold">עדיפות</th>
                <th className="text-right py-4 px-4 font-semibold">פריט</th>
                <th className="text-right py-4 px-4 font-semibold">טווח מחירים</th>
                <th className="text-right py-4 px-4 font-semibold">איפה לקנות</th>
              </tr>
            </thead>
            <tbody>
              {shoppingList.map((item, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-4">
                    <span className={`flex items-center gap-2 ${item.priorityColor} font-semibold`}>
                      <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                      {item.priority}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-white font-medium">{item.item}</td>
                  <td className="py-4 px-4 text-slate-300">{item.priceRange}</td>
                  <td className="py-4 px-4">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl transition-all duration-300 hover:bg-white/10 hover:border-primary/30 group"
                    >
                      <StoreLogo name={item.store} size="sm" />
                      <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary/70 shrink-0" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedSection>
    </section>
  );
}
