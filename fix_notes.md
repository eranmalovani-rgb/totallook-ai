# Fix Notes - Phase 10

## Issues to Fix:
1. **Analysis fails** - LLM quota was exhausted (412 error). Need better error handling + retry
2. **Upload page influencers not filtered by gender** - Shows ALL influencers instead of filtering by profile.gender
3. **Onboarding influencers from IG not pre-selected on Upload page** - After onboarding, the Upload page should pre-populate selectedInfluencers from profile.favoriteInfluencers
4. **Step 6 shows redundant list after IG selection** - If user already selected influencers in step 5 from IG scan, step 6 should show those as already selected and not duplicate them

## Root Causes:
- Upload.tsx line 255: `POPULAR_INFLUENCERS.map(...)` - not filtered by profile.gender
- Upload.tsx: no useEffect to pre-populate selectedInfluencers from profile.favoriteInfluencers
- Error message is generic "Analysis failed. Please try again." - should explain quota issue and offer retry
