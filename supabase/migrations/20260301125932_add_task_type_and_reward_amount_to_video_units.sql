/*
  # Add task_type and reward_amount to video_units

  ## Summary
  Extends the video_units table to support multiple task types with flexible pricing.

  ## New Columns
  - `task_type` (text, default 'video') — Type of task: 'video' for full editing, 'cover' for cover/thumbnail design only
  - `reward_amount` (numeric, default 10000) — The payout for completing this specific task in KZT (tenge)

  ## Why
  Previously all tasks assumed a fixed 10,000 ₸ payout. This change allows admins to create
  cover-only tasks at 1,200 ₸ and any future task types at custom prices. All financial
  logic in the app will now read reward_amount instead of using a hardcoded constant.

  ## Notes
  - Existing rows will default to task_type='video' and reward_amount=10000 (no data loss)
  - No RLS changes needed; existing policies on video_units remain in effect
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'task_type'
  ) THEN
    ALTER TABLE video_units ADD COLUMN task_type text NOT NULL DEFAULT 'video';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'reward_amount'
  ) THEN
    ALTER TABLE video_units ADD COLUMN reward_amount numeric NOT NULL DEFAULT 10000;
  END IF;
END $$;
