/*
  # Add INSERT and DELETE policies to editor_balances

  ## Changes
  - Adds INSERT policy so admin users can create new editor records
  - Adds DELETE policy so admin users can remove editor records

  ## Security
  - Both policies check that the caller is an authenticated admin via the profiles table
  - RLS remains enabled and restrictive — only admins can insert or delete
*/

CREATE POLICY "Admins can insert editor balances"
  ON editor_balances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete editor balances"
  ON editor_balances
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
