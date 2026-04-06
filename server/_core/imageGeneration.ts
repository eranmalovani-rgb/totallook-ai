/**
 * Image generation helper — OpenAI gpt-image-1 for editing, DALL-E 3 for generation,
 * with Manus Forge as fallback.
 *
 * When originalImages are provided (Fix My Look), we use gpt-image-1's edit endpoint
 * which actually processes the reference image and preserves the person's identity.
 * DALL-E 3 ignores reference images entirely, which is why it was generating new people.
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing (preserves person identity):
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Edit this photo: replace the jacket with a black leather jacket",
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

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

/**
 * Determine which provider to use for image generation.
 * Priority: OpenAI > Manus Forge
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
 * Download an image from URL and return as base64 data URI
 */
async function downloadImageAsBase64(url: string): Promise<string> {
  const imgResp = await fetch(url);
  if (!imgResp.ok) throw new Error(`Failed to fetch image: ${imgResp.status}`);
  const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
  // Detect mime type from response or default to jpeg
  const contentType = imgResp.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${imgBuffer.toString("base64")}`;
}

/**
 * Edit an existing image using OpenAI gpt-image-1
 * This model actually processes the reference image and preserves the person's identity,
 * unlike DALL-E 3 which ignores reference images.
 */
async function editWithOpenAI(
  options: GenerateImageOptions
): Promise<{ base64: string; mimeType: string }> {
  const original = options.originalImages![0];

  // Get the image as base64 data URI
  let imageDataUri: string;
  if (original.b64Json) {
    const mime = original.mimeType || "image/jpeg";
    imageDataUri = `data:${mime};base64,${original.b64Json}`;
  } else if (original.url) {
    imageDataUri = await downloadImageAsBase64(original.url);
  } else {
    throw new Error("No image data provided for editing");
  }

  console.log("[ImageGen] Using gpt-image-1 edit endpoint to preserve user identity");

  // Use the gpt-image-1 images/edits endpoint which actually processes the reference image
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getOpenAIKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      image: imageDataUri,
      prompt: options.prompt,
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[ImageGen] gpt-image-1 edit failed (${response.status}): ${detail}`);
    // If gpt-image-1 edit fails, try with Forge as fallback
    throw new Error(`OpenAI gpt-image-1 edit failed (${response.status}): ${detail}`);
  }

  const result = await response.json();
  return {
    base64: result.data[0].b64_json,
    mimeType: "image/png",
  };
}

/**
 * Generate a new image using OpenAI DALL-E 3 (no reference image)
 */
async function generateWithOpenAI(
  options: GenerateImageOptions
): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: options.prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
      quality: "standard",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI image generation failed (${response.status}): ${detail}`);
  }

  const result = await response.json();
  return {
    base64: result.data[0].b64_json,
    mimeType: "image/png",
  };
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

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const provider = getImageProvider();
  const hasOriginalImages = options.originalImages && options.originalImages.length > 0;

  console.log(`[ImageGen] Provider: ${provider}, Mode: ${hasOriginalImages ? "EDIT (preserve identity)" : "GENERATE (new image)"}`);

  let imageData: { base64: string; mimeType: string };

  if (hasOriginalImages) {
    // EDITING MODE: Must preserve the person's identity
    if (provider === "openai") {
      try {
        // Try gpt-image-1 edit endpoint first (best for identity preservation)
        imageData = await editWithOpenAI(options);
      } catch (editErr) {
        console.warn("[ImageGen] OpenAI edit failed, falling back to Forge:", editErr);
        // Fall back to Forge which handles original_images natively
        if (ENV.forgeApiUrl && ENV.forgeApiKey) {
          imageData = await generateWithForge(options);
        } else {
          throw editErr;
        }
      }
    } else {
      // Forge handles original_images natively
      imageData = await generateWithForge(options);
    }
  } else {
    // GENERATION MODE: Create a new image from scratch
    if (provider === "openai") {
      imageData = await generateWithOpenAI(options);
    } else {
      imageData = await generateWithForge(options);
    }
  }

  const buffer = Buffer.from(imageData.base64, "base64");

  // Save to S3
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    imageData.mimeType
  );

  return { url };
}
