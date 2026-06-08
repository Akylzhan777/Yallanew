/*
  # Add editing fields to booking_events

  ## Summary
  Adds two new columns to booking_events to support the Editor Portal workflow.

  ## New Columns
  - `editing_status` (text, default 'pending') — tracks post-production progress.
    Allowed values: 'pending', 'in_progress', 'review', 'completed'
  - `final_video_link` (text, default '') — URL to the finished edited video
    pasted by the editor when the job is done.

  ## No destructive changes — only additive.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'editing_status'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN editing_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'final_video_link'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN final_video_link text NOT NULL DEFAULT '';
  END IF;
END $$;
