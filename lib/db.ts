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

    // Create transactions table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        account_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )
    `);

    // Migration: Add account_id column if it doesn't exist
    try {
      const tableInfo = db.pragma("table_info(transactions)");
      const hasAccountId = tableInfo.some(
        (col: any) => col.name === "account_id"
      );

      if (!hasAccountId) {
        db.exec(`ALTER TABLE transactions ADD COLUMN account_id INTEGER`);
      }
    } catch (error) {
      // Table doesn't exist yet, will be created above
    }
  }

  return db;
}
