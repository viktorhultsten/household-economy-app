import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";
import * as readline from "node:readline/promises";
import { prepareDatabase } from "./prepare";

/**
 * Applies all pending Drizzle migrations to the PRODUCTION database.
 *
 * Targets `DATABASE_URL` directly (the `economy` database). If the database was
 * created before Drizzle existed it is baselined at `0000` first, so `migrate`
 * only applies the migrations that are genuinely new. This is the same baseline
 * logic the dev migrator uses.
 *
 * This is a deliberate, manual step. Before running it you should have:
 *   1. Rehearsed on a clone:  npm run db:rehearse
 *   2. Taken a backup:        pg_dump "$DATABASE_URL" > backups/economy-<ts>.sql
 * See docs/runbooks/prod-migration.md.
 *
 * Run with: npm run db:migrate:prod
 */

// Load DATABASE_URL from the project-root .env file.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function describeTarget(connectionString: string): { host: string; dbName: string } {
  const url = new URL(connectionString);
  const dbName = url.pathname.replace(/^\//, "");
  if (!dbName) {
    throw new Error("Could not determine the database name from DATABASE_URL.");
  }
  return { host: url.host, dbName };
}

async function confirmTarget(host: string, dbName: string): Promise<void> {
  if (process.env.CONFIRM_PROD_MIGRATION === dbName) {
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`⚠️  About to run PRODUCTION migrations against:`);
    console.log(`      host: ${host}`);
    console.log(`      db:   ${dbName}`);
    const answer = await rl.question(`Type the database name to continue: `);
    if (answer.trim() !== dbName) {
      throw new Error("Confirmation did not match. Aborting.");
    }
  } finally {
    rl.close();
  }
}

async function migrateProdDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env and fill it in.");
  }

  const { host, dbName } = describeTarget(connectionString);
  await confirmTarget(host, dbName);

  console.log(`📦 Migrating production database: ${dbName}`);

  const pool = new Pool({ connectionString });
  try {
    await prepareDatabase(pool);
    console.log("✅ Production migration complete.");
  } finally {
    await pool.end();
  }
}

migrateProdDb().catch((error) => {
  console.error("❌ Production migration failed:", error);
  process.exit(1);
});
