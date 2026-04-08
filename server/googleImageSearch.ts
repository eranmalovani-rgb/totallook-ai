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

/** Circuit breaker: if Google CSE returns 403/429, disable for this process lifetime */
let googleCseDisabled = false;
let googleCseDisabledAt = 0;
const CIRCUIT_BREAKER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/** Reset circuit breaker state (for testing) */
export function resetGoogleCircuitBreaker() {
  googleCseDisabled = false;
  googleCseDisabledAt = 0;
}

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
    return [];
  }

  // Circuit breaker: skip if recently disabled
  if (googleCseDisabled) {
    if (Date.now() - googleCseDisabledAt < CIRCUIT_BREAKER_COOLDOWN_MS) {
      return [];
    }
    // Try again after cooldown
    googleCseDisabled = false;
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
    const timeoutId = setTimeout(() => controller.abort(), 5_000); // Reduced from 10s to 5s

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // Circuit breaker: disable on 403 (quota exceeded) or 429 (rate limit)
      if (res.status === 403 || res.status === 429) {
        googleCseDisabled = true;
        googleCseDisabledAt = Date.now();
        console.warn(`[GoogleCSE] Circuit breaker triggered (HTTP ${res.status}) — disabling for 10 minutes`);
      }
      return [];
    }

    const data = await res.json();

    if (!data.items || !Array.isArray(data.items)) {
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
  // Extract store name and product name from label
  const STORE_NAMES = /^(farfetch|asos|zara|h&m|nordstrom|uniqlo|mango|cos|massimo dutti|pull&bear|bershka|shein|boohoo|net-a-porter|ssense|mr porter|revolve|topshop|primark|gap|old navy|banana republic|j\.?\s*crew|ralph lauren|tommy hilfiger|calvin klein|hugo boss|ted baker|reiss|nike|adidas|puma|new balance|reebok|converse|vans|gucci|prada|louis vuitton|burberry|balenciaga|valentino|versace|fendi|dior|celine|saint laurent|bottega veneta|loewe|givenchy|alexander mcqueen|off-white|moncler|canada goose|the north face|patagonia|columbia|common projects|golden goose|axel arigato|acne studios|ami paris|maison margiela|thom browne|brunello cucinelli|loro piana|ermenegildo zegna|canali|hugo boss|sandro|maje|zadig & voltaire|the kooples|theory|helmut lang|rag & bone|everlane|reformation|anthropologie|lululemon|under armour|champion|carhartt|stussy|supreme|fear of god|essentials|yoox|luisaviaroma|mytheresa|matchesfashion|24s|cettire|terminalx|ksp|factory54|shoesonline|urbanica|castro|renuar|golf|honigman|fox|american eagle|next|river island|topman|apc|cos|arket|weekday|monki|selected|jack & jones|scotch & soda|superdry|diesel|replay|g-star|barbour|woolrich|herno|stone island|cp company|church's|tod's|salvatore ferragamo|cole haan|clarks|ecco|birkenstock|dr\.?\s*martens|timberland|red wing|allen edmonds)$/i;
  const segments = label.split(/\s*[—–-]\s*/);
  let productName: string;
  let storeName = '';
  if (segments.length >= 2) {
    const firstIsStore = STORE_NAMES.test(segments[0].trim());
    const lastIsStore = STORE_NAMES.test(segments[segments.length - 1].trim());
    if (firstIsStore && !lastIsStore) {
      storeName = segments[0].trim();
      productName = segments.slice(1).join(' ').trim();
    } else if (lastIsStore && !firstIsStore) {
      storeName = segments[segments.length - 1].trim();
      productName = segments.slice(0, -1).join(' ').trim();
    } else {
      productName = segments.reduce((a, b) => a.length >= b.length ? a : b).trim();
    }
  } else {
    productName = label.trim();
  }

  // If productName is just a store name, use categoryQuery instead
  if (STORE_NAMES.test(productName.trim())) {
    productName = categoryQuery || productName;
  }

  // If productName contains Hebrew characters, prefer the English categoryQuery for better search results
  const hasHebrew = /[\u0590-\u05FF]/.test(productName);
  if (hasHebrew && categoryQuery && /^[a-zA-Z0-9\s'"\-]+$/.test(categoryQuery)) {
    productName = categoryQuery;
  }

  // Combine product name with category, add "product photo" for better results
  const parts: string[] = [];
  // Add gender prefix to get gender-appropriate product images
  if (gender === "male" && !/(men|גבר)/i.test(productName)) {
    parts.push("men's");
  } else if (gender === "female" && !/(women|נש)/i.test(productName)) {
    parts.push("women's");
  }
  parts.push(productName);
  // KEEP store name in query to get store-specific results → visual diversity across links
  if (storeName) {
    parts.push(storeName);
  }
  // Don't append categoryQuery again if we already used it as productName
  if (!hasHebrew && categoryQuery && !productName.toLowerCase().includes(categoryQuery.toLowerCase())) {
    parts.push(categoryQuery);
  }
  parts.push("product photo");

  return parts.join(" ");
}

/**
 * Pick the best image from Google results for a product card.
 * NO HEAD checks — trust Google's results for speed.
 */
const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  top: /\b(shirt|blouse|top|tee|t-shirt|polo|sweater|sweatshirt|hoodie|pullover|henley|tank|jersey|tunic|crewneck|knitwear)\b/i,
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
  const matchesExpected = CATEGORY_KEYWORDS[expectedCategory]?.test(t) ?? false;
  // Bonus for matching the expected category
  if (matchesExpected) return 3;
  // Hard penalty if title matches a DIFFERENT category (e.g. pants in a top search)
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === expectedCategory) continue;
    if (re.test(t)) {
      return -50;
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
      if (r.width >= 300 && r.width <= 1500) score += 3;
      else if (r.width >= 200) score += 1;
      if (r.height > 0 && r.width > 0) {
        const ratio = r.width / r.height;
        if (ratio >= 0.5 && ratio <= 1.2) score += 2;
        else if (ratio >= 0.3 && ratio <= 2.0) score += 1;
      }
      if (r.width < 150 || r.height < 150) score -= 3;
      score += crossCategoryPenalty(r.title, expectedCategory);
      return { ...r, score };
    })
    .sort((a, b) => b.score - a.score);

  // Return best scoring result directly — NO HEAD checks for speed
  return scored[0]?.link ?? "";
}
