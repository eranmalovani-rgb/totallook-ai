/**
 * Stage 33: Taste Profile Context — computed summary for injection into prompts.
 * This module builds a compact text summary from the user's analysis history,
 * wardrobe, and preferences for use in Stage 1, Stage 2, and Fix My Look prompts.
 */

import type { FashionAnalysis, FashionItem } from "../shared/fashionTypes";

// ---- Types ----

export interface TasteProfileContext {
  /** Number of completed analyses */
  analysisCount: number;
  /** Average overall score across all analyses */
  avgScore: number;
  /** Dominant style archetype (e.g. "minimalist", "streetwear") */
  dominantStyle: string | null;
  /** Top 5 colors the user wears most */
  topColors: string[];
  /** Top 3 materials the user wears most */
  topMaterials: string[];
  /** Top 2 fits the user wears most */
  topFits: string[];
  /** Top 2 patterns */
  topPatterns: string[];
  /** Dominant silhouette from lookStructure */
  dominantSilhouette: string | null;
  /** Dominant proportions from lookStructure */
  dominantProportions: string | null;
  /** Dominant color harmony type */
  dominantColorHarmony: string | null;
  /** Layering frequency (0-100%) */
  layeringPct: number | null;
  /** Categories that consistently score high (>=8) */
  strengths: string[];
  /** Categories that consistently score low (<=6) */
  weaknesses: string[];
  /** Score trend: "improving" | "declining" | "stable" */
  scoreTrend: string;
  /** Style consistency: "focused" | "exploring" | "scattered" */
  styleConsistency: string;
  /** Color temperature: "warm" | "cool" | "neutral" | "mixed" */
  colorTemperature: string;
  /** Contrast level: "high" | "low" | "moderate" */
  contrastLevel: string;
  /** Personal style code: 3-word summary */
  styleCode: string | null;
  /** Recurring weakness patterns (e.g. "fit issues", "color clashes") */
  weaknessPatterns: string[];
  /** Growth trajectory description */
  growthNote: string | null;
}

// ---- Color temperature classification ----

const WARM_COLORS = new Set([
  "red", "orange", "yellow", "gold", "coral", "peach", "rust", "terracotta",
  "burgundy", "maroon", "salmon", "amber", "copper", "tan", "camel", "warm brown",
  "brick", "burnt orange", "mustard", "wine", "crimson",
]);

const COOL_COLORS = new Set([
  "blue", "navy", "teal", "mint", "lavender", "purple", "violet", "indigo",
  "cobalt", "royal blue", "ice blue", "sky blue", "periwinkle", "mauve",
  "plum", "emerald", "forest green", "sage", "olive", "seafoam",
]);

const NEUTRAL_COLORS = new Set([
  "black", "white", "gray", "grey", "beige", "cream", "ivory", "charcoal",
  "khaki", "taupe", "off-white", "silver", "nude", "bone", "oatmeal",
]);

function classifyColorTemp(color: string): "warm" | "cool" | "neutral" | "unknown" {
  const c = color.toLowerCase().trim();
  if (NEUTRAL_COLORS.has(c)) return "neutral";
  if (WARM_COLORS.has(c)) return "warm";
  if (COOL_COLORS.has(c)) return "cool";
  // Check partial matches
  for (const w of WARM_COLORS) { if (c.includes(w) || w.includes(c)) return "warm"; }
  for (const w of COOL_COLORS) { if (c.includes(w) || w.includes(c)) return "cool"; }
  return "unknown";
}

// ---- Build Taste Profile Context from raw data ----

