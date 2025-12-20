import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "transactions.db");
    db = new Database(dbPath);

    // Create accounts table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        namn TEXT NOT NULL,
        grupp TEXT NOT NULL,
        typ TEXT NOT NULL CHECK(typ IN ('Intäkt', 'Utgift')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bank_events table (CSV imports)
    db.exec(`
      CREATE TABLE IF NOT EXISTS bank_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        is_posted INTEGER DEFAULT 0,
        transaction_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )
    `);

    // Create transactions table (accounting entries)
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        bank_event_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bank_event_id) REFERENCES bank_events(id)
      )
    `);

    // Create posts table (individual entries in a transaction)
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )
    `);

    // Migration: Rename old transactions table if it exists
    try {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;

      // Check if we have the old structure (no bank_events table)
      const hasOldStructure =
        tables.some((t) => t.name === "transactions") &&
        !tables.some((t) => t.name === "bank_events");

      if (hasOldStructure) {
        // Rename old transactions to bank_events
        db.exec(`
          ALTER TABLE transactions RENAME TO bank_events_old;

          INSERT INTO bank_events (id, date, description, amount, is_posted)
          SELECT id, date, description, amount, 0 FROM bank_events_old;

          DROP TABLE bank_events_old;
        `);
      }
    } catch (error) {
      // Migration not needed or already done
    }
  }

  return db;
}
