import { describe, it, expect } from "vitest";

// Test gender filtering in Brave Image Search query building
describe("Gender filtering in Brave Image Search", () => {
  it("should add 'men's' prefix for male gender", async () => {
    const { buildBraveSearchQuery } = await import("./braveImageSearch");
    
    const query = buildBraveSearchQuery("Nike Air Force 1 white", "sneakers", "male");
    expect(query).toContain("men's");
    expect(query).not.toContain("women");
  });

  it("should add 'women's' prefix for female gender", async () => {
    const { buildBraveSearchQuery } = await import("./braveImageSearch");
    
    const query = buildBraveSearchQuery("Nike Air Force 1 white", "sneakers", "female");
    expect(query).toContain("women's");
    // "women's" contains "men's" as substring, so check it starts with women's not men's
    expect(query.startsWith("women's")).toBe(true);
    expect(query.startsWith("men's")).toBe(false);
  });

  it("should not add gender prefix when gender is undefined", async () => {
    const { buildBraveSearchQuery } = await import("./braveImageSearch");
    
    const query = buildBraveSearchQuery("Nike Air Force 1 white", "sneakers");
    expect(query).not.toContain("men's");
    expect(query).not.toContain("women's");
    expect(query).toContain("Nike Air Force 1 white");
  });

  it("should not add gender prefix when empty string", async () => {
    const { buildBraveSearchQuery } = await import("./braveImageSearch");
    
    const query = buildBraveSearchQuery("Zara blazer navy", "blazer", "");
    expect(query).not.toContain("men's");
    expect(query).not.toContain("women's");
    expect(query).toContain("Zara blazer navy");
  });

  it("should not duplicate 'men' if already in product name", async () => {
    const { buildBraveSearchQuery } = await import("./braveImageSearch");
    
    const query = buildBraveSearchQuery("men's Nike sneakers", "sneakers", "male");
    // Should NOT add another "men's" since it's already in the product name
    const menCount = (query.match(/men/gi) || []).length;
    expect(menCount).toBe(1);
  });

  it("should not duplicate 'women' if already in product name", async () => {
    const { buildBraveSearchQuery } = await import("./braveImageSearch");
    
    const query = buildBraveSearchQuery("women's Zara dress", "dress", "female");
    const womenCount = (query.match(/women/gi) || []).length;
    expect(womenCount).toBe(1);
  });

  it("should strip store name after dash", async () => {
    const { buildBraveSearchQuery } = await import("./braveImageSearch");
    
    const query = buildBraveSearchQuery("Nike Air Max 90 — ASOS", "sneakers", "male");
    expect(query).not.toContain("ASOS");
    expect(query).toContain("Nike Air Max 90");
  });

  it("should append 'product photo' suffix", async () => {
    const { buildBraveSearchQuery } = await import("./braveImageSearch");
    
    const query = buildBraveSearchQuery("Zara blazer", "blazer", "male");
    expect(query).toContain("product photo");
  });
});

// Test global deduplication logic
describe("Global deduplication of shopping links", () => {
  it("should remove duplicate URLs across improvements", () => {
    const globalSeenUrls = new Set<string>();
    
    const improvements = [
      {
        title: "Upgrade top",
        shoppingLinks: [
          { label: "ASOS shirt", url: "https://www.asos.com/search/?q=shirt", imageUrl: "" },
          { label: "Zara shirt", url: "https://www.zara.com/search?searchTerm=shirt", imageUrl: "" },
        ],
      },
      {
        title: "Upgrade bottom",
        shoppingLinks: [
          { label: "ASOS pants", url: "https://www.asos.com/search/?q=shirt", imageUrl: "" }, // DUPLICATE!
          { label: "H&M pants", url: "https://www2.hm.com/search?q=pants", imageUrl: "" },
        ],
      },
    ];

    const deduped = improvements.map((imp) => {
      const uniqueLinks = (imp.shoppingLinks || []).filter((link) => {
        const urlKey = (link.url || "").trim().toLowerCase();
        if (!urlKey || globalSeenUrls.has(urlKey)) return false;
        globalSeenUrls.add(urlKey);
        return true;
      });
      return { ...imp, shoppingLinks: uniqueLinks };
    });

    // First improvement keeps both links
    expect(deduped[0].shoppingLinks).toHaveLength(2);
    // Second improvement loses the duplicate ASOS link
    expect(deduped[1].shoppingLinks).toHaveLength(1);
    expect(deduped[1].shoppingLinks[0].url).toContain("hm.com");
  });

  it("should remove duplicate improvement titles (case-insensitive)", () => {
    const globalSeenTitles = new Set<string>();
    
    const improvements = [
      { title: "Upgrade Top", shoppingLinks: [] },
      { title: "upgrade top", shoppingLinks: [] }, // DUPLICATE
      { title: "Upgrade Bottom", shoppingLinks: [] },
    ];

    const deduped = improvements.filter((imp) => {
      const titleKey = (imp.title || "").trim().toLowerCase();
      if (titleKey && globalSeenTitles.has(titleKey)) return false;
      if (titleKey) globalSeenTitles.add(titleKey);
      return true;
    });

    expect(deduped).toHaveLength(2);
    expect(deduped[0].title).toBe("Upgrade Top");
    expect(deduped[1].title).toBe("Upgrade Bottom");
  });

  it("should handle empty shopping links gracefully", () => {
    const globalSeenUrls = new Set<string>();
    
    const improvement = {
      title: "Upgrade shoes",
      shoppingLinks: [] as { url: string }[],
    };

    const uniqueLinks = (improvement.shoppingLinks || []).filter((link) => {
      const urlKey = (link.url || "").trim().toLowerCase();
      if (!urlKey || globalSeenUrls.has(urlKey)) return false;
      globalSeenUrls.add(urlKey);
      return true;
    });

    expect(uniqueLinks).toHaveLength(0);
  });

  it("should preserve order of first-seen links", () => {
    const globalSeenUrls = new Set<string>();
    
    const links = [
      { url: "https://a.com", label: "A" },
      { url: "https://b.com", label: "B" },
      { url: "https://a.com", label: "A duplicate" },
      { url: "https://c.com", label: "C" },
    ];

    const unique = links.filter((link) => {
      const key = link.url.toLowerCase();
      if (globalSeenUrls.has(key)) return false;
      globalSeenUrls.add(key);
      return true;
    });

    expect(unique).toHaveLength(3);
    expect(unique[0].label).toBe("A");
    expect(unique[1].label).toBe("B");
    expect(unique[2].label).toBe("C");
  });

  it("should handle case-insensitive URL matching", () => {
    const globalSeenUrls = new Set<string>();
    
    const links = [
      { url: "https://WWW.ASOS.COM/search?q=shirt", label: "ASOS upper" },
      { url: "https://www.asos.com/search?q=shirt", label: "ASOS lower" },
    ];

    const unique = links.filter((link) => {
      const key = link.url.toLowerCase();
      if (globalSeenUrls.has(key)) return false;
      globalSeenUrls.add(key);
      return true;
    });

    expect(unique).toHaveLength(1);
    expect(unique[0].label).toBe("ASOS upper");
  });
});
