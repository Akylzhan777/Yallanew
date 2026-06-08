/*
  # Add operator_id to booking_events

  ## Summary
  Each booking is now tied to a specific crew member (operator).
  This allows the calendar to show availability per operator and
  include the operator's name in notifications.

  ## Changes
  - New column `operator_id` (text) on `booking_events`
    - Stores the operator's identifier (e.g. "alex", "dima")
    - Defaults to 'default' for backwards compatibility with existing rows
  - Index on operator_id + date for fast per-operator queries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'operator_id'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN operator_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS booking_events_operator_date_idx
  ON booking_events (operator_id, date);
