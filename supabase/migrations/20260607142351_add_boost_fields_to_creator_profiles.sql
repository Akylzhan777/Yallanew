ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_creator_profiles_promoted
  ON creator_profiles (is_promoted, promoted_until)
  WHERE is_promoted = true;
