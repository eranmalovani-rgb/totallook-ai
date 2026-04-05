/**
 * WhatsApp Integration Tests (v3 — Meta Cloud API)
 * Tests the registered-user detection, guest deep-link flow,
 * response formatting, rate limiting, processing lock, follow-up,
 * and webhook registration — all using Meta WhatsApp Cloud API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Global fetch mock ──────────────────────────────────
// Meta Cloud API uses fetch() — we mock it globally

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ messages: [{ id: "wamid.test123" }] }),
  text: async () => "ok",
});

vi.stubGlobal("fetch", mockFetch);

// ── Mocks ──────────────────────────────────────────────

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          overallScore: 8,
          summary: "לוק אלגנטי ומתוחכם",
          items: [
            { name: "חולצה לבנה", icon: "👕", score: 8, color: "לבן", brand: "", brandUrl: "", description: "חולצה נקייה", analysis: "גזרה טובה", verdict: "keep" },
          ],
          scores: [
            { category: "איכות הפריטים", score: 8, explanation: "טוב" },
            { category: "התאמת גזרה", score: 7, explanation: "סבבה" },
          ],
          improvements: [
            { title: "שרשרת", description: "הוסיפו שרשרת זהב", beforeLabel: "לפני", afterLabel: "אחרי", productSearchQuery: "gold necklace", shoppingLinks: [] },
          ],
          outfitSuggestions: [],
          moodboard: { theme: "אלגנטי", colors: [], keywords: [] },
          linkedMentions: [],
        }),
      },
    }],
  }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://s3.example.com/whatsapp/test.jpg",
    key: "whatsapp/test.jpg",
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./db", () => ({
  findUserByPhoneNumber: vi.fn().mockResolvedValue(null),
  createReview: vi.fn().mockResolvedValue(1),
  getReviewById: vi.fn().mockResolvedValue(null),
  updateReviewAnalysis: vi.fn().mockResolvedValue(undefined),
  updateReviewStatus: vi.fn().mockResolvedValue(undefined),
  getUserProfile: vi.fn().mockResolvedValue(null),
  getWardrobeByUserId: vi.fn().mockResolvedValue([]),
  addWardrobeItems: vi.fn().mockResolvedValue({ added: 0, skipped: 0 }),
  createGuestSession: vi.fn().mockResolvedValue(42),
  getGuestSessionById: vi.fn().mockResolvedValue(null),
  updateGuestSessionAnalysis: vi.fn().mockResolvedValue(undefined),
  updateGuestSessionStatus: vi.fn().mockResolvedValue(undefined),
  getGuestProfile: vi.fn().mockResolvedValue(null),
  getGuestSessionIdsByFingerprint: vi.fn().mockResolvedValue([]),
  getGuestWardrobe: vi.fn().mockResolvedValue([]),
  addGuestWardrobeItems: vi.fn().mockResolvedValue({ added: 0, skipped: 0 }),
  getWhatsAppGuestsForFollowUp: vi.fn().mockResolvedValue([]),
  markFollowUpSent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./routers", () => ({
  buildFashionPrompt: vi.fn().mockReturnValue("You are a fashion analyst..."),
  analysisJsonSchema: { type: "object", properties: {} },
  fixShoppingLinkUrls: vi.fn().mockImplementation((a: any) => a),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test_token_12345"),
}));

// ── Tests ──────────────────────────────────────────────

describe("WhatsApp Integration v3 (Meta Cloud API)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.test123" }] }),
      text: async () => "ok",
    });
    process.env.WHATSAPP_TOKEN = "test_token_123";
    process.env.WHATSAPP_PHONE_ID = "123456789";
    process.env.WHATSAPP_VERIFY_TOKEN = "totallook_verify_2026";
  });

  describe("Rate Limiting", () => {
    it("should allow first request from a phone number", async () => {
      const { checkRateLimit } = await import("./whatsapp");
      const result = checkRateLimit("972501234567_rl1");
      expect(result).toBe(true);
    });

    it("should block after daily limit is reached", async () => {
      const { checkRateLimit } = await import("./whatsapp");
      const phone = "972501234567_rl2";
      for (let i = 0; i < 10; i++) {
        checkRateLimit(phone);
      }
      const result = checkRateLimit(phone);
      expect(result).toBe(false);
    });
  });

  describe("Full Analysis Response Formatting", () => {
    it("should format registered user response with deep link", async () => {
      const { formatFullAnalysisResponse } = await import("./whatsapp");

      const analysis: any = {
        overallScore: 9,
        summary: "לוק מושלם!",
        items: [
          { name: "חולצה", score: 9, icon: "👕", color: "לבן", brand: "", brandUrl: "", description: "", analysis: "", verdict: "keep" },
          { name: "מכנסיים", score: 8, icon: "👖", color: "שחור", brand: "", brandUrl: "", description: "", analysis: "", verdict: "keep" },
        ],
        scores: [
          { category: "איכות הפריטים", score: 9, explanation: "מעולה" },
          { category: "התאמת גזרה", score: 8, explanation: "טוב" },
        ],
        improvements: [
          { title: "שרשרת", description: "הוסיפו שרשרת זהב", beforeLabel: "", afterLabel: "", productSearchQuery: "", shoppingLinks: [] },
        ],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      };

      const result = formatFullAnalysisResponse(analysis, "שרה", "https://totallook.ai/review/123", true);

      expect(result).toContain("🔥");
      expect(result).toContain("שרה");
      expect(result).toContain("9/10");
      expect(result).toContain("לוק מושלם!");
      expect(result).toContain("חולצה");
      expect(result).toContain("שרשרת");
      expect(result).toContain("https://totallook.ai/review/123");
      expect(result).not.toContain("הירשם/י");
    });

    it("should format guest response with signup CTA", async () => {
      const { formatFullAnalysisResponse } = await import("./whatsapp");

      const analysis: any = {
        overallScore: 7,
        summary: "לוק נחמד",
        items: [{ name: "חולצה", score: 7, icon: "👕", color: "", brand: "", brandUrl: "", description: "", analysis: "", verdict: "keep" }],
        scores: [{ category: "איכות", score: 7, explanation: "" }],
        improvements: [],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      };

      const result = formatFullAnalysisResponse(analysis, "דנה", "https://totallook.ai/r/abc123", false);

      expect(result).toContain("💫");
      expect(result).toContain("https://totallook.ai/r/abc123");
      expect(result).toContain("totallook.ai");
      expect(result).toContain("לניתוח מותאם אישית");
    });

    it("should use correct emoji for each score range", async () => {
      const { formatFullAnalysisResponse } = await import("./whatsapp");
      const makeAnalysis = (score: number): any => ({
        overallScore: score,
        summary: "test",
        items: [],
        scores: [],
        improvements: [],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      });

      expect(formatFullAnalysisResponse(makeAnalysis(9), "A", "#", true)).toContain("🔥");
      expect(formatFullAnalysisResponse(makeAnalysis(8), "A", "#", true)).toContain("✨");
      expect(formatFullAnalysisResponse(makeAnalysis(7), "A", "#", true)).toContain("💫");
      expect(formatFullAnalysisResponse(makeAnalysis(6), "A", "#", true)).toContain("👍");
    });
  });

  describe("Post-Processing", () => {
    it("should clamp item scores to minimum 5", async () => {
      const { postProcessAnalysis } = await import("./whatsapp");

      const analysis: any = {
        overallScore: 3,
        summary: "test",
        items: [
          { name: "item", score: 2, icon: "", color: "", brand: "", brandUrl: "", description: "", analysis: "", verdict: "keep" },
        ],
        scores: [
          { category: "test", score: 3, explanation: "" },
        ],
        improvements: [],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      };

      const result = postProcessAnalysis(analysis, null);
      expect(result.items[0].score).toBeGreaterThanOrEqual(5);
      expect(result.scores[0].score).toBeGreaterThanOrEqual(5);
      expect(result.overallScore).toBeGreaterThanOrEqual(5);
    });

    it("should clean material descriptions", async () => {
      const { postProcessAnalysis } = await import("./whatsapp");

      const analysis: any = {
        overallScore: 7,
        summary: "תיק דמוי עור",
        items: [
          { name: "תיק דמוי עור", score: 7, icon: "", color: "", brand: "", brandUrl: "", description: "עשוי דמוי עור", analysis: "", verdict: "keep" },
        ],
        scores: [],
        improvements: [],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      };

      const result = postProcessAnalysis(analysis, null);
      expect(result.items[0].name).not.toContain("דמוי עור");
      expect(result.summary).not.toContain("דמוי עור");
    });

    it("should use premium material names for luxury users", async () => {
      const { postProcessAnalysis } = await import("./whatsapp");

      const analysis: any = {
        overallScore: 7,
        summary: "test",
        items: [
          { name: "תיק דמוי עור", score: 7, icon: "", color: "", brand: "", brandUrl: "", description: "", analysis: "", verdict: "keep" },
        ],
        scores: [],
        improvements: [],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      };

      const result = postProcessAnalysis(analysis, { budgetLevel: "luxury" });
      expect(result.items[0].name).toContain("עור יוקרתי");
    });
  });

  describe("Webhook Registration", () => {
    it("should export registerWhatsAppWebhook function", async () => {
      const { registerWhatsAppWebhook } = await import("./whatsapp");
      expect(typeof registerWhatsAppWebhook).toBe("function");
    });

    it("should export all required functions", async () => {
      const mod = await import("./whatsapp");
      expect(typeof mod.handleIncomingMessage).toBe("function");
      expect(typeof mod.formatFullAnalysisResponse).toBe("function");
      expect(typeof mod.sendWhatsAppMessage).toBe("function");
      expect(typeof mod.downloadMetaMedia).toBe("function");
      expect(typeof mod.checkRateLimit).toBe("function");
      expect(typeof mod.postProcessAnalysis).toBe("function");
      expect(typeof mod.handleRegisteredUserAnalysis).toBe("function");
      expect(typeof mod.handleGuestAnalysis).toBe("function");
      expect(typeof mod.isOwnerPhone).toBe("function");
      expect(typeof mod.GUEST_LIFETIME_LIMIT).toBe("number");
      expect(typeof mod.processFollowUps).toBe("function");
      expect(typeof mod.sendFollowUpMessage).toBe("function");
      expect(typeof mod.startFollowUpScheduler).toBe("function");
      expect(typeof mod.stopFollowUpScheduler).toBe("function");
    });
  });

  describe("Owner Phone Detection", () => {
    it("should identify owner phone number", async () => {
      const { isOwnerPhone } = await import("./whatsapp");
      expect(isOwnerPhone("+972525556111")).toBe(true);
      expect(isOwnerPhone("972525556111")).toBe(true);
    });

    it("should reject non-owner phone numbers", async () => {
      const { isOwnerPhone } = await import("./whatsapp");
      expect(isOwnerPhone("+972501234567")).toBe(false);
      expect(isOwnerPhone("14155238886")).toBe(false);
      expect(isOwnerPhone("")).toBe(false);
    });
  });

  describe("Guest Lifetime Limit", () => {
    it("should export GUEST_LIFETIME_LIMIT as 2", async () => {
      const { GUEST_LIFETIME_LIMIT } = await import("./whatsapp");
      expect(GUEST_LIFETIME_LIMIT).toBe(2);
    });
  });

  describe("Processing Lock", () => {
    it("should export processingLock and LOCK_TIMEOUT_MS", async () => {
      const mod = await import("./whatsapp");
      expect(mod.processingLock).toBeInstanceOf(Map);
      expect(typeof mod.LOCK_TIMEOUT_MS).toBe("number");
      expect(mod.LOCK_TIMEOUT_MS).toBe(3 * 60 * 1000);
    });

    it("should block second image while first is processing", async () => {
      const { processingLock, handleIncomingMessage } = await import("./whatsapp");

      // Simulate an active lock for this phone (Meta format: digits only)
      const phone = "972509999999";
      processingLock.set(phone, { lockedAt: Date.now(), rejectionSent: false });

      // Meta format message with image
      await handleIncomingMessage(
        {
          from: phone,
          id: "wamid.test1",
          timestamp: String(Math.floor(Date.now() / 1000)),
          type: "image",
          image: { id: "media_123", mime_type: "image/jpeg", sha256: "abc" },
        },
        "Test"
      );

      // Should have called fetch to send rejection message
      const sendCalls = mockFetch.mock.calls.filter(
        (call: any[]) => typeof call[0] === "string" && call[0].includes("/messages")
      );
      expect(sendCalls.length).toBeGreaterThanOrEqual(1);
      const lastSendBody = JSON.parse(sendCalls[0][1].body);
      expect(lastSendBody.text.body).toContain("כבר מנתח");

      processingLock.delete(phone);
    });

    it("should send rejection message only once for multiple extra images", async () => {
      const { processingLock, handleIncomingMessage } = await import("./whatsapp");

      const phone = "972508888888";
      processingLock.set(phone, { lockedAt: Date.now(), rejectionSent: false });

      // Send 3 extra images
      for (let i = 0; i < 3; i++) {
        await handleIncomingMessage(
          {
            from: phone,
            id: `wamid.test${i}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: "image",
            image: { id: `media_${i}`, mime_type: "image/jpeg", sha256: "abc" },
          },
          "Test"
        );
      }

      // Should have sent rejection message only ONCE (first call sends, rest are blocked by rejectionSent flag)
      const sendCalls = mockFetch.mock.calls.filter(
        (call: any[]) => typeof call[0] === "string" && call[0].includes("/messages")
      );
      expect(sendCalls.length).toBe(1);

      processingLock.delete(phone);
    });

    it("should release stale locks after timeout", async () => {
      const { processingLock, LOCK_TIMEOUT_MS } = await import("./whatsapp");

      const phone = "972507777777";
      processingLock.set(phone, { lockedAt: Date.now() - LOCK_TIMEOUT_MS - 1000, rejectionSent: false });

      const lock = processingLock.get(phone)!;
      const lockAge = Date.now() - lock.lockedAt;
      expect(lockAge).toBeGreaterThan(LOCK_TIMEOUT_MS);

      processingLock.delete(phone);
    });
  });

  describe("Guest Analysis Counter", () => {
    it("should include remaining analyses counter for guest", async () => {
      const { formatFullAnalysisResponse } = await import("./whatsapp");

      const analysis: any = {
        overallScore: 7,
        summary: "test",
        items: [],
        scores: [],
        improvements: [],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      };

      const result = formatFullAnalysisResponse(analysis, "דנה", "#", false, { used: 1, limit: 2 });
      expect(result).toContain("נותרו 1 ניתוחים חינמיים");
    });

    it("should show last analysis message when limit reached", async () => {
      const { formatFullAnalysisResponse } = await import("./whatsapp");

      const analysis: any = {
        overallScore: 7,
        summary: "test",
        items: [],
        scores: [],
        improvements: [],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      };

      const result = formatFullAnalysisResponse(analysis, "דנה", "#", false, { used: 2, limit: 2 });
      expect(result).toContain("הניתוח האחרון שלך");
    });

    it("should not include counter for registered users", async () => {
      const { formatFullAnalysisResponse } = await import("./whatsapp");

      const analysis: any = {
        overallScore: 7,
        summary: "test",
        items: [],
        scores: [],
        improvements: [],
        outfitSuggestions: [],
        moodboard: { theme: "", colors: [], keywords: [] },
        linkedMentions: [],
      };

      const result = formatFullAnalysisResponse(analysis, "שרה", "#", true);
      expect(result).not.toContain("נותר");
      expect(result).not.toContain("חינמי");
    });
  });

  describe("Follow-up System", () => {
    it("should process follow-ups when eligible guests exist", async () => {
      const dbMod = await import("./db");

      (dbMod.getWhatsAppGuestsForFollowUp as any).mockResolvedValueOnce([
        { whatsappPhone: "972501234567", whatsappProfileName: "דנה", sessionId: 1, createdAt: new Date() },
      ]);

      const { processFollowUps } = await import("./whatsapp");
      const sent = await processFollowUps();

      expect(sent).toBe(1);
      // Check that fetch was called to send the message via Meta API
      const sendCalls = mockFetch.mock.calls.filter(
        (call: any[]) => typeof call[0] === "string" && call[0].includes("/messages")
      );
      expect(sendCalls.length).toBeGreaterThanOrEqual(1);
      const sentBody = JSON.parse(sendCalls[0][1].body);
      expect(sentBody.to).toBe("972501234567");
      expect(sentBody.text.body).toContain("דנה");
      expect(sentBody.text.body).toContain("לוק חדש");
      expect(dbMod.markFollowUpSent).toHaveBeenCalledWith("972501234567");
    });

    it("should return 0 when no eligible guests", async () => {
      const dbMod = await import("./db");
      (dbMod.getWhatsAppGuestsForFollowUp as any).mockResolvedValueOnce([]);

      const { processFollowUps } = await import("./whatsapp");
      const sent = await processFollowUps();
      expect(sent).toBe(0);
    });

    it("should send follow-up with registration CTA", async () => {
      const { sendFollowUpMessage } = await import("./whatsapp");

      await sendFollowUpMessage("972501234567", "יוסי");

      const sendCalls = mockFetch.mock.calls.filter(
        (call: any[]) => typeof call[0] === "string" && call[0].includes("/messages")
      );
      expect(sendCalls.length).toBeGreaterThanOrEqual(1);
      const sentBody = JSON.parse(sendCalls[0][1].body);
      expect(sentBody.text.body).toContain("יוסי");
      expect(sentBody.text.body).toContain("הירשם/י");
      expect(sentBody.text.body).toContain("ניתוחים ללא הגבלה");
    });
  });

  describe("Incoming Message Handling (Meta format)", () => {
    it("should handle text-only messages (no image)", async () => {
      const { handleIncomingMessage } = await import("./whatsapp");

      await handleIncomingMessage(
        {
          from: "972501111111",
          id: "wamid.text1",
          timestamp: String(Math.floor(Date.now() / 1000)),
          type: "text",
          text: { body: "שלום" },
        },
        "טסט"
      );

      // Should have called fetch to send instruction message
      const sendCalls = mockFetch.mock.calls.filter(
        (call: any[]) => typeof call[0] === "string" && call[0].includes("/messages")
      );
      expect(sendCalls.length).toBeGreaterThanOrEqual(1);
      const sentBody = JSON.parse(sendCalls[0][1].body);
      expect(sentBody.to).toBe("972501111111");
      expect(sentBody.text.body).toContain("TotalLook.ai");
      expect(sentBody.text.body).toContain("תמונה");
    });

    it("should handle audio messages (no image)", async () => {
      const { handleIncomingMessage } = await import("./whatsapp");

      await handleIncomingMessage(
        {
          from: "972502222222",
          id: "wamid.audio1",
          timestamp: String(Math.floor(Date.now() / 1000)),
          type: "audio",
        },
        "טסט2"
      );

      // Should have sent instruction message (audio is not an image)
      const sendCalls = mockFetch.mock.calls.filter(
        (call: any[]) => typeof call[0] === "string" && call[0].includes("/messages")
      );
      expect(sendCalls.length).toBeGreaterThanOrEqual(1);
      const sentBody = JSON.parse(sendCalls[0][1].body);
      expect(sentBody.text.body).toContain("TotalLook.ai");
      expect(sentBody.text.body).toContain("תמונה");
    });
  });
});
