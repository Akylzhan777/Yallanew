-- Create editor-portfolio storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'editor-portfolio',
  'editor-portfolio',
  true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated editors to upload to their own folder
CREATE POLICY "Editors can upload portfolio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'editor-portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated editors to delete their own files
CREATE POLICY "Editors can delete own portfolio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'editor-portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read for all portfolio files
CREATE POLICY "Public read editor portfolio"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'editor-portfolio');
