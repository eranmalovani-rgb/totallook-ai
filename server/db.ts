import { eq, ne, desc, and, inArray, sql, count, isNotNull, isNull, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, reviews, userProfiles, wardrobeItems, feedPosts, likes, saves, follows, notifications, feedComments, fixMyLookResults, pageViews, guestSessions, demoViews, igConnections, storyMentions, styleDiaryEntries, privacyConsents, catalogItems, type CatalogItem, type InsertReview, type InsertUserProfile, type InsertWardrobeItem, type InsertFeedPost, type InsertLike, type InsertSave, type InsertFollow, type InsertNotification, type InsertFeedComment, type InsertFixMyLookResult, type InsertPageView, type InsertGuestSession, type InsertDemoView, type InsertIgConnection, type InsertStoryMention, type InsertStyleDiaryEntry } from "../drizzle/schema";
import { ENV } from './_core/env';
import { normalizePhone } from '../shared/phone';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---- User Profile helpers ----

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertUserProfile(data: InsertUserProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Normalize phone number to E.164 before storing
  if (data.phoneNumber) {
    data = { ...data, phoneNumber: normalizePhone(data.phoneNumber) || null };
  }
  
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, data.userId)).limit(1);
  
  if (existing.length > 0) {
    const updateSet: Record<string, unknown> = {};
    const fields = [
      "ageRange", "gender", "occupation", "budgetLevel", "stylePreference",
      "favoriteBrands", "favoriteInfluencers", "phoneNumber", "instagramHandle",
      "instagramInfluencers", "preferredStores", "saveToWardrobe", "onboardingCompleted",
      "country"
    ] as const;
    for (const field of fields) {
      if (data[field] !== undefined) {
        updateSet[field] = data[field];
      }
    }
    if (Object.keys(updateSet).length > 0) {
      await db.update(userProfiles).set(updateSet).where(eq(userProfiles.userId, data.userId));
    }
    return existing[0].id;
  } else {
    const result = await db.insert(userProfiles).values(data);
    return result[0].insertId;
  }
}

// ---- Review helpers ----

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reviews).values(data);
  return result[0].insertId;
}

export async function getReviewById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getReviewByShareToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(reviews).where(eq(reviews.shareToken, token)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function setReviewShareToken(reviewId: number, token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviews).set({ shareToken: token }).where(eq(reviews.id, reviewId));
}

export async function getReviewsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(reviews).where(eq(reviews.userId, userId)).orderBy(desc(reviews.createdAt));
}

export async function updateReviewAnalysis(id: number, overallScore: number, analysisJson: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(reviews).set({
      status: "completed",
      overallScore,
      analysisJson,
    }).where(eq(reviews.id, id));
  } catch (error: any) {
    const fullMsg = `${error?.message || ""} ${error?.cause?.message || ""}`;
    if (fullMsg.includes("Incorrect string value")) {
      const sanitized = sanitizeJsonForMysql(analysisJson);
      await db.update(reviews).set({
        status: "completed",
        overallScore,
        analysisJson: sanitized,
      }).where(eq(reviews.id, id));
      return;
    }
    throw error;
  }
}

export async function updateReviewStatus(id: number, status: "pending" | "analyzing" | "completed" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviews).set({ status }).where(eq(reviews.id, id));
}

export async function deleteAllReviewsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reviews).where(eq(reviews.userId, userId));
}

/**
 * Permanently delete a user account and ALL associated data:
 * 1. All reviews
 * 2. User profile (onboarding data)
 * 3. User record itself
 */
export async function deleteUserAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 1. Get all feed posts by this user (needed to clean up likes/saves by others on these posts)
  const userPosts = await db.select({ id: feedPosts.id }).from(feedPosts).where(eq(feedPosts.userId, userId));
  const userPostIds = userPosts.map(p => p.id);

  // 2. Delete likes, saves & comments BY this user (on any post)
  await db.delete(likes).where(eq(likes.userId, userId));
  await db.delete(saves).where(eq(saves.userId, userId));
  await db.delete(feedComments).where(eq(feedComments.userId, userId));

  // 3. Delete likes, saves & comments ON this user's posts (by other users)
  if (userPostIds.length > 0) {
    await db.delete(likes).where(inArray(likes.postId, userPostIds));
    await db.delete(saves).where(inArray(saves.postId, userPostIds));
    await db.delete(feedComments).where(inArray(feedComments.feedPostId, userPostIds));
  }

  // 4. Delete notifications where user is recipient or actor
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(notifications).where(eq(notifications.actorId, userId));

  // 5. Delete follows (both directions)
  await db.delete(follows).where(eq(follows.followerId, userId));
  await db.delete(follows).where(eq(follows.followedId, userId));

  // 6. Delete feed posts
  await db.delete(feedPosts).where(eq(feedPosts.userId, userId));

  // 7. Delete Instagram connections and story mentions
  await db.delete(storyMentions).where(eq(storyMentions.userId, userId));
  await db.delete(igConnections).where(eq(igConnections.userId, userId));

  // 8. Delete style diary entries
  await db.delete(styleDiaryEntries).where(eq(styleDiaryEntries.userId, userId));

  // 9. Delete fix-my-look results
  await db.delete(fixMyLookResults).where(eq(fixMyLookResults.userId, userId));

  // 10. Delete privacy consents
  await db.delete(privacyConsents).where(eq(privacyConsents.userId, userId));

  // 11. Delete wardrobe items, reviews, profile, user
  await db.delete(wardrobeItems).where(eq(wardrobeItems.userId, userId));
  await db.delete(reviews).where(eq(reviews.userId, userId));
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

// ---- Wardrobe helpers ----

/**
 * Add wardrobe items with deduplication.
 * Checks existing items by (userId, itemType, name) and only inserts new ones.
 * If an existing item is found, updates its score/verdict if the new data is better.
 */
export async function addWardrobeItems(items: InsertWardrobeItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;

  const userId = items[0].userId!;
  // Fetch all existing wardrobe items for this user
  const existing = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, userId));

  // Build a set of existing item keys for fast lookup (normalize: lowercase + trim)
  const existingKeys = new Set(
    existing.map(e => `${e.itemType.toLowerCase().trim()}||${(typeof e.name === 'string' ? e.name : '').toLowerCase().trim()}`)
  );

  // Filter to only truly new items
  const newItems = items.filter(item => {
    const key = `${item.itemType.toLowerCase().trim()}||${(typeof item.name === 'string' ? item.name : '').toLowerCase().trim()}`;
    return !existingKeys.has(key);
  });

  if (newItems.length > 0) {
    await db.insert(wardrobeItems).values(newItems);
  }

  return { added: newItems.length, skipped: items.length - newItems.length };
}

export async function getWardrobeByUserId(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const query = db
    .select()
    .from(wardrobeItems)
    .where(eq(wardrobeItems.userId, userId))
    .orderBy(desc(wardrobeItems.createdAt));
  if (typeof limit === "number" && limit > 0) {
    return query.limit(limit);
  }
  return query;
}

export async function deleteWardrobeItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(wardrobeItems).where(eq(wardrobeItems.id, id));
}

export async function updateWardrobeItemImage(id: number, itemImageUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(wardrobeItems).set({ itemImageUrl }).where(eq(wardrobeItems.id, id));
}

export async function clearWardrobe(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(wardrobeItems).where(eq(wardrobeItems.userId, userId));
}

// ---- Feed helpers ----

export async function publishToFeed(data: InsertFeedPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if this review is already published
  const existing = await db.select().from(feedPosts)
    .where(and(eq(feedPosts.reviewId, data.reviewId), eq(feedPosts.userId, data.userId), eq(feedPosts.isActive, 1)))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(feedPosts).values(data);
  return result[0].insertId;
}

export async function getFeedPosts(options: {
  limit: number;
  offset: number;
  sort: "new" | "popular";
  style?: string;
  gender?: string;
  occasion?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(feedPosts.isActive, 1)];
  if (options.style) {
    conditions.push(sql`${feedPosts.styleTags} LIKE ${'%' + options.style + '%'}`);
  }
  if (options.gender) {
    conditions.push(eq(feedPosts.gender, options.gender));
  }
  if (options.occasion) {
    conditions.push(eq(feedPosts.occasion, options.occasion));
  }

  const orderBy = options.sort === "popular"
    ? desc(feedPosts.likesCount)
    : desc(feedPosts.createdAt);

  const postsRaw = await db.select().from(feedPosts)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(options.limit)
    .offset(options.offset);

  // Enrich with wardrobeShareToken from userProfiles
  const userIds = Array.from(new Set(postsRaw.map(p => p.userId)));
  let shareTokenMap = new Map<number, string | null>();
  if (userIds.length > 0) {
    const profiles = await db.select({ userId: userProfiles.userId, wardrobeShareToken: userProfiles.wardrobeShareToken })
      .from(userProfiles)
      .where(inArray(userProfiles.userId, userIds));
    for (const p of profiles) {
      shareTokenMap.set(p.userId, p.wardrobeShareToken);
    }
  }

  const posts = postsRaw.map(p => ({
    ...p,
    wardrobeShareToken: shareTokenMap.get(p.userId) || null,
  }));

  // Get total count for pagination
  const totalResult = await db.select({ total: count() }).from(feedPosts)
    .where(and(...conditions));
  const total = totalResult[0]?.total ?? 0;

  return { posts, total };
}

export async function getOccasionCounts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({
    occasion: feedPosts.occasion,
    cnt: count(),
  }).from(feedPosts)
    .where(and(eq(feedPosts.isActive, 1), isNotNull(feedPosts.occasion)))
    .groupBy(feedPosts.occasion);
  const result: Record<string, number> = {};
  for (const row of rows) {
    if (row.occasion) result[row.occasion] = row.cnt;
  }
  return result;
}

export async function deleteFeedPost(postId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete — only the owner can delete
  await db.update(feedPosts).set({ isActive: 0 }).where(
    and(eq(feedPosts.id, postId), eq(feedPosts.userId, userId))
  );
}

export async function likeFeedPost(userId: number, postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if already liked
  const existing = await db.select().from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
    .limit(1);
  if (existing.length > 0) return false; // already liked
  await db.insert(likes).values({ userId, postId });
  await db.update(feedPosts).set({ likesCount: sql`${feedPosts.likesCount} + 1` }).where(eq(feedPosts.id, postId));
  return true;
}

export async function unlikeFeedPost(userId: number, postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
    .limit(1);
  if (existing.length === 0) return false; // not liked
  await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
  await db.update(feedPosts).set({ likesCount: sql`GREATEST(${feedPosts.likesCount} - 1, 0)` }).where(eq(feedPosts.id, postId));
  return true;
}

