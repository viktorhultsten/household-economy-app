import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pool = new Pool({ connectionString });

async function findIssue() {
  console.log('🔍 Looking for inconsistent bank events...\n');

  // Case 1: Events marked as posted but with no transaction_id
  const case1 = await pool.query(
    `
    SELECT be.*, i.filename
    FROM bank_events be
    JOIN imports i ON i.id = be.import_id
    WHERE be.is_posted = 1 AND be.transaction_id IS NULL
    ORDER BY be.import_id, be.id
    `
  );

  if (case1.rows.length > 0) {
    console.log(`⚠️  Found ${case1.rows.length} events marked as posted but with no transaction:\n`);
    case1.rows.forEach(event => {
      console.log(`  Import: ${event.import_id} (${event.filename})`);
      console.log(`  Event ID: ${event.id}, Description: ${event.description}`);
      console.log(`  is_posted: ${event.is_posted}, transaction_id: ${event.transaction_id}`);
      console.log();
    });
  }

  // Case 2: Events with transaction_id but not marked as posted
  const case2 = await pool.query(
    `
    SELECT be.*, i.filename
    FROM bank_events be
    JOIN imports i ON i.id = be.import_id
    WHERE be.is_posted = 0 AND be.transaction_id IS NOT NULL
    ORDER BY be.import_id, be.id
    `
  );

  if (case2.rows.length > 0) {
    console.log(`⚠️  Found ${case2.rows.length} events with transaction but not marked as posted:\n`);
    case2.rows.forEach(event => {
      console.log(`  Import: ${event.import_id} (${event.filename})`);
      console.log(`  Event ID: ${event.id}, Description: ${event.description}`);
      console.log(`  is_posted: ${event.is_posted}, transaction_id: ${event.transaction_id}`);
      console.log();
    });
  }

  // Case 3: Show import summary
  const imports = await pool.query(
    `
    SELECT
      i.id,
      i.filename,
      COUNT(be.id) as total_events,
      SUM(CASE WHEN be.is_posted = 1 THEN 1 ELSE 0 END) as posted_count,
      SUM(CASE WHEN be.transaction_id IS NOT NULL THEN 1 ELSE 0 END) as with_txn_id
    FROM imports i
    LEFT JOIN bank_events be ON be.import_id = i.id
    GROUP BY i.id, i.filename
    ORDER BY i.id
    `
  );

  console.log('\n📊 Import Summary:\n');
  imports.rows.forEach(imp => {
    const mismatch = imp.posted_count !== imp.with_txn_id;
    const indicator = mismatch ? '⚠️ ' : '✅';
    console.log(`${indicator} Import ${imp.id}: ${imp.filename}`);
    console.log(`   Total: ${imp.total_events}, Posted: ${imp.posted_count}, With txn_id: ${imp.with_txn_id}`);
    if (mismatch) {
      console.log(`   ⚠️  Mismatch! Posted count (${imp.posted_count}) != Transaction ID count (${imp.with_txn_id})`);
    }
    console.log();
  });

  await pool.end();
}

findIssue().catch(err => {
  console.error('Error:', err);
  pool.end();
  process.exit(1);
});
