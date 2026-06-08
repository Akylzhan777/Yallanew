/*
  # Add last message ID columns to telegram_groups

  ## Changes
  - `telegram_groups` table: adds two new nullable TEXT columns
    - `last_weekly_message_id`: stores the Telegram message_id of the last weekly broadcast sent to this group
    - `last_daily_message_id`: stores the Telegram message_id of the last daily broadcast sent to this group

  ## Purpose
  These columns allow the broadcast function to delete the previous broadcast message
  before sending a new one, keeping group chats clean.

  ## Notes
  1. Both columns are nullable — no previous message ID means skip delete.
  2. Uses ADD COLUMN IF NOT EXISTS for safe re-execution.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_groups' AND column_name = 'last_weekly_message_id'
  ) THEN
    ALTER TABLE telegram_groups ADD COLUMN last_weekly_message_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_groups' AND column_name = 'last_daily_message_id'
  ) THEN
    ALTER TABLE telegram_groups ADD COLUMN last_daily_message_id TEXT;
  END IF;
END $$;
