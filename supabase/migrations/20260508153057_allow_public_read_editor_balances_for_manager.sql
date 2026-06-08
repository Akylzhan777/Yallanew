/*
  # Allow public read access to editor_balances for manager portal

  The manager portal uses a custom auth system (not Supabase auth), so
  auth.uid() is null when managers are browsing. The existing RLS policies
  on editor_balances require profiles.role = 'admin', which blocks manager reads.

  This migration adds a public SELECT policy (matching the pattern already used
  on video_units) so the manager portal can display the editors/tasks panel.
  Write operations (INSERT, UPDATE, DELETE) remain admin-only for security.
*/

CREATE POLICY "Public can read editor balances"
  ON editor_balances FOR SELECT
  TO anon
  USING (true);
