/*
  # Add video_count to video_units

  1. Schema Changes
    - Add `video_count` (integer, default 1, NOT NULL) to `video_units`
      - Represents the number of final videos an operator needs the editor to produce in this single task
      - Pay per task is derived dynamically as `video_count * 10000` KZT

  2. Backfill
    - Existing rows get 1 (single-video task — matches prior behaviour)

  3. Notes
    - No data loss. No destructive operations.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'video_count'
  ) THEN
    ALTER TABLE video_units ADD COLUMN video_count integer NOT NULL DEFAULT 1;
  END IF;
END $$;
