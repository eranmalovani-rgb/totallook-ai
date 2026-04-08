/**
 * Product Image Helper
 * 
 * Resolves product images for fashion recommendations.
 * 
 * Resolution order:
 *   1. DB cache (avoid re-fetching)
 *   2. Store OG image (scrape product page meta tags)
 *   3. **Brave Image Search** (primary — real product photos)
 *   3b. Google Custom Search Image API (fallback)
 *   4. AI image generation (DALL-E / gpt-image fallback)
 * 
 * Features:
 * - **Cache**: Checks DB cache before generating. If the same product was generated before, reuses the image.
 * - **Lazy loading**: Can generate images for a SINGLE improvement category on demand.
 * - **Progressive updates**: Each image is saved to DB as soon as it's ready.
 * - **Concurrency limit**: Max 3 concurrent image generations.
 */
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "server/storage";
import { getCachedProductImage, saveProductImageToCache, normalizeProductKey } from "./db";
import { searchGoogleImages, buildProductSearchQuery, pickBestProductImage } from "./googleImageSearch";
import { searchBraveImages, buildBraveSearchQuery, pickBestBraveImage } from "./braveImageSearch";
import type { FashionAnalysis, OutfitSuggestion } from "../shared/fashionTypes";

const MAX_CONCURRENT = 5;
const CACHE_TTL_DAYS = 30;

/**
 * Download an image from an external URL and re-upload it to our S3 bucket.
 * Returns the S3 public URL so the browser never hits a hotlink-protected CDN.
 * Falls back to the original URL if the proxy fails.
 */
async function proxyImageToS3(imageUrl: string): Promise<string> {
  // Skip if already on our S3 / known-safe domains
  if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl;
  try {
    const u = new URL(imageUrl);
    // Already on our storage — no need to proxy
    if (u.hostname.includes('r2.cloudflarestorage') || u.hostname.includes('manus') || u.hostname.includes('pub-')) return imageUrl;
    // Our own CDN
    if (u.hostname.includes('totallook')) return imageUrl;
    // AI-generated images are already on a safe CDN
    if (u.hostname.includes('oaidalleapiprodscus') || u.hostname.includes('openai')) return imageUrl;
    // Unsplash images are safe to use directly
    if (u.hostname.includes('unsplash')) return imageUrl;
    // Cloudfront CDN images are safe
    if (u.hostname.includes('cloudfront.net')) return imageUrl;
  } catch { return ''; }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'referer': new URL(imageUrl).origin + '/',
      },
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      console.warn(`[ProxyS3] fetch failed ${resp.status} for ${imageUrl.substring(0, 80)} — returning empty to trigger fallback`);
      return '';
    }
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    // If response is not an image (e.g. HTML error page), reject
    if (!contentType.startsWith('image/')) {
      console.warn(`[ProxyS3] not an image (${contentType}) for ${imageUrl.substring(0, 80)} — returning empty`);
      return '';
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 500) {
      console.warn(`[ProxyS3] image too small (${buf.length}b), returning empty to trigger fallback`);
      return '';
    }
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const hash = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const key = `product-images/${hash}.${ext}`;
    const { url: s3Url } = await storagePut(key, buf, contentType);
    console.log(`[ProxyS3] proxied to S3: ${imageUrl.substring(0, 60)} → ${s3Url.substring(0, 60)}`);
    return s3Url;
  } catch (err: any) {
    console.warn(`[ProxyS3] proxy failed: ${err?.message} — returning empty to trigger fallback`);
    return '';
  }
}

/**
 * Category-aware placeholder image URLs.
 * These are high-quality stock photos from Unsplash that represent each clothing category.
 * Used as last-resort fallback when cache, store OG, Brave, Google, and AI all fail.
 */
const CATEGORY_PLACEHOLDER_IMAGES: Record<string, string[]> = {
  top: [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop", // white shirt
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop", // t-shirt
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop", // dress shirt
  ],
  bottom: [
    "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop", // jeans
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop", // chinos
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop", // pants
  ],
  outerwear: [
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop", // jacket
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=400&fit=crop", // blazer
    "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400&h=400&fit=crop", // coat
  ],
  shoes: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", // sneakers
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop", // shoes
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop", // running shoes
  ],
  dress: [
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop", // dress
    "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=400&fit=crop", // dress 2
    "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=400&h=400&fit=crop", // dress 3
  ],
  onepiece: [
    "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&h=400&fit=crop", // jumpsuit
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop", // overall
  ],
  accessory: [
    "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop", // watch
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop", // bag
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop", // sunglasses
  ],
  other: [
    "https://images.unsplash.com/photo-1558171813-01ed3d751c0e?w=400&h=400&fit=crop", // fashion generic
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop", // fashion 2
  ],
};

/**
 * Get a smart placeholder image URL based on the product category.
 * Uses a round-robin index to avoid showing the same placeholder for all links in an improvement.
 */
export function getCategoryPlaceholder(categoryQuery: string, index: number = 0): string {
  const category = detectFashionCategoryFromQuery(categoryQuery);
  const images = CATEGORY_PLACEHOLDER_IMAGES[category] || CATEGORY_PLACEHOLDER_IMAGES.other;
  return images[index % images.length];
}

/**
 * Detect fashion category from a search query string.
 */
