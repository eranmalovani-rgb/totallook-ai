import { useState, useMemo } from "react";
import { ExternalLink, Search, Globe, MapPin, Sparkles } from "lucide-react";
import { POPULAR_INFLUENCERS, type Influencer } from "../../../shared/fashionTypes";
import { getCountryFlag, getCountryName } from "../../../shared/countries";
import InfluencerAvatar from "./InfluencerAvatar";
import { useLanguage } from "@/i18n";
import { useCountry } from "@/hooks/useCountry";

interface UserProfileData {
  ageRange?: string | null;
  budgetLevel?: string | null;
  stylePreference?: string | null;
}

interface InfluencerPickerProps {
  gender?: string;
  selectedInfluencers: string[];
  onToggle: (name: string) => void;
  /** User profile data for personalized sorting */
  userProfile?: UserProfileData | null;
}

type CountryTab = "all" | "local" | "global";

/**
 * Calculate a relevance score for an influencer based on user profile.
 * Higher score = better match. Returns 0 if no profile data.
 */
function calcRelevanceScore(inf: Influencer, profile: UserProfileData | null | undefined): number {
  if (!profile) return 0;
  let score = 0;

  // Age match: +3 points
  if (profile.ageRange && inf.ageRanges.includes(profile.ageRange)) {
    score += 3;
  }

  // Budget match: +3 points
  if (profile.budgetLevel && inf.budgetLevels.includes(profile.budgetLevel)) {
    score += 3;
  }

  // Style match: +2 per matching style tag
  if (profile.stylePreference) {
    const userStyles = profile.stylePreference.split(",").map(s => s.trim().toLowerCase());
    for (const tag of inf.styleTags) {
      if (userStyles.includes(tag.toLowerCase())) {
        score += 2;
      }
    }
  }

  return score;
}

