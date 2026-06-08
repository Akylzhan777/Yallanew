/*
  # Add last_payment_date to clients table

  ## Summary
  Adds a `last_payment_date` column to the `clients` table to track when the
  most recent payment was made. This enables the Payment Calendar feature in the
  CRM and the Monthly Income widget on the Admin Dashboard.

  ## Changes
  ### Modified Tables
  - `clients`
    - `last_payment_date` (timestamptz, nullable): Timestamp of the most recent
      payment recorded for this client. Updated automatically whenever
      `amount_paid` is modified by the admin.

  ## Notes
  - Column is nullable — clients with no recorded payment date will have NULL.
  - Existing rows keep NULL until the next time their payment is updated.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE clients ADD COLUMN last_payment_date timestamptz;
  END IF;
END $$;