export async function saveFeedPost(userId: number, postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(saves)
    .where(and(eq(saves.userId, userId), eq(saves.postId, postId)))
    .limit(1);
  if (existing.length > 0) return false;
  await db.insert(saves).values({ userId, postId });
  await db.update(feedPosts).set({ savesCount: sql`${feedPosts.savesCount} + 1` }).where(eq(feedPosts.id, postId));
  return true;
}

export async function unsaveFeedPost(userId: number, postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(saves)
    .where(and(eq(saves.userId, userId), eq(saves.postId, postId)))
    .limit(1);
  if (existing.length === 0) return false;
  await db.delete(saves).where(and(eq(saves.userId, userId), eq(saves.postId, postId)));
  await db.update(feedPosts).set({ savesCount: sql`GREATEST(${feedPosts.savesCount} - 1, 0)` }).where(eq(feedPosts.id, postId));
  return true;
}

/** Get which posts the user has liked and saved (for UI state) */
export async function getUserFeedInteractions(userId: number, postIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (postIds.length === 0) return { likedPostIds: [], savedPostIds: [] };

  const userLikes = await db.select({ postId: likes.postId }).from(likes)
    .where(and(eq(likes.userId, userId), inArray(likes.postId, postIds)));
  const userSaves = await db.select({ postId: saves.postId }).from(saves)
    .where(and(eq(saves.userId, userId), inArray(saves.postId, postIds)));

  return {
    likedPostIds: userLikes.map(l => l.postId),
    savedPostIds: userSaves.map(s => s.postId),
  };
}

/** Get posts saved by a user */
export async function getSavedPosts(userId: number, limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const userSaves = await db.select({ postId: saves.postId }).from(saves)
    .where(eq(saves.userId, userId))
    .orderBy(desc(saves.createdAt))
    .limit(limit)
    .offset(offset);
  
  if (userSaves.length === 0) return { posts: [], total: 0 };
  
  const postIds = userSaves.map(s => s.postId);
  const posts = await db.select().from(feedPosts)
    .where(and(inArray(feedPosts.id, postIds), eq(feedPosts.isActive, 1)));
  
  const totalResult = await db.select({ total: count() }).from(saves)
    .where(eq(saves.userId, userId));
  
  return { posts, total: totalResult[0]?.total ?? 0 };
}

/** Check if a review is already published to feed */
export async function isReviewPublished(reviewId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select({ id: feedPosts.id }).from(feedPosts)
    .where(and(eq(feedPosts.reviewId, reviewId), eq(feedPosts.userId, userId), eq(feedPosts.isActive, 1)))
    .limit(1);
  return existing.length > 0;
}

// ---- Follow System ----

/** Follow a user */
export async function followUser(followerId: number, followedId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (followerId === followedId) throw new Error("Cannot follow yourself");
  const existing = await db.select().from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)))
    .limit(1);
  if (existing.length > 0) return false; // already following
  await db.insert(follows).values({ followerId, followedId });
  return true;
}

/** Unfollow a user */
export async function unfollowUser(followerId: number, followedId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(follows).where(
    and(eq(follows.followerId, followerId), eq(follows.followedId, followedId))
  );
  return true;
}

/** Get list of user IDs that a user is following */
export async function getFollowingIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({ followedId: follows.followedId }).from(follows)
    .where(eq(follows.followerId, userId));
  return rows.map(r => r.followedId);
}

/** Get follower count for a user */
export async function getFollowerCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ total: count() }).from(follows)
    .where(eq(follows.followedId, userId));
  return result[0]?.total ?? 0;
}

/** Get following count for a user */
export async function getFollowingCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ total: count() }).from(follows)
    .where(eq(follows.followerId, userId));
  return result[0]?.total ?? 0;
}

/** Check if user A follows user B */
export async function isFollowing(followerId: number, followedId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)))
    .limit(1);
  return existing.length > 0;
}

/** Create notifications for all followers of a user when they post to feed */
export async function createNewPostNotifications(actorId: number, actorName: string | null, postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all followers of the actor
  const followerRows = await db.select({ followerId: follows.followerId }).from(follows)
    .where(eq(follows.followedId, actorId));
  
  if (followerRows.length === 0) return;
  
  const notifValues = followerRows.map(f => ({
    userId: f.followerId,
    type: "new_post" as const,
    actorId,
    actorName: actorName || null,
    postId,
  }));
  
  await db.insert(notifications).values(notifValues);
}

/** Get notifications for a user */
export async function getUserNotifications(userId: number, limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const notifs = await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
  
  const totalResult = await db.select({ total: count() }).from(notifications)
    .where(eq(notifications.userId, userId));
  
  return { notifications: notifs, total: totalResult[0]?.total ?? 0 };
}

/** Get unread notification count */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ total: count() }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  return result[0]?.total ?? 0;
}

/** Mark all notifications as read */
export async function markNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
}

/** Get feed posts only from users that the current user follows */
export async function getFollowingFeedPosts(userId: number, limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const followingIds = await getFollowingIds(userId);
  if (followingIds.length === 0) return { posts: [], total: 0 };
  
  const posts = await db.select().from(feedPosts)
    .where(and(eq(feedPosts.isActive, 1), inArray(feedPosts.userId, followingIds)))
    .orderBy(desc(feedPosts.createdAt))
    .limit(limit)
    .offset(offset);
  
  const totalResult = await db.select({ total: count() }).from(feedPosts)
    .where(and(eq(feedPosts.isActive, 1), inArray(feedPosts.userId, followingIds)));
  
  return { posts, total: totalResult[0]?.total ?? 0 };
}

// ---- Admin helpers ----

/** Get all reviews across all users (admin only) */
export async function getAllReviews(limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allReviews = await db.select({
    id: reviews.id,
    userId: reviews.userId,
    imageUrl: reviews.imageUrl,
    status: reviews.status,
    occasion: reviews.occasion,
    overallScore: reviews.overallScore,
    analysisJson: reviews.analysisJson,
    createdAt: reviews.createdAt,
    updatedAt: reviews.updatedAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ total: count() }).from(reviews);
  return { reviews: allReviews, total: totalResult[0]?.total ?? 0 };
}

/** Get all users with profile info and counts (admin only) */
export async function getAllUsers(limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    gender: userProfiles.gender,
    ageRange: userProfiles.ageRange,
    onboardingCompleted: userProfiles.onboardingCompleted,
    phoneNumber: userProfiles.phoneNumber,
  })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ total: count() }).from(users);
  return { users: allUsers, total: totalResult[0]?.total ?? 0 };
}

/** Admin update user fields — name/role in users table, phone/gender in userProfiles */
export async function adminUpdateUser(input: {
  userId: number;
  name?: string;
  role?: "user" | "admin";
  phoneNumber?: string | null;
  gender?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update users table fields (name, role)
  const userUpdate: Record<string, unknown> = {};
  if (input.name !== undefined) userUpdate.name = input.name;
  if (input.role !== undefined) userUpdate.role = input.role;
  if (Object.keys(userUpdate).length > 0) {
    await db.update(users).set(userUpdate).where(eq(users.id, input.userId));
  }

  // Update userProfiles fields (phoneNumber, gender)
  const profileFields: Record<string, unknown> = {};
  if (input.phoneNumber !== undefined) profileFields.phoneNumber = input.phoneNumber;
  if (input.gender !== undefined) profileFields.gender = input.gender;
  if (Object.keys(profileFields).length > 0) {
    await upsertUserProfile({ userId: input.userId, ...profileFields } as any);
  }
}

/** Get admin dashboard stats */
export async function getAdminStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [usersCount] = await db.select({ total: count() }).from(users);
  const [reviewsCount] = await db.select({ total: count() }).from(reviews);
  const [completedReviewsCount] = await db.select({ total: count() }).from(reviews).where(eq(reviews.status, "completed"));
  const [feedPostsCount] = await db.select({ total: count() }).from(feedPosts).where(eq(feedPosts.isActive, 1));
  const [likesCount] = await db.select({ total: count() }).from(likes);

  return {
    totalUsers: usersCount?.total ?? 0,
    totalReviews: reviewsCount?.total ?? 0,
    completedReviews: completedReviewsCount?.total ?? 0,
    totalFeedPosts: feedPostsCount?.total ?? 0,
    totalLikes: likesCount?.total ?? 0,
  };
}

/** Admin delete any review */
export async function adminDeleteReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Also soft-delete any feed post referencing this review
  await db.update(feedPosts).set({ isActive: 0 }).where(eq(feedPosts.reviewId, reviewId));
  await db.delete(reviews).where(eq(reviews.id, reviewId));
}

/** Get review counts per user (for admin user list) */
export async function getReviewCountsByUser(): Promise<Map<number, number>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({
    userId: reviews.userId,
    count: count(),
  }).from(reviews).groupBy(reviews.userId);
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.userId, r.count);
  return map;
}

/** Get feed post counts per user (for admin user list) */
export async function getFeedPostCountsByUser(): Promise<Map<number, number>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({
    userId: feedPosts.userId,
    count: count(),
  }).from(feedPosts).where(eq(feedPosts.isActive, 1)).groupBy(feedPosts.userId);
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.userId, r.count);
  return map;
}

// ---- Feed Comment helpers ----

export async function addFeedComment(data: InsertFeedComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(feedComments).values(data);
  return result[0].insertId;
}

export async function getFeedComments(feedPostId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(feedComments)
    .where(eq(feedComments.feedPostId, feedPostId))
    .orderBy(feedComments.createdAt);
}

export async function getFeedCommentCount(feedPostId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ total: count() }).from(feedComments)
    .where(eq(feedComments.feedPostId, feedPostId));
  return result[0]?.total ?? 0;
}

export async function deleteFeedComment(commentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Only the comment author can delete their own comment
  await db.delete(feedComments).where(and(eq(feedComments.id, commentId), eq(feedComments.userId, userId)));
}

// ---- Wardrobe Sharing helpers ----

export async function setWardrobeShareToken(userId: number, token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProfiles).set({ wardrobeShareToken: token }).where(eq(userProfiles.userId, userId));
}

export async function getWardrobeByShareToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Find the profile with this share token
  const profile = await db.select().from(userProfiles)
    .where(eq(userProfiles.wardrobeShareToken, token))
    .limit(1);
  
  if (profile.length === 0) return null;
  
  const userId = profile[0].userId;
  
  // Get user name
  const user = await db.select({ name: users.name }).from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  // Get wardrobe items
  const items = await db.select().from(wardrobeItems)
    .where(eq(wardrobeItems.userId, userId))
    .orderBy(desc(wardrobeItems.createdAt));
  
  return {
    userName: user[0]?.name || "משתמש/ת",
    gender: profile[0].gender,
    stylePreference: profile[0].stylePreference,
    items,
  };
}

export async function getWardrobeShareToken(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ token: userProfiles.wardrobeShareToken })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return result[0]?.token ?? null;
}

