-- Remove period-shift feature columns from transactions table (issue #01)
-- These columns were never fully implemented and are out of scope.
-- Existing transactions and posts are unaffected.

DO $$
BEGIN
  -- Drop self-referencing FK constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_original_transaction_id_fkey'
  ) THEN
    ALTER TABLE transactions
    DROP CONSTRAINT transactions_original_transaction_id_fkey;
  END IF;

  -- Drop bridge account FK constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_bridge_account_id_fkey'
  ) THEN
    ALTER TABLE transactions
    DROP CONSTRAINT transactions_bridge_account_id_fkey;
  END IF;
END $$;

-- Drop the index
DROP INDEX IF EXISTS idx_transactions_original_id;

-- Drop the columns
ALTER TABLE transactions
  DROP COLUMN IF EXISTS original_transaction_id,
  DROP COLUMN IF EXISTS period_shift_date,
  DROP COLUMN IF EXISTS bridge_account_id;
