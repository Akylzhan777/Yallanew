/*
  # Add manual_adjustment to editor_balances

  ## Summary
  Adds a numeric `manual_adjustment` column to `editor_balances` to support
  historical balance migration and manual corrections (bonuses, advance deductions).

  ## Changes
  ### Modified Tables
  - `editor_balances`
    - New column: `manual_adjustment` (numeric, default 0) — stores the pre-system
      historical balance or any future manual correction applied by admin.

  ## Notes
  1. Safe migration using IF NOT EXISTS guard.
  2. Does NOT touch any existing rows or dynamic calculation logic.
  3. Default of 0 means no change in behaviour for editors with no historical balance.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_balances' AND column_name = 'manual_adjustment'
  ) THEN
    ALTER TABLE editor_balances ADD COLUMN manual_adjustment numeric DEFAULT 0;
  END IF;
END $$;
