/**
 * WhatsApp Fashion Analysis Integration (via Meta WhatsApp Cloud API)
 *
 * Two flows:
 *
 * A. REGISTERED USER (phone linked in profile):
 *    1. User sends a photo → we detect them by phone number
 *    2. Create a normal `reviews` row tied to their userId
 *    3. Run the FULL analysis (same as web upload)
 *    4. Reply with quick summary + deep link to /review/:id
 *
 * B. GUEST (unrecognized phone):
 *    1. User sends a photo → no matching profile
 *    2. Create a `guestSessions` row with whatsappToken + whatsappPhone
 *    3. Run the FULL guest analysis (same as web guest upload)
 *    4. Reply with quick summary + deep link to /r/:token (public, no login needed)
 *
 * Both flows use the same comprehensive analysis as the website.
 */

import type { Request, Response, Express } from "express";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { nanoid } from "nanoid";
import {
  findUserByPhoneNumber,
  createReview,
  getReviewById,
  updateReviewAnalysis,
  updateReviewStatus,
  getUserProfile,
  getWardrobeByUserId,
  addWardrobeItems,
  createGuestSession,
  getGuestSessionById,
  updateGuestSessionAnalysis,
  updateGuestSessionStatus,
  getGuestProfile,
  getGuestSessionIdsByFingerprint,
  getGuestWardrobe,
  addGuestWardrobeItems,
  getWhatsAppGuestsForFollowUp,
  markFollowUpSent,
  hasGuestSessionBeenViewed,
  setReviewShareToken,
} from "./db";
import type { FashionAnalysis, OutfitSuggestion, Improvement, ShoppingLink } from "../shared/fashionTypes";
import { BRAND_URLS, POPULAR_INFLUENCERS } from "../shared/fashionTypes";
import { buildFashionPrompt, analysisJsonSchema, fixShoppingLinkUrls, type GenderCategory, type ProfileContext, type WardrobeContext } from "./routers";
import { enrichAnalysisWithProductImages } from "./productImages";
import { generateImage } from "./_core/imageGeneration";
import { normalizePhone } from "../shared/phone";

// ==========================================
// Constants & Config (Meta WhatsApp Cloud API)
// ==========================================

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "totallook_verify_2026";
const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const SITE_URL = process.env.VITE_APP_URL || "https://totallook.ai";

// Owner phone — exempt from guest limits
const OWNER_PHONE = "+972525556111";

// Rate limiting: max analyses per phone per day
const DAILY_LIMIT = 10;

// Guest lifetime limit: max analyses for unregistered WhatsApp users
const GUEST_LIFETIME_LIMIT = 2;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const QUICK_GUEST_FOLLOW_UP_DELAY_MS = 2 * 60 * 1000; // 2 minutes
const NETWORK_RETRY_ATTEMPTS = 3;
const NETWORK_RETRY_BASE_DELAY_MS = 750;

// Processing lock: only one image at a time per phone number
// Tracks which phones currently have an analysis in progress
// Value: timestamp when lock was acquired (for stale lock cleanup) + whether rejection msg was sent
const processingLock = new Map<string, { lockedAt: number; rejectionSent: boolean }>();
const LOCK_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes — auto-release stale locks

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRetryableNetworkErrorMessage(message: string): boolean {
  return (
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("fetch failed") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("EAI_AGAIN") ||
    message.includes("ENOTFOUND")
  );
}

function isInvalidImageErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    message.includes("INVALID_IMAGE_INPUT") ||
    lower.includes("unsupported image") ||
    lower.includes("could not be decoded") ||
    lower.includes("jpeg datastream contains no image")
  );
}

function isMediaFetchErrorMessage(message: string): boolean {
  return (
    message.includes("Failed to get media URL") ||
    message.includes("Failed to download media file") ||
    message.includes("Meta media URL fetch failed") ||
    message.includes("Meta media file download failed")
  );
}

function isDatabaseErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    message.includes("Database not available") ||
    lower.includes("failed query") ||
    lower.includes("insert into guestsessions") ||
    lower.includes("sql") ||
    lower.includes("er_") ||
    lower.includes("unknown column") ||
    lower.includes("incorrect string value") ||
    lower.includes("data too long for column") ||
    lower.includes("connect econnrefused") ||
    lower.includes("connection lost")
  );
}

function isStorageErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("s3") ||
    lower.includes("r2") ||
    lower.includes("storage") ||
    lower.includes("accessdenied") ||
    lower.includes("nosuchbucket")
  );
}

async function fetchWithRetry(url: string, init: RequestInit, label: string): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= NETWORK_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      const detail = await response.text().catch(() => "");
      const statusMsg = `${response.status}${detail ? ` — ${detail}` : ""}`;
      const retryable = response.status === 429 || response.status >= 500;

      if (!retryable || attempt === NETWORK_RETRY_ATTEMPTS) {
        throw new Error(`${label} failed: ${statusMsg}`);
      }

      console.warn(
        `[WhatsApp] ${label} retry ${attempt}/${NETWORK_RETRY_ATTEMPTS} after status ${response.status}`
      );
    } catch (err: any) {
      const message = String(err?.message || err || "");
      const retryable = isRetryableNetworkErrorMessage(message);

      if (!retryable || attempt === NETWORK_RETRY_ATTEMPTS) {
        lastError = err instanceof Error ? err : new Error(message);
        break;
      }

      console.warn(
        `[WhatsApp] ${label} network retry ${attempt}/${NETWORK_RETRY_ATTEMPTS}: ${message}`
      );
    }

    const backoffMs = NETWORK_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
    await sleep(backoffMs);
  }

  throw lastError || new Error(`${label} failed after retries`);
}

async function normalizeWhatsAppImageForAnalysis(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer)
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch (err: any) {
    throw new Error(`INVALID_IMAGE_INPUT: ${err?.message || "Image could not be decoded"}`);
  }
}

/**
 * Check if a phone number belongs to the owner (exempt from guest limits).
 * Normalizes both numbers before comparison.
 */
function isOwnerPhone(phone: string): boolean {
  return normalizePhone(phone) === normalizePhone(OWNER_PHONE);
}

/**
 * Get gender-specific Hebrew text based on user profile gender.
 * male → masculine form, female → feminine form, non-binary/unknown → combined form
 */
type GenderText = { youAre: string; youCan: string; send: string; register: string; enjoy: string; receive: string; try_: string; link: string; user: string; happy: string; analyzing: string };

function getGenderText(gender?: string | null): GenderText {
  if (gender === "male") {
    return {
      youAre: "אתה",
      youCan: "אתה יכול",
      send: "שלח",
      register: "הירשם",
      enjoy: "נהנית",
      receive: "תקבל",
      try_: "נסה",
      link: "קשר",
      user: "משתמש רשום",
      happy: "שמח",
      analyzing: "מנתח",
    };
  } else if (gender === "female") {
    return {
      youAre: "את",
      youCan: "את יכולה",
      send: "שלחי",
      register: "הירשמי",
      enjoy: "נהנית",
      receive: "תקבלי",
      try_: "נסי",
      link: "קשרי",
      user: "משתמשת רשומה",
      happy: "שמחה",
      analyzing: "מנתחת",
    };
  }
  // non-binary or unknown — use combined form
  return {
    youAre: "את/ה",
    youCan: "את/ה יכול/ה",
    send: "שלח/י",
    register: "הירשם/י",
    enjoy: "נהנית",
    receive: "תקבל/י",
    try_: "נסה/י",
    link: "קשר/י",
    user: "משתמש/ת רשום/ה",
    happy: "שמח/ה",
    analyzing: "מנתח/ת",
  };
}

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(phone);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= DAILY_LIMIT) return false;
  entry.count++;
  return true;
}

