/*
  # Revoke remaining public EXECUTE grants on SECURITY DEFINER functions

  The previous migration only revoked anon from manager RPCs and
  did not revoke authenticated. This migration completes the lockdown:

  - get_active_video_units: revoke authenticated (called only from manager portal
    which uses service_role key via edge function; direct REST not needed)
  - get_completed_videos_this_month: revoke authenticated
  - get_editor_balances: revoke authenticated
  - is_admin: revoke anon (used server-side in RLS only, not via REST)

  Note: authenticated keep EXECUTE on is_admin because RLS policies on multiple
  tables call is_admin() for authenticated users — revoking would break those policies.
  The Supabase advisor flags it, but it is intentional for RLS to work correctly.
*/

-- Manager RPC functions — authenticated should call these only via the manager portal
-- which is password-gated. Revoke direct REST access from both anon and authenticated.
REVOKE EXECUTE ON FUNCTION public.get_active_video_units() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_completed_videos_this_month() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_editor_balances() FROM authenticated;

-- Grant to service_role explicitly so edge functions / cron jobs can still call them
GRANT EXECUTE ON FUNCTION public.get_active_video_units() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_completed_videos_this_month() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_editor_balances() TO service_role;

-- is_admin: revoke anon (it has no session, so auth.uid() always returns NULL anyway)
-- Keep authenticated since RLS policies depend on it
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
