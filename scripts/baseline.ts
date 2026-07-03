import { Pool } from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Baselining a pre-Drizzle database.
 *
 * Databases that were created before Drizzle existed (schema built by running
 * the old runtime `schema.sql`) already contain every table but have no Drizzle
 * bookkeeping. If `drizzle-kit migrate` ran against such a database it would try
 * to replay `0000_silky_kronos` and fail with "relation already exists".
 *
 * `baselineIfPreDrizzle` detects this situation and records `0000` as already
 * applied, so `migrate` skips it and only applies later migrations. This is the
 * same logic used for both the dev and prod databases — one code path we trust.
 */

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

/**
 * If the target database already has the application tables but no Drizzle
 * migration history, insert the `0000` baseline row so `migrate` won't try to
 * recreate existing tables. Safe to call on already-baselined or fresh
 * databases: it does nothing in those cases.
 */
export async function baselineIfPreDrizzle(pool: Pool): Promise<void> {
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

  console.log(`ℹ️  Baseline set at ${firstMigration.tag} for pre-Drizzle database.`);
}
