import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createReview, getReviewById, getReviewsByUserId, updateReviewAnalysis, updateReviewStatus, getUserProfile, upsertUserProfile, deleteAllReviewsByUserId, deleteUserAccount, addWardrobeItems, getWardrobeByUserId, deleteWardrobeItem, clearWardrobe, updateWardrobeItemImage, publishToFeed, getFeedPosts, deleteFeedPost, likeFeedPost, unlikeFeedPost, saveFeedPost, unsaveFeedPost, getUserFeedInteractions, getSavedPosts, isReviewPublished, followUser, unfollowUser, getFollowingIds, isFollowing, getFollowingFeedPosts, getFollowerCount, getFollowingCount, createNewPostNotifications, getUserNotifications, getUnreadNotificationCount, markNotificationsRead, getAllReviews, getAllUsers, getAdminStats, adminDeleteReview, getReviewCountsByUser, getFeedPostCountsByUser, addFeedComment, getFeedComments, getFeedCommentCount, deleteFeedComment, setWardrobeShareToken, getWardrobeByShareToken, getWardrobeShareToken, createCommentNotification, createReplyNotification, createLikeNotification, saveFixMyLookResult, getFixMyLookResult, getOccasionCounts, createGuestSession, getGuestSessionById, hasGuestUsedAnalysis, updateGuestSessionAnalysis, updateGuestSessionStatus, getGuestAnalytics, getAllGuestSessions, trackDemoView, markDemoSignupClick, getAllDemoViews, trackPageView, getFunnelStats, getDailyFunnelStats, getGuestAnalysisCount, saveGuestProfile, getGuestProfile, saveGuestEmail, getGuestWardrobe, getGuestSessionIdsByFingerprint, addGuestWardrobeItems, deleteGuestWardrobeItem, migrateGuestToUser, deleteReviewById, deleteGuestSession, upsertIgConnection, getIgConnection, disconnectIg, getStoryMentionsByUserId, getStoryMentionStats, getStyleDiary, saveStyleDiaryEntry, findUserByPhoneNumber, getGuestSessionByToken, markGuestSessionViewed, isPhoneTaken, logConsent, getUserConsents, getReviewByShareToken, setReviewShareToken, adminUpdateUser, getUserById } from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";
import type { FashionAnalysis } from "../shared/fashionTypes";
import { POPULAR_INFLUENCERS, BRAND_URLS, COUNTRY_STORE_MAP, COUNTRY_LOCAL_BRANDS, filterStoresForUser } from "../shared/fashionTypes";
import { enrichAnalysisWithProductImages, generateImagesForImprovement, generateOutfitLookFromMetadata } from "./productImages";
import { sendWhatsAppWelcome } from "./whatsapp";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { generateImage } from "./_core/imageGeneration";
import type { OutfitSuggestion, Improvement, ShoppingLink } from "../shared/fashionTypes";
import { getDoctrineForStage1, getDoctrineForStage2, getDoctrineForFixMyLook, getDoctrineForPersonalization } from "../shared/fashionDoctrine";
import { buildTasteProfileContext, formatTasteProfileForPrompt, formatWardrobeForStage2 } from "./tasteProfileContext";
import probeImageSize from "probe-image-size";

const ANALYSIS_CONCURRENCY_LIMIT = 2;
const ANALYSIS_QUEUE_MAX_WAITERS = 40;
const ANALYSIS_QUEUE_WAIT_TIMEOUT_MS = 12000;
const MAX_WARDROBE_ITEMS_FOR_ANALYSIS = 60;
const MAX_WARDROBE_ITEMS_FOR_MATCHING = 40;
let activeAnalysisJobs = 0;
const waitingAnalysisResolvers: Array<() => void> = [];

async function withAnalysisSlot<T>(jobLabel: string, fn: () => Promise<T>): Promise<T> {
  if (activeAnalysisJobs >= ANALYSIS_CONCURRENCY_LIMIT) {
    if (waitingAnalysisResolvers.length >= ANALYSIS_QUEUE_MAX_WAITERS) {
      throw new Error("ANALYSIS_QUEUE_BUSY");
    }
    await new Promise<void>((resolve, reject) => {
      let done = false;
      const resolver = () => {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        resolve();
      };
      waitingAnalysisResolvers.push(resolver);
      const timeoutId = setTimeout(() => {
        if (done) return;
        done = true;
        const idx = waitingAnalysisResolvers.indexOf(resolver);
        if (idx >= 0) waitingAnalysisResolvers.splice(idx, 1);
        reject(new Error("ANALYSIS_QUEUE_TIMEOUT"));
      }, ANALYSIS_QUEUE_WAIT_TIMEOUT_MS);
    });
  }

  activeAnalysisJobs += 1;
  try {
    return await fn();
  } finally {
    activeAnalysisJobs = Math.max(0, activeAnalysisJobs - 1);
    const next = waitingAnalysisResolvers.shift();
    if (next) next();
    if (process.env.NODE_ENV !== "test") {
      console.log(`[AnalysisQueue] ${jobLabel} done. active=${activeAnalysisJobs} waiting=${waitingAnalysisResolvers.length}`);
    }
  }
}

type ClothingCategory = "top" | "bottom" | "outerwear" | "dress" | "onepiece" | "shoes" | "accessory" | "other";

/**
 * Build a rich, structured description of a FashionItem using all available metadata.
 * Used in image generation prompts for maximum accuracy.
 * Example output: "slim-fit cotton crew-neck short-sleeve solid navy blue t-shirt by Zara"
 */
function buildRichItemDescription(item: { name: string; color?: string; brand?: string; garmentType?: string; subCategory?: string; preciseColor?: string; secondaryColor?: string; pattern?: string; material?: string; texture?: string; fit?: string; garmentLength?: string; sleeveLength?: string; neckline?: string; closure?: string; details?: string; style?: string; }): string {
  const parts: string[] = [];
  // Fit (slim, oversized, tailored...)
  if (item.fit && item.fit !== 'regular') parts.push(item.fit);
  // Material (cotton, denim, leather...)
  if (item.material) parts.push(item.material);
  // Texture if distinctive
  if (item.texture && !['smooth', 'matte'].includes(item.texture)) parts.push(item.texture);
  // Neckline (crew-neck, v-neck...)
  if (item.neckline && item.neckline !== 'n/a') parts.push(item.neckline);
  // Sleeve length
  if (item.sleeveLength && item.sleeveLength !== 'n/a') parts.push(`${item.sleeveLength}-sleeve`);
  // Garment length if notable
  if (item.garmentLength && !['regular', 'n/a'].includes(item.garmentLength)) parts.push(item.garmentLength);
  // Pattern
  if (item.pattern && item.pattern !== 'solid') parts.push(item.pattern);
  // Color — prefer preciseColor, fall back to color
  const color = item.preciseColor || item.color;
  if (color) parts.push(color);
  // Garment type — prefer garmentType, fall back to name
  parts.push(item.garmentType || item.subCategory || item.name);
  // Secondary color note
  if (item.secondaryColor) parts.push(`with ${item.secondaryColor} accents`);
  // Closure if notable
  if (item.closure && !['pullover', 'none', 'n/a'].includes(item.closure)) parts.push(`(${item.closure})`);
  // Details if present
  if (item.details && item.details !== 'none') parts.push(`— ${item.details}`);
  // Brand
  if (item.brand) parts.push(`by ${item.brand}`);
  return parts.join(' ');
}

/**
 * Build rich descriptions for wardrobe items (which have a different shape than FashionItem).
 * Wardrobe items store metadata in: name, color, brand, material, styleNote, itemType
 */
function buildRichWardrobeItemDescription(item: { name: string; color?: string | null; brand?: string | null; material?: string | null; styleNote?: string | null; itemType?: string | null; }): string {
  const parts: string[] = [];
  if (item.color) parts.push(item.color);
  parts.push(item.name);
  if (item.material) parts.push(`(${item.material})`);
  if (item.brand) parts.push(`by ${item.brand}`);
  return parts.join(' ');
}

function detectClothingCategory(text: string): ClothingCategory {
  const t = (text || "").toLowerCase();
  if (/(dress|gown|שמלה)/.test(t)) return "dress";
  if (/(jumpsuit|overall|אוברול|סרבל)/.test(t)) return "onepiece";
  if (/(shirt|tee|t-shirt|blouse|sweater|sweatshirt|hoodie|top|חולצ|טי שירט|סריג|קפוצ)/.test(t)) return "top";
  if (/(jeans|pants|trouser|skirt|shorts|מכנס|גינס|ג׳ינס|חצאית|שורט)/.test(t)) return "bottom";
  if (/(jacket|coat|blazer|cardigan|מעיל|זקט|ז'קט|בלייזר|קרדיגן)/.test(t)) return "outerwear";
  if (/(shoe|sneaker|boot|loafer|heel|sandals?|נעל|סניקר)/.test(t)) return "shoes";
  if (/(watch|bracelet|ring|necklace|earring|belt|bag|hat|cap|scarf|sunglass|שעון|צמיד|טבעת|שרשר|עגיל|חגורה|תיק|כובע|צעיף|משקפ)/.test(t)) return "accessory";
  return "other";
}

function normalizeOutfitSuggestionsForWearableCore(
  analysis: FashionAnalysis,
  userGender: GenderCategory = "male",
): FashionAnalysis {
  if (!analysis?.outfitSuggestions?.length) return analysis;
  const isHebrew = /[\u0590-\u05FF]/.test(analysis.summary || "");
  const femaleCodedPattern = /(dress|gown|skirt|heels?|bralette|bra|שמלה|חצאית|עקבים|חזיה)/i;
  const clothingFallbackByCategory: Record<Exclude<ClothingCategory, "accessory" | "other">, string> = {
    top: isHebrew ? "חולצה מחויטת איכותית" : "Well-fitted structured top",
    bottom: isHebrew ? "מכנסיים בגזרה נקייה" : "Clean tailored bottoms",
    outerwear: isHebrew ? "שכבה עליונה מחויטת" : "Structured outerwear layer",
    dress: isHebrew ? "שמלה מחמיאה בגזרה נקייה" : "Flattering structured dress",
    onepiece: isHebrew ? "פריט one-piece מחויט" : "Tailored one-piece garment",
    shoes: isHebrew ? "נעליים תואמות ללוק" : "Coordinated footwear",
  };

  analysis.outfitSuggestions = analysis.outfitSuggestions.map((outfit) => {
    const rawItems = Array.isArray(outfit.items) ? outfit.items.filter(Boolean) : [];
    const items = userGender === "male"
      ? rawItems.filter((item) => !femaleCodedPattern.test(item))
      : rawItems;
    const dedupedItems: string[] = [];
    const seen = new Set<string>();
    for (const raw of items) {
      const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
      if (!seen.has(key)) {
        seen.add(key);
        dedupedItems.push(raw);
      }
    }

    const clothing = dedupedItems.filter((item) => {
      const cat = detectClothingCategory(item);
      return cat !== "accessory" && cat !== "other";
    });
    const accessories = dedupedItems.filter((item) => detectClothingCategory(item) === "accessory");

    const categories = new Set(clothing.map((item) => detectClothingCategory(item)));
    if (categories.size < 3 || clothing.length < 3) {
      // Keep the strongest distinct clothing entries first, then fill with accessories.
      const picked: string[] = [];
      const usedCats = new Set<ClothingCategory>();
      for (const item of clothing) {
        const cat = detectClothingCategory(item);
        if (usedCats.has(cat)) continue;
        picked.push(item);
        usedCats.add(cat);
        if (picked.length >= 3) break;
      }
      for (const item of clothing) {
        if (picked.includes(item)) continue;
        picked.push(item);
        if (picked.length >= 3) break;
      }
      // Backfill missing clothing slots from improvement labels/titles (non-accessory only).
      if (picked.length < 3) {
        const improvementCandidates = (analysis.improvements || [])
          .flatMap((imp) => [imp.afterLabel, imp.beforeLabel, imp.title])
          .filter(Boolean);
        for (const candidate of improvementCandidates) {
          const cat = detectClothingCategory(candidate);
          if (cat === "accessory" || cat === "other") continue;
          if (picked.includes(candidate)) continue;
          picked.push(candidate);
          if (picked.length >= 3) break;
        }
      }
      // Final guard: enforce at least 3 clothing entries with deterministic placeholders.
      if (picked.length < 3) {
        const preferredOrder: Array<Exclude<ClothingCategory, "accessory" | "other">> = ["top", "bottom", "shoes", "outerwear", "dress", "onepiece"];
        const existingCats = new Set(picked.map((item) => detectClothingCategory(item)));
        for (const cat of preferredOrder) {
          if (picked.length >= 3) break;
          if (existingCats.has(cat)) continue;
          picked.push(clothingFallbackByCategory[cat]);
          existingCats.add(cat);
        }
      }
      const finalItems = [...picked, ...accessories].slice(0, Math.max(5, picked.length + accessories.length));
      return { ...outfit, items: finalItems };
    }

    return { ...outfit, items: [...clothing, ...accessories].slice(0, 8) };
  });
  return analysis;
}

function detectImprovementCategory(imp: Improvement): ClothingCategory {
  // Stage 30 GAP 2: Use structured afterGarmentType as PRIMARY source
  const afterType = (imp.afterGarmentType || "").toLowerCase();
  if (afterType) {
    const typeCategory = detectClothingCategory(afterType);
    if (typeCategory !== "other") return typeCategory;
  }
  // Fallback to text-based detection (legacy analyses without structured metadata)
  return detectClothingCategory(`${imp.title || ""} ${imp.beforeLabel || ""} ${imp.afterLabel || ""} ${imp.productSearchQuery || ""}`);
}

/** Return budget-tier-appropriate fallback stores */
function getBudgetFallbackStores(encoded: string, query: string, budgetLevel?: string | null): ShoppingLink[] {
  const tier = (budgetLevel || "").toLowerCase();
  if (tier === "luxury" || tier === "high") {
    return [
      { label: `${query} - Farfetch`, url: `https://www.farfetch.com/shopping/men/search/items.aspx?q=${encoded}`, imageUrl: "" },
      { label: `${query} - Mr Porter`, url: `https://www.mrporter.com/en-us/mens/search?query=${encoded}`, imageUrl: "" },
      { label: `${query} - SSENSE`, url: `https://www.ssense.com/en-us/men?q=${encoded}`, imageUrl: "" },
      { label: `${query} - Mytheresa`, url: `https://www.mytheresa.com/int/en/men/search?term=${encoded}`, imageUrl: "" },
    ];
  }
  if (tier === "budget" || tier === "low") {
    return [
      { label: `${query} - H&M`, url: `https://www2.hm.com/en_us/search-results.html?q=${encoded}`, imageUrl: "" },
      { label: `${query} - Uniqlo`, url: `https://www.uniqlo.com/us/en/search?q=${encoded}`, imageUrl: "" },
      { label: `${query} - Zara`, url: `https://www.zara.com/us/en/search?searchTerm=${encoded}`, imageUrl: "" },
      { label: `${query} - SHEIN`, url: `https://us.shein.com/pdsearch/${encoded}/`, imageUrl: "" },
    ];
  }
  // Default: mid-range
  return [
    { label: `${query} - ASOS`, url: `https://www.asos.com/search/?q=${encoded}`, imageUrl: "" },
    { label: `${query} - Zara`, url: `https://www.zara.com/us/en/search?searchTerm=${encoded}`, imageUrl: "" },
    { label: `${query} - Mango`, url: `https://shop.mango.com/en/search?kw=${encoded}`, imageUrl: "" },
    { label: `${query} - H&M`, url: `https://www2.hm.com/en_us/search-results.html?q=${encoded}`, imageUrl: "" },
  ];
}

function buildFallbackShoppingLinks(
  query: string,
  preferredStores?: string | null,
  gender: GenderCategory = "male",
  budgetLevel?: string | null,
): ShoppingLink[] {
  const encoded = encodeURIComponent(query).replace(/%20/g, "+");

  // If user has preferred stores, use those instead of hardcoded defaults
  if (preferredStores) {
    const storeNames = preferredStores.split(",").map(s => s.trim()).filter(Boolean);
    if (storeNames.length > 0) {
      const patterns = getStoreSearchPatterns(gender);
      const links: ShoppingLink[] = [];
      for (const storeName of storeNames) {
        const normalized = storeName.toLowerCase();
        const domain = normalized.includes(".") ? normalized.replace(/^www\./, "") : `${normalized}.com`;
        const patternFn = patterns[domain]
          || Object.entries(patterns).find(([k]) => k.includes(normalized) || normalized.includes(k.replace(".com", "")))?.[1];
        const displayName = storeName.charAt(0).toUpperCase() + storeName.slice(1);
        if (patternFn) {
          links.push({ label: `${query} \u2014 ${displayName}`, url: patternFn(encoded), imageUrl: "" });
        } else {
          links.push({ label: `${query} \u2014 ${displayName}`, url: `https://www.${domain}/search?q=${encoded}`, imageUrl: "" });
        }
        if (links.length >= 4) break;
      }
      // If user has fewer than 3 preferred stores, pad with budget-appropriate defaults
      if (links.length < 3) {
        const usedDomains = new Set(links.map(l => { try { return new URL(l.url).hostname.replace(/^www\./, ""); } catch { return ""; } }));
        const defaults = getBudgetFallbackStores(encoded, query, budgetLevel);
        for (const d of defaults) {
          const dom = new URL(d.url).hostname.replace(/^www\./, "");
          if (!usedDomains.has(dom)) { links.push(d); usedDomains.add(dom); }
          if (links.length >= 3) break;
        }
      }
      return links;
    }
  }

  // Default fallback (no preferred stores) — use budget-appropriate stores
  return getBudgetFallbackStores(encoded, query, budgetLevel);
}

function buildFallbackImprovement(
  category: Exclude<ClothingCategory, "accessory" | "other">,
  isHebrew: boolean,
  stageOneItems?: Array<{ name?: string; garmentType?: string; preciseColor?: string; color?: string; material?: string; fit?: string; pattern?: string; texture?: string; neckline?: string; sleeveLength?: string; bodyZone?: string; score?: number }>,
): Improvement {
  // Stage 30 GAP 5: Try to build a CONTEXTUAL fallback from Stage 1 item data
  const bodyZoneMap: Record<string, string> = { top: "upper", bottom: "lower", outerwear: "outer", shoes: "feet", dress: "full", onepiece: "full" };
  const matchingItem = (stageOneItems || []).find((it) => {
    const zone = (it.bodyZone || "").toLowerCase();
    const type = (it.garmentType || it.name || "").toLowerCase();
    if (category === "top") return zone === "upper" || /(shirt|top|tee|t-shirt|polo|sweater|hoodie|blouse|tank)/i.test(type);
    if (category === "bottom") return zone === "lower" || /(pants|jeans|trouser|chino|shorts|skirt)/i.test(type);
    if (category === "shoes") return zone === "feet" || /(shoe|sneaker|boot|loafer|sandal)/i.test(type);
    if (category === "outerwear") return zone === "outer" || /(jacket|coat|blazer|cardigan)/i.test(type);
    if (category === "dress") return zone === "full" || /(dress|gown)/i.test(type);
    if (category === "onepiece") return /(jumpsuit|romper|overall)/i.test(type);
    return false;
  });

  if (matchingItem && matchingItem.garmentType) {
    // Build contextual fallback from actual item data
    const currentType = matchingItem.garmentType;
    const currentColor = matchingItem.preciseColor || matchingItem.color || "current";
    const currentMaterial = matchingItem.material || "";
    const currentFit = matchingItem.fit || "";
    const currentPattern = matchingItem.pattern || "";

    // Generate upgrade suggestions based on current item — multiple options per type for variety
    const upgradeOptions: Record<string, Array<{ type: string; color: string; material: string; fit: string; style: string }>> = {
      "t-shirt": [
        { type: "dress shirt", color: "navy blue", material: "cotton", fit: "tailored", style: "smart-casual" },
        { type: "linen shirt", color: "white", material: "linen", fit: "relaxed", style: "casual" },
        { type: "henley", color: "charcoal", material: "cotton jersey", fit: "slim", style: "casual" },
      ],
      "polo": [
        { type: "button-down shirt", color: "light blue", material: "oxford cotton", fit: "slim", style: "smart-casual" },
        { type: "knit polo", color: "olive", material: "merino wool", fit: "regular", style: "minimalist" },
      ],
      "hoodie": [
        { type: "knit sweater", color: "charcoal", material: "merino wool", fit: "regular", style: "minimalist" },
        { type: "zip-up cardigan", color: "navy", material: "cotton knit", fit: "regular", style: "smart-casual" },
      ],
      "sweatshirt": [
        { type: "knit sweater", color: "burgundy", material: "merino wool", fit: "regular", style: "minimalist" },
        { type: "half-zip pullover", color: "olive", material: "cotton", fit: "regular", style: "casual" },
      ],
      "jeans": [
        { type: "tailored chinos", color: "olive", material: "cotton twill", fit: "slim", style: "smart-casual" },
        { type: "tailored trousers", color: "charcoal", material: "wool blend", fit: "tailored", style: "formal" },
        { type: "linen pants", color: "beige", material: "linen", fit: "relaxed", style: "casual" },
      ],
      "shorts": [
        { type: "tailored shorts", color: "navy", material: "cotton", fit: "slim", style: "smart-casual" },
        { type: "linen shorts", color: "beige", material: "linen", fit: "relaxed", style: "casual" },
      ],
      "sneakers": [
        { type: "leather loafers", color: "brown", material: "leather", fit: "n/a", style: "classic" },
        { type: "suede desert boots", color: "tan", material: "suede", fit: "n/a", style: "smart-casual" },
        { type: "minimalist leather sneakers", color: "white", material: "leather", fit: "n/a", style: "minimalist" },
      ],
      "sandals": [
        { type: "clean sneakers", color: "white", material: "leather", fit: "n/a", style: "minimalist" },
        { type: "espadrilles", color: "navy", material: "canvas", fit: "n/a", style: "casual" },
      ],
    };
    const options = upgradeOptions[currentType.toLowerCase()];
    const upgrade = options ? options[Math.floor(Math.random() * options.length)] : null;

    const beforeLabel = isHebrew ? `${matchingItem.name || currentType}` : `${matchingItem.name || currentType}`;
    const afterType = upgrade?.type || `premium ${category}`;
    const afterColor = upgrade?.color || "matching";
    const afterMaterial = upgrade?.material || "premium";
    const afterFit = upgrade?.fit || "tailored";
    const afterStyle = upgrade?.style || "smart-casual";
    const afterLabel = isHebrew ? `${afterType} ${afterColor}` : `${afterColor} ${afterFit} ${afterMaterial} ${afterType}`;
    const query = `${afterColor} ${afterFit} ${afterMaterial} ${afterType}`.trim();

    // Build marketing-quality title — NEVER use "מ-X ל-Y" format!
    const hebrewTypeMap: Record<string, string> = {
      "dress shirt": "חולצת כפתורים", "linen shirt": "חולצת פשתן", "henley": "הנלי",
      "knit sweater": "סוודר סרוג", "zip-up cardigan": "קרדיגן רוכסן",
      "half-zip pullover": "פולאובר חצי-רוכסן", "button-down shirt": "חולצת כפתורים",
      "knit polo": "פולו סרוג", "tailored chinos": "צ'ינוס מחויט",
      "tailored trousers": "מכנסיים מחויטים", "linen pants": "מכנסי פשתן",
      "tailored shorts": "שורטס מחויטים", "linen shorts": "שורטס פשתן",
      "leather loafers": "לואפרס עור", "suede desert boots": "מגפי זמש",
      "minimalist leather sneakers": "סניקרס עור מינימליסטי",
      "clean sneakers": "סניקרס נקיים", "espadrilles": "אספדרילס",
    };
    const hebrewAfterName = hebrewTypeMap[afterType] || afterType;
    const taglines: Record<string, string[]> = {
      "smart-casual": ["קפיצת דרג", "נוכחות חדשה", "שידרוג מדויק"],
      "formal": ["מראה מלוטש", "אלגנטיות נקיה"],
      "minimalist": ["מינימליזם מדויק", "פשטות שמשנה"],
      "casual": ["נוחות בלי מאמץ", "רעננות איכותית"],
      "classic": ["קלאסיקה נצחית", "הפרט שמשלים"],
    };
    const taglineOptions = taglines[afterStyle] || ["שדרוג מדויק"];
    const tagline = taglineOptions[Math.floor(Math.random() * taglineOptions.length)];
    const dynamicTitle = isHebrew
      ? `${hebrewAfterName} — ${tagline}`
      : `${afterType.charAt(0).toUpperCase() + afterType.slice(1)} — ${afterStyle === "smart-casual" ? "A Smart Casual Leap" : afterStyle === "formal" ? "Polished & Refined" : afterStyle === "minimalist" ? "Clean Minimalism" : "Fresh Upgrade"}`;
    return {
      title: dynamicTitle,
      description: isHebrew
        ? `ה${hebrewAfterName} ב${afterColor} מעניק מרקם ונוכחות לסילואט. שילוב ${afterColor} עם שאר הפריטים יוצר הרמוניה צבעונית נעימה.`
        : `The ${afterColor} ${afterType} adds structure and presence to the silhouette. The ${afterColor} tone pairs beautifully with the rest of the outfit.`,
      beforeLabel,
      afterLabel,
      beforeColor: currentColor,
      afterColor,
      beforeGarmentType: currentType,
      afterGarmentType: afterType,
      beforeFit: currentFit || "regular",
      afterFit,
      beforeMaterial: currentMaterial || undefined,
      afterMaterial,
      beforePattern: currentPattern || undefined,
      afterPattern: "solid",
      afterStyle,
      productSearchQuery: query,
      shoppingLinks: buildFallbackShoppingLinks(query),
    };
  }

  // Generic fallback (no Stage 1 data available)
  const map: Record<Exclude<ClothingCategory, "accessory" | "other">, { title: string; description: string; beforeLabel: string; afterLabel: string; query: string }> = isHebrew
    ? {
        top: {
          title: "חולצה מחויטת יותר — הפרט שמשנה את הרושם הראשון",
          description: "חלק עליון מחויט מעניק מבנה לסילואט ומרים את רמת הסטייל הכללית — טרנד ה-quiet luxury של 2025.",
          beforeLabel: "חלק עליון נוכחי",
          afterLabel: "חולצה/טופ מחויט איכותי",
          query: "tailored shirt premium",
        },
         bottom: {
          title: "גזרה נקיה ומדויקת — הבסיס לכל לוק מאוזן",          description: "פריט תחתון בגזרה נקייה ומדויקת יוצר בסיס איתן לכל הלוק. הגזרה הנכונה מאזנת את הפרופורציות ומעניקה מראה מושקע.",
          beforeLabel: "חלק תחתון נוכחי",
          afterLabel: "מכנסיים/חצאית בגזרה נקייה",
          query: "tailored pants clean fit",
        },
        outerwear: {
          title: "שכבה עליונה מובנית — עומק ונוכחות ברגע אחד",
          description: "שכבה עליונה מובנית מוסיפה עומק, נוכחות וקו סילואט ברור — אחד הטרנדים החזקים של 2025.",
          beforeLabel: "ללא שכבה עליונה מובנית",
          afterLabel: "בלייזר/ג׳קט מובנה",
          query: "structured blazer jacket",
        },
        dress: {
          title: "שדרוג לפריט מרכזי",
          description: "שמלה בגזרה מחמיא יוצרת הופעה שלמה ומאוזנת. הגזרה המחמיא מדגישה את הסילואט ומעניקה מראה מעודכן.",
          beforeLabel: "שמלה נוכחית",
          afterLabel: "שמלה בגזרה מחמיאה",
          query: "structured flattering dress",
        },
        onepiece: {
          title: "שדרוג לפריט one-piece",
          description: "פריט one-piece מחויט מייצר מראה נקי ואלגנטי. הגזרה המחויטת מארכת את הסילואט ומעניקה מראה מושקע.",
          beforeLabel: "one-piece נוכחי",
          afterLabel: "one-piece מחויט",
          query: "tailored jumpsuit one piece",
        },
        shoes: {
          title: "נעליים תואמות — הסגירה שמשלימה את הלוק",
          description: "נעליים תואמות ללוק משלימות את המראה הכללי ויוצרות סגירה חזקה והרמונית. הנעל הנכונה מעניק תחושת של שלמות ותשומת לפרטים.",
          beforeLabel: "נעליים נוכחיות",
          afterLabel: "נעליים תואמות ללוק",
          query: "premium outfit matching shoes",
        },
      }
    : {
        top: {
          title: "A Tailored Top — The Detail That Changes the First Impression",
          description: "Add a better-structured top to sharpen the silhouette and elevate the full look.",
          beforeLabel: "Current top",
          afterLabel: "Well-fitted structured top",
          query: "tailored shirt premium",
        },
        bottom: {
          title: "Clean-Cut Bottoms — The Foundation of Every Balanced Look",
          description: "Use cleaner-cut bottoms that anchor the outfit and improve overall balance.",
          beforeLabel: "Current bottoms",
          afterLabel: "Clean tailored bottoms",
          query: "tailored pants clean fit",
        },
        outerwear: {
          title: "A Structured Layer — Depth & Presence in One Move",
          description: "Introduce a structured outer layer to create depth and a stronger style profile.",
          beforeLabel: "No structured outer layer",
          afterLabel: "Structured blazer or jacket",
          query: "structured blazer jacket",
        },
        dress: {
          title: "Upgrade to a stronger dress silhouette",
          description: "Choose a more flattering dress cut to create a coherent, polished full look.",
          beforeLabel: "Current dress",
          afterLabel: "Flattering structured dress",
          query: "structured flattering dress",
        },
        onepiece: {
          title: "A Tailored One-Piece — Clean Lines, Maximum Impact",
          description: "Switch to a tailored one-piece garment for a cleaner and more elevated outfit.",
          beforeLabel: "Current one-piece",
          afterLabel: "Tailored one-piece garment",
          query: "tailored jumpsuit one piece",
        },
        shoes: {
          title: "Coordinated Footwear — The Finishing Touch That Ties It All Together",
          description: "Use coordinated shoes that lock the look together and improve visual harmony.",
          beforeLabel: "Current shoes",
          afterLabel: "Coordinated footwear",
          query: "premium outfit matching shoes",
        },
      };

  const picked = map[category];
  return {
    title: picked.title,
    description: picked.description,
    beforeLabel: picked.beforeLabel,
    afterLabel: picked.afterLabel,
    beforeColor: "current",
    afterColor: "matching",
    productSearchQuery: picked.query,
    shoppingLinks: buildFallbackShoppingLinks(picked.query),
  };
}

function normalizeImprovementsForWearableCore(
  analysis: FashionAnalysis,
  userGender: GenderCategory = "male",
): FashionAnalysis {
  if (!analysis?.improvements?.length) return analysis;

  const isHebrew = /[\u0590-\u05FF]/.test(analysis.summary || "");
  const preferredOrder: Array<Exclude<ClothingCategory, "accessory" | "other">> =
    userGender === "male"
      ? ["top", "bottom", "shoes", "outerwear"]
      : ["top", "bottom", "shoes", "outerwear", "dress", "onepiece"];
  const rank: Record<ClothingCategory, number> = {
    top: 0,
    bottom: 1,
    shoes: 2,
    outerwear: 3,
    dress: 4,
    onepiece: 5,
    accessory: 6,
    other: 7,
  };
  const isClothing = (cat: ClothingCategory) =>
    cat !== "accessory" &&
    cat !== "other" &&
    (userGender !== "male" || (cat !== "dress" && cat !== "onepiece"));

  const clothing = analysis.improvements
    .filter((imp) => isClothing(detectImprovementCategory(imp)))
    .sort((a, b) => rank[detectImprovementCategory(a)] - rank[detectImprovementCategory(b)]);
  const nonClothing = analysis.improvements.filter((imp) => !isClothing(detectImprovementCategory(imp)));

  const normalized: Improvement[] = [...clothing, ...nonClothing];
  const currentClothingCats = new Set(
    normalized
      .map((imp) => detectImprovementCategory(imp))
      .filter((cat): cat is Exclude<ClothingCategory, "accessory" | "other"> => isClothing(cat)),
  );

  while (normalized.filter((imp) => isClothing(detectImprovementCategory(imp))).length < 3) {
    const nextCat =
      preferredOrder.find((cat) => !currentClothingCats.has(cat)) ||
      preferredOrder[normalized.length % preferredOrder.length];
    normalized.push(buildFallbackImprovement(nextCat, isHebrew, analysis.items));
    currentClothingCats.add(nextCat);
  }

  const keep: Improvement[] = [...normalized];
  while (keep.length > 5) {
    let removableIdx: number | undefined;
    for (let idx = keep.length - 1; idx >= 0; idx -= 1) {
      const cat = detectImprovementCategory(keep[idx]);
      if (isClothing(cat)) {
        const clothingCount = keep.filter((imp) => isClothing(detectImprovementCategory(imp))).length;
        if (clothingCount > 3) {
          removableIdx = idx;
          break;
        }
      } else {
        removableIdx = idx;
        break;
      }
    }
    if (removableIdx === undefined) break;
    keep.splice(removableIdx, 1);
  }

  while (keep.length < 4) {
    const missingCat =
      preferredOrder.find((cat) => !keep.some((imp) => detectImprovementCategory(imp) === cat)) ||
      preferredOrder[keep.length % preferredOrder.length];
    keep.push(buildFallbackImprovement(missingCat, isHebrew, analysis.items));
  }

  analysis.improvements = keep;
  return analysis;
}

/**
 * Fire-and-forget: notify the owner when a guest completes an analysis.
 * Never throws — errors are logged and swallowed.
 */
async function notifyGuestAnalysisCompleted(
  sessionId: number,
  fingerprint: string,
  overallScore: number,
  userAgent: string | null,
  ipAddress: string | null,
  imageUrl: string | null,
  analysisSummary: string | null,
) {
  try {
    const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
    const device = userAgent
      ? (userAgent.includes("iPhone") ? "iPhone" : userAgent.includes("Android") ? "Android" : "Desktop")
      : "לא ידוע";
    const fp = fingerprint.slice(0, 12) + "...";
    const scoreStr = overallScore ? `${overallScore}/10` : "N/A";
    const summaryStr = analysisSummary ? `\nסיכום: ${analysisSummary.slice(0, 200)}` : "";

    await notifyOwner({
      title: `👤 אורח חדש סיים ניתוח — ציון ${scoreStr}`,
      content: [
        `אורח חדש סיים ניתוח אופנתי ב-TotalLook.ai!`,
        ``,
        `🆔 Session: #${sessionId}`,
        `📊 ציון כללי: ${scoreStr}`,
        `📱 מכשיר: ${device}`,
        `🌐 IP: ${ipAddress || "לא ידוע"}`,
        `🔑 Fingerprint: ${fp}`,
        `🕐 זמן: ${now}`,
        summaryStr,
        imageUrl ? `\n🖼️ תמונה: ${imageUrl}` : "",
      ].filter(Boolean).join("\n"),
    });

    console.log(`[Guest] Admin notification sent for session #${sessionId}`);
  } catch (err) {
    console.warn("[Guest] Failed to send admin notification:", err);
  }
}
/**
 * Store search URL patterns — maps store domain to a function that builds
 * a product-specific search URL from a search query string.
 * Gender-aware: uses "men"/"women" categories where the store supports it.
 */
export type GenderCategory = "male" | "female" | "unisex";

function getStoreSearchPatterns(gender: GenderCategory = "male"): Record<string, (query: string) => string> {
  const isMale = gender === "male" || gender === "unisex";
  const ssenseGender = isMale ? "men" : "women";
  const mrporterSite = isMale ? "mrporter.com" : "net-a-porter.com";
  const mrporterGender = isMale ? "mens" : "womens";
  const farfetchGender = isMale ? "men" : "women";
  const asosCat = isMale ? "men" : "women";

  return {
    "ssense.com": (q) => `https://www.ssense.com/en-us/${ssenseGender}?q=${q}`,
    "mrporter.com": (q) => isMale
      ? `https://www.mrporter.com/en-us/mens/search?query=${q}`
      : `https://www.net-a-porter.com/en-us/shop/search/${q}`,
    "net-a-porter.com": (q) => isMale
      ? `https://www.mrporter.com/en-us/mens/search?query=${q}`
      : `https://www.net-a-porter.com/en-us/shop/search/${q}`,
    "asos.com": (q) => `https://www.asos.com/${asosCat}/search/?q=${q}`,
    "nordstrom.com": (q) => `https://www.nordstrom.com/sr?keyword=${q}`,
    "zara.com": (q) => `https://www.zara.com/us/en/search?searchTerm=${q}`,
    "cos.com": (q) => `https://www.cos.com/en_usd/search.html?q=${q}`,
    "massimodutti.com": (q) => `https://www.massimodutti.com/us/search?query=${q}`,
    "endclothing.com": (q) => `https://www.endclothing.com/us/catalogsearch/result/?q=${q}`,
    "farfetch.com": (q) => `https://www.farfetch.com/shopping/${farfetchGender}/search/items.aspx?q=${q}`,
    "miumiu.com": (q) => `https://www.miumiu.com/us/en/search.html?q=${q}`,
    "prada.com": (q) => `https://www.prada.com/us/en/search.html?q=${q}`,
    "gucci.com": (q) => `https://www.gucci.com/us/en/search?search=${q}`,
    "nike.com": (q) => `https://www.nike.com/w?q=${q}`,
    "adidas.com": (q) => `https://www.adidas.com/us/search?q=${q}`,
    "newbalance.com": (q) => `https://www.newbalance.com/search/?q=${q}`,
    "uniqlo.com": (q) => `https://www.uniqlo.com/us/en/search?q=${q}`,
    "hm.com": (q) => `https://www2.hm.com/en_us/search-results.html?q=${q}`,
    "matchesfashion.com": (q) => `https://www.matchesfashion.com/us/search?q=${q}`,
    "shein.com": (q) => `https://www.shein.com/pdsearch/${q}/`,
    "mango.com": (q) => `https://shop.mango.com/en/search?kw=${q}`,
    "pullandbear.com": (q) => `https://www.pullandbear.com/us/search?query=${q}`,
    "bershka.com": (q) => `https://www.bershka.com/us/search?query=${q}`,
    "allsaints.com": (q) => `https://www.allsaints.com/search?q=${q}`,
    "reiss.com": (q) => `https://www.reiss.com/search?q=${q}`,
    "tedbaker.com": (q) => `https://www.tedbaker.com/search?q=${q}`,
    "sandro-paris.com": (q) => `https://us.sandro-paris.com/en/search?q=${q}`,
    "maje.com": (q) => `https://us.maje.com/en/search?q=${q}`,
    "urbanoutfitters.com": (q) => `https://www.urbanoutfitters.com/search?q=${q}`,
    "forever21.com": (q) => `https://www.forever21.com/us/search/${q}`,
    "otherstories.com": (q) => `https://www.stories.com/en/search.html?q=${q}`,
    "arket.com": (q) => `https://www.arket.com/en/search.html?q=${q}`,
    "primark.com": (q) => `https://www.primark.com/en/search?q=${q}`,
    // Country-specific stores
    "zalando.de": (q) => `https://www.zalando.de/katalog/?q=${q}`,
    "zalando.co.uk": (q) => `https://www.zalando.co.uk/catalog/?q=${q}`,
    "zalando.fr": (q) => `https://www.zalando.fr/catalogue/?q=${q}`,
    "zalando.es": (q) => `https://www.zalando.es/catalogo/?q=${q}`,
    "zalando.it": (q) => `https://www.zalando.it/catalogo/?q=${q}`,
    "aboutyou.de": (q) => `https://www.aboutyou.de/suche?term=${q}`,
    "breuninger.com": (q) => `https://www.breuninger.com/de/suche/?query=${q}`,
    "mytheresa.com": (q) => `https://www.mytheresa.com/search?q=${q}`,
    "laredoute.fr": (q) => `https://www.laredoute.fr/recherche.aspx?kw=${q}`,
    "selfridges.com": (q) => `https://www.selfridges.com/GB/en/cat/?freeText=${q}`,
    "johnlewis.com": (q) => `https://www.johnlewis.com/search?search-term=${q}`,
    "harrods.com": (q) => `https://www.harrods.com/en-gb/search?searchTerm=${q}`,
    "revolve.com": (q) => `https://www.revolve.com/r/Search.jsp?search=${q}`,
    "saksfifthavenue.com": (q) => `https://www.saksfifthavenue.com/search?q=${q}`,
    "bloomingdales.com": (q) => `https://www.bloomingdales.com/shop/search?keyword=${q}`,
    "elcorteingles.es": (q) => `https://www.elcorteingles.es/search/?s=${q}`,
    "luisaviaroma.com": (q) => `https://www.luisaviaroma.com/en-us/search?q=${q}`,
    "yoox.com": (q) => `https://www.yoox.com/us/women/shoponline?q=${q}`,
    "theiconic.com.au": (q) => `https://www.theiconic.com.au/catalog?q=${q}`,
    "davidjones.com": (q) => `https://www.davidjones.com/search?q=${q}`,
    "zozotown.com": (q) => `https://zozo.jp/search/?p_keyv=${q}`,
    "musinsa.com": (q) => `https://www.musinsa.com/search/musinsa/integration?q=${q}`,
    "myntra.com": (q) => `https://www.myntra.com/${q}`,
    "ajio.com": (q) => `https://www.ajio.com/search/?text=${q}`,
    "dafiti.com.br": (q) => `https://www.dafiti.com.br/catalog/?q=${q}`,
    "terminalx.com": (q) => `https://www.terminalx.com/search?q=${q}`,
    "factory54.co.il": (q) => `https://www.factory54.co.il/catalogsearch/result/?q=${q}`,
    // Premium women's stores
    "stellamccartney.com": (q) => `https://www.stellamccartney.com/search?q=${q}`,
    "chloe.com": (q) => `https://www.chloe.com/search?q=${q}`,
    "balmain.com": (q) => `https://www.balmain.com/search?q=${q}`,
    "jimmychoo.com": (q) => `https://www.jimmychoo.com/search?q=${q}`,
    "tiffany.com": (q) => `https://www.tiffany.com/search?q=${q}`,
    "mejuri.com": (q) => `https://www.mejuri.com/search?q=${q}`,
    "polene-paris.com": (q) => `https://www.polene-paris.com/search?q=${q}`,
    "aninebing.com": (q) => `https://www.aninebing.com/search?q=${q}`,
    "thereformation.com": (q) => `https://www.thereformation.com/search?q=${q}`,
    "sezane.com": (q) => `https://www.sezane.com/us/search?q=${q}`,
    "toryburch.com": (q) => `https://www.toryburch.com/search?q=${q}`,
    "katespade.com": (q) => `https://www.katespade.com/search?q=${q}`,
    // Premium men's stores
    "suitsupply.com": (q) => `https://suitsupply.com/en-us/search?q=${q}`,
    "stussy.com": (q) => `https://www.stussy.com/search?q=${q}`,
    "kith.com": (q) => `https://kith.com/search?q=${q}`,
    "amiri.com": (q) => `https://www.amiri.com/search?q=${q}`,
    "rag-bone.com": (q) => `https://www.rag-bone.com/search?q=${q}`,
    "theory.com": (q) => `https://www.theory.com/search?q=${q}`,
    "brunellocucinelli.com": (q) => `https://www.brunellocucinelli.com/search?q=${q}`,
    "zegna.com": (q) => `https://www.zegna.com/search?q=${q}`,
    // Israeli premium stores
    "sacks.co.il": (q) => `https://www.sacks.co.il/catalogsearch/result/?q=${q}`,
  };
}

/**
 * ALWAYS rebuilds every shopping link as a search URL using the store's known
 * search pattern. This guarantees links never 404 — even if the AI generated
 * a fictional product path, we replace it with a real search query URL.
 *
 * The search term is derived from the link label (product name) or the
 * improvement's productSearchQuery. Gender-aware patterns route to the
 * correct men/women category.
 */
export function fixShoppingLinkUrls(analysis: FashionAnalysis, gender: GenderCategory = "male", preferredStores?: string | null): FashionAnalysis {
  const patterns = getStoreSearchPatterns(gender);

  // Parse preferred stores into normalized domain list
  const preferredDomains: string[] = [];
  if (preferredStores) {
    for (const store of preferredStores.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)) {
      // Normalize store name to domain: "Zara" -> "zara.com", "zara.com" -> "zara.com"
      const domain = store.includes(".") ? store.replace(/^www\./, "") : `${store}.com`;
      preferredDomains.push(domain);
    }
  }

  // Helper: find the best preferred store pattern for a search term
  function getPreferredStoreUrl(searchTerm: string, currentHostname: string): string | null {
    if (preferredDomains.length === 0) return null;
    // If current store is already preferred, keep it
    if (preferredDomains.some(d => currentHostname.includes(d) || d.includes(currentHostname))) return null;
    // Find a preferred store that has a known search pattern
    const encoded = encodeURIComponent(searchTerm).replace(/%20/g, "+");
    for (const domain of preferredDomains) {
      // Try exact match first
      const patternFn = patterns[domain];
      if (patternFn) return patternFn(encoded);
      // Try partial match (e.g. "terminalx" matches "terminalx.com")
      const partialMatch = Object.keys(patterns).find(k => k.includes(domain) || domain.includes(k.replace(".com", "")));
      if (partialMatch) return patterns[partialMatch](encoded);
    }
    // Fallback: build a generic search URL for the first preferred store
    const encoded2 = encodeURIComponent(searchTerm).replace(/%20/g, "+");
    const firstDomain = preferredDomains[0];
    return `https://www.${firstDomain}/search?q=${encoded2}`;
  }

  for (const imp of analysis.improvements) {
    if (!imp.shoppingLinks) continue;
    imp.shoppingLinks = imp.shoppingLinks.map((link: ShoppingLink) => {
      try {
        const parsed = new URL(link.url);
        const hostname = parsed.hostname.replace("www.", "");

        // Extract the best search term: prefer the link label (product name)
        // before the dash/em-dash store suffix, fall back to productSearchQuery
        const labelProduct = link.label.split("\u2014")[0].split("\u2013")[0].split(" - ")[0].trim();
        const searchTerm = labelProduct || imp.productSearchQuery || "fashion";
        const encoded = encodeURIComponent(searchTerm).replace(/%20/g, "+");

        // If user has preferred stores, redirect to their preferred store
        const preferredUrl = getPreferredStoreUrl(searchTerm, hostname);
        if (preferredUrl) {
          // Update the label to reflect the new store
          const newDomain = new URL(preferredUrl).hostname.replace("www.", "");
          const storeName = newDomain.split(".")[0].charAt(0).toUpperCase() + newDomain.split(".")[0].slice(1);
          const cleanLabel = labelProduct || link.label;
          return { ...link, url: preferredUrl, label: `${cleanLabel} \u2014 ${storeName}` };
        }

        // Check if we already have a valid search URL
        const isAlreadySearchUrl = isValidSearchUrl(parsed, hostname);
        if (isAlreadySearchUrl) {
          return { ...link, url: link.url };
        }

        // Rebuild as a search URL using our known store patterns
        const patternFn = patterns[hostname];
        if (patternFn) {
          return { ...link, url: patternFn(encoded) };
        }

        // Unknown store \u2014 use generic search pattern
        const baseUrl = `${parsed.protocol}//${parsed.hostname}`;
        return { ...link, url: `${baseUrl}/search?q=${encoded}` };
      } catch {
        // If URL parsing fails entirely, try to build from label
        try {
          const labelProduct = link.label.split("\u2014")[0].split("\u2013")[0].split(" - ")[0].trim();
          const searchTerm = labelProduct || "fashion";
          // Try preferred store first
          const preferredUrl = getPreferredStoreUrl(searchTerm, "");
          if (preferredUrl) {
            const newDomain = new URL(preferredUrl).hostname.replace("www.", "");
            const storeName = newDomain.split(".")[0].charAt(0).toUpperCase() + newDomain.split(".")[0].slice(1);
            return { ...link, url: preferredUrl, label: `${labelProduct} \u2014 ${storeName}` };
          }
          const encoded = encodeURIComponent(searchTerm).replace(/%20/g, "+");
          // Try to extract domain from the broken URL
          const domainMatch = link.url.match(/https?:\/\/(?:www\.)?([^/]+)/);
          if (domainMatch) {
            const hostname = domainMatch[1];
            const patternFn = patterns[hostname];
            if (patternFn) {
              return { ...link, url: patternFn(encoded) };
            }
            return { ...link, url: `https://www.${hostname}/search?q=${encoded}` };
          }
        } catch {}
        return link;
      }
    });
  }
  return analysis;
}

/**
 * Checks if a URL is already a valid search URL (has a search query parameter
 * with a non-empty value). This prevents double-converting URLs that the AI
 * already formatted correctly as search URLs.
 */
function isValidSearchUrl(parsed: URL, hostname: string): boolean {
  // Known search query parameter names used by major stores
  const searchParams = ["q", "query", "keyword", "search", "searchTerm", "kw"];
  for (const param of searchParams) {
    const val = parsed.searchParams.get(param);
    if (val && val.trim().length > 0) return true;
  }
  // Special case: SSENSE uses ?q= in the path-like URL
  if (hostname === "ssense.com" && parsed.search.includes("q=")) return true;
  // Special case: Shein uses /pdsearch/term/ pattern
  if (hostname === "shein.com" && parsed.pathname.includes("/pdsearch/")) return true;
  // Special case: NET-A-PORTER uses /shop/search/term pattern
  if (hostname === "net-a-porter.com" && parsed.pathname.includes("/shop/search/")) return true;
  // Special case: Forever21 uses /search/term pattern
  if (hostname === "forever21.com" && parsed.pathname.includes("/search/")) return true;
  // Nordstrom uses /sr?keyword=
  if (hostname === "nordstrom.com" && parsed.searchParams.get("keyword")) return true;
  return false;
}

export interface ProfileContext {
  ageRange?: string;
  gender?: string;
  occupation?: string;
  budgetLevel?: string;
  stylePreference?: string;
  favoriteInfluencers?: string;
  preferredStores?: string;
  country?: string;
}

export interface WardrobeContext {
  itemType: string;
  name: string;
  color: string | null;
  brand: string | null;
  /** Rich style description for smarter matching (e.g. 'smart watch, sporty, digital display') */
  styleNote?: string | null;
}

export function buildFashionPrompt(
  influencers?: string,
  styleNotes?: string,
  occasion?: string,
  profile?: ProfileContext | null,
  wardrobeItems?: WardrobeContext[],
  lang: "he" | "en" = "he",
  tasteProfileText?: string | null,
): string {
  const isHebrew = lang === "he";
  const langLabel = isHebrew ? "Hebrew" : "English";
  const wardrobeTag = isHebrew ? "(מהארון שלך)" : "(from your wardrobe)";
  const userGender = profile?.gender || "";
  const genderConstraint = userGender === "male"
    ? "CRITICAL: ONLY suggest and reference MALE or UNISEX fashion influencers. Do NOT mention any female fashion influencers."
    : userGender === "female"
    ? "CRITICAL: ONLY suggest and reference FEMALE or UNISEX fashion influencers. Do NOT mention any male fashion influencers."
    : "";
  const influencerSection = influencers
    ? `\n\nINFLUENCER CONTEXT: The user follows and admires the style of: ${influencers}. 
Tailor your recommendations to align with these influencers' fashion sensibilities. 
Reference specific styling choices these influencers are known for when making suggestions.
In the "influencerInsight" field, explain how the user's current look relates to their chosen influencers' style and what specific elements they could borrow.
${genderConstraint}`
    : `\n\nNo specific influencer preferences provided. In the "influencerInsight" field, suggest 2-3 fashion influencers whose style matches the user's current aesthetic.
${genderConstraint}`;

  const styleNotesSection = styleNotes
    ? `\n\nUSER STYLE NOTES: ${styleNotes}. Take these personal preferences into account when making recommendations.`
    : "";

  // Occasion context
  const occasionMap: Record<string, string> = {
    general: "GENERAL REVIEW — Give a comprehensive fashion review of this outfit. Evaluate the overall look holistically: style coherence, color harmony, fit, quality of items, and personal expression. Do NOT penalize for occasion-appropriateness since no specific occasion was chosen. Focus on the outfit's strengths and how to elevate it further. Be encouraging and constructive.",
    casual: "CASUAL / EVERYDAY — Everyday activities, errands, regular day. Comfort and effortless style are key. A clean, put-together casual look scores high. Overdressing (suits, heels) would be inappropriate.",
    work: "WORK / OFFICE — Professional work environment. Polished, office-appropriate looks. Consider dress codes from smart casual to business formal. Too casual (flip-flops, ripped jeans, crop tops) would score low.",
    date: "DATE NIGHT — Romantic outing. Attractive, well-put-together looks that show personality and effort. Should look intentional and appealing. Too casual or sloppy scores low.",
    coffee: "COFFEE / BRUNCH — Light, relaxed outing for coffee or brunch with friends. Effortlessly stylish, not overdressed. Think chic-casual: clean lines, nice accessories, comfortable but put-together. A full suit would be too much; pajama-style would be too little.",
    family: "FAMILY MEAL / HOLIDAY — Family dinner (Friday night, holidays like Rosh Hashana, Passover, Hanukkah), family event. Should look respectful and put-together but not overly formal. Smart-casual to semi-formal is ideal. Too revealing or too casual (gym clothes) would be inappropriate.",
    bar: "BAR / RESTAURANT — Evening out at a bar or restaurant. Should look stylish and intentional — a step up from casual. Think date-night-adjacent but can be edgier/trendier. Athleisure or very casual would score low.",
    evening: "EVENING EVENT — Party, gala, wedding, or special event. Elevated, statement-making pieces. Formal or semi-formal. Casual wear would be very inappropriate and score very low.",
    friends: "GOING OUT WITH FRIENDS — Social gathering, group outing. Fun, trendy, and comfortable. Should look like you made an effort but aren't trying too hard.",
    formal: "FORMAL / BUSINESS — Important meeting, conference, or formal event. Tailoring and sophistication are paramount. Casual elements would be inappropriate.",
    sport: "SPORTY / ACTIVE — Physical activity or athleisure. Performance meets style. Formal wear would be completely inappropriate.",
    travel: "TRAVEL — Travel or vacation. Comfort, versatility, and packability matter. Should look put-together even while being practical.",
    weekend: "WEEKEND — Relaxed weekend day — market, park, shopping, strolling around the city. Laid-back but stylish. Overdressing would be odd.",
  };
  const occasionFitRules = occasion && occasion !== 'general'
    ? `\n\nCRITICAL OCCASION-FIT SCORING RULES:\n- The outfit's appropriateness for this specific occasion is a MAJOR factor in the overall score.\n- If the outfit is clearly WRONG for the occasion (e.g., gym clothes to a wedding, suit to the beach, flip-flops to a business meeting), the overall score MUST be 6 or below, regardless of how nice the individual items are.\n- If the outfit is somewhat appropriate but not ideal (e.g., slightly too casual for a date, slightly overdressed for coffee), deduct 1-2 points from the overall score.\n- If the outfit perfectly matches the occasion, this should boost the score.\n- The 'summary' MUST mention how well the outfit fits the specific occasion.\n- All outfit suggestions MUST be appropriate for this specific occasion.`
    : "";
  const occasionSection = occasion && occasionMap[occasion]
    ? `\n\nOCCASION CONTEXT: ${occasionMap[occasion]}${occasionFitRules}`
    : "";

  // User profile context
  let profileSection = "";
  if (profile) {
    const parts: string[] = [];
    if (profile.ageRange) parts.push(`Age range: ${profile.ageRange}`);
    if (profile.gender) parts.push(`Gender: ${profile.gender}`);
    if (profile.occupation) {
      const occMap: Record<string, string> = {
        student: "Student", creative: "Creative industry", corporate: "Corporate/Office",
        entrepreneur: "Entrepreneur", tech: "Tech industry", freelance: "Freelancer", other: "Other",
      };
      parts.push(`Occupation: ${occMap[profile.occupation] || profile.occupation}`);
    }
    if (profile.budgetLevel) {
      const budgetMap: Record<string, string> = {
        budget: "Budget-friendly (under $50/item)", "mid-range": "Mid-range ($50-150/item)",
        premium: "Premium ($150-500/item)", luxury: "Luxury ($500+/item)",
      };
      parts.push(`Budget: ${budgetMap[profile.budgetLevel] || profile.budgetLevel}`);
    }
    if (profile.stylePreference) {
      const styleMap: Record<string, string> = {
        minimalist: "Minimalist", streetwear: "Streetwear", classic: "Classic/Timeless",
        "smart-casual": "Smart Casual", "avant-garde": "Avant-Garde", sporty: "Sporty/Athletic",
        bohemian: "Bohemian", preppy: "Preppy",
      };
      // Support multiple comma-separated styles
      const styles = profile.stylePreference.split(",").map(s => s.trim()).filter(Boolean);
      const mappedStyles = styles.map(s => styleMap[s] || s);
      if (mappedStyles.length === 1) {
        parts.push(`Preferred style: ${mappedStyles[0]}`);
      } else if (mappedStyles.length > 1) {
        parts.push(`Preferred styles: ${mappedStyles.join(", ")}`);
      }
    }
    if (profile.preferredStores) {
      parts.push(`Preferred shopping stores: ${profile.preferredStores}`);
    }
    // Country-aware store recommendations — filtered by gender & budget
    if (profile.country) {
      const countryData = COUNTRY_STORE_MAP[profile.country];
      if (countryData) {
        parts.push(`User location: ${countryData.locale}`);
        parts.push(`Local currency: ${countryData.currency}`);
        if (!profile.preferredStores) {
          // Filter stores by user's gender and budget
          const filteredStores = filterStoresForUser(countryData.stores, profile.gender, profile.budgetLevel);
          if (filteredStores.length > 0) {
            parts.push(`Recommended local stores (matching your profile): ${filteredStores.join(", ")}`);
          }
        }
      }
    }
    if (parts.length > 0) {
      profileSection = `\n\nUSER PROFILE:\n${parts.join("\n")}
\nIMPORTANT: Tailor ALL recommendations to this user's profile:
- Shopping links MUST match their budget level (don't suggest luxury brands to budget users, don't suggest fast fashion to luxury users)
- If the user has PREFERRED STORES, you MUST prioritize those stores when generating shopping links. At least 50% of shopping links should come from their preferred stores.
- When the user's preferred stores include budget-friendly options (e.g. Shein, H&M), recommend products from those stores at appropriate price points.
- When the user's preferred stores include luxury options (e.g. Farfetch, SSENSE), recommend premium products from those stores.
- If the user has RECOMMENDED LOCAL STORES (based on their country), include at least 2-3 shopping links from those local stores. Prefer stores that ship to the user's country.
- Show prices in the user's LOCAL CURRENCY when available. If the user is in Germany, show EUR prices; if in Israel, show ILS prices; etc.
- Style recommendations should blend their preferred styles (if multiple, find creative combinations)
- Consider their age range and occupation when suggesting looks
- If they work in a creative field, be more adventurous; if corporate, keep it polished`;
    }
    // Premium/Luxury specific material and brand rules
    if (profile.budgetLevel === 'premium' || profile.budgetLevel === 'luxury') {
      profileSection += `
- JEWELRY & MATERIAL IDENTIFICATION: For premium/luxury budget users, when identifying jewelry and accessories, assume higher-end materials unless clearly identifiable otherwise. Silver-toned jewelry on a premium/luxury user is more likely white gold, platinum, or palladium than regular silver. Transparent stones are more likely diamonds or high-quality crystals. Do NOT state materials definitively if you cannot clearly distinguish them from the image — use softer language like "appears to be" or "likely" instead of stating as fact. Remember: premium/luxury users typically own upgraded versions of accessories.
- MATERIAL NAMING FOR PREMIUM/LUXURY USERS (CRITICAL): NEVER use cheap-sounding material terms for premium/luxury budget users. Specifically:
  * NEVER say "דמוי עור" (faux leather) or "עור סינתטי" (synthetic leather) — instead say "עור יוקרתי" (luxurious leather), "עור" (leather), or "עור וגאן איכותי" (quality vegan leather)
  * NEVER say "דמוי זמש" (faux suede) or "זמש סינתטי" (synthetic suede) — instead say "זמש איכותי" (quality suede) or "זמש" (suede)
  * NEVER say "דמוי משי" (faux silk) — instead say "סאטן יוקרתי" (luxurious satin) or "משי" (silk)
  * NEVER say "פלסטיק" (plastic) for accessories — instead say "אקריליק" (acrylic) or "שרף" (resin)
  * When in doubt about material quality, ALWAYS lean toward the higher-end, most flattering interpretation for premium/luxury users
  * Use elevated, luxurious language throughout — the user expects premium treatment in every detail
  * This applies to ALL items: clothing, shoes, bags, accessories — not just jewelry
- BRAND IDENTIFICATION FOR PREMIUM/LUXURY USERS (CRITICAL): You MUST try significantly harder to identify brands for premium/luxury users:
  * Examine every visible logo, label, stitching pattern, hardware, zipper pull, button style, and design signature
  * If you cannot identify the exact brand, you MUST suggest 2-3 likely brands based on the item's design language, construction quality, and price point. Use language like "הפריט נראה כמו [Brand A] או [Brand B] בסגנון העיצוב" / "The design suggests [Brand A] or [Brand B]"
  * NEVER leave an item completely unbranded for premium/luxury users — at minimum provide brand-level context (e.g. "ז'קט בסגנון בתי אופנה כמו Sandro או AllSaints" / "A jacket in the style of fashion houses like Sandro or AllSaints")
  * For shoes: examine sole shape, stitching, logo placement, silhouette — premium users rarely wear unbranded shoes
  * For bags: examine hardware color, clasp style, leather grain, strap attachment — these are strong brand indicators
  * For watches: examine case shape, dial layout, crown style, bracelet links — even partial visibility can suggest a brand family`;
    }
    // Add profile influencers if no per-review influencers specified
    if (!influencers && profile.favoriteInfluencers) {
      profileSection += `\n\nThe user's favorite fashion influencers from their profile: ${profile.favoriteInfluencers}. Consider their style when making recommendations.`;
    }
  }
  // Add jewelry guidance even if profile had no parts (e.g. guest with only budgetLevel)
  if (profile && (profile.budgetLevel === 'premium' || profile.budgetLevel === 'luxury') && !profileSection.includes('JEWELRY')) {
    profileSection += `\n\nJEWELRY & MATERIAL CONTEXT: This user has a ${profile.budgetLevel} budget. When analyzing ALL items (not just jewelry), lean toward higher-end material identification (white gold over silver, diamonds over crystals, genuine leather over faux, quality fabrics over cheap alternatives). NEVER use terms like "דמוי עור", "עור סינתטי", "דמוי זמש", "זמש סינתטי", or other "faux/imitation/synthetic" descriptors. Instead use elevated terms: "עור יוקרתי", "זמש איכותי", "סאטן יוקרתי". Premium users deserve the most flattering, luxurious language. Also: you MUST attempt brand identification for every visible item — if unsure, suggest likely brands based on design cues.`;
  }

  // Wardrobe context — items the user already owns
  let wardrobeSection = "";
  if (wardrobeItems && wardrobeItems.length > 0) {
    const itemList = wardrobeItems.map(item => {
      const parts = [item.name];
      if (item.brand) parts.push(`(${item.brand})`);
      if (item.color) parts.push(`- ${item.color}`);
      if (item.styleNote) parts.push(`[${item.styleNote}]`);
      return parts.join(" ");
    }).join("\n");
    wardrobeSection = `\n\nVIRTUAL WARDROBE — ITEMS THE USER ALREADY OWNS:\n${itemList}\n\nIMPORTANT WARDROBE INSTRUCTIONS:\n- When suggesting outfit combinations, PRIORITIZE items from the user's existing wardrobe\n- In outfitSuggestions, include at least 1-2 items the user already owns and mark them with \"` + wardrobeTag + `\" suffix\n- Only recommend buying NEW items that complement what they already have\n- If the current outfit includes items from their wardrobe, mention this positively\n- Shopping recommendations should fill GAPS in their wardrobe, not duplicate what they own\n- CRITICAL FOR IMPROVEMENTS: When suggesting an improvement (e.g. \"upgrade your shirt\"), CHECK if the user already owns a suitable alternative in their wardrobe. ONLY suggest a wardrobe item if its STYLE matches the recommendation. For example:\n  * If you recommend a CLASSIC watch, do NOT suggest a SMART watch from the wardrobe (and vice versa)\n  * If you recommend FORMAL shoes, do NOT suggest SNEAKERS from the wardrobe\n  * If you recommend a BLAZER, do NOT suggest a HOODIE from the wardrobe\n  * The wardrobe item must match the SPIRIT and STYLE of the recommendation, not just the category\n- If the user owns a suitable item, MENTION IT in the improvement description — e.g. \"` + (isHebrew ? "יש לך בארון חולצת פשתן לבנה של Zara שתתאים מצוין כאן" : "You already have a white Zara linen shirt in your closet that would work great here") + `\"\n- When a wardrobe item matches an improvement, include the item name EXACTLY as listed above so we can link to it\n- If NO wardrobe item matches the recommendation's style, do NOT mention any wardrobe item — just recommend buying a new one`;
  }

  const doctrineStage1 = getDoctrineForStage1();

  return `You are an elite fashion consultant and stylist with encyclopedic knowledge of fashion houses, designers, and current 2025-2026 trends. Analyze the outfit in this image and provide a comprehensive, personalized fashion review in ${langLabel}.

${doctrineStage1}

${tasteProfileText ? tasteProfileText + "\n\n" : ""}METHODOLOGY: Scan head-to-toe systematically. For each item: identify specific material/fabric, precise color shade, fit/silhouette, construction details. Then identify brands from visual evidence. Finally evaluate styling coherence using the Fashion Doctrine principles above.

BRAND IDENTIFICATION: Use confidence levels — HIGH (logo visible), MEDIUM (strong visual cues, use hedging: "כפי הנראה"/"appears to be"), LOW (educated guess). Item "name" field stays generic (no brand). A wrong confident ID is worse than no ID.

${(() => {
  const userCountry = profile?.country || (isHebrew ? "IL" : "");
  const localBrands = userCountry ? COUNTRY_LOCAL_BRANDS[userCountry] : null;
  const countryLocale = userCountry && COUNTRY_STORE_MAP[userCountry] ? COUNTRY_STORE_MAP[userCountry].locale : "";
  if (localBrands) {
    return `LOCAL ${countryLocale.toUpperCase()} BRANDS — CRITICAL FOR THIS USER:
This user is from ${countryLocale}. Many local users wear local brands. You MUST be familiar with these and identify them when visible:

MAINSTREAM RETAIL CHAINS:
${localBrands.mainstream.map(b => `- ${b}`).join("\n")}

LOCAL DESIGNER / PREMIUM BRANDS:
${localBrands.designer.map(b => `- ${b}`).join("\n")}

LOCAL FOOTWEAR:
${localBrands.footwear.map(b => `- ${b}`).join("\n")}

IMPORTANT: ${localBrands.tip} Do NOT default to international brand guesses when the item could easily be from a local brand.`;
  }
  return `LOCAL BRAND AWARENESS:
Be aware that users may wear local/regional fashion brands that are not internationally known. If you see unfamiliar logos or text in a non-Latin script on labels, acknowledge the item descriptively without forcing an international brand identification.`;
})()}

ACCESSORY & JEWELRY DETECTION:
Scan hands, wrists, neck, ears, face for: rings, bracelets, watches, necklaces, earrings, sunglasses, belts, hats, bags, phone case. Each visible accessory = separate item in "items" array. If none visible due to image quality, note it. Phone case: include as item but do NOT let it affect scores.

Reference 2025-2026 trends from Vogue, GQ, SSENSE, MR PORTER, Milan/Paris Fashion Week, and street style.
${influencerSection}${styleNotesSection}${occasionSection}${profileSection}${wardrobeSection}

THIS IS STAGE 1 ONLY — return ONLY: overallScore, summary, items, scores, linkedMentions, personDetection, lookStructure. Do NOT return improvements, outfitSuggestions, trendSources, or influencerInsight (those come in Stage 2).

PERSON DETECTION (REQUIRED):
Before analyzing items, scan the image for person/body information:
- How many people are in the image?
- Is the full body visible (head to toe)?
- Is the face visible? Hands? Feet/shoes?
- Is any part of the body occluded (hidden behind objects, cropped, etc.)?
- What is the body pose (standing, sitting, walking, leaning)?
- Brief pose description (e.g. "standing facing camera, hands in pockets")
This data is CRITICAL for downstream features — if feet are not visible, we know shoe analysis may be limited.

ENRICHED ITEM METADATA (REQUIRED FOR EACH ITEM):
For EVERY item, you MUST provide structured metadata beyond just name/description:
- garmentType: specific type in English ("t-shirt", "dress shirt", "jeans", "sneakers", "ring", "watch")
- subCategory: more specific ("crew neck tee", "slim jeans", "leather oxford", "aviator sunglasses")
- bodyZone: "upper" / "lower" / "outerwear" / "footwear" / "accessory" / "jewelry" / "full-body"
- layerIndex: 1=base, 2=mid, 3=outer
- visibility: "full" / "partial" / "minimal" — how much of the item is visible in the image
- preciseColor: exact shade in English ("navy blue", "charcoal gray", "off-white", "burgundy")
- secondaryColor: if multi-color ("" if solid)
- colorFamily: "blue" / "neutral" / "earth" / "warm" / "cool" / "monochrome" / "multicolor"
- colorCount: number of distinct colors (1=solid, 2+=multi)
- pattern: "solid" / "striped" / "checkered" / "floral" / "geometric" / "graphic" / "logo" / "animal" / "abstract"
- material: "cotton" / "denim" / "leather" / "knit" / "linen" / "satin" / "wool" / "synthetic" / "silk" / "suede" / "canvas" / "metal" / "rubber"
- texture: "smooth" / "ribbed" / "matte" / "shiny" / "washed" / "distressed" / "knitted" / "brushed"
- fit: "slim" / "regular" / "relaxed" / "oversized" / "cropped" / "tailored" / "boxy" / "n/a"
- garmentLength: "short" / "regular" / "long" / "cropped" / "midi" / "maxi" / "knee-length" / "n/a"
- sleeveLength: "short" / "long" / "3/4" / "sleeveless" / "rolled" / "cap" / "n/a"
- neckline: "crew" / "v-neck" / "polo" / "button-down" / "turtleneck" / "hoodie" / "scoop" / "boat" / "n/a"
- closure: "buttons" / "zipper" / "pullover" / "open" / "snap" / "lace-up" / "buckle" / "none" / "n/a"
- condition: "clean" / "wrinkled" / "worn" / "distressed" / "pristine"
- hasLogo: true/false
- prominentBranding: true/false (large/obvious branding)
- details: notable details ("chest pocket", "embroidery", "contrast stitching", "none")
Use "n/a" for fields not applicable to the item type (e.g. sleeveLength for shoes).

LOOK STRUCTURE (REQUIRED):
After analyzing all items, provide an overall look composition:
- totalItemCount: total garments + accessories
- hasLayering: are there multiple clothing layers?
- layerCount: 1/2/3+
- colorHarmony: "monochromatic" / "neutral" / "complementary" / "contrasting" / "colorful"
- dominantItem: which item dominates visually
- proportions: "balanced" / "top-heavy" / "bottom-heavy"
- silhouetteSummary: brief ("wide top + narrow bottom", "straight line", "layered")

Respond with valid JSON matching this schema:
{
  "overallScore": <5-10>,
  "summary": "<4-5 sentence expert summary in ${langLabel}: compliment strongest element, identify style direction, reference 2025-2026 trend, name the aesthetic, suggest one upgrade. No brand names in summary.>",
  "personDetection": { "peopleCount": <number>, "fullBodyVisible": <bool>, "faceVisible": <bool>, "handsVisible": <bool>, "feetVisible": <bool>, "bodyOcclusion": "<none/partial/significant>", "bodyPose": "<standing/sitting/walking/leaning/crouching/other>", "poseDescription": "<brief description>" },
  "items": [{ "name": "<item name in ${langLabel}, no brand>", "description": "<material, color shade, construction details in ${langLabel}. No brand names.>", "color": "<main color>", "score": <5-10>, "verdict": "<${isHebrew ? "בחירה מצוינת/ניגודיות טובה/יש פוטנציאל/ניתן לשדרג" : "Excellent choice/Good contrast/Has potential/Can be upgraded"}>", "analysis": "<2-3 sentences: material ID, trend connection, what would make it a 10. No brand names.>", "icon": "<👕/👖/👟/💍/🧥/👔/⌚/🕶️/👜/🧢/💿>", "garmentType": "<type>", "subCategory": "<sub-type>", "bodyZone": "<zone>", "layerIndex": <1-3>, "visibility": "<full/partial/minimal>", "preciseColor": "<exact shade>", "secondaryColor": "<or empty>", "colorFamily": "<family>", "colorCount": <number>, "pattern": "<pattern>", "material": "<material>", "texture": "<texture>", "fit": "<fit>", "garmentLength": "<length>", "sleeveLength": "<sleeve>", "neckline": "<neckline>", "closure": "<closure>", "style": "<casual/smart-casual/formal/streetwear/minimalist/classic/sporty/bohemian/avant-garde/preppy/elegant>", "condition": "<condition>", "hasLogo": <bool>, "prominentBranding": <bool>, "details": "<details>" }],
  "scores": [{ "category": "<in ${langLabel}>", "score": <5-10 or null>, "explanation": "<1 sentence WHY this score>", "recommendation": "<if null, suggest what fits>" }],
  "lookStructure": { "totalItemCount": <number>, "hasLayering": <bool>, "layerCount": <number>, "colorHarmony": "<type>", "dominantItem": "<item>", "proportions": "<type>", "silhouetteSummary": "<brief>" },
  "linkedMentions": [{ "text": "<exact name as in analysis>", "type": "<brand/influencer/item/store>", "url": "<official URL or Instagram>" }]
}

Score categories (in ${langLabel}): ${isHebrew ? "איכות הפריטים, התאמת גזרה, צבעוניות, שכבתיות, אקססוריז ותכשיטים, התאמה לגיל ולסגנון, נעליים, זיהוי מותגים" : "Item Quality, Fit, Color Palette, Layering, Accessories & Jewelry, Age & Style Match, Footwear, Brand Recognition"}. Phone case doesn't affect Accessories score.

SCORING: 5-10 range. Differentiate scores (not all 7-8). Justify concretely. Be encouraging.
BRAND IDENTIFICATION — ZERO TOLERANCE FOR EMPTY BRANDS (CRITICAL):
This is the #1 premium feature of our app. You MUST identify or guess a brand for EVERY SINGLE ITEM. Empty brand fields are UNACCEPTABLE.

RULES:
1. The "brand" field must NEVER be empty (""). Every item MUST have a brand name.
2. If you can clearly see a logo/label → set brand name + brandConfidence = "HIGH"
3. If visual cues strongly suggest a brand → set brand name + brandConfidence = "MEDIUM"
4. If you're making an educated guess based on style/quality/price tier → set brand name + brandConfidence = "LOW"
5. If you truly have zero clue → STILL guess the most likely brand based on the item type, quality, and style. Use brandConfidence = "LOW".
6. NEVER leave brand as empty string. NEVER.

KEY BRAND MARKERS (HIGH confidence when visible):
"H" on footwear/belt/bag → Hermès (NOT Hugo Boss/Valentino). CC → Chanel. LV/Damier → Louis Vuitton. GG/red-green → Gucci. FF → Fendi. CD/Oblique → Dior. Medusa → Versace. Swoosh → Nike. 3 stripes → Adidas. Polo horse → Ralph Lauren. Crocodile → Lacoste. YSL → Saint Laurent. TB → Burberry. Rockstud → Valentino. Red sole → Louboutin. Intrecciato → Bottega Veneta. Compass patch → Stone Island. Rooster patch → Moncler.

Identify brands via: logos, patterns, silhouette, fabric quality, hardware, and construction. For premium users, prefer luxury brand guesses over fast fashion. NEVER leave brand empty — always guess with appropriate confidence level (HIGH/MEDIUM/LOW/NONE).

BRAND NAME PLACEMENT: Brand goes ONLY in "brand" field. NEVER mention brand names in "name", "description", or "analysis" fields — the UI shows brand as a separate badge. Focus description/analysis on materials, colors, construction, trends.

${(profile?.budgetLevel === 'premium' || profile?.budgetLevel === 'luxury') ? `
PREMIUM/LUXURY USER BRAND SCORING:
- For premium/luxury users, the "זיהוי מותגים" score = how many items you successfully identified with a brand guess
- Score 9-10: ALL items have brand guesses with at least MEDIUM confidence on most
- Score 7-8: Most items have brand guesses but some are LOW confidence
- Score 5-6: Few items identified — this means YOU failed, not the user
- The score reflects YOUR identification ability, not the user's brand choices
- Do NOT inflate scores just because the user wears premium/luxury brands. Score each category based on the actual quality, fit, and styling — not brand prestige.
- Even "quiet luxury" items MUST be identified: The Row, Brunello Cucinelli, Loro Piana, Totême, COS, Arket, etc.
` : `
BRAND SCORING FOR ALL USERS:
- The "זיהוי מותגים" score = how many items you successfully identified with a brand guess
- Score 9-10: ALL items have brand guesses, most with MEDIUM+ confidence
- Score 7-8: Most items identified, some LOW confidence guesses
- Score 5-6: Few items identified — this means YOU failed at identification
- ALWAYS guess a brand. Users WANT to know what you think they're wearing.
- Even basic items have brands: a plain white tee is still probably Uniqlo, H&M, Zara, or COS
`}

CONTEXT-AWARE SCORING:
- Consider weather/time when scoring. Don't penalize missing layers in warm weather or missing sunglasses at night.
- Score weighting: HIGH = Item Quality, Fit, Color, Style Match. MEDIUM = Footwear, Brands. LOW = Layering, Accessories.
- Non-visible categories: set score to null with a recommendation for what would complement the outfit. Null scores don't affect overallScore.
- If image is blurry/cropped, note it in the summary and suggest a better photo.

REQUIREMENTS:
- 4-6 items (include every visible accessory). 8 score categories.
- linkedMentions for every brand/influencer/store mentioned.
- Brand confidence: HIGH (logo visible), MEDIUM (strong cues), LOW (educated guess). For MEDIUM/LOW use hedging language.

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no explanation.`;
}

type FixMyLookProductDetail = {
  improvementIndex: number;
  productLabel: string;
  productImageUrl: string;
};

function detectColorHint(text: string): string | null {
  const normalized = text.toLowerCase();
  // Map Hebrew forms (masculine, feminine, plural) to canonical English color
  const hebrewColorMap: [RegExp, string][] = [
    [/שחור[הים]?/, "BLACK"],
    [/לבנ[הים]?|לבן/, "WHITE"],
    [/כחול[הים]?/, "BLUE"],
    [/כהי[םה]?/, "DARK"],  // modifier: כהים = dark
    [/אדו[םמה]?/, "RED"],
    [/ירוק[הים]?/, "GREEN"],
    [/בז'?|בז'/, "BEIGE"],
    [/חו[םמ][הים]?/, "BROWN"],
    [/אפור[הים]?/, "GREY"],
    [/ורו[דד][הים]?/, "PINK"],
    [/סגו[לל][הים]?/, "PURPLE"],
    [/כתו[םמ][הים]?/, "ORANGE"],
    [/צהו[בב][הים]?/, "YELLOW"],
    [/זהב|זהוב[הים]?/, "GOLD"],
    [/כסוף|כסופ[הים]?/, "SILVER"],
  ];
  // Check Hebrew first
  for (const [regex, color] of hebrewColorMap) {
    if (regex.test(normalized)) return color;
  }
  // Check English colors — use word boundaries to prevent false matches (e.g. "premium" matching "red")
  const englishColors = [
    "black", "white", "navy", "dark blue", "light blue", "blue", "red", "green", "beige", "brown", "gray", "grey",
    "khaki", "cream", "pink", "purple", "orange", "yellow", "gold", "silver", "olive",
    "burgundy", "teal", "charcoal", "dark green",
  ];
  for (const hint of englishColors) {
    const regex = new RegExp(`\\b${hint}\\b`);
    if (regex.test(normalized)) return hint.toUpperCase();
  }
  return null;
}

function buildDeterministicFixMyLookPrompt(params: {
  analysis: FashionAnalysis;
  itemsToFix: FashionAnalysis["items"];
  relevantImprovements: Improvement[];
  allImprovements: Improvement[];
  selectedProductDetails?: FixMyLookProductDetail[];
  imageOrientation: string;
  imageDimensions: { width: number; height: number };
  tasteProfileText?: string | null;
}): string {
  const {
    analysis,
    itemsToFix,
    relevantImprovements,
    allImprovements,
    selectedProductDetails,
    imageOrientation,
    imageDimensions,
    tasteProfileText,
  } = params;

  const selectedByImprovementIndex = new Map<number, FixMyLookProductDetail>();
  for (const detail of selectedProductDetails || []) {
    selectedByImprovementIndex.set(detail.improvementIndex, detail);
  }

  // Track which product images are included as references (image[1], image[2], etc.)
  let productImageRefIndex = 1; // image[0] is always the user's original photo
  const replacementLines = relevantImprovements.map((imp, impListIdx) => {
    const improvementIndex = allImprovements.indexOf(imp);
    const selected = improvementIndex >= 0 ? selectedByImprovementIndex.get(improvementIndex) : undefined;
    const targetLabel = selected?.productLabel || imp.afterLabel || imp.title;

    // ---- Build rich BEFORE description from structured metadata ----
    const beforeParts: string[] = [];
    if (imp.beforeFit) beforeParts.push(imp.beforeFit);
    if (imp.beforeMaterial) beforeParts.push(imp.beforeMaterial);
    if (imp.beforeNeckline && imp.beforeNeckline !== "n/a") beforeParts.push(imp.beforeNeckline);
    if (imp.beforeSleeveLength && imp.beforeSleeveLength !== "n/a") beforeParts.push(`${imp.beforeSleeveLength}-sleeve`);
    if (imp.beforePattern && imp.beforePattern !== "solid") beforeParts.push(imp.beforePattern);
    if (imp.beforeColor) beforeParts.push(imp.beforeColor);
    if (imp.beforeGarmentType) beforeParts.push(imp.beforeGarmentType);
    const richBeforeDesc = beforeParts.length >= 3
      ? beforeParts.join(" ")
      : (imp.beforeLabel || imp.title);

    // ---- Build rich AFTER description from structured metadata ----
    const afterParts: string[] = [];
    if (imp.afterFit) afterParts.push(imp.afterFit);
    if (imp.afterMaterial) afterParts.push(imp.afterMaterial);
    if (imp.afterNeckline && imp.afterNeckline !== "n/a") afterParts.push(imp.afterNeckline);
    if (imp.afterSleeveLength && imp.afterSleeveLength !== "n/a") afterParts.push(`${imp.afterSleeveLength}-sleeve`);
    if (imp.afterPattern && imp.afterPattern !== "solid") afterParts.push(imp.afterPattern);
    if (imp.afterColor) afterParts.push(imp.afterColor);
    if (imp.afterGarmentType) afterParts.push(imp.afterGarmentType);
    const richAfterDesc = afterParts.length >= 3
      ? afterParts.join(" ")
      : targetLabel;

    // ---- Extra detail lines for texture, closure, details, length, style ----
    const extraAfterSpecs: string[] = [];
    if (imp.afterTexture) extraAfterSpecs.push(`texture: ${imp.afterTexture}`);
    if (imp.afterClosure && imp.afterClosure !== "n/a") extraAfterSpecs.push(`closure: ${imp.afterClosure}`);
    if (imp.afterDetails && imp.afterDetails !== "none") extraAfterSpecs.push(`details: ${imp.afterDetails}`);
    if (imp.afterLength) extraAfterSpecs.push(`length: ${imp.afterLength}`);
    if (imp.afterStyle) extraAfterSpecs.push(`style: ${imp.afterStyle}`);
    const extraSpecsStr = extraAfterSpecs.length > 0 ? ` (${extraAfterSpecs.join(", ")})` : "";

    // ---- Color extraction — priority order ----
    const structuredAfterColor = (imp.afterColor || "").trim() || null;
    const colorFromProduct = !structuredAfterColor && selected?.productLabel ? detectColorHint(selected.productLabel) : null;
    const legacyFallback = !structuredAfterColor && !colorFromProduct
      ? (detectColorHint(imp.afterLabel || "") || detectColorHint(imp.beforeLabel || ""))
      : null;
    const colorHint = structuredAfterColor?.toUpperCase() || colorFromProduct || legacyFallback;

    let colorInstruction: string;
    if (colorHint) {
      colorInstruction = `MANDATORY COLOR: ${colorHint}. Use EXACTLY this color with ZERO substitution.`;
    } else if (selected?.productImageUrl) {
      colorInstruction = `CRITICAL: Copy the EXACT color from the product reference image. NEVER default to red or warm tones.`;
    } else {
      colorInstruction = `WARNING: No color provided. Keep the SAME color as the original garment in image[0]. NEVER introduce red or warm tones.`;
    }

    // ---- Pattern instruction ----
    const patternHint = imp.afterPattern && imp.afterPattern !== "solid"
      ? ` PATTERN: ${imp.afterPattern.toUpperCase()} — the garment MUST show this pattern.`
      : imp.afterPattern === "solid" ? " PATTERN: SOLID — single uniform color, no patterns." : "";

    // ---- Material/texture instruction ----
    const materialHint = imp.afterMaterial
      ? ` MATERIAL: ${imp.afterMaterial} — render fabric draping, sheen, and texture consistent with ${imp.afterMaterial}.`
      : "";

    let imageRef = "";
    if (selected?.productImageUrl) {
      imageRef = ` Reference product photo is image[${productImageRefIndex}] — copy its EXACT color, pattern, texture, and style from this image.`;
      productImageRefIndex++;
    }
    return `- Replace the "${richBeforeDesc}" with a "${richAfterDesc}"${extraSpecsStr}. ${colorInstruction}${patternHint}${materialHint}${imageRef}`;
  });

  const fallbackReplacements = itemsToFix.map((item) => {
    // Build rich description from enriched FashionItem metadata (Stage 29)
    const parts: string[] = [];
    if (item.fit && item.fit !== "n/a") parts.push(item.fit);
    if (item.material) parts.push(item.material);
    if (item.neckline && item.neckline !== "n/a") parts.push(item.neckline);
    if (item.sleeveLength && item.sleeveLength !== "n/a") parts.push(`${item.sleeveLength}-sleeve`);
    if (item.preciseColor) parts.push(item.preciseColor);
    else if (item.color) parts.push(item.color);
    if (item.garmentType) parts.push(item.garmentType);
    const richDesc = parts.length >= 3 ? parts.join(" ") : item.name;
    return `- Replace "${richDesc}" with a more flattering, premium, trend-aware alternative that matches the overall look.`;
  });

  const keepLines = (analysis.items || [])
    .filter(item => !itemsToFix.includes(item))
    .slice(0, 12)
    .map(item => {
      // Use enriched metadata for more precise keep instructions
      const parts: string[] = [];
      if (item.preciseColor) parts.push(item.preciseColor);
      else if (item.color) parts.push(item.color);
      if (item.garmentType) parts.push(item.garmentType);
      const desc = parts.length > 0 ? `${item.name} (${parts.join(" ")})` : item.name;
      return `- Keep "${desc}" unchanged.`;
    });

  const orientationText = imageDimensions.width > 0 && imageDimensions.height > 0
    ? `${imageOrientation} (${imageDimensions.width}x${imageDimensions.height})`
    : imageOrientation;

  return [
    `IMAGE EDITING TASK — edit the user's photo (image[0]) in-place.`,
    ``,
    `## ABSOLUTE IDENTITY LOCK (HIGHEST PRIORITY — NON-NEGOTIABLE)`,
    `image[0] is the USER'S ORIGINAL PHOTO.`,
    `The output image MUST be IDENTICAL to image[0] in every aspect EXCEPT the specific garments listed below for replacement.`,
    `MANDATORY — preserve with ZERO deviation:`,
    `- The EXACT same person (face, skin tone, facial hair, hair style, hair color, expression)`,
    `- The EXACT same body shape, proportions, and pose`,
    `- The EXACT same background, environment, lighting, shadows, camera angle`,
    `- The EXACT same accessories, jewelry, watch, phone, bag — unless explicitly listed for replacement`,
    `- The EXACT same shoes — unless explicitly listed for replacement`,
    `- ALL unreplaced clothing items must remain PIXEL-IDENTICAL to the original`,
    `Do NOT replace, beautify, reshape, age, de-age, or retouch the person in ANY way.`,
    `Do NOT change the background, crop, or framing.`,
    `If you cannot preserve identity perfectly, return the original image unchanged rather than producing an inaccurate result.`,
    ``,
    productImageRefIndex > 1 ? [
      `## PRODUCT REFERENCE IMAGES`,
      `image[1]${productImageRefIndex > 2 ? ` through image[${productImageRefIndex - 1}]` : ''} are PRODUCT REFERENCE PHOTOS showing the exact garments the user selected.`,
      `For each replacement below, copy the EXACT color, pattern, texture, and style from the corresponding product reference image.`,
      `Do NOT invent or substitute colors. The garment in the output MUST match the product reference image exactly.`,
      `Copy ONLY the garment appearance — do NOT copy the model/mannequin from product photos.`,
    ].join('\n') : '',
    ``,
    `## COLOR ACCURACY (CRITICAL — ABSOLUTE ZERO TOLERANCE)`,
    `This is the #1 failure mode to avoid: generating the WRONG COLOR.`,
    `RULES:`,
    `- If the product reference shows a WHITE garment → output MUST be WHITE. Not cream, not beige, not red, not any other color.`,
    `- If the product reference shows a BLUE garment → output MUST be BLUE. Not grey, not brown, not any other color.`,
    `- If the product reference shows a BLACK garment → output MUST be BLACK. Not dark grey, not navy.`,
    `- When in doubt, look at the product reference image and match its dominant color EXACTLY.`,
    `- NEVER generate red/warm tones unless the product reference explicitly shows red/warm tones.`,
    ``,
    `Output orientation and dimensions: ${orientationText}.`,
    ``,
    `## GARMENT REPLACEMENTS (apply ONLY these changes to the user in image[0]):`,
    ...(replacementLines.length > 0 ? replacementLines : fallbackReplacements),
    ``,
    `## ITEMS TO KEEP ABSOLUTELY UNCHANGED:`,
    ...(keepLines.length > 0 ? keepLines : ["- Keep ALL other visible items completely unchanged — identical to image[0]."]),
    `- CRITICAL: Every item not listed above for replacement must remain EXACTLY as it appears in image[0]. No modifications whatsoever.`,
    ``,
    `## STYLE COHERENCE (Fashion Doctrine):`,
    `- All replaced garments must work TOGETHER as a coherent outfit, not as isolated upgrades.`,
    `- Proportions must balance: if the top is oversized, the bottom should be slim (and vice versa).`,
    `- Color harmony: new garments must complement the kept items' colors — avoid clashing.`,
    `- The overall look should communicate ONE clear message (clean, luxurious, casual-elevated, etc.).`,
    `- Fabric quality should look consistent across all items — don't mix cheap-looking with premium.`,
    ...(tasteProfileText ? [
      ``,
      `## USER'S TASTE PROFILE (personalize the fix):`,
      tasteProfileText,
      `Use this profile to ensure replacements match the user's established style DNA, preferred materials, and color palette.`,
    ] : []),
    ``,
    `## QUALITY RULES:`,
    `- The output must be photorealistic — replaced garments must look naturally worn, not digitally pasted.`,
    `- Maintain natural fabric draping, wrinkles, and shadows consistent with the body and lighting.`,
    `- Keep proportions and perspective consistent with the original photo.`,
    `- If anything is ambiguous, prefer ZERO change over any deviation from the original.`,
  ].join("\n");
}

function extractLLMTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: any) => {
      if (typeof part === "string") return part;
      if (part?.type === "text" && typeof part?.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

type FashionAnalysisCorePayload = Pick<FashionAnalysis, "overallScore" | "summary" | "items" | "scores" | "linkedMentions" | "personDetection" | "lookStructure">;
type FashionRecommendationsPayload = Pick<FashionAnalysis, "improvements" | "outfitSuggestions" | "trendSources" | "influencerInsight">;

function parseFashionAnalysisPayload(llmResult: any): FashionAnalysis {
  const rawContent = extractLLMTextContent(llmResult?.choices?.[0]?.message?.content).trim();
  if (!rawContent) {
    throw new Error("INVALID_LLM_JSON: empty_content");
  }

  const cleaned = rawContent
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`INVALID_LLM_JSON: ${String(err?.message || "parse_failed")}`);
  }

  if (typeof parsed?.overallScore !== "number" || typeof parsed?.summary !== "string") {
    throw new Error("INVALID_LLM_JSON: missing_core_fields");
  }

  const requiredArrays = ["items", "scores", "improvements", "outfitSuggestions", "trendSources", "linkedMentions"];
  for (const key of requiredArrays) {
    if (!Array.isArray(parsed?.[key])) {
      throw new Error(`INVALID_LLM_JSON: missing_${key}`);
    }
  }

  return parsed as FashionAnalysis;
}

function parseFashionAnalysisCorePayload(llmResult: any): FashionAnalysisCorePayload {
  const rawContent = extractLLMTextContent(llmResult?.choices?.[0]?.message?.content).trim();
  if (!rawContent) {
    throw new Error("INVALID_LLM_JSON: empty_content");
  }
  const cleaned = rawContent
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`INVALID_LLM_JSON: ${String(err?.message || "parse_failed")}`);
  }
  if (typeof parsed?.overallScore !== "number" || typeof parsed?.summary !== "string") {
    throw new Error("INVALID_LLM_JSON: missing_core_fields");
  }
  const requiredArrays = ["items", "scores", "linkedMentions"];
  for (const key of requiredArrays) {
    if (!Array.isArray(parsed?.[key])) {
      throw new Error(`INVALID_LLM_JSON: missing_${key}`);
    }
  }
  return parsed as FashionAnalysisCorePayload;
}

function parseFashionRecommendationsPayload(llmResult: any): FashionRecommendationsPayload {
  const rawContent = extractLLMTextContent(llmResult?.choices?.[0]?.message?.content).trim();
  if (!rawContent) {
    throw new Error("INVALID_LLM_JSON: empty_content");
  }
  const cleaned = rawContent
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`INVALID_LLM_JSON: ${String(err?.message || "parse_failed")}`);
  }
  if (typeof parsed?.influencerInsight !== "string") {
    throw new Error("INVALID_LLM_JSON: missing_influencerInsight");
  }
  const requiredArrays = ["improvements", "outfitSuggestions", "trendSources"];
  for (const key of requiredArrays) {
    if (!Array.isArray(parsed?.[key])) {
      throw new Error(`INVALID_LLM_JSON: missing_${key}`);
    }
  }
  return parsed as FashionRecommendationsPayload;
}

export const analysisJsonSchema = {
  type: "object" as const,
  properties: {
    overallScore: { type: "number" as const },
    summary: { type: "string" as const },
      items: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          description: { type: "string" as const },
          color: { type: "string" as const },
          score: { type: "number" as const },
          verdict: { type: "string" as const },
          analysis: { type: "string" as const },
          icon: { type: "string" as const },
          brand: { type: "string" as const, description: "REQUIRED: The identified or guessed brand name. MUST NOT be empty. Always provide your best guess." },
          brandUrl: { type: "string" as const, description: "URL to brand website. Use BRAND_URLS mapping or brand's official site." },
          brandConfidence: { type: "string" as const, enum: ["HIGH", "MEDIUM", "LOW", "NONE"], description: "Brand identification confidence level" },
          // ── Stage 29: Enriched Garment Metadata ──
          garmentType: { type: "string" as const, description: "Specific garment type in English (e.g. 't-shirt', 'dress shirt', 'jeans', 'sneakers', 'blazer', 'ring', 'watch', 'belt', 'sunglasses')" },
          subCategory: { type: "string" as const, description: "More specific sub-category (e.g. 'crew neck tee', 'slim jeans', 'leather oxford', 'mini dress', 'aviator sunglasses')" },
          bodyZone: { type: "string" as const, enum: ["upper", "lower", "outerwear", "footwear", "accessory", "jewelry", "full-body"], description: "Body zone where the item is worn" },
          layerIndex: { type: "number" as const, description: "Layer index: 1=base layer, 2=mid layer, 3=outer layer" },
          visibility: { type: "string" as const, enum: ["full", "partial", "minimal"], description: "How much of the item is visible in the image" },
          preciseColor: { type: "string" as const, description: "Precise color shade in English (e.g. 'navy blue', 'charcoal gray', 'off-white', 'burgundy', 'olive green')" },
          secondaryColor: { type: "string" as const, description: "Secondary color if multi-color item (e.g. 'white' for navy/white stripes). Empty string if solid." },
          colorFamily: { type: "string" as const, enum: ["blue", "neutral", "earth", "warm", "cool", "monochrome", "multicolor"], description: "Color family group" },
          colorCount: { type: "number" as const, description: "Number of distinct colors in the item (1=solid, 2+=multi)" },
          pattern: { type: "string" as const, description: "Pattern type: 'solid', 'striped', 'checkered', 'floral', 'geometric', 'graphic', 'logo', 'animal', 'abstract', 'polka dot'" },
          material: { type: "string" as const, description: "Primary material/fabric: 'cotton', 'denim', 'leather', 'knit', 'linen', 'satin', 'wool', 'synthetic', 'silk', 'suede', 'canvas', 'metal', 'rubber'" },
          texture: { type: "string" as const, description: "Surface texture: 'smooth', 'ribbed', 'matte', 'shiny', 'washed', 'distressed', 'knitted', 'brushed', 'glossy'" },
          fit: { type: "string" as const, description: "Fit/silhouette: 'slim', 'regular', 'relaxed', 'oversized', 'cropped', 'tailored', 'boxy', 'n/a'" },
          garmentLength: { type: "string" as const, description: "Garment length: 'short', 'regular', 'long', 'cropped', 'midi', 'maxi', 'knee-length', 'n/a'" },
          sleeveLength: { type: "string" as const, description: "Sleeve length: 'short', 'long', '3/4', 'sleeveless', 'rolled', 'cap', 'n/a'" },
          neckline: { type: "string" as const, description: "Neckline/collar: 'crew', 'v-neck', 'polo', 'button-down', 'turtleneck', 'hoodie', 'scoop', 'boat', 'n/a'" },
          closure: { type: "string" as const, description: "Closure type: 'buttons', 'zipper', 'pullover', 'open', 'snap', 'lace-up', 'buckle', 'none', 'n/a'" },
          style: { type: "string" as const, description: "Overall style category: 'casual', 'smart-casual', 'formal', 'streetwear', 'minimalist', 'classic', 'sporty', 'bohemian', 'avant-garde', 'preppy', 'elegant'" },
          condition: { type: "string" as const, description: "Visible condition: 'clean', 'wrinkled', 'worn', 'distressed', 'pristine'" },
          hasLogo: { type: "boolean" as const, description: "Whether a logo/brand marking is visible on the item" },
          prominentBranding: { type: "boolean" as const, description: "Whether branding is large/prominent (vs subtle/small)" },
          details: { type: "string" as const, description: "Notable details: 'chest pocket', 'embroidery', 'contrast stitching', 'distressed hem', 'metal hardware', 'none'" },
        },
        required: ["name", "description", "color", "score", "verdict", "analysis", "icon", "brand", "brandUrl", "brandConfidence", "garmentType", "subCategory", "bodyZone", "layerIndex", "visibility", "preciseColor", "secondaryColor", "colorFamily", "colorCount", "pattern", "material", "texture", "fit", "garmentLength", "sleeveLength", "neckline", "closure", "style", "condition", "hasLogo", "prominentBranding", "details"] as const,
        additionalProperties: false,
      },
    },
    scores: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          category: { type: "string" as const },
          score: { anyOf: [{ type: "number" as const }, { type: "null" as const }] } as any,
          explanation: { type: "string" as const },
          recommendation: { type: "string" as const },
        },
        required: ["category", "score", "explanation", "recommendation"] as const,
        additionalProperties: false,
      },
    },
    improvements: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          description: { type: "string" as const },
          beforeLabel: { type: "string" as const },
          afterLabel: { type: "string" as const },
          beforeColor: { type: "string" as const, description: "MANDATORY: Explicit color of the BEFORE item in English lowercase (e.g. 'black', 'white', 'navy blue', 'light gray'). MUST always be provided based on the detected item." },
          afterColor: { type: "string" as const, description: "MANDATORY: Explicit color of the AFTER (recommended) item in English lowercase (e.g. 'black', 'white', 'navy blue'). MUST always be provided. Must match the recommended product color." },
          // Garment Identity
          beforeGarmentType: { type: "string" as const, description: "Specific garment type of the BEFORE item (e.g. 't-shirt', 'dress shirt', 'polo', 'sweatshirt', 'hoodie', 'blazer', 'jeans', 'chinos', 'sneakers', 'oxford shoes', 'crop top', 'maxi dress')" },
          afterGarmentType: { type: "string" as const, description: "Specific garment type of the AFTER item (e.g. 't-shirt', 'dress shirt', 'polo', 'sweatshirt', 'hoodie', 'blazer', 'jeans', 'chinos', 'sneakers', 'oxford shoes', 'crop top', 'maxi dress')" },
          beforeStyle: { type: "string" as const, description: "Style category of the BEFORE item (e.g. 'casual', 'formal', 'smart-casual', 'sporty', 'streetwear', 'minimalist', 'classic', 'bohemian')" },
          afterStyle: { type: "string" as const, description: "Style category of the AFTER item (e.g. 'casual', 'formal', 'smart-casual', 'sporty', 'streetwear', 'minimalist', 'classic', 'bohemian')" },
          // Fit & Structure
          beforeFit: { type: "string" as const, description: "Fit/silhouette of the BEFORE item (e.g. 'slim', 'regular', 'oversized', 'tailored', 'boxy', 'relaxed')" },
          afterFit: { type: "string" as const, description: "Fit/silhouette of the AFTER item (e.g. 'slim', 'regular', 'oversized', 'tailored', 'boxy', 'relaxed')" },
          beforeLength: { type: "string" as const, description: "Garment length of the BEFORE item (e.g. 'cropped', 'regular', 'long', 'midi', 'knee-length', 'hip-length')" },
          afterLength: { type: "string" as const, description: "Garment length of the AFTER item (e.g. 'cropped', 'regular', 'long', 'midi', 'knee-length', 'hip-length')" },
          beforeSleeveLength: { type: "string" as const, description: "Sleeve length of the BEFORE item (e.g. 'short', 'long', '3/4', 'sleeveless', 'rolled-up', 'n/a' for non-tops)" },
          afterSleeveLength: { type: "string" as const, description: "Sleeve length of the AFTER item (e.g. 'short', 'long', '3/4', 'sleeveless', 'rolled-up', 'n/a' for non-tops)" },
          beforeNeckline: { type: "string" as const, description: "Neckline/collar of the BEFORE item (e.g. 'crew neck', 'v-neck', 'polo collar', 'button-down collar', 'turtleneck', 'hoodie', 'n/a')" },
          afterNeckline: { type: "string" as const, description: "Neckline/collar of the AFTER item (e.g. 'crew neck', 'v-neck', 'polo collar', 'button-down collar', 'turtleneck', 'hoodie', 'n/a')" },
          beforeClosure: { type: "string" as const, description: "Closure type of the BEFORE item (e.g. 'pullover', 'buttons', 'zipper', 'wrap', 'lace-up', 'n/a')" },
          afterClosure: { type: "string" as const, description: "Closure type of the AFTER item (e.g. 'pullover', 'buttons', 'zipper', 'wrap', 'lace-up', 'n/a')" },
          // Material & Texture
          beforeMaterial: { type: "string" as const, description: "Fabric/material of the BEFORE item (e.g. 'cotton', 'linen', 'denim', 'leather', 'silk', 'wool', 'polyester', 'knit', 'suede')" },
          afterMaterial: { type: "string" as const, description: "Fabric/material of the AFTER item (e.g. 'cotton', 'linen', 'denim', 'leather', 'silk', 'wool', 'polyester', 'knit', 'suede')" },
          beforeTexture: { type: "string" as const, description: "Surface texture of the BEFORE item (e.g. 'smooth', 'ribbed', 'knitted', 'matte', 'shiny', 'distressed', 'brushed')" },
          afterTexture: { type: "string" as const, description: "Surface texture of the AFTER item (e.g. 'smooth', 'ribbed', 'knitted', 'matte', 'shiny', 'distressed', 'brushed')" },
          // Pattern & Details
          beforePattern: { type: "string" as const, description: "Pattern of the BEFORE item (e.g. 'solid', 'striped', 'checkered', 'floral', 'graphic print', 'polka dot', 'camouflage')" },
          afterPattern: { type: "string" as const, description: "Pattern of the AFTER item (e.g. 'solid', 'striped', 'checkered', 'floral', 'graphic print', 'polka dot', 'camouflage')" },
          beforeDetails: { type: "string" as const, description: "Distinctive visible details of the BEFORE item (e.g. 'visible logo', 'chest pocket', 'embroidery', 'distressed/ripped', 'contrast stitching', 'metal hardware', 'none')" },
          afterDetails: { type: "string" as const, description: "Distinctive visible details of the AFTER item (e.g. 'visible logo', 'chest pocket', 'embroidery', 'distressed/ripped', 'contrast stitching', 'metal hardware', 'none')" },
          productSearchQuery: { type: "string" as const },
          shoppingLinks: {
            type: "array" as const,
            minItems: 3,
            items: {
              type: "object" as const,
              properties: {
                label: { type: "string" as const },
                url: { type: "string" as const },
                imageUrl: { type: "string" as const },
              },
              required: ["label", "url", "imageUrl"] as const,
              additionalProperties: false,
            },
          },
        },
        required: ["title", "description", "beforeLabel", "afterLabel", "beforeColor", "afterColor", "beforeGarmentType", "afterGarmentType", "beforeStyle", "afterStyle", "beforeFit", "afterFit", "beforeLength", "afterLength", "beforeSleeveLength", "afterSleeveLength", "beforeNeckline", "afterNeckline", "beforeClosure", "afterClosure", "beforeMaterial", "afterMaterial", "beforeTexture", "afterTexture", "beforePattern", "afterPattern", "beforeDetails", "afterDetails", "productSearchQuery", "shoppingLinks"] as const,
        additionalProperties: false,
      },
    },
    outfitSuggestions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          occasion: { type: "string" as const },
          items: { type: "array" as const, items: { type: "string" as const } },
          colors: { type: "array" as const, items: { type: "string" as const } },
          lookDescription: { type: "string" as const },
          inspirationNote: { type: "string" as const },
        },
        required: ["name", "occasion", "items", "colors", "lookDescription", "inspirationNote"] as const,
        additionalProperties: false,
      },
    },
    trendSources: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          source: { type: "string" as const },
          title: { type: "string" as const },
          url: { type: "string" as const },
          relevance: { type: "string" as const },
          season: { type: "string" as const },
        },
        required: ["source", "title", "url", "relevance", "season"] as const,
        additionalProperties: false,
      },
    },
    influencerInsight: { type: "string" as const },
    linkedMentions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          text: { type: "string" as const },
          type: { type: "string" as const },
          url: { type: "string" as const },
        },
        required: ["text", "type", "url"] as const,
        additionalProperties: false,
      },
    },
  },
  required: ["overallScore", "summary", "items", "scores", "improvements", "outfitSuggestions", "trendSources", "influencerInsight", "linkedMentions"] as const,
  additionalProperties: false,
};

const personDetectionSchema = {
  type: "object" as const,
  properties: {
    peopleCount: { type: "number" as const, description: "Number of people visible in the image" },
    fullBodyVisible: { type: "boolean" as const, description: "Is the full body visible head to toe?" },
    faceVisible: { type: "boolean" as const, description: "Is the face clearly visible?" },
    handsVisible: { type: "boolean" as const, description: "Are the hands visible?" },
    feetVisible: { type: "boolean" as const, description: "Are the feet/shoes visible?" },
    bodyOcclusion: { type: "string" as const, description: "Body occlusion level: 'none', 'partial', 'significant'" },
    bodyPose: { type: "string" as const, description: "Body pose: 'standing', 'sitting', 'walking', 'leaning', 'crouching', 'other'" },
    poseDescription: { type: "string" as const, description: "Brief pose description, e.g. 'standing facing camera, hands in pockets'" },
  },
  required: ["peopleCount", "fullBodyVisible", "faceVisible", "handsVisible", "feetVisible", "bodyOcclusion", "bodyPose", "poseDescription"] as const,
  additionalProperties: false,
};

const lookStructureSchema = {
  type: "object" as const,
  properties: {
    totalItemCount: { type: "number" as const, description: "Total number of garments + accessories detected" },
    hasLayering: { type: "boolean" as const, description: "Whether multiple clothing layers are visible" },
    layerCount: { type: "number" as const, description: "Number of clothing layers (1=single, 2=two, 3+=complex)" },
    colorHarmony: { type: "string" as const, description: "Color harmony: 'monochromatic', 'neutral', 'complementary', 'contrasting', 'colorful'" },
    dominantItem: { type: "string" as const, description: "Which item dominates visually (e.g. 'outerwear', 'dress', 'graphic tee')" },
    proportions: { type: "string" as const, description: "Body proportions impression: 'balanced', 'top-heavy', 'bottom-heavy'" },
    silhouetteSummary: { type: "string" as const, description: "Brief silhouette summary: 'wide top + narrow bottom', 'straight line', 'layered', 'fitted throughout'" },
  },
  required: ["totalItemCount", "hasLayering", "layerCount", "colorHarmony", "dominantItem", "proportions", "silhouetteSummary"] as const,
  additionalProperties: false,
};

export const analysisCoreJsonSchema = {
  type: "object" as const,
  properties: {
    overallScore: { type: "number" as const },
    summary: { type: "string" as const },
    items: analysisJsonSchema.properties.items,
    scores: analysisJsonSchema.properties.scores,
    linkedMentions: analysisJsonSchema.properties.linkedMentions,
    personDetection: personDetectionSchema,
    lookStructure: lookStructureSchema,
  },
  required: ["overallScore", "summary", "items", "scores", "linkedMentions", "personDetection", "lookStructure"] as const,
  additionalProperties: false,
};

export const recommendationsJsonSchema = {
  type: "object" as const,
  properties: {
    improvements: analysisJsonSchema.properties.improvements,
    outfitSuggestions: analysisJsonSchema.properties.outfitSuggestions,
    trendSources: analysisJsonSchema.properties.trendSources,
    influencerInsight: { type: "string" as const },
  },
  required: ["improvements", "outfitSuggestions", "trendSources", "influencerInsight"] as const,
  additionalProperties: false,
};

function buildRecommendationsPromptFromCore(
  lang: "he" | "en",
  occasion?: string | null,
  userGender?: string | null,
  preferredInfluencers?: string | null,
  preferredStores?: string | null,
  budgetLevel?: string | null,
  country?: string | null,
  tasteProfileText?: string | null,
  wardrobeText?: string | null,
): string {
  const isHebrew = lang === "he";
  const occasionLine = occasion
    ? (isHebrew ? `אירוע יעד: ${occasion}` : `Target occasion: ${occasion}`)
    : (isHebrew ? "אין אירוע יעד מחייב." : "No strict target occasion.");
  const normalizedGender = (userGender || "").toLowerCase();
  const genderLine = normalizedGender === "male"
    ? (isHebrew
      ? "המשתמש הוא גבר: ההמלצות (ביגוד, לוקים ומשפיענים) חייבות להיות גבריות או יוניסקס בלבד. אין להמליץ על פריטי נשים."
      : "User gender is male: recommendations (items, looks, influencers) must be male or unisex only. Do not recommend female-only items.")
    : normalizedGender === "female"
      ? (isHebrew
        ? "המשתמשת היא אישה: ההמלצות (ביגוד, לוקים ומשפיענים) חייבות להיות נשיות או יוניסקס בלבד."
        : "User gender is female: recommendations (items, looks, influencers) must be female or unisex only.")
      : (isHebrew
        ? "אין מגבלת מגדר קשיחה: העדף/י התאמה כללית/יוניסקס."
        : "No strict gender lock: prefer broadly compatible/unisex recommendations.");
  const preferredInfluencersLine = preferredInfluencers
    ? (isHebrew
      ? `משפיענים מועדפים שהמשתמש ציין: ${preferredInfluencers}.`
      : `User preferred influencers: ${preferredInfluencers}.`)
    : (isHebrew
      ? "אם אין משפיענים מפורשים, הצע 2-3 משפיענים רלוונטיים."
      : "If no explicit influencers are provided, suggest 2-3 relevant influencers.");

  // Budget context
  const budgetMap: Record<string, string> = {
    budget: isHebrew ? "חסכוני (עד 200₪ לפריט)" : "Budget-friendly (under $50/item)",
    "mid-range": isHebrew ? "ביניים (200-600₪ לפריט)" : "Mid-range ($50-150/item)",
    premium: isHebrew ? "פרימיום (600-2000₪ לפריט)" : "Premium ($150-500/item)",
    luxury: isHebrew ? "יוקרה (2000₪+ לפריט)" : "Luxury ($500+/item)",
  };
  const budgetLine = budgetLevel
    ? (isHebrew
      ? `רמת תקציב: ${budgetMap[budgetLevel] || budgetLevel}. כל ההמלצות, מחירים וחנויות חייבים להתאים לתקציב הזה.`
      : `Budget level: ${budgetMap[budgetLevel] || budgetLevel}. ALL recommendations, prices, and stores must match this budget.`)
    : "";

  // Preferred stores context
  const storesLine = preferredStores
    ? (isHebrew
      ? `חנויות מועדפות של המשתמש: ${preferredStores}. השתמש בחנויות האלו בלבד עבור shoppingLinks. כל URL חייב להיות כתובת חיפוש אמיתית בחנות (למשל https://www.zara.com/search?searchTerm=...).`
      : `User's preferred stores: ${preferredStores}. Use ONLY these stores for shoppingLinks. Every URL must be a real search URL on the store (e.g. https://www.zara.com/search?searchTerm=...).`)
    : (isHebrew
      ? "השתמש בחנויות פופולריות ומוכרות בלבד (Zara, H&M, ASOS, Nordstrom, etc). כל URL חייב להיות כתובת חיפוש אמיתית."
      : "Use popular well-known stores only (Zara, H&M, ASOS, Nordstrom, etc). Every URL must be a real search URL.");

  // Country context for store selection
  const countryStoreHint = country && !preferredStores
    ? (isHebrew
      ? `המשתמש נמצא ב-${country}. העדף חנויות שזמינות באזור הזה.`
      : `User is located in ${country}. Prefer stores available in this region.`)
    : "";
  const doctrineStage2 = getDoctrineForStage2();

  // Stage 33: Taste Profile + Wardrobe injection
  const tasteProfileSection = tasteProfileText || "";
  const wardrobeSection = wardrobeText || "";

  // Gender-aware prompt language
  const genderAddress = isHebrew
    ? (normalizedGender === "female" ? "את סטייליסטית אופנה מקצועית" : normalizedGender === "male" ? "אתה סטייליסט אופנה מקצועי" : "את/ה סטייליסט/ית אופנה מקצועי/ת")
    : "a professional fashion stylist";
  const heVerb = normalizedGender === "female"
    ? { replace: "החליפי", consider: "שקלי", try: "נסי", choose: "בחרי", add: "הוסיפי" }
    : { replace: "החלף", consider: "שקול", try: "נסה", choose: "בחר", add: "הוסף" };

  return isHebrew
    ? `${genderAddress}. אתה שלב 2 במערכת דו-שלבית: השראה והמלצות בלבד.
קלט: JSON מובנה של שלב 1 (ניתוח הלוק).
משימה: להחזיר רק JSON עם fields:
- improvements
- outfitSuggestions
- trendSources
- influencerInsight

❗ כלל קריטי: המשתמש הוא ${normalizedGender === "female" ? "אישה" : normalizedGender === "male" ? "גבר" : "לא צוין"}. פנה ${normalizedGender === "female" ? "אליה" : "אליו"} בהתאם! השתמש בפעלים במגדר הנכון: ${heVerb.replace}, ${heVerb.consider}, ${heVerb.try}, ${heVerb.choose}, ${heVerb.add}.
❗ אסור להשתמש ב"החלף/י" או "שדרג/י" — זה לא מקצועי!

❗ סגנון כתיבה: כתוב כמו סטייליסט אופנה אמיתי, לא כמו רובוט. כל המלצה חייבת לכלול:
  - הסבר אופנתי למה השינוי הזה משדרג את הלוק (איך הצבע משלים, איך החומר משדרג, איך הגזרה משפרת את הסילואט)
  - התייחסות לטרנדים עכשוויים (2025-2026)
  - המלצה על שילוב צבעים (הרמוניה, ניגודיות, קונטרסט)
  - המלצה על פרופורציות וסילואט (איך הפריט החדש משפיע על המראה הכללי)
❗ אסור להמליץ תמיד על אותם פריטים: sweater navy, loafers brown, chinos khaki. אלה המלצות "בטוחות" שלא מתייחסות לתמונה. תסתכל על מה שהאדם לובש בפועל ותציע שידרוג מדויק לכל פריט.
❗ קטגוריות: כל improvement חייב להתייחס לקטגוריה אחת בלבד (חלק עליון, חלק תחתון, נעליים, אקססורי). אסור לערבב קטגוריות! אם הכותרת אומרת "ז'קט", ה-afterGarmentType חייב להיות סוג של ז'קט (לא מכנס!). אם הכותרת אומרת "נעליים", ה-afterGarmentType חייב להיות סוג של נעליים (לא חולצה!).
❗ נעליים: אסור להמליץ על "sneakers" גנריות. תמיד המלץ על חלופה משודרגת: "minimalist leather sneakers", "suede loafers", "leather derby shoes", "clean white leather sneakers".

${doctrineStage2}

כללים:
- התבסס על פריטי הלבוש, הציונים והסיכום משלב 1.
- שמור על התאמה לאירוע ולסגנון המשתמש.
- חשוב מאוד: כל פריט בקלט כולל מטאדאטה מובנית עשירה (garmentType, preciseColor, material, fit, pattern, texture, neckline, sleeveLength, closure, bodyZone, layerIndex). השתמש בנתונים האלה כדי לייצר שידרוגים מדויקים! לדוגמה: אם הפריט הנוכחי הוא garmentType="t-shirt", preciseColor="white", material="cotton", fit="regular", pattern="solid" — ה-before fields חייבים לשקף בדיוק את המטאדאטה הזו.
- אם הקלט כולל personDetection (מידע על הגוף: fullBodyVisible, feetVisible, bodyPose) ו-lookStructure (מבנה הלוק: colorHarmony, proportions, silhouetteSummary, hasLayering) — השתמש בהם! לדוגמה: אם proportions="top-heavy" הצע שידרוג שמאזן את הפרופורציות. אם colorHarmony="monochromatic" הצע הכנסת צבע קונטרסטי.
- improvements: 3 המלצות שדרוג (קטגוריות שונות: חלק עליון, חלק תחתון, נעליים/אקססוריז). כל improvement חייב לכלול בדיוק 3 shoppingLinks (כתובות חיפוש תקינות בחנויות אמיתיות). אל תחזיר פחות מ-3.
- תיאור (description) של כל improvement — כללים מחייבים:
  * כתוב כמו סטייליסט אופנה אמיתי שמדבר עם ${normalizedGender === "female" ? "לקוחה" : "לקוח"} שלו. אסור מלל גנרי כמו "זה ישדרג את הלוק"!
  * חובה: הסבר למה השינוי הזה משדרג (איך הצבע החדש משלים את הפלטה, איך החומר מרגיש אחרת, איך הגזרה משפרת את הסילואט)
  * חובה: התייחסות לטרנד עכשווי (2025-2026) או לעיקרון אופנתי
  * חובה: המלצה על שילוב צבעים ספציפית (לא סתם "צבעים משלימים" — תגיד אילו צבעים בדיוק!)
  * אורך: 2-4 משפטים של תוכן אמיתי. לא משפט אחד גנרי!
  * דוגמה מושלמת: "הפולו פיקה בכחול כהה מביא מרקם מובנה יותר מהטישרט הרגיל, והצווארון הקטן מוסיף נופך של קלאסיקה. הכחול הכהה משלים את הבז' של הצ'ינוס ויוצר הרמוניה נעימה — טרנד ה-quiet luxury של 2025."
  * דוגמה פסולה: "זה ישדרג את הלוק שלך" / "החלף את החולצה למשהו יותר טוב" / "שדרוג מומלץ"
- כותרת (title) של כל improvement: כללים מחייבים:
  * מקסימום 5-7 מילים! קצר, חד, שיווקי. זה PUNCH LINE, לא משפט.
  * חייבת להיות בעברית (שפת הממשק). אסור באנגלית!
  * אסור גנרי: "שדרוג חלק עליון", "שידרוג נעליים" = פסול!
  * אסור פורמט "מ-X ל-Y": "מטישרט לפולו" = פסול! כתוב "פולו פיקה במקום טישרט" או "פולו פיקה — קפיצת דרג".
  * אסור מילים גנריות בכותרת: "premium", "matching", "upgraded", "quality" = פסול!
  * חייבת לשקף את המהות — מה ה-before ומה ה-after.
  * דוגמאות מושלמות: "פולו פיקה במקום טישרט", "לואפרס עור במקום סניקרס", "שעון מינימליסטי — הפרט שמשלים", "ג'ינס סלים במקום ג'וגר", "בלייזר פשתן — קפיצת דרג", "צ'ינוס כותנה — בסיס חדש", "סניקרס עור — נוכחות ברגל"
  * דוגמאות פסולות: "שדרוג חלק עליון", "שיפור הנעליים", "Upgrade your top", "From Basic Cotton Tee to Piqué Polo", "מטישרט לפולו — קפיצה בסטייל", "שדרוג premium"
- חובה מוחלטת — מטאדטה מלאה לכל improvement: כל השדות הבאים חייבים להיות באנגלית lowercase. אסור להשאיר ריק!
  * CRITICAL: afterColor, afterMaterial, afterGarmentType MUST be SPECIFIC REAL VALUES. FORBIDDEN placeholder values: "matching", "premium", "upgraded", "similar", "complementary", "better", "improved", "quality", "stylish", "elegant", "luxury", "appropriate", "suitable", "recommended". These are NOT colors, NOT materials, NOT garment types!
  * beforeColor / afterColor: צבע מדויק (לדוגמה: "white", "navy blue", "charcoal gray"). afterColor חייב להיות צבע אמיתי! "matching" = פסול!
  * beforeGarmentType / afterGarmentType: סוג הפריט (לדוגמה: "t-shirt", "dress shirt", "polo", "jeans", "chinos", "sneakers", "blazer", "hoodie"). afterGarmentType חייב להיות סוג בגד ספציפי! "premium top" = פסול! כתוב "polo" או "dress shirt" במקום.
  * beforeFit / afterFit: גיזרה (לדוגמה: "slim", "regular", "oversized", "tailored", "boxy")
  * beforeSleeveLength / afterSleeveLength: אורך שרוול (לדוגמה: "short", "long", "3/4", "sleeveless", "n/a")
  * beforeNeckline / afterNeckline: צווארון/מחשוף (לדוגמה: "crew neck", "v-neck", "polo collar", "button-down collar", "turtleneck", "n/a")
  * beforeMaterial / afterMaterial: חומר/בד (לדוגמה: "cotton", "linen", "denim", "leather", "silk", "wool", "knit"). afterMaterial חייב להיות חומר אמיתי! "premium" = פסול! כתוב "piqué cotton" או "merino wool" במקום.
  * beforePattern / afterPattern: דוגמה/הדפס (לדוגמה: "solid", "striped", "checkered", "floral", "graphic print")
  * beforeStyle / afterStyle: סגנון (לדוגמה: "casual", "formal", "smart-casual", "sporty", "streetwear", "minimalist")
  * beforeLength / afterLength: אורך הפריט (לדוגמה: "cropped", "regular", "long", "midi")
  * beforeClosure / afterClosure: סוג סגירה (לדוגמה: "pullover", "buttons", "zipper", "n/a")
  * beforeTexture / afterTexture: מרקם (לדוגמה: "smooth", "ribbed", "knitted", "matte", "shiny", "distressed")
  * beforeDetails / afterDetails: פרטים מיוחדים (לדוגמה: "visible logo", "chest pocket", "embroidery", "contrast stitching", "none")
- חובה: כל 3 ה-shoppingLinks בכל improvement חייבים להיות מ-3 חנויות שונות! לדוגמה: ASOS, Zara, H&M — לא 3 לינקים לאותה חנות.
- פורמט label חובה: "תיאור מוצר ספציפי — שם חנות". לדוגמה: "חולצת פולו כחולה slim fit — ASOS", "מכנסי צ'ינו בז' — Zara". אסור label שמכיל רק שם חנות!
- productSearchQuery חייב להיות באנגלית וספציפי: קטגוריה + צבע + סגנון + מגדר. דוגמה: "men's navy slim fit chino pants". ה-productSearchQuery חייב להתאים לקטגוריית ה-improvement (אם ה-title הוא שדרוג חלק עליון, ה-query חייב להיות של חולצה/חלק עליון).
- outfitSuggestions: 2 לוקים שלמים (חלק עליון+תחתון+נעליים). כל לוק עם שם מותג+צבע+מחיר.
- trendSources: 2-3 מקורות רלוונטיים.
- influencerInsight: 2-3 משפטים עם 2 שמות משפיענים.
- כל הטקסטים בעברית. JSON בלבד.

${tasteProfileSection}

${wardrobeSection}

${genderLine}
${budgetLine}
${storesLine}
${countryStoreHint}
${preferredInfluencersLine}
${occasionLine}`
    : `You are ${genderAddress}. You are Stage 2 of a split pipeline: inspiration and recommendations only.
Input: structured Stage 1 JSON (outfit analysis).
Task: return JSON with fields only:
- improvements
- outfitSuggestions
- trendSources
- influencerInsight

❗ CRITICAL: The user is ${normalizedGender === "female" ? "a woman" : normalizedGender === "male" ? "a man" : "gender unspecified"}. Address ${normalizedGender === "female" ? "her" : "him"} accordingly in all text!

❗ WRITING STYLE: Write like a REAL fashion stylist, not a robot. Every recommendation MUST include:
  - A fashion explanation of WHY this change upgrades the look (how the color complements, how the material elevates, how the fit improves the silhouette)
  - References to current trends (2025-2026)
  - Color theory advice (harmony, contrast, complementary tones)
  - Proportion and silhouette guidance (how the new piece affects the overall look)
❗ FORBIDDEN PATTERN: Do NOT always recommend the same items (e.g., navy sweater, brown loafers, khaki chinos). These are "safe" defaults. Instead, analyze what the person is ACTUALLY wearing and suggest a precise, targeted upgrade for EACH specific item.
❗ CATEGORIES: Each improvement MUST address ONE category only (top, bottom, shoes, accessory). Do NOT mix categories! If the title says "jacket", the afterGarmentType MUST be a type of jacket (not pants!). If the title says "shoes", the afterGarmentType MUST be a type of shoes (not a shirt!).
❗ SHOES: NEVER recommend generic "sneakers". Always suggest an upgraded alternative: "minimalist leather sneakers", "suede loafers", "leather derby shoes", "clean white leather sneakers".

${doctrineStage2}

Rules:
- Base recommendations on stage-1 items, scores, and summary.
- Keep suggestions occasion-aware and style-consistent.
- CRITICAL: Each item in the input includes RICH STRUCTURED METADATA (garmentType, preciseColor, material, fit, pattern, texture, neckline, sleeveLength, closure, bodyZone, layerIndex). USE these fields to generate precise improvements! For example: if the current item has garmentType="t-shirt", preciseColor="white", material="cotton", fit="regular", pattern="solid" — the before fields MUST exactly mirror this metadata.
- If the input includes personDetection (body info: fullBodyVisible, feetVisible, bodyPose) and lookStructure (look composition: colorHarmony, proportions, silhouetteSummary, hasLayering) — USE THEM! For example: if proportions="top-heavy", suggest an upgrade that balances proportions. If colorHarmony="monochromatic", suggest introducing a contrasting accent color.
- improvements: 3 upgrade suggestions (different categories: top, bottom, shoes/accessories). Each improvement MUST include exactly 3 shoppingLinks (valid search URLs to real stores). Never return fewer than 3.
- DESCRIPTION WRITING RULES — MANDATORY:
  * Write like a real fashion stylist talking to ${normalizedGender === "female" ? "her" : "his"} client. FORBIDDEN generic text like "this will upgrade your look"!
  * MUST explain WHY this change upgrades the look (how the new color complements the palette, how the material feels different, how the fit improves the silhouette)
  * MUST reference a current trend (2025-2026) or a fashion principle
  * MUST give specific color pairing advice (not just "complementary colors" — name the exact colors!)
  * Length: 2-4 sentences of real content. Not one generic sentence!
  * PERFECT example: "The piqué polo in navy brings a more structured texture than the regular tee, and the small collar adds a classic touch. The navy pairs beautifully with the beige chinos, creating a warm-cool harmony — a hallmark of the 2025 quiet luxury trend."
  * REJECTED examples: "This will upgrade your look" / "Replace the shirt with something better" / "Recommended upgrade"
- TITLE WRITING RULES — MANDATORY:
  * Maximum 5-7 words! Short, sharp, punchy. This is a PUNCH LINE, not a sentence.
  * MUST be in English (the interface language). No other languages!
  * FORBIDDEN generic titles: "Upgrade top", "Improve shoes", "Better pants" = REJECTED!
  * MUST capture the before→after essence in minimal words.
  * PERFECT examples: "Piqué Polo Over Basic Tee", "Leather Loafers, Not Sneakers", "Minimalist Watch — Finishing Touch", "Slim Chinos Over Joggers", "Linen Blazer — Level Up"
  * REJECTED examples: "Upgrade your top", "Improve shoes", "From Basic Cotton Tee to Piqué Polo — A Smart Casual Leap" (too long!)
- ABSOLUTE REQUIREMENT — Complete garment metadata for every improvement: ALL fields below MUST be in English lowercase. NEVER leave empty!
  * CRITICAL: afterColor, afterMaterial, afterGarmentType MUST be SPECIFIC REAL VALUES. FORBIDDEN placeholder values: "matching", "premium", "upgraded", "similar", "complementary", "better", "improved", "quality", "stylish", "elegant", "luxury", "appropriate", "suitable", "recommended". These are NOT colors, NOT materials, NOT garment types!
  * beforeColor / afterColor: exact color (e.g. "white", "navy blue", "charcoal gray"). afterColor MUST be a REAL color! "matching" = REJECTED! Write "navy blue" or "white" instead.
  * beforeGarmentType / afterGarmentType: specific garment type (e.g. "t-shirt", "dress shirt", "polo", "jeans", "chinos", "sneakers", "blazer", "hoodie"). afterGarmentType MUST be a SPECIFIC garment! "premium top" = REJECTED! Write "polo" or "dress shirt" instead.
  * beforeFit / afterFit: fit/silhouette (e.g. "slim", "regular", "oversized", "tailored", "boxy")
  * beforeSleeveLength / afterSleeveLength: sleeve length (e.g. "short", "long", "3/4", "sleeveless", "n/a" for non-tops)
  * beforeNeckline / afterNeckline: neckline/collar (e.g. "crew neck", "v-neck", "polo collar", "button-down collar", "turtleneck", "n/a")
  * beforeMaterial / afterMaterial: fabric/material (e.g. "cotton", "linen", "denim", "leather", "silk", "wool", "knit"). afterMaterial MUST be a REAL material! "premium" = REJECTED! Write "piqué cotton" or "merino wool" instead.
  * beforePattern / afterPattern: pattern (e.g. "solid", "striped", "checkered", "floral", "graphic print")
  * beforeStyle / afterStyle: style category (e.g. "casual", "formal", "smart-casual", "sporty", "streetwear", "minimalist")
  * beforeLength / afterLength: garment length (e.g. "cropped", "regular", "long", "midi")
  * beforeClosure / afterClosure: closure type (e.g. "pullover", "buttons", "zipper", "n/a")
  * beforeTexture / afterTexture: surface texture (e.g. "smooth", "ribbed", "knitted", "matte", "shiny", "distressed")
  * beforeDetails / afterDetails: distinctive details (e.g. "visible logo", "chest pocket", "embroidery", "contrast stitching", "none")
- MANDATORY: Each improvement's 3 shoppingLinks MUST be from 3 DIFFERENT stores! Example: ASOS, Zara, H&M — never 3 links to the same store.
- MANDATORY label format: "specific product description — store name". Example: "Navy slim fit polo shirt — ASOS", "Beige chino pants — Zara". NEVER use just the store name as label!
- productSearchQuery MUST be specific English: category + color + style + gender. Example: "men's navy slim fit chino pants". The productSearchQuery MUST match the improvement category (if title is about tops, query must be for a top/shirt/blouse).
- outfitSuggestions: 2 complete looks (top+bottom+shoes). Each item with brand+color+price.
- trendSources: 2-3 relevant sources.
- influencerInsight: 2-3 sentences with 2 influencer names.
- All text in English. JSON only.

${tasteProfileSection}

${wardrobeSection}

${genderLine}
${budgetLine}
${storesLine}
${countryStoreHint}
${preferredInfluencersLine}
${occasionLine}`;
}

function isHebrewText(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text || "");
}

function isLikelyImageUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  return /^https?:\/\//i.test(u) && !/placeholder|example\.com/i.test(u);
}

function pickInfluencersForProfile(
  userGender?: string | null,
  max = 2,
): Array<{ name: string; igUrl: string }> {
  const normalizedGender = (userGender || "").toLowerCase();
  const matches = POPULAR_INFLUENCERS.filter((inf) => {
    if (normalizedGender === "male") return inf.gender === "male" || inf.gender === "unisex";
    if (normalizedGender === "female") return inf.gender === "female" || inf.gender === "unisex";
    return true;
  });
  return matches.slice(0, Math.max(1, max)).map((inf) => ({ name: inf.name, igUrl: inf.igUrl }));
}

function resolvePreferredInfluencers(
  preferredInfluencers: string | null | undefined,
  userGender?: string | null,
  max = 2,
): Array<{ name: string; igUrl: string }> {
  const preferredNames = (preferredInfluencers || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const preferredResolved = preferredNames
    .map((name) => POPULAR_INFLUENCERS.find((inf) => inf.name.toLowerCase() === name.toLowerCase()))
    .filter((v): v is (typeof POPULAR_INFLUENCERS)[number] => Boolean(v))
    .map((inf) => ({ name: inf.name, igUrl: inf.igUrl }));
  if (preferredResolved.length >= max) {
    return preferredResolved.slice(0, max);
  }
  const fallback = pickInfluencersForProfile(userGender, max + 2);
  const out = [...preferredResolved];
  for (const inf of fallback) {
    if (out.some((x) => x.name === inf.name)) continue;
    out.push(inf);
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

function buildDetailedInfluencerInsightFromCore(
  core: FashionAnalysisCorePayload,
  lang: "he" | "en",
  userGender?: string | null,
  preferredInfluencers?: string | null,
): { insight: string; mentions: Array<{ text: string; type: "influencer"; url: string }> } {
  const picked = resolvePreferredInfluencers(preferredInfluencers, userGender, 2);
  const first = picked[0];
  const second = picked[1] || picked[0];
  const topItems = (core.items || [])
    .slice(0, 3)
    .map((it) => it.name)
    .filter(Boolean)
    .join(", ");
  const summary = (core.summary || "").trim().slice(0, 180);

  if (!first) {
    return {
      insight: lang === "he"
        ? `הלוק שלך מציג בסיס טוב, אבל כדי לדייק אותו ברמת סטייל גבוהה יותר צריך חידוד בכמה נקודות מפתח. התמקד/י בפרופורציות ברורות בין החלק העליון והתחתון, הוסף/י שכבה חיצונית אחת מדויקת, ושמור/י על רצף צבעוני אחיד בין הפריטים המרכזיים. בנוסף, סיום חזק דרך נעליים ותיק/אביזר תואם ייתן ללוק נוכחות שלמה יותר.`
        : `Your look has a solid base, but to elevate it further you need sharper execution in a few key areas. Focus on clearer top-bottom proportions, add one precise outer layer, and keep a consistent color story across the core pieces. A stronger finish through footwear and one coordinated accessory will make the outfit feel more complete.`,
      mentions: [],
    };
  }

  const insight = lang === "he"
    ? `בהשוואה לקו הסטייל של ${first.name}${second ? ` ו-${second.name}` : ""}, הלוק הנוכחי שלך נמצא בכיוון נכון אבל עדיין לא ממצה את הפוטנציאל האופנתי שלו. ${summary ? `בסיכום הכללי עולה ש-${summary}. ` : ""}${topItems ? `בפריטים שזוהו (${topItems}) יש בסיס טוב, אבל צריך יותר היררכיה ברורה בין פריט מוביל לפריטים משלימים. ` : ""}כדי להתיישר יותר לתפיסת הסטייל שלהם, כדאי לחזק את הסילואט עם שכבה חיצונית מובנית, לשמור על גזרת תחתון נקייה יותר, ולסגור את הלוק עם נעליים מדויקות שמחברות את כל הצבעוניות. בנוסף, בחירה מוקפדת באביזר אחד איכותי במקום כמה אביזרים מפוזרים תייצר הופעה בוגרת, חדה ומזוהה יותר עם הקו שלהם.`
    : `Compared to the styling language of ${first.name}${second ? ` and ${second.name}` : ""}, your current look is on the right track but still under-delivers on full style impact. ${summary ? `The overall read suggests that ${summary}. ` : ""}${topItems ? `Within the identified pieces (${topItems}), the base is solid, but you still need a clearer hierarchy between a hero item and supporting pieces. ` : ""}To align more closely with their aesthetic, reinforce the silhouette with one structured outer layer, keep cleaner bottoms, and finish with footwear that ties the palette together. Also, choosing one high-quality focal accessory instead of several scattered accents will make the look feel sharper, more intentional, and more signature-driven.`;

  return {
    insight,
    mentions: picked.map((inf) => ({ text: inf.name, type: "influencer" as const, url: inf.igUrl })),
  };
}

function sanitizeOutfitSuggestionsForProfileGender(
  outfitSuggestions: OutfitSuggestion[],
  userGender: string | null | undefined,
  lang: "he" | "en",
): OutfitSuggestion[] {
  if (!Array.isArray(outfitSuggestions)) return [];
  const normalizedGender = (userGender || "").toLowerCase();
  if (normalizedGender !== "male") return outfitSuggestions;

  const femaleCodedPattern = /(dress|gown|skirt|heels?|bralette|bra|blouse|שמלה|חצאית|עקבים|חזיה)/i;
  const fallbackItems = lang === "he"
    ? ["חולצה מחויטת", "מכנסיים בגזרה נקייה", "נעליים תואמות", "שכבה עליונה מובנית"]
    : ["structured top", "clean-cut bottoms", "coordinated shoes", "structured outer layer"];

  return outfitSuggestions.map((outfit) => {
    const baseItems = Array.isArray(outfit.items) ? outfit.items.filter(Boolean) : [];
    const filteredItems = baseItems.filter((item) => !femaleCodedPattern.test(item));
    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const item of filteredItems) {
      const key = item.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    for (const item of fallbackItems) {
      if (deduped.length >= 3) break;
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    return { ...outfit, items: deduped.slice(0, 6) };
  });
}

function normalizeImprovementShoppingLinks(
  imp: Improvement,
  lang: "he" | "en",
  preferredStores?: string | null,
  gender: GenderCategory = "male",
  budgetLevel?: string | null,
): Improvement {
  const isHebrew = lang === "he";
  const fallbackQuery =
    (imp.productSearchQuery || imp.afterLabel || imp.title || (isHebrew ? "שדרוג לבוש" : "clothing upgrade")).trim();
  const existingLinks = Array.isArray(imp.shoppingLinks)
    ? imp.shoppingLinks.filter((l) => l && typeof l.url === "string" && l.url.trim().length > 0)
    : [];
  const deduped: ShoppingLink[] = [];
  const seen = new Set<string>();
  for (const link of existingLinks) {
    const key = (link.url || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      label: (link.label || `${fallbackQuery}`).trim(),
      url: link.url.trim(),
      imageUrl: isLikelyImageUrl(link.imageUrl) ? link.imageUrl!.trim() : "",
    });
  }
  if (deduped.length < 3) {
    const fallbackLinks = buildFallbackShoppingLinks(fallbackQuery, preferredStores, gender, budgetLevel);
    for (const fb of fallbackLinks) {
      const key = (fb.url || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(fb);
      if (deduped.length >= 3) break;
    }
  }

  // Enforce store diversity: ensure links come from different stores
  const finalLinks = deduped.slice(0, 3);
  const extractDomain = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, "").split(".")[0].toLowerCase(); } catch { return ""; }
  };
  const domains = finalLinks.map((l) => extractDomain(l.url)).filter(Boolean);
  const uniqueDomains = new Set(domains);
  console.log(`[StoreDiversity] imp="${(imp.title || "").substring(0, 40)}" domains=[${domains.join(",")}] unique=${uniqueDomains.size}/${finalLinks.length} labels=[${finalLinks.map(l => (l.label || "").substring(0, 30)).join(", ")}]${preferredStores ? ` userStores=[${preferredStores}]` : ""}`);
  
  if (uniqueDomains.size < finalLinks.length && finalLinks.length >= 2) {
    // Some or all links go to the same store — replace duplicates with user's preferred stores or defaults
    const diverseLinks = buildFallbackShoppingLinks(fallbackQuery, preferredStores, gender, budgetLevel);
    const usedDomains = new Set<string>();
    // First pass: keep one link per unique domain
    for (let i = 0; i < finalLinks.length; i++) {
      const domain = extractDomain(finalLinks[i].url);
      if (domain && usedDomains.has(domain)) {
        // Replace with a fallback from a different store
        const replacement = diverseLinks.find(fb => {
          const fbDomain = extractDomain(fb.url);
          return fbDomain && !usedDomains.has(fbDomain);
        });
        if (replacement) {
          console.log(`[StoreDiversity] Replacing duplicate ${domain} link[${i}] with ${extractDomain(replacement.url)}`);
          finalLinks[i] = { ...replacement, imageUrl: "" };
          usedDomains.add(extractDomain(replacement.url));
        }
      } else if (domain) {
        usedDomains.add(domain);
      }
    }
  }

  return {
    title: (imp.title || (isHebrew ? "שדרוג לבוש" : "Wardrobe upgrade")).trim(),
    description: (imp.description || (isHebrew ? "התאמה לשדרוג הלוק." : "Upgrade to improve overall look coherence.")).trim(),
    beforeLabel: (imp.beforeLabel || (isHebrew ? "לפני" : "Before")).trim(),
    afterLabel: (imp.afterLabel || (isHebrew ? "אחרי" : "After")).trim(),
    beforeColor: (imp.beforeColor || "").trim(),
    afterColor: (imp.afterColor || "").trim(),
    // Pass through all structured garment metadata (optional fields)
    beforeGarmentType: imp.beforeGarmentType || undefined,
    afterGarmentType: imp.afterGarmentType || undefined,
    beforeStyle: imp.beforeStyle || undefined,
    afterStyle: imp.afterStyle || undefined,
    beforeFit: imp.beforeFit || undefined,
    afterFit: imp.afterFit || undefined,
    beforeLength: imp.beforeLength || undefined,
    afterLength: imp.afterLength || undefined,
    beforeSleeveLength: imp.beforeSleeveLength || undefined,
    afterSleeveLength: imp.afterSleeveLength || undefined,
    beforeNeckline: imp.beforeNeckline || undefined,
    afterNeckline: imp.afterNeckline || undefined,
    beforeClosure: imp.beforeClosure || undefined,
    afterClosure: imp.afterClosure || undefined,
    beforeMaterial: imp.beforeMaterial || undefined,
    afterMaterial: imp.afterMaterial || undefined,
    beforeTexture: imp.beforeTexture || undefined,
    afterTexture: imp.afterTexture || undefined,
    beforePattern: imp.beforePattern || undefined,
    afterPattern: imp.afterPattern || undefined,
    beforeDetails: imp.beforeDetails || undefined,
    afterDetails: imp.afterDetails || undefined,
    productSearchQuery: fallbackQuery,
    shoppingLinks: finalLinks,
    closetMatch: imp.closetMatch,
  };
}

function shouldFallbackRecommendationsForLanguage(
  rec: FashionRecommendationsPayload,
  lang: "he" | "en",
): boolean {
  if (lang !== "he") return false;
  const samples = [
    rec.influencerInsight,
    ...(rec.improvements || []).flatMap((imp) => [imp.title, imp.description, imp.afterLabel]),
    ...(rec.outfitSuggestions || []).flatMap((o) => [o.name, o.occasion, o.inspirationNote]),
    ...(rec.trendSources || []).map((t) => t.title),
  ]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .slice(0, 24);
  if (samples.length === 0) return true;
  const hebrewCount = samples.filter((s) => isHebrewText(s)).length;
  return hebrewCount < Math.ceil(samples.length * 0.5);
}

function hasCoreItemReferenceInInsight(
  text: string,
  core: FashionAnalysisCorePayload,
): boolean {
  const normalized = (text || "").toLowerCase();
  if (!normalized) return false;
  return (core.items || [])
    .slice(0, 5)
    .some((item) => {
      const tokens = (item.name || "")
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 3)
        .slice(0, 3);
      return tokens.some((token) => normalized.includes(token));
    });
}

/**
 * Validate and fix productSearchQuery to ensure it matches the improvement's category.
 * If the LLM returned a generic or mismatched query (e.g. "pants" for a top improvement),
 * this function rebuilds a proper query from the improvement's title/afterLabel.
 */
function validateAndFixProductSearchQuery(
  imp: Improvement,
  userGender?: string | null,
): string {
  const genderPrefix = userGender === "female" ? "women's" : "men's";

  // Stage 30 GAP 4: Build query from structured metadata as PRIMARY source
  const afterType = (imp.afterGarmentType || "").trim().toLowerCase();
  const afterColor = (imp.afterColor || "").trim().toLowerCase();
  const afterFit = (imp.afterFit || "").trim().toLowerCase();
  const afterMaterial = (imp.afterMaterial || "").trim().toLowerCase();
  const afterPattern = (imp.afterPattern || "").trim().toLowerCase();
  const afterNeckline = (imp.afterNeckline || "").trim().toLowerCase();

  // Blacklist: values the LLM returns that are NOT real colors/materials/garment types
  const FAKE_VALUES = new Set([
    "matching", "premium", "upgraded", "similar", "complementary", "better",
    "improved", "enhanced", "quality", "stylish", "fashionable", "trendy",
    "elegant", "sophisticated", "modern", "classic", "luxury", "luxurious",
    "high-end", "high end", "designer", "branded", "n/a", "none", "same",
    "appropriate", "suitable", "recommended", "ideal", "perfect", "optimal",
  ]);
  const isReal = (val: string) => val && !FAKE_VALUES.has(val) && val.length > 1;

  // Known garment types — if afterGarmentType is not a real garment, try to extract from afterLabel
  const KNOWN_GARMENTS = /^(t-shirt|tee|shirt|dress shirt|polo|blouse|top|tank top|camisole|crop top|tunic|sweater|hoodie|sweatshirt|cardigan|blazer|jacket|coat|vest|parka|trench|bomber|windbreaker|jeans|chinos|pants|trousers|shorts|skirt|leggings|joggers|cargo pants|dress pants|sneakers|shoes|boots|loafers|oxfords|sandals|heels|mules|slippers|derby|flats|dress|gown|maxi dress|midi dress|mini dress|jumpsuit|romper|overall|watch|bracelet|ring|necklace|earring|belt|bag|hat|cap|scarf|sunglasses|tie|pocket square)$/i;
  let garmentType = afterType;
  if (!KNOWN_GARMENTS.test(garmentType)) {
    // Try to extract from afterLabel
    const labelWords = (imp.afterLabel || "").toLowerCase().split(/\s+/);
    for (let i = 0; i < labelWords.length; i++) {
      const twoWord = labelWords.slice(i, i + 2).join(" ");
      const oneWord = labelWords[i];
      if (KNOWN_GARMENTS.test(twoWord)) { garmentType = twoWord; break; }
      if (KNOWN_GARMENTS.test(oneWord)) { garmentType = oneWord; break; }
    }
  }

  // If we have a real garment type, build a rich query directly
  if (garmentType && garmentType !== "n/a" && KNOWN_GARMENTS.test(garmentType)) {
    const parts = [genderPrefix];
    if (isReal(afterColor)) parts.push(afterColor);
    if (isReal(afterFit) && afterFit !== "regular") parts.push(afterFit);
    if (isReal(afterMaterial) && afterMaterial !== "synthetic") parts.push(afterMaterial);
    if (isReal(afterNeckline) && afterNeckline !== "crew") parts.push(afterNeckline);
    parts.push(garmentType);
    if (isReal(afterPattern) && afterPattern !== "solid") parts.push(afterPattern);
    // Deduplicate words in the query
    const seen = new Set<string>();
    const deduped = parts.filter(p => {
      const lower = p.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
    return deduped.join(" ");
  }

  // Fallback: validate/fix the LLM-provided query (legacy path for old analyses)
  const query = (imp.productSearchQuery || "").trim();
  const impCategory = detectImprovementCategory(imp);

  // Category-specific keywords that MUST appear in the query
  const categoryKeywords: Record<ClothingCategory, RegExp> = {
    top: /(shirt|blouse|top|tee|t-shirt|polo|sweater|hoodie|sweatshirt|henley|tank|camisole|crop|tunic|חולצ)/i,
    bottom: /(pants|jeans|trouser|chino|shorts|skirt|legging|מכנס|גינס|חצאית|שורט)/i,
    outerwear: /(jacket|coat|blazer|cardigan|parka|trench|bomber|vest|windbreaker|מעיל|זקט|בלייזר|קרדיגן)/i,
    shoes: /(shoe|sneaker|boot|loafer|heel|sandal|oxford|derby|mule|slipper|נעל|סניקר)/i,
    dress: /(dress|gown|maxi|midi|mini|שמלה)/i,
    onepiece: /(jumpsuit|romper|overall|playsuit|אוברול|סרבל)/i,
    accessory: /(watch|bracelet|ring|necklace|earring|belt|bag|hat|cap|scarf|sunglass|שעון|צמיד|טבעת|שרשר|עגיל|חגורה|תיק|כובע|צעיף|משקפ)/i,
    other: /./i,
  };

  const categoryFallbackTerms: Record<string, string> = {
    top: "structured button-down shirt",
    bottom: "tailored chino pants",
    outerwear: "structured blazer jacket",
    shoes: "leather dress shoes",
    dress: "flattering midi dress",
    onepiece: "tailored jumpsuit",
    accessory: "premium accessory",
    other: "fashion item",
  };

  const hasHebrew = /[\u0590-\u05FF]/.test(query);
  const isTooGeneric = !query || query.length < 8 || /^(upgrade|improve|שדרוג|שיפור)/i.test(query);
  const matchesCategory = impCategory === "other" || categoryKeywords[impCategory]?.test(query);
  const hasCrossCategory = impCategory !== "other" && Object.entries(categoryKeywords)
    .filter(([cat]) => cat !== impCategory && cat !== "other" && cat !== "accessory")
    .some(([_cat, regex]) => regex.test(query) && !categoryKeywords[impCategory].test(query));

  if (!hasHebrew && !isTooGeneric && matchesCategory && !hasCrossCategory) {
    if (!/(men|women|גבר|נש)/i.test(query)) {
      return `${genderPrefix} ${query}`;
    }
    return query;
  }

  // Rebuild from text-based extraction (legacy fallback)
  const afterLabel = (imp.afterLabel || "").replace(/[\u0590-\u05FF]+/g, "").trim();
  const colorMatch = query.match(/(black|white|navy|blue|grey|gray|brown|beige|cream|green|red|pink|olive|khaki|tan|burgundy|maroon|camel)/i);
  const color = afterColor || (colorMatch ? colorMatch[1].toLowerCase() : "");
  const styleMatch = query.match(/(slim fit|regular fit|oversized|tailored|structured|casual|formal|classic|modern|minimalist|relaxed)/i);
  const style = afterFit || (styleMatch ? styleMatch[1].toLowerCase() : "");

  const baseTerm = categoryFallbackTerms[impCategory] || "fashion item";
  const parts = [genderPrefix];
  if (color) parts.push(color);
  if (style && style !== "regular") parts.push(style);
  if (afterLabel.length > 5 && /[a-zA-Z]/.test(afterLabel)) {
    parts.push(afterLabel);
  } else {
    parts.push(baseTerm);
  }

  return parts.join(" ");
}

function sanitizeRecommendationsPayload(
  rec: FashionRecommendationsPayload,
  core: FashionAnalysisCorePayload,
  lang: "he" | "en",
  occasion?: string | null,
  userGender?: string | null,
  preferredInfluencers?: string | null,
  preferredStores?: string | null,
  budgetLevel?: string | null,
): FashionRecommendationsPayload {
  const genderCat: GenderCategory = userGender === "female" ? "female" : userGender === "unisex" ? "unisex" : "male";
  const fallback = buildFallbackRecommendationsFromCore(core, lang, occasion, userGender, preferredInfluencers, preferredStores, budgetLevel);
  if (shouldFallbackRecommendationsForLanguage(rec, lang)) {
    return fallback;
  }

  let improvements = Array.isArray(rec.improvements) ? rec.improvements : [];
  // Validate and fix productSearchQuery for each improvement
  improvements = improvements.map((imp) => ({
    ...imp,
    productSearchQuery: validateAndFixProductSearchQuery(imp, userGender),
  }));

  // Cross-category validation: ensure title matches afterGarmentType
  const GARMENT_CATEGORIES: Record<string, string[]> = {
    top: ["t-shirt", "tee", "polo", "shirt", "blouse", "sweater", "hoodie", "cardigan", "tank top", "crop top", "vest", "henley"],
    outerwear: ["blazer", "jacket", "coat", "parka", "bomber", "windbreaker", "trench", "denim jacket", "leather jacket"],
    bottom: ["jeans", "chinos", "pants", "trousers", "shorts", "skirt", "joggers", "leggings", "cargo pants"],
    dress: ["dress", "jumpsuit", "romper", "gown"],
    shoes: ["sneakers", "shoes", "boots", "loafers", "sandals", "oxfords", "heels", "flats", "mules", "espadrilles", "derby"],
    accessory: ["watch", "belt", "bag", "hat", "scarf", "sunglasses", "bracelet", "necklace", "ring", "earrings", "tie", "pocket square"],
  };
  function getGarmentCategory(type: string): string {
    const t = (type || "").toLowerCase();
    for (const [cat, types] of Object.entries(GARMENT_CATEGORIES)) {
      if (types.some(g => t.includes(g))) return cat;
    }
    return "unknown";
  }

  // Gender-aware Hebrew verb forms
  const isMale = (userGender || "").toLowerCase() === "male";
  const isFemale = (userGender || "").toLowerCase() === "female";

  // Title validation: enforce short, punchy titles in the correct language
  improvements = improvements.map((imp) => {
    let title = (imp.title || "").trim();
    // Remove quotes wrapping the title
    if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
      title = title.slice(1, -1).trim();
    }

    // Cross-category check: if title mentions a different category than afterGarmentType, force rewrite
    const afterCat = getGarmentCategory(imp.afterGarmentType || "");
    const titleLower = title.toLowerCase();
    const titleMentionsDifferentCategory = afterCat !== "unknown" && Object.entries(GARMENT_CATEGORIES).some(([cat, types]) => {
      if (cat === afterCat) return false;
      return types.some(t => titleLower.includes(t));
    });

    // Detect bad title patterns and rebuild from metadata
    const isGenericPattern = /^שדרוג |שיפור |^upgrade |^improve |החלף\/י|שדרג\/י/i.test(title);
    const isFromToPattern = /^מ-.*ל-|^from .* to /i.test(title);
    const hasFakeWords = /(matching|premium|upgraded|complementary|similar)/i.test(title);
    const isTooLong = title.split(/\s+/).length > 10;
    const needsRewrite = isGenericPattern || isFromToPattern || hasFakeWords || titleMentionsDifferentCategory || !title;

    if (needsRewrite) {
      // Build a punchy title from metadata
      const beforeType = (imp.beforeGarmentType || "").trim();
      const afterType = (imp.afterGarmentType || "").trim();
      const afterMat = (imp.afterMaterial || "").trim();
      const afterColor = (imp.afterColor || "").trim();
      const FAKE = /^(matching|premium|upgraded|similar|complementary|better|improved|quality|stylish|elegant|luxury|n\/a|none)$/i;
      const realAfterType = afterType && !FAKE.test(afterType) ? afterType : "";
      const realAfterMat = afterMat && !FAKE.test(afterMat) ? afterMat : "";
      const realAfterColor = afterColor && !FAKE.test(afterColor) ? afterColor : "";

      if (lang === "he") {
        // Hebrew punchy title patterns
        const heGarmentMap: Record<string, string> = {
          "t-shirt": "טישרט", "tee": "טישרט", "polo": "פולו", "dress shirt": "חולצת כפתורים",
          "shirt": "חולצה", "blouse": "בלוזה", "sweater": "סוודר", "hoodie": "הודי",
          "blazer": "בלייזר", "jacket": "ז'קט", "coat": "מעיל", "cardigan": "קרדיגן",
          "jeans": "ג'ינס", "chinos": "צ'ינוס", "pants": "מכנסיים", "trousers": "מכנסיים",
          "shorts": "שורטס", "skirt": "חצאית", "dress": "שמלה",
          "sneakers": "סניקרס", "shoes": "נעליים", "boots": "מגפיים", "loafers": "לואפרס",
          "sandals": "סנדלים", "oxfords": "אוקספורדס",
          "watch": "שעון", "belt": "חגורה", "bag": "תיק", "hat": "כובע", "scarf": "צעיף",
          "sunglasses": "משקפי שמש", "bracelet": "צמיד", "necklace": "שרשרת",
        };
        const heMatMap: Record<string, string> = {
          "cotton": "כותנה", "linen": "פשתן", "denim": "דנים", "leather": "עור",
          "silk": "משי", "wool": "צמר", "suede": "זמש", "knit": "סריגה",
          "piqué cotton": "פיקה", "merino wool": "מרינו",
        };
        const heBefore = heGarmentMap[beforeType.toLowerCase()] || beforeType;
        const heAfter = heGarmentMap[realAfterType.toLowerCase()] || realAfterType;
        const heMat = heMatMap[realAfterMat.toLowerCase()] || "";

        // Gender-aware taglines for variety
        const heTaglines = isFemale
          ? ["קפיצת דרג בסטייל", "נוכחות שמרגישים", "הפרט שמשלים את הלוק"]
          : ["קפיצת דרג בסטייל", "נוכחות שמרגישה", "הפרט שמשלים את הלוק"];
        const heTag = heTaglines[Math.floor(Math.random() * heTaglines.length)];

        if (heAfter && heBefore && heBefore !== heAfter) {
          title = heMat ? `${heAfter} ${heMat} במקום ${heBefore}` : `${heAfter} במקום ${heBefore}`;
        } else if (heAfter && heMat) {
          title = `${heAfter} ${heMat} — ${heTag}`;
        } else if (heAfter) {
          title = `${heAfter} — ${heTag}`;
        } else {
          title = imp.afterLabel || `שדרוג — ${heTag}`;
        }
      } else {
        // English punchy title
        const matLabel = realAfterMat ? ` ${realAfterMat.charAt(0).toUpperCase() + realAfterMat.slice(1)}` : "";
        const afterLabel = realAfterType ? realAfterType.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "";
        const beforeLabel = beforeType ? beforeType.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "";

        if (afterLabel && beforeLabel && afterLabel !== beforeLabel) {
          title = `${matLabel ? matLabel.trim() + " " : ""}${afterLabel} Over ${beforeLabel}`;
        } else if (afterLabel && matLabel) {
          title = `${matLabel.trim()} ${afterLabel} — Level Up`;
        } else if (afterLabel) {
          title = `${afterLabel} — A Look-Changing Upgrade`;
        } else {
          title = imp.afterLabel || "Wardrobe Upgrade";
        }
      }
    } else if (isTooLong) {
      // Just truncate if too long but otherwise OK
      const words = title.split(/\s+/);
      const truncated = words.slice(0, 8).join(" ");
      const breakIdx = truncated.search(/[—\-:,]/);
      if (breakIdx > 5) {
        title = truncated.slice(0, breakIdx).trim();
      } else {
        title = words.slice(0, 7).join(" ");
      }
    }

    // Description sanitization: catch generic/bad patterns and rebuild professionally
    let desc = (imp.description || "").trim();
    const badDescPatterns = /החלף\/י|הוסף\/י|בחר\/י|שלב\/י|שדרג\/י|למראה משודרג יותר|זה ישדרג את הלוק|replace the .* with|for a more polished look/i;
    if (badDescPatterns.test(desc) || desc.length < 30) {
      const afterType = (imp.afterGarmentType || "").trim();
      const afterColor = (imp.afterColor || "").trim();
      const afterStyle = (imp.afterStyle || "smart-casual").trim();
      const FAKE = /^(matching|premium|upgraded|similar|complementary|better|improved|quality|stylish|elegant|luxury|n\/a|none|undefined)$/i;
      const heGarmentMap: Record<string, string> = {
        "t-shirt": "טישרט", "polo": "פולו", "dress shirt": "חולצת כפתורים",
        "shirt": "חולצה", "blouse": "בלוזה", "sweater": "סוודר", "hoodie": "הודי",
        "blazer": "בלייזר", "jacket": "ז'קט", "coat": "מעיל", "cardigan": "קרדיגן",
        "jeans": "ג'ינס", "chinos": "צ'ינוס", "pants": "מכנסיים", "trousers": "מכנסיים",
        "shorts": "שורטס", "skirt": "חצאית", "dress": "שמלה",
        "sneakers": "סניקרס", "shoes": "נעליים", "boots": "מגפיים", "loafers": "לואפרס",
        "linen shirt": "חולצת פשתן", "knit sweater": "סוודר סרוג",
        "leather loafers": "לואפרס עור", "minimalist leather sneakers": "סניקרס עור מינימליסטי",
        "henley": "הנלי", "tailored chinos": "צ'ינוס מחויט", "tailored trousers": "מכנסיים מחויטים",
      };
      const heColorMap: Record<string, string> = {
        "navy blue": "כחול כהה", "white": "לבן", "charcoal": "אפור פחם", "olive": "ירוק זית",
        "light blue": "תכלת", "burgundy": "בורדו", "brown": "חום", "tan": "חום בהיר",
        "beige": "בז'", "navy": "כחול כהה", "black": "שחור", "gray": "אפור",
      };
      const styleNoteHe: Record<string, string> = {
        "smart-casual": "הלוק עולה רמה עם מראה smart-casual מאוזן",
        "formal": "הפריט מעניק נוכחות פורמלית ומלוטשת",
        "minimalist": "הגזרה הנקייה יוצרת סילואט מינימליסטי ומדויק",
        "casual": "הפריט שומר על נוחות אבל מרגיש הרבה יותר מושקע",
        "classic": "הפריט מביא נופך קלאסי ונצחי",
      };
      const styleNoteEn: Record<string, string> = {
        "smart-casual": "elevating the look with a balanced smart-casual aesthetic",
        "formal": "bringing a polished, formal presence",
        "minimalist": "creating a clean, minimalist silhouette",
        "casual": "keeping it comfortable but significantly more refined",
        "classic": "adding a timeless, classic touch",
      };
      const realAfterType = afterType && !FAKE.test(afterType) ? afterType : "";
      const realAfterColor = afterColor && !FAKE.test(afterColor) ? afterColor : "";
      if (lang === "he") {
        const heAfter = heGarmentMap[realAfterType.toLowerCase()] || realAfterType;
        const heColor = heColorMap[realAfterColor.toLowerCase()] || realAfterColor;
        const sNote = styleNoteHe[afterStyle] || "השדרוג מעניק מראה מושקע ומקצועי יותר";
        if (heAfter && heColor) {
          desc = `ה${heAfter} ב${heColor} מעניק מרקם ונוכחות לסילואט. ${sNote}. שילוב ${heColor} עם שאר הפריטים יוצר הרמוניה צבעונית נעימה.`;
        } else if (heAfter) {
          desc = `ה${heAfter} מעניק מבנה ונוכחות לסילואט. ${sNote}.`;
        }
      } else {
        const sNote = styleNoteEn[afterStyle] || "delivering a more polished, intentional look";
        if (realAfterType && realAfterColor) {
          desc = `The ${realAfterColor} ${realAfterType} adds structure and presence to the silhouette, ${sNote}. The ${realAfterColor} tone pairs beautifully with the rest of the outfit — a key 2025 trend.`;
        } else if (realAfterType) {
          desc = `The ${realAfterType} adds structure and presence to the silhouette, ${sNote}.`;
        }
      }
    }

    return { ...imp, title, description: desc };
  });

  improvements = improvements.map((imp) => normalizeImprovementShoppingLinks(imp, lang, preferredStores, genderCat, budgetLevel));
  if (improvements.length < 4 && fallback) {
    const needed = 4 - improvements.length;
    improvements = [...improvements, ...fallback.improvements.slice(0, needed)];
  }
  if (improvements.length > 5) improvements = improvements.slice(0, 5);
  improvements = improvements.map((imp) => normalizeImprovementShoppingLinks(imp, lang, preferredStores, genderCat, budgetLevel));

  // Global deduplication: remove duplicate shopping links across all improvements
  const globalSeenUrls = new Set<string>();
  const globalSeenTitles = new Set<string>();
  const globalSeenCategories = new Set<string>();
  improvements = improvements.map((imp) => {
    // Deduplicate by title (case-insensitive)
    const titleKey = (imp.title || "").trim().toLowerCase();
    if (titleKey && globalSeenTitles.has(titleKey)) {
      return null as any;
    }
    // Deduplicate by category (afterGarmentType or afterLabel) — max 1 improvement per garment category
    const catKey = (imp.afterGarmentType || imp.afterLabel || "").trim().toLowerCase();
    if (catKey && globalSeenCategories.has(catKey)) {
      return null as any;
    }
    // Similarity check: if title is >60% similar to any seen title, skip
    const isSimilar = Array.from(globalSeenTitles).some((seen) => {
      const a = titleKey.replace(/[^a-zA-Z\u0590-\u05FF0-9\s]/g, "");
      const b = seen.replace(/[^a-zA-Z\u0590-\u05FF0-9\s]/g, "");
      const wordsA = new Set(a.split(/\s+/).filter(Boolean));
      const wordsB = new Set(b.split(/\s+/).filter(Boolean));
      const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      return union > 0 && intersection / union > 0.6;
    });
    if (isSimilar) return null as any;
    if (titleKey) globalSeenTitles.add(titleKey);
    if (catKey) globalSeenCategories.add(catKey);

    // Deduplicate shopping links across improvements
    const uniqueLinks = (imp.shoppingLinks || []).filter((link) => {
      const urlKey = (link.url || "").trim().toLowerCase();
      if (!urlKey || globalSeenUrls.has(urlKey)) return false;
      globalSeenUrls.add(urlKey);
      return true;
    });

    // Post-dedup refill: ensure at least 3 unique shopping links per improvement
    let finalLinks = uniqueLinks;
    if (finalLinks.length < 3) {
      const query = imp.productSearchQuery || imp.afterLabel || imp.title || "fashion upgrade";
      const freshLinks = buildFallbackShoppingLinks(query).filter((fb) => {
        const key = (fb.url || "").trim().toLowerCase();
        if (!key || globalSeenUrls.has(key)) return false;
        globalSeenUrls.add(key);
        return true;
      });
      finalLinks = [...finalLinks, ...freshLinks];
    }

    return { ...imp, shoppingLinks: finalLinks.slice(0, 3) };
  }).filter(Boolean);

  let outfitSuggestions = Array.isArray(rec.outfitSuggestions) ? rec.outfitSuggestions : [];
  if (outfitSuggestions.length < 2) {
    outfitSuggestions = [...outfitSuggestions, ...fallback.outfitSuggestions];
  }
  outfitSuggestions = sanitizeOutfitSuggestionsForProfileGender(outfitSuggestions, userGender, lang);
  outfitSuggestions = outfitSuggestions.slice(0, 3);

  let trendSources = Array.isArray(rec.trendSources) ? rec.trendSources : [];
  if (trendSources.length < 2) {
    trendSources = [...trendSources, ...fallback.trendSources];
  }
  trendSources = trendSources.slice(0, 4);

  let influencerInsight = (rec.influencerInsight || "").trim();
  if (!influencerInsight) influencerInsight = fallback.influencerInsight;
  if (lang === "he" && !isHebrewText(influencerInsight)) {
    influencerInsight = fallback.influencerInsight;
  }
  const detailedInsight = buildDetailedInfluencerInsightFromCore(core, lang, userGender, preferredInfluencers);
  const mentionedCount = detailedInsight.mentions.filter((inf) => influencerInsight.includes(inf.text)).length;
  const sentenceCount = influencerInsight
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .length;
  const hasGapLanguage = lang === "he"
    ? /(חסר|פער|כדי להתיישר|מה לשפר|דורש שיפור)/.test(influencerInsight)
    : /(missing|gap|align|needs improvement|to improve)/i.test(influencerInsight);
  const hasCoreReference = hasCoreItemReferenceInInsight(influencerInsight, core);
  if (mentionedCount < 2 || sentenceCount < 4 || influencerInsight.length < 260 || !hasGapLanguage || !hasCoreReference) {
    influencerInsight = detailedInsight.insight;
  }

  return {
    improvements,
    outfitSuggestions,
    trendSources,
    influencerInsight,
  };
}

function buildFallbackRecommendationsFromCore(
  core: FashionAnalysisCorePayload,
  lang: "he" | "en",
  occasion?: string | null,
  userGender?: string | null,
  preferredInfluencers?: string | null,
  preferredStores?: string | null,
  budgetLevel?: string | null,
): FashionRecommendationsPayload {
  const genderCat: GenderCategory = userGender === "female" ? "female" : userGender === "unisex" ? "unisex" : "male";
  const isHebrew = lang === "he";
  const stageOneItems = core.items || [];
  const improvements: Improvement[] = [
    buildFallbackImprovement("top", isHebrew, stageOneItems),
    buildFallbackImprovement("bottom", isHebrew, stageOneItems),
    buildFallbackImprovement("shoes", isHebrew, stageOneItems),
    buildFallbackImprovement("outerwear", isHebrew, stageOneItems),
  ];

  const coreItems = (core.items || []).map((it) => it.name).filter(Boolean);
  const firstLookItems = coreItems.slice(0, 3);
  const secondLookItems = coreItems.slice(1, 4);
  const outfitSuggestions: OutfitSuggestion[] = [
    {
      name: isHebrew ? "לוק נקי ומאוזן" : "Clean balanced look",
      occasion: occasion || (isHebrew ? "יומיומי" : "daily"),
      items: firstLookItems.length > 0 ? firstLookItems : (isHebrew ? ["חולצה מחויטת", "מכנסיים בגזרה נקייה", "נעליים תואמות"] : ["structured top", "clean-cut bottoms", "coordinated shoes"]),
      colors: isHebrew ? ["שחור", "לבן", "אפור"] : ["black", "white", "grey"],
      lookDescription: isHebrew
        ? "מראה מלא עם שכבות נקיות, פרופורציות מאוזנות ונעליים מחברות."
        : "A complete look with clean layering, balanced proportions, and grounding footwear.",
      inspirationNote: isHebrew
        ? "בסיס ורסטילי שקל לשדרג עם שכבה עליונה או אקססוריז מדויקים."
        : "A versatile base you can elevate with a structured outer layer or precise accessories.",
    },
    {
      name: isHebrew ? "לוק מודרני משודרג" : "Elevated modern look",
      occasion: occasion || (isHebrew ? "יציאה" : "going out"),
      items: secondLookItems.length > 0 ? secondLookItems : (isHebrew ? ["שכבה עליונה מובנית", "פריט תחתון מחויט", "נעליים איכותיות"] : ["structured outerwear", "tailored bottoms", "quality footwear"]),
      colors: isHebrew ? ["נייבי", "לבן שבור", "חום"] : ["navy", "off-white", "brown"],
      lookDescription: isHebrew
        ? "שילוב מודרני המדגיש צללית נקייה ואיכות חומרים."
        : "A modern combination emphasizing clean silhouette and elevated material quality.",
      inspirationNote: isHebrew
        ? "מתאים כשצריך לוק שלם ומחודד בלי עומס."
        : "Useful when you need a complete polished look without visual overload.",
    },
  ];

  const trendSources = isHebrew
    ? [
        { source: "Vogue", title: "טרנדי לבוש עדכניים", url: "https://www.vogue.com/fashion/trends", relevance: "מגמות לבישות", season: "2025-2026" },
        { source: "GQ", title: "קווים נקיים ושכבות", url: "https://www.gq.com/style", relevance: "סגנון גברי/יוניסקס", season: "2025-2026" },
      ]
    : [
        { source: "Vogue", title: "Current wearable fashion trends", url: "https://www.vogue.com/fashion/trends", relevance: "wearable direction", season: "2025-2026" },
        { source: "GQ", title: "Clean silhouettes and layering", url: "https://www.gq.com/style", relevance: "menswear/unisex styling", season: "2025-2026" },
      ];

  const influencerInsight = buildDetailedInfluencerInsightFromCore(
    core,
    lang,
    userGender,
    preferredInfluencers,
  ).insight;

  return {
    improvements: improvements.map((imp) => normalizeImprovementShoppingLinks(imp, lang, preferredStores, genderCat, budgetLevel)),
    outfitSuggestions: sanitizeOutfitSuggestionsForProfileGender(outfitSuggestions, userGender, lang),
    trendSources,
    influencerInsight,
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      if (!profile) return null;
      // Convert DB int (0/1) to boolean for frontend consistency
      return {
        ...profile,
        onboardingCompleted: Boolean(profile.onboardingCompleted),
        saveToWardrobe: Boolean(profile.saveToWardrobe),
      };
    }),

    save: protectedProcedure
      .input(z.object({
        ageRange: z.string().optional(),
        gender: z.string().optional(),
        occupation: z.string().optional(),
        budgetLevel: z.string().optional(),
        stylePreference: z.string().optional(),
        favoriteBrands: z.string().optional(),
        favoriteInfluencers: z.string().optional(),
        phoneNumber: z.string().optional(),
        instagramHandle: z.string().optional(),
        preferredStores: z.string().optional(),
        saveToWardrobe: z.boolean().optional(),
        onboardingCompleted: z.boolean().optional(),
        country: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate phone uniqueness before saving
        if (input.phoneNumber) {
          const takenBy = await isPhoneTaken(input.phoneNumber, ctx.user.id);
          if (takenBy !== null) {
            throw new Error("מספר הטלפון הזה כבר משויך למשתמש אחר. אם זה המספר שלך, פנה/י לתמיכה.");
          }
        }
        // Check if phone number is being set for the first time (or changed)
        const existingProfile = await getUserProfile(ctx.user.id);
        // Normalize both sides for comparison — input may have spaces/dashes, DB value is normalized
        const normalizedInputPhone = input.phoneNumber ? input.phoneNumber.replace(/[^0-9+]/g, "") : null;
        const normalizedExistingPhone = existingProfile?.phoneNumber?.replace(/[^0-9+]/g, "") || null;
        const isNewPhone = normalizedInputPhone && normalizedInputPhone !== normalizedExistingPhone;

        // Build profile data — only include fields that were explicitly provided
        // to prevent nulling out existing values when saving partial updates (e.g. just phoneNumber)
        const profileData: Record<string, unknown> = { userId: ctx.user.id };
        const nullableFields = [
          "ageRange", "gender", "occupation", "budgetLevel", "stylePreference",
          "favoriteBrands", "favoriteInfluencers", "phoneNumber", "instagramHandle",
          "preferredStores"
        ] as const;
        for (const field of nullableFields) {
          if (input[field] !== undefined) {
            profileData[field] = input[field] ?? null;
          }
        }
        if (input.saveToWardrobe !== undefined) {
          profileData.saveToWardrobe = input.saveToWardrobe ? 1 : 0;
        }
        if (input.onboardingCompleted !== undefined) {
          profileData.onboardingCompleted = input.onboardingCompleted ? 1 : 0;
        }
        if (input.country !== undefined) {
          profileData.country = input.country;
        }
        const profileId = await upsertUserProfile(profileData as any);

        // Send WhatsApp welcome message when phone is saved for the first time (fire-and-forget)
        console.log(`[Profile Save] isNewPhone=${isNewPhone}, normalizedInputPhone='${normalizedInputPhone}', normalizedExistingPhone='${normalizedExistingPhone}', inputPhoneNumber='${input.phoneNumber}'`);
        if (isNewPhone) {
          console.log(`[Profile Save] Triggering sendWhatsAppWelcome for phone='${input.phoneNumber}', user='${ctx.user.name}'`);
          sendWhatsAppWelcome(input.phoneNumber!, ctx.user.name || "", true, input.gender || existingProfile?.gender || null)
            .then((result) => {
              console.log(`[Profile Save] sendWhatsAppWelcome result:`, JSON.stringify(result));
            })
            .catch((err) => {
              console.error("[WhatsApp Welcome] Fire-and-forget error:", err?.message);
            });
        } else {
          console.log(`[Profile Save] Phone not new, skipping WhatsApp welcome`);
        }

        return { success: true, profileId, whatsAppWelcomeSent: !!isNewPhone };
      }),

    deleteAccount: protectedProcedure
      .mutation(async ({ ctx }) => {
        // Delete all user data from all tables
        await deleteUserAccount(ctx.user.id);
        // Clear session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return { success: true };
      }),

    /** GDPR/CCPA: Export all user data as JSON */
    exportMyData: protectedProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.user.id;
        const profile = await getUserProfile(userId);
        const reviews = await getReviewsByUserId(userId);
        const wardrobe = await getWardrobeByUserId(userId);
        const userFeedPosts = await getFeedPosts({ limit: 100, offset: 0, sort: "new" });
        const styleDiary = await getStyleDiary(userId);
        const igConnection = await getIgConnection(userId);
        const storyMentions = await getStoryMentionsByUserId(userId);

        return {
          exportDate: new Date().toISOString(),
          account: {
            id: ctx.user.id,
            name: ctx.user.name,
            openId: ctx.user.openId,
            createdAt: ctx.user.createdAt,
          },
          profile: profile ? {
            gender: profile.gender,
            ageRange: profile.ageRange,
            occupation: profile.occupation,
            budgetLevel: profile.budgetLevel,
            stylePreference: profile.stylePreference,
            favoriteInfluencers: profile.favoriteInfluencers,
            preferredStores: profile.preferredStores,
            phoneNumber: profile.phoneNumber ? "[REDACTED]" : null,
          } : null,
          reviews: reviews.map(r => ({
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            occasion: r.occasion,
            analysisText: r.analysisJson ? "[INCLUDED]" : null,
          })),
          wardrobeItemCount: wardrobe.length,
          feedPostCount: userFeedPosts.total,
          styleDiaryEntryCount: styleDiary.length,
          instagramConnected: !!igConnection,
          storyMentionCount: storyMentions.length,
        };
      }),

    scanInstagram: protectedProcedure
      .input(z.object({ handle: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Use LLM to identify fashion influencers the user might follow
        // based on their IG handle and profile context
        const profile = await getUserProfile(ctx.user.id);
        const gender = profile?.gender || "male";
        const prompt = `You are a fashion industry expert. Given an Instagram user with handle @${input.handle}, suggest 8-12 fashion influencers they are likely following based on typical fashion-interested Instagram users.

The user identifies as: ${gender}

Return ONLY fashion influencers who are relevant to ${gender === "female" ? "women's" : gender === "male" ? "men's" : "unisex"} fashion.

For each influencer, provide:
- name: Full name
- handle: Instagram handle with @
- style: Their signature style in 2-3 words
- igUrl: Their Instagram profile URL
- imageStyle: Brief description of their look in Hebrew

Return as JSON array. Include a mix of:
- Major fashion influencers (Vogue, GQ featured)
- Street style icons
- Fashion designers who are active on IG
- Local/regional fashion bloggers

IMPORTANT: Return ONLY the JSON array, no markdown.`;

        try {
          const result = await invokeLLM({
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: `Find fashion influencers for @${input.handle}` },
            ],
            maxTokens: 2048,
          });
          const content = result.choices[0]?.message?.content;
          const text = typeof content === "string" ? content : "[]";
          const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const influencers = JSON.parse(cleaned);
          return {
            influencers: influencers.map((inf: any) => ({
              name: inf.name || "",
              handle: inf.handle || "",
              style: inf.style || "",
              gender: gender as "male" | "female" | "unisex",
              igUrl: inf.igUrl || `https://www.instagram.com/${(inf.handle || "").replace("@", "")}/`,
              imageStyle: inf.imageStyle || inf.style || "",
            })),
          };
        } catch (err) {
          console.error("[Instagram Scan] Failed:", err);
          // Fallback: return gender-filtered popular influencers
          const filtered = POPULAR_INFLUENCERS.filter(inf => inf.gender === gender || inf.gender === "unisex");
          return { influencers: filtered.slice(0, 8) };
        }
      }),
  }),

  review: router({
    upload: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        influencers: z.string().optional(),
        styleNotes: z.string().optional(),
        occasion: z.string().optional(),
        secondImageBase64: z.string().optional(),
        secondMimeType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const fileExt = input.mimeType.split("/")[1] || "jpg";
        const fileKey = `reviews/${userId}/${nanoid()}.${fileExt}`;
        const buffer = Buffer.from(input.imageBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Upload optional second image (camera second angle)
        let secondImageUrl: string | null = null;
        let secondImageKey: string | null = null;
        if (input.secondImageBase64) {
          const ext2 = (input.secondMimeType || input.mimeType).split("/")[1] || "jpg";
          secondImageKey = `reviews/${userId}/${nanoid()}-angle2.${ext2}`;
          const buf2 = Buffer.from(input.secondImageBase64, "base64");
          const res2 = await storagePut(secondImageKey, buf2, input.secondMimeType || input.mimeType);
          secondImageUrl = res2.url;
        }

        const reviewId = await createReview({
          userId,
          imageUrl: url,
          imageKey: fileKey,
          status: "pending",
          influencers: input.influencers || null,
          styleNotes: input.styleNotes || null,
          occasion: input.occasion || null,
          secondImageUrl,
          secondImageKey,
        });
        return { reviewId, imageUrl: url };
      }),

    analyze: protectedProcedure
      .input(z.object({ reviewId: z.number(), lang: z.enum(["he", "en"]).optional().default("he") }))
      .mutation(async ({ ctx, input }) => {
        const review = await getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");
        if (review.userId !== ctx.user.id) throw new Error("Unauthorized");
        // Allow retrying failed reviews
        if (review.status === "failed") {
          await updateReviewStatus(input.reviewId, "pending");
        }
        try {
          return await withAnalysisSlot(`review:${input.reviewId}`, async () => {
            await updateReviewStatus(input.reviewId, "analyzing");
          // Fetch user profile and wardrobe items in parallel for speed
          const [profile, allWardrobeItems] = await Promise.all([
            getUserProfile(ctx.user.id),
            getWardrobeByUserId(ctx.user.id, MAX_WARDROBE_ITEMS_FOR_ANALYSIS),
          ]);
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

          // Build wardrobe context from pre-fetched items
          let wardrobeCtx: WardrobeContext[] | undefined;
          if (profile && profile.saveToWardrobe && allWardrobeItems.length > 0) {
            wardrobeCtx = allWardrobeItems.slice(0, 30).map(item => ({
              itemType: item.itemType,
              name: item.name,
              color: item.color,
              brand: item.brand,
              styleNote: item.styleNote || null,
            }));
          }

          // Stage 33: Build Taste Profile for Stage 1 injection
          let tasteProfileForStage1: string | null = null;
          try {
            const allReviewsForTaste = await getReviewsByUserId(ctx.user.id);
            const completedForTaste = allReviewsForTaste.filter(r => r.status === "completed" && r.analysisJson);
            if (completedForTaste.length > 0) {
              const tasteCtx = buildTasteProfileContext(
                completedForTaste.map(r => ({ analysisJson: r.analysisJson, overallScore: r.overallScore, createdAt: r.createdAt })),
                allWardrobeItems.map(w => ({ itemType: w.itemType, name: w.name, color: w.color, brand: w.brand, styleNote: w.styleNote || null })),
                { stylePreference: profile?.stylePreference, gender: profile?.gender, budgetLevel: profile?.budgetLevel },
              );
              if (tasteCtx) tasteProfileForStage1 = formatTasteProfileForPrompt(tasteCtx, input.lang);
            }
          } catch (tpErr) {
            console.warn("[Stage 33] Failed to build taste profile for Stage 1:", tpErr);
          }

          const prompt = buildFashionPrompt(
            review.influencers ?? undefined,
            review.styleNotes ?? undefined,
            review.occasion ?? undefined,
            profileContext,
            wardrobeCtx,
            input.lang,
            tasteProfileForStage1,
          );
           // Stage 1: core analysis + identification (image-based)
           const stage1Start = Date.now();
           const MAX_RETRIES = 2;
           let analysisCore: FashionAnalysisCorePayload | null = null;
           for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              if (attempt > 0) {
                // Faster retry cadence: 2s, 4s
                const delay = 800 * Math.pow(2, attempt - 1);
                console.log(`[Fashion Analysis] Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              // Build user content with primary image + optional second angle
              const hasSecondImage = !!review.secondImageUrl;
              const userTextEn = hasSecondImage
                ? "Analyze the outfit in these TWO images (front and another angle of the same person/outfit) and provide a comprehensive fashion review in English. Use BOTH images to identify all items — the second angle may reveal accessories, shoes, or details not visible in the first. Reference current 2025-2026 trends. Pay special attention to accessories — rings, bracelets, watches, necklaces, glasses. Identify brands ONLY when clearly visible (logo, distinctive design). If uncertain, use hedging language like 'appears to be' or 'possibly'. Never confidently name a brand you're not sure about — it's better to describe generically than guess wrong. IMPORTANT: All shopping link URLs MUST be SEARCH URLs (e.g. ssense.com/en-us/men?q=product+name). NEVER use direct product page URLs with /product/ or /item/ paths — they will 404."
                : "Analyze the outfit in this image and provide a comprehensive fashion review in English. Reference current 2025-2026 trends. Pay special attention to accessories — rings, bracelets, watches, necklaces, glasses. Identify brands ONLY when clearly visible (logo, distinctive design). If uncertain, use hedging language like 'appears to be' or 'possibly'. Never confidently name a brand you're not sure about — it's better to describe generically than guess wrong. IMPORTANT: All shopping link URLs MUST be SEARCH URLs (e.g. ssense.com/en-us/men?q=product+name). NEVER use direct product page URLs with /product/ or /item/ paths — they will 404.";
              const userTextHe = hasSecondImage
                ? "נתח את הלוק בשתי התמונות האלה (חזית וזווית נוספת של אותו אדם/לוק) ותן חוות דעת אופנתית מקיפה בעברית. השתמש בשתי התמונות כדי לזהות את כל הפריטים — הזווית השנייה עשויה לחשוף אקססוריז, נעליים או פרטים שלא נראים בתמונה הראשונה. התבסס על טרנדים עדכניים של 2025-2026. שים לב במיוחד לאקססוריז — טבעות, צמידים, שעונים, שרשרות, משקפיים. זהה מותגים רק כשאתה בטוח (לוגו נראה, עיצוב ייחודי ברור). אם לא בטוח, השתמש בניסוח כמו 'כפי הנראה' או 'ייתכן שמדובר ב-'. עדיף לתאר פריט באופן כללי מאשר לטעות בזיהוי מותג. חשוב: כל לינקי הקניות חייבים להיות כתובות חיפוש (למשל: ssense.com/en-us/men?q=product+name). לעולם לא להשתמש בכתובות עם /product/ או /item/ — הם יובילו לשגיאת 404."
                : "נתח את הלוק בתמונה הזו ותן חוות דעת אופנתית מקיפה בעברית. התבסס על טרנדים עדכניים של 2025-2026. שים לב במיוחד לאקססוריז — טבעות, צמידים, שעונים, שרשרות, משקפיים. זהה מותגים רק כשאתה בטוח (לוגו נראה, עיצוב ייחודי ברור). אם לא בטוח, השתמש בניסוח כמו 'כפי הנראה' או 'ייתכן שמדובר ב-'. עדיף לתאר פריט באופן כללי מאשר לטעות בזיהוי מותג. חשוב: כל לינקי הקניות חייבים להיות כתובות חיפוש (למשל: ssense.com/en-us/men?q=product+name). לעולם לא להשתמש בכתובות עם /product/ או /item/ — הם יובילו לשגיאת 404.";
              const userContent: any[] = [
                { type: "text", text: input.lang === "en" ? userTextEn : userTextHe },
                { type: "image_url", image_url: { url: review.imageUrl, detail: "low" } },
              ];
              if (hasSecondImage) {
                userContent.push({ type: "image_url", image_url: { url: review.secondImageUrl!, detail: "low" } });
              }
              const llmResult = await invokeLLM({
                messages: [
                  { role: "system", content: prompt },
                  {
                    role: "user",
                    content: userContent,
                  },
                ],
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "fashion_analysis_core",
                    strict: true,
                    schema: analysisCoreJsonSchema,
                  },
                },
                maxTokens: 3200,
              });
              analysisCore = parseFashionAnalysisCorePayload(llmResult);
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
                msg.includes("INVALID_LLM_JSON") ||
                statusCode === 429 || statusCode === 503 || statusCode === 500 || statusCode === 502;
              if (!isRetryable || attempt === MAX_RETRIES - 1) {
                throw retryErr;
              }
              console.warn(`[Fashion Analysis] Attempt ${attempt + 1} failed (retryable): ${msg}`);
            }
          }
           if (!analysisCore) throw new Error("Analysis failed after retries");
           console.log(`[Timing] Stage 1 completed in ${Date.now() - stage1Start}ms`);

           // Stage 2: inspiration + recommendations (text-only from stage-1 output)
           const stage2Start = Date.now();

          // Stage 33: Reuse taste profile from Stage 1 + build wardrobe for Stage 2
          const tasteProfileText = tasteProfileForStage1; // Already computed above
          let wardrobeForStage2: string | null = null;
          try {
            if (allWardrobeItems.length > 0) {
              wardrobeForStage2 = formatWardrobeForStage2(
                allWardrobeItems.slice(0, 30).map(w => ({ itemType: w.itemType, name: w.name, color: w.color, brand: w.brand, styleNote: w.styleNote || null })),
                input.lang,
              );
            }
          } catch (tpErr) {
            console.warn("[Stage 33] Failed to build wardrobe for Stage 2:", tpErr);
          }

          const recommendationSeed = {
            overallScore: analysisCore.overallScore,
            summary: analysisCore.summary,
            items: (analysisCore.items || []).slice(0, 12),
            scores: analysisCore.scores || [],
            linkedMentions: (analysisCore.linkedMentions || []).slice(0, 20),
            // Stage 30 GAP 1: Pass enriched metadata to Stage 2
            personDetection: (analysisCore as any).personDetection || null,
            lookStructure: (analysisCore as any).lookStructure || null,
            occasion: review.occasion || null,
            influencers: review.influencers || null,
            styleNotes: review.styleNotes || null,
          };
          let recommendations: FashionRecommendationsPayload | null = null;
          try {
            const MAX_RECOMMENDATION_RETRIES = 2;
            for (let attempt = 0; attempt < MAX_RECOMMENDATION_RETRIES; attempt++) {
              try {
                if (attempt > 0) {
                  const delay = 600 * Math.pow(2, attempt - 1);
                  await new Promise((resolve) => setTimeout(resolve, delay));
                }
                const recResult = await invokeLLM({
                  messages: [
                    {
                      role: "system",
                      content: buildRecommendationsPromptFromCore(
                        input.lang,
                        review.occasion,
                        profileContext?.gender || null,
                        review.influencers || profileContext?.favoriteInfluencers || null,
                        profileContext?.preferredStores || null,
                        profileContext?.budgetLevel || null,
                        profileContext?.country || null,
                        tasteProfileText,
                        wardrobeForStage2,
                      ),
                    },
                    {
                      role: "user",
                      content: input.lang === "he"
                        ? `להלן פלט שלב 1 (ניתוח+זיהוי). התבסס על הפריטים המזוהים ב-items וודא שההמלצות מתייחסות ספציפית לצבעים, לחומרים, לגזרה ולסגנון של כל פריט. החזר רק השראה+המלצות בפורמט המבוקש:\n${JSON.stringify(recommendationSeed)}`
                        : `Here is the stage-1 analysis+identification output. Base your recommendations on the SPECIFIC items identified — their colors, materials, fit, and style. Each recommendation must directly address a specific item. Return only inspiration+recommendations in the required schema:\n${JSON.stringify(recommendationSeed)}`,
                    },
                  ],
                  response_format: {
                    type: "json_schema",
                    json_schema: {
                      name: "fashion_recommendations",
                      strict: true,
                      schema: recommendationsJsonSchema,
                    },
                  },
                  maxTokens: 2000,
                });
                recommendations = parseFashionRecommendationsPayload(recResult);
                break;
              } catch (retryErr: any) {
                const msg = retryErr?.message || "";
                const statusCode = retryErr?.status || retryErr?.statusCode || 0;
                const isRetryable =
                  msg.includes("exhausted") || msg.includes("412") ||
                  msg.includes("quota") || msg.includes("rate limit") || msg.includes("rate_limit") ||
                  msg.includes("429") || msg.includes("503") || msg.includes("500") ||
                  msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") ||
                  msg.includes("ECONNREFUSED") || msg.includes("fetch failed") ||
                  msg.includes("INVALID_LLM_JSON") ||
                  statusCode === 429 || statusCode === 503 || statusCode === 500 || statusCode === 502;
                if (!isRetryable || attempt === MAX_RECOMMENDATION_RETRIES - 1) {
                  throw retryErr;
                }
              }
            }
           } catch (recErr: any) {
             console.warn(`[Fashion Analysis] Stage-2 recommendations fallback: ${recErr?.message || recErr}`);
           }
           console.log(`[Timing] Stage 2 completed in ${Date.now() - stage2Start}ms`);

           if (!recommendations) {
            recommendations = buildFallbackRecommendationsFromCore(
              analysisCore,
              input.lang,
              review.occasion,
              profileContext?.gender || null,
              review.influencers || profileContext?.favoriteInfluencers || null,
              profileContext?.preferredStores || null,
            );
          }
          recommendations = sanitizeRecommendationsPayload(
            recommendations,
            analysisCore,
            input.lang,
            review.occasion,
            profileContext?.gender || null,
            review.influencers || profileContext?.favoriteInfluencers || null,
            profileContext?.preferredStores || null,
            profileContext?.budgetLevel || null,
          );
          let analysis: FashionAnalysis = {
            ...analysisCore,
            ...recommendations,
          };

          // Ensure linkedMentions exists and enrich with known brand URLs
          if (!analysis.linkedMentions) {
            analysis.linkedMentions = [];
          }

          // STEP 1: For items that have a brand, match to BRAND_URLS for correct URL
          for (const item of analysis.items) {
            const brandName = (item.brand || "").trim();
            if (brandName && brandName !== "N/A") {
              // Try exact match first
              const exactUrl = (BRAND_URLS as Record<string, string>)[brandName];
              if (exactUrl) {
                item.brandUrl = exactUrl;
              } else {
                // Try case-insensitive match
                for (const [brand, url] of Object.entries(BRAND_URLS)) {
                  if (brand.toLowerCase() === brandName.toLowerCase()) {
                    item.brand = brand; // normalize casing
                    item.brandUrl = url;
                    break;
                  }
                }
              }
              // Add to linkedMentions
              if (item.brand && !analysis.linkedMentions.find(m => m.text === item.brand)) {
                analysis.linkedMentions.push({ text: item.brand, type: "brand", url: item.brandUrl || "" });
              }
            }
          }

          // STEP 2: Also scan item names for brand mentions and enrich
          for (const item of analysis.items) {
            for (const [brand, url] of Object.entries(BRAND_URLS)) {
              if (item.name?.includes(brand) || item.analysis?.includes(brand)) {
                if (!item.brand || item.brand.trim() === "" || item.brand === "N/A") {
                  item.brand = brand;
                  item.brandUrl = url;
                  if (!item.brandConfidence) item.brandConfidence = "MEDIUM";
                }
                if (!analysis.linkedMentions.find(m => m.text === brand)) {
                  analysis.linkedMentions.push({ text: brand, type: "brand", url });
                }
              }
            }
          }

          // STEP 3: Ensure brandConfidence is always set
          for (const item of analysis.items) {
            if (!item.brandConfidence || item.brandConfidence.trim() === "") {
              if (item.brand && item.brand.trim() !== "" && item.brand !== "N/A") {
                item.brandConfidence = "LOW";
              } else {
                item.brandConfidence = "NONE";
              }
            }
          }

          // STEP 4: Ensure brand is never empty/N/A — if AI failed, mark as unknown
          for (const item of analysis.items) {
            if (!item.brand || item.brand.trim() === "" || item.brand === "N/A") {
              item.brand = "לא זוהה";
              item.brandConfidence = "NONE";
            }
          }
          // Supplement influencer mentions with known IG URLs (gender-filtered)
          const profileGender = profileContext?.gender;
          for (const inf of POPULAR_INFLUENCERS) {
            // Skip influencers that don't match the user's gender
            if (profileGender && inf.gender !== "unisex" && inf.gender !== profileGender) continue;
            const mentioned = analysis.influencerInsight?.includes(inf.name) ||
              analysis.summary?.includes(inf.name) ||
              analysis.outfitSuggestions?.some(s => s.inspirationNote?.includes(inf.name));
            if (mentioned && !analysis.linkedMentions.find(m => m.text === inf.name)) {
              analysis.linkedMentions.push({ text: inf.name, type: "influencer", url: inf.igUrl });
            }
          }
          // Also remove any wrong-gender influencer mentions the AI may have added
          if (profileGender) {
            analysis.linkedMentions = analysis.linkedMentions.filter(m => {
              if (m.type !== "influencer") return true;
              const knownInf = POPULAR_INFLUENCERS.find(inf => inf.name === m.text);
              if (!knownInf) return true; // unknown influencer, keep it
              return knownInf.gender === "unisex" || knownInf.gender === profileGender;
            });
          }

          // Enforce minimum score of 5 — clamp any visible scores below 5
          for (const item of analysis.items) {
            if (item.score < 5) item.score = 5;
          }
          for (const cat of analysis.scores) {
            if (cat.score !== null && cat.score < 5) cat.score = 5;
          }
          // Premium/Luxury users: Brand identification score must be at least 8
          // Quiet Luxury (no visible logos) is a deliberate high-fashion choice, not a weakness
          const isPremiumForScoring = profileContext?.budgetLevel === 'premium' || profileContext?.budgetLevel === 'luxury';
          if (isPremiumForScoring) {
            for (const cat of analysis.scores) {
              const catLower = cat.category.toLowerCase();
              if ((catLower.includes('מותג') || catLower.includes('brand')) && cat.score !== null && cat.score < 8) {
                cat.score = 8;
                // Update explanation to reflect Quiet Luxury appreciation
                if (cat.explanation && (cat.explanation.includes('לוגו') || cat.explanation.includes('logo') || cat.explanation.includes('זיהוי') || cat.explanation.includes('identif'))) {
                  cat.explanation = cat.explanation.replace(/\d\/10/g, '8/10');
                }
              }
            }
          }
          // Recalculate overall score with WEIGHTED categories
          // High weight (1.0): Item Quality, Fit, Color Palette, Age & Style Match
          // Medium weight (0.8): Footwear, Brand Recognition
          // Low weight (0.5): Layering, Accessories & Jewelry
          const categoryWeights: Record<string, number> = {
            'איכות הפריטים': 1.0, 'item quality': 1.0,
            'התאמת גזרה': 1.0, 'fit': 1.0,
            'צבעוניות': 1.0, 'color palette': 1.0,
            'התאמה לגיל ולסגנון': 1.0, 'age & style match': 1.0,
            'נעליים': 0.8, 'footwear': 0.8,
            'זיהוי מותגים': 0.8, 'brand recognition': 0.8,
            'שכבתיות (layering)': 0.5, 'שכבתיות': 0.5, 'layering': 0.5,
            'אקססוריז ותכשיטים': 0.5, 'accessories & jewelry': 0.5,
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

          // POST-PROCESSING QUALITY VALIDATION
          // Ensure material descriptions meet quality standards for ALL users
          const isPremiumUser = profileContext?.budgetLevel === 'premium' || profileContext?.budgetLevel === 'luxury';
          const cheapMaterialTerms = [
            { pattern: /דמוי עור/g, replacement: isPremiumUser ? "עור יוקרתי" : "עור סינתטי איכותי" },
            { pattern: /עור סינתטי(?! איכותי)/g, replacement: isPremiumUser ? "עור יוקרתי" : "עור סינתטי איכותי" },
            { pattern: /דמוי זמש/g, replacement: isPremiumUser ? "זמש איכותי" : "זמש סינתטי איכותי" },
            { pattern: /זמש סינתטי(?! איכותי)/g, replacement: isPremiumUser ? "זמש איכותי" : "זמש סינתטי איכותי" },
            { pattern: /דמוי משי/g, replacement: isPremiumUser ? "סאטן יוקרתי" : "סאטן" },
            { pattern: /פלסטיק/g, replacement: isPremiumUser ? "אקריליק" : "שרף" },
            { pattern: /faux leather/gi, replacement: isPremiumUser ? "premium leather" : "quality synthetic leather" },
            { pattern: /synthetic leather/gi, replacement: isPremiumUser ? "premium leather" : "quality synthetic leather" },
            { pattern: /faux suede/gi, replacement: isPremiumUser ? "premium suede" : "quality synthetic suede" },
            { pattern: /synthetic suede/gi, replacement: isPremiumUser ? "premium suede" : "quality synthetic suede" },
            { pattern: /faux silk/gi, replacement: isPremiumUser ? "premium satin" : "satin" },
            { pattern: /\bplastic\b/gi, replacement: isPremiumUser ? "acrylic" : "resin" },
          ];
          for (const item of analysis.items) {
            for (const term of cheapMaterialTerms) {
              if (item.description) item.description = item.description.replace(term.pattern, term.replacement);
              if (item.analysis) item.analysis = item.analysis.replace(term.pattern, term.replacement);
              if (item.name) item.name = item.name.replace(term.pattern, term.replacement);
            }
          }
          // Also clean summary
          for (const term of cheapMaterialTerms) {
            if (analysis.summary) analysis.summary = analysis.summary.replace(term.pattern, term.replacement);
          }

          // Ensure scores have explanation field (backward compat)
          for (const cat of analysis.scores) {
            if (!cat.explanation) {
              cat.explanation = "";
            }
          }

          // Fix shopping link URLs — ALWAYS rebuild as search URLs to prevent 404s
          // Even if AI generated correct-looking URLs, we rebuild them to guarantee they work
          const userGender: GenderCategory = (profileContext?.gender as GenderCategory) || "male";
          analysis = fixShoppingLinkUrls(analysis, userGender, profileContext?.preferredStores || null);
          analysis = normalizeOutfitSuggestionsForWearableCore(analysis, userGender);
          analysis = normalizeImprovementsForWearableCore(analysis, userGender);

          // --- Closet matching: enrich improvements with matching wardrobe items ---
          const allWardrobeItemsForMatching = Array.isArray(allWardrobeItems)
            ? allWardrobeItems.slice(0, MAX_WARDROBE_ITEMS_FOR_MATCHING)
            : [];
          if (allWardrobeItemsForMatching.length > 0 && analysis.improvements) {
            try {
              for (const imp of analysis.improvements) {
              // Try to find a wardrobe item that matches this improvement's category
              const impLower = `${imp.title} ${imp.description} ${imp.afterLabel} ${imp.productSearchQuery}`.toLowerCase();
              const impDescriptionLower = typeof imp.description === "string" ? imp.description.toLowerCase() : "";
              let bestMatch: typeof allWardrobeItems[0] | null = null;
              let bestScore = 0;

              // Category keywords for strict matching
              const typeKeywords: Record<string, string[]> = {
                "shirt": ["חולצ", "טי שירט", "shirt", "top", "tee", "polo", "blouse", "t-shirt", "tshirt", "👕"],
                "pants": ["מכנס", "ג'ינס", "צ'ינו", "pants", "jeans", "trousers", "shorts", "chino", "👖"],
                "shoes": ["נעל", "shoes", "sneaker", "boot", "סניקרס", "נעלי", "👟"],
                "jacket": ["ז'קט", "מעיל", "jacket", "coat", "bomber", "hoodie", "קפוצ'ון", "סווטשירט", "sweatshirt", "🧥"],
                "watch": ["שעון", "watch", "⌚"],
                "accessory": ["אקססורי", "תכשיט", "שרשר", "שרשת", "צמיד", "טבעת", "עגיל", "accessory", "jewelry", "necklace", "bracelet", "ring", "chain", "earring", "pendant", "💍", "📿"],
                "bag": ["תיק", "bag", "backpack", "👜"],
                "hat": ["כובע", "hat", "cap", "beanie", "🧢"],
                "sunglasses": ["משקפ", "sunglasses", "glasses", "🕶️"],
                "vest": ["ווסט", "vest", "gilet", "וסט"],
                "belt": ["חגורה", "belt"],
                "scarf": ["צעיף", "scarf", "bandana"],
              };

              // Stage 30 GAP 2: Use structured afterGarmentType as PRIMARY source for category detection
              let impCategory = "";
              const afterGType = (imp.afterGarmentType || "").toLowerCase();
              if (afterGType) {
                // Map structured garment type to closet matching category
                const garmentToCategoryMap: Record<string, string> = {
                  "t-shirt": "shirt", "tee": "shirt", "polo": "shirt", "dress shirt": "shirt",
                  "button-down": "shirt", "blouse": "shirt", "top": "shirt", "sweater": "shirt",
                  "hoodie": "jacket", "sweatshirt": "jacket", "henley": "shirt", "tank": "shirt",
                  "jeans": "pants", "chinos": "pants", "trousers": "pants", "shorts": "pants",
                  "skirt": "pants", "leggings": "pants",
                  "sneakers": "shoes", "loafers": "shoes", "boots": "shoes", "sandals": "shoes",
                  "oxfords": "shoes", "derby": "shoes", "heels": "shoes",
                  "jacket": "jacket", "blazer": "jacket", "coat": "jacket", "cardigan": "jacket",
                  "bomber": "jacket", "parka": "jacket", "vest": "vest",
                  "watch": "watch", "belt": "belt", "bag": "bag", "backpack": "bag",
                  "hat": "hat", "cap": "hat", "sunglasses": "sunglasses", "scarf": "scarf",
                  "necklace": "accessory", "bracelet": "accessory", "ring": "accessory", "earring": "accessory",
                };
                // Try exact match first, then partial match
                impCategory = garmentToCategoryMap[afterGType] || "";
                if (!impCategory) {
                  for (const [gType, cat] of Object.entries(garmentToCategoryMap)) {
                    if (afterGType.includes(gType) || gType.includes(afterGType)) {
                      impCategory = cat;
                      break;
                    }
                  }
                }
              }
              // Fallback to text-based detection (legacy)
              if (!impCategory) {
                for (const [cat, keywords] of Object.entries(typeKeywords)) {
                  if (keywords.some(kw => impLower.includes(kw))) {
                    impCategory = cat;
                    break;
                  }
                }
              }

              // STRICT: If we can't identify the improvement's category, skip closet matching entirely
              if (!impCategory) continue;

              for (const wItem of allWardrobeItemsForMatching) {
                let matchScore = 0;
                const wName = (wItem.name || "").toLowerCase();
                const wType = (wItem.itemType || "").toLowerCase();
                const wBrand = (wItem.brand || "").toLowerCase();
                const wColor = (wItem.color || "").toLowerCase();
                const wStyleNote = (wItem.styleNote || "").toLowerCase();
                const wAllText = `${wName} ${wType} ${wBrand} ${wStyleNote}`;

                // Find which category the wardrobe item belongs to
                let wCategory = "";
                for (const [cat, keywords] of Object.entries(typeKeywords)) {
                  if (keywords.some(kw => wType.includes(kw) || wName.includes(kw))) {
                    wCategory = cat;
                    break;
                  }
                }

                // STRICT: Both categories must be identified and must match
                if (!wCategory || wCategory !== impCategory) {
                  continue;
                }

                // --- STYLE CONTRADICTION CHECK ---
                // Even within the same category, reject items whose style contradicts the recommendation.
                // e.g. recommendation says "classic watch" but wardrobe has "smart watch" → skip
                const styleConflicts: [string[], string[]][] = [
                  // watch: classic/analog vs smart/digital
                  [["קלאסי", "אנלוגי", "classic", "analog", "elegant", "אלגנטי", "dress watch", "formal"], ["חכם", "smart", "digital", "דיגיטלי", "smartwatch", "fitness", "apple watch", "galaxy watch", "garmin"]],
                  // shoes: formal/elegant vs sporty/sneakers
                  [["אלגנט", "elegant", "formal", "פורמלי", "dress shoe", "oxford", "derby", "loafer", "monk"], ["ספורט", "sporty", "sneaker", "סניקרס", "running", "athletic", "ריצה"]],
                  // shirt: formal/dress vs casual/t-shirt
                  [["מכופתר", "פורמלי", "dress shirt", "formal", "button-down", "חולצה מכופתרת"], ["טי שירט", "t-shirt", "tee", "casual", "קז'ואל", "graphic tee"]],
                  // jacket: formal/blazer vs casual/bomber
                  [["בלייזר", "blazer", "suit jacket", "חליפה", "formal", "tailored"], ["bomber", "בומבר", "hoodie", "קפוצ'ון", "windbreaker", "puffer"]],
                  // bag: formal/briefcase vs casual/backpack
                  [["תיק עסקי", "briefcase", "formal", "פורמלי", "messenger"], ["תיק גב", "backpack", "casual", "ספורטיבי", "gym bag"]],
                ];

                let hasStyleConflict = false;

                // Stage 30 GAP 3: Use structured afterStyle for smart style contradiction
                const impStyle = (imp.afterStyle || "").toLowerCase();
                if (impStyle && wStyleNote) {
                  const formalStyles = ["formal", "elegant", "classic", "tailored", "smart-casual", "business"];
                  const casualStyles = ["casual", "sporty", "streetwear", "athletic", "relaxed"];
                  const impIsFormal = formalStyles.some(s => impStyle.includes(s));
                  const impIsCasual = casualStyles.some(s => impStyle.includes(s));
                  const wIsFormal = formalStyles.some(s => wStyleNote.includes(s));
                  const wIsCasual = casualStyles.some(s => wStyleNote.includes(s));
                  if ((impIsFormal && wIsCasual && !wIsFormal) || (impIsCasual && wIsFormal && !wIsCasual)) {
                    hasStyleConflict = true;
                  }
                }

                // Also check hardcoded pairs (legacy + specific edge cases)
                if (!hasStyleConflict) {
                  for (const [groupA, groupB] of styleConflicts) {
                    const impMatchesA = groupA.some(kw => impLower.includes(kw));
                    const impMatchesB = groupB.some(kw => impLower.includes(kw));
                    const wMatchesA = groupA.some(kw => wAllText.includes(kw));
                    const wMatchesB = groupB.some(kw => wAllText.includes(kw));

                    if ((impMatchesA && wMatchesB && !wMatchesA) || (impMatchesB && wMatchesA && !wMatchesB)) {
                      hasStyleConflict = true;
                      break;
                    }
                  }
                }

                if (hasStyleConflict) {
                  continue; // Skip — wardrobe item contradicts the recommendation's spirit
                }

                // Same category — base score
                matchScore += 5;

                // Check if the AI explicitly mentioned this wardrobe item in the description
                if (wName && impDescriptionLower.includes(wName)) matchScore += 10;
                if (wBrand && wBrand.length > 2 && impLower.includes(wBrand)) matchScore += 3;

                // Color matching bonus
                if (wColor && wColor.length > 1 && impLower.includes(wColor)) matchScore += 2;

                // Style alignment bonus — if wardrobe item's style note matches the recommendation's keywords
                if (wStyleNote) {
                  const impKeywords = impLower.split(/\s+/).filter(w => w.length > 3);
                  const styleMatches = impKeywords.filter(kw => wStyleNote.includes(kw)).length;
                  matchScore += Math.min(styleMatches * 1, 4); // Up to +4 for style alignment
                }

                if (matchScore > bestScore) {
                  bestScore = matchScore;
                  bestMatch = wItem;
                }
              }

              // Only match if we have category match (score >= 5)
              if (bestMatch && bestScore >= 5) {
                imp.closetMatch = {
                  wardrobeItemId: bestMatch.id,
                  name: bestMatch.name,
                  itemType: bestMatch.itemType,
                  brand: bestMatch.brand || undefined,
                  color: bestMatch.color || undefined,
                  sourceImageUrl: bestMatch.sourceImageUrl || undefined,
                  itemImageUrl: bestMatch.itemImageUrl || undefined,
                };
              }
            }
            } catch (closetErr: any) {
              console.warn(`[ClosetMatch] Review closet matching skipped: ${closetErr?.message || closetErr}`);
            }
          }

          // Save analysis to DB immediately (without waiting for product images)
          await updateReviewAnalysis(input.reviewId, analysis.overallScore, analysis);

          // Product images are now lazy-loaded per improvement category when the user scrolls to them.
          // No background generation needed here — the frontend triggers it via review.generateProductImages.

          // Auto-save detected items to wardrobe (fire-and-forget for faster response)
          // We already have the profile from the initial parallel fetch
          if (profile && profile.saveToWardrobe) {
            const wardrobeImageUrl = review.imageUrl;
            const wardrobeEntries = analysis.items.map((item) => ({
              userId: ctx.user.id,
              itemType: item.garmentType || item.icon || "clothing",
              name: item.name,
              color: item.preciseColor || item.color || null,
              brand: item.brand || null,
              material: item.material || null,
              styleNote: [
                item.subCategory,
                item.fit && item.fit !== "n/a" ? `fit: ${item.fit}` : null,
                item.pattern && item.pattern !== "solid" ? `pattern: ${item.pattern}` : null,
                item.texture ? `texture: ${item.texture}` : null,
                item.neckline && item.neckline !== "n/a" ? `neckline: ${item.neckline}` : null,
                item.closure && item.closure !== "n/a" ? `closure: ${item.closure}` : null,
                item.sleeveLength && item.sleeveLength !== "n/a" ? `sleeve: ${item.sleeveLength}` : null,
                item.garmentLength && item.garmentLength !== "n/a" ? `length: ${item.garmentLength}` : null,
                item.secondaryColor ? `secondary color: ${item.secondaryColor}` : null,
                item.details && item.details !== "none" ? `details: ${item.details}` : null,
              ].filter(Boolean).join(", ") || item.description || null,
              score: item.score,
              sourceImageUrl: wardrobeImageUrl || null,
              sourceReviewId: input.reviewId,
              verdict: item.verdict || null,
            }));
            if (wardrobeEntries.length > 0) {
              // Fire-and-forget: don't await, let it run in background
              addWardrobeItems(wardrobeEntries)
                .then((result) => console.log(`[Wardrobe] Added ${result?.added || 0} new items, skipped ${result?.skipped || 0} duplicates`))
                .catch((wardrobeErr) => console.warn("[Wardrobe] Failed to save items:", wardrobeErr));
            }
          }


          return { success: true, analysis };
          });
        } catch (error: any) {
          console.error("[Fashion Analysis] Failed:", error);
          console.error("[Fashion Analysis] Error message:", error?.message);
          console.error("[Fashion Analysis] Error status:", error?.status || error?.statusCode);
          console.error("[Fashion Analysis] Error stack:", error?.stack?.substring(0, 500));
          await updateReviewStatus(input.reviewId, "failed");
          const msg = error?.message || "";
          if (msg.includes("exhausted") || msg.includes("412") || msg.includes("quota") || msg.includes("rate limit") || msg.includes("rate_limit") || msg.includes("429")) {
            throw new Error(`שירות הניתוח עמוס כרגע. שגיאה: ${msg.substring(0, 200)}`);
          }
          if (msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
            throw new Error(`הניתוח לקח יותר מדי זמן. שגיאה: ${msg.substring(0, 200)}`);
          }
          if (msg.includes("ANALYSIS_QUEUE_BUSY")) {
            throw new Error("שירות הניתוח עמוס כרגע. נסו שוב בעוד כחצי דקה.");
          }
          if (msg.includes("ANALYSIS_QUEUE_TIMEOUT")) {
            throw new Error("שירות הניתוח עמוס כרגע. נסו שוב בעוד כחצי דקה.");
          }
          throw new Error(`הניתוח נכשל. שגיאה: ${msg.substring(0, 200)}`);
        }
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const review = await getReviewById(input.id);
        if (!review) throw new Error("Review not found");
        // Allow access if: owner OR admin OR review is published to feed
        if (review.userId !== ctx.user.id && ctx.user.role !== "admin") {
          const published = await isReviewPublished(input.id, review.userId);
          if (!published) throw new Error("Unauthorized");
        }
        // Re-apply store diversity normalization on read (fixes old analyses with all-same-store links)
        if (review.analysisJson && (review.analysisJson as FashionAnalysis).improvements) {
          const analysis = review.analysisJson as FashionAnalysis;
          const lang: "he" | "en" = /[\u0590-\u05FF]/.test(analysis.summary || "") ? "he" : "en";
          const profile = await getUserProfile(review.userId);
          const genderCat: GenderCategory = profile?.gender === "female" ? "female" : profile?.gender === "unisex" ? "unisex" : "male";
          analysis.improvements = analysis.improvements.map((imp) => normalizeImprovementShoppingLinks(imp, lang, profile?.preferredStores || null, genderCat, profile?.budgetLevel || null));
          review.analysisJson = analysis;
        }
        return review;
      }),

    /** Public access to a review via share token (WhatsApp deep links) */
    getByShareToken: publicProcedure
      .input(z.object({ token: z.string().min(8).max(64) }))
      .query(async ({ input }) => {
        const review = await getReviewByShareToken(input.token);
        if (!review) return null;
        // Re-apply store diversity normalization on read
        let analysisJson = review.analysisJson;
        if (analysisJson && (analysisJson as FashionAnalysis).improvements) {
          const analysis = analysisJson as FashionAnalysis;
          const lang: "he" | "en" = /[\u0590-\u05FF]/.test(analysis.summary || "") ? "he" : "en";
          const profile = review.userId ? await getUserProfile(review.userId) : null;
          const genderCat: GenderCategory = profile?.gender === "female" ? "female" : profile?.gender === "unisex" ? "unisex" : "male";
          analysis.improvements = analysis.improvements.map((imp) => normalizeImprovementShoppingLinks(imp, lang, profile?.preferredStores || null, genderCat, profile?.budgetLevel || null));
          analysisJson = analysis;
        }
        return {
          userId: review.userId,
          status: review.status,
          imageUrl: review.imageUrl,
          overallScore: review.overallScore,
          analysisJson,
          createdAt: review.createdAt,
        };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getReviewsByUserId(ctx.user.id);
    }),

    generateTotalLook: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const review = await getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");
        if (review.userId !== ctx.user.id) throw new Error("Unauthorized");
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis) throw new Error("No analysis available");

        // Get user gender for gender-appropriate image search
        const profile = await getUserProfile(ctx.user.id);
        const userGender = profile?.gender || "male";
        const genderLabel = userGender === "female" ? "women's" : "men's";

        // Build a detailed prompt from the analysis data using rich structured metadata
        const richExistingItems = (analysis.items || []).map(item => buildRichItemDescription(item)).join(", ");
        const improvementItems = (analysis.improvements || []).map((imp: Improvement) => {
          const parts = [imp.afterColor, imp.afterGarmentType || imp.afterLabel].filter(Boolean);
          if (imp.afterMaterial) parts.unshift(imp.afterMaterial);
          if (imp.afterFit) parts.unshift(imp.afterFit);
          return parts.join(' ') || imp.title;
        }).join(", ");
        const outfitItems = (analysis.outfitSuggestions || []).slice(0, 1).flatMap((s: OutfitSuggestion) => s.items).join(", ");
        const colors = (analysis.outfitSuggestions || []).slice(0, 1).flatMap((s: OutfitSuggestion) => s.colors).join(", ");
        const firstOutfit = (analysis.outfitSuggestions || [])[0];
        // Silhouette context from lookStructure
        const silhouetteHint = analysis.lookStructure?.silhouetteSummary ? `\nSilhouette: ${analysis.lookStructure.silhouetteSummary}.` : '';
        // PRIMARY: Generate a full outfit look image via AI (complete head-to-toe look)
        const prompt = `Fashion mood board / flat lay photograph showing a complete ${genderLabel} outfit look. Professional editorial style, clean white marble background, luxury fashion photography.
Items to include: ${outfitItems || improvementItems || richExistingItems}.
Color palette: ${colors || "neutral tones, black, white"}.${silhouetteHint}
Style: High-end ${genderLabel} fashion editorial flat lay, items arranged aesthetically like a magazine spread. Include shoes, clothing items, accessories, and a watch or jewelry if relevant. No mannequin, no model, just the items laid out beautifully. Crisp lighting, soft shadows, luxury feel.`;
        try {
          const { url } = await generateImage({ prompt });
          if (url && url.trim().length > 0) {
            return { imageUrl: url };
          }
        } catch (err: any) {
          console.error("[LookImage] AI image generation failed, falling back to metadata mosaic:", err);
        }
        // FALLBACK: Build a mosaic from product images (metadata-based)
        if (firstOutfit) {
          const metadataLook = await generateOutfitLookFromMetadata({
            analysis,
            outfit: firstOutfit,
            outfitIndex: 0,
            gender: userGender,
          });
          if (metadataLook?.imageUrl) {
            return { imageUrl: metadataLook.imageUrl };
          }
        }
        try {
          const { url: retryUrl } = await generateImage({ prompt });
          return { imageUrl: retryUrl || "" };
        } catch (err: any) {
          console.error("[Total Look] Image generation failed:", err);
          throw new Error("יצירת תמונת הלוק נכשלה. נסה שוב.");
        }
      }),

    fixMyLook: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        itemIndices: z.array(z.number()),
        selectedImprovements: z.record(z.string(), z.number()).optional(),
        // Direct improvement indices into the analysis.improvements array
        selectedImprovementIndices: z.array(z.number()).optional(),
        // Specific product details selected by the user for each improvement
        selectedProductDetails: z.array(z.object({
          improvementIndex: z.number(),
          productLabel: z.string(),
          productImageUrl: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const review = await getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");
        if (review.userId !== ctx.user.id) throw new Error("Unauthorized");
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis) throw new Error("No analysis available");

        // Get the items to fix
        const itemsToFix = input.itemIndices
          .filter(i => i >= 0 && i < (analysis.items || []).length)
          .map(i => analysis.items[i]);
        if (itemsToFix.length === 0) throw new Error("No items selected");

        // Detect original image dimensions for orientation matching
        let imageOrientation = "portrait";
        let imageAspectRatio = "3:4";
        let imageDimensions = { width: 0, height: 0 };
        try {
          const probeResult = await probeImageSize(review.imageUrl);
          imageDimensions = { width: probeResult.width, height: probeResult.height };
          if (probeResult.width > probeResult.height) {
            imageOrientation = "landscape";
            imageAspectRatio = `${probeResult.width}:${probeResult.height}`;
          } else if (probeResult.width === probeResult.height) {
            imageOrientation = "square";
            imageAspectRatio = "1:1";
          } else {
            imageOrientation = "portrait";
            imageAspectRatio = `${probeResult.width}:${probeResult.height}`;
          }
          console.log(`[Fix My Look] Original image: ${probeResult.width}x${probeResult.height} (${imageOrientation})`);
        } catch (probeErr) {
          console.warn("[Fix My Look] Could not detect image dimensions:", probeErr);
        }

        // Get matching improvements for context — use direct indices from client when available
        const allImprovements = analysis.improvements || [];
        const relevantImprovements: typeof allImprovements = [];
        
        // Strategy 1: Use direct improvement indices from client (most reliable)
        if (input.selectedImprovementIndices && input.selectedImprovementIndices.length > 0) {
          for (const impIdx of input.selectedImprovementIndices) {
            if (impIdx >= 0 && impIdx < allImprovements.length) {
              relevantImprovements.push(allImprovements[impIdx]);
            }
          }
        }
        
        // Strategy 2: Fallback — use selectedImprovements map (legacy) with improved matching
        if (relevantImprovements.length === 0) {
          const selectedImpMap = input.selectedImprovements || {};
          for (const itemIdx of input.itemIndices) {
            const item = analysis.items[itemIdx];
            if (!item) continue;
            const itemName = item.name.toLowerCase();
            const itemDesc = (item.description || "").toLowerCase();
            
            // Improved matching: word overlap + category matching
            const scored = allImprovements.map((imp, idx) => {
              const impTitle = imp.title.toLowerCase();
              const impDesc = imp.description.toLowerCase();
              const impBefore = imp.beforeLabel.toLowerCase();
              let score = 0;
              if (impTitle.includes(itemName) || impDesc.includes(itemName)) score += 10;
              if (impBefore.includes(itemName) || itemName.includes(impBefore)) score += 10;
              const words = itemName.split(/\s+/).filter(w => w.length > 2);
              for (const w of words) {
                if (impTitle.includes(w)) score += 4;
                if (impDesc.includes(w)) score += 3;
                if (impBefore.includes(w)) score += 4;
              }
              return { imp, idx, score };
            });
            
            const matchingImps = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.imp);
            const userPickedIdx = selectedImpMap[String(itemIdx)];
            if (userPickedIdx !== undefined && matchingImps[userPickedIdx]) {
              relevantImprovements.push(matchingImps[userPickedIdx]);
            } else if (matchingImps.length > 0) {
              relevantImprovements.push(matchingImps[0]);
            }
          }
        }
        
        // Strategy 3: If still nothing matched, use all improvements as context
        if (relevantImprovements.length === 0 && allImprovements.length > 0) {
          relevantImprovements.push(...allImprovements.slice(0, Math.min(allImprovements.length, input.itemIndices.length + 1)));
        }

        // Stage 33: Build Taste Profile for Fix My Look personalization
        let fixMyLookTasteText: string | null = null;
        try {
          const [allReviewsFML, allWardrobeFML, profileFML] = await Promise.all([
            getReviewsByUserId(ctx.user.id),
            getWardrobeByUserId(ctx.user.id),
            getUserProfile(ctx.user.id),
          ]);
          const completedFML = allReviewsFML.filter(r => r.status === "completed" && r.analysisJson);
          if (completedFML.length > 0) {
            const tasteCtx = buildTasteProfileContext(
              completedFML.map(r => ({ analysisJson: r.analysisJson, overallScore: r.overallScore, createdAt: r.createdAt })),
              allWardrobeFML.map(w => ({ itemType: w.itemType, name: w.name, color: w.color, brand: w.brand, styleNote: w.styleNote || null })),
              { stylePreference: profileFML?.stylePreference, gender: profileFML?.gender, budgetLevel: profileFML?.budgetLevel },
            );
            if (tasteCtx) fixMyLookTasteText = formatTasteProfileForPrompt(tasteCtx, "en");
          }
        } catch (tpErr) {
          console.warn("[Stage 33] Failed to build taste profile for Fix My Look:", tpErr);
        }

        const editPrompt = buildDeterministicFixMyLookPrompt({
          analysis,
          itemsToFix,
          relevantImprovements,
          allImprovements,
          selectedProductDetails: input.selectedProductDetails,
          imageOrientation,
          imageDimensions,
          tasteProfileText: fixMyLookTasteText,
        });

        // Generate the fixed image: user's photo as primary reference + product images as style references
        try {
          const targetSize =
            imageDimensions.width > 0 && imageDimensions.height > 0
              ? { width: imageDimensions.width, height: imageDimensions.height }
              : undefined;

          // Build originalImages array: [0] = user photo, [1..N] = selected product images
          const originalImagesArr: Array<{ url: string; mimeType: string }> = [
            { url: review.imageUrl, mimeType: "image/jpeg" },
          ];
          // Add product reference images for each selected improvement
          if (input.selectedProductDetails && input.selectedProductDetails.length > 0) {
            for (const detail of input.selectedProductDetails) {
              if (detail.productImageUrl && detail.productImageUrl.startsWith('http')) {
                originalImagesArr.push({
                  url: detail.productImageUrl,
                  mimeType: "image/jpeg",
                });
              }
            }
            console.log(`[Fix My Look] Sending ${originalImagesArr.length} images: 1 user photo + ${originalImagesArr.length - 1} product references`);
          }

          let { url: fixedImageUrl } = await generateImage({
            prompt: editPrompt,
            originalImages: originalImagesArr,
          });

          // Collect shopping links from relevant improvements
          const shoppingLinks = relevantImprovements
            .flatMap(imp => imp.shoppingLinks || [])
            .slice(0, 6);

          // Estimate improved score (optimistic but reasonable)
          const avgFixedItemScore = itemsToFix.reduce((sum, item) => sum + item.score, 0) / itemsToFix.length;
          const scoreBoost = Math.min((10 - avgFixedItemScore) * 0.6, 2.5);
          const estimatedNewScore = Math.min(Math.round((analysis.overallScore + scoreBoost) * 10) / 10, 9.8);

          const resultData = {
            originalImageUrl: review.imageUrl,
            fixedImageUrl: fixedImageUrl || "",
            originalScore: analysis.overallScore,
            estimatedScore: estimatedNewScore,
            itemsFixed: itemsToFix.map(item => ({
              name: item.name,
              icon: item.icon,
              scoreBefore: item.score,
              verdict: item.verdict,
            })),
            shoppingLinks,
          };

          // Save result to DB for future retrieval
          try {
            await saveFixMyLookResult({
              reviewId: input.reviewId,
              userId: ctx.user.id,
              fixedImageUrl: resultData.fixedImageUrl,
              originalScore: resultData.originalScore,
              estimatedScore: resultData.estimatedScore,
              itemsFixed: resultData.itemsFixed,
              shoppingLinks: resultData.shoppingLinks,
              itemIndices: input.itemIndices,
            });
          } catch (saveErr) {
            console.warn("[Fix My Look] Failed to save result to DB:", saveErr);
            // Don't fail the request if save fails
          }

          return resultData;
        } catch (err: any) {
          console.error("[Fix My Look] Image generation failed:", err);
          throw new Error("יצירת תמונת השיפור נכשלה. נסה שוב.");
        }
      }),

    getFixMyLookResult: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .query(async ({ ctx, input }) => {
        const saved = await getFixMyLookResult(input.reviewId, ctx.user.id);
        if (!saved) return null;

        // Also need the original image URL
        const review = await getReviewById(input.reviewId);
        if (!review) return null;

        return {
          originalImageUrl: review.imageUrl,
          fixedImageUrl: saved.fixedImageUrl,
          originalScore: saved.originalScore,
          estimatedScore: saved.estimatedScore,
          itemsFixed: saved.itemsFixed as Array<{ name: string; icon: string; scoreBefore: number; verdict: string }>,
          shoppingLinks: saved.shoppingLinks as Array<{ store: string; url: string; itemName: string }>,
          savedAt: saved.createdAt,
        };
      }),

    getInfluencerPost: protectedProcedure
      .input(z.object({
        influencerName: z.string(),
        influencerHandle: z.string(),
        context: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        // Use LLM to generate a description of a typical styling post by this influencer
        const prompt = `You are a fashion expert. Describe a typical Instagram post by ${input.influencerName} (${input.influencerHandle}) that demonstrates their signature styling.

${input.context ? `Context: The user's analysis mentioned this influencer regarding: ${input.context}` : ""}

Return a JSON object with:
- caption: A realistic Instagram caption this influencer would write (2-3 sentences, include emojis, in the style of the influencer). Write in English.
- stylingTip: A detailed, practical style analysis (4-6 sentences) that explicitly compares the USER'S CURRENT LOOK (from Context) to this influencer's style philosophy: what already aligns, what is missing, and 2-3 concrete changes the user should make in garments/colors/silhouette. Write the stylingTip in the same language as the user's interface.
- styleTags: Array of 4-6 relevant hashtag words (without #) that describe the look
- outfitDescription: A detailed description in English of what the influencer is wearing in this example post (for image generation). Be specific about colors, brands, and styling details.

Return ONLY the JSON object, no markdown.`;

        try {
          const llmResult = await invokeLLM({
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: `Generate an example Instagram post for ${input.influencerName}` },
            ],
            maxTokens: 1024,
          });
          const content = llmResult.choices[0]?.message?.content;
          const text = typeof content === "string" ? content : "{}";
          const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const postData = JSON.parse(cleaned);

          // Generate an image of the influencer's styling
          let imageUrl = "";
          try {
            const imgPrompt = `Fashion Instagram post photo. ${postData.outfitDescription || `Stylish outfit inspired by ${input.influencerName}'s signature look`}. Professional fashion photography, natural lighting, street style setting. No face visible, focus on the outfit and styling details. Editorial quality, Instagram-worthy composition.`;
            const { url } = await generateImage({ prompt: imgPrompt });
            imageUrl = url || "";
          } catch (imgErr) {
            console.warn("[Influencer Post] Image generation failed:", imgErr);
          }

          return {
            caption: postData.caption || "",
            stylingTip: postData.stylingTip || "",
            styleTags: postData.styleTags || [],
            imageUrl,
          };
        } catch (err: any) {
          console.error("[Influencer Post] Failed:", err);
          throw new Error("לא הצלחנו ליצור דוגמת פוסט. נסה שוב.");
        }
      }),

    generateOutfitLook: protectedProcedure
      .input(z.object({ reviewId: z.number(), outfitIndex: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const review = await getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");
        // Allow owner or anyone viewing a published review
        if (review.userId !== ctx.user.id) {
          const published = await isReviewPublished(input.reviewId, review.userId);
          if (!published) throw new Error("Unauthorized");
        }
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis) throw new Error("No analysis available");

          const outfit = analysis.outfitSuggestions?.[input.outfitIndex];
        if (!outfit) throw new Error("Outfit suggestion not found");

        // Get user gender for gender-appropriate image search
        const outfitProfile = await getUserProfile(ctx.user.id);
        const outfitGender = outfitProfile?.gender || "male";
        const outfitGenderLabel = outfitGender === "female" ? "women's" : "men's";

        // PRIMARY: Generate a full outfit look image via AI (complete head-to-toe look)
        // Use rich item descriptions from analysis items when available
        const richItems = (analysis.items || []).map(item => buildRichItemDescription(item));
        const lookDesc = outfit.lookDescription || (richItems.length > 0 ? richItems.join(', ') : outfit.items.join(", "));
        const colors = outfit.colors?.join(", ") || "neutral tones";
        const silhouetteCtx = analysis.lookStructure?.silhouetteSummary ? `\nSilhouette: ${analysis.lookStructure.silhouetteSummary}.` : '';
        const prompt = `Professional ${outfitGenderLabel} fashion flat lay / mood board photograph. Clean white marble background, luxury editorial style photography.
Outfit card variation index: ${input.outfitIndex + 1}. Keep this variation visually distinct from other outfit cards.
Complete ${outfitGenderLabel} outfit: ${lookDesc}.
Color palette: ${colors}.${silhouetteCtx}
Style: High-end ${outfitGenderLabel} fashion editorial flat lay, all items arranged aesthetically like a magazine spread. Include every piece: clothing, shoes, accessories, watch/jewelry. No mannequin, no model — just the items laid out beautifully with crisp lighting, soft shadows, and a luxury feel. Each item clearly visible and identifiable.`;

        try {
          const { url } = await generateImage({ prompt });
          if (url && url.trim().length > 0) {
            return { imageUrl: url };
          }
        } catch (err: any) {
          console.error("[Outfit Look] AI image generation failed, falling back to metadata mosaic:", err);
        }

        // FALLBACK 1: Build a mosaic from product images (metadata-based)
        const metadataLook = await generateOutfitLookFromMetadata({
          analysis,
          outfit,
          outfitIndex: input.outfitIndex,
          gender: outfitGender,
        });
        if (metadataLook?.imageUrl) {
          return { imageUrl: metadataLook.imageUrl };
        }

        // FALLBACK 2: Metadata mosaic with AI-generated product images
        const resilientMetadataLook = await generateOutfitLookFromMetadata({
          analysis,
          outfit,
          outfitIndex: input.outfitIndex,
          allowAIFallbackForLinks: true,
          gender: outfitGender,
        });
        if (resilientMetadataLook?.imageUrl) {
          return { imageUrl: resilientMetadataLook.imageUrl };
        }

        // If all else fails, return the original uploaded photo as a reference
        if (review.imageUrl) {
          return { imageUrl: review.imageUrl };
        }
        throw new Error("יצירת הדמיית הלוק נכשלה. נסה שוב.");
      }),

    correctItem: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        itemIndex: z.number(),
        correction: z.string().min(1).max(500),
        lang: z.enum(["he", "en"]).optional().default("he"),
      }))
      .mutation(async ({ ctx, input }) => {
        const review = await getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");
        if (review.userId !== ctx.user.id) throw new Error("Unauthorized");
        if (review.status !== "completed") throw new Error("Review not completed");
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis || !analysis.items) throw new Error("No analysis available");
        if (input.itemIndex < 0 || input.itemIndex >= analysis.items.length) {
          throw new Error("Invalid item index");
        }
        const originalItem = analysis.items[input.itemIndex];
        const isHebrew = input.lang === "he";
        const langLabel = isHebrew ? "Hebrew" : "English";
        const profile = await getUserProfile(ctx.user.id);
        const userGender: GenderCategory = (profile?.gender as GenderCategory) || "male";
        const correctionPrompt = `You are an elite fashion consultant. The user uploaded a photo and received a fashion analysis. One item was incorrectly identified. The user is correcting it.

ORIGINAL ITEM ANALYSIS:
- Name: ${originalItem.name}
- Description: ${originalItem.description}
- Color: ${originalItem.color}
- Score: ${originalItem.score}/10
- Verdict: ${originalItem.verdict}
- Analysis: ${originalItem.analysis}
- Icon: ${originalItem.icon}
${originalItem.brand ? `- Brand: ${originalItem.brand}` : ""}

USER CORRECTION: "${input.correction}"

The user is telling you the REAL identity of this item. Trust their correction.

Re-analyze this SINGLE item with the corrected information. Consider:
- The correct brand/model affects the score (luxury brands score higher for quality/craftsmanship)
- Update the description to reflect the real item
- Update the analysis to reference the correct brand reputation, price point, and fashion relevance
- If it is a luxury/designer item, the score should reflect that
- Keep the icon emoji appropriate for the item type
- The verdict should match the updated score

Verdict options (in ${langLabel}):
${isHebrew ? '"\u05d1\u05d7\u05d9\u05e8\u05d4 \u05de\u05e6\u05d5\u05d9\u05e0\u05ea" (score 9-10), "\u05e0\u05d9\u05d2\u05d5\u05d3\u05d9\u05d5\u05ea \u05d8\u05d5\u05d1\u05d4" (8-9), "\u05d9\u05e9 \u05e4\u05d5\u05d8\u05e0\u05e6\u05d9\u05d0\u05dc" (7-8), "\u05e0\u05d9\u05ea\u05df \u05dc\u05e9\u05d3\u05e8\u05d2" (6-7), "\u05d3\u05d5\u05e8\u05e9 \u05e9\u05d9\u05e4\u05d5\u05e8" (5-6)' : '"Excellent choice" (score 9-10), "Good contrast" (8-9), "Has potential" (7-8), "Can be upgraded" (6-7), "Needs improvement" (5-6)'}

Respond in ${langLabel}.

Return ONLY a JSON object with these exact fields:
{
  "name": "<updated item name including brand if known>",
  "description": "<updated description>",
  "color": "<color>",
  "score": <number 5-10>,
  "verdict": "<verdict string>",
  "analysis": "<updated detailed analysis, 2-3 sentences>",
  "icon": "<emoji icon>",
  "brand": "<brand name or null>",
  "brandUrl": "<brand website URL or null>"
}`;
        try {
          const llmResult = await invokeLLM({
            messages: [
              { role: "system", content: correctionPrompt },
              { role: "user", content: `The item is actually: ${input.correction}` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "corrected_item",
                strict: true,
                schema: {
                  type: "object" as const,
                  properties: {
                    name: { type: "string" as const },
                    description: { type: "string" as const },
                    color: { type: "string" as const },
                    score: { type: "number" as const },
                    verdict: { type: "string" as const },
                    analysis: { type: "string" as const },
                    icon: { type: "string" as const },
                    brand: { type: ["string", "null"] as any },
                    brandUrl: { type: ["string", "null"] as any },
                  },
                  required: ["name", "description", "color", "score", "verdict", "analysis", "icon", "brand", "brandUrl"] as const,
                  additionalProperties: false,
                },
              },
            },
            maxTokens: 1024,
          });
          const content = llmResult.choices[0]?.message?.content;
          const text = typeof content === "string" ? content : "";
          const correctedItem = JSON.parse(text);
          if (correctedItem.score < 5) correctedItem.score = 5;
          // Enrich with known brand URL
          if (correctedItem.brand) {
            for (const [brand, url] of Object.entries(BRAND_URLS)) {
              if (correctedItem.brand.includes(brand) || correctedItem.name.includes(brand)) {
                correctedItem.brand = brand;
                correctedItem.brandUrl = url;
                if (!analysis.linkedMentions) analysis.linkedMentions = [];
                if (!analysis.linkedMentions.find(m => m.text === brand)) {
                  analysis.linkedMentions.push({ text: brand, type: "brand", url });
                }
                break;
              }
            }
          }
          // Update the item in the analysis
          analysis.items[input.itemIndex] = {
            name: correctedItem.name,
            description: correctedItem.description,
            color: correctedItem.color,
            score: correctedItem.score,
            verdict: correctedItem.verdict,
            analysis: correctedItem.analysis,
            icon: correctedItem.icon,
            brand: correctedItem.brand || undefined,
            brandUrl: correctedItem.brandUrl || undefined,
          };
          // Recalculate overall score — adjust category scores proportionally
          const oldItemScore = originalItem.score;
          const newItemScore = correctedItem.score;
          const scoreDelta = newItemScore - oldItemScore;
          const itemCount = analysis.items.length;

          // Adjust relevant category scores proportionally based on item score change
          // The "item quality" category is most directly affected by individual item scores
          if (scoreDelta !== 0 && analysis.scores.length > 0) {
            const adjustmentPerCategory = (scoreDelta / itemCount);
            for (const cat of analysis.scores) {
              if (cat.score !== null) {
                // Apply proportional adjustment, clamped to 1-10
                cat.score = Math.round(Math.min(10, Math.max(1, cat.score + adjustmentPerCategory)) * 10) / 10;
              }
            }
          }

          const visibleScores = analysis.scores.filter(s => s.score !== null).map(s => s.score as number);
          const itemScores = analysis.items.map(item => item.score);
          const avgItemScore = itemScores.reduce((sum, s) => sum + s, 0) / itemScores.length;
          if (visibleScores.length > 0) {
            const avgCatScore = visibleScores.reduce((sum, s) => sum + s, 0) / visibleScores.length;
            analysis.overallScore = Math.round((avgCatScore * 0.6 + avgItemScore * 0.4) * 10) / 10;
          } else {
            analysis.overallScore = Math.round(avgItemScore * 10) / 10;
          }
          if (analysis.overallScore < 5) analysis.overallScore = 5;
          if (analysis.overallScore > 10) analysis.overallScore = 10;
          // Save updated analysis
          await updateReviewAnalysis(input.reviewId, analysis.overallScore, analysis);
          // Update wardrobe item if exists
          try {
            const wardrobeItemsList = await getWardrobeByUserId(ctx.user.id);
            const matchingWardrobeItem = wardrobeItemsList.find(
              w => w.sourceReviewId === input.reviewId && w.name === originalItem.name
            );
            if (matchingWardrobeItem) {
              await deleteWardrobeItem(matchingWardrobeItem.id, ctx.user.id);
              await addWardrobeItems([{
                userId: ctx.user.id,
                itemType: correctedItem.icon || "clothing",
                name: correctedItem.name,
                color: correctedItem.color || null,
                brand: correctedItem.brand || null,
                material: null,
                score: correctedItem.score,
                sourceImageUrl: review.imageUrl,
                sourceReviewId: input.reviewId,
                verdict: correctedItem.verdict || null,
              }]);
            }
          } catch (wardrobeErr) {
            console.warn("[CorrectItem] Failed to update wardrobe:", wardrobeErr);
          }
          return { success: true, correctedItem: analysis.items[input.itemIndex], analysis };
        } catch (error: any) {
          console.error("[CorrectItem] Failed:", error);
          throw new Error(isHebrew ? "\u05ea\u05d9\u05e7\u05d5\u05df \u05d4\u05e4\u05e8\u05d9\u05d8 \u05e0\u05db\u05e9\u05dc. \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1." : "Item correction failed. Please try again.");
        }
      }),

    /** Lazy load: generate product images for a specific improvement category */
    generateProductImages: protectedProcedure
      .input(z.object({ reviewId: z.number(), improvementIndex: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const review = await getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");
        if (review.userId !== ctx.user.id) throw new Error("Unauthorized");
        if (review.status !== "completed") throw new Error("Review not completed");
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis?.improvements?.[input.improvementIndex]) {
          throw new Error("Invalid improvement index");
        }
        // Re-apply store diversity normalization before generating images
        const lang: "he" | "en" = /[\u0590-\u05FF]/.test(analysis.summary || "") ? "he" : "en";
        // Get user gender and preferred stores for personalized image search
        const profile = await getUserProfile(ctx.user.id);
        const userGender = profile?.gender || "male";
        const genderCat: GenderCategory = userGender === "female" ? "female" : userGender === "unisex" ? "unisex" : "male";
        const imp = normalizeImprovementShoppingLinks(analysis.improvements[input.improvementIndex], lang, profile?.preferredStores || null, genderCat, profile?.budgetLevel || null);
        const impIdx = input.improvementIndex;;

        // Generate images for this single improvement category
        const updatedLinks = await generateImagesForImprovement(imp, async (linkIdx, imageUrl) => {
          try {
            const currentReview = await getReviewById(input.reviewId);
            if (currentReview?.analysisJson) {
              const currentAnalysis = currentReview.analysisJson as FashionAnalysis;
              if (currentAnalysis.improvements?.[impIdx]?.shoppingLinks?.[linkIdx]) {
                currentAnalysis.improvements[impIdx].shoppingLinks[linkIdx].imageUrl = imageUrl;
                await updateReviewAnalysis(input.reviewId, currentAnalysis.overallScore, currentAnalysis);
              }
            }
          } catch (dbErr: any) {
            console.warn(`[Lazy ProductImages] DB update failed:`, dbErr?.message);
          }
        }, userGender);
        return { links: updatedLinks };
      }),

    /** Batch: generate product images for ALL improvements in one call */
    generateAllProductImages: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const review = await getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");
        if (review.userId !== ctx.user.id) throw new Error("Unauthorized");
        if (review.status !== "completed") throw new Error("Review not completed");
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis?.improvements?.length) return { results: [] };
        // Re-apply store diversity normalization before generating images
        const batchLang: "he" | "en" = /[\u0590-\u05FF]/.test(analysis.summary || "") ? "he" : "en";
        const profile = await getUserProfile(ctx.user.id);
        const userGender = profile?.gender || "male";
        const batchGenderCat: GenderCategory = userGender === "female" ? "female" : userGender === "unisex" ? "unisex" : "male";
        analysis.improvements = analysis.improvements.map((imp) => normalizeImprovementShoppingLinks(imp, batchLang, profile?.preferredStores || null, batchGenderCat, profile?.budgetLevel || null));
        // Process ALL improvements in parallel
        const results = await Promise.all(
          analysis.improvements.map(async (imp, impIdx) => {
            const hasEmptyImages = imp.shoppingLinks?.some(l => !l.imageUrl || l.imageUrl.length < 5);
            if (!hasEmptyImages) return { index: impIdx, links: imp.shoppingLinks };
            try {
              const updatedLinks = await generateImagesForImprovement(imp, async (linkIdx, imageUrl) => {
                try {
                  const currentReview = await getReviewById(input.reviewId);
                  if (currentReview?.analysisJson) {
                    const currentAnalysis = currentReview.analysisJson as FashionAnalysis;
                    if (currentAnalysis.improvements?.[impIdx]?.shoppingLinks?.[linkIdx]) {
                      currentAnalysis.improvements[impIdx].shoppingLinks[linkIdx].imageUrl = imageUrl;
                      await updateReviewAnalysis(input.reviewId, currentAnalysis.overallScore, currentAnalysis);
                    }
                  }
                } catch (dbErr: any) {
                  console.warn(`[Batch ProductImages] DB update failed:`, dbErr?.message);
                }
              }, userGender);
              return { index: impIdx, links: updatedLinks };
            } catch (err: any) {
              console.warn(`[Batch ProductImages] Failed for improvement ${impIdx}:`, err?.message);
              return { index: impIdx, links: imp.shoppingLinks };
            }
          })
        );
        return { results };
      }),

    deleteAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        await deleteAllReviewsByUserId(ctx.user.id);
        return { success: true };
      }),

    /** Delete a single review by ID (user must own it) */
    deleteOne: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteReviewById(input.reviewId, ctx.user.id);
        return { success: true };
      }),
  }),

  wardrobe: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const items = await getWardrobeByUserId(ctx.user.id);
        return items;
      }),

    deleteItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteWardrobeItem(input.itemId, ctx.user.id);
        return { success: true };
      }),

    clear: protectedProcedure
      .mutation(async ({ ctx }) => {
        await clearWardrobe(ctx.user.id);
        return { success: true };
      }),

    /** Generate AI visualization of a composed look on the user's body */
    visualizeLook: protectedProcedure
      .input(z.object({
        itemIds: z.array(z.number()).min(1).max(10),
        lang: z.enum(["he", "en"]).default("he"),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Get the selected wardrobe items
        const allItems = await getWardrobeByUserId(ctx.user.id);
        const selectedItems = allItems.filter(item => input.itemIds.includes(item.id));
        if (selectedItems.length === 0) throw new Error("No items found");

        // 2. Find the most recent source image to use as body/face reference
        const sourceImageUrl = selectedItems.find(i => i.sourceImageUrl)?.sourceImageUrl || null;

        // 3. Get user profile for gender context
        const profile = await getUserProfile(ctx.user.id);
        const gender = profile?.gender || "person";
        const genderLabel = gender === "male" ? "man" : gender === "female" ? "woman" : "person";

        // 4. Build a detailed description of each item using rich metadata
        const itemDescriptions = selectedItems.map(item => buildRichWardrobeItemDescription(item)).join(", ");

        // 5. Build the prompt — if we have a source image, instruct to preserve the person's identity
        const prompt = sourceImageUrl
          ? `Edit this exact photo in-place. This is the user's actual photo — preserve their EXACT face, skin tone, body type, hair, and all physical features with 100% fidelity. Keep the SAME person, SAME pose, SAME background, SAME camera angle, SAME lighting. Show this SAME person wearing exactly this outfit: ${itemDescriptions}. Only change the clothing items — everything else about the person and environment must remain identical. The outfit should look natural and realistic on this specific person.`
          : `Full-body fashion photo of a stylish ${genderLabel} wearing exactly this outfit: ${itemDescriptions}. Standing in a clean, modern setting with soft natural lighting. The outfit should be the main focus. Professional fashion photography style, editorial quality. Show the complete outfit from head to toe. Clean background.`;
        // 6. Generate the image, using source photo as reference if available
        try {
          const generateOptions: any = { prompt };
          if (sourceImageUrl) {
            generateOptions.originalImages = [{
              url: sourceImageUrl,
              mimeType: "image/jpeg",
            }];
          }
          const { url } = await generateImage(generateOptions);
          return { imageUrl: url || "", items: selectedItems.map(i => ({ name: i.name, color: i.color, brand: i.brand, itemType: i.itemType })) };;
        } catch (err: any) {
          console.error("[Visualize Look] Image generation failed:", err);
          throw new Error(input.lang === "en" ? "Failed to generate look visualization. Please try again." : "יצירת הדמיית הלוק נכשלה. נסה שוב.");
        }
      }),
  }),

  feed: router({
    /** Get occasion counts for filter chips */
    occasionCounts: publicProcedure
      .query(async () => {
        return await getOccasionCounts();
      }),

    /** Get paginated feed posts with optional filtering */
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(12),
        offset: z.number().min(0).default(0),
        sort: z.enum(["new", "popular"]).default("new"),
        style: z.string().optional(),
        gender: z.string().optional(),
        occasion: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { posts, total } = await getFeedPosts({
          limit: input.limit,
          offset: input.offset,
          sort: input.sort,
          style: input.style || undefined,
          gender: input.gender || undefined,
          occasion: input.occasion || undefined,
        });

        // If user is logged in, get their like/save state
        let likedPostIds: number[] = [];
        let savedPostIds: number[] = [];
        if (ctx.user && posts.length > 0) {
          const interactions = await getUserFeedInteractions(
            ctx.user.id,
            posts.map(p => p.id)
          );
          likedPostIds = interactions.likedPostIds;
          savedPostIds = interactions.savedPostIds;
        }

        // Get following state for logged-in users
        let followingIds: number[] = [];
        if (ctx.user) {
          followingIds = await getFollowingIds(ctx.user.id);
        }

        return {
          posts: posts.map(p => ({
            ...p,
            isLiked: likedPostIds.includes(p.id),
            isSaved: savedPostIds.includes(p.id),
            isOwner: ctx.user ? p.userId === ctx.user.id : false,
            isFollowing: ctx.user ? followingIds.includes(p.userId) : false,
          })),
          total,
          hasMore: input.offset + posts.length < total,
        };
      }),

    /** Publish a review to the public feed */
    publish: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        caption: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get the review
        const review = await getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");
        if (review.userId !== ctx.user.id) throw new Error("Unauthorized");
        if (review.status !== "completed") throw new Error("Review not completed");

        // Get user profile for metadata
        const profile = await getUserProfile(ctx.user.id);

        // Extract summary from analysis JSON
        const analysis = review.analysisJson as FashionAnalysis | null;
        const summaryText = analysis?.summary || null;

        // GAP G: Build enriched style tags from lookStructure + item metadata
        const enrichedTags: string[] = [];
        if (profile?.stylePreference) enrichedTags.push(profile.stylePreference);
        if (analysis?.lookStructure) {
          const ls = analysis.lookStructure;
          if (ls.colorHarmony) enrichedTags.push(ls.colorHarmony);
          if (ls.hasLayering) enrichedTags.push('layered');
          if (ls.proportions && ls.proportions !== 'balanced') enrichedTags.push(ls.proportions);
          if (ls.silhouetteSummary) enrichedTags.push(ls.silhouetteSummary);
        }
        // Add dominant style from items
        if (analysis?.items) {
          const itemStyles = analysis.items.map(i => i.style).filter(Boolean) as string[];
          const styleCounts: Record<string, number> = {};
          for (const s of itemStyles) { const sl = s.toLowerCase(); styleCounts[sl] = (styleCounts[sl] || 0) + 1; }
          const topStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0];
          if (topStyle && !enrichedTags.some(t => t.toLowerCase() === topStyle[0])) enrichedTags.push(topStyle[0]);
        }

        const postId = await publishToFeed({
          userId: ctx.user.id,
          reviewId: input.reviewId,
          caption: input.caption || null,
          userName: ctx.user.name || null,
          gender: profile?.gender || null,
          styleTags: enrichedTags.length > 0 ? enrichedTags.join(', ') : (profile?.stylePreference || null),
          occasion: review.occasion || null,
          imageUrl: review.imageUrl,
          overallScore: review.overallScore,
          summary: summaryText,
        });

        // Notify followers about the new post (fire-and-forget)
        createNewPostNotifications(ctx.user.id, ctx.user.name || null, postId).catch(err => {
          console.error("[Notifications] Failed to create new post notifications:", err);
        });

        return { success: true, postId };
      }),

    /** Delete own post from feed */
    delete: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteFeedPost(input.postId, ctx.user.id);
        return { success: true };
      }),

    /** Like a post */
    like: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await likeFeedPost(ctx.user.id, input.postId);
        // Send notification to post owner (non-blocking, deduped in db function)
        if (result) {
          createLikeNotification(input.postId, ctx.user.id, ctx.user.name || "Someone").catch(err => {
            console.warn("[LikeNotification] Failed:", err);
          });
        }
        return { success: true, alreadyLiked: !result };
      }),

    /** Unlike a post */
    unlike: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await unlikeFeedPost(ctx.user.id, input.postId);
        return { success: true };
      }),

    /** Save/bookmark a post */
    save: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await saveFeedPost(ctx.user.id, input.postId);
        return { success: true, alreadySaved: !result };
      }),

    /** Unsave a post */
    unsave: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await unsaveFeedPost(ctx.user.id, input.postId);
        return { success: true };
      }),

    /** Get saved posts for current user */
    saved: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(12),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const { posts, total } = await getSavedPosts(ctx.user.id, input.limit, input.offset);
        const interactions = posts.length > 0
          ? await getUserFeedInteractions(ctx.user.id, posts.map(p => p.id))
          : { likedPostIds: [], savedPostIds: [] };

        const followingIds = await getFollowingIds(ctx.user.id);
        return {
          posts: posts.map(p => ({
            ...p,
            isLiked: interactions.likedPostIds.includes(p.id),
            isSaved: true,
            isOwner: p.userId === ctx.user.id,
            isFollowing: followingIds.includes(p.userId),
          })),
          total,
          hasMore: input.offset + posts.length < total,
        };
      }),

    /** Check if a review is already published */
    isPublished: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .query(async ({ ctx, input }) => {
        return { published: await isReviewPublished(input.reviewId, ctx.user.id) };
      }),

    /** Get feed posts from followed users only */
    following: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(12),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const { posts, total } = await getFollowingFeedPosts(ctx.user.id, input.limit, input.offset);
        let likedPostIds: number[] = [];
        let savedPostIds: number[] = [];
        if (posts.length > 0) {
          const interactions = await getUserFeedInteractions(ctx.user.id, posts.map(p => p.id));
          likedPostIds = interactions.likedPostIds;
          savedPostIds = interactions.savedPostIds;
        }
        const followingIds = await getFollowingIds(ctx.user.id);
        return {
          posts: posts.map(p => ({
            ...p,
            isLiked: likedPostIds.includes(p.id),
            isSaved: savedPostIds.includes(p.id),
            isOwner: p.userId === ctx.user.id,
            isFollowing: followingIds.includes(p.userId),
          })),
          total,
          hasMore: input.offset + posts.length < total,
        };
      }),

    /** Follow a user */
    follow: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await followUser(ctx.user.id, input.userId);
        return { success: true, alreadyFollowing: !result };
      }),

    /** Unfollow a user */
    unfollow: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await unfollowUser(ctx.user.id, input.userId);
        return { success: true };
      }),

    /** Check if current user follows another user */
    isFollowingUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        return { following: await isFollowing(ctx.user.id, input.userId) };
      }),

    /** Get notifications for current user */
    notifications: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        return getUserNotifications(ctx.user.id, input.limit, input.offset);
      }),

    /** Get unread notification count */
    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const count = await getUnreadNotificationCount(ctx.user.id);
        return { count };
      }),

    /** Mark all notifications as read */
    markRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await markNotificationsRead(ctx.user.id);
        return { success: true };
      }),

    /** Add a comment to a feed post */
    addComment: protectedProcedure
      .input(z.object({
        feedPostId: z.number(),
        content: z.string().min(1).max(500),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const commentId = await addFeedComment({
          feedPostId: input.feedPostId,
          userId: ctx.user.id,
          content: input.content,
          parentId: input.parentId ?? null,
          userName: ctx.user.name || "משתמש/ת",
        });

        // Notify post owner about the comment (fire-and-forget)
        createCommentNotification(
          input.feedPostId,
          ctx.user.id,
          ctx.user.name || "משתמש/ת"
        ).catch(err => console.error("[Notifications] Failed to create comment notification:", err));

        // If replying to someone, also notify the parent comment author
        if (input.parentId) {
          createReplyNotification(
            input.parentId,
            input.feedPostId,
            ctx.user.id,
            ctx.user.name || "משתמש/ת"
          ).catch(err => console.error("[Notifications] Failed to create reply notification:", err));
        }

        return { success: true, commentId };
      }),

    /** Get comments for a feed post */
    getComments: publicProcedure
      .input(z.object({ feedPostId: z.number() }))
      .query(async ({ input }) => {
        const comments = await getFeedComments(input.feedPostId);
        return { comments };
      }),

    /** Get comment count for a feed post */
    commentCount: publicProcedure
      .input(z.object({ feedPostId: z.number() }))
      .query(async ({ input }) => {
        const count = await getFeedCommentCount(input.feedPostId);
        return { count };
      }),

    /** Delete own comment */
    deleteComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteFeedComment(input.commentId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ---- Wardrobe Sharing ----
  wardrobeShare: router({
    /** Generate or get existing share link */
    generateLink: protectedProcedure
      .mutation(async ({ ctx }) => {
        // Check if token already exists
        const existing = await getWardrobeShareToken(ctx.user.id);
        if (existing) return { token: existing };
        // Generate new token
        const token = nanoid(16);
        await setWardrobeShareToken(ctx.user.id, token);
        return { token };
      }),

    /** Get current share token */
    getToken: protectedProcedure
      .query(async ({ ctx }) => {
        const token = await getWardrobeShareToken(ctx.user.id);
        return { token };
      }),

    /** View shared wardrobe (public — no auth required) */
    view: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const data = await getWardrobeByShareToken(input.token);
        if (!data) return null;
        return data;
      }),

    /** Revoke share link */
    revokeLink: protectedProcedure
      .mutation(async ({ ctx }) => {
        await setWardrobeShareToken(ctx.user.id, "");
        return { success: true };
      }),
  }),

  // ---- Admin Dashboard ----
  admin: router({
    /** Get all reviews across all users (paginated) */
    allReviews: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return getAllReviews(input.limit, input.offset);
      }),

    /** Get all users with profile info (paginated) */
    allUsers: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const result = await getAllUsers(input.limit, input.offset);
        const reviewCounts = await getReviewCountsByUser();
        const feedPostCounts = await getFeedPostCountsByUser();
        return {
          ...result,
          users: result.users.map(u => ({
            ...u,
            reviewCount: reviewCounts.get(u.id) ?? 0,
            feedPostCount: feedPostCounts.get(u.id) ?? 0,
          })),
        };
      }),

    /** Get dashboard stats */
    stats: adminProcedure
      .query(async () => {
        return getAdminStats();
      }),

    /** Delete any review (admin only) */
    deleteReview: adminProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ input }) => {
        await adminDeleteReview(input.reviewId);
        return { success: true };
      }),

    /** Update a user's phone number (admin only) */
    updateUserPhone: adminProcedure
      .input(z.object({
        userId: z.number(),
        phoneNumber: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        await upsertUserProfile({ userId: input.userId, phoneNumber: input.phoneNumber });
        return { success: true };
      }),

    /** Update user fields (admin only) — name, role from users table; phone, gender from userProfiles */
    updateUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().optional(),
        role: z.enum(["user", "admin"]).optional(),
        phoneNumber: z.string().nullable().optional(),
        gender: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await adminUpdateUser(input);
        return { success: true };
      }),

    /** Get guest analytics summary */
    guestAnalytics: adminProcedure
      .query(async () => {
        return getGuestAnalytics();
      }),

    /** Get all guest sessions */
    guestSessions: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return getAllGuestSessions(input.limit, input.offset);
      }),

    /** Get all demo views */
    demoViews: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return getAllDemoViews(input.limit, input.offset);
      }),

    /** Generate a short-lived token for admin to test guest mode without limits */
    generateGuestTestToken: adminProcedure
      .mutation(async ({ ctx }) => {
        const jose = await import("jose");
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        const token = await new jose.SignJWT({ adminId: ctx.user.id, purpose: "guest_test" })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("1h")
          .sign(secret);
        return { token };
      }),

    /** Send WhatsApp Welcome message to a user (admin only) */
    sendWhatsAppWelcome: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const profile = await getUserProfile(input.userId);
        if (!profile?.phoneNumber) {
          throw new Error("User has no phone number");
        }
        const user = await getUserById(input.userId);
        const userName = user?.name || "";
        const result = await sendWhatsAppWelcome(profile.phoneNumber, userName, true, profile.gender);
        if (!result.sent) {
          throw new Error(result.error || "Failed to send WhatsApp message");
        }
        return { success: true };
      }),

    /** Reset admin's own onboarding so they can re-test the flow */
    resetOnboarding: adminProcedure
      .mutation(async ({ ctx }) => {
        await upsertUserProfile({
          userId: ctx.user.id,
          onboardingCompleted: 0,
        });
        return { success: true };
      }),
  }),

  // ---- Guest Mode (no auth required) ----
  guest: router({
    /** Check guest analysis limit — returns count, limit, email status, onboarding status */
    checkLimit: publicProcedure
      .input(z.object({ fingerprint: z.string().min(8).max(128), adminToken: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        // Admin bypass — admins can use guest mode unlimited times
        if (ctx.user?.role === "admin") return { used: false, count: 0, limit: 999, hasEmail: false, onboardingCompleted: true };
        // Admin token bypass (from admin panel "Test as Guest" link)
        if (input.adminToken) {
          try {
            const jose = await import("jose");
            const secret = new TextEncoder().encode(ENV.cookieSecret);
            const { payload } = await jose.jwtVerify(input.adminToken, secret);
            if (payload.purpose === "guest_test") return { used: false, count: 0, limit: 999, hasEmail: false, onboardingCompleted: true };
          } catch { /* invalid token, continue normal flow */ }
        }
        const { count: cnt, hasEmail, onboardingCompleted } = await getGuestAnalysisCount(input.fingerprint);
        const limit = hasEmail ? 999 : 5;
        const used = cnt >= limit;
        return { used, count: cnt, limit, hasEmail, onboardingCompleted };
      }),

    /** Upload image for guest analysis */
    upload: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        fingerprint: z.string().min(8).max(128),
        adminToken: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if already used — admin bypass
        let isAdmin = ctx.user?.role === "admin";
        // Admin token bypass
        if (!isAdmin && input.adminToken) {
          try {
            const jose = await import("jose");
            const secret = new TextEncoder().encode(ENV.cookieSecret);
            const { payload } = await jose.jwtVerify(input.adminToken, secret);
            if (payload.purpose === "guest_test") isAdmin = true;
          } catch { /* invalid token */ }
        }
        if (!isAdmin) {
          const { count: cnt, hasEmail } = await getGuestAnalysisCount(input.fingerprint);
          const limit = hasEmail ? 999 : 5;
          if (cnt >= limit) {
            throw new Error(hasEmail ? "שגיאה לא צפויה. נסה שוב." : "הגעת למגבלת 5 ניתוחים. הכנס מייל לניתוחים ללא הגבלה!");
          }
        }

        const fileExt = input.mimeType.split("/")[1] || "jpg";
        const fileKey = `guest/${nanoid()}.${fileExt}`;
        const buffer = Buffer.from(input.imageBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Get IP from request
        const ipAddress = ctx.req?.headers?.["x-forwarded-for"]?.toString()?.split(",")[0]?.trim()
          || ctx.req?.socket?.remoteAddress || null;

        const sessionId = await createGuestSession({
          fingerprint: input.fingerprint,
          ipAddress,
          imageUrl: url,
          imageKey: fileKey,
          status: "pending",
          userAgent: ctx.req?.headers?.["user-agent"] || null,
        });

        return { sessionId, imageUrl: url };
      }),

    /** Run analysis for guest session */
    analyze: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        lang: z.enum(["he", "en"]).optional().default("he"),
        occasion: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const session = await getGuestSessionById(input.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.status === "completed") throw new Error("Analysis already completed");
        if (session.status === "analyzing") throw new Error("Analysis in progress");
        // Allow retrying failed sessions by resetting status
        if (session.status === "failed") {
          await updateGuestSessionStatus(input.sessionId, "pending");
        }

        try {
          return await withAnalysisSlot(`guest:${input.sessionId}`, async () => {

          await updateGuestSessionStatus(input.sessionId, "analyzing");
          // Get guest profile if onboarding was completed
          const guestProfile = session.fingerprint ? await getGuestProfile(session.fingerprint) : null;
          // Get guest wardrobe items
          const sessionIds = session.fingerprint ? await getGuestSessionIdsByFingerprint(session.fingerprint) : [];
          const wardrobeItemsList = sessionIds.length > 0
            ? await getGuestWardrobe(sessionIds, MAX_WARDROBE_ITEMS_FOR_ANALYSIS)
            : [];
          const wardrobeForPrompt = wardrobeItemsList.length > 0 ? wardrobeItemsList.map(w => ({
            itemType: w.itemType,
            name: w.name || "",
            color: w.color || "",
            brand: w.brand || "",
            styleNote: (w as any).styleNote || null,
          })) : undefined;

          // Build profile object for prompt (convert null to undefined for ProfileContext type)
          const profileForPrompt = guestProfile ? {
            ageRange: guestProfile.ageRange || undefined,
            gender: guestProfile.gender || undefined,
            occupation: guestProfile.occupation || undefined,
            budgetLevel: guestProfile.budgetLevel || undefined,
            stylePreference: guestProfile.stylePreference || undefined,
            preferredStores: guestProfile.preferredStores || undefined,
            country: guestProfile.country || undefined,
          } : null;


          const prompt = buildFashionPrompt(
            guestProfile?.favoriteInfluencers || undefined,
            guestProfile?.stylePreference || undefined,
            input.occasion || undefined,
            profileForPrompt,
            wardrobeForPrompt,
            input.lang,
          );

          // Stage 1: core analysis + identification (image-based)
          const stage1Start = Date.now();
          const MAX_RETRIES = 2;
          let analysisCore: FashionAnalysisCorePayload | null = null;
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              if (attempt > 0) {
                const delay = 800 * Math.pow(2, attempt - 1);
                console.log(`[Guest Analysis] Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              const llmResult = await invokeLLM({
                messages: [
                  { role: "system", content: prompt },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: input.lang === "en" ? "Analyze the outfit in this image and provide a comprehensive fashion review in English. Reference current 2025-2026 trends. Pay special attention to accessories. Identify brands ONLY when clearly visible. IMPORTANT: All shopping link URLs MUST be SEARCH URLs. NEVER use direct product page URLs." : "נתח את הלוק בתמונה הזו ותן חוות דעת אופנתית מקיפה בעברית. התבסס על טרנדים עדכניים של 2025-2026. שים לב במיוחד לאקססוריז. זהה מותגים רק כשאתה בטוח. חשוב: כל לינקי הקניות חייבים להיות כתובות חיפוש." },
                      { type: "image_url", image_url: { url: session.imageUrl!, detail: "low" } },
                    ],
                  },
                ],
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "fashion_analysis_core",
                    strict: true,
                    schema: analysisCoreJsonSchema,
                  },
                },
                maxTokens: 3200,
              });
              analysisCore = parseFashionAnalysisCorePayload(llmResult);
              break;
            } catch (retryErr: any) {
              const msg = retryErr?.message || "";
              const statusCode = retryErr?.status || retryErr?.statusCode || 0;
              const isRetryable =
                msg.includes("exhausted") || msg.includes("412") ||
                msg.includes("quota") || msg.includes("rate limit") || msg.includes("rate_limit") ||
                msg.includes("429") || msg.includes("503") || msg.includes("500") ||
                msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") ||
                msg.includes("ECONNREFUSED") || msg.includes("fetch failed") ||
                msg.includes("INVALID_LLM_JSON") ||
                statusCode === 429 || statusCode === 503 || statusCode === 500 || statusCode === 502;
              if (!isRetryable || attempt === MAX_RETRIES - 1) {
                throw retryErr;
              }
              console.warn(`[Guest Analysis] Attempt ${attempt + 1} failed (retryable): ${msg}`);
            }
          }
           if (!analysisCore) throw new Error("Analysis failed after retries");
           console.log(`[Timing] Stage 1 completed in ${Date.now() - stage1Start}ms`);

           // Stage 2: inspiration + recommendations (text-only from stage-1 output)
           const stage2Start = Date.now();

          // Stage 33: Build guest Taste Profile + Wardrobe for Stage 2
          let guestTasteText: string | null = null;
          let guestWardrobeText: string | null = null;
          try {
            if (session.fingerprint) {
              const guestSessionIds = await getGuestSessionIdsByFingerprint(session.fingerprint);
              // Build taste from previous guest analyses
              if (guestSessionIds.length > 1) {
                // Get all guest sessions to build taste profile
                const allGuestSessions = guestSessionIds.length > 0 ? await Promise.all(
                  guestSessionIds.slice(0, 20).map(id => getGuestSessionById(id))
                ) : [];
                const completedGuest = allGuestSessions.filter(s => s && s.status === "completed" && (s as any).analysisJson);
                if (completedGuest.length > 0) {
                  const tasteCtx = buildTasteProfileContext(
                    completedGuest.map(s => ({ analysisJson: (s as any).analysisJson, overallScore: (s as any).overallScore, createdAt: s!.createdAt })),
                    wardrobeItemsList.map(w => ({ itemType: w.itemType, name: w.name || "", color: w.color || "", brand: w.brand || "", styleNote: (w as any).styleNote || null })),
                    { stylePreference: guestProfile?.stylePreference, gender: guestProfile?.gender, budgetLevel: guestProfile?.budgetLevel },
                  );
                  if (tasteCtx) guestTasteText = formatTasteProfileForPrompt(tasteCtx, input.lang);
                }
              }
              // Wardrobe for guest
              if (wardrobeItemsList.length > 0) {
                guestWardrobeText = formatWardrobeForStage2(
                  wardrobeItemsList.slice(0, 20).map(w => ({ itemType: w.itemType, name: w.name || "", color: w.color || "", brand: w.brand || "", styleNote: (w as any).styleNote || null })),
                  input.lang,
                );
              }
            }
          } catch (tpErr) {
            console.warn("[Stage 33] Failed to build guest taste profile for Stage 2:", tpErr);
          }

          const recommendationSeed = {
            overallScore: analysisCore.overallScore,
            summary: analysisCore.summary,
            items: (analysisCore.items || []).slice(0, 12),
            scores: analysisCore.scores || [],
            linkedMentions: (analysisCore.linkedMentions || []).slice(0, 20),
            // Stage 30 GAP 1: Pass enriched metadata to Stage 2
            personDetection: (analysisCore as any).personDetection || null,
            lookStructure: (analysisCore as any).lookStructure || null,
            occasion: input.occasion || null,
            stylePreference: guestProfile?.stylePreference || null,
            favoriteInfluencers: guestProfile?.favoriteInfluencers || null,
          };
          let recommendations: FashionRecommendationsPayload | null = null;
          try {
            const MAX_RECOMMENDATION_RETRIES = 2;
            for (let attempt = 0; attempt < MAX_RECOMMENDATION_RETRIES; attempt++) {
              try {
                if (attempt > 0) {
                  const delay = 600 * Math.pow(2, attempt - 1);
                  await new Promise((resolve) => setTimeout(resolve, delay));
                }
                const recResult = await invokeLLM({
                  messages: [
                    {
                      role: "system",
                      content: buildRecommendationsPromptFromCore(
                        input.lang,
                        input.occasion,
                        profileForPrompt?.gender || null,
                        guestProfile?.favoriteInfluencers || null,
                        guestProfile?.preferredStores || null,
                        guestProfile?.budgetLevel || null,
                        guestProfile?.country || null,
                        guestTasteText,
                        guestWardrobeText,
                      ),
                    },
                    {
                      role: "user",
                      content: input.lang === "he"
                        ? `להלן פלט שלב 1 (ניתוח+זיהוי). התבסס על הפריטים המזוהים ב-items וודא שההמלצות מתייחסות ספציפית לצבעים, לחומרים, לגזרה ולסגנון של כל פריט. החזר רק השראה+המלצות בפורמט המבוקש:\n${JSON.stringify(recommendationSeed)}`
                        : `Here is the stage-1 analysis+identification output. Base your recommendations on the SPECIFIC items identified — their colors, materials, fit, and style. Each recommendation must directly address a specific item. Return only inspiration+recommendations in the required schema:\n${JSON.stringify(recommendationSeed)}`,
                    },
                  ],
                  response_format: {
                    type: "json_schema",
                    json_schema: {
                      name: "fashion_recommendations",
                      strict: true,
                      schema: recommendationsJsonSchema,
                    },
                  },
                  maxTokens: 2000,
                });
                recommendations = parseFashionRecommendationsPayload(recResult);
                break;
              } catch (retryErr: any) {
                const msg = retryErr?.message || "";
                const statusCode = retryErr?.status || retryErr?.statusCode || 0;
                const isRetryable =
                  msg.includes("exhausted") || msg.includes("412") ||
                  msg.includes("quota") || msg.includes("rate limit") || msg.includes("rate_limit") ||
                  msg.includes("429") || msg.includes("503") || msg.includes("500") ||
                  msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") ||
                  msg.includes("ECONNREFUSED") || msg.includes("fetch failed") ||
                  msg.includes("INVALID_LLM_JSON") ||
                  statusCode === 429 || statusCode === 503 || statusCode === 500 || statusCode === 502;
                if (!isRetryable || attempt === MAX_RECOMMENDATION_RETRIES - 1) {
                  throw retryErr;
                }
              }
            }
           } catch (recErr: any) {
             console.warn(`[Guest Analysis] Stage-2 recommendations fallback: ${recErr?.message || recErr}`);
           }
           console.log(`[Timing] Stage 2 completed in ${Date.now() - stage2Start}ms`);
           if (!recommendations) {
            recommendations = buildFallbackRecommendationsFromCore(
              analysisCore,
              input.lang,
              input.occasion,
              profileForPrompt?.gender || null,
              guestProfile?.favoriteInfluencers || null,
              guestProfile?.preferredStores || null,
            );
          }
          recommendations = sanitizeRecommendationsPayload(
            recommendations,
            analysisCore,
            input.lang,
            input.occasion,
            profileForPrompt?.gender || null,
            guestProfile?.favoriteInfluencers || null,
            guestProfile?.preferredStores || null,
            guestProfile?.budgetLevel || null,
          );
          let analysis: FashionAnalysis = {
            ...analysisCore,
            ...recommendations,
          };

          // Enrich with brand URLs — same 4-step enrichment as main analysis
          if (!analysis.linkedMentions) analysis.linkedMentions = [];
          // STEP 1: Match existing brands to BRAND_URLS
          for (const item of analysis.items) {
            const brandName = (item.brand || "").trim();
            if (brandName && brandName !== "N/A") {
              const exactUrl = (BRAND_URLS as Record<string, string>)[brandName];
              if (exactUrl) {
                item.brandUrl = exactUrl;
              } else {
                for (const [brand, url] of Object.entries(BRAND_URLS)) {
                  if (brand.toLowerCase() === brandName.toLowerCase()) {
                    item.brand = brand;
                    item.brandUrl = url;
                    break;
                  }
                }
              }
              if (item.brand && !analysis.linkedMentions.find(m => m.text === item.brand)) {
                analysis.linkedMentions.push({ text: item.brand, type: "brand", url: item.brandUrl || "" });
              }
            }
          }
          // STEP 2: Scan item names/analysis for brand mentions
          for (const item of analysis.items) {
            for (const [brand, url] of Object.entries(BRAND_URLS)) {
              if (item.name?.includes(brand) || item.analysis?.includes(brand)) {
                if (!item.brand || item.brand.trim() === "" || item.brand === "N/A") {
                  item.brand = brand;
                  item.brandUrl = url;
                  if (!item.brandConfidence) item.brandConfidence = "MEDIUM";
                }
                if (!analysis.linkedMentions.find(m => m.text === brand)) {
                  analysis.linkedMentions.push({ text: brand, type: "brand", url });
                }
              }
            }
          }
          // STEP 3: Ensure brandConfidence is set
          for (const item of analysis.items) {
            if (!item.brandConfidence || item.brandConfidence.trim() === "") {
              item.brandConfidence = (item.brand && item.brand.trim() !== "" && item.brand !== "N/A") ? "LOW" : "NONE";
            }
          }
          // STEP 4: No empty brands
          for (const item of analysis.items) {
            if (!item.brand || item.brand.trim() === "" || item.brand === "N/A") {
              item.brand = "לא זוהה";
              item.brandConfidence = "NONE";
            }
          }

          // Clamp scores
          for (const item of analysis.items) {
            if (item.score < 5) item.score = 5;
          }
          for (const cat of analysis.scores) {
            if (cat.score !== null && cat.score < 5) cat.score = 5;
          }
          // Premium/Luxury guests: Brand identification score must be at least 8
          const isGuestPremiumForScoring = profileForPrompt?.budgetLevel === 'premium' || profileForPrompt?.budgetLevel === 'luxury';
          if (isGuestPremiumForScoring) {
            for (const cat of analysis.scores) {
              const catLower = cat.category.toLowerCase();
              if ((catLower.includes('מותג') || catLower.includes('brand')) && cat.score !== null && cat.score < 8) {
                cat.score = 8;
                if (cat.explanation && (cat.explanation.includes('לוגו') || cat.explanation.includes('logo') || cat.explanation.includes('זיהוי') || cat.explanation.includes('identif'))) {
                  cat.explanation = cat.explanation.replace(/\d\/10/g, '8/10');
                }
              }
            }
          }
          // Recalculate overall score with WEIGHTED categories (same as registered users)
          const guestCategoryWeights: Record<string, number> = {
            'איכות הפריטים': 1.0, 'item quality': 1.0,
            'התאמת גזרה': 1.0, 'fit': 1.0,
            'צבעוניות': 1.0, 'color palette': 1.0,
            'התאמה לגיל ולסגנון': 1.0, 'age & style match': 1.0,
            'נעליים': 0.8, 'footwear': 0.8,
            'זיהוי מותגים': 0.8, 'brand recognition': 0.8,
            'שכבתיות (layering)': 0.5, 'שכבתיות': 0.5, 'layering': 0.5,
            'אקססוריז ותכשיטים': 0.5, 'accessories & jewelry': 0.5,
          };
          let guestWeightedSum = 0;
          let guestTotalWeight = 0;
          for (const cat of analysis.scores) {
            if (cat.score !== null) {
              const catLower = cat.category.toLowerCase();
              const weight = guestCategoryWeights[catLower] ?? 1.0;
              guestWeightedSum += cat.score * weight;
              guestTotalWeight += weight;
            }
          }
          if (guestTotalWeight > 0) {
            analysis.overallScore = Math.round((guestWeightedSum / guestTotalWeight) * 10) / 10;
          }
          if (analysis.overallScore < 5) analysis.overallScore = 5;

          // POST-PROCESSING QUALITY VALIDATION (guest)
          const isGuestPremium = profileForPrompt?.budgetLevel === 'premium' || profileForPrompt?.budgetLevel === 'luxury';
          const cheapMaterialTermsGuest = [
            { pattern: /דמוי עור/g, replacement: isGuestPremium ? "עור יוקרתי" : "עור סינתטי איכותי" },
            { pattern: /עור סינתטי(?! איכותי)/g, replacement: isGuestPremium ? "עור יוקרתי" : "עור סינתטי איכותי" },
            { pattern: /דמוי זמש/g, replacement: isGuestPremium ? "זמש איכותי" : "זמש סינתטי איכותי" },
            { pattern: /זמש סינתטי(?! איכותי)/g, replacement: isGuestPremium ? "זמש איכותי" : "זמש סינתטי איכותי" },
            { pattern: /דמוי משי/g, replacement: isGuestPremium ? "סאטן יוקרתי" : "סאטן" },
            { pattern: /פלסטיק/g, replacement: isGuestPremium ? "אקריליק" : "שרף" },
            { pattern: /faux leather/gi, replacement: isGuestPremium ? "premium leather" : "quality synthetic leather" },
            { pattern: /synthetic leather/gi, replacement: isGuestPremium ? "premium leather" : "quality synthetic leather" },
            { pattern: /faux suede/gi, replacement: isGuestPremium ? "premium suede" : "quality synthetic suede" },
            { pattern: /synthetic suede/gi, replacement: isGuestPremium ? "premium suede" : "quality synthetic suede" },
            { pattern: /faux silk/gi, replacement: isGuestPremium ? "premium satin" : "satin" },
            { pattern: /\bplastic\b/gi, replacement: isGuestPremium ? "acrylic" : "resin" },
          ];
          for (const item of analysis.items) {
            for (const term of cheapMaterialTermsGuest) {
              if (item.description) item.description = item.description.replace(term.pattern, term.replacement);
              if (item.analysis) item.analysis = item.analysis.replace(term.pattern, term.replacement);
              if (item.name) item.name = item.name.replace(term.pattern, term.replacement);
            }
          }
          for (const term of cheapMaterialTermsGuest) {
            if (analysis.summary) analysis.summary = analysis.summary.replace(term.pattern, term.replacement);
          }
          // Ensure scores have explanation field (backward compat)
          for (const cat of analysis.scores) {
            if (!cat.explanation) cat.explanation = "";
          }

          // Fix shopping URLs with gender from profile
          const guestGender: GenderCategory = (profileForPrompt?.gender as GenderCategory) || "male";
          analysis = fixShoppingLinkUrls(analysis, guestGender, guestProfile?.preferredStores || null);
          analysis = normalizeOutfitSuggestionsForWearableCore(analysis, guestGender);
          analysis = normalizeImprovementsForWearableCore(analysis, guestGender);

          // --- Closet matching: enrich improvements with matching wardrobe items ---
          const wardrobeItemsForMatching = Array.isArray(wardrobeItemsList)
            ? wardrobeItemsList.slice(0, MAX_WARDROBE_ITEMS_FOR_MATCHING)
            : [];
          if (wardrobeItemsForMatching.length > 0 && analysis.improvements) {
            try {
              for (const imp of analysis.improvements) {
              const impLower = `${imp.title} ${imp.description} ${imp.afterLabel} ${imp.productSearchQuery}`.toLowerCase();
              const impDescriptionLower = typeof imp.description === "string" ? imp.description.toLowerCase() : "";
              let bestMatch: typeof wardrobeItemsList[0] | null = null;
              let bestScore = 0;

              const typeKeywords: Record<string, string[]> = {
                "shirt": ["חולצ", "טי שירט", "shirt", "top", "tee", "polo", "blouse", "t-shirt", "tshirt", "👕"],
                "pants": ["מכנס", "ג'ינס", "צ'ינו", "pants", "jeans", "trousers", "shorts", "chino", "👖"],
                "shoes": ["נעל", "shoes", "sneaker", "boot", "סניקרס", "נעלי", "👟"],
                "jacket": ["ז'קט", "מעיל", "jacket", "coat", "bomber", "hoodie", "קפוצ'ון", "סווטשירט", "sweatshirt", "🧥"],
                "watch": ["שעון", "watch", "⌚"],
                "accessory": ["אקססורי", "תכשיט", "שרשר", "שרשת", "צמיד", "טבעת", "עגיל", "accessory", "jewelry", "necklace", "bracelet", "ring", "chain", "earring", "pendant", "💍", "📿"],
                "bag": ["תיק", "bag", "backpack", "👜"],
                "hat": ["כובע", "hat", "cap", "beanie", "🧢"],
                "sunglasses": ["משקפ", "sunglasses", "glasses", "🕶️"],
                "vest": ["ווסט", "vest", "gilet", "וסט"],
                "belt": ["חגורה", "belt"],
                "scarf": ["צעיף", "scarf", "bandana"],
              };

               // Stage 30 GAP 2: Use structured afterGarmentType as PRIMARY source
              let impCategory = "";
              const afterGType = (imp.afterGarmentType || "").toLowerCase();
              if (afterGType) {
                const garmentToCategoryMap: Record<string, string> = {
                  "t-shirt": "shirt", "tee": "shirt", "polo": "shirt", "dress shirt": "shirt",
                  "button-down": "shirt", "blouse": "shirt", "top": "shirt", "sweater": "shirt",
                  "hoodie": "jacket", "sweatshirt": "jacket", "henley": "shirt", "tank": "shirt",
                  "jeans": "pants", "chinos": "pants", "trousers": "pants", "shorts": "pants",
                  "skirt": "pants", "leggings": "pants",
                  "sneakers": "shoes", "loafers": "shoes", "boots": "shoes", "sandals": "shoes",
                  "oxfords": "shoes", "derby": "shoes", "heels": "shoes",
                  "jacket": "jacket", "blazer": "jacket", "coat": "jacket", "cardigan": "jacket",
                  "bomber": "jacket", "parka": "jacket", "vest": "vest",
                  "watch": "watch", "belt": "belt", "bag": "bag", "backpack": "bag",
                  "hat": "hat", "cap": "hat", "sunglasses": "sunglasses", "scarf": "scarf",
                  "necklace": "accessory", "bracelet": "accessory", "ring": "accessory", "earring": "accessory",
                };
                impCategory = garmentToCategoryMap[afterGType] || "";
                if (!impCategory) {
                  for (const [gType, cat] of Object.entries(garmentToCategoryMap)) {
                    if (afterGType.includes(gType) || gType.includes(afterGType)) {
                      impCategory = cat;
                      break;
                    }
                  }
                }
              }
              // Fallback to text-based detection (legacy)
              if (!impCategory) {
                for (const [cat, keywords] of Object.entries(typeKeywords)) {
                  if (keywords.some(kw => impLower.includes(kw))) {
                    impCategory = cat;
                    break;
                  }
                }
              }
              // STRICT: If we can't identify the improvement's category, skip closet matching entirely
              if (!impCategory) continue;
              for (const wItem of wardrobeItemsForMatching) {
                let matchScore = 0;;
                const wName = (wItem.name || "").toLowerCase();
                const wType = (wItem.itemType || "").toLowerCase();
                const wBrand = (wItem.brand || "").toLowerCase();
                const wColor = (wItem.color || "").toLowerCase();
                const wStyleNote = ((wItem as any).styleNote || "").toLowerCase();
                const wAllText = `${wName} ${wType} ${wBrand} ${wStyleNote}`;

                let wCategory = "";
                for (const [cat, keywords] of Object.entries(typeKeywords)) {
                  if (keywords.some(kw => wType.includes(kw) || wName.includes(kw))) {
                    wCategory = cat;
                    break;
                  }
                }

                // STRICT: Both categories must be identified and must match
                if (!wCategory || wCategory !== impCategory) {
                  continue;
                }

                // --- STYLE CONTRADICTION CHECK ---
                // Even within the same category, reject items whose style contradicts the recommendation.
                const styleConflicts: [string[], string[]][] = [
                  [["קלאסי", "אנלוגי", "classic", "analog", "elegant", "אלגנטי", "dress watch", "formal"], ["חכם", "smart", "digital", "דיגיטלי", "smartwatch", "fitness", "apple watch", "galaxy watch", "garmin"]],
                  [["אלגנט", "elegant", "formal", "פורמלי", "dress shoe", "oxford", "derby", "loafer", "monk"], ["ספורט", "sporty", "sneaker", "סניקרס", "running", "athletic", "ריצה"]],
                  [["מכופתר", "פורמלי", "dress shirt", "formal", "button-down", "חולצה מכופתרת"], ["טי שירט", "t-shirt", "tee", "casual", "קז'ואל", "graphic tee"]],
                  [["בלייזר", "blazer", "suit jacket", "חליפה", "formal", "tailored"], ["bomber", "בומבר", "hoodie", "קפוצ'ון", "windbreaker", "puffer"]],
                  [["תיק עסקי", "briefcase", "formal", "פורמלי", "messenger"], ["תיק גב", "backpack", "casual", "ספורטיבי", "gym bag"]],
                ];

                   let hasStyleConflict = false;

                // Stage 30 GAP 3: Use structured afterStyle for smart style contradiction
                const impStyle = (imp.afterStyle || "").toLowerCase();
                if (impStyle && wStyleNote) {
                  const formalStyles = ["formal", "elegant", "classic", "tailored", "smart-casual", "business"];
                  const casualStyles = ["casual", "sporty", "streetwear", "athletic", "relaxed"];
                  const impIsFormal = formalStyles.some(s => impStyle.includes(s));
                  const impIsCasual = casualStyles.some(s => impStyle.includes(s));
                  const wIsFormal = formalStyles.some(s => wStyleNote.includes(s));
                  const wIsCasual = casualStyles.some(s => wStyleNote.includes(s));
                  if ((impIsFormal && wIsCasual && !wIsFormal) || (impIsCasual && wIsFormal && !wIsCasual)) {
                    hasStyleConflict = true;
                  }
                }

                // Also check hardcoded pairs (legacy + specific edge cases)
                if (!hasStyleConflict) {
                  for (const [groupA, groupB] of styleConflicts) {
                    const impMatchesA = groupA.some(kw => impLower.includes(kw));
                    const impMatchesB = groupB.some(kw => impLower.includes(kw));
                    const wMatchesA = groupA.some(kw => wAllText.includes(kw));
                    const wMatchesB = groupB.some(kw => wAllText.includes(kw));
                    if ((impMatchesA && wMatchesB && !wMatchesA) || (impMatchesB && wMatchesA && !wMatchesB)) {
                      hasStyleConflict = true;
                      break;
                    }
                  }
                }
                if (hasStyleConflict) {
                  continue; // Skip — wardrobe item contradicts the recommendation's spirit
                }
                // Same category — base score
                matchScore += 5;

                if (wName && impDescriptionLower.includes(wName)) matchScore += 10;
                if (wBrand && wBrand.length > 2 && impLower.includes(wBrand)) matchScore += 3;
                if (wColor && wColor.length > 1 && impLower.includes(wColor)) matchScore += 2;

                // Style alignment bonus
                if (wStyleNote) {
                  const impKeywords = impLower.split(/\s+/).filter(w => w.length > 3);
                  const styleMatches = impKeywords.filter(kw => wStyleNote.includes(kw)).length;
                  matchScore += Math.min(styleMatches * 1, 4);
                }

                if (matchScore > bestScore) {
                  bestScore = matchScore;
                  bestMatch = wItem;
                }
              }

              // Only match if we have category match (score >= 5)
              if (bestMatch && bestScore >= 5) {
                imp.closetMatch = {
                  wardrobeItemId: bestMatch.id,
                  name: bestMatch.name,
                  itemType: bestMatch.itemType,
                  brand: bestMatch.brand || undefined,
                  color: bestMatch.color || undefined,
                  sourceImageUrl: bestMatch.sourceImageUrl || undefined,
                  itemImageUrl: bestMatch.itemImageUrl || undefined,
                };
              }
            }
            } catch (closetErr: any) {
              console.warn(`[ClosetMatch] Guest closet matching skipped: ${closetErr?.message || closetErr}`);
            }
          }


          // Save analysis to DB immediately (without waiting for product images)
          await updateGuestSessionAnalysis(input.sessionId, analysis.overallScore, analysis);

          // Auto-save detected items to guest wardrobe
          try {
            if (analysis.items && analysis.items.length > 0) {
              const wardrobeEntries = analysis.items.map((item) => ({
                guestSessionId: input.sessionId,
                itemType: item.garmentType || item.icon || "clothing",
                name: item.name,
                color: item.preciseColor || item.color || null,
                brand: item.brand || null,
                material: item.material || null,
                // Store rich style description for smarter closet matching later
                styleNote: [
                  item.subCategory,
                  item.fit && item.fit !== "n/a" ? `fit: ${item.fit}` : null,
                  item.pattern && item.pattern !== "solid" ? `pattern: ${item.pattern}` : null,
                  item.texture ? `texture: ${item.texture}` : null,
                  item.neckline && item.neckline !== "n/a" ? `neckline: ${item.neckline}` : null,
                  item.closure && item.closure !== "n/a" ? `closure: ${item.closure}` : null,
                  item.sleeveLength && item.sleeveLength !== "n/a" ? `sleeve: ${item.sleeveLength}` : null,
                  item.garmentLength && item.garmentLength !== "n/a" ? `length: ${item.garmentLength}` : null,
                  item.secondaryColor ? `secondary color: ${item.secondaryColor}` : null,
                  item.details && item.details !== "none" ? `details: ${item.details}` : null,
                ].filter(Boolean).join(", ") || item.description || null,
                score: item.score,
                sourceImageUrl: session.imageUrl || null,
                sourceReviewId: input.sessionId,
              }));
              await addGuestWardrobeItems(wardrobeEntries as any);
              console.log(`[Guest Analysis] Auto-saved ${wardrobeEntries.length} items to wardrobe for session ${input.sessionId}`);
            }
          } catch (wardrobeErr: any) {
            console.warn(`[Guest Analysis] Failed to auto-save wardrobe items:`, wardrobeErr?.message);
          }

          // Product images are now lazy-loaded per improvement category when the user scrolls to them.
          // No background generation needed here — the frontend triggers it via guest.generateProductImages.

          // Fire-and-forget: notify admin about new guest analysis
          notifyGuestAnalysisCompleted(
            input.sessionId,
            session.fingerprint,
            analysis.overallScore,
            session.userAgent || null,
            session.ipAddress || null,
            session.imageUrl || null,
            analysis.summary || null,
          ).catch(() => {}); // swallow any unhandled rejection

          return { success: true, analysis };
          });
        } catch (error: any) {
          console.error("[Guest Analysis] Failed:", error?.message);
          console.error("[Guest Analysis] Error status:", error?.status || error?.statusCode);
          await updateGuestSessionStatus(input.sessionId, "failed");
          const msg = error?.message || "";
          if (msg.includes("ANALYSIS_QUEUE_BUSY")) {
            throw new Error("שירות הניתוח עמוס כרגע. נסו שוב בעוד כחצי דקה.");
          }
          if (msg.includes("ANALYSIS_QUEUE_TIMEOUT")) {
            throw new Error("שירות הניתוח עמוס כרגע. נסו שוב בעוד כחצי דקה.");
          }
          if (msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
            throw new Error(`הניתוח לקח יותר מדי זמן. שגיאה: ${msg.substring(0, 200)}`);
          }
          throw new Error(`הניתוח נכשל. שגיאה: ${msg.substring(0, 200)}`);
        }
      }),

    /** Get guest analysis result */
    getResult: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        const session = await getGuestSessionById(input.sessionId);
        if (!session) return null;
        // Re-apply store diversity normalization on read
        let analysisJson = session.analysisJson;
        if (analysisJson && (analysisJson as FashionAnalysis).improvements) {
          const analysis = analysisJson as FashionAnalysis;
          const lang: "he" | "en" = /[\u0590-\u05FF]/.test(analysis.summary || "") ? "he" : "en";
          const guestProfile = session.fingerprint ? await getGuestProfile(session.fingerprint) : null;
          const guestGenderCat: GenderCategory = guestProfile?.gender === "female" ? "female" : guestProfile?.gender === "unisex" ? "unisex" : "male";
          analysis.improvements = analysis.improvements.map((imp) => normalizeImprovementShoppingLinks(imp, lang, guestProfile?.preferredStores || null, guestGenderCat, guestProfile?.budgetLevel || null));
          analysisJson = analysis;
        }
        return {
          id: session.id,
          status: session.status,
          imageUrl: session.imageUrl,
          overallScore: session.overallScore,
          analysisJson,
          createdAt: session.createdAt,
        };
      }),

     /** Lazy load: generate product images for a specific improvement category (guest) */
    generateProductImages: publicProcedure
      .input(z.object({ sessionId: z.number(), improvementIndex: z.number() }))
      .mutation(async ({ input }) => {
        const session = await getGuestSessionById(input.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.status !== "completed") throw new Error("Session not completed");
        const analysis = session.analysisJson as FashionAnalysis;
        if (!analysis?.improvements?.[input.improvementIndex]) {
          throw new Error("Invalid improvement index");
        }
        // Re-apply store diversity normalization before generating images
        const lang: "he" | "en" = /[\u0590-\u05FF]/.test(analysis.summary || "") ? "he" : "en";
        // Get guest profile for preferred stores
        const guestProfile = session.fingerprint ? await getGuestProfile(session.fingerprint) : null;
        const guestGender = guestProfile?.gender || (session as any).gender || "male";
        const guestGenderCat: GenderCategory = guestGender === "female" ? "female" : guestGender === "unisex" ? "unisex" : "male";
        const imp = normalizeImprovementShoppingLinks(analysis.improvements[input.improvementIndex], lang, guestProfile?.preferredStores || null, guestGenderCat, guestProfile?.budgetLevel || null);
        const impIdx = input.improvementIndex;;

        const updatedLinks = await generateImagesForImprovement(imp, async (linkIdx, imageUrl) => {
          try {
            const currentSession = await getGuestSessionById(input.sessionId);
            if (currentSession?.analysisJson) {
              const currentAnalysis = currentSession.analysisJson as FashionAnalysis;
              if (currentAnalysis.improvements?.[impIdx]?.shoppingLinks?.[linkIdx]) {
                currentAnalysis.improvements[impIdx].shoppingLinks[linkIdx].imageUrl = imageUrl;
                await updateGuestSessionAnalysis(input.sessionId, currentAnalysis.overallScore, currentAnalysis);
              }
            }
           } catch (dbErr: any) {
            console.warn(`[Guest Lazy ProductImages] DB update failed:`, dbErr?.message);
          }
        }, guestGender);
        return { links: updatedLinks };
      }),

    /** Batch: generate product images for ALL improvements in one call (guest) */
    generateAllProductImages: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await getGuestSessionById(input.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.status !== "completed") throw new Error("Session not completed");
        const analysis = session.analysisJson as FashionAnalysis;
        if (!analysis?.improvements?.length) return { results: [] };

        const guestGender = (session as any).gender || "male";

        const results = await Promise.all(
          analysis.improvements.map(async (imp, impIdx) => {
            const hasEmptyImages = imp.shoppingLinks?.some(l => !l.imageUrl || l.imageUrl.length < 5);
            if (!hasEmptyImages) return { index: impIdx, links: imp.shoppingLinks };
            try {
              const updatedLinks = await generateImagesForImprovement(imp, async (linkIdx, imageUrl) => {
                try {
                  const currentSession = await getGuestSessionById(input.sessionId);
                  if (currentSession?.analysisJson) {
                    const currentAnalysis = currentSession.analysisJson as FashionAnalysis;
                    if (currentAnalysis.improvements?.[impIdx]?.shoppingLinks?.[linkIdx]) {
                      currentAnalysis.improvements[impIdx].shoppingLinks[linkIdx].imageUrl = imageUrl;
                      await updateGuestSessionAnalysis(input.sessionId, currentAnalysis.overallScore, currentAnalysis);
                    }
                  }
                } catch (dbErr: any) {
                  console.warn(`[Guest Batch ProductImages] DB update failed:`, dbErr?.message);
                }
              }, guestGender);
              return { index: impIdx, links: updatedLinks };
            } catch (err: any) {
              console.warn(`[Guest Batch ProductImages] Failed for improvement ${impIdx}:`, err?.message);
              return { index: impIdx, links: imp.shoppingLinks };
            }
          })
        );
        return { results };
      }),

    /** Generate outfit look image for guest session */
    generateOutfitLook: publicProcedure
      .input(z.object({ sessionId: z.number(), outfitIndex: z.number() }))
      .mutation(async ({ input }) => {
        const session = await getGuestSessionById(input.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.status !== "completed") throw new Error("Analysis not completed");
        const analysis = session.analysisJson as FashionAnalysis;
        if (!analysis) throw new Error("No analysis available");
        const outfit = analysis.outfitSuggestions?.[input.outfitIndex];
        if (!outfit) throw new Error("Outfit suggestion not found");

        // Get guest gender from session record
        const guestGender = (session as any).gender || "male";
        const genderLabel = guestGender === "female" ? "women's" : "men's";

        // PRIMARY: Generate a full outfit look image via AI (complete head-to-toe look)
        // Use rich item descriptions from analysis items when available
        const guestRichItems = (analysis.items || []).map(item => buildRichItemDescription(item));
        const lookDesc = outfit.lookDescription || (guestRichItems.length > 0 ? guestRichItems.join(', ') : outfit.items.join(", "));
        const colors = outfit.colors?.join(", ") || "neutral tones";
        const guestSilhouetteCtx = analysis.lookStructure?.silhouetteSummary ? `\nSilhouette: ${analysis.lookStructure.silhouetteSummary}.` : '';
        const prompt = `Professional ${genderLabel} fashion flat lay / mood board photograph. Clean white marble background, luxury editorial style photography.
Outfit card variation index: ${input.outfitIndex + 1}. Keep this variation visually distinct from other outfit cards.
Complete ${genderLabel} outfit: ${lookDesc}.
Color palette: ${colors}.${guestSilhouetteCtx}
Style: High-end ${genderLabel} fashion editorial flat lay, all items arranged aesthetically like a magazine spread. Include every piece: clothing, shoes, accessories, watch/jewelry. No mannequin, no model — just the items laid out beautifully with crisp lighting, soft shadows, and a luxury feel. Each item clearly visible and identifiable.`;
        try {
          const { url } = await generateImage({ prompt });
          if (url && url.trim().length > 0) {
            return { imageUrl: url };
          }
        } catch (err: any) {
          console.error("[Guest Outfit Look] AI image generation failed, falling back to metadata mosaic:", err);
        }

        // FALLBACK 1: Build a mosaic from product images (metadata-based)
        const metadataLook = await generateOutfitLookFromMetadata({
          analysis,
          outfit,
          outfitIndex: input.outfitIndex,
          gender: guestGender,
        });
        if (metadataLook?.imageUrl) {
          return { imageUrl: metadataLook.imageUrl };
        }

        // FALLBACK 2: Metadata mosaic with AI-generated product images
        const resilientMetadataLook = await generateOutfitLookFromMetadata({
          analysis,
          outfit,
          outfitIndex: input.outfitIndex,
          allowAIFallbackForLinks: true,
          gender: guestGender,
        });
        if (resilientMetadataLook?.imageUrl) {
          return { imageUrl: resilientMetadataLook.imageUrl };
        }
        if (session.imageUrl) {
          return { imageUrl: session.imageUrl };
        }
        throw new Error("יצירת הדמיית הלוק נכשלה. נסה שוב.");
      }),

    /** Save guest onboarding profile */
    saveProfile: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        ageRange: z.string().optional(),
        gender: z.string().optional(),
        occupation: z.string().optional(),
        budgetLevel: z.string().optional(),
        stylePreference: z.string().optional(),
        favoriteBrands: z.string().optional(),
        favoriteInfluencers: z.string().optional(),
        preferredStores: z.string().optional(),
        country: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { fingerprint, ...profile } = input;
        await saveGuestProfile(fingerprint, profile);
        return { success: true };
      }),

    /** Get guest profile by fingerprint */
    getProfile: publicProcedure
      .input(z.object({ fingerprint: z.string().min(8).max(128) }))
      .query(async ({ input }) => {
        const profile = await getGuestProfile(input.fingerprint);
        return profile;
      }),

    /** Save guest email for unlimited analyses */
    saveEmail: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        await saveGuestEmail(input.fingerprint, input.email);
        return { success: true };
      }),

    /** Get guest wardrobe items */
    getWardrobe: publicProcedure
      .input(z.object({ fingerprint: z.string().min(8).max(128) }))
      .query(async ({ input }) => {
        const sessionIds = await getGuestSessionIdsByFingerprint(input.fingerprint);
        if (sessionIds.length === 0) return [];
        return await getGuestWardrobe(sessionIds);
      }),

    /** Add items to guest wardrobe */
    addWardrobeItems: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        items: z.array(z.object({
          itemType: z.string(),
          name: z.string().optional(),
          color: z.string().optional(),
          brand: z.string().optional(),
          itemImageUrl: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Get the latest session ID for this fingerprint to attach wardrobe items
        const sessionIds = await getGuestSessionIdsByFingerprint(input.fingerprint);
        if (sessionIds.length === 0) throw new Error("No guest session found");
        const latestSessionId = Math.max(...sessionIds);
        const items = input.items.map(item => ({
          ...item,
          guestSessionId: latestSessionId,
          name: item.name || null,
          color: item.color || null,
          brand: item.brand || null,
          itemImageUrl: item.itemImageUrl || null,
        }));
        return await addGuestWardrobeItems(items as any);
      }),

    /** Delete a guest wardrobe item */
    deleteWardrobeItem: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        itemId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const sessionIds = await getGuestSessionIdsByFingerprint(input.fingerprint);
        if (sessionIds.length === 0) throw new Error("No guest session found");
        // Try deleting from any of the guest's sessions
        for (const sid of sessionIds) {
          try {
            await deleteGuestWardrobeItem(input.itemId, sid);
            return { success: true };
          } catch { /* try next session */ }
        }
        return { success: true };
      }),

    /** Delete a guest analysis/session by ID and fingerprint */
    deleteAnalysis: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        sessionId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await deleteGuestSession(input.sessionId, input.fingerprint);
        return { success: true };
      }),

    /** Fix My Look for guests — generates improved outfit image */
    fixMyLook: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        itemIndices: z.array(z.number()),
        selectedImprovementIndices: z.array(z.number()).optional(),
        selectedProductDetails: z.array(z.object({
          improvementIndex: z.number(),
          productLabel: z.string(),
          productImageUrl: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const session = await getGuestSessionById(input.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.status !== "completed") throw new Error("Analysis not completed");
        const analysis = session.analysisJson as FashionAnalysis;
        if (!analysis) throw new Error("No analysis available");

        const itemsToFix = input.itemIndices
          .filter(i => i >= 0 && i < (analysis.items || []).length)
          .map(i => analysis.items[i]);
        if (itemsToFix.length === 0) throw new Error("No items selected");

        // Detect original image dimensions
        let imageOrientation = "portrait";
        let imageAspectRatio = "3:4";
        let imageDimensions = { width: 0, height: 0 };
        try {
          const probeResult = await probeImageSize(session.imageUrl!);
          imageDimensions = { width: probeResult.width, height: probeResult.height };
          if (probeResult.width > probeResult.height) {
            imageOrientation = "landscape";
            imageAspectRatio = `${probeResult.width}:${probeResult.height}`;
          } else if (probeResult.width === probeResult.height) {
            imageOrientation = "square";
            imageAspectRatio = "1:1";
          } else {
            imageOrientation = "portrait";
            imageAspectRatio = `${probeResult.width}:${probeResult.height}`;
          }
        } catch (probeErr) {
          console.warn("[Guest Fix My Look] Could not detect image dimensions:", probeErr);
        }

        const allImprovements = analysis.improvements || [];
        const relevantImprovements: typeof allImprovements = [];
        if (input.selectedImprovementIndices && input.selectedImprovementIndices.length > 0) {
          for (const impIdx of input.selectedImprovementIndices) {
            if (impIdx >= 0 && impIdx < allImprovements.length) {
              relevantImprovements.push(allImprovements[impIdx]);
            }
          }
        }
        if (relevantImprovements.length === 0 && allImprovements.length > 0) {
          relevantImprovements.push(...allImprovements.slice(0, Math.min(allImprovements.length, input.itemIndices.length + 1)));
        }

        const editPrompt = buildDeterministicFixMyLookPrompt({
          analysis,
          itemsToFix,
          relevantImprovements,
          allImprovements,
          selectedProductDetails: input.selectedProductDetails,
          imageOrientation,
          imageDimensions,
        });

        try {
          const targetSize =
            imageDimensions.width > 0 && imageDimensions.height > 0
              ? { width: imageDimensions.width, height: imageDimensions.height }
              : undefined;

          // Build originalImages array: [0] = user photo, [1..N] = selected product images
          const originalImagesArr: Array<{ url: string; mimeType: string }> = [
            { url: session.imageUrl!, mimeType: "image/jpeg" },
          ];
          if (input.selectedProductDetails && input.selectedProductDetails.length > 0) {
            for (const detail of input.selectedProductDetails) {
              if (detail.productImageUrl && detail.productImageUrl.startsWith('http')) {
                originalImagesArr.push({
                  url: detail.productImageUrl,
                  mimeType: "image/jpeg",
                });
              }
            }
            console.log(`[Guest Fix My Look] Sending ${originalImagesArr.length} images: 1 user photo + ${originalImagesArr.length - 1} product references`);
          }

          let { url: fixedImageUrl } = await generateImage({
            prompt: editPrompt,
            originalImages: originalImagesArr,
          });

          const shoppingLinks = relevantImprovements.flatMap(imp => imp.shoppingLinks || []).slice(0, 6);
          const avgFixedItemScore = itemsToFix.reduce((sum, item) => sum + item.score, 0) / itemsToFix.length;
          const scoreBoost = Math.min((10 - avgFixedItemScore) * 0.6, 2.5);
          const estimatedNewScore = Math.min(Math.round((analysis.overallScore + scoreBoost) * 10) / 10, 9.8);

          return {
            originalImageUrl: session.imageUrl || "",
            fixedImageUrl: fixedImageUrl || "",
            originalScore: analysis.overallScore,
            estimatedScore: estimatedNewScore,
            itemsFixed: itemsToFix.map(item => ({ name: item.name, icon: item.icon, scoreBefore: item.score, verdict: item.verdict })),
            shoppingLinks,
          };
        } catch (err: any) {
          console.error("[Guest Fix My Look] Image generation failed:", err);
          throw new Error("יצירת תמונת השיפור נכשלה. נסה שוב.");
        }
      }),

    /** Generate AI visualization of a composed look from guest wardrobe items */
    visualizeLook: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        itemIds: z.array(z.number()).min(1).max(10),
        lang: z.enum(["he", "en"]).default("he"),
      }))
      .mutation(async ({ input }) => {
        // 1. Get all guest session IDs for this fingerprint
        const sessionIds = await getGuestSessionIdsByFingerprint(input.fingerprint);
        if (sessionIds.length === 0) throw new Error("No guest session found");

        // 2. Get the guest wardrobe items
        const allItems = await getGuestWardrobe(sessionIds);
        const selectedItems = allItems.filter(item => input.itemIds.includes(item.id));
        if (selectedItems.length === 0) throw new Error("No items found");

        // 3. Find the most recent source image to use as body/face reference
        const sourceImageUrl = selectedItems.find(i => i.sourceImageUrl)?.sourceImageUrl || null;

        // 4. Get guest profile for gender context
        const guestProfile = await getGuestProfile(input.fingerprint);
        const gender = guestProfile?.gender || "person";
        const genderLabel = gender === "male" ? "man" : gender === "female" ? "woman" : "person";

        // 5. Build a detailed description of each item using rich metadata
        const itemDescriptions = selectedItems.map(item => buildRichWardrobeItemDescription({
          name: item.name || item.itemType || 'item',
          color: item.color,
          brand: item.brand,
          material: item.material,
          styleNote: item.styleNote,
          itemType: item.itemType,
        })).join(", ");

        // 6. Build the prompt — if we have a source image, instruct to preserve the person's identity
        const prompt = sourceImageUrl
          ? `Edit this exact photo in-place. This is the user's actual photo — preserve their EXACT face, skin tone, body type, hair, and all physical features with 100% fidelity. Keep the SAME person, SAME pose, SAME background, SAME camera angle, SAME lighting. Show this SAME person wearing exactly this outfit: ${itemDescriptions}. Only change the clothing items — everything else about the person and environment must remain identical. The outfit should look natural and realistic on this specific person.`
          : `Full-body fashion photo of a stylish ${genderLabel} wearing exactly this outfit: ${itemDescriptions}. Standing in a clean, modern setting with soft natural lighting. The outfit should be the main focus. Professional fashion photography style, editorial quality. Show the complete outfit from head to toe. Clean background.`;

        // 7. Generate the image, using source photo as reference if available
        try {
          const generateOptions: any = { prompt };
          if (sourceImageUrl) {
            generateOptions.originalImages = [{
              url: sourceImageUrl,
              mimeType: "image/jpeg",
            }];
          }
          const { url } = await generateImage(generateOptions);
          return {
            imageUrl: url || "",
            items: selectedItems.map(i => ({ name: i.name, color: i.color, brand: i.brand, itemType: i.itemType })),
          };
        } catch (err: any) {
          console.error("[Guest Visualize Look] Image generation failed:", err);
          throw new Error(input.lang === "en" ? "Failed to generate look visualization. Please try again." : "יצירת הדמיית הלוק נכשלה. נסה שוב.");
        }
      }),

    /** Get all guest analysis history */
    getHistory: publicProcedure
      .input(z.object({ fingerprint: z.string().min(8).max(128) }))
      .query(async ({ input }) => {
        const sessionIds = await getGuestSessionIdsByFingerprint(input.fingerprint);
        if (sessionIds.length === 0) return [];
        const sessions = [];
        for (const id of sessionIds) {
          const session = await getGuestSessionById(id);
          if (session && session.status === "completed") {
            sessions.push({
              id: session.id,
              imageUrl: session.imageUrl,
              overallScore: session.overallScore,
              createdAt: session.createdAt,
            });
          }
        }
        return sessions.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      }),

    /** Get guest session by WhatsApp deep-link token (for /r/:token route) */
    getByToken: publicProcedure
      .input(z.object({ token: z.string().min(8).max(64) }))
      .query(async ({ input }) => {
        const session = await getGuestSessionByToken(input.token);
        if (!session) return null;
        // Mark deep-link as viewed for WhatsApp follow-up suppression.
        markGuestSessionViewed(session.id).catch(() => {});
        // Re-apply store diversity normalization on read
        let analysisJson = session.analysisJson;
        if (analysisJson && (analysisJson as FashionAnalysis).improvements) {
          const analysis = analysisJson as FashionAnalysis;
          const lang: "he" | "en" = /[\u0590-\u05FF]/.test(analysis.summary || "") ? "he" : "en";
          const guestProfile = session.fingerprint ? await getGuestProfile(session.fingerprint) : null;
          const guestGenderCat: GenderCategory = guestProfile?.gender === "female" ? "female" : guestProfile?.gender === "unisex" ? "unisex" : "male";
          analysis.improvements = analysis.improvements.map((imp) => normalizeImprovementShoppingLinks(imp, lang, guestProfile?.preferredStores || null, guestGenderCat, guestProfile?.budgetLevel || null));
          analysisJson = analysis;
        }
        return {
          id: session.id,
          status: session.status,
          imageUrl: session.imageUrl,
          overallScore: session.overallScore,
          analysisJson,
          createdAt: session.createdAt,
          source: session.source,
          whatsappProfileName: session.whatsappProfileName,
        };
      }),
  }),

  // ---- Demo Tracking ----
  demo: router({
    /** Track that someone viewed the demo */
    trackView: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        section: z.string().max(64).default("full"),
      }))
      .mutation(async ({ ctx, input }) => {
        const ipAddress = ctx.req?.headers?.["x-forwarded-for"]?.toString()?.split(",")[0]?.trim()
          || ctx.req?.socket?.remoteAddress || null;
        const id = await trackDemoView({
          fingerprint: input.fingerprint,
          ipAddress,
          section: input.section,
          userAgent: ctx.req?.headers?.["user-agent"] || null,
        });
        return { id };
      }),

    /** Track that someone clicked signup from demo */
    trackSignupClick: publicProcedure
      .input(z.object({ demoViewId: z.number() }))
      .mutation(async ({ input }) => {
        await markDemoSignupClick(input.demoViewId);
        return { success: true };
      }),
  }),

  // ---- Page View / Funnel Tracking ----
  tracking: router({
    /** Track a page view (lightweight, public) */
    trackPageView: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(1).max(128),
        page: z.string().min(1).max(256),
        referrer: z.string().max(2048).optional(),
        screenWidth: z.number().int().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ipAddress = ctx.req?.headers?.["x-forwarded-for"]?.toString()?.split(",")[0]?.trim()
          || ctx.req?.socket?.remoteAddress || null;
        const userAgent = ctx.req?.headers?.["user-agent"] || null;
        const id = await trackPageView({
          fingerprint: input.fingerprint,
          page: input.page,
          referrer: input.referrer || null,
          userAgent,
          ipAddress,
          screenWidth: input.screenWidth || null,
        });
        return { id };
      }),

    /** Get funnel stats (admin only) */
    getFunnelStats: adminProcedure
      .query(async () => {
        return await getFunnelStats();
      }),

    /** Get daily funnel breakdown (admin only) */
    getDailyFunnel: adminProcedure
      .input(z.object({ days: z.number().int().min(1).max(90).default(14) }).optional())
      .query(async ({ input }) => {
        return await getDailyFunnelStats(input?.days || 14);
      }),
  }),

  // ===== Taste Profile =====
  tasteProfile: router({
    /**
     * Get the user's evolving taste profile — computed in real-time from:
     * - All completed reviews (analysisJson)
     * - Wardrobe items
     * - User profile preferences
     */
    get: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Fetch all data sources in parallel
      const [reviewsData, wardrobeData, profile] = await Promise.all([
        getReviewsByUserId(userId),
        getWardrobeByUserId(userId),
        getUserProfile(userId),
      ]);

      // Filter to completed reviews with analysis
      const completedReviews = reviewsData.filter(
        (r) => r.status === "completed" && r.analysisJson
      );

      if (completedReviews.length === 0) {
        return {
          hasData: false,
          analysisCount: 0,
          overallTasteScore: 0,
          scoreHistory: [] as { date: string; score: number }[],
          styleMap: {} as Record<string, number>,
          colorPalette: [] as { color: string; count: number; percentage: number }[],
          brandAffinities: [] as { brand: string; count: number; avgScore: number }[],
          categoryScores: {} as Record<string, { avg: number; count: number; trend: string }>,
          wardrobeStats: {
            totalItems: 0,
            categories: {} as Record<string, number>,
            topBrands: [] as { brand: string; count: number }[],
            topColors: [] as { color: string; count: number }[],
          },
          styleEvolution: [] as { date: string; styles: Record<string, number> }[],
          strengths: [] as string[],
          improvements: [] as string[],
          materialPreferences: [] as { name: string; count: number; percentage: number }[],
          texturePreferences: [] as { name: string; count: number; percentage: number }[],
          fitPreferences: [] as { name: string; count: number; percentage: number }[],
          patternPreferences: [] as { name: string; count: number; percentage: number }[],
          lookStructureInsights: {
            dominantSilhouette: null as string | null,
            dominantProportions: null as string | null,
            dominantColorHarmony: null as string | null,
            layeringFrequency: null as number | null,
            silhouetteBreakdown: [] as { name: string; count: number; percentage: number }[],
          },
          doctrineInsights: {
            archetype: null as string | null,
            proportionTip: null as string | null,
            colorTip: null as string | null,
            dominantMaterial: null as string | null,
            dominantFit: null as string | null,
            dominantPattern: null as string | null,
          },
          deepTasteProfile: null as null,
          profilePreferences: {
            gender: profile?.gender || null,
            ageRange: profile?.ageRange || null,
            budgetLevel: profile?.budgetLevel || null,
            stylePreference: profile?.stylePreference || null,
          },
        };
      }

      // ---- GAP C+D: Material, texture, fit preference tracking ----
      const materialCounts: Record<string, number> = {};
      const textureCounts: Record<string, number> = {};
      const fitCounts: Record<string, number> = {};
      const patternCounts: Record<string, number> = {};

      // ---- GAP G: LookStructure tracking ----
      const silhouetteCounts: Record<string, number> = {};
      const proportionCounts: Record<string, number> = {};
      const colorHarmonyCounts: Record<string, number> = {};
      let totalLayeringCount = 0;
      let layeringYes = 0;
      let layeringNo = 0;

      // ---- Aggregate scores over time ----
      const scoreHistory = completedReviews
        .map((r) => ({
          date: r.createdAt.toISOString().split("T")[0],
          score: (r.analysisJson as FashionAnalysis)?.overallScore ?? r.overallScore ?? 0,
        }))
        .reverse(); // oldest first

      const overallTasteScore = Math.round(
        scoreHistory.reduce((sum, s) => sum + s.score, 0) / scoreHistory.length
      );

      // ---- Extract colors from all analyses ----
      const colorCounts: Record<string, number> = {};
      const brandCounts: Record<string, { count: number; totalScore: number }> = {};
      const categorySums: Record<string, { total: number; count: number; scores: number[] }> = {};
      const styleSignals: Record<string, number> = {};
      const allStrengths: string[] = [];
      const allImprovements: string[] = [];

      for (const review of completedReviews) {
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis) continue;

        // Colors from items — prefer preciseColor, fall back to color
        if (analysis.items) {
          for (const item of analysis.items) {
            const colorVal = (item.preciseColor || item.color || '').trim().toLowerCase();
            if (colorVal) {
              colorCounts[colorVal] = (colorCounts[colorVal] || 0) + 1;
            }
            // Also track color families for aggregation
            if (item.colorFamily) {
              const cf = `family:${item.colorFamily.trim().toLowerCase()}`;
              colorCounts[cf] = (colorCounts[cf] || 0) + 1;
            }
            // Brands
            if (item.brand) {
              const b = item.brand.trim();
              if (!brandCounts[b]) brandCounts[b] = { count: 0, totalScore: 0 };
              brandCounts[b].count++;
              brandCounts[b].totalScore += item.score || 0;
            }
            // GAP A: Structured style detection from item.style field
            if (item.style) {
              const s = item.style.trim().toLowerCase();
              styleSignals[s] = (styleSignals[s] || 0) + 1;
            }
            // GAP C: Material/texture tracking
            if (item.material) {
              const m = item.material.trim().toLowerCase();
              if (m && m !== 'n/a') materialCounts[m] = (materialCounts[m] || 0) + 1;
            }
            if (item.texture) {
              const t = item.texture.trim().toLowerCase();
              if (t && t !== 'n/a') textureCounts[t] = (textureCounts[t] || 0) + 1;
            }
            // GAP D: Fit tracking
            if (item.fit) {
              const f = item.fit.trim().toLowerCase();
              if (f && f !== 'n/a') fitCounts[f] = (fitCounts[f] || 0) + 1;
            }
            // Pattern tracking
            if (item.pattern) {
              const p = item.pattern.trim().toLowerCase();
              if (p && p !== 'n/a') patternCounts[p] = (patternCounts[p] || 0) + 1;
            }
          }
        }

        // GAP G: Extract lookStructure data
        if (analysis.lookStructure) {
          const ls = analysis.lookStructure;
          if (ls.silhouetteSummary) {
            const s = ls.silhouetteSummary.trim().toLowerCase();
            silhouetteCounts[s] = (silhouetteCounts[s] || 0) + 1;
          }
          if (ls.proportions) {
            const p = ls.proportions.trim().toLowerCase();
            proportionCounts[p] = (proportionCounts[p] || 0) + 1;
          }
          if (ls.colorHarmony) {
            const c = ls.colorHarmony.trim().toLowerCase();
            colorHarmonyCounts[c] = (colorHarmonyCounts[c] || 0) + 1;
          }
          totalLayeringCount++;
          if (ls.hasLayering) layeringYes++; else layeringNo++;
        }

        // Category scores
        if (analysis.scores) {
          for (const sc of analysis.scores) {
            if (sc.score !== null && sc.score !== undefined) {
              const cat = sc.category;
              if (!categorySums[cat]) categorySums[cat] = { total: 0, count: 0, scores: [] };
              categorySums[cat].total += sc.score;
              categorySums[cat].count++;
              categorySums[cat].scores.push(sc.score);
            }
          }
        }

        // Detect style signals — SECONDARY: keyword fallback from summary (for older analyses without item.style)
        const summaryLower = (analysis.summary || "").toLowerCase();
        const styleKeywords: Record<string, string[]> = {
          minimalist: ["מינימליסטי", "מינימלי", "נקי", "minimalist", "clean lines"],
          classic: ["קלאסי", "נצחי", "classic", "timeless", "elegant"],
          streetwear: ["סטריטוור", "אורבני", "streetwear", "urban", "sneakers"],
          "smart-casual": ["סמארט", "קז'ואל מטופח", "smart casual", "polished casual"],
          bohemian: ["בוהו", "בוהמי", "bohemian", "boho", "free-spirited"],
          sporty: ["ספורטיבי", "אתלטי", "sporty", "athletic"],
          "avant-garde": ["אוונגרד", "ניסיוני", "avant-garde", "experimental"],
          preppy: ["פרפי", "אקדמי", "preppy", "collegiate"],
        };

        for (const [style, keywords] of Object.entries(styleKeywords)) {
          for (const kw of keywords) {
            if (summaryLower.includes(kw)) {
              styleSignals[style] = (styleSignals[style] || 0) + 1;
              break;
            }
          }
        }

        // Strengths and improvements from analysis
        if (analysis.scores) {
          for (const sc of analysis.scores) {
            if (sc.score !== null && sc.score !== undefined) {
              if (sc.score >= 8) allStrengths.push(sc.category);
              if (sc.score <= 6) allImprovements.push(sc.category);
            }
          }
        }
      }

      // ---- Build color palette ----
      const totalColorMentions = Object.values(colorCounts).reduce((a, b) => a + b, 0);
      const colorPalette = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([color, count]) => ({
          color,
          count,
          percentage: Math.round((count / totalColorMentions) * 100),
        }));

      // ---- Build brand affinities ----
      const brandAffinities = Object.entries(brandCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([brand, data]) => ({
          brand,
          count: data.count,
          avgScore: Math.round((data.totalScore / data.count) * 10) / 10,
        }));

      // ---- Build category scores with trend ----
      const categoryScores: Record<string, { avg: number; count: number; trend: string }> = {};
      for (const [cat, data] of Object.entries(categorySums)) {
        const avg = Math.round((data.total / data.count) * 10) / 10;
        // Trend: compare first half vs second half
        let trend = "stable";
        if (data.scores.length >= 4) {
          const mid = Math.floor(data.scores.length / 2);
          const firstHalf = data.scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
          const secondHalf = data.scores.slice(mid).reduce((a, b) => a + b, 0) / (data.scores.length - mid);
          if (secondHalf - firstHalf >= 0.5) trend = "improving";
          else if (firstHalf - secondHalf >= 0.5) trend = "declining";
        }
        categoryScores[cat] = { avg, count: data.count, trend };
      }

      // ---- Build style map ----
      const totalStyleSignals = Object.values(styleSignals).reduce((a, b) => a + b, 0) || 1;
      const styleMap: Record<string, number> = {};
      for (const [style, count] of Object.entries(styleSignals)) {
        styleMap[style] = Math.round((count / totalStyleSignals) * 100);
      }
      // Add user's explicit preferences if not already detected
      if (profile?.stylePreference) {
        const prefs = profile.stylePreference.split(",").map((s) => s.trim());
        for (const pref of prefs) {
          if (pref && !styleMap[pref]) {
            styleMap[pref] = 5; // small baseline from explicit preference
          }
        }
      }

      // ---- Wardrobe stats ----
      const wardrobeCategories: Record<string, number> = {};
      const wardrobeBrands: Record<string, number> = {};
      const wardrobeColors: Record<string, number> = {};
      for (const item of wardrobeData) {
        const cat = item.itemType || "other";
        wardrobeCategories[cat] = (wardrobeCategories[cat] || 0) + 1;
        if (item.brand) {
          wardrobeBrands[item.brand] = (wardrobeBrands[item.brand] || 0) + 1;
        }
        if (item.color) {
          const c = item.color.trim().toLowerCase();
          wardrobeColors[c] = (wardrobeColors[c] || 0) + 1;
        }
      }

      const wardrobeStats = {
        totalItems: wardrobeData.length,
        categories: wardrobeCategories,
        topBrands: Object.entries(wardrobeBrands)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([brand, count]) => ({ brand, count })),
        topColors: Object.entries(wardrobeColors)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([color, count]) => ({ color, count })),
      };

      // ---- Style evolution (monthly) ----
      const monthlyStyles: Record<string, Record<string, number>> = {};
      for (const review of completedReviews) {
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis) continue;
        const month = review.createdAt.toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyStyles[month]) monthlyStyles[month] = {};
        const summaryLower = (analysis.summary || "").toLowerCase();
        const styleKeywords: Record<string, string[]> = {
          minimalist: ["מינימליסטי", "מינימלי", "minimalist"],
          classic: ["קלאסי", "classic", "timeless"],
          streetwear: ["סטריטוור", "streetwear", "urban"],
          "smart-casual": ["סמארט", "smart casual"],
          bohemian: ["בוהו", "bohemian", "boho"],
          sporty: ["ספורטיבי", "sporty", "athletic"],
        };
        for (const [style, keywords] of Object.entries(styleKeywords)) {
          for (const kw of keywords) {
            if (summaryLower.includes(kw)) {
              monthlyStyles[month][style] = (monthlyStyles[month][style] || 0) + 1;
              break;
            }
          }
        }
      }
      const styleEvolution = Object.entries(monthlyStyles)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, styles]) => ({ date, styles }));

      // ---- Top strengths and areas for improvement ----
      const strengthCounts: Record<string, number> = {};
      const improvementCounts: Record<string, number> = {};
      for (const s of allStrengths) strengthCounts[s] = (strengthCounts[s] || 0) + 1;
      for (const i of allImprovements) improvementCounts[i] = (improvementCounts[i] || 0) + 1;

      const strengths = Object.entries(strengthCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat);

      const improvements = Object.entries(improvementCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat);

      // ---- GAP C+D: Build material, texture, fit, pattern preferences ----
      const buildTopPreferences = (counts: Record<string, number>, limit = 8) => {
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        return Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }));
      };

      const materialPreferences = buildTopPreferences(materialCounts);
      const texturePreferences = buildTopPreferences(textureCounts);
      const fitPreferences = buildTopPreferences(fitCounts);
      const patternPreferences = buildTopPreferences(patternCounts);

      // GAP G: Build lookStructure insights
      const silhouettePrefs = buildTopPreferences(silhouetteCounts, 5);
      const proportionPrefs = buildTopPreferences(proportionCounts, 5);
      const colorHarmonyPrefs = buildTopPreferences(colorHarmonyCounts, 5);
      const lookStructureInsights = {
        dominantSilhouette: silhouettePrefs[0]?.name || null,
        dominantProportions: proportionPrefs[0]?.name || null,
        dominantColorHarmony: colorHarmonyPrefs[0]?.name || null,
        layeringFrequency: totalLayeringCount > 0 ? Math.round((layeringYes / totalLayeringCount) * 100) : null,
        silhouetteBreakdown: silhouettePrefs,
      };

      // ---- Stage 32+33: Deep Doctrine-based style insights ----
      const doctrineInsights = (() => {
        const topStyle = Object.entries(styleMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const topMaterial = materialPreferences[0]?.name || null;
        const topFit = fitPreferences[0]?.name || null;
        const topPattern = patternPreferences[0]?.name || null;
        const dominantProportion = lookStructureInsights.dominantProportions;
        const dominantHarmony = lookStructureInsights.dominantColorHarmony;

        // Detect archetype from dominant signals
        let archetype: string | null = null;
        if (topStyle === 'minimalist' || topStyle === 'classic') archetype = 'The Essentialist';
        else if (topStyle === 'streetwear' || topStyle === 'avant-garde') archetype = 'The Statement Maker';
        else if (topStyle === 'smart-casual') archetype = 'The Polished Casual';
        else if (topStyle === 'sporty') archetype = 'The Active Stylist';
        else if (topStyle === 'bohemian') archetype = 'The Free Spirit';
        else if (topStyle === 'elegant' || topStyle === 'formal') archetype = 'The Refined Classic';
        else if (topStyle === 'preppy') archetype = 'The Heritage Player';

        // Proportion balance insight
        let proportionTip: string | null = null;
        if (dominantProportion === 'top-heavy') proportionTip = 'Your looks tend to be top-heavy — try slimmer tops or wider-leg bottoms to balance.';
        else if (dominantProportion === 'bottom-heavy') proportionTip = 'Your looks lean bottom-heavy — structured shoulders or layered tops can create balance.';
        else if (dominantProportion === 'balanced') proportionTip = 'Your proportions are naturally balanced — you can experiment with asymmetric silhouettes.';

        // Color harmony insight
        let colorTip: string | null = null;
        if (dominantHarmony === 'monochromatic') colorTip = 'You gravitate toward monochromatic palettes — try introducing one accent color for depth.';
        else if (dominantHarmony === 'neutral') colorTip = 'Your palette is neutral-dominant — a rich texture or subtle pattern can add dimension.';
        else if (dominantHarmony === 'colorful') colorTip = 'You love color — anchor bold pieces with neutral basics to keep looks cohesive.';
        else if (dominantHarmony === 'analogous') colorTip = 'You favor analogous color schemes — great for cohesion, try adding a complementary accent.';
        else if (dominantHarmony === 'complementary') colorTip = 'You use complementary colors well — ensure one dominates (70%) and the other accents (30%).';

        return {
          archetype,
          proportionTip,
          colorTip,
          dominantMaterial: topMaterial,
          dominantFit: topFit,
          dominantPattern: topPattern,
        };
      })();

      // ---- Stage 33: Deep Taste Profile sections ----
      const deepTasteProfile = (() => {
        // Use the centralized buildTasteProfileContext for deep computation
        const tasteCtx = buildTasteProfileContext(
          completedReviews.map(r => ({ analysisJson: r.analysisJson, overallScore: r.overallScore, createdAt: r.createdAt })),
          wardrobeData.map(w => ({ itemType: w.itemType, name: w.name, color: w.color, brand: w.brand, styleNote: w.styleNote || null })),
          { stylePreference: profile?.stylePreference, gender: profile?.gender, budgetLevel: profile?.budgetLevel },
        );
        if (!tasteCtx) return null;

        return {
          // Color DNA
          colorDNA: {
            temperature: tasteCtx.colorTemperature,
            contrastLevel: tasteCtx.contrastLevel,
            topColors: tasteCtx.topColors,
            dominantHarmony: tasteCtx.dominantColorHarmony,
          },
          // Silhouette Profile
          silhouetteProfile: {
            dominantSilhouette: tasteCtx.dominantSilhouette,
            dominantProportions: tasteCtx.dominantProportions,
            layeringPct: tasteCtx.layeringPct,
          },
          // Material Hierarchy
          materialHierarchy: {
            topMaterials: tasteCtx.topMaterials,
            topFits: tasteCtx.topFits,
            topPatterns: tasteCtx.topPatterns,
          },
          // Personal Style Code
          styleCode: tasteCtx.styleCode,
          // Style Consistency
          styleConsistency: tasteCtx.styleConsistency,
          // Weakness Pattern Analysis
          weaknessPatterns: tasteCtx.weaknessPatterns,
          // Growth Trajectory
          scoreTrend: tasteCtx.scoreTrend,
          growthNote: tasteCtx.growthNote,
          avgScore: tasteCtx.avgScore,
        };
      })();

      return {
        hasData: true,
        analysisCount: completedReviews.length,
        overallTasteScore,
        scoreHistory,
        styleMap,
        colorPalette,
        brandAffinities,
        categoryScores,
        wardrobeStats,
        styleEvolution,
        strengths,
        improvements,
        materialPreferences,
        texturePreferences,
        fitPreferences,
        patternPreferences,
        lookStructureInsights,
        doctrineInsights,
        deepTasteProfile,
        profilePreferences: {
          gender: profile?.gender || null,
          ageRange: profile?.ageRange || null,
          budgetLevel: profile?.budgetLevel || null,
          stylePreference: profile?.stylePreference || null,
        },
      };
    }),

    /**
     * Get brand affinity matching — computes how well the user's taste profile
     * matches known brands based on style, colors, and detected brand preferences.
     */
    brandMatching: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;

      const [reviewsData, wardrobeData, profile] = await Promise.all([
        getReviewsByUserId(userId),
        getWardrobeByUserId(userId),
        getUserProfile(userId),
      ]);

      const completedReviews = reviewsData.filter(
        (r) => r.status === "completed" && r.analysisJson
      );

      if (completedReviews.length === 0) {
        return { hasData: false, matches: [] as { brand: string; matchPct: number; reasons: string[]; url: string }[] };
      }

      // Brand style DNA mapping — GAP C+D: added materials and fits
      const BRAND_DNA: Record<string, { styles: string[]; priceLevel: string; colors: string[]; vibe: string; materials?: string[]; fits?: string[] }> = {
        "Zara": { styles: ["smart-casual", "minimalist", "classic"], priceLevel: "mid-range", colors: ["שחור", "לבן", "בז'", "נייבי", "black", "white", "beige", "navy"], vibe: "trendy", materials: ["cotton", "synthetic", "linen"], fits: ["slim", "regular", "tailored"] },
        "H&M": { styles: ["smart-casual", "streetwear", "minimalist"], priceLevel: "budget", colors: ["שחור", "לבן", "אפור", "black", "white", "gray"], vibe: "accessible", materials: ["cotton", "synthetic"], fits: ["regular", "relaxed"] },
        "COS": { styles: ["minimalist", "classic"], priceLevel: "mid-range", colors: ["שחור", "לבן", "בז'", "אפור", "black", "white", "beige", "gray"], vibe: "architectural", materials: ["cotton", "wool", "linen"], fits: ["relaxed", "oversized", "boxy"] },
        "Massimo Dutti": { styles: ["classic", "smart-casual"], priceLevel: "mid-range", colors: ["נייבי", "חום", "בז'", "navy", "brown", "beige"], vibe: "refined", materials: ["cotton", "wool", "linen", "leather"], fits: ["tailored", "regular", "slim"] },
        "Uniqlo": { styles: ["minimalist", "smart-casual"], priceLevel: "budget", colors: ["שחור", "לבן", "נייבי", "black", "white", "navy"], vibe: "essentials", materials: ["cotton", "synthetic"], fits: ["regular", "slim"] },
        "Nike": { styles: ["sporty", "streetwear"], priceLevel: "mid-range", colors: ["שחור", "לבן", "אדום", "black", "white", "red"], vibe: "athletic", materials: ["synthetic", "knit", "rubber"], fits: ["regular", "slim"] },
        "Adidas": { styles: ["sporty", "streetwear"], priceLevel: "mid-range", colors: ["שחור", "לבן", "ירוק", "black", "white", "green"], vibe: "sporty", materials: ["synthetic", "knit", "rubber"], fits: ["regular", "relaxed"] },
        "Ralph Lauren": { styles: ["classic", "preppy"], priceLevel: "premium", colors: ["נייבי", "לבן", "אדום", "navy", "white", "red"], vibe: "heritage", materials: ["cotton", "wool", "leather"], fits: ["regular", "tailored"] },
        "Calvin Klein": { styles: ["minimalist", "classic"], priceLevel: "mid-range", colors: ["שחור", "לבן", "אפור", "black", "white", "gray"], vibe: "clean", materials: ["cotton", "denim", "leather"], fits: ["slim", "regular"] },
        "Tommy Hilfiger": { styles: ["preppy", "smart-casual"], priceLevel: "mid-range", colors: ["נייבי", "אדום", "לבן", "navy", "red", "white"], vibe: "american", materials: ["cotton", "denim"], fits: ["regular", "slim"] },
        "BOSS": { styles: ["classic", "smart-casual"], priceLevel: "premium", colors: ["שחור", "נייבי", "אפור", "black", "navy", "gray"], vibe: "power", materials: ["wool", "cotton", "leather"], fits: ["tailored", "slim"] },
        "Gucci": { styles: ["avant-garde", "classic"], priceLevel: "luxury", colors: ["ירוק", "אדום", "זהב", "green", "red", "gold"], vibe: "maximalist", materials: ["leather", "silk", "wool"], fits: ["regular", "tailored"] },
        "Prada": { styles: ["minimalist", "avant-garde"], priceLevel: "luxury", colors: ["שחור", "לבן", "כחול", "black", "white", "blue"], vibe: "intellectual", materials: ["leather", "synthetic", "wool"], fits: ["regular", "oversized"] },
        "Balenciaga": { styles: ["streetwear", "avant-garde"], priceLevel: "luxury", colors: ["שחור", "לבן", "אדום", "black", "white", "red"], vibe: "disruptive", materials: ["synthetic", "leather", "denim"], fits: ["oversized", "boxy"] },
        "Acne Studios": { styles: ["minimalist", "avant-garde"], priceLevel: "premium", colors: ["שחור", "ורוד", "אפור", "black", "pink", "gray"], vibe: "scandinavian", materials: ["denim", "leather", "wool"], fits: ["regular", "oversized"] },
        "Levi's": { styles: ["smart-casual", "streetwear"], priceLevel: "mid-range", colors: ["כחול", "שחור", "לבן", "blue", "black", "white"], vibe: "denim", materials: ["denim", "cotton"], fits: ["slim", "regular", "relaxed"] },
        "Castro": { styles: ["smart-casual", "classic"], priceLevel: "mid-range", colors: ["שחור", "נייבי", "בז'", "black", "navy", "beige"], vibe: "israeli-chic", materials: ["cotton", "synthetic"], fits: ["slim", "regular"] },
        "Fox": { styles: ["smart-casual", "sporty"], priceLevel: "budget", colors: ["שחור", "לבן", "כחול", "black", "white", "blue"], vibe: "casual" },
        "Renuar": { styles: ["classic", "smart-casual"], priceLevel: "mid-range", colors: ["שחור", "נייבי", "בורדו", "black", "navy", "burgundy"], vibe: "workwear" },
        "Terminal X": { styles: ["streetwear", "smart-casual", "avant-garde"], priceLevel: "mid-range", colors: ["שחור", "לבן", "אפור", "black", "white", "gray"], vibe: "multi-brand" },
        "Sandro": { styles: ["classic", "smart-casual"], priceLevel: "premium", colors: ["שחור", "נייבי", "לבן", "black", "navy", "white"], vibe: "parisian" },
        "Maje": { styles: ["classic", "bohemian"], priceLevel: "premium", colors: ["שחור", "ורוד", "בז'", "black", "pink", "beige"], vibe: "feminine" },
      };

      // Extract user style signals
      const userStyles: Record<string, number> = {};
      const userColors: Record<string, number> = {};
      const userBrands: Record<string, number> = {};
      const userMaterials: Record<string, number> = {};
      const userFits: Record<string, number> = {};
      let userBudget = profile?.budgetLevel || "mid-range";

      for (const review of completedReviews) {
        const analysis = review.analysisJson as FashionAnalysis;
        if (!analysis) continue;

        // PRIMARY: Extract styles from structured item.style field
        if (analysis.items) {
          for (const item of analysis.items) {
            if (item.style) {
              const s = item.style.trim().toLowerCase();
              userStyles[s] = (userStyles[s] || 0) + 1;
            }
            // Colors — prefer preciseColor, fall back to color
            const colorVal = (item.preciseColor || item.color || '').trim().toLowerCase();
            if (colorVal) { userColors[colorVal] = (userColors[colorVal] || 0) + 1; }
            if (item.brand) { userBrands[item.brand.trim()] = (userBrands[item.brand.trim()] || 0) + 1; }
            // GAP C+D: Material and fit tracking
            if (item.material) { const m = item.material.trim().toLowerCase(); if (m && m !== 'n/a') userMaterials[m] = (userMaterials[m] || 0) + 1; }
            if (item.fit) { const f = item.fit.trim().toLowerCase(); if (f && f !== 'n/a') userFits[f] = (userFits[f] || 0) + 1; }
          }
        }

        // SECONDARY: keyword fallback from summary (for older analyses without item.style)
        const summaryLower = (analysis.summary || "").toLowerCase();
        const styleKws: Record<string, string[]> = {
          minimalist: ["מינימליסטי", "מינימלי", "minimalist", "clean lines"],
          classic: ["קלאסי", "נצחי", "classic", "timeless"],
          streetwear: ["סטריטוור", "אורבני", "streetwear", "urban"],
          "smart-casual": ["סמארט", "קז'ואל מטופח", "smart casual"],
          bohemian: ["בוהו", "בוהמי", "bohemian", "boho"],
          sporty: ["ספורטיבי", "אתלטי", "sporty", "athletic"],
          "avant-garde": ["אוונגרד", "ניסיוני", "avant-garde"],
          preppy: ["פרפי", "אקדמי", "preppy"],
        };
        for (const [style, kws] of Object.entries(styleKws)) {
          for (const kw of kws) {
            if (summaryLower.includes(kw)) { userStyles[style] = (userStyles[style] || 0) + 1; break; }
          }
        }
      }

      // Also count wardrobe
      for (const item of wardrobeData) {
        if (item.color) { const c = item.color.trim().toLowerCase(); userColors[c] = (userColors[c] || 0) + 0.5; }
        if (item.brand) { userBrands[item.brand.trim()] = (userBrands[item.brand.trim()] || 0) + 0.5; }
      }

      const totalStyleSignals = Object.values(userStyles).reduce((a, b) => a + b, 0) || 1;
      const totalColorSignals = Object.values(userColors).reduce((a, b) => a + b, 0) || 1;
      const totalMaterialSignals = Object.values(userMaterials).reduce((a, b) => a + b, 0) || 1;
      const totalFitSignals = Object.values(userFits).reduce((a, b) => a + b, 0) || 1;

      // Budget level mapping
      const budgetLevels = ["budget", "mid-range", "premium", "luxury"];
      const userBudgetIdx = budgetLevels.indexOf(userBudget);

      // Compute match for each brand
      const matches: { brand: string; matchPct: number; reasons: string[]; url: string }[] = [];

      for (const [brand, dna] of Object.entries(BRAND_DNA)) {
        let score = 0;
        const reasons: string[] = [];

        // Style match (40% weight)
        let styleMatch = 0;
        for (const bStyle of dna.styles) {
          if (userStyles[bStyle]) {
            styleMatch += (userStyles[bStyle] / totalStyleSignals);
          }
        }
        styleMatch = Math.min(styleMatch, 1);
        score += styleMatch * 40;
        if (styleMatch > 0.3) reasons.push(dna.styles[0]);

        // Color match (25% weight)
        let colorMatch = 0;
        for (const bColor of dna.colors) {
          if (userColors[bColor]) {
            colorMatch += (userColors[bColor] / totalColorSignals);
          }
        }
        colorMatch = Math.min(colorMatch, 1);
        score += colorMatch * 25;
        if (colorMatch > 0.2) reasons.push("colors");

        // Direct brand detection (20% weight)
        if (userBrands[brand]) {
          score += 20;
          reasons.push("detected");
        }

        // Material match (bonus, up to 5% weight) — GAP C
        if (dna.materials) {
          let matMatch = 0;
          for (const bMat of dna.materials) {
            if (userMaterials[bMat]) matMatch += (userMaterials[bMat] / totalMaterialSignals);
          }
          matMatch = Math.min(matMatch, 1);
          score += matMatch * 5;
          if (matMatch > 0.3) reasons.push("materials");
        }

        // Fit match (bonus, up to 5% weight) — GAP D
        if (dna.fits) {
          let fitMatch = 0;
          for (const bFit of dna.fits) {
            if (userFits[bFit]) fitMatch += (userFits[bFit] / totalFitSignals);
          }
          fitMatch = Math.min(fitMatch, 1);
          score += fitMatch * 5;
          if (fitMatch > 0.3) reasons.push("fit");
        }

        // Budget alignment (10% weight — reduced from 15% to accommodate material+fit)
        const brandBudgetIdx = budgetLevels.indexOf(dna.priceLevel);
        const budgetDiff = Math.abs(userBudgetIdx - brandBudgetIdx);
        const budgetMatch = budgetDiff === 0 ? 1 : budgetDiff === 1 ? 0.6 : budgetDiff === 2 ? 0.2 : 0;
        score += budgetMatch * 10;
        if (budgetMatch >= 0.6) reasons.push("budget");

        const url = BRAND_URLS[brand] || "";

        matches.push({
          brand,
          matchPct: Math.round(Math.min(score, 100)),
          reasons,
          url,
        });
      }

      // Sort by match percentage
      matches.sort((a, b) => b.matchPct - a.matchPct);

      return { hasData: true, matches };
    }),

    /**
     * Widget personalization — provides deep personalization data for the brand widget.
     * Returns matching wardrobe items, recent look references, and personalized tips.
     */
    widgetPersonalization: protectedProcedure
      .input(z.object({
        productCategory: z.string(), // e.g. "jacket", "dress", "coat"
        productColors: z.array(z.string()), // hex colors of the product
        productName: z.string(),
        productPrice: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        const [reviewsData, wardrobeData, profile] = await Promise.all([
          getReviewsByUserId(userId),
          getWardrobeByUserId(userId),
          getUserProfile(userId),
        ]);

        const completedReviews = reviewsData.filter(
          (r) => r.status === "completed" && r.analysisJson
        );

        // ---- 1. Find matching wardrobe items ----
        // Items that would pair well with this product
        // Emoji-to-category mapping (wardrobe items use emoji itemTypes)
        const emojiToCategory: Record<string, string[]> = {
          "👕": ["shirt", "top", "blouse", "t-shirt"],
          "👖": ["pants", "jeans"],
          "👗": ["dress"],
          "🧥": ["jacket", "blazer", "coat"],
          "👟": ["shoes", "sneakers"],
          "👞": ["shoes", "formal-shoes"],
          "👠": ["shoes", "heels"],
          "👜": ["bag", "handbag"],
          "🎒": ["bag", "backpack"],
          "⌚": ["accessory", "watch"],
          "🕶️": ["accessory", "sunglasses"],
          "💍": ["accessory", "jewelry", "ring"],
          "📿": ["accessory", "jewelry", "necklace"],
          "🧣": ["accessory", "scarf"],
          "🧢": ["accessory", "hat", "cap"],
          "👒": ["accessory", "hat"],
          "🩳": ["shorts", "pants"],
          "👔": ["shirt", "formal-shirt"],
        };

        const categoryPairings: Record<string, string[]> = {
          jacket: ["shirt", "top", "blouse", "t-shirt", "pants", "jeans", "skirt", "shoes", "accessory"],
          blazer: ["shirt", "top", "blouse", "t-shirt", "pants", "jeans", "skirt", "shoes", "accessory"],
          dress: ["jacket", "blazer", "coat", "shoes", "bag", "accessory", "jewelry"],
          coat: ["shirt", "top", "pants", "jeans", "dress", "skirt", "shoes", "accessory"],
          shirt: ["pants", "jeans", "skirt", "jacket", "blazer", "shoes", "accessory"],
          top: ["pants", "jeans", "skirt", "jacket", "blazer", "shoes", "accessory"],
          blouse: ["pants", "jeans", "skirt", "jacket", "blazer", "shoes", "accessory"],
          pants: ["shirt", "top", "blouse", "jacket", "blazer", "shoes", "accessory"],
          jeans: ["shirt", "top", "blouse", "jacket", "blazer", "shoes", "accessory"],
          skirt: ["shirt", "top", "blouse", "jacket", "blazer", "shoes", "accessory"],
          shoes: ["pants", "jeans", "dress", "skirt", "accessory"],
          bag: ["dress", "jacket", "blazer", "coat", "shirt", "top"],
          accessory: ["dress", "shirt", "top", "blouse", "pants", "jeans"],
        };

        // Normalize product category
        const normalizedCategory = input.productCategory.toLowerCase()
          .replace(/ז'קטים|ג'קטים/g, "jacket")
          .replace(/שמלות/g, "dress")
          .replace(/מעילים/g, "coat")
          .replace(/חולצות/g, "shirt")
          .replace(/מכנסיים/g, "pants")
          .replace(/נעליים/g, "shoes")
          .replace(/תיקים/g, "bag")
          .replace(/אקססוריז/g, "accessory");

        const pairingTypes = categoryPairings[normalizedCategory] || ["shirt", "pants", "shoes", "accessory"];

        // Helper: resolve an item's categories — prefer garmentType, fall back to emoji/text
        const resolveItemCategories = (item: { itemType?: string | null; name?: string | null; styleNote?: string | null }): string[] => {
          // Check styleNote AND name for garmentType keywords (saved from Stage 29 enrichment)
          const combined = ((item.styleNote || '') + ' ' + (item.name || '') + ' ' + (item.itemType || '')).toLowerCase();
          // Map garmentType to category — search for longest match first to avoid partial matches
          const gtToCat: Record<string, string[]> = {
            'dress-shirt': ['shirt', 'formal-shirt'], 'dress shirt': ['shirt', 'formal-shirt'],
            't-shirt': ['shirt', 'top', 't-shirt'], 'tank-top': ['top'], 'tank top': ['top'],
            'crop-top': ['top'], 'crop top': ['top'],
            'shirt': ['shirt', 'top'], 'polo': ['shirt', 'top'], 'blouse': ['blouse', 'top'],
            'sweater': ['top', 'sweater'], 'hoodie': ['top', 'hoodie'],
            'sweatshirt': ['top', 'sweatshirt'], 'cardigan': ['top', 'cardigan'],
            'chinos': ['pants', 'chinos'], 'trousers': ['pants', 'trousers'],
            'jeans': ['jeans', 'pants'], 'joggers': ['pants', 'joggers'],
            'leggings': ['pants', 'leggings'], 'shorts': ['shorts', 'pants'],
            'pants': ['pants'],
            'skirt': ['skirt'], 'dress': ['dress'],
            'blazer': ['blazer', 'jacket'], 'bomber': ['jacket', 'bomber'],
            'parka': ['jacket', 'coat'], 'vest': ['jacket', 'vest'],
            'jacket': ['jacket'], 'coat': ['coat'],
            'sneakers': ['shoes', 'sneakers'], 'loafers': ['shoes', 'loafers'],
            'boots': ['shoes', 'boots'], 'heels': ['shoes', 'heels'],
            'sandals': ['shoes', 'sandals'], 'oxford': ['shoes', 'formal-shoes'],
            'shoes': ['shoes'],
            'bag': ['bag'], 'backpack': ['bag', 'backpack'], 'handbag': ['bag', 'handbag'],
            'watch': ['accessory', 'watch'], 'sunglasses': ['accessory', 'sunglasses'],
            'belt': ['accessory', 'belt'], 'necklace': ['accessory', 'jewelry'],
            'bracelet': ['accessory', 'jewelry'], 'ring': ['accessory', 'jewelry'],
            'earrings': ['accessory', 'jewelry'], 'hat': ['accessory', 'hat'],
            'cap': ['accessory', 'hat', 'cap'], 'scarf': ['accessory', 'scarf'],
          };
          // Search for garmentType keywords in combined text (longest match first)
          const sortedEntries = Object.entries(gtToCat).sort((a, b) => b[0].length - a[0].length);
          for (const [gt, cats] of sortedEntries) {
            if (combined.includes(gt)) return cats;
          }
          // Fall back to emoji-based detection
          const itemType = (item.itemType || '').trim();
          const emojiCats = emojiToCategory[itemType];
          if (emojiCats) return emojiCats;
          // Also check if the name/styleNote contains category hints
          const lower = (item.name || itemType || '').toLowerCase();
          const allCats: string[] = [];
          for (const cats of Object.values(emojiToCategory)) {
            for (const cat of cats) {
              if (lower.includes(cat)) allCats.push(cat);
            }
          }
          return allCats.length > 0 ? allCats : [lower];
        };

        // Color harmony check — simple complementary/analogous matching
        const matchingWardrobeItems = wardrobeData
          .filter((item) => {
            const itemCategories = resolveItemCategories(item);
            return pairingTypes.some(pt => itemCategories.some(ic => ic === pt || ic.includes(pt) || pt.includes(ic)));
          })
          .map((item) => ({
            id: item.id,
            name: item.name,
            itemType: item.itemType,
            color: item.color,
            brand: item.brand,
            score: item.score,
            itemImageUrl: item.itemImageUrl,
            sourceImageUrl: item.sourceImageUrl,
            styleNote: item.styleNote,
          }))
          .slice(0, 6); // Max 6 matching items

        // ---- 2. Recent looks that this product would improve ----
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 30); // Look at last 30 days

        const recentLooks = completedReviews
          .filter((r) => r.createdAt >= oneWeekAgo)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
          .map((r) => {
            const analysis = r.analysisJson as FashionAnalysis;
            // Find improvements that relate to this product category
            const relevantImprovements = (analysis?.improvements || []).filter((imp) => {
              const impLower = (imp.title + " " + imp.description).toLowerCase();
              return pairingTypes.some(pt => impLower.includes(pt)) ||
                impLower.includes(normalizedCategory);
            });

            // Calculate day name
            const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
            const dayNamesEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const dayIdx = r.createdAt.getDay();

            return {
              reviewId: r.id,
              date: r.createdAt.toISOString().split("T")[0],
              dayNameHe: dayNames[dayIdx],
              dayNameEn: dayNamesEn[dayIdx],
              overallScore: analysis?.overallScore ?? r.overallScore ?? 0,
              imageUrl: r.imageUrl,
              summary: analysis?.summary?.slice(0, 100) || "",
              relevantImprovements: relevantImprovements.slice(0, 2).map(imp => ({
                title: imp.title,
                description: imp.description,
              })),
              // Items from this look that would pair with the product
              existingItems: (analysis?.items || []).slice(0, 4).map(item => ({
                name: item.name,
                color: item.color,
                score: item.score,
              })),
            };
          })
          .filter((look) => look.overallScore > 0);

        // ---- 3. Personalized styling tips ----
        // Based on taste profile data
        const styleMap: Record<string, number> = {};
        const colorCounts: Record<string, number> = {};
        const allScores: number[] = [];

        for (const review of completedReviews) {
          const analysis = review.analysisJson as FashionAnalysis;
          if (!analysis) continue;
          allScores.push(analysis.overallScore || 0);

          // PRIMARY: Use structured item.style and preciseColor fields
          if (analysis.items) {
            for (const item of analysis.items) {
              const colorVal = (item.preciseColor || item.color || '').trim().toLowerCase();
              if (colorVal) {
                colorCounts[colorVal] = (colorCounts[colorVal] || 0) + 1;
              }
              if (item.style) {
                const s = item.style.trim().toLowerCase();
                styleMap[s] = (styleMap[s] || 0) + 1;
              }
            }
          }

          // SECONDARY: keyword fallback from summary (for older analyses without item.style)
          const summaryLower = (analysis.summary || "").toLowerCase();
          const styleKws: Record<string, string[]> = {
            minimalist: ["מינימליסטי", "minimalist"],
            classic: ["קלאסי", "classic"],
            streetwear: ["סטריטוור", "streetwear"],
            "smart-casual": ["סמארט", "smart casual"],
            bohemian: ["בוהו", "bohemian"],
            sporty: ["ספורטיבי", "sporty"],
          };
          for (const [style, kws] of Object.entries(styleKws)) {
            for (const kw of kws) {
              if (summaryLower.includes(kw)) {
                styleMap[style] = (styleMap[style] || 0) + 1;
                break;
              }
            }
          }
        }

        const dominantStyle = Object.entries(styleMap)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "classic";

        const topColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => color);

        const avgScore = allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10) / 10
          : 0;

        const scoreImprovement = allScores.length >= 3
          ? Math.round((allScores.slice(-3).reduce((a, b) => a + b, 0) / 3 -
              allScores.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, allScores.length)) * 10) / 10
          : 0;

        // ---- 4. Build "complete look" suggestion ----
        // Suggest items from wardrobe that together with this product make a complete outfit
        const lookItems = matchingWardrobeItems.slice(0, 3).map((item) => ({
          id: item.id,
          name: item.name,
          itemType: item.itemType,
          color: item.color,
          itemImageUrl: item.itemImageUrl,
        }));

        // GAP G: Extract lookStructure insights from most recent analysis
        const latestAnalysis = completedReviews[0]?.analysisJson as FashionAnalysis | null;
        const lookStructureContext = latestAnalysis?.lookStructure ? {
          silhouette: latestAnalysis.lookStructure.silhouetteSummary || null,
          proportions: latestAnalysis.lookStructure.proportions || null,
          colorHarmony: latestAnalysis.lookStructure.colorHarmony || null,
          usesLayering: latestAnalysis.lookStructure.hasLayering || false,
        } : null;

        return {
          hasData: completedReviews.length > 0,
          wardrobeItemCount: wardrobeData.length,
          analysisCount: completedReviews.length,
          matchingWardrobeItems,
          recentLooks,
          completeLookSuggestion: lookItems,
          personalInsights: {
            dominantStyle,
            topColors,
            avgScore,
            scoreImprovement,
            totalLooks: completedReviews.length,
          },
          lookStructureContext,
          profilePreferences: {
            gender: profile?.gender || null,
            stylePreference: profile?.stylePreference || null,
            budgetLevel: profile?.budgetLevel || null,
          },
        };
      }),

    // ---- Generate AI look image combining product + wardrobe items ----
    generateWidgetLook: protectedProcedure
      .input(z.object({
        productName: z.string(),
        productCategory: z.string(),
        productColors: z.array(z.string()),
        productImageUrl: z.string().optional(),
        wardrobeItemNames: z.array(z.string()),
        wardrobeItemColors: z.array(z.string()),
        gender: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const genderWord = input.gender === "male" ? "man" : "woman";
        const allItems = [
          `${input.productName} (new item, ${input.productColors.join("/")})`,
          ...input.wardrobeItemNames.map((name, i) =>
            `${name} (from wardrobe, ${input.wardrobeItemColors[i] || "neutral"})`
          ),
        ].join(", ");

        const prompt = `Professional fashion editorial flat lay photograph on a clean white marble background. A complete outfit look showing these items arranged beautifully like a magazine spread:

Items: ${allItems}

Style: High-end fashion editorial flat lay for a ${genderWord}. Items arranged aesthetically with perfect spacing. Include all items laid out beautifully. Crisp studio lighting, soft shadows, luxury feel. The new item (${input.productName}) should be the hero/center piece, slightly larger and more prominent. The wardrobe items complement it around. No mannequin, no model, just the items. Premium fashion photography quality.`;

        try {
          const { url } = await generateImage({ prompt });
          return { imageUrl: url || "", success: true };
        } catch (err: any) {
          console.error("[Widget Look] Image generation failed:", err);
          return { imageUrl: "", success: false };
        }
      }),

    // ---- Generate "after" look image for before/after comparison ----
    generateUpgradeLook: protectedProcedure
      .input(z.object({
        productName: z.string(),
        productCategory: z.string(),
        productColors: z.array(z.string()),
        originalImageUrl: z.string(),
        existingItemNames: z.array(z.string()),
        gender: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const genderWord = input.gender === "male" ? "man" : "woman";
        const existingItems = input.existingItemNames.join(", ");

        // Use the user's original photo as reference to generate the "after" image
        // The prompt instructs the AI to keep the SAME person, pose, and background
        // but replace/add the product item on them
        const prompt = `Edit this photo of a ${genderWord} to show them wearing a ${input.productName} in ${input.productColors.join("/")} color. Keep the EXACT same person, face, body, pose, and background from the original photo. Only change the outfit: replace or add the ${input.productName} while keeping the rest of the outfit (${existingItems}) as close to the original as possible. The ${input.productName} should look natural and realistic on this specific person. Maintain the same lighting, environment, and photo style. This should look like the same photo but with the new item added to their outfit.`;

        try {
          // Pass the user's original image as reference so the AI generates ON their photo
          const { url } = await generateImage({
            prompt,
            originalImages: [{
              url: input.originalImageUrl,
              mimeType: "image/jpeg",
            }],
          });
          return { imageUrl: url || "", success: true };
        } catch (err: any) {
          console.error("[Upgrade Look] Image generation failed:", err);
          return { imageUrl: "", success: false };
        }
      }),

    // ---- Smart match: check which demo products match user's taste ----
    smartMatchProducts: protectedProcedure
      .input(z.object({
        products: z.array(z.object({
          id: z.number(),
          name: z.string(),
          category: z.string(),
          colors: z.array(z.string()),
          price: z.number(),
        })),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        const [reviewsData, wardrobeData, profile] = await Promise.all([
          getReviewsByUserId(userId),
          getWardrobeByUserId(userId),
          getUserProfile(userId),
        ]);

        const completedReviews = reviewsData.filter(
          (r) => r.status === "completed" && r.analysisJson
        );

        if (completedReviews.length === 0) {
          return { matches: [], hasData: false };
        }

        // Build user style profile
        const colorCounts: Record<string, number> = {};
        const styleCounts: Record<string, number> = {};
        const allScores: number[] = [];

        for (const review of completedReviews) {
          const analysis = review.analysisJson as FashionAnalysis;
          if (!analysis) continue;
          allScores.push(analysis.overallScore || 0);

          // PRIMARY: Use structured item.style and preciseColor fields
          if (analysis.items) {
            for (const item of analysis.items) {
              const colorVal = (item.preciseColor || item.color || '').trim().toLowerCase();
              if (colorVal) {
                colorCounts[colorVal] = (colorCounts[colorVal] || 0) + 1;
              }
              if (item.style) {
                const s = item.style.trim().toLowerCase();
                styleCounts[s] = (styleCounts[s] || 0) + 1;
              }
            }
          }

          // SECONDARY: keyword fallback from summary (for older analyses without item.style)
          const summaryLower = (analysis.summary || "").toLowerCase();
          const styleKws: Record<string, string[]> = {
            minimalist: ["מינימליסטי", "minimalist", "מינימלי"],
            classic: ["קלאסי", "classic"],
            streetwear: ["סטריטוור", "streetwear", "רחוב"],
            "smart-casual": ["סמארט", "smart casual"],
            bohemian: ["בוהו", "bohemian"],
            sporty: ["ספורטיבי", "sporty"],
            elegant: ["אלגנטי", "elegant"],
          };
          for (const [style, kws] of Object.entries(styleKws)) {
            for (const kw of kws) {
              if (summaryLower.includes(kw)) {
                styleCounts[style] = (styleCounts[style] || 0) + 1;
                break;
              }
            }
          }
        }

        const topColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([color]) => color);

        const dominantStyle = Object.entries(styleCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "classic";

        // GAP F: garmentType-to-category mapping (PRIMARY), emoji as FALLBACK
        const garmentToCat: Record<string, string[]> = {
          "t-shirt": ["shirt", "top", "t-shirt"], "dress shirt": ["shirt", "formal-shirt"],
          "polo": ["shirt", "top", "polo"], "blouse": ["shirt", "top", "blouse"],
          "sweater": ["top", "sweater", "knitwear"], "hoodie": ["top", "hoodie", "streetwear"],
          "sweatshirt": ["top", "sweatshirt"], "tank top": ["top", "tank"],
          "crop top": ["top", "crop"], "cardigan": ["top", "cardigan", "knitwear"],
          "jeans": ["pants", "jeans", "denim"], "chinos": ["pants", "chinos"],
          "trousers": ["pants", "trousers"], "shorts": ["shorts", "pants"],
          "joggers": ["pants", "joggers", "athletic"], "leggings": ["pants", "leggings"],
          "dress": ["dress"], "skirt": ["skirt"],
          "blazer": ["jacket", "blazer"], "jacket": ["jacket"],
          "coat": ["jacket", "coat", "outerwear"], "bomber": ["jacket", "bomber"],
          "denim jacket": ["jacket", "denim"], "leather jacket": ["jacket", "leather"],
          "parka": ["jacket", "coat", "outerwear"], "vest": ["jacket", "vest"],
          "sneakers": ["shoes", "sneakers"], "loafers": ["shoes", "loafers"],
          "boots": ["shoes", "boots"], "heels": ["shoes", "heels"],
          "sandals": ["shoes", "sandals"], "oxford": ["shoes", "formal-shoes"],
          "belt": ["accessory", "belt"], "watch": ["accessory", "watch"],
          "sunglasses": ["accessory", "sunglasses"], "hat": ["accessory", "hat"],
          "cap": ["accessory", "hat", "cap"], "scarf": ["accessory", "scarf"],
          "necklace": ["accessory", "jewelry", "necklace"], "bracelet": ["accessory", "jewelry"],
          "ring": ["accessory", "jewelry", "ring"], "earrings": ["accessory", "jewelry"],
          "bag": ["bag"], "backpack": ["bag", "backpack"], "handbag": ["bag", "handbag"],
        };
        const emojiToCat: Record<string, string[]> = {
          "👕": ["shirt", "top"], "👖": ["pants", "jeans"], "👗": ["dress"],
          "🧥": ["jacket", "coat"], "👟": ["shoes", "sneakers"], "👞": ["shoes", "formal-shoes"],
          "👠": ["shoes", "heels"], "👜": ["bag"], "🎒": ["bag", "backpack"],
          "⌚": ["accessory", "watch"], "🕶️": ["accessory", "sunglasses"],
          "💍": ["accessory", "jewelry"], "🧣": ["accessory", "scarf"],
          "🧢": ["accessory", "hat"], "👒": ["accessory", "hat"],
          "🩳": ["shorts", "pants"], "👔": ["shirt", "formal-shirt"],
        };
        const resolveCategories = (item: { itemType?: string | null; styleNote?: string | null }): string[] => {
          // PRIMARY: extract garmentType from styleNote (saved from Stage 29)
          const note = (item.styleNote || '').toLowerCase();
          for (const [gt, cats] of Object.entries(garmentToCat)) {
            if (note.includes(gt)) return cats;
          }
          // FALLBACK: emoji-based detection
          const itemType = (item.itemType || '').trim();
          const emojiCats = emojiToCat[itemType];
          if (emojiCats) return emojiCats;
          // Last resort: use itemType as-is
          return itemType ? [itemType.toLowerCase()] : [];
        };

        // Check which wardrobe categories the user is missing
        const ownedCategories = new Set(
          wardrobeData.flatMap((w) => resolveCategories(w))
        );

        // Score each product
        const matches = input.products.map((product) => {
          let score = 50; // Base score
          const reasons: string[] = [];

          // Category need: if user doesn't own this category, bonus
          const catLower = product.category.toLowerCase();
          if (!ownedCategories.has(catLower)) {
            score += 15;
            reasons.push("fills_gap");
          }

          // Style match
          const styleMatchMap: Record<string, string[]> = {
            classic: ["blazer", "jacket", "dress", "coat"],
            minimalist: ["shirt", "top", "pants"],
            streetwear: ["jacket", "shoes", "coat"],
            elegant: ["dress", "blazer", "coat"],
            "smart-casual": ["blazer", "jacket", "shirt"],
          };
          if (styleMatchMap[dominantStyle]?.some(c => catLower.includes(c))) {
            score += 10;
            reasons.push("style_match");
          }

          // Budget match
          if (profile?.budgetLevel) {
            const budget = profile.budgetLevel;
            if (
              (budget === "budget" && product.price <= 200) ||
              (budget === "mid-range" && product.price <= 500) ||
              (budget === "premium" && product.price <= 1000) ||
              (budget === "luxury")
            ) {
              score += 10;
              reasons.push("budget_match");
            }
          }

          // Wardrobe pairing potential
          const categoryPairings: Record<string, string[]> = {
            jacket: ["shirt", "top", "pants", "jeans"],
            dress: ["jacket", "shoes", "bag"],
            coat: ["shirt", "pants", "dress"],
            shirt: ["pants", "jacket"],
          };
          const pairingTypes = categoryPairings[catLower] || [];
          const pairingCount = pairingTypes.filter(pt =>
            wardrobeData.some(w => resolveCategories(w).some(c => c === pt || c.includes(pt) || pt.includes(c)))
          ).length;
          if (pairingCount > 0) {
            score += Math.min(15, pairingCount * 5);
            reasons.push("wardrobe_pairing");
          }

          // Cap score
          score = Math.min(98, Math.max(30, score));

          return {
            productId: product.id,
            matchScore: score,
            reasons,
          };
        });

        // Sort by score descending
        matches.sort((a, b) => b.matchScore - a.matchScore);

        return {
          matches,
          hasData: true,
          dominantStyle,
          topColors: topColors.slice(0, 3),
        };
      }),
  }),

  // ==========================================
  // Instagram Integration Router
  // ==========================================
  instagram: router({
    /** Get current Instagram connection status */
    getConnection: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getIgConnection(ctx.user.id);
      if (!conn) return null;
      return {
        igUsername: conn.igUsername,
        connectedAt: conn.connectedAt,
        isActive: Boolean(conn.isActive),
      };
    }),

    /** Connect Instagram account (save access token from OAuth flow) */
    connect: protectedProcedure
      .input(z.object({
        igUserId: z.string(),
        igUsername: z.string(),
        accessToken: z.string(),
        tokenExpiresAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await upsertIgConnection({
          userId: ctx.user.id,
          igUserId: input.igUserId,
          igUsername: input.igUsername,
          accessToken: input.accessToken,
          tokenExpiresAt: input.tokenExpiresAt,
        });
        return { success: true, id };
      }),

    /** Disconnect Instagram */
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await disconnectIg(ctx.user.id);
      return { success: true };
    }),

    /** Get all story mentions for the current user */
    getStories: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        const stories = await getStoryMentionsByUserId(ctx.user.id, input?.limit ?? 50);
        return stories.map(s => ({
          id: s.id,
          igUsername: s.igUsername,
          mediaUrl: s.mediaUrl,
          savedImageUrl: s.savedImageUrl,
          status: s.status,
          overallScore: s.overallScore,
          quickSummary: s.quickSummary,
          quickTip: s.quickTip,
          itemsDetected: s.itemsDetected,
          analysisJson: s.analysisJson,
          dmSent: Boolean(s.dmSent),
          createdAt: s.createdAt,
        }));
      }),

    /** Get story mention stats */
    getStats: protectedProcedure.query(async ({ ctx }) => {
      return getStoryMentionStats(ctx.user.id);
    }),

    /** Get style diary entries */
    getStyleDiary: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ ctx, input }) => {
        return getStyleDiary(ctx.user.id, input?.limit ?? 20);
       }),
  }),

  // ─── Privacy & Consent ───
  privacy: router({
    logConsent: publicProcedure
      .input(z.object({
        consentType: z.enum(["terms", "privacy", "cookies", "marketing", "whatsapp"]),
        granted: z.boolean(),
        documentVersion: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ip = ctx.req.headers["x-forwarded-for"] as string || ctx.req.socket.remoteAddress || "";
        // Hash IP for privacy
        const crypto = await import("crypto");
        const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
        await logConsent({
          userId: ctx.user?.id,
          consentType: input.consentType,
          granted: input.granted,
          ipHash,
          userAgent: ctx.req.headers["user-agent"] || undefined,
          documentVersion: input.documentVersion || "1.0",
        });
        return { success: true };
      }),

    getMyConsents: protectedProcedure.query(async ({ ctx }) => {
      return getUserConsents(ctx.user.id);
    }),
  }),
});
export type AppRouter = typeof appRouter;
