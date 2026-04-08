# TotalLook.ai — Project TODO

## Deployment & Infrastructure
- [x] Copy all source files from GitHub repo to Manus webdev project
- [x] Configure all environment variables (OpenAI, WhatsApp, R2, Google OAuth, etc.)
- [x] Install all dependencies (pnpm install)
- [x] Fix TypeScript errors (whatsapp.ts Response type, targetSize, productImages args, tsconfig target)
- [x] Run all 29 database migrations successfully (20 tables created)
- [x] Verify dev server starts and renders correctly
- [x] Verify build process completes successfully

## Core Features (Existing)
- [x] User authentication (Manus OAuth)
- [x] Fashion onboarding questionnaire (5 steps: gender, age, occupation, style, influencers)
- [x] Photo upload and AI fashion analysis (GPT-4o Vision)
- [x] Multi-angle analysis (front + back photos)
- [x] Overall score + per-item breakdown
- [x] Shopping recommendations with product links
- [x] Virtual wardrobe (auto-save detected items)
- [x] Fix My Look (AI image editing for outfit improvements)
- [x] Style Feed (social sharing of looks)
- [x] Likes, saves, follows, comments on feed posts
- [x] In-app notifications
- [x] Guest mode (free analysis without signup)
- [x] WhatsApp integration (send photo via WhatsApp for analysis)
- [x] Instagram story mention analysis
- [x] Style diary (weekly/monthly summaries)
- [x] Product image cache (avoid regenerating same product images)
- [x] Page view analytics and conversion tracking
- [x] Privacy consent tracking (GDPR/CCPA)
- [x] Multi-language support (Hebrew, English, Arabic, Russian)
- [x] Occasion-based analysis (work, casual, evening, date, formal, sport, travel)
- [x] Wardrobe sharing via public link

## Future Development
- [ ] Performance optimization (code splitting for 3MB+ JS bundle)
- [ ] Stripe payment integration for premium features
- [ ] Push notifications (web push)
- [ ] Email notifications for weekly style summaries
- [ ] Admin dashboard for analytics and user management
- [ ] A/B testing framework for landing page optimization
- [ ] Rate limiting for guest analysis (currently 5 per fingerprint)
- [ ] CDN optimization for product images
- [ ] Automated style diary generation (cron job)
- [ ] Instagram DM auto-reply improvements
- [ ] WhatsApp template message approval workflow
- [ ] SEO optimization for public wardrobe pages
- [ ] Progressive Web App (PWA) support
- [ ] Accessibility improvements (WCAG compliance)

## Environment Separation (Staging vs Production)
- [x] Switch Manus staging to use built-in Manus DB (not Railway production DB)
- [x] Run all 29 migrations on Manus built-in DB
- [x] Verify dev server works with new staging DB
- [x] Keep Railway as production — only push updates on explicit user request via GitHub

## Complete Environment Isolation (Staging vs Production)
- [ ] Remove Railway DATABASE_URL from Staging secrets (use only Manus built-in DB)
- [ ] Remove R2 Storage credentials from Staging (use only Manus built-in Storage)
- [ ] Remove WhatsApp production credentials from Staging
- [ ] Remove Google OAuth production credentials from Staging
- [ ] Update storage calls to use Manus storagePut/storageGet instead of R2
- [ ] Verify Staging has zero connection to any Production resource
- [ ] Verify dev server runs cleanly with only Manus-native services

## Bugs
- [x] Fix OAuth redirect in Staging — removed hardcoded totallook.ai, now uses window.location.origin dynamically

## Stage 1 — Quick Wins (Zero Risk)
- [x] 1.1: Limit max_tokens per call type (correction 1024, influencer search 2048, influencer post 1024, IG story 2048; core analysis 2800, recommendations 2400 already set)
- [x] 1.2: Change detail: "high" to "auto" (Instagram fixed; routers.ts + whatsapp.ts already "low")
- [x] 1.3: Lower input_fidelity from "high" to "low" (model already gpt-image-1-mini, quality already "low")
- [x] 1.4: Add loading="lazy" to all product/recommendation images in client (21 fixed, 5 upload previews kept eager)
- [x] Verify Stage 1: build passes, 593 tests pass, 0 TS errors

