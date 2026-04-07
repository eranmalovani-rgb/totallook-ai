import { describe, it, expect } from "vitest";

describe("OpenAI API Key Validation", () => {
  it("should have OPENAI_API_KEY set", () => {
    const key = process.env.OPENAI_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
    expect(key!.startsWith("sk-")).toBe(true);
  });

  it("should successfully call OpenAI API with a simple prompt", async () => {
    const key = process.env.OPENAI_API_KEY;
    expect(key).toBeDefined();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: "Say hello in one word" }],
        max_tokens: 10,
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.choices).toBeDefined();
    expect(data.choices.length).toBeGreaterThan(0);
    expect(data.choices[0].message.content).toBeTruthy();
    console.log("OpenAI response:", data.choices[0].message.content);
  }, 30000);
});
