/**
 * Live API validation test for Brave Search API key.
 * Verifies the BRAVE_SEARCH_API_KEY env var works with the Brave Image Search endpoint.
 */
import { describe, it, expect } from "vitest";

describe("Brave Search API — live credential check", () => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  it("BRAVE_SEARCH_API_KEY is set", () => {
    expect(apiKey).toBeTruthy();
    expect(typeof apiKey).toBe("string");
    expect(apiKey!.length).toBeGreaterThan(10);
  });

  it("Brave Image Search returns 200 with valid results", async () => {
    if (!apiKey) return;

    const params = new URLSearchParams({
      q: "blue jeans",
      count: "1",
      safesearch: "strict",
    });

    const res = await fetch(
      `https://api.search.brave.com/res/v1/images/search?${params}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      },
    );

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);

    // Verify result structure
    const firstResult = data.results[0];
    expect(firstResult.title).toBeDefined();
    expect(firstResult.url).toBeDefined();
  }, 15_000);
});
