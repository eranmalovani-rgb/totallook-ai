# Garment Metadata Design — Stage 28

## Goal
Add comprehensive structured metadata to each Improvement so Fix My Look can generate
pixel-perfect replacements. Instead of "replace חלק עליון with חולצה מחויטת", the AI will get:

> Replace the **slim-fit cotton crew-neck short-sleeve solid white t-shirt** with a
> **tailored linen button-down long-sleeve solid navy-blue dress shirt**

## New fields on Improvement (before* = current item, after* = recommended replacement)

All values in **English lowercase**. The LLM fills both before and after for every improvement.

### A. Garment Identity
| Field | Type | Examples | Why critical |
|-------|------|---------|-------------|
| `beforeGarmentType` / `afterGarmentType` | string | "t-shirt", "dress shirt", "polo", "sweatshirt", "hoodie", "blazer", "jeans", "chinos", "sneakers", "oxford shoes", "crop top", "maxi dress" | The AI must know WHAT to draw |
| `beforeStyle` / `afterStyle` | string | "casual", "formal", "smart-casual", "sporty", "streetwear", "minimalist", "classic", "bohemian" | Overall vibe affects rendering |

### B. Fit & Structure
| Field | Type | Examples | Why critical |
|-------|------|---------|-------------|
| `beforeFit` / `afterFit` | string | "slim", "regular", "oversized", "tailored", "boxy", "relaxed" | Wrong silhouette = wrong result |
| `beforeLength` / `afterLength` | string | "cropped", "regular", "long", "midi", "maxi", "hip-length", "knee-length" | Garment length on body |
| `beforeSleeveLength` / `afterSleeveLength` | string | "short", "long", "3/4", "sleeveless", "cap", "rolled-up", "n/a" | Visible in photo |
| `beforeNeckline` / `afterNeckline` | string | "crew neck", "v-neck", "polo collar", "button-down collar", "turtleneck", "scoop", "mandarin collar", "hoodie", "n/a" | Defines the garment's look |
| `beforeClosure` / `afterClosure` | string | "pullover", "buttons", "zipper", "wrap", "snap", "lace-up", "n/a" | Visible structural detail |

### C. Material & Texture
| Field | Type | Examples | Why critical |
|-------|------|---------|-------------|
| `beforeMaterial` / `afterMaterial` | string | "cotton", "linen", "denim", "leather", "silk", "wool", "polyester", "knit", "fleece", "suede", "canvas" | Affects draping, sheen, texture |
| `beforeTexture` / `afterTexture` | string | "smooth", "ribbed", "knitted", "matte", "shiny/satin", "distressed", "textured weave", "brushed" | Visual surface quality |

### D. Color & Pattern (extending existing beforeColor/afterColor)
| Field | Type | Examples | Why critical |
|-------|------|---------|-------------|
| `beforePattern` / `afterPattern` | string | "solid", "striped", "checkered/plaid", "floral", "graphic print", "polka dot", "camouflage", "color-block", "abstract" | Pattern is as important as color |

### E. Distinctive Details
| Field | Type | Examples | Why critical |
|-------|------|---------|-------------|
| `beforeDetails` / `afterDetails` | string | "visible logo", "chest pocket", "embroidery", "distressed/ripped", "rolled cuffs", "contrast stitching", "metal hardware", "none" | Small details the AI might miss or invent |

## Total: 10 paired fields (before + after) = 20 new fields

## Implementation Notes

1. All fields are **optional strings** (empty string = not applicable) to avoid breaking existing analyses
2. The Stage 2 LLM prompt will request all fields but the JSON schema marks them as NOT required
   (so old analyses without them still parse correctly)
3. Fix My Look prompt builder will construct a rich description string from available fields
4. Fields that don't apply (e.g. sleeveLength for shoes) should be "n/a"
5. The `beforeColor`/`afterColor` fields already exist — `beforePattern`/`afterPattern` complement them

## Prompt Builder Output Example

With full metadata:
```
- Replace the "slim-fit cotton crew-neck short-sleeve solid white t-shirt (casual, smooth texture, pullover, no special details)"
  with a "tailored linen button-down-collar long-sleeve solid navy-blue dress shirt (smart-casual, smooth texture, buttons, chest pocket)".
  MANDATORY COLOR: NAVY BLUE. Use EXACTLY this color with ZERO substitution.
  Reference product photo is image[1] — copy its EXACT color, pattern, texture, and style.
```

Without metadata (legacy fallback):
```
- Replace "חלק עליון נוכחי" with "חולצה מחויטת איכותית".
  MANDATORY COLOR: WHITE. Use EXACTLY this color with ZERO substitution.
```
