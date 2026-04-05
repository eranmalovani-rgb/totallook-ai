/**
 * Instagram Story Mentions Integration
 * 
 * Handles:
 * 1. Webhook verification (GET /api/instagram/webhook)
 * 2. Webhook events (POST /api/instagram/webhook) — story mentions
 * 3. Story image fetching from Instagram Graph API
 * 4. Auto-analysis pipeline (fetch → analyze → save → DM)
 * 5. DM response sending via Instagram Messenger API
 */

import type { Request, Response, Express } from "express";
import { createStoryMention, updateStoryMentionAnalysis, findUserByIgUserId, storyMentionExists, getIgConnection } from "./db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

// ==========================================
// Constants
// ==========================================

const IG_GRAPH_API = "https://graph.instagram.com/v21.0";
const VERIFY_TOKEN = process.env.IG_WEBHOOK_VERIFY_TOKEN || "totallook_verify_2026";

// ==========================================
// Webhook Registration
// ==========================================

export function registerInstagramWebhook(app: Express) {
  // Webhook verification (Meta sends GET to verify endpoint)
  app.get("/api/instagram/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[Instagram] Webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      console.warn("[Instagram] Webhook verification failed — invalid token");
      res.sendStatus(403);
    }
  });

  // Webhook event handler (Meta sends POST with events)
  app.post("/api/instagram/webhook", async (req: Request, res: Response) => {
    // Always respond 200 quickly to Meta (they retry on timeout)
    res.sendStatus(200);

    try {
      const body = req.body;
      if (body.object !== "instagram") return;

      for (const entry of body.entry || []) {
        // Story mention events come under "messaging" for story_mention type
        // or under "changes" for mentions field
        if (entry.messaging) {
          for (const event of entry.messaging) {
            if (event.message?.attachments?.[0]?.type === "story_mention") {
              await handleStoryMention(event);
            }
          }
        }
        // Alternative: changes-based webhook
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "mentions" || change.field === "story_insights") {
              await handleMentionChange(change, entry.id);
            }
          }
        }
      }
    } catch (error) {
      console.error("[Instagram] Webhook processing error:", error);
    }
  });

  console.log("[Instagram] Webhook endpoints registered at /api/instagram/webhook");
}

// ==========================================
// Event Handlers
// ==========================================

interface StoryMentionEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message: {
    mid: string;
    attachments: Array<{
      type: string;
      payload: {
        url: string;
      };
    }>;
  };
}

async function handleStoryMention(event: StoryMentionEvent) {
  const igUserId = event.sender.id;
  const storyUrl = event.message?.attachments?.[0]?.payload?.url;
  const mediaId = event.message?.mid;

  console.log(`[Instagram] Story mention from IG user ${igUserId}`);

  // Dedup check
  if (mediaId && await storyMentionExists(mediaId)) {
    console.log(`[Instagram] Duplicate story mention ${mediaId}, skipping`);
    return;
  }

  // Find linked TotalLook user
  const igConnection = await findUserByIgUserId(igUserId);
  const userId = igConnection?.userId ?? null;

  // Create story mention record
  const mentionId = await createStoryMention({
    userId,
    igUserId,
    igUsername: igConnection?.igUsername ?? null,
    igMediaId: mediaId,
    mediaUrl: storyUrl,
    status: "received",
  });

  // Process asynchronously
  processStoryMention(mentionId, igUserId, storyUrl, userId).catch(err => {
    console.error(`[Instagram] Failed to process story mention ${mentionId}:`, err);
    updateStoryMentionAnalysis(mentionId, {
      status: "failed",
      errorMessage: err.message,
    });
  });
}

