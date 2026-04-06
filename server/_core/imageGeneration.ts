/**
 * Image generation helper — Manus Forge for editing (preserves identity via original_images),
 * OpenAI gpt-image-1 for new generation, with cross-fallback.
 *
 * IMPORTANT: For Fix My Look, we MUST use Forge because it natively supports
 * original_images and preserves the person's identity. OpenAI's edit endpoint
 * has compatibility issues with some API keys.
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
 * Check if Forge is available
 */
function hasForge(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}

/**
 * Check if OpenAI is available
 */
function hasOpenAI(): boolean {
  return getOpenAIKey().length > 0;
}

/**
 * Generate a new image using OpenAI gpt-image-1 (no reference image)
 * Uses the /images/generations endpoint with JSON body.
 */
async function generateWithOpenAI(
  options: GenerateImageOptions
): Promise<{ base64: string; mimeType: string }> {
  console.log("[ImageGen] Using OpenAI gpt-image-1 generation endpoint");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: options.prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
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
 * Generate or edit image using Manus Forge.
 * Forge natively supports original_images for editing, preserving the person's identity.
 */
async function generateWithForge(
  options: GenerateImageOptions
): Promise<{ base64: string; mimeType: string }> {
  const hasOriginal = options.originalImages && options.originalImages.length > 0;
  console.log(`[ImageGen] Using Forge ${hasOriginal ? "EDIT (with original_images)" : "GENERATE"}`);

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
  const hasOriginalImages = options.originalImages && options.originalImages.length > 0;

  console.log(`[ImageGen] Mode: ${hasOriginalImages ? "EDIT (preserve identity)" : "GENERATE (new image)"}, Forge: ${hasForge()}, OpenAI: ${hasOpenAI()}`);

  let imageData: { base64: string; mimeType: string };

  if (hasOriginalImages) {
    // EDITING MODE: Must preserve the person's identity
    // Priority: Forge (natively supports original_images) > OpenAI generation (fallback, less ideal)
    if (hasForge()) {
      try {
        imageData = await generateWithForge(options);
      } catch (forgeErr) {
        console.warn("[ImageGen] Forge edit failed:", forgeErr);
        // Fallback: try OpenAI generation (won't have reference image, but better than nothing)
        if (hasOpenAI()) {
          console.log("[ImageGen] Falling back to OpenAI generation (without reference image)");
          imageData = await generateWithOpenAI(options);
        } else {
          throw forgeErr;
        }
      }
    } else if (hasOpenAI()) {
      // No Forge available, use OpenAI generation as fallback
      console.warn("[ImageGen] No Forge available for editing, using OpenAI generation (identity may not be preserved)");
      imageData = await generateWithOpenAI(options);
    } else {
      throw new Error("No image generation API configured");
    }
  } else {
    // GENERATION MODE: Create a new image from scratch
    // Priority: OpenAI (better quality) > Forge
    if (hasOpenAI()) {
      try {
        imageData = await generateWithOpenAI(options);
      } catch (openaiErr) {
        console.warn("[ImageGen] OpenAI generation failed:", openaiErr);
        if (hasForge()) {
          imageData = await generateWithForge(options);
        } else {
          throw openaiErr;
        }
      }
    } else if (hasForge()) {
      imageData = await generateWithForge(options);
    } else {
      throw new Error("No image generation API configured");
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
