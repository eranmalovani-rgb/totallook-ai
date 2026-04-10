/**
 * Fetch product images from Google Custom Search for each catalog item,
 * download the JPEG, upload to S3, and update the catalog JSON.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) {
  console.error("Missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX");
  process.exit(1);
}

const catalogPath = path.join(process.cwd(), "scripts", "catalog-data.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));

// S3 upload via AWS SDK
async function uploadToS3(buffer, key, contentType) {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function searchGoogleImage(query) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=3&imgSize=medium&imgType=photo&safe=active`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API ${res.status}: ${text}`);
  }
  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;
  // Return first image URL
  return data.items[0].link;
}

async function downloadImage(imageUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error(`Not an image: ${contentType}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) throw new Error("Image too small");
    return { buffer, contentType };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function processItem(item, index) {
  if (item.imageUrl) return; // Already has image

  const query = item.productSearchQuery || `${item.name} ${item.brand} product photo`;
  
  try {
    const googleImageUrl = await searchGoogleImage(query);
    if (!googleImageUrl) {
      console.log(`  [${index}] No image found for: ${query}`);
      return;
    }

    const { buffer, contentType } = await downloadImage(googleImageUrl);
    const ext = contentType.includes("png") ? "png" : "jpg";
    const key = `catalog/${item.gender}/${item.category}/${index}-${Date.now()}.${ext}`;
    const s3Url = await uploadToS3(buffer, key, contentType);
    
    item.imageUrl = s3Url;
    console.log(`  [${index}] ✓ ${item.name} → ${s3Url.substring(0, 60)}...`);
  } catch (e) {
    console.log(`  [${index}] ✗ ${item.name}: ${e.message}`);
  }
}

async function main() {
  const startIndex = catalog.findIndex((item) => !item.imageUrl);
  console.log(`Total items: ${catalog.length}`);
  console.log(`Items with images: ${catalog.filter((i) => i.imageUrl).length}`);
  console.log(`Starting from index: ${startIndex}`);

  // Process in batches of 5 (Google CSE has rate limits)
  const BATCH_SIZE = 5;
  for (let i = Math.max(0, startIndex); i < catalog.length; i += BATCH_SIZE) {
    const batch = catalog.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((item, j) => processItem(item, i + j)));
    
    // Save progress every batch
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    
    const done = catalog.filter((x) => x.imageUrl).length;
    if (i % 50 === 0) {
      console.log(`Progress: ${done}/${catalog.length} images (${Math.round(done / catalog.length * 100)}%)`);
    }
    
    // Rate limit: Google CSE allows 100 queries/day on free tier, 10K on paid
    // Small delay between batches
    await new Promise((r) => setTimeout(r, 200));
  }

  const withImages = catalog.filter((x) => x.imageUrl).length;
  console.log(`\n=== DONE: ${withImages}/${catalog.length} items have images ===`);
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
}

main().catch(console.error);
