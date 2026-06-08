-- ══════════════════════════════════════════════════════════════════════════
-- Server-side contact-info detection for order_messages and deal_messages
--
-- Moves has_flagged_content logic from the client into a BEFORE INSERT/UPDATE
-- trigger. Client-supplied values are completely overwritten by the DB.
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.detect_contact_info_in_message()
RETURNS TRIGGER AS $$
DECLARE
  v_text text;
BEGIN
  -- Normalize: use whichever column holds the message body
  v_text := COALESCE(
    CASE TG_TABLE_NAME
      WHEN 'order_messages' THEN NEW.content
      WHEN 'deal_messages'  THEN NEW.text
    END,
    ''
  );

  -- Always overwrite the flag — client value is irrelevant
  NEW.has_flagged_content := v_text ~*
    '(\b\d{7,15}\b'                  -- phone numbers
    '|@[\w.\-]+'                      -- @handles / telegram usernames
    '|\bt\.me/'                       -- t.me links
    '|wa\.me'                         -- wa.me links
    '|\bwhatsapp\b'
    '|\btelegram\b'
    '|\binstagram\.com/'
    '|\bfacebook\.com/'
    '|\byoutube\.com/'
    '|\bwww\.'                        -- bare www. URLs
    '|https?://'                      -- any http(s) link
    '|[\w.\-]+@[\w.\-]+\.[a-z]{2,}' -- email addresses
    ')';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- order_messages
DROP TRIGGER IF EXISTS trg_detect_contact_order_messages ON public.order_messages;
CREATE TRIGGER trg_detect_contact_order_messages
  BEFORE INSERT OR UPDATE ON public.order_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_contact_info_in_message();

-- deal_messages (also has has_flagged_content? add column if not present)
ALTER TABLE public.deal_messages
  ADD COLUMN IF NOT EXISTS has_flagged_content boolean NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS trg_detect_contact_deal_messages ON public.deal_messages;
CREATE TRIGGER trg_detect_contact_deal_messages
  BEFORE INSERT OR UPDATE ON public.deal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_contact_info_in_message();
