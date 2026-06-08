/*
  # Add HR Broadcast Columns to telegram_settings

  ## Summary
  Adds two new columns to support the automated 5x daily HR broadcast feature
  for the YallaJob group, completely isolated from client marketing broadcasts.

  ## New Columns
  - `hr_broadcast_template` (TEXT) — The message template sent 5 times per day to the YallaJob HR group
  - `hr_last_broadcast_message_id` (TEXT) — Stores the Telegram message_id of the last sent broadcast
    so the previous message can be deleted before sending the new one

  ## Notes
  - Both columns are nullable (no default required — feature is opt-in)
  - No RLS changes needed — existing telegram_settings policies cover these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'hr_broadcast_template'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN hr_broadcast_template TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'hr_last_broadcast_message_id'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN hr_last_broadcast_message_id TEXT;
  END IF;
END $$;
