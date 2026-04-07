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
import { ENV } from "./env";

// Read at runtime (not module load) so env is always fresh
const getOpenAIKey = () => (process.env.OPENAI_API_KEY ?? "").trim();
const OPENAI_IMAGE_MODEL = "gpt-image-1-mini";
const OPENAI_IMAGE_SIZE = "1024x1024";
const OPENAI_IMAGE_QUALITY = "low";

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  attempts = 3
): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
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
          isAbort ? `${label} timeout after 45s` : `${label} failed: ${err?.message || "unknown error"}`
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

/**
 * Determine which provider to use for image generation.
 * Priority: OpenAI Images API > Manus Forge
 */
function getImageProvider(): "openai" | "forge" {
  if (getOpenAIKey().length > 0) {
    return "openai";
  }
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    return "forge";
  }
  throw new Error("No image generation API configured (OPENAI_API_KEY or BUILT_IN_FORGE_API_KEY)");
}

/**
 * Generate image using OpenAI Images API
 */
async function generateWithOpenAI(
  options: GenerateImageOptions
): Promise<{ base64: string; mimeType: string }> {
  const hasOriginalImages = options.originalImages && options.originalImages.length > 0;

  if (hasOriginalImages) {
    // For editing, use gpt-image-1-mini edit endpoint with reference images.
    const formData = new FormData();
    formData.append("model", OPENAI_IMAGE_MODEL);
    formData.append("prompt", options.prompt);
    formData.append("size", OPENAI_IMAGE_SIZE);
    formData.append("quality", OPENAI_IMAGE_QUALITY);
    formData.append("input_fidelity", "high");

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

    const response = await fetchWithRetry("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getOpenAIKey()}`,
      },
      body: formData,
    }, "OpenAI image edit");

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
      response_format: "b64_json",
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
  const provider = getImageProvider();
  console.log(
    `[ImageGen] Using provider: ${provider === "openai" ? `OpenAI Images (${OPENAI_IMAGE_MODEL})` : "Manus Forge"}`
  );

  let imageData: { base64: string; mimeType: string };

  if (provider === "openai") {
    imageData = await generateWithOpenAI(options);
  } else {
    imageData = await generateWithForge(options);
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