async function handleMentionChange(change: any, pageId: string) {
  // Handle mentions from the changes-based webhook format
  const mediaId = change.value?.media_id;
  const igUserId = change.value?.sender_id || change.value?.from?.id;

  if (!mediaId || !igUserId) return;

  console.log(`[Instagram] Mention change from IG user ${igUserId}, media ${mediaId}`);

  if (await storyMentionExists(mediaId)) {
    console.log(`[Instagram] Duplicate mention ${mediaId}, skipping`);
    return;
  }

  const igConnection = await findUserByIgUserId(igUserId);
  const userId = igConnection?.userId ?? null;

  const mentionId = await createStoryMention({
    userId,
    igUserId,
    igMediaId: mediaId,
    status: "received",
  });

  // Fetch the media URL from Graph API and process
  processStoryMentionFromMediaId(mentionId, igUserId, mediaId, userId).catch(err => {
    console.error(`[Instagram] Failed to process mention ${mentionId}:`, err);
    updateStoryMentionAnalysis(mentionId, {
      status: "failed",
      errorMessage: err.message,
    });
  });
}

// ==========================================
// Processing Pipeline
// ==========================================

async function processStoryMention(
  mentionId: number,
  igUserId: string,
  storyUrl: string | undefined,
  userId: number | null
) {
  // Step 1: Fetch the story image
  await updateStoryMentionAnalysis(mentionId, { status: "fetching" });

  let imageUrl = storyUrl;
  if (!imageUrl) {
    console.warn(`[Instagram] No story URL for mention ${mentionId}`);
    await updateStoryMentionAnalysis(mentionId, {
      status: "failed",
      errorMessage: "No story image URL available",
    });
    return;
  }

  // Step 2: Save image to S3
  let savedImageUrl: string | undefined;
  let savedImageKey: string | undefined;
  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const key = `story-mentions/${igUserId}/${Date.now()}.jpg`;
      const result = await storagePut(key, buffer, "image/jpeg");
      savedImageUrl = result.url;
      savedImageKey = key;
      imageUrl = result.url; // Use S3 URL for analysis
    }
  } catch (err) {
    console.warn(`[Instagram] Failed to save story image to S3:`, err);
    // Continue with original URL
  }

  // Step 3: Run AI analysis
  await updateStoryMentionAnalysis(mentionId, {
    status: "analyzing",
    savedImageUrl,
    savedImageKey,
  });

  const analysis = await analyzeStoryImage(imageUrl);

  // Step 4: Save results
  await updateStoryMentionAnalysis(mentionId, {
    status: "completed",
    overallScore: analysis.overallScore,
    analysisJson: analysis.fullAnalysis,
    quickSummary: analysis.quickSummary,
    quickTip: analysis.quickTip,
    itemsDetected: analysis.itemsDetected,
  });

  // Step 5: Send DM response
  if (userId) {
    const igConn = await getIgConnection(userId);
    if (igConn?.accessToken) {
      try {
        await sendAnalysisDM(igUserId, igConn.accessToken, analysis);
        await updateStoryMentionAnalysis(mentionId, { status: "dm_sent", dmSent: 1 });
      } catch (err) {
        console.warn(`[Instagram] Failed to send DM to ${igUserId}:`, err);
      }
    }
  }

  console.log(`[Instagram] Story mention ${mentionId} processed: score ${analysis.overallScore}`);
}

async function processStoryMentionFromMediaId(
  mentionId: number,
  igUserId: string,
  mediaId: string,
  userId: number | null
) {
  // Try to fetch media URL from Graph API using the page token
  // For now, mark as received and wait for the messaging webhook with the actual URL
  await updateStoryMentionAnalysis(mentionId, {
    status: "fetching",
  });

  // If we have a user connection with an access token, try to fetch the media
  if (userId) {
    const igConn = await getIgConnection(userId);
    if (igConn?.accessToken) {
      try {
        const mediaResponse = await fetch(
          `${IG_GRAPH_API}/${mediaId}?fields=media_url,media_type&access_token=${igConn.accessToken}`
        );
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          if (mediaData.media_url) {
            await processStoryMention(mentionId, igUserId, mediaData.media_url, userId);
            return;
          }
        }
      } catch (err) {
        console.warn(`[Instagram] Failed to fetch media ${mediaId}:`, err);
      }
    }
  }

  // If we can't fetch the media, mark as failed
  await updateStoryMentionAnalysis(mentionId, {
    status: "failed",
    errorMessage: "Could not fetch story media — user may need to reconnect Instagram",
  });
}

