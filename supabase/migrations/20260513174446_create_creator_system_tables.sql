/*
  # Creator Marketplace System

  ## Overview
  Full creator/influencer system: profiles, portfolio media, transactions, and orders.

  ## New Tables

  ### creator_profiles
  - Stores all creator (blogger/model/ugc) profile data
  - Linked to Supabase auth via user_id
  - Tracks onboarding completion, rates, categories, social links

  ### creator_portfolio
  - Media files uploaded by creators (images/videos)
  - Linked to creator_profiles via creator_id

  ### creator_transactions
  - Financial ledger: earnings from orders, pending payouts, withdrawals
  - type: 'earning' | 'payout' | 'commission'
  - status: 'pending' | 'available' | 'paid_out'

  ### marketplace_orders
  - Records when a client buys from a creator on the marketplace
  - Triggers a creator_transaction entry (pending → available after delivery)

  ## Security
  - RLS enabled on all tables
  - Creators can only read/write their own data
  - Public can read published creator profiles
*/

-- ────────────────────────────────────────────
-- 1. creator_profiles
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  handle text UNIQUE,
  bio text DEFAULT '',
  creator_type text NOT NULL DEFAULT 'blogger', -- blogger | model | ugc
  category text NOT NULL DEFAULT 'lifestyle',   -- lifestyle | beauty | fitness | food | tech | travel | fashion | business
  location text DEFAULT 'Dubai, UAE',
  languages text[] DEFAULT ARRAY['English'],
  avatar_url text,
  cover_url text,
  -- Social links
  instagram_url text,
  youtube_url text,
  tiktok_url text,
  -- Stats (manually entered / updated by creator)
  followers_count integer DEFAULT 0,
  avg_views integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  -- Onboarding
  onboarding_step integer DEFAULT 1,   -- 1..5
  onboarding_done boolean DEFAULT false,
  profile_completion integer DEFAULT 0, -- 0-100
  -- Status
  is_published boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  rating numeric(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  -- Balance
  balance_pending numeric(12,2) DEFAULT 0,
  balance_available numeric(12,2) DEFAULT 0,
  balance_total_earned numeric(12,2) DEFAULT 0,
  orders_completed integer DEFAULT 0,
  -- Packages stored as JSONB array
  packages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own profile"
  ON creator_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view published creator profiles"
  ON creator_profiles FOR SELECT
  TO anon
  USING (is_published = true);

CREATE POLICY "Creators can insert own profile"
  ON creator_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update own profile"
  ON creator_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────
-- 2. creator_portfolio
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image', -- image | video
  url text NOT NULL,
  thumbnail_url text,
  caption text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE creator_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own portfolio"
  ON creator_portfolio FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view portfolio of published creators"
  ON creator_portfolio FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      WHERE cp.id = creator_portfolio.creator_id
        AND cp.is_published = true
    )
  );

CREATE POLICY "Creators can insert portfolio items"
  ON creator_portfolio FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update own portfolio items"
  ON creator_portfolio FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can delete own portfolio items"
  ON creator_portfolio FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────
-- 3. creator_transactions
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'earning', -- earning | payout | commission | refund
  status text NOT NULL DEFAULT 'pending', -- pending | available | paid_out | cancelled
  amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) DEFAULT 0,
  net_amount numeric(12,2) DEFAULT 0,
  description text DEFAULT '',
  order_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE creator_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own transactions"
  ON creator_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can insert own transactions"
  ON creator_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────
-- 4. marketplace_orders
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  -- Buyer info (no auth required for buyers)
  buyer_name text NOT NULL DEFAULT '',
  buyer_email text NOT NULL DEFAULT '',
  buyer_company text DEFAULT '',
  campaign_brief text DEFAULT '',
  -- Package snapshot
  package_id text NOT NULL DEFAULT '',
  package_name text NOT NULL DEFAULT '',
  package_price numeric(12,2) NOT NULL DEFAULT 0,
  delivery_days integer DEFAULT 7,
  -- Financials
  platform_commission_pct numeric(5,2) DEFAULT 15,
  creator_net_amount numeric(12,2) DEFAULT 0,
  -- Status
  status text NOT NULL DEFAULT 'pending', -- pending | in_progress | completed | cancelled | refunded
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view orders for their profile"
  ON marketplace_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      WHERE cp.id = marketplace_orders.creator_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert marketplace orders"
  ON marketplace_orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert marketplace orders"
  ON marketplace_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ────────────────────────────────────────────
-- 5. Storage buckets
-- ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('creator-avatars', 'creator-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('creator-portfolio', 'creator-portfolio', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload creator avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'creator-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view creator avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'creator-avatars');

CREATE POLICY "Authenticated users can upload portfolio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'creator-portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view creator portfolio"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'creator-portfolio');

CREATE POLICY "Authenticated users can delete own portfolio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'creator-portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ────────────────────────────────────────────
-- 6. Indexes
-- ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_published ON creator_profiles(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_creator_portfolio_creator ON creator_portfolio(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_transactions_creator ON creator_transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_creator ON marketplace_orders(creator_id);
