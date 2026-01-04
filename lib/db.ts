import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import fs from "fs";
import path from "path";

let pool: Pool | null = null;
let schemaInitialized = false;
let schemaInitializing: Promise<void> | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Only use SSL if explicitly enabled via DATABASE_SSL=true
      // Internal databases typically don't need SSL
      ssl: process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
    });
  }

  return pool;
}

async function initializeSchema() {
  if (schemaInitialized) {
    return;
  }

  if (schemaInitializing) {
    await schemaInitializing;
    return;
  }

  schemaInitializing = (async () => {
    const pool = getDatabase();
    const client = await pool.connect();
    try {
      const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
      const schema = fs.readFileSync(schemaPath, "utf-8");
      await client.query(schema);
      schemaInitialized = true;
      console.log("Database schema initialized successfully");
    } catch (error) {
      console.error("Error initializing database schema:", error);
      throw error;
    } finally {
      client.release();
    }
  })();

  await schemaInitializing;
}

// Helper function to execute a query
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  await initializeSchema();
  const db = getDatabase();
  return db.query<T>(text, params);
}

// Helper function to get a single row
export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

// Helper function to get all rows
export async function queryAll<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// Transaction helper
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  await initializeSchema();
  const db = getDatabase();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