// ==========================================
// Webhook Registration (Meta WhatsApp Cloud API)
// ==========================================

export function registerWhatsAppWebhook(app: Express) {
  // Meta webhook verification (GET request)
  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      console.log("[WhatsApp] Webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      console.warn("[WhatsApp] Webhook verification failed — invalid token");
      res.sendStatus(403);
    }
  });

  // Meta sends POST with JSON body for incoming messages
  app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
    // Always respond 200 quickly to Meta (they retry on timeout)
    res.sendStatus(200);

    try {
      const body = req.body;
      if (body.object !== "whatsapp_business_account") return;

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;
          const value = change.value;
          if (!value?.messages?.length) continue;

          for (const message of value.messages) {
            const contact = value.contacts?.find((c: any) => c.wa_id === message.from);
            const profileName = contact?.profile?.name || "משתמש/ת";
            await handleIncomingMessage(message, profileName);
          }
        }
      }
    } catch (error) {
      console.error("[WhatsApp] Webhook processing error:", error);
    }
  });

  console.log("[WhatsApp] Webhook endpoint registered at /api/whatsapp/webhook (Meta Cloud API)");

  // Start the 24h follow-up scheduler
  startFollowUpScheduler();
}

// ==========================================
// Message Handler (Meta format)
// ==========================================

interface MetaWhatsAppMessage {
  from: string;           // Phone number without + prefix, e.g. "972521234567"
  id: string;             // Message ID, e.g. "wamid.xxx"
  timestamp: string;      // Unix timestamp
  type: string;           // "text", "image", "audio", etc.
  text?: { body: string };
  image?: {
    id: string;           // Media ID — use to download
    mime_type: string;
    sha256: string;
    caption?: string;
  };
}

