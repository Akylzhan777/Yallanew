/*
  # Add editor assignment to video units

  1. New Columns
    - `assigned_editor_id` (text, nullable) - Stores the editor ID when task is claimed
  
  2. Security
    - No new RLS changes needed (existing policies remain in place)
  
  3. Purpose
    - Track which editor is working on each video unit
    - Enable Kanban board columns for: Available Tasks, In Progress (claimed tasks), etc.
    - Allow editors to claim tasks and have them appear in their "My Projects" column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'assigned_editor_id'
  ) THEN
    ALTER TABLE video_units ADD COLUMN assigned_editor_id text DEFAULT NULL;
  END IF;
END $$;
