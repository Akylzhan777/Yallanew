/*
  # Add video package tracking to clients table

  ## Summary
  Adds two columns to the `clients` table to support tracking how many videos
  a client has purchased as part of a package, and how many were completed
  before the system started tracking (historical offset).

  ## Modified Tables
  - `clients`
    - `total_videos_bought` (int, default 0): Total number of videos purchased in the client's package.
    - `manual_completed_offset` (int, default 0): Historical count of completed videos added manually
      by the admin for clients who existed before automated tracking was introduced.

  ## Notes
  - Both columns default to 0 so existing rows are unaffected.
  - Dynamic metrics (Снято, В работе, Готово, Осталось) are computed in the frontend
    by joining against `video_units` using `client_id`.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'total_videos_bought'
  ) THEN
    ALTER TABLE clients ADD COLUMN total_videos_bought integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'manual_completed_offset'
  ) THEN
    ALTER TABLE clients ADD COLUMN manual_completed_offset integer NOT NULL DEFAULT 0;
  END IF;
END $$;
