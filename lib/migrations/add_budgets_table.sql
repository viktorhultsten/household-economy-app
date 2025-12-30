-- Add budgets table for tracking monthly budget amounts per account
-- Run this migration to enable budgeting feature

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

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_budgets_account_year ON budgets(account_id, year);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON budgets(year, month);
