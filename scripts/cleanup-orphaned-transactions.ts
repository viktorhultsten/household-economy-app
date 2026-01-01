import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function cleanupOrphanedTransactions() {
  console.log('🔍 Searching for orphaned transactions (transactions without posts)...\n');

  // Find transactions without any posts
  const orphanedTxns = await pool.query(
    `
    SELECT t.id, t.date, t.description, t.bank_event_id
    FROM transactions t
    WHERE NOT EXISTS (
      SELECT 1 FROM posts p WHERE p.transaction_id = t.id
    )
    ORDER BY t.date DESC
    `
  );

  if (orphanedTxns.rows.length === 0) {
    console.log('✅ No orphaned transactions found. Database is clean!');
    await pool.end();
    return 0;
  }

  console.log(`⚠️  Found ${orphanedTxns.rows.length} orphaned transaction(s):\n`);

  orphanedTxns.rows.forEach((txn, index) => {
    console.log(`  ${index + 1}. Transaction ID: ${txn.id}`);
    console.log(`     Date: ${txn.date}`);
    console.log(`     Description: ${txn.description}`);
    console.log(`     Bank Event ID: ${txn.bank_event_id || 'None'}`);
    console.log();
  });

  console.log('🧹 Cleaning up orphaned transactions...\n');

  // For each orphaned transaction:
  // 1. Unmark any linked bank events
  // 2. Delete the transaction
  for (const txn of orphanedTxns.rows) {
    if (txn.bank_event_id) {
      await pool.query(
        `UPDATE bank_events SET is_posted = 0, transaction_id = NULL WHERE id = $1`,
        [txn.bank_event_id]
      );
      console.log(`  ✓ Unmarked bank event ${txn.bank_event_id}`);
    }

    await pool.query(
      `DELETE FROM transactions WHERE id = $1`,
      [txn.id]
    );
    console.log(`  ✓ Deleted transaction ${txn.id}`);
  }

  console.log();
  console.log(`✅ Successfully cleaned up ${orphanedTxns.rows.length} orphaned transaction(s)`);
  console.log('   - Unmarked associated bank events (set to unposted)');
  console.log('   - Deleted invalid transactions');
  console.log('\nThe transactions are now visible and can be re-booked properly.');

  await pool.end();
  return orphanedTxns.rows.length;
}

cleanupOrphanedTransactions().catch(err => {
  console.error('❌ Error during cleanup:', err);
  pool.end();
  process.exit(1);
});
