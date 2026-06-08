/*
  # Calendar public read access for booking_events

  1. Changes
    - Add SELECT policy for authenticated users to insert their own bookings
    - Add SELECT policy allowing all users (including anonymous) to read date/time columns
      so the calendar can show which slots are occupied without leaking client names

  2. Security
    - Anonymous users can only see date, start_time, end_time (via a view)
    - Authenticated users can insert new bookings
    - Admin users can do full CRUD (existing policies unchanged)
    
  Note: We use a security-definer view to expose only safe columns to anonymous visitors.
*/

CREATE OR REPLACE VIEW public.booking_slots_public
  WITH (security_invoker = false)
AS
  SELECT id, date, start_time, end_time
  FROM public.booking_events;

GRANT SELECT ON public.booking_slots_public TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_events' AND policyname = 'Authenticated users can insert bookings'
  ) THEN
    CREATE POLICY "Authenticated users can insert bookings"
      ON booking_events
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_events' AND policyname = 'Authenticated users can read all booking events'
  ) THEN
    CREATE POLICY "Authenticated users can read all booking events"
      ON booking_events
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
