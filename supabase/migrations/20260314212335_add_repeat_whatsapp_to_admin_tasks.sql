/*
  # Add repeat interval and WhatsApp recipient columns to admin_tasks

  ## Summary
  Enhances the admin task manager with per-task WhatsApp recipient numbers
  and configurable repeat intervals so the system keeps sending reminders
  until the task is explicitly marked as completed.

  ## Modified Tables

  ### `admin_tasks`
  - `whatsapp_number` (text, nullable) — recipient phone number in international
    format without '+', e.g. "971585973177". Falls back to admin default if null.
  - `repeat_interval` (text, default 'none') — one of: 'none', '15m', '30m', '1h', '1d'.
    Controls how often to re-send after the initial due_datetime fires.
  - `last_reminded_at` (timestamptz, nullable) — timestamp of the most recent
    successful WhatsApp send. Used by cron to compute next send time.

  ## Notes
  1. All statements guarded with IF NOT EXISTS.
  2. `is_reminded` is kept for backwards compatibility but `last_reminded_at`
     is now the primary tracking field.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_tasks' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE admin_tasks ADD COLUMN whatsapp_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_tasks' AND column_name = 'repeat_interval'
  ) THEN
    ALTER TABLE admin_tasks ADD COLUMN repeat_interval text NOT NULL DEFAULT 'none';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_tasks' AND column_name = 'last_reminded_at'
  ) THEN
    ALTER TABLE admin_tasks ADD COLUMN last_reminded_at timestamptz;
  END IF;
END $$;
