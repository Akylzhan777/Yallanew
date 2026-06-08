/*
  # Create operator-photos storage bucket

  ## Summary
  Sets up Supabase Storage for operator profile photos.

  ## Changes
  1. Creates the `operator-photos` storage bucket (public)
  2. Adds storage policies:
     - Anyone can view/download photos (public read)
     - Only admins can upload, update, delete photos

  ## Notes
  - Bucket is public so photos can be used in img tags without auth headers
  - Upload policy restricts to authenticated admins only
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operator-photos',
  'operator-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view operator photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'operator-photos');

CREATE POLICY "Admins can upload operator photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'operator-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update operator photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'operator-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete operator photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'operator-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
