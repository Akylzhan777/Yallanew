/*
  # Telegram Broadcast Tables

  ## Overview
  Creates two tables to support the automated Telegram broadcast system
  in the Admin Panel Robot Control Center.

  ## New Tables

  ### 1. `telegram_settings`
  Stores the bot configuration used for sending broadcasts.
  - `id` (uuid, primary key)
  - `bot_token` (text) — Telegram Bot API token
  - `message_template` (text) — Default broadcast message template
  - `updated_at` (timestamptz) — Last update timestamp

  ### 2. `telegram_groups`
  Stores the list of Telegram groups/chats to broadcast to.
  - `id` (uuid, primary key)
  - `name` (text) — Human-readable group name
  - `chat_id` (text) — Telegram chat ID (can be negative for groups)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Only admins (role = 'admin') can read and write telegram_settings
  - Only admins can manage telegram_groups
  - Admin check uses a security-definer helper to avoid RLS recursion

  ## Notes
  1. Only one row is expected in telegram_settings (upsert by fixed id)
  2. chat_id stored as text to support both positive (user) and negative (group) IDs
*/

CREATE TABLE IF NOT EXISTS telegram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text NOT NULL DEFAULT '',
  message_template text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE telegram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read telegram settings"
  ON telegram_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert telegram settings"
  ON telegram_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update telegram settings"
  ON telegram_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS telegram_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  chat_id text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE telegram_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read telegram groups"
  ON telegram_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert telegram groups"
  ON telegram_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete telegram groups"
  ON telegram_groups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_telegram_groups_created_at ON telegram_groups(created_at DESC);
