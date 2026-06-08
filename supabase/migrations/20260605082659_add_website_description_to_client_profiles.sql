-- Add website and description to client_profiles for brand company profile
ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
