/*
  # Add username (vanity URL slug) to creator_profiles

  ## Summary
  Adds a unique `username` field to creator profiles enabling public vanity URLs
  like /sofia or /marcustechlife. The username is the public identifier used
  for the creator's shareable profile link.

  ## Changes

  ### creator_profiles
  - New column `username` (text, unique, nullable initially for existing rows)
    - Only lowercase letters, digits, hyphens, underscores allowed
    - Length: 3–30 characters
    - Checked against a constraint regex

  ## Security
  - Public (anon) SELECT allowed where is_published = true (existing policy covers this)
  - Unique index ensures no two creators can claim the same username
*/

-- Add username column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN username text;
  END IF;
END $$;

-- Add uniqueness constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'creator_profiles' AND constraint_name = 'creator_profiles_username_key'
  ) THEN
    ALTER TABLE creator_profiles ADD CONSTRAINT creator_profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Add format constraint: only a-z, 0-9, hyphens, underscores; 3-30 chars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'creator_profiles' AND constraint_name = 'creator_profiles_username_format'
  ) THEN
    ALTER TABLE creator_profiles ADD CONSTRAINT creator_profiles_username_format
      CHECK (username IS NULL OR (username ~ '^[a-z0-9_-]{3,30}$'));
  END IF;
END $$;

-- Index for fast lookups by username
CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles (username);
