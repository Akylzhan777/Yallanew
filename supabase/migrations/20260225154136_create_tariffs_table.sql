/*
  # Create tariffs table

  ## Summary
  Stores landing page pricing plans (tariffs) that can be managed via the admin CMS.

  ## New Tables
  - `tariffs`
    - `id` (uuid, primary key)
    - `name` (text) - tariff name e.g. "Lite", "Pro", "Diamond"
    - `price` (text) - price label e.g. "500 AED"
    - `price_sub` (text) - subtitle e.g. "в месяц"
    - `badge` (text) - optional badge e.g. "Most Popular"
    - `is_featured` (boolean) - whether this card is highlighted
    - `features` (jsonb) - array of feature strings
    - `sort_order` (integer) - display order
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public SELECT allowed (landing page is public)
  - Only authenticated admins can INSERT/UPDATE/DELETE
*/

CREATE TABLE IF NOT EXISTS tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  price_sub text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT '',
  is_featured boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tariffs"
  ON tariffs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tariffs"
  ON tariffs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tariffs"
  ON tariffs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tariffs"
  ON tariffs FOR DELETE
  TO authenticated
  USING (true);

INSERT INTO tariffs (name, price, price_sub, badge, is_featured, features, sort_order) VALUES
  ('Lite', 'от 500 AED', 'за съёмку', '', false, '["2 часа съёмки", "Монтаж 2 Reels", "Подбор локации", "Базовая цветокоррекция"]'::jsonb, 1),
  ('Pro', 'от 1 200 AED', 'за съёмку', 'Most Popular', true, '["4 часа съёмки", "Монтаж 5 Reels", "Подбор локации", "Профессиональный монтаж", "Сценарий и идеи", "Приоритетная поддержка"]'::jsonb, 2),
  ('Diamond', 'от 2 500 AED', 'за съёмку', '', false, '["Полный съёмочный день", "Монтаж до 10 Reels", "Подбор локации", "Кинематографический монтаж", "Стратегия контента", "Персональный менеджер", "Drone + Studio included"]'::jsonb, 3);
