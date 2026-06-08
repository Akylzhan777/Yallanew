/*
  # Add plan type, barter flag, and date range to clients table

  ## Summary
  Extends the `clients` table to support three commercial arrangements:
  - **Package** (default): client buys a fixed number of videos.
  - **Unlimited**: client pays a flat fee for unlimited videos within a date range.
  - **Barter**: client does not pay in AED; their videos still count toward editor expenses.

  ## Changes to `clients` table
  - `plan_type` (text, default 'package'): discriminator for UI and revenue logic.
    Allowed values: 'package', 'unlimited'.
  - `is_barter` (boolean, default false): when true, amount_paid is treated as 0 for revenue
    but editor payouts still apply.
  - `start_date` (timestamptz, nullable): start of contract period for unlimited plans.
  - `end_date` (timestamptz, nullable): end of contract period for unlimited plans.
    Used to compute "days remaining" in the CRM UI instead of "videos remaining".

  ## Notes
  1. All columns are additive — no existing rows are modified.
  2. Package clients are unaffected; their `plan_type` defaults to 'package'.
  3. Revenue logic: barter clients contribute 0 AED to revenue regardless of `amount_paid`.
  4. Unlimited clients: full `amount_paid` is recognized as revenue.
  5. Production tracking (Снято / В работе / Готово) remains on for ALL plan types.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE clients ADD COLUMN plan_type text NOT NULL DEFAULT 'package';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'is_barter'
  ) THEN
    ALTER TABLE clients ADD COLUMN is_barter boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE clients ADD COLUMN start_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE clients ADD COLUMN end_date timestamptz;
  END IF;
END $$;
