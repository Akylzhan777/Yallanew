/*
  # Add drive_link column to clients table

  1. Changes
    - Adds `drive_link` (TEXT, nullable) column to the `clients` table
      to store the permanent Google Drive folder link for each client's raw footage.

  2. Notes
    - Column is nullable — existing clients are unaffected
    - No RLS changes needed; existing policies cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'drive_link'
  ) THEN
    ALTER TABLE clients ADD COLUMN drive_link TEXT;
  END IF;
END $$;
