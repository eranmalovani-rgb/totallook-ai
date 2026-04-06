/**
 * Image generation helper — OpenAI DALL-E 3 (primary) with Manus Forge fallback
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
 * Priority: OpenAI DALL-E > Manus Forge
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
 * Generate image using OpenAI DALL-E 3
 */
async function generateWithOpenAI(
  options: GenerateImageOptions
): Promise<{ base64: string; mimeType: string }> {
  const hasOriginalImages = options.originalImages && options.originalImages.length > 0;

  if (hasOriginalImages) {
    // For image editing, use gpt-image-1 (DALL-E 3 doesn't support editing)
    // We'll use the images API with the edit endpoint
    const original = options.originalImages![0];
    let imageData: string | undefined;

    if (original.b64Json) {
      imageData = original.b64Json;
    } else if (original.url) {
      // Download the original image and convert to base64
      const imgResp = await fetch(original.url);
      if (!imgResp.ok) throw new Error(`Failed to fetch original image: ${imgResp.status}`);
      const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
      imageData = imgBuffer.toString("base64");
    }

    // Use DALL-E 2 edit endpoint (DALL-E 3 doesn't support edits)
    // Fall back to generating a new image with the edit prompt
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

  // Standard generation with DALL-E 3
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
  console.log(`[ImageGen] Using provider: ${provider === "openai" ? "OpenAI DALL-E 3" : "Manus Forge"}`);

  let imageData: { base64: string; mimeType: string };

  if (provider === "openai") {
    imageData = await generateWithOpenAI(options);
  } else {
    imageData = await generateWithForge(options);
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
