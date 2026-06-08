/*
  # Add marketplace notification settings to app_settings

  ## Summary
  Adds two new columns to app_settings so the admin can configure
  where marketplace event notifications are sent:

  - marketplace_webhook_url: optional HTTP endpoint that receives JSON POST
    payloads for new_creator and new_order events
  - telegram_admin_chat_id: Telegram chat/channel ID to receive marketplace
    notifications (uses the existing telegram_bot_token from telegram_settings)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'marketplace_webhook_url'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN marketplace_webhook_url text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'telegram_admin_chat_id'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN telegram_admin_chat_id text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'telegram_bot_token'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN telegram_bot_token text DEFAULT NULL;
  END IF;
END $$;
