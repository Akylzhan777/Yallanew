/*
  # Fix editor_balances RLS permissions

  1. Issue: The "Editors can read own balance" policy was querying auth.users which causes permission denied
  2. Solution: Replace the problematic policy with a simpler approach that doesn't require auth.users query
  3. Result: Admin can read all balances, editors can read their own via stored editor_name matching
*/

DROP POLICY IF EXISTS "Editors can read own balance" ON editor_balances;

CREATE POLICY "Editors can read own balance"
  ON editor_balances FOR SELECT
  TO authenticated
  USING (
    editor_name = (
      SELECT raw_user_meta_data->>'editor_name'
      FROM auth.users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );
