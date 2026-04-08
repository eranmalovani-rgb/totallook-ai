/**
 * Google Custom Search Engine — Image Search Service
 *
 * Searches Google Images via the Custom Search JSON API.
 * Used as a middle layer between store OG-image scraping and AI image generation.
 *
 * Flow: Cache → Store OG Image → **Google Image Search** → AI Generation (fallback)
 *
 * Free tier: 100 queries/day (each query returns up to 10 results).
 */

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY ?? "";
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX ?? "";

export interface GoogleImageResult {
  /** Direct link to the image file */
  link: string;
  /** Thumbnail URL (smaller, faster to load) */
  thumbnailLink: string;
  /** Width of the full image */
  width: number;
  /** Height of the full image */
  height: number;
  /** Page title where the image was found */
  title: string;
  /** The page URL that hosts the image */
  contextLink: string;
}

/**
 * Search Google Images for product photos.
 *
 * @param query  - Search query, e.g. "Levi's 501 blue jeans product photo"
 * @param num    - Number of results to request (1–10, default 3)
 * @returns Array of image results, or empty array on failure
 */
export async function searchGoogleImages(
  query: string,
  num: number = 3,
): Promise<GoogleImageResult[]> {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) {
    console.warn("[GoogleCSE] Missing API key or CX — skipping Google Image Search");
    return [];
  }

  const params = new URLSearchParams({
    key: GOOGLE_CSE_API_KEY,
    cx: GOOGLE_CSE_CX,
    q: query,
    searchType: "image",
    num: String(Math.min(Math.max(num, 1), 10)),
    // Prefer product-style images
    imgType: "photo",
    safe: "active",
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[GoogleCSE] HTTP ${res.status} for query "${query}": ${body.slice(0, 200)}`);
      return [];
    }

    const data = await res.json();

    if (!data.items || !Array.isArray(data.items)) {
      console.log(`[GoogleCSE] No items for query "${query}"`);
      return [];
    }

    return data.items.map((item: any) => ({
      link: item.link ?? "",
      thumbnailLink: item.image?.thumbnailLink ?? "",
      width: item.image?.width ?? 0,
      height: item.image?.height ?? 0,
      title: item.title ?? "",
      contextLink: item.image?.contextLink ?? "",
    }));
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn(`[GoogleCSE] Timeout for query "${query}"`);
    } else {
      console.warn(`[GoogleCSE] Error for query "${query}":`, err?.message ?? err);
    }
    return [];
  }
}

/**
 * Build a product-focused search query from a shopping link label and category.
 *
 * Examples:
 *   buildProductSearchQuery("Levi's 501 Original — ASOS", "jeans")
 *   → "Levi's 501 Original jeans product photo"
 */
export function buildProductSearchQuery(label: string, categoryQuery: string, gender?: string): string {
  // Strip store name after dash/em-dash
  const [productNameRaw] = label.split(/\s*[—–-]\s*/);
  const productName = (productNameRaw || label).trim();

  // Combine product name with category, add "product photo" for better results
  const parts: string[] = [];
  // Add gender prefix to get gender-appropriate product images
  if (gender === "male" && !/(men|גבר)/i.test(productName)) {
    parts.push("men's");
  } else if (gender === "female" && !/(women|נש)/i.test(productName)) {
    parts.push("women's");
  }
  parts.push(productName);
  if (categoryQuery && !productName.toLowerCase().includes(categoryQuery.toLowerCase())) {
    parts.push(categoryQuery);
  }
  parts.push("product photo");

  return parts.join(" ");
}

/**
 * Pick the best image from Google results for a product card.
 *
 * Prefers:
 *  1. Images with reasonable dimensions (not tiny icons, not huge banners)
 *  2. Images that are roughly square or portrait (product-style)
 *  3. Images that are actually reachable (HEAD check)
 */
/**
 * Cross-category keyword sets for filtering out wrong-category images.
 */
const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  top: /\b(shirt|blouse|top|tee|t-shirt|polo|sweater|hoodie|pullover|henley|tank|jersey|tunic)\b/i,
  bottom: /\b(pants|jeans|trouser|chino|shorts|skirt|legging|jogger|cargo|denim|slacks)\b/i,
  outerwear: /\b(coat|jacket|blazer|cardigan|trench|bomber|vest|parka|windbreaker|anorak)\b/i,
  shoes: /\b(shoe|sneaker|boot|loafer|heel|sandal|slipper|mule|oxford|derby|trainer)\b/i,
  dress: /\b(dress|gown|maxi|midi|mini dress|romper|jumpsuit)\b/i,
  accessory: /\b(watch|bracelet|ring|necklace|earring|belt|bag|hat|cap|scarf|sunglass|wallet|tie|cufflink)\b/i,
};

function detectQueryCategory(query: string): string | null {
  const q = query.toLowerCase();
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS)) {
    if (re.test(q)) return cat;
  }
  return null;
}

function crossCategoryPenalty(title: string, expectedCategory: string | null): number {
  if (!expectedCategory || !title) return 0;
  const t = title.toLowerCase();
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === expectedCategory) continue;
    if (re.test(t) && !CATEGORY_KEYWORDS[expectedCategory]?.test(t)) {
      return -5;
    }
  }
  return 0;
}

export async function pickBestProductImage(
  results: GoogleImageResult[],
  usedUrls?: Set<string>,
  expectedCategoryQuery?: string,
): Promise<string> {
  if (results.length === 0) return "";

  const expectedCategory = expectedCategoryQuery ? detectQueryCategory(expectedCategoryQuery) : null;

  // Score and sort candidates
  const scored = results
    .filter((r) => r.link && r.link.startsWith("http"))
    .filter((r) => !usedUrls || !usedUrls.has(r.link))
    .map((r) => {
      let score = 0;
      // Prefer reasonable sizes (300–1500px wide)
      if (r.width >= 300 && r.width <= 1500) score += 3;
      else if (r.width >= 200) score += 1;
      // Prefer roughly square or portrait aspect ratio
      if (r.height > 0 && r.width > 0) {
        const ratio = r.width / r.height;
        if (ratio >= 0.5 && ratio <= 1.2) score += 2; // portrait or square
        else if (ratio >= 0.3 && ratio <= 2.0) score += 1;
      }
      // Penalize very small images
      if (r.width < 150 || r.height < 150) score -= 3;
      // Penalize cross-category contamination
      score += crossCategoryPenalty(r.title, expectedCategory);
      return { ...r, score };
    })
    .sort((a, b) => b.score - a.score);

  // Try top candidates with a HEAD check
  for (const candidate of scored.slice(0, 5)) {
    const reachable = await isImageReachable(candidate.link);
    if (reachable) {
      return candidate.link;
    }
  }

  // Fallback: return the first result without checking
  return scored[0]?.link ?? "";
}

async function isImageReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TotalLookBot/1.0)",
      },
    });
    clearTimeout(timeoutId);
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    return res.ok && ct.startsWith("image/");
  } catch {
    return false;
  }
}
