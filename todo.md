# Fashion Review Platform — Dynamic Upgrade

## Phase 1: Infrastructure
- [x] Upgrade to web-db-user (backend, database, auth)
- [x] Create database schema (users, reviews, images)
- [x] Set up API routes for upload, analysis, history

## Phase 2: AI Analysis Flow
- [x] Build image upload endpoint with S3 storage
- [x] Build AI analysis endpoint using LLM vision API
- [x] Create structured fashion analysis prompt
- [x] Return analysis as structured JSON

## Phase 3: Frontend — Results & History
- [x] Build upload page with drag-and-drop
- [x] Build dynamic results page (like current static one but data-driven)
- [x] Build user history page showing past reviews
- [x] Add loading/progress states during analysis

## Phase 4: Landing & Navigation
- [x] Redesign landing page as platform intro
- [x] Add top navigation with auth state
- [x] Add login/signup flow
- [x] Mobile responsive navigation

## Phase 5: Testing
- [x] Test full upload → analysis → results flow (vitest)
- [x] Test user login and history (vitest auth tests)
- [ ] Test mobile responsiveness (manual)

## Phase 6: Enhanced Features — Product Images, Influencers, Trend Sources
- [x] Add influencer/style preference input on Upload page (text field + popular influencer chips)
- [x] Store user style preferences in database (new column or table)
- [x] Pass influencer context to AI prompt for personalized analysis
- [x] AI returns product image search terms for each improvement
- [x] Display product images in ReviewPage using image search
- [x] Add trend source citations (Vogue, GQ, etc.) to AI analysis output
- [x] Display trend sources with links in ReviewPage
- [x] Update shared types for new fields (productImageQuery, trendSources, influencerContext)
- [x] Write tests for new features (10 tests passing)

## Phase 7: Bug Fixes & Enhancements
- [x] Fix product images not displaying — using built-in image generation API to create product photos
- [x] Enhance AI prompt to detect accessories: rings, bracelets, watches, necklaces, chains
- [x] Identify fashion houses/brands on items (Stone Island, Common Projects, etc.)
- [x] Make all trend source citations real hyperlinks to actual articles
- [x] Shopping links should point to real product/category pages with working URLs
- [x] Test full flow — 13 vitest tests passing, server running clean

## Phase 8: Personalization & Context-Aware Analysis
- [x] Improve AI brand detection prompt (Miu Miu, luxury brands, specific models)
- [x] Create user profile DB schema (age range, role, style preferences, budget)
- [x] Build onboarding questionnaire page (6-step first-time user flow)
- [x] Add occasion/context selector on upload page (9 occasions with icons)
- [x] Build Instagram handle input in onboarding (manual influencer selection)
- [x] Integrate user profile into AI analysis prompt for personalized recommendations
- [x] Pass occasion context to AI for relevant suggestions
- [x] Update ReviewPage to show occasion-specific tips
- [x] Write tests for new features (17 tests passing)

## Phase 9: Instagram Integration, Gender-Filtered Influencers, Hyperlinks in Analysis
- [x] Add gender tags to POPULAR_INFLUENCERS (male/female/unisex)
- [x] Filter influencer suggestions by user's selected gender in onboarding
- [x] Build Instagram follower scanning — LLM-based IG influencer discovery
- [x] Show IG-based influencer suggestions in onboarding (step 5 → IG, step 6 → selection)
- [x] Update AI prompt to return linkedMentions array with brand/influencer/store URLs
- [x] Update ReviewPage with LinkedText component — all mentions are clickable hyperlinks
- [x] Write tests for new features (17 tests passing)

## Phase 10: Critical Bug Fixes
- [x] Fix analysis not working — was API quota issue (412), added retry logic with exponential backoff
- [x] Fix onboarding: step 6 now hides already-selected IG influencers from popular list
- [x] Allow user to add their own influencers — custom input field on Upload page
- [x] Test full flow end-to-end: upload → analysis → results — WORKING (review/12 created successfully)

## Phase 11: Social Sharing, Total Look, Influencer Posts
- [x] Add "Total Look" button — generates AI image of the complete recommended outfit (flat lay mood board)
- [x] Create server endpoint for Total Look image generation (review.generateTotalLook mutation)
- [x] Display Total Look image in a modal on ReviewPage (TotalLookModal component)
- [x] Add influencer example post feature — LLM generates post description + AI generates outfit image
- [x] Display influencer post preview on click (InfluencerPostModal with caption, styling tip, tags)
- [x] Influencer names in analysis are now clickable — opens example post modal with Instagram icon
- [x] Add social sharing buttons (WhatsApp, Telegram, copy link) — ShareButtons component
- [x] Share dialog shows preview card with score and summary
- [x] Write tests for new features (24 tests passing)

## Phase 12: Reliability & Smart Shopping Links
- [x] Fix analysis failures — improved retry to 4 attempts with longer backoff (5-30s), added timeout/network error handling
- [x] Add frontend retry button when analysis fails — both on Upload page (with countdown) and ReviewPage (RetryAnalyzeButton)
- [x] Better error messages: התמונה כבר נשמרה, לא צריך להעלות מחדש
- [x] Shopping links now use specific product search URLs via fixShoppingLinkUrls() post-processing
- [x] Added STORE_SEARCH_PATTERNS for 19 stores (SSENSE, Nordstrom, Farfetch, Nike, Adidas, etc.)
- [x] Bare domain URLs auto-converted to search URLs using productSearchQuery or label
- [x] Validate shopping link URL patterns in tests (27 tests passing)

## Phase 13: UX & Logic Fixes (8 issues)
- [x] Force onboarding for new users before allowing upload — Home.tsx redirects to /onboarding if profile incomplete
- [x] Fix Instagram connection — removed Instagram scan step, replaced with curated influencer list selection only
- [x] Add age range 16-17 option in onboarding (first in list)
- [x] Fix external shopping links — reinforced prompt + fixShoppingLinkUrls() ensures search query URLs, never bare domains
- [x] Returning logged-in users go straight to upload page with personal greeting (שלום [name]!)
- [x] Every score below 10 explains deductions — AI prompt requires explanation + ScoreBar shows "נקודות לשיפור — ראה המלצות"
- [x] More encouraging scoring — minimum score 5, positive verdicts (יש פוטנציאל, ניתן לשדרג), server-side clamp
- [x] Image quality check — AI prompt checks for blurry/cropped images and suggests better photo if accessories unclear

## Phase 14: Logout & Delete History
- [x] Add visible logout button in navbar/profile area — כפתור "התנתקות" בולט עם טקסט בנאוובר + תפריט מובייל
- [x] Add "delete all history" feature — server endpoint review.deleteAll + deleteAllReviewsByUserId in db.ts
- [x] Add confirmation dialog before deleting history — AlertDialog with count and warning
- [x] Write tests for new endpoints (35 tests passing)

## Phase 15: Bug Fix — Logout & Delete Not Working
- [x] Fix logout: clear localStorage, redirect to home "/", show toast "התנתקת בהצלחה"
- [x] Fix delete-all: verified endpoint works, AlertDialog + toast confirmation

## Phase 16: Delete Account (Full User Deletion)
- [x] Add server endpoint profile.deleteAccount — removes profile, all reviews, user record, clears session cookie
- [x] Add deleteUserAccount helper in db.ts — deletes reviews → userProfiles → users in order
- [x] Add "מחק חשבון" button in Navbar (desktop + mobile) with AlertDialog confirmation
- [x] Confirmation dialog warns: פעולה בלתי הפיכה, lists all data that will be deleted
- [x] After deletion: clear localStorage, clear cookie, toast "החשבון נמחק בהצלחה", redirect to landing
- [x] Write tests for deleteAccount endpoint (38 tests passing)

## Phase 17: Bug Fix — Login Loop
- [x] Fix login loop — Home.tsx now redirects to /onboarding when profile is null (new user or deleted account), Upload.tsx waits for profile query to finish before checking onboarding status

## Phase 18: Bug Fix — Onboarding Infinite Loop
- [x] Fix onboarding infinite loop — added cache invalidation (utils.profile.get.invalidate()) after profile.save in Onboarding.tsx
- [x] Fixed Home.tsx to use profileFetched instead of profileLoading for reliable null vs loading detection
- [x] Fixed Upload.tsx to wait for profileFetched before checking onboarding status
- [x] Restarted dev server to clear stale Vite cache
- [x] All 38 tests passing, TypeScript clean, dev server shows correct Upload page for logged-in user

## Phase 19: Bug Fix — Onboarding Loop (Still Broken)
- [x] Fix onboarding loop — root cause: onboardingCompleted stored as int (1/0) in DB but checked as boolean in frontend
- [x] Fixed server profile.get to convert onboardingCompleted to Boolean
- [x] Fixed all frontend checks to use !!profile?.onboardingCompleted (truthy check)
- [x] Changed all critical redirects (Home, Upload, Onboarding finish) to use window.location.href for full page reload instead of wouter navigate, ensuring clean query state
- [x] Restarted dev server to clear stale Vite cache

## Phase 20: Verification — Onboarding Flow Confirmed Working
- [x] Tested full onboarding flow in browser: gender → age → occupation → budget/style → influencers → "בוא נתחיל!"
- [x] Successfully redirected to /upload with greeting "שלום Eran! טוב לראות אותך שוב"
- [x] Verified in DB: profile saved correctly (onboardingCompleted=1, gender=male, ageRange=25-34, etc.)
- [x] All 38 tests passing

## Phase 21: Look Visualization, Gender-Correct Links, Better AI Detection
- [x] Generate visual look image (flat lay / mood board) for each outfit suggestion — OutfitCard with "צפה בלוק" button + generateOutfitLook endpoint
- [x] Fix gender mismatch in shopping links — STORE_SEARCH_PATTERNS now gender-aware functions
- [x] Pass user gender to fixShoppingLinkUrls from analyze procedure
- [x] Improve AI brand/item detection — prompt requires brand+model+color in search queries, specific prices in outfit items
- [x] Added lookDescription field to OutfitSuggestion type + JSON schema for AI-generated flat-lay prompts
- [x] All 38 tests passing, TypeScript clean

## Phase 22: Virtual Wardrobe & Wardrobe-Based Recommendations
- [x] Create wardrobeItems DB table (userId, itemType, color, brand, material, imageUrl, sourceReviewId, createdAt)
- [x] Add saveToWardrobe preference to userProfiles schema
- [x] Add onboarding step asking user if they want to save items to virtual wardrobe
- [x] Auto-save detected items from analysis to wardrobe after each review
- [x] Build wardrobe page showing all saved items (grouped by category)
- [x] Add wardrobe route to navigation
- [x] Integrate wardrobe items into AI analysis prompt — recommend outfits using existing items + external items
- [x] AI should suggest "you already have X, pair it with Y" style recommendations
- [x] Write tests for wardrobe features (49 tests passing)

## Phase 23: Multi-Select Style Preference in Onboarding
- [x] Change style preference question from single-select to multi-select
- [x] Update DB/server to store multiple style preferences (comma-separated)
- [x] Update AI prompt to use multiple style preferences
- [x] Update tests (50 tests passing)

## Bug: Image analysis not working after upload
- [x] Investigated server logs — rate limit issue, not a code bug
- [x] Root cause: LLM API rate limit (429/quota exhausted)
- [x] API is working again (tested successfully)

## Improvement: Better retry/rate-limit handling for LLM analysis
- [x] LLM API tested — working (status 200)
- [x] Improved retry: 5 attempts, longer delays (8s→60s), broader error detection
- [x] Improved error messages and frontend retry countdown (30s)

## Fix: Wardrobe deduplication and item images
- [x] Deduplicate wardrobe items — check if item already exists (by name+type+userId) before inserting
- [x] Add DB helper to check for existing wardrobe items
- [x] Generate individual item images using AI image generation from the original photo
- [x] Add itemImageUrl column to wardrobeItems schema
- [x] Update wardrobe page UI to display item images
- [x] Clean up existing duplicate items from DB (0 duplicates found)

## Phase 24: Branding, Wardrobe Images, Speed & Loading Animation
- [x] Remove "Fashion AI" branding from all pages (Navbar, Home, ShareButtons, HTML title)
- [x] Replace with "Touch Up Agency" branding throughout
- [x] Update page title to "Touch Up Agency — חוות דעת אופנתית" (note: VITE_APP_TITLE should be updated in Settings > General)
- [x] Fix wardrobe item images — now generates clean AI reference product photos (removed originalImages param)
- [x] Optimize analysis speed — changed image detail from 'high' to 'auto' for faster processing
- [x] Created FashionLoadingAnimation component — step-by-step progress, animated icons, fashion facts, progress bar (52 tests passing)

## Phase 25: Profile Summary Page
- [x] Create Profile page showing summary of all current settings (gender, age, occupation, budget, styles, influencers, wardrobe preference)
- [x] Allow inline editing of each individual field without redoing full onboarding
- [x] Add "הגדר פרופיל מחדש" button that redirects to full onboarding flow
- [x] Update /onboarding route in navbar to point to /profile
- [x] All 52 tests passing

## Phase 26: English Language Support
- [x] Create translations file with Hebrew and English strings
- [x] Create LanguageContext and useTranslation hook
- [x] Add language toggle (HE/EN) to Navbar
- [x] Apply translations to all pages: Home, Upload, Profile, Wardrobe, History, Onboarding, ReviewPage, NotFound
- [x] Handle RTL/LTR direction switching based on language
- [x] Apply translations to shared components: Navbar, FashionLoadingAnimation, ShareButtons, InfluencerPostModal, TotalLookModal
- [x] AI analysis prompt language now matches selected language (lang passed to server)
- [x] 52 tests passing, TypeScript clean

## Phase 27: Fashion-Themed Loading Animation
- [x] Found all Loader2 usages across 9 files
- [x] Created FashionSpinner component with animated hanger + shimmer + fabric wave + pulse glow
- [x] Replaced all Loader2 in: Home, Upload, History, Wardrobe, Profile, Onboarding, ReviewPage, TotalLookModal, InfluencerPostModal
- [x] FashionSpinner is language-agnostic (visual only), 52 tests passing

## Phase 28: AI Analysis Language Support
- [x] Pass user's selected language (EN/HE) from frontend to review.analyze mutation
- [x] Update buildFashionPrompt to accept language parameter
- [x] When language is EN, instruct AI to respond entirely in English
- [x] When language is HE (default), keep Hebrew as before
- [x] 52 tests passing, TypeScript clean

## Phase 29: Rebrand to TotalLook.ai
- [x] Find and replace all "Touch Up Agency" references with "TotalLook.ai"
- [x] Find and replace all "Touch Up" references with "TotalLook.ai"
- [x] Update HTML page title
- [x] Update share text and metadata
- [ ] Generate new TotalLook.ai logo
- [ ] Update VITE_APP_TITLE via webdev_request_secrets
- [x] Run tests and verify (52 tests passing)

## Phase 30: Logo Direction Fix & Domain
- [x] Fix logo showing as "ai.TotalLook" instead of "TotalLook.ai" in RTL mode — force LTR direction on logo
- [ ] Inform user to update domain from touchup.agency to totallook.ai in Settings > Domains

## Phase 38: Onboarding UX Improvements — Store Logos & Social Connections
- [x] Replace store text names with logos in onboarding budget/location store selection screen
- [x] Add new Social Connections screen (Instagram active, TikTok coming soon, Pinterest coming soon) before influencer selection in onboarding

## Phase 31: Expand Influencer List
- [x] Research top 10 global fashion influencers to add
- [x] Research top Israeli fashion influencers to add
- [x] Add new influencers to POPULAR_INFLUENCERS array with correct gender tags
- [x] Verify no duplicates with existing list (Chiara Ferragni already existed, not duplicated)
- [x] Run tests and verify (52 tests passing)

