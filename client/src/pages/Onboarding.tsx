import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import WhatsAppOnboardingModal from "@/components/WhatsAppOnboardingModal";
import { useLocation } from "wouter";
import { Sparkles, ChevronLeft, ChevronRight, Heart, X, Camera, Upload, MapPin, Globe, Store as StoreIcon, Check, LogIn, UserPlus } from "lucide-react";
import { getLoginUrl } from "@/const";
import FashionSpinner, { FashionButtonSpinner } from "@/components/FashionSpinner";
import StylingStudioAnimation from "@/components/StylingStudioAnimation";
import StoreLogo from "@/components/StoreLogo";
import { toast } from "sonner";
import {
  STORE_OPTIONS, COUNTRY_STORE_MAP,
} from "../../../shared/fashionTypes";
import InfluencerPicker from "@/components/InfluencerPicker";
import { useLanguage } from "@/i18n";
import { useCountry } from "@/hooks/useCountry";
import { getCountryFlag } from "../../../shared/countries";
import { useFingerprint } from "@/hooks/useFingerprint";
import { GuestTrialWall } from "@/components/GuestTrialWall";

/* ═══════════════════════════════════════════════════════
   CDN image assets — gender-specific Tinder R1
   ═══════════════════════════════════════════════════════ */
type StyleId = "streetwear" | "smart-casual" | "classic" | "boho" | "minimalist" | "athleisure";

interface OutfitCard {
  id: string;
  styleId: StyleId;
  image: string;
  label: { he: string; en: string };
  styleTags: string[];
}

