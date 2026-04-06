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
    // For editing, use gpt-image-1 edit endpoint with reference images.
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("prompt", options.prompt);
    formData.append("size", "auto");
    formData.append("quality", "high");
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

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getOpenAIKey()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI image edit failed (${response.status}): ${detail}`);
    }

    const result = await response.json();
    if (result.data?.[0]?.b64_json) {
      return {
        base64: result.data[0].b64_json,
        mimeType: "image/png",
      };
    }
    if (result.data?.[0]?.url) {
      const imgResp = await fetch(result.data[0].url);
      if (!imgResp.ok) {
        throw new Error(`OpenAI image edit URL fetch failed (${imgResp.status})`);
      }
      const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
      return {
        base64: imgBuffer.toString("base64"),
        mimeType: "image/png",
      };
    }
    return {
      base64: result.data?.[0]?.b64_json,
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
  console.log(`[ImageGen] Using provider: ${provider === "openai" ? "OpenAI DALL-E 3" : "Manus Forge"}`);

  let imageData: { base64: string; mimeType: string };

  if (provider === "openai") {
    imageData = await generateWithOpenAI(options);
  } else {
    imageData = await generateWithForge(options);
  }

  let buffer = Buffer.from(imageData.base64, "base64");
  if (options.targetSize?.width && options.targetSize?.height) {
    try {
      buffer = await normalizeToTargetSize(buffer, options.targetSize);
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
