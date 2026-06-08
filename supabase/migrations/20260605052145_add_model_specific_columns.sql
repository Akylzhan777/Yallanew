-- Add model-specific columns to creator_profiles
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS model_height text;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS model_weight text;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS model_age text;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS model_nationality text;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS model_hourly_rate integer;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS model_min_hours integer DEFAULT 2;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS model_shoot_types text;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS model_restrictions text;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS portfolio_urls text[] DEFAULT '{}';
