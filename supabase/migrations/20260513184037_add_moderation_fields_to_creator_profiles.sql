/*
  # Add Moderation Fields to creator_profiles

  ## Summary
  Adds two new moderation columns to creator_profiles so admins can
  hide or ban creators from the /admin-marketplace panel.

  ## New Columns

  ### creator_profiles
  - `is_hidden` (boolean, default false) — admin toggle to hide the card from
    the public marketplace without deleting the record. is_hidden = true means
    the creator never appears in listings even if is_published = true.
  - `status` (text, default 'active') — moderation status:
      'active'   — normal, visible account
      'hidden'   — same effect as is_hidden = true (redundant but explicit)
      'banned'   — account suspended; creator cannot log in to dashboard
                   and public profile shows "Account suspended"

  ## Notes
  - All existing rows default to is_hidden = false and status = 'active'
  - The Public marketplace query should filter: is_published = true AND is_hidden = false AND status != 'banned'
  - RLS: admin update policy already covers these columns (added in previous migration)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN is_hidden boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN status text DEFAULT 'active' NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_creator_profiles_status ON creator_profiles(status);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_is_hidden ON creator_profiles(is_hidden);
