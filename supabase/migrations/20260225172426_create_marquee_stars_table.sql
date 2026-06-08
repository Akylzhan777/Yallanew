/*
  # Create marquee_stars table

  ## Summary
  Creates a table for the infinite scrolling marquee strip on the landing page.
  Each row represents one "star" card displayed in the carousel.

  ## New Tables
  - `marquee_stars`
    - `id` (uuid, primary key)
    - `name` (text) — display name shown below photo
    - `status_text` (text) — short label, e.g. "1M+ followers"
    - `photo_url` (text) — URL to profile photo
    - `social_url` (text) — link to social profile
    - `is_active` (boolean) — toggle visibility in carousel
    - `sort_order` (integer) — ordering
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public SELECT for active stars (is_active = true)
  - Authenticated users (admins) can INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS marquee_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  status_text text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  social_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE marquee_stars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active marquee stars"
  ON marquee_stars FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert marquee stars"
  ON marquee_stars FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update marquee stars"
  ON marquee_stars FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete marquee stars"
  ON marquee_stars FOR DELETE
  TO authenticated
  USING (true);

INSERT INTO marquee_stars (name, status_text, photo_url, social_url, is_active, sort_order) VALUES
  ('Ahmed Al Rashidi', '2.4M views', 'https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=400', '', true, 1),
  ('Sara Al Mansouri', '890K followers', 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=400', '', true, 2),
  ('Khalid Bin Zayed', '1.7M views', 'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=400', '', true, 3),
  ('Maya Farouq', '3.1M followers', 'https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=400', '', true, 4),
  ('Omar El Sheikh', '540K views', 'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=400', '', true, 5),
  ('Noor Al Hamdan', '1.2M followers', 'https://images.pexels.com/photos/7163399/pexels-photo-7163399.jpeg?auto=compress&cs=tinysrgb&w=400', '', true, 6),
  ('Layla Hassan', '780K views', 'https://images.pexels.com/photos/5704720/pexels-photo-5704720.jpeg?auto=compress&cs=tinysrgb&w=400', '', true, 7),
  ('Rami Yousef', '4.5M followers', 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400', '', true, 8);
