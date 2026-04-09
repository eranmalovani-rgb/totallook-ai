// Test script: upload image → analyze → capture Stage 2 output
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const IMAGE_PATH = '/home/ubuntu/webdev-static-assets/test-outfit.jpg';
const FINGERPRINT = 'test-debug-' + Date.now();

async function callTRPC(procedure, input, method = 'POST') {
  const url = method === 'GET'
    ? `${BASE_URL}/api/trpc/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{"json":input}}))}`
    : `${BASE_URL}/api/trpc/${procedure}?batch=1`;
  
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (method === 'POST') opts.body = JSON.stringify({"0":{"json":input}});
  
  const res = await fetch(url, opts);
  const data = await res.json();
  if (data[0]?.error) throw new Error(JSON.stringify(data[0].error));
  return data[0]?.result?.data?.json;
}

async function run() {
  console.log('=== STEP 1: Upload Image ===');
  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const imageBase64 = imageBuffer.toString('base64');
  
  const uploadResult = await callTRPC('guest.upload', {
    imageBase64,
    mimeType: 'image/jpeg',
    fingerprint: FINGERPRINT,
  });
  console.log('Session ID:', uploadResult.sessionId);
  console.log('Image URL:', uploadResult.imageUrl);

  console.log('\n=== STEP 2: Run Analysis ===');
  const startTime = Date.now();
  const result = await callTRPC('guest.analyze', {
    sessionId: uploadResult.sessionId,
    lang: 'he',
    occasion: 'everyday',
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Analysis completed in ${elapsed}s`);

  // Stage 1
  console.log('\n=== STAGE 1 ===');
  console.log('Score:', result.overallScore);
  console.log('Summary (first 200 chars):', result.summary?.substring(0, 200));
  console.log('Items:', result.items?.length);

  // Stage 2 - improvements
  console.log('\n=== STAGE 2 - IMPROVEMENTS ===');
  if (result.improvements?.length > 0) {
    result.improvements.forEach((imp, i) => {
      console.log(`\n--- Improvement ${i + 1} ---`);
      console.log('  TITLE:', imp.title);
      console.log('  TITLE WORDS:', imp.title?.split(/\s+/).length);
      console.log('  TITLE LANG:', /[\u0590-\u05FF]/.test(imp.title) ? 'Hebrew' : 'English/Other');
      console.log('  Description:', imp.description?.substring(0, 120));
      console.log('  productSearchQuery:', imp.productSearchQuery);
      console.log('  beforeLabel:', imp.beforeLabel);
      console.log('  afterLabel:', imp.afterLabel);
      if (imp.shoppingLinks?.length > 0) {
        imp.shoppingLinks.forEach((link, j) => {
          console.log(`  Link ${j + 1}: store=${link.store} | image=${link.imageUrl ? 'YES' : 'NO'} | price=${link.price}`);
          if (link.imageUrl) console.log(`    imageUrl: ${link.imageUrl.substring(0, 100)}`);
        });
      }
    });

    // DEDUP CHECKS
    console.log('\n=== DEDUP ANALYSIS ===');
    const titles = result.improvements.map(i => i.title);
    console.log('Titles:', titles);
    console.log('Unique titles:', [...new Set(titles)].length, '/', titles.length);

    const allImages = [];
    result.improvements.forEach(imp => {
      imp.shoppingLinks?.forEach(link => {
        if (link.imageUrl) allImages.push(link.imageUrl);
      });
    });
    console.log('Total images:', allImages.length);
    console.log('Unique images:', new Set(allImages).size);
    
    // Find duplicates
    const imgCount = {};
    allImages.forEach(url => { imgCount[url] = (imgCount[url] || 0) + 1; });
    const dupes = Object.entries(imgCount).filter(([_, c]) => c > 1);
    if (dupes.length > 0) {
      console.log('⚠️ DUPLICATE IMAGES:');
      dupes.forEach(([url, c]) => console.log(`  ${c}x: ${url.substring(0, 80)}`));
    } else {
      console.log('✅ No duplicate images');
    }
  }

  // Save full result
  fs.writeFileSync('/home/ubuntu/test-analysis-result.json', JSON.stringify(result, null, 2));
  console.log('\nFull result saved to /home/ubuntu/test-analysis-result.json');
}

run().catch(err => {
  console.error('FATAL:', err.message?.substring(0, 500));
  process.exit(1);
});
