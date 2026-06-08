/*
  # Add daily_template column to telegram_settings

  ## Changes
  - `telegram_settings` table: adds `daily_template` (TEXT, default '') column
    Used to store the daily broadcast message template sent every day at 10:00 AM UTC.

  ## Notes
  1. Uses IF NOT EXISTS guard so re-running is safe.
  2. No RLS changes needed — table already has RLS disabled.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'daily_template'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN daily_template TEXT NOT NULL DEFAULT '';
  END IF;
END $$;
