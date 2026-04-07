/**
 * Product Image Helper
 * 
 * Uses the built-in image generation API to create realistic product images
 * for fashion recommendations. Each shopping link gets its OWN unique image.
 * 
 * Features:
 * - **Cache**: Checks DB cache before generating. If the same product was generated before, reuses the image.
 * - **Lazy loading**: Can generate images for a SINGLE improvement category on demand.
 * - **Progressive updates**: Each image is saved to DB as soon as it's ready.
 * - **Concurrency limit**: Max 3 concurrent image generations.
 */
import { generateImage } from "./_core/imageGeneration";
import { getCachedProductImage, saveProductImageToCache, normalizeProductKey } from "./db";
import type { FashionAnalysis } from "../shared/fashionTypes";

const MAX_CONCURRENT = 3;
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
}): Promise<string> {
  const { label, url, categoryQuery, logPrefix } = params;
  const cacheKey = normalizeProductKey(label, categoryQuery);
  const cachedUrl = await getCachedProductImage(cacheKey, CACHE_TTL_DAYS);
  if (cachedUrl && isValidImageUrl(cachedUrl)) {
    const works = await testImageUrl(cachedUrl);
    if (works) {
      console.log(`${logPrefix} cache hit: "${label}"`);
      return cachedUrl;
    }
  }

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

  const prompt = buildProductImagePrompt(label, categoryQuery);
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
  return links;
}

/**
 * Build a unique prompt for each specific product.
 */
function buildProductImagePrompt(linkLabel: string, categoryQuery: string): string {
  const productName = linkLabel.split(/\s*[—–]\s*/)[0].trim();
  return `E-commerce product photo: ${productName}. Category: ${categoryQuery}. White background, studio lighting, single product, no model, no text.`;
}

export function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  if (!url.startsWith("http")) return false;
  if (url.includes("placeholder") || url.includes("example.com")) return false;
  return true;
}

async function testImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    const contentType = response.headers.get("content-type") || "";
    return response.ok && contentType.startsWith("image/");
  } catch {
    return false;
  }
}
