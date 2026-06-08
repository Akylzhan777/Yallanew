/*
  # Add multilingual bio columns to creator_profiles

  1. Changes to creator_profiles table
    - `bio_en` (text) — English bio (base language for auto-translation)
    - `bio_ru` (text) — Russian bio
    - `bio_ar` (text) — Arabic bio

  2. Notes
    - Existing `bio` column is kept for backwards compatibility; new UI reads bio_en/bio_ru/bio_ar falling back to bio
    - All columns nullable; frontend falls back: bio_{lang} ?? bio_en ?? bio
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'bio_en'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN bio_en text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'bio_ru'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN bio_ru text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'bio_ar'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN bio_ar text;
  END IF;
END $$;
