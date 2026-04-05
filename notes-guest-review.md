# GuestReview.tsx Analysis

## Current Structure (842 lines)
- Lines 1-18: Imports (no trpc import for guest wardrobe/fixmylook)
- Lines 22-41: ScoreCircle component
- Lines 43-82: ScoreBar component  
- Lines 84-131: ProductCard component
- Lines 136-235: GuestImprovementCard (lazy loads product images, no closet match)
- Lines 237-276: LinkedText component
- Lines 278-292: getStoreName helper
- Lines 295-450: GuestOutfitCard (auto-generates look images)
- Lines 452-842: Main GuestReview component

## What needs to change:
1. **Remove "no personalization" banner** (lines 570-573) — guests now HAVE personalization
2. **Remove "temp result" banner** (lines 566-569) — replace with analysis count banner
3. **Add closet match badge** to GuestImprovementCard (like registered ImprovementCard)
4. **Add FixMyLookModal** support for guests
5. **Add wardrobe "save to closet"** from items section
6. **Replace signup CTAs** with email capture CTAs (gradual: hint at 2, CTA at 3, block at 5)
7. **Add "Another Analysis" counter** showing X/5 remaining

## Key imports needed:
- trpc (already imported via `import { trpc } from "@/lib/trpc"` — need to verify)
- FixMyLookModal or guest version
- Closet-related components
- Email capture dialog
