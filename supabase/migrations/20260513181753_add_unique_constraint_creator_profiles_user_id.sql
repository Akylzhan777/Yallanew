/*
  # Add UNIQUE constraint on creator_profiles.user_id

  ## Summary
  The onboarding upsert uses `ON CONFLICT (user_id)` but no UNIQUE constraint
  existed on that column, causing the error:
  "there is no unique or exclusion constraint matching the ON CONFLICT specification"

  This migration adds the required UNIQUE constraint on user_id so that the
  upsert operation works correctly — one profile per auth user.
*/

ALTER TABLE creator_profiles ADD CONSTRAINT creator_profiles_user_id_key UNIQUE (user_id);
