import { describe, it, expect } from "vitest";

describe("OpenAI Image Generation (gpt-image-1-mini)", () => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  it("should have OPENAI_API_KEY configured", () => {
    expect(OPENAI_API_KEY).toBeTruthy();
    expect(OPENAI_API_KEY!.startsWith("sk-")).toBe(true);
  });

  it("should generate an image via OpenAI gpt-image-1-mini API", async () => {
    if (!OPENAI_API_KEY) {
      console.warn("Skipping: OPENAI_API_KEY not set");
      return;
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1-mini",
        prompt: "A simple red circle on white background, minimal",
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
        quality: "low",
      }),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.data).toBeDefined();
    expect(result.data.length).toBe(1);
    expect(result.data[0].b64_json).toBeTruthy();
    expect(result.data[0].b64_json.length).toBeGreaterThan(100);
  }, 30000); // 30s timeout for image generation

  it("should generate an image via OpenAI LLM API (vision)", async () => {
    if (!OPENAI_API_KEY) {
      console.warn("Skipping: OPENAI_API_KEY not set");
      return;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model: "gpt-5.3-mini",
        messages: [
          { role: "user", content: "Say hello in JSON format: {\"greeting\": \"hello\"}" },
        ],
        max_tokens: 50,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "greeting",
            strict: true,
            schema: {
              type: "object",
              properties: {
                greeting: { type: "string" },
              },
              required: ["greeting"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.choices).toBeDefined();
    expect(result.choices[0].message.content).toBeTruthy();
    const parsed = JSON.parse(result.choices[0].message.content);
    expect(parsed.greeting).toBeTruthy();
  }, 15000);
});
