/**
 * Image generation helper — OpenAI Images API (primary) with Manus Forge fallback
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import sharp from "sharp";
import { ENV } from "./env";

// Read at runtime (not module load) so env is always fresh
const getOpenAIKey = () => (process.env.OPENAI_API_KEY ?? "").trim();
const OPENAI_IMAGE_MODEL = "gpt-image-1-mini";
const OPENAI_IMAGE_SIZE = "1024x1024";
const OPENAI_IMAGE_QUALITY = "low";
// Use the full gpt-image-1 model for editing (Fix My Look) — mini is unreliable for color/style accuracy
const OPENAI_EDIT_MODEL = "gpt-image-1";
const OPENAI_EDIT_QUALITY = "medium";
const OPENAI_EDIT_FIDELITY = "medium";

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  attempts = 3
): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeoutMs = label.includes("edit") ? 120000 : 45000; // gpt-image-1 edits can take 30-60s
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) return response;
      const retryable = [429, 500, 502, 503, 504].includes(response.status);
      if (!retryable || i === attempts - 1) {
        const detail = await response.text().catch(() => "");
        throw new Error(`${label} failed (${response.status}): ${detail}`);
      }
      const delay = 1000 * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === "AbortError";
      if (i === attempts - 1) {
        lastError = new Error(
          isAbort ? `${label} timeout after ${label.includes('edit') ? '120' : '45'}s` : `${label} failed: ${err?.message || "unknown error"}`
        );
        break;
      }
      const delay = 1000 * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error(`${label} failed`);
}

async function extractOpenAIImageData(
  result: any,
  mode: "generation" | "edit"
): Promise<{ base64: string; mimeType: string }> {
  const first = result?.data?.[0];
  if (!first) {
    throw new Error(`OpenAI image ${mode} failed: empty data array`);
  }

  if (typeof first.b64_json === "string" && first.b64_json.length > 10) {
    return { base64: first.b64_json, mimeType: "image/png" };
  }

  if (typeof first.url === "string" && first.url.startsWith("http")) {
    const imgResp = await fetchWithRetry(first.url, { method: "GET" }, `OpenAI image ${mode} URL fetch`, 2);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
    const mimeType = imgResp.headers.get("content-type") || "image/png";
    return { base64: imgBuffer.toString("base64"), mimeType };
  }

  throw new Error(`OpenAI image ${mode} failed: no b64_json/url in response`);
}

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  targetSize?: {
    width: number;
    height: number;
  };
};

export type GenerateImageResponse = {
  url?: string;
};

function hasForgeConfig(): boolean {
  return Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
}

async function buildPlaceholderProductImage(prompt: string): Promise<{ base64: string; mimeType: string }> {
  const title = (prompt.split(".")[0] || "Product").replace(/^E-commerce product photo:\s*/i, "").slice(0, 36);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
<defs>
<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#111827"/>
<stop offset="100%" stop-color="#1f2937"/>
</linearGradient>
</defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<rect x="156" y="156" width="712" height="712" rx="28" fill="#0b0f18" stroke="#f59e0b" stroke-opacity="0.35"/>
<text x="512" y="455" text-anchor="middle" fill="#fbbf24" font-size="42" font-family="Arial, Helvetica, sans-serif">Preview unavailable</text>
<text x="512" y="520" text-anchor="middle" fill="#d1d5db" font-size="28" font-family="Arial, Helvetica, sans-serif">${title}</text>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { base64: png.toString("base64"), mimeType: "image/png" };
}

/**
 * Generate image using OpenAI Images API
 */
async function generateWithOpenAI(
  options: GenerateImageOptions
): Promise<{ base64: string; mimeType: string }> {
  const hasOriginalImages = options.originalImages && options.originalImages.length > 0;

  if (hasOriginalImages) {
    // For editing, use full gpt-image-1 model with high quality + high fidelity for accurate color/style preservation.
    const formData = new FormData();
    formData.append("model", OPENAI_EDIT_MODEL);
    formData.append("prompt", options.prompt);
    // Use auto size to match original image dimensions instead of forcing 1024x1024
    formData.append("size", "auto");
    formData.append("quality", OPENAI_EDIT_QUALITY);
    // High fidelity preserves the original image identity (face, body, background)
    formData.append("input_fidelity", OPENAI_EDIT_FIDELITY);

    for (let i = 0; i < options.originalImages!.length; i++) {
      const original = options.originalImages![i];
      if (original.b64Json) {
        const contentType = original.mimeType || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const buffer = Buffer.from(original.b64Json, "base64");
        const blob = new Blob([buffer], { type: contentType });
        formData.append("image[]", blob, `reference_${i}.${ext}`);
        continue;
      }
      if (original.url) {
        const imgResp = await fetch(original.url);
        if (!imgResp.ok) {
          throw new Error(`Failed to fetch original image: ${imgResp.status}`);
        }
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const contentType = imgResp.headers.get("content-type") || original.mimeType || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const blob = new Blob([imgBuffer], { type: contentType });
        formData.append("image[]", blob, `reference_${i}.${ext}`);
      }
    }

    // Use only 1 attempt for edits (no retry) since gpt-image-1 takes 60-80s per call
    const response = await fetchWithRetry("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getOpenAIKey()}`,
      },
      body: formData,
    }, "OpenAI image edit", 1);

    const result = await response.json();
    return extractOpenAIImageData(result, "edit");
  }

  // Standard generation with OpenAI Images API
  const response = await fetchWithRetry("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: options.prompt,
      n: 1,
      size: OPENAI_IMAGE_SIZE,
      quality: OPENAI_IMAGE_QUALITY,
    }),
  }, "OpenAI image generation");

  const result = await response.json();
  return extractOpenAIImageData(result, "generation");
}

