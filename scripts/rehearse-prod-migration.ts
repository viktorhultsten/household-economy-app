import { Pool } from "pg";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getMaintenanceConnectionString } from "./dev-db";
import { prepareDatabase } from "./prepare";

/**
 * Rehearses the production migration on a throwaway clone of production.
 *
 * This is the safety net for every prod migration. It:
 *   1. Copies production (`economy`) into a scratch database using `pg_dump`
 *      piped into `psql` — production is only ever READ, never altered.
 *   2. Runs the exact production procedure on the clone: baseline at `0000`
 *      (if pre-Drizzle) + `drizzle-kit migrate`.
 *   3. Builds a second scratch database purely from the migrations (the
 *      canonical Drizzle schema) and DIFFS the two `pg_dump --schema-only`
 *      outputs. An empty diff proves production's real schema matches the
 *      canonical schema, so baseline + migrate is safe to run for real. Any
 *      differences are the hidden drift and must become a reconciliation
 *      migration BEFORE touching production.
 *
 * The rehearsal clone is left in place for inspection; the canonical DB is
 * dropped. Re-running drops and recreates both scratch databases.
 *
 * Run with: npm run db:rehearse
 */

const REHEARSAL_DB_NAME = process.env.REHEARSAL_DB_NAME || "economy_rehearsal";
const CANONICAL_DB_NAME = `${REHEARSAL_DB_NAME}_canon`;

function prodConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env and fill it in.");
  }
  return raw;
}

function connectionStringFor(dbName: string): string {
  const url = new URL(prodConnectionString());
  url.pathname = `/${dbName}`;
  return url.toString();
}

function prodDbName(): string {
  return new URL(prodConnectionString()).pathname.replace(/^\//, "");
}

/** Recreates an empty scratch database. */
async function recreateDatabase(dbName: string): Promise<void> {
  const maintenance = new Pool({ connectionString: getMaintenanceConnectionString() });
  try {
    await maintenance.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()`,
      [dbName]
    );
    // Identifier can't be parameterized; the name is controlled locally.
    await maintenance.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await maintenance.query(`CREATE DATABASE "${dbName}" TEMPLATE template0`);
  } finally {
    await maintenance.end();
  }
}

async function dropDatabase(dbName: string): Promise<void> {
  const maintenance = new Pool({ connectionString: getMaintenanceConnectionString() });
  try {
    await maintenance.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()`,
      [dbName]
    );
    await maintenance.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } finally {
    await maintenance.end();
  }
}

/** Copies production into the (already empty) rehearsal DB via pg_dump | psql. */
function cloneProdIntoRehearsal(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dump = spawn(
      "pg_dump",
      ["--no-owner", "--no-privileges", "--dbname", prodConnectionString()],
      { stdio: ["ignore", "pipe", "inherit"] }
    );
    const restore = spawn("psql", ["--quiet", "--dbname", connectionStringFor(REHEARSAL_DB_NAME)], {
      stdio: ["pipe", "ignore", "inherit"],
    });

    dump.on("error", (err) =>
      reject(new Error(`Could not run pg_dump (is it installed and on PATH?): ${err.message}`))
    );
    restore.on("error", (err) =>
      reject(new Error(`Could not run psql (is it installed and on PATH?): ${err.message}`))
    );

    dump.stdout.pipe(restore.stdin);

    let dumpFailed = false;
    dump.on("close", (code) => {
      if (code !== 0) {
        dumpFailed = true;
        reject(new Error(`pg_dump exited with code ${code}.`));
      }
    });
    restore.on("close", (code) => {
      if (dumpFailed) {
        return;
      }
      code === 0 ? resolve() : reject(new Error(`psql restore exited with code ${code}.`));
    });
  });
}

/** Applies the production procedure (reconcile + baseline + migrate) to a database. */
async function baselineAndMigrate(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    await prepareDatabase(pool);
  } finally {
    await pool.end();
  }
}

/**
 * Normalizes a schema line so functionally-identical definitions compare equal:
 * `CURRENT_TIMESTAMP` vs `now()`, integer-vs-numeric zero defaults, and trailing
 * commas (which differ only because of cosmetic column ordering).
 */
function normalizeSchemaLine(line: string): string {
  return line
    .trim()
    .toLowerCase()
    .replace(/current_timestamp/g, "now()")
    .replace(/'0'::numeric/g, "0")
    .replace(/\(0\)::numeric/g, "0")
    .replace(/,\s*$/, "");
}

/**
 * Dumps a database's schema and returns it as normalized statements, so two
 * schemas can be compared without noise from pg_dump SET lines, comments,
 * client/server version differences, or object ordering.
 */
