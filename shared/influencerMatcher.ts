import { POPULAR_INFLUENCERS, type Influencer } from "./fashionTypes";

export interface MatchProfile {
  gender?: string | null;
  ageRange?: string | null;
  budgetLevel?: string | null;
  stylePreference?: string | null;
  /** Influencer names from analysis linkedMentions */
  mentionedInfluencers?: string[];
}

/**
 * Score an influencer against a user profile.
 * Higher = better match.
 */
function scoreInfluencer(inf: Influencer, profile: MatchProfile): number {
  let score = 0;

  // Gender match: +5 (strong signal)
  if (profile.gender) {
    const g = profile.gender.toLowerCase();
    if (inf.gender === "unisex") score += 3;
    else if (inf.gender === g) score += 5;
    else return -100; // wrong gender = disqualify
  }

  // Age match: +4
  if (profile.ageRange && inf.ageRanges.includes(profile.ageRange)) {
    score += 4;
  }

  // Budget match: +3
  if (profile.budgetLevel && inf.budgetLevels.includes(profile.budgetLevel)) {
    score += 3;
  }

  // Style match: +3 per matching tag
  if (profile.stylePreference) {
    const userStyles = profile.stylePreference.split(",").map(s => s.trim().toLowerCase());
    for (const tag of inf.styleTags) {
      if (userStyles.includes(tag.toLowerCase())) {
        score += 3;
      }
    }
  }

  // Mentioned in analysis: +10 (strongest signal)
  if (profile.mentionedInfluencers?.some(
    m => m.toLowerCase() === inf.name.toLowerCase()
  )) {
    score += 10;
  }

  return score;
}

/**
 * Auto-pick the top N influencers that best match the user profile.
 * Returns a diverse set (mix of local + global if possible).
 */
export function autoMatchInfluencers(
  profile: MatchProfile,
  count: number = 3,
  userCountry?: string | null
): Influencer[] {
  const scored = POPULAR_INFLUENCERS
    .map(inf => ({ inf, score: scoreInfluencer(inf, profile) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    // Fallback: return top global influencers matching gender
    const gender = profile.gender?.toLowerCase();
    return POPULAR_INFLUENCERS
      .filter(inf => !gender || inf.gender === gender || inf.gender === "unisex")
      .slice(0, count);
  }

  // Try to include at least 1 local influencer if available
  const results: Influencer[] = [];
  const used = new Set<string>();

  if (userCountry) {
    const localMatch = scored.find(x => x.inf.country === userCountry && !used.has(x.inf.name));
    if (localMatch) {
      results.push(localMatch.inf);
      used.add(localMatch.inf.name);
    }
  }

  // Fill remaining slots with top scored
  for (const { inf } of scored) {
    if (results.length >= count) break;
    if (!used.has(inf.name)) {
      results.push(inf);
      used.add(inf.name);
    }
  }

  return results;
}
