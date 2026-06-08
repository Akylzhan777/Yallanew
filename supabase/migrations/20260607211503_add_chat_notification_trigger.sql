-- Add throttle tracking to deal_chats (separate per side to avoid blocking each other)
ALTER TABLE deal_chats
  ADD COLUMN IF NOT EXISTS last_notified_client_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_notified_creator_at timestamptz;

-- ──────────────────────────────────────────────────────────────────────────────
-- Trigger: fire chat-notify edge function on every non-system deal_message INSERT
-- Only KZ orders need notification — the edge function handles that check.
-- Uses pg_net fire-and-forget (same pattern as whatsapp-notify-order trigger).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_chat_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url      text;
  service_key text;
BEGIN
  -- Skip system messages
  IF NEW.is_system THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

  fn_url := current_setting('app.settings.supabase_url', true);
  IF fn_url IS NULL OR fn_url = '' THEN
    fn_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1);
  END IF;
  IF fn_url IS NULL OR fn_url = '' THEN
    fn_url := 'https://0ec90b57d6e95fcbda19832f.supabase.co';
  END IF;

  PERFORM net.http_post(
    url     := fn_url || '/functions/v1/chat-notify',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, '')
    ),
    body := jsonb_build_object(
      'chat_id',      NEW.chat_id::text,
      'sender_id',    NEW.sender_id::text,
      'message_text', COALESCE(NEW.text, 'Новый файл')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_chat_participants ON public.deal_messages;
CREATE TRIGGER trg_notify_chat_participants
  AFTER INSERT ON public.deal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_participants();
