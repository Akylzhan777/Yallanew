/*
  # Create booking_events table for Calendly-style scheduling

  1. New Tables
    - `booking_events`
      - `id` (uuid, primary key)
      - `date` (date) - the booking date (weekdays only enforced at app level)
      - `start_time` (time) - start time of booking (e.g. 10:00)
      - `end_time` (time) - end time of booking (e.g. 12:00)
      - `client_name` (text) - name of the client
      - `notes` (text, optional) - optional notes
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Admins (authenticated users with is_admin=true) can read/insert/update/delete all bookings
    - Authenticated users can read all bookings (to see availability)
*/

CREATE TABLE IF NOT EXISTS booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  client_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bookings"
  ON booking_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert bookings"
  ON booking_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update bookings"
  ON booking_events FOR UPDATE
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

CREATE POLICY "Admins can delete bookings"
  ON booking_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS booking_events_date_idx ON booking_events (date);