## Stage 2 — LLM Model Switch
- [x] 2.1: Switch GPT-4o to GPT-4.1-mini in llm.ts getProvider() (fallback: gpt-4o)
- [x] 2.2: Build passes, 593 tests pass, 0 TS errors. Live quality check recommended by user.

## Stage 3 — Google Product Images (Replace DALL-E)
- [x] 3.1: Configure GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX secrets
- [x] 3.2: Create Google Image Search service (server/googleImageSearch.ts)
- [x] 3.3: Integrate Google Image Search as Step 3 in productImages.ts (Cache → Store OG → Google → AI fallback)
- [x] 3.4: Add fallback logic — if Google returns no results, falls through to AI generation
- [x] 3.5: Google image URLs are cached in existing product image cache
- [x] 3.6: Build passes (0 TS errors), 15 new unit tests pass, Google CSE integration ready (awaiting API propagation)

## Stage 3b: Brave Image Search Integration (replacing broken Google CSE)
- [x] 3b.1: Set up Brave Search API key (free tier, $5 credits/month)
- [x] 3b.2: Create Brave Image Search service (server/braveImageSearch.ts)
- [x] 3b.3: Integrate Brave as primary image search in productImages.ts (Cache → Store OG → Brave → Google CSE fallback → AI fallback)
- [x] 3b.4: Write unit tests for Brave Image Search (19 tests + 2 live API tests pass)
- [x] 3b.5: Build passes (0 TS errors), 21 new tests pass, Brave API verified working

## Stage 4 — Performance & Missing Items Fix
- [x] 4.1: Speed up analysis — parallel image conversion (Promise.all), smaller images (1024px, quality 72), 3s testImageUrl timeout, MAX_CONCURRENT 3→5, parallel outfit image resolution
- [x] 4.2: Investigated missing items — backend ensures min 4 improvements (with fallback), min 3 shopping links per improvement, min 2 outfits, min 2 trends. Issue is likely LLM returning fewer items → fallback fills generics. No frontend filtering found.
- [x] 4.3: Speed up responses — wardrobe save fire-and-forget, parallel outfit image resolution in generateOutfitLookFromMetadata, reduced testImageUrl timeout 5s→3s
- [x] 4.4: Verified generateTotalLook flow — uses Brave Image Search via resolveShoppingLinkImage, falls back to AI generation. Code is correct.
- [x] 4.5: TypeScript 0 errors, 682/686 tests pass (4 pre-existing failures: Google CSE 403 + OpenAI key)

## Stage 5 — Critical Fixes (User-reported bugs)
- [x] 5.1: Ensure 3 unique shopping links per improvement category (existing logic + global dedup)
- [x] 5.2: Remove duplicate items across categories — added global deduplication in sanitizeRecommendationsPayload
- [x] 5.3: Add gender filtering to Brave Image Search (men's/women's prefix in search query)
- [x] 5.4: Improved outfit combination quality — enhanced LLM prompts with gender awareness, style coherence, color harmony
- [x] 5.5: Pass user gender through entire pipeline (resolveShoppingLinkImage, enrichAnalysis, generateImages, generateOutfitLook)
- [x] 5.6: 13 new tests (gender filtering + global dedup), 705/709 tests pass

## Stage 6 — Analysis Speed Optimization
- [x] Map full analysis pipeline with timing estimates
- [x] Reduce Stage 1 max_tokens (2800 → 2200)
- [x] Reduce Stage 2 max_tokens (2400 → 1800)
- [x] Optimize image base64: 768px max (was 1024), quality 60 (was 72), skip sharp for <200KB JPEGs
- [x] Reduce retry delays: Stage 1 800ms (was 1500ms), Stage 2 600ms (was 1200ms)
- [x] Reduce LLM timeout 30s (was 40s), image fetch 5s (was 8s)
- [x] Tests: 706 pass, 4 pre-existing API failures (google-cse, imagegen x2, openai)

