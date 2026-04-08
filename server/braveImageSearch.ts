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

  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(Math.max(count, 1), 20)),
    safesearch: "strict",
  });

  const url = `https://api.search.brave.com/res/v1/images/search?${params}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[BraveSearch] HTTP ${res.status} for query "${query}": ${body.slice(0, 200)}`);
      return [];
    }

    const data = await res.json();

    if (!data.results || !Array.isArray(data.results)) {
      console.log(`[BraveSearch] No results for query "${query}"`);
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
    } else {
      console.warn(`[BraveSearch] Error for query "${query}":`, err?.message ?? err);
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
 *
 * Prefers:
 *  1. High confidence results
 *  2. Images with reasonable dimensions (not tiny icons, not huge banners)
 *  3. Images that are roughly square or portrait (product-style)
 *  4. Images that are actually reachable (HEAD check)
 */
export async function pickBestBraveImage(
  results: BraveImageResult[],
  usedUrls?: Set<string>,
): Promise<string> {
  if (results.length === 0) return "";

  // Score and sort candidates
  const scored = results
    .filter((r) => r.url && r.url.startsWith("http"))
    .filter((r) => !usedUrls || !usedUrls.has(r.url))
    .map((r) => {
      let score = 0;
      // Prefer high confidence
      if (r.confidence === "high") score += 3;
      else if (r.confidence === "medium") score += 1;
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
      return { ...r, score };
    })
    .sort((a, b) => b.score - a.score);

  // Try top candidates with a HEAD check
  for (const candidate of scored.slice(0, 5)) {
    const reachable = await isBraveImageReachable(candidate.url);
    if (reachable) {
      return candidate.url;
    }
    // Fallback to thumbnail if main URL fails
    if (candidate.thumbnailUrl) {
      const thumbReachable = await isBraveImageReachable(candidate.thumbnailUrl);
      if (thumbReachable) {
        return candidate.thumbnailUrl;
      }
    }
  }

  // Last resort: return the first result URL without checking
  return scored[0]?.url ?? "";
}

async function isBraveImageReachable(url: string): Promise<boolean> {
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
