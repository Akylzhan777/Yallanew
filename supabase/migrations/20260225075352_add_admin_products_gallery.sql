/*
  # Admin Panel: Products, Gallery Items, and Admin Role

  ## Summary
  Adds infrastructure for the Admin Dashboard at /admin.

  ## Changes

  ### 1. profiles table
  - Added `is_admin` boolean column (default false)
  - Only admins can access the admin dashboard

  ### 2. New Table: products
  - Stores shop products managed by admins
  - Columns: id, name, price, description, img_url, created_at
  - RLS: everyone authenticated can read; only admins can write

  ### 3. New Table: gallery_items
  - Stores cloud gallery video items visible to all users
  - Columns: id, title, date_label, size_label, img_url, created_at
  - RLS: everyone authenticated can read; only admins can write

  ## Security
  - Admin write policies use a helper function `is_admin()` that checks profiles
  - All tables have RLS enabled
*/

-- ─── ADD is_admin TO PROFILES ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ─── HELPER FUNCTION ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ─── PRODUCTS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL DEFAULT '',
  price       text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  img_url     text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (is_admin());

-- ─── SEED: Products ──────────────────────────────────────────────────────────
INSERT INTO products (name, price, description, img_url) VALUES
  ('DJI Osmo Mobile 6', '15 990 ₽', 'Стабилизатор для плавных видео.', 'https://placehold.co/400x300/1C1E26/FFF?text=DJI+Osmo'),
  ('DJI Mic 2', '32 990 ₽', 'Профессиональный звук.', 'https://placehold.co/400x300/1C1E26/FFF?text=DJI+Mic'),
  ('Ring Light 18"', '4 990 ₽', 'Студийный свет для качественного изображения.', 'https://placehold.co/400x300/1C1E26/FFF?text=Ring+Light'),
  ('GoPro HERO 12', '39 990 ₽', 'Экшн-камера для динамичных съемок.', 'https://placehold.co/400x300/1C1E26/FFF?text=GoPro')
ON CONFLICT DO NOTHING;

-- ─── GALLERY ITEMS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_items (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       text NOT NULL DEFAULT '',
  date_label  text NOT NULL DEFAULT '',
  size_label  text NOT NULL DEFAULT '',
  img_url     text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gallery items"
  ON gallery_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert gallery items"
  ON gallery_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update gallery items"
  ON gallery_items FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete gallery items"
  ON gallery_items FOR DELETE
  TO authenticated
  USING (is_admin());

-- ─── SEED: Gallery Items ─────────────────────────────────────────────────────
INSERT INTO gallery_items (title, date_label, size_label, img_url) VALUES
  ('Reels: Тренды AI', '10 Окт 2026', '120 MB', 'https://placehold.co/600x1060/222/FFF?text=Video+1'),
  ('Reels: Продажи', '08 Окт 2026', '95 MB', 'https://placehold.co/600x1060/333/FFF?text=Video+2'),
  ('Stories: Лайфстайл', '05 Окт 2026', '45 MB', 'https://placehold.co/600x1060/444/FFF?text=Video+3'),
  ('Reels: Экспертный', '01 Окт 2026', '150 MB', 'https://placehold.co/600x1060/111/FFF?text=Video+4')
ON CONFLICT DO NOTHING;
