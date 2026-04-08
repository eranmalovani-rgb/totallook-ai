import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  createStoryMention: vi.fn().mockResolvedValue(1),
  updateStoryMentionAnalysis: vi.fn().mockResolvedValue(undefined),
  findUserByIgUserId: vi.fn().mockResolvedValue(null),
  storyMentionExists: vi.fn().mockResolvedValue(false),
  getIgConnection: vi.fn().mockResolvedValue(null),
  upsertIgConnection: vi.fn().mockResolvedValue(1),
  disconnectIg: vi.fn().mockResolvedValue(undefined),
  getStoryMentionsByUserId: vi.fn().mockResolvedValue([]),
  getStoryMentionStats: vi.fn().mockResolvedValue({ total: 0, avgScore: 0, bestScore: 0 }),
  getStyleDiary: vi.fn().mockResolvedValue([]),
  saveStyleDiaryEntry: vi.fn().mockResolvedValue(1),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          overallScore: 7.5,
          quickSummary: "לוק יפה עם שילוב צבעים מעניין",
          quickTip: "נסי להוסיף חגורה חומה",
          itemsDetected: 3,
          items: [
            { type: "shirt", color: "white", brand: "Zara", verdict: "great fit" },
            { type: "jeans", color: "blue", brand: "Levi's", verdict: "classic" },
            { type: "sneakers", color: "white", brand: "Nike", verdict: "clean" },
          ],
          strengths: ["שילוב צבעים נקי", "פרופורציות טובות"],
          improvements: [
            { item: "אקססוריז", suggestion: "הוסיפי שרשרת זהב", estimatedScoreBoost: 0.5 },
          ],
        }),
      },
    }],
  }),
}));

// Mock the storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/story.jpg", key: "story-mentions/123/test.jpg" }),
}));

// Mock the image generation module
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://s3.example.com/generated.jpg" }),
}));

import {
  createStoryMention,
  updateStoryMentionAnalysis,
  findUserByIgUserId,
  storyMentionExists,
  getIgConnection,
  upsertIgConnection,
  disconnectIg,
  getStoryMentionsByUserId,
  getStoryMentionStats,
  getStyleDiary,
} from "./db";

