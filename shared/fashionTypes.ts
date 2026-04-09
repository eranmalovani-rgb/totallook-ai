/** Structured output from AI fashion analysis */
export interface FashionAnalysis {
  overallScore: number;
  summary: string;
  items: FashionItem[];
  scores: ScoreCategory[];
  improvements: Improvement[];
  outfitSuggestions: OutfitSuggestion[];
  trendSources: TrendSource[];
  influencerInsight: string;
  /** Linked mentions — every brand, influencer, item mentioned gets a hyperlink */
  linkedMentions: LinkedMention[];

  // ── Stage 29: Person Detection ──
  /** Structured person/body detection from the image */
  personDetection?: PersonDetection;
  /** Structured overall look composition analysis */
  lookStructure?: LookStructure;
}

/** Person/body detection metadata extracted from the image */
export interface PersonDetection {
  /** Number of people visible in the image */
  peopleCount: number;
  /** Whether the full body is visible head to toe */
  fullBodyVisible: boolean;
  /** Whether the face is clearly visible */
  faceVisible: boolean;
  /** Whether the hands are visible */
  handsVisible: boolean;
  /** Whether the feet/shoes are visible */
  feetVisible: boolean;
  /** How much of the body is occluded: "none" | "partial" | "significant" */
  bodyOcclusion: string;
  /** Body pose: "standing" | "sitting" | "walking" | "leaning" | "crouching" | "other" */
  bodyPose: string;
  /** Brief pose description, e.g. "standing facing camera, hands in pockets" */
  poseDescription: string;
}

/** Overall look composition analysis */
export interface LookStructure {
  /** Total number of garments + accessories detected */
  totalItemCount: number;
  /** Whether multiple clothing layers are visible */
  hasLayering: boolean;
  /** Number of clothing layers (1=single, 2=two layers, 3+=complex) */
  layerCount: number;
  /** Color harmony type: "monochromatic" | "neutral" | "complementary" | "contrasting" | "colorful" */
  colorHarmony: string;
  /** Which item dominates visually, e.g. "outerwear", "dress", "graphic tee" */
  dominantItem: string;
  /** Body proportions impression: "balanced" | "top-heavy" | "bottom-heavy" */
  proportions: string;
  /** Brief silhouette summary, e.g. "wide top + narrow bottom", "straight line", "layered" */
  silhouetteSummary: string;
}

export interface LinkedMention {
  text: string;
  type: "brand" | "influencer" | "item" | "store";
  url: string;
}

export interface FashionItem {
  name: string;
  description: string;
  color: string;
  score: number;
  verdict: string;
  analysis: string;
  icon: string;
  /** Brand name if identified */
  brand?: string;
  /** URL to brand website */
  brandUrl?: string;
  /** Brand identification confidence: HIGH, MEDIUM, LOW, or NONE */
  brandConfidence?: string;

  // ── Stage 29: Enriched Garment Metadata ──

  // ── Garment Identity ──
  /** Specific garment type (e.g. "t-shirt", "dress shirt", "jeans", "sneakers", "blazer", "ring", "watch") */
  garmentType?: string;
  /** More specific sub-category (e.g. "crew neck tee", "slim jeans", "leather oxford", "mini dress") */
  subCategory?: string;
  /** Body zone: "upper" | "lower" | "outerwear" | "footwear" | "accessory" | "jewelry" | "full-body" */
  bodyZone?: string;
  /** Layer index: 1=base, 2=mid, 3=outer (for layering analysis) */
  layerIndex?: number;

  // ── Visibility ──
  /** How much of the item is visible: "full" | "partial" | "minimal" */
  visibility?: string;

  // ── Color (enriched) ──
  /** Precise color shade (e.g. "navy blue", "charcoal gray", "off-white", "burgundy") */
  preciseColor?: string;
  /** Secondary color if multi-color (e.g. "white" for navy/white stripes) */
  secondaryColor?: string;
  /** Color family: "blue" | "neutral" | "earth" | "warm" | "cool" | "monochrome" | "multicolor" */
  colorFamily?: string;
  /** Number of distinct colors in the item (1=solid, 2+=multi) */
  colorCount?: number;

  // ── Pattern ──
  /** Pattern type: "solid" | "striped" | "checkered" | "floral" | "geometric" | "graphic" | "logo" | "animal" | "abstract" */
  pattern?: string;

  // ── Material & Texture ──
  /** Primary material/fabric: "cotton" | "denim" | "leather" | "knit" | "linen" | "satin" | "wool" | "synthetic" | "silk" | "suede" */
  material?: string;
  /** Surface texture: "smooth" | "ribbed" | "matte" | "shiny" | "washed" | "distressed" | "knitted" | "brushed" */
  texture?: string;

  // ── Fit & Structure ──
  /** Fit/silhouette: "slim" | "regular" | "relaxed" | "oversized" | "cropped" | "tailored" | "boxy" */
  fit?: string;
  /** Garment length: "short" | "regular" | "long" | "cropped" | "midi" | "maxi" | "knee-length" | "n/a" */
  garmentLength?: string;
  /** Sleeve length: "short" | "long" | "3/4" | "sleeveless" | "rolled" | "cap" | "n/a" */
  sleeveLength?: string;
  /** Neckline/collar: "crew" | "v-neck" | "polo" | "button-down" | "turtleneck" | "hoodie" | "scoop" | "boat" | "n/a" */
  neckline?: string;
  /** Closure type: "buttons" | "zipper" | "pullover" | "open" | "snap" | "lace-up" | "buckle" | "none" | "n/a" */
  closure?: string;

  // ── Style ──
  /** Overall style category: "casual" | "smart-casual" | "formal" | "streetwear" | "minimalist" | "classic" | "sporty" | "bohemian" | "avant-garde" | "preppy" | "elegant" */
  style?: string;

  // ── Condition & Details ──
  /** Visible condition: "clean" | "wrinkled" | "worn" | "distressed" | "pristine" */
  condition?: string;
  /** Whether a logo is visible on the item */
  hasLogo?: boolean;
  /** Whether branding is prominent/large */
  prominentBranding?: boolean;
  /** Notable details: "chest pocket", "embroidery", "contrast stitching", "distressed hem", "none" */
  details?: string;
}

export interface ScoreCategory {
  category: string;
  score: number | null;
  /** Detailed explanation of why this specific score was given */
  explanation: string;
  /** If score is null, this contains a recommendation for what would best match the outfit */
  recommendation?: string;
}

export interface Improvement {
  title: string;
  description: string;
  beforeLabel: string;
  afterLabel: string;

  // ── Color ──
  /** Explicit color of the BEFORE item in English (e.g. "black", "white", "navy blue") */
  beforeColor: string;
  /** Explicit color of the AFTER (recommended) item in English (e.g. "black", "white", "navy blue") */
  afterColor: string;

  // ── Garment Identity ──
  /** Garment type (e.g. "t-shirt", "dress shirt", "polo", "jeans", "sneakers", "blazer") */
  beforeGarmentType?: string;
  afterGarmentType?: string;
  /** Style category (e.g. "casual", "formal", "smart-casual", "sporty", "streetwear", "minimalist") */
  beforeStyle?: string;
  afterStyle?: string;

  // ── Fit & Structure ──
  /** Fit/silhouette (e.g. "slim", "regular", "oversized", "tailored", "boxy", "relaxed") */
  beforeFit?: string;
  afterFit?: string;
  /** Garment length on body (e.g. "cropped", "regular", "long", "midi", "knee-length") */
  beforeLength?: string;
  afterLength?: string;
  /** Sleeve length (e.g. "short", "long", "3/4", "sleeveless", "rolled-up", "n/a") */
  beforeSleeveLength?: string;
  afterSleeveLength?: string;
  /** Neckline/collar (e.g. "crew neck", "v-neck", "polo collar", "button-down collar", "turtleneck", "hoodie", "n/a") */
  beforeNeckline?: string;
  afterNeckline?: string;
  /** Closure type (e.g. "pullover", "buttons", "zipper", "wrap", "lace-up", "n/a") */
  beforeClosure?: string;
  afterClosure?: string;

  // ── Material & Texture ──
  /** Fabric/material (e.g. "cotton", "linen", "denim", "leather", "silk", "wool", "knit") */
  beforeMaterial?: string;
  afterMaterial?: string;
  /** Surface texture (e.g. "smooth", "ribbed", "knitted", "matte", "shiny", "distressed", "brushed") */
  beforeTexture?: string;
  afterTexture?: string;

  // ── Pattern & Details ──
  /** Pattern (e.g. "solid", "striped", "checkered", "floral", "graphic print", "polka dot") */
  beforePattern?: string;
  afterPattern?: string;
  /** Distinctive details (e.g. "visible logo", "chest pocket", "embroidery", "distressed", "contrast stitching", "none") */
  beforeDetails?: string;
  afterDetails?: string;

  shoppingLinks: ShoppingLink[];
  productSearchQuery: string;
  /** Matching item from user's virtual closet (if found) */
  closetMatch?: ClosetMatch;
}

export interface ClosetMatch {
  /** Wardrobe item ID */
  wardrobeItemId: number;
  /** Item name from wardrobe */
  name: string;
  /** Item type (shirt, pants, shoes, etc.) */
  itemType: string;
  /** Brand if known */
  brand?: string;
  /** Color */
  color?: string;
  /** Image URL of the source image where this item was detected */
  sourceImageUrl?: string;
  /** AI-generated image of this specific item */
  itemImageUrl?: string;
}

export interface ShoppingLink {
  label: string;
  url: string;
  imageUrl: string;
}

export interface OutfitSuggestion {
  name: string;
  occasion: string;
  items: string[];
  colors: string[];
  /** English description for AI image generation of the complete look as a flat-lay mood board */
  lookDescription?: string;
  inspirationNote: string;
}

export interface TrendSource {
  source: string;
  title: string;
  url: string;
  relevance: string;
  season: string;
}

/** Popular fashion influencers with gender tags for filtering */
export interface Influencer {
  name: string;
  handle: string;
  style: string;
  gender: "male" | "female" | "unisex";
  igUrl: string;
  imageStyle: string;
  country: string;  // ISO 3166-1 alpha-2 code (e.g. "IL", "DE", "FR") or "global"
  imageUrl?: string;
  /** Target age ranges this influencer appeals to */
  ageRanges: string[];
  /** Style tags matching STYLE_OPTIONS ids */
  styleTags: string[];
  /** Budget levels this influencer represents */
  budgetLevels: string[];
}

