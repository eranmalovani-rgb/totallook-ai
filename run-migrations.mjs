import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DRIZZLE_DIR = './drizzle';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get already applied migrations
  const [applied] = await conn.query('SELECT hash FROM __drizzle_migrations ORDER BY created_at');
  const appliedHashes = new Set(applied.map(r => r.hash));
  console.log(`Found ${appliedHashes.size} already applied migration(s)`);

  // Read journal
  const journal = JSON.parse(fs.readFileSync(path.join(DRIZZLE_DIR, 'meta/_journal.json'), 'utf8'));
  
  let appliedCount = 0;
  
  for (const entry of journal.entries) {
    const sqlFile = path.join(DRIZZLE_DIR, `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');
    
    if (appliedHashes.has(hash)) {
      console.log(`  [SKIP] ${entry.tag} (already applied)`);
      continue;
    }
    
    console.log(`  [APPLY] ${entry.tag}...`);
    
    // Split by statement breakpoints
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    try {
      for (const stmt of statements) {
        // Skip empty statements
        if (!stmt || stmt === '--') continue;
        // Remove leading/trailing comments and whitespace
        const cleanStmt = stmt.replace(/^--.*$/gm, '').trim();
        if (!cleanStmt) continue;
        
        await conn.query(cleanStmt);
      }
      
      // Record migration
      await conn.query(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        [hash, Date.now()]
      );
      
      appliedCount++;
      console.log(`    ✓ Applied successfully`);
    } catch (err) {
      // Check if error is "table/column already exists" — skip gracefully
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log(`    ⚠ Already exists, recording as applied`);
        await conn.query(
          'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
          [hash, Date.now()]
        );
        appliedCount++;
      } else {
        console.error(`    ✗ Failed: ${err.message}`);
        console.error(`    SQL: ${stmt}`);
        throw err;
      }
    }
  }
  
  console.log(`\nDone! Applied ${appliedCount} new migration(s).`);
  
  // Verify tables
  const [tables] = await conn.query('SHOW TABLES');
  console.log(`\nTotal tables in database: ${tables.length}`);
  tables.forEach(t => {
    const name = Object.values(t)[0];
    console.log(`  - ${name}`);
  });
  
  await conn.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
