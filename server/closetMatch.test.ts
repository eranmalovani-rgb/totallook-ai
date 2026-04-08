import { describe, it, expect } from "vitest";

interface WardrobeItem {
  id: number;
  name: string;
  itemType: string;
  brand: string | null;
  color: string | null;
  sourceImageUrl: string | null;
  itemImageUrl: string | null;
  styleNote?: string | null;
}

interface Improvement {
  title: string;
  description: string;
  beforeLabel: string;
  afterLabel: string;
  productSearchQuery: string;
  shoppingLinks: { label: string; url: string; imageUrl: string }[];
  closetMatch?: {
    wardrobeItemId: number;
    name: string;
    itemType: string;
    brand?: string;
    color?: string;
    sourceImageUrl?: string;
    itemImageUrl?: string;
  };
}

const typeKeywords: Record<string, string[]> = {
  shirt: ["\u05d7\u05d5\u05dc\u05e6", "\u05d8\u05d9 \u05e9\u05d9\u05e8\u05d8", "shirt", "top", "tee", "polo", "blouse", "t-shirt", "tshirt", "\ud83d\udc55"],
  pants: ["\u05de\u05db\u05e0\u05e1", "\u05d2'\u05d9\u05e0\u05e1", "\u05e6'\u05d9\u05e0\u05d5", "pants", "jeans", "trousers", "shorts", "chino", "\ud83d\udc56"],
  shoes: ["\u05e0\u05e2\u05dc", "shoes", "sneaker", "boot", "\u05e1\u05e0\u05d9\u05e7\u05e8\u05e1", "\u05e0\u05e2\u05dc\u05d9", "\ud83d\udc5f"],
  jacket: ["\u05d6'\u05e7\u05d8", "\u05de\u05e2\u05d9\u05dc", "jacket", "coat", "bomber", "hoodie", "\u05e7\u05e4\u05d5\u05e6'\u05d5\u05df", "\u05e1\u05d5\u05d5\u05d8\u05e9\u05d9\u05e8\u05d8", "sweatshirt", "\ud83e\udde5"],
  watch: ["\u05e9\u05e2\u05d5\u05df", "watch", "\u231a"],
  accessory: ["\u05d0\u05e7\u05e1\u05e1\u05d5\u05e8\u05d9", "\u05ea\u05db\u05e9\u05d9\u05d8", "\u05e9\u05e8\u05e9\u05e8", "\u05e6\u05de\u05d9\u05d3", "\u05d8\u05d1\u05e2\u05ea", "accessory", "jewelry", "necklace", "bracelet", "ring", "chain", "\ud83d\udc8d", "\ud83d\udcff"],
  bag: ["\u05ea\u05d9\u05e7", "bag", "backpack", "\ud83d\udc5c"],
  hat: ["\u05db\u05d5\u05d1\u05e2", "hat", "cap", "beanie", "\ud83e\udde2"],
  sunglasses: ["\u05de\u05e9\u05e7\u05e4", "sunglasses", "glasses", "\ud83d\udd76\ufe0f"],
  vest: ["\u05d5\u05d5\u05e1\u05d8", "vest", "gilet", "\u05d5\u05e1\u05d8"],
  belt: ["\u05d7\u05d2\u05d5\u05e8\u05d4", "belt"],
  scarf: ["\u05e6\u05e2\u05d9\u05e3", "scarf", "bandana"],
};