async function handleIncomingMessage(message: MetaWhatsAppMessage, profileName: string) {
  const from = message.from; // e.g. "972521234567"
  const hasImage = message.type === "image" && message.image?.id;
  const messageText = message.text?.body || message.image?.caption || "";

  // Record incoming message to track 24h conversation window
  recordIncomingMessage(from);

  console.log(`[WhatsApp] Message from ${from} (${profileName}): type=${message.type}, text: "${messageText}"`);

  // Look up user gender for personalized messaging
  const matchedUserForGender = await findUserByPhoneNumber(`+${from}`);
  const userGender = matchedUserForGender?.profile?.gender || null;
  const g = getGenderText(userGender);

  // No image attached — send instructions
  if (!hasImage) {
    await sendWhatsAppMessage(
      from,
      `היי ${profileName}! 👋\n\n` +
      `אני TotalLook — הסטייליסט הדיגיטלי שלך ✨\n\n` +
      `📸 ${g.send} לי תמונה של הלוק שלך — תוך דקה ${g.receive}:\n` +
      `• ציון כללי ולכל פריט\n` +
      `• זיהוי מותגים וצבעים\n` +
      `• טיפ לשדרוג + לינקים לקנייה\n\n` +
      `⚡ זה ניתוח כללי וחינמי.\n` +
      `💎 רוצה ניתוח מותאם *בדיוק* אליך?\n` +
      `${g.register} פעם אחת (30 שניות) ו${g.receive}:\n` +
      `✓ התאמה לסגנון, תקציב ומיקום שלך\n` +
      `✓ ארון בגדים חכם שזוכר את הכל\n` +
      `✓ ניתוחים ללא הגבלה\n\n` +
      `👉 ${SITE_URL}`,
      { name: "totallook_welcome", params: [profileName] },
    );
    return;
  }

  // Rate limit check
  if (!checkRateLimit(from)) {
    await sendWhatsAppMessage(
      from,
      `⏳ הגעת למגבלת הניתוחים היומית (${DAILY_LIMIT} ביום).\n\n` +
      `💎 לניתוחים ללא הגבלה — ${g.register} באתר: ${SITE_URL}`
    );
    return;
  }

  // ===== PROCESSING LOCK: only one image at a time =====
  const existingLock = processingLock.get(from);
  if (existingLock) {
    const lockAge = Date.now() - existingLock.lockedAt;
    if (lockAge < LOCK_TIMEOUT_MS) {
      // Lock is still active — reject this image
      if (!existingLock.rejectionSent) {
        existingLock.rejectionSent = true;
        await sendWhatsAppMessage(
          from,
          `⏳ כבר ${g.analyzing} את התמונה הקודמת שלך!\n\n📸 ${g.send} תמונה *אחת בלבד* וחכה לתוצאות לפני שליחת תמונה חדשה.`
        );
      }
      console.log(`[WhatsApp] Rejected image from ${from} — analysis already in progress (lock age: ${Math.round(lockAge / 1000)}s)`);
      return;
    } else {
      // Stale lock — release it
      console.log(`[WhatsApp] Releasing stale lock for ${from} (age: ${Math.round(lockAge / 1000)}s)`);
      processingLock.delete(from);
    }
  }

  // Acquire lock
  processingLock.set(from, { lockedAt: Date.now(), rejectionSent: false });
  console.log(`[WhatsApp] Lock acquired for ${from}`);

  // Send "analyzing" message
  await sendWhatsAppMessage(
    from,
    `📸 קיבלתי את התמונה! ${g.analyzing} את הלוק שלך... ⏳\nזה ייקח כ-30 שניות.`,
    { name: "totallook_processing" },
  );

  try {
    // Step 1: Download image from Meta (via Graph API)
    const rawImageBuffer = await downloadMetaMedia(message.image!.id);
    const imageBuffer = await normalizeWhatsAppImageForAnalysis(rawImageBuffer);

    // Step 2: Upload to S3
    const phoneClean = from.replace(/[^0-9]/g, "");
    const s3Key = `whatsapp/${phoneClean}/${Date.now()}.jpg`;
    let s3Url = "";
    for (let attempt = 1; attempt <= NETWORK_RETRY_ATTEMPTS; attempt++) {
      try {
        const uploadRes = await storagePut(s3Key, imageBuffer, "image/jpeg");
        s3Url = uploadRes.url || "";
        if (!s3Url) throw new Error("Missing S3 URL after upload");
        break;
      } catch (uploadErr: any) {
        const msg = String(uploadErr?.message || "");
        const retryable = isRetryableNetworkErrorMessage(msg);
        if (!retryable || attempt === NETWORK_RETRY_ATTEMPTS) {
          throw uploadErr;
        }
        const backoffMs = NETWORK_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[WhatsApp] storage upload retry ${attempt}/${NETWORK_RETRY_ATTEMPTS}: ${msg}`);
        await sleep(backoffMs);
      }
    }

    // Step 3: Use already-fetched user match (or re-fetch if needed)
    // We already looked up the user for gender above
    const matchedUser = matchedUserForGender;

    if (matchedUser && matchedUser.user) {
      // ============ REGISTERED USER FLOW ============
      console.log(`[WhatsApp] Registered user detected: userId=${matchedUser.user.id} (${matchedUser.user.name})`);
      await handleRegisteredUserAnalysis(from, profileName, s3Url, s3Key, matchedUser);
    } else {
      // ============ GUEST FLOW ============
      // Check guest lifetime limit (owner is exempt)
      const isOwner = isOwnerPhone(from);
      if (!isOwner) {
        const fingerprint = `wa_${phoneClean}`;
        const existingSessions = await getGuestSessionIdsByFingerprint(fingerprint);
        if (existingSessions.length >= GUEST_LIFETIME_LIMIT) {
          console.log(`[WhatsApp] Guest ${from} reached lifetime limit (${existingSessions.length}/${GUEST_LIFETIME_LIMIT})`);
          await sendWhatsAppMessage(
            from,
            `✨ ${profileName}, ניצלת את ${GUEST_LIFETIME_LIMIT} הניתוחים החינמיים שלך!\n\n` +
            `💎 *לניתוחים ללא הגבלה + התאמה אישית:*\n` +
            `${g.register} באתר ו${g.link} את מספר הטלפון:\n` +
            `👉 ${SITE_URL}\n\n` +
            `🎯 כ${g.user} ${g.receive}:\n` +
            `• ניתוחים ללא הגבלה\n` +
            `• התאמה אישית לסגנון שלך\n` +
            `• ארון בגדים וירטואלי\n` +
            `• המלצות מותאמות לתקציב`,
            { name: "totallook_guest_limit", params: [String(GUEST_LIFETIME_LIMIT), SITE_URL] },
          );
          return;
        }
      }

      console.log(`[WhatsApp] Guest user: ${from} (${profileName})${isOwner ? " [OWNER - no limit]" : ""}`);
      await handleGuestAnalysis(from, profileName, s3Url, s3Key, phoneClean);
    }
  } catch (error: any) {
    const msg = String(error?.message || "");
    console.error(`[WhatsApp] Analysis failed for ${from}:`, msg);

    const isInvalidImage = isInvalidImageErrorMessage(msg);
    const isMediaFetchError = isMediaFetchErrorMessage(msg);
    const isDatabaseError = isDatabaseErrorMessage(msg);
    const isStorageError = isStorageErrorMessage(msg);

    if (isInvalidImage) {
      await sendWhatsAppMessage(
        from,
        `😕 התמונה שהועלתה לא נתמכת לניתוח.\n\n` +
        `📸 ${g.send} צילום ברור בפורמט JPG/PNG (עדיף תמונה מלאה של הלוק) ונסה/י שוב.`,
        { name: "totallook_error" },
      );
    } else if (isMediaFetchError) {
      await sendWhatsAppMessage(
        from,
        `⏳ יש כרגע תקלה זמנית בקבלת התמונה מ-WhatsApp.\n` +
        `${g.try_} לשלוח שוב בעוד דקה.`,
        { name: "totallook_error" },
      );
    } else if (isDatabaseError || isStorageError) {
      await sendWhatsAppMessage(
        from,
        `⏳ יש עומס זמני במערכת הניתוח כרגע.\n` +
        `${g.try_} שוב בעוד דקה.`,
        { name: "totallook_error" },
      );
    } else {
      await sendWhatsAppMessage(
        from,
        `😔 הייתה תקלה זמנית בתהליך הניתוח.\n` +
        `${g.try_} שוב בעוד רגע.`,
        { name: "totallook_error" },
      );
    }

    notifyOwner({
      title: `⚠️ WhatsApp analysis failure (${from})`,
      content:
        `source=handleIncomingMessage\n` +
        `phone=${from}\n` +
        `invalidImage=${isInvalidImage}\n` +
        `mediaFetch=${isMediaFetchError}\n` +
        `database=${isDatabaseError}\n` +
        `storage=${isStorageError}\n` +
        `error=${msg.slice(0, 1500)}`,
    }).catch(() => {});
  } finally {
    // Always release the processing lock when done (success or failure)
    processingLock.delete(from);
    console.log(`[WhatsApp] Lock released for ${from}`);
  }
}

// ==========================================
// Registered User Analysis (Full)
// ==========================================

async function handleRegisteredUserAnalysis(
  from: string,
  profileName: string,
  imageUrl: string,
  imageKey: string,
  matchedUser: { profile: any; user: any },
) {
  const userId = matchedUser.user.id;
  const profile = matchedUser.profile;

  // Create a normal review record
  const reviewId = await createReview({
    userId,
    imageUrl,
    imageKey,
    status: "pending",
    influencers: profile.favoriteInfluencers || null,
    styleNotes: profile.stylePreference || null,
    occasion: null,
  });

  await updateReviewStatus(reviewId, "analyzing");

  try {
    // Build profile context
    const profileContext: ProfileContext | null = profile ? {
      ageRange: profile.ageRange ?? undefined,
      gender: profile.gender ?? undefined,
      occupation: profile.occupation ?? undefined,
      budgetLevel: profile.budgetLevel ?? undefined,
      stylePreference: profile.stylePreference ?? undefined,
      favoriteInfluencers: profile.favoriteInfluencers ?? undefined,
      preferredStores: profile.preferredStores ?? undefined,
      country: profile.country ?? undefined,
    } : null;

    // Build wardrobe context
    let wardrobeCtx: WardrobeContext[] | undefined;
    const allWardrobeItems = await getWardrobeByUserId(userId);
    if (profile.saveToWardrobe && allWardrobeItems.length > 0) {
      wardrobeCtx = allWardrobeItems.slice(0, 30).map(item => ({
        itemType: item.itemType,
        name: item.name,
        color: item.color,
        brand: item.brand,
        styleNote: item.styleNote || null,
      }));
    }

    const prompt = buildFashionPrompt(
      profile.favoriteInfluencers ?? undefined,
      profile.stylePreference ?? undefined,
      undefined, // occasion
      profileContext,
      wardrobeCtx,
      "he", // WhatsApp default: Hebrew
    );

    // Run LLM analysis with retries
    const llmResult = await runAnalysisWithRetries(prompt, imageUrl);
    if (!llmResult) throw new Error("Analysis failed after retries");

    const content = llmResult.choices[0]?.message?.content;
    const analysisText = typeof content === "string" ? content : "";
    let analysis: FashionAnalysis = JSON.parse(analysisText);

    // Post-process: brand enrichment, score clamping, etc.
    analysis = postProcessAnalysis(analysis, profileContext);

    // ====== SEND WHATSAPP RESPONSE IMMEDIATELY (before slow image generation) ======
    // Save analysis first (without pre-generated images) so the deep link works
    await updateReviewAnalysis(reviewId, analysis.overallScore, analysis);

    // Auto-save wardrobe items (fast DB operation)
    try {
      if (profile.saveToWardrobe && analysis.items?.length > 0) {
        const wardrobeEntries = analysis.items.map((item) => ({
          userId,
          itemType: item.icon || "clothing",
          name: item.name,
          color: item.color || null,
          brand: item.brand || null,
          material: null,
          styleNote: item.description || null,
          score: item.score,
          sourceImageUrl: imageUrl,
          sourceReviewId: reviewId,
          verdict: item.verdict || null,
        }));
        await addWardrobeItems(wardrobeEntries);
      }
    } catch (e: any) {
      console.warn("[WhatsApp] Failed to save wardrobe items:", e?.message);
    }

    // Generate a public share token so the deep link works without login
    const shareToken = nanoid(16);
    await setReviewShareToken(reviewId, shareToken);

    // Format and send WhatsApp response IMMEDIATELY — don't wait for image generation
    const deepLink = `${SITE_URL}/r/${shareToken}`;
    const responseMessage = formatFullAnalysisResponse(analysis, profileName, deepLink, true);
    const scoreTruncated = String(analysis.overallScore);
    const summaryTruncated = (analysis.summary || "").substring(0, 100);
    await sendWhatsAppMessage(from, responseMessage,
      { name: "totallook_analysis_ready", params: [scoreTruncated, summaryTruncated, deepLink] },
    );

    console.log(`[WhatsApp] Registered analysis sent to ${from}: reviewId=${reviewId}, score=${analysis.overallScore}`);

    // Notify admin
    notifyOwner({
      title: `📱 ניתוח WhatsApp — משתמש רשום (${matchedUser.user.name})`,
      content: `ציון: ${analysis.overallScore}/10\nמשתמש: ${matchedUser.user.name}\nטלפון: ${from}\nReview ID: ${reviewId}`,
    }).catch(() => {});

    // ====== BACKGROUND: Generate product images & outfit looks (non-blocking) ======
    // These run AFTER the user already got their WhatsApp response.
    // Images will be ready when they click the deep link.
    (async () => {
      try {
        console.log(`[WhatsApp] Background: pre-generating product images for review ${reviewId}...`);
        const enrichedAnalysis = await enrichAnalysisWithProductImages(analysis, async (impIdx, linkIdx, imgUrl) => {
          try {
            const currentReview = await getReviewById(reviewId);
            if (currentReview?.analysisJson) {
              const currentAnalysis = currentReview.analysisJson as FashionAnalysis;
              if (currentAnalysis.improvements?.[impIdx]?.shoppingLinks?.[linkIdx]) {
                currentAnalysis.improvements[impIdx].shoppingLinks[linkIdx].imageUrl = imgUrl;
                await updateReviewAnalysis(reviewId, currentAnalysis.overallScore, currentAnalysis);
              }
            }
          } catch (e: any) {
            console.warn(`[WhatsApp] Background: progressive image save failed:`, e?.message);
          }
        });
        console.log(`[WhatsApp] Background: product images done for review ${reviewId}`);

        // Pre-generate outfit look images
        if (enrichedAnalysis.outfitSuggestions?.length > 0) {
          console.log(`[WhatsApp] Background: generating ${enrichedAnalysis.outfitSuggestions.length} outfit look images...`);
          for (let i = 0; i < enrichedAnalysis.outfitSuggestions.length; i++) {
            const outfit = enrichedAnalysis.outfitSuggestions[i];
            const outfitAny = outfit as any;
            if (!outfitAny._lookImage) {
              try {
                const lookDesc = outfit.lookDescription || outfit.items.join(", ");
                const colors = outfit.colors?.join(", ") || "neutral tones";
                const outfitPrompt = `Professional fashion flat lay / mood board photograph. Clean white marble background, luxury editorial style photography.\n\nComplete outfit: ${lookDesc}.\nColor palette: ${colors}.\n\nStyle: High-end fashion editorial flat lay, all items arranged aesthetically like a magazine spread. Include every piece: clothing, shoes, accessories, watch/jewelry. No mannequin, no model — just the items laid out beautifully with crisp lighting, soft shadows, and a luxury feel. Each item clearly visible and identifiable.`;
                const { url: lookUrl } = await generateImage({ prompt: outfitPrompt });
                if (lookUrl) {
                  outfitAny._lookImage = lookUrl;
                  console.log(`[WhatsApp] Background: ✓ Outfit look ${i + 1} generated`);
                }
              } catch (e: any) {
                console.warn(`[WhatsApp] Background: outfit look ${i + 1} failed:`, e?.message);
              }
            }
          }
        }

        // Final save with all images
        await updateReviewAnalysis(reviewId, enrichedAnalysis.overallScore, enrichedAnalysis);
        console.log(`[WhatsApp] Background: all images saved for review ${reviewId}`);
      } catch (bgErr: any) {
        console.warn(`[WhatsApp] Background image generation failed (non-fatal):`, bgErr?.message);
      }
    })().catch(err => console.warn(`[WhatsApp] Background task error:`, err?.message));

  } catch (error: any) {
    console.error(`[WhatsApp] Registered user analysis failed:`, error);
    await updateReviewStatus(reviewId, "failed");
    await sendWhatsAppMessage(
      from,
      `😔 הניתוח נכשל. נסה/י שוב בעוד רגע.\n\n💡 או נסה/י דרך האתר: ${SITE_URL}/upload`,
      { name: "totallook_error" },
    );
  }
}

// ==========================================
// Guest Analysis (Full, with deep-link token)
// ==========================================

async function handleGuestAnalysis(
  from: string,
  profileName: string,
  imageUrl: string,
  imageKey: string,
  phoneClean: string,
) {
  // Generate a unique token for the deep link
  const token = nanoid(16);

  // Use phone as fingerprint for guest sessions from WhatsApp
  const fingerprint = `wa_${phoneClean}`;

  const sessionId = await createGuestSession({
    fingerprint,
    ipAddress: null,
    imageUrl,
    imageKey,
    status: "pending",
    userAgent: "WhatsApp",
    source: "whatsapp",
    whatsappToken: token,
    whatsappPhone: phoneClean,
    whatsappProfileName: profileName,
  });

  await updateGuestSessionStatus(sessionId, "analyzing");

  try {
    // Get guest profile if they've used WhatsApp before
    const guestProfile = await getGuestProfile(fingerprint);
    const sessionIds = await getGuestSessionIdsByFingerprint(fingerprint);
    const wardrobeItemsList = sessionIds.length > 0 ? await getGuestWardrobe(sessionIds) : [];

    const wardrobeForPrompt = wardrobeItemsList.length > 0 ? wardrobeItemsList.map(w => ({
      itemType: w.itemType,
      name: w.name || "",
      color: w.color || "",
      brand: w.brand || "",
      styleNote: (w as any).styleNote || null,
    })) : undefined;

    const profileForPrompt = guestProfile ? {
      ageRange: guestProfile.ageRange || undefined,
      gender: guestProfile.gender || undefined,
      occupation: guestProfile.occupation || undefined,
      budgetLevel: guestProfile.budgetLevel || undefined,
      stylePreference: guestProfile.stylePreference || undefined,
    } : null;

    const prompt = buildFashionPrompt(
      guestProfile?.favoriteInfluencers || undefined,
      guestProfile?.stylePreference || undefined,
      undefined, // occasion
      profileForPrompt,
      wardrobeForPrompt,
      "he", // WhatsApp default: Hebrew
    );

    // Run LLM analysis with retries
    const llmResult = await runAnalysisWithRetries(prompt, imageUrl);
    if (!llmResult) throw new Error("Analysis failed after retries");

    const content = llmResult.choices[0]?.message?.content;
    const analysisText = typeof content === "string" ? content : "";
    let analysis: FashionAnalysis = JSON.parse(analysisText);

    // Post-process
    analysis = postProcessAnalysis(analysis, profileForPrompt);

    // ====== SEND WHATSAPP RESPONSE IMMEDIATELY (before slow image generation) ======
    // Save analysis first (without pre-generated images) so the deep link works
    await updateGuestSessionAnalysis(sessionId, analysis.overallScore, analysis);

    // Auto-save wardrobe items (fast DB operation)
    try {
      if (analysis.items?.length > 0) {
        const wardrobeEntries = analysis.items.map((item) => ({
          guestSessionId: sessionId,
          itemType: item.icon || "clothing",
          name: item.name,
          color: item.color || null,
          brand: item.brand || null,
          material: null,
          styleNote: item.description || null,
          score: item.score,
          sourceImageUrl: imageUrl,
          sourceReviewId: sessionId,
        }));
        await addGuestWardrobeItems(wardrobeEntries as any);
      }
    } catch (e: any) {
      console.warn("[WhatsApp] Failed to save guest wardrobe items:", e?.message);
    }

    // Format and send WhatsApp response IMMEDIATELY — don't wait for image generation
    const deepLink = `${SITE_URL}/r/${token}`;
    const allSessions = await getGuestSessionIdsByFingerprint(fingerprint);
    const guestAnalysisInfo = isOwnerPhone(from) ? undefined : {
      used: allSessions.length,
      limit: GUEST_LIFETIME_LIMIT,
    };
    const responseMessage = formatFullAnalysisResponse(analysis, profileName, deepLink, false, guestAnalysisInfo);
    const guestScoreTruncated = String(analysis.overallScore);
    const guestSummaryTruncated = (analysis.summary || "").substring(0, 100);
    await sendWhatsAppMessage(from, responseMessage,
      { name: "totallook_analysis_ready", params: [guestScoreTruncated, guestSummaryTruncated, deepLink] },
    );

    // 2-minute in-window follow-up (guest only), unless the analysis was already opened.
    if (!isOwnerPhone(from)) {
      scheduleQuickGuestFollowUp({
        phone: from,
        profileName,
        sessionId,
        overallScore: analysis.overallScore,
        deepLink,
      });
    }

    console.log(`[WhatsApp] Guest analysis sent to ${from}: sessionId=${sessionId}, token=${token}, score=${analysis.overallScore}`);

    // Notify admin
    notifyOwner({
      title: `📱 ניתוח WhatsApp — אורח (${profileName})`,
      content: `ציון: ${analysis.overallScore}/10\nאורח: ${profileName}\nטלפון: ${from}\nSession ID: ${sessionId}\nToken: ${token}`,
    }).catch(() => {});

    // ====== BACKGROUND: Generate product images & outfit looks (non-blocking) ======
    (async () => {
      try {
        console.log(`[WhatsApp] Background: pre-generating product images for guest session ${sessionId}...`);
        const enrichedAnalysis = await enrichAnalysisWithProductImages(analysis, async (impIdx, linkIdx, imgUrl) => {
          try {
            const currentSession = await getGuestSessionById(sessionId);
            if (currentSession?.analysisJson) {
              const currentAnalysis = currentSession.analysisJson as FashionAnalysis;
              if (currentAnalysis.improvements?.[impIdx]?.shoppingLinks?.[linkIdx]) {
                currentAnalysis.improvements[impIdx].shoppingLinks[linkIdx].imageUrl = imgUrl;
                await updateGuestSessionAnalysis(sessionId, currentAnalysis.overallScore, currentAnalysis);
              }
            }
          } catch (e: any) {
            console.warn(`[WhatsApp] Background: progressive guest image save failed:`, e?.message);
          }
        });
        console.log(`[WhatsApp] Background: product images done for guest session ${sessionId}`);

        // Pre-generate outfit look images
        if (enrichedAnalysis.outfitSuggestions?.length > 0) {
          console.log(`[WhatsApp] Background: generating ${enrichedAnalysis.outfitSuggestions.length} outfit look images...`);
          for (let i = 0; i < enrichedAnalysis.outfitSuggestions.length; i++) {
            const outfit = enrichedAnalysis.outfitSuggestions[i];
            const outfitAny = outfit as any;
            if (!outfitAny._lookImage) {
              try {
                const lookDesc = outfit.lookDescription || outfit.items.join(", ");
                const colors = outfit.colors?.join(", ") || "neutral tones";
                const outfitPrompt = `Professional fashion flat lay / mood board photograph. Clean white marble background, luxury editorial style photography.\n\nComplete outfit: ${lookDesc}.\nColor palette: ${colors}.\n\nStyle: High-end fashion editorial flat lay, all items arranged aesthetically like a magazine spread. Include every piece: clothing, shoes, accessories, watch/jewelry. No mannequin, no model — just the items laid out beautifully with crisp lighting, soft shadows, and a luxury feel. Each item clearly visible and identifiable.`;
                const { url: lookUrl } = await generateImage({ prompt: outfitPrompt });
                if (lookUrl) {
                  outfitAny._lookImage = lookUrl;
                  console.log(`[WhatsApp] Background: ✓ Guest outfit look ${i + 1} generated`);
                }
              } catch (e: any) {
                console.warn(`[WhatsApp] Background: guest outfit look ${i + 1} failed:`, e?.message);
              }
            }
          }
        }

        // Final save with all images
        await updateGuestSessionAnalysis(sessionId, enrichedAnalysis.overallScore, enrichedAnalysis);
        console.log(`[WhatsApp] Background: all images saved for guest session ${sessionId}`);
      } catch (bgErr: any) {
        console.warn(`[WhatsApp] Background guest image generation failed (non-fatal):`, bgErr?.message);
      }
    })().catch(err => console.warn(`[WhatsApp] Background guest task error:`, err?.message));

  } catch (error: any) {
    console.error(`[WhatsApp] Guest analysis failed:`, error);
    await updateGuestSessionStatus(sessionId, "failed");
    await sendWhatsAppMessage(
      from,
      `😔 הניתוח נכשל. נסה/י שוב בעוד רגע.\n\n💡 או נסה/י דרך האתר: ${SITE_URL}/try`,
      { name: "totallook_error" },
    );
  }
}

// ==========================================
// Shared Analysis Helpers
// ==========================================

async function runAnalysisWithRetries(prompt: string, imageUrl: string): Promise<any> {
  const MAX_RETRIES = 3;
  let llmResult: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = 2000 * Math.pow(2, attempt - 1);
        console.log(`[WhatsApp Analysis] Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      llmResult = await invokeLLM({
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "נתח את הלוק בתמונה הזו ותן חוות דעת אופנתית מקיפה בעברית. התבסס על טרנדים עדכניים של 2025-2026. שים לב במיוחד לאקססוריז. זהה מותגים רק כשאתה בטוח. חשוב: כל לינקי הקניות חייבים להיות כתובות חיפוש.",
              },
              { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "fashion_analysis",
            strict: true,
            schema: analysisJsonSchema,
          },
        },
        maxTokens: 4500,
      });
      break; // Success
    } catch (retryErr: any) {
      const msg = retryErr?.message || "";
      const statusCode = retryErr?.status || retryErr?.statusCode || 0;
      const isRetryable =
        msg.includes("exhausted") || msg.includes("412") ||
        msg.includes("quota") || msg.includes("rate limit") || msg.includes("rate_limit") ||
        msg.includes("429") || msg.includes("503") || msg.includes("500") ||
        msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") ||
        msg.includes("ECONNREFUSED") || msg.includes("fetch failed") ||
        statusCode === 429 || statusCode === 503 || statusCode === 500 || statusCode === 502;
      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        throw retryErr;
      }
      console.warn(`[WhatsApp Analysis] Attempt ${attempt + 1} failed (retryable): ${msg}`);
    }
  }

  return llmResult;
}

