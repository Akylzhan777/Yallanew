/*
  # Add is_featured column to creator_profiles

  Adds a boolean `is_featured` flag to creator_profiles so admins can
  pin creators to the top of the marketplace listing.

  1. Changes
     - `creator_profiles.is_featured` (boolean, default false) — featured creators
       appear first in the marketplace and get a "Featured" badge.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN is_featured boolean DEFAULT false NOT NULL;
  END IF;
END $$;
