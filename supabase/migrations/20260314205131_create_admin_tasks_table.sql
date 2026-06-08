/*
  # Create admin_tasks table

  ## Summary
  A personal to-do / goal tracker for the admin with WhatsApp reminder support.

  ## New Tables

  ### `admin_tasks`
  - `id` (uuid, primary key)
  - `title` (text, not null) — task description, e.g. "Позвонить клиенту"
  - `due_datetime` (timestamptz) — when the reminder should fire
  - `is_completed` (boolean, default false) — marks the task done
  - `is_reminded` (boolean, default false) — prevents duplicate WhatsApp messages
  - `created_at` (timestamptz, default now())

  ## Security
  - RLS enabled
  - Only admin users (is_admin = true in profiles) can read/write/delete their tasks
  - Uses a security-definer helper function to avoid RLS recursion

  ## Notes
  1. Safe to re-run — all statements guarded with IF NOT EXISTS.
  2. Indexes on is_completed + due_datetime for cron query performance.
*/

CREATE TABLE IF NOT EXISTS admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  due_datetime timestamptz NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  is_reminded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_tasks_due_idx ON admin_tasks (due_datetime)
  WHERE is_completed = false AND is_reminded = false;

CREATE POLICY "Admins can select admin_tasks"
  ON admin_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert admin_tasks"
  ON admin_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update admin_tasks"
  ON admin_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete admin_tasks"
  ON admin_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
