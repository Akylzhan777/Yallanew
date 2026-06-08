/*
  # Create yalla_assets storage bucket

  1. Storage
    - Create public bucket `yalla_assets` for presentation media (case avatars, section images, icons)
    - Public read access for anyone (content is shown on public presentation page)
    - Upload/update/delete restricted to authenticated admin users

  2. Policies
    - SELECT (download): public access for all users
    - INSERT (upload): admin-only
    - UPDATE (overwrite): admin-only  
    - DELETE (remove): admin-only
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('yalla_assets', 'yalla_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Public read yalla_assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'yalla_assets');

-- Admin upload policy
CREATE POLICY "Admins can upload to yalla_assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'yalla_assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admin update policy
CREATE POLICY "Admins can update yalla_assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'yalla_assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'yalla_assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admin delete policy
CREATE POLICY "Admins can delete from yalla_assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'yalla_assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
