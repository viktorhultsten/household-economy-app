-- Add custom result views tables for filtering accounts in result view

DO $$
BEGIN
  -- Create custom_result_views table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'custom_result_views'
  ) THEN
    CREATE TABLE custom_result_views (
      id SERIAL PRIMARY KEY,
      namn VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'Created custom_result_views table';
  ELSE
    RAISE NOTICE 'custom_result_views table already exists';
  END IF;

  -- Create custom_result_view_accounts table if it doesn't exist (for individual account selections)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'custom_result_view_accounts'
  ) THEN
    CREATE TABLE custom_result_view_accounts (
      id SERIAL PRIMARY KEY,
      view_id INTEGER NOT NULL REFERENCES custom_result_views(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(view_id, account_id)
    );

    CREATE INDEX idx_custom_view_accounts_view_id ON custom_result_view_accounts(view_id);

    RAISE NOTICE 'Created custom_result_view_accounts table';
  ELSE
    RAISE NOTICE 'custom_result_view_accounts table already exists';
  END IF;

  -- Create custom_result_view_groups table if it doesn't exist (for group selections)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'custom_result_view_groups'
  ) THEN
    CREATE TABLE custom_result_view_groups (
      id SERIAL PRIMARY KEY,
      view_id INTEGER NOT NULL REFERENCES custom_result_views(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(view_id, group_id)
    );

    CREATE INDEX idx_custom_view_groups_view_id ON custom_result_view_groups(view_id);

    RAISE NOTICE 'Created custom_result_view_groups table';
  ELSE
    RAISE NOTICE 'custom_result_view_groups table already exists';
  END IF;

  -- Create custom_result_view_types table if it doesn't exist (for account type selections)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'custom_result_view_types'
  ) THEN
    CREATE TABLE custom_result_view_types (
      id SERIAL PRIMARY KEY,
      view_id INTEGER NOT NULL REFERENCES custom_result_views(id) ON DELETE CASCADE,
      account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('Intäkt', 'Utgift', 'Tillgång', 'Skuld')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(view_id, account_type)
    );

    CREATE INDEX idx_custom_view_types_view_id ON custom_result_view_types(view_id);

    RAISE NOTICE 'Created custom_result_view_types table';
  ELSE
    RAISE NOTICE 'custom_result_view_types table already exists';
  END IF;

END $$;
