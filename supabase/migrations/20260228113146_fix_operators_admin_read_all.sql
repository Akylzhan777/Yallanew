/*
  # Fix operators RLS - allow admins to read all operators

  ## Problem
  The existing SELECT policy only returns operators where is_active = true.
  This means after an admin hides an operator, fetchOperators() returns nothing
  for that row, making the toggle appear broken.

  ## Changes
  - Drop the overly restrictive public SELECT policy
  - Add a policy: admins can read ALL operators (active or hidden)
  - Add a policy: public/anonymous can only read active operators
*/

DROP POLICY IF EXISTS "Anyone can read active operators" ON operators;

CREATE POLICY "Public can read active operators"
  ON operators
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can read all operators"
  ON operators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );
