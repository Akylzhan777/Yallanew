/*
  # Add start_time and end_time to creator_bookings

  1. Modified Tables
    - `creator_bookings`
      - `start_time` (text) — booking start time (e.g. "10:00")
      - `end_time` (text) — booking end time (e.g. "11:30")

  2. Notes
    - These columns enable the calendar slot-based UI matching the main booking system
    - Existing booking_time column is kept for backwards compatibility
    - No existing data is modified
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_bookings' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE creator_bookings ADD COLUMN start_time text DEFAULT '10:00';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_bookings' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE creator_bookings ADD COLUMN end_time text DEFAULT '11:00';
  END IF;
END $$;
