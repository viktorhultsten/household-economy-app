import { SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

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
let drizzleDb: ReturnType<typeof drizzle> | null = null;

function toSql(text: string, params: unknown[] = []): SQL {
  if (params.length === 0) {
    return sql.raw(text);
  }

  const parts = text.split(/(\$\d+)/g).filter((part) => part.length > 0);
  const chunks: SQL[] = [];

  for (const part of parts) {
    const match = /^\$(\d+)$/.exec(part);
    if (!match) {
      chunks.push(sql.raw(part));
      continue;
    }

    const index = Number(match[1]) - 1;
    if (index < 0 || index >= params.length) {
      throw new Error(`Invalid SQL placeholder index in query: ${part}`);
    }

    chunks.push(sql`${params[index]}`);
  }

  return sql.join(chunks, sql.raw(""));
}

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

function getDrizzleDb() {
  if (!drizzleDb) {
    drizzleDb = drizzle(getDatabase());
  }
  return drizzleDb;
}

async function execute<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const db = getDrizzleDb();
  const result = await db.execute(toSql(text, params));
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
  const db = getDrizzleDb();
  return db.transaction(async (tx) => {
    const client: CompatibleClient = {
      query: async <R extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[]
      ) => {
        const result = await tx.execute(toSql(text, params));
        return { rows: result.rows as R[] };
      },
    };

    return callback(client);
  });
}
