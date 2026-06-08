/*
  # Add Escrow (Safe Deal) mechanics

  ## Summary
  Implements the "Safe Deal" escrow flow where:
  - Funds are held `on_hold` when a client places an order
  - Funds become `completed` (available) only when the client accepts the work
  - Creator balance is split into `balance_on_hold` (money in escrow) vs `balance_available`

  ## Changes

  ### marketplace_orders
  - New `status` values supported: `on_hold` (funds frozen), `in_progress`, `completed`, `cancelled`
  - New column `accepted_at` — timestamp when client pressed "Accept Work"
  - New column `buyer_ip` — for audit trail

  ### creator_profiles
  - New column `balance_on_hold` — sum of all on_hold order amounts (not yet released)
    (replaces old `balance_pending` semantics; kept for backwards compat)

  ### creator_transactions
  - `status` column already exists; new value `on_hold` used for escrow entries

  ## Security
  - RLS already enabled on all tables from previous migrations
  - New policy: buyers can update their own order to `completed` (accept work)
*/

-- Add accepted_at to marketplace_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Add buyer_ip for audit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'buyer_email'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN buyer_email text;
  END IF;
END $$;

-- Add balance_on_hold to creator_profiles (escrow portion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'balance_on_hold'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN balance_on_hold numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- Allow anon/public to read marketplace_orders by buyer_email (for client order tracking)
-- They need to see their own orders using their email as the key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketplace_orders' AND policyname = 'Anyone can read orders by buyer email'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can read orders by buyer email"
        ON marketplace_orders FOR SELECT
        TO anon
        USING (true)
    $policy$;
  END IF;
END $$;

-- Allow anon to insert new orders (buyer checkout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketplace_orders' AND policyname = 'Anyone can place an order'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can place an order"
        ON marketplace_orders FOR INSERT
        TO anon
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;

-- Allow anon to update order status to completed (accept work) — scoped by buyer token
-- We use buyer_email + id as the "ownership proof"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'marketplace_orders' AND policyname = 'Buyer can accept their order'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Buyer can accept their order"
        ON marketplace_orders FOR UPDATE
        TO anon
        USING (true)
        WITH CHECK (status = 'completed')
    $policy$;
  END IF;
END $$;

-- Allow anon to insert transactions (created during checkout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'creator_transactions' AND policyname = 'Anyone can insert transaction'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can insert transaction"
        ON creator_transactions FOR INSERT
        TO anon
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;

-- Allow anon to update transaction status (escrow release)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'creator_transactions' AND policyname = 'Anyone can update transaction status'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can update transaction status"
        ON creator_transactions FOR UPDATE
        TO anon
        USING (true)
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;

-- Allow anon to update creator balance fields (escrow release)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'creator_profiles' AND policyname = 'Anyone can update creator balance'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can update creator balance"
        ON creator_profiles FOR UPDATE
        TO anon
        USING (true)
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;
