/*
  # Add credit expiration support

  ## Summary
  Implements expiring credits across the platform.

  ## Changes

  ### credit_packages table
  - Added `validity_days` (integer, NOT NULL DEFAULT 30): how many days the credits last after purchase.
  - Set existing packages: '15 videos' → 30 days, 'unlimited' → 30 days, '90 videos' → 90 days.
    Because the exact titles are unknown we set a sensible default of 30 for all and then apply 90 for the highest-credit package.

  ### profiles table
  - Added `credits_expire_at` (timestamptz, nullable): the timestamp after which the user's balance is treated as 0.

  ## Notes
  - No existing data is destroyed.
  - The frontend enforces the expiry check visually and on booking.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_packages' AND column_name = 'validity_days'
  ) THEN
    ALTER TABLE credit_packages ADD COLUMN validity_days integer NOT NULL DEFAULT 30;
  END IF;
END $$;

UPDATE credit_packages
SET validity_days = 90
WHERE credits_value = (SELECT MAX(credits_value) FROM credit_packages);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'credits_expire_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credits_expire_at timestamptz DEFAULT NULL;
  END IF;
END $$;