## Stage 7 — Analysis Reliability & Performance (5 improvements)
- [x] 7.1: LLM timeout increased from 30s to 45s for Vision calls (parallel Stage 1+2 not possible — Stage 2 depends on Stage 1 output)
- [x] 7.2: Client-side tRPC fetch timeout increased to 120s (was browser default ~10s)
- [x] 7.3: Auto-retry (up to 2 attempts) on retryable errors in GuestUpload.tsx and Upload.tsx
- [x] 7.4: Specific Hebrew/English error messages for timeout, rate-limit, in-progress, and generic errors
- [x] 7.5: Time-based progress stages in FashionLoadingAnimation with elapsed timer and auto-retry indicator
- [x] 7.6: Server-side retry support — reset failed guest sessions and reviews to allow re-analysis
- [x] 7.7: 14 new vitest tests for all Stage 7 improvements (all pass)
- [x] 7.8: RetryAnalyzeButton in ReviewPage.tsx updated with auto-retry, specific error messages (timeout, rate-limit, in-progress)

## Stage 8 — Aggressive Speed Optimization (target: <40s)
- [x] 8.1: Profile full analysis pipeline with detailed timing per step
- [x] 8.2: Client-side image compression (10MB → ~300KB, saves ~25s upload time)
- [x] 8.3: Reduced Stage 1 prompt from 60K to 10.5K chars (83% reduction)
- [x] 8.4: Reduced Stage 2 output requirements (3 improvements, 2 outfits, 2-3 trends)
- [x] 8.5: Increased Stage 2 maxTokens from 1800 to 2500 (prevents JSON truncation)
- [x] 8.6: Server-side analysis reduced from ~74s to ~37-39s (48% improvement); upload reduced from ~27s to ~2s; total end-to-end ~40-45s server-side
- [x] 8.7: Analysis quality maintained — score 8.1/10 with optimized prompts

## Stage 9 — Personalized Improvement Suggestions
- [x] 9.1: Pass user's preferredStores to Stage 2 recommendations prompt (buildRecommendationsPromptFromCore)
- [x] 9.2: Pass user's budgetLevel to Stage 2 prompt for price-appropriate suggestions
- [x] 9.3: Pass user's country to Stage 2 for local store prioritization
- [x] 9.4: Update fixShoppingLinkUrls to prioritize user's preferred stores
- [x] 9.5: Gender-appropriate product images via gender param in shopping links
- [x] 9.6: Generate working search URLs for all store links (getStoreSearchPatterns)
- [x] 9.7: Applied to registered user, guest, and WhatsApp flows
- [x] 9.8: 9 new vitest tests for personalized recommendations (all pass)
- [x] 9.9: Updated analysis-prompt.test.ts for optimized prompt (82 tests pass)
- [x] 9.10: Full suite: 705/709 tests pass (4 pre-existing API failures)

## Stage 10 — Product Image Fixes (User-reported)
- [x] 10.1: Fix missing product images — improved LLM prompt for specific productSearchQuery, added validateAndFixProductSearchQuery server-side validation, gender-aware Google/Brave search queries
- [x] 10.2: Fix wrong category images — validateAndFixProductSearchQuery detects cross-category contamination (e.g. pants in top improvement) and rebuilds query with correct category keywords
- [x] 10.3: Improve product image diversity — domain-level deduplication (max 2 per domain per improvement), improved ensureUniqueImageWithinImprovement with domain tracking
- [x] 10.4: Smart category-aware placeholders (Unsplash) — imageUrl never empty, getCategoryPlaceholder returns shoes/top/bottom/outerwear/dress images based on category
- [x] 10.5: 31 new vitest tests for Stage 10 (all pass), full suite 736/740 (4 pre-existing API failures)

