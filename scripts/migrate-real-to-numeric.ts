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
    console.log('Starting migration: Converting REAL to NUMERIC(15, 2)...');
    console.log('This fixes floating-point precision issues causing rounding errors.\n');

    const result = await client.query(`
      DO $$
      BEGIN
        -- Convert bank_events.amount from REAL to NUMERIC(15, 2)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bank_events'
          AND column_name = 'amount'
          AND data_type = 'real'
        ) THEN
          ALTER TABLE bank_events
          ALTER COLUMN amount TYPE NUMERIC(15, 2);

          RAISE NOTICE 'Converted bank_events.amount to NUMERIC(15, 2)';
        ELSE
          RAISE NOTICE 'bank_events.amount already NUMERIC or does not exist';
        END IF;

        -- Convert posts.debet from REAL to NUMERIC(15, 2)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'posts'
          AND column_name = 'debet'
          AND data_type = 'real'
        ) THEN
          ALTER TABLE posts
          ALTER COLUMN debet TYPE NUMERIC(15, 2);

          RAISE NOTICE 'Converted posts.debet to NUMERIC(15, 2)';
        ELSE
          RAISE NOTICE 'posts.debet already NUMERIC or does not exist';
        END IF;

        -- Convert posts.kredit from REAL to NUMERIC(15, 2)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'posts'
          AND column_name = 'kredit'
          AND data_type = 'real'
        ) THEN
          ALTER TABLE posts
          ALTER COLUMN kredit TYPE NUMERIC(15, 2);

          RAISE NOTICE 'Converted posts.kredit to NUMERIC(15, 2)';
        ELSE
          RAISE NOTICE 'posts.kredit already NUMERIC or does not exist';
        END IF;
      END $$;
    `);

    console.log('\nMigration completed successfully!');
    console.log('Verifying column types...\n');

    const verification = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name IN ('bank_events', 'posts')
      AND column_name IN ('amount', 'debet', 'kredit')
      ORDER BY table_name, column_name;
    `);

    console.log('Column types after migration:');
    verification.rows.forEach(row => {
      const precision = row.data_type === 'numeric'
        ? `(${row.numeric_precision}, ${row.numeric_scale})`
        : '';
      console.log(`  ✓ ${row.table_name}.${row.column_name}: ${row.data_type}${precision}`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
