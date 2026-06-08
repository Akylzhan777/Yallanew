/*
  # Fix booking_events read policy for authenticated users

  1. Problem
    - The "Users and staff can view booking events" policy only allows users to see
      their own bookings or requires admin/manager role
    - This prevents regular authenticated users from seeing other bookings when
      checking slot availability in the calendar

  2. Changes
    - Drop the overly restrictive "Users and staff can view booking events" policy
    - Create a new policy that allows ALL authenticated users to read booking events
      (needed for calendar availability display)

  3. Security
    - Booking events contain only scheduling data (date, time, operator)
    - No sensitive personal information is exposed
    - Write operations remain restricted
*/

DROP POLICY IF EXISTS "Users and staff can view booking events" ON booking_events;

CREATE POLICY "Authenticated users can view all bookings for availability"
  ON booking_events
  FOR SELECT
  TO authenticated
  USING (true);
