import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function diagnoseImports() {
  console.log('🔍 Diagnosing imports and bank events...\n');

  // Get all imports with their event counts
  const imports = await pool.query(
    `
    SELECT
      i.id,
      i.filename,
      i.imported_at,
      COUNT(be.id) as total_events,
      SUM(CASE WHEN be.is_posted = 1 THEN 1 ELSE 0 END) as posted_events
    FROM imports i
    LEFT JOIN bank_events be ON be.import_id = i.id
    GROUP BY i.id, i.filename, i.imported_at
    ORDER BY i.id DESC
    LIMIT 10
    `
  );

  console.log('📋 Recent Imports:\n');
  for (const imp of imports.rows) {
    console.log(`Import ID: ${imp.id}`);
    console.log(`  Filename: ${imp.filename}`);
    console.log(`  Imported: ${imp.imported_at}`);
    console.log(`  Total Events: ${imp.total_events}`);
    console.log(`  Posted Events: ${imp.posted_events}`);

    // Check for orphaned references in this import
    const orphaned = await pool.query(
      `
      SELECT be.id, be.transaction_id, be.description
      FROM bank_events be
      WHERE be.import_id = $1
      AND be.transaction_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM transactions t WHERE t.id = be.transaction_id
      )
      `,
      [imp.id]
    );

    if (orphaned.rows.length > 0) {
      console.log(`  ⚠️  ORPHANED EVENTS: ${orphaned.rows.length}`);
      orphaned.rows.forEach(event => {
        console.log(`    - Event ID ${event.id}: transaction_id=${event.transaction_id} (doesn't exist)`);
        console.log(`      Description: ${event.description}`);
      });
    }

    // Check for events that reference transactions
    const withTxn = await pool.query(
      `
      SELECT
        be.id as event_id,
        be.transaction_id,
        be.description as event_desc,
        t.id as txn_id,
        t.description as txn_desc
      FROM bank_events be
      LEFT JOIN transactions t ON t.id = be.transaction_id
      WHERE be.import_id = $1 AND be.transaction_id IS NOT NULL
      LIMIT 5
      `,
      [imp.id]
    );

    if (withTxn.rows.length > 0) {
      console.log(`  📎 Events with transactions: ${withTxn.rows.length}`);
      withTxn.rows.forEach(row => {
        const status = row.txn_id ? '✅ EXISTS' : '❌ MISSING';
        console.log(`    - Event ${row.event_id} → Transaction ${row.transaction_id} ${status}`);
      });
    }

    console.log();
  }

  // Check for any transaction that references a bank_event that doesn't exist
  const txnOrphans = await pool.query(
    `
    SELECT t.id, t.description, t.bank_event_id
    FROM transactions t
    WHERE t.bank_event_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM bank_events be WHERE be.id = t.bank_event_id
    )
    LIMIT 5
    `
  );

  if (txnOrphans.rows.length > 0) {
    console.log('⚠️  Transactions with orphaned bank_event_id references:');
    txnOrphans.rows.forEach(txn => {
      console.log(`  - Transaction ${txn.id}: bank_event_id=${txn.bank_event_id} (doesn't exist)`);
    });
    console.log();
  }

  await pool.end();
}

diagnoseImports().catch(err => {
  console.error('Error:', err);
  pool.end();
  process.exit(1);
});
