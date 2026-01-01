import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigration(filename: string) {
  const migrationPath = join(__dirname, '..', 'lib', 'migrations', filename);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  console.log(`Running migration: ${filename}`);
  
  try {
    await pool.query(sql);
    console.log(`✓ Migration ${filename} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${filename} failed:`, error);
    throw error;
  }
}

async function main() {
  try {
    await runMigration('001_add_import_account_id.sql');
    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('\n✗ Migration failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
