ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS working_days integer[] DEFAULT '{0,1,2,3,4,5,6}';