export function buildTasteProfileContext(
  completedReviews: Array<{ analysisJson: unknown; overallScore?: number | null; createdAt: Date }>,
  wardrobeItems: Array<{ itemType: string; name: string; color: string | null; brand: string | null; styleNote?: string | null }>,
  profilePrefs?: { stylePreference?: string | null; gender?: string | null; budgetLevel?: string | null } | null,
): TasteProfileContext | null {
  if (completedReviews.length === 0) return null;

  // ---- Aggregate all data ----
  const styleCounts: Record<string, number> = {};
  const colorCounts: Record<string, number> = {};
  const materialCounts: Record<string, number> = {};
  const fitCounts: Record<string, number> = {};
  const patternCounts: Record<string, number> = {};
  const silhouetteCounts: Record<string, number> = {};
  const proportionCounts: Record<string, number> = {};
  const colorHarmonyCounts: Record<string, number> = {};
  let layeringYes = 0;
  let layeringTotal = 0;
  const strengthCounts: Record<string, number> = {};
  const weaknessCounts: Record<string, number> = {};
  const scores: number[] = [];

  for (const review of completedReviews) {
    const analysis = review.analysisJson as FashionAnalysis;
    if (!analysis) continue;

    const score = analysis.overallScore ?? review.overallScore ?? 0;
    if (score > 0) scores.push(score);

    // Items
    if (analysis.items) {
      for (const item of analysis.items) {
        if (item.style) {
          const s = item.style.trim().toLowerCase();
          if (s && s !== "n/a") styleCounts[s] = (styleCounts[s] || 0) + 1;
        }
        const colorVal = (item.preciseColor || item.color || "").trim().toLowerCase();
        if (colorVal) colorCounts[colorVal] = (colorCounts[colorVal] || 0) + 1;
        if (item.material) {
          const m = item.material.trim().toLowerCase();
          if (m && m !== "n/a") materialCounts[m] = (materialCounts[m] || 0) + 1;
        }
        if (item.fit) {
          const f = item.fit.trim().toLowerCase();
          if (f && f !== "n/a") fitCounts[f] = (fitCounts[f] || 0) + 1;
        }
        if (item.pattern) {
          const p = item.pattern.trim().toLowerCase();
          if (p && p !== "n/a") patternCounts[p] = (patternCounts[p] || 0) + 1;
        }
      }
    }

    // LookStructure
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
      layeringTotal++;
      if (ls.hasLayering) layeringYes++;
    }

    // Scores → strengths/weaknesses
    if (analysis.scores) {
      for (const sc of analysis.scores) {
        if (sc.score != null) {
          if (sc.score >= 8) strengthCounts[sc.category] = (strengthCounts[sc.category] || 0) + 1;
          if (sc.score <= 6) weaknessCounts[sc.category] = (weaknessCounts[sc.category] || 0) + 1;
        }
      }
    }
  }

  // ---- Compute top-N helpers ----
  const topN = (counts: Record<string, number>, n: number) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  const topNWithCount = (counts: Record<string, number>, n: number) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);

  // ---- Dominant style ----
  const dominantStyle = topN(styleCounts, 1)[0] || null;

  // ---- Style consistency ----
  const totalStyleSignals = Object.values(styleCounts).reduce((a, b) => a + b, 0);
  const topStylePct = totalStyleSignals > 0 && dominantStyle
    ? (styleCounts[dominantStyle] / totalStyleSignals) * 100
    : 0;
  const uniqueStyles = Object.keys(styleCounts).length;
  let styleConsistency: "focused" | "exploring" | "scattered" = "exploring";
  if (topStylePct >= 50 || uniqueStyles <= 2) styleConsistency = "focused";
  else if (uniqueStyles >= 5 && topStylePct < 30) styleConsistency = "scattered";

  // ---- Color temperature ----
  let warmCount = 0, coolCount = 0, neutralCount = 0;
  for (const [color, count] of Object.entries(colorCounts)) {
    const temp = classifyColorTemp(color);
    if (temp === "warm") warmCount += count;
    else if (temp === "cool") coolCount += count;
    else if (temp === "neutral") neutralCount += count;
  }
  const totalColorSignals = warmCount + coolCount + neutralCount;
  let colorTemperature: "warm" | "cool" | "neutral" | "mixed" = "mixed";
  if (totalColorSignals > 0) {
    const warmPct = warmCount / totalColorSignals;
    const coolPct = coolCount / totalColorSignals;
    const neutralPct = neutralCount / totalColorSignals;
    if (warmPct >= 0.5) colorTemperature = "warm";
    else if (coolPct >= 0.5) colorTemperature = "cool";
    else if (neutralPct >= 0.6) colorTemperature = "neutral";
  }

  // ---- Contrast level ----
  const topColors = topN(colorCounts, 5);
  const hasBlack = topColors.some(c => c === "black" || c === "charcoal");
  const hasWhite = topColors.some(c => c === "white" || c === "cream" || c === "ivory");
  const hasVibrant = topColors.some(c => !NEUTRAL_COLORS.has(c));
  let contrastLevel: "high" | "low" | "moderate" = "moderate";
  if (hasBlack && hasWhite) contrastLevel = "high";
  else if (topColors.every(c => NEUTRAL_COLORS.has(c))) contrastLevel = "low";

  // ---- Score trend ----
  let scoreTrend: "improving" | "declining" | "stable" = "stable";
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
    if (secondHalf - firstHalf >= 0.5) scoreTrend = "improving";
    else if (firstHalf - secondHalf >= 0.5) scoreTrend = "declining";
  }

  // ---- Weakness patterns ----
  const weaknessPatterns: string[] = [];
  const topWeaknesses = topNWithCount(weaknessCounts, 5);
  for (const [cat, count] of topWeaknesses) {
    const ratio = completedReviews.length > 0 ? count / completedReviews.length : 0;
    if (ratio >= 0.4) weaknessPatterns.push(cat); // appears in 40%+ of analyses
  }

  // ---- Growth note ----
  let growthNote: string | null = null;
  if (scores.length >= 3) {
    const recent3 = scores.slice(-3);
    const early3 = scores.slice(0, Math.min(3, scores.length));
    const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
    const earlyAvg = early3.reduce((a, b) => a + b, 0) / early3.length;
    const diff = recentAvg - earlyAvg;
    if (diff >= 1.0) growthNote = `Significant improvement: average score rose from ${earlyAvg.toFixed(1)} to ${recentAvg.toFixed(1)} (+${diff.toFixed(1)}).`;
    else if (diff >= 0.3) growthNote = `Gradual improvement: average score moved from ${earlyAvg.toFixed(1)} to ${recentAvg.toFixed(1)}.`;
    else if (diff <= -0.5) growthNote = `Scores dipped recently: from ${earlyAvg.toFixed(1)} to ${recentAvg.toFixed(1)}. May need to revisit basics.`;
    else growthNote = `Consistent performance around ${recentAvg.toFixed(1)}.`;
  }

  // ---- Personal Style Code ----
  const word1 = dominantStyle || (profilePrefs?.stylePreference?.split(",")[0]?.trim().toLowerCase()) || null;
  const word2 = colorTemperature !== "mixed" ? colorTemperature : (topColors[0] || null);
  const word3 = topN(fitCounts, 1)[0] || "regular";
  const styleCode = word1 ? `${word1} · ${word2 || "neutral"} · ${word3}` : null;

  return {
    analysisCount: completedReviews.length,
    avgScore: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
    dominantStyle,
    topColors: topN(colorCounts, 5),
    topMaterials: topN(materialCounts, 3),
    topFits: topN(fitCounts, 2),
    topPatterns: topN(patternCounts, 2),
    dominantSilhouette: topN(silhouetteCounts, 1)[0] || null,
    dominantProportions: topN(proportionCounts, 1)[0] || null,
    dominantColorHarmony: topN(colorHarmonyCounts, 1)[0] || null,
    layeringPct: layeringTotal > 0 ? Math.round((layeringYes / layeringTotal) * 100) : null,
    strengths: topN(strengthCounts, 5),
    weaknesses: topN(weaknessCounts, 5),
    scoreTrend,
    styleConsistency,
    colorTemperature,
    contrastLevel,
    styleCode,
    weaknessPatterns,
    growthNote,
  };
}

