# Upload Page Observations (After Image Upload)

After uploading an image, the full form is visible:
1. Image preview with X button to remove
2. Occasion selector with 9 options (work, casual, evening, date, friends, formal, sporty, travel, weekend)
3. Influencer section — BUT shows ALL influencers (male + female) even though user profile has gender set

KEY ISSUES:
1. **Influencer list not filtered by gender** — Shows both male and female influencers (David Beckham, Zendaya, Hailey Bieber, etc.)
   - The Upload page needs to fetch the user's profile and filter by gender
2. **The list shows ALL influencers** — Should only show gender-matching ones from the profile
3. **Analysis fails with 412 quota error** — This is a temporary API issue, not a code bug

FIXES NEEDED:
- Upload.tsx needs to fetch user profile (trpc.profile.get.useQuery) and use profile.gender to filter POPULAR_INFLUENCERS
- Pre-populate selectedInfluencers from profile.favoriteInfluencers
