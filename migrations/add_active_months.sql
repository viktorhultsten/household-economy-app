-- Add active_months column to recurring_items table if it doesn't exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_items'
    AND column_name = 'active_months'
  ) THEN
    ALTER TABLE recurring_items
    ADD COLUMN active_months INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10,11,12];

    RAISE NOTICE 'Added active_months column to recurring_items table';
  ELSE
    RAISE NOTICE 'active_months column already exists';
  END IF;
END $$;
