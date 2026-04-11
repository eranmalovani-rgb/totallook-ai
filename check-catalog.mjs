import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [recentReview] = await conn.execute(
  "SELECT id, analysisJson FROM reviews WHERE analysisJson IS NOT NULL ORDER BY id DESC LIMIT 3"
);

for (const rev of recentReview) {
  const analysis = typeof rev.analysisJson === 'string' ? JSON.parse(rev.analysisJson) : rev.analysisJson;
  console.log('\n=== Review #' + rev.id + ' Improvements ===');
  if (analysis.improvements) {
    analysis.improvements.forEach((imp, i) => {
      const altCount = imp.alternatives ? imp.alternatives.length : 0;
      console.log('[' + i + '] ' + (imp.title || '').substring(0, 60));
      console.log('    alternatives: ' + altCount);
      if (imp.alternatives) {
        imp.alternatives.forEach((alt, j) => {
          console.log('      alt[' + j + ']: ' + alt.afterLabel + ' (image: ' + (alt.upgradeImageUrl ? 'YES' : 'NO') + ')');
        });
      }
      console.log('    primaryImage: ' + (imp.upgradeImageUrl ? 'YES' : 'NO'));
    });
  } else {
    console.log('  No improvements found');
  }
}

await conn.end();
