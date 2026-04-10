/**
 * Generate 2000 fashion catalog items using LLM in small batches (10 items each).
 * Saves metadata to JSON file. Images will be fetched separately.
 */
import fs from "fs";
import path from "path";

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error("Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}

async function invokeLLM(messages, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FORGE_API_KEY}`,
        },
        body: JSON.stringify({
          messages,
          temperature: 0.95,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

const STORES = ["ASOS", "Zara", "H&M", "Massimo Dutti", "COS", "Mango", "Pull&Bear", "Uniqlo", "Nike", "Adidas", "Levi's", "Tommy Hilfiger", "Calvin Klein", "Ralph Lauren", "Ted Baker"];
const OCCASIONS = ["daily", "work", "date", "wedding", "party", "shabbat", "vacation", "sport"];
const STYLES = ["casual", "smart-casual", "formal", "sporty", "streetwear", "minimalist", "trendy", "classic", "bohemian", "preppy"];

const CATEGORIES = [
  // Men (650 total)
  { gender: "male", category: "tops", subCategories: ["t-shirt", "polo", "dress shirt", "henley", "sweater", "hoodie", "tank top", "linen shirt"], total: 200 },
  { gender: "male", category: "pants", subCategories: ["jeans", "chinos", "dress pants", "joggers", "cargo pants", "shorts"], total: 150 },
  { gender: "male", category: "shoes", subCategories: ["sneakers", "loafers", "boots", "dress shoes", "sandals"], total: 120 },
  { gender: "male", category: "jackets", subCategories: ["blazer", "bomber jacket", "denim jacket", "leather jacket", "parka", "windbreaker"], total: 80 },
  { gender: "male", category: "accessories", subCategories: ["watch", "belt", "sunglasses", "bag", "bracelet", "wallet", "scarf", "hat"], total: 100 },
  // Women (750 total)  
  { gender: "female", category: "tops", subCategories: ["blouse", "t-shirt", "crop top", "bodysuit", "sweater", "cardigan", "tank top", "shirt"], total: 200 },
  { gender: "female", category: "pants", subCategories: ["jeans", "wide-leg pants", "leggings", "culottes", "dress pants", "shorts"], total: 150 },
  { gender: "female", category: "shoes", subCategories: ["sneakers", "heels", "boots", "flats", "sandals", "mules"], total: 120 },
  { gender: "female", category: "jackets", subCategories: ["blazer", "leather jacket", "denim jacket", "trench coat", "puffer", "kimono"], total: 80 },
  { gender: "female", category: "dresses", subCategories: ["midi dress", "mini dress", "maxi dress", "wrap dress", "midi skirt", "mini skirt", "pleated skirt"], total: 100 },
  { gender: "female", category: "accessories", subCategories: ["bag", "watch", "sunglasses", "belt", "scarf", "earrings", "necklace", "bracelet"], total: 100 },
];

const BUDGETS = [
  { tier: "budget", min: 50, max: 150 },
  { tier: "mid", min: 150, max: 400 },
  { tier: "premium", min: 400, max: 800 },
  { tier: "luxury", min: 800, max: 2000 },
];

const COLOR_HARMONY = {
  "neutrals": ["black", "white", "gray", "charcoal", "cream", "beige", "ivory", "taupe"],
  "earth-tones": ["brown", "tan", "olive", "khaki", "rust", "camel", "terracotta", "sand"],
  "cool-blues": ["navy blue", "light blue", "royal blue", "sky blue", "teal", "cobalt"],
  "warm-reds": ["burgundy", "wine", "red", "coral", "salmon", "rust"],
  "greens": ["olive", "forest green", "sage", "mint", "emerald", "army green"],
  "pastels": ["light pink", "lavender", "mint", "baby blue", "peach", "lilac", "blush"],
  "bold": ["red", "royal blue", "emerald", "yellow", "orange", "hot pink"],
};

function getColorGroups(color) {
  const c = (color || "").toLowerCase();
  const groups = [];
  for (const [group, colors] of Object.entries(COLOR_HARMONY)) {
    if (colors.some((x) => c.includes(x) || x.includes(c))) groups.push(group);
  }
  return groups.length ? groups : ["neutrals"];
}

function buildPrompt(cat, batchIdx, batchSize, budget) {
  const g = cat.gender === "male" ? "men's" : "women's";
  return `Generate exactly ${batchSize} unique ${g} ${cat.category} fashion items as a JSON object {"items":[...]}.

SUB-CATEGORIES: ${cat.subCategories.join(", ")}
BUDGET: ${budget.tier} (₪${budget.min}-${budget.max})
STORES: ${STORES.join(", ")}
BATCH ${batchIdx + 1}: ensure maximum variety in colors, materials, sub-categories, styles.

Each item object:
{"name":"English name","nameHe":"Hebrew name","category":"${cat.category}","subCategory":"from list","gender":"${cat.gender}","color":"lowercase english","secondaryColor":null,"material":"specific","fit":"slim/regular/oversized/tailored/relaxed","pattern":"solid/striped/checkered/floral/graphic/textured","styleTags":["2-3 from: ${STYLES.join(",")}"],"occasionTags":["2-4 from: ${OCCASIONS.join(",")}"],"season":"summer/winter/all-season/spring-fall","brand":"real brand","store":"from list","priceIls":number,"budgetTier":"${budget.tier}","trendRelevance":"low/medium/high","productSearchQuery":"english search query for google shopping","upgradeReason":"1 sentence english","upgradeReasonHe":"same in hebrew","pairsWith":["sub-categories"],"upgradesFrom":["sub-categories it replaces"]}

ALL ${batchSize} items MUST be unique. No duplicate name+color combos.`;
}

async function main() {
  const outputPath = path.join(process.cwd(), "scripts", "catalog-data.json");
  let allItems = [];
  if (fs.existsSync(outputPath)) {
    allItems = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    console.log(`Resuming with ${allItems.length} existing items`);
  }

  // Build all batch definitions
  const batches = [];
  for (const cat of CATEGORIES) {
    const batchSize = 10;
    const numBatches = Math.ceil(cat.total / batchSize);
    for (let i = 0; i < numBatches; i++) {
      const size = Math.min(batchSize, cat.total - i * batchSize);
      const budget = BUDGETS[i % BUDGETS.length];
      batches.push({ cat, batchIdx: i, batchSize: size, budget });
    }
  }

  const startBatch = Math.floor(allItems.length / 10);
  console.log(`Total batches: ${batches.length}, starting from batch ${startBatch + 1}`);

  for (let i = startBatch; i < batches.length; i++) {
    const { cat, batchIdx, batchSize, budget } = batches[i];
    const label = `${cat.gender} ${cat.category} batch ${batchIdx + 1}`;
    console.log(`[${i + 1}/${batches.length}] ${label} (${batchSize} items, ${budget.tier})...`);

    try {
      const prompt = buildPrompt(cat, batchIdx, batchSize, budget);
      const result = await invokeLLM([
        { role: "system", content: "Fashion product data generator. Return ONLY valid JSON with {\"items\":[...]}." },
        { role: "user", content: prompt },
      ]);

      const items = result.items || result;
      if (!Array.isArray(items)) {
        console.error(`  ERROR: not array`);
        continue;
      }

      const enriched = items.map((item) => ({
        ...item,
        colorHarmonyGroups: getColorGroups(item.color),
        secondaryColor: item.secondaryColor || null,
        imageUrl: null,
        isActive: 1,
      }));

      allItems.push(...enriched);
      fs.writeFileSync(outputPath, JSON.stringify(allItems, null, 2));
      console.log(`  ✓ ${enriched.length} items (total: ${allItems.length})`);

      // Tiny delay
      if (i % 5 === 4) await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
      fs.writeFileSync(outputPath, JSON.stringify(allItems, null, 2));
    }
  }

  console.log(`\n=== DONE: ${allItems.length} items ===`);
  const stats = {};
  for (const item of allItems) {
    const key = `${item.gender}-${item.category}`;
    stats[key] = (stats[key] || 0) + 1;
  }
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k}: ${v}`);
}

main().catch(console.error);
