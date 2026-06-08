/*
  # Allow editors to insert their own profile

  1. Problem
    - After onboarding as a Video Editor, users get "Not an Editor" because
      the INSERT into editing_editor_profiles fails due to missing RLS policy
    - Only admins could previously insert into this table

  2. Changes
    - Add INSERT policy for authenticated users to create their own editor profile
    - Restricted to rows where user_id matches the authenticated user

  3. Security
    - Users can only insert a row for themselves (user_id = auth.uid())
    - Cannot insert profiles for other users
*/

CREATE POLICY "Editors can insert own profile"
  ON editing_editor_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
