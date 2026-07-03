/**
 * Verifies the Drizzle migrations by applying them to a fresh, empty database.
 *
 * Creates a throwaway database (default: `economy_migration_test`) on the same
 * Postgres server as `DATABASE_URL`, runs every generated migration in
 * `./drizzle` against it, then drops it again. This proves the initial
 * migration is self-contained and can build the whole schema from scratch.
 *
 * Run with: npm run db:migrate:test
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getMaintenanceConnectionString } from "./dev-db";

const TEST_DB_NAME = process.env.TEST_DB_NAME || "economy_migration_test";

function testConnectionString(): string {
  const url = new URL(getMaintenanceConnectionString());
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

async function migrateTestDb() {
  const maintenance = new Pool({ connectionString: getMaintenanceConnectionString() });
  try {
    console.log(`🗑️  Dropping existing "${TEST_DB_NAME}" (if any)...`);
    await maintenance.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()`,
      [TEST_DB_NAME]
    );
    // Identifier can't be parameterized; TEST_DB_NAME is controlled locally.
    await maintenance.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);

    console.log(`📦 Creating empty "${TEST_DB_NAME}"...`);
    await maintenance.query(`CREATE DATABASE "${TEST_DB_NAME}" TEMPLATE template0`);
  } finally {
    await maintenance.end();
  }

  const pool = new Pool({ connectionString: testConnectionString() });
  try {
    console.log(`⚙️  Applying migrations from ./drizzle to "${TEST_DB_NAME}"...`);
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });

    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name <> '__drizzle_migrations'
        ORDER BY table_name`
    );
    console.log(`✅ Migration succeeded. ${tables.rows.length} tables created:`);
    tables.rows.forEach((row) => console.log(`  - ${row.table_name}`));
  } finally {
    await pool.end();
  }

  const cleanup = new Pool({ connectionString: getMaintenanceConnectionString() });
  try {
    console.log(`🧹 Dropping "${TEST_DB_NAME}"...`);
    await cleanup.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
    console.log("🎉 Done. The initial migration is self-contained.");
  } finally {
    await cleanup.end();
  }
}

migrateTestDb().catch((error) => {
  console.error("❌ Migration test failed:", error);
  process.exit(1);
});