## Stage 10b — Product Image Duplication Fix (User-reported, critical)
- [x] 10b.1: Root cause identified: all 3 links share same categoryQuery → Brave/Google return same results → pickBest always picks #1 → all 3 get identical image
- [x] 10b.2: Root cause: dedup ran AFTER concurrent resolution, so all 3 already had same URL; re-resolution also returned same result since pickers had no exclusion list
- [x] 10b.3: Confirmed: Brave returns same top result for same query; pickBestBraveImage always picks highest-scored without knowing what's already used
- [x] 10b.4: Fix: refactored to SEQUENTIAL processing within each improvement with shared usedImageUrls Set passed to Brave/Google pickers; pickers now skip already-chosen URLs
- [x] 10b.5: Fix: placeholder fallback via getCategoryPlaceholder when all sources fail; also increased search results from 5→8 for more diversity
- [x] 10b.6: All 736/740 tests pass (4 pre-existing API failures), TS compiles clean

## Stage 10c — Product Image Category Mismatch + Performance

- [x] 10c.1: Fix wrong category images — added cross-category penalty scoring to Brave/Google pickers (CATEGORY_KEYWORDS map with -5 penalty for wrong category titles in both braveImageSearch.ts and googleImageSearch.ts)
- [x] 10c.2: Speed optimization — HYBRID approach: parallel prefetch of Brave+Google results for all links at once, then sequential selection with usedImageUrls for uniqueness (both enrichAnalysisWithProductImages and generateImagesForImprovement)
- [x] 10c.3: Added timing logs for Stage 1 and Stage 2 LLM calls (both registered user and guest flows) to identify bottlenecks
- [x] 10c.4: All 739/743 tests pass (4 pre-existing API failures: google-cse, imagegen x2, openai), TS compiles clean
- [x] 10c.5: Added 9 targeted unit tests for cross-category filtering in pickBestBraveImage and pickBestProductImage (all pass)
- [x] 10c.6: Added regression tests for hybrid prefetch path (prefetchedResults, prefetchMap, PARALLEL PREFETCH, SEQUENTIAL SELECTION)
- [x] 10c.7: Final clean vitest run: 748/752 tests pass (4 pre-existing API failures: google-cse, imagegen x2, openai)

## Stage 11 — Aggressive Speed Optimization (target: <30s analysis, <5s images)

- [x] 11.1: Timing analysis — review.analyze = ~37s (Stage 1 ~18s + Stage 2 ~19s), product images lazy loaded per improvement
- [x] 11.2: Reduced maxTokens — Stage 1: 2200→1600, Stage 2: 2500→1600 (both registered + guest flows)
- [x] 11.3: Trimmed Stage 1 prompt — removed improvements/outfitSuggestions/trendSources/influencerInsight instructions (Stage 1 only returns overallScore/summary/items/scores/linkedMentions)
- [x] 11.4: Frontend optimized — fallback timer 3000ms→500ms (ReviewPage + GuestReview)
- [x] 11.5: Added batch endpoint generateAllProductImages (registered + guest) — one DB read, one profile read, all improvements in parallel
- [x] 11.6: Frontend batch preloading — ReviewPage + GuestReview call generateAllProductImages immediately on analysis completion
- [x] 11.7: All 748/752 tests pass (4 pre-existing API failures), TS compiles clean

## Stage 11b — Fix React Error 310 (hooks after early returns)
- [x] 11b.1: Moved batch preload hooks before all early returns in ReviewPage (use review data directly instead of analysis variable)
- [x] 11b.2: Moved batch preload hooks before all early returns in GuestReview (parse analysisJson inline)
- [x] 11b.3: TS compiles clean (npx tsc --noEmit = 0 errors), no React hooks ordering violations
- [x] 11b.4: 748/752 tests pass (4 pre-existing API failures)

## Stage 11c — Fix Slow Product Image Loading
- [x] 11c.1: Investigated logs — Google CSE returns 403 on all calls (wasted time), Brave HEAD checks add ~0.5-3s per image
- [x] 11c.2: Added circuit breaker for both Google CSE (403/429) and Brave (429) — 5 min cooldown
- [x] 11c.3: Removed ALL HEAD checks from pipeline — 6 testImageUrl calls eliminated (cache, Brave, Google, existing images)
- [x] 11c.4: Reduced Brave API timeout from 10s to 5s, Google CSE timeout from 10s to 5s
- [x] 11c.5: Added resetGoogleCircuitBreaker export + 5 targeted Google circuit breaker tests (all pass)
- [x] 11c.6: Final verification: 756/760 tests pass (4 pre-existing API failures), npx tsc --noEmit = 0 errors

