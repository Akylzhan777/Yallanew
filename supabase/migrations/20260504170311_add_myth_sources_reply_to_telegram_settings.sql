/*
  # Myth sources auto-reply

  1. Change
    - Add `myth_sources_reply` (text) to `telegram_settings`
      Stores links/sources the bot sends when any member of the Myth group
      posts a message containing the word "исходники" (any case).

  2. Notes
    - No destructive changes; nullable, default empty string
    - No RLS change required (inherits existing policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_settings' AND column_name = 'myth_sources_reply'
  ) THEN
    ALTER TABLE telegram_settings ADD COLUMN myth_sources_reply text DEFAULT '';
  END IF;
END $$;
