/**
 * Railway Notification Module
 * Replaces Manus notification service with console logging.
 * 
 * In the future, this can be extended to use:
 * - Email notifications (via nodemailer, already in dependencies)
 * - Telegram bot notifications
 * - WhatsApp notifications
 * - Slack webhooks
 */
import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a notification to the project owner.
 * On Railway, this logs to console. Can be extended to email/Telegram/etc.
 * Returns true on success, false on failure.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  // Log the notification
  console.log(`\n📢 [Owner Notification] ${title}`);
  console.log(`   ${content.replace(/\n/g, "\n   ")}\n`);

  // Optional: Send email notification if GMAIL_APP_PASSWORD is configured
  try {
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const ownerEmail = process.env.OWNER_EMAIL;
    
    if (gmailPassword && ownerEmail) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: "gmail",
        auth: {
          user: ownerEmail,
          pass: gmailPassword,
        },
      });

      await transporter.sendMail({
        from: ownerEmail,
        to: ownerEmail,
        subject: `TotalLook.ai: ${title}`,
        text: content,
      });

      console.log("[Notification] Email sent to owner");
    }
  } catch (err) {
    console.warn("[Notification] Email notification failed:", err);
    // Don't throw - notification failure should not break the app
  }

  return true;
}
