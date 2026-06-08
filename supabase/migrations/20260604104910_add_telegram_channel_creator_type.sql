/*
  # Add telegram_channel creator type support

  1. New columns on creator_profiles:
     - `audience_profile` (jsonb) — gender split, age range, location, interests
     - `legal_info` (jsonb) — license_no, advertiser_permit_no (UAE compliance)
     - `client_logos` (text[]) — array of public URLs for "Trusted by" brand logos
     - `tg_subscribers` (integer) — channel subscriber count
     - `tg_unique_reach` (integer) — unique reach per post
     - `tg_monthly_impressions` (integer) — monthly impressions
     - `tg_channel_url` (text) — Telegram channel URL / @handle

  2. No table drops or data loss — all columns are additive with safe defaults.

  3. Security: existing RLS policies on creator_profiles remain unchanged.
*/

DO $$
BEGIN
  -- audience_profile: { gender_split, age_range, geo, interests }
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'audience_profile'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN audience_profile jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- legal_info: { license_no, advertiser_permit_no }
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'legal_info'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN legal_info jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- client_logos: array of public image URLs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'client_logos'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN client_logos text[] DEFAULT '{}'::text[];
  END IF;

  -- telegram-specific metrics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'tg_subscribers'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN tg_subscribers integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'tg_unique_reach'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN tg_unique_reach integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'tg_monthly_impressions'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN tg_monthly_impressions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'tg_channel_url'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN tg_channel_url text DEFAULT '';
  END IF;

  -- placement_terms stored inside package objects (JSONB packages column)
  -- no schema change needed; it's stored as a field inside each package object
END $$;
