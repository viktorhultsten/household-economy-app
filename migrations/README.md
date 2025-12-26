# Database Migrations

## Convert REAL to NUMERIC

**Problem:** The database was using `REAL` (floating-point) data types for monetary values, which caused precision errors. This resulted in small rounding differences like 0.02 kr in account balances.

**Solution:** Convert all monetary columns to `NUMERIC(15, 2)` which stores exact decimal values.

### Running the Migration

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Run the migration:
   ```bash
   npm run migrate:numeric
   ```

This will convert:
- `bank_events.amount` from REAL to NUMERIC(15, 2)
- `posts.debet` from REAL to NUMERIC(15, 2)
- `posts.kredit` from REAL to NUMERIC(15, 2)

The migration is safe to run multiple times - it checks if the columns are already NUMERIC before attempting conversion.
