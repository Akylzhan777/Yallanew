/*
  # Create video_units table

  ## Purpose
  Stores individual video/reel units submitted by operators for each booking.
  Each booking can have multiple video units. Editors see these as individual tasks.

  ## New Tables
  - `video_units`
    - `id` (uuid, primary key)
    - `booking_id` (uuid, FK → booking_events.id)
    - `client_name` (text) — auto-filled from booking, editable
    - `script` (text) — script or notes for this specific reel
    - `raw_video_link` (text) — link to raw footage (Google Drive etc.)
    - `cover_photo_link` (text) — link to cover photo / reference images
    - `editing_status` (text) — pending | in_progress | review | completed
    - `final_video_link` (text, nullable) — editor uploads this after finishing
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public insert (operators are password-gated in the app, not via Supabase auth)
  - Authenticated users (admins/editors) can read and update all rows
  - Public can also read and update (editor portal is also password-gated in app)
*/

CREATE TABLE IF NOT EXISTS video_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES booking_events(id) ON DELETE CASCADE,
  client_name text NOT NULL DEFAULT '',
  script text NOT NULL DEFAULT '',
  raw_video_link text NOT NULL DEFAULT '',
  cover_photo_link text NOT NULL DEFAULT '',
  editing_status text NOT NULL DEFAULT 'pending',
  final_video_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE video_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert video units"
  ON video_units FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can read video units"
  ON video_units FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can update video units"
  ON video_units FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert video units"
  ON video_units FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can read video units"
  ON video_units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update video units"
  ON video_units FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_video_units_booking_id ON video_units(booking_id);
CREATE INDEX IF NOT EXISTS idx_video_units_editing_status ON video_units(editing_status);