// ==========================================
// AI Analysis
// ==========================================

interface StoryAnalysisResult {
  overallScore: number;
  quickSummary: string;
  quickTip: string;
  itemsDetected: number;
  fullAnalysis: any;
}

async function analyzeStoryImage(imageUrl: string): Promise<StoryAnalysisResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are TotalLook.ai — a professional fashion analyst. Analyze this outfit photo from an Instagram story.
Return a JSON object with:
- overallScore: number 5-10 (be encouraging but honest)
- quickSummary: string (1 sentence, what works in this look — in Hebrew)
- quickTip: string (1 actionable tip to upgrade the look — in Hebrew)
- itemsDetected: number (how many fashion items you can identify)
- items: array of { type, color, brand (if identifiable), verdict }
- strengths: array of strings (what's good about this look — in Hebrew)
- improvements: array of { item, suggestion, estimatedScoreBoost } (in Hebrew)

Be concise — this is for a quick DM response. Keep Hebrew text short and punchy.
Score generously (minimum 5) but give honest improvement tips.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this outfit from my Instagram story:" },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "story_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            overallScore: { type: "number" },
            quickSummary: { type: "string" },
            quickTip: { type: "string" },
            itemsDetected: { type: "number" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  color: { type: "string" },
                  brand: { type: "string" },
                  verdict: { type: "string" },
                },
                required: ["type", "color", "brand", "verdict"],
                additionalProperties: false,
              },
            },
            strengths: { type: "array", items: { type: "string" } },
            improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  suggestion: { type: "string" },
                  estimatedScoreBoost: { type: "number" },
                },
                required: ["item", "suggestion", "estimatedScoreBoost"],
                additionalProperties: false,
              },
            },
          },
          required: ["overallScore", "quickSummary", "quickTip", "itemsDetected", "items", "strengths", "improvements"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  const parsed = JSON.parse(content || "{}");

  return {
    overallScore: Math.max(5, Math.min(10, Math.round(parsed.overallScore || 6))),
    quickSummary: parsed.quickSummary || "לוק יפה!",
    quickTip: parsed.quickTip || "נסי להוסיף אקססורי שישלים את הלוק",
    itemsDetected: parsed.itemsDetected || 0,
    fullAnalysis: parsed,
  };
}

// ==========================================
// Instagram DM Sender
// ==========================================

async function sendAnalysisDM(
  recipientIgUserId: string,
  accessToken: string,
  analysis: StoryAnalysisResult
) {
  const scoreEmoji = analysis.overallScore >= 8 ? "🔥" : analysis.overallScore >= 7 ? "✨" : "💫";
  const appUrl = process.env.VITE_APP_URL || "https://totallook.ai";

  const message = [
    `${scoreEmoji} הלוק שלך היום: ${analysis.overallScore}/10`,
    ``,
    `👗 ${analysis.quickSummary}`,
    `💡 טיפ: ${analysis.quickTip}`,
    `📦 זיהינו ${analysis.itemsDetected} פריטים — נוספו לארון שלך`,
    ``,
    `📊 לניתוח המלא: ${appUrl}/style-diary`,
  ].join("\n");

  const response = await fetch(`${IG_GRAPH_API}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientIgUserId },
      message: { text: message },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DM send failed: ${response.status} — ${errorBody}`);
  }

  console.log(`[Instagram] DM sent to ${recipientIgUserId}`);
}

// ==========================================
// Exported helpers for tRPC procedures
// ==========================================

export { analyzeStoryImage, sendAnalysisDM };
