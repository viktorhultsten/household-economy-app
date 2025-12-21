-- PostgreSQL schema for Swedish accounting application

-- Groups table (account categories)
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  namn TEXT NOT NULL UNIQUE,
  typ TEXT NOT NULL CHECK(typ IN ('Intäkt', 'Utgift', 'Tillgång', 'Skuld')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  namn TEXT NOT NULL,
  group_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Imports table (CSV import metadata)
CREATE TABLE IF NOT EXISTS imports (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_events INTEGER NOT NULL,
  date_range_start TEXT NOT NULL,
  date_range_end TEXT NOT NULL
);

-- Transactions table (accounting entries) - created before bank_events to avoid circular dependency
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  bank_event_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank events table (CSV imports)
CREATE TABLE IF NOT EXISTS bank_events (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  is_posted INTEGER DEFAULT 0,
  transaction_id INTEGER,
  import_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
);

-- Add foreign key constraint to transactions table now that bank_events exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_bank_event_id_fkey'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_bank_event_id_fkey
    FOREIGN KEY (bank_event_id) REFERENCES bank_events(id);
  END IF;
END $$;

-- Posts table (individual entries in a transaction)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  debet REAL NOT NULL DEFAULT 0,
  kredit REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  CHECK ((debet > 0 AND kredit = 0) OR (kredit > 0 AND debet = 0) OR (debet = 0 AND kredit = 0))
);

-- Period locks table
CREATE TABLE IF NOT EXISTS period_locks (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  locked_by TEXT,
  UNIQUE(year, month)
);

-- Booking templates table
CREATE TABLE IF NOT EXISTS booking_templates (
  id SERIAL PRIMARY KEY,
  namn TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template rows table (entries in a template)
CREATE TABLE IF NOT EXISTS template_rows (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  is_debet BOOLEAN NOT NULL,
  description TEXT,
  row_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES booking_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
