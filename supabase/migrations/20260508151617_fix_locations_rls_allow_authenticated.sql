/*
  # Fix locations RLS policies to allow all authenticated users

  The manager portal uses the same Supabase client without its own auth session,
  relying on the existing admin session. Open policies to all authenticated users
  (matching the pattern used by video_units and other shared tables).
*/

DROP POLICY IF EXISTS "Admins can select locations" ON locations;
DROP POLICY IF EXISTS "Admins can insert locations" ON locations;
DROP POLICY IF EXISTS "Admins can update locations" ON locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON locations;

CREATE POLICY "Authenticated can select locations"
  ON locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (true);
