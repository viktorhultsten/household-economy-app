/**
 * Shared connection helpers for the local development database.
 *
 * The dev database lives on the same Postgres server as the primary
 * `DATABASE_URL`, but under a separate database name (default: `economy_dev`).
 * This keeps seed/experiment data isolated from the real `economy` database.
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load DATABASE_URL / DEV_DB_NAME from the project-root .env file.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

/** Name of the development database. Override with DEV_DB_NAME. */
export const DEV_DB_NAME = process.env.DEV_DB_NAME || "economy_dev";

function baseUrl(): URL {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env and fill it in.");
  }
  return new URL(raw);
}

/** Name of the production database (parsed from DATABASE_URL). */
export function getProdDbName(): string {
  const name = baseUrl().pathname.replace(/^\//, "");
  if (!name) {
    throw new Error("Could not determine the database name from DATABASE_URL.");
  }
  return name;
}

/** Connection string pointing at the dev database (same host as DATABASE_URL). */
export function getDevConnectionString(): string {
  if (process.env.DEV_DATABASE_URL) {
    return process.env.DEV_DATABASE_URL;
  }
  const url = baseUrl();
  url.pathname = `/${DEV_DB_NAME}`;
  return url.toString();
}

/**
 * Connection string pointing at the `postgres` maintenance database on the
 * same host. Needed because `CREATE DATABASE` cannot run while connected to
 * the database being created.
 */
export function getMaintenanceConnectionString(): string {
  const url = baseUrl();
  url.pathname = "/postgres";
  return url.toString();
}
