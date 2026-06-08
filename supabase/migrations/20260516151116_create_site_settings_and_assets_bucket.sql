/*
  # Create Site Settings CMS table and site-assets storage bucket

  1. New Tables
    - `site_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - identifier for the setting (e.g. 'homepage_hero')
      - `value` (jsonb) - stores structured content (titles, image URLs, etc.)
      - `updated_at` (timestamptz) - last modification time

  2. Default Data
    - Inserts default 'homepage_hero' configuration with placeholder values

  3. Storage
    - Creates public bucket `site-assets` for uploaded images
    - Public read access for anyone
    - Write access restricted to admin role

  4. Security
    - RLS enabled on `site_settings`
    - SELECT: authenticated users can read all settings
    - SELECT: anon users can read all settings (needed for public homepage)
    - UPDATE: only admin users can modify settings
    - INSERT: only admin users can insert settings
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (public homepage needs this)
CREATE POLICY "Anyone can read site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can update site settings
CREATE POLICY "Admins can update site settings"
  ON site_settings FOR UPDATE
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

-- Only admins can insert site settings
CREATE POLICY "Admins can insert site settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default homepage_hero config
INSERT INTO site_settings (key, value) VALUES (
  'homepage_hero',
  jsonb_build_object(
    'background_image', '',
    'heading_line1', 'Find Top',
    'heading_accent', 'Creators',
    'heading_line2', 'for Your Brand',
    'subtitle', 'Connect with verified content creators for your marketing campaigns',
    'badge_text', 'CREATOR MARKETPLACE',
    'stats', jsonb_build_array(
      jsonb_build_object('value', '200+', 'label', 'Verified Creators'),
      jsonb_build_object('value', '50M+', 'label', 'Total Reach'),
      jsonb_build_object('value', '1,200+', 'label', 'Campaigns Run')
    )
  )
) ON CONFLICT (key) DO NOTHING;

-- Create site-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read
CREATE POLICY "Public read access for site-assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'site-assets');

-- Storage policies: only admins can upload
CREATE POLICY "Admins can upload to site-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Storage policies: only admins can update
CREATE POLICY "Admins can update site-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Storage policies: only admins can delete
CREATE POLICY "Admins can delete from site-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );