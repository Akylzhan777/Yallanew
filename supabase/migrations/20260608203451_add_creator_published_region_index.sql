-- creator_profiles: missing compound index and region constraint
CREATE INDEX IF NOT EXISTS idx_creator_published_region
  ON creator_profiles(is_published, region);

ALTER TABLE creator_profiles
  DROP CONSTRAINT IF EXISTS creator_profiles_region_check;
ALTER TABLE creator_profiles
  ADD CONSTRAINT creator_profiles_region_check
  CHECK (region IN ('UAE', 'KZ', 'ANY'));

UPDATE creator_profiles SET region = 'UAE' WHERE region IS NULL;
