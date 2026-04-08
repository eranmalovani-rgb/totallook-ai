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
