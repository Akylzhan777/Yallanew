/*
  # Creator Bookings System — Isolated Tables

  This creates a fully independent booking system for individual creators,
  completely separate from the agency's existing booking_events system.

  1. New Tables
    - `creator_booking_settings`
      - `id` (uuid, primary key)
      - `creator_id` (uuid, references creator_profiles.id)
      - `whatsapp_number` (text) — for receiving booking notifications
      - `is_booking_enabled` (boolean) — toggle bookings on/off
      - `created_at` / `updated_at` (timestamptz)
    - `creator_bookings`
      - `id` (uuid, primary key)
      - `creator_id` (uuid, references creator_profiles.id)
      - `client_name` (text) — who booked
      - `client_email` (text)
      - `client_phone` (text)
      - `booking_date` (date) — scheduled date
      - `booking_time` (text) — scheduled time slot
      - `details` (text) — shoot/session details
      - `status` (text) — pending/confirmed/cancelled
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Creators can only manage their own data
    - Public can insert bookings (for the public form)

  3. Notes
    - These tables are completely independent from the existing booking_events table
    - No foreign keys or references to the agency booking system
*/

-- Creator booking settings (one per creator)
CREATE TABLE IF NOT EXISTS creator_booking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE,
  whatsapp_number text DEFAULT '',
  is_booking_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE creator_booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own booking settings"
  ON creator_booking_settings FOR SELECT
  TO authenticated
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can insert own booking settings"
  ON creator_booking_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update own booking settings"
  ON creator_booking_settings FOR UPDATE
  TO authenticated
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Creator bookings (individual appointments)
CREATE TABLE IF NOT EXISTS creator_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  client_name text NOT NULL DEFAULT '',
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  booking_date date NOT NULL DEFAULT CURRENT_DATE,
  booking_time text NOT NULL DEFAULT '10:00',
  details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE creator_bookings ENABLE ROW LEVEL SECURITY;

-- Creators can view/manage their own bookings
CREATE POLICY "Creators can view own bookings"
  ON creator_bookings FOR SELECT
  TO authenticated
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can insert own bookings"
  ON creator_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update own bookings"
  ON creator_bookings FOR UPDATE
  TO authenticated
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can delete own bookings"
  ON creator_bookings FOR DELETE
  TO authenticated
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Public can submit bookings (for the public booking form)
CREATE POLICY "Public can submit bookings"
  ON creator_bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Public can read booking settings to show availability status
CREATE POLICY "Public can read booking settings"
  ON creator_booking_settings FOR SELECT
  TO anon
  USING (is_booking_enabled = true);

-- Admin read-all policies
CREATE POLICY "Admin can read all booking settings"
  ON creator_booking_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can read all creator bookings"
  ON creator_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
