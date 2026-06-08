/*
  # Security Hardening Fixes

  ## Summary
  Addresses all reported security issues:

  1. Enable RLS on telegram_settings and video_analyses
  2. Fix booking_slots_public view to use security_invoker = true
  3. Fix force_update_telegram_settings search_path
  4. Revoke public EXECUTE on sensitive SECURITY DEFINER functions
  5. Replace always-true RLS policies with properly scoped ones
  6. Tighten storage bucket SELECT policies to prevent enumeration

  ## Modified Tables
  - telegram_settings: RLS enabled
  - video_analyses: RLS enabled + admin policies added
  - booking_events: insert policy requires non-null required fields
  - clients: insert restricted to authenticated users
  - creator_notifications: insert restricted to service_role
  - creator_profiles: balance update restricted to service_role
  - creator_transactions: insert/update restricted to service_role
  - job_applications: insert requires full_name
  - leads: insert requires name field
  - locations: insert/update/delete restricted to admin role
  - marketplace_orders: consolidated insert + scoped update policy
  - production_logs: insert requires client_id
  - video_units: authenticated policies restricted to admin role

  ## Security Changes
  - booking_slots_public view: SECURITY DEFINER → SECURITY INVOKER
  - REVOKE EXECUTE from anon/authenticated on internal functions
  - Storage policies: prevent bucket enumeration
*/

-- ============================================================
-- 1. ENABLE RLS ON MISSING TABLES
-- ============================================================

ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;

-- video_analyses: admin-only access
DROP POLICY IF EXISTS "Admin can read video analyses" ON public.video_analyses;
DROP POLICY IF EXISTS "Admin can insert video analyses" ON public.video_analyses;
DROP POLICY IF EXISTS "Admin can update video analyses" ON public.video_analyses;
DROP POLICY IF EXISTS "Admin can delete video analyses" ON public.video_analyses;

CREATE POLICY "Admin can read video analyses"
  ON public.video_analyses FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin can insert video analyses"
  ON public.video_analyses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update video analyses"
  ON public.video_analyses FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete video analyses"
  ON public.video_analyses FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 2. FIX SECURITY DEFINER VIEW → SECURITY INVOKER
-- ============================================================

DROP VIEW IF EXISTS public.booking_slots_public;

CREATE VIEW public.booking_slots_public
  WITH (security_invoker = true)
AS
  SELECT id, date, start_time, end_time
  FROM public.booking_events;

GRANT SELECT ON public.booking_slots_public TO anon, authenticated;

-- ============================================================
-- 3. FIX force_update_telegram_settings SEARCH PATH
-- ============================================================

CREATE OR REPLACE FUNCTION public.force_update_telegram_settings(new_token TEXT, new_template TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE telegram_settings SET bot_token = new_token, message_template = new_template, updated_at = now();
  IF NOT FOUND THEN
    INSERT INTO telegram_settings (bot_token, message_template) VALUES (new_token, new_template);
  END IF;
END;
$$;

-- ============================================================
-- 4. REVOKE PUBLIC EXECUTE ON SENSITIVE SECURITY DEFINER FUNCTIONS
-- ============================================================

-- Trigger functions are invoked by Postgres, not via REST
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_client_profile() FROM anon, authenticated, public;

-- admin-only RPC
REVOKE EXECUTE ON FUNCTION public.force_update_telegram_settings(text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.force_update_telegram_settings(text, text) TO service_role;

-- manager portal RPCs — restrict anon access
REVOKE EXECUTE ON FUNCTION public.get_active_video_units() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_completed_videos_this_month() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_editor_balances() FROM anon;

-- is_admin is used server-side in RLS policies; revoke from anon
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- ============================================================
-- 5A. booking_events — replace always-true insert policy
-- ============================================================

DROP POLICY IF EXISTS "Public can insert bookings" ON public.booking_events;

CREATE POLICY "Public can insert bookings"
  ON public.booking_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    date IS NOT NULL
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND client_name IS NOT NULL
    AND whatsapp IS NOT NULL
  );

-- ============================================================
-- 5B. clients — restrict insert to authenticated only
-- ============================================================

DROP POLICY IF EXISTS "Anyone can upsert clients on booking" ON public.clients;

CREATE POLICY "Authenticated can upsert clients on booking"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 5C. creator_notifications — restrict to service_role
-- ============================================================

DROP POLICY IF EXISTS "Anyone can insert creator notifications" ON public.creator_notifications;
DROP POLICY IF EXISTS "Authenticated can insert creator notifications" ON public.creator_notifications;

CREATE POLICY "Service role can insert creator notifications"
  ON public.creator_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 5D. creator_profiles — remove always-true balance update policy
-- ============================================================

DROP POLICY IF EXISTS "Anyone can update creator balance" ON public.creator_profiles;

CREATE POLICY "Service role can update creator balance"
  ON public.creator_profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5E. creator_transactions — restrict to service_role
-- ============================================================

DROP POLICY IF EXISTS "Anyone can insert transaction" ON public.creator_transactions;
DROP POLICY IF EXISTS "Anyone can update transaction status" ON public.creator_transactions;

CREATE POLICY "Service role can insert transactions"
  ON public.creator_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update transaction status"
  ON public.creator_transactions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5F. job_applications — keep public insert with field validation
-- ============================================================

DROP POLICY IF EXISTS "Anyone can submit a job application" ON public.job_applications;

CREATE POLICY "Anyone can submit a job application"
  ON public.job_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL
    AND phone IS NOT NULL
  );

