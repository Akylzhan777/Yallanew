/*
  # Add UPDATE policy to telegram_groups

  The telegram_groups table was missing an UPDATE RLS policy,
  causing silent failures when admins tried to assign client_id to a group.

  Changes:
  - Add "Admins can update telegram groups" policy for UPDATE on telegram_groups
*/

CREATE POLICY "Admins can update telegram groups"
  ON telegram_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );
