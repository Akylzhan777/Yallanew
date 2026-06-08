/*
  # Add is_priority column to video_units

  1. Changes
    - `video_units` table: add `is_priority` boolean column (default false)

  2. Notes
    - Existing rows get false by default
    - Admins toggle this to pin urgent tasks to the top of Kanban columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'is_priority'
  ) THEN
    ALTER TABLE video_units ADD COLUMN is_priority boolean NOT NULL DEFAULT false;
  END IF;
END $$;
