/**
 * Fetch product images using DuckDuckGo image search (no API key needed)
 * Downloads images and uploads to S3.
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

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const catalogPath = path.join(__dirname, "catalog-data.json");
const queriesPath = path.join(__dirname, "image-queries.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
const queries = JSON.parse(fs.readFileSync(queriesPath, "utf-8"));

let s3Client = null;
async function getS3() {
  if (s3Client) return s3Client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

async function uploadToS3(buffer, key, contentType) {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = await getS3();
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

// DuckDuckGo image search - no API key needed
async function searchDDGImages(query) {
  // First get the vqd token
  const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const tokenRes = await fetch(tokenUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  const html = await tokenRes.text();
  const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
  if (!vqdMatch) return null;
  const vqd = vqdMatch[1];

  // Now search images
  const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=size:Medium,type:photo&p=1`;
  const searchRes = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://duckduckgo.com/",
    },
  });
  if (!searchRes.ok) return null;
  const data = await searchRes.json();
  if (!data.results || data.results.length === 0) return null;
  
  // Return first 3 image URLs to try
  return data.results.slice(0, 3).map(r => r.image);
}

async function downloadImage(imageUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) throw new Error(`Not image: ${ct}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 2000) throw new Error("Too small");
    if (buffer.length > 5000000) throw new Error("Too large");
    return { buffer, contentType: ct };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function processItem(queryObj, i) {
  const item = catalog[queryObj.idx];
  if (!item) return false;
  if (item.imageUrl) return true; // already done

  const query = queryObj.query + " product photo";
  try {
    const imageUrls = await searchDDGImages(query);
    if (!imageUrls) {
      console.log(`  [${i}] No results: ${queryObj.name}`);
      return false;
    }

    // Try each URL
    for (const url of imageUrls) {
      try {
        const { buffer, contentType } = await downloadImage(url);
        const ext = contentType.includes("png") ? "png" : "jpg";
        const safeName = queryObj.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
        const key = `catalog/${queryObj.gender}/${queryObj.category}/${safeName}_${Date.now()}.${ext}`;
        const s3Url = await uploadToS3(buffer, key, contentType);
        
        item.imageUrl = s3Url;
        console.log(`  [${i}] ✓ ${queryObj.name}`);
        return true;
      } catch (e) {
        continue; // try next URL
      }
    }
    console.log(`  [${i}] ✗ All URLs failed: ${queryObj.name}`);
    return false;
  } catch (e) {
    console.log(`  [${i}] ✗ ${queryObj.name}: ${e.message}`);
    return false;
  }
}

async function main() {
  const done = queries.filter(q => catalog[q.idx]?.imageUrl).length;
  console.log(`Starting: ${done}/${queries.length} already have images`);

  let success = done;
  let failed = 0;

  // Process sequentially with small delay to avoid rate limiting
  for (let i = 0; i < queries.length; i++) {
    if (catalog[queries[i].idx]?.imageUrl) continue;
    
    const ok = await processItem(queries[i], i);
    if (ok) success++;
    else failed++;

    // Save every 10 items
    if ((success + failed) % 10 === 0) {
      fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
      console.log(`Progress: ${success} success, ${failed} failed out of ${queries.length}`);
    }

    // Small delay
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`\n=== DONE: ${success}/${queries.length} items have images (${failed} failed) ===`);
}

main().catch(console.error);
