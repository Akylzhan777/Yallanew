/*
  # Add editor_name column to video_units

  1. Changes
    - Add `editor_name` column to store 'Maga' or 'Vlad' instead of random IDs
    - Remove `assigned_editor_id` column (replaced by editor_name)
  
  2. Details
    - editor_name: text, nullable (NULL = unassigned)
    - Preserves existing data migration path
    - Used for admin visibility of which editor is handling each task

  3. Note
    - This replaces the previous random editor ID system with deterministic names
    - Allows business owner to see exactly 'Maga' or 'Vlad' attached to tasks
*/

ALTER TABLE video_units DROP COLUMN IF EXISTS assigned_editor_id;

ALTER TABLE video_units ADD COLUMN editor_name text DEFAULT NULL;