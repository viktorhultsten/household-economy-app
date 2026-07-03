import { Pool } from "pg";
import { getDevConnectionString, getProdDbName } from "./dev-db";
import { prepareDatabase } from "./prepare";

function dbNameFromUrl(connectionString: string): string {
  const name = new URL(connectionString).pathname.replace(/^\//, "");
  if (!name) {
    throw new Error("Could not determine database name from connection string.");
  }
  return name;
}

async function migrateDevDb() {
  const devConnectionString = getDevConnectionString();
  const devDbName = dbNameFromUrl(devConnectionString);
  const prodDbName = getProdDbName();

  if (devDbName === prodDbName) {
    throw new Error(
      `Refusing to migrate because dev DB (${devDbName}) matches prod DB (${prodDbName}). Set DEV_DATABASE_URL or DEV_DB_NAME.`
    );
  }

  console.log(`📦 Migrating dev database: ${devDbName}`);

  const pool = new Pool({ connectionString: devConnectionString });
  try {
    await prepareDatabase(pool);
    console.log("✅ Dev migration complete.");
  } finally {
    await pool.end();
  }
}

migrateDevDb().catch((error) => {
  console.error("❌ Dev migration failed:", error);
  process.exit(1);
});