## Phase 32: Influencer UX Improvements
- [x] Add `country` field to Influencer interface ("IL" | "global")
- [x] Tag all influencers with correct country
- [x] Add `imageUrl` field to Influencer interface for profile photos
- [x] Create InfluencerAvatar component with initials-based gradient avatars (no external photos needed)
- [x] Create reusable InfluencerPicker component with country tabs + search + avatars
- [x] Update Onboarding page: integrated InfluencerPicker with tabs (הכל / ישראלים / בינלאומיים) + search
- [x] Update Upload page: integrated InfluencerPicker with tabs + search
- [x] Update Profile page: integrated InfluencerPicker with tabs + search
- [x] Translations inline in InfluencerPicker (Hebrew/English)
- [x] Run tests and verify (52 tests passing)

## Phase 33: Critical Bug Fix — Influencer Gender Filtering
- [x] Fix AI prompt to enforce gender-appropriate influencer suggestions (CRITICAL constraint added)
- [x] Fix post-processing: filter out wrong-gender influencer linkedMentions after AI response
- [x] Fix supplement mentions: skip wrong-gender influencers when adding IG URLs
- [x] Verified InfluencerPicker already filters correctly by gender prop
- [x] Verified gender prop is correctly passed from Onboarding, Upload, and Profile pages
- [x] Added 7 new gender filtering tests (59 tests passing)

## Phase 34: Smart Scoring — Don't Score Non-Visible Categories
- [x] Update AI prompt: categories not visible in image get score: null with a recommendation instead
- [x] Update JSON schema to allow null scores and recommendation field in score categories
- [x] Update overall score calculation to exclude null-scored categories (recalculated from visible scores only)
- [x] Update frontend ScoreBar to show "לא נראה" + ✨ recommendation for null-scored categories
- [x] Add 2 new tests for null score handling (61 tests passing)

## Phase 35: Camera Capture — Take Photo Directly
- [x] Add camera capture button alongside gallery upload on Upload page
- [x] Support both "choose from gallery" and "take photo" options on mobile (uses capture="environment")
- [x] Add translations for camera button text (Hebrew + English)
- [x] Run tests and verify (61 tests passing)

## Phase 36: Style Feed MVP
- [x] Create DB tables: feedPosts, likes, saves
- [x] Run db:push to migrate
- [x] Create backend procedures: feed.list, feed.publish, feed.delete, feed.like, feed.unlike, feed.save, feed.unsave, feed.saved, feed.isPublished
- [x] Build Feed page with infinite scroll grid, score badges, avatars, time ago
- [x] Add filtering tabs: All / Popular / New / Saved
- [x] Add Like (heart) and Save (bookmark) buttons on each card
- [x] Add "Share to Feed" button on ReviewPage with caption input
- [x] Add Feed to Navbar navigation (Rss icon) + /feed route
- [x] Add Hebrew + English translations (30+ keys)
- [x] Owner can delete their own posts (AlertDialog confirmation)
- [x] Write 11 tests for feed procedures (72 total passing)

## Phase 37: Style Feed Enhancements
### UX Improvements
- [x] Redesign feed cards: make AI score large and prominent (center/overlay, not tiny corner badge)
- [x] Add user avatar, name, style tags, and caption below the image
- [x] Clicking a feed card opens the full AI analysis page (/review/:id)
- [x] Improve card layout for mobile (Instagram-style full-width cards)
- [x] Add "View full analysis" hover overlay and bottom-right link on cards

### Follow System
- [x] Create `follows` DB table (followerId, followedId, createdAt)
- [x] Add backend procedures: feed.follow, feed.unfollow, feed.following, feed.isFollowingUser
- [x] Add "Follow" / "Following ✓" button on each feed card (next to username)
- [x] Add "Following" filter tab in feed (show only posts from followed users)
- [x] isFollowing state included in all feed list/saved/following queries

### Notification System
- [x] Create `notifications` DB table (userId, type, actorId, actorName, postId, isRead, createdAt)
- [x] Add backend procedures: feed.notifications, feed.unreadCount, feed.markRead
- [x] Auto-create notifications for all followers when user publishes to feed
- [x] Add notification bell icon in Navbar with unread count badge
- [x] Notification dropdown with list of recent notifications (click to navigate to feed)
- [x] Notifications auto-mark as read when dropdown is opened
- [x] Polls for new notifications every 30 seconds
- [x] Hebrew + English translations for all notification/follow features

### Tests
- [x] Write tests for follow procedures (follow, unfollow, isFollowingUser, following)
- [x] Write tests for notification procedures (notifications, unreadCount, markRead)
- [x] Verify all existing tests still pass (79 total tests passing)

## Phase 38: Style Feed Promo Section on Home & Upload Pages
- [x] Create FeedPromoSection component with live preview cards from feed
- [x] Add "Discover the Community" section with gradient title and subtitle
- [x] Show top popular posts as preview cards with scores and usernames
- [x] Add stats row (looks shared, AI scored, likes)
- [x] Add prominent gradient CTA button "Enter Style Feed"
- [x] Add section to Upload page (below tips)
- [x] Add section to Home page (above final CTA)
- [x] Handle gracefully when fewer than 3 posts exist (flex layout centers cards)
- [x] Add Hebrew + English translations for all promo text
- [x] All 79 tests passing

## Phase 39: Compact Upload Page UX
- [x] Merge "בחר מהגלריה" and "צלם תמונה" into single clickable upload zone (whole area is clickable)
- [x] Reduce upload zone padding (p-12 → p-6), shrink icon (w-20 → w-14)
- [x] Reduce header spacing (pt-28 → pt-20, mb-10 → mb-4), smaller title text
- [x] Tighten subtitle text and greeting spacing (text-sm, mb-1)
- [x] Tips section collapsed by default (details/summary) — saves ~100px
- [x] Feed Promo section compacted (py-20 → py-10, smaller cards, tighter stats)
- [x] Feed Promo section visible on desktop without scrolling
- [x] All 79 tests passing

## Bug Fix: Cannot view other users' analysis from feed
- [x] Fix review.get to allow public access when review is shared to feed (checks isReviewPublished)
- [x] Keep private reviews restricted to owner only (throws Unauthorized if not published)
- [x] ReviewPage shows "Back to Feed" button for non-owners instead of owner actions
- [x] Update/add tests for public review access (81 tests passing)

## Phase 40: Dramatic Feed Card Score & Key Phrase
- [x] Redesign score display: large dramatic score at top-left with color-coded glow effect (green/blue/yellow/red)
- [x] Add key analysis phrase overlay at bottom of image with gradient background and quotes
- [x] Score positioned top-left, key phrase at bottom — no overlap with image content
- [x] Added `summary` column to feedPosts table, backfilled existing posts from analysisJson
- [x] Publish procedure now saves summary from AI analysis
- [x] Key phrase extracted from first sentence of summary (max 70 chars)
- [x] Magazine-style card with glow, backdrop blur, and gradient overlays
- [x] All 81 tests passing

## Phase 41: Visual-First Outfit Suggestions Redesign
- [x] Show Total Look generated image as the primary visual element (full 3:4 aspect ratio hero)
- [x] Replace text-heavy item list with visual card layout (image-first, expandable details)
- [x] Click on Total Look image expands to show product details with shopping links
- [x] Each product shows numbered item with brand links and "Buy Now" CTA
- [x] Color palette shown as circles overlaid on the outfit image
- [x] "View Look" button generates AI image, then image becomes clickable hero
- [x] Smooth expand/collapse animation for product details panel
- [x] Outfit name, occasion, and inspiration note shown as overlay on image
- [x] All 81 tests passing

## Phase 42: Fix Outfit Suggestions — Auto-Generate & Product Details
- [x] Debug why outfit look generation was failing (authorization blocked non-owners, now allows published reviews)
- [x] Auto-generate outfit look images on page load (useEffect with ref to prevent double-fire)
- [x] Show generated images immediately when ready with loading spinner placeholder
- [x] Replace "View Look" button with "Product Details" button below the image
- [x] Product details button expands to show numbered items with brand links and "Buy Now" CTAs
- [x] Smooth loading state with FashionButtonSpinner while images generate
- [x] Error state with retry button if generation fails
- [x] All 81 tests passing

## Phase 43: Fix Product Recommendation Diversity
- [x] Fix AI prompt to ensure diverse product types in recommendations (not same category repeated)
- [x] Added CRITICAL PRODUCT DIVERSITY RULES section to AI prompt
- [x] Each improvement must recommend a DIFFERENT product category with examples of wrong vs correct
- [x] Shopping links within one improvement must show variety (different brands, stores, complementary items)
- [x] Across all improvements, must cover at least 4 different product categories
- [x] Outfit suggestions must include items from at least 5 different categories
- [x] All 81 tests passing

## Phase 44: Fix Within-Category Product Diversity
- [x] Fix AI prompt: within the same category (e.g. necklaces), recommend 3 DIFFERENT styles/designs, not 3 identical items
- [x] Each shopping link must vary in style (minimalist vs bold vs layered), price range ($50-$1200), and brand
- [x] Reverted cross-category diversity rules — it's fine to have 3 necklaces under necklaces, just different ones
- [x] Added concrete examples of WRONG vs CORRECT for both necklaces and sneakers
- [x] All 81 tests passing

## Phase 45: Fix Duplicate Product Images + Remove Influencer Picker from Upload
### Product Image Diversity
- [x] Fixed: productImages.ts now uses link.label (specific product name) instead of shared productSearchQuery
- [x] Each shopping link gets its own unique image prompt based on its specific product name
- [x] Product images will now visually differ — different styles, colors, silhouettes per link
### Upload Page — Influencer Section
- [x] Removed InfluencerPicker component from Upload page
- [x] Added compact info bar showing selected influencer names as chips
- [x] "Change in Profile" / "Choose in Profile" button links to /profile
- [x] Removed unused imports (InfluencerPicker, POPULAR_INFLUENCERS, customInfluencer state)
- [x] All 81 tests passing

## Phase 46: Remove Style Preferences + Feed Promo Carousel
### Upload Page
- [x] Remove "העדפות סגנון" (Style Preferences) section from Upload page
### Feed Promo Section
- [x] Replace static 3-card grid with swipeable carousel
- [x] Load all feed posts (up to 20, not just top 3)
- [x] Carousel should be touch-swipeable on mobile (snap-x snap-mandatory)
- [x] Auto-rotate cards with smooth animation (3s interval, pauses on hover/touch)
- [x] Show navigation dots + left/right arrows for manual control

## Phase 47: Admin Dashboard — View All Uploads & Users
### Backend
- [x] Create admin-only procedures (restricted to owner/admin role)
- [x] admin.allReviews — list all reviews with images, scores, user info (paginated)
- [x] admin.allUsers — list all users with profile info, review count
- [x] admin.stats — total users, total reviews, total feed posts, total likes
- [x] admin.deleteReview — delete any review as admin
### Frontend
- [x] Build /admin page with tabs: Overview, All Uploads, Users
- [x] All Uploads tab: grid of all uploaded images with score, user, date, status badges
- [x] Click on image opens full analysis review page (hover overlay with View Analysis button)
- [x] Users tab: table of all users with name, email, gender, role, review count, feed post count, dates
- [x] Overview tab: 5 stat cards (users, reviews, completed, feed posts, likes) with gradient styling
- [x] Admin link in Navbar visible only to owner/admin (Shield icon)
- [x] Protect /admin route — shows Access Denied for non-admins
### Tests
- [x] Write 12 tests for admin procedures (auth check, data retrieval) — 93 total tests passing

## Bug Fix: Missing Navbar on Feed page
- [x] Add Navbar component to Feed page (currently missing navigation menu)

## Bug Fix: Carousel click opens general feed instead of specific post
- [x] Clicking a post in the homepage feed carousel should navigate to the specific review (/review/:id), not to /feed

## Bug Fix: Deleting user leaves orphaned feed posts and data
- [x] Fix deleteAccount to cascade-delete all user data (feed posts, likes, saves, reviews, wardrobe items, followers, notifications)
- [x] Clean up existing orphaned records in database from previously deleted users (2 feed posts, 1 like, 1 notification, 1 follow removed)

## Logo for OAuth login page
- [x] Generate a stylish TotalLook.ai logo/icon and set as VITE_APP_LOGO (uploaded to CDN)

## Budget-Aware Shopping Recommendations
- [x] Add preferredStores field to userProfiles schema + DB migration pushed
- [x] Add STORE_OPTIONS (20 stores) and BUDGET_STORE_MAP to shared/fashionTypes.ts
- [x] Add "preferred stores" step in Onboarding (step 5 of 7, between budget/style and wardrobe)
- [x] Show recommended stores based on selected budget level, with "other stores" section
- [x] Allow custom store input in onboarding
- [x] Add preferredStores to profile.save procedure + upsertUserProfile allowlist
- [x] Add preferredStores editing to Profile page (with Store icon and grid selector)
- [x] Update AI prompt: inject preferredStores + budget into prompt context
- [x] AI prioritizes user's preferred stores for shopping links (50%+ from preferred)
- [x] Add 15 new store search URL patterns (Shein, H&M, Mango, Pull&Bear, Bershka, AllSaints, Reiss, Ted Baker, Sandro, Maje, Urban Outfitters, Forever 21, & Other Stories, Arket, Primark)
- [x] Add store URL patterns to AI prompt instructions
- [x] Hebrew translations for all store-related UI
- [x] 93 tests passing, TypeScript clean

## Improve Brand Detection Accuracy
- [x] Update AI prompt to use hedging language ("כפי הנראה", "ייתכן") when not 100% certain about brand
- [x] AI should not confidently name a brand unless clearly visible (logo, pattern, distinctive design)
- [x] When uncertain, describe the item generically (e.g. "חולצת פולו בסגנון קלאסי") instead of guessing wrong brand

## Feed Comments System
- [x] Create feedComments DB table (id, feedPostId, userId, content, parentId for replies, userName, createdAt)
- [x] Add comment count query (feed.commentCount procedure)
- [x] Backend: feed.addComment, feed.getComments, feed.commentCount, feed.deleteComment procedures
- [x] Frontend: FeedComments component on each feed post card (expandable with toggle)
- [x] Reply to comments (nested one level with CornerDownRight icon)
- [x] Show commenter name + relative time (date-fns with he/en locale)
- [x] Delete own comments (Trash2 icon)
- [x] Hebrew translations for comments UI

## Virtual Wardrobe Sharing
- [x] Add wardrobeShareToken field to userProfiles (unique nanoid token)
- [x] Backend: wardrobeShare.generateLink, wardrobeShare.getToken, wardrobeShare.view (public), wardrobeShare.revokeLink
- [x] Create /wardrobe/shared/:token public page (SharedWardrobe.tsx) showing items grouped by category
- [x] Add "שתף/י ארון" button on Wardrobe page with Share2 icon
- [x] Share dialog with copy link, revoke share, and link preview
- [x] Shared wardrobe page shows items grouped by category with brand, color, score (read-only, no auth)
- [x] Hebrew translations for sharing UI
- [x] 11 new tests for comments + wardrobe sharing (104 total tests passing)

## Fix: Share Dialog Mobile + Comment Notifications + Internal Wardrobe Sharing
- [x] Fix share dialog mobile responsiveness — bottom-aligned on mobile with safe area padding
- [x] Add notification when someone comments on your feed post (+ reply notifications)
- [x] Don't notify yourself on your own comments
- [x] Show comment/reply notification types in Navbar bell dropdown (he/en)
- [x] Make shared wardrobes browsable by logged-in users — clickable username in feed navigates to shared wardrobe
- [x] Added wardrobeShareToken to feed posts query for in-app wardrobe linking
- [x] 104 tests passing, TypeScript clean

## Admin: Clickable Review Detail View
- [x] Click on a review in Admin "All Uploads" tab opens a detail modal with full analysis
- [x] Modal shows: full image, score card, user info (name, email, date, occasion), summary, category score bars, detected items (with brand/color/icon), improvements
- [x] "Open Full Page" button navigates to /review/:id
- [x] Delete review option inside the modal
- [x] Admin can view any review (not just own or shared) — updated review.get access control
- [x] Added analysisJson to getAllReviews query
- [x] 104 tests passing, TypeScript clean

