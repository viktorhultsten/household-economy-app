-- Migration: Add account_id to imports table
-- This migration adds support for associating imports with a default account

-- Add account_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'imports' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE imports ADD COLUMN account_id INTEGER;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'imports_account_id_fkey'
  ) THEN
    ALTER TABLE imports
    ADD CONSTRAINT imports_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
END $$;
