/*
  # Create Stock Market Module

  Full marketplace for buying/selling stock footage between creators.

  1. New Tables
    - `stock_footage`
      - `id` (uuid, primary key)
      - `seller_id` (text) — creator profile id of the uploader
      - `seller_name` (text) — display name cached
      - `title` (text) — clip title
      - `category` (text) — Drone, City, Interior, Nature, People, Food, Tech, Abstract
      - `description` (text) — optional description
      - `price` (integer) — price in AED
      - `preview_url` (text) — watermarked preview video URL
      - `original_path` (text) — path in protected storage bucket
      - `thumbnail_url` (text) — thumbnail image
      - `duration_seconds` (integer) — clip length
      - `resolution` (text) — 4K, 1080p, etc.
      - `views` (integer) — view count
      - `sales_count` (integer) — total sales
      - `status` (text) — active, hidden, pending_review
      - `created_at` (timestamptz)

    - `stock_transactions`
      - `id` (uuid, primary key)
      - `footage_id` (uuid, references stock_footage)
      - `buyer_id` (text) — buyer creator profile id
      - `seller_id` (text) — seller creator profile id
      - `amount` (integer) — total paid
      - `seller_payout` (integer) — 70% to seller
      - `platform_fee` (integer) — 30% platform commission
      - `payment_method` (text) — wallet or stripe
      - `stripe_session_id` (text) — if paid via stripe
      - `download_url` (text) — signed temporary URL (generated on access)
      - `created_at` (timestamptz)

  2. Security
    - RLS on both tables
    - Anyone authenticated can read active stock footage
    - Creators can manage own uploads
    - Buyers can read own transactions
    - Admins have full access

  3. Storage
    - stock-previews bucket (public)
    - stock-originals bucket (private, signed URLs only)
*/

-- Stock footage table
CREATE TABLE IF NOT EXISTS stock_footage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text NOT NULL,
  seller_name text DEFAULT '',
  title text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Drone',
  description text DEFAULT '',
  price integer NOT NULL DEFAULT 0,
  preview_url text DEFAULT '',
  original_path text DEFAULT '',
  thumbnail_url text DEFAULT '',
  duration_seconds integer DEFAULT 0,
  resolution text DEFAULT '4K',
  views integer DEFAULT 0,
  sales_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_footage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active footage"
  ON stock_footage FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Sellers can view own footage regardless of status"
  ON stock_footage FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid()::text);

CREATE POLICY "Sellers can insert own footage"
  ON stock_footage FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid()::text);

CREATE POLICY "Sellers can update own footage"
  ON stock_footage FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid()::text)
  WITH CHECK (seller_id = auth.uid()::text);

CREATE POLICY "Sellers can delete own footage"
  ON stock_footage FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid()::text);

CREATE POLICY "Admins can manage all stock footage"
  ON stock_footage FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- Stock transactions table
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  footage_id uuid NOT NULL REFERENCES stock_footage(id),
  buyer_id text NOT NULL,
  seller_id text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  seller_payout integer NOT NULL DEFAULT 0,
  platform_fee integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'stripe',
  stripe_session_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own purchases"
  ON stock_transactions FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid()::text);

CREATE POLICY "Sellers can read own sales"
  ON stock_transactions FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid()::text);

CREATE POLICY "Authenticated users can insert transactions"
  ON stock_transactions FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid()::text);

CREATE POLICY "Admins can manage all transactions"
  ON stock_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_footage_seller ON stock_footage(seller_id);
CREATE INDEX IF NOT EXISTS idx_stock_footage_category ON stock_footage(category);
CREATE INDEX IF NOT EXISTS idx_stock_footage_status ON stock_footage(status);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_buyer ON stock_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_footage ON stock_transactions(footage_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('stock-previews', 'stock-previews', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stock-originals', 'stock-originals', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read previews
CREATE POLICY "Public read stock previews"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'stock-previews');

-- Authenticated users can upload previews
CREATE POLICY "Authenticated upload stock previews"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'stock-previews');

-- Authenticated users can upload originals
CREATE POLICY "Authenticated upload stock originals"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'stock-originals');

-- Only admin can read originals directly (signed URLs used for buyers)
CREATE POLICY "Service role read stock originals"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'stock-originals' AND
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );
