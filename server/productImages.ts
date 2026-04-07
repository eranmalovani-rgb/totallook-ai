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
 * - **Concurrency limit**: Max 6 concurrent image generations.
 */
import { generateImage } from "./_core/imageGeneration";
import { getCachedProductImage, saveProductImageToCache, normalizeProductKey } from "./db";
import type { FashionAnalysis } from "../shared/fashionTypes";

const MAX_CONCURRENT = 3;

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
  type Task = { impIdx: number; linkIdx: number; label: string; categoryQuery: string };
  const tasks: Task[] = [];

  analysis.improvements.forEach((imp, impIdx) => {
    imp.shoppingLinks.forEach((link, linkIdx) => {
      tasks.push({ impIdx, linkIdx, label: link.label, categoryQuery: imp.productSearchQuery });
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
    const { impIdx, linkIdx, label, categoryQuery } = task;
    const existingUrl = enrichedImprovements[impIdx].shoppingLinks[linkIdx].imageUrl;

    // Skip if existing image is valid
    if (existingUrl && isValidImageUrl(existingUrl)) {
      const works = await testImageUrl(existingUrl);
      if (works) {
        console.log(`[ProductImages] Existing image OK for [${impIdx}][${linkIdx}]: "${label}"`);
        return;
      }
    }

    // Check cache first
    const cacheKey = normalizeProductKey(label, categoryQuery);
    const cachedUrl = await getCachedProductImage(cacheKey);
    if (cachedUrl && isValidImageUrl(cachedUrl)) {
      const works = await testImageUrl(cachedUrl);
      if (works) {
        console.log(`[ProductImages] ✓ Cache hit for [${impIdx}][${linkIdx}]: "${label}"`);
        enrichedImprovements[impIdx].shoppingLinks[linkIdx].imageUrl = cachedUrl;
        if (onImageReady) {
          try { await onImageReady(impIdx, linkIdx, cachedUrl); } catch (e: any) {
            console.warn(`[ProductImages] DB update failed for cache hit:`, e?.message);
          }
        }
        return;
      }
    }

    // Generate a new product image
    try {
      const prompt = buildProductImagePrompt(label, categoryQuery);
      console.log(`[ProductImages] Generating image [${impIdx}][${linkIdx}]: "${label}"...`);
      const startTime = Date.now();
      const { url } = await generateImage({ prompt });
      const elapsed = Date.now() - startTime;

      if (url) {
        console.log(`[ProductImages] ✓ [${impIdx}][${linkIdx}] in ${elapsed}ms`);
        enrichedImprovements[impIdx].shoppingLinks[linkIdx].imageUrl = url;

        // Save to cache for future reuse
        saveProductImageToCache({
          productKey: cacheKey,
          imageUrl: url,
          originalLabel: label,
          categoryQuery,
        }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));

        // Progressive DB update
        if (onImageReady) {
          try { await onImageReady(impIdx, linkIdx, url); } catch (dbErr: any) {
            console.warn(`[ProductImages] DB update failed for [${impIdx}][${linkIdx}]:`, dbErr?.message);
          }
        }
      } else {
        console.warn(`[ProductImages] ✗ No URL for [${impIdx}][${linkIdx}] (${elapsed}ms)`);
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

    // Check cache
    const cacheKey = normalizeProductKey(link.label, improvement.productSearchQuery);
    const cachedUrl = await getCachedProductImage(cacheKey);
    if (cachedUrl && isValidImageUrl(cachedUrl)) {
      const works = await testImageUrl(cachedUrl);
      if (works) {
        console.log(`[ProductImages] Lazy: cache hit for [${linkIdx}]: "${link.label}"`);
        links[linkIdx].imageUrl = cachedUrl;
        if (onImageReady) {
          try { await onImageReady(linkIdx, cachedUrl); } catch (e: any) {
            console.warn(`[ProductImages] Lazy: DB update failed:`, e?.message);
          }
        }
        return;
      }
    }

    // Generate new image
    try {
      const prompt = buildProductImagePrompt(link.label, improvement.productSearchQuery);
      console.log(`[ProductImages] Lazy: generating [${linkIdx}]: "${link.label}"...`);
      const startTime = Date.now();
      const { url } = await generateImage({ prompt });
      const elapsed = Date.now() - startTime;

      if (url) {
        console.log(`[ProductImages] Lazy: ✓ [${linkIdx}] in ${elapsed}ms`);
        links[linkIdx].imageUrl = url;

        // Save to cache
        saveProductImageToCache({
          productKey: cacheKey,
          imageUrl: url,
          originalLabel: link.label,
          categoryQuery: improvement.productSearchQuery,
        }).catch(err => console.warn("[ProductImages] Cache save failed:", err?.message));

        if (onImageReady) {
          try { await onImageReady(linkIdx, url); } catch (dbErr: any) {
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
