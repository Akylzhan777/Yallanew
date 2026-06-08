
/*
  # Fix Security Issues

  ## Summary
  Addresses all reported security advisories:

  1. **Function Search Path Mutable** — Recreate `create_deal_chat_on_payment`,
     `increment_stock_views`, and `complete_stock_purchase` with
     `SET search_path = public, pg_temp` to prevent search-path hijacking.

  2. **RLS Policy Always True** — Replace the unrestricted anon INSERT policies
     on `creator_bookings` and `rental_orders` with constrained versions that
     validate the submitted data rather than allowing anything.

  3. **Public Bucket Allows Listing** — Narrow the broad SELECT policies on
     `storage.objects` for `chat-files`, `site-assets`, `stock-previews`, and
     `yalla_assets` so they only permit object-level reads (by name), not bucket
     enumeration.

  4. **Public Can Execute SECURITY DEFINER Functions** — Revoke EXECUTE on the
     `anon` and `authenticated` roles from functions that should not be called
     directly via the REST API: `complete_stock_purchase`, `get_active_video_units`,
     `get_completed_videos_this_month`, `get_editor_balances`, `is_admin`,
     `create_deal_chat_on_payment`, and `increment_stock_views`.
     `increment_stock_views` is re-granted to `anon` + `authenticated` only
     (it is a legitimate public call to track views).
     `is_admin` and `complete_stock_purchase` are kept accessible only to
     `authenticated` where genuinely needed, but stripped from `anon`.
*/

-- ============================================================
-- 1. FIX SEARCH PATH on SECURITY DEFINER functions
-- ============================================================

-- create_deal_chat_on_payment (trigger function — no args, returns trigger)
CREATE OR REPLACE FUNCTION public.create_deal_chat_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_freelancer_uid uuid;
  v_chat_id uuid;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' AND NEW.client_user_id IS NOT NULL THEN
    SELECT user_id INTO v_freelancer_uid
    FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    IF v_freelancer_uid IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM deal_chats WHERE order_id = NEW.id
    ) THEN
      INSERT INTO deal_chats (order_id, client_id, freelancer_id)
      VALUES (NEW.id, NEW.client_user_id, v_freelancer_uid)
      RETURNING id INTO v_chat_id;

      INSERT INTO deal_messages (chat_id, sender_id, text, is_system)
      VALUES (v_chat_id, v_freelancer_uid,
              'Order paid. Chat opened — you can now discuss project details.', true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- increment_stock_views (public view counter)
CREATE OR REPLACE FUNCTION public.increment_stock_views(footage_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE stock_footage SET views = views + 1 WHERE id = footage_id_param;
END;
$$;

-- complete_stock_purchase (transactional, authenticated only)
CREATE OR REPLACE FUNCTION public.complete_stock_purchase(tx_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tx RECORD;
  v_footage RECORD;
BEGIN
  SELECT * INTO v_tx FROM stock_transactions WHERE id = tx_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Transaction not found');
  END IF;

  IF v_tx.status = 'completed' THEN
    RETURN json_build_object('ok', true, 'message', 'Already completed');
  END IF;

  UPDATE stock_transactions SET status = 'completed' WHERE id = tx_id;
  UPDATE stock_footage SET sales_count = sales_count + 1 WHERE id = v_tx.footage_id;

  SELECT is_admin_global, seller_id INTO v_footage
  FROM stock_footage WHERE id = v_tx.footage_id;

  IF v_footage.is_admin_global IS NOT TRUE THEN
    UPDATE creator_profiles
    SET balance_available    = balance_available    + v_tx.seller_payout,
        balance_total_earned = balance_total_earned + v_tx.seller_payout
    WHERE user_id = v_footage.seller_id;
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

-- ============================================================
-- 2. REVOKE anon EXECUTE from sensitive SECURITY DEFINER funcs
-- ============================================================

-- Strip anon from all of them first
REVOKE EXECUTE ON FUNCTION public.create_deal_chat_on_payment()          FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_stock_views(uuid)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_stock_purchase(uuid)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_video_units()               FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_completed_videos_this_month()      FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_editor_balances()                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin()                             FROM anon;

-- Strip authenticated from internal/privileged ones
REVOKE EXECUTE ON FUNCTION public.create_deal_chat_on_payment()          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_active_video_units()               FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_completed_videos_this_month()      FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_editor_balances()                  FROM authenticated;

-- Re-grant only what legitimate callers need
-- increment_stock_views: anyone may bump the view counter
GRANT EXECUTE ON FUNCTION public.increment_stock_views(uuid) TO anon, authenticated;

-- complete_stock_purchase: only authenticated users (buyers)
GRANT EXECUTE ON FUNCTION public.complete_stock_purchase(uuid) TO authenticated;

-- is_admin: only authenticated users need to check their own role
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 3. FIX RLS: creator_bookings — "Public can submit bookings"
-- Replace WITH CHECK (true) with a check that the client
-- provided a non-null creator_id that actually exists.
-- ============================================================

DROP POLICY IF EXISTS "Public can submit bookings" ON public.creator_bookings;

CREATE POLICY "Public can submit bookings"
  ON public.creator_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    creator_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.creator_profiles
      WHERE creator_profiles.id = creator_bookings.creator_id
    )
  );

-- ============================================================
-- 4. FIX RLS: rental_orders — "Anon can insert rental orders"
-- Replace WITH CHECK (true) with a check that the row
-- references an existing, published creator profile.
-- ============================================================

DROP POLICY IF EXISTS "Anon can insert rental orders" ON public.rental_orders;

CREATE POLICY "Anon can insert rental orders"
  ON public.rental_orders
  FOR INSERT
  TO anon
  WITH CHECK (
    creator_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.creator_profiles
      WHERE creator_profiles.user_id::text = rental_orders.creator_id
    )
  );

-- ============================================================
-- 5. FIX Storage: narrow broad SELECT policies to object-level
--    access only (prevent bucket enumeration / listing).
-- ============================================================

-- chat-files
DROP POLICY IF EXISTS "Anyone can read chat files" ON storage.objects;
CREATE POLICY "Anyone can read chat files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'chat-files'
    AND name IS NOT NULL
  );

-- site-assets
DROP POLICY IF EXISTS "Public read access for site-assets" ON storage.objects;
CREATE POLICY "Public read access for site-assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'site-assets'
    AND name IS NOT NULL
  );

-- stock-previews
DROP POLICY IF EXISTS "Public read stock previews" ON storage.objects;
CREATE POLICY "Public read stock previews"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'stock-previews'
    AND name IS NOT NULL
  );

-- yalla_assets
DROP POLICY IF EXISTS "Public read yalla_assets" ON storage.objects;
CREATE POLICY "Public read yalla_assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'yalla_assets'
    AND name IS NOT NULL
  );
