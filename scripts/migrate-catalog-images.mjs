/**
 * Migrate catalog images from old R2 bucket to Manus S3 storage.
 * Downloads each image from the old R2 URL and re-uploads to Manus S3 via storagePut.
 * Then updates the DB with the new URL.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error("Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

// Load catalog data to get old R2 URLs
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "catalog-data.json"), "utf-8"));
const itemsWithImages = catalog.filter(i => i.imageUrl && i.imageUrl.includes("r2.dev"));
console.log(`Found ${itemsWithImages.length} items with R2 images to migrate`);

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
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// Use Google Image Search to get a real product image
async function searchProductImage(query, gender) {
  const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CSE_API_KEY}&cx=${process.env.GOOGLE_CSE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=3&imgSize=medium&safe=active`;
  try {
    const resp = await fetch(searchUrl);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].link;
    }
  } catch (e) {
    // fallback
  }
  return null;
}

async function downloadFromUrl(url) {
  try {
    const resp = await fetch(url, { 
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("image")) return null;
    return { buffer: Buffer.from(await resp.arrayBuffer()), contentType: ct.split(";")[0] };
  } catch {
    return null;
  }
}

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  let success = 0;
  let failed = 0;
  const BATCH = 5; // Process 5 at a time
  
  for (let i = 0; i < itemsWithImages.length; i += BATCH) {
    const batch = itemsWithImages.slice(i, i + BATCH);
    const promises = batch.map(async (item) => {
      try {
        // Try to find the image via Google search first
        const query = item.productSearchQuery || `${item.brand} ${item.name}`;
        const genderPrefix = item.gender === "female" ? "women's" : "men's";
        const searchQuery = `${genderPrefix} ${query} product photo`;
        
        let imageData = null;
        
        // Try Google Image Search
        const googleUrl = await searchProductImage(searchQuery, item.gender);
        if (googleUrl) {
          imageData = await downloadFromUrl(googleUrl);
        }
        
        if (!imageData) {
          // Try downloading from old R2 URL (might work for some)
          try {
            const oldData = await downloadImage(item.imageUrl);
            if (oldData && oldData.length > 1000) {
              const ext = item.imageUrl.split(".").pop()?.toLowerCase() || "jpg";
              imageData = { buffer: oldData, contentType: ext === "png" ? "image/png" : "image/jpeg" };
            }
          } catch {
            // R2 is 401, expected
          }
        }
        
        if (!imageData) {
          console.log(`  SKIP: No image found for ${item.name}`);
          return null;
        }
        
        // Upload to Manus S3
        const ext = imageData.contentType.includes("png") ? "png" : "jpg";
        const safeName = item.name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 60);
        const key = `catalog/${item.gender}/${item.category}/${safeName}_${Date.now()}.${ext}`;
        
        const newUrl = await storagePut(key, imageData.buffer, imageData.contentType);
        
        // Update DB
        await conn.execute(
          "UPDATE catalogItems SET imageUrl = ? WHERE name = ? AND gender = ? AND category = ?",
          [newUrl, item.name, item.gender, item.category]
        );
        
        // Update catalog-data.json entry
        item.imageUrl = newUrl;
        
        console.log(`  OK: ${item.name} → ${newUrl.substring(0, 60)}...`);
        return newUrl;
      } catch (err) {
        console.log(`  FAIL: ${item.name}: ${err.message}`);
        return null;
      }
    });
    
    const results = await Promise.allSettled(promises);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) success++;
      else failed++;
    }
    
    console.log(`Progress: ${i + batch.length}/${itemsWithImages.length} (${success} ok, ${failed} failed)`);
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Save updated catalog data
  fs.writeFileSync(path.join(__dirname, "catalog-data.json"), JSON.stringify(catalog, null, 2));
  
  console.log(`\n=== DONE: ${success} migrated, ${failed} failed ===`);
  
  // Verify
  const [count] = await conn.execute("SELECT COUNT(*) as cnt FROM catalogItems WHERE imageUrl IS NOT NULL AND imageUrl != '' AND imageUrl NOT LIKE '%r2.dev%'");
  console.log(`Items with Manus S3 images: ${count[0].cnt}`);
  
  await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
