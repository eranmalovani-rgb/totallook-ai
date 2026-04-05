# Current Issues to Fix

1. **Analysis fails with 412 quota error** — Need retry with exponential backoff (3 retries with delays)
2. **Onboarding step 6 shows ALL influencers after IG scan** — Should only show influencers NOT already selected from IG scan, filtered by gender
3. **Upload page shows all influencers if no profile** — Need to redirect to onboarding if no profile exists
4. **User "Eran Malovani" (userId unknown) may not have a profile** — Only userId 9 (Nufar) has one

Current logged-in user: Eran Malovani
DB has profile for userId 9 (Nufar_malovani, female)
