/*
  # Create portfolio-videos storage bucket

  ## Summary
  Creates a public Supabase Storage bucket for hosting uploaded portfolio video files.
  Videos uploaded here will be served via public URL and embedded in the portfolio using
  a native HTML5 <video> tag.

  ## Security
  - Bucket is public (videos are portfolio showcase content, not private data)
  - Only authenticated users with admin role can upload/delete
  - Anyone can read (required for public portfolio page)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-videos', 'portfolio-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read portfolio videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'portfolio-videos');

CREATE POLICY "Admin upload portfolio videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-videos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin delete portfolio videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio-videos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
