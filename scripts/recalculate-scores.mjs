/**
 * Retroactive score recalculation script.
 * Recalculates overallScore for all existing reviews, guest sessions, 
 * story mentions, and feed posts using the new weighted scoring system.
 * 
 * Weights:
 * - High (1.0): Item Quality, Fit, Color Palette, Age & Style Match
 * - Medium (0.8): Footwear, Brand Recognition
 * - Low (0.5): Layering, Accessories & Jewelry
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const categoryWeights = {
  'איכות הפריטים': 1.0, 'item quality': 1.0,
  'התאמת גזרה': 1.0, 'fit': 1.0,
  'צבעוניות': 1.0, 'color palette': 1.0,
  'התאמה לגיל ולסגנון': 1.0, 'age & style match': 1.0,
  'נעליים': 0.8, 'footwear': 0.8,
  'זיהוי מותגים': 0.8, 'brand recognition': 0.8,
  'שכבתיות (layering)': 0.5, 'שכבתיות': 0.5, 'layering': 0.5,
  'אקססוריז ותכשיטים': 0.5, 'accessories & jewelry': 0.5,
};

function calculateWeightedScore(scores) {
  if (!scores || !Array.isArray(scores)) return null;
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const cat of scores) {
    if (cat.score !== null && cat.score !== undefined && typeof cat.score === 'number') {
      const catLower = (cat.category || '').toLowerCase();
      const weight = categoryWeights[catLower] ?? 1.0;
      weightedSum += cat.score * weight;
      totalWeight += weight;
    }
  }
  
  if (totalWeight === 0) return null;
  
  let result = Math.round((weightedSum / totalWeight) * 10) / 10;
  if (result < 5) result = 5;
  return result;
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log("Connected to database. Starting retroactive score recalculation...\n");
  
  // 1. Recalculate reviews
  const [reviews] = await connection.execute(
    "SELECT id, overallScore, analysisJson FROM reviews WHERE analysisJson IS NOT NULL AND status = 'completed'"
  );
  console.log(`Found ${reviews.length} completed reviews to process.`);
  
  let reviewsUpdated = 0;
  let reviewsChanged = 0;
  for (const review of reviews) {
    try {
      const analysis = typeof review.analysisJson === 'string' 
        ? JSON.parse(review.analysisJson) 
        : review.analysisJson;
      
      if (!analysis || !analysis.scores) continue;
      
      const newScore = calculateWeightedScore(analysis.scores);
      if (newScore === null) continue;
      
      const oldScore = review.overallScore;
      const oldAnalysisScore = analysis.overallScore;
      
      // Update both the DB column and the JSON
      analysis.overallScore = newScore;
      
      await connection.execute(
        "UPDATE reviews SET overallScore = ?, analysisJson = ? WHERE id = ?",
        [Math.round(newScore), JSON.stringify(analysis), review.id]
      );
      
      reviewsUpdated++;
      if (oldScore !== Math.round(newScore)) {
        reviewsChanged++;
        console.log(`  Review #${review.id}: ${oldScore} → ${Math.round(newScore)} (JSON: ${oldAnalysisScore} → ${newScore})`);
      }
    } catch (err) {
      console.error(`  Error processing review #${review.id}:`, err.message);
    }
  }
  console.log(`Reviews: ${reviewsUpdated} processed, ${reviewsChanged} scores changed.\n`);
  
  // 2. Recalculate guest sessions
  const [guestSessions] = await connection.execute(
    "SELECT id, overallScore, analysisJson FROM guestSessions WHERE analysisJson IS NOT NULL AND status = 'completed'"
  );
  console.log(`Found ${guestSessions.length} completed guest sessions to process.`);
  
  let guestUpdated = 0;
  let guestChanged = 0;
  for (const session of guestSessions) {
    try {
      const analysis = typeof session.analysisJson === 'string'
        ? JSON.parse(session.analysisJson)
        : session.analysisJson;
      
      if (!analysis || !analysis.scores) continue;
      
      const newScore = calculateWeightedScore(analysis.scores);
      if (newScore === null) continue;
      
      const oldScore = session.overallScore;
      analysis.overallScore = newScore;
      
      await connection.execute(
        "UPDATE guestSessions SET overallScore = ?, analysisJson = ? WHERE id = ?",
        [Math.round(newScore), JSON.stringify(analysis), session.id]
      );
      
      guestUpdated++;
      if (oldScore !== Math.round(newScore)) {
        guestChanged++;
        console.log(`  Guest #${session.id}: ${oldScore} → ${Math.round(newScore)}`);
      }
    } catch (err) {
      console.error(`  Error processing guest session #${session.id}:`, err.message);
    }
  }
  console.log(`Guest sessions: ${guestUpdated} processed, ${guestChanged} scores changed.\n`);
  
  // 3. Recalculate story mentions
  const [storyMentions] = await connection.execute(
    "SELECT id, overallScore, analysisJson FROM storyMentions WHERE analysisJson IS NOT NULL AND status IN ('completed', 'dm_sent')"
  );
  console.log(`Found ${storyMentions.length} completed story mentions to process.`);
  
  let storyUpdated = 0;
  let storyChanged = 0;
  for (const mention of storyMentions) {
    try {
      const analysis = typeof mention.analysisJson === 'string'
        ? JSON.parse(mention.analysisJson)
        : mention.analysisJson;
      
      if (!analysis || !analysis.scores) continue;
      
      const newScore = calculateWeightedScore(analysis.scores);
      if (newScore === null) continue;
      
      const oldScore = mention.overallScore;
      analysis.overallScore = newScore;
      
      await connection.execute(
        "UPDATE storyMentions SET overallScore = ?, analysisJson = ? WHERE id = ?",
        [Math.round(newScore), JSON.stringify(analysis), mention.id]
      );
      
      storyUpdated++;
      if (oldScore !== Math.round(newScore)) {
        storyChanged++;
        console.log(`  Story #${mention.id}: ${oldScore} → ${Math.round(newScore)}`);
      }
    } catch (err) {
      console.error(`  Error processing story mention #${mention.id}:`, err.message);
    }
  }
  console.log(`Story mentions: ${storyUpdated} processed, ${storyChanged} scores changed.\n`);
  
  // 4. Update feed posts to match their source review scores
  const [feedPosts] = await connection.execute(
    "SELECT fp.id, fp.overallScore, fp.reviewId, r.overallScore as reviewScore FROM feedPosts fp JOIN reviews r ON fp.reviewId = r.id"
  );
  console.log(`Found ${feedPosts.length} feed posts to sync.`);
  
  let feedUpdated = 0;
  let feedChanged = 0;
  for (const post of feedPosts) {
    try {
      if (post.overallScore !== post.reviewScore) {
        await connection.execute(
          "UPDATE feedPosts SET overallScore = ? WHERE id = ?",
          [post.reviewScore, post.id]
        );
        feedChanged++;
        console.log(`  Feed post #${post.id}: ${post.overallScore} → ${post.reviewScore}`);
      }
      feedUpdated++;
    } catch (err) {
      console.error(`  Error processing feed post #${post.id}:`, err.message);
    }
  }
  console.log(`Feed posts: ${feedUpdated} processed, ${feedChanged} scores synced.\n`);
  
  // Summary
  console.log("=== SUMMARY ===");
  console.log(`Reviews: ${reviewsChanged}/${reviewsUpdated} changed`);
  console.log(`Guest sessions: ${guestChanged}/${guestUpdated} changed`);
  console.log(`Story mentions: ${storyChanged}/${storyUpdated} changed`);
  console.log(`Feed posts: ${feedChanged}/${feedUpdated} synced`);
  console.log("\nDone!");
  
  await connection.end();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
