/*
  # Add Green API credentials to app_settings

  Adds three new columns to app_settings so admins can configure
  their Green API (WhatsApp) integration from the admin panel
  without touching environment variables:

  - `green_api_base_url` (text) — instance-specific API base URL,
    e.g. https://7103.api.greenapi.com
  - `green_api_id_instance` (text) — instance ID
  - `green_api_token_instance` (text) — API token
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'green_api_base_url'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN green_api_base_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'green_api_id_instance'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN green_api_id_instance text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'green_api_token_instance'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN green_api_token_instance text DEFAULT '';
  END IF;
END $$;
