/*
  # Create CRM clients table

  ## Summary
  Creates a `clients` table to serve as a CRM database for marketing and newsletters.
  Every confirmed booking upserts a record here, so the table always reflects the
  most up-to-date client info.

  ## New Tables
  - `clients`
    - `id` (uuid, primary key)
    - `name` (text) – client full name
    - `phone` (text, unique) – WhatsApp / phone number; unique to avoid duplicates
    - `total_bookings` (integer, default 0) – incremented on each new booking
    - `last_booking_date` (timestamptz) – updated on each new booking
    - `created_at` (timestamptz) – row creation timestamp

  ## Security
  - RLS enabled
  - Authenticated users with admin role can SELECT/INSERT/UPDATE
  - Public (anon) role gets INSERT-only to allow booking form to upsert records
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text UNIQUE NOT NULL,
  total_bookings integer NOT NULL DEFAULT 0,
  last_booking_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update clients"
  ON clients FOR UPDATE
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

CREATE POLICY "Anyone can upsert clients on booking"
  ON clients FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients (phone);
CREATE INDEX IF NOT EXISTS clients_last_booking_date_idx ON clients (last_booking_date DESC);