## Bug Fix: Share dialog still broken on mobile
- [x] Share dialog is cut off on mobile — rewrote as bottom sheet on mobile, centered modal on desktop
- [x] Use fixed inset-x-0 bottom-0 pattern for mobile with drag handle
- [x] Full width on mobile, proper padding, no overflow, RTL-aware icons

## Bug Fix: Shopping links lead to 404 pages
- [x] AI generates fake product URLs that don't exist (e.g. mrporter.com/product/fake-slug)
- [x] Fix fixShoppingLinkUrls() to always convert to search/query URLs — rewrote to ALWAYS rebuild URLs as search URLs
- [x] Verify all store search patterns actually work with real queries — 33 stores tested
- [x] Strengthen AI prompt to never generate direct product URLs, only search URLs — added FORBIDDEN examples
- [x] Added isValidSearchUrl() to detect already-correct search URLs and avoid double-converting
- [x] 53 new tests for shopping link URL fixing, 157 total tests passing

## UX: Analyze Button Visibility & Scroll Behavior
- [x] Make "נתח את הלוק שלי" button more dominant and visible — gradient bg, glow effect, larger text, hover scale animation
- [x] Auto-scroll to top of page when analyze button is clicked to show the analysis progress — window.scrollTo smooth

## Fix: Scroll to loading animation area, not top of page
- [x] When analyze button clicked, scroll to the loading animation section (icons + messages) instead of window top — uses ref + scrollIntoView center

## Fix: Scroll position still too high — need to show full loading animation
- [x] Adjust scroll target so the entire loading animation area (all message lines) is visible — wraps FashionLoadingAnimation in ref div, uses getBoundingClientRect with 80px navbar offset

## Feature: Edit/Correct Item in Review Results
- [x] Backend: Add `review.correctItem` tRPC mutation — accepts reviewId, itemIndex, correction text, lang
- [x] Backend: Partial re-analysis with LLM — sends corrected item info, gets updated analysis with proper score/verdict
- [x] Backend: Update review JSON in DB with corrected item data, recalculates overall score
- [x] Backend: Updates wardrobe item if it was auto-saved from the corrected item
- [x] Backend: Enriches with known brand URLs from BRAND_URLS
- [x] Frontend: Add edit/pencil button on each item card (only visible to review owner)
- [x] Frontend: Inline correction form with text input, Enter to submit, cancel button
- [x] Frontend: Loading state during re-analysis, toast on success/error, auto-refresh
- [x] i18n: Added 7 new translation keys (he/en) for correction UI
- [x] Tests: 13 new tests for correctItem — auth, validation, schema, lang options (170 total passing)

## Bug: ReviewPage crashes after analysis completes (production)
- [x] Investigate and fix the "An unexpected error occurred" crash on ReviewPage after analysis finishes — added defensive null checks for all analysis fields, LinkedText, ScoreCircle, OutfitCard arrays

## Bug: ReviewPage STILL crashes after analysis (production) — defensive checks not enough
- [x] Deep investigate and fix the persistent crash — root cause: React hooks (useState, useUtils, useMutation) for correctItem feature were placed AFTER early returns, violating React hooks rules. When component first rendered in loading state, those hooks weren't called. When data arrived and component re-rendered past early returns, React saw more hooks and crashed. Fix: moved all correctItem hooks before the first early return.

## Feature: Privacy Reassurance + Share Toggle
- [x] Upload page: Add prominent privacy banner near upload area — emerald green banner with lock icon
- [x] DB: Reviews are already private by default — sharing requires explicit feedPost creation (existing architecture is correct)
- [x] ReviewPage: Add privacy note above actions — "הניתוח שלך פרטי — רק אתה רואה אותו. לחץ שתף לפיד אם תרצה לשתף."
- [x] Feed: Already only shows explicitly published feedPosts (no change needed)
- [x] i18n: Added translation keys for privacyBanner, privacyIcon, privateNote, privateLabel, publicLabel (he+en)
- [x] Tests: 170 tests passing, no regressions

## Update: "How it works" section on Home page
- [x] Update "How it works" from 3 steps to 5 steps: Style Profile, Upload, AI Analysis, Correct & Improve, Shop & Share
- [x] Expand "What you get" from 4 to 8 items: added Item Correction, Virtual Wardrobe, Community Feed, Full Privacy
- [x] Redesigned steps as vertical list with colored icons instead of 3-column grid
- [x] Added subtitle under "How it works" heading
- [x] Each step has unique accent color (blue, primary, purple, amber, emerald)
- [x] i18n: Added all new translation keys for steps 4-5 and 4 new what-you-get items (he+en)

## Feature: Scroll animations on Home page
- [x] Add fade-in/slide-up animations to "How it works" steps when scrolling into view — slide from side with stagger
- [x] Add fade-in/slide-up animations to "What you get" cards when scrolling into view — scale + fade with stagger
- [x] Stagger animation delay for sequential items — 120ms per step, 80ms per card
- [x] Added useScrollReveal hook with IntersectionObserver (fires once, cleans up)
- [x] Hero section and CTA section also animate on scroll

## Bug: Home page blank on production — only navbar visible
- [x] Investigate and fix blank Home page — root cause: scroll-reveal animations started at opacity-0 and IntersectionObserver didn't fire on production/mobile. Fix: hero section set to immediate:true, all other sections have 800ms fallback timer + rootMargin:50px for better detection

## Bug: Home page STILL has large blank/transparent areas on production
- [x] Fix remaining invisible content — replaced JavaScript IntersectionObserver scroll-reveal with pure CSS @keyframes fade-in-up animations. All sections now use CSS animation-delay for staggered entrance, guaranteeing content is always visible regardless of browser/device. Removed useScrollReveal hook entirely. 170 tests passing.

## Feature: Multiple share-to-feed CTAs in ReviewPage
- [x] Add share-to-feed CTA after the overall score section (before improvements)
- [x] Add share-to-feed CTA after the items/analysis section
- [x] Make share CTAs visually appealing but not intrusive — subtle banner style with gradient bg
- [x] Only show share CTAs to the review owner (not viewers) — wrapped in isOwner check
- [x] Hide share CTAs if review is already shared to feed — shows green "already shared" state

## Bug: Overall score not recalculated after item correction
- [x] When correctItem re-analyzes a single item and the score changes, recalculate the overall score — category scores adjusted proportionally, new formula 60/40 cat/item weight
- [x] Update the analysisJson in DB with new overallScore after correction

## Feature: Like notifications
- [x] Send notification to review owner when someone likes their post in the feed — createLikeNotification in db.ts
- [x] Use in-app notification system — added "like" type to Navbar notification rendering (desktop + mobile)
- [x] Avoid duplicate notifications for same user liking/unliking repeatedly — dedup check in createLikeNotification

## Feature: WhatsApp share from inline CTA banner
- [x] Add WhatsApp share button alongside the feed share in the ShareCTABanner component — green circle button next to CTA
- [x] Share link to the review page with score and summary text — bilingual WhatsApp share text

## Feature: Confetti animation on first feed share
- [x] Show confetti/celebration animation when user shares to feed for the first time — triple burst effect
- [x] Only trigger on successful publish, not on "already shared" state
- [x] Use canvas-confetti library — installed and integrated in both ShareCTABanner and ShareToFeedButton

## Feature: Make site look unique — remove Manus-generic feel
- [x] Audit and identify all Manus-generic elements (login dialog, default fonts, color scheme, layout patterns)
- [x] Replace default font with Playfair Display (display headings) + Heebo (body) — luxury editorial feel
- [x] Customize color palette from blue/purple (hue 260) to warm gold/amber (hue 75) — 99 references replaced across 21 files
- [x] Customize the Manus login dialog — dark theme, Hebrew text, gold gradient button, removed "Login with Manus" text
- [x] Unique micro-interactions preserved (confetti, fashion spinner, hover effects all updated to new palette)
- [x] Footer, navbar, and key UI elements all use new warm gold branding

## Fix: Replace remaining green colors with warm palette
- [x] Find and replace all emerald/green color references across 12 client files — 48 references replaced
- [x] Use warm alternatives: amber-400/500 for success/positive, teal-400/500 for WhatsApp, primary for accents

## Feature: Email notification on new user signup
- [x] Send Manus notification when a new user signs up (first login) — checks if user exists in DB before upsert
- [x] Include user name, email, login method, and time (Israel timezone) in the notification
- [x] Uses built-in notifyOwner — fire-and-forget, never blocks the login flow

## Feature: Direct Gmail email on new user signup
- [ ] Send email to eranmalovani@gmail.com via Nodemailer — skipped (App Password not available)
- [x] Manus notification on new user signup works as fallback

## Feature: Fix My Look (Level 2 — Image Edit)
- [x] Create tRPC procedure `review.fixMyLook` — LLM builds edit prompt, generateImage with originalImages, returns before/after + estimated score
- [x] Build BeforeAfterSlider component — draggable/touch slider with labels and scores
- [x] Build FixMyLookModal — item selection checkboxes (weak items pre-selected), loading with FashionSpinner, result with slider + shopping links + download
- [x] Add FixMyLook CTA banner to ReviewPage (after improvements, before Total Look) — shows only for owner when score < 9
- [x] Hebrew + English translations built into FixMyLookModal component
- [x] 170 tests passing, TypeScript clean, all wired together

## Feature: Save Fix My Look results to DB
- [x] Add fixMyLookResults table to schema (reviewId, userId, fixedImageUrl, originalScore, estimatedScore, itemsFixed JSON, shoppingLinks JSON, itemIndices JSON, createdAt)
- [x] Push DB migration — 0013_adorable_preak.sql
- [x] Save result to DB after successful generation — deletes previous result, saves new one (fire-and-forget)
- [x] Add review.getFixMyLookResult query — returns saved result with original image URL
- [x] Update FixMyLookModal — loads saved result on open, shows immediately with "saved result" indicator
- [x] Add "generate new" button — clears saved result and returns to item selection

## Bug: BeforeAfterSlider images not aligned
- [x] Fix slider so both images are perfectly overlaid — same container, same dimensions, same object-fit
- [x] Use CSS clip-path: inset() approach — before image clipped from right, after image full background
- [x] Ensure proper alignment on mobile — dynamic height from image aspect ratio, touchAction:none, passive:false touch events

## Bug: "Generate New" button in FixMyLookModal not working
- [x] Fix the "ייצר חדש" button — added skipRestore flag to prevent useEffect from auto-restoring saved result from cache after reset

## Bug: BeforeAfterSlider images have different composition/position
- [x] The AI-generated image has different framing/position than the original — slider comparison looks wrong
- [x] Improve AI prompt to explicitly request same exact composition, framing, pose, and camera angle
- [x] Added side-by-side comparison as default view mode with toggle to switch to overlay slider

## Bug: AI-generated image has different orientation than original
- [x] AI generates landscape image when original is portrait — images look completely different in comparison
- [x] Add original image dimensions/aspect ratio to the AI generation prompt to enforce matching orientation (using probe-image-size)
- [x] Ensure the generated image matches the original photo's orientation (portrait/landscape) and proportions — orientation and dimensions injected into both system and user prompts

## Feature: Rotate button for AI-generated image + server-side auto-rotation
- [x] Add rotate button (90° increments) on the AI-generated "after" image so user can manually fix orientation
- [x] Auto-detect orientation mismatch on server and rotate the generated image before saving to S3 (using sharp)
- [x] Ensure rotate works in both side-by-side and slider modes (CSS transform with scale for 90/270)

## Bug: Server-side auto-rotation still not working + client rotate button not effective
- [x] Investigated — require() calls inside bundled code were failing; replaced with proper ES module imports
- [x] Fixed auto-rotation logic — probe-image-size and sharp now imported at top level, storagePut uses existing import
- [x] Added detailed logging for orientation detection and rotation decisions
- [x] Client-side rotate button verified working with CSS transform

## Bug: Both auto-rotation and manual rotate button still not working (round 3)
- [x] Server auto-rotation: verified sharp/probe imports work correctly in bundle, auto-rotation code is correct
- [x] Client rotate button: replaced CSS transform approach with Canvas API-based actual pixel rotation
- [x] New approach: rotateImageViaCanvas() creates a real rotated image blob URL, not just visual CSS transform
- [x] Added loading state (spinner) during rotation, rotation counter, and "סובב" text label on button
- [x] Button now uses type="button" explicitly and has visible text + icon for better mobile tap targets

## Feature: Carousel click navigates to feed instead of opening analysis
- [x] Clicking a carousel image now navigates to /feed?post={postId} instead of /review/{reviewId}
- [x] Only clicking the post again in the feed opens the analysis modal (existing behavior preserved)
- [x] Feed page reads ?post= query param, scrolls to the specific post with smooth animation and highlight ring

## Feature: Subtle couple silhouette background across entire site
- [x] Generated a very faint casual couple silhouette (man in hoodie + woman in jacket) with transparent background
- [x] Added as fixed background watermark via body::before pseudo-element at 4% opacity
- [x] Centered, non-repeating, pointer-events: none — doesn't interfere with any content or interactions

## Enhancement: Background watermark visibility + dynamic effects
- [x] Increased visibility — new gold-on-black image with mix-blend-mode: lighten (black disappears, gold lines show)
- [x] Parallax effect — opacity increases from 15% to 35% as user scrolls (over 1200px range)
- [x] Fade-in animation — 2.5s ease-out fade-in on page load via React component (BackgroundWatermark.tsx)

## Feature: Event/occasion type filter in Style Feed
- [x] Analyzed existing schema — added occasion column to feedPosts, backfilled from reviews
- [x] Added occasion filter row with emoji chips below existing sort tabs (9 categories: work, casual, evening, date, friends, formal, sport, travel, weekend)
- [x] Implemented backend filtering by occasion in getFeedPosts + feed.list tRPC procedure
- [x] Filter works with existing sort tabs; hidden on saved/following tabs; amber highlight for active filter

## Enhancement: Occasion badge on feed cards + post count in filter chips
- [x] Added small occasion badge on each feed card (amber pill with emoji + Hebrew/English label)
- [x] Added post count next to each occasion in filter chips (e.g., "👕 קז'אל (3)")
- [x] Created feed.occasionCounts tRPC procedure + getOccasionCounts db helper for aggregate counts

## Fix: Open Graph preview image when sharing link
- [x] Created OG image (2752x1536) with TotalLook.ai logo + casual couple silhouettes on dark background
- [x] Uploaded to CDN and set as og:image in index.html
- [x] Added full OG meta tags (og:type, og:title, og:description, og:image, og:locale) + Twitter Card tags
- [x] Resized to 1200x630 JPEG (81KB) for Facebook/Instagram compatibility (was 2752x1536 PNG 1.2MB — too large)
- [x] Added og:url, og:image:type for better crawler support

## Fix: OG preview still not working on Facebook/Instagram (deeper investigation)
- [ ] Investigate if Manus deployment platform injects its own OG tags or overrides ours
- [ ] Check full HTML response headers and body from production as seen by Facebook crawler
- [ ] Check if there's a redirect or middleware intercepting the request
- [ ] Implement server-side OG tag serving if needed

## Fix: Background watermark too dark/visible, interfering with text readability
- [x] Reduce opacity of couple silhouette background watermark to be more subtle (MIN 0.06, MAX 0.14 — was 0.15/0.35)

## Fix: Landing page how-it-works steps — replace "תקן ושפר" with "לפני ואחרי" (Fix My Look)
- [x] Replace step 4 "תקן ושפר" with the before/after Fix My Look feature description
- [x] Update both Hebrew and English translations

## Add new how-it-works step: AI improvement suggestions based on influencers & trends
- [x] Add new step 4 about AI suggesting improvements based on influencers and fashion trends
- [x] Renumber old step 4 (before/after) to step 5, old step 5 (shop & share) to step 6
- [x] Update translations for all affected steps (HE + EN)
- [x] Add the new step to Home.tsx steps array with appropriate icon (Sparkles, emerald color)

