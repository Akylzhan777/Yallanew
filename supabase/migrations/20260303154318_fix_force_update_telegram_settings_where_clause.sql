/*
  # Fix force_update_telegram_settings RPC

  The previous version issued UPDATE without a WHERE clause which PostgREST blocks.
  This version uses INSERT ... ON CONFLICT to safely upsert the single settings row,
  targeting the first row by id ordering as a fallback for the update path.
*/

CREATE OR REPLACE FUNCTION public.force_update_telegram_settings(new_token text, new_template text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM telegram_settings ORDER BY created_at ASC LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE telegram_settings
    SET bot_token = new_token, message_template = new_template, updated_at = now()
    WHERE id = existing_id;
  ELSE
    INSERT INTO telegram_settings (bot_token, message_template)
    VALUES (new_token, new_template);
  END IF;
END;
$$;
