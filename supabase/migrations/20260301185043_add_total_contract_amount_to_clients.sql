/*
  # Add total_contract_amount to clients table

  ## Summary
  Adds a new numeric column to support partial payment tracking and debt calculation.

  ## Changes
  - `clients` table: new column `total_contract_amount` (numeric, default 0)
    - Represents the full agreed contract price for the client
    - Combined with existing `amount_paid`, allows computing outstanding debt:
      debt = total_contract_amount - amount_paid

  ## Notes
  - Default 0 so existing rows are not affected
  - No RLS changes needed — column inherits existing policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'total_contract_amount'
  ) THEN
    ALTER TABLE clients ADD COLUMN total_contract_amount numeric DEFAULT 0;
  END IF;
END $$;
