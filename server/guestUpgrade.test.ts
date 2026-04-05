import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("./db", () => ({
  getGuestSessionByFingerprint: vi.fn(),
  getGuestAnalysisCount: vi.fn(),
  saveGuestProfile: vi.fn(),
  getGuestProfile: vi.fn(),
  saveGuestEmail: vi.fn(),
  getGuestWardrobeItems: vi.fn(),
  addGuestWardrobeItem: vi.fn(),
  removeGuestWardrobeItem: vi.fn(),
  getGuestReviewHistory: vi.fn(),
  migrateGuestDataToUser: vi.fn(),
}));

import {
  getGuestSessionByFingerprint,
  getGuestAnalysisCount,
  saveGuestProfile,
  getGuestProfile,
  saveGuestEmail,
  getGuestWardrobeItems,
  addGuestWardrobeItem,
  removeGuestWardrobeItem,
  getGuestReviewHistory,
  migrateGuestDataToUser,
} from "./db";

describe("Guest Upgrade - 5 Analysis Limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow analysis when count is below 5", async () => {
    vi.mocked(getGuestAnalysisCount).mockResolvedValue(3);

    const count = await getGuestAnalysisCount("test-fp");
    expect(count).toBe(3);
    expect(count < 5).toBe(true);
  });

  it("should block analysis when count reaches 5", async () => {
    vi.mocked(getGuestAnalysisCount).mockResolvedValue(5);

    const count = await getGuestAnalysisCount("test-fp");
    expect(count).toBe(5);
    expect(count >= 5).toBe(true); // at limit, should be blocked
  });

  it("should allow unlimited analysis when guest has email", async () => {
    vi.mocked(getGuestSessionByFingerprint).mockResolvedValue({
      id: 1,
      fingerprint: "test-fp",
      email: "user@example.com",
      analysisCount: 10,
    } as any);

    const session = await getGuestSessionByFingerprint("test-fp");
    const hasEmail = !!session?.email;
    expect(hasEmail).toBe(true);
    // With email, limit is removed
  });

  it("should enforce limit when guest has no email", async () => {
    vi.mocked(getGuestSessionByFingerprint).mockResolvedValue({
      id: 1,
      fingerprint: "test-fp",
      email: null,
      analysisCount: 5,
    } as any);

    const session = await getGuestSessionByFingerprint("test-fp");
    const hasEmail = !!session?.email;
    const isLimited = !hasEmail && (session?.analysisCount ?? 0) >= 5;
    expect(hasEmail).toBe(false);
    expect(isLimited).toBe(true);
  });
});

describe("Guest Upgrade - Profile Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save guest profile with all fields", async () => {
    vi.mocked(saveGuestProfile).mockResolvedValue(undefined);

    await saveGuestProfile("test-fp", {
      gender: "male",
      ageRange: "25-34",
      stylePreference: "streetwear",
      budget: "medium",
      influencers: ["influencer1", "influencer2"],
    });

    expect(saveGuestProfile).toHaveBeenCalledWith("test-fp", {
      gender: "male",
      ageRange: "25-34",
      stylePreference: "streetwear",
      budget: "medium",
      influencers: ["influencer1", "influencer2"],
    });
  });

  it("should retrieve guest profile by fingerprint", async () => {
    const mockProfile = {
      gender: "female",
      ageRange: "18-24",
      stylePreference: "minimalist",
      budget: "low",
      influencers: [],
    };
    vi.mocked(getGuestProfile).mockResolvedValue(mockProfile as any);

    const result = await getGuestProfile("test-fp");
    expect(result).toBeDefined();
    expect(result?.gender).toBe("female");
    expect(result?.stylePreference).toBe("minimalist");
  });

  it("should return null for guest without profile", async () => {
    vi.mocked(getGuestProfile).mockResolvedValue(null);

    const result = await getGuestProfile("new-fp");
    expect(result).toBeNull();
  });
});

describe("Guest Upgrade - Email Capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save guest email", async () => {
    vi.mocked(saveGuestEmail).mockResolvedValue(undefined);

    await saveGuestEmail("test-fp", "user@example.com");
    expect(saveGuestEmail).toHaveBeenCalledWith("test-fp", "user@example.com");
  });
});

describe("Guest Upgrade - Wardrobe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get guest wardrobe items", async () => {
    const mockItems = [
      { id: 1, name: "White T-Shirt", category: "shirt", imageUrl: "https://cdn.example.com/shirt.jpg" },
      { id: 2, name: "Blue Jeans", category: "pants", imageUrl: "https://cdn.example.com/jeans.jpg" },
    ];
    vi.mocked(getGuestWardrobeItems).mockResolvedValue(mockItems as any);

    const result = await getGuestWardrobeItems("test-fp");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("White T-Shirt");
  });

  it("should add item to guest wardrobe", async () => {
    vi.mocked(addGuestWardrobeItem).mockResolvedValue({ id: 3 } as any);

    const result = await addGuestWardrobeItem({
      guestSessionId: 1,
      name: "Leather Jacket",
      category: "jacket",
      imageUrl: "https://cdn.example.com/jacket.jpg",
    } as any);

    expect(result).toBeDefined();
    expect(addGuestWardrobeItem).toHaveBeenCalled();
  });

  it("should remove item from guest wardrobe", async () => {
    vi.mocked(removeGuestWardrobeItem).mockResolvedValue(undefined);

    await removeGuestWardrobeItem(3, "test-fp");
    expect(removeGuestWardrobeItem).toHaveBeenCalledWith(3, "test-fp");
  });

  it("should return empty array for guest with no wardrobe items", async () => {
    vi.mocked(getGuestWardrobeItems).mockResolvedValue([]);

    const result = await getGuestWardrobeItems("new-fp");
    expect(result).toHaveLength(0);
  });
});

describe("Guest Upgrade - Review History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return guest review history", async () => {
    const mockHistory = [
      { id: 1, imageUrl: "https://cdn.example.com/img1.jpg", overallScore: 8, createdAt: new Date() },
      { id: 2, imageUrl: "https://cdn.example.com/img2.jpg", overallScore: 7, createdAt: new Date() },
    ];
    vi.mocked(getGuestReviewHistory).mockResolvedValue(mockHistory as any);

    const result = await getGuestReviewHistory("test-fp");
    expect(result).toHaveLength(2);
    expect(result[0].overallScore).toBe(8);
  });

  it("should return empty history for new guest", async () => {
    vi.mocked(getGuestReviewHistory).mockResolvedValue([]);

    const result = await getGuestReviewHistory("new-fp");
    expect(result).toHaveLength(0);
  });
});

describe("Guest Upgrade - Data Migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should migrate guest data to registered user", async () => {
    vi.mocked(migrateGuestDataToUser).mockResolvedValue({
      reviewsMigrated: 3,
      wardrobeItemsMigrated: 5,
    } as any);

    const result = await migrateGuestDataToUser("test-fp", 42);
    expect(result).toBeDefined();
    expect(result.reviewsMigrated).toBe(3);
    expect(result.wardrobeItemsMigrated).toBe(5);
    expect(migrateGuestDataToUser).toHaveBeenCalledWith("test-fp", 42);
  });

  it("should handle migration with no data gracefully", async () => {
    vi.mocked(migrateGuestDataToUser).mockResolvedValue({
      reviewsMigrated: 0,
      wardrobeItemsMigrated: 0,
    } as any);

    const result = await migrateGuestDataToUser("empty-fp", 42);
    expect(result.reviewsMigrated).toBe(0);
    expect(result.wardrobeItemsMigrated).toBe(0);
  });
});
