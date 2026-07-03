import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { reconcilePreDrizzle } from "./reconcile";
import { baselineIfPreDrizzle } from "./baseline";

/**
 * Brings a database fully up to date:
 *   1. reconcile a pre-Drizzle schema to match the canonical Drizzle schema,
 *   2. baseline at `0000` if it has no migration history,
 *   3. apply all pending migrations.
 *
 * Each step is idempotent, so this is safe to run on dev, prod, a clone, or a
 * fresh database. Used by the dev and prod migrators and by the rehearsal.
 */
export async function prepareDatabase(pool: Pool): Promise<void> {
  await reconcilePreDrizzle(pool);
  await baselineIfPreDrizzle(pool);
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
}
