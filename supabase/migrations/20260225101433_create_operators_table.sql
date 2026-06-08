/*
  # Create operators table

  ## Summary
  Creates a table to store crew/operator profiles for the booking system.
  Replaces the static OPERATORS array in the frontend code.

  ## New Tables
  - `operators`
    - `id` (uuid, primary key) — unique identifier
    - `name` (text) — operator's full name
    - `role` (text) — specialization, e.g. "FPV Pilot", "Editor"
    - `photo` (text) — URL to operator's profile photo
    - `telegram_id` (text) — Telegram user ID for booking notifications
    - `sort_order` (int) — display ordering on the selection screen
    - `is_active` (boolean) — whether operator appears in public listing
    - `created_at` (timestamptz) — record creation timestamp

  ## Security
  - RLS enabled
  - Public can read active operators (needed for /booking page without auth)
  - Only authenticated admins can insert, update, delete

  ## Seed Data
  Migrates the three existing static operators into the table
*/

CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  photo text NOT NULL DEFAULT '',
  telegram_id text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active operators"
  ON operators FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert operators"
  ON operators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update operators"
  ON operators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete operators"
  ON operators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

INSERT INTO operators (name, role, photo, telegram_id, sort_order) VALUES
  ('Alex Petrov', 'Lead Videographer', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400', '', 1),
  ('Dima Korolev', 'FPV Drone Pilot', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', '', 2),
  ('Sara Nour', 'Content Producer', 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=400', '', 3)
ON CONFLICT DO NOTHING;