/** Create a notification when someone comments on a feed post */
export async function createCommentNotification(
  feedPostId: number,
  commenterId: number,
  commenterName: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find the post owner
  const [post] = await db
    .select({ userId: feedPosts.userId })
    .from(feedPosts)
    .where(eq(feedPosts.id, feedPostId))
    .limit(1);

  if (!post || post.userId === commenterId) return; // Don't notify yourself

  await db.insert(notifications).values({
    userId: post.userId,
    type: "comment",
    actorId: commenterId,
    actorName: commenterName,
    postId: feedPostId,
  });
}

/** Create a notification when someone replies to your comment */
export async function createReplyNotification(
  parentCommentId: number,
  feedPostId: number,
  replierId: number,
  replierName: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find the parent comment owner
  const [parentComment] = await db
    .select({ userId: feedComments.userId })
    .from(feedComments)
    .where(eq(feedComments.id, parentCommentId))
    .limit(1);

  if (!parentComment || parentComment.userId === replierId) return; // Don't notify yourself

  await db.insert(notifications).values({
    userId: parentComment.userId,
    type: "reply",
    actorId: replierId,
    actorName: replierName,
    postId: feedPostId,
  });
}

/** Create a notification when someone likes your feed post */
export async function createLikeNotification(
  feedPostId: number,
  likerId: number,
  likerName: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find the post owner
  const [post] = await db
    .select({ userId: feedPosts.userId })
    .from(feedPosts)
    .where(eq(feedPosts.id, feedPostId))
    .limit(1);

  if (!post || post.userId === likerId) return; // Don't notify yourself

  // Check if a like notification from this user for this post already exists (avoid spam on like/unlike/like)
  const existing = await db.select().from(notifications)
    .where(and(
      eq(notifications.userId, post.userId),
      eq(notifications.actorId, likerId),
      eq(notifications.postId, feedPostId),
      eq(notifications.type, "like")
    ))
    .limit(1);

  if (existing.length > 0) return; // Already notified

  await db.insert(notifications).values({
    userId: post.userId,
    type: "like",
    actorId: likerId,
    actorName: likerName,
    postId: feedPostId,
  });
}

/**
 * Save a Fix My Look result to the database.
 */
export async function saveFixMyLookResult(data: InsertFixMyLookResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete any existing result for this review (only keep latest)
  await db.delete(fixMyLookResults).where(
    and(
      eq(fixMyLookResults.reviewId, data.reviewId),
      eq(fixMyLookResults.userId, data.userId)
    )
  );

  const [result] = await db.insert(fixMyLookResults).values(data).$returningId();
  return result;
}

/**
 * Get the saved Fix My Look result for a review.
 */
export async function getFixMyLookResult(reviewId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db
    .select()
    .from(fixMyLookResults)
    .where(
      and(
        eq(fixMyLookResults.reviewId, reviewId),
        eq(fixMyLookResults.userId, userId)
      )
    )
    .orderBy(desc(fixMyLookResults.createdAt))
    .limit(1);

  return result || null;
}

// ---- Guest Session helpers ----

// demoViews and InsertDemoView now imported at top

/**
 * Create a new guest session. Returns the session ID.
 */
function containsNonBmpUnicode(value: string): boolean {
  return /[\u{10000}-\u{10FFFF}]/u.test(value);
}

function stripNonBmpUnicode(value: string): string {
  return value.replace(/[\u{10000}-\u{10FFFF}]/gu, "");
}

function sanitizeJsonForMysql(value: unknown): unknown {
  if (typeof value === "string") {
    return containsNonBmpUnicode(value) ? stripNonBmpUnicode(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonForMysql(entry));
  }
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(input)) {
      output[key] = sanitizeJsonForMysql(entry);
    }
    return output;
  }
  return value;
}

const GUEST_SESSION_INSERTABLE_COLUMNS = new Set([
  "fingerprint",
  "ipAddress",
  "imageUrl",
  "imageKey",
  "status",
  "analysisJson",
  "overallScore",
  "userAgent",
  "convertedUserId",
  "convertedAt",
  "ageRange",
  "gender",
  "occupation",
  "budgetLevel",
  "stylePreference",
  "favoriteBrands",
  "favoriteInfluencers",
  "preferredStores",
  "country",
  "onboardingCompleted",
  "email",
  "analysisCount",
  "source",
  "whatsappToken",
  "whatsappPhone",
  "whatsappProfileName",
  "lastViewedAt",
  "followUpSentAt",
  "createdAt",
]);

function buildGuestSessionInsertPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key, value]) => value !== undefined && GUEST_SESSION_INSERTABLE_COLUMNS.has(key)
    )
  );
}

function applyGuestPayloadFallbackFromMessage(
  payload: Record<string, unknown>,
  fullMsg: string
): boolean {
  const unknownColumnMatch = fullMsg.match(/Unknown column '([^']+)'/i);
  const unknownColumn = unknownColumnMatch?.[1];
  if (unknownColumn && unknownColumn in payload) {
    console.warn(
      `[DB] createGuestSession fallback: dropping unknown column '${unknownColumn}' and retrying`
    );
    delete payload[unknownColumn];
    return true;
  }

  const incorrectStringColumnMatch = fullMsg.match(
    /Incorrect string value: .* for column '([^']+)'/i
  );
  const incorrectStringColumn = incorrectStringColumnMatch?.[1];
  if (incorrectStringColumn && typeof payload[incorrectStringColumn] === "string") {
    const original = String(payload[incorrectStringColumn]);
    const sanitized = stripNonBmpUnicode(original);
    if (sanitized !== original) {
      console.warn(
        `[DB] createGuestSession fallback: sanitized non-BMP chars for column '${incorrectStringColumn}'`
      );
      payload[incorrectStringColumn] = sanitized;
      return true;
    }
  }

  const dataTooLongMatch = fullMsg.match(/Data too long for column '([^']+)'/i);
  const dataTooLongColumn = dataTooLongMatch?.[1];
  if (dataTooLongColumn && typeof payload[dataTooLongColumn] === "string") {
    const original = String(payload[dataTooLongColumn]);
    if (original.length > 255) {
      payload[dataTooLongColumn] = original.slice(0, 255);
      console.warn(
        `[DB] createGuestSession fallback: truncated value for column '${dataTooLongColumn}'`
      );
      return true;
    }
  }

  // Wrapped Drizzle errors often only include SQL text (without concrete MySQL cause).
  const lower = fullMsg.toLowerCase();
  const looksLikeGuestInsertFailure =
    lower.includes("failed query") && lower.includes("insert into guestsessions");
  const profileName = payload.whatsappProfileName;
  if (
    looksLikeGuestInsertFailure &&
    typeof profileName === "string" &&
    containsNonBmpUnicode(profileName)
  ) {
    const sanitized = stripNonBmpUnicode(profileName);
    if (sanitized !== profileName) {
      payload.whatsappProfileName = sanitized;
      console.warn("[DB] createGuestSession fallback: sanitized whatsappProfileName and retrying");
      return true;
    }
  }

  return false;
}

async function insertGuestSessionWithExplicitColumns(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  payload: Record<string, unknown>
): Promise<number> {
  const cleanPayload = buildGuestSessionInsertPayload(payload);
  const columns = Object.keys(cleanPayload);
  if (columns.length === 0) {
    throw new Error("createGuestSession explicit insert has no values");
  }

  await db.execute(sql`
    INSERT INTO ${sql.identifier("guestSessions")}
    (${sql.join(columns.map((column) => sql.identifier(column)), sql`, `)})
    VALUES (${sql.join(columns.map((column) => sql`${cleanPayload[column]}`), sql`, `)})
  `);

  // Fetch inserted row ID using stable keys from payload.
  if (typeof cleanPayload.whatsappToken === "string" && cleanPayload.whatsappToken.length > 0) {
    const rows = await db
      .select({ id: guestSessions.id })
      .from(guestSessions)
      .where(eq(guestSessions.whatsappToken, cleanPayload.whatsappToken))
      .orderBy(desc(guestSessions.id))
      .limit(1);
    if (rows[0]?.id) return rows[0].id;
  }

  if (typeof cleanPayload.fingerprint === "string" && cleanPayload.fingerprint.length > 0) {
    const rows = await db
      .select({ id: guestSessions.id })
      .from(guestSessions)
      .where(eq(guestSessions.fingerprint, cleanPayload.fingerprint))
      .orderBy(desc(guestSessions.id))
      .limit(1);
    if (rows[0]?.id) return rows[0].id;
  }

  throw new Error("createGuestSession explicit insert succeeded but ID lookup failed");
}

export async function createGuestSession(data: InsertGuestSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Be resilient to schema drift during rolling deploys:
  // if production DB is missing a newer optional column, strip it and retry.
  const payload: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  let lastError: unknown = null;

  for (let i = 0; i < 8; i++) {
    try {
      const cleanPayload = buildGuestSessionInsertPayload(payload);
      const [result] = await db.insert(guestSessions).values(cleanPayload as any).$returningId();
      return result.id;
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || "");
      const causeMsg = String(err?.cause?.message || "");
      const fullMsg = `${msg} ${causeMsg}`.trim();

      if (applyGuestPayloadFallbackFromMessage(payload, fullMsg)) {
        continue;
      }

      // For wrapped/opaque insert errors, force an explicit-column insert that does
      // not include drifted DB columns generated from Drizzle defaults.
      const lower = fullMsg.toLowerCase();
      const shouldTryExplicitInsert =
        lower.includes("failed query") ||
        lower.includes("insert into guestsessions") ||
        lower.includes("unknown column");
      if (shouldTryExplicitInsert) {
        try {
          return await insertGuestSessionWithExplicitColumns(db, payload);
        } catch (explicitErr: any) {
          lastError = explicitErr;
          const explicitMsg = String(explicitErr?.message || "");
          const explicitCause = String(explicitErr?.cause?.message || "");
          const explicitFullMsg = `${explicitMsg} ${explicitCause}`.trim();
          if (applyGuestPayloadFallbackFromMessage(payload, explicitFullMsg)) {
            continue;
          }
        }
      }

      break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to create guest session");
}

/**
 * Selectable guest session columns that are safe on older DBs as well.
 * Intentionally excludes `lastViewedAt` so reads keep working even before
 * the migration is applied in production.
 */
const guestSessionColumns = {
  id: guestSessions.id,
  fingerprint: guestSessions.fingerprint,
  ipAddress: guestSessions.ipAddress,
  imageUrl: guestSessions.imageUrl,
  imageKey: guestSessions.imageKey,
  status: guestSessions.status,
  analysisJson: guestSessions.analysisJson,
  overallScore: guestSessions.overallScore,
  userAgent: guestSessions.userAgent,
  convertedUserId: guestSessions.convertedUserId,
  convertedAt: guestSessions.convertedAt,
  ageRange: guestSessions.ageRange,
  gender: guestSessions.gender,
  occupation: guestSessions.occupation,
  budgetLevel: guestSessions.budgetLevel,
  stylePreference: guestSessions.stylePreference,
  favoriteBrands: guestSessions.favoriteBrands,
  favoriteInfluencers: guestSessions.favoriteInfluencers,
  preferredStores: guestSessions.preferredStores,
  country: guestSessions.country,
  onboardingCompleted: guestSessions.onboardingCompleted,
  email: guestSessions.email,
  analysisCount: guestSessions.analysisCount,
  source: guestSessions.source,
  whatsappToken: guestSessions.whatsappToken,
  whatsappPhone: guestSessions.whatsappPhone,
  whatsappProfileName: guestSessions.whatsappProfileName,
  followUpSentAt: guestSessions.followUpSentAt,
  createdAt: guestSessions.createdAt,
} as const;

/**
 * Get a guest session by ID.
 */
export async function getGuestSessionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db
    .select(guestSessionColumns)
    .from(guestSessions)
    .where(eq(guestSessions.id, id))
    .limit(1);
  return result || null;
}

