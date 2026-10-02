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
  is_periodisering_default INTEGER NOT NULL DEFAULT 0,
  is_bundet_sparande INTEGER NOT NULL DEFAULT 0,
  reconciled_through DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_periodisering_default_unique
  ON accounts (is_periodisering_default)
  WHERE is_periodisering_default = 1;

-- Imports table (CSV import metadata)
CREATE TABLE IF NOT EXISTS imports (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_events INTEGER NOT NULL,
  date_range_start TEXT NOT NULL,
  date_range_end TEXT NOT NULL,
  account_id INTEGER,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- Transactions table (accounting entries) - created before bank_events to avoid circular dependency
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  bank_event_id INTEGER,
  periodisering_parent_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank events table (CSV imports)
CREATE TABLE IF NOT EXISTS bank_events (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
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
  debet NUMERIC(15, 2) NOT NULL DEFAULT 0,
  kredit NUMERIC(15, 2) NOT NULL DEFAULT 0,
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

-- Recurring items table (track expected recurring transactions)
CREATE TABLE IF NOT EXISTS recurring_items (
  id SERIAL PRIMARY KEY,
  namn TEXT NOT NULL UNIQUE,
  expected_per_month INTEGER NOT NULL DEFAULT 1,
  active_months INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10,11,12],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link transactions to recurring items
CREATE TABLE IF NOT EXISTS transaction_recurring_items (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL,
  recurring_item_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (recurring_item_id) REFERENCES recurring_items(id) ON DELETE CASCADE,
  UNIQUE(transaction_id, recurring_item_id)
);

-- Budgets table (monthly budget amounts per account)
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(account_id, year, month)
);

-- Create indexes for common budget query patterns
CREATE INDEX IF NOT EXISTS idx_budgets_account_year ON budgets(account_id, year);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON budgets(year, month);

-- DB-level safety net: block unbalanced verifikat writes even if app code is bypassed.
CREATE OR REPLACE FUNCTION enforce_transaction_balance() RETURNS trigger AS $$
DECLARE
  target_transaction_id INTEGER;
  old_transaction_id INTEGER;
  totals RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_transaction_id := OLD.transaction_id;
  ELSE
    target_transaction_id := NEW.transaction_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    old_transaction_id := OLD.transaction_id;
  END IF;

  IF target_transaction_id IS NOT NULL THEN
    SELECT
      COUNT(*) AS post_count,
      COALESCE(SUM(debet), 0)::numeric AS total_debet,
      COALESCE(SUM(kredit), 0)::numeric AS total_kredit
    INTO totals
    FROM posts
    WHERE transaction_id = target_transaction_id;

    IF totals.post_count > 0 AND ABS(totals.total_debet - totals.total_kredit) > 0.001 THEN
      RAISE EXCEPTION 'Debet och kredit måste vara lika för verifikat %', target_transaction_id;
    END IF;
  END IF;

  IF old_transaction_id IS NOT NULL AND old_transaction_id <> target_transaction_id THEN
    SELECT
      COUNT(*) AS post_count,
      COALESCE(SUM(debet), 0)::numeric AS total_debet,
      COALESCE(SUM(kredit), 0)::numeric AS total_kredit
    INTO totals
    FROM posts
    WHERE transaction_id = old_transaction_id;

    IF totals.post_count > 0 AND ABS(totals.total_debet - totals.total_kredit) > 0.001 THEN
      RAISE EXCEPTION 'Debet och kredit måste vara lika för verifikat %', old_transaction_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_balance_invariant ON posts;

CREATE CONSTRAINT TRIGGER posts_balance_invariant
AFTER INSERT OR UPDATE OR DELETE ON posts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_transaction_balance();
