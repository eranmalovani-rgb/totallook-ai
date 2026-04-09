# Metadata Usage Audit — All Features

## Features Scanned

### 1. generateTotalLook
- Uses: `imp.title`, `outfit.items`, `outfit.colors`, `item.name`
- GAP: Uses only names, no structured metadata (garmentType, material, fit, etc.)

### 2. Fix My Look (auth + guest)
- Uses: Full buildDeterministicFixMyLookPrompt (ALREADY ENHANCED in Stage 28-30)
- STATUS: ✅ Already uses all structured metadata

### 3. generateOutfitLook
- Uses: `outfit.lookDescription`, `outfit.items.join()`, `outfit.colors`
- GAP: Uses only text descriptions, no structured item metadata

### 4. correctItem
- Uses: `item.name`, `item.description`, `item.color`, `item.score`, `item.brand`, `item.analysis`
- GAP: Doesn't use new fields (garmentType, material, fit, etc.) — correction prompt could be richer

### 5. visualizeLook (wardrobe)
- Uses: `item.name`, `item.color`, `item.brand`
- GAP: Missing garmentType, material, fit, pattern — prompt is very basic

### 6. Taste Profile (get)
- Uses: `item.color` (basic), `item.brand`, `analysis.summary` (text parsing for styles)
- GAP: Style detection is keyword-based from summary text, doesn't use item.style or item.fit
- GAP: Color uses only basic `item.color`, not `item.preciseColor` or `item.colorFamily`
- GAP: No material/texture aggregation (user's fabric preferences)
- GAP: No fit preference tracking (does user prefer slim vs oversized?)

### 7. Brand Matching
- Uses: `item.color`, `item.brand`, `analysis.summary` (text parsing for styles)
- GAP: Same as taste profile — keyword-based style detection from summary text
- GAP: No material preference matching (leather-loving user → leather brands)
- GAP: No fit preference matching

### 8. Widget Personalization
- Uses: `item.name`, `item.color`, `item.score`, `analysis.summary` (text parsing)
- GAP: Style detection from summary text, not structured fields
- GAP: existingItems returns only name/color/score, missing garmentType/material

### 9. generateWidgetLook
- Uses: `productName`, `productColors`, `wardrobeItemNames`, `wardrobeItemColors`
- GAP: No material, fit, pattern info — prompt is generic

### 10. generateUpgradeLook
- Uses: `productName`, `productColors`, `existingItemNames`
- GAP: No material, fit, pattern info — prompt is generic

### 11. smartMatchProducts
- Uses: `analysis.summary` (text parsing for style), `item.color`, wardrobe categories (emoji-based)
- GAP: Style detection from summary text, not structured fields
- GAP: Category detection uses emoji mapping, not garmentType
- GAP: No material/texture matching

### 12. Style Feed (publish)
- Uses: `analysis.summary`, `review.occasion`, `review.overallScore`
- GAP: No structured style tags from items, no lookStructure data

### 13. Style Diary
- Uses: Basic review data
- STATUS: Minimal metadata usage

### 14. scanInstagram
- Uses: Only user gender
- STATUS: Not metadata-dependent

## Summary of Gaps by Category

### A. Style Detection (affects: taste profile, brand matching, widget, smartMatch)
- Currently: Keyword parsing from `analysis.summary` text
- Should use: `item.style` field from each FashionItem + `lookStructure.colorHarmony`

### B. Color Intelligence (affects: taste profile, brand matching, widget, smartMatch)
- Currently: `item.color` (single basic word like "white")
- Should use: `item.preciseColor` + `item.colorFamily` + `item.secondaryColor`

### C. Material/Texture Preferences (affects: taste profile, brand matching)
- Currently: Not tracked at all
- Should use: `item.material` + `item.texture` from each FashionItem

### D. Fit Preferences (affects: taste profile, brand matching)
- Currently: Not tracked at all
- Should use: `item.fit` from each FashionItem

### E. Image Generation Prompts (affects: totalLook, outfitLook, widgetLook, upgradeLook, visualizeLook)
- Currently: Basic text descriptions ("white shirt by Zara")
- Should use: Full structured metadata for rich prompts ("slim-fit cotton crew-neck white t-shirt")

### F. Category Detection (affects: smartMatch, widget)
- Currently: Emoji-based mapping (👕 → shirt)
- Should use: `item.garmentType` structured field

### G. Look Structure (affects: taste profile, feed, widget)
- Currently: Not used anywhere downstream
- Should use: `lookStructure.hasLayering`, `lookStructure.proportions`, `lookStructure.silhouetteSummary`