## Stage 11d — Hybrid Progressive Product Image Loading
- [x] 11d.1: Removed batch preload from ReviewPage — each ImprovementCard loads independently via generateProductImages
- [x] 11d.2: Removed batch preload from GuestReview — same progressive approach
- [x] 11d.3: Set fallback timer to 0ms (immediate) — all improvements start loading simultaneously, each updates UI as soon as its images are ready
- [x] 11d.4: 756/760 tests pass (4 pre-existing API failures), TS compiles clean (0 errors)

## Stage 11e — Fix Analysis Crash (Critical Bug)
- [x] 11e.1: Investigated crash — analysis was failing because maxTokens was reduced too aggressively in Stage 11 (1600 tokens insufficient for Stage 1 JSON output with brand details)
- [x] 11e.2: Root cause: registered user path had maxTokens=1600 for both stages (Stage 11 change), while guest path still had 2200/2500. 1600 tokens caused JSON truncation → parse failure → crash after timeout
- [x] 11e.3: Fix: restored Stage 1 maxTokens to 2200, Stage 2 to 2000 (both registered + guest paths now consistent). Verified: Stage 1 completes in ~16s, Stage 2 in ~19s, total ~35s. 756/760 tests pass, TS compiles clean.

## Stage 12 — Product Image Reliability + Speed (User-reported)
- [x] 12.1: Root cause: Stage 2 prompt requested only 2 shoppingLinks (not 3), normalizeImprovementShoppingLinks filled 3rd with fallback
- [x] 12.2: Root cause: fetchStoreImageUrl (8s timeout) called even when prefetched results exist; Brave 12 parallel calls overwhelm API
- [x] 12.3: Fix prompt — changed from 2 to 3 shoppingLinks in both Hebrew and English Stage 2 prompts
- [x] 12.4: Fix schema — added minItems: 3 to shoppingLinks JSON schema to enforce 3 items
- [x] 12.5: Fix speed — skip fetchStoreImageUrl when prefetched results exist (search URLs, not product pages)
- [x] 12.6: Fix speed — reduced fetchStoreImageUrl timeout from 8s to 4s
- [x] 12.7: Fix speed — added Brave API concurrency limiter (max 4 parallel requests) to avoid rate limiting
- [x] 12.8: Fix frontend — improved state sync in ImprovementCard (ReviewPage + GuestReview) to always update localLinks when server returns images
- [x] 12.9: Fix dedup — when cache hit returns URL already in usedImageUrls, skip cache and try Brave/Google instead of expensive AI generation
- [x] 12.10: Normalized guest Stage 2 maxTokens to 2000 for consistency
- [x] 12.11: Updated performance test for 4s timeout (28/28 tests pass)

## Stage 12b — Mandatory 3 Product Images Per Improvement (User-reported critical)
- [x] 12b.1: Backend — guarantee 3 different images per improvement, aggressive fallback chain (cache → Brave → Google → AI → placeholder), never return empty imageUrl
- [x] 12b.2: Backend — progressive DB updates: save each image to DB immediately as it resolves (not wait for all 3)
- [x] 12b.3: Frontend — progressive loading: show each image as it arrives via polling/refetch, never show empty squares
- [x] 12b.4: Frontend — images must match look/occasion/gender context
- [x] 12b.5: Frontend — remove "refresh images" button dependency, images must auto-load
- [x] 12b.6: Verify end-to-end: all 4 improvements × 3 images = 12 images loaded, no empty squares

## Stage 13 — Store Diversity + Hebrew Search Fix (User-reported critical)
- [x] 13.1: Fix Hebrew labels in Brave search — when label is Hebrew, use categoryQuery (English) instead of Hebrew text
- [x] 13.2: Verify normalizeImprovementShoppingLinks runs and StoreDiversity logs appear after server restart
- [x] 13.3: Ensure store diversity enforcement works — if all 3 links from same store, replace with ASOS/Zara/H&M fallbacks
- [x] 13.4: Add more detailed logging to track LLM output → normalize → diversity → image search pipeline
- [x] 13.5: Test end-to-end: run analysis and verify 3 different images from different stores per improvement
- [x] 13.6: Update vitest tests for Hebrew label handling and store diversity

