/*
  # Allow public (anonymous) access to booking_events

  ## Summary
  The /booking page is publicly accessible without authentication.
  Anonymous visitors need to:
    1. Read existing bookings to see availability
    2. Insert new bookings to reserve a slot

  ## Changes
  - Add SELECT policy for anon role (read-only, to show availability)
  - Add INSERT policy for anon role (create new bookings)

  ## Security Notes
  - Anonymous users can only read and insert, not update or delete
  - Delete and update remain restricted to authenticated admins
*/

CREATE POLICY "Public can view bookings for availability"
  ON booking_events FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can insert bookings"
  ON booking_events FOR INSERT
  TO anon
  WITH CHECK (true);
