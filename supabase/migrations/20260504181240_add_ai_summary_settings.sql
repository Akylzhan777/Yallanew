/*
  # Add AI summary settings to app_settings

  1. Changes to `app_settings`
    - `openai_api_key` (text, default '') – OpenAI API key for summarisation
    - `green_api_id_instance` (text, default '') – Green API idInstance
    - `green_api_token_instance` (text, default '') – Green API apiTokenInstance
    - `ai_summary_recipient` (text, default '971585973177@c.us') – WhatsApp chatId recipient

  2. Notes
    - Non-destructive; all columns have safe defaults
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='openai_api_key') THEN
    ALTER TABLE app_settings ADD COLUMN openai_api_key text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='green_api_id_instance') THEN
    ALTER TABLE app_settings ADD COLUMN green_api_id_instance text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='green_api_token_instance') THEN
    ALTER TABLE app_settings ADD COLUMN green_api_token_instance text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='ai_summary_recipient') THEN
    ALTER TABLE app_settings ADD COLUMN ai_summary_recipient text DEFAULT '971585973177@c.us';
  END IF;
END $$;
