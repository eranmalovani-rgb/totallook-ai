# Improvements Pipeline Audit — Key Findings

## Current Flow (in human language)

### Step 1: Stage 2 LLM Call
- **Input:** Stage 1 `recommendationSeed` = { overallScore, summary, items (up to 12), scores, linkedMentions, occasion, influencers, styleNotes }
- **System prompt:** `buildRecommendationsPromptFromCore()` — tells LLM to generate 3 improvements with full garment metadata
- **Output:** JSON with improvements, outfitSuggestions, trendSources, influencerInsight

### Step 2: Sanitize & Validate
- `sanitizeRecommendationsPayload()`:
  - Validates productSearchQuery matches category
  - Normalizes shopping links
  - Deduplicates improvements by title
  - Ensures at least 4 improvements (pads with fallbacks)
  - Caps at 5
  - Ensures 3 unique shopping links per improvement
  - Validates influencer insight quality

### Step 3: Fix Shopping Links
- `fixShoppingLinkUrls()`:
  - Converts ALL shopping links to search URLs (never 404)
  - Redirects to user's preferred stores if configured
  - Gender-aware URL patterns

### Step 4: Normalize for Wearable Core
- `normalizeImprovementsForWearableCore()`:
  - Sorts: clothing first (top→bottom→shoes→outerwear), then non-clothing
  - Ensures at least 3 clothing improvements
  - Caps at 5 total
  - Fills gaps with `buildFallbackImprovement()` (generic, no metadata)

### Step 5: Closet Matching
- For each improvement:
  - Detect category from text keywords (title + beforeLabel + afterLabel + productSearchQuery)
  - Loop through wardrobe items, match by category keywords
  - Style contradiction check (hardcoded pairs: classic vs smart watch, formal vs sneakers, etc.)
  - Score: category match (+5), name mention in description (+10), brand (+3), color (+2), styleNote keywords (+4)
  - Attach closetMatch if score >= 5

### Step 6: Final Shopping Link Normalization
- Another pass of `normalizeImprovementShoppingLinks()` after closet matching

## Key Gaps & Improvement Opportunities

### GAP 1: recommendationSeed doesn't include new Stage 29 metadata
- Stage 2 receives `items` but they're sliced to 12 — however the NEW enriched fields (garmentType, preciseColor, material, fit, pattern, etc.) ARE included since they're part of the item objects
- **BUT:** the seed doesn't include `personDetection` or `lookStructure` — Stage 2 doesn't know body pose, proportions, layering analysis

### GAP 2: Closet matching uses keyword-based category detection
- `detectImprovementCategory()` uses text search on title/beforeLabel/afterLabel/productSearchQuery
- Could use `beforeGarmentType`/`afterGarmentType` structured fields instead
- `detectClothingCategory()` is a keyword dictionary — fragile

### GAP 3: Closet matching wardrobe data is thin
- Wardrobe stores: itemType, name, color, brand, material, styleNote
- Stage 29 enriched wardrobe save now includes richer styleNote
- But matching still uses keyword overlap, not structured field comparison

### GAP 4: Style contradiction check is hardcoded
- 5 hardcoded conflict pairs
- Could use beforeStyle/afterStyle structured fields for smarter matching

### GAP 5: Fallback improvements are generic
- `buildFallbackImprovement()` returns generic "שדרוג חלק עליון" with no metadata
- Could use Stage 1 item data to build contextual fallbacks

### GAP 6: productSearchQuery validation doesn't use structured metadata
- `validateAndFixProductSearchQuery()` extracts color/style from text
- Could use afterColor, afterFit, afterMaterial, afterGarmentType directly

### GAP 7: Stage 2 doesn't see lookStructure
- The LLM doesn't know if the outfit is monochromatic, layered, top-heavy, etc.
- This context would help generate better-targeted improvements
