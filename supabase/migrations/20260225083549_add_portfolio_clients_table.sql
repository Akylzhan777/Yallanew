/*
  # Portfolio Clients Table

  ## Summary
  Creates a table to store portfolio clients displayed on the landing page.
  Each client has profile info (name, profession, duration, badge, stats, cover image)
  and a JSON array of videos (each with type, src, title, optional poster).

  ## New Tables
  - `portfolio_clients`
    - `id` (uuid, primary key)
    - `first_name` (text) — client's first name
    - `last_name` (text) — client's last name
    - `profession` (text) — e.g. "Top Real Estate Broker"
    - `duration` (text) — e.g. "14 месяцев"
    - `badge` (text) — e.g. "REELS" or "STORIES"
    - `stats` (text) — e.g. "2.4M views"
    - `content_type` (text) — e.g. "EXPERT CONTENT"
    - `cover_img` (text) — URL to cover image
    - `videos` (jsonb) — array of {type, src, title, poster?}
    - `sort_order` (integer) — controls display order
    - `created_at` (timestamptz)

  ## Security
  - Enable RLS
  - Anyone (including anonymous) can read — needed for public landing page
  - Only admins can insert/update/delete
*/

CREATE TABLE IF NOT EXISTS portfolio_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  profession text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT 'REELS',
  stats text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT '',
  cover_img text NOT NULL DEFAULT '',
  videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portfolio_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portfolio clients"
  ON portfolio_clients FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert portfolio clients"
  ON portfolio_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update portfolio clients"
  ON portfolio_clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete portfolio clients"
  ON portfolio_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

INSERT INTO portfolio_clients (first_name, last_name, profession, duration, badge, stats, content_type, cover_img, videos, sort_order) VALUES
(
  'Ahmed', 'Al Rashidi', 'Top Real Estate Broker', '14 месяцев', 'REELS', '2.4M views', 'EXPERT CONTENT',
  'https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=800',
  '[{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Luxury Property Tour — Downtown Dubai"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Market Insights Reel"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Client Testimonial Series"}]'::jsonb,
  1
),
(
  'Sara', 'Al Mansouri', 'Luxury Lifestyle Creator', '9 месяцев', 'STORIES', '890K views', 'LIFESTYLE SERIES',
  'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
  '[{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Dubai Morning Routine"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Fashion Week Backstage"}]'::jsonb,
  2
),
(
  'Khalid', 'Bin Zayed', 'Property Developer', '6 месяцев', 'REELS', '1.7M views', 'PRODUCT SHOOTS',
  'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=800',
  '[{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"New Project Launch Reel"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Aerial Drone Showreel"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Brand Documentary"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Investor Pitch Video"}]'::jsonb,
  3
),
(
  'Maya', 'Farouq', 'Wellness & Beauty Expert', '11 месяцев', 'REELS', '3.1M views', 'PERSONAL BRAND',
  'https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=800',
  '[{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Brand Story Film"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Product Launch Campaign"}]'::jsonb,
  4
),
(
  'Omar', 'El Sheikh', 'Hospitality Group CEO', '5 месяцев', 'STORIES', '540K views', 'BACKSTAGE CONTENT',
  'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=800',
  '[{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Grand Opening Event"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Kitchen Behind-the-Scenes"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Chef Spotlight Series"}]'::jsonb,
  5
),
(
  'Noor', 'Al Hamdan', 'Tech Entrepreneur', '18 месяцев', 'REELS', '1.2M views', 'BRAND STORY',
  'https://images.pexels.com/photos/7163399/pexels-photo-7163399.jpeg?auto=compress&cs=tinysrgb&w=800',
  '[{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Startup Journey Documentary"},{"type":"iframe","src":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Product Demo Reel"}]'::jsonb,
  6
);
