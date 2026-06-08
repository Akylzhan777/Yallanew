/*
  # Add notification tracking columns to video_units

  ## Summary
  Adds three boolean columns to track which deadline-based WhatsApp
  notifications have already been sent for each video task, preventing
  duplicate messages.

  ## New Columns (video_units)
  - `notified_12h` (boolean, default false) — 12-hour warning sent
  - `notified_3h`  (boolean, default false) — 3-hour warning sent
  - `notified_overdue` (boolean, default false) — overdue penalty sent

  ## Notes
  - All columns default to false so existing rows are unaffected
  - No RLS changes required; existing admin-only write policies cover these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'notified_12h'
  ) THEN
    ALTER TABLE video_units ADD COLUMN notified_12h boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'notified_3h'
  ) THEN
    ALTER TABLE video_units ADD COLUMN notified_3h boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'notified_overdue'
  ) THEN
    ALTER TABLE video_units ADD COLUMN notified_overdue boolean NOT NULL DEFAULT false;
  END IF;
END $$;
