/*
  # Add claimed_at and deadline_penalty_applied to video_units

  1. New Columns
    - `claimed_at` (timestamptz, nullable) - When the editor claimed the task
    - `deadline_penalty_applied` (boolean, default false) - Whether the 48-hour penalty has been applied

  2. Logic
    - claimed_at is set when editor claims a task
    - deadline_penalty_applied prevents duplicate penalty deductions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE video_units ADD COLUMN claimed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'deadline_penalty_applied'
  ) THEN
    ALTER TABLE video_units ADD COLUMN deadline_penalty_applied boolean DEFAULT false;
  END IF;
END $$;
