# Stage 1 Metadata Audit — What We Have vs What We Need

## Current FashionItem Fields (Stage 1 JSON Schema)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | YES | Item name (no brand) — e.g. "חולצת טי לבנה" |
| description | string | YES | Free-text: material, color shade, construction details |
| color | string | YES | Main color — single word like "white", "black" |
| score | number | YES | 5-10 quality/style score |
| verdict | string | YES | Short verdict like "בחירה מצוינת" |
| analysis | string | YES | 2-3 sentences: material ID, trend connection |
| icon | string | YES | Emoji icon for the item type |
| brand | string | YES | Brand name or guess |
| brandUrl | string | YES | Brand website URL |
| brandConfidence | string | YES | HIGH/MEDIUM/LOW/NONE |

## What the Prompt ASKS For (in free text)
The prompt says: "identify specific material/fabric, precise color shade, fit/silhouette, construction details"
But these are embedded in the free-text `description` and `analysis` fields — NOT structured.

## Where Stage 1 Data Flows Downstream
1. **Stage 2 LLM** — receives items array as JSON seed → uses to generate improvements
2. **Fix My Look** — uses `item.name` for replacement labels, `item.color` for keep/replace decisions
3. **Wardrobe/Closet** — saves `item.name`, `item.color`, `item.icon`, `item.brand`, `item.score`
4. **Widget** — displays items with name, color, score, brand
5. **Brand normalization** — post-processes `item.brand`, `item.brandUrl`, `item.brandConfidence`
6. **Analytics** — tracks `item.score`, `item.brand` for brand statistics

## THE GAP — What's Missing as Structured Fields
The prompt asks the LLM to describe material, fit, color shade etc. but these are buried in free text.
Stage 2 then has to RE-INTERPRET these from text to generate improvements.
Fix My Look only has `item.name` and `item.color` (single word) to work with.

### Missing Structured Fields for FashionItem:
1. **garmentType** — "t-shirt", "dress shirt", "jeans", "sneakers" (currently only in `icon` emoji)
2. **fit** — "slim", "regular", "oversized" (currently buried in `description`)
3. **material** — "cotton", "denim", "leather" (currently buried in `description`)
4. **pattern** — "solid", "striped", "checkered" (currently buried in `description`)
5. **sleeveLength** — "short", "long", "sleeveless" (not captured at all)
6. **neckline** — "crew neck", "v-neck", "polo" (not captured at all)
7. **closure** — "buttons", "zipper", "pullover" (not captured at all)
8. **garmentLength** — "cropped", "regular", "long" (not captured at all)
9. **texture** — "smooth", "ribbed", "knitted" (currently buried in `description`)
10. **style** — "casual", "formal", "streetwear" (not captured at all)
11. **details** — "visible logo", "pocket", "embroidery" (currently buried in `description`)
12. **preciseColor** — "navy blue", "charcoal gray", "off-white" (currently only single word in `color`)

### Impact of Adding These:
- Stage 2 gets STRUCTURED input → generates more accurate improvements
- Fix My Look gets precise item descriptions → better replacement prompts
- Wardrobe gets richer item data → better closet matching
- Widget can show more detailed item cards
