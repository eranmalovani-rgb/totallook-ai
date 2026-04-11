import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import WhatsAppOnboardingModal from "@/components/WhatsAppOnboardingModal";
import { useLocation } from "wouter";
import { Sparkles, ChevronLeft, ChevronRight, Store, MapPin, Globe, MessageCircle, Check, Heart, X, ThumbsUp, ThumbsDown } from "lucide-react";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
import StoreLogo from "@/components/StoreLogo";
import { toast } from "sonner";
import {
  AGE_RANGES, GENDER_OPTIONS, OCCUPATION_OPTIONS,
  BUDGET_OPTIONS, STYLE_OPTIONS, STORE_OPTIONS, COUNTRY_STORE_MAP,
} from "../../../shared/fashionTypes";
import InfluencerPicker from "@/components/InfluencerPicker";
import SocialConnectionsStep from "@/components/SocialConnectionsStep";
import PhoneInput from "@/components/PhoneInput";
import { useLanguage } from "@/i18n";
import { translations } from "@/i18n/translations";
import { useCountry } from "@/hooks/useCountry";
import { getCountryFlag, getCountryName } from "../../../shared/countries";

/* ═══════════════════════════════════════════════════════
   CDN image assets
   ═══════════════════════════════════════════════════════ */
const ATMOSPHERE_IMAGES = {
  office: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-office-fqPQ4oAa8X3iShHuET3Cdy.webp",
  bar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-bar-5MJwjLCQJrfxjQ6ti2qjmf.webp",
  beach: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-beach-Z3UMQAPUAZtzhUft3aybqi.webp",
  event: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/onboard-event-eRxEaMR4kREV4TDeADMLU7.webp",
} as const;

/* ═══════════════════════════════════════════════════════
   Tinder Round 1 — 6 gender-neutral outfit cards
   ═══════════════════════════════════════════════════════ */
type StyleId = "streetwear" | "smart-casual" | "classic" | "boho" | "minimalist" | "athleisure";

interface OutfitCard {
  id: string;
  styleId: StyleId;
  image: string;
  label: { he: string; en: string };
  styleTags: string[];
}

const TINDER_R1: OutfitCard[] = [
  {
    id: "r1-streetwear",
    styleId: "streetwear",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-1-streetwear-Q3kCijXmT6HPiBdFJSCiPZ.webp",
    label: { he: "סטריטוור", en: "Streetwear" },
    styleTags: ["streetwear", "smart-casual"],
  },
  {
    id: "r1-smart-casual",
    styleId: "smart-casual",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-2-smartcasual-bDfRm8HYjtbdg8vsdRyp3Y.webp",
    label: { he: "סמארט קז'ואל", en: "Smart Casual" },
    styleTags: ["smart-casual", "classic"],
  },
  {
    id: "r1-classic",
    styleId: "classic",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-3-classic-PyACqETcKvWTww3AWVcCwu.webp",
    label: { he: "קלאסי", en: "Classic" },
    styleTags: ["classic", "minimalist"],
  },
  {
    id: "r1-boho",
    styleId: "boho",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-4-boho-CjMBTzNDhhetykDxjTKgQf.webp",
    label: { he: "בוהו", en: "Boho" },
    styleTags: ["boho", "vintage"],
  },
  {
    id: "r1-minimalist",
    styleId: "minimalist",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-5-minimalist-U6WZ4ZpJyJ7P2RmCABRMzQ.webp",
    label: { he: "מינימליסטי", en: "Minimalist" },
    styleTags: ["minimalist", "classic"],
  },
  {
    id: "r1-athleisure",
    styleId: "athleisure",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-6-athleisure-kMkx3BjdFratffLMVocVnd.webp",
    label: { he: "אתלי'זר", en: "Athleisure" },
    styleTags: ["sporty", "streetwear"],
  },
];

/* ═══════════════════════════════════════════════════════
   Tinder Round 2 — Reinforcement pool (3 per style)
   ═══════════════════════════════════════════════════════ */
