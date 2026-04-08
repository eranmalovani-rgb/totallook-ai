import { describe, expect, it } from "vitest";

describe("Google Custom Search API credentials", () => {
  it("should be able to reach Google Custom Search API and return image results", async () => {
    const apiKey = process.env.GOOGLE_CSE_API_KEY;
    const cx = process.env.GOOGLE_CSE_CX;

    expect(apiKey).toBeTruthy();
    expect(cx).toBeTruthy();

    // Make a lightweight test query
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=blue+jeans&searchType=image&num=1`;
    const res = await fetch(url);
    
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.items).toBeDefined();
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0].link).toBeTruthy();
    expect(data.items[0].image).toBeDefined();
  }, 15000);
});
