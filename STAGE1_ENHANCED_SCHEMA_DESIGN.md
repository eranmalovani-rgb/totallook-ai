# Stage 29 — Enhanced Stage 1 Metadata Schema Design

## Architecture Decision
Current maxTokens for Stage 1 = 2200. Adding ~12 new fields per item + person detection + look structure
will require increasing to ~3500 to accommodate the richer output.

All new fields are OPTIONAL (backward compatible with existing analyses in DB).

## A. Person Detection (new top-level field on FashionAnalysis)

```typescript
interface PersonDetection {
  peopleCount: number;           // 1, 2, 3...
  primarySubjectIndex: number;   // 0-based, which person is being analyzed
  fullBodyVisible: boolean;      // is the full body visible head to toe
  faceVisible: boolean;          // is the face clearly visible
  handsVisible: boolean;         // are the hands visible
  feetVisible: boolean;          // are the feet/shoes visible
  bodyOcclusion: string;         // "none" | "partial" | "significant"
  bodyPose: string;              // "standing" | "sitting" | "walking" | "leaning" | "crouching"
  poseDescription: string;       // brief: "standing facing camera, hands in pockets"
}
```

## B. Enriched FashionItem (new optional fields)

```typescript
// Added to existing FashionItem interface
interface FashionItemEnhancements {
  // ── Garment Identity ──
  garmentType: string;       // "t-shirt", "dress shirt", "jeans", "sneakers", "blazer"
  subCategory: string;       // "crew neck tee", "slim jeans", "leather oxford", "mini dress"
  bodyZone: string;          // "upper" | "lower" | "outerwear" | "footwear" | "accessory" | "jewelry"
  layerIndex: number;        // 1 = base layer, 2 = mid layer, 3 = outer layer

  // ── Visibility ──
  visibility: string;        // "full" | "partial" | "minimal"

  // ── Color (enriched) ──
  preciseColor: string;      // "navy blue", "charcoal gray", "off-white", "burgundy"
  secondaryColor: string;    // if multi-color: "white" (e.g. striped navy/white)
  colorFamily: string;       // "blue" | "neutral" | "earth" | "warm" | "cool" | "monochrome"
  colorCount: number;        // 1 for solid, 2+ for multi-color

  // ── Pattern ──
  pattern: string;           // "solid" | "striped" | "checkered" | "floral" | "geometric" | "graphic" | "logo"

  // ── Material & Texture ──
  material: string;          // "cotton" | "denim" | "leather" | "knit" | "linen" | "satin" | "wool" | "synthetic"
  texture: string;           // "smooth" | "ribbed" | "matte" | "shiny" | "washed" | "distressed"

  // ── Fit & Structure ──
  fit: string;               // "slim" | "regular" | "relaxed" | "oversized" | "cropped" | "tailored"
  garmentLength: string;     // "short" | "regular" | "long" | "cropped" | "midi" | "maxi"
  sleeveLength: string;      // "short" | "long" | "3/4" | "sleeveless" | "rolled" | "n/a"
  neckline: string;          // "crew" | "v-neck" | "polo" | "button-down" | "turtleneck" | "hoodie" | "n/a"
  closure: string;           // "buttons" | "zipper" | "pullover" | "open" | "none" | "n/a"

  // ── Condition & Details ──
  condition: string;         // "clean" | "wrinkled" | "worn" | "distressed"
  hasLogo: boolean;          // visible logo/branding
  prominentBranding: boolean;// large/obvious branding
  details: string;           // "chest pocket", "embroidery", "contrast stitching", "none"
}
```

## C. Look Structure (new top-level field on FashionAnalysis)

```typescript
interface LookStructure {
  totalItemCount: number;          // total garment + accessory count
  hasLayering: boolean;            // multiple layers visible
  layerCount: number;              // 1, 2, 3
  colorHarmony: string;            // "monochromatic" | "neutral" | "complementary" | "contrasting" | "colorful"
  dominantItem: string;            // which item dominates visually: "outerwear", "dress", etc.
  proportions: string;             // "balanced" | "top-heavy" | "bottom-heavy"
  silhouetteSummary: string;       // "wide top + narrow bottom", "straight line", "layered"
}
```

## Token Budget Impact
- Person detection: ~80 tokens (one-time)
- Per item: ~15 new fields × ~3 tokens each = ~45 extra tokens per item
- 5 items average: 225 extra tokens
- Look structure: ~50 tokens
- Total extra: ~355 tokens → increase maxTokens from 2200 to 3000

## Backward Compatibility
- All new fields are OPTIONAL in TypeScript interface
- All new fields have `additionalProperties: true` in JSON schema OR are added as optional
- Existing analyses in DB will not have these fields → downstream code uses `?.` optional chaining
- No DB migration needed — analysis is stored as JSON blob
