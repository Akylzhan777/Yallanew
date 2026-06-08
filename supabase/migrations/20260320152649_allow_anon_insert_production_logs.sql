/*
  # Allow anonymous inserts into production_logs

  ## Problem
  The Operator Portal uses a simple password (not Supabase auth), so operators
  are anonymous (anon role) when they submit videos. The video_units table already
  allows anon inserts, but production_logs only allowed authenticated admins to
  insert — causing an RLS violation that silently killed the entire form submission.

  ## Fix
  Add a permissive INSERT policy for the anon role on production_logs, matching
  the same pattern already used for video_units.
*/

CREATE POLICY "Public can insert production logs"
  ON production_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);
