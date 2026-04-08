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
    const timeoutId = setTimeout(() => controller.abort(), 8000);
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
  } = params;
  const cacheKey = normalizeProductKey(label, categoryQuery, url);
  if (!skipCache) {
    const cachedUrl = await getCachedProductImage(cacheKey, CACHE_TTL_DAYS);
    if (cachedUrl && isValidImageUrl(cachedUrl)) {
      const works = await testImageUrl(cachedUrl);
      if (works) {
        console.log(`${logPrefix} cache hit: "${label}"`);
        return cachedUrl;
      }
    }
  }

  // --- Step 2: Try store OG image ---
  if (!skipStoreImage) {
    const storeImageUrl = await fetchStoreImageUrl(url);
    if (storeImageUrl && isValidImageUrl(storeImageUrl)) {
      console.log(`${logPrefix} store image: "${label}"`);
      saveProductImageToCache({
        productKey: cacheKey,
        imageUrl: storeImageUrl,
        originalLabel: label,
        categoryQuery,
      }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
      return storeImageUrl;
    }
  }

  // --- Step 3: Try Brave Image Search (primary) ---
  try {
    const braveQuery = buildBraveSearchQuery(label, categoryQuery);
    const braveResults = await searchBraveImages(braveQuery, 5);
    if (braveResults.length > 0) {
      const bestImage = await pickBestBraveImage(braveResults);
      if (bestImage && isValidImageUrl(bestImage)) {
        const reachable = await testImageUrl(bestImage);
        if (reachable) {
          console.log(`${logPrefix} Brave Image: "${label}"`);
          saveProductImageToCache({
            productKey: cacheKey,
            imageUrl: bestImage,
            originalLabel: label,
            categoryQuery,
          }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
          return bestImage;
        }
      }
    }
  } catch (braveErr: any) {
    console.warn(`${logPrefix} Brave Image Search failed:`, braveErr?.message);
  }

  // --- Step 3b: Try Google Image Search (fallback) ---
  try {
    const googleQuery = buildProductSearchQuery(label, categoryQuery);
    const googleResults = await searchGoogleImages(googleQuery, 5);
    if (googleResults.length > 0) {
      const bestImage = await pickBestProductImage(googleResults);
      if (bestImage && isValidImageUrl(bestImage)) {
        const reachable = await testImageUrl(bestImage);
        if (reachable) {
          console.log(`${logPrefix} Google Image: "${label}"`);
          saveProductImageToCache({
            productKey: cacheKey,
            imageUrl: bestImage,
            originalLabel: label,
            categoryQuery,
          }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
          return bestImage;
        }
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
  saveProductImageToCache({
    productKey: cacheKey,
    imageUrl: generatedUrl,
    originalLabel: label,
    categoryQuery,
  }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));
  return generatedUrl;
}

async function ensureUniqueImageWithinImprovement(params: {
  resolvedUrl: string;
  usedImageUrls: Set<string>;
  label: string;
  url: string;
  categoryQuery: string;
  logPrefix: string;
}): Promise<string> {
  const { resolvedUrl, usedImageUrls, label, url, categoryQuery, logPrefix } = params;
  const normalized = resolvedUrl.trim().toLowerCase();
  if (!normalized || !usedImageUrls.has(normalized)) {
    if (normalized) usedImageUrls.add(normalized);
    return resolvedUrl;
  }

  // Same image URL appeared again in the same improvement.
  // Force AI-only regeneration attempts with prompt salt to avoid duplicate cards.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const regenerated = await resolveShoppingLinkImage({
      label,
      url,
      categoryQuery,
      logPrefix: `${logPrefix} [dedupe:${attempt}]`,
      skipCache: true,
      skipStoreImage: true,
      allowAIFallback: true,
      promptSalt: `dedupe-${attempt}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
    const regeneratedKey = (regenerated || "").trim().toLowerCase();
    if (regeneratedKey && !usedImageUrls.has(regeneratedKey)) {
      usedImageUrls.add(regeneratedKey);
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
}): Promise<{ imageUrl: string; storeLinks: Array<{ label: string; url: string; imageUrl: string }> } | null> {
  const { analysis, outfit, outfitIndex, allowAIFallbackForLinks = false } = params;
  const cacheKey = buildOutfitCacheKey(outfit, outfitIndex);
  const cached = await getCachedProductImage(cacheKey, CACHE_TTL_DAYS);
  if (cached && isValidImageUrl(cached)) {
    const works = await testImageUrl(cached);
    if (works) {
      return { imageUrl: cached, storeLinks: [] };
    }
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

  // Build one task per shopping link
  const taskFns = tasks.map((task) => async (): Promise<void> => {
    const { impIdx, linkIdx, label, url, categoryQuery } = task;
    const existingUrl = enrichedImprovements[impIdx].shoppingLinks[linkIdx].imageUrl;

    // Skip if existing image is valid
    if (existingUrl && isValidImageUrl(existingUrl)) {
      const works = await testImageUrl(existingUrl);
      if (works) {
        console.log(`[ProductImages] Existing image OK for [${impIdx}][${linkIdx}]: "${label}"`);
        return;
      }
    }

    try {
      const resolvedUrl = await resolveShoppingLinkImage({
        label,
        url,
        categoryQuery,
        logPrefix: `[ProductImages] [${impIdx}][${linkIdx}]`,
      });
      if (resolvedUrl) {
        enrichedImprovements[impIdx].shoppingLinks[linkIdx].imageUrl = resolvedUrl;

        // Progressive DB update
        if (onImageReady) {
          try { await onImageReady(impIdx, linkIdx, resolvedUrl); } catch (dbErr: any) {
            console.warn(`[ProductImages] DB update failed for [${impIdx}][${linkIdx}]:`, dbErr?.message);
          }
        }
      } else {
        enrichedImprovements[impIdx].shoppingLinks[linkIdx].imageUrl = "";
      }
    } catch (err: any) {
      console.warn(`[ProductImages] ✗ Failed [${impIdx}][${linkIdx}]:`, err?.message || err);
      enrichedImprovements[impIdx].shoppingLinks[linkIdx].imageUrl = "";
    }
  });

  await runWithConcurrency(taskFns, MAX_CONCURRENT);

  // Enforce image diversity per improvement:
  // if multiple links ended up with the same image URL, force AI-only regeneration for duplicates.
  for (let impIdx = 0; impIdx < enrichedImprovements.length; impIdx += 1) {
    const imp = enrichedImprovements[impIdx];
    const usedImageUrls = new Set<string>();
    for (let linkIdx = 0; linkIdx < imp.shoppingLinks.length; linkIdx += 1) {
      const link = imp.shoppingLinks[linkIdx];
      const current = (link.imageUrl || "").trim();
      if (!current) continue;
      const unique = await ensureUniqueImageWithinImprovement({
        resolvedUrl: current,
        usedImageUrls,
        label: link.label,
        url: link.url,
        categoryQuery: imp.productSearchQuery || "",
        logPrefix: `[ProductImages] [${impIdx}][${linkIdx}]`,
      });
      if (!unique) {
        link.imageUrl = "";
        continue;
      }
      link.imageUrl = unique;
      if (onImageReady && unique !== current) {
        try {
          await onImageReady(impIdx, linkIdx, unique);
        } catch (dbErr: any) {
          console.warn(`[ProductImages] DB update failed for dedupe [${impIdx}][${linkIdx}]:`, dbErr?.message);
        }
      }
    }
  }

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
): Promise<Array<{ label: string; url: string; imageUrl?: string }>> {
  const links = improvement.shoppingLinks.map(link => ({ ...link }));
  
  console.log(`[ProductImages] Lazy loading: generating ${links.length} images for category "${improvement.productSearchQuery}"`);

  const taskFns = links.map((link, linkIdx) => async (): Promise<void> => {
    // Skip if already has a valid image
    if (link.imageUrl && isValidImageUrl(link.imageUrl)) {
      const works = await testImageUrl(link.imageUrl);
      if (works) {
        console.log(`[ProductImages] Lazy: existing image OK for [${linkIdx}]: "${link.label}"`);
        return;
      }
    }

    try {
      const resolvedUrl = await resolveShoppingLinkImage({
        label: link.label,
        url: link.url,
        categoryQuery: improvement.productSearchQuery,
        logPrefix: `[ProductImages] Lazy [${linkIdx}]`,
      });
      if (resolvedUrl) {
        links[linkIdx].imageUrl = resolvedUrl;
        if (onImageReady) {
          try { await onImageReady(linkIdx, resolvedUrl); } catch (dbErr: any) {
            console.warn(`[ProductImages] Lazy: DB update failed:`, dbErr?.message);
          }
        }
      } else {
        links[linkIdx].imageUrl = "";
      }
    } catch (err: any) {
      console.warn(`[ProductImages] Lazy: failed [${linkIdx}]:`, err?.message || err);
      links[linkIdx].imageUrl = "";
    }
  });

  await runWithConcurrency(taskFns, MAX_CONCURRENT);

  // Enforce image diversity inside this single improvement payload.
  const usedImageUrls = new Set<string>();
  for (let linkIdx = 0; linkIdx < links.length; linkIdx += 1) {
    const link = links[linkIdx];
    const current = (link.imageUrl || "").trim();
    if (!current) continue;
    const unique = await ensureUniqueImageWithinImprovement({
      resolvedUrl: current,
      usedImageUrls,
      label: link.label,
      url: link.url,
      categoryQuery: improvement.productSearchQuery || "",
      logPrefix: `[ProductImages] Lazy [${linkIdx}]`,
    });
    if (!unique) {
      links[linkIdx].imageUrl = "";
      continue;
    }
    links[linkIdx].imageUrl = unique;
    if (onImageReady && unique !== current) {
      try {
        await onImageReady(linkIdx, unique);
      } catch (dbErr: any) {
        console.warn(`[ProductImages] Lazy: DB update failed for dedupe [${linkIdx}]:`, dbErr?.message);
      }
    }
  }

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
