/*
  # Admin RLS Policies for Marketplace Tables

  ## Summary
  Grants the admin (identified via is_admin() security-definer function) full
  read access to creator_profiles, marketplace_orders, and creator_transactions so
  that the /admin-marketplace dashboard can aggregate metrics and manage data.

  Also adds admin UPDATE / DELETE on creator_profiles (ban/remove creator).
  Admin UPDATE on marketplace_orders (override status).

  ## New Policies
  - Admin can read all creator profiles
  - Admin can update any creator profile (block, verify)
  - Admin can delete any creator profile
  - Admin can read all marketplace orders
  - Admin can update any marketplace order (status override)
  - Admin can read all creator transactions
*/

-- Admin full read on creator_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'creator_profiles' AND policyname = 'Admin can read all creator profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin can read all creator profiles"
        ON creator_profiles FOR SELECT
        TO authenticated
        USING (is_admin())
    $policy$;
  END IF;
END $$;

-- Admin update on creator_profiles (verify, block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'creator_profiles' AND policyname = 'Admin can update any creator profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin can update any creator profile"
        ON creator_profiles FOR UPDATE
        TO authenticated
        USING (is_admin())
        WITH CHECK (is_admin())
    $policy$;
  END IF;
END $$;

-- Admin delete on creator_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'creator_profiles' AND policyname = 'Admin can delete any creator profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin can delete any creator profile"
        ON creator_profiles FOR DELETE
        TO authenticated
        USING (is_admin())
    $policy$;
  END IF;
END $$;

-- Admin read all marketplace_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketplace_orders' AND policyname = 'Admin can read all marketplace orders'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin can read all marketplace orders"
        ON marketplace_orders FOR SELECT
        TO authenticated
        USING (is_admin())
    $policy$;
  END IF;
END $$;

-- Admin update marketplace_orders (status override)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketplace_orders' AND policyname = 'Admin can update any marketplace order'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin can update any marketplace order"
        ON marketplace_orders FOR UPDATE
        TO authenticated
        USING (is_admin())
        WITH CHECK (is_admin())
    $policy$;
  END IF;
END $$;

-- Admin read all creator_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'creator_transactions' AND policyname = 'Admin can read all creator transactions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin can read all creator transactions"
        ON creator_transactions FOR SELECT
        TO authenticated
        USING (is_admin())
    $policy$;
  END IF;
END $$;