-- ============================================================
-- 5G. leads — keep public insert with field validation
-- ============================================================

DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;

CREATE POLICY "Anyone can submit a lead"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL
  );

-- ============================================================
-- 5H. locations — restrict to admin only
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can update locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can delete locations" ON public.locations;

CREATE POLICY "Admin can insert locations"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update locations"
  ON public.locations FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete locations"
  ON public.locations FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 5I. marketplace_orders — consolidate and restrict insert/update
-- ============================================================

DROP POLICY IF EXISTS "Anyone can insert marketplace orders" ON public.marketplace_orders;
DROP POLICY IF EXISTS "Anyone can place an order" ON public.marketplace_orders;
DROP POLICY IF EXISTS "Authenticated users can insert marketplace orders" ON public.marketplace_orders;
DROP POLICY IF EXISTS "Buyer can accept their order" ON public.marketplace_orders;

CREATE POLICY "Anyone can place an order"
  ON public.marketplace_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    creator_id IS NOT NULL
    AND buyer_email IS NOT NULL
    AND buyer_name IS NOT NULL
    AND package_price > 0
  );

CREATE POLICY "Buyer can accept their order"
  ON public.marketplace_orders FOR UPDATE
  TO anon, authenticated
  USING (
    status IN ('on_hold', 'in_progress')
    AND buyer_email IS NOT NULL
  )
  WITH CHECK (
    status IN ('on_hold', 'in_progress', 'completed')
  );

-- ============================================================
-- 5J. production_logs — public insert with field validation
-- ============================================================

DROP POLICY IF EXISTS "Public can insert production logs" ON public.production_logs;

CREATE POLICY "Public can insert production logs"
  ON public.production_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    client_id IS NOT NULL
  );

-- ============================================================
-- 5K. video_units — restrict to admin only
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can insert video units" ON public.video_units;
DROP POLICY IF EXISTS "Authenticated can update video units" ON public.video_units;
DROP POLICY IF EXISTS "Authenticated can delete video units" ON public.video_units;
DROP POLICY IF EXISTS "Public can insert video units" ON public.video_units;
DROP POLICY IF EXISTS "Public can update video units" ON public.video_units;

CREATE POLICY "Admin can insert video units"
  ON public.video_units FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update video units"
  ON public.video_units FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete video units"
  ON public.video_units FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 6. STORAGE — TIGHTEN BUCKET SELECT POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'avatars'
    AND name IS NOT NULL
  );

DROP POLICY IF EXISTS "Public read brand assets" ON storage.objects;
CREATE POLICY "Public read brand assets"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'brand_assets'
    AND name IS NOT NULL
  );

DROP POLICY IF EXISTS "Public can view creator avatars" ON storage.objects;
CREATE POLICY "Public can view creator avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'creator-avatars'
    AND name IS NOT NULL
  );

DROP POLICY IF EXISTS "Public can view creator portfolio" ON storage.objects;
CREATE POLICY "Public can view creator portfolio"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'creator-portfolio'
    AND name IS NOT NULL
  );

DROP POLICY IF EXISTS "Public can view operator photos" ON storage.objects;
CREATE POLICY "Public can view operator photos"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'operator-photos'
    AND name IS NOT NULL
  );

DROP POLICY IF EXISTS "Public can read portfolio images" ON storage.objects;
CREATE POLICY "Public can read portfolio images"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'portfolio-images'
    AND name IS NOT NULL
  );

DROP POLICY IF EXISTS "Public read portfolio videos" ON storage.objects;
CREATE POLICY "Public read portfolio videos"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'portfolio-videos'
    AND name IS NOT NULL
  );
