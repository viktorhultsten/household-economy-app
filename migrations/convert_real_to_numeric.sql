-- Convert REAL columns to NUMERIC(15, 2) to fix floating-point precision issues
-- This fixes the 0.02 kr rounding errors in account balances

DO $$
BEGIN
  -- Convert bank_events.amount from REAL to NUMERIC(15, 2)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_events'
    AND column_name = 'amount'
    AND data_type = 'real'
  ) THEN
    ALTER TABLE bank_events
    ALTER COLUMN amount TYPE NUMERIC(15, 2);

    RAISE NOTICE 'Converted bank_events.amount to NUMERIC(15, 2)';
  ELSE
    RAISE NOTICE 'bank_events.amount already NUMERIC or does not exist';
  END IF;

  -- Convert posts.debet from REAL to NUMERIC(15, 2)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts'
    AND column_name = 'debet'
    AND data_type = 'real'
  ) THEN
    ALTER TABLE posts
    ALTER COLUMN debet TYPE NUMERIC(15, 2);

    RAISE NOTICE 'Converted posts.debet to NUMERIC(15, 2)';
  ELSE
    RAISE NOTICE 'posts.debet already NUMERIC or does not exist';
  END IF;

  -- Convert posts.kredit from REAL to NUMERIC(15, 2)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts'
    AND column_name = 'kredit'
    AND data_type = 'real'
  ) THEN
    ALTER TABLE posts
    ALTER COLUMN kredit TYPE NUMERIC(15, 2);

    RAISE NOTICE 'Converted posts.kredit to NUMERIC(15, 2)';
  ELSE
    RAISE NOTICE 'posts.kredit already NUMERIC or does not exist';
  END IF;
END $$;
