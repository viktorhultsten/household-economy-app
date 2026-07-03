import { Pool } from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDevConnectionString, getProdDbName } from "./dev-db";

function dbNameFromUrl(connectionString: string): string {
  const name = new URL(connectionString).pathname.replace(/^\//, "");
  if (!name) {
    throw new Error("Could not determine database name from connection string.");
  }
  return name;
}

type JournalEntry = {
  tag: string;
  when: number;
};

function readMigrationJournalEntries(): JournalEntry[] {
  const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
  const raw = fs.readFileSync(journalPath, "utf8");
  const parsed = JSON.parse(raw) as { entries: JournalEntry[] };
  return parsed.entries;
}

function hashMigrationFile(tag: string): string {
  const migrationPath = path.join(process.cwd(), "drizzle", `${tag}.sql`);
  const sql = fs.readFileSync(migrationPath, "utf8");
  return crypto.createHash("sha256").update(sql).digest("hex");
}

async function ensureDrizzleBaselineForInitializedDevDb(pool: Pool): Promise<void> {
  const tables = await pool.query<{ table_name: string }>(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('accounts', 'transactions', 'posts')
    `
  );

  const hasInitializedSchema = tables.rows.length > 0;
  if (!hasInitializedSchema) {
    return;
  }

  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const baselineAlreadySet = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at IS NOT NULL) AS exists`
  );

  if (baselineAlreadySet.rows[0]?.exists) {
    return;
  }

  const journalEntries = readMigrationJournalEntries();
  const firstMigration = journalEntries.find((entry) => entry.tag === "0000_silky_kronos") ?? journalEntries[0];

  if (!firstMigration) {
    throw new Error("No migration entries found in drizzle/meta/_journal.json.");
  }

  const hash = hashMigrationFile(firstMigration.tag);
  await pool.query(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
    [hash, firstMigration.when]
  );

  console.log(`ℹ️  Baseline set at ${firstMigration.tag} for initialized dev database.`);
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
    await ensureDrizzleBaselineForInitializedDevDb(pool);

    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Dev migration complete.");
  } finally {
    await pool.end();
  }
}

migrateDevDb().catch((error) => {
  console.error("❌ Dev migration failed:", error);
  process.exit(1);
});
