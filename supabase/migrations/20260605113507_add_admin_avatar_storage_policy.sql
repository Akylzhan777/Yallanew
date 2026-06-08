-- Allow admins to upload/update/delete avatars for any user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can manage all avatars'
  ) THEN
    CREATE POLICY "Admins can manage all avatars"
      ON storage.objects FOR ALL
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND public.is_admin()
      )
      WITH CHECK (
        bucket_id = 'avatars'
        AND public.is_admin()
      );
  END IF;
END $$;
