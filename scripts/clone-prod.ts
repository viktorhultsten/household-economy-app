import { Pool } from "pg";
import { DEV_DB_NAME, getMaintenanceConnectionString, getProdDbName } from "./dev-db";

/**
 * Copies the production database into the local development database by cloning
 * it with `CREATE DATABASE <dev> TEMPLATE <prod>`. The result is an exact copy
 * of production: schema, all rows, sequences, constraints and indexes.
 *
 * Postgres requires that no sessions are connected to the template (source)
 * database during the copy, and none to the dev database while it is dropped.
 * This script therefore terminates other connections to both first — a running
 * app will momentarily lose its pooled connections to production and reconnect.
 *
 * Read-only against production data: it never writes to the prod database.
 */
async function cloneProdToDev() {
  const prodDb = getProdDbName();

  if (prodDb === DEV_DB_NAME) {
    throw new Error(
      `Refusing to clone: source and target are both "${prodDb}". Set DEV_DB_NAME to a different name.`
    );
  }

  const pool = new Pool({ connectionString: getMaintenanceConnectionString() });
  try {
    console.log(`🔌 Terminating other connections to "${prodDb}" and "${DEV_DB_NAME}"...`);
    await pool.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = ANY($1)
          AND pid <> pg_backend_pid()`,
      [[prodDb, DEV_DB_NAME]]
    );

    console.log(`🗑️  Dropping existing "${DEV_DB_NAME}" (if any)...`);
    // Identifiers can't be parameterized; both names are controlled (env/DATABASE_URL).
    await pool.query(`DROP DATABASE IF EXISTS "${DEV_DB_NAME}"`);

    console.log(`📋 Cloning "${prodDb}" → "${DEV_DB_NAME}"...`);
    await pool.query(`CREATE DATABASE "${DEV_DB_NAME}" TEMPLATE "${prodDb}"`);

    console.log(`🎉 Done. "${DEV_DB_NAME}" is now an exact copy of "${prodDb}".`);
  } finally {
    await pool.end();
  }
}

cloneProdToDev().catch((error) => {
  console.error("❌ Clone failed:", error);
  process.exit(1);
});