/**
 * Post-process the analysis: brand enrichment, score clamping, weighted scoring, material cleanup.
 */
function postProcessAnalysis(analysis: FashionAnalysis, profileContext: ProfileContext | null): FashionAnalysis {
  // Enrich with brand URLs
  if (!analysis.linkedMentions) analysis.linkedMentions = [];
  for (const item of analysis.items) {
    if (item.brand || item.name) {
      const brandName = item.brand || "";
      for (const [brand, url] of Object.entries(BRAND_URLS)) {
        if (item.name.includes(brand) || brandName.includes(brand)) {
          item.brand = brand;
          item.brandUrl = url;
          if (!analysis.linkedMentions.find(m => m.text === brand)) {
            analysis.linkedMentions.push({ text: brand, type: "brand", url });
          }
        }
      }
    }
  }

  // Clamp scores (minimum 5)
  for (const item of analysis.items) {
    if (item.score < 5) item.score = 5;
  }
  for (const cat of analysis.scores) {
    if (cat.score !== null && cat.score < 5) cat.score = 5;
  }

  // Premium/Luxury: Brand identification score >= 8
  const isPremium = profileContext?.budgetLevel === "premium" || profileContext?.budgetLevel === "luxury";
  if (isPremium) {
    for (const cat of analysis.scores) {
      const catLower = cat.category.toLowerCase();
      if ((catLower.includes("מותג") || catLower.includes("brand")) && cat.score !== null && cat.score < 8) {
        cat.score = 8;
      }
    }
  }

  // Weighted overall score
  const categoryWeights: Record<string, number> = {
    "איכות הפריטים": 1.0, "item quality": 1.0,
    "התאמת גזרה": 1.0, "fit": 1.0,
    "צבעוניות": 1.0, "color palette": 1.0,
    "התאמה לגיל ולסגנון": 1.0, "age & style match": 1.0,
    "נעליים": 0.8, "footwear": 0.8,
    "זיהוי מותגים": 0.8, "brand recognition": 0.8,
    "שכבתיות (layering)": 0.5, "שכבתיות": 0.5, "layering": 0.5,
    "אקססוריז ותכשיטים": 0.5, "accessories & jewelry": 0.5,
  };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const cat of analysis.scores) {
    if (cat.score !== null) {
      const catLower = cat.category.toLowerCase();
      const weight = categoryWeights[catLower] ?? 1.0;
      weightedSum += cat.score * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight > 0) {
    analysis.overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;
  }
  if (analysis.overallScore < 5) analysis.overallScore = 5;

  // Material cleanup
  const cheapMaterialTerms = [
    { pattern: /דמוי עור/g, replacement: isPremium ? "עור יוקרתי" : "עור סינתטי איכותי" },
    { pattern: /עור סינתטי(?! איכותי)/g, replacement: isPremium ? "עור יוקרתי" : "עור סינתטי איכותי" },
    { pattern: /דמוי זמש/g, replacement: isPremium ? "זמש איכותי" : "זמש סינתטי איכותי" },
    { pattern: /זמש סינתטי(?! איכותי)/g, replacement: isPremium ? "זמש איכותי" : "זמש סינתטי איכותי" },
    { pattern: /דמוי משי/g, replacement: isPremium ? "סאטן יוקרתי" : "סאטן" },
    { pattern: /פלסטיק/g, replacement: isPremium ? "אקריליק" : "שרף" },
    { pattern: /faux leather/gi, replacement: isPremium ? "premium leather" : "quality synthetic leather" },
    { pattern: /synthetic leather/gi, replacement: isPremium ? "premium leather" : "quality synthetic leather" },
    { pattern: /faux suede/gi, replacement: isPremium ? "premium suede" : "quality synthetic suede" },
    { pattern: /synthetic suede/gi, replacement: isPremium ? "premium suede" : "quality synthetic suede" },
    { pattern: /faux silk/gi, replacement: isPremium ? "premium satin" : "satin" },
    { pattern: /\bplastic\b/gi, replacement: isPremium ? "acrylic" : "resin" },
  ];
  for (const item of analysis.items) {
    for (const term of cheapMaterialTerms) {
      if (item.description) item.description = item.description.replace(term.pattern, term.replacement);
      if (item.analysis) item.analysis = item.analysis.replace(term.pattern, term.replacement);
      if (item.name) item.name = item.name.replace(term.pattern, term.replacement);
    }
  }
  for (const term of cheapMaterialTerms) {
    if (analysis.summary) analysis.summary = analysis.summary.replace(term.pattern, term.replacement);
  }

  // Ensure scores have explanation field
  for (const cat of analysis.scores) {
    if (!cat.explanation) cat.explanation = "";
  }

  // Fix shopping URLs
  const gender: GenderCategory = (profileContext?.gender as GenderCategory) || "male";
  analysis = fixShoppingLinkUrls(analysis, gender);

  return analysis;
}

