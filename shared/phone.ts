/**
 * Phone number normalization utility.
 * Used by both server (WhatsApp webhook, DB queries) and client (PhoneInput).
 * Ensures all phone numbers are stored and compared in a consistent E.164 format.
 */

/**
 * Normalize a phone number to a canonical E.164-like format for storage and comparison.
 * Strips "whatsapp:" prefix, spaces, dashes, parentheses, and leading zeros after country code.
 * Always returns a string starting with "+" followed by digits only.
 *
 * Examples:
 *   "whatsapp:+972521234567" → "+972521234567"
 *   "+972 52-123-4567"       → "+972521234567"
 *   "972521234567"           → "+972521234567"
 *   "+972 052 123 4567"      → "+972521234567"  (strips leading 0 after country code)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Strip "whatsapp:" prefix
  let cleaned = phone.replace(/^whatsapp:/i, "");
  // Strip all non-digit and non-plus characters
  cleaned = cleaned.replace(/[^\d+]/g, "");
  // Ensure starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}
