import { spawn } from "node:child_process";
import { createGzip } from "node:zlib";
import { Readable } from "node:stream";

// pg_dump + gzip both need the Node runtime (child_process / zlib streams).
export const runtime = "nodejs";
// A database dump must never be cached or statically rendered.
export const dynamic = "force-dynamic";

/** Path to the pg_dump binary. Override with PG_DUMP_BIN if it isn't on PATH. */
const PG_DUMP_BIN = process.env.PG_DUMP_BIN || "pg_dump";

/** Builds a filename like `economy-next-20260705-142530.sql.gz`. */
function buildFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `economy-next-${stamp}.sql.gz`;
}

export async function GET(): Promise<Response> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return new Response("DATABASE_URL is not set.", { status: 500 });
  }

  // Pass the connection string via an argument-free env var so it never appears
  // in the process list. pg_dump reads PGDATABASE-style URLs from its first
  // positional arg, but we prefer the connection string form for SSL support.
  const dump = spawn(PG_DUMP_BIN, ["--no-owner", "--no-privileges", connectionString], {
    env: process.env,
  });

  let stderr = "";
  dump.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  // Surface spawn failures (e.g. pg_dump not installed) as a clean 500.
  const spawned = await new Promise<boolean>((resolve) => {
    dump.on("spawn", () => resolve(true));
    dump.on("error", (err) => {
      stderr += `\n${err.message}`;
      resolve(false);
    });
  });

  if (!spawned) {
    return new Response(
      `Kunde inte starta pg_dump. Kontrollera att verktyget är installerat och tillgängligt på PATH (eller sätt PG_DUMP_BIN).\n\n${stderr}`,
      { status: 500 }
    );
  }

  const gzip = createGzip();
  dump.stdout.pipe(gzip);

  // If pg_dump exits with an error after streaming started, destroy the gzip
  // stream so the download fails loudly instead of producing a truncated file.
  dump.on("close", (code) => {
    if (code !== 0) {
      gzip.destroy(new Error(`pg_dump exited with code ${code}: ${stderr}`));
    }
  });

  const fileName = buildFileName(new Date());

  return new Response(Readable.toWeb(gzip) as ReadableStream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
