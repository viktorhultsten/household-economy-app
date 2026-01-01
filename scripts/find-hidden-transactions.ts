import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function findHiddenTransactions() {
  console.log('🔍 Searching for transactions that might be hidden in the UI...\n');

  // 1. Check for transactions without any posts
  const noPostsTxns = await pool.query(
    `
    SELECT t.id, t.date, t.description, t.bank_event_id
    FROM transactions t
    WHERE NOT EXISTS (
      SELECT 1 FROM posts p WHERE p.transaction_id = t.id
    )
    ORDER BY t.date DESC
    LIMIT 10
    `
  );

  if (noPostsTxns.rows.length > 0) {
    console.log(`⚠️  Found ${noPostsTxns.rows.length} transaction(s) WITHOUT any posts (invalid state):\n`);
    noPostsTxns.rows.forEach(txn => {
      console.log(`  Transaction ID: ${txn.id}`);
      console.log(`  Date: ${txn.date}`);
      console.log(`  Description: ${txn.description}`);
      console.log(`  Bank Event ID: ${txn.bank_event_id || 'None'}`);
      console.log();
    });
  }

  // 2. Check for posts with invalid account references
  const invalidAccounts = await pool.query(
    `
    SELECT p.id as post_id, p.transaction_id, p.account_id, t.date, t.description
    FROM posts p
    JOIN transactions t ON t.id = p.transaction_id
    WHERE NOT EXISTS (
      SELECT 1 FROM accounts a WHERE a.id = p.account_id
    )
    ORDER BY t.date DESC
    LIMIT 10
    `
  );

  if (invalidAccounts.rows.length > 0) {
    console.log(`⚠️  Found ${invalidAccounts.rows.length} post(s) with INVALID account references:\n`);
    invalidAccounts.rows.forEach(post => {
      console.log(`  Transaction ID: ${post.transaction_id}`);
      console.log(`  Post ID: ${post.post_id}, Account ID: ${post.account_id} (doesn't exist)`);
      console.log(`  Date: ${post.date}`);
      console.log(`  Description: ${post.description}`);
      console.log();
    });
  }

  // 3. Check all transactions and compare with what the UI query would return
  const allTransactions = await pool.query(
    `
    SELECT COUNT(*) as total
    FROM transactions
    `
  );

  const uiTransactions = await pool.query(
    `
    SELECT COUNT(DISTINCT t.id) as visible
    FROM transactions t
    JOIN posts p ON p.transaction_id = t.id
    JOIN accounts a ON a.id = p.account_id
    JOIN groups g ON g.id = a.group_id
    `
  );

  console.log('📊 Transaction Count Comparison:\n');
  console.log(`  Total transactions in DB: ${allTransactions.rows[0].total}`);
  console.log(`  Transactions visible in UI: ${uiTransactions.rows[0].visible}`);

  const hidden = allTransactions.rows[0].total - uiTransactions.rows[0].visible;
  if (hidden > 0) {
    console.log(`  ⚠️  HIDDEN transactions: ${hidden}\n`);
  } else {
    console.log(`  ✅ All transactions are visible\n`);
  }

  // 4. Show recent transactions with full details
  console.log('📋 Recent Transactions (full details):\n');
  const recentTxns = await pool.query(
    `
    SELECT
      t.id,
      t.date,
      t.description,
      t.bank_event_id,
      COUNT(p.id) as post_count,
      array_agg(p.account_id) as account_ids
    FROM transactions t
    LEFT JOIN posts p ON p.transaction_id = t.id
    GROUP BY t.id, t.date, t.description, t.bank_event_id
    ORDER BY t.date DESC, t.id DESC
    LIMIT 10
    `
  );

  recentTxns.rows.forEach(txn => {
    const status = txn.post_count === 0 ? '❌ NO POSTS' : `✅ ${txn.post_count} posts`;
    console.log(`  ID ${txn.id}: ${txn.date} - ${txn.description}`);
    console.log(`    Status: ${status}`);
    if (txn.post_count > 0) {
      console.log(`    Accounts: ${txn.account_ids.join(', ')}`);
    }
    console.log();
  });

  // 5. Check for the specific transaction linked to Import 6
  const import6Txn = await pool.query(
    `
    SELECT
      t.id as txn_id,
      t.date,
      t.description,
      be.id as event_id,
      be.description as event_desc,
      be.amount,
      COUNT(p.id) as post_count
    FROM bank_events be
    LEFT JOIN transactions t ON t.id = be.transaction_id
    LEFT JOIN posts p ON p.transaction_id = t.id
    WHERE be.import_id = 6 AND be.is_posted = 1
    GROUP BY t.id, t.date, t.description, be.id, be.description, be.amount
    `
  );

  if (import6Txn.rows.length > 0) {
    console.log('🔍 Transaction linked to Import 6 (the one that says "Bokförd"):\n');
    import6Txn.rows.forEach(row => {
      console.log(`  Bank Event ID: ${row.event_id}`);
      console.log(`  Event Description: ${row.event_desc}`);
      console.log(`  Event Amount: ${row.amount}`);
      console.log(`  Transaction ID: ${row.txn_id}`);
      console.log(`  Transaction Date: ${row.date}`);
      console.log(`  Transaction Description: ${row.description}`);
      console.log(`  Posts Count: ${row.post_count}`);

      if (row.post_count === 0) {
        console.log(`  ⚠️  THIS TRANSACTION HAS NO POSTS - IT WILL BE INVISIBLE IN UI`);
      }
      console.log();
    });
  }

  await pool.end();
}

findHiddenTransactions().catch(err => {
  console.error('Error:', err);
  pool.end();
  process.exit(1);
});
