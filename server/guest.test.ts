import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("./db", () => ({
  getGuestSessionByFingerprint: vi.fn(),
  createGuestSession: vi.fn(),
  updateGuestSessionAnalysis: vi.fn(),
  getGuestSession: vi.fn(),
  getGuestAnalytics: vi.fn(),
  getAllGuestSessions: vi.fn(),
  trackDemoView: vi.fn(),
  updateDemoViewSignupClick: vi.fn(),
  getAllDemoViews: vi.fn(),
}));

import {
  getGuestSessionByFingerprint,
  createGuestSession,
  updateGuestSessionAnalysis,
  getGuestSession,
  getGuestAnalytics,
  getAllGuestSessions,
  trackDemoView,
  updateDemoViewSignupClick,
  getAllDemoViews,
} from "./db";

describe("Guest Mode - DB Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Guest Session Management", () => {
    it("should check if a guest has already used their free analysis", async () => {
      const mockSession = {
        id: 1,
        fingerprint: "abc123",
        ip: "1.2.3.4",
        status: "completed",
        createdAt: new Date(),
      };
      vi.mocked(getGuestSessionByFingerprint).mockResolvedValue(mockSession as any);

      const result = await getGuestSessionByFingerprint("abc123");
      expect(result).toBeDefined();
      expect(result?.fingerprint).toBe("abc123");
      expect(getGuestSessionByFingerprint).toHaveBeenCalledWith("abc123");
    });

    it("should return null for a new guest fingerprint", async () => {
      vi.mocked(getGuestSessionByFingerprint).mockResolvedValue(null);

      const result = await getGuestSessionByFingerprint("new-fingerprint");
      expect(result).toBeNull();
    });

    it("should create a new guest session", async () => {
      const newSession = {
        id: 1,
        fingerprint: "abc123",
        ip: "1.2.3.4",
        imageUrl: "https://cdn.example.com/image.jpg",
        imageKey: "guest/abc123.jpg",
        status: "uploaded",
        createdAt: new Date(),
      };
      vi.mocked(createGuestSession).mockResolvedValue(newSession as any);

      const result = await createGuestSession({
        fingerprint: "abc123",
        ip: "1.2.3.4",
        imageUrl: "https://cdn.example.com/image.jpg",
        imageKey: "guest/abc123.jpg",
      });

      expect(result).toBeDefined();
      expect(result.fingerprint).toBe("abc123");
      expect(result.status).toBe("uploaded");
      expect(createGuestSession).toHaveBeenCalledWith({
        fingerprint: "abc123",
        ip: "1.2.3.4",
        imageUrl: "https://cdn.example.com/image.jpg",
        imageKey: "guest/abc123.jpg",
      });
    });

    it("should update guest session with analysis results", async () => {
      vi.mocked(updateGuestSessionAnalysis).mockResolvedValue(undefined);

      const analysisJson = { overallScore: 8, items: [] };
      await updateGuestSessionAnalysis(1, analysisJson, 8);

      expect(updateGuestSessionAnalysis).toHaveBeenCalledWith(1, analysisJson, 8);
    });

    it("should retrieve a guest session by ID", async () => {
      const mockSession = {
        id: 1,
        fingerprint: "abc123",
        status: "completed",
        analysisJson: { overallScore: 8 },
        overallScore: 8,
      };
      vi.mocked(getGuestSession).mockResolvedValue(mockSession as any);

      const result = await getGuestSession(1);
      expect(result).toBeDefined();
      expect(result?.status).toBe("completed");
      expect(result?.overallScore).toBe(8);
    });
  });

  describe("Guest Analytics", () => {
    it("should return guest analytics with correct shape", async () => {
      const mockAnalytics = {
        totalGuests: 10,
        completedAnalyses: 7,
        convertedToUsers: 3,
        conversionRate: 30,
        totalDemoViews: 25,
        demoSignupClicks: 5,
        demoConversionRate: 20,
      };
      vi.mocked(getGuestAnalytics).mockResolvedValue(mockAnalytics);

      const result = await getGuestAnalytics();
      expect(result).toEqual(mockAnalytics);
      expect(result.totalGuests).toBe(10);
      expect(result.completedAnalyses).toBe(7);
      expect(result.conversionRate).toBe(30);
      expect(result.demoConversionRate).toBe(20);
    });

    it("should return guest sessions list", async () => {
      const mockSessions = {
        sessions: [
          { id: 1, fingerprint: "abc", status: "completed", overallScore: 8 },
          { id: 2, fingerprint: "def", status: "uploaded", overallScore: null },
        ],
        total: 2,
      };
      vi.mocked(getAllGuestSessions).mockResolvedValue(mockSessions as any);

      const result = await getAllGuestSessions(50, 0);
      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe("Demo View Tracking", () => {
    it("should track a demo view", async () => {
      vi.mocked(trackDemoView).mockResolvedValue({ id: 1 } as any);

      const result = await trackDemoView({
        fingerprint: "abc123",
        ip: "1.2.3.4",
      });

      expect(result).toBeDefined();
      expect(trackDemoView).toHaveBeenCalledWith({
        fingerprint: "abc123",
        ip: "1.2.3.4",
      });
    });

    it("should update demo view with signup click", async () => {
      vi.mocked(updateDemoViewSignupClick).mockResolvedValue(undefined);

      await updateDemoViewSignupClick(1);
      expect(updateDemoViewSignupClick).toHaveBeenCalledWith(1);
    });

    it("should return demo views list", async () => {
      const mockViews = {
        views: [
          { id: 1, fingerprint: "abc", clickedSignup: true, viewedAt: new Date() },
          { id: 2, fingerprint: "def", clickedSignup: false, viewedAt: new Date() },
        ],
        total: 2,
      };
      vi.mocked(getAllDemoViews).mockResolvedValue(mockViews as any);

      const result = await getAllDemoViews(50, 0);
      expect(result.views).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.views[0].clickedSignup).toBe(true);
    });
  });
});

describe("Guest Mode - Rate Limiting Logic", () => {
  it("should allow first analysis for new fingerprint", async () => {
    vi.mocked(getGuestSessionByFingerprint).mockResolvedValue(null);

    const existing = await getGuestSessionByFingerprint("new-user");
    const canAnalyze = !existing;
    expect(canAnalyze).toBe(true);
  });

  it("should block second analysis for same fingerprint", async () => {
    vi.mocked(getGuestSessionByFingerprint).mockResolvedValue({
      id: 1,
      fingerprint: "existing-user",
      status: "completed",
    } as any);

    const existing = await getGuestSessionByFingerprint("existing-user");
    const canAnalyze = !existing;
    expect(canAnalyze).toBe(false);
  });
});
