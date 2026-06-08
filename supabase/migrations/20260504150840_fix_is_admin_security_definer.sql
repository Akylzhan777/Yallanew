/*
  # Fix is_admin() recursive RLS

  The is_admin() function queries the profiles table, which has an RLS policy
  that calls is_admin() — causing infinite recursion and hanging queries.

  Fix: recreate is_admin() with SECURITY DEFINER so it bypasses RLS when
  checking the profiles table.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;
