/*
  # Add Videographer & Photographer creator types + equipment_list

  1. Changes
     - Adds `equipment_list` text column to `creator_profiles` for videographers/photographers
       to list their gear (cameras, lenses, drones, lighting, etc.)
     - The `creator_type` column already uses a text default of 'blogger' with no CHECK constraint,
       so 'videographer' and 'photographer' values are already accepted.

  2. Notes
     - equipment_list is nullable; only relevant for videographer/photographer types
     - No data loss — purely additive change
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'equipment_list'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN equipment_list text;
  END IF;
END $$;
