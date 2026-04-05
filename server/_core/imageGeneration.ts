/**
 * Image generation helper — OpenAI (Railway version)
 * Uses DALL-E 3 for generation from scratch.
 * Uses gpt-image-1 Edit API when originalImages are provided (for fixMyLook).
 */
import { storagePut } from "server/storage";

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
 * Generate a NEW image from scratch using DALL-E 3 (no reference image).
 */
async function generateWithDallE3(
  prompt: string
): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
      quality: "standard",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI DALL-E 3 generation failed (${response.status}): ${detail}`);
  }

  const result = await response.json();
  return {
    base64: result.data[0].b64_json,
    mimeType: "image/png",
  };
}

/**
 * EDIT an existing image using gpt-image-1 Edit API.
 * This preserves the person, pose, background, etc. and only changes specified items.
 */
async function editWithGptImage1(
  prompt: string,
  originalImages: Array<{ url?: string; b64Json?: string; mimeType?: string }>
): Promise<{ base64: string; mimeType: string }> {
  // Build multipart form data
  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append("prompt", prompt);
  formData.append("size", "auto"); // auto-detect best size
  formData.append("quality", "high");
  formData.append("input_fidelity", "high"); // high fidelity to keep person the same

  // Add each reference image
  for (let i = 0; i < originalImages.length; i++) {
    const img = originalImages[i];
    if (img.url) {
      // Download the image and add as file
      console.log(`[ImageGen] Downloading reference image ${i}: ${img.url.substring(0, 80)}...`);
      const imgResponse = await fetch(img.url);
      if (!imgResponse.ok) {
        throw new Error(`Failed to download reference image (${imgResponse.status}): ${img.url.substring(0, 100)}`);
      }
      const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
      const contentType = imgResponse.headers.get("content-type") || img.mimeType || "image/jpeg";
      const ext = contentType.includes("png") ? "png" : "jpeg";
      const blob = new Blob([imgBuffer], { type: contentType });
      formData.append("image[]", blob, `reference_${i}.${ext}`);
      console.log(`[ImageGen] Added reference image ${i}: ${imgBuffer.length} bytes (${contentType})`);
    } else if (img.b64Json) {
      const buffer = Buffer.from(img.b64Json, "base64");
      const contentType = img.mimeType || "image/jpeg";
      const ext = contentType.includes("png") ? "png" : "jpeg";
      const blob = new Blob([buffer], { type: contentType });
      formData.append("image[]", blob, `reference_${i}.${ext}`);
      console.log(`[ImageGen] Added base64 reference image ${i}: ${buffer.length} bytes`);
    }
  }

  console.log(`[ImageGen] Sending edit request to gpt-image-1 with ${originalImages.length} reference image(s)...`);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getOpenAIKey()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[ImageGen] gpt-image-1 edit failed (${response.status}): ${detail}`);
    throw new Error(`OpenAI gpt-image-1 edit failed (${response.status}): ${detail}`);
  }

  const result = await response.json();
  
  // gpt-image-1 returns b64_json by default
  if (result.data?.[0]?.b64_json) {
    return {
      base64: result.data[0].b64_json,
      mimeType: "image/png",
    };
  }
  
  // If it returns a URL instead, download it
  if (result.data?.[0]?.url) {
    const imgResp = await fetch(result.data[0].url);
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    return {
      base64: buffer.toString("base64"),
      mimeType: "image/png",
    };
  }

  throw new Error("Unexpected response format from gpt-image-1 edit API");
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured. Image generation requires OpenAI API key.");
  }

  let imageData: { base64: string; mimeType: string };

  // If originalImages are provided, use the Edit API (gpt-image-1)
  // This is used for fixMyLook to edit the user's actual photo
  if (options.originalImages && options.originalImages.length > 0) {
    console.log(`[ImageGen] Using gpt-image-1 Edit API with ${options.originalImages.length} reference image(s)`);
    imageData = await editWithGptImage1(options.prompt, options.originalImages);
  } else {
    // No reference images — generate from scratch with DALL-E 3
    console.log(`[ImageGen] Using OpenAI DALL-E 3 (no reference images)`);
    imageData = await generateWithDallE3(options.prompt);
  }

  const buffer = Buffer.from(imageData.base64, "base64");

  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    imageData.mimeType
  );

  return { url };
}
