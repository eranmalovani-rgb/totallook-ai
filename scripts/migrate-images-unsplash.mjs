/**
 * Migrate catalog images using free image sources:
 * 1. Try Unsplash API (free, 50 req/hour)
 * 2. Download and re-upload to Manus S3
 * 3. Update DB
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

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!FORGE_API_URL || !FORGE_API_KEY || !DATABASE_URL) {
  console.error("Missing required env vars");
  process.exit(1);
}

async function storagePut(relKey, data, contentType) {
  const baseUrl = FORGE_API_URL.replace(/\/+$/, "") + "/";
  const url = new URL("v1/storage/upload", baseUrl);
  url.searchParams.set("path", relKey.replace(/^\/+/, ""));
  const blob = new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, relKey.split("/").pop());
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
    body: form,
  });
  if (!response.ok) {
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed (${response.status}): ${msg}`);
  }
  return (await response.json()).url;
}

async function downloadImage(url) {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TotalLookBot/1.0)" },
  });
  if (!resp.ok) return null;
  const ct = resp.headers.get("content-type") || "";
  if (!ct.includes("image")) return null;
  return { buffer: Buffer.from(await resp.arrayBuffer()), contentType: ct.split(";")[0] };
}

// Use Unsplash source (no API key needed for small images)
function getUnsplashUrl(query) {
  return `https://source.unsplash.com/400x500/?${encodeURIComponent(query)}`;
}

// Build search queries for each item type
function buildSearchQuery(item) {
  const parts = [];
  if (item.gender === "female") parts.push("women");
  else parts.push("men");
  parts.push(item.name.toLowerCase());
  if (item.color && item.color !== "multicolor") parts.push(item.color);
  return parts.join(" ");
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Get all items that need images (R2 URLs or no URL)
  const [rows] = await conn.execute(
    "SELECT id, name, nameHe, category, subCategory, gender, color, brand, productSearchQuery, imageUrl FROM catalogItems WHERE imageUrl IS NULL OR imageUrl = '' OR imageUrl LIKE '%r2.dev%' ORDER BY id LIMIT 200"
  );
  console.log(`Found ${rows.length} items needing images`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    try {
      const query = buildSearchQuery(item);
      const unsplashUrl = getUnsplashUrl(query);
      
      // Unsplash source redirects to actual image
      const imageData = await downloadImage(unsplashUrl);
      if (!imageData || imageData.buffer.length < 5000) {
        console.log(`  SKIP [${i}]: ${item.name} — no image from Unsplash`);
        failed++;
        continue;
      }
      
      const ext = imageData.contentType.includes("png") ? "png" : "jpg";
      const safeName = item.name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 60);
      const key = `catalog/${item.gender}/${item.category}/${safeName}_${item.id}.${ext}`;
      
      const newUrl = await storagePut(key, imageData.buffer, imageData.contentType);
      
      await conn.execute("UPDATE catalogItems SET imageUrl = ? WHERE id = ?", [newUrl, item.id]);
      
      console.log(`  OK [${i}]: ${item.name} → ${newUrl.substring(0, 70)}...`);
      success++;
      
      // Rate limit: 1 per second for Unsplash
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.log(`  FAIL [${i}]: ${item.name}: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n=== DONE: ${success} uploaded, ${failed} failed ===`);
  
  const [count] = await conn.execute("SELECT COUNT(*) as cnt FROM catalogItems WHERE imageUrl IS NOT NULL AND imageUrl != '' AND imageUrl NOT LIKE '%r2.dev%'");
  console.log(`Items with Manus S3 images: ${count[0].cnt}`);
  
  await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
