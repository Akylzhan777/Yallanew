/*
  # Auto-send WhatsApp notification to creator on paid order

  ## Summary
  When a `marketplace_orders` row transitions to `status = 'paid'`, this trigger
  asynchronously calls the `whatsapp-notify-order` edge function via `pg_net`,
  which fetches the creator's WhatsApp number, builds a localized congratulations
  message, and dispatches it through Green API.

  ## Mechanism
  1. AFTER UPDATE trigger on `marketplace_orders` checks for status transition into 'paid'.
  2. Uses `net.http_post` (pg_net) to fire-and-forget a request to the edge function.
  3. The edge function reads the order + creator profile and sends via Green API.

  ## Notes
  - pg_net and the supabase project URL are already configured (see prior cron migrations).
  - The trigger never blocks the UPDATE — pg_net is asynchronous.
  - If the creator has no `whatsapp_number`, the edge function silently skips.
*/

CREATE OR REPLACE FUNCTION public.notify_creator_on_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url text;
  service_key text;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT decrypted_secret INTO service_key
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key'
      LIMIT 1;

    fn_url := current_setting('app.settings.supabase_url', true);
    IF fn_url IS NULL OR fn_url = '' THEN
      fn_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1);
    END IF;

    -- Fallback to project URL hardcoded if vault is not configured
    IF fn_url IS NULL OR fn_url = '' THEN
      fn_url := 'https://0ec90b57d6e95fcbda19832f.supabase.co';
    END IF;

    PERFORM net.http_post(
      url := fn_url || '/functions/v1/whatsapp-notify-order',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object('order_id', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_creator_on_paid_order ON public.marketplace_orders;
CREATE TRIGGER trg_notify_creator_on_paid_order
  AFTER UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_creator_on_paid_order();