const REINFORCE_POOL: Record<StyleId, OutfitCard[]> = {
  streetwear: [
    { id: "r2-streetwear-1", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-streetwear-1-6NSFq3xqPbLn5eEJ9idWQw.webp", label: { he: "סטריטוור אורבני", en: "Urban Streetwear" }, styleTags: ["streetwear"] },
    { id: "r2-streetwear-2", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-streetwear-2-bryCz9y9WCxGjmraimqTsE.webp", label: { he: "סטריטוור מודרני", en: "Modern Streetwear" }, styleTags: ["streetwear"] },
    { id: "r2-streetwear-3", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-streetwear-3-YtigzyUVUACQZt5G2RT9KK.webp", label: { he: "סטריטוור קלאסי", en: "Classic Streetwear" }, styleTags: ["streetwear"] },
  ],
  "smart-casual": [
    { id: "r2-smartcasual-1", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-smartcasual-1-jpHh8rcuQZZ39XJ2mm4frC.webp", label: { he: "סמארט קז'ואל עירוני", en: "Urban Smart Casual" }, styleTags: ["smart-casual"] },
    { id: "r2-smartcasual-2", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-smartcasual-2-kepHqFMwi4S8b6Renb8Ekv.webp", label: { he: "סמארט קז'ואל מלוטש", en: "Polished Smart Casual" }, styleTags: ["smart-casual"] },
    { id: "r2-smartcasual-3", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-smartcasual-3-GubjBJ3fjzSM3Gmrky5tHz.webp", label: { he: "סמארט קז'ואל קליל", en: "Light Smart Casual" }, styleTags: ["smart-casual"] },
  ],
  classic: [
    { id: "r2-classic-1", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-classic-1-GCkLdJ4JFc7b6nfyN26TFP.webp", label: { he: "קלאסי מחויט", en: "Tailored Classic" }, styleTags: ["classic"] },
    { id: "r2-classic-2", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-classic-2-UFHwoELBMAQridP8X43nEn.webp", label: { he: "קלאסי מודרני", en: "Modern Classic" }, styleTags: ["classic"] },
    { id: "r2-classic-3", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-classic-3-fgACT9g8wtXyqfJSfRFQpD.webp", label: { he: "קלאסי אלגנטי", en: "Elegant Classic" }, styleTags: ["classic"] },
  ],
  boho: [
    { id: "r2-boho-1", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-boho-1-GgLp387ohPmDAKRXTb8Xoe.webp", label: { he: "בוהו טבעי", en: "Natural Boho" }, styleTags: ["boho"] },
    { id: "r2-boho-2", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-boho-2-4xNrkvYUevPEsHttKZoEHA.webp", label: { he: "בוהו שיק", en: "Boho Chic" }, styleTags: ["boho"] },
    { id: "r2-boho-3", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-boho-3-cWs4F7njvuqjF8zbP7W295.webp", label: { he: "בוהו פסטיבלי", en: "Festival Boho" }, styleTags: ["boho"] },
  ],
  minimalist: [
    { id: "r2-minimalist-1", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-minimalist-1-kDvmLafPoanWATUhoBDfyA.webp", label: { he: "מינימליסט נקי", en: "Clean Minimalist" }, styleTags: ["minimalist"] },
    { id: "r2-minimalist-2", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-minimalist-2-nR7L7vtdqWtH5oZCw5cor6.webp", label: { he: "מינימליסט כהה", en: "Dark Minimalist" }, styleTags: ["minimalist"] },
    { id: "r2-minimalist-3", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-minimalist-3-dENNrDiY5rHgrYSq4vGuje.webp", label: { he: "מינימליסט אדמה", en: "Earth Minimalist" }, styleTags: ["minimalist"] },
  ],
  athleisure: [
    { id: "r2-athleisure-1", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-athleisure-1-5ZGqvUspq5cYvF5AcpyfMR.webp", label: { he: "אתלי'זר ספורטיבי", en: "Sporty Athleisure" }, styleTags: ["athleisure"] },
    { id: "r2-athleisure-2", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-athleisure-2-56WXC2nvtEZeg2DqDRB5vn.webp", label: { he: "אתלי'זר אורבני", en: "Urban Athleisure" }, styleTags: ["athleisure"] },
    { id: "r2-athleisure-3", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-athleisure-3-hy6K3nbwFZ5ELerPXw5FmZ.webp", label: { he: "אתלי'זר רטרו", en: "Retro Athleisure" }, styleTags: ["athleisure"] },
  ],
};

/* ═══════════════════════════════════════════════════════
   Taste Scoring System
   R1 like = +1, R1 pass = -1
   R2 like = +2, R2 pass = -2
   R2 negative card: like = +1 (surprise), pass = -3 (strong reject)
   ═══════════════════════════════════════════════════════ */
interface TasteScores {
  [styleId: string]: number;
}

function computeTasteScores(
  r1Likes: string[],
  r1Passes: string[],
  r2Likes: string[],
  r2Passes: string[],
  r2NegativeCardId: string | null,
  r2Cards: OutfitCard[],
): TasteScores {
  const scores: TasteScores = {};
  const allStyles: StyleId[] = ["streetwear", "smart-casual", "classic", "boho", "minimalist", "athleisure"];
  allStyles.forEach(s => { scores[s] = 0; });

  // R1 scoring
  TINDER_R1.forEach(card => {
    const pts = r1Likes.includes(card.id) ? 1 : -1;
    card.styleTags.forEach(tag => {
      if (scores[tag] !== undefined) scores[tag] += pts;
    });
  });

  // R2 scoring
  r2Cards.forEach(card => {
    const isNegative = card.id === r2NegativeCardId;
    const liked = r2Likes.includes(card.id);
    const pts = isNegative
      ? (liked ? 1 : -3)  // negative card: surprise like vs strong reject
      : (liked ? 2 : -2); // reinforcement card: double weight
    card.styleTags.forEach(tag => {
      if (scores[tag] !== undefined) scores[tag] += pts;
    });
  });

  return scores;
}

function getTopStyles(scores: TasteScores, count = 3): string[] {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .filter(([, v]) => v > 0)
    .map(([k]) => k);
}

/* ═══════════════════════════════════════════════════════
   Build adaptive R2 deck: 3 reinforcement + 1 negative
   ═══════════════════════════════════════════════════════ */
function buildR2Deck(r1Likes: string[], r1Passes: string[]): { cards: OutfitCard[]; negativeId: string } {
  // Count likes per style from R1
  const styleLikeCounts: Record<StyleId, number> = {
    streetwear: 0, "smart-casual": 0, classic: 0, boho: 0, minimalist: 0, athleisure: 0,
  };
  r1Likes.forEach(cardId => {
    const card = TINDER_R1.find(c => c.id === cardId);
    if (card) styleLikeCounts[card.styleId]++;
  });

  // Rank liked styles (descending)
  const likedStyles = (Object.entries(styleLikeCounts) as [StyleId, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([style]) => style);

  // Rank passed styles for negative card
  const passedStyles = (Object.entries(styleLikeCounts) as [StyleId, number][])
    .filter(([, count]) => count === 0)
    .map(([style]) => style);

  // Build 3 reinforcement cards distributed by like count
  const reinforceCards: OutfitCard[] = [];
  const usedPools: Record<string, number> = {};

  if (likedStyles.length === 0) {
    // Edge case: user liked nothing — pick random 3
    const shuffled = [...(Object.keys(REINFORCE_POOL) as StyleId[])].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      const pool = REINFORCE_POOL[shuffled[i]];
      reinforceCards.push(pool[0]);
      usedPools[shuffled[i]] = 1;
    }
  } else if (likedStyles.length === 1) {
    // 1 liked style → 3 reinforcements from that style
    const pool = REINFORCE_POOL[likedStyles[0]];
    reinforceCards.push(pool[0], pool[1], pool[2]);
  } else if (likedStyles.length === 2) {
    // 2 liked styles → 2 from top, 1 from second
    const pool1 = REINFORCE_POOL[likedStyles[0]];
    const pool2 = REINFORCE_POOL[likedStyles[1]];
    reinforceCards.push(pool1[0], pool1[1], pool2[0]);
  } else {
    // 3+ liked styles → 1 from each of top 3 (or 2+1 if top is dominant)
    const topCount = styleLikeCounts[likedStyles[0]];
    const secondCount = styleLikeCounts[likedStyles[1]];
    if (topCount > secondCount) {
      // Dominant top style gets 2
      reinforceCards.push(REINFORCE_POOL[likedStyles[0]][0], REINFORCE_POOL[likedStyles[0]][1]);
      reinforceCards.push(REINFORCE_POOL[likedStyles[1]][0]);
    } else {
      // Even distribution
      reinforceCards.push(REINFORCE_POOL[likedStyles[0]][0]);
      reinforceCards.push(REINFORCE_POOL[likedStyles[1]][0]);
      reinforceCards.push(REINFORCE_POOL[likedStyles[2]] ? REINFORCE_POOL[likedStyles[2]][0] : REINFORCE_POOL[likedStyles[0]][1]);
    }
  }

  // Pick 1 negative card from the least-liked / most-passed style
  let negativeStyle: StyleId;
  if (passedStyles.length > 0) {
    negativeStyle = passedStyles[Math.floor(Math.random() * passedStyles.length)];
  } else {
    // All styles were liked — pick the least liked
    negativeStyle = likedStyles[likedStyles.length - 1];
  }
  const negPool = REINFORCE_POOL[negativeStyle];
  // Use the last card in the pool (least likely to have been seen)
  const negativeCard = negPool[negPool.length - 1];

  // Shuffle the 4 cards (3 reinforce + 1 negative) so negative isn't always last
  const allCards = [...reinforceCards, negativeCard];
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }

  return { cards: allCards, negativeId: negativeCard.id };
}

/* ═══════════════════════════════════════════════════════
   Phase A = visual intro (3 screens: venue → tinder R1 → tinder R2)
   Phase B = existing detailed steps (occupation, budget, style, stores, influencers)
   ═══════════════════════════════════════════════════════ */
const PHASE_A_STEPS = 3;
const PHASE_B_STEPS = 5;

export default function Onboarding() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1); // 1-3 = Phase A, 4-8 = Phase B
  const [saving, setSaving] = useState(false);
  const { t, dir, lang } = useLanguage();

  /* ── Phase A state ── */
  const [selectedVenue, setSelectedVenue] = useState(""); // office | bar | beach | event

  // Tinder R1
  const [r1Likes, setR1Likes] = useState<string[]>([]);
  const [r1Passes, setR1Passes] = useState<string[]>([]);
  const [r1Index, setR1Index] = useState(0);
  const [r1Done, setR1Done] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  // Tinder R2 (adaptive)
  const [r2Cards, setR2Cards] = useState<OutfitCard[]>([]);
  const [r2NegativeId, setR2NegativeId] = useState<string | null>(null);
  const [r2Likes, setR2Likes] = useState<string[]>([]);
  const [r2Passes, setR2Passes] = useState<string[]>([]);
  const [r2Index, setR2Index] = useState(0);
  const [r2Done, setR2Done] = useState(false);
  const [r2SwipeDirection, setR2SwipeDirection] = useState<"left" | "right" | null>(null);

  /* ── Phase B state ── */
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [occupation, setOccupation] = useState("");
  const [budgetLevel, setBudgetLevel] = useState("");
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);
  const [customInfluencer, setCustomInfluencer] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [customStore, setCustomStore] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const { country: detectedCountry } = useCountry();
  const utils = trpc.useUtils();
  const saveProfileMutation = trpc.profile.save.useMutation();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Country-specific local stores
  const countryData = useMemo(() => {
    if (!detectedCountry) return null;
    return COUNTRY_STORE_MAP[detectedCountry] || null;
  }, [detectedCountry]);

  const filteredLocalStores = useMemo(() => {
    if (!countryData) return [];
    return countryData.stores.filter(s => {
      const genderMatch = !gender || s.gender === "unisex" || s.gender === gender;
      const budgetMatch = !budgetLevel || s.budget.some(b => {
        const adjacent: Record<string, string[]> = {
          "budget": ["budget", "mid-range"],
          "mid-range": ["budget", "mid-range", "premium"],
          "premium": ["mid-range", "premium", "luxury"],
          "luxury": ["premium", "luxury"],
        };
        const allowed = adjacent[budgetLevel] || [budgetLevel];
        return allowed.includes(b);
      });
      return genderMatch && budgetMatch;
    });
  }, [countryData, gender, budgetLevel]);

  const localStoreNames = useMemo(() => {
    return new Set(filteredLocalStores.map(s => s.name));
  }, [filteredLocalStores]);

  const recommendedStores = useMemo(() =>
    STORE_OPTIONS.filter(s => s.budget === budgetLevel),
    [budgetLevel]
  );
  const otherStores = useMemo(() =>
    STORE_OPTIONS.filter(s => s.budget !== budgetLevel),
    [budgetLevel]
  );

  const toggleInfluencer = (name: string) => {
    setSelectedInfluencers(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const addCustomInfluencer = () => {
    const trimmed = customInfluencer.trim();
    if (trimmed && !selectedInfluencers.includes(trimmed)) {
      setSelectedInfluencers(prev => [...prev, trimmed]);
      setCustomInfluencer("");
    }
  };

  const toggleStore = (label: string) => {
    setSelectedStores(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  const addCustomStore = () => {
    const trimmed = customStore.trim();
    if (trimmed && !selectedStores.includes(trimmed)) {
      setSelectedStores(prev => [...prev, trimmed]);
      setCustomStore("");
    }
  };

  /* ── Map venue → occupation hint ── */
  const mapVenueToOccupation = useCallback((venue: string): string => {
    switch (venue) {
      case "office": return "corporate";
      case "bar": return "creative";
      case "beach": return "freelance";
      case "event": return "entrepreneur";
      default: return "";
    }
  }, []);

  /* ── Taste scores (computed after both rounds) ── */
  const tasteScores = useMemo(() => {
    if (!r2Done) return null;
    return computeTasteScores(r1Likes, r1Passes, r2Likes, r2Passes, r2NegativeId, r2Cards);
  }, [r2Done, r1Likes, r1Passes, r2Likes, r2Passes, r2NegativeId, r2Cards]);

  const topStyles = useMemo(() => {
    if (!tasteScores) return [];
    return getTopStyles(tasteScores);
  }, [tasteScores]);

  /* ── R1 Swipe handler ── */
  const handleR1Swipe = useCallback((direction: "left" | "right") => {
    const currentCard = TINDER_R1[r1Index];
    if (!currentCard) return;

    setSwipeDirection(direction);

    if (direction === "right") {
      setR1Likes(prev => [...prev, currentCard.id]);
    } else {
      setR1Passes(prev => [...prev, currentCard.id]);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      if (r1Index < TINDER_R1.length - 1) {
        setR1Index(prev => prev + 1);
      } else {
        setR1Done(true);
      }
    }, 350);
  }, [r1Index]);

  /* ── Build R2 deck when R1 finishes ── */
  useEffect(() => {
    if (r1Done && r2Cards.length === 0) {
      const { cards, negativeId } = buildR2Deck(r1Likes, r1Passes);
      setR2Cards(cards);
      setR2NegativeId(negativeId);
    }
  }, [r1Done, r1Likes, r1Passes, r2Cards.length]);

  /* ── R2 Swipe handler ── */
  const handleR2Swipe = useCallback((direction: "left" | "right") => {
    const currentCard = r2Cards[r2Index];
    if (!currentCard) return;

    setR2SwipeDirection(direction);

    if (direction === "right") {
      setR2Likes(prev => [...prev, currentCard.id]);
    } else {
      setR2Passes(prev => [...prev, currentCard.id]);
    }

    setTimeout(() => {
      setR2SwipeDirection(null);
      if (r2Index < r2Cards.length - 1) {
        setR2Index(prev => prev + 1);
      } else {
        setR2Done(true);
      }
    }, 350);
  }, [r2Index, r2Cards]);

  /* ── Touch swipe support ── */
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const makeHandleTouchEnd = (swipeFn: (dir: "left" | "right") => void) => (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
      swipeFn(deltaX > 0 ? "right" : "left");
    }
  };

  /* ── Auto-advance from R1 done → R2 (step stays at 2, sub-screen changes) ── */
  /* ── Auto-advance from R2 done → step 3 (finish screen) ── */

  const handleFinish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const mergedStylePrefs = stylePreferences.length > 0
        ? stylePreferences
        : topStyles.length > 0
        ? topStyles
        : [];
      const mergedOccupation = occupation || mapVenueToOccupation(selectedVenue);

      const result = await saveProfileMutation.mutateAsync({
        ageRange: ageRange || undefined,
        gender: gender || undefined,
        occupation: mergedOccupation || undefined,
        budgetLevel: budgetLevel || undefined,
        stylePreference: mergedStylePrefs.length > 0 ? mergedStylePrefs.join(", ") : undefined,
        favoriteInfluencers: selectedInfluencers.length > 0 ? selectedInfluencers.join(", ") : undefined,
        preferredStores: selectedStores.length > 0 ? selectedStores.join(", ") : undefined,
        saveToWardrobe: true,
        onboardingCompleted: true,
        country: detectedCountry || undefined,
        phoneNumber: phoneNumber || undefined,
      });
      if (phoneNumber && result.whatsAppWelcomeSent) {
        setSaving(false);
        setShowWhatsAppModal(true);
        return;
      }
      window.location.href = "/upload";
    } catch (err: any) {
      const errorMsg = err?.message || t("onboarding", "saveError");
      setSaveError(errorMsg);
      toast.error(t("onboarding", "saveError") + ": " + errorMsg);
      setSaving(false);
    }
  };

  /* ── Quick finish after Phase A ── */
  const handleQuickFinish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const mergedOccupation = mapVenueToOccupation(selectedVenue);

      await saveProfileMutation.mutateAsync({
        occupation: mergedOccupation || undefined,
        stylePreference: topStyles.length > 0 ? topStyles.join(", ") : undefined,
        saveToWardrobe: true,
        onboardingCompleted: true,
        country: detectedCountry || undefined,
      });
      window.location.href = "/upload";
    } catch (err: any) {
      toast.error(lang === "he" ? "שגיאה בשמירה" : "Save error");
      setSaving(false);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 1: return !!selectedVenue;                   // Phase A: venue
      case 2: return r2Done;                            // Phase A: both tinder rounds done
      case 3: return true;                              // Phase A: finish screen
      case 4: return !!occupation && !!budgetLevel;     // Phase B: occupation + budget
      case 5: return stylePreferences.length > 0;       // Phase B: style
      case 6: return true;                              // Phase B: stores (optional)
      case 7: return true;                              // Phase B: social (optional)
      case 8: return true;                              // Phase B: influencers (optional)
      default: return false;
    }
  };

  // Translation helpers
  const getGenderLabel = (id: string) => {
    const val = t("genderOptions", id);
    return val !== id ? val : (GENDER_OPTIONS.find(g => g.id === id)?.label || id);
  };
  const getOccupationLabel = (id: string) => {
    const val = t("occupationOptions", id);
    return val !== id ? val : (OCCUPATION_OPTIONS.find(o => o.id === id)?.label || id);
  };
  const getBudgetLabel = (id: string) => {
    const sec = (translations as any).budgetOptions?.[id];
    if (sec?.label?.[lang]) return sec.label[lang];
    return BUDGET_OPTIONS.find(b => b.id === id)?.label || id;
  };
  const getBudgetRange = (id: string) => {
    const sec = (translations as any).budgetOptions?.[id];
    if (sec?.range?.[lang]) return sec.range[lang];
    return BUDGET_OPTIONS.find(b => b.id === id)?.range || "";
  };
  const getStyleLabel = (id: string) => {
    const sec = (translations as any).styleOptions?.[id];
    if (sec?.label?.[lang]) return sec.label[lang];
    return STYLE_OPTIONS.find(s => s.id === id)?.label || id;
  };
  const getStyleDesc = (id: string) => {
    const sec = (translations as any).styleOptions?.[id];
    if (sec?.desc?.[lang]) return sec.desc[lang];
    return STYLE_OPTIONS.find(s => s.id === id)?.description || "";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FashionSpinner size="lg" />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "";
  const isRtl = dir === "rtl";
  const textAlign = isRtl ? "text-right" : "text-left";
  const isPhaseA = step <= PHASE_A_STEPS;
  const isPhaseB = step > PHASE_A_STEPS;
  const phaseBStep = step - PHASE_A_STEPS;

  /* ═══════════════════════════════════════════════════════
     Stylist reaction messages
     ═══════════════════════════════════════════════════════ */
  const getStylistReaction = () => {
    if (step === 2) {
      if (!r1Done) {
        const venueReactions: Record<string, { he: string; en: string }> = {
          office: { he: "אופיס שיק — עכשיו בואו נראה מה מדבר אליך", en: "Office chic — now let's see what speaks to you" },
          bar: { he: "ערב בחוץ? בואו נראה מה הסגנון שלך", en: "Night out? Let's see your style" },
          beach: { he: "וייב חופשי — עכשיו סוויפ!", en: "Free vibes — now swipe!" },
          event: { he: "אירוע? הולכים על WOW — סוויפ!", en: "Event? Going for WOW — swipe!" },
        };
        const r = venueReactions[selectedVenue];
        return r ? r[lang] || r.en : "";
      }
      if (r1Done && !r2Done) {
        const likeCount = r1Likes.length;
        if (likeCount === 0) return lang === "he" ? "מעניין... עכשיו בוא/י נדייק" : "Interesting... let's refine";
        if (likeCount <= 2) return lang === "he" ? "סלקטיבי! עכשיו עוד 4 לחיזוק" : "Selective! 4 more to refine";
        return lang === "he" ? "יש לך טעם! עכשיו נחזק את זה" : "Great taste! Let's reinforce";
      }
    }
    if (step === 3 && tasteScores) {
      const top = topStyles[0];
      const styleNames: Record<string, { he: string; en: string }> = {
        streetwear: { he: "סטריטוור", en: "Streetwear" },
        "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual" },
        classic: { he: "קלאסי", en: "Classic" },
        boho: { he: "בוהו", en: "Boho" },
        minimalist: { he: "מינימליסט", en: "Minimalist" },
        athleisure: { he: "אתלי'זר", en: "Athleisure" },
      };
      if (top && styleNames[top]) {
        return lang === "he"
          ? `הסגנון שלך: ${styleNames[top].he}! אני כבר רואה את הכיוון`
          : `Your style: ${styleNames[top].en}! I see the direction`;
      }
      return lang === "he" ? "יש לך טעם מעולה!" : "You have great taste!";
    }
    return "";
  };

  /* ═══════════════════════════════════════════════════════
     Shared Tinder Card Component
     ═══════════════════════════════════════════════════════ */
  const TinderCard = ({
    card,
    index,
    total,
    direction,
    onSwipe,
    onTouchStartFn,
    onTouchEndFn,
    roundLabel,
  }: {
    card: OutfitCard;
    index: number;
    total: number;
    direction: "left" | "right" | null;
    onSwipe: (dir: "left" | "right") => void;
    onTouchStartFn: (e: React.TouchEvent) => void;
    onTouchEndFn: (e: React.TouchEvent) => void;
    roundLabel: string;
  }) => (
    <div className="relative mx-auto" style={{ maxWidth: 320 }}>
      <div
        onTouchStart={onTouchStartFn}
        onTouchEnd={onTouchEndFn}
        className={`relative rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl transition-all duration-300 ${
          direction === "right"
            ? "translate-x-[120%] rotate-12 opacity-0"
            : direction === "left"
            ? "-translate-x-[120%] -rotate-12 opacity-0"
            : ""
        }`}
      >
        {/* Like/Nope overlays */}
        {direction === "right" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-green-500/20">
            <div className="border-4 border-green-400 text-green-400 px-6 py-2 rounded-xl text-3xl font-black rotate-[-20deg]">
              LIKE
            </div>
          </div>
        )}
        {direction === "left" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/20">
            <div className="border-4 border-red-400 text-red-400 px-6 py-2 rounded-xl text-3xl font-black rotate-[20deg]">
              NOPE
            </div>
          </div>
        )}

        <div className="aspect-[3/4] relative">
          <img
            src={card.image}
            alt={card.label.en}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute bottom-4 inset-x-0 text-center">
            <span className="text-xl font-bold text-white drop-shadow-lg">
              {card.label[lang] || card.label.en}
            </span>
          </div>
        </div>
      </div>

      {/* Swipe buttons */}
      <div className="flex items-center justify-center gap-8 mt-5">
        <button
          onClick={() => onSwipe("left")}
          className="w-14 h-14 rounded-full border-2 border-red-400/50 bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-90"
        >
          <X className="w-7 h-7 text-red-400" />
        </button>
        <button
          onClick={() => onSwipe("right")}
          className="w-16 h-16 rounded-full border-2 border-green-400/50 bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 hover:border-green-400 transition-all active:scale-90"
        >
          <Heart className="w-8 h-8 text-green-400" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i < index
                ? "w-4 bg-primary/60"
                : i === index
                ? "w-6 bg-primary"
                : "w-3 bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Round label */}
      <div className="text-center mt-2">
        <span className="text-xs text-muted-foreground">{roundLabel}</span>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     Taste Score Visual Bar
     ═══════════════════════════════════════════════════════ */
  const TasteScoreBar = ({ scores }: { scores: TasteScores }) => {
    const maxScore = Math.max(...Object.values(scores).map(Math.abs), 1);
    const styleNames: Record<string, { he: string; en: string }> = {
      streetwear: { he: "סטריטוור", en: "Streetwear" },
      "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual" },
      classic: { he: "קלאסי", en: "Classic" },
      boho: { he: "בוהו", en: "Boho" },
      minimalist: { he: "מינימליסט", en: "Minimalist" },
      athleisure: { he: "אתלי'זר", en: "Athleisure" },
    };
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-2 w-full max-w-sm mx-auto">
        {sorted.map(([style, score]) => {
          const pct = Math.abs(score) / maxScore * 100;
          const isPositive = score > 0;
          return (
            <div key={style} className="flex items-center gap-2">
              <span className="text-xs w-24 text-end truncate text-muted-foreground">
                {styleNames[style]?.[lang] || style}
              </span>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isPositive
                      ? "bg-gradient-to-r from-primary to-green-400"
                      : "bg-gradient-to-r from-red-500/50 to-red-400/30"
                  }`}
                  style={{ width: `${Math.max(pct, 5)}%` }}
                />
              </div>
              <span className={`text-xs font-mono w-8 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {score > 0 ? "+" : ""}{score}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir={dir}>
      {/* WhatsApp Onboarding Modal */}
      <WhatsAppOnboardingModal
        open={showWhatsAppModal}
        onClose={() => { window.location.href = "/upload"; }}
        phoneNumber={phoneNumber}
      />

      {/* Progress bar — dots for Phase A, linear for Phase B */}
      <div className="fixed top-0 left-0 right-0 z-50">
        {isPhaseA ? (
          <div className="flex items-center justify-center gap-2 pt-6 pb-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`rounded-full transition-all duration-500 ${
                  i === step
                    ? "w-8 h-2 bg-primary"
                    : i < step
                    ? "w-2 h-2 bg-primary/60"
                    : "w-2 h-2 bg-white/20"
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="h-1 bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-primary to-rose-500 transition-all duration-500"
              style={{ width: `${(phaseBStep / PHASE_B_STEPS) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className={`w-full ${isPhaseA ? "max-w-md" : "max-w-lg"}`}>

          {/* ═══════════════════════════════════════════
              PHASE A — Visual Intro (3 screens)
              ═══════════════════════════════════════════ */}

          {/* ── Screen 1: Venue / Atmosphere ── */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="mb-2">
                <Sparkles className="w-6 h-6 text-primary mx-auto mb-3" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {firstName
                  ? (lang === "he" ? `היי ${firstName}!` : `Hey ${firstName}!`)
                  : (lang === "he" ? "היי!" : "Hey!")}
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-primary mb-1">
                {lang === "he" ? "הסטייליסטית שלך רוצה להכיר אותך" : "Your stylist wants to get to know you"}
              </p>
              <p className="text-muted-foreground text-sm mb-8">
                {lang === "he" ? "בלי טקסט, רק טאפ וסוויפ" : "No typing, just tap & swipe"}
              </p>

              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {lang === "he" ? "לאן הולכים הכי הרבה?" : "Where do you go most?"}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {lang === "he" ? "בחר/י את הסביבה שהכי מתאימה לך" : "Pick the environment that fits you best"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {(["office", "bar", "beach", "event"] as const).map(venue => {
                  const isSelected = selectedVenue === venue;
                  const imgUrl = ATMOSPHERE_IMAGES[venue];
                  const labels: Record<string, { he: string; en: string }> = {
                    office: { he: "משרד", en: "Office" },
                    bar: { he: "בר / ערב", en: "Bar / Night" },
                    beach: { he: "חוף / חופש", en: "Beach / Chill" },
                    event: { he: "אירוע", en: "Event" },
                  };
                  const emojis: Record<string, string> = {
                    office: "💼",
                    bar: "🍸",
                    beach: "🏖️",
                    event: "✨",
                  };
                  return (
                    <button
                      key={venue}
                      onClick={() => {
                        setSelectedVenue(venue);
                        setTimeout(() => setStep(2), 500);
                      }}
                      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? "border-primary scale-105 shadow-lg shadow-primary/20"
                          : "border-white/10 hover:border-primary/30 hover:scale-102"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="aspect-square relative">
                        <img
                          src={imgUrl}
                          alt={labels[venue]?.en || venue}
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl mb-1">{emojis[venue]}</span>
                          <span className="text-sm font-bold text-white drop-shadow-lg">
                            {labels[venue]?.[lang] || labels[venue]?.en}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Screen 2: Tinder R1 (6 cards) + R2 (4 adaptive cards) ── */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              {/* Stylist reaction */}
              {getStylistReaction() && (
                <div className="mb-4 animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-primary">{getStylistReaction()}</span>
                  </div>
                </div>
              )}

              {/* R1: 6 cards */}
              {!r1Done && (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1">
                    {lang === "he" ? "מה מדבר אליך?" : "What speaks to you?"}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    {lang === "he"
                      ? `סוויפ ימינה = אוהב/ת ❤️ | שמאלה = לא בשבילי ✕`
                      : `Swipe right = love ❤️ | left = nope ✕`}
                  </p>

                  <TinderCard
                    card={TINDER_R1[r1Index]}
                    index={r1Index}
                    total={TINDER_R1.length}
                    direction={swipeDirection}
                    onSwipe={handleR1Swipe}
                    onTouchStartFn={handleTouchStart}
                    onTouchEndFn={makeHandleTouchEnd(handleR1Swipe)}
                    roundLabel={lang === "he" ? `סבב 1 — ${r1Index + 1}/${TINDER_R1.length}` : `Round 1 — ${r1Index + 1}/${TINDER_R1.length}`}
                  />
                </>
              )}

              {/* Transition: R1 done → R2 loading */}
              {r1Done && r2Cards.length === 0 && (
                <div className="py-12">
                  <FashionSpinner size="lg" />
                  <p className="text-muted-foreground text-sm mt-4">
                    {lang === "he" ? "מכין לך חיזוקים..." : "Preparing reinforcements..."}
                  </p>
                </div>
              )}

              {/* R2: 4 adaptive cards */}
              {r1Done && r2Cards.length > 0 && !r2Done && (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1">
                    {lang === "he" ? "עוד קצת לדיוק..." : "A few more to refine..."}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    {lang === "he"
                      ? "4 לוקים אחרונים — חיזוק הטעם שלך"
                      : "4 final looks — reinforcing your taste"}
                  </p>

                  <TinderCard
                    card={r2Cards[r2Index]}
                    index={r2Index}
                    total={r2Cards.length}
                    direction={r2SwipeDirection}
                    onSwipe={handleR2Swipe}
                    onTouchStartFn={handleTouchStart}
                    onTouchEndFn={makeHandleTouchEnd(handleR2Swipe)}
                    roundLabel={lang === "he" ? `סבב 2 — ${r2Index + 1}/${r2Cards.length}` : `Round 2 — ${r2Index + 1}/${r2Cards.length}`}
                  />
                </>
              )}

              {/* R2 done → auto-advance to step 3 */}
              {r2Done && (
                <div className="py-8 animate-in fade-in duration-500">
                  <div className="text-5xl mb-3">✨</div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    {lang === "he" ? "הטעם שלך מוכן!" : "Your taste profile is ready!"}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    {lang === "he" ? "עובר/ת לתוצאות..." : "Moving to results..."}
                  </p>
                  <Button onClick={() => setStep(3)} className="gap-2 rounded-xl">
                    <Sparkles className="w-4 h-4" />
                    {lang === "he" ? "הראו לי!" : "Show me!"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Screen 3: Taste Score Results + Quick Finish ── */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              {/* Stylist reaction */}
              {getStylistReaction() && (
                <div className="mb-4 animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-primary">{getStylistReaction()}</span>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="text-5xl mb-3">🎯</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  {lang === "he" ? "פרופיל הטעם שלך" : "Your Taste Profile"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {lang === "he"
                    ? `מבוסס על ${r1Likes.length + r2Likes.length} לייקים מתוך 10 לוקים`
                    : `Based on ${r1Likes.length + r2Likes.length} likes out of 10 looks`}
                </p>
              </div>

              {/* Taste Score Visualization */}
              {tasteScores && (
                <div className="mb-6">
                  <TasteScoreBar scores={tasteScores} />
                </div>
              )}

              {/* Top styles summary */}
              {topStyles.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {lang === "he" ? "הסגנונות המובילים שלך:" : "Your top styles:"}
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {topStyles.map(style => {
                      const styleNames: Record<string, { he: string; en: string }> = {
                        streetwear: { he: "סטריטוור", en: "Streetwear" },
                        "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual" },
                        classic: { he: "קלאסי", en: "Classic" },
                        boho: { he: "בוהו", en: "Boho" },
                        minimalist: { he: "מינימליסט", en: "Minimalist" },
                        athleisure: { he: "אתלי'זר", en: "Athleisure" },
                      };
                      return (
                        <span key={style} className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium border border-primary/30">
                          {styleNames[style]?.[lang] || style}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Terms consent */}
              <label className="flex items-start gap-3 mb-6 cursor-pointer group justify-center text-center">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 accent-primary flex-shrink-0"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                  {lang === "he" ? (
                    <>אני מאשר/ת את{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">תנאי השימוש</a>{" "}ואת{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">מדיניות הפרטיות</a></>
                  ) : (
                    <>I agree to the{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">Terms</a>{" "}and{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a></>
                  )}
                </span>
              </label>

              {/* Two CTA buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleQuickFinish}
                  disabled={saving || !agreedToTerms}
                  className="w-full gap-2 rounded-xl h-12 text-base font-bold"
                  size="lg"
                >
                  {saving ? (
                    <><FashionButtonSpinner /> {lang === "he" ? "שנייה..." : "One sec..."}</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> {lang === "he" ? "יאללה, תראו לי ציון!" : "Show me my score!"}</>
                  )}
                </Button>
                <button
                  onClick={() => setStep(4)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {lang === "he" ? "רוצה לדייק עוד? →" : "Want to fine-tune? →"}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              PHASE B — Detailed Steps (existing flow)
              ═══════════════════════════════════════════ */}

          {isPhaseB && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">
                  {t("onboarding", "stepOf")} {phaseBStep} {t("onboarding", "outOf")} {PHASE_B_STEPS}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {lang === "he" ? "ככל שנדייק יותר — הניתוח יהיה טוב יותר" : "The more we fine-tune — the better the analysis"}
              </p>
            </div>
          )}

          {/* ── Step 4 (Phase B-1): Occupation + Budget ── */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">{t("onboarding", "occupationTitle")}</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {OCCUPATION_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setOccupation(opt.id)}
                    className={`p-3 rounded-xl border ${textAlign} transition-all duration-200 ${
                      occupation === opt.id
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                    }`}
                  >
                    <span className="text-xl block mb-0.5">{opt.icon}</span>
                    <span className="text-sm font-medium">{getOccupationLabel(opt.id)}</span>
                  </button>
                ))}
              </div>

              {occupation && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-muted-foreground text-center text-sm mb-3">{t("onboarding", "budgetSubtitle")}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {BUDGET_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setBudgetLevel(opt.id)}
                        className={`p-3 rounded-xl border ${textAlign} transition-all duration-200 ${
                          budgetLevel === opt.id
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                            : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                        }`}
                      >
                        <span className="text-lg block mb-0.5">{opt.icon}</span>
                        <span className="font-medium block text-sm">{getBudgetLabel(opt.id)}</span>
                        <span className={`text-xs ${budgetLevel === opt.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {getBudgetRange(opt.id)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5 (Phase B-2): Style Preferences ── */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">{t("onboarding", "budgetStyleTitle")}</h2>
              <p className="text-muted-foreground text-center text-sm">
                {t("onboarding", "styleSubtitle")} <span className="text-primary/70">{t("onboarding", "multiSelect")}</span>
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {STYLE_OPTIONS.map(opt => {
                  const isSelected = stylePreferences.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setStylePreferences(prev =>
                          prev.includes(opt.id)
                            ? prev.filter(s => s !== opt.id)
                            : [...prev, opt.id]
                        );
                      }}
                      className={`p-3 rounded-xl border ${textAlign} transition-all duration-200 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                          : "bg-card border-white/10 hover:border-primary/30 text-foreground"
                      }`}
                    >
                      <span className="font-medium block text-sm">{getStyleLabel(opt.id)}</span>
                      <span className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {getStyleDesc(opt.id)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 6 (Phase B-3): Stores ── */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">{t("onboarding", "storesTitle")}</h2>
              <p className="text-muted-foreground text-center text-sm">{t("onboarding", "storesSubtitle")}</p>

              {/* Country-specific stores */}
              {detectedCountry && filteredLocalStores.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {getCountryFlag(detectedCountry)} {lang === "he" ? "חנויות מקומיות" : "Local stores"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {filteredLocalStores.slice(0, 8).map(store => {
                      const isSelected = selectedStores.includes(store.name);
                      return (
                        <button
                          key={store.name}
                          onClick={() => toggleStore(store.name)}
                          className={`p-2 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1 ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-white/10 hover:border-primary/30"
                          }`}
                        >
                          <StoreLogo name={store.name} size="sm" selected={isSelected} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Global stores */}
              {budgetLevel && recommendedStores.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {lang === "he" ? "מותגים מומלצים" : "Recommended brands"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {recommendedStores.filter(s => !localStoreNames.has(s.label)).slice(0, 8).map(store => {
                      const isSelected = selectedStores.includes(store.label);
                      return (
                        <button
                          key={store.id}
                          onClick={() => toggleStore(store.label)}
                          className={`p-2 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1 ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-white/10 hover:border-primary/30"
                          }`}
                        >
                          <StoreLogo name={store.label} size="sm" selected={isSelected} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom store */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customStore}
                  onChange={(e) => setCustomStore(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomStore()}
                  placeholder={t("onboarding", "addStore")}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                />
                <Button variant="outline" size="sm" onClick={addCustomStore} disabled={!customStore.trim()} className="rounded-lg">
                  {t("common", "add")}
                </Button>
              </div>

              {selectedStores.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedStores.map(name => (
                    <span
                      key={name}
                      onClick={() => toggleStore(name)}
                      className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs cursor-pointer hover:bg-primary/30 transition-colors"
                    >
                      {name} ✕
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 7 (Phase B-4): Social Connections ── */}
          {step === 7 && (
            <SocialConnectionsStep
              onInstagramClick={() => setStep(8)}
            />
          )}

          {/* ── Step 8 (Phase B-5): Influencers ── */}
          {step === 8 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-center">{t("onboarding", "influencerTitle")}</h2>
              <p className="text-muted-foreground text-center text-sm">
                {t("onboarding", "influencerSubtitle")}
              </p>

              <InfluencerPicker
                gender={gender || undefined}
                selectedInfluencers={selectedInfluencers}
                onToggle={toggleInfluencer}
                userProfile={{
                  ageRange: ageRange || null,
                  budgetLevel: budgetLevel || null,
                  stylePreference: stylePreferences.join(", ") || null,
                }}
              />

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInfluencer}
                  onChange={(e) => setCustomInfluencer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomInfluencer()}
                  placeholder={t("onboarding", "addInfluencer")}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                />
                <Button variant="outline" size="sm" onClick={addCustomInfluencer} disabled={!customInfluencer.trim()} className="rounded-lg">
                  {t("common", "add")}
                </Button>
              </div>

              {selectedInfluencers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedInfluencers.map(name => (
                    <span
                      key={name}
                      onClick={() => toggleInfluencer(name)}
                      className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs cursor-pointer hover:bg-primary/30 transition-colors"
                    >
                      {name} ✕
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Terms & Privacy consent on last Phase B step */}
          {step === PHASE_A_STEPS + PHASE_B_STEPS && !agreedToTerms && (
            <label className="flex items-start gap-3 mt-6 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 accent-primary"
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                {lang === "he" ? (
                  <>אני מאשר/ת את{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">תנאי השימוש</a>{" "}ואת{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">מדיניות הפרטיות</a>, כולל עיבוד תמונות באמצעות AI.</>
                ) : (
                  <>I agree to the{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>{" "}and{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>, including AI image processing.</>
                )}
              </span>
            </label>
          )}

          {/* Navigation buttons — Phase B only */}
          {isPhaseB && (
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                className="gap-2 rounded-xl"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {t("common", "back")}
              </Button>

              {step < PHASE_A_STEPS + PHASE_B_STEPS ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canGoNext()}
                  className="gap-2 rounded-xl"
                >
                  {t("common", "next")}
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={saving || !agreedToTerms}
                  className="gap-2 rounded-xl px-6"
                >
                  {saving ? (
                    <>
                      <FashionButtonSpinner />
                      {t("onboarding", "saving")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t("onboarding", "letsStart")}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Phase A back button (screen 2 only when not mid-swipe, screen 3) */}
          {isPhaseA && step > 1 && !(step === 2 && !r1Done) && !(step === 2 && r1Done && !r2Done) && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  if (step === 3) {
                    // Go back to tinder screen
                    setR2Done(false);
                    setR2Index(0);
                    setR2Likes([]);
                    setR2Passes([]);
                    setR2Cards([]);
                    setR2NegativeId(null);
                    setR1Done(false);
                    setR1Index(0);
                    setR1Likes([]);
                    setR1Passes([]);
                    setStep(2);
                  } else if (step === 2 && r2Done) {
                    // Reset R2 and go back to R1
                    setR2Done(false);
                    setR2Index(0);
                    setR2Likes([]);
                    setR2Passes([]);
                    setR2Cards([]);
                    setR2NegativeId(null);
                    setR1Done(false);
                    setR1Index(0);
                    setR1Likes([]);
                    setR1Passes([]);
                  } else {
                    setStep(s => s - 1);
                  }
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isRtl ? "→" : "←"} {t("common", "back")}
              </button>
            </div>
          )}

          {/* Skip button for optional Phase B steps */}
          {step === PHASE_A_STEPS + PHASE_B_STEPS && (
            <div className="text-center mt-4">
              <button
                onClick={handleFinish}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("onboarding", "skip")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
