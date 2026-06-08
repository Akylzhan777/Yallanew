/*
  # Migrate telegram_settings to single fixed ID row

  - Moves the existing row to use the constant ID 11111111-1111-1111-1111-111111111111
  - Removes the old 00000000 row
  - Ensures exactly one row exists at the canonical ID
*/

INSERT INTO telegram_settings (id, bot_token, message_template, updated_at)
SELECT '11111111-1111-1111-1111-111111111111', bot_token, message_template, now()
FROM telegram_settings
WHERE id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (id) DO UPDATE SET
  bot_token = EXCLUDED.bot_token,
  message_template = EXCLUDED.message_template,
  updated_at = now();

DELETE FROM telegram_settings WHERE id = '00000000-0000-0000-0000-000000000000';