// ==========================================
// Response Formatting (Full Analysis)
// ==========================================

function getScoreEmoji(score: number): string {
  if (score >= 9) return "🔥";
  if (score >= 8) return "✨";
  if (score >= 7) return "💫";
  return "👍";
}

function formatFullAnalysisResponse(
  analysis: FashionAnalysis,
  profileName: string,
  deepLink: string,
  isRegistered: boolean,
  guestAnalysisInfo?: { used: number; limit: number },
): string {
  const scoreEmoji = getScoreEmoji(analysis.overallScore);

  const lines: string[] = [];

  // Header
  lines.push(`${scoreEmoji} *${profileName}, הלוק שלך: ${analysis.overallScore}/10*`);
  lines.push("");

  // Summary — truncate to 200 chars max
  if (analysis.summary) {
    const summary = analysis.summary.length > 200 ? analysis.summary.substring(0, 197) + "..." : analysis.summary;
    lines.push(`👗 ${summary}`);
    lines.push("");
  }

  // Top items (max 3)
  const topItems = (analysis.items || []).slice(0, 3);
  if (topItems.length > 0) {
    lines.push("👔 *פריטים:*");
    for (const item of topItems) {
      const scoreIcon = item.score >= 8 ? "🟢" : item.score >= 6 ? "🟡" : "🟠";
      lines.push(`${scoreIcon} ${item.name} — ${item.score}/10`);
    }
    lines.push("");
  }

  // Category scores (top 3)
  const topScores = (analysis.scores || []).filter(s => s.score !== null).slice(0, 3);
  if (topScores.length > 0) {
    lines.push("📊 *ציונים:*");
    for (const cat of topScores) {
      lines.push(`${cat.category}: ${cat.score}/10`);
    }
    lines.push("");
  }

  // Top improvement (max 1 to save space, with truncated description)
  const topImprovements = (analysis.improvements || []).slice(0, 1);
  if (topImprovements.length > 0) {
    lines.push("💡 *טיפ לשדרוג:*");
    for (const imp of topImprovements) {
      const desc = imp.description.length > 100 ? imp.description.substring(0, 97) + "..." : imp.description;
      lines.push(`• ${imp.title}: ${desc}`);
    }
    lines.push("");
  }

  // CTA with deep link
  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push("📊 *לניתוח המלא + המלצות מוצרים + לוקים:*");
  lines.push(`👉 ${deepLink}`);

  if (!isRegistered) {
    const remaining = guestAnalysisInfo
      ? Math.max(0, guestAnalysisInfo.limit - guestAnalysisInfo.used)
      : null;

    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("📋 *זה היה ניתוח כללי.*");
    lines.push("");
    lines.push("💎 *עם פרופיל אישי, הניתוח שלך ישתדרג:*");
    lines.push("• המלצות מותאמות לסגנון שלך (קלאסי? סטריט? מינימליסטי?)");
    lines.push("• חנויות לפי התקציב והמיקום שלך");
    lines.push("• זיכרון של הארון שלך — המלצות על בסיס מה שכבר יש לך");
    lines.push("• ניתוחים ללא הגבלה");
    lines.push("");
    lines.push("✨ *הירשם/י פעם אחת (30 שניות):*");
    lines.push(`👉 ${SITE_URL}`);

    if (remaining !== null) {
      lines.push("");
      lines.push(`🎫 נותרו ${remaining} ניתוחים חינמיים כאורח/ת`);
    }
  }

  return lines.join("\n");
}