## Fix: Restrict Feed to authenticated users only
- [x] Add auth guard to Feed page — redirect unauthenticated users to login
- [x] Server feed.list is intentionally public (for landing page promo), but full Feed page now requires auth

## Optimize: Reduce analysis pipeline processing time
- [x] Investigate current pipeline for sequential operations
- [x] Parallelize profile+wardrobe fetch, move product image generation to fire-and-forget background
- [x] Update estimated time display from 30-60s to 15-30s
- [x] Add auto-refetch on ReviewPage to pick up background-generated product images

## Bug: Product images not loading after fire-and-forget optimization
- [x] Reverted to synchronous product image generation with 20s timeout (fire-and-forget caused images to not appear)
- [x] Updated estimated time to 20-40 seconds
- [x] Kept refetch logic as fallback for any images that time out

## Feature: Guest Mode — Free trial analysis + Interactive demo

### Database & Backend
- [x] Create guest_sessions table (id, fingerprint, ip, imageUrl, imageKey, analysis JSON, status, createdAt, convertedUserId)
- [x] Create demo_views table (id, fingerprint, ip, viewedAt, clickedSignup boolean)
- [x] Add DB helpers for guest sessions (create, get, check limit, analytics)
- [x] Add guest.upload public procedure (no auth required)
- [x] Add guest.analyze public procedure with 1-analysis-per-fingerprint limit
- [x] Add guest.getResult + guest.checkLimit public procedures
- [x] Add demo.trackView + demo.trackSignupClick public procedures
- [x] Add guest analytics to admin router (guestAnalytics, guestSessions, demoViews)

### Frontend
- [x] Build GuestUpload page (simplified upload without auth, with fingerprint-based limit)
- [x] Build GuestReview page (shows analysis results with signup CTA)
- [x] Build Demo page (pre-built analysis example with tracking)
- [x] Add routes for /try, /guest/review/:id, /demo
- [x] Add "Try Free" + "See Demo" CTA buttons on landing page hero + bottom CTA
- [x] Track demo views and signup clicks via fingerprint

### Admin
- [x] Add "Guests & Demo" tab to admin dashboard with 5 analytics cards
- [x] Show guest sessions table with image, score, status, IP, date
- [x] Show demo views table with signup click tracking
- [x] Display conversion metrics (guests→users, demo→signup)

### Tests
- [x] Write 12 vitest tests for guest mode (DB helpers, rate limiting, analytics)
- [x] All 182 tests passing

## Fix: Guest mode wording and full analysis
- [x] Change "נסה בחינם" to "נסה ללא רישום" throughout (HE + EN)
- [x] Guest analysis already uses full pipeline with all features (same buildFashionPrompt + analysisJsonSchema)
- [x] GuestReview shows ALL sections without blurring (hero, influencer insight, items, scores, improvements+shopping, outfits, trend sources, mentions)
- [x] Demo page rewritten with full analysis data (all sections: scores, outfits, trend sources, linked mentions)

## Fix: Admin guest mode improvements
- [x] Admin users bypass guest analysis fingerprint limit (unlimited tries) — ctx.user?.role === 'admin' check
- [x] Admin guest management panel shows full details: guest image, full analysis, clickable rows
- [x] Expandable detail view for each guest session showing image + full analysis + scores + items + improvements
- [x] Device/browser info parsed from userAgent, IP, fingerprint, conversion status displayed
- [x] All 182 tests passing

## Bug: Product recommendation images not loading (again)
- [x] Root cause: too many concurrent image generation API calls causing rate limits/timeouts
- [x] Added concurrency limiting (max 2 concurrent) to avoid API rate limits
- [x] Increased timeout from 20s to 45s for product image enrichment
- [x] Added detailed logging for debugging in production
- [x] Updated estimated time to 30-60 seconds
- [x] All 182 tests passing

## Admin notification when new guest completes analysis
- [x] Send push notification to admin when a guest finishes an analysis
- [x] Include guest info (session ID, score, device, IP, fingerprint, summary, image URL) in notification
- [x] Fire-and-forget pattern — never blocks or breaks guest analysis flow
- [x] Test notification delivery (9 new tests, 191 total passing)

## CRITICAL: Product recommendation images still not loading
- [x] Deep investigation: API works fine, but old code tried 12 images with Promise.all + 20s timeout = always times out
- [x] Root cause: 12 concurrent image generations (~10s each) exceeded 20s timeout
- [x] Fix: Reduced to 1 image per improvement category (4 total), shared across all links in that category
- [x] Added concurrency limiter (max 4 concurrent) with per-task error handling
- [x] Increased timeout to 90s (actual time: ~11s for 4 images)
- [x] Verified: 4/4 images generated successfully in 11 seconds
- [x] All 191 tests passing

## Unique product images per link + background loading with shimmer
- [x] Rewrite productImages.ts to generate unique image per shopping link (not shared per category)
- [x] Return analysis immediately without waiting for product images
- [x] Generate product images in background (fire-and-forget) after analysis is returned
- [x] Update DB progressively as each image is generated (onImageReady callback)
- [x] Add shimmer/skeleton loading animation on product cards while images load ("מחפש תמונת מוצר...")
- [x] Frontend auto-refetch every 5s to pick up new images as they become available
- [x] Works for both registered users and guest sessions
- [x] 10 new tests for productImages module, 201 total passing

## Remove demo page + Fix guest outfit suggestions
- [x] Remove Demo page route from App.tsx
- [x] Remove Demo links from Home.tsx and GuestUpload.tsx
- [x] Fix guest review outfit suggestions — now shows visual OutfitCard with AI-generated look images
- [x] Added guest.generateOutfitLook endpoint (public procedure)
- [x] GuestOutfitCard: auto-generates image on mount, "מידע לרכישה" button expands product details with shopping links
- [x] All 201 tests passing, TypeScript clean

## Fix missing admin page
- [x] Investigated: admin route and link exist, but user role was 'user' instead of 'admin'
- [x] Updated Eran Malovani (ID 60078, Apple login) role to 'admin' in database
- [x] Found second account (ID 1350239, Google login eranmalovani@gmail.com) — also updated to 'admin'

## Speed up product image generation
- [x] Increased concurrency from 3 to 6 concurrent image generations
- [x] Shortened prompts for faster generation
- [x] Result: ~20s for 12 images (2 batches of 6) vs ~40s before (4 batches of 3)
- [x] All 201 tests passing

## Product image cache by product name
- [x] Added productImageCache table to DB schema (productKey, imageUrl, originalLabel, categoryQuery, createdAt)
- [x] Cache lookup before generating — reuses existing images for same normalized product key
- [x] Saves generated images to cache for future reuse
- [x] normalizeProductKey strips store names, lowercases, trims for consistent matching

## Lazy loading — generate images only for opened categories
- [x] Removed background fire-and-forget enrichment from both regular and guest analysis flows
- [x] Added review.generateProductImages endpoint for registered users
- [x] Added guest.generateProductImages endpoint for guest sessions
- [x] Frontend ImprovementCard triggers image generation when user expands a category
- [x] GuestImprovementCard does the same for guest flow
- [x] Shimmer loading animation while images are being generated
- [x] 205 tests passing (12 new tests for cache + lazy loading)

## Admin bypass for guest trial limit
- [x] Server-side bypass already existed (ctx.user?.role === "admin" in checkLimit, upload, analyze)
- [x] Added frontend bypass: useAuth() checks admin role, skips checkLimit query and limitReached state
- [x] Admin users now see the upload form even after using guest analysis
- [x] All 205 tests passing
- [x] Fixed race condition: auth loading before checkLimit runs, reset limitReached when admin detected

