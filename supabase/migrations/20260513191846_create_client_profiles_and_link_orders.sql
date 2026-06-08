/*
  # Client (Advertiser) System

  ## New Tables
  - `client_profiles` — one row per registered client/brand account
    - `id` uuid PK
    - `user_id` uuid FK → auth.users (unique)
    - `display_name` text
    - `company_name` text (optional brand name)
    - `email` text
    - `phone` text
    - `role` text DEFAULT 'client'
    - `created_at` / `updated_at` timestamps

  ## Modified Tables
  - `marketplace_orders` — add `client_user_id` uuid nullable FK so authenticated
    clients can see all their orders even when placed with different emails

  ## Security
  - RLS enabled on `client_profiles`
  - Clients can read/update only their own profile
  - Admin can read all profiles
  - `marketplace_orders`: new policies so authenticated clients can SELECT/UPDATE
    rows where client_user_id = auth.uid()
*/

-- ── client_profiles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL DEFAULT '',
  company_name    text NOT NULL DEFAULT '',
  email           text NOT NULL DEFAULT '',
  phone           text NOT NULL DEFAULT '',
  role            text NOT NULL DEFAULT 'client',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS client_profiles_user_id_idx ON client_profiles(user_id);

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can read own profile"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Client can update own profile"
  ON client_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Client can insert own profile"
  ON client_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can read all client profiles"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND (p.is_admin = true OR p.role = 'admin')
    )
  );

-- ── marketplace_orders: add client_user_id column ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'client_user_id'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS marketplace_orders_client_user_id_idx ON marketplace_orders(client_user_id);
  END IF;
END $$;

-- ── marketplace_orders: RLS policies for authenticated clients ─────────────────
-- Allow authenticated clients to read their own orders (by user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketplace_orders' AND policyname = 'Client can read own orders by user_id'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Client can read own orders by user_id"
        ON marketplace_orders FOR SELECT
        TO authenticated
        USING (client_user_id = auth.uid())
    $policy$;
  END IF;
END $$;

-- Allow authenticated clients to update status to 'completed' on their own orders (Accept Work)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketplace_orders' AND policyname = 'Client can accept own order'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Client can accept own order"
        ON marketplace_orders FOR UPDATE
        TO authenticated
        USING (client_user_id = auth.uid())
        WITH CHECK (client_user_id = auth.uid())
    $policy$;
  END IF;
END $$;

-- ── auto-create client_profile on signup via trigger ──────────────────────────
CREATE OR REPLACE FUNCTION handle_new_client_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if the user signed up through the client portal
  -- We detect this via raw_user_meta_data->>'portal' = 'client'
  IF (NEW.raw_user_meta_data->>'portal') = 'client' THEN
    INSERT INTO client_profiles (user_id, email, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_auth_user_created ON auth.users;
CREATE TRIGGER on_client_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_client_profile();
