/*
  # Admin: Allow reading all user profiles

  ## Summary
  Adds a SELECT policy so that admin users can read all profiles,
  enabling the Users management tab in the Admin Dashboard.

  ## Changes
  - New SELECT policy on `profiles`: admins can read any profile row
  - Uses the existing `is_admin()` helper function
*/

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());
