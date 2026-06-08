/*
  # Add video_format column to video_units

  ## Summary
  Adds a `video_format` column to the `video_units` table so operators can specify
  whether each uploaded video is vertical (9:16) or horizontal (16:9).

  ## Changes
  - `video_units` table: new column `video_format` (TEXT, default 'vertical')
    - Allowed values: 'vertical' | 'horizontal'
    - Defaults to 'vertical' for all existing and new rows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'video_format'
  ) THEN
    ALTER TABLE video_units ADD COLUMN video_format text NOT NULL DEFAULT 'vertical';
  END IF;
END $$;
