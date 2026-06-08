-- Add last_seen to client_profiles
ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- Add last_seen to creator_profiles
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- Allow authenticated users to update their own last_seen
CREATE POLICY "client_update_own_last_seen" ON client_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creator_update_own_last_seen" ON creator_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
