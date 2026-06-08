/*
  # Allow public read access to published creator profiles

  1. Problem
    - Authenticated (non-admin, non-owner) users cannot see creator profiles on the marketplace
    - Only `anon` role had a public read policy, so logged-in users saw an empty catalog

  2. Changes
    - Add a new SELECT policy for `authenticated` role that allows viewing published profiles
    - This matches the existing `anon` policy behavior

  3. Security
    - Only published profiles (is_published = true) are visible
    - Write/update/delete policies remain unchanged and restricted
*/

CREATE POLICY "Authenticated users can view published creator profiles"
  ON creator_profiles
  FOR SELECT
  TO authenticated
  USING (is_published = true);