// ---- Format for prompt injection ----

export function formatTasteProfileForPrompt(tp: TasteProfileContext, lang: "he" | "en"): string {
  const isHebrew = lang === "he";

  const lines: string[] = [];

  if (isHebrew) {
    lines.push("=== פרופיל טעם אישי של המשתמש (מבוסס על היסטוריית ניתוחים) ===");
    lines.push(`ניתוחים שהושלמו: ${tp.analysisCount} | ציון ממוצע: ${tp.avgScore}/10 | מגמה: ${tp.scoreTrend === "improving" ? "משתפר" : tp.scoreTrend === "declining" ? "יורד" : "יציב"}`);
    if (tp.styleCode) lines.push(`קוד סגנון אישי: ${tp.styleCode}`);
    if (tp.dominantStyle) lines.push(`סגנון דומיננטי: ${tp.dominantStyle} (עקביות: ${tp.styleConsistency === "focused" ? "ממוקד" : tp.styleConsistency === "scattered" ? "מפוזר" : "חוקר"})`);
    if (tp.topColors.length > 0) lines.push(`צבעים מועדפים: ${tp.topColors.join(", ")} | טמפרטורה: ${tp.colorTemperature === "warm" ? "חם" : tp.colorTemperature === "cool" ? "קר" : tp.colorTemperature === "neutral" ? "ניטרלי" : "מעורב"} | קונטרסט: ${tp.contrastLevel === "high" ? "גבוה" : tp.contrastLevel === "low" ? "נמוך" : "בינוני"}`);
    if (tp.topMaterials.length > 0) lines.push(`חומרים מועדפים: ${tp.topMaterials.join(", ")}`);
    if (tp.topFits.length > 0) lines.push(`גזרות מועדפות: ${tp.topFits.join(", ")}`);
    if (tp.topPatterns.length > 0) lines.push(`דוגמאות מועדפות: ${tp.topPatterns.join(", ")}`);
    if (tp.dominantSilhouette) lines.push(`סילואט דומיננטי: ${tp.dominantSilhouette}`);
    if (tp.dominantProportions) lines.push(`פרופורציות דומיננטיות: ${tp.dominantProportions}`);
    if (tp.dominantColorHarmony) lines.push(`הרמוניית צבע דומיננטית: ${tp.dominantColorHarmony}`);
    if (tp.layeringPct != null) lines.push(`שכבות (layering): ${tp.layeringPct}% מהלוקים`);
    if (tp.strengths.length > 0) lines.push(`חוזקות עקביות: ${tp.strengths.join(", ")}`);
    if (tp.weaknesses.length > 0) lines.push(`חולשות חוזרות: ${tp.weaknesses.join(", ")}`);
    if (tp.weaknessPatterns.length > 0) lines.push(`דפוסי חולשה (מופיעים ב-40%+ מהניתוחים): ${tp.weaknessPatterns.join(", ")}`);
    if (tp.growthNote) lines.push(`מסלול התפתחות: ${tp.growthNote}`);
    lines.push("");
    lines.push("הנחיות שימוש בפרופיל:");
    lines.push("- התאם המלצות לסגנון הדומיננטי של המשתמש — אל תציע סגנון שונה לחלוטין אלא אם הציון נמוך.");
    lines.push("- השתמש בצבעים המועדפים כבסיס, אבל הצע צבעים משלימים חדשים אם הפלטה חד-גונית מדי.");
    lines.push("- התמקד בחולשות החוזרות — אלה ההזדמנויות הגדולות ביותר לשיפור.");
    lines.push("- אם המשתמש משתפר — ציין את זה ותן פידבק חיובי. אם יורד — היה עדין אבל ישיר.");
    lines.push("- אם סגנון המשתמש 'מפוזר' — הצע מיקוד ונוסחאות חוזרות.");
  } else {
    lines.push("=== User's Personal Taste Profile (based on analysis history) ===");
    lines.push(`Completed analyses: ${tp.analysisCount} | Average score: ${tp.avgScore}/10 | Trend: ${tp.scoreTrend}`);
    if (tp.styleCode) lines.push(`Personal Style Code: ${tp.styleCode}`);
    if (tp.dominantStyle) lines.push(`Dominant style: ${tp.dominantStyle} (consistency: ${tp.styleConsistency})`);
    if (tp.topColors.length > 0) lines.push(`Preferred colors: ${tp.topColors.join(", ")} | Temperature: ${tp.colorTemperature} | Contrast: ${tp.contrastLevel}`);
    if (tp.topMaterials.length > 0) lines.push(`Preferred materials: ${tp.topMaterials.join(", ")}`);
    if (tp.topFits.length > 0) lines.push(`Preferred fits: ${tp.topFits.join(", ")}`);
    if (tp.topPatterns.length > 0) lines.push(`Preferred patterns: ${tp.topPatterns.join(", ")}`);
    if (tp.dominantSilhouette) lines.push(`Dominant silhouette: ${tp.dominantSilhouette}`);
    if (tp.dominantProportions) lines.push(`Dominant proportions: ${tp.dominantProportions}`);
    if (tp.dominantColorHarmony) lines.push(`Dominant color harmony: ${tp.dominantColorHarmony}`);
    if (tp.layeringPct != null) lines.push(`Layering frequency: ${tp.layeringPct}% of looks`);
    if (tp.strengths.length > 0) lines.push(`Consistent strengths: ${tp.strengths.join(", ")}`);
    if (tp.weaknesses.length > 0) lines.push(`Recurring weaknesses: ${tp.weaknesses.join(", ")}`);
    if (tp.weaknessPatterns.length > 0) lines.push(`Weakness patterns (appear in 40%+ of analyses): ${tp.weaknessPatterns.join(", ")}`);
    if (tp.growthNote) lines.push(`Growth trajectory: ${tp.growthNote}`);
    lines.push("");
    lines.push("Profile usage guidelines:");
    lines.push("- Align recommendations with the user's dominant style — don't suggest a completely different style unless the score is low.");
    lines.push("- Use preferred colors as a base, but suggest complementary new colors if the palette is too monotone.");
    lines.push("- Focus on recurring weaknesses — these are the biggest improvement opportunities.");
    lines.push("- If the user is improving — acknowledge it with positive feedback. If declining — be gentle but direct.");
    lines.push("- If style consistency is 'scattered' — suggest focus and repeatable formulas.");
  }

  return lines.join("\n");
}

