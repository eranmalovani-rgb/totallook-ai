/**
 * Fill missing images for existing catalog items.
 * Fetches items with NULL imageUrl, generates AI images via Forge, uploads to S3, updates DB.
 * 
 * Usage: node scripts/fill-missing-images.mjs
 * Progress: /tmp/fill-images.log
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

const LOG_FILE = "/tmp/fill-images.log";
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// ── S3 Upload ──
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

// ── Image Generation via Forge ──
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
    body: JSON.stringify({ prompt }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Forge image gen failed (${resp.status}): ${detail.substring(0, 100)}`);
  }
  const result = await resp.json();
  return Buffer.from(result.image.b64Json, "base64");
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Get all items without images
  const [items] = await conn.execute(
    "SELECT id, name, nameHe, category, subCategory, gender, color, material, pattern FROM catalogItems WHERE imageUrl IS NULL ORDER BY id"
  );
  
  log(`Found ${items.length} items without images. Starting...`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const genderLabel = item.gender === "male" ? "men's" : "women's";
      const prompt = `Professional e-commerce product photo of a ${genderLabel} ${item.name}, ${item.color} color, ${item.material || ""} material, ${item.pattern || "solid"} pattern. Clean white background, studio lighting, high quality fashion photography. No model, just the product laid flat or on invisible mannequin.`;
      
      log(`[${i+1}/${items.length}] Generating: ${item.name} (${item.gender}, id=${item.id})...`);
      
      const imageBuffer = await generateImageViaForge(prompt);
      
      // Upload to S3
      const safeName = item.name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 60);
      const key = `catalog/${item.gender}/${item.category}/${safeName}_${item.id}.png`;
      const newUrl = await storagePut(key, imageBuffer, "image/png");
      
      // Update DB
      await conn.execute("UPDATE catalogItems SET imageUrl = ? WHERE id = ?", [newUrl, item.id]);
      
      log(`OK: [${item.id}] ${item.name} → ${newUrl.substring(0, 70)}...`);
      success++;
      
      // Small delay
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      log(`FAIL: [${item.id}] ${item.name}: ${err.message.substring(0, 150)}`);
      failed++;
      // Wait a bit longer on failure
      await new Promise(r => setTimeout(r, 1000));
    }
    
    if ((i + 1) % 25 === 0) {
      log(`=== Progress: ${i+1}/${items.length} (${success} ok, ${failed} failed) ===`);
    }
  }
  
  log(`=== DONE: ${success} generated, ${failed} failed out of ${items.length} ===`);
  await conn.end();
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
