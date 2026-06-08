/*
  # Myth night club Telegram broadcast

  1. Columns added to `telegram_settings`
    - `myth_group_name` (text): human-readable group name (default "REELS PD/MH/ DNA")
    - `myth_group_chat_id` (text): Telegram chat id / thread (default "-1003799481157_1")
    - `myth_broadcast_template` (text): message body sent 5x daily
    - `myth_last_message_id` (text): last sent message id (kept for possible cleanup parity, not required)

  2. Notes
    - Single-row config: id = '11111111-1111-1111-1111-111111111111' (existing)
    - No destructive changes; all additions are nullable with safe defaults
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='telegram_settings' AND column_name='myth_group_name') THEN
    ALTER TABLE telegram_settings ADD COLUMN myth_group_name text DEFAULT 'REELS PD/MH/ DNA';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='telegram_settings' AND column_name='myth_group_chat_id') THEN
    ALTER TABLE telegram_settings ADD COLUMN myth_group_chat_id text DEFAULT '-1003799481157_1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='telegram_settings' AND column_name='myth_broadcast_template') THEN
    ALTER TABLE telegram_settings ADD COLUMN myth_broadcast_template text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='telegram_settings' AND column_name='myth_last_message_id') THEN
    ALTER TABLE telegram_settings ADD COLUMN myth_last_message_id text;
  END IF;
END $$;

UPDATE telegram_settings
SET
  myth_group_name = COALESCE(NULLIF(myth_group_name, ''), 'REELS PD/MH/ DNA'),
  myth_group_chat_id = COALESCE(NULLIF(myth_group_chat_id, ''), '-1003799481157_1')
WHERE id = '11111111-1111-1111-1111-111111111111';
