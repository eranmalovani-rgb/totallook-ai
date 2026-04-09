/**
 * TotalLook.ai — Fashion Doctrine v1.0
 * ======================================
 * The professional style theory engine that powers all analysis, scoring,
 * improvements, and recommendations across the platform.
 *
 * Architecture:
 * - Each section is a standalone function returning a prompt-injectable string
 * - Sections are composed into context-specific bundles via getDoctrineFor*() helpers
 * - Version is tracked for cache-busting and A/B testing
 * - All text is bilingual (Hebrew primary, English secondary) where relevant
 *
 * To update: modify the section content, bump DOCTRINE_VERSION.
 * All prompts that consume the doctrine will automatically pick up changes.
 */

export const DOCTRINE_VERSION = "1.0.0";
export const DOCTRINE_LAST_UPDATED = "2026-04-09";

// ─────────────────────────────────────────────────────────────
// Section 1: Core Style Laws
// ─────────────────────────────────────────────────────────────

export function coreStyleLaws(): string {
  return `
## CORE STYLE LAWS

Every strong look is built on 6 layers working together:
1. SILHOUETTE — the overall shape the body creates in the outfit
2. PROPORTION — where volume exists, where there's a cut, where the eye stops
3. COLOR — contrast level, temperature, depth, combinations
4. TEXTURE & MATERIAL — matte/shiny, rigid/flowing, smooth/rough
5. MESSAGE — what the look communicates: clean, luxurious, creative, sexy, sharp, relaxed, sophisticated
6. CONTEXT — weather, event, culture, age, social environment, daily movement

THE PROFESSIONAL FORMULA:
Good look = clear base + one focal point + balance + fit for the person + fit for the situation

FUNDAMENTAL MISTAKES TO CATCH:
- Too many "nice" items without a clear direction
- Imbalance between top and bottom halves
- Buying by trend instead of actual use
- Wrong shoes that collapse an entire look
- Excess accessories OR complete absence of accessories
- Wardrobe not built around real lifestyle
- Trying to look "updated" instead of looking precise
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 2: Client Analysis Axes (10 dimensions)
// ─────────────────────────────────────────────────────────────

export function clientAnalysisAxes(): string {
  return `
## CLIENT ANALYSIS AXES (10 DIMENSIONS)

Every person must be analyzed across these 10 axes:

1. GENDER/DRESS MODE: women | men | neutral/mixed
2. LIFE STAGE: very young | student | early career | mid-career | executive/senior | active parent | mature needing refresh
3. LIFESTYLE: office | hybrid | freelance | parent on the go | frequent events | nightlife/content/media | frequent travel
4. BODY TYPE (proportions only): leg-to-torso ratio | shoulders-to-hips | vertical/horizontal presence | flattering cut point location
5. STYLE PERSONALITY: minimalist | classic | dramatic | romantic | creative | refined-sexy | edgy/urban | relaxed-practical
6. BUDGET: low | medium | medium-high | premium/luxury
7. STYLING GOAL: base wardrobe | image upgrade | dating | career | wedding/event | vacation | post-body-change/new-chapter | building online presence
8. FASHION OPENNESS: conservative | partially open | trend-friendly | fashionista
9. FUNCTIONAL SENSITIVITY: heat | comfort | easy maintenance | ironing/dry-clean | lots of walking | modesty | accessibility/special needs
10. CULTURAL/INSPIRATIONAL WORLD: western commercial | quiet luxury | street/social | boho | European classic | Americana | sport-luxe | evening/glam
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 3: Professional Style Vocabulary
// ─────────────────────────────────────────────────────────────

export function styleVocabulary(): string {
  return `
## PROFESSIONAL STYLE VOCABULARY

BASE SILHOUETTES:
tight vs loose | straight vs rounded | narrow top/wide bottom | wide top/narrow bottom | emphasized waist | long column line | vertical layers | controlled volume | polished oversize | deconstructive

MESSAGE LEVELS IN CLOTHING:
clean | smart | quiet-luxury | artistic | bohemian | organized | desirable | authoritative | soft | sharp | light | "well-made" | "looks expensive"

VISUAL LUXURY MARKERS:
- Fabric that looks high-quality
- Good drape line
- Colors that don't "scream" without reason
- Good finishing details
- Matching shoes
- Good fit at key zones: shoulders, waist, hem length, sleeve length
- Less noise, more intention
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 4: 2026 Trends (updatable seasonally)
// ─────────────────────────────────────────────────────────────

export function currentTrends(): string {
  return `
## 2026 KEY TRENDS (translate to real clients, not runway)

A. SOFTNESS WITH PRESENCE — sheers, lace, partial transparency, light layers, liquid fabrics, play between reveal and cover.
   Real translation: partially sheer top over quality tank, satin skirt with clean tee, lace in small doses.

B. MOVEMENT & TEXTURE — fringes, feathers, surface work, draping with movement.
   For: evening, fashion-forward clients. Commercial: fringes on bag/shoe/jacket edge, or one strong skirt.

C. REFINED SPORTY — technical pieces, light jackets, polished shorts, sport meets high fashion.
   Translation: tech jacket over tailored pants, colorful sneakers with clean look, parachute pants with sharp shirt.

D. RETURN TO POINTED FEMININE — pumps, thin sandals, waistlines, skirts, polished femininity.
   Meaning: after years of sneakers-only casual, return to intentional dressing.

E. REFRESHED BOHO — not costume boho. More suede, earth tones, character jewelry, free movement with proper finishing.
   Israel translation: flowing maxi with clean leather sandal, suede vest/bag/belt, delicate layered jewelry.

F. EARTH COLORS RETURN — khaki, brown, coffee, stone, milky white.
   Perfect for: mature clients, men, career people, anyone wanting to "look expensive" effortlessly.

G. SELECTIVE PRINTS — less random print noise, more one dominant print: animal, dots, stripes, or delicate floral.

H. ACCESSORIES TAKE CENTER STAGE — shoes, bags, belts, jewelry, pins become the heart of look-building, not afterthoughts.

TRENDS TO ADOPT IN MODERATION: partial sheers, delicate lace, pumps, minimalist loafers, thin sandals, balloon/volume pants, suede, khaki/brown, fringes/movement, precise boho, selective animal print, tech-elegant, elongated bags/large totes, specific hair accessories/brooches.

TRENDS REQUIRING CAUTION: full transparency, exaggerated boho, oversize without balance, multiple prints together, trendy shoes that don't hold up to use, very fashion-forward colors that don't serve the client.
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 5: Client Type Archetypes
// ─────────────────────────────────────────────────────────────

export function clientArchetypes(): string {
  return `
## CLIENT ARCHETYPES & PRACTICAL PRINCIPLES

CLASSIC WOMAN wanting to look updated but not trendy:
Base: good blazer, dark/straight jeans, tailored soft pants, white/cream quality shirt, perfect tee, low heel/loafer/clean sandal.
2026 update: slightly more fluid silhouette, bag with modern lines, sharper shoe, add texture (satin, suede, soft leather), use khaki/mocha/milky/soft bordeaux.

PRESENCE-SEEKING WOMAN (sexy, precise):
Keywords: waistline, heel, controlled sheerness, flattering cuts, precise fabric.
Rule: always ONE focal point only. If tight → balance with fabric or coverage. If sheer → rest of look must be stable.

CREATIVE/TRENDY/SOCIAL-FRIENDLY WOMAN:
Goals: photographs well, looks current, not generic. Tools: unexpected combinations, strong silhouette, statement accessory, deliberate color, right shoe.

PRACTICAL WOMAN (mom/on-the-go/working):
Formula: comfort + easy maintenance + polished look + 3 accessories that do the work.
Anchors: comfortable good-looking pants, matching sets, day dresses that work with sandal AND sneaker, thin third layer, smart bag.

CLASSIC MAN wanting to look sharp without trying:
Base: well-fitting pants, genuinely good shirts, quality heavy tee, light jacket, clean shoes, precise belt.
2026 update: more texture, more silhouette freedom, khaki/brown/cream/soft blue/deep green, less rigid skinny, more natural lines, option for loafer/leather sandal/clean sneaker/light tech coat.

FASHION-FORWARD/URBAN/CREATIVE MAN:
Anchors: layers, measured-volume pants, leather/tech/work jacket, one strong accessory, mix of tailored + casual.
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 6: Budget as Styling Component
// ─────────────────────────────────────────────────────────────

export function budgetGuidelines(): string {
  return `
## BUDGET AS STYLING COMPONENT

LOW BUDGET — Maximum appearance from minimum purchases:
- Buy strong basics, not "temptations"
- Focus on shoes, pants, bag/jacket
- Easy-to-combine color palette
- Avoid items that look very cheap in material
- Use enhancement: tailoring, ironing, proper styling

MEDIUM BUDGET — Build a wardrobe that actually works:
- Right ratio between basics and interest pieces
- Invest in a few hero pieces
- Smart high-low mixing

HIGH/PREMIUM BUDGET — Create identity, not just beauty:
- Materials first
- Cuts and construction
- Tailoring
- Long-lasting accessories
- Build a "personal code" not a random purchase collection
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 7: Occasions & Situations
// ─────────────────────────────────────────────────────────────

export function occasionGuidelines(): string {
  return `
## OCCASION & SITUATION GUIDELINES

WORK/OFFICE — Look professional, current, approachable, not costumed:
Women: tailored pants + clean top + third layer | column dress + precise shoe | midi skirt + clean shirt + belt/jewelry
Men: smart pants + polo/shirt/heavy-tee + loafer/clean-sneaker + jacket as needed

DATE — Less "invested-looking", more confidence and authenticity:
Texture, cut, shoe, scent, and watch/bag matter most. ONE focal point.

EVENING EVENT — Choose what leads: color / cut / material / accessory. NOT everything at once.
Photography must be considered.

WEDDING/FAMILY EVENT — Match family, age, audience, time, venue, indoor/outdoor.
Don't look like someone else. Stay true to personal style language even at events.

VACATION — Build a capsule, not a collection:
Neutral base + 2-3 color/accessory focal points. Think about mobility, photography, comfort, durability.
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 8: Israel-Specific Adaptations
// ─────────────────────────────────────────────────────────────

export function israelAdaptations(): string {
  return `
## ISRAEL-SPECIFIC ADAPTATIONS

CLIMATE RULES:
- Heat and humidity change everything
- Day-to-evening in Israel is often less separated than in Europe
- People want to look polished but not "overdone"
- Many clients need higher comfort levels
- Modesty, family, sector, and community sensitivities affect dramatically

TRANSLATING WESTERN TRENDS TO ISRAEL (5 questions):
1. Does it work in our climate?
2. Does it work in the client's real life?
3. Does it work with the client's body/presence?
4. Does it look updated or costumed?
5. Can you build at least 3 uses from it?

LOCAL BRANDS TO CONSIDER: Castro, Fox, Renuar, Honigman, Zara, H&M, Mango, Massimo Dutti, COS, & Other Stories, Terminal X, Shein (budget), ASOS
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 9: Professional Methodology
// ─────────────────────────────────────────────────────────────

export function professionalMethodology(): string {
  return `
## PROFESSIONAL STYLING METHODOLOGY

ANALYSIS PROCESS:
1. Understand the person
2. Understand their daily life
3. Understand the gap between who they are today and who they want to project
4. Define style language in 3-5 words
5. Build base pillars
6. Add interest and uniqueness layer
7. Create reusable outfit formulas

IDEAL OUTPUT FOR CLIENT:
- Clear style identity
- Smart shopping list
- Look formulas
- Capsules by situation
- Base colors and accent colors
- "Don't buy" list

QUICK DECISION SYSTEM (ask for every look):
1. What's the message?
2. What's the focal point?
3. What's the balance?
4. Are the shoes right?
5. Does the fabric look good in reality?
6. Does the look work in Israel?
7. Will the client actually wear this?
8. Is there identity here or just trend?
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 10: Ready-Made Look Formulas
// ─────────────────────────────────────────────────────────────

export function lookFormulas(): string {
  return `
## READY-MADE LOOK FORMULAS

WOMEN:
1. Straight jeans + clean shirt + thin sandal + structured bag
2. Wide pants + quality tank + light blazer + gold jewelry
3. Column dress + flat sandal + suede bag
4. Satin skirt + tee + short jacket + small heel
5. Tech pants + white shirt + sneakers + strong sunglasses

MEN:
1. Straight pants + heavy tee + light jacket + loafer
2. Dark jeans + open shirt over tee + clean sneakers
3. Tailored pants + quality polo + watch + soft leather shoe
4. Clean long shorts + good-drape shirt + leather sandal/sneaker
5. Measured-volume pants + work jacket + tee + one accessory
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 11: Combination Logic
// ─────────────────────────────────────────────────────────────

export function combinationLogic(): string {
  return `
## COMBINATION MATCHING FORMULA

Client = gender × age × lifestyle × budget × trend-openness × functional-need × occasion × style-personality

COHERENCE RULES:
- All improvements together must create a coherent look, not isolated upgrades
- If suggesting a formal blazer, don't pair with streetwear sneakers
- If the look is top-heavy (oversized top), don't suggest another volume piece on top — suggest a slim bottom
- If there are already 3+ colors, don't add a 4th — suggest a neutral or matching tone
- If everything is oversized, suggest one fitted piece for balance
- If everything is fitted, suggest one relaxed piece for modernity
- Proportions must balance: wide top → narrow bottom, narrow top → can go wider bottom
- Layering should add depth, not bulk
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 12: Personal Style Code Builder
// ─────────────────────────────────────────────────────────────

export function personalStyleCode(): string {
  return `
## PERSONAL STYLE CODE

When building recommendations, define for the client:
- 3 words describing their style
- 3 silhouettes that work for them
- 5 base colors
- 2-3 accent colors
- 3 main shoe types
- 2 bag/carry types
- 3 fixed daily formulas
- 2 evening formulas
- 1 golden rule (e.g., "never buy an item that doesn't have 3 combinations")
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 13: The Ultimate Principle
// ─────────────────────────────────────────────────────────────

export function ultimatePrinciple(): string {
  return `
## THE ULTIMATE PRINCIPLE

Professional styling in 2026 combines:
- Trend reading
- Deep understanding of clothing psychology
- Smart translation to real clients
- Building SYSTEMS not just looks
- Sensitivity to budget, climate, culture, and function

THE REAL GOAL is not to make the client look "fashionable."
THE REAL GOAL is to make them look PRECISE, RELEVANT, CONFIDENT, and DISTINCTIVE.
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 14: Upgrade Strategy (NEW — Stage 32)
// ─────────────────────────────────────────────────────────────

export function upgradeStrategy(): string {
  return `
## UPGRADE STRATEGY — HOW TO PRIORITIZE AND BUILD IMPROVEMENTS

PRIORITY ORDER (fix worst first):
1. Fix the LOWEST-SCORING item first — it drags the entire look down
2. Fix items that break the look's coherence (e.g., sporty sneakers with a formal outfit)
3. Fix items that are the wrong proportion/silhouette for the body
4. Fix color clashes or too many competing colors
5. Upgrade items that are "okay" but could elevate the look

USE THE 8 SCORE CATEGORIES:
- If "Footwear" score is lowest → prioritize shoe upgrade
- If "Color Harmony" score is lowest → prioritize color-fixing improvements
- If "Fit & Silhouette" score is lowest → prioritize fit/cut changes
- If "Layering" score is lowest → add or improve layering
- If "Accessories" score is lowest → add/upgrade accessories
- If "Style Coherence" score is lowest → fix the item that breaks style unity
- If "Brand & Quality" score is lowest → upgrade to better quality/brand
- If "Overall Impression" score is lowest → make the single biggest-impact change

COHERENCE BETWEEN IMPROVEMENTS:
- All improvements together must create ONE coherent upgraded look
- Don't suggest conflicting styles across improvements (e.g., formal blazer + streetwear pants)
- Each improvement should COMPLEMENT the others, not compete
- Consider what the person is KEEPING — new items must work with unchanged items
- If suggesting 3 improvements, imagine the person wearing ALL 3 together

STYLE CONSISTENCY RULES:
- If the person's look is casual → improvements should stay casual-elevated, not jump to formal
- If the look is formal → improvements should refine within formal, not casualize
- Match the ENERGY level: relaxed look → relaxed upgrades, sharp look → sharp upgrades
- Maintain the person's apparent style personality (don't turn a minimalist into a maximalist)

SEASON & WEATHER AWARENESS:
- Don't suggest heavy layers in summer / light fabrics in winter
- In Israel: prioritize breathable fabrics, lighter colors in summer
- Consider indoor vs outdoor context from the image
- If weather is unclear, suggest versatile pieces

SCORE-BASED IMPROVEMENT COUNT:
- overallScore 8-10: suggest 1-2 minor refinements
- overallScore 6-7: suggest 2-3 meaningful upgrades
- overallScore 4-5: suggest 3-4 significant changes
- overallScore 1-3: suggest 4-5 transformative improvements
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 15: Color Harmony Rules (NEW — Stage 32)
// ─────────────────────────────────────────────────────────────

export function colorHarmonyRules(): string {
  return `
## COLOR HARMONY RULES

SAFE COMBINATIONS (always work):
- Monochromatic: different shades of the same color (navy + light blue + white)
- Neutral base + one accent: black/white/grey/beige + one color pop
- Earth tones together: khaki + brown + cream + olive
- Cool tones together: navy + grey + white + light blue
- Warm tones together: brown + cream + burgundy + camel

DANGEROUS COMBINATIONS (avoid):
- More than 3 distinct colors in one outfit (unless intentionally colorful/creative)
- Warm + cool clash without a neutral bridge (e.g., orange + blue without white/black)
- Two equally bright/saturated competing colors (e.g., bright red + bright green)
- Black + navy together (unless intentional and well-executed)

COLOR TEMPERATURE RULES:
- Warm skin → warm colors tend to flatter (cream, peach, warm brown, olive)
- Cool skin → cool colors tend to flatter (navy, grey, white, lavender)
- When in doubt → neutral colors work for everyone

2026 COLOR TRENDS:
- Earth palette: khaki, coffee, stone, milky white, warm brown
- Quiet luxury: cream, camel, soft grey, navy, burgundy
- Accent colors: deep green, soft bordeaux, dusty rose, sage
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Section 16: Proportion Rules (NEW — Stage 32)
// ─────────────────────────────────────────────────────────────

export function proportionRules(): string {
  return `
## PROPORTION RULES

BALANCE PRINCIPLE:
- If top is OVERSIZED → bottom should be SLIM/FITTED (and vice versa)
- If top is FITTED → bottom can be wider/relaxed
- NEVER oversized top + oversized bottom (looks shapeless) unless intentionally deconstructive
- NEVER ultra-tight top + ultra-tight bottom (looks uncomfortable)

SILHOUETTE STRATEGIES:
- Top-heavy person: draw attention downward with interesting bottoms/shoes, keep tops simple
- Bottom-heavy person: draw attention upward with interesting tops/accessories, keep bottoms streamlined
- Balanced: can go either direction, focus on one focal point
- Petite: vertical lines, monochromatic, avoid cutting the body with contrasting colors at the waist
- Tall: can handle more volume, layers, and color blocking

LENGTH RULES:
- Crop top → high-waisted bottom (no skin gap unless intentional)
- Tucked-in shirt → shows waistline, good for most body types
- Untucked shirt → should end at a flattering point (not at widest hip)
- Jacket length → should NOT end at the widest point of hips

LAYERING DEPTH:
- 1 layer: minimal, clean, works for warm weather
- 2 layers: standard, adds dimension (shirt + jacket, tee + cardigan)
- 3 layers: rich, sophisticated (tee + shirt + jacket)
- 4+ layers: only for fashion-forward or cold weather
`.trim();
}

// ═════════════════════════════════════════════════════════════
// DOCTRINE INJECTION HELPERS
// ═════════════════════════════════════════════════════════════

/**
 * Full doctrine for Stage 1 analysis — scoring, item evaluation, summary writing.
 * Focuses on: core laws, vocabulary, trends, Israel adaptations, methodology, occasions.
 */
export function getDoctrineForStage1(): string {
  return [
    `[FASHION DOCTRINE v${DOCTRINE_VERSION} — Professional Style Theory]`,
    coreStyleLaws(),
    styleVocabulary(),
    currentTrends(),
    israelAdaptations(),
    occasionGuidelines(),
    professionalMethodology(),
    `[END FASHION DOCTRINE — Use these principles to guide ALL scoring, analysis, and feedback]`,
  ].join("\n\n");
}

/**
 * Full doctrine for Stage 2 improvements — what to recommend, how to build coherent upgrades.
 * Focuses on: core laws, client archetypes, budget, combination logic, trends, formulas, Israel.
 */
export function getDoctrineForStage2(): string {
  return [
    `[FASHION DOCTRINE v${DOCTRINE_VERSION} — Improvement & Recommendation Theory]`,
    coreStyleLaws(),
    upgradeStrategy(),
    colorHarmonyRules(),
    proportionRules(),
    clientArchetypes(),
    budgetGuidelines(),
    combinationLogic(),
    currentTrends(),
    lookFormulas(),
    israelAdaptations(),
    occasionGuidelines(),
    personalStyleCode(),
    ultimatePrinciple(),
    `[END FASHION DOCTRINE — Use these principles to generate COHERENT, STRATEGIC improvements]`,
  ].join("\n\n");
}

/**
 * Compact doctrine for Fix My Look — visual replacement guidance.
 * Focuses on: core laws, vocabulary, trends (for visual accuracy), combination logic.
 */
export function getDoctrineForFixMyLook(): string {
  return [
    `[FASHION DOCTRINE v${DOCTRINE_VERSION} — Visual Replacement Guide]`,
    coreStyleLaws(),
    styleVocabulary(),
    colorHarmonyRules(),
    proportionRules(),
    combinationLogic(),
    `[END FASHION DOCTRINE — Ensure visual replacements follow these style principles]`,
  ].join("\n\n");
}

/**
 * Doctrine for Widget, Brand Matching, Taste Profile — personalization context.
 * Focuses on: client axes, archetypes, budget, combination logic, personal code.
 */
export function getDoctrineForPersonalization(): string {
  return [
    `[FASHION DOCTRINE v${DOCTRINE_VERSION} — Personalization Engine]`,
    clientAnalysisAxes(),
    clientArchetypes(),
    budgetGuidelines(),
    combinationLogic(),
    personalStyleCode(),
    `[END FASHION DOCTRINE — Use these principles for personalized recommendations]`,
  ].join("\n\n");
}
