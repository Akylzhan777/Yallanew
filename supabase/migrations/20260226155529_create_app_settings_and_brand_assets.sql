/*
  # App Settings & Brand Assets

  ## Summary
  Creates a singleton `app_settings` table to store global platform branding:
  app name, admin panel title, logo URL, and favicon URL.
  Inserts a default row with id = 1.

  ## Tables
  - `app_settings`
    - `id` (int, primary key, default 1)
    - `app_name` (text) — displayed in sidebar and browser tab
    - `admin_panel_title` (text) — displayed in admin sidebar header
    - `logo_url` (text) — public URL to logo image
    - `favicon_url` (text) — public URL to favicon image

  ## Security
  - RLS enabled
  - Public SELECT (anyone can read branding)
  - Only users with role = 'admin' in profiles can UPDATE

  ## Storage
  - Creates `brand_assets` bucket (public)
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1,
  app_name text NOT NULL DEFAULT 'Yalla Influence',
  admin_panel_title text NOT NULL DEFAULT 'Admin Panel',
  logo_url text NOT NULL DEFAULT '',
  favicon_url text NOT NULL DEFAULT '',
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO app_settings (id, app_name, admin_panel_title, logo_url, favicon_url)
VALUES (1, 'Yalla Influence', 'Admin Panel', '', '')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON app_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can update app settings"
  ON app_settings FOR UPDATE
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

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand_assets', 'brand_assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read brand assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'brand_assets');

CREATE POLICY "Admins can upload brand assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand_assets' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update brand assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand_assets' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete brand assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand_assets' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
