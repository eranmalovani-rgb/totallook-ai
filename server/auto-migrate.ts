/**
 * Auto-migration script — runs on server startup.
 * Creates missing tables and seeds catalog data if needed.
 * Safe to run multiple times (idempotent).
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const CATALOG_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`catalogItems\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`name\` varchar(256) NOT NULL,
  \`nameHe\` varchar(256) NOT NULL,
  \`category\` varchar(64) NOT NULL,
  \`subCategory\` varchar(64) NOT NULL,
  \`gender\` varchar(16) NOT NULL,
  \`color\` varchar(64) NOT NULL,
  \`secondaryColor\` varchar(64),
  \`material\` varchar(64) NOT NULL,
  \`fit\` varchar(32) NOT NULL,
  \`pattern\` varchar(32) NOT NULL,
  \`styleTags\` json NOT NULL,
  \`occasionTags\` json NOT NULL,
  \`season\` varchar(32) NOT NULL,
  \`brand\` varchar(128) NOT NULL,
  \`store\` varchar(128) NOT NULL,
  \`priceIls\` int NOT NULL,
  \`budgetTier\` varchar(32) NOT NULL,
  \`trendRelevance\` varchar(16) NOT NULL,
  \`productSearchQuery\` varchar(256) NOT NULL,
  \`imageUrl\` text,
  \`upgradeReason\` text NOT NULL,
  \`upgradeReasonHe\` text NOT NULL,
  \`pairsWith\` json NOT NULL,
  \`upgradesFrom\` json NOT NULL,
  \`colorHarmonyGroups\` json NOT NULL,
  \`isActive\` int NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`catalogItems_id\` PRIMARY KEY(\`id\`)
)`;

export async function runAutoMigrations(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AutoMigrate] Database not available, skipping migrations");
    return;
  }

  try {
    console.log("[AutoMigrate] Running auto-migrations...");

    // 1. Create catalogItems table if it doesn't exist
    await db.execute(sql.raw(CATALOG_CREATE_SQL));
    console.log("[AutoMigrate] catalogItems table ensured");

    // 2. Check if catalog needs seeding
    const [countResult] = await db.execute(sql.raw("SELECT COUNT(*) as cnt FROM catalogItems"));
    const count = (countResult as any)[0]?.cnt ?? 0;

    if (count === 0) {
      console.log("[AutoMigrate] catalogItems is empty, seeding catalog data...");
      await seedCatalogData(db);
    } else {
      console.log(`[AutoMigrate] catalogItems already has ${count} items, skipping seed`);
    }

    console.log("[AutoMigrate] All migrations complete");
  } catch (error: any) {
    console.error("[AutoMigrate] Migration error:", error?.message);
    // Don't crash the server — catalog is optional
  }
}

async function seedCatalogData(db: any): Promise<void> {
  // Import the seed data
  const { CATALOG_SEED_DATA } = await import("./catalog-seed-data");
  
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < CATALOG_SEED_DATA.length; i += BATCH_SIZE) {
    const batch = CATALOG_SEED_DATA.slice(i, i + BATCH_SIZE);
    
    const values = batch.map(item => {
      const esc = (v: any) => v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      const jsonVal = (v: any) => v == null ? "NULL" : `'${JSON.stringify(v).replace(/'/g, "''")}'`;
      return `(${esc(item.name)}, ${esc(item.nameHe)}, ${esc(item.category)}, ${esc(item.subCategory)}, ${esc(item.gender)}, ${esc(item.color)}, ${esc(item.secondaryColor)}, ${esc(item.material)}, ${esc(item.fit)}, ${esc(item.pattern)}, ${jsonVal(item.styleTags)}, ${jsonVal(item.occasionTags)}, ${esc(item.season)}, ${esc(item.brand)}, ${esc(item.store)}, ${item.priceIls}, ${esc(item.budgetTier)}, ${esc(item.trendRelevance)}, ${esc(item.productSearchQuery)}, ${esc(item.imageUrl)}, ${esc(item.upgradeReason)}, ${esc(item.upgradeReasonHe)}, ${jsonVal(item.pairsWith)}, ${jsonVal(item.upgradesFrom)}, ${jsonVal(item.colorHarmonyGroups)}, ${item.isActive ?? 1})`;
    }).join(",\n");

    const insertSql = `INSERT INTO catalogItems (name, nameHe, category, subCategory, gender, color, secondaryColor, material, fit, pattern, styleTags, occasionTags, season, brand, store, priceIls, budgetTier, trendRelevance, productSearchQuery, imageUrl, upgradeReason, upgradeReasonHe, pairsWith, upgradesFrom, colorHarmonyGroups, isActive) VALUES\n${values}`;

    await db.execute(sql.raw(insertSql));
    inserted += batch.length;
    if (inserted % 200 === 0 || inserted === CATALOG_SEED_DATA.length) {
      console.log(`[AutoMigrate] Seeded ${inserted}/${CATALOG_SEED_DATA.length} catalog items`);
    }
  }

  console.log(`[AutoMigrate] Catalog seeding complete: ${inserted} items`);
}
