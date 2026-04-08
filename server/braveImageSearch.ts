/**
 * Brave Search API — Image Search Service
 *
 * Searches Brave Images via the Brave Search API.
 * Used as the PRIMARY image search layer, before Google CSE fallback.
 *
 * Flow: Cache → Store OG Image → **Brave Image Search** → Google CSE → AI Generation (fallback)
 *
 * Free tier: $5 in free credits/month (~1000 searches/month).
 * Image endpoint: https://api.search.brave.com/res/v1/images/search
 */

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY ?? "";

/** Circuit breaker: if Brave returns 429, disable temporarily */
let braveDisabled = false;
let braveDisabledAt = 0;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/** Reset circuit breaker state (for testing) */
export function resetBraveCircuitBreaker() {
  braveDisabled = false;
  braveDisabledAt = 0;
}

export interface BraveImageResult {
  /** Direct link to the image file */
  url: string;
  /** Thumbnail URL (smaller, faster to load) */
  thumbnailUrl: string;
  /** Width of the full image */
  width: number;
  /** Height of the full image */
  height: number;
  /** Image title */
  title: string;
  /** The page URL that hosts the image */
  sourceUrl: string;
  /** Confidence level from Brave API */
  confidence: string;
}

/**
 * Search Brave Images for product photos.
 *
 * @param query  - Search query, e.g. "Levi's 501 blue jeans product photo"
 * @param count  - Number of results to request (1–20, default 5)
 * @returns Array of image results, or empty array on failure
 */
export async function searchBraveImages(
  query: string,
  count: number = 5,
): Promise<BraveImageResult[]> {
  if (!BRAVE_API_KEY) {
    console.warn("[BraveSearch] Missing BRAVE_SEARCH_API_KEY — skipping Brave Image Search");
    return [];
  }

  // Circuit breaker: skip if recently disabled
  if (braveDisabled) {
    if (Date.now() - braveDisabledAt < CIRCUIT_BREAKER_COOLDOWN_MS) {
      return [];
    }
    braveDisabled = false;
  }

  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(Math.max(count, 1), 20)),
    safesearch: "strict",
  });

  const url = `https://api.search.brave.com/res/v1/images/search?${params}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000); // Reduced from 10s to 5s

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // Circuit breaker on rate limit
      if (res.status === 429) {
        braveDisabled = true;
        braveDisabledAt = Date.now();
        console.warn(`[BraveSearch] Circuit breaker triggered (HTTP 429) — disabling for 5 minutes`);
      }
      return [];
    }

    const data = await res.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any) => ({
      url: item.properties?.url ?? "",
      thumbnailUrl: item.thumbnail?.src ?? "",
      width: item.properties?.width ?? item.thumbnail?.width ?? 0,
      height: item.properties?.height ?? item.thumbnail?.height ?? 0,
      title: item.title ?? "",
      sourceUrl: item.url ?? "",
      confidence: item.confidence ?? "",
    }));
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn(`[BraveSearch] Timeout for query "${query}"`);
    }
    return [];
  }
}

/**
 * Build a product-focused search query from a shopping link label and category.
 * Gender-aware: prepends "men's" or "women's" to get gender-appropriate results.
 */
export function buildBraveSearchQuery(label: string, categoryQuery: string, gender?: string): string {
  // Strip store name after dash/em-dash
  const [productNameRaw] = label.split(/\s*[—–-]\s*/);
  const productName = (productNameRaw || label).trim();

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
 * Pick the best image from Brave results for a product card.
 * NO HEAD checks — trust Brave's results for speed.
 * Uses thumbnail as fast fallback if main URL looks unreliable.
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

export async function pickBestBraveImage(
  results: BraveImageResult[],
  usedUrls?: Set<string>,
  expectedCategoryQuery?: string,
): Promise<string> {
  if (results.length === 0) return "";

  const expectedCategory = expectedCategoryQuery ? detectQueryCategory(expectedCategoryQuery) : null;

  // Score and sort candidates
  const scored = results
    .filter((r) => r.url && r.url.startsWith("http"))
    .filter((r) => !usedUrls || !usedUrls.has(r.url))
    .map((r) => {
      let score = 0;
      if (r.confidence === "high") score += 3;
      else if (r.confidence === "medium") score += 1;
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
  // Prefer main URL, fallback to thumbnail
  const best = scored[0];
  if (!best) return "";
  return best.url || best.thumbnailUrl || "";
}
