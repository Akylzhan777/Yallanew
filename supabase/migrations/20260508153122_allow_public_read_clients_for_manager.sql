/*
  # Allow public read access to clients for manager portal

  The manager portal has no Supabase auth session, so auth.uid() is null.
  The existing SELECT policy requires is_admin = true, blocking the manager
  from seeing totalDebt and client data in the EditorsPanel.

  Adding an anon SELECT policy matching the pattern used by video_units and
  editor_balances. Write operations remain admin-only.
*/

CREATE POLICY "Public can read clients"
  ON clients FOR SELECT
  TO anon
  USING (true);
