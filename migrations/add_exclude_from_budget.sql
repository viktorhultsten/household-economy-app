-- Migration: Add exclude_from_budget column to accounts table
-- This allows users to exclude specific accounts from budget tools

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS exclude_from_budget INTEGER DEFAULT 0;
