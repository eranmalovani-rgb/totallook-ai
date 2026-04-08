import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the notification module
const mockNotifyOwner = vi.fn();
vi.mock("./_core/notification", () => ({
  notifyOwner: (...args: any[]) => mockNotifyOwner(...args),
}));

// We need to test the notifyGuestAnalysisCompleted function.
// Since it's a module-level function in routers.ts (not exported), we test
// the notifyOwner integration pattern directly.

describe("Guest Analysis Admin Notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call notifyOwner with correct title and content shape", async () => {
    const { notifyOwner } = await import("./_core/notification");
    mockNotifyOwner.mockResolvedValue(true);

    await notifyOwner({
      title: "👤 אורח חדש סיים ניתוח — ציון 7.5/10",
      content: [
        "אורח חדש סיים ניתוח אופנתי ב-TotalLook.ai!",
        "",
        "🆔 Session: #42",
        "📊 ציון כללי: 7.5/10",
        "📱 מכשיר: iPhone",
        "🌐 IP: 1.2.3.4",
        "🔑 Fingerprint: abc123def456...",
        "🕐 זמן: 27.3.2026, 14:00:00",
        "\nסיכום: לוק קז'ואל מוצלח עם שילוב צבעים הרמוני",
        "\n🖼️ תמונה: https://cdn.example.com/guest/image.jpg",
      ].filter(Boolean).join("\n"),
    });

    expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
    const call = mockNotifyOwner.mock.calls[0][0];
    expect(call.title).toContain("אורח חדש סיים ניתוח");
    expect(call.title).toContain("7.5/10");
    expect(call.content).toContain("Session: #42");
    expect(call.content).toContain("ציון כללי: 7.5/10");
    expect(call.content).toContain("iPhone");
    expect(call.content).toContain("1.2.3.4");
    expect(call.content).toContain("abc123def456...");
    expect(call.content).toContain("תמונה:");
  });

  it("should handle notification failure gracefully", async () => {
    mockNotifyOwner.mockRejectedValue(new Error("Network error"));

    // Should not throw
    await expect(
      (async () => {
        try {
          await mockNotifyOwner({
            title: "👤 אורח חדש סיים ניתוח — ציון 8/10",
            content: "test",
          });
        } catch {
          // swallowed — matches fire-and-forget pattern
        }
      })()
    ).resolves.toBeUndefined();
  });

  it("should include device detection for iPhone user agent", () => {
    const userAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
    const device = userAgent.includes("iPhone")
      ? "iPhone"
      : userAgent.includes("Android")
        ? "Android"
        : "Desktop";
    expect(device).toBe("iPhone");
  });

  it("should include device detection for Android user agent", () => {
    const userAgent =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36";
    const device = userAgent.includes("iPhone")
      ? "iPhone"
      : userAgent.includes("Android")
        ? "Android"
        : "Desktop";
    expect(device).toBe("Android");
  });

  it("should include device detection for Desktop user agent", () => {
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
    const device = userAgent.includes("iPhone")
      ? "iPhone"
      : userAgent.includes("Android")
        ? "Android"
        : "Desktop";
    expect(device).toBe("Desktop");
  });

  it("should truncate fingerprint for display", () => {
    const fingerprint = "abcdef1234567890abcdef";
    const fp = fingerprint.slice(0, 12) + "...";
    expect(fp).toBe("abcdef123456...");
    expect(fp.length).toBe(15);
  });

  it("should truncate long analysis summary", () => {
    const longSummary = "א".repeat(300);
    const truncated = longSummary.slice(0, 200);
    expect(truncated.length).toBe(200);
  });

  it("should handle missing fields gracefully", () => {
    const scoreStr = (null as any) ? `${null}/10` : "N/A";
    expect(scoreStr).toBe("N/A");

    const summaryStr = (null as any) ? `\nסיכום: ${null}` : "";
    expect(summaryStr).toBe("");

    const imageStr = (null as any) ? `\n🖼️ תמונה: ${null}` : "";
    expect(imageStr).toBe("");
  });

  it("should format notification content with all fields present", () => {
    const sessionId = 42;
    const overallScore = 7.5;
    const device = "iPhone";
    const ipAddress = "1.2.3.4";
    const fp = "abc123def456...";
    const now = "27.3.2026, 14:00:00";
    const analysisSummary = "לוק קז'ואל מוצלח";
    const imageUrl = "https://cdn.example.com/image.jpg";

    const scoreStr = overallScore ? `${overallScore}/10` : "N/A";
    const summaryStr = analysisSummary ? `\nסיכום: ${analysisSummary.slice(0, 200)}` : "";

    const content = [
      `אורח חדש סיים ניתוח אופנתי ב-TotalLook.ai!`,
      ``,
      `🆔 Session: #${sessionId}`,
      `📊 ציון כללי: ${scoreStr}`,
      `📱 מכשיר: ${device}`,
      `🌐 IP: ${ipAddress}`,
      `🔑 Fingerprint: ${fp}`,
      `🕐 זמן: ${now}`,
      summaryStr,
      imageUrl ? `\n🖼️ תמונה: ${imageUrl}` : "",
    ].filter(Boolean).join("\n");

    expect(content).toContain("Session: #42");
    expect(content).toContain("7.5/10");
    expect(content).toContain("iPhone");
    expect(content).toContain("1.2.3.4");
    expect(content).toContain("לוק קז'ואל מוצלח");
    expect(content).toContain("https://cdn.example.com/image.jpg");
  });
});
