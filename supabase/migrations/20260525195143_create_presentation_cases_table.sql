/*
  # Create presentation_cases table

  1. New Tables
    - `presentation_cases`
      - `id` (uuid, primary key)
      - `name` (text) - company name displayed in the case
      - `instagram_url` (text) - link to company Instagram page
      - `image_url` (text) - avatar/logo image URL from storage
      - `created_at` (timestamptz) - creation timestamp

  2. Security
    - Enable RLS on `presentation_cases` table
    - Public read access for authenticated and anon (presentation is public)
    - Admin-only write access (insert, update, delete)
*/

CREATE TABLE IF NOT EXISTS presentation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  instagram_url text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE presentation_cases ENABLE ROW LEVEL SECURITY;

-- Public read for the presentation page
CREATE POLICY "Anyone can view presentation cases"
  ON presentation_cases FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admin insert
CREATE POLICY "Admins can insert presentation cases"
  ON presentation_cases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admin update
CREATE POLICY "Admins can update presentation cases"
  ON presentation_cases FOR UPDATE
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

-- Admin delete
CREATE POLICY "Admins can delete presentation cases"
  ON presentation_cases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