function detectFashionCategoryFromQuery(query: string): string {
  const t = (query || "").toLowerCase();
  if (/(shoe|sneaker|boot|loafer|heel|sandal|\u05e0\u05e2\u05dc|\u05e1\u05e0\u05d9\u05e7\u05e8)/.test(t)) return "shoes";
  if (/(coat|jacket|blazer|hoodie|cardigan|trench|bomber|vest|\u05de\u05e2\u05d9\u05dc|\u05d6\u05e7\u05d8|\u05d1\u05dc\u05d9\u05d9\u05d6\u05e8)/.test(t)) return "outerwear";
  if (/(dress|gown|\u05e9\u05de\u05dc\u05d4)/.test(t)) return "dress";
  if (/(jumpsuit|romper|overall|\u05d0\u05d5\u05d1\u05e8\u05d5\u05dc|\u05e1\u05e8\u05d1\u05dc)/.test(t)) return "onepiece";
  if (/(shirt|blouse|top|tee|t-shirt|polo|sweater|\u05d7\u05d5\u05dc\u05e6)/.test(t)) return "top";
  if (/(pants|jeans|trouser|chino|shorts|skirt|\u05de\u05db\u05e0\u05e1|\u05d2\u05d9\u05e0\u05e1|\u05d7\u05e6\u05d0\u05d9\u05ea)/.test(t)) return "bottom";
  if (/(watch|bracelet|ring|necklace|earring|belt|bag|hat|cap|scarf|sunglass)/.test(t)) return "accessory";
  return "other";
}

/**
 * Simple concurrency limiter — runs tasks with at most `limit` concurrent executions.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      try {
        results[idx] = await tasks[idx]();
      } catch (err) {
        console.warn(`[ProductImages] Task ${idx} failed:`, (err as any)?.message || err);
        results[idx] = undefined as T;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** Callback type for progressive DB updates */
export type OnImageReady = (impIdx: number, linkIdx: number, imageUrl: string) => Promise<void>;

function resolveUrl(candidate: string, baseUrl: string): string | null {
  try {
    if (!candidate) return null;
    if (candidate.startsWith("//")) {
      return `https:${candidate}`;
    }
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractMetaImageFromHtml(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const resolved = resolveUrl(match[1].trim(), pageUrl);
      if (resolved && resolved.startsWith("http")) return resolved;
    }
  }
  return null;
}

async function fetchStoreImageUrl(productUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(productUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; TotalLookBot/1.0; +https://totallook.ai)",
        "accept-language": "en-US,en;q=0.9,he;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html")) return null;
    const html = await response.text();
    return extractMetaImageFromHtml(html, productUrl);
  } catch {
    return null;
  }
}

