/*
  # Fix RLS Infinite Recursion

  ## Problem
  The policies on `profiles` and `credit_packages` use subqueries that
  SELECT from `profiles` to check admin status. When a policy on `profiles`
  queries `profiles`, Postgres enters infinite recursion.

  ## Solution
  1. Create a `SECURITY DEFINER` function `is_admin()` that bypasses RLS
     entirely when checking the caller's role. This breaks the recursion loop.
  2. Drop all broken recursive policies on both tables.
  3. Recreate policies using the safe `is_admin()` function.

  ## Changes
  - New function: `public.is_admin()` — returns true if auth.uid() has role='admin'
  - Profiles table: drop recursive SELECT policies, recreate with is_admin()
  - credit_packages table: drop old policies, recreate using is_admin()
*/

-- 1. Create a SECURITY DEFINER function that reads profiles without triggering RLS
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

-- 2. Fix profiles table policies (drop the recursive ones)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

-- 3. Fix credit_packages policies (drop all, recreate cleanly)
DROP POLICY IF EXISTS "Admins can delete credit packages" ON public.credit_packages;
DROP POLICY IF EXISTS "Admins can insert credit packages" ON public.credit_packages;
DROP POLICY IF EXISTS "Admins can update credit packages" ON public.credit_packages;
DROP POLICY IF EXISTS "Anyone can read credit packages" ON public.credit_packages;

CREATE POLICY "Anyone can read credit packages"
  ON public.credit_packages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert credit packages"
  ON public.credit_packages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update credit packages"
  ON public.credit_packages FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete credit packages"
  ON public.credit_packages FOR DELETE
  TO authenticated
  USING (public.is_admin());