/**
 * Check how many completed analyses a fingerprint has.
 * Returns { count, limit, hasEmail } for the frontend to decide.
 */
export async function getGuestAnalysisCount(fingerprint: string): Promise<{ count: number; hasEmail: boolean; onboardingCompleted: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ cnt: count() }).from(guestSessions)
    .where(and(
      eq(guestSessions.fingerprint, fingerprint),
      eq(guestSessions.status, "completed"),
      isNull(guestSessions.convertedUserId)
    ));
  // Check if any session for this fingerprint has an email
  const emailResult = await db.select({ email: guestSessions.email, onboarding: guestSessions.onboardingCompleted }).from(guestSessions)
    .where(and(
      eq(guestSessions.fingerprint, fingerprint),
      isNotNull(guestSessions.email)
    )).limit(1);
  // Check if onboarding was completed for this fingerprint
  const onboardingResult = await db.select({ onboarding: guestSessions.onboardingCompleted }).from(guestSessions)
    .where(and(
      eq(guestSessions.fingerprint, fingerprint),
      eq(guestSessions.onboardingCompleted, 1)
    )).limit(1);
  return {
    count: result[0]?.cnt || 0,
    hasEmail: !!emailResult[0]?.email,
    onboardingCompleted: !!onboardingResult[0],
  };
}

/**
 * Legacy: Check if a fingerprint has already used their free analysis (backward compat).
 * Now checks if they've hit the 5-analysis limit (or no email = 5 max).
 */
export async function hasGuestUsedAnalysis(fingerprint: string): Promise<boolean> {
  const { count: cnt, hasEmail } = await getGuestAnalysisCount(fingerprint);
  // If they have email, unlimited. Otherwise, limit to 3.
  if (hasEmail) return false;
  return cnt >= 3;
}

/**
 * Update guest session with analysis results.
 */
export async function updateGuestSessionAnalysis(id: number, overallScore: number, analysisJson: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(guestSessions).set({
      status: "completed",
      overallScore,
      analysisJson,
    }).where(eq(guestSessions.id, id));
  } catch (error: any) {
    const fullMsg = `${error?.message || ""} ${error?.cause?.message || ""}`;
    if (fullMsg.includes("Incorrect string value")) {
      const sanitized = sanitizeJsonForMysql(analysisJson);
      await db.update(guestSessions).set({
        status: "completed",
        overallScore,
        analysisJson: sanitized,
      }).where(eq(guestSessions.id, id));
      return;
    }
    throw error;
  }
}

/**
 * Update guest session status.
 */
export async function updateGuestSessionStatus(id: number, status: "pending" | "analyzing" | "completed" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(guestSessions).set({ status }).where(eq(guestSessions.id, id));
}

/**
 * Mark a guest session as converted (user signed up).
 */
export async function markGuestConverted(fingerprint: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(guestSessions).set({
    convertedUserId: userId,
    convertedAt: new Date(),
  }).where(eq(guestSessions.fingerprint, fingerprint));
}

/**
 * Save guest profile (onboarding data).
 */
export async function saveGuestProfile(fingerprint: string, profile: {
  ageRange?: string;
  gender?: string;
  occupation?: string;
  budgetLevel?: string;
  stylePreference?: string;
  favoriteBrands?: string;
  favoriteInfluencers?: string;
  preferredStores?: string;
  country?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(guestSessions).set({
    ...profile,
    onboardingCompleted: 1,
  }).where(eq(guestSessions.fingerprint, fingerprint));
}

/**
 * Get guest profile by fingerprint (latest session with onboarding completed).
 */
export async function getGuestProfile(fingerprint: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.select({
    ageRange: guestSessions.ageRange,
    gender: guestSessions.gender,
    occupation: guestSessions.occupation,
    budgetLevel: guestSessions.budgetLevel,
    stylePreference: guestSessions.stylePreference,
    favoriteBrands: guestSessions.favoriteBrands,
    favoriteInfluencers: guestSessions.favoriteInfluencers,
    preferredStores: guestSessions.preferredStores,
    country: guestSessions.country,
    onboardingCompleted: guestSessions.onboardingCompleted,
  }).from(guestSessions)
    .where(and(
      eq(guestSessions.fingerprint, fingerprint),
      eq(guestSessions.onboardingCompleted, 1)
    ))
    .orderBy(desc(guestSessions.id))
    .limit(1);
  if (!result) return null;
  return {
    ageRange: result.ageRange,
    gender: result.gender,
    occupation: result.occupation,
    budgetLevel: result.budgetLevel,
    stylePreference: result.stylePreference,
    favoriteBrands: result.favoriteBrands,
    favoriteInfluencers: result.favoriteInfluencers,
    preferredStores: result.preferredStores,
    country: result.country,
    onboardingCompleted: result.onboardingCompleted === 1,
  };
}

/**
 * Save guest email for conversion.
 */
export async function saveGuestEmail(fingerprint: string, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Update all sessions for this fingerprint with the email
  await db.update(guestSessions).set({ email }).where(eq(guestSessions.fingerprint, fingerprint));
}

/**
 * Get wardrobe items for a guest (by guestSessionId).
 */
export async function getGuestWardrobe(guestSessionIds: number[], limit?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (guestSessionIds.length === 0) return [];
  const query = db.select().from(wardrobeItems)
    .where(inArray(wardrobeItems.guestSessionId, guestSessionIds))
    .orderBy(desc(wardrobeItems.createdAt));
  if (typeof limit === "number" && limit > 0) {
    return query.limit(limit);
  }
  return query;
}

/**
 * Get all session IDs for a fingerprint.
 */
export async function getGuestSessionIdsByFingerprint(fingerprint: string): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select({ id: guestSessions.id }).from(guestSessions)
    .where(eq(guestSessions.fingerprint, fingerprint));
  return results.map(r => r.id);
}

/**
 * Add wardrobe items for a guest session.
 */
export async function addGuestWardrobeItems(items: InsertWardrobeItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return { added: 0, skipped: 0 };
  
  const guestSessionId = items[0].guestSessionId;
  if (!guestSessionId) throw new Error("guestSessionId required for guest wardrobe");
  
  // Fetch existing items for this guest session
  const existing = await db.select().from(wardrobeItems)
    .where(eq(wardrobeItems.guestSessionId, guestSessionId));
  
  const existingKeys = new Set(
    existing.map(e => `${e.itemType.toLowerCase().trim()}||${(typeof e.name === 'string' ? e.name : '').toLowerCase().trim()}`)
  );
  
  const newItems = items.filter(item => {
    const key = `${item.itemType.toLowerCase().trim()}||${(typeof item.name === 'string' ? item.name : '').toLowerCase().trim()}`;
    return !existingKeys.has(key);
  });
  
  if (newItems.length > 0) {
    await db.insert(wardrobeItems).values(newItems);
  }
  
  return { added: newItems.length, skipped: items.length - newItems.length };
}

/**
 * Delete a guest wardrobe item.
 */
export async function deleteGuestWardrobeItem(id: number, guestSessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(wardrobeItems).where(and(
    eq(wardrobeItems.id, id),
    eq(wardrobeItems.guestSessionId, guestSessionId)
  ));
}

/**
 * Migrate all guest data to a registered user.
 * Transfers: wardrobe items, profile data, reviews (as new reviews).
 */
export async function migrateGuestToUser(fingerprint: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all session IDs for this fingerprint
  const sessionIds = await getGuestSessionIdsByFingerprint(fingerprint);
  if (sessionIds.length === 0) return;
  
  // 1. Transfer wardrobe items: set userId, clear guestSessionId
  await db.update(wardrobeItems).set({
    userId,
    guestSessionId: null,
  }).where(inArray(wardrobeItems.guestSessionId, sessionIds));
  
  // 2. Get guest profile and create user profile if doesn't exist
  const guestProfile = await getGuestProfile(fingerprint);
  if (guestProfile && guestProfile.onboardingCompleted) {
    const existingProfile = await getUserProfile(userId);
    if (!existingProfile) {
      await upsertUserProfile({
        userId,
        ageRange: guestProfile.ageRange || undefined,
        gender: guestProfile.gender || undefined,
        occupation: guestProfile.occupation || undefined,
        budgetLevel: guestProfile.budgetLevel || undefined,
        stylePreference: guestProfile.stylePreference || undefined,
        favoriteInfluencers: guestProfile.favoriteInfluencers || undefined,
        preferredStores: guestProfile.preferredStores || undefined,
        onboardingCompleted: 1,
      });
    }
  }
  
  // 3. Mark all guest sessions as converted
  await markGuestConverted(fingerprint, userId);
}

/**
 * Get all guest sessions for admin view (newest first).
 */
export async function getAllGuestSessions(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sessions = await db
    .select(guestSessionColumns)
    .from(guestSessions)
    .orderBy(desc(guestSessions.createdAt))
    .limit(limit)
    .offset(offset);
  const [total] = await db.select({ cnt: count() }).from(guestSessions);
  return { sessions, total: total?.cnt || 0 };
}

/**
 * Get guest analytics summary for admin.
 */
export async function getGuestAnalytics() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [totalGuests] = await db.select({ cnt: count() }).from(guestSessions);
  const [completedGuests] = await db.select({ cnt: count() }).from(guestSessions).where(eq(guestSessions.status, "completed"));
  const [convertedGuests] = await db.select({ cnt: count() }).from(guestSessions).where(isNotNull(guestSessions.convertedUserId));
  const [totalDemoViews] = await db.select({ cnt: count() }).from(demoViews);
  const [demoSignupClicks] = await db.select({ cnt: count() }).from(demoViews).where(eq(demoViews.clickedSignup, 1));

  return {
    totalGuests: totalGuests?.cnt || 0,
    completedAnalyses: completedGuests?.cnt || 0,
    convertedToUsers: convertedGuests?.cnt || 0,
    conversionRate: (totalGuests?.cnt || 0) > 0
      ? Math.round(((convertedGuests?.cnt || 0) / (totalGuests?.cnt || 1)) * 100)
      : 0,
    totalDemoViews: totalDemoViews?.cnt || 0,
    demoSignupClicks: demoSignupClicks?.cnt || 0,
    demoConversionRate: (totalDemoViews?.cnt || 0) > 0
      ? Math.round(((demoSignupClicks?.cnt || 0) / (totalDemoViews?.cnt || 1)) * 100)
      : 0,
  };
}

