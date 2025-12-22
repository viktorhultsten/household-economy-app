import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Starting migration: Adding active_months column...');

    const result = await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'recurring_items'
          AND column_name = 'active_months'
        ) THEN
          ALTER TABLE recurring_items
          ADD COLUMN active_months INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10,11,12];

          RAISE NOTICE 'Added active_months column to recurring_items table';
        ELSE
          RAISE NOTICE 'active_months column already exists';
        END IF;
      END $$;
    `);

    console.log('Migration completed successfully!');
    console.log('Verifying column exists...');

    const verification = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'recurring_items'
      AND column_name = 'active_months';
    `);

    if (verification.rows.length > 0) {
      console.log('✓ Column verified:', verification.rows[0]);
    } else {
      console.error('✗ Column not found after migration');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
