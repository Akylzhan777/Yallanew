/*
  # Create shootings_accounting table

  1. New Tables
    - `shootings_accounting`
      - `id` (uuid, primary key)
      - `name` (text) – client name
      - `purchased` (int) – number of videos purchased
      - `filmed` (int) – number of videos already filmed
      - `sources_link` (text) – URL to raw footage folder
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Admins (role = 'admin') can SELECT, INSERT, UPDATE, DELETE
    - Service-role bypasses RLS by default (no extra policy needed)
*/

CREATE TABLE IF NOT EXISTS shootings_accounting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  purchased int NOT NULL DEFAULT 0,
  filmed int NOT NULL DEFAULT 0,
  sources_link text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shootings_accounting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select shootings accounting"
  ON shootings_accounting FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert shootings accounting"
  ON shootings_accounting FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update shootings accounting"
  ON shootings_accounting FOR UPDATE
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

CREATE POLICY "Admins can delete shootings accounting"
  ON shootings_accounting FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
