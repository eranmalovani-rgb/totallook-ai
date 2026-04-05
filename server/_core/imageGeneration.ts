/**
 * Image generation helper — OpenAI DALL-E 3 only (Railway version)
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

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured. Image generation requires OpenAI API key.");
  }

  console.log(`[ImageGen] Using OpenAI DALL-E 3`);
  const imageData = await generateWithOpenAI(options);
  const buffer = Buffer.from(imageData.base64, "base64");

  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    imageData.mimeType
  );

  return { url };
}
