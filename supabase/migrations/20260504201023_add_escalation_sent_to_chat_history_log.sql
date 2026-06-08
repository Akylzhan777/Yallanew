/*
  # Add escalation_sent flag to chat_history_log

  1. Changes
    - Add `escalation_sent` boolean column (default false) to `chat_history_log`
      to prevent re-alerting the same unanswered client message multiple times.

  2. Notes
    - Used by escalation-radar edge function to mark messages that have already
      triggered a Telegram alert.
    - Non-destructive: only adds a column with a safe default.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_history_log' AND column_name = 'escalation_sent'
  ) THEN
    ALTER TABLE chat_history_log ADD COLUMN escalation_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_history_log_escalation
  ON chat_history_log (escalation_sent, created_at DESC);
