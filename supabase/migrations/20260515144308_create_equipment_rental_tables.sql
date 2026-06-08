/*
  # Create Equipment Rental System Tables

  1. New Tables
    - `equipment_items`
      - `id` (uuid, primary key)
      - `name` (text) — product name e.g. "Sony A7IV"
      - `category` (text) — Cameras, Lenses, Lighting, Stabilization, Audio
      - `description` (text) — short description
      - `image_url` (text) — product photo URL
      - `day_rate` (integer) — base price per day in AED (cents not used, whole AED)
      - `available` (boolean) — whether it's currently available for rent
      - `sort_order` (integer) — display order
      - `created_at` (timestamptz)

    - `rental_orders`
      - `id` (uuid, primary key)
      - `creator_id` (text) — creator who rented
      - `creator_email` (text) — email for contact
      - `items` (jsonb) — array of {item_id, name, day_rate, days, subtotal}
      - `platform_fee` (integer) — 20% commission in AED
      - `total_amount` (integer) — final charged amount in AED
      - `status` (text) — pending, paid, fulfilled, cancelled
      - `stripe_session_id` (text) — Stripe checkout session reference
      - `rental_start_date` (date) — when rental begins
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - equipment_items: public read (anon + authenticated)
    - rental_orders: creator can read own orders, admin can read all
*/

-- Equipment items table
CREATE TABLE IF NOT EXISTS equipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Cameras',
  description text DEFAULT '',
  image_url text DEFAULT '',
  day_rate integer NOT NULL DEFAULT 0,
  available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read equipment items"
  ON equipment_items FOR SELECT
  TO anon, authenticated
  USING (available = true);

CREATE POLICY "Admins can manage equipment items"
  ON equipment_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- Rental orders table
CREATE TABLE IF NOT EXISTS rental_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id text NOT NULL,
  creator_email text DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  platform_fee integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text DEFAULT '',
  rental_start_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read own rental orders"
  ON rental_orders FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid()::text);

CREATE POLICY "Creators can insert rental orders"
  ON rental_orders FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid()::text);

CREATE POLICY "Anon can insert rental orders"
  ON rental_orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can read all rental orders"
  ON rental_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- Seed equipment items
INSERT INTO equipment_items (name, category, description, image_url, day_rate, sort_order) VALUES
  ('Sony A7IV', 'Cameras', 'Full-frame mirrorless, 33MP, 4K 60fps, S-Log3', 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=600', 450, 1),
  ('Sony FX3', 'Cameras', 'Cinema line camera, S-Cinetone, 4K 120fps', 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=600', 650, 2),
  ('Canon R5', 'Cameras', '45MP full-frame, 8K RAW, IBIS, dual card slots', 'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=600', 550, 3),
  ('Sony 24-70mm f/2.8 GM II', 'Lenses', 'Premium zoom lens, sharp edge-to-edge, fast AF', 'https://images.pexels.com/photos/1787220/pexels-photo-1787220.jpeg?auto=compress&cs=tinysrgb&w=600', 200, 4),
  ('Sony 85mm f/1.4 GM', 'Lenses', 'Portrait king, creamy bokeh, razor sharp', 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=600', 180, 5),
  ('Canon RF 70-200mm f/2.8L', 'Lenses', 'Telephoto zoom, weather sealed, IS', 'https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg?auto=compress&cs=tinysrgb&w=600', 250, 6),
  ('Aputure 600d Pro', 'Lighting', '600W daylight LED, Bowens mount, wireless control', 'https://images.pexels.com/photos/1112080/pexels-photo-1112080.jpeg?auto=compress&cs=tinysrgb&w=600', 300, 7),
  ('Nanlite Forza 300B', 'Lighting', 'Bi-color 300W LED, compact, silent operation', 'https://images.pexels.com/photos/2170473/pexels-photo-2170473.jpeg?auto=compress&cs=tinysrgb&w=600', 200, 8),
  ('Godox AD600 Pro', 'Lighting', '600W TTL flash, HSS, built-in wireless', 'https://images.pexels.com/photos/1395605/pexels-photo-1395605.jpeg?auto=compress&cs=tinysrgb&w=600', 180, 9),
  ('DJI RS3 Pro', 'Stabilization', '3-axis gimbal, 4.5kg payload, LiDAR focus', 'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=600', 200, 10),
  ('DJI RS4', 'Stabilization', 'Next-gen stabilizer, native vertical, 4.5kg', 'https://images.pexels.com/photos/3062541/pexels-photo-3062541.jpeg?auto=compress&cs=tinysrgb&w=600', 250, 11),
  ('Rode NTG5', 'Audio', 'Broadcast shotgun mic, ultra-lightweight, low noise', 'https://images.pexels.com/photos/3783471/pexels-photo-3783471.jpeg?auto=compress&cs=tinysrgb&w=600', 100, 12),
  ('Sennheiser MKE 600', 'Audio', 'Professional shotgun, switchable low-cut filter', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=600', 120, 13),
  ('DJI Mic 2', 'Audio', 'Dual wireless lav system, 32-bit float, 250m range', 'https://images.pexels.com/photos/7586374/pexels-photo-7586374.jpeg?auto=compress&cs=tinysrgb&w=600', 150, 14);
