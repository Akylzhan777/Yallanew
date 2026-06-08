/*
  # Add needs_script column to booking_events

  1. Changes
    - `booking_events` table: add `needs_script` (boolean, default false)
      Stores whether the client requested a script for their shoot.

  2. Notes
    - Uses IF NOT EXISTS guard to be safe on re-run
    - Default false so existing rows are unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'needs_script'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN needs_script boolean NOT NULL DEFAULT false;
  END IF;
END $$;
