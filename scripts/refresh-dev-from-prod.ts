import { Pool } from "pg";
import { spawn } from "node:child_process";
import { Transform } from "node:stream";
import {
  DEV_DB_NAME,
  getDevConnectionString,
  getMaintenanceConnectionString,
  getProdDbName,
} from "./dev-db";

/**
 * Refreshes the local development database so it becomes an exact copy of
 * production: it drops and recreates the empty dev database, then streams a
 * `pg_dump` of production straight into `psql` against dev.
 *
 * Production is treated as STRICTLY READ-ONLY. `pg_dump` only issues read
 * queries inside a single transaction; nothing is ever written back to prod,
 * and prod connections are never terminated. All destructive work happens
 * exclusively against the dev database.
 *
 * Run with: npm run db:refresh
 */

function prodConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env and fill it in.");
  }
  return raw;
}

/**
 * Strips `SET` lines that a newer pg_dump emits but an older server rejects
 * (e.g. `transaction_timeout`), so `ON_ERROR_STOP=1` only trips on real errors.
 */
function stripUnsupportedSetLines(): Transform {
  let carry = "";
  const drop = /^SET\s+transaction_timeout\b/;
  return new Transform({
    transform(chunk, _enc, done) {
      const lines = (carry + chunk.toString("utf8")).split("\n");
      carry = lines.pop() ?? "";
      const kept = lines.filter((line) => !drop.test(line));
      done(null, kept.map((line) => line + "\n").join(""));
    },
    flush(done) {
      done(null, drop.test(carry) ? "" : carry);
    },
  });
}

/** Drops and recreates an empty dev database via the maintenance connection. */
async function recreateDevDatabase(): Promise<void> {
  const maintenance = new Pool({ connectionString: getMaintenanceConnectionString() });
  try {
    console.log(`🔌 Terminating other connections to "${DEV_DB_NAME}"...`);
    await maintenance.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()`,
      [DEV_DB_NAME]
    );

    console.log(`🗑️  Dropping existing "${DEV_DB_NAME}" (if any)...`);
    // Identifier can't be parameterized; the name is controlled locally (env).
    await maintenance.query(`DROP DATABASE IF EXISTS "${DEV_DB_NAME}"`);

    console.log(`✨ Creating empty "${DEV_DB_NAME}"...`);
    await maintenance.query(`CREATE DATABASE "${DEV_DB_NAME}" TEMPLATE template0`);
  } finally {
    await maintenance.end();
  }
}

/** Streams a read-only pg_dump of production into psql against the dev database. */
function copyProdIntoDev(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dump = spawn(
      "pg_dump",
      ["--no-owner", "--no-privileges", "--dbname", prodConnectionString()],
      { stdio: ["ignore", "pipe", "inherit"] }
    );
    const restore = spawn(
      "psql",
      ["--quiet", "--set", "ON_ERROR_STOP=1", "--dbname", getDevConnectionString()],
      { stdio: ["pipe", "ignore", "inherit"] }
    );

    dump.on("error", (err) =>
      reject(new Error(`Could not run pg_dump (is it installed and on PATH?): ${err.message}`))
    );
    restore.on("error", (err) =>
      reject(new Error(`Could not run psql (is it installed and on PATH?): ${err.message}`))
    );

    dump.stdout.pipe(stripUnsupportedSetLines()).pipe(restore.stdin);

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

async function refreshDevFromProd(): Promise<void> {
  const prodDb = getProdDbName();

  if (prodDb === DEV_DB_NAME) {
    throw new Error(
      `Refusing to refresh: source and target are both "${prodDb}". Set DEV_DB_NAME to a different name.`
    );
  }

  await recreateDevDatabase();

  console.log(`📋 Copying "${prodDb}" (read-only) → "${DEV_DB_NAME}"...`);
  await copyProdIntoDev();

  console.log(`🎉 Done. "${DEV_DB_NAME}" is now an exact copy of "${prodDb}".`);
}

refreshDevFromProd().catch((error) => {
  console.error("❌ Refresh failed:", error);
  process.exit(1);
});
