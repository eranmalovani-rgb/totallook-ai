/**
 * Generate catalog product images using AI image generation.
 * Calls the Forge API directly to generate product images, then uploads to S3.
 * Updates the DB with new URLs.
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

async function generateImageViaForge(prompt) {
  const baseUrl = FORGE_API_URL.endsWith("/") ? FORGE_API_URL : `${FORGE_API_URL}/`;
  const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();
  const resp = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      original_images: [],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Image gen failed (${resp.status}): ${msg.substring(0, 200)}`);
  }
  const data = await resp.json();
  if (data.image?.b64Json) {
    return Buffer.from(data.image.b64Json, "base64");
  }
  throw new Error("No image data in response");
}

function buildPrompt(item) {
  const gender = item.gender === "female" ? "women's" : "men's";
  const color = item.color || "";
  const material = item.material || "";
  const pattern = item.pattern || "solid";
  const brand = item.brand || "";
  
  return `Professional e-commerce product photo of a ${gender} ${color} ${item.name}. ${material ? `Made of ${material}.` : ""} ${pattern !== "solid" ? `${pattern} pattern.` : ""} Clean white background, studio lighting, high quality fashion photography, no model, flat lay or mannequin display. ${brand ? `Style similar to ${brand}.` : ""}`.trim();
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Get items that need images (old R2 URLs)
  const [rows] = await conn.execute(
    "SELECT id, name, nameHe, category, subCategory, gender, color, material, pattern, brand, imageUrl FROM catalogItems WHERE imageUrl LIKE '%r2.dev%' ORDER BY id"
  );
  console.log(`Found ${rows.length} items with old R2 images to regenerate`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    try {
      const prompt = buildPrompt(item);
      console.log(`  [${i+1}/${rows.length}] Generating: ${item.name}...`);
      
      const imageBuffer = await generateImageViaForge(prompt);
      
      // Upload to S3
      const safeName = item.name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 60);
      const key = `catalog/${item.gender}/${item.category}/${safeName}_${item.id}.png`;
      const newUrl = await storagePut(key, imageBuffer, "image/png");
      
      // Update DB
      await conn.execute("UPDATE catalogItems SET imageUrl = ? WHERE id = ?", [newUrl, item.id]);
      
      console.log(`  OK: ${item.name} → ${newUrl.substring(0, 70)}...`);
      success++;
      
      // Small delay between generations
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`  FAIL: ${item.name}: ${err.message.substring(0, 100)}`);
      failed++;
    }
    
    if ((i + 1) % 10 === 0) {
      console.log(`\n=== Progress: ${i+1}/${rows.length} (${success} ok, ${failed} failed) ===\n`);
    }
  }
  
  console.log(`\n=== DONE: ${success} generated, ${failed} failed ===`);
  
  const [count] = await conn.execute("SELECT COUNT(*) as cnt FROM catalogItems WHERE imageUrl IS NOT NULL AND imageUrl != '' AND imageUrl NOT LIKE '%r2.dev%'");
  console.log(`Items with valid images: ${count[0].cnt}`);
  
  await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