/**
 * Generate image using Manus Forge (fallback)
 */
async function generateWithForge(
  options: GenerateImageOptions
): Promise<{ base64: string; mimeType: string }> {
  const baseUrl = ENV.forgeApiUrl!.endsWith("/")
    ? ENV.forgeApiUrl!
    : `${ENV.forgeApiUrl!}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Forge image generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: { b64Json: string; mimeType: string };
  };

  return {
    base64: result.image.b64Json,
    mimeType: result.image.mimeType,
  };
}

function getOrientation(width: number, height: number): "portrait" | "landscape" | "square" {
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

async function normalizeToTargetSize(
  buffer: Buffer,
  targetSize: NonNullable<GenerateImageOptions["targetSize"]>
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const sourceMetadata = await sharp(buffer).metadata();
  const sourceWidth = sourceMetadata.width ?? 0;
  const sourceHeight = sourceMetadata.height ?? 0;

  const targetOrientation = getOrientation(targetSize.width, targetSize.height);
  const sourceOrientation =
    sourceWidth > 0 && sourceHeight > 0
      ? getOrientation(sourceWidth, sourceHeight)
      : null;

  const shouldRotate =
    sourceOrientation !== null &&
    sourceOrientation !== "square" &&
    targetOrientation !== "square" &&
    sourceOrientation !== targetOrientation;

  let pipeline = sharp(buffer);
  if (shouldRotate) {
    pipeline = pipeline.rotate(90);
    console.log(
      `[ImageGen] Rotated output 90° for orientation match (${sourceWidth}x${sourceHeight} -> ${targetOrientation})`
    );
  }

  return pipeline
    .resize(targetSize.width, targetSize.height, { fit: "fill" })
    .png()
    .toBuffer();
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const hasOpenAI = getOpenAIKey().length > 0;
  const canUseForge = hasForgeConfig();
  let imageData: { base64: string; mimeType: string } | null = null;
  let openAIFailure: any = null;

  if (hasOpenAI) {
    const isEdit = options.originalImages && options.originalImages.length > 0;
    const modelUsed = isEdit ? OPENAI_EDIT_MODEL : OPENAI_IMAGE_MODEL;
    console.log(`[ImageGen] Using provider: OpenAI Images (${modelUsed}, ${isEdit ? 'edit' : 'generate'}, ${isEdit ? `${options.originalImages!.length} reference images` : 'no refs'})`);
    try {
      imageData = await generateWithOpenAI(options);
    } catch (err: any) {
      openAIFailure = err;
      console.warn(`[ImageGen] OpenAI image generation failed, trying Forge fallback: ${err?.message || err}`);
    }
  }

  if (!imageData && canUseForge) {
    try {
      console.log("[ImageGen] Using provider: Manus Forge (fallback)");
      imageData = await generateWithForge(options);
    } catch (forgeErr: any) {
      console.warn(`[ImageGen] Forge fallback failed: ${forgeErr?.message || forgeErr}`);
    }
  }

  if (!imageData) {
    console.warn("[ImageGen] All providers failed, using placeholder product image");
    imageData = await buildPlaceholderProductImage(options.prompt);
    if (openAIFailure) {
      console.warn(`[ImageGen] Original OpenAI failure: ${openAIFailure?.message || openAIFailure}`);
    }
  }

  let buffer: Buffer<ArrayBufferLike> = Buffer.from(imageData.base64, "base64");
  if (options.targetSize?.width && options.targetSize?.height) {
    try {
      buffer = Buffer.from(await normalizeToTargetSize(buffer, options.targetSize));
      console.log(
        `[ImageGen] Matched output size to ${options.targetSize.width}x${options.targetSize.height}`
      );
      imageData.mimeType = "image/png";
    } catch (resizeErr: any) {
      console.warn(
        `[ImageGen] Failed to resize output to target dimensions: ${resizeErr?.message}`
      );
    }
  }

  // Save to S3
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    imageData.mimeType
  );

  return { url };
}
