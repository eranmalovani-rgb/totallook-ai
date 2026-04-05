# Upload Page Observations (2026-03-24 09:22)

## Issues Found:
1. **Gender filtering NOT working** — All 18 influencers shown (both male and female)
   - User "Eran Malovani" has NO profile in DB, so `profile?.gender` is null
   - The code falls back to showing ALL influencers when no gender is set
   
2. **Image uploaded successfully** — preview shows correctly

3. **Occasion selector visible** — 9 options showing correctly

4. **"Complete profile" prompt visible** — amber banner at bottom

## Fix needed:
- When no profile exists, the Upload page should either:
  a) Redirect to onboarding first, OR
  b) Show a gender quick-select at the top of the influencer section
