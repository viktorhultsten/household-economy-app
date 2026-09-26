import { Pool } from "pg";

/**
 * One-time, idempotent reconciliation of a pre-Drizzle database.
 *
 * The production database was built from the old runtime `schema.sql` (plus
 * hand-applied ad-hoc migrations) before Drizzle existed, so its physical schema
 * drifted from what Drizzle's `0000` snapshot describes. This function brings
 * such a database in line with the canonical Drizzle schema so that the `0000`
 * baseline is honest and every future migration behaves identically on dev,
 * prod and a freshly-migrated database.
 *
 * It is safe to run repeatedly and safe on an already-canonical database: every
 * step is guarded, so it is a no-op once the database matches. On a fresh/empty
 * database (no `transactions` table yet) it returns immediately.
 *
 * Drift it corrects (discovered via `npm run db:rehearse`):
 *   A. Constraint names: Postgres auto-names (`*_fkey`/`*_key`) → Drizzle names
 *      (`*_fk`/`*_unique`). If both exist, the stale auto-named duplicate is dropped.
 *   B. `TEXT` date columns → real `date`.
 *   C. Missing `NOT NULL` on `accounts.exclude_from_budget`, `bank_events.is_posted`.
 *   D. Stale `posts_check` (double precision) → `posts_debet_kredit_check`.
 *   E. Dead columns from the removed period-shift feature (issue 01).
 *   F. Re-create the account-type check so it renders like Drizzle's.
 *
 * The old booking-template tables are dropped by migration 0008 (ADR-0010), so
 * they are deliberately absent from the rename list: the `::regclass` lookup
 * would fail on a re-run once the tables are gone.
 */
export async function reconcilePreDrizzle(pool: Pool): Promise<void> {
  await pool.query(RECONCILE_SQL);
}

