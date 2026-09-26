/**
 * Kör mallanalysen (issue 21): härleder konteringsmallar ur historiken, sparar
 * ändringarna och uppdaterar statistiken. Se docs/runbooks/mallanalys.md.
 *
 *   npm run mallar:analys:dev          en körning mot dev-databasen
 *   npm run mallar:analys              en körning mot DATABASE_URL (prod)
 *   node mallanalys.js --schema        tjänsten i docker-compose: kör varje
 *                                      natt kl. MALLANALYS_TID (standard 03:00)
 *
 * Tiden tolkas i processens tidszon (TZ).
 */

import { Pool } from "pg";

import { korMallanalys } from "../lib/mallanalys";
import { getDevConnectionString } from "./dev-db";

const dev = process.argv.includes("--dev");
const schema = process.argv.includes("--schema");

function connectionString(): string {
  if (dev) return getDevConnectionString();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL är inte satt");
  return process.env.DATABASE_URL;
}

const pool = new Pool({
  connectionString: connectionString(),
  // Samma som appen (lib/db.ts).
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
// En tappad anslutning i poolen ska inte krascha tjänsten; nästa körning ansluter på nytt.
pool.on("error", (err) => logg(`Databasanslutningen tappades: ${err.message}`));

function logg(text: string) {
  console.log(`[${new Date().toISOString()}] ${text}`);
}

/** Dagens datum i processens tidszon, YYYY-MM-DD. */
function idag(): string {
  const d = new Date();
  const tvasiffrig = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${tvasiffrig(d.getMonth() + 1)}-${tvasiffrig(d.getDate())}`;
}

async function korEnGang(): Promise<boolean> {
  const databas = new URL(connectionString()).pathname.replace(/^\//, "");
  logg(`Mallanalys startar mot ${databas}`);
  const start = Date.now();
  const utfall = await korMallanalys(pool, idag());
  const tid = ((Date.now() - start) / 1000).toFixed(1);
  if (utfall.status === "klar") {
    logg(`Körning #${utfall.korningId} klar på ${tid} s: ${utfall.sammanfattning}`);
    return true;
  }
  logg(`Körning #${utfall.korningId} misslyckades efter ${tid} s: ${utfall.fel}`);
  return false;
}

/** Millisekunder till nästa gång klockan är `hh:mm`. */
function tillNasta(tid: string): number {
  const [hh, mm] = tid.split(":").map(Number);
  const nu = new Date();
  const nasta = new Date(nu);
  nasta.setHours(hh, mm, 0, 0);
  if (nasta <= nu) nasta.setDate(nasta.getDate() + 1);
  return nasta.getTime() - nu.getTime();
}

function schemalagg(tid: string) {
  const ms = tillNasta(tid);
  logg(`Nästa mallanalys ${new Date(Date.now() + ms).toLocaleString("sv-SE")}`);
  setTimeout(async () => {
    try {
      await korEnGang();
    } catch (err) {
      // T.ex. att databasen inte gick att nå. Tjänsten lever vidare till nästa natt.
      console.error(err);
    }
    schemalagg(tid);
  }, ms);
}

if (schema) {
  const tid = process.env.MALLANALYS_TID || "03:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(tid)) throw new Error(`Ogiltig MALLANALYS_TID: ${tid}`);
  // Node som PID 1 i containern avslutas inte av SIGTERM utan en hanterare.
  // En körning som avbryts rullas tillbaka och markeras som avbruten vid nästa start.
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      logg(`${signal} mottagen, avslutar`);
      process.exit(0);
    });
  }
  logg(`Mallanalystjänsten startad (tidszon ${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
  schemalagg(tid);
} else {
  korEnGang()
    .then((ok) => {
      if (!ok) process.exitCode = 1;
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
