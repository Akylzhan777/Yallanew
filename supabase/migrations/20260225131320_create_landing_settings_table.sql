/*
  # Create landing_settings table

  ## Summary
  Creates a key-value store for landing page content that can be edited from the admin dashboard.

  ## New Tables
  - `landing_settings`
    - `key` (text, primary key) – setting identifier
    - `value` (jsonb) – setting value (supports text, arrays, objects)
    - `updated_at` (timestamptz) – last update timestamp

  ## Default Data
  Inserts default values for all editable sections:
  - `hero_title` – main headline text
  - `hero_subtitle` – badge text under the headline
  - `search_placeholder` – search input placeholder
  - `hero_stats` – array of stat objects (label + value)
  - `promo_banners` – array of promotional banner objects
  - `categories` – array of service category objects with icon + label + desc

  ## Security
  - RLS enabled
  - Public read access (landing page is public)
  - Write restricted to admins only (via role check on profiles)
*/

CREATE TABLE IF NOT EXISTS landing_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read landing settings"
  ON landing_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update landing settings"
  ON landing_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert landing settings"
  ON landing_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

INSERT INTO landing_settings (key, value) VALUES
  ('hero_title', '"Explore Dubai''s best creators."'),
  ('hero_subtitle', '"Dubai''s #1 Creator Platform"'),
  ('search_placeholder', '"Search for videographers, ideas or studios..."'),
  ('hero_stats', '[
    {"label": "Videographers", "value": "120+"},
    {"label": "Studios", "value": "35"},
    {"label": "Drone Crews", "value": "8"},
    {"label": "Projects Done", "value": "500+"}
  ]'::jsonb),
  ('promo_banners', '[
    {"id": 1, "tag": "Limited Offer", "title": "First 2 hours — 20% OFF", "sub": "Reels, Interviews & Backstage", "bg": "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", "img": "https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=800"},
    {"id": 2, "tag": "New Studio", "title": "Studio in Al Quoz — Now Open", "sub": "2500 sqft · 4K gear included", "bg": "linear-gradient(135deg, #10b981 0%, #059669 100%)", "img": "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800"},
    {"id": 3, "tag": "Pay Day Sale", "title": "Monthly Package — Save 30%", "sub": "8 shoots · dedicated operator", "bg": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", "img": "https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=800"}
  ]'::jsonb),
  ('categories', '[
    {"icon": "🎬", "label": "Videographers", "desc": "120+ professionals"},
    {"icon": "📸", "label": "Photography", "desc": "Product & Portrait"},
    {"icon": "🏢", "label": "Studios", "desc": "35 locations in Dubai"},
    {"icon": "📝", "label": "Scriptwriting", "desc": "Ideas & Copy"},
    {"icon": "🎛️", "label": "Equipment", "desc": "Rent & Delivery"},
    {"icon": "🚁", "label": "Drone Crews", "desc": "FPV & Aerial"}
  ]'::jsonb)
ON CONFLICT (key) DO NOTHING;