const RECONCILE_SQL = `
DO $reconcile$
DECLARE
  r record;
BEGIN
  -- Only reconcile a database that already has the pre-Drizzle schema.
  IF to_regclass('public.transactions') IS NULL THEN
    RETURN;
  END IF;

  -- E. Drop dead period-shift objects (feature removed in issue 01).
  DROP INDEX IF EXISTS public.idx_transactions_original_id;
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_bridge_account_id_fkey;
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_original_transaction_id_fkey;
  ALTER TABLE public.transactions DROP COLUMN IF EXISTS bridge_account_id;
  ALTER TABLE public.transactions DROP COLUMN IF EXISTS original_transaction_id;
  ALTER TABLE public.transactions DROP COLUMN IF EXISTS period_shift_date;

  -- A. Rename Postgres auto-named constraints to Drizzle's canonical names.
  --    Long target names are truncated to 63 chars by Postgres, matching the
  --    names a fresh Drizzle migration produces.
  FOR r IN
    SELECT * FROM (VALUES
      ('accounts','accounts_group_id_fkey','accounts_group_id_groups_id_fk'),
      ('bank_events','bank_events_transaction_id_fkey','bank_events_transaction_id_transactions_id_fk'),
      ('bank_events','bank_events_import_id_fkey','bank_events_import_id_imports_id_fk'),
      ('budgets','budgets_account_id_fkey','budgets_account_id_accounts_id_fk'),
      ('custom_result_view_accounts','custom_result_view_accounts_view_id_fkey','custom_result_view_accounts_view_id_custom_result_views_id_fk'),
      ('custom_result_view_accounts','custom_result_view_accounts_account_id_fkey','custom_result_view_accounts_account_id_accounts_id_fk'),
      ('custom_result_view_groups','custom_result_view_groups_view_id_fkey','custom_result_view_groups_view_id_custom_result_views_id_fk'),
      ('custom_result_view_groups','custom_result_view_groups_group_id_fkey','custom_result_view_groups_group_id_groups_id_fk'),
      ('custom_result_view_types','custom_result_view_types_view_id_fkey','custom_result_view_types_view_id_custom_result_views_id_fk'),
      ('imports','imports_account_id_fkey','imports_account_id_accounts_id_fk'),
      ('posts','posts_transaction_id_fkey','posts_transaction_id_transactions_id_fk'),
      ('posts','posts_account_id_fkey','posts_account_id_accounts_id_fk'),
      ('transaction_recurring_items','transaction_recurring_items_transaction_id_fkey','transaction_recurring_items_transaction_id_transactions_id_fk'),
      ('transaction_recurring_items','transaction_recurring_items_recurring_item_id_fkey','transaction_recurring_items_recurring_item_id_recurring_items_id_fk'),
      ('transactions','transactions_bank_event_id_fkey','transactions_bank_event_id_bank_events_id_fk'),
      ('budgets','budgets_account_id_year_month_key','budgets_account_id_year_month_unique'),
      ('custom_result_view_accounts','custom_result_view_accounts_view_id_account_id_key','custom_result_view_accounts_view_id_account_id_unique'),
      ('custom_result_view_groups','custom_result_view_groups_view_id_group_id_key','custom_result_view_groups_view_id_group_id_unique'),
      ('custom_result_view_types','custom_result_view_types_view_id_account_type_key','custom_result_view_types_view_id_account_type_unique'),
      ('groups','groups_namn_key','groups_namn_unique'),
      ('period_locks','period_locks_year_month_key','period_locks_year_month_unique'),
      ('recurring_items','recurring_items_namn_key','recurring_items_namn_unique'),
      ('transaction_recurring_items','transaction_recurring_items_transaction_id_recurring_item_i_key','transaction_recurring_items_transaction_id_recurring_item_id_unique')
    ) AS t(tbl, oldname, newname)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = r.oldname AND conrelid = ('public.' || quote_ident(r.tbl))::regclass
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = r.newname AND conrelid = ('public.' || quote_ident(r.tbl))::regclass
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', r.tbl, r.oldname, r.newname);
    ELSIF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = r.oldname AND conrelid = ('public.' || quote_ident(r.tbl))::regclass
    ) THEN
      -- Both names exist (a duplicate was added by hand): drop the stale one.
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.oldname);
    END IF;
  END LOOP;

  -- B. Convert TEXT date columns to real dates (only while still text).
  FOR r IN
    SELECT * FROM (VALUES
      ('transactions','date'),
      ('bank_events','date'),
      ('imports','date_range_start'),
      ('imports','date_range_end')
    ) AS t(tbl, col)
  LOOP
    IF (
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col
    ) = 'text' THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE date USING %I::date', r.tbl, r.col, r.col);
    END IF;
  END LOOP;

  -- C. Add missing NOT NULL (backfill any nulls first).
  UPDATE public.accounts SET exclude_from_budget = 0 WHERE exclude_from_budget IS NULL;
  ALTER TABLE public.accounts ALTER COLUMN exclude_from_budget SET NOT NULL;
  UPDATE public.bank_events SET is_posted = 0 WHERE is_posted IS NULL;
  ALTER TABLE public.bank_events ALTER COLUMN is_posted SET NOT NULL;

  -- D. Replace the stale posts check (old double-precision form, wrong name).
  ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_check;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'posts_debet_kredit_check' AND conrelid = 'public.posts'::regclass
  ) THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_debet_kredit_check
      CHECK ((debet > 0 AND kredit = 0) OR (kredit > 0 AND debet = 0) OR (debet = 0 AND kredit = 0));
  END IF;

  -- F. Re-create the account-type check so it renders identically to Drizzle's.
  ALTER TABLE public.custom_result_view_types DROP CONSTRAINT IF EXISTS custom_result_view_types_account_type_check;
  ALTER TABLE public.custom_result_view_types ADD CONSTRAINT custom_result_view_types_account_type_check
    CHECK (account_type IN ('Intäkt', 'Utgift', 'Tillgång', 'Skuld'));
END
$reconcile$;
`;
