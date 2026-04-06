import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User fashion profile — filled during onboarding questionnaire.
 * Stores style preferences, demographics, and influencer preferences.
 */
export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** Age range: 18-24, 25-34, 35-44, 45-54, 55+ */
  ageRange: varchar("ageRange", { length: 16 }),
  /** Gender presentation for fashion: male, female, non-binary */
  gender: varchar("gender", { length: 32 }),
  /** Professional role: student, creative, corporate, entrepreneur, tech, other */
  occupation: varchar("occupation", { length: 64 }),
  /** Budget level: budget, mid-range, premium, luxury */
  budgetLevel: varchar("budgetLevel", { length: 32 }),
  /** Preferred styles: comma-separated list (e.g. "minimalist, streetwear") */
  stylePreference: text("stylePreference"),
  /** Comma-separated list of favorite brands */
  favoriteBrands: text("favoriteBrands"),
  /** Comma-separated list of chosen influencers */
  favoriteInfluencers: text("favoriteInfluencers"),
  /** Phone number for WhatsApp identification (e.g. "+972525556111") */
  phoneNumber: varchar("phoneNumber", { length: 32 }),
  /** Instagram username (optional) */
  instagramHandle: varchar("instagramHandle", { length: 128 }),
  /** JSON array of influencers discovered from Instagram */
  instagramInfluencers: json("instagramInfluencers"),
  /** Comma-separated list of preferred shopping stores/websites */
  preferredStores: text("preferredStores"),
  /** Whether user wants to save items to virtual wardrobe */
  saveToWardrobe: int("saveToWardrobe").default(1).notNull(),
  /** Unique token for sharing wardrobe publicly */
  wardrobeShareToken: varchar("wardrobeShareToken", { length: 64 }),
  /** Detected country code (ISO 3166-1 alpha-2, e.g. "IL", "DE", "US") */
  country: varchar("country", { length: 8 }),
  /** Whether onboarding is completed */
  onboardingCompleted: int("onboardingCompleted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Virtual wardrobe — items detected from user's fashion analyses.
 * Each item is extracted from AI analysis and saved for future recommendations.
 */
export const wardrobeItems = mysqlTable("wardrobeItems", {
  id: int("id").autoincrement().primaryKey(),
  /** User ID (null for guest wardrobe items) */
  userId: int("userId"),
  /** Guest session ID (for guest wardrobe support, null for registered users) */
  guestSessionId: int("guestSessionId"),
  /** Item type: shirt, pants, shoes, jacket, accessory, bag, etc. */
  itemType: varchar("itemType", { length: 64 }).notNull(),
  /** Item name/description */
  name: text("name").notNull(),
  /** Primary color */
  color: varchar("color", { length: 64 }),
  /** Brand if identified */
  brand: varchar("brand", { length: 128 }),
  /** Material if identified */
  material: varchar("material", { length: 128 }),
  /** Style note — rich description of the item's style, formality, and subtype (e.g. 'smart watch, sporty, digital display' or 'classic analog watch, leather strap, elegant') */
  styleNote: varchar("styleNote", { length: 512 }),
  /** AI-generated score for this item (5-10) */
  score: int("score"),
  /** URL to the uploaded image where this item was detected */
  sourceImageUrl: text("sourceImageUrl"),
  /** Review ID where this item was first detected */
  sourceReviewId: int("sourceReviewId"),
  /** AI verdict about this item */
  verdict: varchar("verdict", { length: 128 }),
  /** AI-generated image of this specific item */
  itemImageUrl: text("itemImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = typeof wardrobeItems.$inferInsert;

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  imageKey: varchar("imageKey", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["pending", "analyzing", "completed", "failed"]).default("pending").notNull(),
  influencers: text("influencers"),
  styleNotes: text("styleNotes"),
  /** Occasion context: work, casual, evening, date, formal, sport, travel */
  occasion: varchar("occasion", { length: 64 }),
  overallScore: int("overallScore"),
  analysisJson: json("analysisJson"),
  /** Optional second image URL for multi-angle analysis (camera users only) */
  secondImageUrl: text("secondImageUrl"),
  secondImageKey: varchar("secondImageKey", { length: 512 }),
  /** Public share token for WhatsApp deep links (allows viewing without login) */
  shareToken: varchar("shareToken", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Style Feed — public posts shared by users.
 * Each post references a review and can be liked/saved by other users.
 */
export const feedPosts = mysqlTable("feedPosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reviewId: int("reviewId").notNull(),
  /** Optional caption added by the user */
  caption: text("caption"),
  /** User's display name at time of posting */
  userName: varchar("userName", { length: 256 }),
  /** User's gender for feed filtering */
  gender: varchar("gender", { length: 32 }),
  /** Style tags from user profile (comma-separated) */
  styleTags: text("styleTags"),
  /** Occasion context from the review: work, casual, evening, date, formal, sport, travel */
  occasion: varchar("occasion", { length: 64 }),
  /** The image URL from the review */
  imageUrl: text("imageUrl").notNull(),
  /** Overall AI score from the review */
  overallScore: int("overallScore"),
  /** Key phrase / summary from the AI analysis */
  summary: text("summary"),
  /** Denormalized like count for fast sorting */
  likesCount: int("likesCount").default(0).notNull(),
  /** Denormalized save count */
  savesCount: int("savesCount").default(0).notNull(),
  /** Whether the post is active (soft delete) */
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FeedPost = typeof feedPosts.$inferSelect;
export type InsertFeedPost = typeof feedPosts.$inferInsert;

/**
 * Likes on feed posts.
 */
export const likes = mysqlTable("likes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Like = typeof likes.$inferSelect;
export type InsertLike = typeof likes.$inferInsert;

/**
 * Saved/bookmarked feed posts.
 */
export const saves = mysqlTable("saves", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Save = typeof saves.$inferSelect;
export type InsertSave = typeof saves.$inferInsert;

/**
 * User follows — track who follows whom for the Style Feed.
 */
export const follows = mysqlTable("follows", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(),
  followedId: int("followedId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = typeof follows.$inferInsert;

/**
 * In-app notifications for users (e.g. "User X posted a new look").
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  /** The user who receives the notification */
  userId: int("userId").notNull(),
  /** Notification type: new_post, like, follow */
  type: varchar("type", { length: 32 }).notNull(),
  /** The user who triggered the notification */
  actorId: int("actorId").notNull(),
  /** Actor display name at time of notification */
  actorName: varchar("actorName", { length: 256 }),
  /** Related feed post ID (if applicable) */
  postId: int("postId"),
  /** Whether the notification has been read */
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Comments on feed posts — supports one level of nesting (replies).
 */
export const feedComments = mysqlTable("feedComments", {
  id: int("id").autoincrement().primaryKey(),
  feedPostId: int("feedPostId").notNull(),
  userId: int("userId").notNull(),
  /** Comment text content */
  content: text("content").notNull(),
  /** Parent comment ID for replies (null = top-level comment) */
  parentId: int("parentId"),
  /** User display name at time of commenting */
  userName: varchar("userName", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FeedComment = typeof feedComments.$inferSelect;
export type InsertFeedComment = typeof feedComments.$inferInsert;

/**
 * Fix My Look results — saved AI-generated improved outfit images.
 * Allows users to view previous results without regenerating.
 */
export const fixMyLookResults = mysqlTable("fixMyLookResults", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  userId: int("userId").notNull(),
  /** URL of the AI-generated improved image */
  fixedImageUrl: text("fixedImageUrl").notNull(),
  /** Original score before fix */
  originalScore: int("originalScore").notNull(),
  /** Estimated score after fix */
  estimatedScore: int("estimatedScore").notNull(),
  /** JSON array of items that were fixed */
  itemsFixed: json("itemsFixed"),
  /** JSON array of shopping links for the fixed items */
  shoppingLinks: json("shoppingLinks"),
  /** JSON array of item indices that were selected */
  itemIndices: json("itemIndices"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FixMyLookResult = typeof fixMyLookResults.$inferSelect;
export type InsertFixMyLookResult = typeof fixMyLookResults.$inferInsert;

/**
 * Guest sessions — tracks anonymous users who try the free analysis.
 * Separate from the main users table. Stores image, analysis results,
 * and conversion tracking (did they sign up after?).
 */
export const guestSessions = mysqlTable("guestSessions", {
  id: int("id").autoincrement().primaryKey(),
  /** Browser fingerprint (hash) to enforce analysis limit */
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  /** IP address for additional rate limiting */
  ipAddress: varchar("ipAddress", { length: 64 }),
  /** Uploaded image URL in S3 */
  imageUrl: text("imageUrl"),
  /** S3 key for the uploaded image */
  imageKey: varchar("imageKey", { length: 512 }),
  /** Analysis status */
  status: mysqlEnum("status", ["pending", "analyzing", "completed", "failed"]).default("pending").notNull(),
  /** Full analysis JSON result */
  analysisJson: json("analysisJson"),
  /** Overall fashion score */
  overallScore: int("overallScore"),
  /** User-agent string for analytics */
  userAgent: text("userAgent"),
  /** If this guest later signed up, link to their user ID */
  convertedUserId: int("convertedUserId"),
  /** Timestamp when they converted (signed up) */
  convertedAt: timestamp("convertedAt"),
  // ---- Profile fields (same as userProfiles, for full guest personalization) ----
  /** Age range: 18-24, 25-34, 35-44, 45-54, 55+ */
  ageRange: varchar("ageRange", { length: 16 }),
  /** Gender presentation: male, female, non-binary */
  gender: varchar("gender", { length: 32 }),
  /** Professional role */
  occupation: varchar("occupation", { length: 64 }),
  /** Budget level: budget, mid-range, premium, luxury */
  budgetLevel: varchar("budgetLevel", { length: 32 }),
  /** Preferred styles (comma-separated) */
  stylePreference: text("stylePreference"),
  /** Comma-separated list of favorite brands */
  favoriteBrands: text("favoriteBrands"),
  /** Comma-separated list of chosen influencers */
  favoriteInfluencers: text("favoriteInfluencers"),
  /** Comma-separated list of preferred stores */
  preferredStores: text("preferredStores"),
  /** Detected country code */
  country: varchar("country", { length: 8 }),
  /** Whether onboarding is completed */
  onboardingCompleted: int("onboardingCompleted").default(0).notNull(),
  /** Email for conversion (guest provides email for unlimited analyses) */
  email: varchar("email", { length: 320 }),
  /** Number of completed analyses (limit: 5) */
  analysisCount: int("analysisCount").default(0).notNull(),
  /** Source channel: 'web' | 'whatsapp' */
  source: varchar("source", { length: 32 }).default("web"),
  /** Unique token for WhatsApp deep link (e.g. /r/{token}) */
  whatsappToken: varchar("whatsappToken", { length: 64 }),
  /** WhatsApp phone number that sent the image */
  whatsappPhone: varchar("whatsappPhone", { length: 32 }),
  /** WhatsApp profile name */
  whatsappProfileName: varchar("whatsappProfileName", { length: 256 }),
  /** Timestamp when the guest opened the WhatsApp deep-link analysis page */
  lastViewedAt: timestamp("lastViewedAt"),
  /** Timestamp when follow-up message was sent (null = not sent yet) */
  followUpSentAt: timestamp("followUpSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GuestSession = typeof guestSessions.$inferSelect;
export type InsertGuestSession = typeof guestSessions.$inferInsert;

/**
 * Demo views — tracks how many people viewed the interactive demo.
 * Used for conversion analytics (demo views → signups).
 */
export const demoViews = mysqlTable("demoViews", {
  id: int("id").autoincrement().primaryKey(),
  /** Browser fingerprint */
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  /** IP address */
  ipAddress: varchar("ipAddress", { length: 64 }),
  /** Which section of the demo they viewed */
  section: varchar("section", { length: 64 }).default("full").notNull(),
  /** Did they click the signup CTA after viewing? */
  clickedSignup: int("clickedSignup").default(0).notNull(),
  /** User-agent for device analytics */
  userAgent: text("userAgent"),
  /** If they later signed up, link to user ID */
  convertedUserId: int("convertedUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DemoView = typeof demoViews.$inferSelect;
export type InsertDemoView = typeof demoViews.$inferInsert;

/**
 * Product image cache — stores AI-generated product images by product name.
 * Avoids regenerating images for the same product across different analyses.
 */
export const productImageCache = mysqlTable("productImageCache", {
  id: int("id").autoincrement().primaryKey(),
  /** Normalized product name used as cache key */
  productKey: varchar("productKey", { length: 512 }).notNull().unique(),
  /** Generated image URL in S3 */
  imageUrl: text("imageUrl").notNull(),
  /** Original product label from shopping link */
  originalLabel: text("originalLabel"),
  /** Category/search query context */
  categoryQuery: varchar("categoryQuery", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductImageCache = typeof productImageCache.$inferSelect;
export type InsertProductImageCache = typeof productImageCache.$inferInsert;

/**
 * Page views — tracks all landing page visits for funnel analytics.
 * Used to measure: landing visitors → guest/register → analysis conversion.
 */
export const pageViews = mysqlTable("pageViews", {
  id: int("id").autoincrement().primaryKey(),
  /** Browser fingerprint (hash) for unique visitor tracking */
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  /** Page path visited (e.g. "/", "/upload") */
  page: varchar("page", { length: 256 }).notNull(),
  /** HTTP referrer URL */
  referrer: text("referrer"),
  /** User-agent string for device analytics */
  userAgent: text("userAgent"),
  /** IP address */
  ipAddress: varchar("ipAddress", { length: 64 }),
  /** Screen width for device type detection */
  screenWidth: int("screenWidth"),
  /** Detected country code */
  country: varchar("country", { length: 8 }),
  /** Whether this visitor later signed up (updated async) */
  convertedUserId: int("convertedUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;

/**
 * Instagram connections — links a TotalLook user to their Instagram account.
 * Stores access token for Graph API calls (fetching story images, sending DMs).
 */
export const igConnections = mysqlTable("igConnections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** Instagram user ID (numeric string from Graph API) */
  igUserId: varchar("igUserId", { length: 64 }).notNull(),
  /** Instagram username (e.g. "fashionista_il") */
  igUsername: varchar("igUsername", { length: 128 }),
  /** Long-lived access token from Instagram Graph API */
  accessToken: text("accessToken").notNull(),
  /** Token expiry timestamp */
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  /** Whether the connection is active */
  isActive: int("isActive").default(1).notNull(),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IgConnection = typeof igConnections.$inferSelect;
export type InsertIgConnection = typeof igConnections.$inferInsert;

/**
 * Story mentions — each time a user tags @totallook.ai in their Instagram story.
 * Stores the story image, AI analysis result, and DM delivery status.
 */
export const storyMentions = mysqlTable("storyMentions", {
  id: int("id").autoincrement().primaryKey(),
  /** TotalLook user ID (null if not yet linked) */
  userId: int("userId"),
  /** Instagram user ID of the person who tagged us */
  igUserId: varchar("igUserId", { length: 64 }).notNull(),
  /** Instagram username */
  igUsername: varchar("igUsername", { length: 128 }),
  /** Instagram media ID of the story */
  igMediaId: varchar("igMediaId", { length: 128 }),
  /** URL of the story image (fetched from IG) */
  mediaUrl: text("mediaUrl"),
  /** S3 URL of the saved story image */
  savedImageUrl: text("savedImageUrl"),
  /** S3 key for the saved image */
  savedImageKey: varchar("savedImageKey", { length: 512 }),
  /** Analysis status */
  status: mysqlEnum("status", ["received", "fetching", "analyzing", "completed", "failed", "dm_sent"]).default("received").notNull(),
  /** Overall fashion score from AI analysis */
  overallScore: int("overallScore"),
  /** Full analysis JSON result (same structure as reviews) */
  analysisJson: json("analysisJson"),
  /** Quick summary for DM response */
  quickSummary: text("quickSummary"),
  /** Quick tip for DM response */
  quickTip: text("quickTip"),
  /** Number of items detected */
  itemsDetected: int("itemsDetected").default(0),
  /** Whether DM response was sent successfully */
  dmSent: int("dmSent").default(0).notNull(),
  /** Error message if processing failed */
  errorMessage: text("errorMessage"),
  /** The review ID if analysis was saved as a full review */
  linkedReviewId: int("linkedReviewId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StoryMention = typeof storyMentions.$inferSelect;
export type InsertStoryMention = typeof storyMentions.$inferInsert;

/**
 * Style diary entries — weekly/monthly summaries of a user's style evolution.
 * Generated automatically from accumulated story mentions and reviews.
 */
export const styleDiaryEntries = mysqlTable("styleDiaryEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Period type: "week" or "month" */
  periodType: varchar("periodType", { length: 16 }).notNull(),
  /** Period start date */
  periodStart: timestamp("periodStart").notNull(),
  /** Period end date */
  periodEnd: timestamp("periodEnd").notNull(),
  /** Number of looks analyzed in this period */
  lookCount: int("lookCount").default(0).notNull(),
  /** Average score across all looks */
  avgScore: int("avgScore"),
  /** Best score in the period */
  bestScore: int("bestScore"),
  /** Best look date */
  bestLookDate: timestamp("bestLookDate"),
  /** Best look image URL */
  bestLookImageUrl: text("bestLookImageUrl"),
  /** Most worn item types (JSON array) */
  topItemTypes: json("topItemTypes"),
  /** Most worn colors (JSON array) */
  topColors: json("topColors"),
  /** Style trend description (AI-generated) */
  styleTrend: text("styleTrend"),
  /** AI-generated style evolution insight */
  evolutionInsight: text("evolutionInsight"),
  /** Score trend: "improving", "stable", "declining" */
  scoreTrend: varchar("scoreTrend", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StyleDiaryEntry = typeof styleDiaryEntries.$inferSelect;
export type InsertStyleDiaryEntry = typeof styleDiaryEntries.$inferInsert;

/** Privacy consent tracking — GDPR/CCPA compliance */
export const privacyConsents = mysqlTable("privacy_consents", {
  id: int("id").autoincrement().primaryKey(),
  /** User ID (null for guests) */
  userId: int("userId"),
  /** Guest session ID (null for registered users) */
  guestSessionId: varchar("guestSessionId", { length: 128 }),
  /** Type of consent: terms, privacy, cookies, marketing, whatsapp */
  consentType: varchar("consentType", { length: 64 }).notNull(),
  /** Whether consent was granted */
  granted: int("granted").default(0).notNull(),
  /** IP address at time of consent (hashed for privacy) */
  ipHash: varchar("ipHash", { length: 64 }),
  /** User agent string */
  userAgent: text("userAgent"),
  /** Version of the document consented to */
  documentVersion: varchar("documentVersion", { length: 32 }).default("1.0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PrivacyConsent = typeof privacyConsents.$inferSelect;
export type InsertPrivacyConsent = typeof privacyConsents.$inferInsert;
