/*
  # Add subscription fields to shootings_accounting

  Adds support for monthly subscription clients alongside the existing
  package (video count) model.

  ## New columns

  - `tariff_type` (text): 'package' (default) or 'monthly'
  - `subscription_end_date` (date): when the monthly subscription expires
  - `subscription_price` (numeric): monthly cost in AED

  All existing rows default to tariff_type = 'package' so no data is lost.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shootings_accounting' AND column_name = 'tariff_type'
  ) THEN
    ALTER TABLE shootings_accounting ADD COLUMN tariff_type text NOT NULL DEFAULT 'package';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shootings_accounting' AND column_name = 'subscription_end_date'
  ) THEN
    ALTER TABLE shootings_accounting ADD COLUMN subscription_end_date date DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shootings_accounting' AND column_name = 'subscription_price'
  ) THEN
    ALTER TABLE shootings_accounting ADD COLUMN subscription_price numeric DEFAULT NULL;
  END IF;
END $$;
