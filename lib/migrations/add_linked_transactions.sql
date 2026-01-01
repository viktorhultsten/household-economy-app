-- Add support for linked transactions (period-shifted transactions)
-- This allows a transaction to be "moved" to a different accounting period
-- while maintaining the original bank event date

-- Add columns to track linked transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS original_transaction_id INTEGER,
  ADD COLUMN IF NOT EXISTS period_shift_date TEXT,
  ADD COLUMN IF NOT EXISTS bridge_account_id INTEGER;

-- Add foreign key constraints
DO $$
BEGIN
  -- Self-referencing FK to the original transaction
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_original_transaction_id_fkey'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_original_transaction_id_fkey
    FOREIGN KEY (original_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
  END IF;

  -- FK to the bridge account used to temporarily hold the money
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_bridge_account_id_fkey'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_bridge_account_id_fkey
    FOREIGN KEY (bridge_account_id) REFERENCES accounts(id);
  END IF;
END $$;

-- Create index for finding linked transactions quickly
CREATE INDEX IF NOT EXISTS idx_transactions_original_id ON transactions(original_transaction_id);

-- Comments for documentation
COMMENT ON COLUMN transactions.original_transaction_id IS 'If this transaction is a period-shifted copy, this references the original transaction';
COMMENT ON COLUMN transactions.period_shift_date IS 'The date this transaction should be accounted for (different from the bank event date)';
COMMENT ON COLUMN transactions.bridge_account_id IS 'The temporary account used to hold money between original and shifted period';