async function resolveShoppingLinkImage(params: {
  label: string;
  url: string;
  categoryQuery: string;
  logPrefix: string;
  allowAIFallback?: boolean;
  skipCache?: boolean;
  skipStoreImage?: boolean;
  promptSalt?: string;
  gender?: string;
  /** URLs already used by other links in the same improvement — skip these in Brave/Google picks */
  usedImageUrls?: Set<string>;
  /** Pre-fetched search results (if available, skip API calls for speed) */
  prefetchedResults?: { braveResults: import('./braveImageSearch').BraveImageResult[]; googleResults: import('./googleImageSearch').GoogleImageResult[] };
}): Promise<string> {
  const {
    label,
    url,
    categoryQuery,
    logPrefix,
    allowAIFallback = true,
    skipCache = false,
    skipStoreImage = false,
    promptSalt,
    gender,
    usedImageUrls,
    prefetchedResults,
  } = params;
  const cacheKey = normalizeProductKey(label, categoryQuery, url);
  if (!skipCache) {
    const cachedUrl = await getCachedProductImage(cacheKey, CACHE_TTL_DAYS);
    if (cachedUrl && isValidImageUrl(cachedUrl)) {
      // If the cached URL is already used by another link in this improvement, skip cache
      // and try Brave/Google instead of falling through to expensive AI generation
      if (usedImageUrls && usedImageUrls.has(cachedUrl.trim().toLowerCase())) {
        console.log(`${logPrefix} cache hit but duplicate — skipping to search: "${label}"`);
      } else {
        console.log(`${logPrefix} cache hit: "${label}"`);
        const proxiedCached = await proxyImageToS3(cachedUrl);
        if (proxiedCached && isValidImageUrl(proxiedCached)) {
          return proxiedCached;
        }
        console.log(`${logPrefix} cache hit but proxy failed, continuing to search: "${label}"`);
      }
    }
  }

  // --- Step 2: Try store OG image (skip when prefetched results exist — URLs are search pages, not product pages) ---
  if (!skipStoreImage && !prefetchedResults) {
    const storeImageUrl = await fetchStoreImageUrl(url);
    if (storeImageUrl && isValidImageUrl(storeImageUrl)) {
      console.log(`${logPrefix} store image: "${label}"`);
      const proxiedStoreUrl = await proxyImageToS3(storeImageUrl);
      if (proxiedStoreUrl && isValidImageUrl(proxiedStoreUrl)) {
        saveProductImageToCache({
          productKey: cacheKey,
          imageUrl: proxiedStoreUrl,
          originalLabel: label,
          categoryQuery,
        }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
        return proxiedStoreUrl;
      }
      console.log(`${logPrefix} store image proxy failed, continuing to Brave search`);
    }
  }

  // --- Step 3: Try Brave Image Search (primary) ---
  try {
    const braveResults = prefetchedResults?.braveResults ?? await (async () => {
      const braveQuery = buildBraveSearchQuery(label, categoryQuery, gender);
      return searchBraveImages(braveQuery, 8);
    })();
    if (braveResults.length > 0) {
      // Pass usedImageUrls so picker skips images already chosen by other links
      const bestImage = await pickBestBraveImage(braveResults, usedImageUrls, categoryQuery);
      if (bestImage && isValidImageUrl(bestImage)) {
        console.log(`${logPrefix} Brave Image: "${label}"`);
        const proxiedBraveUrl = await proxyImageToS3(bestImage);
        if (proxiedBraveUrl && isValidImageUrl(proxiedBraveUrl)) {
          saveProductImageToCache({
            productKey: cacheKey,
            imageUrl: proxiedBraveUrl,
            originalLabel: label,
            categoryQuery,
          }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
          return proxiedBraveUrl;
        }
        // Brave image proxy failed — try next Brave results before falling through
        console.log(`${logPrefix} Brave image proxy failed, trying other Brave results...`);
        for (const altResult of braveResults.slice(0, 6)) {
          const altUrl = altResult.url || altResult.thumbnailUrl;
          if (!altUrl || altUrl === bestImage) continue;
          if (usedImageUrls && usedImageUrls.has(altUrl.trim().toLowerCase())) continue;
          const altProxied = await proxyImageToS3(altUrl);
          if (altProxied && isValidImageUrl(altProxied)) {
            console.log(`${logPrefix} Brave alt image proxied OK: "${label}"`);
            saveProductImageToCache({
              productKey: cacheKey,
              imageUrl: altProxied,
              originalLabel: label,
              categoryQuery,
            }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
            return altProxied;
          }
        }
        console.log(`${logPrefix} all Brave images failed proxy, falling through to Google`);
      }
    }
  } catch (braveErr: any) {
    console.warn(`${logPrefix} Brave Image Search failed:`, braveErr?.message);
  }

  // --- Step 3b: Try Google Image Search (fallback) ---
  try {
    const googleResults = prefetchedResults?.googleResults ?? await (async () => {
      const googleQuery = buildProductSearchQuery(label, categoryQuery, gender);
      return searchGoogleImages(googleQuery, 8);
    })();
    if (googleResults.length > 0) {
      // Pass usedImageUrls so picker skips images already chosen by other links
      const bestImage = await pickBestProductImage(googleResults, usedImageUrls, categoryQuery);
      if (bestImage && isValidImageUrl(bestImage)) {
        console.log(`${logPrefix} Google Image: "${label}"`);
        const proxiedGoogleUrl = await proxyImageToS3(bestImage);
        if (proxiedGoogleUrl && isValidImageUrl(proxiedGoogleUrl)) {
          saveProductImageToCache({
            productKey: cacheKey,
            imageUrl: proxiedGoogleUrl,
            originalLabel: label,
            categoryQuery,
          }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
          return proxiedGoogleUrl;
        }
        // Google image proxy failed — try other Google results
        console.log(`${logPrefix} Google image proxy failed, trying other Google results...`);
        for (const altResult of googleResults.slice(0, 6)) {
          const altUrl = altResult.link;
          if (!altUrl || altUrl === bestImage) continue;
          if (usedImageUrls && usedImageUrls.has(altUrl.trim().toLowerCase())) continue;
          const altProxied = await proxyImageToS3(altUrl);
          if (altProxied && isValidImageUrl(altProxied)) {
            console.log(`${logPrefix} Google alt image proxied OK: "${label}"`);
            saveProductImageToCache({
              productKey: cacheKey,
              imageUrl: altProxied,
              originalLabel: label,
              categoryQuery,
            }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
            return altProxied;
          }
        }
        console.log(`${logPrefix} all Google images failed proxy, falling through to AI`);
      }
    }
  } catch (googleErr: any) {
    console.warn(`${logPrefix} Google Image Search failed:`, googleErr?.message);
  }

  // --- Step 4: AI image generation (fallback) ---
  if (!allowAIFallback) {
    return "";
  }

  const prompt = buildProductImagePrompt(label, categoryQuery, url);
  console.log(`${logPrefix} AI generation: "${label}"`);
  const startTime = Date.now();
  const { url: generatedUrl } = await generateImage({ prompt });
  const elapsed = Date.now() - startTime;
  if (!generatedUrl) {
    console.warn(`${logPrefix} no URL from AI (${elapsed}ms): "${label}"`);
    return "";
  }
  console.log(`${logPrefix} AI done in ${elapsed}ms: "${label}"`);
  const proxiedAIUrl = await proxyImageToS3(generatedUrl);
  saveProductImageToCache({
    productKey: cacheKey,
    imageUrl: proxiedAIUrl,
    originalLabel: label,
    categoryQuery,
  }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
  return proxiedAIUrl;
}

/**
 * Extract domain from a URL for domain-level deduplication.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function ensureUniqueImageWithinImprovement(params: {
  resolvedUrl: string;
  usedImageUrls: Set<string>;
  usedImageDomains?: Map<string, number>;
  label: string;
  url: string;
  categoryQuery: string;
  logPrefix: string;
  gender?: string;
  maxPerDomain?: number;
}): Promise<string> {
  const {
    resolvedUrl, usedImageUrls, usedImageDomains,
    label, url, categoryQuery, logPrefix, gender,
    maxPerDomain = 1,
  } = params;
  const normalized = resolvedUrl.trim().toLowerCase();
  const domain = extractDomain(resolvedUrl);

  // Check both exact URL and domain-level duplication
  const isExactDupe = normalized && usedImageUrls.has(normalized);
  const isDomainOverused = domain && usedImageDomains
    && (usedImageDomains.get(domain) || 0) >= maxPerDomain;

  if (!normalized || (!isExactDupe && !isDomainOverused)) {
    if (normalized) {
      usedImageUrls.add(normalized);
      if (domain && usedImageDomains) {
        usedImageDomains.set(domain, (usedImageDomains.get(domain) || 0) + 1);
      }
    }
    return resolvedUrl;
  }

  // Duplicate detected — try Brave/Google with different query variations
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const regenerated = await resolveShoppingLinkImage({
      label,
      url,
      categoryQuery,
      logPrefix: `${logPrefix} [dedupe:${attempt}]`,
      skipCache: true,
      skipStoreImage: true,
      allowAIFallback: attempt === 2, // Only use AI on second attempt
      promptSalt: `dedupe-${attempt}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      gender,
    });
    const regeneratedKey = (regenerated || "").trim().toLowerCase();
    const regeneratedDomain = extractDomain(regenerated || "");
    const isNewExact = regeneratedKey && !usedImageUrls.has(regeneratedKey);
    const isNewDomain = !usedImageDomains || !regeneratedDomain
      || (usedImageDomains.get(regeneratedDomain) || 0) < maxPerDomain;

    if (isNewExact && isNewDomain) {
      usedImageUrls.add(regeneratedKey);
      if (regeneratedDomain && usedImageDomains) {
        usedImageDomains.set(regeneratedDomain, (usedImageDomains.get(regeneratedDomain) || 0) + 1);
      }
      return regenerated;
    }
  }

  // Never clear an already-valid image; keep original to avoid empty cards.
  return resolvedUrl;
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .slice(0, 30);
}

type OutfitCategory =
  | "top"
  | "bottom"
  | "outerwear"
  | "dress"
  | "shoes"
  | "bag"
  | "watch"
  | "jewelry"
  | "accessory"
  | "other";

function detectFashionCategory(text: string): OutfitCategory {
  const t = (text || "").toLowerCase();

  if (/(shoe|sneaker|boot|loafer|heel|sandals?|נעל|סניקר)/.test(t)) return "shoes";
  if (/(watch|שעון)/.test(t)) return "watch";
  if (/(bag|backpack|purse|tote|תיק)/.test(t)) return "bag";
  if (/(coat|jacket|blazer|hoodie|cardigan|trench|מעיל|זקט|ז'קט|בלייזר|קפוצ)/.test(t)) return "outerwear";
  if (/(dress|gown|שמלה|אוברול)/.test(t)) return "dress";
  if (/(shirt|tee|t-shirt|polo|blouse|top|חולצ|טי שירט|גופיה)/.test(t)) return "top";
  if (/(jeans|pants|trouser|chino|shorts|skirt|מכנס|גינס|ג׳ינס|חצאית|שורט)/.test(t)) return "bottom";
  if (/(necklace|bracelet|ring|earring|שרשר|צמיד|טבעת|עגיל)/.test(t)) return "jewelry";
  if (/(hat|cap|belt|scarf|sunglass|משקפ|כובע|חגורה|צעיף)/.test(t)) return "accessory";
  return "other";
}

function buildCandidateDedupKey(label: string, url: string): string {
  const normalizedLabel = label
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedUrl = url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("?")[0]
    .trim();
  return `${normalizedLabel}::${normalizedUrl}`;
}

function scoreLinkForOutfit(
  link: { label: string; url: string; imageUrl?: string },
  categoryQuery: string,
  improvementTitle: string,
  outfitText: string,
): number {
  const sourceText = `${link.label} ${categoryQuery} ${improvementTitle}`.toLowerCase();
  const keywords = extractKeywords(sourceText);
  let score = 0;
  for (const word of keywords) {
    if (outfitText.includes(word)) score += 2;
  }
  if (link.imageUrl && isValidImageUrl(link.imageUrl)) score += 1;
  return score;
}

function buildOutfitCacheKey(outfit: OutfitSuggestion, outfitIndex: number): string {
  const base = `${outfit.name} ${outfit.occasion} ${(outfit.items || []).join(" ")} ${(outfit.colors || []).join(" ")}`;
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 380);
  return `outfit::idx:${outfitIndex}::${normalized}`;
}

function rotateCandidates<T>(arr: T[], offset: number): T[] {
  if (!arr.length) return arr;
  const safeOffset = ((offset % arr.length) + arr.length) % arr.length;
  if (safeOffset === 0) return arr;
  return [...arr.slice(safeOffset), ...arr.slice(0, safeOffset)];
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const ct = (response.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function buildOutfitMosaic(imageUrls: string[]): Promise<Buffer | null> {
  const sharp = (await import("sharp")).default;
  const selected = imageUrls.filter(Boolean).slice(0, 4);
  if (selected.length < 3) return null;

  const buffers = (await Promise.all(selected.map(fetchImageBuffer))).filter(Boolean) as Buffer[];
  if (buffers.length < 2) return null;

  const tileSize = 512;
  const canvas = sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 8, g: 12, b: 24 },
    },
  });

  const composites = await Promise.all(
    buffers.slice(0, 4).map(async (buf, idx) => {
      const prepared = await sharp(buf)
        .rotate()
        .resize(tileSize, tileSize, { fit: "cover" })
        .jpeg({ quality: 86 })
        .toBuffer();
      const x = (idx % 2) * tileSize;
      const y = Math.floor(idx / 2) * tileSize;
      return { input: prepared, left: x, top: y };
    }),
  );

  return canvas.composite(composites).png().toBuffer();
}

export async function generateOutfitLookFromMetadata(params: {
  analysis: FashionAnalysis;
  outfit: OutfitSuggestion;
  outfitIndex: number;
  allowAIFallbackForLinks?: boolean;
  gender?: string;
}): Promise<{ imageUrl: string; storeLinks: Array<{ label: string; url: string; imageUrl: string }> } | null> {
  const { analysis, outfit, outfitIndex, allowAIFallbackForLinks = false, gender } = params;
  const cacheKey = buildOutfitCacheKey(outfit, outfitIndex);
  const cached = await getCachedProductImage(cacheKey, CACHE_TTL_DAYS);
  if (cached && isValidImageUrl(cached)) {
    return { imageUrl: cached, storeLinks: [] };
  }

  const outfitText = `${outfit.name} ${outfit.occasion} ${(outfit.items || []).join(" ")}`.toLowerCase();
  const rawCandidates = (analysis.improvements || []).flatMap((imp) =>
    (imp.shoppingLinks || []).map((link) => ({
      link,
      categoryQuery: imp.productSearchQuery || "",
      improvementTitle: imp.title || "",
      category: detectFashionCategory(`${link.label} ${imp.productSearchQuery || ""} ${imp.title || ""}`),
      score: scoreLinkForOutfit(link, imp.productSearchQuery || "", imp.title || "", outfitText),
    })),
  );

  // Remove exact/near duplicates early (same label+URL)
  const dedupMap = new Map<string, (typeof rawCandidates)[number]>();
  for (const c of rawCandidates) {
    const key = buildCandidateDedupKey(c.link.label, c.link.url);
    const prev = dedupMap.get(key);
    if (!prev || c.score > prev.score) dedupMap.set(key, c);
  }
  const candidates = Array.from(dedupMap.values()).sort((a, b) => b.score - a.score);
  // Diversify different look cards so outfit #1/#2/#3 do not all pick identical top-ranked links.
  const diversifiedCandidates = rotateCandidates(candidates, outfitIndex);
  const categoryPools = new Map<OutfitCategory, typeof diversifiedCandidates>();
  for (const c of diversifiedCandidates) {
    const existing = categoryPools.get(c.category) || [];
    existing.push(c);
    categoryPools.set(c.category, existing);
  }
  const hasCategoryVariants = Array.from(categoryPools.values()).some((pool) => pool.length > 1);
  // If metadata source has no per-category variance, later cards should use AI fallback
  // instead of repeating the exact same collage.
  if (outfitIndex > 0 && !hasCategoryVariants) {
    return null;
  }

  // Select links with strict diversity: max one per category in metadata mode
  const selected: typeof candidates = [];
  const usedCategories = new Set<OutfitCategory>();
  const usedDedupKeys = new Set<string>();

  const prefersDress = /(dress|gown|שמלה|אוברול)/.test(outfitText);
  const coreSlots: OutfitCategory[] = prefersDress
    ? ["dress", "shoes", "outerwear"]
    : ["top", "bottom", "shoes"];

  const tryPickCategory = (cat: OutfitCategory) => {
    if (selected.length >= 4) return;
    const pool = categoryPools.get(cat) || [];
    if (pool.length === 0) return;
    const start = outfitIndex % pool.length;
    let found: (typeof diversifiedCandidates)[number] | undefined;
    for (let step = 0; step < pool.length; step += 1) {
      const candidate = pool[(start + step) % pool.length];
      const key = buildCandidateDedupKey(candidate.link.label, candidate.link.url);
      if (!usedDedupKeys.has(key) && !usedCategories.has(candidate.category)) {
        found = candidate;
        break;
      }
    }
    if (!found) return;
    selected.push(found);
    usedCategories.add(found.category);
    usedDedupKeys.add(buildCandidateDedupKey(found.link.label, found.link.url));
  };

  // Pass 1: strict full-look skeleton (core apparel first)
  for (const cat of coreSlots) {
    tryPickCategory(cat);
  }

  // Pass 2: ensure >=3 clothing categories (no accessories-only collage)
  const apparelPriority: OutfitCategory[] = ["top", "bottom", "shoes", "outerwear", "dress"];
  const apparelCount = () =>
    selected.filter((s) => ["top", "bottom", "shoes", "outerwear", "dress"].includes(s.category)).length;
  for (const cat of apparelPriority) {
    if (apparelCount() >= 3) break;
    if (usedCategories.has(cat)) continue;
    tryPickCategory(cat);
  }

  // Pass 3: fill remaining slots with best non-duplicate categories
  if (selected.length < 4) {
    const start = diversifiedCandidates.length > 0 ? outfitIndex % diversifiedCandidates.length : 0;
    for (let i = 0; i < diversifiedCandidates.length; i += 1) {
      const c = diversifiedCandidates[(start + i) % diversifiedCandidates.length];
      const key = buildCandidateDedupKey(c.link.label, c.link.url);
      if (usedDedupKeys.has(key)) continue;
      if (usedCategories.has(c.category)) continue;
      selected.push(c);
      usedCategories.add(c.category);
      usedDedupKeys.add(key);
      if (selected.length >= 4) break;
    }
  }

  // If we couldn't build a full-look structure, use AI fallback instead of a broken mosaic.
  const distinctCategoryCount = new Set(selected.map((s) => s.category)).size;
  const clothingCount = selected.filter((s) =>
    ["top", "bottom", "shoes", "outerwear", "dress"].includes(s.category)
  ).length;
  if (selected.length < 3 || distinctCategoryCount < 3 || clothingCount < 3) {
    return null;
  }

  // Resolve all shopping link images in parallel for speed
  const resolvePromises = selected.slice(0, 6).map(async (item) => {
    try {
      const resolvedUrl = await resolveShoppingLinkImage({
        label: item.link.label,
        url: item.link.url,
        categoryQuery: item.categoryQuery || "outfit",
        logPrefix: `[OutfitMetadata] [${outfitIndex}]`,
        allowAIFallback: allowAIFallbackForLinks,
        gender,
      });
      if (resolvedUrl && isValidImageUrl(resolvedUrl)) {
        return { label: item.link.label, url: item.link.url, imageUrl: resolvedUrl };
      }
    } catch (err: any) {
      console.warn(`[OutfitMetadata] Failed to resolve image for ${item.link.label}: ${err?.message}`);
    }
    return null;
  });
  const resolvedResults = await Promise.all(resolvePromises);
  const resolved = resolvedResults.filter((r): r is { label: string; url: string; imageUrl: string } => r !== null).slice(0, 4);

  const categoryRank: Record<OutfitCategory, number> = {
    top: 1,
    dress: 1,
    outerwear: 2,
    bottom: 3,
    shoes: 4,
    bag: 5,
    watch: 6,
    jewelry: 7,
    accessory: 8,
    other: 9,
  };
  const resolvedOrdered = resolved
    .map((r) => {
      const matched = selected.find((s) => s.link.label === r.label && s.link.url === r.url);
      return { ...r, category: matched?.category || "other" as OutfitCategory };
    })
    .sort((a, b) => categoryRank[a.category] - categoryRank[b.category])
    .slice(0, 4);

  const resolvedOrderedClothingCount = resolvedOrdered.filter((r) =>
    ["top", "bottom", "shoes", "outerwear", "dress"].includes(r.category)
  ).length;
  if (resolvedOrdered.length < 3 || resolvedOrderedClothingCount < 3) {
    return null;
  }

  const mosaic = await buildOutfitMosaic(resolvedOrdered.map(r => r.imageUrl));
  if (!mosaic) return null;

  const { url: storedUrl } = await storagePut(
    `generated/outfit-metadata/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
    mosaic,
    "image/png",
  );
  if (!storedUrl) return null;

  saveProductImageToCache({
    productKey: cacheKey,
    imageUrl: storedUrl,
    originalLabel: outfit.name || `Outfit ${outfitIndex + 1}`,
    categoryQuery: "outfit-metadata",
  }).catch(err => console.warn("[OutfitMetadata] Cache save failed:", err?.message));

  return {
    imageUrl: storedUrl,
    storeLinks: resolvedOrdered.map(({ category: _category, ...rest }) => rest),
  };
}

/**
 * Generate a UNIQUE product image for EACH shopping link across ALL improvements.
 * Checks cache first — reuses existing images when available.
 * Calls `onImageReady` after each image is generated/found so the DB can be updated progressively.
 */
export async function enrichAnalysisWithProductImages(
  analysis: FashionAnalysis,
  onImageReady?: OnImageReady,
  gender?: string,
): Promise<FashionAnalysis> {
  if (!analysis.improvements || analysis.improvements.length === 0) {
    console.log("[ProductImages] No improvements to enrich");
    return analysis;
  }

  // Collect all shopping links that need images
  type Task = { impIdx: number; linkIdx: number; label: string; url: string; categoryQuery: string };
  const tasks: Task[] = [];

  analysis.improvements.forEach((imp, impIdx) => {
    imp.shoppingLinks.forEach((link, linkIdx) => {
      tasks.push({ impIdx, linkIdx, label: link.label, url: link.url, categoryQuery: imp.productSearchQuery });
    });
  });

  const totalLinks = tasks.length;
  console.log(`[ProductImages] Starting enrichment for ${totalLinks} unique product images (max ${MAX_CONCURRENT} concurrent)`);

  // Deep clone improvements to avoid mutation issues
  const enrichedImprovements = analysis.improvements.map(imp => ({
    ...imp,
    shoppingLinks: imp.shoppingLinks.map(link => ({ ...link })),
  }));

  // HYBRID APPROACH: Prefetch search results in PARALLEL for speed,
  // then pick images SEQUENTIALLY with usedImageUrls for uniqueness.
  const improvementTasks = enrichedImprovements.map((imp, impIdx) => async (): Promise<void> => {
    const usedImageUrls = new Set<string>();
    const categoryQuery = imp.productSearchQuery || "";
    const linksNeedingImages: number[] = [];

    // First pass: check which links need new images
    for (let linkIdx = 0; linkIdx < imp.shoppingLinks.length; linkIdx += 1) {
      const link = imp.shoppingLinks[linkIdx];
      const existingUrl = link.imageUrl;
      if (existingUrl && isValidImageUrl(existingUrl)) {
        const normalizedExisting = existingUrl.trim().toLowerCase();
        if (!usedImageUrls.has(normalizedExisting)) {
          console.log(`[ProductImages] Existing image OK for [${impIdx}][${linkIdx}]: "${link.label}"`);
          usedImageUrls.add(normalizedExisting);
          continue;
        }
      }
      linksNeedingImages.push(linkIdx);
    }

    if (linksNeedingImages.length === 0) return;

    // PARALLEL PREFETCH: Fetch Brave + Google results for ALL links that need images at once
    const prefetchPromises = linksNeedingImages.map(async (linkIdx) => {
      const link = imp.shoppingLinks[linkIdx];
      const [braveResults, googleResults] = await Promise.all([
        (async () => {
          try {
            const braveQuery = buildBraveSearchQuery(link.label, categoryQuery, gender);
            return await searchBraveImages(braveQuery, 8);
          } catch { return []; }
        })(),
        (async () => {
          try {
            const googleQuery = buildProductSearchQuery(link.label, categoryQuery, gender);
            return await searchGoogleImages(googleQuery, 8);
          } catch { return []; }
        })(),
      ]);
      return { linkIdx, braveResults, googleResults };
    });
    const prefetchedAll = await Promise.all(prefetchPromises);
    const prefetchMap = new Map(prefetchedAll.map(p => [p.linkIdx, { braveResults: p.braveResults, googleResults: p.googleResults }]));

    // SEQUENTIAL SELECTION: Pick images one by one with shared usedImageUrls
    for (const linkIdx of linksNeedingImages) {
      const link = imp.shoppingLinks[linkIdx];
      const label = link.label;
      const url = link.url;

      try {
        const resolvedUrl = await resolveShoppingLinkImage({
          label,
          url,
          categoryQuery,
          logPrefix: `[ProductImages] [${impIdx}][${linkIdx}]`,
          gender,
          usedImageUrls,
          prefetchedResults: prefetchMap.get(linkIdx),
        });
        if (resolvedUrl) {
          const normalizedResolved = resolvedUrl.trim().toLowerCase();
          // Double-check it's not a duplicate (cache/store could return same URL)
          if (usedImageUrls.has(normalizedResolved)) {
            console.log(`[ProductImages] [${impIdx}][${linkIdx}] resolved URL already used, trying AI fallback`);
            // Try AI generation as unique fallback
            const prompt = buildProductImagePrompt(label, categoryQuery, url);
            try {
              const { url: aiUrl } = await generateImage({ prompt });
              if (aiUrl && !usedImageUrls.has(aiUrl.trim().toLowerCase())) {
                imp.shoppingLinks[linkIdx].imageUrl = aiUrl;
                usedImageUrls.add(aiUrl.trim().toLowerCase());
                if (onImageReady) {
                  try { await onImageReady(impIdx, linkIdx, aiUrl); } catch (dbErr: any) {
                    console.warn(`[ProductImages] DB update failed for [${impIdx}][${linkIdx}]:`, dbErr?.message);
                  }
                }
                continue;
              }
            } catch { /* AI failed, use placeholder */ }
            // Use placeholder as last resort
            const placeholder = getCategoryPlaceholder(categoryQuery, linkIdx);
            imp.shoppingLinks[linkIdx].imageUrl = placeholder;
            // Don't add placeholder to usedImageUrls — placeholders are okay to repeat
          } else {
            imp.shoppingLinks[linkIdx].imageUrl = resolvedUrl;
            usedImageUrls.add(normalizedResolved);
            if (onImageReady) {
              try { await onImageReady(impIdx, linkIdx, resolvedUrl); } catch (dbErr: any) {
                console.warn(`[ProductImages] DB update failed for [${impIdx}][${linkIdx}]:`, dbErr?.message);
              }
            }
          }
        } else {
          const placeholder = getCategoryPlaceholder(categoryQuery, linkIdx);
          imp.shoppingLinks[linkIdx].imageUrl = placeholder;
          console.log(`[ProductImages] Using placeholder for [${impIdx}][${linkIdx}]: category="${categoryQuery}"`);
        }
      } catch (err: any) {
        console.warn(`[ProductImages] \u2717 Failed [${impIdx}][${linkIdx}]:`, err?.message || err);
        const placeholder = getCategoryPlaceholder(categoryQuery, linkIdx);
        imp.shoppingLinks[linkIdx].imageUrl = placeholder;
      }
    }
  });

  // Run different improvements concurrently (they have different categories)
  await runWithConcurrency(improvementTasks, MAX_CONCURRENT);

  const successCount = enrichedImprovements.reduce(
    (sum, imp) => sum + imp.shoppingLinks.filter(l => l.imageUrl && isValidImageUrl(l.imageUrl)).length,
    0
  );
  console.log(`[ProductImages] Enrichment complete: ${successCount}/${totalLinks} links got unique images`);

  return { ...analysis, improvements: enrichedImprovements };
}

/**
 * Lazy loading: Generate images for a SINGLE improvement category on demand.
 * Called when the user expands a specific improvement section in the UI.
 * Returns the updated shopping links with images for that improvement only.
 */
export async function generateImagesForImprovement(
  improvement: { shoppingLinks: Array<{ label: string; url: string; imageUrl?: string }>; productSearchQuery: string },
  onImageReady?: (linkIdx: number, imageUrl: string) => Promise<void>,
  gender?: string,
): Promise<Array<{ label: string; url: string; imageUrl?: string }>> {
  const links = improvement.shoppingLinks.map(link => ({ ...link }));
  
  console.log(`[ProductImages] Lazy loading: generating ${links.length} images for category "${improvement.productSearchQuery}"`);

  // HYBRID: prefetch + sequential selection for speed + uniqueness
  const usedImageUrls = new Set<string>();
  const categoryQuery = improvement.productSearchQuery || "";
  const linksNeedingImages: number[] = [];

  // Helper: check if URL is already on our own storage (safe to display in browser)
  const isOwnStorageUrl = (url: string) => {
    if (!url) return false;
    try {
      const h = new URL(url).hostname;
      return h.includes('cloudfront') || h.includes('r2.') || h.includes('manus') || h.includes('pub-') || h.includes('unsplash') || h.includes('openai');
    } catch { return false; }
  };

  // First pass: check which links already have valid images on our storage
  for (let linkIdx = 0; linkIdx < links.length; linkIdx += 1) {
    const link = links[linkIdx];
    if (link.imageUrl && isValidImageUrl(link.imageUrl)) {
      // If image is from external CDN, proxy it to S3 first
      if (!isOwnStorageUrl(link.imageUrl)) {
        console.log(`[ProductImages] Lazy: external CDN image for [${linkIdx}], proxying to S3...`);
        const proxiedUrl = await proxyImageToS3(link.imageUrl);
        if (proxiedUrl !== link.imageUrl && isOwnStorageUrl(proxiedUrl)) {
          // Successfully proxied — update the link and save to DB
          link.imageUrl = proxiedUrl;
          const normalizedExisting = proxiedUrl.trim().toLowerCase();
          usedImageUrls.add(normalizedExisting);
          if (onImageReady) {
            try { await onImageReady(linkIdx, proxiedUrl); } catch (e: any) {
              console.warn(`[ProductImages] DB update after proxy failed:`, e?.message);
            }
          }
          console.log(`[ProductImages] Lazy: proxied [${linkIdx}] to S3 OK`);
          continue;
        }
        // Proxy failed — treat as needing new image
        console.log(`[ProductImages] Lazy: proxy failed for [${linkIdx}], will re-fetch`);
        linksNeedingImages.push(linkIdx);
        continue;
      }
      const normalizedExisting = link.imageUrl.trim().toLowerCase();
      if (!usedImageUrls.has(normalizedExisting)) {
        console.log(`[ProductImages] Lazy: existing image OK for [${linkIdx}]: "${link.label}"`);
        usedImageUrls.add(normalizedExisting);
        continue;
      }
    }
    linksNeedingImages.push(linkIdx);
  }

  if (linksNeedingImages.length > 0) {
    // PARALLEL PREFETCH: Fetch Brave + Google results for ALL links at once
    const prefetchPromises = linksNeedingImages.map(async (linkIdx) => {
      const link = links[linkIdx];
      const [braveResults, googleResults] = await Promise.all([
        (async () => {
          try {
            const braveQuery = buildBraveSearchQuery(link.label, categoryQuery, gender);
            return await searchBraveImages(braveQuery, 8);
          } catch { return []; }
        })(),
        (async () => {
          try {
            const googleQuery = buildProductSearchQuery(link.label, categoryQuery, gender);
            return await searchGoogleImages(googleQuery, 8);
          } catch { return []; }
        })(),
      ]);
      return { linkIdx, braveResults, googleResults };
    });
    const prefetchedAll = await Promise.all(prefetchPromises);
    const prefetchMap = new Map(prefetchedAll.map(p => [p.linkIdx, { braveResults: p.braveResults, googleResults: p.googleResults }]));

  // SEQUENTIAL SELECTION: Pick images one by one with shared usedImageUrls
  for (const linkIdx of linksNeedingImages) {
    const link = links[linkIdx];

    try {
      const resolvedUrl = await resolveShoppingLinkImage({
        label: link.label,
        url: link.url,
        categoryQuery,
        logPrefix: `[ProductImages] Lazy [${linkIdx}]`,
        gender,
        usedImageUrls,
        prefetchedResults: prefetchMap.get(linkIdx),
      });
      if (resolvedUrl) {
        const normalizedResolved = resolvedUrl.trim().toLowerCase();
        if (usedImageUrls.has(normalizedResolved)) {
          // Duplicate — try AI fallback
          const prompt = buildProductImagePrompt(link.label, improvement.productSearchQuery, link.url);
          try {
            const { url: aiUrl } = await generateImage({ prompt });
            if (aiUrl && !usedImageUrls.has(aiUrl.trim().toLowerCase())) {
              links[linkIdx].imageUrl = aiUrl;
              usedImageUrls.add(aiUrl.trim().toLowerCase());
              if (onImageReady) {
                try { await onImageReady(linkIdx, aiUrl); } catch (dbErr: any) {
                  console.warn(`[ProductImages] Lazy: DB update failed for [${linkIdx}]:`, dbErr?.message);
                }
              }
              continue;
            }
          } catch { /* AI failed */ }
          const placeholder = getCategoryPlaceholder(improvement.productSearchQuery || "", linkIdx);
          links[linkIdx].imageUrl = placeholder;
        } else {
          links[linkIdx].imageUrl = resolvedUrl;
          usedImageUrls.add(normalizedResolved);
          if (onImageReady) {
            try { await onImageReady(linkIdx, resolvedUrl); } catch (dbErr: any) {
              console.warn(`[ProductImages] Lazy: DB update failed for [${linkIdx}]:`, dbErr?.message);
            }
          }
        }
      } else {
        const placeholder = getCategoryPlaceholder(improvement.productSearchQuery || "", linkIdx);
        links[linkIdx].imageUrl = placeholder;
        console.log(`[ProductImages] Lazy: using placeholder for [${linkIdx}]`);
      }
    } catch (err: any) {
      console.warn(`[ProductImages] Lazy: failed [${linkIdx}]:`, err?.message || err);
      const placeholder = getCategoryPlaceholder(improvement.productSearchQuery || "", linkIdx);
      links[linkIdx].imageUrl = placeholder;
    }
  }
  } // end if (linksNeedingImages.length > 0)

  return links;
}

/**
 * Build a unique prompt for each specific product.
 */
function buildProductImagePrompt(linkLabel: string, categoryQuery: string, productUrl?: string): string {
  const [productNameRaw, storeFromLabelRaw] = linkLabel.split(/\s*[—–]\s*/);
  const productName = (productNameRaw || linkLabel).trim();
  const storeFromLabel = (storeFromLabelRaw || "").trim();
  let storeHost = "";
  if (productUrl) {
    try {
      storeHost = new URL(productUrl).hostname.replace(/^www\./, "");
    } catch {
      storeHost = "";
    }
  }
  const storeHint = storeFromLabel || storeHost || "fashion store";
  const seed = `${linkLabel}|${categoryQuery}|${storeHint}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const variants = [
    "front-facing studio angle",
    "3/4 angle with visible texture detail",
    "flat-lay style product cutout composition",
  ];
  const variant = variants[Math.abs(hash) % variants.length];
  return `E-commerce product photo of ${productName}. Category: ${categoryQuery}. Store context: ${storeHint}. White/neutral background, studio lighting, single product only, no model, no text. Variation: ${variant}.`;
}

export function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  if (!url.startsWith("http")) return false;
  if (url.includes("placeholder") || url.includes("example.com")) return false;
  return true;
}

async function testImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    const contentType = response.headers.get("content-type") || "";
    return response.ok && contentType.startsWith("image/");
  } catch {
    return false;
  }
}
