/*
  # Add admin_whatsapp_number to app_settings

  ## Summary
  Adds a single column to `app_settings` so the admin can configure which
  WhatsApp number receives automated payment-reminder notifications sent via
  the Green API integration.

  ## New Columns

  ### `app_settings`
  - `admin_whatsapp_number` (text, nullable) — the admin's WhatsApp phone number
    in international format without the '+' sign, e.g. "971585973177".
    Used by the payment-reminders cron edge function to route alerts.

  ## Notes
  1. Safe to re-run — guarded with IF NOT EXISTS.
  2. No RLS changes needed; the existing admin-only policies already govern
     read/write on this table.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'admin_whatsapp_number'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN admin_whatsapp_number text;
  END IF;
END $$;