## Admin guest testing link (bypass trial limit)
- [x] Added admin.generateGuestTestToken endpoint (JWT signed with cookieSecret, 1h expiry)
- [x] Added adminToken validation in guest.checkLimit and guest.upload endpoints
- [x] Added "נסה כאורח" / "Test as Guest" button in admin panel header
- [x] GuestUpload detects ?admin_token= from URL and passes it to all guest API calls
- [x] Skips checkLimit query entirely when admin token is present
- [x] Token expires after 1 hour for security
- [x] All 205 tests passing, TypeScript clean
- [x] Add personalization note on guest upload page (influencers/stylists available only for registered users)
- [x] Auto-scroll to analyze button after image selection (Upload + GuestUpload pages)
- [x] Auto-scroll to analyze button after selecting an occasion on Upload page
- [x] Personalize influencer suggestions based on user profile (gender, age, style, budget)
- [x] Fix missing before/after feature on review results page
- [x] Always show Fix My Look (before/after) on ReviewPage regardless of score, use shopping recommendations for high-score cases
- [x] Fix OAuth "Permission denied - Redirect URI is not set" error on custom domain (totallook.ai) — www redirect + fresh login URL
- [x] Add personalization note on guest results page (no influencers/preferences without registration)
- [x] Add multiple signup CTA sections throughout guest review results page for higher conversion
- [x] Swap hero CTAs: make Login/Signup primary with glow, make Try smaller with personalization note
- [x] Shorten primary signup CTA button text to be short and compelling
- [x] Redesign Feed promo section — more inviting, youthful copy and buttons
- [x] Fix Feed page top spacing — sort/filter row cut off by Navbar
- [x] Fix Feed page scroll position — lands in middle of image instead of top
- [x] Fix Feed scroll position when clicking post image from carousel — filters should be visible
- [x] Add Terms of Service page (Hebrew + English)
- [x] Add Privacy Policy page (Hebrew + English)
- [x] Add footer links to legal pages
- [x] Change contact email from contact@totallook.ai to eranmalovani@gmail.com in legal pages and footer
- [x] Add footer links (Terms, Privacy, Contact) to Upload page
- [x] Fix wardrobe: only save actual items user is wearing, not AI improvement suggestions
- [x] Improve wardrobe item identification approach
- [x] Update wardrobe UI for better accuracy and display
- [x] Redesign wardrobe: animated wardrobe opening with categories
- [x] Wardrobe shows original look images (not AI-generated item images)
- [x] Category view: click category to see items list with name/color/brand/score
- [x] Click on item to see the original source image where it appears
- [x] Stop generating AI item images in background (remove fire-and-forget image gen)
- [x] Ensure sourceImageUrl is always saved correctly for wardrobe items
- [x] Add 3D wardrobe door opening animation with CSS perspective effect
- [x] Add close wardrobe button (door closing animation) from categories and category detail views
- [x] Add search and filter in wardrobe (search field + color/brand filter)
- [x] Add "Dress a Look" feature — pick items from different categories to compose an outfit
- [x] Add AI look visualization in Dress a Look — generate image of user wearing selected items
- [x] Use user's profile photo as reference for AI visualization
- [x] Add "Visualize Look" button and display generated image
- [x] Redesign upload area to look like a 3D mirror with perspective and depth effects
- [x] Update mirror upload area: shorter mobile-first text, mention camera option, cooler icon
- [x] Remove "הלוק המלא" (Total Look) section from review page, keep "הצעות לוקים" (look suggestions)
- [x] Add URL query parameter ?lang=en to force English language on the site
- [x] Create dedicated English landing page for international audience
- [x] Tailored English copy (not just translation) — global references, international brands
- [x] Add route and navigation for English landing page
- [x] Auto-redirect to English landing when ?lang=en is used
- [ ] Fix English landing page /en not working on published domains
- [ ] Ensure /en works on all domains (totallook.ai, fashionrev-sgdphkr3.manus.space, www.totallook.ai)
- [x] Redesign Hebrew landing page to match English version quality (stats, how it works, features, testimonials, FAQ, dual CTA)
- [x] Detect user country via IP geolocation or browser locale
- [x] Add country-specific influencer lists (Germany, France, UK, US, Spain, Italy, Brazil, Australia, Japan, Korea, India)
- [x] Replace hardcoded IL/global tabs with dynamic Local/Global based on detected country
- [x] Show local influencers matching user country in the Local tab
- [x] Fallback to global influencers if country has no local list
- [x] Add country column to userProfiles DB schema
- [x] Save detected country to profile on first visit / onboarding
- [x] Expose country in profile.get tRPC response
- [x] Build country-specific store recommendations map (Zalando for DE, ASOS for GB, etc.)
- [x] Integrate country-aware stores into AI analysis prompt
- [x] Add country-specific store search URL patterns (27 new stores)
- [x] Write tests for country-based store recommendations (88 shopping link tests, all passing)
- [x] Split onboarding store picker into Local (country-specific) and Global sections
- [x] Show country flag and name in local stores section header
- [x] Prioritize local stores at the top of the picker
- [x] Display local currency symbol next to price estimates in analysis results
- [x] Currency badge with country flag shown in ReviewPage and GuestReview (improvements + outfits)
- [x] Fix country detection: prioritize IP geolocation over navigator.language to avoid en-GB → GB false detection
- [x] Redesign virtual closet with luxurious golden visual style (gold frame, glass shelves, glow lighting)
- [x] Add gold crown ornament, diamond dots along edges, sparkle particles
- [x] Style category shelves with glass effect and warm lighting
- [x] Upgrade category cards with gold border accents and glow effects
- [x] Apply neon gold text effect to wardrobe titles
- [x] Match closing animation to new luxurious design
- [x] Upgrade item cards with gold hover styling
- [x] Make "הלבש לוק" (Try On Look) button in wardrobe more prominent, attractive, and clear — moved from small header button to full-width golden CTA below category grid with glow, shimmer animation, icon, and description
- [x] Move "הלבש לוק" CTA to the top — before categories, front and center
- [x] Redesign wardrobe categories as real closet shelves (wooden side panels, shelf edges, item thumbnails on shelves)
- [x] Fix camera icon in Dress a Look: changed from reddish rose gradient to gold gradient, replaced Camera icon with Sparkles, text always visible (not hidden on mobile), added pulsing glow animation
- [x] Add image rotation option to all generated visualization images (rotate button always visible + hover overlay)
- [x] Add impressive reveal animation (fade-in + zoom + blur-to-sharp + sparkle overlay) when visualization is ready
- [x] Add item selection step before Before/After visualization — let users choose which recommended items to include
- [x] Show improvement alternatives per item with expand/collapse, before→after labels, and shopping links
- [x] Update AI prompt to only apply user-selected improvement alternatives in the After visualization
- [x] BUG: Fix My Look (Before/After) feature not working after improvement selection changes
- [x] BUG: Fix My Look alternatives panel doesn't open — item-to-improvement matching fails in Hebrew, need better matching + fallback to show all improvements
- [x] Improved matching: multi-strategy scoring (word overlap, beforeLabel, category keywords in Hebrew+English, brand matching)
- [x] Added fallback: unmatched improvements distributed to items with no matches (lowest-score items get priority)
- [x] Send direct improvement indices from client to server (selectedImprovementIndices) — no more server-side re-matching
- [x] Server-side 3-strategy approach: direct indices → improved matching → all improvements as context
- [x] 287 tests passing (11 new fixMyLook tests)
- [x] Redesign Fix My Look alternatives panel: show product images inline instead of shopping links
- [x] Remove shopping links from alternatives panel (keep them only in the final result)
- [x] Display product images directly in each alternative card for visual selection
- [x] User selects alternative by clicking on the image/card, AI generates visualization based on that choice
- [x] Ensure product images load with loading indicators while fetching
- [x] BUG: Fix My Look alternatives panel shows wrong product images — images from one category (e.g., shoes) appear in another category's card (e.g., jeans). Fixed with category-aware matching + fallback that rejects cross-category assignments.
- [x] BUG: Fix My Look — cannot select specific item/alternative in the panel. FIXED: Switched to improvement-centric approach where each improvement is a standalone card.
- [x] BUG: Fix My Look — not all AI-recommended categories appear. FIXED: Every improvement now has its own card. If no matching item exists, it shows as "פריט חדש" (new item). All improvements are always visible.
- [x] BUG: Fix My Look — clicking on a product image doesn't select it with a V checkmark. FIXED: Per-image selection with V checkmark overlay, one product per improvement, auto-select first valid image, toggle on re-click.
- [x] BUG: Fix My Look AI visualization doesn't match the specific product selected. FIXED: Frontend sends selectedProductDetails (label+imageUrl) to server, server includes exact product name/brand/color in AI prompt.
- [x] UX: Add zoom animation on product image selection (scale-105 on selected, scale-[1.02] on hover)
- [x] UX: Add "Select All / Clear All" buttons at top of improvements list (בחר הכל / נקה הכל)
- [x] UX: Include selected product name/label in AI prompt (SPECIFIC PRODUCT SELECTED BY USER) for precise visualization
- [x] BUG: Fix My Look AI doesn't match the exact color/shade of the selected product image. FIXED: Selected product images now passed as additional reference images to generateImage, plus CRITICAL COLOR RULE added to prompt emphasizing exact color/shade matching.
- [x] BUG: Fix My Look AI generates a completely different person. FIXED: Rewrote prompt to emphasize "IMAGE EDITING not GENERATION", only pass original photo as reference (removed product images that confused AI), strengthened same-person/pose/background rules.
- [x] BUG: Fix My Look AI color accuracy. FIXED: Product colors described in text with explicit "do NOT substitute" instructions. Removed product images from references to prevent AI confusion.
- [x] Feature: In analysis improvements, check user's virtual closet for matching items (post-processing with category+brand+color+name scoring)
- [x] Feature: Display closet matches in improvement card with ♻️ recycling icon, item thumbnail, name, brand, and link to /wardrobe
- [x] Updated AI prompt to instruct mentioning wardrobe items in improvement descriptions
- [x] Added ClosetMatch type to shared/fashionTypes.ts
- [x] 309 tests passing (11 new closetMatch tests)
- [x] Feature: AI should mention closet items in its improvement recommendations text (prompt updated with wardrobe instructions)
- [x] Feature: Clicking closet match item opens popup with full image (ClosetItemPopup component with Dialog)
- [x] Feature: Add "Use this item" button in closet match popup that inserts the closet item into Fix My Look as a pre-selected alternative (auto-opens modal, scrolls to section, shows closet badge with ♻️)
- [x] Feature: When closet item is selected via "Use this item", show it as a selectable image in the Fix My Look improvement card grid with ♻️ badge, auto-selected but replaceable. Closet item appears as first image in grid with green "מהארון" badge overlay. Header shows "מהארון" badge when closet item is selected, switches to "נבחר" when a product image is chosen instead.
- [x] BUG: Closet item in Fix My Look placed in wrong category. FIXED: Added closetTargetImpIdx with 3-strategy category matching (detectCategory, word overlap, fallback to original index)
- [x] Feature: Confirmation dialog when switching away from closet item: "בחרת את X מהארון, רוצה לשדרג?" with ♻️ השאר מהארון / ✨ שדרג למוצר חדש buttons
- [x] BUG: Server-side closet matching assigns wrong category. FIXED: Added STRICT CATEGORY GATE — if wardrobe item category and improvement category are both detected and don't match, the item is skipped entirely (hard `continue`). Brand overlap (e.g., Zara) no longer overrides category mismatch. 314 tests passing (5 new cross-category rejection tests).
- [x] BUG: Frontend still displays wrong closet matches from old analyses. FIXED: Added validClosetMatch useMemo in ImprovementCard that detects both closet item category and improvement category using keyword matching, and rejects cross-category matches (e.g., t-shirt in jewelry improvement). 314 tests passing.
- [x] UX: Remove auto-scroll to Fix My Look when clicking "Use this item" from closet popup. FIXED: Selection saved silently with toast "♻️ הפריט נשמר — כשתרצה, לחץ על תקן את הלוק שלי". No auto-scroll, no auto-open.
- [x] BUG: Clicking "Use This Item" from closet popup STILL auto-scrolls/navigates to Fix My Look section. FIXED: Root cause was useEffect in FixMyLookModal that called setOpen(true) when closetItemPreselect changed. Removed the auto-open effect — preselection is now only applied when user manually opens the modal via the trigger button. 314 tests passing.
- [x] UX Refactor: ReviewPage closet popup becomes view-only — remove "Use This Item" button. Closet match shown for style reference only, no connection to Fix My Look.
- [x] UX Refactor: FixMyLookModal — show ♻️ recycling badge on product images when a matching closet item exists in that category. Uses imp.closetMatch directly from analysis data. Clickable banner above product grid shows "יש לך פריט מתאים בארון!" with item image/name. Selecting it sets productIdx=-1 for that improvement.
- [x] Cleanup: Removed all unused closetItemForFixMyLook state, handleUseClosetItem, onUseClosetItem props, closetItemPreselect/onClosetItemUsed props from ReviewPage and FixMyLookModal. 314 tests passing.
- [x] BUG: FixMyLookModal closet match badge shows the SAME closet item in ALL categories. FIXED: Added client-side category validation using detectCategory on closetMatch fields — only shows badge when closet item category matches improvement category.
- [x] Feature: Added closet item preview popup in FixMyLookModal. Eye icon on badge opens a dialog showing item image (48x48), name, brand badge, color badge, itemType badge. Two buttons: "סגור" and "השתמש בפריט הזה" (or "Already selected" if already chosen). 314 tests passing.
- [x] Feature: Optional second photo for camera users — after taking a photo, suggest "📸 רוצה לצלם עוד זווית? ניתוח מ-2 תמונות מדויק יותר". Only for camera, not gallery uploads.
- [x] Feature: Upload page UI — show 2-photo preview side by side when second photo added, with remove button on each
- [x] Feature: Server — support multi-image upload, upload both to S3, pass both image URLs to AI analysis prompt
- [x] Feature: AI prompt — when 2 images provided, instruct AI to analyze both angles for comprehensive item detection
- [x] Feature: ReviewPage — only show primary (first) image in results, not the second angle (no changes needed — ReviewPage already uses review.imageUrl which is always the primary), not the second angle
- [x] Feature: Write tests for multi-image upload and analysis flow — 2 new tests added, 316 total passing
- [x] UX Fix: When camera is used, don't auto-scroll to occasion section after first photo. User sees "add second angle" suggestion first. Auto-scroll only after second photo is added, or if image was uploaded from gallery.
- [x] UX Fix: After camera photo, gently scroll down so the "add second angle" suggestion banner is visible. Uses scrollIntoView with block:'center' on the banner ref, with 400ms delay to let the preview render first.
- [x] UX Fix: Scroll after camera photo was too aggressive. Changed from block:'center' to block:'end' so the banner peeks at the bottom of the viewport while the photo stays visible above.
- [x] Feature: Funnel tracking — added pageViews table with fingerprint, page, referrer, userAgent, ipAddress, screenWidth, country, convertedUserId
- [x] Feature: Server endpoint tracking.trackPageView (public, lightweight mutation)
- [x] Feature: Client-side tracking on Home.tsx (/) and LandingEN.tsx (/en) — fires once per session using fingerprint + ref guard
- [x] Feature: Admin panel FunnelTab — visual funnel (landing → continued → registered → analyzed) with conversion rates + daily breakdown table (14 days)
- [x] Feature: 316 tests passing, no new test file needed (tracking is fire-and-forget, admin queries tested via existing admin test patterns)
- [x] MAJOR: Upgrade guest experience to full features with 5 analyses and email conversion
- [x] DB: Add guestProfile fields to guestSessions (age, gender, styleVibe, influencers, budget, stores, email)
- [x] DB: Add guestSessionId support to wardrobeItems table
- [x] DB: Update guest analysis limit from 1 to 5
- [x] Server: Guest onboarding endpoint — save full profile (same as registered user onboarding)
- [x] Server: Guest wardrobe CRUD — add/get/delete wardrobe items by guestSessionId
- [x] Server: Guest analysis — use profile data for personalized AI prompt (same as registered users)
- [x] Server: Email capture endpoint — save email to guestSession, for later conversion
- [x] Server: Data migration — when guest registers via OAuth, transfer all reviews, wardrobe, profile to new user account
- [x] Client: Guest onboarding flow — redirect to full onboarding after "Try without registration"
- [x] Client: Unlock wardrobe page for guests (using guestSessionId)
- [x] Client: Unlock Fix My Look for guests
- [x] Client: Unlock second photo for guests
- [x] Client: Email conversion CTA — hint after analysis 2, prominent CTA after 3, block at 5 with email required
- [x] Client: Feed view-only for guests (can browse, cannot post/like/comment)
- [x] Tests: Write tests for guest upgrade features (332 tests passing)
- [x] BUG FIX: Guest fingerprint cookie not being set — useFingerprint hook now sets `guest_fingerprint` cookie in addition to localStorage, enabling OAuth callback to read it for guest-to-user data migration

## Guest Dress a Look (הלבש לוק לאורחים)
- [x] Server: Add guest.visualizeLook tRPC procedure (same as registered user but using fingerprint/guestSessionId)
- [x] Client: Add Dress a Look UI to GuestWardrobe.tsx (item selection, AI visualization, same UX as registered users)
- [x] Tests: Write tests for guest Dress a Look feature (348 tests passing)

## Bug Fixes — Guest Testing
- [x] INVESTIGATED: Guest counter shows "ניתוח 2 מתוך 5" — NOT a bug. Fingerprint is browser-based (user agent, screen), so same browser = same fingerprint even after clearing cookies. The count=1 is correct because this fingerprint had a previous completed session from 2026-03-27.
- [x] BUG FIX: Guest wardrobe empty after analysis — items were not auto-saved. Added auto-save logic to guest.analyze procedure (same as registered user flow). 348 tests passing.

## Make Guest Review Page Identical to Registered User Review
- [x] Compare GuestReview.tsx vs ReviewPage.tsx and identify all layout/UX differences
- [x] Move Fix My Look from small button in hero to dedicated section with Wand2 icon, gradient bg, and descriptive text (same as registered user)
- [x] Test and verify: TypeScript clean, 348 tests passing

## Fix Guest Onboarding & Virtual Wardrobe
- [x] Add "חנויות מועדפות" (favorite stores) step to guest onboarding — step 5 with country detection, local stores, budget-based recommendations, custom store input
- [x] Add "ארון וירטואלי" (virtual wardrobe setup) step to guest onboarding — step 6 with yes/no toggle
- [x] Add "עיסוק" (occupation) step to guest onboarding — step 3 (was missing)
- [x] Save store preferences to guest session in DB (already supported by saveGuestProfile)
- [x] Fix guest wardrobe feature — auto-save already added in previous fix
- [x] Test full guest flow: 348 tests passing, TypeScript clean

## BUG: Guest wardrobe still empty after analysis
- [x] Root cause: wardrobeItems table had userId as NOT NULL, preventing guest items (no userId) from being inserted silently
- [x] Fix: Changed userId to nullable in drizzle schema, ran db:push migration, restarted server
- [x] Verified end-to-end: 3 items saved for session 210005, wardrobe page displays all items in categories (חולצות, מכנסיים, נעליים)

## Guest Wardrobe Recycling in Analysis
- [x] Wardrobe items were already being fetched and passed to AI prompt (lines 2436-2460)
- [x] Added closet matching logic to guest.analyze — same algorithm as registered user (category matching, name/brand/color scoring)
- [x] Fixed gender-aware shopping links (was hardcoded to "male", now uses guest profile gender)
- [x] GuestReview.tsx already had closetMatch UI (green badge with Recycle icon)
- [x] TypeScript clean, 348 tests passing

