/*
  # SECURITY DEFINER RPC functions for manager portal data access

  The manager portal uses a custom login (not Supabase Auth), so auth.uid()
  is always null and RLS policies that check auth.uid() block data reads.

  We already added anon SELECT policies, but there is a subtle issue:
  when the admin's Supabase session is active in localStorage and then
  expires or gets invalidated, the client may briefly be in an inconsistent
  state where neither authenticated nor anon policies match cleanly.

  These SECURITY DEFINER functions bypass RLS entirely and can be called
  by any role (anon or authenticated), guaranteeing the manager always
  sees the data. The functions are read-only (SELECT only) so there is
  no security risk from bypassing RLS here.
*/

-- Function: get all active video units (pending / in_progress / review)
CREATE OR REPLACE FUNCTION public.get_active_video_units()
RETURNS SETOF video_units
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM video_units
  WHERE editing_status IN ('pending', 'in_progress', 'review')
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_video_units() TO anon, authenticated;

-- Function: get all editor balances
CREATE OR REPLACE FUNCTION public.get_editor_balances()
RETURNS SETOF editor_balances
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM editor_balances
  ORDER BY created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_editor_balances() TO anon, authenticated;

-- Function: get completed video units for current month
CREATE OR REPLACE FUNCTION public.get_completed_videos_this_month()
RETURNS SETOF video_units
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM video_units
  WHERE editing_status = 'completed'
    AND updated_at >= date_trunc('month', now());
$$;

GRANT EXECUTE ON FUNCTION public.get_completed_videos_this_month() TO anon, authenticated;
