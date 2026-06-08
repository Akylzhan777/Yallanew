/*
  # Fix stock_footage RLS policy for approved and admin_global visibility

  1. Changes
    - Drop old SELECT policy that only matched status='active' (no longer valid after status migration)
    - Create new SELECT policy allowing all authenticated users to see footage where
      status='approved' OR is_admin_global=true
    - Keep existing policies for sellers managing their own footage and admins with full access

  2. Security
    - All authenticated users (user, creator, editor) can read approved or admin-uploaded footage
    - Sellers still see their own footage regardless of status
    - Admins retain full access
*/

-- Drop the outdated policy
DROP POLICY IF EXISTS "Anyone authenticated can view active footage" ON stock_footage;

-- Create updated policy for marketplace visibility
CREATE POLICY "Authenticated users can view approved or admin footage"
  ON stock_footage FOR SELECT
  TO authenticated
  USING (status = 'approved' OR is_admin_global = true);