// ---- Demo View helpers ----

/**
 * Track a demo view.
 */
export async function trackDemoView(data: InsertDemoView) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(demoViews).values(data).$returningId();
  return result.id;
}

/**
 * Update a demo view to mark signup click.
 */
export async function markDemoSignupClick(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(demoViews).set({ clickedSignup: 1 }).where(eq(demoViews.id, id));
}

/**
 * Get all demo views for admin (newest first).
 */
export async function getAllDemoViews(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const views = await db.select().from(demoViews).orderBy(desc(demoViews.createdAt)).limit(limit).offset(offset);
  const [total] = await db.select({ cnt: count() }).from(demoViews);
  return { views, total: total?.cnt || 0 };
}

// ── Product Image Cache ──────────────────────────────────────────────

import { productImageCache, type InsertProductImageCache } from "../drizzle/schema";

/**
 * Normalize a product name into a stable cache key.
 * Lowercases, trims, removes extra whitespace and punctuation.
 */
export function normalizeProductKey(label: string, categoryQuery: string, sourceUrl?: string): string {
  const normalizedLabel = (label || "")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u0590-\u05FF\u0400-\u04FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const category = (categoryQuery || "")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u0590-\u05FF\u0400-\u04FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let host = "";
  if (sourceUrl) {
    try {
      host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      host = "";
    }
  }
  return `${category}::${host}::${normalizedLabel}`.slice(0, 500);
}

/**
 * Look up a cached product image by its normalized key.
 * Returns the image URL if found, null otherwise.
 */
export async function getCachedProductImage(
  productKey: string,
  maxAgeDays = 30
): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(productImageCache).where(eq(productImageCache.productKey, productKey)).limit(1);
  if (!result?.imageUrl) return null;
  if (maxAgeDays > 0 && result.createdAt) {
    const ageMs = Date.now() - new Date(result.createdAt).getTime();
    if (ageMs > maxAgeDays * 24 * 60 * 60 * 1000) {
      return null;
    }
  }
  return result.imageUrl;
}

/**
 * Save a product image to the cache.
 */
export async function saveProductImageToCache(data: InsertProductImageCache): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(productImageCache).values(data).onDuplicateKeyUpdate({
      set: { imageUrl: data.imageUrl },
    });
  } catch (err: any) {
    console.warn("[ProductImageCache] Failed to save:", err?.message);
  }
}

// ── Page Views / Funnel Tracking ────────────────────────────────────────────────

/**
 * Track a page view for funnel analytics.
 */
export async function trackPageView(data: InsertPageView): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(pageViews).values(data).$returningId();
  return result.id;
}

/**
 * Get funnel stats: landing visitors, unique visitors, guest sessions, registered users, analyses.
 */
export async function getFunnelStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Total page views on landing
  const [landingViews] = await db.select({ cnt: count() }).from(pageViews).where(eq(pageViews.page, "/"));
  
  // Unique visitors on landing (by fingerprint)
  const uniqueLandingResult = await db.selectDistinct({ fp: pageViews.fingerprint }).from(pageViews).where(eq(pageViews.page, "/"));
  
  // Total registered users
  const [totalUsers] = await db.select({ cnt: count() }).from(users);
  
  // Total guest sessions
  const [totalGuests] = await db.select({ cnt: count() }).from(guestSessions);
  
  // Users who did at least one analysis
  const usersWithReviews = await db.selectDistinct({ uid: reviews.userId }).from(reviews);
  
  // Total analyses
  const [totalReviews] = await db.select({ cnt: count() }).from(reviews);
  
  // Guest sessions that completed analysis
  const [completedGuests] = await db.select({ cnt: count() }).from(guestSessions).where(eq(guestSessions.status, "completed"));

  return {
    landingPageViews: landingViews?.cnt || 0,
    uniqueLandingVisitors: uniqueLandingResult.length,
    registeredUsers: totalUsers?.cnt || 0,
    guestSessions: totalGuests?.cnt || 0,
    usersWithAnalysis: usersWithReviews.length,
    completedGuestAnalyses: completedGuests?.cnt || 0,
    totalAnalyses: totalReviews?.cnt || 0,
  };
}

/**
 * Get daily funnel breakdown for the last N days.
 */
