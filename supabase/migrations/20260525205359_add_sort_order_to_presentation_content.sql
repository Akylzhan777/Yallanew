/*
  # Add sort_order column to presentation_content

  1. Modified Tables
    - `presentation_content`
      - Added `sort_order` (int, default 0) - controls display order of sections on the presentation page

  2. Notes
    - Allows admins to reorder presentation sections dynamically
    - Lower sort_order values appear first
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presentation_content' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE presentation_content ADD COLUMN sort_order int DEFAULT 0;
  END IF;
END $$;
