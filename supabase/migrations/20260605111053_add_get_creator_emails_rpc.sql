CREATE OR REPLACE FUNCTION public.get_creator_emails()
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.user_id, u.email::text
  FROM creator_profiles cp
  JOIN auth.users u ON u.id = cp.user_id;
$$;

-- Only admins can call this
REVOKE ALL ON FUNCTION public.get_creator_emails() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_emails() TO authenticated;