## Stage 14 — Proxy Image Fix (Root cause of empty squares)
- [x] 14.1: proxyImageToS3 now returns empty string on failure instead of original URL (prevents hotlink-blocked URLs from being saved to DB)
- [x] 14.2: resolveShoppingLinkImage validates proxy results at every step — if proxy fails, continues to next fallback
- [x] 14.3: When Brave best image fails proxy, tries up to 6 other Brave results before falling through to Google
- [x] 14.4: When Google best image fails proxy, tries up to 6 other Google results before falling through to AI
- [x] 14.5: Added safe domain list (totallook.ai, cloudfront.net, unsplash) to skip proxy entirely
- [x] 14.6: Content-type validation — rejects non-image responses (HTML error pages) from proxy
- [x] 14.7: Increased proxy timeout from 6s to 8s for slower CDNs
- [x] 14.8: Cache hit also validates proxy result — if proxy fails on cached URL, continues to search
- [x] 14.9: All 762/766 tests pass (4 pre-existing API failures), TS compiles clean

## Stage 15 — Visual Image Diversity (User-reported critical)
- [ ] 15.1: Root cause: all 3 links per improvement use same categoryQuery → Brave returns same top results → all 3 images look identical despite different URLs
- [ ] 15.2: Fix: vary search query per link — add store name, style variation, or color to differentiate queries
- [ ] 15.3: Fix: when picking images from Brave/Google results, skip images that are visually similar (same domain+path pattern) not just exact URL match
- [ ] 15.4: Fix: use link-specific productName (from LLM label) as primary query, not just categoryQuery
- [ ] 15.5: Test end-to-end: verify 3 visually different images per improvement
- [ ] 15.6: Update vitest tests for query variation logic

## Stage 13b — Store Diversity On-Read Fix (User-reported: all links showing same store)
- [x] 13b.1: Root cause: review.get returns raw DB data without re-applying normalizeImprovementShoppingLinks, so old analyses with all-same-store links are never fixed
- [x] 13b.2: Fix review.get — apply normalizeImprovementShoppingLinks on read (registered user path)
- [x] 13b.3: Fix review.getByShareToken — apply normalizeImprovementShoppingLinks on read (shared review path)
- [x] 13b.4: Fix guest.getResult — apply normalizeImprovementShoppingLinks on read (guest path)
- [x] 13b.5: Fix guest.getByToken — apply normalizeImprovementShoppingLinks on read (WhatsApp deep-link path)
- [x] 13b.6: Fix review.generateProductImages — apply normalizeImprovementShoppingLinks before generating images (registered user)
- [x] 13b.7: Fix guest.generateProductImages — apply normalizeImprovementShoppingLinks before generating images (guest)
- [x] 13b.8: Fix review.generateAllProductImages — apply normalizeImprovementShoppingLinks before batch generating images
- [x] 13b.9: Verified in browser: review 90024 now shows Farfetch + ASOS + ZARA (3 different stores) per improvement

## Stage 15b — Cross-Category Product Image Mismatch (User-reported)
- [x] 15b.1: Root cause: "שדרוג חלק עליון" (top upgrade) improvement card shows pants images instead of tops/sweatshirts — crossCategoryPenalty was only -5 (too weak)
- [x] 15b.2: Fix: strengthened crossCategoryPenalty from -5 to -50 (hard rejection) in both braveImageSearch.ts and googleImageSearch.ts, added +3 bonus for matching category
- [x] 15b.3: Fix: added sweatshirt/crewneck/knitwear to top category keywords in all 4 detection functions (braveImageSearch, googleImageSearch, productImages x2)
- [x] 15b.4: 3 new vitest tests (hard-reject pants for tops, hard-reject tops for bottoms, category bonus). All 765/769 pass (4 pre-existing API failures)