async function sendQuickGuestFollowUpMessage(
  phone: string,
  profileName: string,
  overallScore: number,
  deepLink: string,
): Promise<void> {
  const name = profileName || "חבר/ה";
  const scoreEmoji = getScoreEmoji(overallScore);
  const message =
    `💡 ${name}, ראית את הניתוח?\n\n` +
    `הלוק שלך קיבל ${overallScore}/10 — ${scoreEmoji}\n\n` +
    `📊 הניתוח המלא עם המלצות מוצרים ולוקים מחכה לך:\n` +
    `👉 ${deepLink}\n\n` +
    `✨ רוצה שהניתוח הבא יהיה מותאם *בדיוק* אליך?\n` +
    `👉 ${SITE_URL}`;

  await sendWhatsAppText(phone, message);
}

function scheduleQuickGuestFollowUp(params: {
  phone: string;
  profileName: string;
  sessionId: number;
  overallScore: number;
  deepLink: string;
}): void {
  const { phone, profileName, sessionId, overallScore, deepLink } = params;

  const timer = setTimeout(() => {
    (async () => {
      const viewed = await hasGuestSessionBeenViewed(sessionId);
      if (viewed) {
        console.log(`[WhatsApp] Quick follow-up skipped for session ${sessionId} (already viewed)`);
        return;
      }

      await sendQuickGuestFollowUpMessage(phone, profileName, overallScore, deepLink);
      console.log(`[WhatsApp] Quick follow-up sent for guest session ${sessionId}`);
    })().catch((err: any) => {
      console.warn(`[WhatsApp] Quick follow-up failed for session ${sessionId}:`, err?.message);
    });
  }, QUICK_GUEST_FOLLOW_UP_DELAY_MS);

  // Avoid keeping the Node process alive only because of this timer.
  if (typeof (timer as any)?.unref === "function") {
    (timer as any).unref();
  }
}