const styleConflicts: [string[], string[]][] = [
  [["\u05e7\u05dc\u05d0\u05e1\u05d9", "\u05d0\u05e0\u05dc\u05d5\u05d2\u05d9", "classic", "analog", "elegant", "\u05d0\u05dc\u05d2\u05e0\u05d8\u05d9", "dress watch", "formal"], ["\u05d7\u05db\u05dd", "smart", "digital", "\u05d3\u05d9\u05d2\u05d9\u05d8\u05dc\u05d9", "smartwatch", "fitness", "apple watch", "galaxy watch", "garmin"]],
  [["\u05d0\u05dc\u05d2\u05e0\u05d8", "elegant", "formal", "\u05e4\u05d5\u05e8\u05de\u05dc\u05d9", "dress shoe", "oxford", "derby", "loafer", "monk"], ["\u05e1\u05e4\u05d5\u05e8\u05d8", "sporty", "sneaker", "\u05e1\u05e0\u05d9\u05e7\u05e8\u05e1", "running", "athletic", "\u05e8\u05d9\u05e6\u05d4"]],
  [["\u05de\u05db\u05d5\u05e4\u05ea\u05e8", "\u05e4\u05d5\u05e8\u05de\u05dc\u05d9", "dress shirt", "formal", "button-down", "\u05d7\u05d5\u05dc\u05e6\u05d4 \u05de\u05db\u05d5\u05e4\u05ea\u05e8\u05ea"], ["\u05d8\u05d9 \u05e9\u05d9\u05e8\u05d8", "t-shirt", "tee", "casual", "\u05e7\u05d6'\u05d5\u05d0\u05dc", "graphic tee"]],
  [["\u05d1\u05dc\u05d9\u05d9\u05d6\u05e8", "blazer", "suit jacket", "\u05d7\u05dc\u05d9\u05e4\u05d4", "formal", "tailored"], ["bomber", "\u05d1\u05d5\u05de\u05d1\u05e8", "hoodie", "\u05e7\u05e4\u05d5\u05e6'\u05d5\u05df", "windbreaker", "puffer"]],
  [["\u05ea\u05d9\u05e7 \u05e2\u05e1\u05e7\u05d9", "briefcase", "formal", "\u05e4\u05d5\u05e8\u05de\u05dc\u05d9", "messenger"], ["\u05ea\u05d9\u05e7 \u05d2\u05d1", "backpack", "casual", "\u05e1\u05e4\u05d5\u05e8\u05d8\u05d9\u05d1\u05d9", "gym bag"]],
];

function matchClosetItems(improvements: Improvement[], wardrobeItems: WardrobeItem[]): Improvement[] {
  for (const imp of improvements) {
    const impLower = `${imp.title} ${imp.description} ${imp.afterLabel} ${imp.productSearchQuery}`.toLowerCase();
    let bestMatch: WardrobeItem | null = null;
    let bestScore = 0;

    let impCategory = "";
    for (const [cat, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(kw => impLower.includes(kw))) {
        impCategory = cat;
        break;
      }
    }
    if (!impCategory) continue;

    for (const wItem of wardrobeItems) {
      let matchScore = 0;
      const wName = (wItem.name || "").toLowerCase();
      const wType = (wItem.itemType || "").toLowerCase();
      const wBrand = (wItem.brand || "").toLowerCase();
      const wColor = (wItem.color || "").toLowerCase();
      const wStyleNote = (wItem.styleNote || "").toLowerCase();
      const wAllText = `${wName} ${wType} ${wBrand} ${wStyleNote}`;

      let wCategory = "";
      for (const [cat, keywords] of Object.entries(typeKeywords)) {
        if (keywords.some(kw => wType.includes(kw) || wName.includes(kw))) {
          wCategory = cat;
          break;
        }
      }
      if (!wCategory || wCategory !== impCategory) continue;

      let hasStyleConflict = false;
      for (const [groupA, groupB] of styleConflicts) {
        const impMatchesA = groupA.some(kw => impLower.includes(kw));
        const impMatchesB = groupB.some(kw => impLower.includes(kw));
        const wMatchesA = groupA.some(kw => wAllText.includes(kw));
        const wMatchesB = groupB.some(kw => wAllText.includes(kw));
        if ((impMatchesA && wMatchesB && !wMatchesA) || (impMatchesB && wMatchesA && !wMatchesB)) {
          hasStyleConflict = true;
          break;
        }
      }
      if (hasStyleConflict) continue;

      matchScore += 5;
      if (wName && imp.description.toLowerCase().includes(wName)) matchScore += 10;
      if (wBrand && wBrand.length > 2 && impLower.includes(wBrand)) matchScore += 3;
      if (wColor && wColor.length > 1 && impLower.includes(wColor)) matchScore += 2;
      if (wStyleNote) {
        const impKeywords = impLower.split(/\s+/).filter(w => w.length > 3);
        const styleMatches = impKeywords.filter(kw => wStyleNote.includes(kw)).length;
        matchScore += Math.min(styleMatches * 1, 4);
      }
      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestMatch = wItem;
      }
    }

    if (bestMatch && bestScore >= 5) {
      imp.closetMatch = {
        wardrobeItemId: bestMatch.id,
        name: bestMatch.name,
        itemType: bestMatch.itemType,
        brand: bestMatch.brand || undefined,
        color: bestMatch.color || undefined,
        sourceImageUrl: bestMatch.sourceImageUrl || undefined,
        itemImageUrl: bestMatch.itemImageUrl || undefined,
      };
    }
  }
  return improvements;
}

