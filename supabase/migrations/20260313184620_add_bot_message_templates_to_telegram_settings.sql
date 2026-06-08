/*
  # Add Bot Message Templates to telegram_settings

  ## Summary
  Adds two new editable text columns to the `telegram_settings` table so the
  business owner can manage marketing copy from the admin UI instead of it
  being hardcoded in backend functions.

  ## New Columns

  ### `telegram_settings`
  - `weekly_broadcast_text` (text, nullable) — The full message text sent by the
    weekly Telegram broadcast cron (every Friday). Replaces any previously
    hardcoded weekly template copy.
  - `daily_availability_text` (text, nullable) — The message template for the
    Smart Availability daily cron (every day at 19:00 Dubai time). Must contain
    the literal string `{slots}` which the backend replaces with the computed
    list of free time slots.

  ## Notes
  1. Both columns are nullable. If empty the backend falls back to a sensible
     default so existing automations never break.
  2. No RLS changes needed — these columns live in the existing single-row
     settings table which already has admin-only write policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'weekly_broadcast_text'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN weekly_broadcast_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'daily_availability_text'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN daily_availability_text text;
  END IF;
END $$;