const TINDER_R1_FEMALE: OutfitCard[] = [
  { id: "r1f-streetwear", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-f-streetwear-kY2wKEzHJkm8NN4qnqwGS3.webp", label: { he: "סטריטוור", en: "Streetwear" }, styleTags: ["streetwear", "smart-casual"] },
  { id: "r1f-smart-casual", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-f-smartcasual-Q3uU2Mvy3UdtsmraR9bXnr.webp", label: { he: "סמארט קז'ואל", en: "Smart Casual" }, styleTags: ["smart-casual", "classic"] },
  { id: "r1f-classic", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-f-classic-5WtRFZugqQR9mJypDFsxoa.webp", label: { he: "קלאסי", en: "Classic" }, styleTags: ["classic", "minimalist"] },
  { id: "r1f-boho", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-f-boho-WPnyvC5rzfukVTAtdLWw5u.webp", label: { he: "בוהו", en: "Boho" }, styleTags: ["boho", "vintage"] },
  { id: "r1f-minimalist", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-f-minimalist-jFH5hp6GQdcSQSsKj3pvEM.webp", label: { he: "מינימליסטי", en: "Minimalist" }, styleTags: ["minimalist", "classic"] },
  { id: "r1f-athleisure", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-f-athleisure-9ARSuxFgaNdRNkvoZojyP5.webp", label: { he: "אתלי'זר", en: "Athleisure" }, styleTags: ["sporty", "streetwear"] },
];

const TINDER_R1_MALE: OutfitCard[] = [
  { id: "r1m-streetwear", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-m-streetwear-HSMHBjgbFEqpvjSbJnB4jJ.webp", label: { he: "סטריטוור", en: "Streetwear" }, styleTags: ["streetwear", "smart-casual"] },
  { id: "r1m-smart-casual", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-m-smartcasual-LJqcA9gjgqWpTR8oRMNUR2.webp", label: { he: "סמארט קז'ואל", en: "Smart Casual" }, styleTags: ["smart-casual", "classic"] },
  { id: "r1m-classic", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-m-classic-5bFZkyUxuXVjrZpaw5XX4n.webp", label: { he: "קלאסי", en: "Classic" }, styleTags: ["classic", "minimalist"] },
  { id: "r1m-boho", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-m-boho-cfoC58Rmnw3vYuTpavAikk.webp", label: { he: "בוהו", en: "Boho" }, styleTags: ["boho", "vintage"] },
  { id: "r1m-minimalist", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-m-minimalist-BpF4u6jxDUHabKx7b98UVZ.webp", label: { he: "מינימליסטי", en: "Minimalist" }, styleTags: ["minimalist", "classic"] },
  { id: "r1m-athleisure", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-m-athleisure-EtoMDuUA8bNtoP8AKpjBR7.webp", label: { he: "אתלי'זר", en: "Athleisure" }, styleTags: ["sporty", "streetwear"] },
];

/* Fallback neutral deck (same as old) */
const TINDER_R1_NEUTRAL: OutfitCard[] = [
  { id: "r1-streetwear", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-1-streetwear-Q3kCijXmT6HPiBdFJSCiPZ.webp", label: { he: "סטריטוור", en: "Streetwear" }, styleTags: ["streetwear", "smart-casual"] },
  { id: "r1-smart-casual", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-2-smartcasual-bDfRm8HYjtbdg8vsdRyp3Y.webp", label: { he: "סמארט קז'ואל", en: "Smart Casual" }, styleTags: ["smart-casual", "classic"] },
  { id: "r1-classic", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-3-classic-PyACqETcKvWTww3AWVcCwu.webp", label: { he: "קלאסי", en: "Classic" }, styleTags: ["classic", "minimalist"] },
  { id: "r1-boho", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-4-boho-CjMBTzNDhhetykDxjTKgQf.webp", label: { he: "בוהו", en: "Boho" }, styleTags: ["boho", "vintage"] },
  { id: "r1-minimalist", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-5-minimalist-U6WZ4ZpJyJ7P2RmCABRMzQ.webp", label: { he: "מינימליסטי", en: "Minimalist" }, styleTags: ["minimalist", "classic"] },
  { id: "r1-athleisure", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/tinder-outfit-6-athleisure-kMkx3BjdFratffLMVocVnd.webp", label: { he: "אתלי'זר", en: "Athleisure" }, styleTags: ["sporty", "streetwear"] },
];

/* ═══════════════════════════════════════════════════════
   Tinder Round 2 — Reinforcement pool (3 per style)
   ═══════════════════════════════════════════════════════ */
const REINFORCE_POOL_MALE: Record<StyleId, OutfitCard[]> = {
  streetwear: [
    { id: "r2m-streetwear-1", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-streetwear-1-6NSFq3xqPbLn5eEJ9idWQw.webp", label: { he: "סטריטוור אורבני", en: "Urban Streetwear" }, styleTags: ["streetwear"] },
    { id: "r2m-streetwear-2", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-streetwear-2-bryCz9y9WCxGjmraimqTsE.webp", label: { he: "סטריטוור מודרני", en: "Modern Streetwear" }, styleTags: ["streetwear"] },
    { id: "r2m-streetwear-3", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-streetwear-3-YtigzyUVUACQZt5G2RT9KK.webp", label: { he: "סטריטוור קלאסי", en: "Classic Streetwear" }, styleTags: ["streetwear"] },
  ],
  "smart-casual": [
    { id: "r2m-smartcasual-1", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-smartcasual-1-jpHh8rcuQZZ39XJ2mm4frC.webp", label: { he: "סמארט קז'ואל עירוני", en: "Urban Smart Casual" }, styleTags: ["smart-casual"] },
    { id: "r2m-smartcasual-2", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-smartcasual-2-kepHqFMwi4S8b6Renb8Ekv.webp", label: { he: "סמארט קז'ואל מלוטש", en: "Polished Smart Casual" }, styleTags: ["smart-casual"] },
    { id: "r2m-smartcasual-3", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-smartcasual-3-GubjBJ3fjzSM3Gmrky5tHz.webp", label: { he: "סמארט קז'ואל קליל", en: "Light Smart Casual" }, styleTags: ["smart-casual"] },
  ],
  classic: [
    { id: "r2m-classic-1", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-classic-1-GCkLdJ4JFc7b6nfyN26TFP.webp", label: { he: "קלאסי מחויט", en: "Tailored Classic" }, styleTags: ["classic"] },
    { id: "r2m-classic-2", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-classic-2-UFHwoELBMAQridP8X43nEn.webp", label: { he: "קלאסי מודרני", en: "Modern Classic" }, styleTags: ["classic"] },
    { id: "r2m-classic-3", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-classic-3-fgACT9g8wtXyqfJSfRFQpD.webp", label: { he: "קלאסי אלגנטי", en: "Elegant Classic" }, styleTags: ["classic"] },
  ],
  boho: [
    { id: "r2m-boho-1", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-boho-1-GgLp387ohPmDAKRXTb8Xoe.webp", label: { he: "בוהו טבעי", en: "Natural Boho" }, styleTags: ["boho"] },
    { id: "r2m-boho-2", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-boho-2-4xNrkvYUevPEsHttKZoEHA.webp", label: { he: "בוהו שיק", en: "Boho Chic" }, styleTags: ["boho"] },
    { id: "r2m-boho-3", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-boho-3-cWs4F7njvuqjF8zbP7W295.webp", label: { he: "בוהו פסטיבלי", en: "Festival Boho" }, styleTags: ["boho"] },
  ],
  minimalist: [
    { id: "r2m-minimalist-1", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-minimalist-1-kDvmLafPoanWATUhoBDfyA.webp", label: { he: "מינימליסט נקי", en: "Clean Minimalist" }, styleTags: ["minimalist"] },
    { id: "r2m-minimalist-2", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-minimalist-2-nR7L7vtdqWtH5oZCw5cor6.webp", label: { he: "מינימליסט כהה", en: "Dark Minimalist" }, styleTags: ["minimalist"] },
    { id: "r2m-minimalist-3", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-minimalist-3-dENNrDiY5rHgrYSq4vGuje.webp", label: { he: "מינימליסט אדמה", en: "Earth Minimalist" }, styleTags: ["minimalist"] },
  ],
  athleisure: [
    { id: "r2m-athleisure-1", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-athleisure-1-5ZGqvUspq5cYvF5AcpyfMR.webp", label: { he: "אתלי'זר ספורטיבי", en: "Sporty Athleisure" }, styleTags: ["athleisure"] },
    { id: "r2m-athleisure-2", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-athleisure-2-56WXC2nvtEZeg2DqDRB5vn.webp", label: { he: "אתלי'זר אורבני", en: "Urban Athleisure" }, styleTags: ["athleisure"] },
    { id: "r2m-athleisure-3", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/reinforce-athleisure-3-hy6K3nbwFZ5ELerPXw5FmZ.webp", label: { he: "אתלי'זר רטרו", en: "Retro Athleisure" }, styleTags: ["athleisure"] },
  ],
};

const REINFORCE_POOL_FEMALE: Record<StyleId, OutfitCard[]> = {
  streetwear: [
    { id: "r2f-streetwear-1", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-streetwear-1-URYpLwHenDhYfUWpUA56ko.webp", label: { he: "סטריטוור אורבני", en: "Urban Streetwear" }, styleTags: ["streetwear"] },
    { id: "r2f-streetwear-2", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-streetwear-2-ecGXfbMjF3Vbz2xhscWosD.webp", label: { he: "סטריטוור מודרני", en: "Modern Streetwear" }, styleTags: ["streetwear"] },
    { id: "r2f-streetwear-3", styleId: "streetwear", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-streetwear-3-SzcZpYZLVJRHUAStS4iuA4.webp", label: { he: "סטריטוור קלאסי", en: "Classic Streetwear" }, styleTags: ["streetwear"] },
  ],
  "smart-casual": [
    { id: "r2f-smartcasual-1", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-smartcasual-1-Npg4GCdzMsszWGnFX6mt27.webp", label: { he: "סמארט קז'ואל עירוני", en: "Urban Smart Casual" }, styleTags: ["smart-casual"] },
    { id: "r2f-smartcasual-2", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-smartcasual-2-hqqtTXfRPzfrBD7occuGnp.webp", label: { he: "סמארט קז'ואל מלוטש", en: "Polished Smart Casual" }, styleTags: ["smart-casual"] },
    { id: "r2f-smartcasual-3", styleId: "smart-casual", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-smartcasual-3-iJ9J7wiuCXFFMtCcHMCUhm.webp", label: { he: "סמארט קז'ואל קליל", en: "Light Smart Casual" }, styleTags: ["smart-casual"] },
  ],
  classic: [
    { id: "r2f-classic-1", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-classic-1-dky9d9q2azpAYtaNqgjaRw.webp", label: { he: "קלאסי מחויט", en: "Tailored Classic" }, styleTags: ["classic"] },
    { id: "r2f-classic-2", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-classic-2-WN8RgGfQGY73ZvP7ZZpoNu.webp", label: { he: "קלאסי מודרני", en: "Modern Classic" }, styleTags: ["classic"] },
    { id: "r2f-classic-3", styleId: "classic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-classic-3-CJuBMaALpGsYffhEvkH2Az.webp", label: { he: "קלאסי אלגנטי", en: "Elegant Classic" }, styleTags: ["classic"] },
  ],
  boho: [
    { id: "r2f-boho-1", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-boho-1-c3d2UQnH6HZ4E4e8eYMnzo.webp", label: { he: "בוהו טבעי", en: "Natural Boho" }, styleTags: ["boho"] },
    { id: "r2f-boho-2", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-boho-2-UrHfmA93fLeCBtLW8DZKYJ.webp", label: { he: "בוהו שיק", en: "Boho Chic" }, styleTags: ["boho"] },
    { id: "r2f-boho-3", styleId: "boho", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-boho-3-YtiudDnJupLw9ESmiGVGvR.webp", label: { he: "בוהו פסטיבלי", en: "Festival Boho" }, styleTags: ["boho"] },
  ],
  minimalist: [
    { id: "r2f-minimalist-1", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-minimalist-1-Y8UghdA7UkuJQcZHgYv4vs.webp", label: { he: "מינימליסט נקי", en: "Clean Minimalist" }, styleTags: ["minimalist"] },
    { id: "r2f-minimalist-2", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-minimalist-2-FerrnEY6E5oiZrqRZgs5Qz.webp", label: { he: "מינימליסט כהה", en: "Dark Minimalist" }, styleTags: ["minimalist"] },
    { id: "r2f-minimalist-3", styleId: "minimalist", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-minimalist-3-LW7zdkEzJfZkuAsSHvm3R2.webp", label: { he: "מינימליסט אדמה", en: "Earth Minimalist" }, styleTags: ["minimalist"] },
  ],
  athleisure: [
    { id: "r2f-athleisure-1", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-athleisure-1-BKyATuyRQY6NdkCWgdGoDh.webp", label: { he: "אתלי'זר ספורטיבי", en: "Sporty Athleisure" }, styleTags: ["athleisure"] },
    { id: "r2f-athleisure-2", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-athleisure-2-UBiG9AYHy7DuGkMFq2gMFN.webp", label: { he: "אתלי'זר אורבני", en: "Urban Athleisure" }, styleTags: ["athleisure"] },
    { id: "r2f-athleisure-3", styleId: "athleisure", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663514710188/AVfXZN2j3ffhBTKao83uCM/r2f-athleisure-3-aRT8dRbL8ywofyWYvs3sWi.webp", label: { he: "אתלי'זר רטרו", en: "Retro Athleisure" }, styleTags: ["athleisure"] },
  ],
};

/* ═══════════════════════════════════════════════════════
   Taste Scoring System
   ═══════════════════════════════════════════════════════ */
interface TasteScores { [styleId: string]: number; }

function computeTasteScores(
  r1Likes: string[], r1Passes: string[],
  r2Likes: string[], r2Passes: string[],
  r2NegativeCardId: string | null,
  r1Cards: OutfitCard[], r2Cards: OutfitCard[],
): TasteScores {
  const scores: TasteScores = {};
  const allStyles: StyleId[] = ["streetwear", "smart-casual", "classic", "boho", "minimalist", "athleisure"];
  allStyles.forEach(s => { scores[s] = 0; });

  r1Cards.forEach(card => {
    const pts = r1Likes.includes(card.id) ? 1 : -1;
    card.styleTags.forEach(tag => { if (scores[tag] !== undefined) scores[tag] += pts; });
  });

  r2Cards.forEach(card => {
    const isNegative = card.id === r2NegativeCardId;
    const liked = r2Likes.includes(card.id);
    const pts = isNegative ? (liked ? 1 : -3) : (liked ? 2 : -2);
    card.styleTags.forEach(tag => { if (scores[tag] !== undefined) scores[tag] += pts; });
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
function buildR2Deck(r1Likes: string[], _r1Passes: string[], r1Cards: OutfitCard[], gender?: string): { cards: OutfitCard[]; negativeId: string } {
  // Select gender-appropriate reinforcement pool
  const POOL = gender === "female" ? REINFORCE_POOL_FEMALE : REINFORCE_POOL_MALE;

  const styleLikeCounts: Record<StyleId, number> = { streetwear: 0, "smart-casual": 0, classic: 0, boho: 0, minimalist: 0, athleisure: 0 };
  r1Likes.forEach(cardId => {
    const card = r1Cards.find(c => c.id === cardId);
    if (card) styleLikeCounts[card.styleId]++;
  });

  const likedStyles = (Object.entries(styleLikeCounts) as [StyleId, number][])
    .filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([style]) => style);
  const passedStyles = (Object.entries(styleLikeCounts) as [StyleId, number][])
    .filter(([, count]) => count === 0).map(([style]) => style);

  const reinforceCards: OutfitCard[] = [];
  if (likedStyles.length === 0) {
    const shuffled = [...(Object.keys(POOL) as StyleId[])].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3 && i < shuffled.length; i++) reinforceCards.push(POOL[shuffled[i]][0]);
  } else if (likedStyles.length === 1) {
    const pool = POOL[likedStyles[0]];
    reinforceCards.push(pool[0], pool[1], pool[2]);
  } else if (likedStyles.length === 2) {
    reinforceCards.push(POOL[likedStyles[0]][0], POOL[likedStyles[0]][1], POOL[likedStyles[1]][0]);
  } else {
    const topCount = styleLikeCounts[likedStyles[0]];
    const secondCount = styleLikeCounts[likedStyles[1]];
    if (topCount > secondCount) {
      reinforceCards.push(POOL[likedStyles[0]][0], POOL[likedStyles[0]][1], POOL[likedStyles[1]][0]);
    } else {
      reinforceCards.push(POOL[likedStyles[0]][0], POOL[likedStyles[1]][0],
        POOL[likedStyles[2]] ? POOL[likedStyles[2]][0] : POOL[likedStyles[0]][1]);
    }
  }

  let negativeStyle: StyleId;
  if (passedStyles.length > 0) negativeStyle = passedStyles[Math.floor(Math.random() * passedStyles.length)];
  else negativeStyle = likedStyles[likedStyles.length - 1];
  const negativeCard = POOL[negativeStyle][POOL[negativeStyle].length - 1];

  const allCards = [...reinforceCards, negativeCard];
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }
  return { cards: allCards, negativeId: negativeCard.id };
}

/* ═══════════════════════════════════════════════════════
   Personalization Bubble — floating messages
   ═══════════════════════════════════════════════════════ */
function PersonalizationBubble({ message, delay = 0 }: { message: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
        <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-sm text-primary">{message}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Social Platform SVG Icons (inline)
   ═══════════════════════════════════════════════════════ */
function InstagramIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs><radialGradient id="ig-g" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="5%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs>
      <rect width="48" height="48" rx="12" fill="url(#ig-g)"/><rect x="10" y="10" width="28" height="28" rx="8" stroke="white" strokeWidth="2.5" fill="none"/><circle cx="24" cy="24" r="7" stroke="white" strokeWidth="2.5" fill="none"/><circle cx="33" cy="15" r="2" fill="white"/>
    </svg>
  );
}
function TikTokIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#000"/><path d="M33.5 16.5C32.1 15.3 31.2 13.5 31 11.5H27V29.5C27 31.7 25.2 33.5 23 33.5C20.8 33.5 19 31.7 19 29.5C19 27.3 20.8 25.5 23 25.5C23.5 25.5 24 25.6 24.4 25.8V22C24 21.9 23.5 21.9 23 21.9C18.6 21.9 15 25.3 15 29.5C15 33.7 18.6 37 23 37C27.4 37 31 33.7 31 29.5V20.5C32.6 21.7 34.5 22.4 36.5 22.5V18.5C35.3 18.4 34.2 17.6 33.5 16.5Z" fill="white"/>
    </svg>
  );
}
function PinterestIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#E60023"/><path d="M24 12C17.4 12 12 17.4 12 24C12 29 15 33.3 19.2 35.1C19.1 34.1 19 32.5 19.2 31.4C19.4 30.4 20.5 25.5 20.5 25.5C20.5 25.5 20.2 24.7 20.2 23.6C20.2 21.8 21.2 20.5 22.5 20.5C23.6 20.5 24.1 21.3 24.1 22.3C24.1 23.4 23.4 25 23 26.5C22.7 27.8 23.7 28.8 25 28.8C27.3 28.8 29 26.5 29 23.2C29 20.3 27 18.1 24 18.1C20.5 18.1 18.4 20.7 18.4 23.5C18.4 24.5 18.8 25.6 19.3 26.2C19.4 26.3 19.4 26.5 19.3 26.6C19.2 27 19 27.8 19 28C18.9 28.2 18.8 28.3 18.6 28.2C17 27.5 16 25.3 16 23.4C16 19.5 18.9 15.9 24.3 15.9C28.6 15.9 32 19 32 23.1C32 27.3 29.4 30.7 25.8 30.7C24.5 30.7 23.2 30 22.8 29.2C22.8 29.2 22.2 31.5 22 32.3C21.7 33.4 20.9 34.8 20.4 35.6C21.5 35.9 22.7 36 24 36C30.6 36 36 30.6 36 24C36 17.4 30.6 12 24 12Z" fill="white"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   STEPS:
   1 = Photo upload + AI analysis
   2 = Tinder R1 (6 cards, gender-aware) + R2 (4 adaptive)
   3 = Mall / Store picker (budget + country aware)
   4 = Taste profile + finish (auto-analyze + navigate to GuestReview)
   ═══════════════════════════════════════════════════════ */
const TOTAL_STEPS = 4; // photo, tinder, mall, finish

export default function Onboarding() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: false });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showAnalysisAnimation, setShowAnalysisAnimation] = useState(false);
  const { t, dir, lang } = useLanguage();
  const _fp = useFingerprint();

  /* ─── Check guest limit ─── */
  const { data: limitData, isLoading: limitLoading } = trpc.guest.checkLimit.useQuery(
    { fingerprint: _fp || "" },
    { enabled: !!_fp && !isAuthenticated }
  );

  /* ── Check if photo was passed from Path A (quick analysis → upsell) ── */
  const [incomingPhoto] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("photo") || null;
  });

  /* ── Step 1: Photo upload ── */
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(incomingPhoto);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<{
    imageUrl: string; imageKey: string;
    gender: string; ageRange: string; detectedStyles: string[]; budgetLevel: string; confidence: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Tinder state ── */
  const [r1Likes, setR1Likes] = useState<string[]>([]);
  const [r1Passes, setR1Passes] = useState<string[]>([]);
  const [r1Index, setR1Index] = useState(0);
  const [r1Done, setR1Done] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const [r2Cards, setR2Cards] = useState<OutfitCard[]>([]);
  const [r2NegativeId, setR2NegativeId] = useState<string | null>(null);
  const [r2Likes, setR2Likes] = useState<string[]>([]);
  const [r2Passes, setR2Passes] = useState<string[]>([]);
  const [r2Index, setR2Index] = useState(0);
  const [r2Done, setR2Done] = useState(false);
  const [r2SwipeDirection, setR2SwipeDirection] = useState<"left" | "right" | null>(null);

  /* ── Influencer state ── */
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);
  const [customInfluencer, setCustomInfluencer] = useState("");

  /* ── Store state ── */
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  /* ── Other ── */
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const { country: detectedCountry } = useCountry();
  const saveProfileMutation = trpc.profile.save.useMutation();
  const analyzePhotoMutation = trpc.onboarding.analyzePhoto.useMutation();
  const guestUploadFromUrlMutation = trpc.guest.uploadFromUrl.useMutation();
  const guestAnalyzeMutation = trpc.guest.analyze.useMutation();
  const guestSaveProfileMutation = trpc.guest.saveProfile.useMutation();
  const reviewCreateFromUrlMutation = trpc.review.createFromUrl.useMutation();
  const reviewAnalyzeMutation = trpc.review.analyze.useMutation();
  const fingerprint = useFingerprint();

  /* ── Derived: which R1 deck to use ── */
  const r1Cards = useMemo(() => {
    if (!photoAnalysis) return TINDER_R1_NEUTRAL;
    return photoAnalysis.gender === "male" ? TINDER_R1_MALE : TINDER_R1_FEMALE;
  }, [photoAnalysis]);

  /* ── Derived: stores filtered by detected budget + country ── */
  const detectedBudget = photoAnalysis?.budgetLevel || "mid-range";
  const detectedGender = photoAnalysis?.gender || "";

  const mallStores = useMemo(() => {
    const TARGET = 10;
    const allBudgets = ["budget", "mid-range", "premium", "luxury"];
    const adjacent: Record<string, string[]> = {
      "budget": ["budget", "mid-range"],
      "mid-range": ["budget", "mid-range", "premium"],
      "premium": ["mid-range", "premium", "luxury"],
      "luxury": ["premium", "luxury"],
    };
    let allowedBudgets = adjacent[detectedBudget] || [detectedBudget];

    // Collect local stores (country-specific)
    const localData = detectedCountry ? COUNTRY_STORE_MAP[detectedCountry] : null;
    const allLocal = localData
      ? localData.stores.filter(s => {
          const genderOk = !detectedGender || s.gender === "unisex" || s.gender === detectedGender;
          return genderOk;
        })
      : [];

    // Sort local stores: budget-matching first, then others
    const localBudgetMatch = allLocal.filter(s => s.budget.some(b => allowedBudgets.includes(b)));
    const localOther = allLocal.filter(s => !s.budget.some(b => allowedBudgets.includes(b)));
    const sortedLocal = [...localBudgetMatch, ...localOther].map(s => ({ name: s.name, isLocal: true }));

    // Collect global stores
    const localNames = new Set(sortedLocal.map(s => s.name));
    const globalBudgetMatch = STORE_OPTIONS
      .filter(s => allowedBudgets.includes(s.budget) && !localNames.has(s.label))
      .map(s => ({ name: s.label, isLocal: false }));
    const globalOther = STORE_OPTIONS
      .filter(s => !allowedBudgets.includes(s.budget) && !localNames.has(s.label))
      .map(s => ({ name: s.label, isLocal: false }));

    // Build final list: up to 7 local + fill with global (budget-match first, then any)
    const localSlice = sortedLocal.slice(0, 7);
    const usedNames = new Set(localSlice.map(s => s.name));
    const globalPool = [...globalBudgetMatch, ...globalOther].filter(s => !usedNames.has(s.name));
    const globalSlice = globalPool.slice(0, TARGET - localSlice.length);
    const result = [...localSlice, ...globalSlice].slice(0, TARGET);

    return result;
  }, [detectedBudget, detectedGender, detectedCountry]);

  /* ── Taste scores ── */
  const tasteScores = useMemo(() => {
    if (!r2Done) return null;
    return computeTasteScores(r1Likes, r1Passes, r2Likes, r2Passes, r2NegativeId, r1Cards, r2Cards);
  }, [r2Done, r1Likes, r1Passes, r2Likes, r2Passes, r2NegativeId, r1Cards, r2Cards]);

  const topStyles = useMemo(() => {
    if (!tasteScores) return [];
    return getTopStyles(tasteScores);
  }, [tasteScores]);

  /* ═══════════════════════════════════════════════════════
     Photo Upload + Analysis
     ═══════════════════════════════════════════════════════ */
  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handlePhotoAnalyze = useCallback(async () => {
    if (!photoFile && !incomingPhoto) return;
    setAnalyzing(true);
    try {
      let base64: string;
      let mimeType: string;

      if (incomingPhoto && !photoFile) {
        // Fetch the image from the URL and convert to base64
        const resp = await fetch(incomingPhoto);
        const blob = await resp.blob();
        mimeType = blob.type || "image/jpeg";
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });
      } else if (photoFile) {
        mimeType = photoFile.type || "image/jpeg";
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(photoFile);
        });
      } else {
        return;
      }

      const result = await analyzePhotoMutation.mutateAsync({
        imageBase64: base64,
        mimeType,
      });

      setPhotoAnalysis(result);
      // Auto-advance after a brief moment
      setTimeout(() => {
        setStep(2);
        setAnalyzing(false);
      }, 1500);
    } catch (err) {
      // If incoming photo from Path A failed (likely CORS), allow retry
      if (incomingPhoto && !photoFile) {
        console.warn("[Onboarding] incomingPhoto fetch failed, will retry");
        toast.error(lang === "he" ? "שגיאה בטעינת התמונה — ננסה שוב" : "Photo loading error — retrying...");
        setAnalyzing(false);
        // Auto-retry after a short delay
        setTimeout(() => {
          autoAnalyzeRef.current = false; // allow re-trigger
        }, 1500);
      } else {
        toast.error(lang === "he" ? "שגיאה בניתוח התמונה — ננסה שוב" : "Photo analysis error — try again");
        setAnalyzing(false);
      }
    }
  }, [photoFile, incomingPhoto, analyzePhotoMutation, lang]);

  /* ── Auto-trigger analysis if incoming photo from Path A ── */
  const autoAnalyzeRef = useRef(false);
  useEffect(() => {
    if (incomingPhoto && !autoAnalyzeRef.current && !photoAnalysis && !analyzing) {
      autoAnalyzeRef.current = true;
      handlePhotoAnalyze();
    }
  }, [incomingPhoto, photoAnalysis, analyzing, handlePhotoAnalyze]);

  /* ═══════════════════════════════════════════════════════
     Tinder Swipe Handlers
     ═══════════════════════════════════════════════════════ */
  const handleR1Swipe = useCallback((direction: "left" | "right") => {
    const currentCard = r1Cards[r1Index];
    if (!currentCard) return;
    setSwipeDirection(direction);
    if (direction === "right") setR1Likes(prev => [...prev, currentCard.id]);
    else setR1Passes(prev => [...prev, currentCard.id]);
    setTimeout(() => {
      setSwipeDirection(null);
      if (r1Index < r1Cards.length - 1) setR1Index(prev => prev + 1);
      else setR1Done(true);
    }, 350);
  }, [r1Index, r1Cards]);

  useEffect(() => {
    if (r1Done && r2Cards.length === 0) {
      const { cards, negativeId } = buildR2Deck(r1Likes, r1Passes, r1Cards, detectedGender);
      setR2Cards(cards);
      setR2NegativeId(negativeId);
    }
  }, [r1Done, r1Likes, r1Passes, r2Cards.length, r1Cards]);

  const handleR2Swipe = useCallback((direction: "left" | "right") => {
    const currentCard = r2Cards[r2Index];
    if (!currentCard) return;
    setR2SwipeDirection(direction);
    if (direction === "right") setR2Likes(prev => [...prev, currentCard.id]);
    else setR2Passes(prev => [...prev, currentCard.id]);
    setTimeout(() => {
      setR2SwipeDirection(null);
      if (r2Index < r2Cards.length - 1) setR2Index(prev => prev + 1);
      else setR2Done(true);
    }, 350);
  }, [r2Index, r2Cards]);

  /* ── Touch swipe ── */
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const makeHandleTouchEnd = (swipeFn: (dir: "left" | "right") => void) => (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) swipeFn(deltaX > 0 ? "right" : "left");
  };

  /* ═══════════════════════════════════════════════════════
     Influencer helpers
     ═══════════════════════════════════════════════════════ */
  const toggleInfluencer = (name: string) => setSelectedInfluencers(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const addCustomInfluencer = () => {
    const trimmed = customInfluencer.trim();
    if (trimmed && !selectedInfluencers.includes(trimmed)) {
      setSelectedInfluencers(prev => [...prev, trimmed]);
      setCustomInfluencer("");
    }
  };

  /* ═══════════════════════════════════════════════════════
     Store helpers
     ═══════════════════════════════════════════════════════ */
  const toggleStore = (name: string) => setSelectedStores(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);

  /* ═══════════════════════════════════════════════════════
     Finish / Save
     ═══════════════════════════════════════════════════════ */
  const handleFinish = async () => {
    setSaving(true);
    try {
      if (isAuthenticated) {
        await saveProfileMutation.mutateAsync({
          gender: photoAnalysis?.gender || undefined,
          ageRange: photoAnalysis?.ageRange || undefined,
          budgetLevel: photoAnalysis?.budgetLevel || undefined,
          stylePreference: topStyles.length > 0 ? topStyles.join(", ") : (photoAnalysis?.detectedStyles?.join(", ") || undefined),
          favoriteInfluencers: selectedInfluencers.length > 0 ? selectedInfluencers.join(", ") : undefined,
          preferredStores: selectedStores.length > 0 ? selectedStores.join(", ") : undefined,
          saveToWardrobe: true,
          onboardingCompleted: true,
          country: detectedCountry || undefined,
        });

        // If we have an incoming photo from Path A, create a review from it and navigate to results
        if (incomingPhoto && photoAnalysis?.imageUrl) {
          const { reviewId } = await reviewCreateFromUrlMutation.mutateAsync({
            imageUrl: photoAnalysis.imageUrl,
            imageKey: photoAnalysis.imageKey || undefined,
          });
          // Show analysis animation
          setShowAnalysisAnimation(true);
          // Trigger analysis
          reviewAnalyzeMutation.mutate({ reviewId, lang });
          // Navigate to review page after animation
          setTimeout(() => {
            navigate(`/review/${reviewId}?from=onboarding`);
          }, 4000);
        } else {
          window.location.href = "/upload";
        }
      } else {
        // Non-authenticated: save guest profile, create session from existing photo, run analysis, navigate to review
        if (!fingerprint || !photoAnalysis?.imageUrl) {
          toast.error(lang === "he" ? "שגיאה — נסה שוב" : "Error — please try again");
          setSaving(false);
          return;
        }

        // 1. Save guest profile with all onboarding data
        await guestSaveProfileMutation.mutateAsync({
          fingerprint,
          gender: photoAnalysis.gender || undefined,
          ageRange: photoAnalysis.ageRange || undefined,
          budgetLevel: photoAnalysis.budgetLevel || undefined,
          stylePreference: topStyles.length > 0 ? topStyles.join(", ") : (photoAnalysis.detectedStyles?.join(", ") || undefined),
          favoriteInfluencers: selectedInfluencers.length > 0 ? selectedInfluencers.join(", ") : undefined,
          preferredStores: selectedStores.length > 0 ? selectedStores.join(", ") : undefined,
          country: detectedCountry || undefined,
        });

        // 2. Create guest session from the already-uploaded onboarding photo
        const { sessionId } = await guestUploadFromUrlMutation.mutateAsync({
          imageUrl: photoAnalysis.imageUrl,
          imageKey: photoAnalysis.imageKey || undefined,
          fingerprint,
        });

        // 3. Show visual analysis animation
        setShowAnalysisAnimation(true);

        // 4. Trigger full analysis (will use saved guest profile for personalization)
        guestAnalyzeMutation.mutate({ sessionId, lang });

        // 5. Wait a few seconds for the animation to play, then navigate to review
        setTimeout(() => {
          navigate(`/guest/review/${sessionId}?from=onboarding`);
        }, 4000);
      }
    } catch (err: any) {
      toast.error(lang === "he" ? "שגיאה בשמירה" : "Save error");
      setSaving(false);
    }
  };

  /* ═══════════════════════════════════════════════════════
     Stylist Bubble Messages
     ═══════════════════════════════════════════════════════ */
  const getStylistMessage = (): string => {
    if (step === 1 && photoAnalysis && !analyzing) {
      const genderHe = photoAnalysis.gender === "female" ? "נראית" : "נראה";
      return lang === "he"
        ? `${genderHe} מעולה! כבר מתחילה להכיר אותך...`
        : "Looking great! Already getting to know you...";
    }
    if (step === 2) {
      if (!r1Done) return lang === "he" ? "סוויפ ימינה = אוהב/ת, שמאלה = פאס. כל תמונה מלמדת אותי עוד עליך" : "Swipe right = love, left = pass. Each image teaches me more about you";
      if (r1Done && !r2Done) {
        const likeCount = r1Likes.length;
        if (likeCount === 0) return lang === "he" ? "מעניין... עכשיו נדייק" : "Interesting... let's refine";
        if (likeCount <= 2) return lang === "he" ? "סלקטיבי! עוד 4 לחיזוק" : "Selective! 4 more to refine";
        return lang === "he" ? "יש לך טעם! עכשיו נחזק" : "Great taste! Let's reinforce";
      }
    }
    if (step === 3) return lang === "he" ? "כמעט שם! החנויות עוזרות לי להתאים המלצות מדויקות" : "Almost there! Stores help me give precise recommendations";
    if (step === 4) {
      const top = topStyles[0];
      const styleNames: Record<string, { he: string; en: string }> = {
        streetwear: { he: "סטריטוור", en: "Streetwear" }, "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual" },
        classic: { he: "קלאסי", en: "Classic" }, boho: { he: "בוהו", en: "Boho" },
        minimalist: { he: "מינימליסט", en: "Minimalist" }, athleisure: { he: "אתלי'זר", en: "Athleisure" },
      };
      if (top && styleNames[top]) return lang === "he" ? `הסגנון שלך: ${styleNames[top].he}! זה רק ההתחלה...` : `Your style: ${styleNames[top].en}! This is just the beginning...`;
      return lang === "he" ? "יש לך טעם מעולה!" : "You have great taste!";
    }
    return "";
  };

  /* ═══════════════════════════════════════════════════════
     Shared Tinder Card Component
     ═══════════════════════════════════════════════════════ */
  const TinderCard = ({ card, index, total, direction, onSwipe, onTouchStartFn, onTouchEndFn, roundLabel }: {
    card: OutfitCard; index: number; total: number; direction: "left" | "right" | null;
    onSwipe: (dir: "left" | "right") => void; onTouchStartFn: (e: React.TouchEvent) => void;
    onTouchEndFn: (e: React.TouchEvent) => void; roundLabel: string;
  }) => (
    <div className="relative mx-auto" style={{ maxWidth: 320 }}>
      <div onTouchStart={onTouchStartFn} onTouchEnd={onTouchEndFn}
        className={`relative rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl transition-all duration-300 ${
          direction === "right" ? "translate-x-[120%] rotate-12 opacity-0" : direction === "left" ? "-translate-x-[120%] -rotate-12 opacity-0" : ""
        }`}>
        {direction === "right" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-green-500/20">
            <div className="border-4 border-green-400 text-green-400 px-6 py-2 rounded-xl text-3xl font-black rotate-[-20deg]">LIKE</div>
          </div>
        )}
        {direction === "left" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/20">
            <div className="border-4 border-red-400 text-red-400 px-6 py-2 rounded-xl text-3xl font-black rotate-[20deg]">NOPE</div>
          </div>
        )}
        <div className="aspect-[3/4] relative">
          <img src={card.image} alt={card.label.en} className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute bottom-4 inset-x-0 text-center">
            <span className="text-xl font-bold text-white drop-shadow-lg">{card.label[lang] || card.label.en}</span>
          </div>
        </div>
      </div>
      <div dir="ltr" className="flex items-center justify-center gap-8 mt-5">
        <button onClick={() => onSwipe("left")} className="w-14 h-14 rounded-full border-2 border-red-400/50 bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-90">
          <X className="w-7 h-7 text-red-400" />
        </button>
        <button onClick={() => onSwipe("right")} className="w-16 h-16 rounded-full border-2 border-green-400/50 bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 hover:border-green-400 transition-all active:scale-90">
          <Heart className="w-8 h-8 text-green-400" />
        </button>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i < index ? "w-4 bg-primary/60" : i === index ? "w-6 bg-primary" : "w-3 bg-white/20"}`} />
        ))}
      </div>
      <div className="text-center mt-2"><span className="text-xs text-muted-foreground">{roundLabel}</span></div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     Taste Score Visual Bar
     ═══════════════════════════════════════════════════════ */
  const TasteScoreBar = ({ scores }: { scores: TasteScores }) => {
    const maxScore = Math.max(...Object.values(scores).map(Math.abs), 1);
    const styleNames: Record<string, { he: string; en: string }> = {
      streetwear: { he: "סטריטוור", en: "Streetwear" }, "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual" },
      classic: { he: "קלאסי", en: "Classic" }, boho: { he: "בוהו", en: "Boho" },
      minimalist: { he: "מינימליסט", en: "Minimalist" }, athleisure: { he: "אתלי'זר", en: "Athleisure" },
    };
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return (
      <div className="space-y-2 w-full max-w-sm mx-auto">
        {sorted.map(([style, score]) => {
          const pct = Math.abs(score) / maxScore * 100;
          const isPositive = score > 0;
          return (
            <div key={style} className="flex items-center gap-2">
              <span className="text-xs w-24 text-end truncate text-muted-foreground">{styleNames[style]?.[lang] || style}</span>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${isPositive ? "bg-gradient-to-r from-primary to-green-400" : "bg-gradient-to-r from-red-500/50 to-red-400/30"}`} style={{ width: `${Math.max(pct, 5)}%` }} />
              </div>
              <span className={`text-xs font-mono w-8 ${isPositive ? "text-green-400" : "text-red-400"}`}>{score > 0 ? "+" : ""}{score}</span>
            </div>
          );
        })}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════
     LOADING
     ═══════════════════════════════════════════════════════ */
  if (authLoading || (!isAuthenticated && limitLoading)) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><FashionSpinner size="lg" /></div>;
  }

  /* ─── Guest limit reached → show trial wall ─── */
  if (!isAuthenticated && limitData?.used) {
    return <GuestTrialWall count={limitData.count} />;
  }

  const firstName = user?.name?.split(" ")[0] || "";
  const isGuest = !isAuthenticated;
  const isRtl = dir === "rtl";

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir={dir}>
      <WhatsAppOnboardingModal open={showWhatsAppModal} onClose={() => { window.location.href = "/upload"; }} phoneNumber="" />

      {/* Progress dots — 4 steps total */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-500 ${
              i + 1 === step ? "w-8 h-2 bg-primary" : i + 1 < step ? "w-2 h-2 bg-primary/60" : "w-2 h-2 bg-white/20"
            }`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* ═══════════════════════════════════════════
              STEP 1: Photo Upload + AI Analysis
              ═══════════════════════════════════════════ */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="mb-2"><Sparkles className="w-6 h-6 text-primary mx-auto mb-3" /></div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {firstName ? (lang === "he" ? `היי ${firstName}!` : `Hey ${firstName}!`) : (lang === "he" ? "היי!" : "Hey!")}
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-primary mb-1">
                {lang === "he" ? "הסטייליסטית שלך רוצה להכיר אותך" : "Your stylist wants to get to know you"}
              </p>
              <p className="text-muted-foreground text-sm mb-8">
                {lang === "he" ? "העלה תמונה שלך — ואני אלמד ממנה הכל" : "Upload your photo — I'll learn everything from it"}
              </p>

              {!photoPreview ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    {lang === "he" ? "תמונה של הפנים + גוף מלא = הכי טוב" : "Face + full body = best results"}
                  </p>
                  <div className="flex gap-4 justify-center max-w-sm mx-auto">
                    {/* Camera capture button */}
                    <button
                      onClick={() => {
                        const camInput = document.getElementById('onboard-camera-input') as HTMLInputElement;
                        camInput?.click();
                      }}
                      className="flex-1 aspect-square rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2 hover:border-primary/60 hover:bg-primary/10 transition-all cursor-pointer group"
                    >
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Camera className="w-7 h-7 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {lang === "he" ? "צלם תמונה" : "Take Photo"}
                      </span>
                    </button>
                    {/* Gallery/file upload button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 aspect-square rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2 hover:border-primary/60 hover:bg-primary/10 transition-all cursor-pointer group"
                    >
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Upload className="w-7 h-7 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {lang === "he" ? "העלה מהגלריה" : "Upload Photo"}
                      </span>
                    </button>
                  </div>
                  {/* Hidden camera input (with capture attribute for mobile) */}
                  <input id="onboard-camera-input" type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                  {/* Hidden gallery/file input (no capture = opens file picker / gallery) */}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Photo preview with scan animation */}
                  <div className="relative w-full max-w-xs mx-auto rounded-3xl overflow-hidden border-2 border-primary/30 shadow-2xl">
                    <img src={photoPreview} alt="Your photo" className="w-full aspect-[3/4] object-cover" />
                    {analyzing && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                        {/* Scan line animation */}
                        <div className="absolute inset-x-0 h-0.5 bg-primary/80 animate-[scan_2s_ease-in-out_infinite]" />
                        {/* Corner brackets */}
                        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/80" />
                        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/80" />
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/80" />
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/80" />
                        <FashionSpinner size="md" />
                        <p className="text-white text-sm mt-3 font-medium">
                          {lang === "he" ? "מנתחת את הסגנון שלך..." : "Analyzing your style..."}
                        </p>
                      </div>
                    )}
                    {photoAnalysis && !analyzing && (
                      <div className="absolute inset-0 bg-black/30 flex items-end">
                        <div className="w-full p-4 bg-gradient-to-t from-black/90 to-transparent">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-5 h-5 text-green-400" />
                            <span className="text-white font-medium text-sm">{lang === "he" ? "ניתוח הושלם!" : "Analysis complete!"}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs border border-primary/30">
                              {photoAnalysis.gender === "female" ? "👩" : "👨"} {photoAnalysis.ageRange}
                            </span>
                            {photoAnalysis.detectedStyles.slice(0, 2).map(s => (
                              <span key={s} className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs border border-primary/30">{s}</span>
                            ))}
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs border border-primary/30">
                              💰 {photoAnalysis.budgetLevel}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {!analyzing && !photoAnalysis && !incomingPhoto && (
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={() => { setPhotoPreview(null); setPhotoFile(null); }} className="rounded-xl">
                        {lang === "he" ? "תמונה אחרת" : "Different photo"}
                      </Button>
                      <Button onClick={handlePhotoAnalyze} className="rounded-xl gap-2">
                        <Upload className="w-4 h-4" />
                        {lang === "he" ? "נתחי אותי!" : "Analyze me!"}
                      </Button>
                    </div>
                  )}
                  {/* When incoming photo from Path A is loading/retrying, show analyzing state */}
                  {!analyzing && !photoAnalysis && incomingPhoto && (
                    <div className="flex flex-col items-center gap-2">
                      <FashionSpinner size="sm" />
                      <p className="text-sm text-muted-foreground">
                        {lang === "he" ? "טוען את התמונה שלך..." : "Loading your photo..."}
                      </p>
                    </div>
                  )}

                  {photoAnalysis && !analyzing && (
                    <PersonalizationBubble
                      message={getStylistMessage()}
                      delay={500}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              STEP 2: Tinder R1 + R2
              ═══════════════════════════════════════════ */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <PersonalizationBubble message={getStylistMessage()} />

              {!r1Done && (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1 mt-3">
                    {lang === "he" ? "מה מדבר אליך?" : "What speaks to you?"}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    {lang === "he" ? "סוויפ ימינה = אוהב/ת ❤️ | שמאלה = לא בשבילי ✕" : "Swipe right = love ❤️ | left = nope ✕"}
                  </p>
                  <TinderCard card={r1Cards[r1Index]} index={r1Index} total={r1Cards.length} direction={swipeDirection}
                    onSwipe={handleR1Swipe} onTouchStartFn={handleTouchStart} onTouchEndFn={makeHandleTouchEnd(handleR1Swipe)}
                    roundLabel={lang === "he" ? `סבב 1 — ${r1Index + 1}/${r1Cards.length}` : `Round 1 — ${r1Index + 1}/${r1Cards.length}`} />
                </>
              )}

              {r1Done && r2Cards.length === 0 && (
                <div className="py-12"><FashionSpinner size="lg" /><p className="text-muted-foreground text-sm mt-4">{lang === "he" ? "מכין חיזוקים..." : "Preparing reinforcements..."}</p></div>
              )}

              {r1Done && r2Cards.length > 0 && !r2Done && (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1 mt-3">{lang === "he" ? "עוד קצת לדיוק..." : "A few more to refine..."}</h2>
                  <p className="text-muted-foreground text-sm mb-4">{lang === "he" ? "4 לוקים אחרונים — חיזוק הטעם שלך" : "4 final looks — reinforcing your taste"}</p>
                  <TinderCard card={r2Cards[r2Index]} index={r2Index} total={r2Cards.length} direction={r2SwipeDirection}
                    onSwipe={handleR2Swipe} onTouchStartFn={handleTouchStart} onTouchEndFn={makeHandleTouchEnd(handleR2Swipe)}
                    roundLabel={lang === "he" ? `סבב 2 — ${r2Index + 1}/${r2Cards.length}` : `Round 2 — ${r2Index + 1}/${r2Cards.length}`} />
                </>
              )}

              {r2Done && (
                <div className="py-8 animate-in fade-in duration-500">
                  <div className="text-5xl mb-3">✨</div>
                  <h2 className="text-2xl font-bold mb-2">{lang === "he" ? "הטעם שלך מוכן!" : "Your taste profile is ready!"}</h2>
                  <Button onClick={() => setStep(3)} className="gap-2 rounded-xl mt-2">
                    <Sparkles className="w-4 h-4" /> {lang === "he" ? "המשך" : "Continue"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              STEP 3 (OLD INFLUENCER PICKER — REMOVED)
              Influencers now auto-matched on results page
              ═══════════════════════════════════════════ */}
          {false && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5">
              <div className="text-center">
                <PersonalizationBubble message={getStylistMessage()} />
                <h2 className="text-2xl md:text-3xl font-bold mt-3 mb-1">
                  {lang === "he" ? "מי מעניין אותך?" : "Who inspires you?"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {lang === "he" ? "בחר/י משפיענים שהסגנון שלהם מדבר אליך" : "Pick influencers whose style speaks to you"}
                </p>
              </div>

              <InfluencerPicker
                gender={photoAnalysis?.gender || undefined}
                selectedInfluencers={selectedInfluencers}
                onToggle={toggleInfluencer}
                userProfile={{
                  ageRange: photoAnalysis?.ageRange || null,
                  budgetLevel: photoAnalysis?.budgetLevel || null,
                  stylePreference: topStyles.join(", ") || photoAnalysis?.detectedStyles?.join(", ") || null,
                }}
              />

              <div className="flex gap-2">
                <input type="text" value={customInfluencer} onChange={(e) => setCustomInfluencer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomInfluencer()}
                  placeholder={lang === "he" ? "הוסף משפיען/ית..." : "Add influencer..."}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50" />
                <Button variant="outline" size="sm" onClick={addCustomInfluencer} disabled={!customInfluencer.trim()} className="rounded-lg">
                  {lang === "he" ? "הוסף" : "Add"}
                </Button>
              </div>

              {selectedInfluencers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedInfluencers.map(name => (
                    <span key={name} onClick={() => toggleInfluencer(name)} className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs cursor-pointer hover:bg-primary/30 transition-colors">{name} ✕</span>
                  ))}
                </div>
              )}

              {/* Social platform placeholders */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  {lang === "he" ? "בקרוב — נלמד עוד מהרשתות שלך:" : "Coming soon — we'll learn more from your socials:"}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <InstagramIcon size={36} />
                    <span className="text-[10px] text-muted-foreground">{lang === "he" ? "בקרוב" : "Soon"}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <TikTokIcon size={36} />
                    <span className="text-[10px] text-muted-foreground">{lang === "he" ? "בקרוב" : "Soon"}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <PinterestIcon size={36} />
                    <span className="text-[10px] text-muted-foreground">{lang === "he" ? "בקרוב" : "Soon"}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                  {lang === "he" ? "בהמשך תוכל/י לחבר ונלמד לבד" : "Connect later and we'll learn automatically"}
                </p>
              </div>

              {/* Next button */}
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {isRtl ? "→" : "←"} {lang === "he" ? "חזרה" : "Back"}
                </button>
                <Button onClick={() => setStep(4)} className="gap-2 rounded-xl">
                  {lang === "he" ? "המשך" : "Continue"} {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              STEP 3: Mall / Store Picker
              ═══════════════════════════════════════════ */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5">
              <div className="text-center">
                <PersonalizationBubble message={getStylistMessage()} />
                <div className="text-4xl mb-2 mt-3">🏬</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-1">
                  {lang === "he" ? "הקניון שלך" : "Your Mall"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {lang === "he" ? "איפה אוהב/ת לקנות? לחץ/י על החנויות שלך" : "Where do you shop? Tap your favorite stores"}
                </p>
                {photoAnalysis && (
                  <p className="text-xs text-primary/60 mt-1">
                    {lang === "he"
                      ? `מותאם לתקציב ${photoAnalysis.budgetLevel === "budget" ? "חסכוני" : photoAnalysis.budgetLevel === "mid-range" ? "ביניים" : photoAnalysis.budgetLevel === "premium" ? "פרימיום" : "יוקרה"}`
                      : `Tailored to ${photoAnalysis.budgetLevel} budget`}
                  </p>
                )}
              </div>

              {/* Mall storefront grid */}
              <div className="relative">
                {/* Mall "facade" header */}
                <div className="h-2 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-t-xl" />
                <div className="bg-card/50 border border-white/5 rounded-b-xl p-4">
                  {/* Local stores section */}
                  {mallStores.some(s => s.isLocal) && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {detectedCountry && getCountryFlag(detectedCountry)} {lang === "he" ? "חנויות מקומיות" : "Local stores"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {mallStores.filter(s => s.isLocal).map(store => {
                          const isSelected = selectedStores.includes(store.name);
                          return (
                            <button key={store.name} onClick={() => toggleStore(store.name)}
                              className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1.5 ${
                                isSelected ? "border-primary bg-primary/10 scale-105 shadow-lg shadow-primary/10" : "border-white/10 hover:border-primary/30"
                              }`}>
                              <StoreLogo name={store.name} size="md" selected={isSelected} />
                              <span className="text-[10px] text-muted-foreground leading-tight truncate w-full text-center">{store.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Global stores section */}
                  {mallStores.some(s => !s.isLocal) && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {lang === "he" ? "מותגים בינלאומיים" : "International brands"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {mallStores.filter(s => !s.isLocal).map(store => {
                          const isSelected = selectedStores.includes(store.name);
                          return (
                            <button key={store.name} onClick={() => toggleStore(store.name)}
                              className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1.5 ${
                                isSelected ? "border-primary bg-primary/10 scale-105 shadow-lg shadow-primary/10" : "border-white/10 hover:border-primary/30"
                              }`}>
                              <StoreLogo name={store.name} size="md" selected={isSelected} />
                              <span className="text-[10px] text-muted-foreground leading-tight truncate w-full text-center">{store.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedStores.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedStores.map(name => (
                    <span key={name} onClick={() => toggleStore(name)} className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs cursor-pointer hover:bg-primary/30 transition-colors">{name} ✕</span>
                  ))}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {isRtl ? "→" : "←"} {lang === "he" ? "חזרה" : "Back"}
                </button>
                <Button onClick={() => setStep(4)} className="gap-2 rounded-xl">
                  {lang === "he" ? "המשך" : "Continue"} {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              STEP 4: Taste Profile + Finish
              ═══════════════════════════════════════════ */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center space-y-5">
              {showAnalysisAnimation ? (
                /* ── Visual analysis animation (shown after clicking finish) ── */
                <div className="animate-in fade-in duration-700">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">
                    {lang === "he" ? "מנתחים את הלוק שלך..." : "Analyzing your look..."}
                  </h2>
                  <StylingStudioAnimation
                    uploading={false}
                    analyzing={true}
                    selectedOccasion=""
                    selectedInfluencers={selectedInfluencers}
                    imagePreview={photoPreview || photoAnalysis?.imageUrl || null}
                  />
                </div>
              ) : (
                /* ── Normal taste profile + finish UI ── */
                <>
                  <PersonalizationBubble message={getStylistMessage()} />

                  <div>
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

                  {tasteScores && <TasteScoreBar scores={tasteScores} />}

                  {topStyles.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{lang === "he" ? "הסגנונות המובילים שלך:" : "Your top styles:"}</p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {topStyles.map(style => {
                          const styleNames: Record<string, { he: string; en: string }> = {
                            streetwear: { he: "סטריטוור", en: "Streetwear" }, "smart-casual": { he: "סמארט קז'ואל", en: "Smart Casual" },
                            classic: { he: "קלאסי", en: "Classic" }, boho: { he: "בוהו", en: "Boho" },
                            minimalist: { he: "מינימליסט", en: "Minimalist" }, athleisure: { he: "אתלי'זר", en: "Athleisure" },
                          };
                          return <span key={style} className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium border border-primary/30">{styleNames[style]?.[lang] || style}</span>;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Personalization promise */}
                  <div className="bg-card/50 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-sm text-foreground/80">
                      {lang === "he"
                        ? "🧠 זה רק ההתחלה — כל תמונה שתעלה תלמד אותי עוד עליך. הניתוחים שלך יהיו יותר ויותר מדויקים."
                        : "🧠 This is just the beginning — every photo you upload teaches me more. Your analyses will get more and more precise."}
                    </p>
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-3 cursor-pointer group justify-center text-center">
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 accent-primary flex-shrink-0" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                      {lang === "he" ? (
                        <>אני מאשר/ת את{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">תנאי השימוש</a>{" "}ואת{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">מדיניות הפרטיות</a></>
                      ) : (
                        <>I agree to the{" "}<a href="/terms" target="_blank" className="text-primary hover:underline">Terms</a>{" "}and{" "}<a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a></>
                      )}
                    </span>
                  </label>

                  {/* CTA */}
                  <Button onClick={handleFinish} disabled={saving || !agreedToTerms} className="w-full gap-2 rounded-xl h-12 text-base font-bold" size="lg">
                    {saving ? (
                      <><FashionButtonSpinner /> {lang === "he" ? "שנייה..." : "One sec..."}</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> {lang === "he" ? "יאללה, תראו לי ציון!" : "Show me my score!"}</>
                    )}
                  </Button>

                  {/* Back */}
                  <button onClick={() => setStep(3)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {isRtl ? "→" : "←"} {lang === "he" ? "חזרה" : "Back"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 6 removed — guests now go directly to GuestReview from step 5 */}

        </div>
      </div>

      {/* Scan animation keyframes */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  );
}
