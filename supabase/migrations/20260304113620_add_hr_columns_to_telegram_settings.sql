/*
  # Add HR Bot columns to telegram_settings

  1. Changes
    - Adds `hr_group_chat_id` (TEXT, nullable) — Chat ID of the YallaJob HR Telegram group
    - Adds `hr_welcome_template` (TEXT, nullable) — Welcome message template for new members; supports {name} placeholder
    - Adds `hr_last_welcome_message_id` (TEXT, nullable) — Tracks the last sent welcome message ID for auto-deletion

  2. Notes
    - All columns are nullable so existing rows are unaffected
    - No RLS changes needed; existing policies on telegram_settings apply
    - These columns are strictly for the HR bot and must not affect marketing broadcast logic
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'hr_group_chat_id'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN hr_group_chat_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'hr_welcome_template'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN hr_welcome_template TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'hr_last_welcome_message_id'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN hr_last_welcome_message_id TEXT;
  END IF;
END $$;
