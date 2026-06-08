/*
  # Add structured fields to booking_events

  ## Summary
  Previously, whatsapp, location, and task description were all
  crammed into the `notes` field as a single string. This migration
  adds proper dedicated columns so the Shootings admin panel can
  display and filter them cleanly.

  ## Changes
  1. New columns on `booking_events`:
     - `whatsapp` (text) - client's WhatsApp number
     - `location` (text) - shooting location
     - `task_description` (text) - description of the task/shoot
     - `status` (text) - booking status: 'pending', 'confirmed', 'completed', defaults to 'confirmed'

  ## Notes
  - All columns default to empty string / 'confirmed' for backward compatibility
  - Existing rows keep their data in `notes`, new rows will use dedicated fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN whatsapp text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'location'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN location text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'task_description'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN task_description text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'status'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN status text NOT NULL DEFAULT 'confirmed';
  END IF;
END $$;
