/*
  # Create platform_settings table

  ## Purpose
  Stores global platform configuration values that admins can change without code deployments.

  ## New Tables
  - `platform_settings`
    - `id` (integer, primary key, always 1) — single-row table pattern
    - `markup_percentage` (numeric, default 20) — platform commission rate applied to creator packages
    - `updated_at` (timestamptz) — when the settings were last changed
    - `updated_by` (uuid, nullable) — admin user who last changed settings

  ## Security
  - RLS enabled; only authenticated users with role='admin' can read or write
  - Public SELECT allowed so the onboarding calculator can read the value without auth
  - Only admins can UPDATE

  ## Notes
  1. Single-row table: id is always 1, use UPSERT to update
  2. markup_percentage is the percentage added on top of creator earnings when quoting the client price
     (e.g. 20 means client pays creator_price * 1.20)
*/

CREATE TABLE IF NOT EXISTS platform_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  markup_percentage numeric NOT NULL DEFAULT 20,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed the single row
INSERT INTO platform_settings (id, markup_percentage)
VALUES (1, 20)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can read the markup rate
-- so the onboarding calculator works even before login
CREATE POLICY "Public can read platform settings"
  ON platform_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update platform settings"
  ON platform_settings FOR UPDATE
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
