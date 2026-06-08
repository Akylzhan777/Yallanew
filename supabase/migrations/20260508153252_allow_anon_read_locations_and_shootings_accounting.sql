/*
  # Allow anon read on locations and shootings_accounting for manager portal

  The manager portal has no Supabase auth session (custom login), so auth.uid()
  is null. Both tables only have SELECT policies for `authenticated` role,
  blocking the manager from reading data.

  Adding anon SELECT policies to match the pattern already applied to
  editor_balances and clients. Write operations remain authenticated-only.
*/

CREATE POLICY "Public can read locations"
  ON locations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can read shootings accounting"
  ON shootings_accounting FOR SELECT
  TO anon
  USING (true);
