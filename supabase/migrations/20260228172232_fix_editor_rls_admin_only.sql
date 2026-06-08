/*
  # Fix editor_balances RLS - Admin read only temporarily

  1. Drop the problematic "Editors can read own balance" policy
  2. Keep "Admins can read all balances" policy
  3. This allows admin dashboard to work immediately
*/

DROP POLICY IF EXISTS "Editors can read own balance" ON editor_balances;
