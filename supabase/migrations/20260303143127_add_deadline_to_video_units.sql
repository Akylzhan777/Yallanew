/*
  # Add deadline column to video_units

  ## Summary
  Adds an explicit deadline field to the video_units table so admins can set
  a specific due date/time for each task, independent of the claimed_at timestamp.

  ## Changes
  - `video_units`: new column `deadline` (timestamptz, nullable)
    - Null means no explicit deadline was set (older tasks remain unaffected)
    - When set, the Editor Portal uses this value for overdue/warning indicators

  ## Notes
  - Existing rows get NULL deadline (fully backwards-compatible)
  - All UI deadline logic must check for null before rendering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE video_units ADD COLUMN deadline timestamptz DEFAULT NULL;
  END IF;
END $$;
