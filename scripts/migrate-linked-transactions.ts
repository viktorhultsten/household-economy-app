import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigration() {
  console.log('📦 Running linked transactions migration...\n');

  try {
    const migrationSQL = readFileSync(
      join(process.cwd(), 'lib/migrations/add_linked_transactions.sql'),
      'utf-8'
    );

    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Added columns:');
    console.log('  - transactions.original_transaction_id');
    console.log('  - transactions.period_shift_date');
    console.log('  - transactions.bridge_account_id');

    await pool.end();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
