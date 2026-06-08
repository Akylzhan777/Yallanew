/*
  # Add scripts_notes column to booking_events

  ## Summary
  Adds an operator-facing notes field to the booking_events table so admins
  can record script links, outfit details, and operator instructions before
  the nightly WhatsApp dispatch at 22:00.

  ## Changes
  ### Modified Tables
  - `booking_events`
    - `scripts_notes` (text, nullable) — admin instructions: script links,
      outfit guidance, operator-specific details included in the daily
      WhatsApp dispatch message.

  ## Notes
  - Uses IF NOT EXISTS guard so the migration is safe to re-run.
  - No RLS changes required; existing policies already cover this table.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'scripts_notes'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN scripts_notes text DEFAULT '';
  END IF;
END $$;