// ---- Format wardrobe for Stage 2 injection ----

export function formatWardrobeForStage2(
  wardrobeItems: Array<{ itemType: string; name: string; color: string | null; brand: string | null; styleNote?: string | null }>,
  lang: "he" | "en",
): string {
  if (wardrobeItems.length === 0) return "";

  const isHebrew = lang === "he";
  const lines: string[] = [];

  if (isHebrew) {
    lines.push("=== הארון של המשתמש (פריטים קיימים — השתמש בהם לפני שתמליץ לקנות חדש!) ===");
    lines.push(`סה"כ ${wardrobeItems.length} פריטים. לפני שתמליץ על רכישה חדשה, בדוק אם יש פריט דומה בארון.`);
  } else {
    lines.push("=== User's Wardrobe (existing items — use these before recommending new purchases!) ===");
    lines.push(`Total ${wardrobeItems.length} items. Before recommending a new purchase, check if a similar item already exists.`);
  }

  // Group by category for readability
  const grouped: Record<string, typeof wardrobeItems> = {};
  for (const item of wardrobeItems) {
    const cat = item.itemType || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  for (const [cat, items] of Object.entries(grouped)) {
    const itemDescs = items.slice(0, 5).map(item => {
      const parts: string[] = [];
      if (item.color) parts.push(item.color);
      if (item.brand) parts.push(item.brand);
      parts.push(item.name || cat);
      if (item.styleNote) {
        // Extract key info from styleNote (garmentType, material, fit)
        const note = item.styleNote;
        const garmentMatch = note.match(/garmentType:([^,;]+)/i);
        const materialMatch = note.match(/material:([^,;]+)/i);
        if (garmentMatch) parts.push(garmentMatch[1].trim());
        if (materialMatch) parts.push(materialMatch[1].trim());
      }
      return parts.join(" ");
    });
    lines.push(`  ${cat} (${items.length}): ${itemDescs.join(" | ")}`);
  }

  if (isHebrew) {
    lines.push("");
    lines.push("הנחיה: אם ההמלצה היא לשדרג חולצה — ויש חולצה מתאימה בארון — הצע לשלב אותה במקום לקנות חדשה.");
    lines.push("אם אין פריט מתאים בארון — המלץ על רכישה חדשה עם shoppingLinks.");
  } else {
    lines.push("");
    lines.push("Guideline: If the recommendation is to upgrade a top — and a suitable top exists in the wardrobe — suggest combining it instead of buying new.");
    lines.push("If no suitable item exists — recommend a new purchase with shoppingLinks.");
  }

  return lines.join("\n");
}
