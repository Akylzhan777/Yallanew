/*
  # Create chat_history_log table

  1. New Tables
    - `chat_history_log`
      - `id` (uuid, primary key)
      - `chat_id` (text) – Telegram chat/group id
      - `sender_name` (text) – from.first_name of the sender
      - `message_text` (text) – raw message text
      - `created_at` (timestamptz, default now())
      - `summarized` (boolean, default false) – flag set to true after daily summary is sent

  2. Security
    - Enable RLS
    - Admins (via is_admin()) can select, insert, update, delete
    - Service-role inserts are covered by SECURITY DEFINER functions; a separate policy for
      service-role is not needed because service-role bypasses RLS by default.

  3. Notes
    - `summarized` flag is used instead of deletion so historical data is preserved safely.
    - Index on (chat_id, created_at) for fast 24-hour window queries.
*/

CREATE TABLE IF NOT EXISTS chat_history_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  message_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  summarized boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_chat_history_log_chat_created
  ON chat_history_log (chat_id, created_at DESC);

ALTER TABLE chat_history_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select chat history"
  ON chat_history_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert chat history"
  ON chat_history_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update chat history"
  ON chat_history_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete chat history"
  ON chat_history_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
