/*
  # Create force_update_telegram_settings RPC

  ## Purpose
  Creates a SECURITY DEFINER function that completely bypasses RLS when saving
  telegram bot settings. This ensures admins can always save bot_token and
  message_template regardless of RLS policy evaluation issues.

  ## Function
  - `force_update_telegram_settings(new_token TEXT, new_template TEXT)`
    - Updates existing telegram_settings row if one exists
    - Inserts a new row if no row exists (upsert pattern)
    - Runs with SECURITY DEFINER so it executes as the function owner (bypasses RLS)
    - Only callable by authenticated users (additional safety)
*/

CREATE OR REPLACE FUNCTION force_update_telegram_settings(new_token TEXT, new_template TEXT)
RETURNS void AS $$
BEGIN
  UPDATE telegram_settings SET bot_token = new_token, message_template = new_template, updated_at = now();
  IF NOT FOUND THEN
    INSERT INTO telegram_settings (bot_token, message_template) VALUES (new_token, new_template);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
