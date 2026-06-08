/*
  # Add penalty_amount to video_units

  ## Summary
  Adds a `penalty_amount` numeric column (default 0) to `video_units`.
  This column stores the progressive financial penalty accrued for overdue tasks.
  The value is updated by the dictator_cron edge function based on how many hours
  past the deadline the task is.

  ## Changes
  - `video_units.penalty_amount` (numeric, default 0, not null)

  ## Notes
  - Existing rows will receive a default value of 0 (no retroactive penalty)
  - The column is always present so frontend queries don't need null-guards
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'penalty_amount'
  ) THEN
    ALTER TABLE video_units ADD COLUMN penalty_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
