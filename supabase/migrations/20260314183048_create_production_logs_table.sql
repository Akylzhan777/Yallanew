/*
  # Create production_logs table

  ## Purpose
  Tracks the number of video Reels produced and delivered to each retainer client
  per month. The piece-rate cost (себестоимость) per video defaults to 75 AED
  (freelance operator/editor payout). The total COGS (cost_per_video * videos_count)
  for the current calendar month is summed and deducted from Net Profit in the
  admin financial dashboard.

  ## New Tables
  - `production_logs`
    - `id` (uuid, primary key)
    - `client_id` (uuid, FK → portfolio_clients.id, cascade on delete)
    - `date` (timestamptz, default now()) - when the videos were logged
    - `videos_count` (integer, not null, default 1) - number of Reels delivered
    - `cost_per_video` (numeric, not null, default 75) - AED per video (COGS rate)
    - `created_at` (timestamptz) - record creation timestamp

  ## Security
  - RLS enabled
  - Only authenticated admin users can read/insert/update/delete
*/

CREATE TABLE IF NOT EXISTS production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES portfolio_clients(id) ON DELETE CASCADE,
  date timestamptz NOT NULL DEFAULT now(),
  videos_count integer NOT NULL DEFAULT 1,
  cost_per_video numeric NOT NULL DEFAULT 75,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read production logs"
  ON production_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert production logs"
  ON production_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update production logs"
  ON production_logs FOR UPDATE
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

CREATE POLICY "Admin can delete production logs"
  ON production_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS production_logs_client_id_idx ON production_logs (client_id);
CREATE INDEX IF NOT EXISTS production_logs_date_idx ON production_logs (date DESC);
