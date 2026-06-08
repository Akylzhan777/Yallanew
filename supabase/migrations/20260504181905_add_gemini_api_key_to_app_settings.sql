/*
  # Replace openai_api_key with gemini_api_key in app_settings

  1. Changes
    - Add `gemini_api_key` (text, default '') column
    - Keep `openai_api_key` intact (non-destructive) — it simply won't be used
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='gemini_api_key') THEN
    ALTER TABLE app_settings ADD COLUMN gemini_api_key text DEFAULT '';
  END IF;
END $$;
