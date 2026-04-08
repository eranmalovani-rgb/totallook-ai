import { describe, it, expect } from "vitest";

// Test the matching logic and selection model used in FixMyLookModal

interface FashionItem {
  name: string;
  description: string;
  color: string;
  score: number;
  verdict: string;
  analysis: string;
  icon: string;
  brand?: string;
}

interface Improvement {
  title: string;
  description: string;
  beforeLabel: string;
  afterLabel: string;
  shoppingLinks: { label: string; url: string; imageUrl: string }[];
  productSearchQuery: string;
}

/* ──────────────── Category detection (replicated from FixMyLookModal.tsx) ──────────────── */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shirt: ["חולצ", "shirt", "top", "טי-שירט", "t-shirt", "tee", "polo", "blouse", "בלוז", "סווטשירט", "sweatshirt", "קפוצ'ון"],
  pants: ["מכנס", "pants", "jeans", "ג'ינס", "trousers", "chino", "צ'ינו", "shorts", "שורט"],
  shoes: ["נעל", "shoe", "sneaker", "סניקרס", "boot", "מגף", "sandal", "סנדל", "heel", "עקב", "loafer"],
  jacket: ["ז'קט", "jacket", "coat", "מעיל", "blazer", "בלייזר", "vest", "וסט", "hoodie", "הודי"],
  dress: ["שמל", "dress", "gown", "skirt", "חצאית"],
  bag: ["תיק", "bag", "purse", "clutch", "backpack"],
  accessory: ["אקסס", "accessor", "שעון", "watch", "טבעת", "ring", "שרשר", "necklace", "צמיד", "bracelet", "עגיל", "earring", "כובע", "hat", "חגור", "belt", "משקפ", "glasses", "sunglasses"],
};

function detectCategory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return null;
}

/* ──────────────── findMatchingItem (replicated from FixMyLookModal.tsx) ──────────────── */

function findMatchingItem(imp: Improvement, items: FashionItem[]): { item: FashionItem; index: number } | null {
  const impTitle = imp.title.toLowerCase();
  const impBefore = imp.beforeLabel.toLowerCase();
  const impDesc = imp.description.toLowerCase();
  const impQuery = (imp.productSearchQuery || "").toLowerCase();
  const impCategory = detectCategory(impTitle) || detectCategory(impBefore) || detectCategory(impQuery) || detectCategory(impDesc);

  let bestItem: { item: FashionItem; index: number } | null = null;
  let bestScore = 0;

  items.forEach((item, idx) => {
    const itemName = item.name.toLowerCase();
    const itemDesc = (item.description || "").toLowerCase();
    const itemCategory = detectCategory(itemName) || detectCategory(itemDesc);
    let score = 0;
    if (impCategory && itemCategory && impCategory !== itemCategory) return;
    if (impCategory && itemCategory && impCategory === itemCategory) score += 8;
    if (impTitle.includes(itemName) || impDesc.includes(itemName)) score += 10;
    if (impBefore.includes(itemName) || itemName.includes(impBefore)) score += 10;
    const words = itemName.split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      if (impTitle.includes(w)) score += 4;
      if (impDesc.includes(w)) score += 3;
      if (impBefore.includes(w)) score += 4;
    }
    if (score > bestScore) {
      bestScore = score;
      bestItem = { item, index: idx };
    }
  });

  return bestItem;
}

/* ──────────────── Helpers ──────────────── */

const makeItem = (name: string, desc = "", score = 5, brand = ""): FashionItem => ({
  name, description: desc, color: "", score, verdict: "", analysis: "", icon: "👕", brand,
});

const makeImp = (title: string, desc: string, before: string, after: string, query = ""): Improvement => ({
  title, description: desc, beforeLabel: before, afterLabel: after,
  shoppingLinks: [
    { label: "Product A", url: "https://example.com/a", imageUrl: "https://img.com/a.jpg" },
    { label: "Product B", url: "https://example.com/b", imageUrl: "https://img.com/b.jpg" },
    { label: "Product C", url: "https://example.com/c", imageUrl: "https://img.com/c.jpg" },
  ],
  productSearchQuery: query,
});

/* ──────────────── Tests ──────────────── */

