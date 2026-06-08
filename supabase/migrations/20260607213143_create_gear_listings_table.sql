-- Gear listings table for KZ peer-to-peer rent/sell marketplace (Yalla Gear)
CREATE TABLE IF NOT EXISTS public.gear_listings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid,
  title          text        NOT NULL,
  description    text        DEFAULT '',
  price          numeric(12,2) NOT NULL DEFAULT 0,
  listing_type   text        NOT NULL DEFAULT 'rent',  -- 'rent' | 'sell'
  city           text        NOT NULL DEFAULT '',
  category       text        DEFAULT '',
  photo_urls     jsonb       DEFAULT '[]'::jsonb,
  safe_deal      boolean     DEFAULT false,
  safe_deal_fee  numeric(12,2) DEFAULT 0,
  owner_name     text        DEFAULT '',
  status         text        DEFAULT 'active',
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.gear_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active gear listings"
  ON public.gear_listings FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Authenticated can insert gear listings"
  ON public.gear_listings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can insert gear listings"
  ON public.gear_listings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Creator can update own gear listing"
  ON public.gear_listings FOR UPDATE
  TO authenticated
  USING (creator_user_id = auth.uid());

-- Storage bucket for gear photos (public read, authenticated + anon write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gear-photos',
  'gear-photos',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view gear photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'gear-photos');

CREATE POLICY "Authenticated can upload gear photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gear-photos');

CREATE POLICY "Anon can upload gear photos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'gear-photos');