// ==========================================
// Image Download (Meta Graph API)
// ==========================================

/**
 * Download media from Meta WhatsApp Cloud API.
 * Step 1: GET /media_id to get the download URL
 * Step 2: GET the download URL with Bearer token to get the actual file
 */
async function downloadMetaMedia(mediaId: string): Promise<Buffer> {
  if (!WHATSAPP_TOKEN) {
    throw new Error("Missing WHATSAPP_TOKEN — cannot download media");
  }

  // Step 1: Get the media URL
  const metaResponse = await fetchWithRetry(
    `${GRAPH_API_BASE}/${mediaId}`,
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } },
    "Meta media URL fetch"
  );

  const mediaInfo = await metaResponse.json() as { url: string };

  // Step 2: Download the actual file
  const fileResponse = await fetchWithRetry(
    mediaInfo.url,
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } },
    "Meta media file download"
  );

  return Buffer.from(await fileResponse.arrayBuffer());
}

// ==========================================
// Conversation Window Tracking
// ==========================================
// WhatsApp Business API requires template messages for business-initiated conversations.
// Free-form text is only allowed within 24h of the user's last incoming message.
// We track when each phone last messaged us to decide which method to use.

const conversationWindows = new Map<string, number>(); // phone -> timestamp of last incoming message
const CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Record that a user sent us a message (opens/extends the 24h conversation window).
 */
function recordIncomingMessage(phone: string): void {
  const phoneClean = phone.replace(/[^0-9]/g, "");
  conversationWindows.set(phoneClean, Date.now());
}

/**
 * Check if we're within the 24h conversation window for a phone number.
 */
function isInConversationWindow(phone: string): boolean {
  const phoneClean = phone.replace(/[^0-9]/g, "");
  const lastMessage = conversationWindows.get(phoneClean);
  if (!lastMessage) return false;
  return (Date.now() - lastMessage) < CONVERSATION_WINDOW_MS;
}

// ==========================================
// Meta WhatsApp Cloud API Message Sender
// ==========================================

/**
 * Send a template message via Meta WhatsApp Cloud API.
 * Templates are pre-approved by Meta and work outside the 24h conversation window.
 */
async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = "he",
  parameters: string[] = [],
): Promise<boolean> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error("[WhatsApp] Missing Meta credentials — cannot send template");
    return false;
  }

  const toClean = to.replace(/[^0-9]/g, "");

  const payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toClean,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  // Add parameters if provided
  if (parameters.length > 0) {
    payload.template.components = [
      {
        type: "body",
        parameters: parameters.map(value => ({ type: "text", text: value })),
      },
    ];
  }

  try {
    const response = await fetch(`${GRAPH_API_BASE}/${WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Meta API error ${response.status}: ${errorData}`);
    }

    console.log(`[WhatsApp] Template '${templateName}' sent to ${toClean}`);
    return true;
  } catch (error: any) {
    console.error(`[WhatsApp] Failed to send template '${templateName}' to ${toClean}:`, error.message);
    return false;
  }
}

/**
 * Send a free-form text message via Meta WhatsApp Cloud API.
 * Only works within the 24h conversation window (after user messages us first).
 */
async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error("[WhatsApp] Missing Meta credentials — cannot send message");
    return false;
  }

  const toClean = to.replace(/[^0-9]/g, "");

  try {
    const response = await fetch(`${GRAPH_API_BASE}/${WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toClean,
        type: "text",
        text: { body },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Meta API error ${response.status}: ${errorData}`);
    }

    console.log(`[WhatsApp] Text message sent to ${toClean} (${body.length} chars)`);
    return true;
  } catch (error: any) {
    console.error(`[WhatsApp] Failed to send text to ${toClean}:`, error.message);
    return false;
  }
}

/**
 * Smart message sender: uses free-form text within 24h conversation window,
 * falls back to template message outside the window.
 * 
 * @param to - Phone number
 * @param body - Free-form text message (used within conversation window)
 * @param templateFallback - Template to use outside conversation window
 */
async function sendWhatsAppMessage(
  to: string,
  body: string,
  templateFallback?: { name: string; lang?: string; params?: string[] },
): Promise<boolean> {
  const toClean = to.replace(/[^0-9]/g, "");

  if (isInConversationWindow(toClean)) {
    // Within 24h window — send free-form text
    return await sendWhatsAppText(to, body);
  } else if (templateFallback) {
    // Outside window — use template
    console.log(`[WhatsApp] Outside conversation window for ${toClean}, using template '${templateFallback.name}'`);
    return await sendWhatsAppTemplate(
      to,
      templateFallback.name,
      templateFallback.lang || "he",
      templateFallback.params || []
    );
  } else {
    // Outside window, no template fallback — try text anyway (will work if user initiated recently via Meta's own tracking)
    console.log(`[WhatsApp] Outside conversation window for ${toClean}, attempting text (no template fallback)`);
    return await sendWhatsAppText(to, body);
  }
}

// ==========================================
// Follow-up System (24h after guest analysis)
// ==========================================

// Interval: check every hour for guests needing follow-up
const FOLLOW_UP_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
let followUpTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Send a follow-up message to a WhatsApp guest who hasn't registered.
 */
