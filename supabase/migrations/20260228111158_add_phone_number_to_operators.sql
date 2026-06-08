/*
  # Add phone_number column to operators table

  ## Summary
  Adds a WhatsApp-compatible phone number field to each operator's profile.
  This enables the nightly 22:00 cron job to look up each operator's number
  directly from the database rather than relying on the now-deleted
  OPERATOR_PHONE environment variable.

  ## Changes
  ### Modified Tables
  - `operators`
    - `phone_number` (text, default '') — operator's WhatsApp phone number
      in international format, e.g. 994553559500. Used exclusively by the
      driver-daily-schedule edge function for the nightly dispatch.

  ## Notes
  - Uses IF NOT EXISTS guard so the migration is idempotent.
  - No RLS changes needed; existing operator policies cover this column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE operators ADD COLUMN phone_number text NOT NULL DEFAULT '';
  END IF;
END $$;