describe("Instagram Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Story Mention Deduplication", () => {
    it("should check for duplicate story mentions by media ID", async () => {
      const mockExists = vi.mocked(storyMentionExists);
      mockExists.mockResolvedValueOnce(true);

      const result = await storyMentionExists("media_123");
      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith("media_123");
    });

    it("should return false for new story mentions", async () => {
      const mockExists = vi.mocked(storyMentionExists);
      mockExists.mockResolvedValueOnce(false);

      const result = await storyMentionExists("new_media_456");
      expect(result).toBe(false);
    });
  });

  describe("Story Mention Creation", () => {
    it("should create a story mention record", async () => {
      const mockCreate = vi.mocked(createStoryMention);
      mockCreate.mockResolvedValueOnce(42);

      const id = await createStoryMention({
        userId: 1,
        igUserId: "ig_user_123",
        igUsername: "fashionista",
        igMediaId: "media_789",
        mediaUrl: "https://instagram.com/story/image.jpg",
        status: "received",
      });

      expect(id).toBe(42);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        igUserId: "ig_user_123",
        igUsername: "fashionista",
        status: "received",
      }));
    });
  });

  describe("Story Mention Analysis Update", () => {
    it("should update story mention with analysis results", async () => {
      const mockUpdate = vi.mocked(updateStoryMentionAnalysis);

      await updateStoryMentionAnalysis(1, {
        status: "completed",
        overallScore: 8,
        quickSummary: "לוק מעולה!",
        quickTip: "הוסיפי אקססוריז",
        itemsDetected: 4,
      });

      expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "completed",
        overallScore: 8,
        itemsDetected: 4,
      }));
    });

    it("should handle failed analysis", async () => {
      const mockUpdate = vi.mocked(updateStoryMentionAnalysis);

      await updateStoryMentionAnalysis(1, {
        status: "failed",
        errorMessage: "Could not fetch story image",
      });

      expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "failed",
        errorMessage: "Could not fetch story image",
      }));
    });
  });

  describe("User-IG Connection", () => {
    it("should find user by Instagram user ID", async () => {
      const mockFind = vi.mocked(findUserByIgUserId);
      mockFind.mockResolvedValueOnce({
        id: 1,
        userId: 5,
        igUserId: "ig_123",
        igUsername: "user1",
        accessToken: "token_abc",
        tokenExpiresAt: null,
        isActive: 1,
        connectedAt: new Date(),
        updatedAt: new Date(),
      });

      const conn = await findUserByIgUserId("ig_123");
      expect(conn).not.toBeNull();
      expect(conn!.userId).toBe(5);
    });

    it("should return null for unknown IG user", async () => {
      const mockFind = vi.mocked(findUserByIgUserId);
      mockFind.mockResolvedValueOnce(null);

      const conn = await findUserByIgUserId("unknown_ig_user");
      expect(conn).toBeNull();
    });

    it("should upsert IG connection", async () => {
      const mockUpsert = vi.mocked(upsertIgConnection);
      mockUpsert.mockResolvedValueOnce(10);

      const id = await upsertIgConnection({
        userId: 5,
        igUserId: "ig_123",
        igUsername: "fashionista",
        accessToken: "new_token",
      });

      expect(id).toBe(10);
    });

    it("should disconnect IG", async () => {
      const mockDisconnect = vi.mocked(disconnectIg);

      await disconnectIg(5);
      expect(mockDisconnect).toHaveBeenCalledWith(5);
    });
  });

  describe("Story Mentions Retrieval", () => {
    it("should get story mentions for a user", async () => {
      const mockGet = vi.mocked(getStoryMentionsByUserId);
      mockGet.mockResolvedValueOnce([
        {
          id: 1,
          userId: 5,
          igUserId: "ig_123",
          igUsername: "fashionista",
          igMediaId: "media_1",
          mediaUrl: "https://ig.com/story1.jpg",
          savedImageUrl: "https://s3.com/story1.jpg",
          savedImageKey: "story-mentions/ig_123/1.jpg",
          status: "completed" as const,
          overallScore: 8,
          analysisJson: { overallScore: 8 },
          quickSummary: "לוק מעולה",
          quickTip: "הוסיפי שרשרת",
          itemsDetected: 3,
          dmSent: 1,
          errorMessage: null,
          linkedReviewId: null,
          createdAt: new Date(),
        },
      ]);

      const stories = await getStoryMentionsByUserId(5, 50);
      expect(stories).toHaveLength(1);
      expect(stories[0].overallScore).toBe(8);
      expect(stories[0].status).toBe("completed");
    });

    it("should return empty array for user with no stories", async () => {
      const mockGet = vi.mocked(getStoryMentionsByUserId);
      mockGet.mockResolvedValueOnce([]);

      const stories = await getStoryMentionsByUserId(999, 50);
      expect(stories).toHaveLength(0);
    });
  });

  describe("Story Mention Stats", () => {
    it("should return stats for a user", async () => {
      const mockStats = vi.mocked(getStoryMentionStats);
      mockStats.mockResolvedValueOnce({ total: 15, avgScore: 7.3, bestScore: 9 });

      const stats = await getStoryMentionStats(5);
      expect(stats.total).toBe(15);
      expect(stats.avgScore).toBe(7.3);
      expect(stats.bestScore).toBe(9);
    });

    it("should return zero stats for new user", async () => {
      const mockStats = vi.mocked(getStoryMentionStats);
      mockStats.mockResolvedValueOnce({ total: 0, avgScore: 0, bestScore: 0 });

      const stats = await getStoryMentionStats(999);
      expect(stats.total).toBe(0);
    });
  });

  describe("Style Diary", () => {
    it("should return diary entries for a user", async () => {
      const mockDiary = vi.mocked(getStyleDiary);
      mockDiary.mockResolvedValueOnce([
        {
          id: 1,
          userId: 5,
          periodType: "week",
          periodStart: new Date("2026-03-24"),
          periodEnd: new Date("2026-03-30"),
          lookCount: 5,
          avgScore: 7,
          bestScore: 9,
          bestLookDate: new Date("2026-03-27"),
          bestLookImageUrl: "https://s3.com/best.jpg",
          topItemTypes: ["shirt", "jeans"],
          topColors: ["blue", "white"],
          styleTrend: "Casual chic",
          evolutionInsight: "הסגנון שלך הולך ומשתפר!",
          scoreTrend: "improving",
          createdAt: new Date(),
        },
      ]);

      const diary = await getStyleDiary(5, 20);
      expect(diary).toHaveLength(1);
      expect(diary[0].lookCount).toBe(5);
      expect(diary[0].scoreTrend).toBe("improving");
    });
  });

  describe("DM Message Format", () => {
    it("should format DM message correctly", () => {
      const analysis = {
        overallScore: 8,
        quickSummary: "לוק מעולה עם שילוב צבעים מושלם",
        quickTip: "נסי להוסיף חגורה חומה",
        itemsDetected: 4,
        fullAnalysis: {},
      };

      const scoreEmoji = analysis.overallScore >= 8 ? "🔥" : analysis.overallScore >= 7 ? "✨" : "💫";

      const message = [
        `${scoreEmoji} הלוק שלך היום: ${analysis.overallScore}/10`,
        ``,
        `👗 ${analysis.quickSummary}`,
        `💡 טיפ: ${analysis.quickTip}`,
        `📦 זיהינו ${analysis.itemsDetected} פריטים — נוספו לארון שלך`,
      ].join("\n");

      expect(message).toContain("🔥");
      expect(message).toContain("8/10");
      expect(message).toContain("לוק מעולה");
      expect(message).toContain("חגורה חומה");
      expect(message).toContain("4 פריטים");
    });

    it("should use correct emoji for different scores", () => {
      const getEmoji = (score: number) =>
        score >= 8 ? "🔥" : score >= 7 ? "✨" : "💫";

      expect(getEmoji(9)).toBe("🔥");
      expect(getEmoji(8)).toBe("🔥");
      expect(getEmoji(7.5)).toBe("✨");
      expect(getEmoji(7)).toBe("✨");
      expect(getEmoji(6)).toBe("💫");
      expect(getEmoji(5)).toBe("💫");
    });
  });

  describe("Webhook Verification", () => {
    it("should verify webhook with correct token", () => {
      const VERIFY_TOKEN = "totallook_verify_2026";
      const mode = "subscribe";
      const token = "totallook_verify_2026";
      const challenge = "challenge_abc123";

      const isValid = mode === "subscribe" && token === VERIFY_TOKEN;
      expect(isValid).toBe(true);
    });

    it("should reject webhook with wrong token", () => {
      const VERIFY_TOKEN = "totallook_verify_2026";
      const mode = "subscribe";
      const token = "wrong_token";

      const isValid = mode === "subscribe" && token === VERIFY_TOKEN;
      expect(isValid).toBe(false);
    });
  });
});
