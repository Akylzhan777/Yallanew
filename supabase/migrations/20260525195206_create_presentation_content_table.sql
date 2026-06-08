/*
  # Create presentation_content table

  1. New Tables
    - `presentation_content`
      - `id` (uuid, primary key)
      - `section_key` (text, unique) - identifies the section (e.g. 'intro', 'cinema_grade', 'unlimited', 'platform', 'targeting', 'speed', 'mechanism', 'pricing')
      - `title` (text) - main heading text
      - `subtitle` (text) - secondary heading
      - `description` (text) - body/description text
      - `image_url` (text) - optional media URL
      - `icon_url` (text) - optional icon URL
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last update timestamp

  2. Security
    - Enable RLS on `presentation_content` table
    - Public read for presentation page display
    - Admin-only write access
*/

CREATE TABLE IF NOT EXISTS presentation_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  icon_url text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE presentation_content ENABLE ROW LEVEL SECURITY;

-- Public read for the presentation page
CREATE POLICY "Anyone can view presentation content"
  ON presentation_content FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admin insert
CREATE POLICY "Admins can insert presentation content"
  ON presentation_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admin update
CREATE POLICY "Admins can update presentation content"
  ON presentation_content FOR UPDATE
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
CREATE POLICY "Admins can delete presentation content"
  ON presentation_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
