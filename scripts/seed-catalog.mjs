/**
 * Seed catalog items into the database.
 * Maps catalog-data.json fields to catalogItems table columns.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(1); }

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "catalog-data.json"), "utf-8"));
console.log(`Loaded ${catalog.length} items`);

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  const [existing] = await conn.execute("SELECT COUNT(*) as cnt FROM catalogItems");
  console.log(`Existing items: ${existing[0].cnt}`);
  
  if (existing[0].cnt > 0) {
    console.log("Clearing existing items...");
    await conn.execute("DELETE FROM catalogItems");
  }

  const BATCH_SIZE = 50;
  let inserted = 0;
  
  const cols = [
    "name", "nameHe", "category", "subCategory", "gender",
    "color", "secondaryColor", "material", "fit", "pattern",
    "styleTags", "occasionTags", "season", "brand", "store",
    "priceIls", "budgetTier", "trendRelevance", "productSearchQuery",
    "imageUrl", "upgradeReason", "upgradeReasonHe",
    "pairsWith", "upgradesFrom", "colorHarmonyGroups", "isActive"
  ];
  
  for (let i = 0; i < catalog.length; i += BATCH_SIZE) {
    const batch = catalog.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => `(${cols.map(() => "?").join(",")})`).join(",");
    
    const values = [];
    for (const item of batch) {
      values.push(
        (item.name || "").substring(0, 256),
        (item.nameHe || "").substring(0, 256),
        (item.category || "").substring(0, 64),
        (item.subCategory || "").substring(0, 64),
        (item.gender || "").substring(0, 16),
        (item.color || "").substring(0, 64),
        item.secondaryColor ? item.secondaryColor.substring(0, 64) : null,
        (item.material || "").substring(0, 64),
        (item.fit || "").substring(0, 32),
        (item.pattern || "").substring(0, 32),
        JSON.stringify(item.styleTags || []),
        JSON.stringify(item.occasionTags || []),
        (item.season || "all-season").substring(0, 32),
        (item.brand || "").substring(0, 128),
        (item.store || "").substring(0, 128),
        item.priceIls || 0,
        (item.budgetTier || "mid").substring(0, 32),
        (item.trendRelevance || "medium").substring(0, 16),
        (item.productSearchQuery || "").substring(0, 256),
        item.imageUrl || null,
        item.upgradeReason || "",
        item.upgradeReasonHe || "",
        JSON.stringify(item.pairsWith || []),
        JSON.stringify(item.upgradesFrom || []),
        JSON.stringify(item.colorHarmonyGroups || []),
        item.isActive !== false ? 1 : 0
      );
    }
    
    const sql = `INSERT INTO catalogItems (${cols.join(",")}) VALUES ${placeholders}`;
    await conn.execute(sql, values);
    inserted += batch.length;
    
    if (inserted % 200 === 0 || inserted >= catalog.length) {
      console.log(`Inserted: ${inserted}/${catalog.length}`);
    }
  }
  
  // Verify
  const [count] = await conn.execute("SELECT COUNT(*) as cnt FROM catalogItems");
  console.log(`\n=== DONE: ${count[0].cnt} items in database ===`);
  
  const [breakdown] = await conn.execute(
    "SELECT gender, category, COUNT(*) as cnt FROM catalogItems GROUP BY gender, category ORDER BY gender, category"
  );
  console.log("\nBreakdown:");
  for (const row of breakdown) {
    console.log(`  ${row.gender}-${row.category}: ${row.cnt}`);
  }
  
  const [withImages] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM catalogItems WHERE imageUrl IS NOT NULL AND imageUrl != ''"
  );
  console.log(`\nItems with images: ${withImages[0].cnt}`);
  
  await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