function dumpSchema(dbName: string): Promise<Set<string>> {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `schema-${dbName}-${Date.now()}.sql`);
    const out = fs.createWriteStream(tmpFile);
    const dump = spawn("pg_dump", [
      "--schema-only",
      "--no-owner",
      "--no-privileges",
      "--no-comments",
      "--exclude-schema=drizzle",
      "--dbname",
      connectionStringFor(dbName),
    ]);

    dump.stdout.pipe(out);
    dump.stderr.pipe(process.stderr);
    dump.on("error", (err) => reject(new Error(`Could not run pg_dump: ${err.message}`)));
    dump.on("close", (code) => {
      out.end();
      if (code !== 0) {
        reject(new Error(`pg_dump (schema) exited with code ${code}.`));
        return;
      }
      const raw = fs.readFileSync(tmpFile, "utf8");
      fs.unlinkSync(tmpFile);
      const statements = raw
        .split("\n")
        .map((line) => normalizeSchemaLine(line))
        .filter((line) => line.length > 0)
        .filter((line) => !line.startsWith("--"))
        .filter((line) => !line.startsWith("set "))
        .filter((line) => !line.startsWith("select pg_catalog.set_config"))
        .filter((line) => !/^\\/.test(line));
      resolve(new Set(statements));
    });
  });
}

/** Diffs the clone against the canonical schema and reports drift. */
async function driftCheck(): Promise<void> {
  console.log(`🏗️  Building canonical schema in "${CANONICAL_DB_NAME}" from migrations...`);
  await recreateDatabase(CANONICAL_DB_NAME);
  await baselineAndMigrate(connectionStringFor(CANONICAL_DB_NAME));

  console.log(`🔍 Comparing "${REHEARSAL_DB_NAME}" (prod clone) against the canonical schema...`);
  const [cloneSchema, canonicalSchema] = await Promise.all([
    dumpSchema(REHEARSAL_DB_NAME),
    dumpSchema(CANONICAL_DB_NAME),
  ]);

  await dropDatabase(CANONICAL_DB_NAME);

  const onlyInProd = [...cloneSchema].filter((line) => !canonicalSchema.has(line)).sort();
  const onlyInCanonical = [...canonicalSchema].filter((line) => !cloneSchema.has(line)).sort();

  if (onlyInProd.length === 0 && onlyInCanonical.length === 0) {
    console.log("\n✅ Drift check passed: production schema matches the canonical Drizzle schema.");
    console.log("   The baseline + migrate is safe to run against production.");
    return;
  }

  console.log("\n❌ Drift detected. Production's schema differs from the canonical Drizzle schema.\n");
  if (onlyInCanonical.length > 0) {
    console.log(`Expected by Drizzle but MISSING in production (${onlyInCanonical.length}):`);
    onlyInCanonical.forEach((line) => console.log(`  + ${line}`));
    console.log("");
  }
  if (onlyInProd.length > 0) {
    console.log(`Present in production but NOT in the Drizzle schema (${onlyInProd.length}):`);
    onlyInProd.forEach((line) => console.log(`  - ${line}`));
    console.log("");
  }
  throw new Error(
    "Extend scripts/reconcile.ts to cover the differences above (or the differ's " +
      "normalization if they are purely cosmetic), then rehearse again before migrating production."
  );
}

async function rehearse() {
  if (REHEARSAL_DB_NAME === prodDbName() || CANONICAL_DB_NAME === prodDbName()) {
    throw new Error(
      `Refusing to rehearse: a scratch DB name equals the production database (${prodDbName()}).`
    );
  }

  console.log(`🗑️  Recreating empty "${REHEARSAL_DB_NAME}"...`);
  await recreateDatabase(REHEARSAL_DB_NAME);

  console.log(`📋 Copying "${prodDbName()}" → "${REHEARSAL_DB_NAME}" (production is read-only)...`);
  await cloneProdIntoRehearsal();

  console.log(`⚙️  Applying the production procedure to the clone...`);
  await baselineAndMigrate(connectionStringFor(REHEARSAL_DB_NAME));
  console.log("✅ Baseline + migrate succeeded on the clone.");

  await driftCheck();

  console.log(
    `\nℹ️  Clone "${REHEARSAL_DB_NAME}" left in place for inspection. Drop it with:\n` +
      `      npm run db:rehearse    # recreates it, or\n` +
      `      DROP DATABASE "${REHEARSAL_DB_NAME}";   # via psql on the DB host`
  );
}

rehearse().catch((error) => {
  console.error("❌ Rehearsal failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