// ============================================================
// CATEGORY GATE TESTS
// ============================================================

describe("Closet matching — strict category gate", () => {
  const sampleWardrobe: WardrobeItem[] = [
    { id: 1, name: "חולצת פשתן לבנה Zara", itemType: "👕", brand: "Zara", color: "לבן", sourceImageUrl: "https://example.com/img1.jpg", itemImageUrl: null },
    { id: 2, name: "ג'ינס כחול Levi's 501", itemType: "👖", brand: "Levi's", color: "כחול", sourceImageUrl: "https://example.com/img2.jpg", itemImageUrl: null },
    { id: 3, name: "נעלי Nike Air Force 1", itemType: "👟", brand: "Nike", color: "לבן", sourceImageUrl: "https://example.com/img3.jpg", itemImageUrl: null },
    { id: 4, name: "שעון Tissot PRX", itemType: "⌚", brand: "Tissot", color: "כסף", sourceImageUrl: "https://example.com/img4.jpg", itemImageUrl: null },
    { id: 5, name: "ז'קט עור שחור AllSaints", itemType: "🧥", brand: "AllSaints", color: "שחור", sourceImageUrl: "https://example.com/img5.jpg", itemImageUrl: null },
  ];

  it("matches shirt improvement to shirt in wardrobe", () => {
    const imps: Improvement[] = [{ title: "שדרוג החולצה", description: "מומלץ להחליף את החולצה הנוכחית בחולצה יותר מלוטשת", beforeLabel: "חולצה בסיסית", afterLabel: "חולצת פשתן מעוצבת", productSearchQuery: "linen shirt men white", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("חולצת פשתן לבנה Zara");
  });

  it("matches shoes improvement to shoes in wardrobe", () => {
    const imps: Improvement[] = [{ title: "שדרוג הנעליים", description: "נעלי סניקרס לבנות יתאימו מצוין ללוק הזה", beforeLabel: "נעליים ישנות", afterLabel: "סניקרס לבנות חדשות", productSearchQuery: "white sneakers men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("נעלי Nike Air Force 1");
  });

  it("matches jacket improvement to jacket in wardrobe", () => {
    const imps: Improvement[] = [{ title: "הוספת שכבה עליונה", description: "ז'קט עור יוסיף עומק ואופי ללוק", beforeLabel: "ללא שכבה עליונה", afterLabel: "ז'קט עור שחור", productSearchQuery: "black leather jacket men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("ז'קט עור שחור AllSaints");
  });

  it("matches by brand mention in improvement", () => {
    const imps: Improvement[] = [{ title: "שדרוג השעון", description: "שעון Tissot כמו שיש לך יתאים מצוין", beforeLabel: "ללא שעון", afterLabel: "שעון יד", productSearchQuery: "Tissot PRX silver watch", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("שעון Tissot PRX");
  });

  it("does NOT match when no category overlap", () => {
    const imps: Improvement[] = [{ title: "הוספת תכשיטים", description: "שרשרת זהב דקה תוסיף נגיעה אלגנטית", beforeLabel: "ללא תכשיטים", afterLabel: "שרשרת זהב", productSearchQuery: "gold chain necklace men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("does NOT match when wardrobe is empty", () => {
    const imps: Improvement[] = [{ title: "שדרוג החולצה", description: "חולצה חדשה תשדרג את הלוק", beforeLabel: "חולצה ישנה", afterLabel: "חולצה חדשה", productSearchQuery: "shirt men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, []);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("REJECTS t-shirt matched to jewelry improvement", () => {
    const imps: Improvement[] = [{ title: "הוספת תכשיטים", description: "שרשרת זהב דקה של Zara תוסיף נגיעה אלגנטית", beforeLabel: "ללא תכשיטים", afterLabel: "שרשרת זהב", productSearchQuery: "gold chain necklace Zara", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("REJECTS shoes matched to shirt improvement", () => {
    const imps: Improvement[] = [{ title: "שדרוג החולצה", description: "חולצה לבנה של Nike תשלים את הלוק", beforeLabel: "חולצה ישנה", afterLabel: "חולצה לבנה Nike", productSearchQuery: "Nike white shirt men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.wardrobeItemId).toBe(1);
    expect(result[0].closetMatch!.itemType).toBe("👕");
  });

  it("REJECTS jacket matched to pants improvement", () => {
    const imps: Improvement[] = [{ title: "שדרוג המכנסיים", description: "מכנסיים שחורים של AllSaints ישדרגו את הלוק", beforeLabel: "מכנסי טרנינג", afterLabel: "מכנסיים שחורים", productSearchQuery: "AllSaints black pants men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.wardrobeItemId).toBe(2);
  });

  it("REJECTS watch matched to shoes improvement", () => {
    const imps: Improvement[] = [{ title: "שדרוג הנעליים", description: "נעליים כסופות של Tissot style יתאימו", beforeLabel: "נעליים ישנות", afterLabel: "נעליים כסופות", productSearchQuery: "silver shoes men Tissot", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.wardrobeItemId).toBe(3);
  });

  it("matches the best item when multiple items in same category", () => {
    const w: WardrobeItem[] = [
      { id: 10, name: "חולצת כותנה שחורה", itemType: "👕", brand: null, color: "שחור", sourceImageUrl: null, itemImageUrl: null },
      { id: 11, name: "חולצת פשתן לבנה Zara", itemType: "👕", brand: "Zara", color: "לבן", sourceImageUrl: null, itemImageUrl: null },
    ];
    const imps: Improvement[] = [{ title: "שדרוג החולצה", description: "מומלץ חולצת פשתן לבנה של Zara שתתאים מצוין", beforeLabel: "חולצה בסיסית", afterLabel: "חולצת פשתן לבנה", productSearchQuery: "Zara linen shirt white", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.wardrobeItemId).toBe(11);
  });

  it("includes sourceImageUrl when available", () => {
    const imps: Improvement[] = [{ title: "שדרוג הנעליים", description: "נעלי סניקרס לבנות", beforeLabel: "נעליים ישנות", afterLabel: "סניקרס חדשות", productSearchQuery: "white sneakers", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.sourceImageUrl).toBe("https://example.com/img3.jpg");
  });

  it("matches pants improvement to jeans in wardrobe", () => {
    const imps: Improvement[] = [{ title: "שדרוג המכנסיים", description: "ג'ינס כחול קלאסי יתאים מצוין ללוק", beforeLabel: "מכנסי טרנינג", afterLabel: "ג'ינס כחול", productSearchQuery: "blue jeans men classic", shoppingLinks: [] }];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("ג'ינס כחול Levi's 501");
  });

  it("color bonus increases match confidence", () => {
    const w: WardrobeItem[] = [
      { id: 20, name: "חולצה אדומה", itemType: "👕", brand: null, color: "אדום", sourceImageUrl: null, itemImageUrl: null },
      { id: 21, name: "חולצה כחולה", itemType: "👕", brand: null, color: "כחול", sourceImageUrl: null, itemImageUrl: null },
    ];
    const imps: Improvement[] = [{ title: "שדרוג החולצה", description: "חולצה בצבע כחול תשלים את הלוק", beforeLabel: "חולצה בסיסית", afterLabel: "חולצה כחולה", productSearchQuery: "blue shirt men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.wardrobeItemId).toBe(21);
  });

  it("handles multiple improvements with different categories", () => {
    const imps: Improvement[] = [
      { title: "שדרוג החולצה", description: "חולצה חדשה תשדרג", beforeLabel: "חולצה ישנה", afterLabel: "חולצה חדשה", productSearchQuery: "shirt men", shoppingLinks: [] },
      { title: "שדרוג הנעליים", description: "נעלי סניקרס חדשות", beforeLabel: "נעליים ישנות", afterLabel: "סניקרס", productSearchQuery: "sneakers men", shoppingLinks: [] },
    ];
    const result = matchClosetItems(imps, sampleWardrobe);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.itemType).toBe("👕");
    expect(result[1].closetMatch).toBeDefined();
    expect(result[1].closetMatch!.itemType).toBe("👟");
  });

  it("REJECTS all cross-category matches even with brand + color overlap", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "חולצת פשתן לבנה Zara", itemType: "👕", brand: "Zara", color: "לבן", sourceImageUrl: null, itemImageUrl: null },
    ];
    const imps: Improvement[] = [{ title: "הוספת תכשיט", description: "צמיד לבן של Zara יוסיף נגיעה אלגנטית", beforeLabel: "ללא תכשיט", afterLabel: "צמיד לבן Zara", productSearchQuery: "Zara white bracelet", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });
});

// ============================================================
// STYLE CONTRADICTION TESTS
// ============================================================

describe("Closet matching — style contradiction detection", () => {

  // ---- WATCH: classic vs smart ----

  it("REJECTS smart watch when recommendation says classic watch (Hebrew)", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "שעון חכם - שחור", itemType: "⌚", brand: "Apple", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון חכם, דיגיטלי, Apple Watch" },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון אלגנטי", description: "שעון הוא אקססורי חיוני לגבר. במקום שעון חכם, שעון יד קלאסי ואלגנטי עם רצועת עור יוסיף נופך של יוקרה", beforeLabel: "ללא שעון יד אלגנטי", afterLabel: "שעון יד קלאסי", productSearchQuery: "classic elegant watch leather strap", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("REJECTS smart watch when recommendation says classic watch (English)", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "Apple Watch Series 9", itemType: "⌚", brand: "Apple", color: "black", sourceImageUrl: null, itemImageUrl: null, styleNote: "smart watch, digital, fitness tracker" },
    ];
    const imps: Improvement[] = [{ title: "Add an elegant watch", description: "A classic analog watch with a leather strap would elevate this look significantly", beforeLabel: "No watch", afterLabel: "Classic dress watch", productSearchQuery: "classic analog watch leather", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("REJECTS classic watch when recommendation says smart watch", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "שעון Tissot PRX קלאסי", itemType: "⌚", brand: "Tissot", color: "כסף", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון קלאסי, אנלוגי, רצועת מתכת" },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון חכם", description: "שעון חכם עם מעקב כושר יתאים ללוק הספורטיבי הזה", beforeLabel: "ללא שעון", afterLabel: "שעון חכם ספורטיבי", productSearchQuery: "smart watch fitness tracker", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("ALLOWS classic watch when recommendation says classic watch", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "שעון Tissot PRX קלאסי", itemType: "⌚", brand: "Tissot", color: "כסף", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון קלאסי, אנלוגי, רצועת מתכת" },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון אלגנטי", description: "שעון יד קלאסי ואלגנטי יוסיף נופך של יוקרה", beforeLabel: "ללא שעון", afterLabel: "שעון יד קלאסי", productSearchQuery: "classic elegant watch", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("שעון Tissot PRX קלאסי");
  });

  it("ALLOWS smart watch when recommendation says smart watch", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "Apple Watch Ultra", itemType: "⌚", brand: "Apple", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון חכם, דיגיטלי, כושר" },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון חכם", description: "שעון חכם עם מעקב כושר יתאים ללוק", beforeLabel: "ללא שעון", afterLabel: "שעון חכם", productSearchQuery: "smart watch fitness", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("Apple Watch Ultra");
  });

  // ---- SHOES: formal vs sporty ----

  it("REJECTS sneakers when recommendation says formal shoes (Hebrew)", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "נעלי Nike Air Max", itemType: "👟", brand: "Nike", color: "לבן", sourceImageUrl: null, itemImageUrl: null, styleNote: "סניקרס ספורטיביות, ריצה" },
    ];
    const imps: Improvement[] = [{ title: "שדרוג הנעליים", description: "נעליים אלגנטיות פורמליות יתאימו לאירוע ערב", beforeLabel: "נעלי ספורט", afterLabel: "נעלי עור אלגנטיות", productSearchQuery: "formal elegant leather shoes men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("REJECTS formal shoes when recommendation says sneakers", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "נעלי Oxford שחורות", itemType: "👟", brand: "Clarks", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "נעליים פורמליות, oxford, עור" },
    ];
    const imps: Improvement[] = [{ title: "שדרוג הנעליים", description: "סניקרס לבנות ספורטיביות יתאימו ללוק הקז'ואלי", beforeLabel: "נעליים פורמליות", afterLabel: "סניקרס לבנות", productSearchQuery: "white sneakers sporty casual", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("ALLOWS sneakers when recommendation says sneakers", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "נעלי Nike Air Force 1", itemType: "👟", brand: "Nike", color: "לבן", sourceImageUrl: null, itemImageUrl: null, styleNote: "סניקרס, קז'ואל" },
    ];
    const imps: Improvement[] = [{ title: "שדרוג הנעליים", description: "סניקרס לבנות יתאימו מצוין", beforeLabel: "נעליים ישנות", afterLabel: "סניקרס לבנות", productSearchQuery: "white sneakers men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("נעלי Nike Air Force 1");
  });

  // ---- SHIRT: formal vs casual ----

  it("REJECTS t-shirt when recommendation says dress shirt", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "טי שירט שחורה Nike", itemType: "👕", brand: "Nike", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "טי שירט, קז'ואל, כותנה" },
    ];
    const imps: Improvement[] = [{ title: "שדרוג החולצה", description: "חולצה מכופתרת פורמלית תשדרג את הלוק", beforeLabel: "חולצה קז'ואלית", afterLabel: "חולצה מכופתרת לבנה", productSearchQuery: "formal dress shirt button-down white", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("REJECTS dress shirt when recommendation says casual tee", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "חולצה מכופתרת לבנה Hugo Boss", itemType: "👕", brand: "Hugo Boss", color: "לבן", sourceImageUrl: null, itemImageUrl: null, styleNote: "חולצה מכופתרת, פורמלית, כותנה" },
    ];
    const imps: Improvement[] = [{ title: "שדרוג החולצה", description: "טי שירט קז'ואלית עם הדפס תתאים ללוק הרגוע", beforeLabel: "חולצה פורמלית", afterLabel: "טי שירט קז'ואלית", productSearchQuery: "casual t-shirt graphic tee men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  // ---- JACKET: blazer vs bomber/hoodie ----

  it("REJECTS hoodie when recommendation says blazer", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "קפוצ'ון Nike שחור", itemType: "🧥", brand: "Nike", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "קפוצ'ון, ספורטיבי, קז'ואל" },
    ];
    const imps: Improvement[] = [{ title: "הוספת בלייזר", description: "בלייזר מחויט יוסיף מראה פורמלי ומלוטש", beforeLabel: "ללא שכבה עליונה", afterLabel: "בלייזר כחול כהה", productSearchQuery: "navy blazer tailored formal men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("REJECTS blazer when recommendation says bomber", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "בלייזר שחור Hugo Boss", itemType: "🧥", brand: "Hugo Boss", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "בלייזר, פורמלי, מחויט" },
    ];
    const imps: Improvement[] = [{ title: "הוספת ז'קט", description: "ז'קט bomber קז'ואלי יתאים ללוק הרחוב", beforeLabel: "ללא שכבה עליונה", afterLabel: "bomber jacket", productSearchQuery: "bomber jacket casual street", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  // ---- NEUTRAL: no style keywords → should still match by category ----

  it("ALLOWS match when neither side has style keywords (neutral)", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "שעון Seiko", itemType: "⌚", brand: "Seiko", color: "כסף", sourceImageUrl: null, itemImageUrl: null },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון", description: "שעון יד ישלים את הלוק", beforeLabel: "ללא שעון", afterLabel: "שעון יד", productSearchQuery: "watch men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.name).toBe("שעון Seiko");
  });

  // ---- MIXED: multiple watches, pick the right style ----

  it("picks classic watch over smart watch when recommendation says classic", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "שעון חכם Apple Watch", itemType: "⌚", brand: "Apple", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון חכם, דיגיטלי" },
      { id: 2, name: "שעון Tissot PRX קלאסי", itemType: "⌚", brand: "Tissot", color: "כסף", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון קלאסי, אנלוגי" },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון אלגנטי", description: "שעון יד קלאסי ואלגנטי יוסיף נופך של יוקרה", beforeLabel: "ללא שעון", afterLabel: "שעון יד קלאסי", productSearchQuery: "classic elegant watch", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.wardrobeItemId).toBe(2);
    expect(result[0].closetMatch!.name).toBe("שעון Tissot PRX קלאסי");
  });

  it("picks smart watch over classic watch when recommendation says smart", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "שעון Omega Seamaster", itemType: "⌚", brand: "Omega", color: "כסף", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון קלאסי, אנלוגי, יוקרתי" },
      { id: 2, name: "Garmin Fenix 7", itemType: "⌚", brand: "Garmin", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון חכם, fitness, GPS" },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון חכם", description: "שעון חכם עם מעקב כושר יתאים ללוק הספורטיבי", beforeLabel: "ללא שעון", afterLabel: "שעון חכם ספורטיבי", productSearchQuery: "smart fitness watch garmin", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.wardrobeItemId).toBe(2);
    expect(result[0].closetMatch!.name).toBe("Garmin Fenix 7");
  });

  // ---- MIXED: multiple shoes, pick the right style ----

  it("picks formal shoes over sneakers when recommendation says formal", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "נעלי Nike Air Max", itemType: "👟", brand: "Nike", color: "לבן", sourceImageUrl: null, itemImageUrl: null, styleNote: "סניקרס, ספורטיבי" },
      { id: 2, name: "נעלי Derby שחורות", itemType: "👟", brand: "Clarks", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "נעליים פורמליות, derby, עור" },
    ];
    const imps: Improvement[] = [{ title: "שדרוג הנעליים", description: "נעליים אלגנטיות פורמליות יתאימו לאירוע", beforeLabel: "נעלי ספורט", afterLabel: "נעלי עור אלגנטיות", productSearchQuery: "formal elegant shoes derby", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    expect(result[0].closetMatch!.wardrobeItemId).toBe(2);
  });

  // ---- EDGE: styleNote from name only (no explicit styleNote field) ----

  it("detects smart watch from name even without styleNote", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "שעון חכם - שחור", itemType: "⌚", brand: null, color: "שחור", sourceImageUrl: null, itemImageUrl: null },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון אלגנטי", description: "שעון יד קלאסי ואלגנטי יוסיף נופך של יוקרה", beforeLabel: "ללא שעון", afterLabel: "שעון יד קלאסי", productSearchQuery: "classic elegant watch", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    // "חכם" in name triggers conflict with "קלאסי" in improvement
    expect(result[0].closetMatch).toBeUndefined();
  });

  it("detects sneakers from name even without styleNote", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "סניקרס Nike לבנות", itemType: "👟", brand: "Nike", color: "לבן", sourceImageUrl: null, itemImageUrl: null },
    ];
    const imps: Improvement[] = [{ title: "שדרוג הנעליים", description: "נעליים אלגנטיות פורמליות יתאימו לאירוע", beforeLabel: "נעלי ספורט", afterLabel: "נעלי עור אלגנטיות", productSearchQuery: "formal elegant shoes", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    // "סניקרס" in name triggers conflict with "אלגנט" in improvement
    expect(result[0].closetMatch).toBeUndefined();
  });

  // ---- EDGE: Galaxy Watch brand detection ----

  it("REJECTS Galaxy Watch when recommendation says classic watch", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "Samsung Galaxy Watch 6", itemType: "⌚", brand: "Samsung", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "galaxy watch, smart, digital" },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון אלגנטי", description: "שעון קלאסי אנלוגי עם רצועת עור", beforeLabel: "ללא שעון", afterLabel: "שעון קלאסי", productSearchQuery: "classic analog watch leather", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  // ---- EDGE: Garmin detection ----

  it("REJECTS Garmin when recommendation says elegant watch", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "Garmin Venu 3", itemType: "⌚", brand: "Garmin", color: "שחור", sourceImageUrl: null, itemImageUrl: null, styleNote: "garmin, fitness, GPS" },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון אלגנטי", description: "שעון אלגנטי עם טבעת זהב יוסיף יוקרה", beforeLabel: "ללא שעון", afterLabel: "שעון יד קלאסי", productSearchQuery: "elegant classic gold watch", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeUndefined();
  });

  // ---- styleNote bonus test ----

  it("styleNote gives bonus when keywords align with recommendation", () => {
    const w: WardrobeItem[] = [
      { id: 1, name: "שעון Omega", itemType: "⌚", brand: "Omega", color: "כסף", sourceImageUrl: null, itemImageUrl: null, styleNote: "שעון קלאסי, אלגנטי, יוקרתי, רצועת מתכת" },
      { id: 2, name: "שעון Casio", itemType: "⌚", brand: "Casio", color: "כסף", sourceImageUrl: null, itemImageUrl: null },
    ];
    const imps: Improvement[] = [{ title: "הוספת שעון", description: "שעון יד יוקרתי ישלים את הלוק", beforeLabel: "ללא שעון", afterLabel: "שעון יד", productSearchQuery: "luxury watch men", shoppingLinks: [] }];
    const result = matchClosetItems(imps, w);
    expect(result[0].closetMatch).toBeDefined();
    // Omega should win because of styleNote alignment bonus
    expect(result[0].closetMatch!.wardrobeItemId).toBe(1);
  });
});