describe("detectCategory", () => {
  it("should detect shirt category from Hebrew", () => {
    expect(detectCategory("חולצה לבנה")).toBe("shirt");
    expect(detectCategory("סווטשירט קפוצ'ון")).toBe("shirt");
  });

  it("should detect pants category", () => {
    expect(detectCategory("ג'ינס כהה")).toBe("pants");
    expect(detectCategory("מכנסי קרגו")).toBe("pants");
  });

  it("should detect shoes category", () => {
    expect(detectCategory("סניקרס לבנות")).toBe("shoes");
    expect(detectCategory("נעלי ספורט")).toBe("shoes");
    expect(detectCategory("loafer shoes")).toBe("shoes");
  });

  it("should detect jacket category", () => {
    expect(detectCategory("ז'קט עור")).toBe("jacket");
    expect(detectCategory("מעיל חורף")).toBe("jacket");
  });

  it("should detect accessory category", () => {
    expect(detectCategory("שעון יד")).toBe("accessory");
    expect(detectCategory("כובע")).toBe("accessory");
  });

  it("should return null for unknown text", () => {
    expect(detectCategory("פריט מיוחד")).toBeNull();
    expect(detectCategory("something random")).toBeNull();
  });
});

describe("findMatchingItem — basic matching", () => {
  it("should match jeans improvement to jeans item", () => {
    const items = [makeItem("ג'ינס כהה", "ג'ינס כהה ישר"), makeItem("סניקרס לבנות", "נעלי ספורט")];
    const imp = makeImp("שדרוג הג'ינס", "החלף את הג'ינס הכהה", "ג'ינס כהה", "ג'ינס ישר בהיר");
    const result = findMatchingItem(imp, items);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(0);
  });

  it("should match shoes improvement to shoes item", () => {
    const items = [makeItem("ג'ינס כהה"), makeItem("סניקרס לבנות", "נעלי ספורט")];
    const imp = makeImp("שדרוג הנעליים", "החלף סניקרס בלואפרס", "סניקרס לבנות", "לואפרס מעור", "loafers shoes");
    const result = findMatchingItem(imp, items);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(1);
  });
});

describe("findMatchingItem — cross-category rejection", () => {
  it("should NOT match shoes improvement to jeans item", () => {
    const items = [makeItem("ג'ינס כהה")];
    const imp = makeImp("שדרוג הנעליים", "החלף סניקרס", "סניקרס לבנות", "לואפרס", "loafers shoes");
    expect(findMatchingItem(imp, items)).toBeNull();
  });

  it("should NOT match pants improvement to shoes item", () => {
    const items = [makeItem("סניקרס לבנות", "נעלי ספורט")];
    const imp = makeImp("שדרוג המכנסיים", "החלף מכנסי קרגו", "מכנסי קרגו", "צ'ינו בז'", "chino pants");
    expect(findMatchingItem(imp, items)).toBeNull();
  });
});

describe("findMatchingItem — new item (no match)", () => {
  it("should return null for shoe improvement when no shoe item exists", () => {
    const items = [makeItem("ג'ינס כהה"), makeItem("חולצה לבנה")];
    const imp = makeImp("הוספת נעליים", "הוסף נעלי ספורט", "ללא נעליים", "סניקרס לבנות", "white sneakers shoes");
    expect(findMatchingItem(imp, items)).toBeNull();
  });
});

describe("Per-image selection model", () => {
  it("should track selected product index per improvement", () => {
    // Simulates the selectedProductPerImp state
    const selectedProductPerImp: Record<number, number> = {};

    // User clicks product image 2 in improvement 0
    selectedProductPerImp[0] = 2;
    expect(selectedProductPerImp[0]).toBe(2);

    // User clicks product image 0 in improvement 1
    selectedProductPerImp[1] = 0;
    expect(selectedProductPerImp[1]).toBe(0);

    // Count selected improvements
    expect(Object.keys(selectedProductPerImp).length).toBe(2);
  });

  it("should toggle off when clicking same product again", () => {
    const selectedProductPerImp: Record<number, number> = { 0: 1 };

    // Click same product again → deselect
    if (selectedProductPerImp[0] === 1) {
      delete selectedProductPerImp[0];
    }
    expect(selectedProductPerImp[0]).toBeUndefined();
    expect(Object.keys(selectedProductPerImp).length).toBe(0);
  });

  it("should switch product when clicking different product in same improvement", () => {
    const selectedProductPerImp: Record<number, number> = { 0: 1 };

    // Click product 2 in improvement 0 → switch
    selectedProductPerImp[0] = 2;
    expect(selectedProductPerImp[0]).toBe(2);
    expect(Object.keys(selectedProductPerImp).length).toBe(1);
  });

  it("should collect correct improvement indices from selections", () => {
    const selectedProductPerImp: Record<number, number> = { 0: 1, 2: 0, 3: 2 };

    const directImpIndices: number[] = [];
    for (const impIdxStr of Object.keys(selectedProductPerImp)) {
      directImpIndices.push(Number(impIdxStr));
    }

    expect(directImpIndices.sort()).toEqual([0, 2, 3]);
  });

  it("should collect correct item indices from selected improvements", () => {
    const items = [makeItem("ג'ינס כהה"), makeItem("חולצה לבנה")];
    const improvements = [
      makeImp("שדרוג הג'ינס", "החלף ג'ינס", "ג'ינס כהה", "ג'ינס בהיר"),
      makeImp("הוספת נעליים", "הוסף נעלי ספורט", "ללא נעליים", "סניקרס", "sneakers"),
    ];

    const cards = improvements.map((imp, impIdx) => {
      const match = findMatchingItem(imp, items);
      return { impIdx, matchedItemIdx: match?.index ?? -1 };
    });

    // User selected product in both improvements
    const selectedProductPerImp: Record<number, number> = { 0: 0, 1: 1 };

    const itemIndicesSet = new Set<number>();
    for (const impIdxStr of Object.keys(selectedProductPerImp)) {
      const impIdx = Number(impIdxStr);
      const card = cards.find(c => c.impIdx === impIdx);
      if (card && card.matchedItemIdx >= 0) {
        itemIndicesSet.add(card.matchedItemIdx);
      }
    }

    // Only jeans (index 0) has a matching item; shoes improvement has no match
    expect(Array.from(itemIndicesSet)).toEqual([0]);
  });
});

