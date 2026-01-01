import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function cleanupOrphanedBankEvents() {
  console.log('🔍 Searching for orphaned bank events...\n');

  // Find bank events with transaction_id that don't exist in transactions table
  const result = await pool.query<{ id: number; transaction_id: number; description: string; date: string }>(
    `
    SELECT be.id, be.transaction_id, be.description, be.date
    FROM bank_events be
    WHERE be.transaction_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM transactions t WHERE t.id = be.transaction_id
    )
    ORDER BY be.date DESC
    `
  );

  const orphanedEvents = result.rows;

  if (orphanedEvents.length === 0) {
    console.log('✅ No orphaned bank events found. Database is clean!');
    return 0;
  }

  console.log(`⚠️  Found ${orphanedEvents.length} orphaned bank event(s):\n`);

  orphanedEvents.forEach((event, index) => {
    console.log(`  ${index + 1}. Bank Event ID: ${event.id}`);
    console.log(`     Transaction ID (orphaned): ${event.transaction_id}`);
    console.log(`     Date: ${event.date}`);
    console.log(`     Description: ${event.description}`);
    console.log();
  });

  console.log('🧹 Cleaning up orphaned references...\n');

  // Clean up by setting transaction_id to NULL and is_posted to 0
  await pool.query(
    `
    UPDATE bank_events
    SET transaction_id = NULL, is_posted = 0
    WHERE id = ANY($1)
    `,
    [orphanedEvents.map(e => e.id)]
  );

  console.log(`✅ Successfully cleaned up ${orphanedEvents.length} orphaned bank event(s)`);
  console.log('   - Set transaction_id to NULL');
  console.log('   - Set is_posted to 0 (unposted)');
  console.log('\nYou can now delete the import without issues.');

  return orphanedEvents.length;
}

async function main() {
  try {
    const count = await cleanupOrphanedBankEvents();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
