# GuestReview Rewrite Plan

## Current Structure (843 lines)
- ScoreCircle, ScoreBar, ProductCard, GuestImprovementCard, LinkedText, getStoreName, GuestOutfitCard sub-components
- Main GuestReview component starts at line 454
- Uses trpc.guest.getResult query with polling
- Has 3 CTAs to signup (mid-page 1 at line 660, mid-page 2 at line 717, bottom at line 820)
- Has "temp result" and "no personalization" banners at top (lines 565-573)

## What Needs to Change
1. REMOVE "temp result" and "no personalization" banners — guests now have full personalization
2. REPLACE all 3 signup CTAs with email capture CTAs (gradual: hint at analysis 2, CTA at 3, block at 5)
3. ADD GuestFixMyLookModal import and usage (already created at components/GuestFixMyLookModal.tsx)
4. ADD closet match badge in GuestImprovementCard (when guest has wardrobe items)
5. ADD "Another Analysis" button that goes to /try (already exists in CTA 2)
6. ADD analysis count tracking to show "X/5 analyses used"

## GuestFixMyLookModal Props
- sessionId: number
- analysis: FashionAnalysis
- trigger?: ReactNode (optional)
- closetItems?: array (optional, lightweight)

## Key: Keep all existing sub-components (ScoreCircle, ScoreBar, etc.) — only change the main component and CTAs