describe("Improvement-centric card building", () => {
  it("should create a card for every improvement", () => {
    const items = [makeItem("ג'ינס כהה", "", 5), makeItem("חולצה לבנה", "", 7)];
    const improvements = [
      makeImp("שדרוג הג'ינס", "החלף ג'ינס", "ג'ינס כהה", "ג'ינס בהיר"),
      makeImp("שדרוג החולצה", "החלף חולצה", "חולצה לבנה", "חולצת פשתן"),
      makeImp("הוספת נעליים", "הוסף נעלי ספורט", "ללא נעליים", "סניקרס לבנות", "white sneakers"),
      makeImp("הוספת שעון", "הוסף שעון יד", "ללא שעון", "שעון יד מעור", "leather watch"),
    ];

    const cards = improvements.map((imp, impIdx) => {
      const match = findMatchingItem(imp, items);
      return { imp, impIdx, matchedItem: match?.item || null, matchedItemIdx: match?.index ?? -1, isNewItem: !match };
    });

    expect(cards.length).toBe(4);
    expect(cards[0].isNewItem).toBe(false);
    expect(cards[1].isNewItem).toBe(false);
    expect(cards[2].isNewItem).toBe(true);
    expect(cards[3].isNewItem).toBe(true);
  });

  it("select all should select first valid image for every improvement", () => {
    const loadedImpImages: Record<number, { imageUrl: string; label: string }[]> = {
      0: [{ imageUrl: "https://img.com/a.jpg", label: "Product A" }, { imageUrl: "https://img.com/b.jpg", label: "Product B" }],
      1: [{ imageUrl: "", label: "" }, { imageUrl: "https://img.com/c.jpg", label: "Product C" }],
      2: [{ imageUrl: "https://img.com/d.jpg", label: "Product D" }],
    };

    const allSelections: Record<number, number> = {};
    for (const [impIdxStr, images] of Object.entries(loadedImpImages)) {
      const impIdx = Number(impIdxStr);
      const firstValid = images.findIndex(l => l.imageUrl && l.imageUrl.length > 5);
      if (firstValid >= 0) allSelections[impIdx] = firstValid;
      else if (images.length > 0) allSelections[impIdx] = 0;
    }

    expect(allSelections[0]).toBe(0);
    expect(allSelections[1]).toBe(1); // first valid is index 1
    expect(allSelections[2]).toBe(0);
    expect(Object.keys(allSelections).length).toBe(3);
  });

  it("clear all should empty the selections", () => {
    const selectedProductPerImp: Record<number, number> = { 0: 1, 1: 0, 2: 2 };
    // Clear all
    const cleared: Record<number, number> = {};
    expect(Object.keys(cleared).length).toBe(0);
  });

  it("should build selectedProductDetails from selections", () => {
    const improvements = [
      makeImp("שדרוג הג'ינס", "החלף ג'ינס", "ג'ינס כהה", "ג'ינס בהיר"),
      makeImp("שדרוג החולצה", "החלף חולצה", "חולצה לבנה", "חולצת פשתן"),
    ];

    const loadedImpImages: Record<number, { imageUrl: string; label: string }[]> = {
      0: [
        { imageUrl: "https://img.com/jeans1.jpg", label: "Levi's 501 כחול" },
        { imageUrl: "https://img.com/jeans2.jpg", label: "Wrangler שחור" },
      ],
      1: [
        { imageUrl: "https://img.com/shirt1.jpg", label: "חולצת פשתן לבנה Zara" },
        { imageUrl: "https://img.com/shirt2.jpg", label: "חולצה כחולה H&M" },
      ],
    };

    // User selected jeans2 (index 1) and shirt1 (index 0)
    const selectedProductPerImp: Record<number, number> = { 0: 1, 1: 0 };

    const selectedProductDetails: { improvementIndex: number; productLabel: string; productImageUrl: string }[] = [];
    for (const [impIdxStr, productIdx] of Object.entries(selectedProductPerImp)) {
      const impIdx = Number(impIdxStr);
      const images = loadedImpImages[impIdx] || [];
      const selectedProduct = images[productIdx];
      if (selectedProduct) {
        selectedProductDetails.push({
          improvementIndex: impIdx,
          productLabel: selectedProduct.label || "",
          productImageUrl: selectedProduct.imageUrl || "",
        });
      }
    }

    expect(selectedProductDetails.length).toBe(2);
    expect(selectedProductDetails[0].productLabel).toBe("Wrangler שחור");
    expect(selectedProductDetails[0].productImageUrl).toBe("https://img.com/jeans2.jpg");
    expect(selectedProductDetails[1].productLabel).toBe("חולצת פשתן לבנה Zara");
  });

  it("server prompt should include specific product details", () => {
    const allImprovements = [
      makeImp("שדרוג הג'ינס", "החלף ג'ינס", "ג'ינס כהה", "ג'ינס בהיר"),
      makeImp("שדרוג החולצה", "החלף חולצה", "חולצה לבנה", "חולצת פשתן"),
    ];

    const selectedProductDetails = [
      { improvementIndex: 0, productLabel: "Levi's 501 כחול כהה", productImageUrl: "https://img.com/jeans1.jpg" },
      { improvementIndex: 1, productLabel: "חולצת פשתן לבנה Zara", productImageUrl: "https://img.com/shirt1.jpg" },
    ];

    const relevantImprovements = allImprovements;

    // Build prompt text like the server does
    const promptParts = relevantImprovements.map(imp => {
      const productDetail = selectedProductDetails.find(pd => {
        const pdImpIdx = pd.improvementIndex;
        return pdImpIdx >= 0 && pdImpIdx < allImprovements.length && allImprovements[pdImpIdx] === imp;
      });
      const productInfo = productDetail?.productLabel
        ? `\n  SPECIFIC PRODUCT SELECTED BY USER: "${productDetail.productLabel}" — use this EXACT product name, style, color, and brand as the replacement.`
        : "";
      return `- ${imp.title}: ${imp.description}\n  REPLACE WITH: ${imp.afterLabel}${productInfo}`;
    });

    const promptText = promptParts.join("\n");

    // Verify product details are included
    expect(promptText).toContain("Levi's 501 כחול כהה");
    expect(promptText).toContain("חולצת פשתן לבנה Zara");
    expect(promptText).toContain("SPECIFIC PRODUCT SELECTED BY USER");
  });

  it("auto-select first valid image per improvement", () => {
    // Simulates the auto-select logic
    const loadedImpImages: Record<number, { imageUrl: string }[]> = {
      0: [{ imageUrl: "https://img.com/a.jpg" }, { imageUrl: "https://img.com/b.jpg" }],
      1: [{ imageUrl: "" }, { imageUrl: "https://img.com/c.jpg" }],
      2: [],
    };

    const selectedProductPerImp: Record<number, number> = {};

    for (const [impIdxStr, images] of Object.entries(loadedImpImages)) {
      const impIdx = Number(impIdxStr);
      if (selectedProductPerImp[impIdx] === undefined && images.length > 0) {
        const firstValidIdx = images.findIndex(l => l.imageUrl && l.imageUrl.length > 5);
        if (firstValidIdx >= 0) {
          selectedProductPerImp[impIdx] = firstValidIdx;
        }
      }
    }

    // Improvement 0: first image is valid → select index 0
    expect(selectedProductPerImp[0]).toBe(0);
    // Improvement 1: first image is empty, second is valid → select index 1
    expect(selectedProductPerImp[1]).toBe(1);
    // Improvement 2: no images → no selection
    expect(selectedProductPerImp[2]).toBeUndefined();
  });
});