export const POPULAR_INFLUENCERS: Influencer[] = [
  // ===== Male Global Influencers =====
  { name: "David Beckham", handle: "@davidbeckham", style: "Classic Tailored", gender: "male", igUrl: "https://www.instagram.com/davidbeckham/", imageStyle: "חליפות מותאמות, סמארט קז'ואל בריטי", country: "global",
    ageRanges: ["25-34", "35-44", "45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Ryan Reynolds", handle: "@vancityreynolds", style: "Smart Casual", gender: "male", igUrl: "https://www.instagram.com/vancityreynolds/", imageStyle: "קז'ואל מלוטש, ג'ינס וחולצות מכופתרות", country: "global",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["smart-casual", "classic"], budgetLevels: ["mid-range", "premium"] },
  { name: "Idris Elba", handle: "@idriselba", style: "Modern Elegant", gender: "male", igUrl: "https://www.instagram.com/idriselba/", imageStyle: "אלגנטי מודרני, צבעים עמוקים", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Jeff Goldblum", handle: "@jeffgoldblum", style: "Bold Eclectic", gender: "male", igUrl: "https://www.instagram.com/jeffgoldblum/", imageStyle: "אקלקטי נועז, הדפסים, צבעים", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["avant-garde", "classic"], budgetLevels: ["premium", "luxury"] },
  { name: "Chris Hemsworth", handle: "@chrishemsworth", style: "Relaxed Athletic", gender: "male", igUrl: "https://www.instagram.com/chrishemsworth/", imageStyle: "ספורטיבי רגוע, חולצות טי ומכנסיים", country: "global",
    ageRanges: ["18-24", "25-34", "35-44"], styleTags: ["sporty", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Timothée Chalamet", handle: "@tchalamet", style: "Avant-Garde", gender: "male", igUrl: "https://www.instagram.com/tchalamet/", imageStyle: "אוונגרד, שכבות, מותגי יוקרה", country: "global",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["avant-garde", "streetwear"], budgetLevels: ["premium", "luxury"] },
  { name: "A$AP Rocky", handle: "@asaprocky", style: "Streetwear Luxury", gender: "male", igUrl: "https://www.instagram.com/asaprocky/", imageStyle: "סטריטוור יוקרתי, לוגואים, סניקרס", country: "global",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["streetwear", "avant-garde"], budgetLevels: ["premium", "luxury"] },
  { name: "Daniel Craig", handle: "@danielcraig", style: "Minimalist Sharp", gender: "male", igUrl: "https://www.instagram.com/danielcraig/", imageStyle: "מינימליסטי חד, צבעים כהים", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["minimalist", "classic"], budgetLevels: ["premium", "luxury"] },
  { name: "Harry Styles", handle: "@harrystyles", style: "Gender-Fluid Fashion", gender: "unisex", igUrl: "https://www.instagram.com/harrystyles/", imageStyle: "אופנה ג'נדר-פלואיד, צבעוני, ייחודי", country: "global",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["avant-garde", "bohemian"], budgetLevels: ["premium", "luxury"] },
  { name: "Pharrell Williams", handle: "@pharrell", style: "Urban Creative", gender: "male", igUrl: "https://www.instagram.com/pharrell/", imageStyle: "אורבני יצירתי, כובעים, אקססוריז", country: "global",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["streetwear", "avant-garde"], budgetLevels: ["premium", "luxury"] },

  // ===== Mature Male Global Influencers (45-54, 55+) =====
  { name: "George Clooney", handle: "@georgeclooney", style: "Timeless Sophistication", gender: "male", igUrl: "https://www.instagram.com/georgeclooney/", imageStyle: "תחכום נצחי, חליפות קלאסיות, אלגנטיות שקטה", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Ralph Lauren", handle: "@ralphlauren", style: "American Heritage", gender: "male", igUrl: "https://www.instagram.com/ralphlauren/", imageStyle: "מורשת אמריקאית, פרפי יוקרתי, ג'ינס וחליפות", country: "global",
    ageRanges: ["45-54", "55+"], styleTags: ["classic", "preppy"], budgetLevels: ["premium", "luxury"] },
  { name: "Giorgio Armani", handle: "@giorgioarmani", style: "Italian Mastery", gender: "male", igUrl: "https://www.instagram.com/giorgioarmani/", imageStyle: "אמנות איטלקית, חליפות מושלמות, מינימליזם מעודן", country: "global",
    ageRanges: ["45-54", "55+"], styleTags: ["classic", "minimalist"], budgetLevels: ["luxury"] },
  { name: "Pierce Brosnan", handle: "@piaborosnan", style: "Silver Fox Elegance", gender: "male", igUrl: "https://www.instagram.com/piaborosnan/", imageStyle: "אלגנטיות שועלית, חליפות, סמארט קז'ואל מלוטש", country: "global",
    ageRanges: ["45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Stanley Tucci", handle: "@stanleytucci", style: "Refined Italian-American", gender: "male", igUrl: "https://www.instagram.com/stanleytucci/", imageStyle: "איטלקי-אמריקאי מעודן, פשטות אלגנטית, צבעים חמים", country: "global",
    ageRanges: ["45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Nick Wooster", handle: "@nickwooster", style: "Street Tailoring", gender: "male", igUrl: "https://www.instagram.com/nickwooster/", imageStyle: "תפירה רחובית, שילוב סטריטוור וקלאסי, זקן מטופח", country: "global",
    ageRanges: ["45-54", "55+"], styleTags: ["smart-casual", "streetwear", "classic"], budgetLevels: ["mid-range", "premium", "luxury"] },
  { name: "Patrick Dempsey", handle: "@patrickdempsey", style: "Active Sophisticated", gender: "male", igUrl: "https://www.instagram.com/patrickdempsey/", imageStyle: "ספורטיבי מתוחכם, קז'ואל מלוטש, חיי חוץ", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["sporty", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Richard Gere", handle: "@richardgereofficial", style: "Distinguished Classic", gender: "male", igUrl: "https://www.instagram.com/richardgereofficial/", imageStyle: "קלאסי מכובד, חליפות, אלגנטיות בלתי מתאמצת", country: "global",
    ageRanges: ["55+"], styleTags: ["classic", "minimalist"], budgetLevels: ["premium", "luxury"] },

  // ===== Mature Female Global Influencers (45-54, 55+) =====
  { name: "Cate Blanchett", handle: "@cateblanchett", style: "Architectural Elegance", gender: "female", igUrl: "https://www.instagram.com/cateblanchett/", imageStyle: "אלגנטיות ארכיטקטונית, שמלות מעצבים, מינימליזם נועז", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["classic", "avant-garde"], budgetLevels: ["premium", "luxury"] },
  { name: "Helen Mirren", handle: "@helenmirren", style: "Regal Modern", gender: "female", igUrl: "https://www.instagram.com/helenmirren/", imageStyle: "מלכותי מודרני, צבעים עזים, אלגנטיות בלתי מתפשרת", country: "global",
    ageRanges: ["55+"], styleTags: ["classic", "avant-garde"], budgetLevels: ["premium", "luxury"] },
  { name: "Iris Apfel", handle: "@irisapfel", style: "Maximalist Icon", gender: "female", igUrl: "https://www.instagram.com/irisapfel/", imageStyle: "מקסימליזם אייקוני, אקססוריז ענקיים, צבעים, שכבות", country: "global",
    ageRanges: ["55+"], styleTags: ["avant-garde", "bohemian"], budgetLevels: ["mid-range", "premium", "luxury"] },
  { name: "Jennifer Aniston", handle: "@jenniferaniston", style: "California Classic", gender: "female", igUrl: "https://www.instagram.com/jenniferaniston/", imageStyle: "קלאסי קליפורני, בייסיקס מושלמים, מינימליסטי חם", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["classic", "minimalist", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Sarah Jessica Parker", handle: "@sarahjessicaparker", style: "NYC Fashion Icon", gender: "female", igUrl: "https://www.instagram.com/sarahjessicaparker/", imageStyle: "אייקון אופנה ניו יורקי, שילובים נועזים, נעליים", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["avant-garde", "classic", "bohemian"], budgetLevels: ["premium", "luxury"] },
  { name: "Victoria Beckham", handle: "@victoriabeckham", style: "Sleek Power Dressing", gender: "female", igUrl: "https://www.instagram.com/victoriabeckham/", imageStyle: "כוח לבוש חלק, חליפות, מינימליזם יוקרתי", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["classic", "minimalist"], budgetLevels: ["premium", "luxury"] },
  { name: "Diane Keaton", handle: "@diane_keaton", style: "Eclectic Intellectual", gender: "female", igUrl: "https://www.instagram.com/diane_keaton/", imageStyle: "אינטלקטואלית אקלקטית, כובעים, שחור-לבן, שכבות", country: "global",
    ageRanges: ["55+"], styleTags: ["classic", "bohemian", "avant-garde"], budgetLevels: ["mid-range", "premium"] },
  { name: "Monica Bellucci", handle: "@monicabellucciofficiel", style: "Italian Glamour", gender: "female", igUrl: "https://www.instagram.com/monicabellucciofficiel/", imageStyle: "גלאמור איטלקי, שמלות, אלגנטיות נצחית", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Meryl Streep", handle: "@merylstreepofficial", style: "Understated Chic", gender: "female", igUrl: "https://www.instagram.com/merylstreepofficial/", imageStyle: "שיק מאופק, צבעים רכים, אלגנטיות טבעית", country: "global",
    ageRanges: ["55+"], styleTags: ["classic", "minimalist"], budgetLevels: ["mid-range", "premium"] },
  { name: "Salma Hayek", handle: "@salmahayek", style: "Vibrant Feminine", gender: "female", igUrl: "https://www.instagram.com/salmahayek/", imageStyle: "נשי תוסס, צבעים חמים, שמלות, תכשיטים", country: "global",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["classic", "bohemian"], budgetLevels: ["premium", "luxury"] },

  // ===== Female Global Influencers =====
  { name: "Zendaya", handle: "@zendaya", style: "Red Carpet Bold", gender: "female", igUrl: "https://www.instagram.com/zendaya/", imageStyle: "שטיח אדום נועז, שמלות מעצבים", country: "global",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["avant-garde", "classic"], budgetLevels: ["premium", "luxury"] },
  { name: "Hailey Bieber", handle: "@haileybieber", style: "Model Off-Duty", gender: "female", igUrl: "https://www.instagram.com/haileybieber/", imageStyle: "מודל מחוץ למסלול, מינימליסטי שיק", country: "global",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["minimalist", "smart-casual"], budgetLevels: ["mid-range", "premium", "luxury"] },
  { name: "Bella Hadid", handle: "@bellahadid", style: "Y2K Streetwear", gender: "female", igUrl: "https://www.instagram.com/bellahadid/", imageStyle: "Y2K, וינטג', סטריטוור", country: "global",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["streetwear", "avant-garde"], budgetLevels: ["mid-range", "premium", "luxury"] },
  { name: "Rihanna", handle: "@badgalriri", style: "Bold & Fearless", gender: "female", igUrl: "https://www.instagram.com/badgalriri/", imageStyle: "נועזת, אופנת רחוב יוקרתית, Fenty", country: "global",
    ageRanges: ["18-24", "25-34", "35-44"], styleTags: ["streetwear", "avant-garde"], budgetLevels: ["premium", "luxury"] },
  { name: "Rosie Huntington-Whiteley", handle: "@rosiehw", style: "Effortless Chic", gender: "female", igUrl: "https://www.instagram.com/rosiehw/", imageStyle: "שיק ללא מאמץ, ניטרלי, מינימליסטי", country: "global",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["minimalist", "classic"], budgetLevels: ["premium", "luxury"] },
  { name: "Chiara Ferragni", handle: "@chiaraferragni", style: "Italian Glam", gender: "female", igUrl: "https://www.instagram.com/chiaraferragni/", imageStyle: "גלאם איטלקי, מותגי יוקרה, צבעוני", country: "global",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "preppy"], budgetLevels: ["premium", "luxury"] },
  { name: "Olivia Palermo", handle: "@oliviapalermo", style: "Polished Preppy", gender: "female", igUrl: "https://www.instagram.com/oliviapalermo/", imageStyle: "פרפי מלוטש, שכבות, אקססוריז", country: "global",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["preppy", "classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Emily Ratajkowski", handle: "@emrata", style: "Minimalist Cool", gender: "female", igUrl: "https://www.instagram.com/emrata/", imageStyle: "מינימליסטי קול, בייסיקס, וינטג'", country: "global",
    ageRanges: ["18-24", "25-34", "35-44"], styleTags: ["minimalist", "smart-casual"], budgetLevels: ["mid-range", "premium"] },

  // ===== Top Global Fashion Influencers =====
  // Male
  { name: "Wisdom Kaye", handle: "@wisdm", style: "Creative Editorial", gender: "male", igUrl: "https://www.instagram.com/wisdm/", imageStyle: "אדיטוריאל יצירתי, Gen Z, מותגי יוקרה", country: "global",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["avant-garde", "streetwear"], budgetLevels: ["premium", "luxury"] },
  { name: "Mariano Di Vaio", handle: "@marianodivaio", style: "Italian Menswear", gender: "male", igUrl: "https://www.instagram.com/marianodivaio/", imageStyle: "אופנת גברים איטלקית, אלגנטי, חליפות", country: "global",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Drew Scott", handle: "@imdrewscott", style: "Clean Neutral", gender: "male", igUrl: "https://www.instagram.com/imdrewscott/", imageStyle: "אסתטיקה נקייה, ניטרלי, סטריטוור רגוע", country: "global",
    ageRanges: ["18-24", "25-34", "35-44"], styleTags: ["minimalist", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  // Female
  { name: "Aimee Song", handle: "@aimeesong", style: "Polished Effortless", gender: "female", igUrl: "https://www.instagram.com/aimeesong/", imageStyle: "מלוטש ללא מאמץ, שילוב High-Low", country: "global",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "minimalist"], budgetLevels: ["mid-range", "premium"] },
  { name: "Leonie Hanne", handle: "@leoniehanne", style: "Luxury Glam", gender: "female", igUrl: "https://www.instagram.com/leoniehanne/", imageStyle: "גלאם יוקרתי, שבוע אופנה, מותגי על", country: "global",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "avant-garde"], budgetLevels: ["luxury"] },
  { name: "Jessica Wang", handle: "@jessicawang", style: "Power Styling", gender: "female", igUrl: "https://www.instagram.com/jessicawang/", imageStyle: "סטיילינג עוצמתי, אדיטוריאל, יוקרה", country: "global",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Camille Charrière", handle: "@camillecharriere", style: "Parisian Chic", gender: "female", igUrl: "https://www.instagram.com/camillecharriere/", imageStyle: "שיק פריזאי, סטריטוור אלגנטי", country: "global",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "minimalist", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Marta Sierra", handle: "@marta__sierra", style: "Bold Colorful", gender: "female", igUrl: "https://www.instagram.com/marta__sierra/", imageStyle: "נועז וצבעוני, שמלות, מעברים יצירתיים", country: "global",
    ageRanges: ["18-24", "25-34"], styleTags: ["avant-garde", "bohemian"], budgetLevels: ["mid-range", "premium"] },
  { name: "Ellie Delphine", handle: "@slipintostyle", style: "Afro-Parisian Chic", gender: "female", igUrl: "https://www.instagram.com/slipintostyle/", imageStyle: "שיק אפרו-פריזאי, שמלות, חליפות", country: "global",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Monikh Dale", handle: "@monikh", style: "Minimal Luxe", gender: "female", igUrl: "https://www.instagram.com/monikh/", imageStyle: "מינימל יוקרתי, סילואטים רחבים, לונדון", country: "global",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["minimalist", "classic"], budgetLevels: ["premium", "luxury"] },

  // ===== Israeli Fashion Influencers (משפיעני אופנה ישראלים) =====
  // Mature Male Israeli
  { name: "אבי נשר", handle: "@avinesher", style: "Israeli Distinguished", gender: "male", igUrl: "https://www.instagram.com/avinesher/", imageStyle: "מכובד ישראלי, סמארט קז'ואל, חליפות קלילות", country: "IL",
    ageRanges: ["45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "צחי הלוי", handle: "@tsaborhalevy", style: "Israeli Classic", gender: "male", igUrl: "https://www.instagram.com/tsaborhalevy/", imageStyle: "קלאסי ישראלי, חליפות, אלגנטיות מזרח תיכונית", country: "IL",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  // Mature Female Israeli
  { name: "יעל בר זוהר", handle: "@yaelbarzohartv", style: "Israeli Timeless", gender: "female", igUrl: "https://www.instagram.com/yaelbarzohartv/", imageStyle: "נצחית ישראלית, אלגנטיות, שמלות ערב", country: "IL",
    ageRanges: ["45-54", "55+"], styleTags: ["classic", "smart-casual"], budgetLevels: ["mid-range", "premium", "luxury"] },
  { name: "רונית אלקבץ", handle: "@ronitalkabetz", style: "Mediterranean Elegance", gender: "female", igUrl: "https://www.instagram.com/ronitalkabetz/", imageStyle: "אלגנטיות ים תיכונית, שחור, דרמטי, מעצבים ישראליים", country: "IL",
    ageRanges: ["45-54", "55+"], styleTags: ["classic", "avant-garde"], budgetLevels: ["premium", "luxury"] },
  { name: "גילה אלמגור", handle: "@gilaalmagor", style: "Israeli Icon", gender: "female", igUrl: "https://www.instagram.com/gilaalmagor/", imageStyle: "אייקון ישראלי, אלגנטיות קלאסית, צבעים רכים", country: "IL",
    ageRanges: ["55+"], styleTags: ["classic", "minimalist"], budgetLevels: ["mid-range", "premium"] },
  { name: "ריטה", handle: "@ritapop", style: "Bold Israeli Diva", gender: "female", igUrl: "https://www.instagram.com/ritapop/", imageStyle: "דיווה ישראלית נועזת, צבעים, שמלות, אקססוריז", country: "IL",
    ageRanges: ["35-44", "45-54", "55+"], styleTags: ["avant-garde", "classic", "bohemian"], budgetLevels: ["mid-range", "premium"] },
  // Male
  { name: "אייל חדד", handle: "@eyalhadad", style: "Israeli Streetwear", gender: "male", igUrl: "https://www.instagram.com/eyalhadad/", imageStyle: "סטריטוור ישראלי, אורבני, מגמות", country: "IL",
    ageRanges: ["18-24", "25-34"], styleTags: ["streetwear", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "גיא איתן", handle: "@guy__eitan", style: "Smart Urban", gender: "male", igUrl: "https://www.instagram.com/guy__eitan/", imageStyle: "אורבני מלוטש, סמארט קז'ואל ישראלי", country: "IL",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "minimalist"], budgetLevels: ["mid-range", "premium"] },
  { name: "נדיר אליהו", handle: "@nadir_elihu", style: "Modern Israeli", gender: "male", igUrl: "https://www.instagram.com/nadir_elihu/", imageStyle: "מודרני ישראלי, קז'ואל מעוצב", country: "IL",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "classic"], budgetLevels: ["mid-range", "premium"] },
  { name: "בן תמר", handle: "@ben.tamar1", style: "Fashion Forward", gender: "male", igUrl: "https://www.instagram.com/ben.tamar1/", imageStyle: "אופנה קדימה, טרנדים, ישראלי", country: "IL",
    ageRanges: ["18-24", "25-34"], styleTags: ["streetwear", "avant-garde"], budgetLevels: ["mid-range", "premium"] },
  { name: "גל הללי", handle: "@galhaleli", style: "Creative Casual", gender: "male", igUrl: "https://www.instagram.com/galhaleli/", imageStyle: "קז'ואל יצירתי, גילגול, סגנון אישי", country: "IL",
    ageRanges: ["18-24", "25-34"], styleTags: ["smart-casual", "bohemian"], budgetLevels: ["budget", "mid-range"] },
  // Female
  { name: "בר רפאלי", handle: "@barrefaeli", style: "Israeli Supermodel", gender: "female", igUrl: "https://www.instagram.com/barrefaeli/", imageStyle: "סופרמודל ישראלית, גלאם, מותגי יוקרה", country: "IL",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "נועה קירל", handle: "@noakirel", style: "Bold Pop", gender: "female", igUrl: "https://www.instagram.com/noakirel/", imageStyle: "פופ נועז, צבעוני, ייחודי, ישראלי", country: "IL",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["streetwear", "avant-garde"], budgetLevels: ["budget", "mid-range", "premium"] },
  { name: "שלומית מלכה", handle: "@shlomitmalka", style: "Model Chic", gender: "female", igUrl: "https://www.instagram.com/shlomitmalka/", imageStyle: "מודל שיק, אלגנטי, ישראלית", country: "IL",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "minimalist"], budgetLevels: ["premium", "luxury"] },
  { name: "שי מיקה", handle: "@shaymika", style: "Israeli Trendy", gender: "female", igUrl: "https://www.instagram.com/shaymika/", imageStyle: "טרנדי ישראלי, לייפסטייל, אופנה", country: "IL",
    ageRanges: ["18-24", "25-34", "35-44"], styleTags: ["smart-casual", "bohemian"], budgetLevels: ["mid-range", "premium"] },
  { name: "ניצן רייטר", handle: "@nitsanraiter", style: "Cool-Girl Streetwear", gender: "female", igUrl: "https://www.instagram.com/nitsanraiter/", imageStyle: "סטריטוור קול, רחוב ישראלי, רלוונטי", country: "IL",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["streetwear", "smart-casual"], budgetLevels: ["budget", "mid-range"] },

  // ===== German Fashion Influencers (DE) =====
  // Male
  { name: "Kosta Williams", handle: "@kostawilliams", style: "Streetwear Luxury", gender: "male", igUrl: "https://www.instagram.com/kostawilliams/", imageStyle: "Luxury streetwear, designer brands, Berlin style", country: "DE",
    ageRanges: ["18-24", "25-34"], styleTags: ["streetwear", "avant-garde"], budgetLevels: ["premium", "luxury"] },
  { name: "Sandro Rasa", handle: "@sandrorasa", style: "Modern Minimalist", gender: "male", igUrl: "https://www.instagram.com/sandrorasa/", imageStyle: "Minimalist modern, clean lines, neutral tones", country: "DE",
    ageRanges: ["25-34", "35-44"], styleTags: ["minimalist", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Justus Hansen", handle: "@justushansen", style: "Smart Casual", gender: "male", igUrl: "https://www.instagram.com/justushansen/", imageStyle: "Smart casual, tailored fits, German precision", country: "DE",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "classic"], budgetLevels: ["mid-range", "premium"] },
  // Female
  { name: "Leonie Hanne", handle: "@leoniehanne", style: "Luxury Glam", gender: "female", igUrl: "https://www.instagram.com/leoniehanne/", imageStyle: "Luxury glam, fashion week, designer brands", country: "DE",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "avant-garde"], budgetLevels: ["luxury"] },
  { name: "Caro Daur", handle: "@carodaur", style: "Sporty Chic", gender: "female", igUrl: "https://www.instagram.com/carodaur/", imageStyle: "Sporty chic, athleisure meets high fashion", country: "DE",
    ageRanges: ["18-24", "25-34"], styleTags: ["sporty", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Xenia Adonts", handle: "@xeniaadonts", style: "Elevated Basics", gender: "female", igUrl: "https://www.instagram.com/xeniaadonts/", imageStyle: "Elevated basics, minimalist luxury, Berlin", country: "DE",
    ageRanges: ["25-34", "35-44"], styleTags: ["minimalist", "classic"], budgetLevels: ["premium", "luxury"] },
  { name: "Anna Schürrle", handle: "@annaschuurrle", style: "Effortless Elegant", gender: "female", igUrl: "https://www.instagram.com/annaschuurrle/", imageStyle: "Effortless elegance, neutral palette, chic", country: "DE",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "minimalist"], budgetLevels: ["premium", "luxury"] },

  // ===== French Fashion Influencers (FR) =====
  // Male
  { name: "Pelayo Díaz", handle: "@pelaborrego", style: "Parisian Dandy", gender: "male", igUrl: "https://www.instagram.com/pelaborrego/", imageStyle: "Parisian dandy, bold patterns, artistic", country: "FR",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "avant-garde"], budgetLevels: ["premium", "luxury"] },
  { name: "Jean-Sébastien Rocques", handle: "@jsrocques", style: "French Editorial", gender: "male", igUrl: "https://www.instagram.com/jsrocques/", imageStyle: "French editorial, fashion week, luxury brands", country: "FR",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  // Female
  { name: "Camille Charrière", handle: "@camillecharriere", style: "Parisian Chic", gender: "female", igUrl: "https://www.instagram.com/camillecharriere/", imageStyle: "Parisian chic, effortless French style", country: "FR",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "minimalist", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Jeanne Damas", handle: "@jeannedamas", style: "French Girl Style", gender: "female", igUrl: "https://www.instagram.com/jeannedamas/", imageStyle: "Quintessential French girl, Rouje founder", country: "FR",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "bohemian"], budgetLevels: ["mid-range", "premium"] },
  { name: "Sabina Socol", handle: "@sabinasocol", style: "Romantic Parisian", gender: "female", igUrl: "https://www.instagram.com/sabinasocol/", imageStyle: "Romantic Parisian, vintage touches, feminine", country: "FR",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "bohemian"], budgetLevels: ["mid-range", "premium"] },
  { name: "Léna Mahfouf", handle: "@lenamahfouf", style: "Gen Z French", gender: "female", igUrl: "https://www.instagram.com/lenamahfouf/", imageStyle: "Gen Z French style, colorful, trendy", country: "FR",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["streetwear", "smart-casual"], budgetLevels: ["mid-range", "premium"] },

  // ===== UK Fashion Influencers (GB) =====
  // Male
  { name: "Carl Thompson", handle: "@carlthompson", style: "British Tailoring", gender: "male", igUrl: "https://www.instagram.com/carlthompson/", imageStyle: "British tailoring, Savile Row inspired, sharp", country: "GB",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Rowan Row", handle: "@rowanrow", style: "London Smart", gender: "male", igUrl: "https://www.instagram.com/rowanrow/", imageStyle: "London smart casual, fitted, modern British", country: "GB",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "classic"], budgetLevels: ["mid-range", "premium"] },
  // Female
  { name: "Monikh Dale", handle: "@monikh", style: "Minimal Luxe", gender: "female", igUrl: "https://www.instagram.com/monikh/", imageStyle: "Minimal luxe, wide silhouettes, London", country: "GB",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["minimalist", "classic"], budgetLevels: ["premium", "luxury"] },
  { name: "Emma Hill", handle: "@emmahill", style: "Everyday Chic", gender: "female", igUrl: "https://www.instagram.com/emmahill/", imageStyle: "Everyday chic, neutral palette, British style", country: "GB",
    ageRanges: ["25-34", "35-44"], styleTags: ["minimalist", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Lydia Tomlinson", handle: "@lydiajanetomlinson", style: "Capsule Wardrobe", gender: "female", igUrl: "https://www.instagram.com/lydiajanetomlinson/", imageStyle: "Capsule wardrobe queen, sustainable fashion", country: "GB",
    ageRanges: ["25-34", "35-44"], styleTags: ["minimalist", "classic"], budgetLevels: ["mid-range", "premium"] },
  { name: "Hannah Lewis", handle: "@hannahlouisef", style: "London Street", gender: "female", igUrl: "https://www.instagram.com/hannahlouisef/", imageStyle: "London street style, trendy, accessible", country: "GB",
    ageRanges: ["18-24", "25-34"], styleTags: ["streetwear", "smart-casual"], budgetLevels: ["budget", "mid-range"] },

  // ===== US Fashion Influencers (US) =====
  // Male
  { name: "Blake Scott", handle: "@blakescott_", style: "NYC Minimal", gender: "male", igUrl: "https://www.instagram.com/blakescott_/", imageStyle: "NYC minimal, clean aesthetic, modern American", country: "US",
    ageRanges: ["25-34", "35-44"], styleTags: ["minimalist", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Marcel Floruss", handle: "@marcelfloruss", style: "American Dapper", gender: "male", igUrl: "https://www.instagram.com/marcelfloruss/", imageStyle: "American dapper, suits, polished casual", country: "US",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Wisdom Kaye", handle: "@wisdm", style: "Creative Editorial", gender: "male", igUrl: "https://www.instagram.com/wisdm/", imageStyle: "Creative editorial, Gen Z, luxury brands", country: "US",
    ageRanges: ["16-17", "18-24", "25-34"], styleTags: ["avant-garde", "streetwear"], budgetLevels: ["premium", "luxury"] },
  // Female
  { name: "Aimee Song", handle: "@aimeesong", style: "LA Effortless", gender: "female", igUrl: "https://www.instagram.com/aimeesong/", imageStyle: "LA effortless, high-low mix, Song of Style", country: "US",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "minimalist"], budgetLevels: ["mid-range", "premium"] },
  { name: "Jessica Wang", handle: "@jessicawang", style: "Power Styling", gender: "female", igUrl: "https://www.instagram.com/jessicawang/", imageStyle: "Power styling, editorial, luxury", country: "US",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Brittany Xavier", handle: "@brittanyxavier", style: "California Chic", gender: "female", igUrl: "https://www.instagram.com/brittanyxavier/", imageStyle: "California chic, family fashion, elevated casual", country: "US",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "classic"], budgetLevels: ["mid-range", "premium"] },

  // ===== Spanish Fashion Influencers (ES) =====
  // Male
  { name: "Alejandro Acero", handle: "@alejandroacero", style: "Madrid Smart", gender: "male", igUrl: "https://www.instagram.com/alejandroacero/", imageStyle: "Madrid smart casual, Mediterranean elegance", country: "ES",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "classic"], budgetLevels: ["mid-range", "premium"] },
  // Female
  { name: "Marta Sierra", handle: "@marta__sierra", style: "Bold Colorful", gender: "female", igUrl: "https://www.instagram.com/marta__sierra/", imageStyle: "Bold colorful, creative transitions, Spanish flair", country: "ES",
    ageRanges: ["18-24", "25-34"], styleTags: ["avant-garde", "bohemian"], budgetLevels: ["mid-range", "premium"] },
  { name: "María Pombo", handle: "@mariapombo", style: "Spanish Chic", gender: "female", igUrl: "https://www.instagram.com/mariapombo/", imageStyle: "Spanish chic, lifestyle, accessible luxury", country: "ES",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Alexandra Pereira", handle: "@alexandrapereira", style: "Iberian Glam", gender: "female", igUrl: "https://www.instagram.com/alexandrapereira/", imageStyle: "Iberian glam, designer brands, elegant", country: "ES",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },

  // ===== Italian Fashion Influencers (IT) =====
  // Male
  { name: "Mariano Di Vaio", handle: "@marianodivaio", style: "Italian Menswear", gender: "male", igUrl: "https://www.instagram.com/marianodivaio/", imageStyle: "Italian menswear, elegant, suits", country: "IT",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Gian Maria Sainato", handle: "@gianmariasainato", style: "Milan Dapper", gender: "male", igUrl: "https://www.instagram.com/gianmariasainato/", imageStyle: "Milan dapper, tailored Italian style", country: "IT",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  // Female
  { name: "Chiara Ferragni", handle: "@chiaraferragni", style: "Italian Glam", gender: "female", igUrl: "https://www.instagram.com/chiaraferragni/", imageStyle: "Italian glam, luxury brands, colorful", country: "IT",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "preppy"], budgetLevels: ["premium", "luxury"] },
  { name: "Veronica Ferraro", handle: "@veronicaferraro", style: "Milan Chic", gender: "female", igUrl: "https://www.instagram.com/veronicaferraro/", imageStyle: "Milan chic, designer fashion, Italian elegance", country: "IT",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Giulia Valentina", handle: "@giuliavalentina", style: "Italian Cool", gender: "female", igUrl: "https://www.instagram.com/giuliavalentina/", imageStyle: "Italian cool, relaxed luxury, Milan street", country: "IT",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "minimalist"], budgetLevels: ["mid-range", "premium"] },

  // ===== Brazilian Fashion Influencers (BR) =====
  // Male
  { name: "Kadu Dantas", handle: "@kadudantas", style: "Brazilian Smart", gender: "male", igUrl: "https://www.instagram.com/kadudantas/", imageStyle: "Brazilian smart casual, tropical elegance", country: "BR",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "classic"], budgetLevels: ["mid-range", "premium"] },
  // Female
  { name: "Camila Coelho", handle: "@camilacoelho", style: "Brazilian Glam", gender: "female", igUrl: "https://www.instagram.com/camilacoelho/", imageStyle: "Brazilian glam, bold fashion, beauty", country: "BR",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
  { name: "Thássia Naves", handle: "@thassianaves", style: "Tropical Luxury", gender: "female", igUrl: "https://www.instagram.com/thassianaves/", imageStyle: "Tropical luxury, colorful, Brazilian chic", country: "BR",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "bohemian"], budgetLevels: ["premium", "luxury"] },

  // ===== Australian Fashion Influencers (AU) =====
  // Male
  { name: "Adam Gallagher", handle: "@iamgalla", style: "Aussie Smart", gender: "male", igUrl: "https://www.instagram.com/iamgalla/", imageStyle: "Smart casual, travel style, clean aesthetic", country: "AU",
    ageRanges: ["25-34", "35-44"], styleTags: ["smart-casual", "minimalist"], budgetLevels: ["mid-range", "premium"] },
  // Female
  { name: "Nadia Bartel", handle: "@nadiabartel", style: "Melbourne Chic", gender: "female", igUrl: "https://www.instagram.com/nadiabartel/", imageStyle: "Melbourne chic, Australian fashion, elegant", country: "AU",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  { name: "Sara Donaldson", handle: "@harperandharley", style: "Minimal Aussie", gender: "female", igUrl: "https://www.instagram.com/harperandharley/", imageStyle: "Minimal Australian style, neutral tones", country: "AU",
    ageRanges: ["25-34", "35-44"], styleTags: ["minimalist", "classic"], budgetLevels: ["mid-range", "premium"] },

  // ===== Japanese Fashion Influencers (JP) =====
  // Male
  { name: "Poggy", handle: "@poggytheman", style: "Tokyo Eclectic", gender: "male", igUrl: "https://www.instagram.com/poggytheman/", imageStyle: "Tokyo eclectic, mix of streetwear and tailoring", country: "JP",
    ageRanges: ["25-34", "35-44", "45-54"], styleTags: ["avant-garde", "streetwear"], budgetLevels: ["premium", "luxury"] },
  // Female
  { name: "Yoyo Cao", handle: "@yoyokulala", style: "Tokyo Chic", gender: "female", igUrl: "https://www.instagram.com/yoyokulala/", imageStyle: "Tokyo chic, colorful, playful fashion", country: "JP",
    ageRanges: ["25-34", "35-44"], styleTags: ["avant-garde", "smart-casual"], budgetLevels: ["premium", "luxury"] },

  // ===== South Korean Fashion Influencers (KR) =====
  // Male
  { name: "Eugene Lee Yang", handle: "@eugeneleeyang", style: "K-Fashion Bold", gender: "male", igUrl: "https://www.instagram.com/eugeneleeyang/", imageStyle: "K-fashion bold, gender-fluid, artistic", country: "KR",
    ageRanges: ["18-24", "25-34", "35-44"], styleTags: ["avant-garde", "streetwear"], budgetLevels: ["premium", "luxury"] },
  // Female
  { name: "Irene Kim", handle: "@ireneisgood", style: "K-Style Icon", gender: "female", igUrl: "https://www.instagram.com/ireneisgood/", imageStyle: "K-style icon, colorful hair, Seoul fashion", country: "KR",
    ageRanges: ["18-24", "25-34"], styleTags: ["streetwear", "avant-garde"], budgetLevels: ["mid-range", "premium"] },

  // ===== Indian Fashion Influencers (IN) =====
  // Male
  { name: "Usaamah Siddique", handle: "@usaamahsiddique", style: "Mumbai Modern", gender: "male", igUrl: "https://www.instagram.com/usaamahsiddique/", imageStyle: "Mumbai modern, streetwear meets tradition", country: "IN",
    ageRanges: ["18-24", "25-34"], styleTags: ["streetwear", "smart-casual"], budgetLevels: ["mid-range", "premium"] },
  // Female
  { name: "Masoom Minawala", handle: "@masoomminawala", style: "Indian Luxury", gender: "female", igUrl: "https://www.instagram.com/masoomminawala/", imageStyle: "Indian luxury, fusion fashion, global style", country: "IN",
    ageRanges: ["25-34", "35-44"], styleTags: ["classic", "smart-casual"], budgetLevels: ["premium", "luxury"] },
];

/** Well-known brand URLs for hyperlinking */
export const BRAND_URLS: Record<string, string> = {
  "Stone Island": "https://www.stoneisland.com/",
  "Miu Miu": "https://www.miumiu.com/",
  "Prada": "https://www.prada.com/",
  "Gucci": "https://www.gucci.com/",
  "Louis Vuitton": "https://www.louisvuitton.com/",
  "Balenciaga": "https://www.balenciaga.com/",
  "Dior": "https://www.dior.com/",
  "Saint Laurent": "https://www.ysl.com/",
  "Bottega Veneta": "https://www.bottegaveneta.com/",
  "Burberry": "https://www.burberry.com/",
  "Versace": "https://www.versace.com/",
  "Fendi": "https://www.fendi.com/",
  "Valentino": "https://www.valentino.com/",
  "Givenchy": "https://www.givenchy.com/",
  "Hermès": "https://www.hermes.com/",
  "Chanel": "https://www.chanel.com/",
  "Celine": "https://www.celine.com/",
  "Loewe": "https://www.loewe.com/",
  "Acne Studios": "https://www.acnestudios.com/",
  "AMI Paris": "https://www.amiparis.com/",
  "COS": "https://www.cos.com/",
  "Massimo Dutti": "https://www.massimodutti.com/",
  "Zara": "https://www.zara.com/",
  "H&M": "https://www.hm.com/",
  "Uniqlo": "https://www.uniqlo.com/",
  "Nike": "https://www.nike.com/",
  "Adidas": "https://www.adidas.com/",
  "New Balance": "https://www.newbalance.com/",
  "Common Projects": "https://www.commonprojects.com/",
  "Veja": "https://www.veja-store.com/",
  "Tissot": "https://www.tissotwatches.com/",
  "Omega": "https://www.omegawatches.com/",
  "TAG Heuer": "https://www.tagheuer.com/",
  "Rolex": "https://www.rolex.com/",
  "Cartier": "https://www.cartier.com/",
  "Tom Ford": "https://www.tomford.com/",
  "Ray-Ban": "https://www.ray-ban.com/",
  "Off-White": "https://www.off---white.com/",
  "Fear of God": "https://fearofgod.com/",
  "Rick Owens": "https://www.rickowens.eu/",
  "Maison Margiela": "https://www.maisonmargiela.com/",
  "Alexander McQueen": "https://www.alexandermcqueen.com/",
  "Thom Browne": "https://www.thombrowne.com/",
  "Ralph Lauren": "https://www.ralphlauren.com/",
  "Calvin Klein": "https://www.calvinklein.com/",
  "Tommy Hilfiger": "https://www.tommyhilfiger.com/",
  "BOSS": "https://www.hugoboss.com/",
  "Armani": "https://www.armani.com/",
  "Diesel": "https://www.diesel.com/",
  "Levi's": "https://www.levi.com/",
  "SSENSE": "https://www.ssense.com/",
  "Mr Porter": "https://www.mrporter.com/",
  "END.": "https://www.endclothing.com/",
  "Farfetch": "https://www.farfetch.com/",
  "Nordstrom": "https://www.nordstrom.com/",
  "ASOS": "https://www.asos.com/",
  "NET-A-PORTER": "https://www.net-a-porter.com/",
  "MatchesFashion": "https://www.matchesfashion.com/",
  // Israeli Fashion Brands
  "Castro": "https://www.castro.com/",
  "Fox": "https://www.fox.co.il/",
  "Golf": "https://www.golf.co.il/",
  "Renuar": "https://renuar.com/",
  "Honigman": "https://www.honigman.co.il/",
  "Tamnoon": "https://www.tamnoon.co.il/",
  "Adika": "https://www.adika.co.il/",
  "Factory 54": "https://www.factory54.co.il/",
  "Terminal X": "https://www.terminalx.com/",
  "Comme il Faut": "https://www.commeilfaut.co.il/",
  "Maskit": "https://www.maskit.com/",
  "Dodo Bar Or": "https://www.dodobaror.com/",
  "Alembika": "https://alembika.co.il/",
  "Naot": "https://www.naot.com/",
  "Sebo": "https://www.sebo.co.il/",
  "Mania Jeans": "https://www.mania-jeans.co.il/",
  "H&O": "https://www.h-o.co.il/",
  "Ronen Chen": "https://www.ronenchen.com/",
  "Sabina Musayev": "https://sabinamusayev.com/",
  "Alef Alef": "https://www.alefalef.co.il/",
  "Inbal Dror": "https://www.inbaldror.co.il/",
  "Sabon": "https://www.sabon.co.il/",
  "Laline": "https://www.laline.co.il/",
  // German Fashion Brands
  "s.Oliver": "https://www.soliver.com/",
  "Marc O'Polo": "https://www.marc-o-polo.com/",
  "Esprit": "https://www.esprit.com/",
  "Tom Tailor": "https://www.tom-tailor.com/",
  "Gerry Weber": "https://www.gerryweber.com/",
  "Drykorn": "https://drykorn.com/",
  "Closed": "https://www.closed.com/",
  "Bogner": "https://www.bogner.com/",
  "Birkenstock": "https://www.birkenstock.com/",
  "Tamaris": "https://www.tamaris.com/",
  "Lala Berlin": "https://www.lfrankfurt.com/",
  // French Fashion Brands
  "Sandro": "https://www.sandro-paris.com/",
  "Maje": "https://www.maje.com/",
  "Zadig & Voltaire": "https://www.zadig-et-voltaire.com/",
  "Ba&sh": "https://ba-sh.com/",
  "Sézane": "https://www.sezane.com/",
  "Jacquemus": "https://www.jacquemus.com/",
  "Isabel Marant": "https://www.isabelmarant.com/",
  "Claudie Pierlot": "https://www.claudiepierlot.com/",
  "Paraboot": "https://www.paraboot.com/",
  "Repetto": "https://www.repetto.com/",
  "Celio": "https://www.celio.com/",
  "Jules": "https://www.jules.com/",
  "Kiabi": "https://www.kiabi.com/",
  // British Fashion Brands
  "Primark": "https://www.primark.com/",
  "Next": "https://www.next.co.uk/",
  "River Island": "https://www.riverisland.com/",
  "Ted Baker": "https://www.tedbaker.com/",
  "Reiss": "https://www.reiss.com/",
  "AllSaints": "https://www.allsaints.com/",
  "Barbour": "https://www.barbour.com/",
  "Paul Smith": "https://www.paulsmith.com/",
  "Vivienne Westwood": "https://www.viviennewestwood.com/",
  "Mulberry": "https://www.mulberry.com/",
  "Dr. Martens": "https://www.drmartens.com/",
  "Clarks": "https://www.clarks.com/",
  "Hunter": "https://www.hunterboots.com/",
  "Superdry": "https://www.superdry.com/",
  "Joules": "https://www.joules.com/",
  // Spanish Fashion Brands
  "Desigual": "https://www.desigual.com/",
  "Scalpers": "https://www.scalpers.com/",
  "El Ganso": "https://www.elganso.com/",
  "Bimba y Lola": "https://www.bimbaylola.com/",
  "Adolfo Domínguez": "https://www.adolfodominguez.com/",
  "Camper": "https://www.camper.com/",
  "Paloma Wool": "https://palomawool.com/",
  // Italian Fashion Brands
  "OVS": "https://www.ovs.it/",
  "Calzedonia": "https://www.calzedonia.com/",
  "Intimissimi": "https://www.intimissimi.com/",
  "Benetton": "https://www.benetton.com/",
  "Liu Jo": "https://www.liujo.com/",
  "Patrizia Pepe": "https://www.patriziapepe.com/",
  "Pinko": "https://www.pinko.com/",
  "Superga": "https://www.superga.com/",
  "Geox": "https://www.geox.com/",
  "Etro": "https://www.etro.com/",
  "Missoni": "https://www.missoni.com/",
  // Brazilian Fashion Brands
  "Renner": "https://www.lojasrenner.com.br/",
  "Hering": "https://www.hering.com.br/",
  "Farm Rio": "https://www.farmrio.com/",
  "Osklen": "https://www.osklen.com.br/",
  "Animale": "https://www.animale.com.br/",
  "Havaianas": "https://www.havaianas.com/",
  "Melissa": "https://www.melissa.com.br/",
  "Arezzo": "https://www.arezzo.com.br/",
  "Colcci": "https://www.colcci.com.br/",
  // Australian Fashion Brands
  "Cotton On": "https://www.cottonon.com/",
  "Country Road": "https://www.countryroad.com.au/",
  "Zimmermann": "https://www.zimmermannwear.com/",
  "Gorman": "https://www.gormanshop.com.au/",
  "Bonds": "https://www.bonds.com.au/",
  "R.M. Williams": "https://www.rmwilliams.com/",
  "Blundstone": "https://www.blundstone.com/",
  "Aje": "https://ajeworld.com.au/",
  "Seed Heritage": "https://www.seedheritage.com/",
  // Japanese Fashion Brands
  "Beams": "https://www.beams.co.jp/",
  "United Arrows": "https://www.united-arrows.co.jp/",
  "SHIPS": "https://www.shipsltd.co.jp/",
  "Sacai": "https://www.sacai.jp/",
  "Neighborhood": "https://www.neighborhood.jp/",
  "Visvim": "https://www.visvim.tv/",
  "Human Made": "https://humanmade.jp/",
  "Kapital": "https://www.kapital.jp/",
  "Needles": "https://www.needles.jp/",
  "BAPE": "https://bape.com/",
  "Onitsuka Tiger": "https://www.onitsukatiger.com/",
  "Suicoke": "https://suicoke.com/",
  "GU": "https://www.gu-global.com/",
  // Korean Fashion Brands
  "Ader Error": "https://en.adererror.com/",
  "Gentle Monster": "https://www.gentlemonster.com/",
  "8 Seconds": "https://www.ssfshop.com/",
  "Stylenanda": "https://en.stylenanda.com/",
  "Covernat": "https://covernat.net/",
  "Thisisneverthat": "https://thisisneverthat.com/",
  "Mardi Mercredi": "https://www.mardimercredi.com/",
  "Andersson Bell": "https://anderssonbell.com/",
  "Fila Korea": "https://www.fila.co.kr/",
  // Indian Fashion Brands
  "FabIndia": "https://www.fabindia.com/",
  "Allen Solly": "https://www.allensolly.com/",
  "Peter England": "https://www.peterengland.com/",
  "Van Heusen": "https://www.vanheusen.com/",
  "Raymond": "https://www.raymond.in/",
  "Biba": "https://www.biba.in/",
  "W": "https://www.wforwoman.com/",
  "Manyavar": "https://www.manyavar.com/",
  "Bata India": "https://www.bata.in/",
  "Woodland": "https://www.woodlandworldwide.com/",
  // American Fashion Brands
  "J.Crew": "https://www.jcrew.com/",
  "Banana Republic": "https://www.bananarepublic.com/",
  "Gap": "https://www.gap.com/",
  "Madewell": "https://www.madewell.com/",
  "Anthropologie": "https://www.anthropologie.com/",
  "Free People": "https://www.freepeople.com/",
  "Everlane": "https://www.everlane.com/",
  "Reformation": "https://www.thereformation.com/",
  "Tory Burch": "https://www.toryburch.com/",
  "Kate Spade": "https://www.katespade.com/",
  "Vineyard Vines": "https://www.vineyardvines.com/",
  "Brooks Brothers": "https://www.brooksbrothers.com/",
  "Abercrombie & Fitch": "https://www.abercrombie.com/",
  "American Eagle": "https://www.ae.com/",
  "Cole Haan": "https://www.colehaan.com/",
  "Sperry": "https://www.sperry.com/",
  "Timberland": "https://www.timberland.com/",
  // ═══════════════════════════════════════════════════════
  // PREMIUM WOMEN'S BRANDS — Luxury, Designer, Contemporary
  // ═══════════════════════════════════════════════════════
  // Luxury Houses (Women-focused)
  "Stella McCartney": "https://www.stellamccartney.com/",
  "Chloé": "https://www.chloe.com/",
  "Alaïa": "https://www.maison-alaia.com/",
  "Lanvin": "https://www.lanvin.com/",
  "Balmain": "https://www.balmain.com/",
  "Dolce & Gabbana": "https://www.dolcegabbana.com/",
  "Oscar de la Renta": "https://www.oscardelarenta.com/",
  "Carolina Herrera": "https://www.carolinaherrera.com/",
  "Elie Saab": "https://www.eliesaab.com/",
  "Marchesa": "https://www.marchesa.com/",
  "Proenza Schouler": "https://www.proenzaschouler.com/",
  "Khaite": "https://khaite.com/",
  "The Row": "https://www.therow.com/",
  "Totême": "https://www.toteme-studio.com/",
  "Nanushka": "https://www.nanushka.com/",
  "Ganni": "https://www.ganni.com/",
  "Staud": "https://stfrancis.com/",
  "Cult Gaia": "https://www.cultgaia.com/",
  "Ulla Johnson": "https://www.ullajohnson.com/",
  "Self-Portrait": "https://www.self-portrait-studio.com/",
  "Rotate Birger Christensen": "https://www.rotate.com/",
  // Contemporary Women's
  "& Other Stories": "https://www.stories.com/",
  "Arket": "https://www.arket.com/",
  "Faithfull the Brand": "https://www.faithfullthebrand.com/",
  "Réalisation Par": "https://realisationpar.com/",
  "Rouje": "https://www.rouje.com/",
  "Musier Paris": "https://www.musier-paris.com/",
  "Anine Bing": "https://www.aninebing.com/",
  "Agolde": "https://www.agolde.com/",
  "Citizens of Humanity": "https://citizensofhumanity.com/",
  "Mother Denim": "https://www.motherdenim.com/",
  "Frame": "https://frame-store.com/",
  "Veronica Beard": "https://veronicabeard.com/",
  "Alice + Olivia": "https://www.aliceandolivia.com/",
  // Women's Jewelry & Accessories
  "Tiffany & Co.": "https://www.tiffany.com/",
  "Van Cleef & Arpels": "https://www.vancleefarpels.com/",
  "Bvlgari": "https://www.bulgari.com/",
  "Chopard": "https://www.chopard.com/",
  "David Yurman": "https://www.davidyurman.com/",
  "Pandora": "https://www.pandora.net/",
  "Swarovski": "https://www.swarovski.com/",
  "Monica Vinader": "https://www.monicavinader.com/",
  "Mejuri": "https://www.mejuri.com/",
  "Missoma": "https://www.missoma.com/",
  // Women's Bags
  "Mansur Gavriel": "https://www.mansurgavriel.com/",
  "Polène": "https://www.polene-paris.com/",
  "Delvaux": "https://www.delvaux.com/",
  "Strathberry": "https://www.strathberry.com/",
  "DeMellier": "https://www.demellierlondon.com/",
  // Women's Shoes
  "Jimmy Choo": "https://www.jimmychoo.com/",
  "Manolo Blahnik": "https://www.manoloblahnik.com/",
  "Stuart Weitzman": "https://www.stuartweitzman.com/",
  "Aquazzura": "https://www.aquazzura.com/",
  "Gianvito Rossi": "https://www.gianvitorossi.com/",
  "Loeffler Randall": "https://loefflerrandall.com/",
  "Sam Edelman": "https://www.samedelman.com/",
  // ═══════════════════════════════════════════════════════
  // PREMIUM MEN'S BRANDS — Luxury, Designer, Streetwear
  // ═══════════════════════════════════════════════════════
  // Luxury Menswear
  "Ermenegildo Zegna": "https://www.zegna.com/",
  "Brunello Cucinelli": "https://www.brunellocucinelli.com/",
  "Loro Piana": "https://www.loropiana.com/",
  "Brioni": "https://www.brioni.com/",
  "Canali": "https://www.canali.com/",
  "Isaia": "https://www.isaia.it/",
  "Kiton": "https://www.kiton.com/",
  "Berluti": "https://www.berluti.com/",
  "Dunhill": "https://www.dunhill.com/",
  // Contemporary Menswear
  "A.P.C.": "https://www.apc.fr/",
  "Norse Projects": "https://www.norseprojects.com/",
  "Our Legacy": "https://www.ourlegacy.com/",
  "Lemaire": "https://www.lemaire.fr/",
  "Studio Nicholson": "https://www.studionicholson.com/",
  "Margaret Howell": "https://www.margarethowell.co.uk/",
  "Sunspel": "https://www.sunspel.com/",
  "John Smedley": "https://www.johnsmedley.com/",
  "Rag & Bone": "https://www.rag-bone.com/",
  "Theory": "https://www.theory.com/",
  "Club Monaco": "https://www.clubmonaco.com/",
  "Suitsupply": "https://suitsupply.com/",
  // Streetwear / Hype
  "Stüssy": "https://www.stussy.com/",
  "Palace": "https://www.palaceskateboards.com/",
  "Supreme": "https://www.supremenewyork.com/",
  "Kith": "https://kith.com/",
  "Essentials": "https://www.essentialsfear.com/",
  "Rhude": "https://www.rhude.com/",
  "Amiri": "https://www.amiri.com/",
  "Palm Angels": "https://www.palmangels.com/",
  "Represent": "https://representclo.com/",
  "Axel Arigato": "https://axelarigato.com/",
  // Men's Watches (Premium)
  "Patek Philippe": "https://www.patek.com/",
  "Audemars Piguet": "https://www.audemarspiguet.com/",
  "IWC": "https://www.iwc.com/",
  "Jaeger-LeCoultre": "https://www.jaeger-lecoultre.com/",
  "Panerai": "https://www.panerai.com/",
  "Breitling": "https://www.breitling.com/",
  "Tudor": "https://www.tudorwatch.com/",
  "Longines": "https://www.longines.com/",
  "Seiko": "https://www.seikowatches.com/",
  "Casio G-Shock": "https://www.casio.com/gshock/",
  // Men's Shoes (Premium)
  "Church's": "https://www.church-footwear.com/",
  "John Lobb": "https://www.johnlobb.com/",
  "Crockett & Jones": "https://www.crockettandjones.com/",
  "Santoni": "https://www.santonishoes.com/",
  "Magnanni": "https://www.magnanni.com/",
  "Filling Pieces": "https://www.fillingpieces.com/",
  "ETQ Amsterdam": "https://www.etq-amsterdam.com/",
  // ═══════════════════════════════════════════════════════
  // ADDITIONAL ISRAELI BRANDS (Men & Women)
  // ═══════════════════════════════════════════════════════
  "Yvel": "https://www.yvel.com/",
  "Michal Negrin": "https://www.michalnegrin.com/",
  "Sasson Kedem": "https://www.sassonkedem.com/",
  "Maya Negri": "https://www.mayanegri.com/",
  "Sack's": "https://www.sacks.co.il/",
  "Kravitz": "https://www.kravitz.co.il/",
  "American Vintage": "https://www.americanvintage-store.com/",
  "Oysho": "https://www.oysho.com/",
};

/** Occasion types for context-aware analysis */
export const OCCASIONS = [
  { id: "general", label: "חוות דעת כללית", icon: "✨", description: "תן לי חוות דעת על הלוק שלי" },
  { id: "casual", label: "יומיומי / קז'ואל", icon: "☕", description: "סידורים, יום רגיל" },
  { id: "work", label: "עבודה / משרד", icon: "💼", description: "ישיבות, יום עבודה רגיל" },
  { id: "date", label: "דייט", icon: "❤️", description: "יציאה רומנטית" },
  { id: "coffee", label: "קפה / ברנצ'", icon: "🥐", description: "יציאה קלילה, ברנצ' עם חברים" },
  { id: "family", label: "ארוחה משפחתית / חג", icon: "🕯️", description: "שישי, חגים, אירוע משפחתי" },
  { id: "bar", label: "בר / מסעדה", icon: "🍷", description: "ערב בחוץ, Happy Hour" },
  { id: "evening", label: "אירוע ערב", icon: "🌙", description: "מסיבה, אירוע, חתונה" },
  { id: "friends", label: "יציאה עם חברים", icon: "🍻", description: "בילוי, יציאה קבוצתית" },
  { id: "formal", label: "פורמלי / עסקי", icon: "👔", description: "פגישה חשובה, כנס" },
  { id: "sport", label: "ספורטיבי / אקטיבי", icon: "🏃", description: "פעילות גופנית, הליכה" },
  { id: "travel", label: "טיול / נסיעה", icon: "✈️", description: "חופשה, טיסה" },
  { id: "weekend", label: "סופ\"ש", icon: "🌴", description: "יום חופשי, שוק, סיבוב בעיר" },
] as const;

export type OccasionId = typeof OCCASIONS[number]["id"];

/** Onboarding profile options */
export const AGE_RANGES = [
  { id: "16-17", label: "16-17" },
  { id: "18-24", label: "18-24" },
  { id: "25-34", label: "25-34" },
  { id: "35-44", label: "35-44" },
  { id: "45-54", label: "45-54" },
  { id: "55+", label: "55+" },
] as const;

export const GENDER_OPTIONS = [
  { id: "male", label: "גבר" },
  { id: "female", label: "אישה" },
  { id: "non-binary", label: "לא בינארי" },
] as const;

export const OCCUPATION_OPTIONS = [
  { id: "student", label: "סטודנט/ית", icon: "📚" },
  { id: "creative", label: "תחום יצירתי", icon: "🎨" },
  { id: "corporate", label: "תאגידי / משרדי", icon: "🏢" },
  { id: "entrepreneur", label: "יזם/ית", icon: "🚀" },
  { id: "tech", label: "הייטק", icon: "💻" },
  { id: "freelance", label: "פרילנס", icon: "🏠" },
  { id: "other", label: "אחר", icon: "✨" },
] as const;

export const BUDGET_OPTIONS = [
  { id: "budget", label: "חסכוני", range: "₪0-200 לפריט", icon: "💰" },
  { id: "mid-range", label: "ביניים", range: "₪200-600 לפריט", icon: "💳" },
  { id: "premium", label: "פרימיום", range: "₪600-2,000 לפריט", icon: "💎" },
  { id: "luxury", label: "יוקרה", range: "₪2,000+ לפריט", icon: "👑" },
] as const;

/** Store options available for user selection, grouped by budget tier */
export const STORE_OPTIONS = [
  // Budget stores
  { id: "shein", label: "Shein", budget: "budget", icon: "🛍️" },
  { id: "hm", label: "H&M", budget: "budget", icon: "🛍️" },
  { id: "primark", label: "Primark", budget: "budget", icon: "🛍️" },
  { id: "pullbear", label: "Pull & Bear", budget: "budget", icon: "🛍️" },
  { id: "bershka", label: "Bershka", budget: "budget", icon: "🛍️" },
  { id: "forever21", label: "Forever 21", budget: "budget", icon: "🛍️" },
  // Mid-range stores
  { id: "zara", label: "Zara", budget: "mid-range", icon: "👗" },
  { id: "mango", label: "Mango", budget: "mid-range", icon: "👗" },
  { id: "asos", label: "ASOS", budget: "mid-range", icon: "👗" },
  { id: "massimodutti", label: "Massimo Dutti", budget: "mid-range", icon: "👗" },
  { id: "cos", label: "COS", budget: "mid-range", icon: "👗" },
  { id: "uniqlo", label: "Uniqlo", budget: "mid-range", icon: "👗" },
  { id: "urbanoutfitters", label: "Urban Outfitters", budget: "mid-range", icon: "👗" },
  // Premium stores
  { id: "allsaints", label: "AllSaints", budget: "premium", icon: "✨" },
  { id: "reiss", label: "Reiss", budget: "premium", icon: "✨" },
  { id: "tedbaker", label: "Ted Baker", budget: "premium", icon: "✨" },
  { id: "otherstories", label: "& Other Stories", budget: "premium", icon: "✨" },
  { id: "arket", label: "Arket", budget: "premium", icon: "✨" },
  { id: "sandro", label: "Sandro", budget: "premium", icon: "✨" },
  { id: "maje", label: "Maje", budget: "premium", icon: "✨" },
  // Luxury stores
  { id: "netaporter", label: "NET-A-PORTER", budget: "luxury", icon: "👑" },
  { id: "farfetch", label: "Farfetch", budget: "luxury", icon: "👑" },
  { id: "ssense", label: "SSENSE", budget: "luxury", icon: "👑" },
  { id: "mrporter", label: "Mr Porter", budget: "luxury", icon: "👑" },
  { id: "matchesfashion", label: "MatchesFashion", budget: "luxury", icon: "👑" },
  { id: "nordstrom", label: "Nordstrom", budget: "luxury", icon: "👑" },
] as const;

/** Maps budget level to recommended store names for AI prompt injection */
export const BUDGET_STORE_MAP: Record<string, string[]> = {
  budget: ["Shein", "H&M", "Primark", "Pull & Bear", "Bershka", "Forever 21", "ASOS (sale section)"],
  "mid-range": ["Zara", "Mango", "ASOS", "Massimo Dutti", "COS", "Uniqlo", "Urban Outfitters"],
  premium: ["AllSaints", "Reiss", "Ted Baker", "& Other Stories", "Arket", "Sandro", "Maje", "COS"],
  luxury: ["NET-A-PORTER", "Farfetch", "SSENSE", "Mr Porter", "MatchesFashion", "Nordstrom"],
};

/** Store entry with gender and budget metadata for smart filtering */
export interface StoreEntry {
  name: string;
  /** Which genders this store serves */
  gender: "male" | "female" | "unisex";
  /** Budget tiers this store fits */
  budget: ("budget" | "mid-range" | "premium" | "luxury")[];
}

/**
 * Country-specific store recommendations with gender & budget metadata.
 * Maps ISO country code → list of stores popular/available in that country.
 * Used to inject local store preferences into the AI prompt when the user
 * hasn't explicitly chosen preferred stores.
 */
export const COUNTRY_STORE_MAP: Record<string, { stores: StoreEntry[]; currency: string; locale: string }> = {
  IL: {
    stores: [
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "ASOS", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Shein", gender: "unisex", budget: ["budget"] },
      { name: "Mango", gender: "unisex", budget: ["mid-range"] },
      { name: "Pull & Bear", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Bershka", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Massimo Dutti", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "COS", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Terminal X", gender: "unisex", budget: ["mid-range", "premium", "luxury"] },
      { name: "Factory 54", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Castro", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Fox", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Golf", gender: "unisex", budget: ["mid-range"] },
      { name: "Renuar", gender: "female", budget: ["mid-range"] },
      { name: "Honigman", gender: "female", budget: ["mid-range"] },
      { name: "Adika", gender: "female", budget: ["budget", "mid-range"] },
      { name: "Comme il Faut", gender: "female", budget: ["mid-range", "premium"] },
      { name: "Sebo", gender: "male", budget: ["budget", "mid-range"] },
      { name: "Mania Jeans", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Kravitz", gender: "male", budget: ["mid-range"] },
      { name: "Sack's", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Sabina Musayev", gender: "female", budget: ["premium"] },
      { name: "Ronen Chen", gender: "female", budget: ["premium"] },
      { name: "Oysho", gender: "female", budget: ["budget", "mid-range"] },
    ],
    currency: "ILS (₪)",
    locale: "Israel",
  },
  DE: {
    stores: [
      { name: "Zalando", gender: "unisex", budget: ["budget", "mid-range", "premium"] },
      { name: "About You", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "ASOS", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Peek & Cloppenburg", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Breuninger", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Mytheresa", gender: "female", budget: ["premium", "luxury"] },
      { name: "COS", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Massimo Dutti", gender: "unisex", budget: ["mid-range", "premium"] },
    ],
    currency: "EUR (€)",
    locale: "Germany",
  },
  FR: {
    stores: [
      { name: "Galeries Lafayette", gender: "unisex", budget: ["mid-range", "premium", "luxury"] },
      { name: "La Redoute", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Sandro", gender: "unisex", budget: ["premium"] },
      { name: "Maje", gender: "female", budget: ["premium"] },
      { name: "Zadig & Voltaire", gender: "unisex", budget: ["premium"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "ASOS", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "COS", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Printemps", gender: "unisex", budget: ["premium", "luxury"] },
    ],
    currency: "EUR (€)",
    locale: "France",
  },
  GB: {
    stores: [
      { name: "ASOS", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Selfridges", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "John Lewis", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Reiss", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "AllSaints", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Ted Baker", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Harrods", gender: "unisex", budget: ["luxury"] },
      { name: "NET-A-PORTER", gender: "female", budget: ["premium", "luxury"] },
      { name: "Mr Porter", gender: "male", budget: ["premium", "luxury"] },
    ],
    currency: "GBP (£)",
    locale: "United Kingdom",
  },
  US: {
    stores: [
      { name: "Nordstrom", gender: "unisex", budget: ["mid-range", "premium", "luxury"] },
      { name: "SSENSE", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Revolve", gender: "female", budget: ["mid-range", "premium"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "ASOS", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Bloomingdale's", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Saks Fifth Avenue", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Urban Outfitters", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Nike", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Target", gender: "unisex", budget: ["budget"] },
      { name: "Old Navy", gender: "unisex", budget: ["budget"] },
    ],
    currency: "USD ($)",
    locale: "United States",
  },
  ES: {
    stores: [
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "Mango", gender: "unisex", budget: ["mid-range"] },
      { name: "Pull & Bear", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Bershka", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Massimo Dutti", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "El Corte Inglés", gender: "unisex", budget: ["mid-range", "premium", "luxury"] },
      { name: "Desigual", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "COS", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "ASOS", gender: "unisex", budget: ["budget", "mid-range"] },
    ],
    currency: "EUR (€)",
    locale: "Spain",
  },
  IT: {
    stores: [
      { name: "LuisaViaRoma", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Yoox", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Rinascente", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "OVS", gender: "unisex", budget: ["budget"] },
      { name: "Calzedonia", gender: "female", budget: ["budget", "mid-range"] },
      { name: "Massimo Dutti", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Gucci", gender: "unisex", budget: ["luxury"] },
      { name: "Prada", gender: "unisex", budget: ["luxury"] },
    ],
    currency: "EUR (€)",
    locale: "Italy",
  },
  BR: {
    stores: [
      { name: "Dafiti", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Renner", gender: "unisex", budget: ["budget"] },
      { name: "C&A", gender: "unisex", budget: ["budget"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Riachuelo", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Amaro", gender: "female", budget: ["mid-range"] },
      { name: "Arezzo", gender: "female", budget: ["mid-range", "premium"] },
      { name: "Farm Rio", gender: "female", budget: ["mid-range", "premium"] },
      { name: "Osklen", gender: "unisex", budget: ["premium"] },
    ],
    currency: "BRL (R$)",
    locale: "Brazil",
  },
  AU: {
    stores: [
      { name: "The Iconic", gender: "unisex", budget: ["budget", "mid-range", "premium"] },
      { name: "David Jones", gender: "unisex", budget: ["mid-range", "premium", "luxury"] },
      { name: "Country Road", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "ASOS", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Witchery", gender: "female", budget: ["mid-range", "premium"] },
      { name: "Gorman", gender: "female", budget: ["mid-range", "premium"] },
      { name: "Uniqlo", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "NET-A-PORTER", gender: "female", budget: ["premium", "luxury"] },
    ],
    currency: "AUD (A$)",
    locale: "Australia",
  },
  JP: {
    stores: [
      { name: "Uniqlo", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Beams", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "United Arrows", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Isetan", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Zozotown", gender: "unisex", budget: ["budget", "mid-range", "premium"] },
      { name: "GU", gender: "unisex", budget: ["budget"] },
      { name: "Muji", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Comme des Garçons", gender: "unisex", budget: ["premium", "luxury"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
    ],
    currency: "JPY (¥)",
    locale: "Japan",
  },
  KR: {
    stores: [
      { name: "Musinsa", gender: "unisex", budget: ["budget", "mid-range", "premium"] },
      { name: "W Concept", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "29CM", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Uniqlo", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Gentle Monster", gender: "unisex", budget: ["premium"] },
      { name: "Ader Error", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "COS", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "ASOS", gender: "unisex", budget: ["budget", "mid-range"] },
    ],
    currency: "KRW (₩)",
    locale: "South Korea",
  },
  IN: {
    stores: [
      { name: "Myntra", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Ajio", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Tata CLiQ", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "Zara", gender: "unisex", budget: ["mid-range", "premium"] },
      { name: "H&M", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Nykaa Fashion", gender: "female", budget: ["mid-range", "premium"] },
      { name: "Pernia's Pop-Up Shop", gender: "female", budget: ["premium", "luxury"] },
      { name: "Koovs", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "Lifestyle", gender: "unisex", budget: ["budget", "mid-range"] },
      { name: "FabIndia", gender: "unisex", budget: ["mid-range"] },
    ],
    currency: "INR (₹)",
    locale: "India",
  },
};

/**
 * Filter stores by user gender and budget.
 * Returns store names that match the user's profile.
 */
export function filterStoresForUser(
  stores: StoreEntry[],
  gender?: string | null,
  budgetLevel?: string | null,
): string[] {
  return stores
    .filter(s => {
      // Gender filter: show unisex + matching gender
      const genderMatch = !gender || s.gender === "unisex" || s.gender === gender;
      // Budget filter: show stores that include the user's budget tier
      const budgetMatch = !budgetLevel || s.budget.includes(budgetLevel as any);
      return genderMatch && budgetMatch;
    })
    .map(s => s.name);
}

/** Local fashion brands per country — used to inject locale-aware brand recognition into AI prompt */
export const COUNTRY_LOCAL_BRANDS: Record<string, { mainstream: string[]; designer: string[]; footwear: string[]; tip: string }> = {
  IL: {
    mainstream: [
      "Castro (קסטרו): 'CASTRO' text logo on tags/labels/collar, men's & women's — look for embossed metal buttons with Castro branding",
      "Fox (פוקס): 'FOX' text logo, often on chest area, Israel's leading retail group — includes Fox Home, Fox Baby",
      "Golf (גולף): 'GOLF' or 'GOLF & CO' text logo, casual/smart casual — distinctive minimalist Israeli style",
      "Renuar (רנואר): 'RENUAR' text on labels, women's workwear/smart casual — known for structured blazers and office wear",
      "Honigman (הוניגמן): 'HONIGMAN' text logo, women's fashion chain — feminine silhouettes, floral prints",
      "Tamnoon (תמנון): affordable Israeli fashion chain — basics and casual wear",
      "H&O: Israeli fashion chain — multi-brand retailer similar to TK Maxx",
      "Sebo (סבו): men's fashion chain, part of Mania Jeans group — casual menswear, denim focus",
      "Mania Jeans (מאניה ג'ינס): denim/casual wear chain — Israeli denim specialist",
      "Adika (עדיקה): trendy young women's fashion, online-first — Instagram-driven fast fashion",
      "Kravitz (קרביץ): Israeli men's fashion chain — smart casual, Mediterranean style",
      "Sack's (סאקס): premium Israeli multi-brand retailer — carries international and local designers",
      "Terminal X (טרמינל X): Israel's largest online fashion retailer — carries 800+ brands",
    ],
    designer: [
      "Comme il Faut (קום איל פו): bold/artistic prints, feminist brand, 'CIF' logo — distinctive colorful patterns",
      "Maskit (משכית): heritage embroidery, Israel's first fashion house (1954) — Bauhaus-meets-Middle-Eastern aesthetic",
      "Dodo Bar Or (דודו בר אור): bohemian/resort wear, crochet details — seen on international celebrities",
      "Ronen Chen (רונן חן): women's designer fashion — elegant draping, architectural cuts",
      "Alef Alef (אלף אלף): urban clean-cut designer — minimalist Israeli design",
      "Alembika (אלמביקה): unique prints, diverse sizing — avant-garde silhouettes",
      "Sabina Musayev (סבינה מוסייב): contemporary women's designer — bold colors, statement pieces",
      "Doron Ashkenazi: Israeli menswear designer — tailored Mediterranean menswear",
      "Eliran Nargassi: Israeli menswear designer — modern tailoring with streetwear edge",
      "Maya Negri (מאיה נגרי): Israeli women's designer — romantic feminine aesthetic",
      "Michal Negrin (מיכל נגרין): distinctive vintage-inspired jewelry and fashion — ornate floral designs",
      "Sasson Kedem (ששון קדם): Israeli leather goods designer — handcrafted leather bags and shoes",
      "Yvel: Israeli luxury jewelry house — pearl and gemstone specialists",
      "Inbal Dror (ענבל דרור): Israeli haute couture — known internationally for bridal and evening wear",
    ],
    footwear: [
      "Naot (נאות): distinctive cork/suede footbed, comfort shoes/sandals — look for the Naot logo on footbed",
      "Source (סורס): outdoor sandals — rugged adventure sandals with distinctive strap system",
      "Sasson Kedem (ששון קדם): handcrafted leather shoes — artisanal Israeli craftsmanship",
    ],
    tip: "If you see Hebrew text on labels or relaxed Mediterranean casual-smart styles, consider local Israeli brands BEFORE international ones. Israeli men often wear Castro, Fox, Golf, Kravitz, or Sebo. Israeli women often wear Renuar, Honigman, Adika, Comme il Faut, or Sabina Musayev. For premium Israeli fashion, check Terminal X and Factory 54 brands.",
  },
  DE: {
    mainstream: [
      "s.Oliver: 's.Oliver' text logo, casual/smart casual, one of Germany's largest",
      "Marc O'Polo: 'MARC O'POLO' text logo, Scandinavian-inspired casual",
      "Esprit: 'ESPRIT' text logo, casual lifestyle brand",
      "Tom Tailor: 'TOM TAILOR' text logo, casual everyday wear",
      "Gerry Weber: women's fashion, smart casual",
      "Comma: part of s.Oliver group, women's business/casual",
      "Street One: affordable women's casual fashion",
      "Cecil: casual women's fashion chain",
      "Peek & Cloppenburg: multi-brand department store",
    ],
    designer: [
      "Jil Sander: minimalist luxury, clean lines, no visible logos",
      "Drykorn: premium casual, slim fits, understated German design",
      "Closed: premium denim and casual, sustainability focus",
      "Bogner: luxury sportswear/ski wear, 'B' logo",
      "Strenesse: minimalist women's fashion",
      "Lala Berlin: kufiya-inspired prints, contemporary Berlin style",
      "HUGO (Hugo Boss diffusion): 'HUGO' text, younger/edgier than BOSS",
    ],
    footwear: [
      "Birkenstock: iconic cork footbed sandals, 'Arizona' model",
      "Gabor: comfort shoes, German engineering",
      "Tamaris: women's shoes and boots",
      "Lloyd: men's dress shoes, German craftsmanship",
    ],
    tip: "German users often wear local brands like s.Oliver, Marc O'Polo, or Tom Tailor. Look for German text on labels and understated, quality-focused design.",
  },
  FR: {
    mainstream: [
      "Kiabi: 'KIABI' logo, affordable family fashion",
      "Camaïeu: women's affordable fashion chain",
      "Promod: 'PROMOD' text, women's fashion chain",
      "Jules: men's casual fashion chain",
      "Celio: 'CELIO' text logo, men's casual/smart casual",
      "La Redoute: major French fashion retailer",
      "Pimkie: young women's fashion",
      "Cache Cache: women's affordable fashion",
    ],
    designer: [
      "Sandro: Parisian smart casual, 'S' logo, SMCP group",
      "Maje: feminine Parisian style, 'M' logo, SMCP group",
      "Zadig & Voltaire: rock-chic Parisian, skull motifs, 'ZV' logo",
      "Ba&sh: bohemian Parisian, relaxed feminine style",
      "Sézane: sustainable Parisian chic, online-first",
      "Jacquemus: bold minimalism, oversized/micro accessories",
      "Isabel Marant: boho-luxe, western-inspired details",
      "Claudie Pierlot: classic Parisian, part of SMCP group",
      "Comptoir des Cotonniers: mother-daughter Parisian basics",
    ],
    footwear: [
      "Veja: 'V' logo, sustainable sneakers (French-founded)",
      "Paraboot: chunky soles, Michael/Chambord models, Norwegian welt",
      "Repetto: ballet flats, dance-inspired",
      "Clergerie: architectural heels, platform shoes",
    ],
    tip: "French users commonly wear Sandro, Maje, Zadig & Voltaire, and other SMCP brands. Look for understated Parisian elegance and brand-specific details.",
  },
  GB: {
    mainstream: [
      "Primark: 'PRIMARK' text, ultra-affordable fashion",
      "Next: 'NEXT' text logo, family fashion chain",
      "River Island: 'RI' logo, trendy high-street fashion",
      "Marks & Spencer: 'M&S' logo, British staple for basics and smart wear",
      "Monsoon: bohemian/ethnic prints, women's fashion",
      "Joules: colorful British countryside style, floral prints",
      "FatFace: casual British lifestyle brand",
      "Superdry: Japanese-inspired graphics, 'Superdry' text with Japanese characters",
    ],
    designer: [
      "Ted Baker: 'TB' logo, quirky British smart-casual",
      "Reiss: minimalist British tailoring, premium high-street",
      "AllSaints: distressed leather, dark aesthetic, 'A' ramskull logo",
      "Barbour: waxed jackets, tartan lining, royal warrant",
      "Paul Smith: colorful stripes, quirky British tailoring",
      "Vivienne Westwood: orb logo, punk-inspired British design",
      "Stella McCartney: sustainable luxury, no leather",
      "Mulberry: leather goods, 'Mulberry' tree logo",
    ],
    footwear: [
      "Dr. Martens: yellow stitching, air-cushioned sole, 'DM' logo",
      "Clarks: desert boots, comfort shoes, British heritage",
      "Church's: premium brogues, British shoemaking",
      "Hunter: Wellington boots, iconic rubber rain boots",
    ],
    tip: "British users often wear local high-street brands like Next, River Island, M&S, or premium labels like Reiss and Ted Baker. Look for British tailoring details.",
  },
  ES: {
    mainstream: [
      "Desigual: bold colorful prints, patchwork patterns, 'DESIGUAL' text",
      "Springfield: casual men's & women's, Tendam group",
      "Cortefiel: smart casual, Tendam group",
      "Women'secret: lingerie/loungewear, Tendam group",
      "Stradivarius: young women's fashion, Inditex group",
      "Oysho: activewear/loungewear, Inditex group",
      "Scalpers: men's smart casual, 'SCALPERS' skull logo",
      "El Ganso: preppy Spanish style, bowtie logo",
    ],
    designer: [
      "Bimba y Lola: contemporary accessories & fashion, 'BYL' logo, twin greyhound dogs",
      "Adolfo Domínguez: minimalist Spanish design, 'la arruga es bella'",
      "Purificación García: elegant Spanish design, leather goods",
      "Loewe: luxury leather goods, 'LOEWE' anagram (Spanish-founded)",
      "Manolo Blahnik: luxury shoes (Spanish-born designer)",
      "Paloma Wool: contemporary art-fashion, Barcelona-based",
    ],
    footwear: [
      "Camper: 'CAMPER' text, quirky comfort shoes, Mallorca-founded",
      "Pikolinos: leather shoes, Spanish craftsmanship",
      "Castañer: espadrilles, wedge sandals, Spanish heritage",
    ],
    tip: "Spanish users commonly wear Inditex sub-brands and Tendam group labels. Look for bold Mediterranean colors and relaxed tailoring.",
  },
  IT: {
    mainstream: [
      "OVS: 'OVS' text logo, Italy's largest fashion retailer, affordable",
      "Calzedonia: hosiery, swimwear, leggings, 'CALZEDONIA' text",
      "Intimissimi: lingerie/underwear, part of Calzedonia group",
      "Tezenis: young casual underwear/loungewear, Calzedonia group",
      "Benetton: 'UNITED COLORS OF BENETTON' text, colorful knitwear",
      "Sisley: part of Benetton group, trendier/edgier",
      "Liu Jo: 'LIU·JO' text logo, women's fashion, Italian glamour",
      "Motivi: women's fashion chain, Italian feminine style",
    ],
    designer: [
      "Patrizia Pepe: 'PP' logo, contemporary Italian fashion",
      "Pinko: 'PINKO' text, love birds logo, Italian glamour",
      "Marella: part of Max Mara group, accessible Italian elegance",
      "Weekend Max Mara: casual line of Max Mara, 'W' logo",
      "Brunello Cucinelli: luxury cashmere, understated Italian elegance",
      "Etro: paisley prints, Italian bohemian luxury",
      "Missoni: zigzag knit patterns, colorful Italian knitwear",
      "Loro Piana: ultra-luxury cashmere and fabrics",
    ],
    footwear: [
      "Superga: '2750' classic canvas sneaker, Italian heritage",
      "Geox: 'breathes' technology, comfort shoes, 'GEOX' text",
      "Premiata: premium Italian sneakers, handcrafted",
      "Santoni: luxury Italian dress shoes",
    ],
    tip: "Italian users often wear local brands like OVS, Calzedonia group, or Benetton. Look for Italian text on labels and quality-focused Mediterranean style.",
  },
  BR: {
    mainstream: [
      "Renner: 'RENNER' text, Brazil's largest fashion retailer",
      "Riachuelo: 'RIACHUELO' text, major Brazilian fashion chain",
      "Hering: 'HERING' text with fish logo, Brazilian basics since 1880",
      "Marisa: women's fashion chain, affordable",
      "C&A Brazil: major presence in Brazilian market",
      "Amaro: Brazilian online-first fashion brand",
      "Shoulder: women's fashion, contemporary Brazilian style",
      "Colcci: 'COLCCI' text, casual/sportswear Brazilian brand",
    ],
    designer: [
      "Farm Rio: tropical prints, colorful Brazilian patterns, 'FARM' logo",
      "Osklen: 'OSKLEN' text, Brazilian luxury casual, sustainable",
      "Animale: 'ANIMALE' text, premium women's fashion",
      "Bo.Bô: contemporary Brazilian luxury",
      "Reinaldo Lourenço: Brazilian haute couture",
      "Alexandre Birman: luxury shoes and accessories",
    ],
    footwear: [
      "Havaianas: iconic rubber flip-flops, Brazilian flag colors",
      "Melissa: plastic/jelly shoes, distinctive sweet scent",
      "Arezzo: 'AREZZO' text, women's shoes, Brazilian leather",
      "Schutz: premium women's shoes, Brazilian design",
    ],
    tip: "Brazilian users commonly wear Renner, Hering, or Farm Rio. Look for tropical prints, relaxed fits, and vibrant colors typical of Brazilian fashion.",
  },
  AU: {
    mainstream: [
      "Cotton On: 'COTTON ON' text, casual basics, Australian-founded",
      "Country Road: 'CR' logo, smart casual Australian lifestyle",
      "Witchery: women's fashion, part of Country Road group",
      "Seed Heritage: 'SEED' text, family fashion, Australian basics",
      "Sportsgirl: women's fashion/accessories, Australian chain",
      "Bonds: iconic Australian underwear/basics, 'BONDS' text",
      "Kmart Australia: affordable fashion basics",
      "Target Australia: affordable fashion range",
    ],
    designer: [
      "Zimmermann: feminine prints, resort wear, swim, Australian luxury",
      "Sass & Bide: embellished/statement pieces, Australian premium",
      "Gorman: bold prints, colorful, art-inspired Australian design",
      "Camilla: kaftans, resort prints, crystal embellishments",
      "Aje: architectural Australian design, sculptural details",
      "Dion Lee: cut-out details, modern Australian design",
      "Alice McCall: romantic, lace, feminine Australian designer",
    ],
    footwear: [
      "R.M. Williams: Chelsea boots, 'RM' logo, Australian outback heritage",
      "Blundstone: pull-on boots, elastic sides, Tasmanian brand",
      "UGG Australia: sheepskin boots (Australian origin)",
      "Bared Footwear: podiatrist-designed, Australian comfort shoes",
    ],
    tip: "Australian users often wear Cotton On, Country Road, or Zimmermann. Look for relaxed Australian style with quality fabrics and outdoor-ready design.",
  },
  JP: {
    mainstream: [
      "GU (ジーユー): Uniqlo's sister brand, trendy affordable fashion",
      "Beams (ビームス): 'BEAMS' text, curated Japanese select shop",
      "United Arrows (ユナイテッドアローズ): 'UA' logo, premium Japanese select shop",
      "Journal Standard (ジャーナルスタンダード): casual Japanese lifestyle brand",
      "SHIPS (シップス): Japanese select shop, smart casual",
      "Nano Universe (ナノ・ユニバース): Japanese smart casual brand",
      "Urban Research (アーバンリサーチ): Japanese lifestyle fashion",
      "Lowrys Farm: young women's casual, Japanese brand",
    ],
    designer: [
      "Sacai (サカイ): hybrid/layered designs, deconstructed, Chitose Abe",
      "Undercover (アンダーカバー): punk-influenced, Jun Takahashi",
      "Neighborhood (ネイバーフッド): military/motorcycle-inspired streetwear",
      "Visvim (ビズビム): Americana meets Japanese craft, Hiroki Nakamura",
      "Human Made (ヒューマンメイド): vintage-inspired, heart logo, NIGO",
      "Kapital (キャピタル): boro/sashiko patchwork, indigo denim",
      "Needles (ニードルズ): track pants with butterfly logo, rebuild vintage",
      "A Bathing Ape / BAPE (ベイプ): camo patterns, ape head logo",
    ],
    footwear: [
      "Onitsuka Tiger (オニツカタイガー): retro sneakers, tiger stripes, Japanese heritage",
      "Moonstar (ムーンスター): vulcanized shoes, Kurume craftsmanship",
      "Suicoke (スイコック): technical sandals, vibram soles",
    ],
    tip: "Japanese users often wear select shop brands (Beams, United Arrows, SHIPS) or GU. Look for meticulous layering, oversized silhouettes, and Japanese text on labels.",
  },
  KR: {
    mainstream: [
      "8 Seconds (에잇세컨즈): Samsung's fashion brand, trendy Korean basics",
      "Spao (스파오): Korean fast fashion, E-Land group",
      "Topten (탑텐): affordable Korean basics, similar to Uniqlo",
      "Mixxo (미쏘): women's fashion, E-Land group",
      "WHO.A.U: casual Korean fashion, E-Land group",
      "Stylenanda (스타일난다): trendy Korean women's fashion, 3CE beauty",
      "Musinsa Standard (무신사 스탠다드): Musinsa's own basics brand",
      "Covernat (커버낫): Korean casual/streetwear, 'C' logo",
    ],
    designer: [
      "Ader Error (아더에러): oversized fits, blue arrow logo, Korean avant-garde",
      "Thisisneverthat (디스이즈네버댓): Korean streetwear, 'T' logo",
      "Wooyoungmi (우영미): Korean luxury menswear, Paris-based",
      "Juun.J (준지): oversized/deconstructed Korean design",
      "Gentle Monster (젠틀몬스터): bold eyewear, sculptural stores",
      "Low Classic (로우클래식): minimalist Korean womenswear",
      "Andersson Bell (앤더슨벨): gender-neutral, Scandinavian-Korean fusion",
      "Mardi Mercredi (마르디 메크르디): 'Flower' embroidery logo, Korean casual",
    ],
    footwear: [
      "Fila Korea (휠라): Korean-owned since 2007, 'F' logo, chunky sneakers",
      "Excelsior (엑셀시오르): bolt-sole sneakers, Korean sneaker brand",
      "Discovery Expedition: outdoor/hiking shoes, Korean outdoor brand",
    ],
    tip: "Korean users commonly wear Musinsa brands, 8 Seconds, or designer labels like Ader Error. Look for oversized fits, Korean text on labels, and K-fashion aesthetics.",
  },
  IN: {
    mainstream: [
      "FabIndia: block prints, handloom fabrics, Indian ethnic-modern fusion",
      "Allen Solly: 'ALLEN SOLLY' text, smart casual, Aditya Birla group",
      "Peter England: men's formal/casual, Aditya Birla group",
      "Van Heusen: smart casual/formal, Aditya Birla group",
      "Raymond: 'RAYMOND' text, men's suiting, 'The Complete Man'",
      "Biba (बीबा): Indian ethnic women's wear, colorful prints",
      "W: contemporary Indian fusion women's wear",
      "Global Desi: boho-Indian fusion, colorful prints",
      "Manyavar (मान्यवर): Indian ethnic menswear, wedding/festive",
    ],
    designer: [
      "Sabyasachi: luxury Indian bridal/ethnic, 'S' Bengal tiger logo",
      "Anita Dongre: sustainable Indian luxury, 'AND' diffusion line",
      "Manish Malhotra: Bollywood couture, luxury Indian fashion",
      "Ritu Kumar: heritage Indian prints, 'LABEL' diffusion line",
      "Raw Mango: handwoven Indian textiles, contemporary saris",
      "Abraham & Thakore: minimalist Indian design, handloom fabrics",
    ],
    footwear: [
      "Bata India: 'BATA' text, India's largest footwear retailer",
      "Metro Shoes: Indian shoe chain, formal and casual",
      "Woodland: outdoor/casual shoes, 'WOODLAND' text, tree logo",
      "Liberty Shoes: Indian footwear manufacturer",
    ],
    tip: "Indian users commonly wear Aditya Birla brands (Allen Solly, Van Heusen, Peter England) or ethnic brands like FabIndia and Biba. Look for Indian textile patterns and brand text on labels.",
  },
  US: {
    mainstream: [
      "J.Crew: 'J.CREW' text, preppy American style, colorful basics",
      "Banana Republic: smart casual, Gap Inc. group",
      "Gap: 'GAP' text logo, American casual basics",
      "Old Navy: affordable American casual, Gap Inc. group",
      "Madewell: 'MADEWELL' text, denim-focused, J.Crew sister brand",
      "Anthropologie: bohemian/eclectic women's fashion, URBN group",
      "Free People: boho/festival style, URBN group",
      "Abercrombie & Fitch: 'A&F' logo, moose emblem, casual American",
      "American Eagle: 'AE' eagle logo, casual denim-focused",
    ],
    designer: [
      "Everlane: transparent pricing, minimalist American basics",
      "Reformation: sustainable fashion, vintage-inspired",
      "Tory Burch: 'T' medallion logo, preppy American luxury",
      "Michael Kors: 'MK' logo, accessible American luxury",
      "Marc Jacobs: 'MJ' logo, contemporary American design",
      "Kate Spade: spade logo, colorful accessories/fashion",
      "Coach: 'C' pattern, leather goods, American heritage",
      "Vineyard Vines: whale logo, preppy New England style",
      "Brooks Brothers: golden fleece logo, American tailoring since 1818",
    ],
    footwear: [
      "Cole Haan: American dress shoes with comfort technology",
      "Allen Edmonds: premium American dress shoes, Goodyear welt",
      "Sperry: boat shoes, 'SPERRY' text, nautical American style",
      "Timberland: yellow boots, 'TIMBERLAND' tree logo",
    ],
    tip: "American users commonly wear J.Crew, Gap group brands, or Abercrombie. Look for preppy American style, brand logos, and casual-smart aesthetics.",
  },
};

export const STYLE_OPTIONS = [
  { id: "minimalist", label: "מינימליסטי", description: "קווים נקיים, צבעים ניטרליים" },
  { id: "streetwear", label: "סטריטוור", description: "אורבני, ספורטיבי, לוגואים" },
  { id: "classic", label: "קלאסי", description: "נצחי, מסודר, אלגנטי" },
  { id: "smart-casual", label: "סמארט קז'ואל", description: "מזדמן אך מטופח" },
  { id: "avant-garde", label: "אוונגרד", description: "ניסיוני, ייחודי, חדשני" },
  { id: "sporty", label: "ספורטיבי", description: "אתלטי, נוח, דינמי" },
  { id: "bohemian", label: "בוהו", description: "חופשי, טבעי, שכבות" },
  { id: "preppy", label: "פרפי", description: "אקדמי, מסודר, צבעוני" },
] as const;
