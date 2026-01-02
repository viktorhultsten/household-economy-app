import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigration() {
  const migrationPath = join(__dirname, '..', 'migrations', 'add_custom_result_views.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('Running migration: add_custom_result_views.sql');

  try {
    await pool.query(sql);
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await runMigration();
    console.log('\n✓ Custom result views tables created successfully');
  } catch (error) {
    console.error('\n✗ Migration failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