## Fix Guest Limit & Closet Matching Bug
- [x] Guest limit at 5: Block completely like registered user — removed email input, only signup CTA with "הירשם עכשיו — בחינם"
- [x] Closet matching bug FIXED: (1) Added missing keywords (שרשת, עגיל, צ'ינו, pendant, earring, chino), (2) Require both categories to be identified — skip if either is unknown, (3) Require exact category match — no cross-category matches, (4) Raised threshold from 3 to 5, (5) Applied same fix to registered user closet matching. 348 tests passing.

## Fix Email CTA Overlay in GuestReview
- [x] Remove email capture CTA overlay that blocks analysis content in GuestReview.tsx
- [x] Replace with simple non-blocking signup CTA at bottom of page

## Fix OAuth Redirect URI Error
- [x] Fix "Permission denied - Redirect URI is not set" when logging in from totallook.ai

## Comprehensive OAuth Login Testing
- [x] Write vitest: state encoding — new JSON format from totallook.ai
- [x] Write vitest: state encoding — new JSON format from www.totallook.ai
- [x] Write vitest: state encoding — new JSON format from manus.space (same origin)
- [x] Write vitest: state encoding — new JSON format from dev preview (.manus.computer)
- [x] Write vitest: state decoding — backward compat with legacy plain string format
- [x] Write vitest: state decoding — new JSON format extracts returnOrigin + returnPath
- [x] Write vitest: state decoding — malformed/corrupted state handled gracefully (found + fixed bug: atob crash on invalid base64)
- [x] Write vitest: relay endpoint — valid token sets cookie and redirects
- [x] Write vitest: relay endpoint — invalid/expired token returns 401
- [x] Write vitest: relay endpoint — missing token returns 400
- [x] Write vitest: allowed origins whitelist — totallook.ai, www.totallook.ai, manus.space accepted
- [x] Write vitest: allowed origins whitelist — malicious origin rejected (falls back to /)
- [x] Write vitest: redirect URI always uses canonical manus.space domain
- [x] Browser test: login from totallook.ai works end-to-end
- [x] Browser test: login from manus.space works end-to-end

## Fix Wardrobe Matching — Match by Recommendation Spirit, Not Just Category
- [x] Investigate current wardrobe schema, matching logic, and improvement prompt
- [x] Enhance wardrobe item metadata — added styleNote field to wardrobeItems schema
- [x] Update AI prompt to return richer item metadata for wardrobe storage
- [x] Update wardrobe matching logic — added style contradiction detection (classic vs smart, formal vs sporty, dress shirt vs tee, blazer vs bomber, briefcase vs backpack)
- [x] Update wardrobe prompt context to include styleNote for better AI awareness
- [x] Write comprehensive tests — 37 tests covering category gate + style contradictions (420 total tests passing)

## Bug: Android Camera
- [x] Fix camera not opening on Android devices — added separate Camera/Gallery buttons on mobile with capture="environment" attribute

## Bug: Android Image Cropping
- [x] Fix image being cropped/cut in analysis result view on Android — changed object-cover to object-contain in BeforeAfterSlider

## AI Prompt: Premium Jewelry Identification
- [x] Update AI prompt to treat premium/luxury budget users' silver-looking jewelry as white gold/diamonds/platinum, not regular silver
- [x] When AI is uncertain about material, be less definitive and consider user's budget level — added JEWELRY guidance to both registered and guest flows

## Phone Case Handling in Analysis
- [x] Phone cases should be acknowledged/described in analysis but NOT included in scoring (everyone photographs the same phone case) — updated prompt to exclude phone cases from Accessories & Jewelry category score

## Israeli Brand Recognition in AI Analysis
- [x] Research Israeli fashion brands with identifying features/logos
- [x] Add Israeli brand list to AI prompt with visual identifiers (30+ brands: Castro, Fox, Golf, Renuar, Honigman, Comme il Faut, Maskit, Dodo Bar Or, etc.)
- [x] Prioritize local brand detection when user language is Hebrew — locale-aware prompt section
- [x] Add Israeli brand URLs to BRAND_URLS mapping (23 Israeli brands added)
- [x] Add Israeli stores to COUNTRY_STORE_MAP IL entry (Castro, Fox, Golf, Renuar, Honigman, Adika, Comme il Faut)

## Multi-Country Local Brand Recognition
- [ ] Research local fashion brands for DE, FR, GB, ES, IT, BR, AU, JP, KR, IN, US
- [ ] Build COUNTRY_LOCAL_BRANDS data structure with brands + identifying features per country
- [ ] Make AI prompt dynamically inject local brands based on user's country
- [ ] Add brand URLs for all new local brands to BRAND_URLS

## Store Filtering by Gender/Budget/Profile
- [x] Add gender and budget metadata to COUNTRY_STORE_MAP entries (StoreEntry interface with gender + budget[] per store)
- [x] Filter stores in AI prompt based on user's gender, budget, and preferences (filterStoresForUser function)
- [x] Ensure only relevant stores appear in recommendations (e.g., no women's stores for male users, no luxury for low budget)
- [x] Updated Onboarding.tsx and GuestUpload.tsx to work with new StoreEntry objects
- [x] Added 10 new tests for filterStoresForUser (gender, budget, combined filters) — 427 tests passing

## Bug: Influencer Recommendations Not Age-Correlated
- [x] Investigate current influencer filtering logic — age was only used for sorting (relevance score), not filtering
- [x] Fix InfluencerPicker to HARD filter by user's age range — influencers whose ageRanges don't include user's age are hidden completely
- [x] For 55+ users: also show influencers targeting 45-54 (adjacent range) to ensure enough options
- [x] Fixed countByTab to also apply age filter for accurate tab counts
- [x] Works in both Onboarding and GuestUpload (userProfile.ageRange already passed to both)
- [x] 427 tests passing, TypeScript clean

## Hard Budget Filtering for Influencers
- [x] Add hard budget filter to InfluencerPicker — with adjacent tier logic (budget sees budget+mid-range, luxury sees premium+luxury)
- [x] Ensure countByTab also reflects budget filtering
- [x] Gender + age + budget all work together as hard filters — 427 tests passing

## Add Mature Influencers (45-54, 55+)
- [x] Add 8 global male influencers for 45-54/55+ (Clooney, Ralph Lauren, Armani, Brosnan, Tucci, Wooster, Dempsey, Gere)
- [x] Add 10 global female influencers for 45-54/55+ (Blanchett, Mirren, Apfel, Aniston, SJP, V.Beckham, Keaton, Bellucci, Streep, Hayek)
- [x] Add Israeli mature influencers: 2 male (אבי נשר, צחי הלוי) + 4 female (יעל בר זוהר, רונית אלקבץ, גילה אלמגור, ריטה)

## Filter Stores in Onboarding by Gender/Budget
- [x] Filter local stores in Onboarding.tsx by user's selected gender and budget (with adjacent tier logic)
- [x] Filter local stores in GuestUpload.tsx by user's selected gender and budget (same logic)
- [x] 427 tests passing, TypeScript clean

## Before/After Showcase & Trust Section
- [x] Before/After showcase section on landing page (3 demo examples with scores)
- [x] "See a Full Demo Analysis" button linking to /demo page
- [x] "Try With Your Photo" button linking to /try page
- [x] Trust bar (privacy, AI powered, free) on landing page
- [x] Showcase section added to both Home.tsx (Hebrew) and LandingEN.tsx (English)
- [x] /demo route wired in App.tsx
- [x] Translation keys added for showcase and trust sections (HE + EN)

## Showcase Real Images
- [x] Generate AI before/after images for 3 showcase looks (6 images total)
- [x] Upload images to CDN
- [x] Update ShowcaseSection component with real before/after images (side-by-side layout with score badges)

## Try Demo Look Button on Upload Page
- [x] Add "Try a Demo Look" button on Upload page (HE) — navigates to /demo
- [x] Add "Try a Demo Look" button on GuestUpload page (EN) — navigates to /demo
- [x] Button styled with distinct visual treatment (outline/secondary style)

## Editorial Design Upgrade
- [x] Add Playfair Display serif font via Google Fonts CDN (already loaded)
- [x] Update headings to use Playfair Display (h1, h2, section titles) with letter-spacing
- [x] Increase whitespace between sections (section-editorial: 6rem/8rem)
- [x] Make landing page more magazine-style (editorial-divider, font-light subtitles)
- [x] Apply editorial style to both HE and EN landing pages
- [x] Update index.css with new typography tokens (editorial-divider, editorial-accent, section-editorial)

## Admin Landing Page Preview
- [x] Add "View Landing Page" button in admin panel (Eye icon + link to /?preview=1)
- [x] Implement ?preview=1 query param bypass in Home.tsx — skips auth redirect, shows landing page with preview banner
- [x] Implement ?preview=1 query param bypass in LandingEN.tsx — same preview banner with language toggle
- [x] Preview banner shows: Eye icon, "Preview Mode — Landing Page" label, HE/EN toggle, "← Back to Admin" link
- [x] Removed stale LandingPreview.tsx and /landing-preview route from App.tsx
- [x] 427 tests passing, TypeScript clean, no dev server errors

## Deep Editorial / Vogue-Inspired Design Overhaul
- [x] Redesign CSS foundation: dramatic typography scale, luxury spacing, editorial color tokens
- [x] Hero section: full-viewport cinematic layout with oversized serif headlines, fashion-magazine composition
- [x] Showcase section: editorial photo grid with asymmetric layout, fashion magazine card styling
- [x] How It Works: editorial numbered steps with dramatic typography and generous whitespace
- [x] Features grid: luxury minimalist cards with refined iconography
- [x] Testimonials: editorial quote styling with large quotation marks and serif fonts
- [x] FAQ: refined accordion with editorial typography
- [x] Final CTA: dramatic full-width editorial closing
- [x] Apply same editorial treatment to both HE and EN landing pages
- [x] Ensure Navbar and footer match editorial aesthetic

## Missing Visual Elements After Editorial Redesign
- [x] Investigate and restore any missing logos, graphics, or visual elements from the landing page
- [x] Add elegant thin-line icons back to features grid in Vogue editorial style
- [x] Add decorative editorial elements (ornamental lines, section markers, pull-quote marks)
- [x] Add subtle scroll-triggered fade-in/slide-up animations to all sections
- [x] Add editorial micro-details: thin rule accents, section numbering, typographic ornaments
- [x] Fill visual gaps with Vogue-inspired graphic elements
- [x] Apply same enhancements to both HE and EN landing pages

## Advanced Scroll Animations
- [x] Upgrade AnimatedSection with stagger support for child elements
- [x] Apply stagger animations to features grid, steps, testimonials, stats
- [x] Ensure smooth scroll-triggered reveal across all landing page sections (HE + EN)

## Demo Page Redesign — Real Product Analysis Look
- [x] Redesign demo page to show full outfit image with real analysis layout
- [x] Show overall score prominently with category breakdown scores
- [x] Show item-by-item detection (brand, color, fit) like the real product
- [x] Remove upgrade list format — show the full analysis view instead
- [x] Match the editorial Vogue aesthetic of the landing page

## Parallax Effect on Before/After Showcase
- [x] Add parallax scroll effect to Before/After images in ShowcaseSection
- [x] Subtle vertical movement on scroll for depth perception
- [x] Apply to both HE and EN landing pages (shared component)

## Reduce Excessive Section Spacing
- [x] Reduce padding/margin between landing page sections — section-editorial from 4.5rem/6rem to 3rem/4rem
- [x] Reduce inline spacing (mb-20→mb-12, mb-28→mb-16, py-16→py-10) in Home.tsx, LandingEN.tsx, ShowcaseSection, FeedPromoSection
- [x] Keep editorial feel but make it tighter and more dynamic
- [x] Apply to both HE and EN landing pages

## Interactive Before/After Slider
- [x] Build LandingBeforeAfterSlider component with drag handle (pointer events for touch + mouse)
- [x] Replace static side-by-side images in ShowcaseSection with interactive slider
- [x] Slider shows Before underneath and After on top, with draggable gold divider line + handle
- [x] Support RTL layout for Hebrew page (labels switch to לפני/אחרי)
- [x] Apply to both HE and EN landing pages (shared ShowcaseSection component)

## Fix Before/After Slider Label Clarity
- [x] Make Before/After labels always visible — fixed corner labels (BEFORE top-left, AFTER top-right) + moving labels attached to divider handle + desaturation overlay on Before side

## Auto-Slide Animation for Before/After Slider
- [x] Add auto-slide animation that moves the divider 50%→25%→75%→50% with easeInOutCubic when slider enters viewport
- [x] Only trigger once (IntersectionObserver at 50% threshold), then let user take over
- [x] Cancel animation if user interacts during auto-slide

## Full-Site Vogue Editorial Audit
- [x] Audit all app pages: Upload, Feed, History, Profile, Wardrobe, Admin, Demo — all have editorial Vogue styling
- [x] Confirmed: dark bg, gold accents, Playfair Display serif headings, editorial spacing across entire site
- [x] Minor cosmetic items (feed filter pills, admin stat gradients) — user confirmed no changes needed

## Shorten Onboarding Flow
- [x] Audit current 7-step onboarding (gender, age, occupation, budget+style, stores, wardrobe, influencers)
- [x] Merge to 4 steps: Step 1 = Gender+Age, Step 2 = Occupation+Budget, Step 3 = Style+Stores, Step 4 = Influencers (optional)
- [x] Update both registered (Onboarding.tsx) and guest (GuestUpload.tsx) onboarding flows
- [x] Removed wardrobe step (default: yes), all data still collected correctly

## User-Initiated Delete Image/Analysis
- [x] Add backend: deleteReviewById in db.ts + review.deleteOne procedure in routers.ts (registered users)
- [x] Add delete button on each card in History.tsx (appears on hover, with AlertDialog confirmation)
- [x] Add delete button in ReviewPage.tsx hero section
- [x] Add backend: deleteGuestSession in db.ts + guest.deleteAnalysis procedure in routers.ts (guest users)
- [x] Add delete button in GuestReview.tsx for guest analysis
- [x] Confirm dialog before all deletions
- [x] DB deletion includes associated feed posts; S3 cleanup via key
- [x] 6 tests written and passing (delete-review.test.ts): review.deleteOne + guest.deleteAnalysis

## Admin Onboarding Test Button
- [x] Add admin.resetOnboarding backend procedure (sets onboardingCompleted=0 for admin own profile)
- [x] Add Test Onboarding button in Admin panel header (emerald green, RotateCcw icon)
- [x] Button resets onboarding and redirects to /onboarding
- [x] 3 tests written and passing (admin-onboarding.test.ts)
- [x] 436 total tests passing

## Phase 48: Taste Profile Page — Evolving Personal Style Profile
- [x] No separate DB table needed — computed in real-time from existing reviews + wardrobe + profile data
- [x] Create backend procedure tasteProfile.get — aggregates data from reviews + wardrobe + profile into a taste profile
- [x] Real-time computation — no separate recalculate needed, always fresh
- [x] Auto-updates on every page load — computed from all completed reviews in real-time
- [x] Build TasteProfile.tsx page with visualizations:
  - [x] Overall "Taste Score" with radial gauge + score evolution area chart
  - [x] Style map with progress bars (minimalist %, classic %, bohemian %, etc.)
  - [x] Preferred colors palette with color swatches and percentages
  - [x] Brand affinities (top brands detected across all analyses)
  - [x] Style evolution timeline (monthly style breakdown)
  - [x] Category breakdown with trends (improving/stable/declining)
- [x] Add "פרופיל הטעם שלי" / "My Taste Profile" to Navbar
- [x] Add route /taste to App.tsx
- [x] Write tests for taste profile procedures (3 tests — empty state, shape, auth)

## Phase 49: Brand Affinity Matching (Admin-triggered)
- [x] Add brand affinity computation to tasteProfile.get — calculate % match to known brands based on style, colors, price range
- [x] Add admin panel section "Brand Matching" — view any user's brand affinities
- [x] Display brand affinity cards in Taste Profile page (92% ZARA, 78% H&M, etc.)
- [x] Tests pass (439 tests, 20 files)

## Phase 50: Brand Demo Website with TotalLook Widget
- [x] Create demo brand store page at /brand-demo
- [x] Build product page with 4 demo fashion items (blazer, dress, casual, coat)
- [x] Add gold "Check if it matches you" Widget button with TotalLook.ai branding
- [x] Widget connects to user's taste profile and shows match %, style insights, match reasons
- [x] Styled as clean white e-commerce store with DEMO FASHION branding, breadcrumbs, ratings, sizes, colors

## Phase 51: Add Brand Demo Link to Admin Panel
- [x] Add a link/button in Admin panel to navigate to /brand-demo

## Phase 52: Enhanced Widget Personalization in Brand Demo
- [x] Add backend procedure to find matching wardrobe items for a given product category/color/style
- [x] Add backend procedure to find recent looks that could be improved with the product
- [x] Enhance Widget popup with "פריטים מהארון שמתאימים" section showing matching wardrobe items with thumbnails
- [x] Add "איך תיראי עם זה" section — combining product with wardrobe items
- [x] Add "שיפור לוק אחרון" section — showing recent look that would benefit from this product
- [x] Add personalized recommendations section
- [x] Add recycle ♻️ symbol for items from wardrobe
- [x] Add widgetPersonalization vitest tests (5 tests — wardrobe matching, recent looks, personal insights, complete look)
- [x] All 444 tests passing (21 test files)

## Phase 53: Try the Look AI Image + Smart Match Notification
- [x] Add backend endpoint to generate AI image of complete look (product + wardrobe items combined)
- [x] Add "נסי את הלוק" button in widget Full Look tab that triggers AI image generation
- [x] Display generated look image in widget with loading state
- [x] Add smart match notification popup when user enters brand demo page — "יש לנו משהו בשבילך!"
- [x] Notification checks taste profile match and shows matching products automatically
- [x] Write tests for new features
- [x] Fixed emoji itemType matching (wardrobe items use emoji types like 👕👖🧥 not text)
- [x] All 444 tests passing (21 test files)

## Phase 54: Before/After Animation in Widget
- [x] Design before/after comparison UI (slider or transition) for the Upgrade Look tab
- [x] Show "before" state: user's recent look with current score
- [x] Show "after" state: upgraded look with the new product and projected score improvement
- [x] Add smooth animation/transition between before and after states
- [x] Integrate with existing widget data (recent looks, product info, wardrobe items)
- [x] Test the animation and save checkpoint
- [x] Added generateUpgradeLook backend procedure
- [x] Built interactive before/after slider with drag handle and auto-slide animation
- [x] Score comparison bar (Before → +improvement → After)
- [x] "See Before/After ✨" button on each look card in Upgrade Look tab
- [x] New "Before/After" tab appears after generation
- [x] Regenerate button for new comparisons
- [x] All 444 tests passing (21 test files)

## Phase 55: Instagram Story Mentions Integration
- [x] Create storyMentions DB table (userId, igUserId, igMediaId, mediaUrl, analysisResult, score, dmSent, createdAt)
- [x] Create igConnections DB table (userId, igUserId, igAccessToken, igUsername, connectedAt)
- [x] Build Instagram webhook verification endpoint (GET /api/instagram/webhook)
- [x] Build Instagram webhook handler (POST /api/instagram/webhook) for story mention events
- [x] Build story image fetcher — pull image from Instagram Graph API
- [x] Build auto-analysis pipeline — story image → AI analysis → save to DB + wardrobe
- [x] Build DM response sender — send analysis summary via Instagram Messenger API
- [x] Build Style Diary page — timeline of all analyzed stories with scores, items, trends
- [x] Build weekly/monthly style summary (average score, trending items, style evolution)
- [x] Build "Connect Instagram" explainer page — how to tag @totallook.ai (integrated into Style Diary)
- [x] Add Instagram connection flow to user profile/settings (tRPC procedures)
- [x] Add navigation link to Style Diary (BookOpen icon in navbar)
- [x] Write tests for webhook, pipeline, and diary features (18 tests)
- [x] All 462 tests passing (22 test files)

## Phase 56: Meta App Review Preparation
- [x] Create Privacy Policy page at /privacy (already existed, updated with Instagram section)
- [x] Create Terms of Service page at /terms (already existed)
- [x] Add routes for privacy and terms pages (already existed)
- [x] Prepare App Review submission text and test instructions (meta-app-review-guide.md)

## Phase 46: Premium User Analysis Quality Fix
- [x] BUG: Premium users should never get cheap material descriptions like "דמוי עור" — use elevated terms (עור, Vegan Leather, PU Leather)
- [x] BUG: Premium users must have persistent brand identification — AI should try harder to identify or suggest likely brands

## Phase 57: Deep Analysis Quality for ALL Users
- [x] Enhance material identification rules for ALL users — detailed fabric/texture guidance
- [x] Improve brand recognition accuracy with detailed visual cues for ALL users
- [x] Add deeper color analysis instructions (exact shades, color harmony, complementary colors)
- [x] Improve scoring precision with clearer rubrics and justification per category
- [x] Add post-processing validation to catch AI errors (wrong materials, missing items, score inconsistencies)
- [x] Enhance item description depth — require specific details (cut, fit, silhouette, pattern)
- [x] Add chain-of-thought reasoning instruction — AI must analyze systematically before scoring
- [x] Improve shopping link accuracy — more specific product search queries

## Premium Material Descriptions in AI Analysis
- [x] Update AI prompt to use premium/luxurious phrasing for materials (e.g. "עור סינתטי איכותי" or "עור יוקרתי" instead of plain "עור סינתטי")

## Brand Identification Scoring Fix for Premium Users
- [x] Fix brand identification score for premium/luxury users — Quiet Luxury (no visible logos) should be scored HIGH (8+), not penalized
- [x] Add post-processing to enforce minimum 8 score on brand identification for premium users

## Weather/Time-Aware Scoring Fix
- [x] Update AI prompt: layering should not penalize for missing layers in hot weather/summer occasions
- [x] Update AI prompt: accessories should not suggest sunglasses at night/evening events
- [x] Add weighted scoring: layering and accessories get lower weight (0.5) in overall score calculation
- [x] Add post-processing safety net: weighted scoring applied in both registered and guest flows

## Retroactive Score Recalculation
- [x] Recalculate overallScore for all existing analyses in DB using new weighted scoring (90 reviews, 22 guest sessions processed; 17 scores changed)

## Admin Panel Cleanup
- [x] Remove "התאמת מותגים לפרופיל הטעם" (brand matching) section from admin panel — it doesn't belong there

## Demo Analysis & Outfits Display Fixes
- [x] Redesign outfits section in Demo page: show outfit image first, click to expand item list (matching ReviewPage behavior)

## Expanded Occasions & Occasion-Aware Scoring
- [x] Add 3 new occasions: ארוחה משפחתית/חג, קפה/ברנצ', בר/מסעדה
- [x] Update Upload page UI with new occasion options and icons (auto — uses shared OCCASIONS array)
- [x] Strengthen AI prompt to score occasion fit seriously with specific criteria per occasion type
- [x] Update shared types/constants for new occasions

## General Review Occasion
- [x] Add "חוות דעת כללית" (general) option to occasions list — first option, no occasion-fit penalty, holistic review

## WhatsApp POC
- [x] Set up Twilio credentials (Account SID, Auth Token, WhatsApp Sandbox number)
- [x] Install Twilio SDK dependency
- [x] Build WhatsApp webhook endpoint (/api/whatsapp/webhook)
- [x] Build quick analysis prompt (score + 3 strengths + 2 improvements + tip + summary)
- [x] Send quick insights back via WhatsApp with emoji-based formatting
- [x] CTA link to full analysis on totallook.ai
- [x] Rate limiting (5/day per phone number)
- [x] Write tests (12 tests passing)

## WhatsApp Full Integration
- [x] Add phoneNumber field to userProfiles DB schema
- [x] Add whatsappToken, whatsappPhone, whatsappProfileName, source fields to guestSessions schema
- [x] Build findUserByPhoneNumber DB helper (normalizes phone, joins with users table)
- [x] Build getGuestSessionByToken DB helper for deep-link resolution
- [x] Build guest flow: save WhatsApp image as guest session with token, run full analysis, send deep link /r/:token
- [x] Build registered user flow: identify by phone number, run full analysis, save to reviews/wardrobe
- [x] Rewrite WhatsApp webhook handler with both flows + shared post-processing
- [x] Add guest.getByToken tRPC route for token-based guest review access
- [x] Build WhatsAppReview page (/r/:token) — resolves token and redirects to GuestReview
- [x] Add phone number field to Profile page with WhatsApp linking instructions
- [x] Add phoneNumber to profile.save mutation input schema
- [x] Write tests for both flows (12 tests passing)

## WhatsApp Guest Limits & Site Access Control
- [x] Limit WhatsApp guests to max 2 analyses per phone number (GUEST_LIFETIME_LIMIT = 2)
- [x] Exempt owner phone +972525556111 from the 2-analysis limit (isOwnerPhone helper)
- [x] Block WhatsApp guests from continuing to browse the site — /r/:token shows analysis inline with no navigation, only registration CTA
- [x] Update tests for new limits (15 tests passing including isOwnerPhone, GUEST_LIFETIME_LIMIT)

## WhatsApp Follow-up & Guest Counter
- [x] Add remaining analyses counter to WhatsApp guest response message ("נותר לך X ניתוחים מתוך 2" / "הניתוח החינמי האחרון")
- [x] Build 24-hour follow-up message system (processFollowUps, sendFollowUpMessage, scheduler)
- [x] Track follow-up sent status via followUpSentAt field in guestSessions + markFollowUpSent helper
- [x] Update tests for counter and follow-up (21 tests passing)

## Phone Input with Country Code
- [x] Build reusable PhoneInput component with country code dropdown (flag + dial code, 25 countries)
- [x] Default to Israel (+972), auto-detect from user's country, support 25 common countries
- [x] Auto-format phone number: strip leading zero, save in E.164 format (+972XXXXXXXXX)
- [x] Add phone number field to onboarding step 1 (after age selection, optional, with WhatsApp hint)
- [x] Upgrade phone number field in Profile page to use same PhoneInput component
- [x] E.164 parsing and formatting with round-trip tests (18 tests passing)

## Bug: Product/Look Images Not Loading (WhatsApp Flow)
- [x] Investigated: ProductCard shows fallback "צפה בחנות" state = imageUrl empty + no shimmer = IntersectionObserver never triggered generation
- [x] Fix ImprovementCard: added 3-second fallback timer if IntersectionObserver doesn't fire + lower threshold (0.05) + rootMargin 200px
- [x] Add explicit "טען תמונות" retry button visible when images are missing after generation attempt
- [x] Fix OutfitCard: extracted doGenerate callback, added 5-second fallback timer for retry
- [ ] Verify fix on mobile (user testing needed)

## Guest WhatsApp Message — No Personalization Notice
- [x] Update WhatsApp guest response to clarify analysis is basic (no personalization features)
- [x] Add CTA to register for full personalized analysis with feature list (style matching, budget, wardrobe, unlimited)

## WhatsApp Processing Lock — One Image at a Time
- [x] Add processing lock per phone number (processingLock Map) — only first image enters analysis, rest are rejected
- [x] Send rejection message only once (rejectionSent flag) to avoid spamming
- [x] Release lock in finally block when analysis completes (success or failure)
- [x] Auto-release stale locks after 3 minutes (LOCK_TIMEOUT_MS)
- [x] Tests: 25 passing (4 new for processing lock)

## Bug Fix: Product/Look Images Still Not Loading (WhatsApp flow)
- [x] Root cause: tRPC mutations return HTML instead of JSON when user not fully authenticated in WhatsApp browser context
- [x] Solution: Pre-generate ALL product images server-side using enrichAnalysisWithProductImages() in WhatsApp flow
- [x] Pre-generate outfit look images server-side (using same prompt as generateOutfitLook mutation)
- [x] Applied to both handleRegisteredUserAnalysis and handleGuestAnalysis
- [x] Frontend OutfitCard reads pre-generated _lookImage from analysis JSON as initial state (skips client-side generation)
- [x] Product images saved directly in analysis JSON improvements[].shoppingLinks[].imageUrl
- [ ] Verify fix works on mobile (user testing needed)

## Phone Number Uniqueness & Deduplication
- [x] Created shared/phone.ts with normalizePhone() utility — consistent E.164 normalization across server & client
- [x] Updated upsertUserProfile() to normalize phone before saving to DB
- [x] Updated findUserByPhoneNumber() to use normalizePhone() for WhatsApp matching
- [x] Added isPhoneTaken(phone, excludeUserId) DB helper — checks if phone is used by another user
- [x] Added phone uniqueness validation in profile.save tRPC procedure — blocks duplicate phones with Hebrew error message
- [x] Updated isOwnerPhone() in whatsapp.ts to use normalizePhone()
- [x] Added ne (not equal) import to drizzle-orm for exclusion queries
- [x] 14 new tests for normalizePhone() and phone uniqueness logic
- [x] All 629 tests passing (27 test files)

## Bug: WhatsApp response not sent back to registered user after analysis completes
- [x] Check server logs for the failed WhatsApp response
- [x] Fix #1: restructured both handleRegisteredUserAnalysis and handleGuestAnalysis to send WhatsApp response IMMEDIATELY after LLM analysis, then run image generation in background (fire-and-forget)
- [x] Root cause found: Twilio error 21617 — message body exceeds 1600 character limit (messages were 1791 and 1606 chars)
- [x] Fix #2: shortened formatFullAnalysisResponse (truncate summary to 200 chars, limit scores to 3, limit improvements to 1 with 100 char cap, compact guest CTA)
- [x] Fix #2: added hard safety truncation — if message still over 1550 chars, truncate and append deep link
- [x] Fix #2: sendWhatsAppMessage now splits messages into chunks at newline boundaries if over 1550 chars (fallback safety net)
- [x] All 629 tests passing, TypeScript clean

## About Page Enhancements
- [ ] Add Nofar Malovani photo to About page founder section (skipped per user request)
- [x] Add "About Us" link to footer across all pages (Home, LandingEN, GuestUpload)
- [x] Re-create About.tsx page and route after checkpoint reset
- [x] Add about translations to i18n
- [x] All 629 tests passing, TypeScript clean

## About Page Fixes
- [x] Fix scroll-to-top when navigating to About page (added useEffect with window.scrollTo)
- [x] Add "About Us" link to ALL page footers: Home, LandingEN, GuestUpload, Upload, Terms, Privacy, About

## WhatsApp Onboarding Flow
- [x] Server: sendWhatsAppWelcome function — sends welcome message with instructions when phone is saved
- [x] Server: profile.save returns whatsAppWelcomeSent flag to trigger frontend modal
- [x] Frontend: WhatsAppOnboardingModal component — shows 3 steps, "message sent" confirmation, "Open WhatsApp" button
- [x] Frontend: Onboarding.tsx — shows modal after save if phone was provided (before redirect to /upload)
- [x] Frontend: Profile.tsx — shows modal after phone number is saved/changed
- [x] i18n: Added whatsappOnboarding translations (Hebrew + English)
- [ ] Server: send proactive WhatsApp welcome message when guest provides phone number (guests don't have phone field yet)
- [x] All 629 tests passing, TypeScript clean

## Migration: Twilio → Meta WhatsApp Cloud API
- [ ] Read current Twilio WhatsApp code (sendWhatsAppMessage, webhook handler)
- [ ] Research Meta Cloud API format (send text, send image, receive webhook, verify webhook)
- [ ] Update sendWhatsAppMessage to use Meta Graph API instead of Twilio
- [ ] Update webhook handler to parse Meta webhook format
- [ ] Add webhook verification endpoint (GET /api/whatsapp/webhook)
- [ ] Update environment variables (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN)
- [ ] Update sendWhatsAppWelcome for Meta format
- [ ] Update tests
- [ ] Guide user through Meta Business Suite setup

## WhatsApp Phone Number Update
- [x] Update WhatsApp number from +972535657871 to +972526211811 in WhatsAppOnboardingModal

## Bug Fixes
- [x] AI Looks widget demo should use the current user's image, not admin's image
- [x] Fix generateUpgradeLook: use user's original photo as reference image (image editing) instead of generating a generic new image
- [x] Fix /upload page: tRPC returning HTML instead of JSON (API query error) — transient error during server restart, not reproducible
- [x] Fix Vite WebSocket connection failure — dev-only HMR issue through proxy, does not affect production

## WhatsApp Phone Number Feature
- [x] Add WhatsApp feature explanation below phone input in Onboarding
- [x] Create popup reminder component for users/guests without phone number (WhatsAppPhoneReminder.tsx)
- [x] Show popup on every analysis (ReviewPage + GuestReview) if user hasn't entered phone number

## WhatsApp Gender-Specific Response + Popup Improvement
- [x] Fix WhatsApp response to use user's gender from profile (no more את/ה for known gender)
- [x] Add "don't show again" option to WhatsAppPhoneReminder popup

## Bug Fixes — Phone Number & WhatsApp Welcome
- [x] Fix: deleted user's phone number still blocks new user registration — isPhoneTaken now JOINs with users table
- [x] Fix: deleteUserAccount now also deletes igConnections, storyMentions, styleDiaryEntries, fixMyLookResults
- [x] Fix: isNewPhone comparison now normalizes both sides to prevent false positives
- [x] Investigated: new user (Betty Kalfon) didn't receive WhatsApp because she didn't enter a phone number
- [x] Bug: WhatsApp welcome message not sent — root cause: production was running old code before deploy. Manual test confirmed API works. Also fixed profile.save to not null-out existing fields on partial updates (e.g. saving only phoneNumber).
- [x] Fix: onboardingCompleted no longer resets to 0 when saving partial profile updates
- [x] Bug: WhatsApp message to 0546806811 not delivered — root cause: Meta name_status DECLINED, can_send_message LIMITED. Pending name approval.
- [ ] Fix: Use WhatsApp Template Message for welcome message so it works outside 24h conversation window (blocked by Meta name approval)
- [x] Bug: Widget Demo page - images not uploading (3 of 4 CDN URLs returned 403) — replaced all with new uploaded images
- [x] Change demo product to men's green blazer + all products changed to men's items
- [x] Fix Hebrew gendered text in BrandDemo to use masculine form for men's products
- [ ] Bug: Special features disappeared from Widget Demo page after product changes — investigate and fix

## Privacy & Security Upgrade
- [x] Research GDPR, CCPA, Israeli Privacy Protection Law requirements for AI fashion apps
- [x] Create Privacy Policy page (Hebrew + English) — 18 sections, GDPR/CCPA/Israeli law compliant
- [x] Create Terms of Service page (Hebrew + English) — 18 sections, comprehensive legal coverage
- [x] Create Cookie Consent banner (CookieConsent component) — accept/decline, localStorage, bilingual
- [x] Build privacy settings in Profile page (consent toggles for marketing + WhatsApp)
- [x] Implement backend data export API (GDPR right to portability) — profile.exportMyData endpoint
- [x] Implement backend data deletion API (GDPR right to erasure) — profile.deleteAccount endpoint with full cascade
- [x] Add consent tracking to database (logConsent + getUserConsents + privacy.logConsent/getMyConsents endpoints)
- [x] Add privacy links to footer across all pages (Home, LandingEN, GuestUpload, Upload, Terms, Privacy, About)
- [x] Add privacy consent checkbox to Onboarding flow (last step, must agree before finishing)
- [x] Add privacy consent checkbox to GuestUpload page (must agree before analyzing)
- [x] CookieConsent banner integrated in App.tsx (shows on first visit)
- [x] Privacy tests written and passing (10 tests in privacy.test.ts + 10 in legalPages.test.ts)
- [x] All 639 tests passing

## Bug: Crash after image upload on production
- [x] Fix: "An unexpected error occurred" crash after uploading image on totallook.ai — root cause: useEffect after early returns in ReviewPage.tsx (React hooks violation). Moved useEffect before early returns.

## Premium Brand Identification Upgrade (Men & Women)
- [x] Audit current brand lists, AI prompt, and shopping link generation
- [x] Expand BRAND_URLS with premium men's brands (luxury, streetwear, contemporary) — added ~50 brands: Zegna, Cucinelli, Loro Piana, Brioni, A.P.C., Norse Projects, Our Legacy, Stüssy, Palace, Supreme, Kith, Amiri, Patek Philippe, AP, IWC, Church's, John Lobb, etc.
- [x] Expand BRAND_URLS with premium women's brands (luxury, designer, contemporary) — added ~60 brands: Stella McCartney, Chloé, Alaïa, Balmain, The Row, Khaite, Totême, Ganni, Tiffany, Van Cleef, Bvlgari, Jimmy Choo, Manolo Blahnik, Polène, etc.
- [x] Add Israeli local brands for men and women — added Kravitz, Sack's, Maya Negri, Michal Negrin, Sasson Kedem, Yvel, Terminal X, Oysho
- [x] Upgrade AI analysis prompt for better brand identification — added gender-specific sections for footwear (women's heels, men's dress shoes), clothing (luxury menswear markers, women's designer markers), jewelry & watch markers, bag brand identification
- [x] Add gender-aware brand recommendations in the prompt — separate WOMEN'S SPECIFIC and MEN'S SPECIFIC sections with detailed visual cues
- [x] Improve shopping link generation with gender-specific store URLs — added 20+ new store search patterns for premium women's and men's stores
- [x] Add brand confidence scoring in analysis output — already existed (HIGH/MEDIUM/LOW confidence levels)
- [x] Test brand identification improvements — all 639 tests passing, TypeScript clean

## Critical Fix: Brand Identification Not Working in Practice
- [x] Diagnosed: All items returning brand=N/A, brandConfidence=N/A — brands never populated
- [x] Root cause: JSON schema (analysisJsonSchema) had additionalProperties:false but did NOT include brand/brandUrl/brandConfidence fields — AI could not return brand data
- [x] Fix: Added brand, brandUrl, brandConfidence to analysisJsonSchema required fields
- [x] Rewrote prompt: Replaced passive "Quiet Luxury excuse" with MANDATORY brand identification for every item
- [x] Added 7 brand identification methods (logos, patterns, silhouette, fabric, footwear, accessories, local brands)
- [x] Added brandConfidence levels (HIGH/MEDIUM/LOW/NONE) with clear definitions
- [x] Separated premium vs general brand scoring guidance
- [x] Updated analysis-prompt tests to match new prompt structure
- [x] All 637 tests passing, TypeScript clean

## Deep Brand Identification Improvement (Round 2)
- [x] Analyze latest analysis results — found 0% brand identification rate, AI returning empty strings, "Quiet Luxury" excuse
- [x] Deep rewrite of brand identification prompt — ZERO TOLERANCE policy, 7 identification methods, 12 item-type-specific brand mappings
- [x] Add brand-specific visual signature database in prompt (sneakers, jeans, puffers, watches, rings, t-shirts, sweatshirts)
- [x] Enhance post-processing: 4-step enrichment (BRAND_URLS match, name scan, confidence fill, no-empty fallback)
- [x] Update ReviewPage + GuestReview UI — brand badges with color-coded confidence (HIGH=green, MEDIUM=blue, LOW=purple)
- [x] Added brandConfidence to FashionItem TypeScript interface
- [x] All 637 tests passing, TypeScript clean

## Bug: Hermès H not recognized on shoes — misidentified as Valentino
- [x] Add Hermès-specific visual signatures — H cutout/strap on sandals/slides, Oran/Izmir/Chypre, H buckle belts, Constance H clasp
- [x] Add ICONIC BRAND PRIORITY RULES section — 27 single-letter/symbol markers checked FIRST (H=Hermès, CC=Chanel, LV=Louis Vuitton, GG=Gucci, FF=Fendi, etc.)
- [x] Add FOOTWEAR priority rules — 10 iconic shoe markers with HIGH confidence (Hermès H, Louboutin red sole, Valentino rockstud, etc.)
- [x] Add BELTS and SUNGLASSES brand markers
- [x] Added explicit CRITICAL RULE: H on ANY footwear = Hermès, NOT Valentino/Hugo Boss/Hogan
- [x] All 637 tests passing, TypeScript clean

## Bug: Moncler puffer misidentified as Zara + brand confidence display
- [x] Add Moncler and premium puffer brand priority rules — 9 visual markers (rooster patch, premium nylon, lacquered, disc badge, compass patch, etc.), Moncler preferred over Zara for quality puffers
- [x] Instruct AI to use hedged language: HIGH="סנדלי Hermès", MEDIUM="בסגנון Moncler", LOW="מזכיר COS", NONE="ייתכן H&M"
- [x] Update UI brand badges in ReviewPage + GuestReview — prefix text changes by confidence (✓/~/?) instead of (וודאי/סביר/הערכה)

## Demo Store Fixes
- [x] Fix popup — now shows "this product matches YOUR taste profile + wardrobe + budget" (not complementary items)
- [x] Fix product images — gallery with 4 angles (front, back, detail close-up, on model) with clickable thumbnails
- [x] Restructure demo store — single product (green blazer only), removed multi-product navigation

## Fix: Demo Store Popup — Focus on Current Product
- [x] Rewrite popup — now says "this product matches YOUR taste profile" with 92% match score
- [x] Show match reasons: fits your style, pairs with items in your wardrobe, within your budget

## Fix: Demo Store Before/After — Use User's Own Photo
- [x] Fix before/after image generation — now passes user's original photo as `originalImages` reference to generateImage
- [x] Prompt rewritten as image EDITING (keep same person/pose/background, only add the product)
- [x] Popup rewritten — focuses on "this product matches YOUR taste profile + wardrobe + budget" with 92% match score
- [x] Fix popup notification — done, focuses on current product matching user's profile

## WhatsApp Templates (fix message delivery)
- [x] Check existing templates on Meta WABA
- [x] Create Hebrew message templates for: welcome, analysis result, follow-up, guest limit
- [x] Update whatsapp.ts to send templates instead of free-form text for business-initiated messages
- [x] Keep free-form text for replies within 24h conversation window
- [x] Test template sending to verify delivery (templates PENDING approval by Meta)

## WhatsApp Registration Popup — Global
- [x] Move WhatsApp registration popup to appear on every page, not just before analysis view
- [x] Show WhatsApp registration popup for guest (unauthenticated) users on all pages

## Bug: WhatsApp deep link shows "הניתוח לא נמצא"
- [x] Fix WhatsApp deep link for registered users — /review/:id requires login but user clicks from WhatsApp without being logged in
- [x] Generate a public share token for registered user reviews sent via WhatsApp
- [x] Create public route or make review accessible via share token

## Fix: Brand names should not appear definitively in item titles
- [x] Update AI prompt so item name/title does NOT include brand name (e.g. "ז'קט עור קרופ" not "ז'קט עור קרופ Zara")
- [x] Brand should only appear in the "reminds of" tag, not stated as fact in the title

## UX: Hide WhatsApp popup on onboarding page
- [x] Don't show WhatsApp registration popup on the onboarding page

## WhatsApp CTA Button + Remove brand mentions from description/analysis text
- [ ] Create WhatsApp template with CTA button "צפה בניתוח" linking to the analysis page
- [ ] Update whatsapp.ts to send the CTA template for analysis results
- [x] Remove brand name mentions from AI description and analysis text — the brand tag badge is sufficient
- [x] Stop giving premium/luxury users inflated scores based on brand perception

## WhatsApp popup — only for registered users
- [x] Remove WhatsApp popup for guests (unauthenticated users)
- [x] Exclude home page from WhatsApp popup
- [x] Popup should only show after user has registered and logged in
- [x] Show WhatsApp popup for guests only after onboarding (on guest review result page) — already implemented in GuestReview.tsx

## Influencer names — highlight and link
- [x] Make influencer names bold/highlighted in the analysis text
- [x] Add links from influencer names to styling example (Instagram or search)
- [x] Fix AI prompt to always write influencer names in English for proper linking

## Loading Screen Upgrade — Scan Effect + Fashion Facts
- [x] Show user's uploaded image with glowing scan line effect during analysis
- [x] Add rotating fashion facts that change every 5 seconds with fade animation
- [x] Add scanning frame corner brackets and detection labels that appear as analysis progresses
- [x] Add step progress indicators with icons (👁️ 🎨 ✂️ 🔥 💎 🛍️ ✨)
- [x] Add photo tips accordion section
- [x] Applied to both Upload (registered) and GuestUpload pages

## Fix My Look — Image Rotation + Correct Item Colors
- [x] Always rotate the generated "after" image 45 degrees clockwise (right)
- [x] Ensure AI prompt uses the exact items the user selected (correct colors, not different shades)
- [x] Pass the user's selected item details (name, color, brand) accurately to the image generation prompt
- [x] Applied fixes to both registered user and guest Fix My Look flows

## Fix My Look — Revert rotation + Specific garment details in AI prompt
- [x] Revert 45-degree rotation — restore orientation-mismatch-only auto-rotate logic
- [x] Make AI prompt specific about sleeve length (short/long), collar type (polo/crew/v-neck), and garment style
- [x] If recommendation is "short sleeve polo", the generated image must show exactly that — not a long sleeve shirt
- [x] Applied to both registered user and guest Fix My Look flows

## Analysis Results Page Redesign — Fashion Story Cards
- [x] Hero Card: compact score display + summary + Fix My Look CTA (always visible)
- [x] Swipeable horizontal Story Cards container with tab navigation + dots indicator
- [x] Card 1 "Items": item chips with color-coded scores, expandable accordion for detailed analysis
- [x] Card 2 "Upgrades": improvement recommendations with product images, accordion expand
- [x] Card 3 "Looks": outfit suggestions with generated look images (replaces moodboard)
- [x] Card 4 "Trends": trend sources + mentions legend (replaces shopping-only card)
- [x] Mobile-first swipe navigation between cards
- [x] Replace old long-scroll layout with new card-based layout
- [x] Apply to both registered user (ReviewPage) and guest (GuestReview) analysis results

## UX Polish — Card Animations & Dead Space Fix
- [x] Remove dead space (excessive padding-top) between navbar and review content
- [x] Add fade-in / slide-up entry animation when swiping to a new Story Card
- [x] Apply to both ReviewPage and GuestReview

## UX Fixes — Readability, Fix My Look placement, Bottom spacing
- [x] Fix card text readability — add solid opaque background to story cards (bg-background instead of bg-card)
- [x] Move "Fix My Look" CTA from Hero Card to the Upgrades/Shopping card only
- [x] Reduce bottom spacing between end of analysis and footer actions
- [x] Apply to both ReviewPage and GuestReview

## UX Fixes — Tab opacity bug, Influencer tab, Dynamic spacing, Fix My Look CTA
- [x] Fix card opacity bug — inactive cards now fully hidden (opacity-0 + pointer-events-none) instead of dimmed
- [x] Add "Influencer Insights" as a separate 5th tab in story cards (conditional on data)
- [x] Dynamic bottom spacing — removed min-h constraints so cards size to content naturally
- [x] Make "Fix My Look" CTA more visually attractive (gradient card with icon, glow, full-width button)
- [x] Apply all fixes to both ReviewPage and GuestReview

## Story Cards Bugs — Tab switching, sizing, influencer layout
- [x] Fix tab switching bug — replaced scroll-based with conditional rendering (only active card shown)
- [x] Fix tab sizing — reduced to text-[11px] with compact padding
- [x] Move influencer insights to tab 2 (right after items)
- [x] Redesign influencer tab — best matching influencer with avatar + insights text + all influencer chips with avatars
- [x] Apply all fixes to both ReviewPage and GuestReview

## Story Cards — Swipe, Influencer Image, Text Overflow, Trends Overflow
- [x] Restore swipe/slide gesture between tabs (touch events for mobile)
- [x] Influencer tab: hero-style large avatar with gradient badge, insights text, all influencer chips
- [x] Fix text overflow — truncate with max-w-[60px] on tab labels
- [x] Hide Trends tab behind "..." overflow menu (first 4 visible, rest in dropdown)
- [x] Applied to both ReviewPage and GuestReview

## Swipe Direction Fix (RTL)
- [x] Fix swipe direction in RTL — swipe right (dx > 0) = next tab, swipe left (dx < 0) = prev tab
- [x] Applied to both ReviewPage and GuestReview

## Smooth Swipe Animation
- [x] Add directional slide-in/slide-out animation with live drag (finger-following transform)
- [x] Make swipe feel dynamic and fluid — velocity-based flick detection, capped drag at ±120px, opacity fade
- [x] Applied to both ReviewPage and GuestReview

## Story Cards — Animation Speed & Centering
- [ ] Slow down slide animation — make it smooth and pleasant (not jarring)
- [ ] Center tabs and content properly — content is cut off on the right side
- [ ] Apply to both ReviewPage and GuestReview

- [x] Redesign Story Cards swipe to feel like Instagram Stories slider — smooth one-directional slide, no bounce-back effect
- [x] Swipe should follow finger all the way through and transition directly to next card (continuous slide, no snap-back-then-animate)
- [x] Remove pinned influencer chip at bottom of influencer card
- [x] Add Instagram-style progress bar at top of Story Cards showing current position
- [x] Add peek animation showing edge of next card during drag
- [x] Add haptic feedback (vibration) on card transition
- [x] Add blinking swipe indicator arrow on first Story Card to hint users can swipe
- [ ] Bug: WhatsApp notification not sent when new user registers
- [x] Allow admin to edit user phone numbers in admin users table
- [x] Add Edit button per user row in admin table with editable fields (name, phone, gender, role)
- [x] Update WhatsAppReview.tsx (/r/:token) to use new Story Cards slider layout instead of old scrollable layout
- [x] Add 'Send WhatsApp Welcome' button per user in admin table for manual sending
- [x] Fix TotalLook popup positioning in DEMO FASHION store page — center properly and prevent overlap with page content
- [x] Auto-redirect logged-in users from WhatsApp review link (/r/:token) to their full review page

## Phase — OpenAI API Integration
- [x] Integrate OpenAI GPT-4o API as replacement for built-in Manus LLM
- [x] Save OPENAI_API_KEY as project secret
- [x] Modify LLM helper to use OpenAI API
- [x] Test analysis flow with OpenAI

## Phase — Replace Manus Image Generation with DALL-E 3
- [x] Replace imageGeneration.ts to use OpenAI DALL-E 3 API
- [x] Fix analysis failure on production (verify LLM + image gen both work)
- [x] Test image generation with DALL-E 3

## Phase — Fix OpenAI Vision (Image URL → Base64)
- [x] Diagnose production error: OpenAI returns invalid_image_url for S3 URLs
- [x] Add base64 image conversion in invokeLLM — downloads images server-side and sends as data URIs
- [x] Test vision endpoint with base64 conversion — working on dev
- [x] Fix analysisJsonSchema for OpenAI strict mode — type: ["number", "null"] changed to anyOf, added missing required fields

## Phase — Migrate from Manus Hosting to Railway
- [ ] Audit all Manus dependencies in codebase
- [ ] Set up Railway project with MySQL database
- [ ] Replace Manus OAuth with email/password authentication
- [ ] Replace Manus S3 with Cloudflare R2 or AWS S3
- [ ] Adapt server code for Railway deployment
- [ ] Export and migrate database data
- [ ] Deploy to Railway and configure totallook.ai domain
- [ ] Test and verify everything works

## Bug: Image analysis returning general error on website
- [ ] Diagnose image analysis error from production logs
- [ ] Fix the root cause of the analysis failure
- [ ] Test and verify the fix works

## Bug: fixMyLook not using user's relevant image
- [ ] Fix fixMyLook to use the user's actual photo for look fitting/improvement

## Domain & Hosting Cleanup
- [ ] Remove Manus public exposure/domain for totallook.ai
- [ ] Ensure no redirect/domain alias active to Manus
- [ ] Verify totallook.ai custom domain on Railway with SSL
- [ ] Verify www.totallook.ai custom domain on Railway with SSL
- [ ] Fix SSL issue on www.totallook.ai if needed

## Bug Investigation (April 5, 2026)
- [ ] Investigate guest profile save error ("שגיאה בשמירת הפרופיל")
- [ ] Investigate Google login not working
