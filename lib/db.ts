import { Pool, types } from "pg";

// Dagdatum (`date`) läses som text, "YYYY-MM-DD", och aldrig som `Date` — en
// `Date` är en tidpunkt vars dag beror på tidszonen. Se app/lib/datum.ts.
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value: string) => value);

type QueryResultRow = Record<string, unknown>;
type QueryResult<T extends QueryResultRow = QueryResultRow> = {
  rows: T[];
};

type CompatibleClient = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
};

let pool: Pool | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return pool;
}

async function execute<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const result = await getDatabase().query(text, params as unknown[]);
  return { rows: result.rows as T[] };
}

// Helper function to execute a query
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return execute<T>(text, params);
}

// Helper function to get a single row
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

// Helper function to get all rows
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// Transaction helper with a pg-like query interface for compatibility.
export async function transaction<T>(
  callback: (client: CompatibleClient) => Promise<T>
): Promise<T> {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client as unknown as CompatibleClient);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
