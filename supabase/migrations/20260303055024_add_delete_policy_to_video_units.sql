/*
  # Add DELETE policy to video_units

  ## Problem
  No DELETE RLS policy existed on the video_units table, causing all delete
  operations to fail silently. The table had INSERT, SELECT, and UPDATE policies
  but was missing DELETE.

  ## Changes
  - Adds DELETE policy allowing authenticated users to delete video_units rows.
    Mirrors the existing pattern of the UPDATE and SELECT policies on this table.
*/

DROP POLICY IF EXISTS "Authenticated can delete video units" ON video_units;

CREATE POLICY "Authenticated can delete video units"
  ON video_units
  FOR DELETE
  TO authenticated
  USING (true);