export async function getDailyFunnelStats(days = 14) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  // Daily landing page views
  const dailyViews = await db.select({
    date: sql<string>`DATE(${pageViews.createdAt})`,
    views: count(),
    uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.fingerprint})`,
  }).from(pageViews)
    .where(and(eq(pageViews.page, "/"), gte(pageViews.createdAt, since)))
    .groupBy(sql`DATE(${pageViews.createdAt})`)
    .orderBy(sql`DATE(${pageViews.createdAt})`);
  
  // Daily registrations
  const dailyRegistrations = await db.select({
    date: sql<string>`DATE(${users.createdAt})`,
    registrations: count(),
  }).from(users)
    .where(gte(users.createdAt, since))
    .groupBy(sql`DATE(${users.createdAt})`)
    .orderBy(sql`DATE(${users.createdAt})`);
  
  // Daily guest sessions
  const dailyGuests = await db.select({
    date: sql<string>`DATE(${guestSessions.createdAt})`,
    guests: count(),
  }).from(guestSessions)
    .where(gte(guestSessions.createdAt, since))
    .groupBy(sql`DATE(${guestSessions.createdAt})`)
    .orderBy(sql`DATE(${guestSessions.createdAt})`);
  
  // Daily analyses
  const dailyAnalyses = await db.select({
    date: sql<string>`DATE(${reviews.createdAt})`,
    analyses: count(),
  }).from(reviews)
    .where(gte(reviews.createdAt, since))
    .groupBy(sql`DATE(${reviews.createdAt})`)
    .orderBy(sql`DATE(${reviews.createdAt})`);
  
  return { dailyViews, dailyRegistrations, dailyGuests, dailyAnalyses };
}


// ── Single Review / Guest Session Delete ────────────────────────────

/**
 * Delete a single review by ID, owned by the given user.
 * Also soft-deletes any feed post referencing this review.
 */
export async function deleteReviewById(reviewId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft-delete any feed post referencing this review
  await db.update(feedPosts).set({ isActive: 0 }).where(and(
    eq(feedPosts.reviewId, reviewId),
    eq(feedPosts.userId, userId),
  ));
  // Delete the review itself
  await db.delete(reviews).where(and(
    eq(reviews.id, reviewId),
    eq(reviews.userId, userId),
  ));
}

/**
 * Delete a single guest session (analysis) by ID and fingerprint.
 * Also removes associated wardrobe items for that session.
 */
export async function deleteGuestSession(sessionId: number, fingerprint: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Remove wardrobe items linked to this guest session
  await db.delete(wardrobeItems).where(eq(wardrobeItems.guestSessionId, sessionId));
  // Delete the guest session itself (only if fingerprint matches)
  await db.delete(guestSessions).where(and(
    eq(guestSessions.id, sessionId),
    eq(guestSessions.fingerprint, fingerprint),
  ));
}

// ==========================================
// Instagram Integration Helpers
// ==========================================

/**
 * Save or update an Instagram connection for a user.
 */
export async function upsertIgConnection(data: InsertIgConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(igConnections).where(eq(igConnections.userId, data.userId!)).limit(1);
  if (existing.length > 0) {
    await db.update(igConnections).set({
      igUserId: data.igUserId,
      igUsername: data.igUsername,
      accessToken: data.accessToken,
      tokenExpiresAt: data.tokenExpiresAt,
      isActive: 1,
    }).where(eq(igConnections.userId, data.userId!));
    return existing[0].id;
  }
  const [result] = await db.insert(igConnections).values(data).$returningId();
  return result.id;
}

/**
 * Get Instagram connection for a user.
 */
export async function getIgConnection(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(igConnections).where(and(eq(igConnections.userId, userId), eq(igConnections.isActive, 1))).limit(1);
  return rows[0] ?? null;
}

/**
 * Find a TotalLook user by their Instagram user ID.
 */
export async function findUserByIgUserId(igUserId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(igConnections).where(eq(igConnections.igUserId, igUserId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Disconnect Instagram for a user.
 */
export async function disconnectIg(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(igConnections).set({ isActive: 0 }).where(eq(igConnections.userId, userId));
}

/**
 * Create a new story mention record.
 */
export async function createStoryMention(data: InsertStoryMention) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(storyMentions).values(data).$returningId();
  return result.id;
}

/**
 * Update a story mention with analysis results.
 */
export async function updateStoryMentionAnalysis(id: number, update: {
  status?: "received" | "fetching" | "analyzing" | "completed" | "failed" | "dm_sent";
  overallScore?: number;
  analysisJson?: unknown;
  quickSummary?: string;
  quickTip?: string;
  itemsDetected?: number;
  savedImageUrl?: string;
  savedImageKey?: string;
  linkedReviewId?: number;
  errorMessage?: string;
  dmSent?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(storyMentions).set(update).where(eq(storyMentions.id, id));
}

/**
 * Get all story mentions for a user, ordered by most recent.
 */
export async function getStoryMentionsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storyMentions).where(eq(storyMentions.userId, userId)).orderBy(desc(storyMentions.createdAt)).limit(limit);
}

/**
 * Get story mentions for a user within a date range (for diary summaries).
 */
export async function getStoryMentionsInRange(userId: number, start: Date, end: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storyMentions).where(
    and(
      eq(storyMentions.userId, userId),
      eq(storyMentions.status, "completed"),
      gte(storyMentions.createdAt, start),
    )
  ).orderBy(desc(storyMentions.createdAt));
}

/**
 * Check if a story mention already exists (dedup by igMediaId).
 */
export async function storyMentionExists(igMediaId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: storyMentions.id }).from(storyMentions).where(eq(storyMentions.igMediaId, igMediaId)).limit(1);
  return rows.length > 0;
}

/**
 * Save a style diary entry.
 */
export async function saveStyleDiaryEntry(data: InsertStyleDiaryEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(styleDiaryEntries).values(data).$returningId();
  return result.id;
}

/**
 * Get style diary entries for a user.
 */
export async function getStyleDiary(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(styleDiaryEntries).where(eq(styleDiaryEntries.userId, userId)).orderBy(desc(styleDiaryEntries.periodStart)).limit(limit);
}

/**
 * Get a user's story mention stats (total stories, avg score, etc.)
 */
export async function getStoryMentionStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, avgScore: 0, bestScore: 0 };
  const rows = await db.select({
    total: count(),
    avgScore: sql<number>`COALESCE(AVG(${storyMentions.overallScore}), 0)`,
    bestScore: sql<number>`COALESCE(MAX(${storyMentions.overallScore}), 0)`,
  }).from(storyMentions).where(
    and(eq(storyMentions.userId, userId), eq(storyMentions.status, "completed"))
  );
  return rows[0] ?? { total: 0, avgScore: 0, bestScore: 0 };
}

// ==========================================
// WhatsApp Integration Helpers
// ==========================================

/**
 * Find a registered user by their phone number (for WhatsApp identification).
 * Returns the user + profile if a match is found.
 */
export async function findUserByPhoneNumber(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const cleaned = normalizePhone(phone);
  if (!cleaned || cleaned === "+") return null;
  const rows = await db.select({
    userId: userProfiles.userId,
    phoneNumber: userProfiles.phoneNumber,
    gender: userProfiles.gender,
    ageRange: userProfiles.ageRange,
    budgetLevel: userProfiles.budgetLevel,
    stylePreference: userProfiles.stylePreference,
    favoriteInfluencers: userProfiles.favoriteInfluencers,
    favoriteBrands: userProfiles.favoriteBrands,
    preferredStores: userProfiles.preferredStores,
    occupation: userProfiles.occupation,
    country: userProfiles.country,
    onboardingCompleted: userProfiles.onboardingCompleted,
    saveToWardrobe: userProfiles.saveToWardrobe,
  }).from(userProfiles).where(eq(userProfiles.phoneNumber, cleaned)).limit(1);
  if (rows.length === 0) return null;
  // Also fetch the user record
  const userRow = await db.select().from(users).where(eq(users.id, rows[0].userId)).limit(1);
  return { profile: rows[0], user: userRow[0] || null };
}

/**
 * Check if a phone number is already taken by another user.
 * Returns the userId that owns this phone, or null if available.
 * Used to prevent duplicate phone numbers across users.
 */
export async function isPhoneTaken(phone: string, excludeUserId?: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const cleaned = normalizePhone(phone);
  if (!cleaned || cleaned === "+") return null;
  const conditions = [eq(userProfiles.phoneNumber, cleaned)];
  if (excludeUserId !== undefined) {
    conditions.push(ne(userProfiles.userId, excludeUserId));
  }
  // JOIN with users table to ensure the user actually exists
  // (deleted users may leave orphaned profiles if deletion partially failed)
  const rows = await db.select({ userId: userProfiles.userId })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(and(...conditions))
    .limit(1);
  return rows.length > 0 ? rows[0].userId : null;
}

/**
 * Get a guest session by its WhatsApp deep-link token.
 */
export async function getGuestSessionByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select(guestSessionColumns)
    .from(guestSessions)
    .where(eq(guestSessions.whatsappToken, token))
    .limit(1);
  return result || null;
}

/**
 * Mark a guest session deep-link as viewed.
 */
export async function markGuestSessionViewed(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .update(guestSessions)
      .set({ lastViewedAt: new Date() })
      .where(eq(guestSessions.id, sessionId));
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("Unknown column") && msg.includes("lastViewedAt")) {
      // Backward-compatible behavior if migration hasn't run yet.
      return;
    }
    throw err;
  }
}

/**
 * Check whether a guest session deep-link was viewed.
 */
export async function hasGuestSessionBeenViewed(sessionId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const [result] = await db
      .select({ lastViewedAt: guestSessions.lastViewedAt })
      .from(guestSessions)
      .where(eq(guestSessions.id, sessionId))
      .limit(1);
    return !!result?.lastViewedAt;
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("Unknown column") && msg.includes("lastViewedAt")) {
      // Backward-compatible behavior if migration hasn't run yet.
      return false;
    }
    throw err;
  }
}

// ==========================================
// WhatsApp Follow-up Helpers
// ==========================================

/**
 * Get WhatsApp guest sessions eligible for 24h follow-up:
 * - source = 'whatsapp'
 * - status = 'completed'
 * - followUpSentAt is null (not yet sent)
 * - createdAt is older than 24 hours
 * - convertedUserId is null (not yet registered)
 * - email is null (not yet captured)
 * Groups by phone to send only one follow-up per phone number.
 */
export async function getWhatsAppGuestsForFollowUp(): Promise<
  { whatsappPhone: string; whatsappProfileName: string | null; sessionId: number; createdAt: Date }[]
> {
  const db = await getDb();
  if (!db) return [];

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const results = await db
    .select({
      whatsappPhone: guestSessions.whatsappPhone,
      whatsappProfileName: guestSessions.whatsappProfileName,
      sessionId: guestSessions.id,
      createdAt: guestSessions.createdAt,
    })
    .from(guestSessions)
    .where(
      and(
        eq(guestSessions.source, "whatsapp"),
        eq(guestSessions.status, "completed"),
        isNull(guestSessions.followUpSentAt),
        isNull(guestSessions.convertedUserId),
        isNull(guestSessions.email),
        lte(guestSessions.createdAt, twentyFourHoursAgo),
        isNotNull(guestSessions.whatsappPhone),
      )
    )
    .limit(50);

  // Deduplicate by phone — keep only the most recent session per phone
  const phoneMap = new Map<string, typeof results[0]>();
  for (const r of results) {
    if (!r.whatsappPhone) continue;
    const existing = phoneMap.get(r.whatsappPhone);
    if (!existing || r.createdAt > existing.createdAt) {
      phoneMap.set(r.whatsappPhone, r);
    }
  }

  return Array.from(phoneMap.values()).map(r => ({
    whatsappPhone: r.whatsappPhone!,
    whatsappProfileName: r.whatsappProfileName,
    sessionId: r.sessionId,
    createdAt: r.createdAt,
  }));
}

/**
 * Mark all WhatsApp sessions for a given phone as follow-up sent.
 */
export async function markFollowUpSent(whatsappPhone: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(guestSessions)
    .set({ followUpSentAt: new Date() })
    .where(
      and(
        eq(guestSessions.source, "whatsapp"),
        eq(guestSessions.whatsappPhone, whatsappPhone),
        isNull(guestSessions.followUpSentAt),
      )
    );
}


// ─── Privacy Consent Tracking ───

export async function logConsent(data: {
  userId?: number;
  guestSessionId?: string;
  consentType: string;
  granted: boolean;
  ipHash?: string;
  userAgent?: string;
  documentVersion?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(privacyConsents).values({
    userId: data.userId ?? null,
    guestSessionId: data.guestSessionId ?? null,
    consentType: data.consentType,
    granted: data.granted ? 1 : 0,
    ipHash: data.ipHash ?? null,
    userAgent: data.userAgent ?? null,
    documentVersion: data.documentVersion ?? "1.0",
  });
}

export async function getUserConsents(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(privacyConsents).where(eq(privacyConsents.userId, userId));
}

export async function deleteUserConsents(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(privacyConsents).where(eq(privacyConsents.userId, userId));
}


// ---- Catalog Matching Engine ----

export interface CatalogMatchParams {
  /** Gender of the user: male, female */
  gender: string;
  /** Category of the item to upgrade (e.g. "tops", "pants", "shoes") */
  category: string;
  /** Sub-category for finer matching (e.g. "polo", "jeans") */
  subCategory?: string;
  /** The occasion the user is dressing for */
  occasion?: string;
  /** Style preferences (e.g. ["casual", "smart-casual"]) */
  styles?: string[];
  /** Color preferences or colors to complement */
  colors?: string[];
  /** Budget tier preference: budget, mid, premium, luxury */
  budgetTier?: string;
  /** Season: summer, winter, all-season */
  season?: string;
  /** IDs to exclude (already recommended) */
  excludeIds?: number[];
  /** Max items to return */
  limit?: number;
  /** Detected season from photo: cold, warm, transitional */
  detectedSeason?: "cold" | "warm" | "transitional";
  /** Original sub-category from the photo (for length preservation rule) */
  originalSubCategory?: string;
  /** Stage 59: ALL colors detected in the user's outfit (for color distance scoring) */
  userPaletteColors?: string[];
  /** Stage 60: ALL materials detected in the user's outfit */
  userPaletteMaterials?: string[];
  /** Stage 60: ALL patterns detected in the user's outfit */
  userPalettePatterns?: string[];
}

/**
 * Smart catalog matching — finds the best upgrade items from the catalog.
 * Uses a scoring system based on multiple criteria:
 * - Category match (required)
 * - Gender match (required)
 * - Occasion relevance (high weight)
 * - Style compatibility (medium weight)
 * - Color harmony (medium weight)
 * - Budget tier (low weight)
 * - Trend relevance (low weight)
 * - Has image (bonus)
 */
export async function findCatalogMatches(params: CatalogMatchParams): Promise<CatalogItem[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    gender,
    category,
    subCategory,
    occasion,
    styles = [],
    colors = [],
    budgetTier,
    season,
    excludeIds = [],
    limit = 5,
  } = params;

  // Map gender to DB values
  const genderValue = gender.toLowerCase().includes("female") || gender.toLowerCase().includes("נשי") || gender.toLowerCase().includes("woman") ? "female" : "male";

  // Build conditions
  const conditions = [
    eq(catalogItems.gender, genderValue),
    eq(catalogItems.category, category),
    eq(catalogItems.isActive, 1),
    sql`${catalogItems.imageUrl} IS NOT NULL`, // Stage 51i: Only items with images
  ];

  if (excludeIds.length > 0) {
    // Can't use NOT IN with empty array
    conditions.push(sql`${catalogItems.id} NOT IN (${sql.raw(excludeIds.join(","))})`);
  }

  // Fetch candidates (broader query, then score in JS)
  const candidates = await db
    .select()
    .from(catalogItems)
    .where(and(...conditions))
    .limit(100); // Get more candidates for scoring

  if (candidates.length === 0) {
    // Fallback: try without category filter but with gender
    const fallback = await db
      .select()
      .from(catalogItems)
      .where(and(
        eq(catalogItems.gender, genderValue),
        eq(catalogItems.isActive, 1),
        sql`${catalogItems.imageUrl} IS NOT NULL`, // Stage 51i: Only items with images
      ))
      .limit(50);
    return scoreCandidates(fallback, params).slice(0, limit);
  }

  return scoreCandidates(candidates, params).slice(0, limit);
}

// ── Stage 51h: Seasonality, Length Preservation, and Occasion Dress Code rules ──

/** Sub-categories classified as "short" (warm-weather / casual) */
const SHORT_ITEMS = new Set(["shorts", "tank top", "crop top", "sandals", "sandal", "sands", "mini dress", "mini skirt"]);
/** Sub-categories classified as "long/warm" (cold-weather) */
const COLD_ITEMS = new Set(["parka", "puffer", "trench coat", "sweater", "hoodie", "boots", "scarf", "cardigan"]);

/** Map from detected season → forbidden sub-categories */
const SEASON_FORBIDDEN: Record<string, Set<string>> = {
  cold: new Set(["shorts", "tank top", "crop top", "sandals", "sandal", "sands", "mini dress", "mini skirt"]),
  warm: new Set(["parka", "puffer", "trench coat", "scarf"]),
  // transitional: no hard blocks
};

/** Length hierarchy — higher number = longer. NEVER suggest going from higher to lower. */
const LENGTH_RANK: Record<string, number> = {
  // Pants
  "shorts": 1, "culottes": 2, "joggers": 3, "cargo pants": 3,
  "chinos": 4, "jeans": 4, "dress pants": 4, "wide-leg pants": 4, "leggings": 4,
  // Tops
  "tank top": 1, "crop top": 1, "bodysuit": 2,
  "t-shirt": 3, "polo": 3, "henley": 3, "blouse": 3, "shirt": 3, "linen shirt": 3,
  "dress shirt": 4, "sweater": 5, "hoodie": 5, "cardigan": 5,
  // Dresses
  "mini dress": 1, "mini skirt": 1, "midi dress": 2, "midi skirt": 2, "pleated skirt": 2,
  "maxi dress": 3, "wrap dress": 2,
  // Shoes
  "sandals": 1, "sandal": 1, "sands": 1, "flats": 2, "mules": 2,
  "sneakers": 3, "loafers": 3, "dress shoes": 4, "heels": 3, "boots": 5,
};

/** Occasion dress code violations — these combos get -100 penalty */
const OCCASION_DRESS_CODE: Record<string, Set<string>> = {
  work: new Set(["shorts", "tank top", "crop top", "sandals", "sandal", "sands", "joggers", "hoodie", "mini dress", "mini skirt"]),
  wedding: new Set(["jeans", "sneakers", "t-shirt", "shorts", "tank top", "crop top", "joggers", "hoodie", "cargo pants"]),
  date: new Set(["joggers", "tank top", "cargo pants", "sandals", "sandal", "sands", "parka", "puffer"]),
  formal: new Set(["jeans", "sneakers", "hoodie", "shorts", "t-shirt", "tank top", "crop top", "joggers", "cargo pants", "sandals", "sandal"]),
  shabbat: new Set(["shorts", "tank top", "crop top", "joggers"]),
};

// ── Stage 59: Color Distance Scoring ──
// Map color names → RGB for Euclidean distance calculations
const COLOR_RGB: Record<string, [number, number, number]> = {
  black: [0, 0, 0], white: [255, 255, 255], navy: [0, 31, 63], "navy blue": [0, 31, 63],
  "dark blue": [0, 0, 139], red: [204, 0, 0], burgundy: [128, 0, 32], maroon: [128, 0, 0],
  beige: [245, 245, 220], camel: [193, 154, 107], tan: [210, 180, 140],
  charcoal: [54, 69, 79], "charcoal gray": [54, 69, 79], grey: [128, 128, 128], gray: [128, 128, 128],
  "dark grey": [64, 64, 64], "dark gray": [64, 64, 64], "light grey": [192, 192, 192], "light gray": [192, 192, 192],
  "light blue": [173, 216, 230], "royal blue": [65, 105, 225], blue: [0, 0, 204],
  "forest green": [34, 139, 34], "dark green": [0, 100, 0], green: [0, 128, 0],
  olive: [128, 128, 0], "olive green": [85, 107, 47], khaki: [195, 176, 145],
  brown: [139, 69, 19], "dark brown": [101, 67, 33], cream: [255, 253, 208],
  "off-white": [250, 249, 246], ecru: [194, 178, 128], ivory: [255, 255, 240],
  pink: [255, 192, 203], "light pink": [255, 182, 193], wine: [114, 47, 55],
  coral: [255, 127, 80], orange: [255, 140, 0], yellow: [255, 215, 0],
  purple: [128, 0, 128], lavender: [230, 230, 250], teal: [0, 128, 128],
  turquoise: [64, 224, 208], sand: [194, 178, 128], stone: [146, 142, 133],
  rust: [183, 65, 14], salmon: [250, 128, 114], peach: [255, 218, 185],
  mint: [152, 255, 152], sage: [178, 172, 136], emerald: [80, 200, 120],
  cobalt: [0, 71, 171], indigo: [75, 0, 130], mauve: [224, 176, 255],
  plum: [142, 69, 133], taupe: [72, 60, 50], mocha: [150, 121, 105],
  chocolate: [123, 63, 0], copper: [184, 115, 51], gold: [255, 215, 0],
  silver: [192, 192, 192], rose: [255, 0, 127], magenta: [255, 0, 255],
  "grey marl": [158, 158, 158],
};

/** Complementary color pairs — these are fashion-approved pairings that score a bonus */
const COMPLEMENTARY_PAIRS: [string, string][] = [
  // Classic neutrals pairings
  ["black", "white"], ["navy", "white"], ["navy", "cream"], ["navy", "beige"],
  ["navy", "tan"], ["navy", "camel"], ["charcoal", "white"], ["charcoal", "cream"],
  ["grey", "white"], ["grey", "navy"], ["grey", "burgundy"], ["grey", "blue"],
  ["black", "grey"], ["black", "charcoal"], ["black", "navy"],
  // Earth tones
  ["brown", "beige"], ["brown", "cream"], ["brown", "tan"], ["brown", "white"],
  ["camel", "navy"], ["camel", "white"], ["camel", "cream"], ["camel", "grey"],
  ["khaki", "navy"], ["khaki", "white"], ["olive", "cream"], ["olive", "tan"],
  ["tan", "navy"], ["tan", "white"],
  // Accent pairings
  ["burgundy", "navy"], ["burgundy", "grey"], ["burgundy", "cream"],
  ["wine", "navy"], ["wine", "grey"],
  ["teal", "cream"], ["teal", "grey"],
];

function colorNameToRgb(name: string): [number, number, number] | null {
  return COLOR_RGB[name.toLowerCase().trim()] || null;
}

function colorDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  // Euclidean distance in RGB space (0 = identical, ~441 = max)
  return Math.sqrt(
    (rgb1[0] - rgb2[0]) ** 2 +
    (rgb1[1] - rgb2[1]) ** 2 +
    (rgb1[2] - rgb2[2]) ** 2
  );
}

function isComplementaryPair(color1: string, color2: string): boolean {
  const c1 = color1.toLowerCase().trim();
  const c2 = color2.toLowerCase().trim();
  return COMPLEMENTARY_PAIRS.some(([a, b]) =>
    (a === c1 && b === c2) || (a === c2 && b === c1)
  );
}

// ── Stage 60: Material Compatibility Groups ──
// Materials grouped by "texture family" — items within the same group pair well together.
// Cross-group pairings get a smaller bonus; clashing combos get a penalty.
const MATERIAL_GROUPS: Record<string, string[]> = {
  "natural-light": ["cotton", "linen", "chambray", "poplin", "jersey", "pique"],
  "natural-warm": ["wool", "cashmere", "merino", "flannel", "tweed", "mohair", "alpaca"],
  "structured": ["denim", "canvas", "twill", "gabardine", "chino"],
  "luxury": ["silk", "satin", "velvet", "charmeuse", "organza", "crepe"],
  "leather-family": ["leather", "suede", "nubuck", "faux leather", "vegan leather"],
  "knit": ["knit", "ribbed knit", "cable knit", "french terry", "waffle knit"],
  "synthetic": ["polyester", "nylon", "synthetic", "technical", "tech", "performance", "spandex", "elastane"],
  "blend": ["cotton blend", "poly blend", "wool blend"],
};

/** Material combos that look intentionally wrong — penalty */
const MATERIAL_CLASHES: [string, string][] = [
  ["silk", "denim"], ["satin", "denim"], ["velvet", "canvas"],
  ["silk", "canvas"], ["satin", "canvas"], ["velvet", "denim"],
  ["organza", "denim"], ["organza", "canvas"],
];

/** Good cross-group pairings — bonus */
const MATERIAL_GOOD_PAIRS: [string, string][] = [
  ["cotton", "denim"], ["cotton", "leather"], ["cotton", "suede"],
  ["linen", "leather"], ["linen", "suede"], ["wool", "leather"],
  ["wool", "suede"], ["cashmere", "silk"], ["cashmere", "leather"],
  ["denim", "leather"], ["denim", "suede"], ["denim", "cotton"],
  ["knit", "denim"], ["knit", "leather"], ["knit", "wool"],
  ["silk", "wool"], ["silk", "cashmere"], ["flannel", "denim"],
  ["jersey", "denim"], ["jersey", "leather"],
];

function getMaterialGroup(material: string): string | null {
  const m = material.toLowerCase().trim();
  for (const [group, members] of Object.entries(MATERIAL_GROUPS)) {
    if (members.some(mem => m.includes(mem) || mem.includes(m))) return group;
  }
  return null;
}

function isMaterialClash(m1: string, m2: string): boolean {
  const a = m1.toLowerCase().trim();
  const b = m2.toLowerCase().trim();
  return MATERIAL_CLASHES.some(([x, y]) =>
    (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))
  );
}

function isMaterialGoodPair(m1: string, m2: string): boolean {
  const a = m1.toLowerCase().trim();
  const b = m2.toLowerCase().trim();
  return MATERIAL_GOOD_PAIRS.some(([x, y]) =>
    (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))
  );
}

// ── Stage 60: Pattern Compatibility ──
// Patterns that clash when worn together
const PATTERN_CLASHES: Set<string> = new Set([
  "stripes+plaid", "plaid+stripes",
  "stripes+checks", "checks+stripes",
  "plaid+checks", "checks+plaid",
  "floral+plaid", "plaid+floral",
  "animal print+floral", "floral+animal print",
  "animal print+plaid", "plaid+animal print",
  "geometric+floral", "floral+geometric",
  "paisley+floral", "floral+paisley",
  "paisley+plaid", "plaid+paisley",
  "camo+floral", "floral+camo",
  "camo+plaid", "plaid+camo",
  "camo+stripes", "stripes+camo",
]);

/** Patterns that pair well with everything */
const UNIVERSAL_PATTERNS = new Set(["solid", "plain", ""]);

/** Patterns that pair well with solids but not with other patterns */
const STATEMENT_PATTERNS = new Set([
  "stripes", "plaid", "checks", "floral", "geometric",
  "animal print", "paisley", "camo", "abstract", "graphic",
  "houndstooth", "polka dots", "tropical",
]);

function isPatternClash(p1: string, p2: string): boolean {
  const a = p1.toLowerCase().trim();
  const b = p2.toLowerCase().trim();
  if (UNIVERSAL_PATTERNS.has(a) || UNIVERSAL_PATTERNS.has(b)) return false;
  return PATTERN_CLASHES.has(`${a}+${b}`);
}

function scoreCandidates(candidates: CatalogItem[], params: CatalogMatchParams): CatalogItem[] {
  const {
    subCategory,
    occasion,
    styles = [],
    colors = [],
    budgetTier,
    season,
    detectedSeason,
    originalSubCategory,
    userPaletteColors = [],
    userPaletteMaterials = [],
    userPalettePatterns = [],
  } = params;

  // Pre-compute user palette RGB values for distance scoring
  const userPaletteRgb: Array<{ name: string; rgb: [number, number, number] }> = [];
  for (const c of userPaletteColors) {
    const rgb = colorNameToRgb(c);
    if (rgb) userPaletteRgb.push({ name: c.toLowerCase().trim(), rgb });
  }

  // Stage 60: Pre-compute user material groups
  const userMaterialGroups = new Set<string>();
  for (const m of userPaletteMaterials) {
    const g = getMaterialGroup(m);
    if (g) userMaterialGroups.add(g);
  }

  // Stage 60: Count statement patterns in user's outfit
  const userStatementPatterns = userPalettePatterns.filter(p => STATEMENT_PATTERNS.has(p.toLowerCase().trim()));
  const userHasStatementPattern = userStatementPatterns.length > 0;

  const scored = candidates.map(item => {
    let score = 0;
    const itemSub = item.subCategory.toLowerCase();

    // ── IRON RULE: Length Preservation (never downgrade length) ──
    if (originalSubCategory) {
      const originalRank = LENGTH_RANK[originalSubCategory.toLowerCase()] ?? 3;
      const candidateRank = LENGTH_RANK[itemSub] ?? 3;
      // Same category group check: only compare within same category
      if (item.category === params.category && candidateRank < originalRank) {
        score -= 100; // Hard block — never suggest shorter
      }
    }

    // ── Seasonality Rule ──
    if (detectedSeason && detectedSeason !== "transitional") {
      const forbidden = SEASON_FORBIDDEN[detectedSeason];
      if (forbidden && forbidden.has(itemSub)) {
        score -= 50; // Season conflict
      }
      // Bonus for season-appropriate items
      const itemSeason = (item.season || "").toLowerCase();
      if (detectedSeason === "cold" && (itemSeason === "winter" || itemSeason === "fall-winter" || itemSeason === "autumn-winter")) {
        score += 8;
      } else if (detectedSeason === "warm" && itemSeason === "summer") {
        score += 8;
      } else if (itemSeason === "all-season" || itemSeason === "spring-fall") {
        score += 3;
      }
    }

    // ── Occasion Dress Code Rule ──
    if (occasion) {
      const occasionLower = occasion.toLowerCase();
      const dressCodeViolations = OCCASION_DRESS_CODE[occasionLower];
      if (dressCodeViolations && dressCodeViolations.has(itemSub)) {
        score -= 100; // Hard block — dress code violation
      }
    }

    // Sub-category match (high)
    if (subCategory && item.subCategory.toLowerCase() === subCategory.toLowerCase()) {
      score += 15;
    }

    // Occasion match (critical — strongest signal)
    if (occasion) {
      const occasionTags = Array.isArray(item.occasionTags) ? item.occasionTags : [];
      const occasionLower = occasion.toLowerCase();
      const tagStrings = occasionTags.map((t: any) => String(t).toLowerCase());
      const hasDirectMatch = tagStrings.some(t => t.includes(occasionLower));
      const hasDailyTag = tagStrings.some(t => t === "daily" || t === "all" || t === "casual");
      const isSportItem = tagStrings.some(t => t === "sport" || t === "gym");
      const isNonSportOccasion = !(["sport", "gym"].includes(occasionLower));

      if (hasDirectMatch) {
        score += 30; // Strong boost for direct occasion match
      } else if (hasDailyTag && isNonSportOccasion) {
        score += 8; // Moderate boost for versatile "daily" items
      }

      // PENALTY: sport/gym items should NOT appear for non-sport occasions
      if (isSportItem && isNonSportOccasion && !hasDirectMatch) {
        score -= 40; // Heavy penalty — sport items for coffee/date/work is wrong
      }

      // PENALTY: items with NO matching occasion tag get a small penalty
      if (!hasDirectMatch && !hasDailyTag) {
        score -= 10;
      }
    }

    // Style match (medium)
    if (styles.length > 0) {
      const itemStyles = Array.isArray(item.styleTags) ? item.styleTags.map((s: any) => String(s).toLowerCase()) : [];
      const matchCount = styles.filter(s => itemStyles.includes(s.toLowerCase())).length;
      score += matchCount * 8;
    }

    // Color harmony (medium) — check if item color complements requested colors
    if (colors.length > 0) {
      const itemColor = item.color.toLowerCase();
      const colorGroups = Array.isArray(item.colorHarmonyGroups) ? item.colorHarmonyGroups.map((c: any) => String(c).toLowerCase()) : [];
      // Direct color match
      if (colors.some(c => itemColor.includes(c.toLowerCase()) || c.toLowerCase().includes(itemColor))) {
        score += 10;
      }
      // Harmony group match
      if (colors.some(c => colorGroups.some(g => g.includes(c.toLowerCase())))) {
        score += 6;
      }
    }

    // ── Stage 59: Color Distance Scoring (user's full palette) ──
    if (userPaletteRgb.length > 0) {
      const itemColor = item.color.toLowerCase().trim();
      const itemRgb = colorNameToRgb(itemColor);

      if (itemRgb) {
        // 1. Find minimum distance to any color in user's palette
        let minDist = Infinity;
        for (const uc of userPaletteRgb) {
          const d = colorDistance(itemRgb, uc.rgb);
          if (d < minDist) minDist = d;
        }

        // 2. Score based on distance:
        //    Very close (< 60): strong bonus (+12) — same color family
        //    Close (60-120): moderate bonus (+6) — related shade
        //    Medium (120-200): neutral (0) — different but not clashing
        //    Far (200-300): penalty (-8) — unrelated color
        //    Very far (> 300): strong penalty (-15) — clashing color
        if (minDist < 60) {
          score += 12;
        } else if (minDist < 120) {
          score += 6;
        } else if (minDist < 200) {
          // neutral — no change
        } else if (minDist < 300) {
          score -= 8;
        } else {
          score -= 15;
        }

        // 3. Complementary pair bonus: check if item color forms a known good pair with any user color
        let hasComplementary = false;
        for (const uc of userPaletteRgb) {
          if (isComplementaryPair(itemColor, uc.name)) {
            hasComplementary = true;
            break;
          }
        }
        if (hasComplementary) {
          score += 15; // Strong bonus for fashion-approved complementary pairing
        }

        // 4. Same-color-family bonus: if the item is the same base color as something the user wears
        //    (e.g. user wears "navy", item is "dark blue" → same family)
        const itemBaseColor = itemColor.replace(/^(dark|light|deep|pale|bright)\s+/, "");
        for (const uc of userPaletteRgb) {
          const userBaseColor = uc.name.replace(/^(dark|light|deep|pale|bright)\s+/, "");
          if (itemBaseColor === userBaseColor && itemColor !== uc.name) {
            score += 8; // Same family, different shade — good variation
            break;
          }
        }
      }
    }

    // ── Stage 60: Material Compatibility Scoring ──
    if (userPaletteMaterials.length > 0) {
      const itemMaterial = (item.material || "").toLowerCase().trim();
      if (itemMaterial) {
        const itemGroup = getMaterialGroup(itemMaterial);

        // 1. Check for material clashes with any user material
        let hasClash = false;
        let hasGoodPair = false;
        let hasSameGroup = false;
        for (const um of userPaletteMaterials) {
          if (isMaterialClash(itemMaterial, um)) { hasClash = true; break; }
          if (isMaterialGoodPair(itemMaterial, um)) hasGoodPair = true;
          if (itemGroup && getMaterialGroup(um) === itemGroup) hasSameGroup = true;
        }

        if (hasClash) {
          score -= 12; // Fabric clash — silk+denim etc.
        } else if (hasGoodPair) {
          score += 10; // Known good cross-group pairing (cotton+leather, wool+suede, etc.)
        } else if (hasSameGroup) {
          score += 6; // Same texture family — cohesive feel
        }
        // If no match at all, neutral (0) — unknown combo is not penalized
      }
    }

    // ── Stage 60: Pattern Compatibility Scoring ──
    if (userPalettePatterns.length > 0) {
      const itemPattern = (item.pattern || "solid").toLowerCase().trim();
      const isItemSolid = UNIVERSAL_PATTERNS.has(itemPattern);
      const isItemStatement = STATEMENT_PATTERNS.has(itemPattern);

      // 1. If user already wears a statement pattern, prefer solid upgrades
      if (userHasStatementPattern) {
        if (isItemSolid) {
          score += 8; // Solid pairs safely with any existing pattern
        } else if (isItemStatement) {
          // Check for specific pattern clashes
          let clashes = false;
          for (const up of userStatementPatterns) {
            if (isPatternClash(itemPattern, up)) { clashes = true; break; }
          }
          if (clashes) {
            score -= 15; // Hard pattern clash (stripes+plaid, floral+camo, etc.)
          } else {
            score -= 5; // Two statement patterns = risky even without explicit clash
          }
        }
      } else {
        // User wears all solids — a single statement pattern can add interest
        if (isItemStatement) {
          score += 4; // Mild bonus for adding visual interest to an all-solid outfit
        }
      }
    }

    // Budget tier match (low)
    if (budgetTier && item.budgetTier === budgetTier) {
      score += 5;
    }

    // Season match (low)
    if (season) {
      if (item.season === "all-season" || item.season === season) {
        score += 3;
      }
    }

    // Trend relevance bonus
    if (item.trendRelevance === "high") score += 4;
    else if (item.trendRelevance === "medium") score += 2;

    // Has image bonus (important for UX)
    if (item.imageUrl) score += 10;

    return { item, score };
  });

  // Sort by score descending, then randomize ties
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5; // Random tiebreak for variety
  });

  return scored.map(s => s.item);
}

/**
 * Find catalog items that pair well with a given item category.
 * Used for outfit suggestions.
 */
export async function findPairingItems(
  gender: string,
  pairCategories: string[],
  occasion?: string,
  styles?: string[],
  excludeIds?: number[],
  limit = 2
): Promise<CatalogItem[]> {
  const results: CatalogItem[] = [];
  const usedIds = new Set(excludeIds || []);

  for (const cat of pairCategories) {
    const items = await findCatalogMatches({
      gender,
      category: cat,
      occasion,
      styles,
      excludeIds: [...usedIds],
      limit: 1,
    });
    if (items.length > 0) {
      results.push(items[0]);
      usedIds.add(items[0].id);
    }
    if (results.length >= limit) break;
  }

  return results;
}
