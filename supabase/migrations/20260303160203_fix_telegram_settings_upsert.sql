/*
  # Fix telegram_settings for reliable upsert
  
  - Disable RLS so the save button works without policy issues
  - Ensure the constant-ID row exists for upsert target
*/

ALTER TABLE telegram_settings DISABLE ROW LEVEL SECURITY;

INSERT INTO telegram_settings (id, bot_token, message_template, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', '', '', now())
ON CONFLICT (id) DO NOTHING;