async function sendFollowUpMessage(phone: string, profileName: string, gender?: string | null): Promise<void> {
  const name = profileName || "חבר/ה";
  const g = getGenderText(gender);
  const message =
    `✨ היי, ${name}! ${g.enjoy} מהניתוח האופנתי שלך?\n\n` +
    `👗 *רוצה לנסות לוק חדש?*\n` +
    `${g.send} תמונה חדשה ו${g.receive} ניתוח מקיף!\n\n` +
    `💎 *או עדיף יותר — ${g.register} באתר:*\n` +
    `👉 ${SITE_URL}\n\n` +
    `כ${g.user} ${g.receive}:\n` +
    `✅ ניתוחים ללא הגבלה\n` +
    `✅ התאמה אישית לסגנון שלך\n` +
    `✅ ארון בגדים וירטואלי\n` +
    `✅ המלצות קניה מותאמות`;

  // Phone stored as digits (e.g. "972521234567") — sendWhatsAppMessage handles cleanup
  // Follow-ups are sent 24h after analysis, so always outside conversation window — use template
  await sendWhatsAppMessage(phone, message,
    { name: "totallook_followup", params: [name, SITE_URL] },
  );
}

/**
 * Check for WhatsApp guests who need a 24h follow-up and send messages.
 */
async function processFollowUps(): Promise<number> {
  try {
    const guests = await getWhatsAppGuestsForFollowUp();
    if (guests.length === 0) return 0;

    console.log(`[WhatsApp Follow-up] Found ${guests.length} guests eligible for follow-up`);

    let sent = 0;
    for (const guest of guests) {
      try {
        await sendFollowUpMessage(guest.whatsappPhone, guest.whatsappProfileName || "");
        await markFollowUpSent(guest.whatsappPhone);
        sent++;
        console.log(`[WhatsApp Follow-up] Sent to ${guest.whatsappPhone} (${guest.whatsappProfileName})`);
      } catch (err: any) {
        console.error(`[WhatsApp Follow-up] Failed for ${guest.whatsappPhone}:`, err?.message);
      }
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[WhatsApp Follow-up] Completed: ${sent}/${guests.length} messages sent`);
    return sent;
  } catch (err: any) {
    console.error(`[WhatsApp Follow-up] Error in processFollowUps:`, err?.message);
    return 0;
  }
}

/**
 * Start the follow-up scheduler. Called once when the server starts.
 */
function startFollowUpScheduler(): void {
  if (followUpTimer) return; // Already running

  // Run once on startup (after a short delay)
  setTimeout(() => {
    processFollowUps().catch(() => {});
  }, 30_000); // 30 seconds after server start

  // Then check every hour
  followUpTimer = setInterval(() => {
    processFollowUps().catch(() => {});
  }, FOLLOW_UP_CHECK_INTERVAL);

  console.log("[WhatsApp Follow-up] Scheduler started (checking every 1 hour)");
}

/**
 * Stop the follow-up scheduler.
 */
function stopFollowUpScheduler(): void {
  if (followUpTimer) {
    clearInterval(followUpTimer);
    followUpTimer = null;
    console.log("[WhatsApp Follow-up] Scheduler stopped");
  }
}

// ==========================================
// Proactive Welcome Message (sent when user saves phone)
// ==========================================

/**
 * Send a welcome message to a user who just saved their phone number.
 * Works for both registered users and guests.
 */
async function sendWhatsAppWelcome(
  phone: string,
  name: string,
  isRegistered: boolean,
  gender?: string | null,
): Promise<{ sent: boolean; error?: string }> {
  console.log(`[WhatsApp Welcome] Called with phone='${phone}', name='${name}', isRegistered=${isRegistered}, gender=${gender}`);
  console.log(`[WhatsApp Welcome] WHATSAPP_TOKEN present: ${!!WHATSAPP_TOKEN} (len=${WHATSAPP_TOKEN.length}), WHATSAPP_PHONE_ID present: ${!!WHATSAPP_PHONE_ID} (val=${WHATSAPP_PHONE_ID})`);

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log("[WhatsApp Welcome] Missing Meta credentials — skipping welcome message");
    return { sent: false, error: "missing_credentials" };
  }

  // Normalize phone to just digits for Meta API
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (!cleanPhone) {
    console.log(`[WhatsApp Welcome] Invalid phone after cleanup: '${phone}' -> '${cleanPhone}'`);
    return { sent: false, error: "invalid_phone" };
  }
  console.log(`[WhatsApp Welcome] Cleaned phone: ${cleanPhone}`);

  const greeting = name ? `היי ${name}!` : "היי!";
  const g = getGenderText(gender);

  const message = isRegistered
    ? `${greeting} \u{1F44B}\n\n` +
      `זה TotalLook.ai \u2014 הסטייליסט הדיגיטלי שלך \u2728\n\n` +
      `המספר שלך חובר בהצלחה! מעכשיו ${g.youCan} לשלוח לי תמונה של הלוק שלך ולקבל ניתוח אופנתי מלא תוך 30 שניות \u{1F4F8}\n\n` +
      `מה ${g.receive}:\n` +
      `\u2B50 ציון לכל פריט\n` +
      `\u{1F6CD}\uFE0F המלצות שדרוג עם לינקים לקנייה\n` +
      `\u{1F457} לוקים חלופיים מותאמים לסגנון שלך\n` +
      `\u{1F45A} ארון בגדים וירטואלי שנבנה אוטומטית\n\n` +
      `\u{1F4F7} *${g.send} תמונה עכשיו לניסוי ראשון!*`
    : `${greeting} \u{1F44B}\n\n` +
      `זה TotalLook.ai \u2014 הסטייליסט הדיגיטלי שלך \u2728\n\n` +
      `${g.happy} שהשארת את המספר! עכשיו ${g.youCan} לשלוח לי תמונה של הלוק שלך ולקבל ניתוח אופנתי חינמי \u{1F4F8}\n\n` +
      `\u{1F4F7} *${g.send} תמונה לניסוי ראשון!*\n\n` +
      `\u{1F48E} לניתוחים ללא הגבלה + התאמה אישית \u2014 ${g.register} באתר:\n` +
      `\u{1F449} ${SITE_URL}`;

  try {
    // Welcome messages are proactive (user hasn't messaged us on WhatsApp yet) — always use template
    console.log(`[WhatsApp Welcome] Sending template 'totallook_welcome' to ${cleanPhone} with params: [${name || "חבר/ה"}]`);
    const sent = await sendWhatsAppMessage(cleanPhone, message,
      { name: "totallook_welcome", params: [name || "חבר/ה"] },
    );
    if (!sent) {
      console.warn(`[WhatsApp Welcome] Meta API send failed for ${cleanPhone}`);
      return { sent: false, error: "send_failed" };
    }
    console.log(`[WhatsApp Welcome] ✅ Successfully sent to ${cleanPhone} (${isRegistered ? "registered" : "guest"})`);
    return { sent: true };
  } catch (error: any) {
    console.error(`[WhatsApp Welcome] ❌ Failed to send to ${cleanPhone}: ${error.message}`, error);
    return { sent: false, error: error.message };
  }
}

// ==========================================
// Exported for testing
// ==========================================

export {
  handleIncomingMessage,
  formatFullAnalysisResponse,
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  sendWhatsAppText,
  recordIncomingMessage,
  isInConversationWindow,
  downloadMetaMedia,
  checkRateLimit,
  isOwnerPhone,
  getGenderText,
  postProcessAnalysis,
  runAnalysisWithRetries,
  handleRegisteredUserAnalysis,
  handleGuestAnalysis,
  GUEST_LIFETIME_LIMIT,
  processingLock,
  LOCK_TIMEOUT_MS,
  processFollowUps,
  sendFollowUpMessage,
  startFollowUpScheduler,
  stopFollowUpScheduler,
  sendWhatsAppWelcome,
  conversationWindows,
};
