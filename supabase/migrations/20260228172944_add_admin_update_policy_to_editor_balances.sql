/*
  # Add UPDATE policy for editor_balances

  1. Issue: Admin cannot update editor balances when creating manual tasks
  2. Solution: Add UPDATE policy allowing admins to update all balances
  3. Result: Manual task creation can now increment editor balance by +10,000 ₸
*/

CREATE POLICY "Admins can update all balances"
  ON editor_balances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
