import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "transactions.db");
    db = new Database(dbPath);

    // Create groups table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        namn TEXT NOT NULL UNIQUE,
        typ TEXT NOT NULL CHECK(typ IN ('Intäkt', 'Utgift', 'Tillgång', 'Skuld')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create accounts table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        namn TEXT NOT NULL,
        group_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);

    // Create imports table (CSV import metadata)
    db.exec(`
      CREATE TABLE IF NOT EXISTS imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_events INTEGER NOT NULL,
        date_range_start TEXT NOT NULL,
        date_range_end TEXT NOT NULL
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
        import_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
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
        debet REAL NOT NULL DEFAULT 0,
        kredit REAL NOT NULL DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        CHECK ((debet > 0 AND kredit = 0) OR (kredit > 0 AND debet = 0) OR (debet = 0 AND kredit = 0))
      )
    `);

    // Create period_locks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS period_locks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        locked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        locked_by TEXT,
        UNIQUE(year, month)
      )
    `);

  }

  return db;
}