export default function InfluencerPicker({ gender, selectedInfluencers, onToggle, userProfile }: InfluencerPickerProps) {
  const [countryTab, setCountryTab] = useState<CountryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const MAX_VISIBLE = 6;
  const { lang } = useLanguage();
  const { country: userCountry } = useCountry();

  const isHe = lang === "he";

  const hasProfile = !!(userProfile?.ageRange || userProfile?.budgetLevel || userProfile?.stylePreference);

  // Check if there are local influencers for the user's detected country
  const hasLocalInfluencers = useMemo(() => {
    if (!userCountry) return false;
    return POPULAR_INFLUENCERS.some(inf => inf.country === userCountry);
  }, [userCountry]);

  // Get the local country label
  const localLabel = useMemo(() => {
    if (!userCountry) return isHe ? "מקומיים" : "Local";
    const name = getCountryName(userCountry, isHe ? "he" : "en");
    const flag = getCountryFlag(userCountry);
    return `${flag} ${name}`;
  }, [userCountry, isHe]);

  const filteredInfluencers = useMemo(() => {
    let list: Influencer[] = POPULAR_INFLUENCERS;

    // Filter by gender
    if (gender) {
      list = list.filter(inf => inf.gender === gender || inf.gender === "unisex");
    }

    // HARD filter by age range — don't show influencers outside the user's age group
    if (userProfile?.ageRange) {
      list = list.filter(inf => {
        // If influencer has ageRanges defined, user's age must be in it
        if (inf.ageRanges.length === 0) return true;
        // Allow if there's a direct match
        if (inf.ageRanges.includes(userProfile.ageRange!)) return true;
        // For 55+ users: also allow influencers targeting 45-54 (adjacent range)
        if (userProfile.ageRange === "55+" && inf.ageRanges.includes("45-54")) return true;
        return false;
      });
    }

    // HARD filter by budget level — don't show luxury influencers to budget users etc.
    if (userProfile?.budgetLevel) {
      const userBudget = userProfile.budgetLevel;
      // Define adjacent budget levels (allow one tier above/below for variety)
      const adjacentBudgets: Record<string, string[]> = {
        "budget": ["budget", "mid-range"],
        "mid-range": ["budget", "mid-range", "premium"],
        "premium": ["mid-range", "premium", "luxury"],
        "luxury": ["premium", "luxury"],
      };
      const allowedBudgets = adjacentBudgets[userBudget] || [userBudget];
      list = list.filter(inf => {
        if (inf.budgetLevels.length === 0) return true;
        // Show if influencer has ANY overlap with allowed budget range
        return inf.budgetLevels.some(b => allowedBudgets.includes(b));
      });
    }

    // Filter by country tab
    if (countryTab === "local" && userCountry) {
      list = list.filter(inf => inf.country === userCountry);
    } else if (countryTab === "global") {
      list = list.filter(inf => inf.country === "global");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(inf =>
        inf.name.toLowerCase().includes(q) ||
        inf.handle.toLowerCase().includes(q) ||
        inf.style.toLowerCase().includes(q)
      );
    }

    // Sort by relevance score if user profile exists
    if (hasProfile) {
      list = [...list].sort((a, b) => {
        const scoreA = calcRelevanceScore(a, userProfile);
        const scoreB = calcRelevanceScore(b, userProfile);
        return scoreB - scoreA; // Higher score first
      });
    }

    return list;
  }, [gender, countryTab, searchQuery, userProfile, hasProfile, userCountry]);

  // Compute relevance scores for badge display
  const relevanceScores = useMemo(() => {
    if (!hasProfile) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const inf of filteredInfluencers) {
      map.set(inf.name, calcRelevanceScore(inf, userProfile));
    }
    return map;
  }, [filteredInfluencers, userProfile, hasProfile]);

  // Build tabs dynamically based on whether local influencers exist
  const tabs: { id: CountryTab; label: string; icon: React.ReactNode }[] = useMemo(() => {
    const result: { id: CountryTab; label: string; icon: React.ReactNode }[] = [
      { id: "all", label: isHe ? "הכל" : "All", icon: null },
    ];
    if (hasLocalInfluencers) {
      result.push({ id: "local", label: localLabel, icon: <MapPin className="w-3.5 h-3.5" /> });
    }
    result.push({ id: "global", label: isHe ? "בינלאומיים" : "International", icon: <Globe className="w-3.5 h-3.5" /> });
    return result;
  }, [isHe, hasLocalInfluencers, localLabel]);

  const countByTab = useMemo(() => {
    let base: Influencer[] = gender
      ? POPULAR_INFLUENCERS.filter(inf => inf.gender === gender || inf.gender === "unisex")
      : [...POPULAR_INFLUENCERS];
    // Apply same age filter for accurate counts
    if (userProfile?.ageRange) {
      base = base.filter(inf => {
        if (inf.ageRanges.length === 0) return true;
        if (inf.ageRanges.includes(userProfile.ageRange!)) return true;
        if (userProfile.ageRange === "55+" && inf.ageRanges.includes("45-54")) return true;
        return false;
      });
    }
    // Apply same budget filter for accurate counts
    if (userProfile?.budgetLevel) {
      const userBudget = userProfile.budgetLevel;
      const adjacentBudgets: Record<string, string[]> = {
        "budget": ["budget", "mid-range"],
        "mid-range": ["budget", "mid-range", "premium"],
        "premium": ["mid-range", "premium", "luxury"],
        "luxury": ["premium", "luxury"],
      };
      const allowedBudgets = adjacentBudgets[userBudget] || [userBudget];
      base = base.filter(inf => {
        if (inf.budgetLevels.length === 0) return true;
        return inf.budgetLevels.some(b => allowedBudgets.includes(b));
      });
    }
    return {
      all: base.length,
      local: userCountry ? base.filter(inf => inf.country === userCountry).length : 0,
      global: base.filter(inf => inf.country === "global").length,
    };
  }, [gender, userCountry, userProfile?.ageRange, userProfile?.budgetLevel]);

  return (
    <div className="space-y-3">
      {/* Personalization indicator */}
      {hasProfile && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isHe
              ? "מותאם אישית לפי הפרופיל שלך — המשפיענים הרלוונטיים ביותר מוצגים ראשונים"
              : "Personalized for you — most relevant influencers shown first"}
          </span>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 start-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isHe ? "חפש משפיען..." : "Search influencer..."}
          className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Country tabs */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setCountryTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
              countryTab === tab.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/50 border-white/10 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-[10px] ${countryTab === tab.id ? "text-primary-foreground/70" : "text-muted-foreground/50"}`}>
              ({countByTab[tab.id]})
            </span>
          </button>
        ))}
      </div>

      {/* Influencer grid */}
      <div className="flex flex-wrap gap-2 justify-center max-h-[300px] overflow-y-auto py-1 scrollbar-thin">
        {filteredInfluencers.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 py-4">
            {isHe ? "לא נמצאו תוצאות" : "No results found"}
          </p>
        ) : (
          (showAll || searchQuery.trim() ? filteredInfluencers : filteredInfluencers.slice(0, MAX_VISIBLE)).map(inf => {
            const isSelected = selectedInfluencers.includes(inf.name);
            const relevance = relevanceScores.get(inf.name) ?? 0;
            const isHighMatch = hasProfile && relevance >= 6;
            const countryFlag = inf.country !== "global" ? getCountryFlag(inf.country) : "";
            return (
              <button
                key={inf.name}
                onClick={() => onToggle(inf.name)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : isHighMatch
                    ? "bg-card border-primary/30 text-foreground ring-1 ring-primary/20"
                    : "bg-card border-white/10 hover:border-primary/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <InfluencerAvatar name={inf.name} imageUrl={inf.imageUrl} size="sm" />
                <span className="flex flex-col items-start">
                  <span className="flex items-center gap-1">
                    <span>{inf.name}</span>
                    {countryFlag && <span className="text-[10px]">{countryFlag}</span>}
                    {isHighMatch && !isSelected && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-medium">
                        {isHe ? "מתאים" : "match"}
                      </span>
                    )}
                    <a
                      href={inf.igUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-50 hover:opacity-100"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                  <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground/60"}`}>
                    {inf.style}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      {/* Show more removed — keep it focused with 6 visible influencers */}
    </div>
  );
}
