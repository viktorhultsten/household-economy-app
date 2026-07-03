import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load DATABASE_URL from the project-root .env file.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set. Copy .env.local.example to .env and fill it in.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetDatabase() {
  const client = await pool.connect();

  try {
    console.log('🗑️  Dropping all tables...');

    // Drop all tables in correct order (respecting foreign keys)
    await client.query(`
      DROP TABLE IF EXISTS transaction_recurring_items CASCADE;
      DROP TABLE IF EXISTS recurring_items CASCADE;
      DROP TABLE IF EXISTS template_rows CASCADE;
      DROP TABLE IF EXISTS booking_templates CASCADE;
      DROP TABLE IF EXISTS period_locks CASCADE;
      DROP TABLE IF EXISTS posts CASCADE;
      DROP TABLE IF EXISTS bank_events CASCADE;
      DROP TABLE IF EXISTS transactions CASCADE;
      DROP TABLE IF EXISTS imports CASCADE;
      DROP TABLE IF EXISTS accounts CASCADE;
      DROP TABLE IF EXISTS groups CASCADE;
    `);

    console.log('✓ All tables dropped');
    console.log('📝 Creating tables from schema...');

    // Read and execute schema file
    const schemaPath = path.join(__dirname, '..', 'lib', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schema);

    console.log('✓ All tables created');
    console.log('🎉 Database reset complete!');

    // Verify recurring_items has active_months column
    const verification = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'recurring_items'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 recurring_items table structure:');
    verification.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch(console.error);
